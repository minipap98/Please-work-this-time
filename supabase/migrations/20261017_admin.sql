-- Admin portal: audit trail, shop verification, and the shop-prospecting list.
-- All of this is read and written through /api/admin/* with the service role after an is_admin check.

alter table public.vendor_profiles add column if not exists verified_at timestamptz;

create table if not exists public.admin_audit (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete set null,
  action text not null,
  target_id text,
  target_label text not null default '',
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_created_idx on public.admin_audit(created_at desc);
alter table public.admin_audit enable row level security;
drop policy if exists "Admins read audit" on public.admin_audit;
create policy "Admins read audit" on public.admin_audit for select using (public.is_admin());

create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  place_id text unique,
  name text not null,
  address text not null default '',
  phone text not null default '',
  website text not null default '',
  lat double precision,
  lng double precision,
  rating numeric,
  review_count int not null default 0,
  trades text[] not null default '{}',
  area text not null default '',
  status text not null default 'new'
    check (status in ('new', 'contacted', 'interested', 'onboarded', 'declined', 'not-a-fit')),
  notes text not null default '',
  next_follow_up date,
  assigned_to text not null default '',
  converted_vendor_id uuid references public.vendor_profiles(id) on delete set null,
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists prospects_status_idx on public.prospects(status, next_follow_up);
alter table public.prospects enable row level security;
drop policy if exists "Admins manage prospects" on public.prospects;
create policy "Admins manage prospects" on public.prospects
  for all using (public.is_admin()) with check (public.is_admin());
