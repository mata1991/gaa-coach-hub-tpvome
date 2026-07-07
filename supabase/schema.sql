-- PanelPro cloud sync schema.
-- Run this once in your Supabase project: Dashboard → SQL Editor → paste → Run.
--
-- One row per signed-in user holding the whole app state as JSON. Row-Level
-- Security makes every row private to its owner: even though the app uses the
-- public anon key, nobody can read or write another coach's data.

create table if not exists public.panelpro_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  state      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.panelpro_state enable row level security;

-- A user may only see and change their own row.
drop policy if exists "read own state"   on public.panelpro_state;
drop policy if exists "insert own state" on public.panelpro_state;
drop policy if exists "update own state" on public.panelpro_state;

create policy "read own state"
  on public.panelpro_state for select
  using (auth.uid() = user_id);

create policy "insert own state"
  on public.panelpro_state for insert
  with check (auth.uid() = user_id);

create policy "update own state"
  on public.panelpro_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
