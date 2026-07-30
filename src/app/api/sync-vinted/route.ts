import { NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium';
import { chromium as playwrightChromium } from 'playwright-core';
import { createAdminClient } from '@/lib/supabase-admin';
import { decrypt, encrypt } from '@/lib/crypto';
import { parseVintedOrders, parseVintedProfile, type VintedOrder } from '@/lib/vinted-parser';

export const maxDuration = 60; // seconds — Vercel Pro allows up to 300; adjust if this proves too short

// Two shapes flow through this file: the raw Cookie-Editor export (from the
// user's paste, or round-tripped from a previous sync's storage) and
// Playwright's own cookie shape. normalizeCookies accepts either — after the
// first auto-refresh (see saveRefreshedCookies below), what's stored is
// already Playwright-shaped, so this has to tolerate both without erroring.
type StoredCookie = {
  name: string;
  value: string;
  domain: string;
  path: string;
  expirationDate?: number;
  expires?: number;
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
function normalizeCookies(cookies: StoredCookie[]): PlaywrightCookie[] {
  const sameSiteMap: Record<string, 'Strict' | 'Lax' | 'None'> = {
    strict: 'Strict',
    lax: 'Lax',
    no_restriction: 'None',
  };
  const validSameSite = new Set(['Strict', 'Lax', 'None']);
  return cookies.map((c) => ({
    name: c.name,
    value: c.value,
    domain: c.domain,
    path: c.path,
    ...(c.expires || c.expirationDate ? { expires: c.expires ?? c.expirationDate } : {}),
    ...(c.httpOnly !== undefined ? { httpOnly: c.httpOnly } : {}),
    ...(c.secure !== undefined ? { secure: c.secure } : {}),
    ...(c.sameSite && validSameSite.has(c.sameSite)
      ? { sameSite: c.sameSite as 'Strict' | 'Lax' | 'None' }
      : c.sameSite && sameSiteMap[c.sameSite]
        ? { sameSite: sameSiteMap[c.sameSite] }
        : {}),
  }));
}

async function fetchOrdersHtml(
  cookies: PlaywrightCookie[],
  orderType: 'sold' | 'purchased'
): Promise<{ html: string; url: string; refreshedCookies: PlaywrightCookie[] }> {
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
    const html = await page.content();
    const url = page.url();
    // Vinted's own SPA silently rotates access_token_web using
    // refresh_token_web while the page runs. Capture whatever the browser
    // ended up with so the caller can persist it — otherwise every sync
    // keeps using the same slowly-expiring snapshot from the user's last
    // manual paste, and they'd have to repaste far more often than needed.
    const refreshedCookies = (await context.cookies()) as PlaywrightCookie[];
    return { html, url, refreshedCookies };
  } finally {
    await browser.close();
  }
}

function toOrderRow(order: VintedOrder, userId: string, orderType: 'sold' | 'purchased') {
  return {
    user_id: userId,
    transaction_id: order.transactionId,
    conversation_id: order.conversationId,
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

      if (!('error' in soldResult)) {
        const m = soldResult.html.match(/\\"preloadedOrders\\":\{\\"orders\\":(\[[\s\S]*?\])(?:,\\"pagination\\"|\})/);
        console.log(`[debug order fields v2] ${m ? m[1].slice(0, 2500) : 'no match'}`);
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

      // Every authenticated page (not just /my_orders) embeds the logged-in
      // user's own pseudo/avatar, so no extra request is needed to keep the
      // account menu's Vinted identity in sync.
      const succeededResult = !('error' in soldResult) ? soldResult : !('error' in purchasedResult) ? purchasedResult : null;
      const profile = succeededResult ? parseVintedProfile(succeededResult.html) : null;

      // Persist whatever cookies the browser ended up with (Vinted's SPA
      // rotates access_token_web via refresh_token_web while the page runs)
      // so the next sync starts from a live session instead of the same
      // slowly-expiring snapshot from the user's last manual paste.
      const cookiesEncrypted = succeededResult
        ? encrypt(JSON.stringify(succeededResult.refreshedCookies), session.user_id)
        : null;

      await supabase
        .from('vinted_session')
        .update({
          last_sync_status: 'ok',
          last_sync_at: new Date().toISOString(),
          ...(cookiesEncrypted ? { cookies_encrypted: cookiesEncrypted } : {}),
          ...(profile
            ? {
                vinted_login: profile.login,
                vinted_profile_url: profile.profileUrl,
                vinted_photo_url: profile.photoUrl,
              }
            : {}),
        })
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
