# VinWatch (Dashboard Vinted Ventes/Achats) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Depenzo (an unused personal-finance app) into VinWatch, a private Vinted sales/purchases dashboard, reusing its UI/auth/Supabase infrastructure.

**Architecture:** Next.js switches from static export to a real server (Vercel), gaining an API route triggered by Vercel Cron. That route replays a full Vinted cookie jar (pasted once by the user) through a serverless headless browser, extracts the `preloadedOrders` JSON embedded in `/my_orders` page HTML, and upserts rows into new Supabase tables. The dashboard pages read those tables directly (no more localStorage-first pattern for this data).

**Tech Stack:** Next.js 16 (App Router), React 19, Supabase (Postgres + Auth), Tailwind/shadcn, Chart.js, `playwright-core` + `@sparticuz/chromium`, Vitest (new — no test runner exists yet).

---

## Reference: real Vinted data shape (found during design, do not re-derive)

`https://www.vinted.fr/my_orders?order_type=sold` (or `?order_type=purchased`) embeds this JSON inside a `<script>self.__next_f.push([1,"..."])</script>` tag, JSON-string-escaped:

```json
{
  "orderStatus": "in_progress",
  "orderType": "sold",
  "preloadedOrders": {
    "orders": [
      {
        "transactionId": 21200090946,
        "conversationId": 23996837200,
        "date": "2026-07-28T11:24:05+02:00",
        "photo": { "url": "https://images1.vinted.net/...", "thumbnails": [] },
        "price": { "amount": "20.0", "currencyCode": "EUR" },
        "status": "Bordereau envoyé au vendeur",
        "title": "Maillot Adidas Team Vitality noir col V taille M",
        "transactionUserStatus": "needs_action"
      }
    ],
    "pagination": { "currentPage": 1, "totalPages": 1, "totalEntries": 2, "perPage": 20, "time": 1785267196 },
    "ordersNeedActionCount": 2
  },
  "defaultBoughtStatus": "in_progress"
}
```

Authentication requires the **full Vinted cookie jar** from a real logged-in browser (a single `access_token_web` cookie, or that same value as an `Authorization: Bearer` header, were both tested and do NOT authenticate — confirmed during design).

---

### Task 1: Enable server features (remove static export), rename to VinWatch

**Files:**
- Modify: `next.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Rename the package**

In `package.json`, change `"name": "depenzo"` to `"name": "vinwatch"`.

- [ ] **Step 2: Remove `output: "export"`**

Replace the full contents of `next.config.ts` with:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  devIndicators: false,
};

export default nextConfig;
```

(`trailingSlash: true` is removed too — it was there to make static export work with most static hosts; not needed once Next.js serves routes itself.)

- [ ] **Step 3: Verify the app still builds**

Run: `npm run build`
Expected: Build succeeds, output says "Route (app)" listing pages (not "export" mode).

- [ ] **Step 4: Commit**

```bash
git add next.config.ts package.json
git commit -m "chore: switch from static export to server mode, rename package to vinwatch"
```

---

### Task 2: Add Vitest for unit testing pure functions

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install Vitest**

Run: `npm install -D vitest`

- [ ] **Step 2: Add test script**

In `package.json`, inside `"scripts"`, add:

```json
"test": "vitest run"
```

- [ ] **Step 3: Create Vitest config**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 4: Verify it runs with zero tests**

Run: `npm test`
Expected: "No test files found" (not an error) — confirms the runner is wired up.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "test: add Vitest test runner"
```

---

### Task 3: Parse Vinted's embedded orders JSON (pure function, TDD)

**Files:**
- Create: `src/lib/vinted-parser.ts`
- Test: `src/lib/vinted-parser.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/vinted-parser.test.ts
import { describe, it, expect } from 'vitest';
import { parseVintedOrders } from './vinted-parser';

const SAMPLE_HTML = `<html><body>
<script>self.__next_f.push([1,"2a:[\\"$\\",\\"$La4\\",null,{\\"orderStatus\\":\\"in_progress\\",\\"orderType\\":\\"sold\\",\\"preloadedOrders\\":{\\"orders\\":[{\\"transactionId\\":21200090946,\\"conversationId\\":23996837200,\\"date\\":\\"2026-07-28T11:24:05+02:00\\",\\"photo\\":{\\"url\\":\\"https://images1.vinted.net/photo1.jpg\\"},\\"price\\":{\\"amount\\":\\"20.0\\",\\"currencyCode\\":\\"EUR\\"},\\"status\\":\\"Bordereau envoy\\u00e9 au vendeur\\",\\"title\\":\\"Maillot Adidas\\",\\"transactionUserStatus\\":\\"needs_action\\"},{\\"transactionId\\":21193475575,\\"conversationId\\":23990011679,\\"date\\":\\"2026-07-28T08:29:26+02:00\\",\\"photo\\":{\\"url\\":\\"https://images1.vinted.net/photo2.jpg\\"},\\"price\\":{\\"amount\\":\\"10.0\\",\\"currencyCode\\":\\"EUR\\"},\\"status\\":\\"Bordereau envoy\\u00e9 au vendeur\\",\\"title\\":\\"Short jean\\",\\"transactionUserStatus\\":\\"needs_action\\"}],\\"pagination\\":{\\"currentPage\\":1,\\"totalPages\\":1,\\"totalEntries\\":2,\\"perPage\\":20,\\"time\\":1785267196},\\"ordersNeedActionCount\\":2},\\"defaultBoughtStatus\\":\\"in_progress\\"}]\\n"])</script>
</body></html>`;

