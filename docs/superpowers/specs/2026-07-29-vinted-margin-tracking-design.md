# Vinted Margin Tracking ("Comptabilité") — Design Spec

## Context

VinWatch already syncs Vinted sales and purchases automatically (see
`2026-07-28-vinted-dashboard-design.md`). The user wants to know, per
resold item, how much margin they actually made — inspired by a
competitor tool ("Vinteed CRM") which has a much larger feature set
(revenue forecasting, performance, boosts, buyers, accounting,
stock/suppliers, browser extension). This spec scopes down to the
single piece the user prioritized: **margin per article**, under a
new "Comptabilité" section. The rest of the competitor's feature set
is explicitly out of scope for this iteration and would each need
their own future spec.

## Problem

Vinted's own data has no link between "I bought this item" and "I
resold this item" — a purchase and a later sale are two independent,
unrelated transactions/listings, even when the seller is reselling
stock. To show margin, VinWatch needs a way to associate a sale with
the cost of the item that was sold, where that cost can come from
either:
- an item the user bought on Vinted (already synced), or
- an item the user acquired outside Vinted (flea market, thrift
  store) with a manually entered cost.

## Decisions from brainstorming

- **Manual linking only** — no automatic title/photo matching. The
  user explicitly wants control over which purchase pairs with which
  sale; heuristic matching risks silent wrong pairings.
- **Vinted and external sourcing both supported** — a stock entry can
  originate from a synced Vinted purchase order, or be entered by
  hand.
- **Simple margin** — margin = sale price − cost price. Vinted's
  seller/buyer protection fees are not factored in (not reliably
  available from the scraped `/my_orders` page, and the displayed
  price is already close enough to net for the user's purposes).
- **Architecture: dedicated page, not inline on Ventes** — a new
  "Comptabilité" page centralizes stock + linking + computed margins,
  rather than spreading the UI across the existing Ventes page and a
  separate stock page. Keeps Ventes uncluttered and gives a natural
  home for future related features (e.g. revenue forecasting).

## Data model

New table `stock_items` (Supabase/Postgres), RLS-protected like the
existing `vinted_orders` / `vinted_session` tables (`auth.uid() =
user_id`):

```sql
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
  created_at timestamptz default now()
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

Notes:
- `source_order_id` points at the *purchased* `vinted_orders` row when
  `source = 'vinted'`; null for manual entries.
- `linked_sale_order_id` points at the *sold* `vinted_orders` row once
  the user links this stock item to a sale; null while unlinked.
- Margin is **not stored** — it's computed at render time from
  `linked sale.price_amount − stock_item.cost_amount` to avoid
  drift if either side is ever corrected.
- No uniqueness constraint forcing one stock item per purchased
  order or one sale per stock item is enforced at the DB level beyond
  what the UI naturally does (each purchased order and each sold
  order should only be linked once, but this is a UI-level
  invariant, not a hard DB constraint, since enforcing it accurately
  would require excluding already-linked rows from the candidate
  list rather than a simple unique index).

**Auto-population from sync**: when `/api/sync-vinted` upserts a
newly-seen `purchased` order, it also inserts a matching
`stock_items` row (`source='vinted'`, `source_order_id` = the new
order's id, cost/title/photo copied from it) if one doesn't already
exist for that order. This happens server-side in the sync route, not
lazily in the UI, so purchased items show up as available stock
immediately after the next sync with no extra user action.

## UI/UX

New nav entry "Comptabilité" (`/comptabilite`), positioned after
"Paramètres". Page has three sections, top to bottom:

**1. Marges calculées** — table of linked pairs: photo, title, cost
price, sale price, margin (green if positive, red if negative), sale
date. A summary row shows total margin across all currently-linked
pairs.

**2. Ventes en attente de liaison** — sold orders (`vinted_orders`,
`order_type='sold'`) that have no `stock_items` row pointing at them
via `linked_sale_order_id`. Each row has a searchable dropdown
listing available (unlinked) stock items; selecting one creates the
link (updates `stock_items.linked_sale_order_id`) and the row moves
up into "Marges calculées" without a page reload.

**3. Stock disponible** — unlinked stock items, split into two
sub-lists:
- *Achats en attente de liaison*: `source='vinted'` stock items,
  auto-populated by sync.
- *Ajouts manuels*: `source='manual'` items, plus a "+ Ajouter un
  article" button opening a small form (title, cost amount/currency,
  acquired date, optional photo URL) that inserts a new `stock_items`
  row.

Linking has a single entry point in v1: the dropdown on each row in
section 2 (sale → pick a stock item). Section 3's items are read-only
display, with no linking control of their own — this keeps the
interaction model unambiguous (one place to link) and is simpler to
build than supporting the action from both directions.

Empty states: if there are no unlinked sales, section 2 shows "Toutes
tes ventes sont liées 🎉" instead of an empty table. If there's no
stock at all, section 3 shows a prompt to add one manually or wait
for the next sync.

## Data flow

1. Cron sync runs → new `purchased` orders upserted into
   `vinted_orders` → for each new purchased order, a `stock_items` row
   is auto-inserted.
2. User visits `/comptabilite` → page fetches: linked pairs (join
   `stock_items` on `linked_sale_order_id` not null), unlinked sold
   orders (anti-join against `stock_items.linked_sale_order_id`),
   unlinked stock items (`linked_sale_order_id is null`).
3. User links a sale to a stock item (client action) →
   `UPDATE stock_items SET linked_sale_order_id = :saleOrderId WHERE
   id = :stockItemId AND user_id = auth.uid()` via the browser
   Supabase client (RLS-protected, no new API route needed — this is
   a direct authenticated write, unlike the cookie/session data which
   requires the service-role client).
4. User adds a manual stock item (client action) → `INSERT INTO
   stock_items (...)` via the browser Supabase client.

No new server API routes are needed; both writes are simple,
RLS-scoped, user-initiated mutations that the existing Supabase
client (already used for reads on Ventes/Achats/Dashboard) can
perform directly.

## Error handling

- Linking or inserting fails (network, RLS violation) → inline error
  message near the action, state not optimistically committed until
  the write succeeds.
- If a purchased order is later deleted from `vinted_orders` (should
  not happen in practice — sync only upserts) the `stock_items` row's
  `source_order_id` becomes null via `ON DELETE SET NULL` rather than
  cascading, so historical margin data for already-linked items isn't
  silently destroyed.

## Testing

- Unit test for the auto-stock-insert logic added to the sync route
  (or extracted into a small testable helper): given a purchased
  order not yet in `stock_items`, produces the correct insert
  payload; given one already present, produces no insert.
- Manual/browser smoke test for the new page: linking flow, manual
  add flow, margin sign (positive/negative) rendering, empty states.
- No new unit-testable pure logic beyond the auto-insert mapping and
  the margin computation (`sale.priceAmount - stock.costAmount`,
  parsed as numbers) — both should get small unit tests similar to
  `vinted-calculations.test.ts`.

## Out of scope (explicitly deferred)

- Everything else visible in the competitor screenshot: Prévision CA,
  Ma performance, Mes boosts, Mes acheteurs, Mes fournisseurs,
  browser Extension. Each would need its own brainstorming pass.
- Automatic/suggested matching between purchases and sales.
- Including Vinted's buyer/seller protection fees in the margin
  calculation.
- Editing or deleting a stock item once linked (v1 only supports
  create + link; unlinking/editing can be added later if needed).
