-- AI usage: one row per Claude call made for an account, with the quota that gates it.
-- The server (service role) calls consume_ai_quota() before each call and record_ai_usage()
-- after, so a single account can't run up the Anthropic bill. Admins read it on /admin → AI usage.

create table if not exists public.ai_limits (
  kind text primary key,
  per_day int not null,
  per_month int not null
);
insert into public.ai_limits (kind, per_day, per_month) values
  ('invoice', 20, 150),    -- Boat Log invoice import
  ('receipt', 20, 150),    -- emailed receipts
  ('intervals', 5, 30),    -- manufacturer service schedule
  ('outreach', 50, 500)    -- admin prospect drafts
on conflict (kind) do nothing;

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  kind text not null references public.ai_limits(kind),
  -- pending: call in flight · ok/failed: Claude was called · cached: served from an earlier read · denied: over quota
  status text not null default 'pending' check (status in ('pending', 'ok', 'failed', 'cached', 'denied')),
  model text,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cache_read_tokens int not null default 0,
  cost_usd numeric(10, 6) not null default 0,
  -- sha256 of the file that was read, so the same bytes are never paid for twice
  file_hash text,
  -- what Claude returned, kept only on ok rows so a repeat of the same file can reuse it
  result jsonb,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_user_idx on public.ai_usage(user_id, kind, created_at desc);
create index if not exists ai_usage_created_idx on public.ai_usage(created_at desc);
create index if not exists ai_usage_hash_idx on public.ai_usage(file_hash) where file_hash is not null and status = 'ok';

alter table public.ai_limits enable row level security;
alter table public.ai_usage enable row level security;
drop policy if exists "Admins read ai limits" on public.ai_limits;
create policy "Admins read ai limits" on public.ai_limits for select using (public.is_admin());
drop policy if exists "Admins read ai usage" on public.ai_usage;
create policy "Admins read ai usage" on public.ai_usage for select using (public.is_admin());
-- No insert/update policies: only the service role writes here.

-- Reserve one call for an account. Returns the new row id when allowed; when the account is over
-- its daily or monthly limit for that kind, files a 'denied' row (so admins can see who is pushing)
-- and returns allowed = false. The advisory lock keeps parallel requests from slipping past the limit.
create or replace function public.consume_ai_quota(p_user uuid, p_kind text, p_file_hash text default null)
returns table (allowed boolean, usage_id uuid, day_used int, day_limit int, month_used int, month_limit int)
language plpgsql
security definer
set search_path = public
as $$
declare
  lim public.ai_limits%rowtype;
  n_day int;
  n_month int;
  new_id uuid;
begin
  select * into lim from public.ai_limits where kind = p_kind;
  if not found then
    raise exception 'unknown ai kind %', p_kind;
  end if;
  perform pg_advisory_xact_lock(hashtext('ai_quota:' || coalesce(p_user::text, 'anon')));
  select count(*) into n_day from public.ai_usage
    where user_id = p_user and kind = p_kind and status <> 'denied' and created_at > now() - interval '24 hours';
  select count(*) into n_month from public.ai_usage
    where user_id = p_user and kind = p_kind and status <> 'denied' and created_at > now() - interval '30 days';
  if n_day >= lim.per_day or n_month >= lim.per_month then
    insert into public.ai_usage (user_id, kind, status, file_hash) values (p_user, p_kind, 'denied', p_file_hash);
    return query select false, null::uuid, n_day, lim.per_day, n_month, lim.per_month;
    return;
  end if;
  insert into public.ai_usage (user_id, kind, status, file_hash) values (p_user, p_kind, 'pending', p_file_hash) returning id into new_id;
  return query select true, new_id, n_day + 1, lim.per_day, n_month + 1, lim.per_month;
end;
$$;
revoke all on function public.consume_ai_quota(uuid, text, text) from public;
grant execute on function public.consume_ai_quota(uuid, text, text) to service_role;
