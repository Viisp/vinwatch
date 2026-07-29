# Vinted Margin Tracking ("Comptabilité") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user see, per resold Vinted item, how much margin they made (sale price − purchase cost), by manually linking a sold order to a stock item (either an already-synced Vinted purchase, or a manually entered external-source item), on a new "Comptabilité" page.

**Architecture:** A new `stock_items` Supabase table holds cost-basis entries. Every purchased order synced by `/api/sync-vinted` automatically gets a matching `stock_items` row (idempotent via a unique index on `source_order_id`). The user links a sold order to a stock item from a new `/comptabilite` page; the link is a plain authenticated Supabase write (no new API route needed, same pattern as the existing Ventes/Achats pages). Margin is computed at render time, never stored.

**Tech Stack:** Next.js App Router, TypeScript, Supabase (Postgres + RLS + `@supabase/ssr` browser client), Vitest, Tailwind.

**Spec:** `docs/superpowers/specs/2026-07-29-vinted-margin-tracking-design.md`

---

### Task 1: Add the `stock_items` table to the Supabase schema

**Files:**
- Modify: `supabase-setup.sql`

- [ ] **Step 1: Append the table definition**

Add this to the end of `supabase-setup.sql`:

```sql

-- Stock items: cost basis for resold articles, either auto-created from a
-- synced Vinted purchase (source_order_id set) or entered manually for
-- externally-sourced items (source_order_id null). The unique index on
-- source_order_id makes the sync route's stock-creation upsert idempotent
-- and lets Postgres allow unlimited manual rows (multiple NULLs are fine).
create table public.stock_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  source text not null check (source in ('vinted', 'manual')),
  source_order_id uuid references public.vinted_orders(id) on delete set null,
  title text not null,
  cost_amount text not null,
  cost_currency text not null,
  acquired_date timestamptz not null,
  photo_url text,
  linked_sale_order_id uuid references public.vinted_orders(id) on delete set null,
  created_at timestamptz default now(),
  unique (source_order_id)
);

alter table public.stock_items enable row level security;

create policy "select own stock items"
  on public.stock_items for select
  using (auth.uid() = user_id);

create policy "insert own stock items"
  on public.stock_items for insert
  with check (auth.uid() = user_id);

create policy "update own stock items"
  on public.stock_items for update
  using (auth.uid() = user_id);

create policy "delete own stock items"
  on public.stock_items for delete
  using (auth.uid() = user_id);
```

- [ ] **Step 2: Commit**

```bash
git add supabase-setup.sql
git commit -m "feat: add stock_items table for margin tracking"
```

Note for whoever deploys this: the SQL must also be run manually against the
live Supabase project (SQL Editor → paste the new block above → Run), same
as every other schema change in this project. This plan does not automate
that step.

---

### Task 2: Margin calculation and stock-from-purchase mapping (pure logic, TDD)

**Files:**
- Create: `src/lib/vinted-margin.ts`
- Test: `src/lib/vinted-margin.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/vinted-margin.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { computeMargin, buildStockItemFromPurchase } from './vinted-margin';

describe('computeMargin', () => {
  it('returns sale price minus cost price', () => {
    expect(computeMargin('25.00', '10.00')).toBeCloseTo(15);
  });

  it('returns a negative number when the sale was a loss', () => {
    expect(computeMargin('8.00', '10.00')).toBeCloseTo(-2);
  });

  it('treats unparseable amounts as zero', () => {
    expect(computeMargin('abc', '10.00')).toBeCloseTo(-10);
    expect(computeMargin('20.00', 'abc')).toBeCloseTo(20);
  });
});

describe('buildStockItemFromPurchase', () => {
  it('maps a purchased order row into a stock_items insert payload', () => {
    const order = {
      id: 'order-123',
      title: 'Robe fleurie',
      price_amount: '12.50',
      price_currency: 'EUR',
      order_date: '2026-07-01T10:00:00.000Z',
      photo_url: 'https://images.vinted.net/photo.jpg',
    };

    expect(buildStockItemFromPurchase(order, 'user-abc')).toEqual({
      user_id: 'user-abc',
      source: 'vinted',
      source_order_id: 'order-123',
      title: 'Robe fleurie',
      cost_amount: '12.50',
      cost_currency: 'EUR',
      acquired_date: '2026-07-01T10:00:00.000Z',
      photo_url: 'https://images.vinted.net/photo.jpg',
    });
  });

  it('preserves a null photo_url', () => {
    const order = {
      id: 'order-456',
      title: 'Jean',
      price_amount: '9.00',
      price_currency: 'EUR',
      order_date: '2026-07-02T10:00:00.000Z',
      photo_url: null,
    };

    expect(buildStockItemFromPurchase(order, 'user-abc').photo_url).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm test -- --run src/lib/vinted-margin.test.ts`
