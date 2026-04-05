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
