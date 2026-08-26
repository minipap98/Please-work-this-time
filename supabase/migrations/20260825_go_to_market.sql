-- ============================================================
-- Bosun go-to-market patch
-- Run AFTER schema.sql in the Supabase SQL editor.
-- Safe to re-run (IF NOT EXISTS / DROP POLICY IF EXISTS).
-- ============================================================

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

alter table public.projects
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.bids
  add column if not exists rejected boolean not null default false;

alter table public.payments
  alter column invoice_id drop not null,
  alter column payer_id drop not null,
  alter column payee_id drop not null;

alter table public.payments
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists bid_id uuid references public.bids(id) on delete set null;

create unique index if not exists idx_payments_stripe_pi
  on public.payments(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

-- Admin helper — security definer so it does not recurse on profiles RLS
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Profiles: stop leaking emails to the open internet
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
drop policy if exists "Authenticated users can view profiles" on public.profiles;
drop policy if exists "Users view own profile" on public.profiles;
drop policy if exists "Admins view all profiles" on public.profiles;

create policy "Users view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Admins view all profiles" on public.profiles
  for select using (public.is_admin());

create policy "Authenticated users can view profiles" on public.profiles
  for select using (auth.role() = 'authenticated');

-- Vendors keep seeing jobs they already bid on after status changes
drop policy if exists "Vendors see projects they bid on" on public.projects;
create policy "Vendors see projects they bid on" on public.projects
  for select using (
    exists (
      select 1
      from public.bids
      join public.vendor_profiles on vendor_profiles.id = bids.vendor_id
      where bids.project_id = projects.id
        and vendor_profiles.user_id = auth.uid()
    )
  );

-- Owners need to mark a bid accepted
drop policy if exists "Owners update bids on their projects" on public.bids;
create policy "Owners update bids on their projects" on public.bids
  for update using (
    exists (
      select 1 from public.projects
      where projects.id = bids.project_id
        and projects.owner_id = auth.uid()
    )
  );

-- Line items were select-only — vendors could not save a real bid
drop policy if exists "Vendors insert line items" on public.bid_line_items;
create policy "Vendors insert line items" on public.bid_line_items
  for insert with check (
    exists (
      select 1
      from public.bids
      join public.vendor_profiles on vendor_profiles.id = bids.vendor_id
      where bids.id = bid_line_items.bid_id
        and vendor_profiles.user_id = auth.uid()
    )
  );

-- Admin read-all for ops
drop policy if exists "Admins read projects" on public.projects;
create policy "Admins read projects" on public.projects
  for select using (public.is_admin());

drop policy if exists "Admins read bids" on public.bids;
create policy "Admins read bids" on public.bids
  for select using (public.is_admin());

drop policy if exists "Admins read payments" on public.payments;
create policy "Admins read payments" on public.payments
  for select using (public.is_admin());

-- Promote the first admin (edit the email, then run once)
-- update public.profiles set is_admin = true where email = 'you@bosun.app';