Expected: FAIL — `Cannot find module './vinted-margin'`

- [ ] **Step 3: Write the implementation**

Create `src/lib/vinted-margin.ts`:

```typescript
export interface StockItem {
  id: string;
  userId: string;
  source: 'vinted' | 'manual';
  sourceOrderId: string | null;
  title: string;
  costAmount: string;
  costCurrency: string;
  acquiredDate: string;
  photoUrl: string | null;
  linkedSaleOrderId: string | null;
}

export interface PurchasedOrderRow {
  id: string;
  title: string;
  price_amount: string;
  price_currency: string;
  order_date: string;
  photo_url: string | null;
}

/** Margin = sale price − stock item cost, both parsed as decimal numbers. */
export function computeMargin(salePriceAmount: string, stockCostAmount: string): number {
  const sale = parseFloat(salePriceAmount) || 0;
  const cost = parseFloat(stockCostAmount) || 0;
  return sale - cost;
}

/**
 * Builds the stock_items insert payload for a newly-synced purchased order.
 * Used by the sync route so every purchased order automatically becomes
 * available stock without the user having to do anything.
 */
export function buildStockItemFromPurchase(order: PurchasedOrderRow, userId: string) {
  return {
    user_id: userId,
    source: 'vinted' as const,
    source_order_id: order.id,
    title: order.title,
    cost_amount: order.price_amount,
    cost_currency: order.price_currency,
    acquired_date: order.order_date,
    photo_url: order.photo_url,
  };
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm test -- --run src/lib/vinted-margin.test.ts`
Expected: PASS — 5 tests passing

- [ ] **Step 5: Commit**

```bash
git add src/lib/vinted-margin.ts src/lib/vinted-margin.test.ts
git commit -m "feat: add margin calculation and purchase-to-stock mapping"
```

---

### Task 3: Data-fetching module for stock items and margin pairs

**Files:**
- Create: `src/lib/stock-items.ts`

No test file for this task — it's Supabase read/write orchestration, matching
the existing convention in this codebase where `src/lib/vinted-orders.ts`
(same shape: browser-client queries) has no test file either. Only pure
logic (Task 2) gets unit tests.

- [ ] **Step 1: Write the implementation**

Create `src/lib/stock-items.ts`:

