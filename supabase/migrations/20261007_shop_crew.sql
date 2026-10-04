-- Crew logins: techs see and update only the jobs assigned to them.
-- Run after 20261006_profiles_privacy.sql. Safe to run more than once.

create table if not exists public.shop_members (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles(id) on delete cascade,
  email text not null,
  tech_name text not null,
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (vendor_id, email)
);
alter table public.shop_members enable row level security;

drop policy if exists "Shop manages crew" on public.shop_members;
create policy "Shop manages crew" on public.shop_members
  for all using (public.is_my_vendor(vendor_id)) with check (public.is_my_vendor(vendor_id));

drop policy if exists "Crew see own membership" on public.shop_members;
create policy "Crew see own membership" on public.shop_members
  for select to authenticated using (user_id = auth.uid());

-- A crew member links their invite by logging in with the invited email.
create or replace function public.claim_shop_invites()
returns integer
language sql
security definer
set search_path = public
as $$
  with claimed as (
    update public.shop_members m
      set user_id = auth.uid()
      where m.user_id is null
        and lower(m.email) = lower((select p.email from public.profiles p where p.id = auth.uid()))
      returning 1
  )
  select count(*)::int from claimed;
$$;
revoke execute on function public.claim_shop_invites() from public, anon;
grant execute on function public.claim_shop_invites() to authenticated;

-- True when I'm on this shop's crew (and, if given, I'm that tech).
create or replace function public.is_shop_tech(vid uuid, tech text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.shop_members m
    where m.vendor_id = vid and m.user_id = auth.uid()
      and (tech is null or m.tech_name = tech)
  );
$$;

drop policy if exists "Crew see assigned jobs" on public.shop_work_orders;
create policy "Crew see assigned jobs" on public.shop_work_orders
  for select to authenticated using (public.is_shop_tech(vendor_id, assigned_to));

-- Techs can move their own jobs along and add notes, but can't hand them to someone else.
drop policy if exists "Crew update assigned jobs" on public.shop_work_orders;
create policy "Crew update assigned jobs" on public.shop_work_orders
  for update to authenticated
  using (public.is_shop_tech(vendor_id, assigned_to))
  with check (public.is_shop_tech(vendor_id, assigned_to));

drop policy if exists "Crew see lines on assigned jobs" on public.shop_work_order_lines;
create policy "Crew see lines on assigned jobs" on public.shop_work_order_lines
  for select to authenticated using (
    exists (
      select 1 from public.shop_work_orders w
      where w.id = work_order_id and public.is_shop_tech(w.vendor_id, w.assigned_to)
    )
  );

-- Bin locations for the pull list.
drop policy if exists "Crew see shop stock" on public.shop_inventory;
create policy "Crew see shop stock" on public.shop_inventory
  for select to authenticated using (public.is_shop_tech(vendor_id, null));
