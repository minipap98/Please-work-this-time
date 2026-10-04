-- Profiles (email, phone, location) are visible only to people you work with.
-- Run after 20261005_shipments_policy_and_hardening.sql. Safe to run more than once.
--
-- You can read a profile when it is yours, you are an admin, you won a job
-- that person posted, or that person bid on a job you posted. Everyone else
-- (including other logged-in users) only gets name / initials / photo via
-- profile_cards().

create or replace function public.can_see_profile(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select pid = auth.uid()
    or exists (
      -- I won a job this person posted
      select 1
      from public.projects p
      join public.bids b on b.id = p.chosen_bid_id
      join public.vendor_profiles vp on vp.id = b.vendor_id
      where p.owner_id = pid and vp.user_id = auth.uid()
    )
    or exists (
      -- this person bid on a job I posted
      select 1
      from public.bids b
      join public.projects p on p.id = b.project_id
      join public.vendor_profiles vp on vp.id = b.vendor_id
      where p.owner_id = auth.uid() and vp.user_id = pid
    );
$$;

drop policy if exists "Allow public read" on public.profiles;
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
drop policy if exists "Authenticated users can view profiles" on public.profiles;
drop policy if exists "Profiles visible to people you work with" on public.profiles;
create policy "Profiles visible to people you work with" on public.profiles
  for select to authenticated
  using (public.can_see_profile(id));

-- Public-safe name cards (no email, phone or location) for reviews and threads.
create or replace function public.profile_cards(ids uuid[])
returns table (id uuid, name text, initials text, avatar_url text, role text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, split_part(p.name, ' ', 1) ||
           case when position(' ' in p.name) > 0
                then ' ' || left(split_part(p.name, ' ', 2), 1) || '.'
                else '' end,
         p.initials, p.avatar_url, p.role::text
  from public.profiles p
  where p.id = any(ids)
  limit 200;
$$;

revoke execute on function public.profile_cards(uuid[]) from public;
grant execute on function public.profile_cards(uuid[]) to anon, authenticated;
