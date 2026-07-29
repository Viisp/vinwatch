-- Table unique pour toutes les données utilisateur
create table public.user_data (
  user_id uuid references auth.users on delete cascade primary key,
  data jsonb not null default '{}',
  updated_at timestamptz default now()
);

-- Sécurité : chaque utilisateur ne voit que ses propres données
alter table public.user_data enable row level security;

create policy "select own data"
  on public.user_data for select
  using (auth.uid() = user_id);

create policy "insert own data"
  on public.user_data for insert
  with check (auth.uid() = user_id);

create policy "update own data"
  on public.user_data for update
  using (auth.uid() = user_id);

-- Mise à jour automatique du timestamp
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on public.user_data
  for each row execute function update_updated_at();

-- Vinted cookie jar (one row per user), stored as encrypted JSON text.
create table public.vinted_session (
  user_id uuid references auth.users on delete cascade primary key,
  cookies_encrypted text not null,
  last_sync_status text not null default 'never_synced',
  last_sync_at timestamptz,
  updated_at timestamptz default now(),
  vinted_login text,
  vinted_profile_url text,
  vinted_photo_url text
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

-- Migration: vinted_session already existed live before these columns were
-- added to the create table above. Run this against an existing database
-- (safe to re-run: IF NOT EXISTS makes it a no-op on a fresh install where
-- the create table above already includes these columns).
alter table public.vinted_session
  add column if not exists vinted_login text,
  add column if not exists vinted_profile_url text,
  add column if not exists vinted_photo_url text;
