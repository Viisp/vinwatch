import { NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium';
import { chromium as playwrightChromium } from 'playwright-core';
import { createAdminClient } from '@/lib/supabase-admin';
import { decrypt } from '@/lib/crypto';
import { parseVintedOrders, type VintedOrder } from '@/lib/vinted-parser';

export const maxDuration = 60; // seconds — Vercel Pro allows up to 300; adjust if this proves too short

type ExportedCookie = {
  name: string;
  value: string;
  domain: string;
  path: string;
  expirationDate?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
};

type PlaywrightCookie = {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
};

// Cookie-Editor (and Chrome's cookie API generally) exports sameSite as
// "no_restriction" | "lax" | "strict" | "unspecified", not the capitalized
// "Strict" | "Lax" | "None" that Playwright's addCookies requires.
function normalizeCookies(cookies: ExportedCookie[]): PlaywrightCookie[] {
  const sameSiteMap: Record<string, 'Strict' | 'Lax' | 'None'> = {
    strict: 'Strict',
    lax: 'Lax',
    no_restriction: 'None',
  };
  return cookies.map((c) => ({
    name: c.name,
    value: c.value,
    domain: c.domain,
    path: c.path,
    ...(c.expirationDate ? { expires: c.expirationDate } : {}),
    ...(c.httpOnly !== undefined ? { httpOnly: c.httpOnly } : {}),
    ...(c.secure !== undefined ? { secure: c.secure } : {}),
    ...(c.sameSite && sameSiteMap[c.sameSite] ? { sameSite: sameSiteMap[c.sameSite] } : {}),
  }));
}

function debugLogCurrentUserCandidates(html: string): void {
  // Direct API calls to Vinted get blocked by their bot-protection (confirmed:
  // 403 from context.request), but a fully-rendered authenticated page (like
  // /my_orders, already fetched) passes that check. The header/account menu
  // on such a page necessarily renders the logged-in user's pseudo/avatar
  // somewhere in the flight-data JSON, the same way preloadedOrders does.
  // Log a window around each candidate key so we can see the real shape
  // without guessing field names blind.
  const candidates = ['\\"login\\"', '\\"photo\\"', '\\"currentUser\\"', '\\"business\\"'];
  for (const marker of candidates) {
    const idx = html.indexOf(marker);
    if (idx === -1) {
      console.log(`[debug currentUser] marker ${marker} not found`);
      continue;
    }
    const start = Math.max(0, idx - 100);
    console.log(`[debug currentUser] marker ${marker} @${idx}: ${html.slice(start, idx + 400)}`);
  }
}

async function fetchOrdersHtml(
  cookies: PlaywrightCookie[],
  orderType: 'sold' | 'purchased'
): Promise<{ html: string; url: string }> {
  const browser = await playwrightChromium.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
  try {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    });
    await context.addCookies(cookies);
    const page = await context.newPage();
    await page.goto(`https://www.vinted.fr/my_orders?order_type=${orderType}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    return { html: await page.content(), url: page.url() };
  } finally {
    await browser.close();
  }
}

function toOrderRow(order: VintedOrder, userId: string, orderType: 'sold' | 'purchased') {
  return {
    user_id: userId,
    transaction_id: order.transactionId,
    order_type: orderType,
    title: order.title,
    price_amount: order.priceAmount,
    price_currency: order.priceCurrency,
    photo_url: order.photoUrl,
    status: order.status,
    order_date: order.date,
  };
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: sessions, error: sessionsError } = await supabase
    .from('vinted_session')
    .select('user_id, cookies_encrypted');

  if (sessionsError) {
    return NextResponse.json({ error: sessionsError.message }, { status: 500 });
  }

  const results: Record<string, string> = {};

  for (const session of sessions ?? []) {
    try {
      const cookies = normalizeCookies(JSON.parse(decrypt(session.cookies_encrypted, session.user_id)));

      // Fetch sold and purchased independently: if one fails (network error,
      // timeout, etc.) we still want to upsert whatever the other one got.
      const soldResult = await fetchOrdersHtml(cookies, 'sold').catch((e) => ({ error: e as Error }));
      const purchasedResult = await fetchOrdersHtml(cookies, 'purchased').catch((e) => ({ error: e as Error }));

      if (!('error' in soldResult)) debugLogCurrentUserCandidates(soldResult.html);

      // Judge login state from where the browser actually ended up, not from
      // page text — "Se connecter" can legitimately appear in an authenticated
      // page's markup (nav, hidden modal) and false-positive as "logged out".
      const isLoginRedirect = !('error' in soldResult) && !soldResult.url.includes('/my_orders');

      if (isLoginRedirect) {
        await supabase
          .from('vinted_session')
          .update({ last_sync_status: 'expired', last_sync_at: new Date().toISOString() })
          .eq('user_id', session.user_id);
        results[session.user_id] = 'expired';
        continue;
      }

      // A page only "counts" if it actually rendered as an orders page —
      // the preloadedOrders marker is the same one parseVintedOrders itself
      // looks for. Without it, an empty parse result could mean a rate-limit
      // page, a bot-detection challenge, or a layout change, not "genuinely
      // zero orders", so it can't be trusted.
      const soldLooksValid = !('error' in soldResult) && soldResult.html.includes('preloadedOrders');
      const purchasedLooksValid = !('error' in purchasedResult) && purchasedResult.html.includes('preloadedOrders');

      if (!soldLooksValid && !purchasedLooksValid) {
        const soldMsg = 'error' in soldResult ? soldResult.error.message : 'page did not render as expected';
        const purchasedMsg =
          'error' in purchasedResult ? purchasedResult.error.message : 'page did not render as expected';
        throw new Error(`both sold and purchased fetches failed: sold=${soldMsg}; purchased=${purchasedMsg}`);
      }

      const soldOrders = soldLooksValid && !('error' in soldResult) ? parseVintedOrders(soldResult.html) : [];
      const purchasedOrders =
        purchasedLooksValid && !('error' in purchasedResult) ? parseVintedOrders(purchasedResult.html) : [];

      const rows = [
        ...soldOrders.map((o) => toOrderRow(o, session.user_id, 'sold')),
        ...purchasedOrders.map((o) => toOrderRow(o, session.user_id, 'purchased')),
      ];

      if (rows.length > 0) {
        const { error: upsertError } = await supabase
          .from('vinted_orders')
          .upsert(rows, { onConflict: 'user_id,transaction_id,order_type' });
        if (upsertError) throw upsertError;
      }

      await supabase
        .from('vinted_session')
        .update({ last_sync_status: 'ok', last_sync_at: new Date().toISOString() })
        .eq('user_id', session.user_id);
      const partialNote = soldLooksValid && purchasedLooksValid ? '' : ' (partial: only one side succeeded)';
      results[session.user_id] = `ok (${rows.length} orders)${partialNote}`;
    } catch (err) {
      await supabase
        .from('vinted_session')
        .update({ last_sync_status: 'error', last_sync_at: new Date().toISOString() })
        .eq('user_id', session.user_id);
      results[session.user_id] = `error: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  return NextResponse.json({ results });
}