describe('parseVintedOrders', () => {
  it('extracts all orders with the expected fields', () => {
    const orders = parseVintedOrders(SAMPLE_HTML);

    expect(orders).toHaveLength(2);
    expect(orders[0]).toEqual({
      transactionId: 21200090946,
      title: 'Maillot Adidas',
      priceAmount: '20.0',
      priceCurrency: 'EUR',
      photoUrl: 'https://images1.vinted.net/photo1.jpg',
      status: 'Bordereau envoyé au vendeur',
      date: '2026-07-28T11:24:05+02:00',
    });
    expect(orders[1].transactionId).toBe(21193475575);
  });

  it('returns an empty array when no preloadedOrders block is present', () => {
    const orders = parseVintedOrders('<html><body>Rien ici</body></html>');
    expect(orders).toEqual([]);
  });

  it('returns an empty array when the orders list itself is empty', () => {
    const html = `<script>self.__next_f.push([1,"x:{\\"preloadedOrders\\":{\\"orders\\":[]}}"])</script>`;
    expect(parseVintedOrders(html)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- vinted-parser`
Expected: FAIL — `Cannot find module './vinted-parser'`

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/vinted-parser.ts
export interface VintedOrder {
  transactionId: number;
  title: string;
  priceAmount: string;
  priceCurrency: string;
  photoUrl: string | null;
  status: string;
  date: string;
}

/**
 * Vinted embeds page data as a JSON-escaped string inside
 * self.__next_f.push([1,"...preloadedOrders...\n"]) (React Server Components
 * flight data) rather than exposing it via a separate fetch/XHR call.
 */
export function parseVintedOrders(html: string): VintedOrder[] {
  const match = html.match(/"preloadedOrders":\{"orders":(\[.*?\]),"pagination"/s);
  if (!match) return [];

  // The captured group is valid JSON array syntax as-is: the surrounding
  // <script> payload is a JSON-encoded string, but reading the raw HTML
  // bytes (not re-parsing the outer script string) means escape sequences
  // like \" and é already read back as literal characters here.
  let orders: unknown;
  try {
    orders = JSON.parse(match[1]);
  } catch {
    return [];
  }

  if (!Array.isArray(orders)) return [];

  return (orders as Record<string, unknown>[]).map((o) => ({
    transactionId: o.transactionId as number,
    title: o.title as string,
    priceAmount: (o.price as { amount: string }).amount,
    priceCurrency: (o.price as { currencyCode: string }).currencyCode,
    photoUrl: (o.photo as { url?: string } | undefined)?.url ?? null,
    status: o.status as string,
    date: o.date as string,
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- vinted-parser`
Expected: PASS (all 3 tests). If the regex/unescape logic doesn't match on the first try, adjust `parseVintedOrders` — the exact escaping depends on how many times the JSON was nested when Next.js serialized it; iterate against the test until green rather than guessing further in this plan.

- [ ] **Step 5: Commit**

```bash
git add src/lib/vinted-parser.ts src/lib/vinted-parser.test.ts
git commit -m "feat: parse Vinted's embedded preloadedOrders JSON from page HTML"
```

---

### Task 4: Ventes/achats aggregate calculations (pure function, TDD)

**Files:**
- Create: `src/lib/vinted-calculations.ts`
- Test: `src/lib/vinted-calculations.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/vinted-calculations.test.ts
import { describe, it, expect } from 'vitest';
import { computeOrdersSummary, type StoredOrder } from './vinted-calculations';

function order(overrides: Partial<StoredOrder>): StoredOrder {
  return {
    id: '1',
    transactionId: 1,
    orderType: 'sold',
    title: 'Item',
    priceAmount: '10.0',
    priceCurrency: 'EUR',
    photoUrl: null,
    status: 'ok',
    orderDate: '2026-07-01T00:00:00+02:00',
    ...overrides,
  };
}

describe('computeOrdersSummary', () => {
  it('sums sold and purchased totals separately and computes the delta', () => {
    const orders = [
      order({ orderType: 'sold', priceAmount: '20.0' }),
      order({ orderType: 'sold', priceAmount: '15.5' }),
      order({ orderType: 'purchased', priceAmount: '8.0' }),
    ];

    const summary = computeOrdersSummary(orders);

    expect(summary.totalSold).toBe(35.5);
    expect(summary.totalPurchased).toBe(8.0);
    expect(summary.delta).toBe(27.5);
    expect(summary.soldCount).toBe(2);
    expect(summary.purchasedCount).toBe(1);
  });

  it('returns zeroes for an empty list', () => {
    const summary = computeOrdersSummary([]);
    expect(summary).toEqual({ totalSold: 0, totalPurchased: 0, delta: 0, soldCount: 0, purchasedCount: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- vinted-calculations`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/vinted-calculations.ts
export interface StoredOrder {
  id: string;
  transactionId: number;
  orderType: 'sold' | 'purchased';
  title: string;
  priceAmount: string;
  priceCurrency: string;
  photoUrl: string | null;
  status: string;
  orderDate: string;
}

export interface OrdersSummary {
  totalSold: number;
  totalPurchased: number;
  delta: number;
  soldCount: number;
  purchasedCount: number;
}

export function computeOrdersSummary(orders: StoredOrder[]): OrdersSummary {
  let totalSold = 0;
  let totalPurchased = 0;
  let soldCount = 0;
  let purchasedCount = 0;

  for (const o of orders) {
    const amount = parseFloat(o.priceAmount) || 0;
    if (o.orderType === 'sold') {
      totalSold += amount;
      soldCount += 1;
    } else {
      totalPurchased += amount;
      purchasedCount += 1;
    }
  }

  return {
    totalSold,
    totalPurchased,
    delta: totalSold - totalPurchased,
    soldCount,
    purchasedCount,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- vinted-calculations`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/vinted-calculations.ts src/lib/vinted-calculations.test.ts
git commit -m "feat: compute sold/purchased totals and delta from stored orders"
```

---

### Task 5: Supabase schema for Vinted data

**Files:**
- Modify: `supabase-setup.sql`

- [ ] **Step 1: Append the new tables to `supabase-setup.sql`**

Add at the end of the existing file (do not remove the existing `user_data` table — other code may still reference it during transition):

```sql
-- Vinted cookie jar (one row per user), stored as encrypted JSON text.
create table public.vinted_session (
  user_id uuid references auth.users on delete cascade primary key,
  cookies_encrypted text not null,
  last_sync_status text not null default 'never_synced',
  last_sync_at timestamptz,
  updated_at timestamptz default now()
);

alter table public.vinted_session enable row level security;

create policy "select own vinted session"
  on public.vinted_session for select
  using (auth.uid() = user_id);

create policy "upsert own vinted session"
  on public.vinted_session for insert
  with check (auth.uid() = user_id);

create policy "update own vinted session"
  on public.vinted_session for update
  using (auth.uid() = user_id);

-- Vinted sales and purchases, synced from /my_orders.
create table public.vinted_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  transaction_id bigint not null,
  order_type text not null check (order_type in ('sold', 'purchased')),
  title text not null,
  price_amount text not null,
  price_currency text not null,
  photo_url text,
  status text not null,
  order_date timestamptz not null,
  synced_at timestamptz default now(),
  unique (user_id, transaction_id, order_type)
);

alter table public.vinted_orders enable row level security;

create policy "select own vinted orders"
  on public.vinted_orders for select
  using (auth.uid() = user_id);

create policy "insert own vinted orders"
  on public.vinted_orders for insert
  with check (auth.uid() = user_id);

create policy "update own vinted orders"
  on public.vinted_orders for update
  using (auth.uid() = user_id);
```

- [ ] **Step 2: Apply it to the Supabase project**

Open the Supabase dashboard for this project → SQL Editor → paste the new section above (from `-- Vinted cookie jar` to the end) → Run. Confirm no errors and that `vinted_session` and `vinted_orders` appear under Table Editor.

- [ ] **Step 3: Commit**

```bash
git add supabase-setup.sql
git commit -m "feat: add vinted_session and vinted_orders tables"
```

---

### Task 6: Server-side Supabase admin client

**Files:**
- Create: `src/lib/supabase-admin.ts`

The Cron-triggered sync route has no logged-in user session (no browser, no cookies from Supabase Auth), so it needs the service-role key to read/write across all users' rows, bypassing RLS. This key must **never** be exposed to the browser — only used inside API routes.

- [ ] **Step 1: Add the service role key placeholder to local env**

Add to `.env.local` (create the file if it doesn't exist — it's already gitignored via `.env*`):

```
SUPABASE_SERVICE_ROLE_KEY=paste-the-service-role-key-from-supabase-dashboard-settings-api
```

(Get the actual value from the Supabase dashboard → Project Settings → API → `service_role` secret key.)

- [ ] **Step 2: Create the admin client helper**

```typescript
// src/lib/supabase-admin.ts
import { createClient } from '@supabase/supabase-js';

/** Server-only client that bypasses Row Level Security. Never import this from a Client Component. */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase-admin.ts
git commit -m "feat: add server-only Supabase admin client for the sync route"
```

(`.env.local` is gitignored and won't be committed — that's expected.)

---

### Task 7: Cookie encryption helper

**Files:**
- Create: `src/lib/crypto.ts`
- Test: `src/lib/crypto.test.ts`

- [ ] **Step 1: Add an encryption secret to local env**

Add to `.env.local`:

```
VINTED_COOKIE_ENCRYPTION_KEY=generate-a-random-32-byte-hex-value
```

Generate one with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and paste its output as the value.

- [ ] **Step 2: Write the failing test**

```typescript
// src/lib/crypto.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { encrypt, decrypt } from './crypto';

beforeAll(() => {
  process.env.VINTED_COOKIE_ENCRYPTION_KEY = 'a'.repeat(64); // 32 bytes hex, test-only key
});

describe('encrypt/decrypt', () => {
  it('round-trips a string', () => {
    const plaintext = JSON.stringify([{ name: 'access_token_web', value: 'abc123' }]);
    const ciphertext = encrypt(plaintext);
    expect(ciphertext).not.toBe(plaintext);
    expect(decrypt(ciphertext)).toBe(plaintext);
  });

  it('produces different ciphertext each time (random IV)', () => {
    const a = encrypt('same input');
    const b = encrypt('same input');
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- crypto`
Expected: FAIL — module not found.

- [ ] **Step 4: Write the implementation**

```typescript
// src/lib/crypto.ts
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

function getKey(): Buffer {
  const hex = process.env.VINTED_COOKIE_ENCRYPTION_KEY;
  if (!hex) throw new Error('VINTED_COOKIE_ENCRYPTION_KEY is not set');
  return Buffer.from(hex, 'hex');
}

/** AES-256-GCM encrypt. Output format: base64(iv):base64(authTag):base64(ciphertext) */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`;
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(':');
  const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- crypto`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/crypto.ts src/lib/crypto.test.ts
git commit -m "feat: add AES-256-GCM encrypt/decrypt for stored Vinted cookies"
```

---

### Task 8: Sync API route (serverless Playwright)

**Files:**
- Create: `src/app/api/sync-vinted/route.ts`

- [ ] **Step 1: Install serverless-compatible Playwright**

Run: `npm install playwright-core @sparticuz/chromium`

- [ ] **Step 2: Write the route**

```typescript
// src/app/api/sync-vinted/route.ts
import { NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium';
import { chromium as playwrightChromium } from 'playwright-core';
import { createAdminClient } from '@/lib/supabase-admin';
import { decrypt } from '@/lib/crypto';
import { parseVintedOrders, type VintedOrder } from '@/lib/vinted-parser';

export const maxDuration = 60; // seconds — Vercel Pro allows up to 300; adjust if this proves too short

async function fetchOrdersHtml(
  cookies: { name: string; value: string; domain: string; path: string }[],
  orderType: 'sold' | 'purchased'
): Promise<string> {
  const browser = await playwrightChromium.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
  try {
    const context = await browser.newContext();
    await context.addCookies(cookies);
    const page = await context.newPage();
    await page.goto(`https://www.vinted.fr/my_orders?order_type=${orderType}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    return await page.content();
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
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
      const cookies = JSON.parse(decrypt(session.cookies_encrypted, session.user_id));

      const [soldHtml, purchasedHtml] = await Promise.all([
        fetchOrdersHtml(cookies, 'sold'),
        fetchOrdersHtml(cookies, 'purchased'),
      ]);

      const soldOrders = parseVintedOrders(soldHtml);
      const purchasedOrders = parseVintedOrders(purchasedHtml);

      if (soldOrders.length === 0 && purchasedOrders.length === 0 && soldHtml.includes('Se connecter')) {
        await supabase
          .from('vinted_session')
          .update({ last_sync_status: 'expired', last_sync_at: new Date().toISOString() })
          .eq('user_id', session.user_id);
        results[session.user_id] = 'expired';
        continue;
      }

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
      results[session.user_id] = `ok (${rows.length} orders)`;
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
```

- [ ] **Step 3: Add the Cron secret to local env**

Add to `.env.local`:

```
CRON_SECRET=generate-another-random-value
```

Generate with the same `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` command.

- [ ] **Step 4: Manual verification (no automated test — this hits a real account)**

This route cannot be unit-tested meaningfully (it depends on a real Vinted session and Supabase project). Verify manually once deployed:
1. Insert a test row into `vinted_session` (see Task 10 for how the Paramètres page will do this) or insert one directly via Supabase SQL Editor with a real encrypted cookie payload.
2. Call `GET /api/sync-vinted` with header `Authorization: Bearer <CRON_SECRET>` (e.g. via `curl` or a REST client).
3. Confirm `vinted_orders` rows appear in Supabase, and `last_sync_status` becomes `ok`.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/app/api/sync-vinted/route.ts
git commit -m "feat: add serverless sync route that reads Vinted orders via Playwright"
```

---

### Task 9: Vercel Cron configuration

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Create the Cron config**

```json
{
  "crons": [
    {
      "path": "/api/sync-vinted",
      "schedule": "0 */4 * * *"
    }
  ]
}
```

This runs the sync every 4 hours. Vercel automatically sends the `Authorization: Bearer <CRON_SECRET>` header on Cron-triggered requests when `CRON_SECRET` is set as a Vercel project environment variable (not just locally) — this must be added in the Vercel dashboard (Project → Settings → Environment Variables) before deploying, alongside `SUPABASE_SERVICE_ROLE_KEY` and `VINTED_COOKIE_ENCRYPTION_KEY`.

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "feat: schedule Vinted sync every 4 hours via Vercel Cron"
```

---

### Task 10: Remove finance-app modules

**Files:**
- Delete: `src/app/budget/`, `src/app/depenses/`, `src/app/notes/`, `src/app/objectifs/`, `src/app/pret/`
- Delete: `src/components/budget/`, `src/components/depenses/`, `src/components/notes/`, `src/components/objectifs/`, `src/components/pret/`
- Delete: `src/components/export/export-modal.tsx` (finance-specific HTML report — replaced in Task 13)
- Delete: `src/lib/calculations.ts`, `src/lib/storage.ts` (loan/expense-specific; `sync.ts` is also finance-specific and removed since Vinted data now lives directly in dedicated Supabase tables, not the `user_data` blob)
- Delete: `src/lib/sync.ts`
- Delete: `src/types/index.ts` (all types in it are finance-specific)
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Delete the finance-specific directories and files**

```bash
git rm -r src/app/budget src/app/depenses src/app/notes src/app/objectifs src/app/pret
git rm -r src/components/budget src/components/depenses src/components/notes src/components/objectifs src/components/pret
git rm src/components/export/export-modal.tsx
git rm src/lib/calculations.ts src/lib/storage.ts src/lib/sync.ts
git rm src/types/index.ts
```

- [ ] **Step 2: Update `src/app/layout.tsx`**

Remove references to the deleted components. Replace the full file with:

```tsx
import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { Navbar } from '@/components/layout/navbar';
import { FooterSection } from '@/components/layout/footer';
import { BeamsBackground } from '@/components/ui/beams-background';
import { BottomNav } from '@/components/layout/bottom-nav';
import { AuthGuard } from '@/components/auth/auth-guard';
import './globals.css';

const geist = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'VinWatch — Suivi des ventes et achats Vinted',
  description: 'Suivez automatiquement vos ventes et achats Vinted.',
  icons: { icon: '/favicon.ico', apple: '/logo.jpg' },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'VinWatch',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${geist.variable} dark`} suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#00c896" />
      </head>
      <body className="min-h-screen bg-[#08111e] text-slate-100 antialiased flex flex-col">
        <BeamsBackground intensity="medium" />
        <Navbar />
        <AuthGuard>
          <main className="pt-16 pb-10 sm:pb-10 pb-24 flex-1">{children}</main>
        </AuthGuard>
        <FooterSection />
        <BottomNav />
      </body>
    </html>
  );
}
```

(`SyncProvider` and `RecurringInjector` are dropped — both were part of the deleted localStorage↔Supabase blob sync for finance data; `FloatingNotes` is dropped with the Notes module.)

- [ ] **Step 3: Verify the build fails with clear errors pointing at remaining references**

Run: `npm run build`
Expected: Errors about missing imports in `dashboard-client.tsx`, `navbar.tsx`, `bottom-nav.tsx` — these are fixed in Tasks 11–14. This step just confirms the deletions took effect; do not try to fix everything here.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx
git commit -m "chore: remove finance-app modules (budget, dépenses, notes, objectifs, prêt)"
```

---

### Task 11: Update navigation

**Files:**
- Modify: `src/components/layout/navbar.tsx:12-19`
- Read first: `src/components/layout/bottom-nav.tsx`, `src/components/layout/expanding-nav.tsx` (mirror whatever link-list pattern they use — do not guess, adapt to what's actually there)

- [ ] **Step 1: Update the `links` array in `navbar.tsx`**

Replace lines 12-19 (the `links` array) with:

```typescript
const links = [
  { href: '/', label: 'Vue d’ensemble' },
  { href: '/ventes', label: 'Ventes' },
  { href: '/achats', label: 'Achats' },
  { href: '/parametres', label: 'Paramètres' },
];
```

Also remove the `<ExportModal />` import and usages (lines with `import { ExportModal }` and both `<ExportModal />` JSX usages) — it's rebuilt in Task 13 and re-added then.

- [ ] **Step 2: Rename the logo text from "Depenzo" to "VinWatch"**

In the same file, find `<span className="text-xl font-bold text-slate-100 tracking-tight">Depenzo</span>` and change `Depenzo` to `VinWatch`.

- [ ] **Step 3: Open `bottom-nav.tsx` and `expanding-nav.tsx`, update their link lists the same way**

These weren't read during planning — open them, find their equivalent hardcoded link/icon arrays (they'll reference `/depenses`, `/budget`, etc. same as `navbar.tsx` did), and replace with the same 4 links from Step 1. Match each file's existing icon-import pattern (e.g. if `expanding-nav.tsx` pairs each link with a `lucide-react` icon, pick reasonable icons: `LayoutDashboard` for Vue d'ensemble, `TrendingUp` for Ventes, `ShoppingBag` for Achats, `Settings` for Paramètres).

- [ ] **Step 4: Verify no dangling imports remain**

Run: `npm run build` — expect the same missing-page errors as Task 10 Step 3 (not new navbar-related errors). If there are new errors from these two files, fix them before moving on.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/navbar.tsx src/components/layout/bottom-nav.tsx src/components/layout/expanding-nav.tsx
git commit -m "feat: update navigation to Vue d'ensemble/Ventes/Achats/Paramètres"
```

---

### Task 12: Data-fetching helper for orders

**Files:**
- Create: `src/lib/vinted-orders.ts`

- [ ] **Step 1: Write the client-side fetch helper**

Pages need real Supabase rows, not localStorage — this is a fresh helper (not adapted from the deleted `storage.ts`).

```typescript
// src/lib/vinted-orders.ts
import { createClient } from './supabase';
import type { StoredOrder } from './vinted-calculations';

export async function getOrders(orderType?: 'sold' | 'purchased'): Promise<StoredOrder[]> {
  const supabase = createClient();
  let query = supabase.from('vinted_orders').select('*').order('order_date', { ascending: false });
  if (orderType) query = query.eq('order_type', orderType);

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    transactionId: row.transaction_id,
    orderType: row.order_type,
    title: row.title,
    priceAmount: row.price_amount,
    priceCurrency: row.price_currency,
    photoUrl: row.photo_url,
    status: row.status,
    orderDate: row.order_date,
  }));
}

export async function getSyncStatus(): Promise<{ status: string; lastSyncAt: string | null } | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('vinted_session')
    .select('last_sync_status, last_sync_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!data) return null;
  return { status: data.last_sync_status, lastSyncAt: data.last_sync_at };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/vinted-orders.ts
git commit -m "feat: add client helper to fetch Vinted orders and sync status from Supabase"
```

---

### Task 13: Ventes and Achats pages

**Files:**
- Create: `src/app/ventes/page.tsx`
- Create: `src/components/ventes/ventes-client.tsx`
- Create: `src/app/achats/page.tsx`
- Create: `src/components/achats/achats-client.tsx`

- [ ] **Step 1: Create the shared-shape client component for Ventes**

```tsx
// src/components/ventes/ventes-client.tsx
'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getOrders } from '@/lib/vinted-orders';
import type { StoredOrder } from '@/lib/vinted-calculations';
import { PackageCheck } from 'lucide-react';

function formatPrice(order: StoredOrder): string {
  return `${order.priceAmount} ${order.priceCurrency}`;
}

export function VentesClient() {
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrders('sold').then((data) => {
      setOrders(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 sm:px-6 lg:px-8 pt-8">
      <h1 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-2">
        <PackageCheck className="w-5 h-5 text-[#00c896]" />
        Ventes ({orders.length})
      </h1>

      {loading ? (
        <p className="text-slate-500 text-sm">Chargement…</p>
      ) : orders.length === 0 ? (
        <p className="text-slate-500 text-sm">Aucune vente synchronisée pour l&apos;instant.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.id} className="bg-[#1a2d42]/80 border-[#243552]">
              <CardContent className="flex items-center gap-4 py-4">
                {order.photoUrl && (
                  <Image
                    src={order.photoUrl}
                    alt={order.title}
                    width={56}
                    height={56}
                    className="rounded-lg object-cover shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{order.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(order.orderDate).toLocaleDateString('fr-FR')} · {order.status}
                  </p>
                </div>
                <span className="text-sm font-semibold text-[#00c896] shrink-0">{formatPrice(order)}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create the Ventes page**

```tsx
// src/app/ventes/page.tsx
import { VentesClient } from '@/components/ventes/ventes-client';

export default function VentesPage() {
  return <VentesClient />;
}
```

- [ ] **Step 3: Create the Achats client component (mirror of Ventes)**

```tsx
// src/components/achats/achats-client.tsx
'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { getOrders } from '@/lib/vinted-orders';
import type { StoredOrder } from '@/lib/vinted-calculations';
import { ShoppingBag } from 'lucide-react';

function formatPrice(order: StoredOrder): string {
  return `${order.priceAmount} ${order.priceCurrency}`;
}

export function AchatsClient() {
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrders('purchased').then((data) => {
      setOrders(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 sm:px-6 lg:px-8 pt-8">
      <h1 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-2">
        <ShoppingBag className="w-5 h-5 text-[#00c896]" />
        Achats ({orders.length})
      </h1>

      {loading ? (
        <p className="text-slate-500 text-sm">Chargement…</p>
      ) : orders.length === 0 ? (
        <p className="text-slate-500 text-sm">Aucun achat synchronisé pour l&apos;instant.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.id} className="bg-[#1a2d42]/80 border-[#243552]">
              <CardContent className="flex items-center gap-4 py-4">
                {order.photoUrl && (
                  <Image
                    src={order.photoUrl}
                    alt={order.title}
                    width={56}
                    height={56}
                    className="rounded-lg object-cover shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{order.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(order.orderDate).toLocaleDateString('fr-FR')} · {order.status}
                  </p>
                </div>
                <span className="text-sm font-semibold text-red-400 shrink-0">-{formatPrice(order)}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create the Achats page**

```tsx
// src/app/achats/page.tsx
import { AchatsClient } from '@/components/achats/achats-client';

export default function AchatsPage() {
  return <AchatsClient />;
}
```

- [ ] **Step 5: Verify the build**

Run: `npm run build`
Expected: no errors referencing `/ventes` or `/achats`.

- [ ] **Step 6: Commit**

```bash
git add src/app/ventes src/app/achats src/components/ventes src/components/achats
git commit -m "feat: add Ventes and Achats list pages"
```

---

### Task 14: Vue d'ensemble (dashboard) page

**Files:**
- Modify: `src/components/dashboard/dashboard-client.tsx` (full rewrite)

- [ ] **Step 1: Rewrite the dashboard client**

Replace the full contents of `src/components/dashboard/dashboard-client.tsx`:

```tsx
// src/components/dashboard/dashboard-client.tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { HeroGeometric } from '@/components/ui/shape-landing-hero';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getOrders } from '@/lib/vinted-orders';
import { computeOrdersSummary, type StoredOrder, type OrdersSummary } from '@/lib/vinted-calculations';
import { TrendingUp, TrendingDown, Wallet, PackageCheck } from 'lucide-react';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
} from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

function buildDailySeries(orders: StoredOrder[], type: 'sold' | 'purchased'): { labels: string[]; data: number[] } {
  const byDay: Record<string, number> = {};
  for (const o of orders) {
    if (o.orderType !== type) continue;
    const day = o.orderDate.slice(0, 10);
    byDay[day] = (byDay[day] || 0) + (parseFloat(o.priceAmount) || 0);
  }
  const days = Object.keys(byDay).sort();
  return { labels: days, data: days.map((d) => byDay[d]) };
}

export function DashboardClient() {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  const [summary, setSummary] = useState<OrdersSummary>({
    totalSold: 0, totalPurchased: 0, delta: 0, soldCount: 0, purchasedCount: 0,
  });
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    getOrders().then((orders) => {
      setSummary(computeOrdersSummary(orders));
      setHasData(orders.length > 0);

      if (chartRef.current) {
        if (chartInstanceRef.current) chartInstanceRef.current.destroy();

        const sold = buildDailySeries(orders, 'sold');
        const purchased = buildDailySeries(orders, 'purchased');
        const allDays = Array.from(new Set([...sold.labels, ...purchased.labels])).sort();

        if (allDays.length > 0) {
          chartInstanceRef.current = new Chart(chartRef.current, {
            type: 'line',
            data: {
              labels: allDays,
              datasets: [
                {
                  label: 'Ventes',
                  data: allDays.map((d) => sold.labels.includes(d) ? sold.data[sold.labels.indexOf(d)] : 0),
                  borderColor: '#00c896',
                  backgroundColor: '#00c89622',
                  tension: 0.3,
                },
                {
                  label: 'Achats',
                  data: allDays.map((d) => purchased.labels.includes(d) ? purchased.data[purchased.labels.indexOf(d)] : 0),
                  borderColor: '#ef4444',
                  backgroundColor: '#ef444422',
                  tension: 0.3,
                },
              ],
            },
            options: {
              responsive: true,
              plugins: { legend: { labels: { color: '#94a3b8' } } },
              scales: {
                x: { ticks: { color: '#64748b' }, grid: { color: '#243552' } },
                y: { ticks: { color: '#64748b' }, grid: { color: '#243552' } },
              },
            },
          });
        }
      }
    });
  }, []);

  return (
    <div className="relative">
      <HeroGeometric />

      <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
          <Card className="bg-[#1a2d42]/80 border-[#243552] backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#00c896]" />
                Total ventes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-[#00c896]">{formatCurrency(summary.totalSold)}</p>
              <p className="text-xs text-slate-500 mt-1">{summary.soldCount} vente{summary.soldCount > 1 ? 's' : ''}</p>
            </CardContent>
          </Card>

          <Card className="bg-[#1a2d42]/80 border-[#243552] backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-400" />
                Total achats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-400">{formatCurrency(summary.totalPurchased)}</p>
              <p className="text-xs text-slate-500 mt-1">{summary.purchasedCount} achat{summary.purchasedCount > 1 ? 's' : ''}</p>
            </CardContent>
          </Card>

          <Card className="bg-[#1a2d42]/80 border-[#243552] backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-[#00c896]" />
                Delta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${summary.delta >= 0 ? 'text-[#00c896]' : 'text-red-400'}`}>
                {formatCurrency(summary.delta)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Ventes − achats</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-[#1a2d42]/80 border-[#243552] backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-slate-100">Évolution</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center min-h-[260px]">
            {hasData ? (
              <canvas ref={chartRef} />
            ) : (
              <div className="flex flex-col items-center gap-2 text-center">
                <PackageCheck className="w-8 h-8 text-slate-600" />
                <p className="text-slate-400 text-sm font-medium">Aucune donnée pour l&apos;instant</p>
                <Link href="/parametres" className="text-xs text-[#00c896] hover:underline">
                  Configurer la synchronisation →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify `src/app/page.tsx` still just renders `<DashboardClient />`**

Read `src/app/page.tsx` — if it already does `return <DashboardClient />;` with nothing finance-specific, leave it as-is. If it references anything deleted in Task 10, fix it to match this minimal shape.

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/dashboard-client.tsx src/app/page.tsx
git commit -m "feat: rewrite dashboard as Vinted sales/purchases overview"
```

---

### Task 15: Paramètres page (cookie paste + sync status)

**Files:**
- Create: `src/app/parametres/page.tsx`
- Create: `src/components/parametres/parametres-client.tsx`
- Create: `src/app/api/vinted-session/route.ts`

- [ ] **Step 1: Create the API route that encrypts and stores the pasted cookies**

This runs server-side (has access to the encryption key) but is called from the browser by a logged-in user, so it uses the regular (non-admin) server helper tied to that request's session — simplest correct approach here is to accept the already-authenticated Supabase client's user id from the request body's verified session token. To keep this simple and consistent with the rest of the app (which relies on `auth.uid()` via RLS), use the admin client but verify the caller's identity first via their access token:

```typescript
// src/app/api/vinted-session/route.ts
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { encrypt } from '@/lib/crypto';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const supabase = createAdminClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await request.json();
  if (!Array.isArray(body.cookies) || body.cookies.length === 0) {
    return NextResponse.json({ error: 'cookies array is required' }, { status: 400 });
  }

  const encrypted = encrypt(JSON.stringify(body.cookies), user.id);

  const { error } = await supabase
    .from('vinted_session')
    .upsert(
      { user_id: user.id, cookies_encrypted: encrypted, last_sync_status: 'never_synced' },
      { onConflict: 'user_id' }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Create the Paramètres client component**

```tsx
// src/components/parametres/parametres-client.tsx
'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { getSyncStatus } from '@/lib/vinted-orders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ButtonColorful } from '@/components/ui/button-colorful';
import { KeyRound } from 'lucide-react';

export function ParametresClient() {
  const [cookiesJson, setCookiesJson] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<{ status: string; lastSyncAt: string | null } | null>(null);

  useEffect(() => {
    getSyncStatus().then(setStatus);
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const cookies = JSON.parse(cookiesJson);
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non connecté');

      const res = await fetch('/api/vinted-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ cookies }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Erreur inconnue');

      setMessage('Cookies enregistrés. La prochaine synchronisation les utilisera.');
      setCookiesJson('');
    } catch (err) {
      setMessage(`Erreur : ${err instanceof Error ? err.message : 'format JSON invalide'}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-10 sm:px-6 lg:px-8 pt-8">
      <h1 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-2">
        <KeyRound className="w-5 h-5 text-[#00c896]" />
        Paramètres
      </h1>

      <Card className="bg-[#1a2d42]/80 border-[#243552] mb-6">
        <CardHeader>
          <CardTitle className="text-slate-100 text-base">Statut de la synchronisation</CardTitle>
        </CardHeader>
        <CardContent>
          {status ? (
            <p className="text-sm text-slate-300">
              Statut : <strong>{status.status}</strong>
              {status.lastSyncAt && ` — dernière tentative le ${new Date(status.lastSyncAt).toLocaleString('fr-FR')}`}
            </p>
          ) : (
            <p className="text-sm text-slate-500">Aucune synchronisation configurée pour l&apos;instant.</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-[#1a2d42]/80 border-[#243552]">
        <CardHeader>
          <CardTitle className="text-slate-100 text-base">Connexion à Vinted</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            Installe l&apos;extension <strong>Cookie-Editor</strong>, va sur vinted.fr connecté, ouvre
            l&apos;extension, clique sur &laquo;&nbsp;Export&nbsp;&raquo; → &laquo;&nbsp;Export as JSON&nbsp;&raquo;
            (copie dans le presse-papiers), puis colle le résultat ci-dessous.
          </p>
          <textarea
            value={cookiesJson}
            onChange={(e) => setCookiesJson(e.target.value)}
            placeholder='[{"name":"access_token_web","value":"...","domain":".vinted.fr",...}, ...]'
            rows={6}
            className="w-full rounded-lg bg-[#0d1b2a] border border-[#243552] p-3 text-xs text-slate-200 font-mono"
          />
          {message && <p className="text-xs text-slate-300">{message}</p>}
          <ButtonColorful
            onClick={handleSave}
            disabled={saving || cookiesJson.trim().length === 0}
            label={saving ? 'Enregistrement…' : 'Enregistrer'}
            showArrow={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Create the Paramètres page**

```tsx
// src/app/parametres/page.tsx
import { ParametresClient } from '@/components/parametres/parametres-client';

export default function ParametresPage() {
  return <ParametresClient />;
}
```

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Run `npm run dev`, sign in, go to `/parametres`, paste a syntactically-valid JSON array (even dummy values), click Enregistrer, confirm the success message appears and a row shows up in `vinted_session` in the Supabase dashboard.

- [ ] **Step 6: Commit**

```bash
git add src/app/parametres src/components/parametres src/app/api/vinted-session
git commit -m "feat: add Paramètres page for pasting Vinted cookies and viewing sync status"
```

---

### Task 16: CSV export

**Files:**
- Create: `src/components/export/export-button.tsx`
- Modify: `src/components/layout/navbar.tsx`

- [ ] **Step 1: Write the export component**

```tsx
// src/components/export/export-button.tsx
'use client';
import { getOrders } from '@/lib/vinted-orders';
import { Share2 } from 'lucide-react';

function toCsv(rows: { title: string; priceAmount: string; priceCurrency: string; orderDate: string; status: string; orderType: string }[]): string {
  const header = 'Type,Titre,Prix,Devise,Date,Statut';
  const lines = rows.map((r) =>
    [r.orderType, `"${r.title.replace(/"/g, '""')}"`, r.priceAmount, r.priceCurrency, r.orderDate, `"${r.status}"`].join(',')
  );
  return [header, ...lines].join('\n');
}

export function ExportButton() {
  async function handleExport() {
    const orders = await getOrders();
    const csv = toCsv(orders);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vinted-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-[#1a2d42]/60 transition-colors cursor-pointer"
    >
      <Share2 className="w-4 h-4" />
      <span className="hidden sm:inline">Exporter</span>
    </button>
  );
}
```

- [ ] **Step 2: Re-add it to the navbar**

In `src/components/layout/navbar.tsx`, add the import:

```typescript
import { ExportButton } from '@/components/export/export-button';
```

And restore both usages that were removed in Task 11 (desktop nav row and mobile dropdown), using `<ExportButton />` in place of the old `<ExportModal />`.

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/export/export-button.tsx src/components/layout/navbar.tsx
git commit -m "feat: add CSV export for Vinted orders"
```

---

### Task 17: Final full-suite check

- [ ] **Step 1: Run all unit tests**

Run: `npm test`
Expected: all tests pass (parser, calculations, crypto).

- [ ] **Step 2: Run the full build once more**

Run: `npm run build`
Expected: succeeds with no errors, routes listed include `/`, `/ventes`, `/achats`, `/parametres`, `/api/sync-vinted`, `/api/vinted-session`, `/auth/signin`, `/auth/signup`.

- [ ] **Step 3: Manual smoke test**

Run `npm run dev`, sign in, click through Vue d'ensemble / Ventes / Achats / Paramètres — confirm each loads without a console error (empty states are expected until Task 8's route has synced real data).
