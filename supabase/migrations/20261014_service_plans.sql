-- Per-boat maintenance schedule (generated for the boat's engines, confirmed by the owner)
-- and the "already done" dates the owner entered. Private to the boat's owner.
-- Run in the SQL Editor and choose "Run without RLS".

create table if not exists public.boat_service_plans (
  boat_id uuid primary key references public.boats(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  engine_label text not null,
  tasks jsonb not null default '[]'::jsonb,
  records jsonb not null default '[]'::jsonb,
  source text not null default 'claude',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.boat_service_plans enable row level security;

drop policy if exists "Owners manage their service plans" on public.boat_service_plans;
create policy "Owners manage their service plans" on public.boat_service_plans
  for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.boats b where b.id = boat_id and b.owner_id = auth.uid())
  );