```typescript
import { createClient } from './supabase';
import type { StoredOrder } from './vinted-calculations';
import type { StockItem } from './vinted-margin';
import { computeMargin } from './vinted-margin';

function toStockItem(row: Record<string, unknown>): StockItem {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    source: row.source as 'vinted' | 'manual',
    sourceOrderId: (row.source_order_id as string | null) ?? null,
    title: row.title as string,
    costAmount: row.cost_amount as string,
    costCurrency: row.cost_currency as string,
    acquiredDate: row.acquired_date as string,
    photoUrl: (row.photo_url as string | null) ?? null,
    linkedSaleOrderId: (row.linked_sale_order_id as string | null) ?? null,
  };
}

function toStoredOrder(row: Record<string, unknown>): StoredOrder {
  return {
    id: row.id as string,
    transactionId: row.transaction_id as number,
    orderType: row.order_type as 'sold' | 'purchased',
    title: row.title as string,
    priceAmount: row.price_amount as string,
    priceCurrency: row.price_currency as string,
    photoUrl: (row.photo_url as string | null) ?? null,
    status: row.status as string,
    orderDate: row.order_date as string,
  };
}

export interface MarginPair {
  stockItem: StockItem;
  saleOrder: StoredOrder;
  margin: number;
}

/** Sold orders that have no stock_items row linked to them yet. */
export async function getUnlinkedSales(): Promise<StoredOrder[]> {
  const supabase = createClient();

  const [{ data: sales, error: salesError }, { data: linked, error: linkedError }] = await Promise.all([
    supabase.from('vinted_orders').select('*').eq('order_type', 'sold').order('order_date', { ascending: false }),
    supabase.from('stock_items').select('linked_sale_order_id').not('linked_sale_order_id', 'is', null),
  ]);

  if (salesError) {
    console.error('[getUnlinkedSales] sales query failed:', salesError.message);
    return [];
  }
  if (linkedError) {
    console.error('[getUnlinkedSales] linked query failed:', linkedError.message);
    return [];
  }

  const linkedIds = new Set((linked ?? []).map((r) => r.linked_sale_order_id as string));
  return (sales ?? []).filter((row) => !linkedIds.has(row.id as string)).map(toStoredOrder);
}

/** Stock items (Vinted purchases + manual entries) not yet linked to a sale. */
export async function getUnlinkedStock(): Promise<StockItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('stock_items')
    .select('*')
    .is('linked_sale_order_id', null)
    .order('acquired_date', { ascending: false });

  if (error) {
    console.error('[getUnlinkedStock] query failed:', error.message);
    return [];
  }
  return (data ?? []).map(toStockItem);
}

/** Stock items already linked to a sale, paired with that sale and the computed margin. */
export async function getLinkedPairs(): Promise<MarginPair[]> {
  const supabase = createClient();
  const { data: stockRows, error: stockError } = await supabase
    .from('stock_items')
    .select('*')
    .not('linked_sale_order_id', 'is', null);

  if (stockError) {
    console.error('[getLinkedPairs] stock query failed:', stockError.message);
    return [];
  }
  if (!stockRows || stockRows.length === 0) return [];

  const saleIds = stockRows.map((r) => r.linked_sale_order_id as string);
  const { data: saleRows, error: salesError } = await supabase.from('vinted_orders').select('*').in('id', saleIds);

  if (salesError) {
    console.error('[getLinkedPairs] sales query failed:', salesError.message);
    return [];
  }

  const salesById = new Map((saleRows ?? []).map((row) => [row.id as string, toStoredOrder(row)]));

  const pairs: MarginPair[] = [];
  for (const row of stockRows) {
    const stockItem = toStockItem(row);
    const saleOrder = stockItem.linkedSaleOrderId ? salesById.get(stockItem.linkedSaleOrderId) : undefined;
    if (!saleOrder) continue;
    pairs.push({ stockItem, saleOrder, margin: computeMargin(saleOrder.priceAmount, stockItem.costAmount) });
  }
  return pairs.sort((a, b) => new Date(b.saleOrder.orderDate).getTime() - new Date(a.saleOrder.orderDate).getTime());
}

export async function linkSaleToStock(stockItemId: string, saleOrderId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from('stock_items')
    .update({ linked_sale_order_id: saleOrderId })
    .eq('id', stockItemId);
  return { error: error ? error.message : null };
}

export interface ManualStockItemInput {
  title: string;
  costAmount: string;
  costCurrency: string;
  acquiredDate: string;
  photoUrl?: string;
}

export async function addManualStockItem(input: ManualStockItemInput): Promise<{ error: string | null }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Non connecté' };

  const { error } = await supabase.from('stock_items').insert({
    user_id: user.id,
    source: 'manual',
    source_order_id: null,
    title: input.title,
    cost_amount: input.costAmount,
    cost_currency: input.costCurrency,
    acquired_date: input.acquiredDate,
    photo_url: input.photoUrl ?? null,
    linked_sale_order_id: null,
  });
  return { error: error ? error.message : null };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/stock-items.ts
git commit -m "feat: add stock item data-fetching and linking helpers"
```

---

### Task 4: Auto-create stock items from synced purchases

**Files:**
- Modify: `src/app/api/sync-vinted/route.ts`

- [ ] **Step 1: Add the import**

At the top of `src/app/api/sync-vinted/route.ts`, add this line after the
existing `parseVintedOrders` import:

```typescript
import { buildStockItemFromPurchase } from '@/lib/vinted-margin';
```

- [ ] **Step 2: Capture upserted row ids and auto-create stock items**

Find this block (currently around line 157-162):

```typescript
      if (rows.length > 0) {
        const { error: upsertError } = await supabase
          .from('vinted_orders')
          .upsert(rows, { onConflict: 'user_id,transaction_id,order_type' });
        if (upsertError) throw upsertError;
      }
```

