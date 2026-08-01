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
    // domcontentloaded fires on the raw HTML before the SPA has hydrated —
    // too early for Vinted's own client-side code to have had a chance to
    // detect an expiring access_token_web and silently refresh it via
    // refresh_token_web. Give it a beat to finish that network activity
    // before reading cookies back out, or every "refresh" just re-saves the
    // same soon-to-expire token. Capped so a page with persistent background
    // polling (analytics, etc.) can't hang the sync.
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
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

async function notifySyncRecovery(): Promise<void> {
  const webhookUrl = process.env.DISCORD_ALERT_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [
          {
            title: '✅ Bravo, la synchro Vinted est rétablie !',
            description: '🎉 Tout est reparti normalement, tes ventes et achats se resynchronisent comme prévu.',
            color: 0x00c896, // vert VinWatch
            url: 'https://vinwatch.fr',
            thumbnail: { url: 'https://vinwatch.fr/logo.png' },
            fields: [{ name: '📅 Quand', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }],
            footer: { text: '🐝 VinWatch — Suivi Vinted' },
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
  } catch {
    // Best-effort — a failed webhook call here must never affect the sync
    // result itself, which has already succeeded by this point.
  }
}

async function notifySyncFailure(reason: string): Promise<void> {
  const webhookUrl = process.env.DISCORD_ALERT_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '<@209033474244345856>',
        allowed_mentions: { users: ['209033474244345856'] },
        embeds: [
          {
            title: '🚨 Oups, la synchro Vinted a échoué !',
            description: `💥 ${reason}\n\n🔧 [Ouvrir Paramètres pour corriger →](https://vinwatch.fr/parametres)`,
            color: 0xef4444, // rouge, cohérent avec les accents "achats"/erreur du site
            url: 'https://vinwatch.fr/parametres',
            thumbnail: { url: 'https://vinwatch.fr/logo.png' },
            fields: [
              { name: '📅 Quand', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
              { name: '🔁 Prochaine tentative', value: 'Demain à 15h (heure de Paris)', inline: true },
            ],
            footer: { text: '🐝 VinWatch — Suivi Vinted' },
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
  } catch {
    // Best-effort notification — a failed webhook call must never mask or
    // replace the real sync failure being reported below.
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
    .select('user_id, cookies_encrypted, last_sync_status');

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
        await notifySyncFailure(
          'Session expirée — va sur vinwatch.fr → Paramètres pour recoller tes cookies Vinted.'
        );
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

      // Only announce recovery, not every successful sync — otherwise this
      // fires once a day (every cron run), which is just noise.
      if (session.last_sync_status === 'expired' || session.last_sync_status === 'error') {
        await notifySyncRecovery();
      }

      const partialNote = soldLooksValid && purchasedLooksValid ? '' : ' (partial: only one side succeeded)';
      results[session.user_id] = `ok (${rows.length} orders)${partialNote}`;
    } catch (err) {
      await supabase
        .from('vinted_session')
        .update({ last_sync_status: 'error', last_sync_at: new Date().toISOString() })
        .eq('user_id', session.user_id);
      // Supabase/PostgREST errors are plain objects with a `.message`, not
      // native Error instances — String(err) on those just gives
      // "[object Object]", which is useless for diagnosing what broke.
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : String(err);
      await notifySyncFailure(`Erreur technique : ${message}`);
      results[session.user_id] = `error: ${message}`;
    }
  }

  return NextResponse.json({ results });
}
