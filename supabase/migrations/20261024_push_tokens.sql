-- Devices that want push notifications. One row per device token; a person can have several.
-- The apps upsert their own token straight through Supabase (RLS: own rows); the server reads them when a
-- notifications row is inserted (see 20261025_push_webhook.sql). Run in the SQL Editor (without RLS).

create table if not exists public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios', 'android', 'web')),
  app_version text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists device_push_tokens_user_idx on public.device_push_tokens (user_id);

alter table public.device_push_tokens enable row level security;

drop policy if exists "Users manage own push tokens" on public.device_push_tokens;
create policy "Users manage own push tokens" on public.device_push_tokens
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
-- The server (service role) reads tokens to send pushes and deletes ones Apple reports dead.