Replace it with:

```typescript
      if (rows.length > 0) {
        const { data: upsertedRows, error: upsertError } = await supabase
          .from('vinted_orders')
          .upsert(rows, { onConflict: 'user_id,transaction_id,order_type' })
          .select('id, order_type, title, price_amount, price_currency, order_date, photo_url');
        if (upsertError) throw upsertError;

        // Every purchased order becomes available stock automatically. The
        // unique index on stock_items.source_order_id (see supabase-setup.sql)
        // plus ignoreDuplicates makes this safe to re-run on every sync: an
        // already-linked stock item is left untouched rather than having its
        // linked_sale_order_id wiped back to null.
        const purchasedRows = (upsertedRows ?? []).filter((r) => r.order_type === 'purchased');
        if (purchasedRows.length > 0) {
          const stockRows = purchasedRows.map((r) => buildStockItemFromPurchase(r, session.user_id));
          const { error: stockError } = await supabase
            .from('stock_items')
            .upsert(stockRows, { onConflict: 'source_order_id', ignoreDuplicates: true });
          if (stockError) throw stockError;
        }
      }
```

- [ ] **Step 3: Typecheck and build**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed with no errors

- [ ] **Step 4: Commit**

```bash
git add src/app/api/sync-vinted/route.ts
git commit -m "feat: auto-create stock items from synced Vinted purchases"
```

---

### Task 5: Comptabilité page

**Files:**
- Create: `src/app/comptabilite/page.tsx`
- Create: `src/components/comptabilite/comptabilite-client.tsx`

- [ ] **Step 1: Create the page wrapper**

Create `src/app/comptabilite/page.tsx`:

```typescript
import { ComptabiliteClient } from '@/components/comptabilite/comptabilite-client';

export default function ComptabilitePage() {
  return <ComptabiliteClient />;
}
```

- [ ] **Step 2: Create the client component**

Create `src/components/comptabilite/comptabilite-client.tsx`:

