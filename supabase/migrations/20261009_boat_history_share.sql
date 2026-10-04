-- Shareable service history for boat listings (like a vehicle history report).
-- Run after 20261008_crew_roles.sql. Safe to run more than once.

create table if not exists public.boat_history_shares (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  boat_id uuid not null references public.boats(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  show_costs boolean not null default false,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists boat_history_shares_boat_idx on public.boat_history_shares(boat_id);
alter table public.boat_history_shares enable row level security;

-- Owners manage links for their own boats only.
drop policy if exists "Owners manage history links" on public.boat_history_shares;
create policy "Owners manage history links" on public.boat_history_shares
  for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.boats b where b.id = boat_id and b.owner_id = auth.uid())
  );

-- The only way to read a shared history: by token, while the link is live.
-- Returns the boat, and each job's date, title, system, shop, engine hours and
-- whether the shop verified it. Costs only if the owner turned them on.
-- Never returns notes, the owner's identity, or the boat's location.
create or replace function public.public_boat_history(share_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with s as (
    select * from public.boat_history_shares
    where token = share_token and revoked_at is null
    limit 1
  )
  select case when not exists (select 1 from s) then null else jsonb_build_object(
    'boat', (
      select jsonb_build_object(
        'name', b.name, 'year', b.year, 'make', b.make, 'model', b.model,
        'engine', nullif(concat_ws(' ', case when b.engine_count > 1 then b.engine_count || '×' end, b.engine_make, b.engine_model), '')
      )
      from public.boats b join s on s.boat_id = b.id
    ),
    'showCosts', (select show_costs from s),
    'sharedAt', (select created_at from s),
    'entries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'date', r.date,
        'title', r.title,
        'category', r.category,
        'shop', r.vendor_name,
        'verified', r.source <> 'owner',
        'engineHours', r.engine_hours,
        'cost', case when (select show_costs from s) then r.cost end
      ) order by r.date desc)
      from public.service_records r join s on s.boat_id = r.boat_id
    ), '[]'::jsonb)
  ) end;
$$;
revoke execute on function public.public_boat_history(text) from public;
grant execute on function public.public_boat_history(text) to anon, authenticated;
