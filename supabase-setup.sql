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
  conversation_id bigint,
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

-- Migration: same as above, for vinted_orders.conversation_id (used to link
-- each row to its Vinted conversation thread).
alter table public.vinted_orders
  add column if not exists conversation_id bigint;

-- Migration: support multiple Vinted accounts per VinWatch user (e.g. one
-- account for selling, one for buying). vinted_session moves from
-- "user_id is the primary key" (one row per user) to "id is the primary
-- key, user_id is just a foreign key" (many rows per user), each row
-- labeled so the UI can tell them apart.
alter table public.vinted_session drop constraint if exists vinted_session_pkey;
alter table public.vinted_session add column if not exists id uuid primary key default gen_random_uuid();
alter table public.vinted_session add column if not exists label text not null default 'Compte Vinted';
create index if not exists idx_vinted_session_user_id on public.vinted_session (user_id);

-- Tag each synced order with which Vinted account it came from, so orders
-- from both accounts can be shown merged with a small badge saying which
-- is which.
alter table public.vinted_orders add column if not exists vinted_account_label text;

-- Avatar uploads for the profile page. Public bucket (avatars are meant to
-- be viewable, same as any social app) but writes are restricted to files
-- under the uploader's own auth.uid()/ prefix.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "users can upload their own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can update their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