```typescript
'use client';
import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ButtonColorful } from '@/components/ui/button-colorful';
import { Wallet, Package } from 'lucide-react';
import type { StoredOrder } from '@/lib/vinted-calculations';
import type { StockItem } from '@/lib/vinted-margin';
import {
  getLinkedPairs,
  getUnlinkedSales,
  getUnlinkedStock,
  linkSaleToStock,
  addManualStockItem,
  type MarginPair,
} from '@/lib/stock-items';

function formatPrice(amount: string, currency: string): string {
  return `${amount} ${currency}`;
}

function MarginBadge({ margin, currency }: { margin: number; currency: string }) {
  const positive = margin >= 0;
  return (
    <span className={positive ? 'text-[#00c896] font-semibold' : 'text-red-400 font-semibold'}>
      {positive ? '+' : ''}
      {margin.toFixed(2)} {currency}
    </span>
  );
}

export function ComptabiliteClient() {
  const [pairs, setPairs] = useState<MarginPair[]>([]);
  const [unlinkedSales, setUnlinkedSales] = useState<StoredOrder[]>([]);
  const [unlinkedStock, setUnlinkedStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [linking, setLinking] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  const [manualTitle, setManualTitle] = useState('');
  const [manualCost, setManualCost] = useState('');
  const [manualCurrency, setManualCurrency] = useState('EUR');
  const [manualDate, setManualDate] = useState('');
  const [manualPhoto, setManualPhoto] = useState('');
  const [addingManual, setAddingManual] = useState(false);
  const [manualMessage, setManualMessage] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    const [pairsData, salesData, stockData] = await Promise.all([
      getLinkedPairs(),
      getUnlinkedSales(),
      getUnlinkedStock(),
    ]);
    setPairs(pairsData);
    setUnlinkedSales(salesData);
    setUnlinkedStock(stockData);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleLink(saleOrderId: string) {
    const stockItemId = selection[saleOrderId];
    if (!stockItemId) return;
    setLinking(saleOrderId);
    setLinkError(null);
    const { error } = await linkSaleToStock(stockItemId, saleOrderId);
    if (error) {
      setLinkError(`Erreur : ${error}`);
    } else {
      await loadAll();
    }
    setLinking(null);
  }

  async function handleAddManual() {
    setAddingManual(true);
    setManualMessage(null);
    const { error } = await addManualStockItem({
      title: manualTitle,
      costAmount: manualCost,
      costCurrency: manualCurrency,
      acquiredDate: new Date(manualDate).toISOString(),
      photoUrl: manualPhoto || undefined,
    });
    if (error) {
      setManualMessage(`Erreur : ${error}`);
    } else {
      setManualTitle('');
      setManualCost('');
      setManualDate('');
      setManualPhoto('');
      setManualMessage('Article ajouté au stock.');
      await loadAll();
    }
    setAddingManual(false);
  }

  const totalMargin = pairs.reduce((sum, p) => sum + p.margin, 0);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 pb-10 sm:px-6 lg:px-8 pt-8">
        <p className="text-slate-500 text-sm">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 sm:px-6 lg:px-8 pt-8 space-y-8">
      <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
        <Wallet className="w-5 h-5 text-[#00c896]" />
        Comptabilité
      </h1>

      <Card className="bg-[#1a2d42]/80 border-[#243552]">
        <CardHeader>
          <CardTitle className="text-slate-100 text-base">Marges calculées ({pairs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {pairs.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune marge calculée pour l&apos;instant.</p>
          ) : (
            <div className="space-y-3">
              {pairs.map((pair) => (
                <div
                  key={pair.stockItem.id}
                  className="flex items-center gap-4 py-2 border-b border-[#243552] last:border-0"
                >
                  {pair.saleOrder.photoUrl ? (
                    <Image
                      src={pair.saleOrder.photoUrl}
                      alt={pair.saleOrder.title}
                      width={44}
                      height={44}
                      className="rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-[44px] h-[44px] rounded-lg bg-[#243552] flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4 text-slate-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{pair.saleOrder.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Achat {formatPrice(pair.stockItem.costAmount, pair.stockItem.costCurrency)} → Vente{' '}
                      {formatPrice(pair.saleOrder.priceAmount, pair.saleOrder.priceCurrency)}
                    </p>
                  </div>
                  <MarginBadge margin={pair.margin} currency={pair.saleOrder.priceCurrency} />
                </div>
              ))}
              <div className="flex justify-end pt-2">
                <p className="text-sm text-slate-300">
                  Total :{' '}
                  <MarginBadge margin={totalMargin} currency={pairs[0]?.saleOrder.priceCurrency ?? 'EUR'} />
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-[#1a2d42]/80 border-[#243552]">
        <CardHeader>
          <CardTitle className="text-slate-100 text-base">
            Ventes en attente de liaison ({unlinkedSales.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {linkError && <p className="text-xs text-red-400 mb-3">{linkError}</p>}
          {unlinkedSales.length === 0 ? (
            <p className="text-sm text-slate-500">Toutes tes ventes sont liées 🎉</p>
          ) : (
            <div className="space-y-3">
              {unlinkedSales.map((sale) => (
                <div key={sale.id} className="flex items-center gap-3 py-2 border-b border-[#243552] last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{sale.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatPrice(sale.priceAmount, sale.priceCurrency)}
                    </p>
                  </div>
                  <select
                    value={selection[sale.id] ?? ''}
                    onChange={(e) => setSelection((s) => ({ ...s, [sale.id]: e.target.value }))}
                    className="rounded-lg bg-[#0d1b2a] border border-[#243552] px-2 py-1.5 text-xs text-slate-200 max-w-[180px]"
                  >
                    <option value="">Choisir un achat…</option>
                    {unlinkedStock.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title} — {formatPrice(item.costAmount, item.costCurrency)}
                      </option>
                    ))}
                  </select>
                  <ButtonColorful
                    onClick={() => handleLink(sale.id)}
                    disabled={!selection[sale.id] || linking === sale.id}
                    label={linking === sale.id ? 'Liaison…' : 'Lier'}
                    showArrow={false}
                    className="h-8 px-3 text-xs"
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-[#1a2d42]/80 border-[#243552]">
        <CardHeader>
          <CardTitle className="text-slate-100 text-base">Stock disponible</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-xs font-medium text-slate-400 mb-2">
              Achats en attente de liaison ({unlinkedStock.filter((i) => i.source === 'vinted').length})
            </p>
            {unlinkedStock.filter((i) => i.source === 'vinted').length === 0 ? (
              <p className="text-xs text-slate-500">Aucun achat Vinted disponible pour l&apos;instant.</p>
            ) : (
              <div className="space-y-2">
                {unlinkedStock
                  .filter((i) => i.source === 'vinted')
                  .map((item) => (
                    <div key={item.id} className="text-xs text-slate-300 flex justify-between">
                      <span className="truncate">{item.title}</span>
                      <span className="text-slate-500 shrink-0 ml-2">
                        {formatPrice(item.costAmount, item.costCurrency)}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-slate-400 mb-2">
              Ajouts manuels ({unlinkedStock.filter((i) => i.source === 'manual').length})
            </p>
            {unlinkedStock.filter((i) => i.source === 'manual').length > 0 && (
              <div className="space-y-2 mb-4">
                {unlinkedStock
                  .filter((i) => i.source === 'manual')
                  .map((item) => (
                    <div key={item.id} className="text-xs text-slate-300 flex justify-between">
                      <span className="truncate">{item.title}</span>
                      <span className="text-slate-500 shrink-0 ml-2">
                        {formatPrice(item.costAmount, item.costCurrency)}
                      </span>
                    </div>
                  ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <Label className="text-xs text-slate-400 mb-1">Titre</Label>
                <Input value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} placeholder="Robe fleurie" />
              </div>
              <div>
                <Label className="text-xs text-slate-400 mb-1">Prix d&apos;achat</Label>
                <Input value={manualCost} onChange={(e) => setManualCost(e.target.value)} placeholder="8.00" />
              </div>
              <div>
                <Label className="text-xs text-slate-400 mb-1">Devise</Label>
                <Input value={manualCurrency} onChange={(e) => setManualCurrency(e.target.value)} placeholder="EUR" />
              </div>
              <div>
                <Label className="text-xs text-slate-400 mb-1">Date d&apos;acquisition</Label>
                <Input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-slate-400 mb-1">Photo (URL, optionnel)</Label>
                <Input value={manualPhoto} onChange={(e) => setManualPhoto(e.target.value)} placeholder="https://…" />
              </div>
            </div>
            {manualMessage && <p className="text-xs text-slate-300 mb-2">{manualMessage}</p>}
            <ButtonColorful
              onClick={handleAddManual}
              disabled={addingManual || !manualTitle || !manualCost || !manualDate}
              label={addingManual ? 'Ajout…' : '+ Ajouter un article'}
              showArrow={false}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck and build**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed; the route list should now include `○ /comptabilite`

- [ ] **Step 4: Commit**

```bash
git add src/app/comptabilite/page.tsx src/components/comptabilite/comptabilite-client.tsx
git commit -m "feat: add Comptabilité page with margin tracking and manual stock entry"
```

---

### Task 6: Add "Comptabilité" to navigation

**Files:**
- Modify: `src/components/layout/navbar.tsx`
- Modify: `src/components/layout/expanding-nav.tsx`
- Modify: `src/components/layout/bottom-nav.tsx`
- Modify: `src/components/layout/footer.tsx`

All four files currently define the same 4-route nav (`/`, `/ventes`,
`/achats`, `/parametres`) independently — this was a known consistency
requirement from the original dashboard build. Add the new route to all four,
in the same position (after "Achats", before "Paramètres").

- [ ] **Step 1: `navbar.tsx`**

Find:

```typescript
const links = [
  { href: '/', label: 'Vue d’ensemble' },
  { href: '/ventes', label: 'Ventes' },
  { href: '/achats', label: 'Achats' },
  { href: '/parametres', label: 'Paramètres' },
];
```

Replace with:

```typescript
const links = [
  { href: '/', label: 'Vue d’ensemble' },
  { href: '/ventes', label: 'Ventes' },
  { href: '/achats', label: 'Achats' },
  { href: '/comptabilite', label: 'Comptabilité' },
  { href: '/parametres', label: 'Paramètres' },
];
```

- [ ] **Step 2: `expanding-nav.tsx`**

Find:

```typescript
import { LayoutDashboard, TrendingUp, ShoppingBag, Settings } from 'lucide-react';

const links = [
  { href: '/',           label: 'Vue d’ensemble', icon: LayoutDashboard },
  { href: '/ventes',     label: 'Ventes',          icon: TrendingUp },
  { href: '/achats',     label: 'Achats',          icon: ShoppingBag },
  { href: '/parametres', label: 'Paramètres',      icon: Settings },
];
```

Replace with:

```typescript
import { LayoutDashboard, TrendingUp, ShoppingBag, Wallet, Settings } from 'lucide-react';

const links = [
  { href: '/',              label: 'Vue d’ensemble', icon: LayoutDashboard },
  { href: '/ventes',        label: 'Ventes',          icon: TrendingUp },
  { href: '/achats',        label: 'Achats',          icon: ShoppingBag },
  { href: '/comptabilite',  label: 'Comptabilité',    icon: Wallet },
  { href: '/parametres',    label: 'Paramètres',      icon: Settings },
];
```

- [ ] **Step 3: `bottom-nav.tsx`**

Find:

```typescript
import { LayoutDashboard, TrendingUp, ShoppingBag, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/',          label: 'Vue d’ensemble', icon: LayoutDashboard },
  { href: '/ventes',    label: 'Ventes',     icon: TrendingUp },
  { href: '/achats',    label: 'Achats',     icon: ShoppingBag },
  { href: '/parametres', label: 'Paramètres', icon: Settings },
];
```

Replace with:

```typescript
import { LayoutDashboard, TrendingUp, ShoppingBag, Wallet, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/',             label: 'Vue d’ensemble', icon: LayoutDashboard },
  { href: '/ventes',       label: 'Ventes',         icon: TrendingUp },
  { href: '/achats',       label: 'Achats',         icon: ShoppingBag },
  { href: '/comptabilite', label: 'Comptabilité',   icon: Wallet },
  { href: '/parametres',   label: 'Paramètres',     icon: Settings },
];
```

- [ ] **Step 4: `footer.tsx`**

Find:

```typescript
const navLinks = [
  { title: 'Vue d’ensemble', href: '/' },
  { title: 'Ventes', href: '/ventes' },
  { title: 'Achats', href: '/achats' },
  { title: 'Paramètres', href: '/parametres' },
];
```

Replace with:

```typescript
const navLinks = [
  { title: 'Vue d’ensemble', href: '/' },
  { title: 'Ventes', href: '/ventes' },
  { title: 'Achats', href: '/achats' },
  { title: 'Comptabilité', href: '/comptabilite' },
  { title: 'Paramètres', href: '/parametres' },
];
```

- [ ] **Step 5: Typecheck and build**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/navbar.tsx src/components/layout/expanding-nav.tsx src/components/layout/bottom-nav.tsx src/components/layout/footer.tsx
git commit -m "feat: add Comptabilité to all navigation surfaces"
```

---

### Task 7: Final full-suite check

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test -- --run`
Expected: all test files pass, including the 5 new tests from Task 2 on top
of the existing 11 (16 total)

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: succeeds; route list includes `○ /comptabilite`

- [ ] **Step 4: Browser smoke test**

Use the `run` skill (dev server + `chromium-cli`, per
`examples/playwright.md`) to verify the page renders for real:

```bash
npm run dev &
timeout 30 bash -c 'until curl -sf http://localhost:3000 >/dev/null; do sleep 1; done'
```

Then drive it: sign in with a real Supabase test account (or the existing
account if this is being verified against the live project), navigate to
`/comptabilite`, and screenshot. Check for:
- The three sections render without console errors
- If there are existing synced orders, unlinked sales/stock show up in the
  right lists (not e.g. every sale appearing "unlinked" because of a bug in
  the anti-join filter logic in `getUnlinkedSales`)
- The manual-add form successfully creates a new stock item (check it then
  appears in "Ajouts manuels" without a manual page reload)
- If there's at least one unlinked sale and one unlinked stock item, linking
  them moves the pair into "Marges calculées" with the correct margin sign

Stop the dev server after. On Linux/macOS: `lsof -ti:3000 -sTCP:LISTEN | xargs -r kill`.
On Windows (this project's actual environment — `lsof` isn't available),
find and stop the `next dev` process by command line instead:

```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -like '*next dev*' -or $_.CommandLine -like '*start-server.js*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
```

- [ ] **Step 5: Report results**

Summarize: test count, build status, and what the smoke test showed
(including any bugs found and whether they were fixed inline).
