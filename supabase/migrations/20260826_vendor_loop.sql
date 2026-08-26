-- Vendor loop: job alerts, COI, message pings.
-- Run after 20260825_go_to_market.sql

alter table public.vendor_profiles
  add column if not exists coi_url text,
  add column if not exists coi_file_name text,
  add column if not exists insurance_provider text,
  add column if not exists insurance_policy_number text,
  add column if not exists insurance_expiry date,
  add column if not exists insurance_coverage text;

insert into storage.buckets (id, name, public)
values ('vendor-documents', 'vendor-documents', false)
on conflict (id) do nothing;

drop policy if exists "Vendors read own documents" on storage.objects;
create policy "Vendors read own documents" on storage.objects
  for select using (
    bucket_id = 'vendor-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Vendors upload own documents" on storage.objects;
create policy "Vendors upload own documents" on storage.objects
  for insert with check (
    bucket_id = 'vendor-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Vendors update own documents" on storage.objects;
create policy "Vendors update own documents" on storage.objects
  for update using (
    bucket_id = 'vendor-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owners who booked a vendor can read that vendor's COI
drop policy if exists "Booked owners read vendor COI" on storage.objects;
create policy "Booked owners read vendor COI" on storage.objects
  for select using (
    bucket_id = 'vendor-documents'
    and exists (
      select 1
      from public.projects p
      join public.bids b on b.id = p.chosen_bid_id
      join public.vendor_profiles vp on vp.id = b.vendor_id
      where p.owner_id = auth.uid()
        and vp.user_id::text = (storage.foldername(name))[1]
    )
  );

create or replace function public.notify_matching_vendors()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, body, data)
  select
    vp.user_id,
    'project_update',
    'New job near you',
    coalesce(new.title, 'A boat owner posted a job'),
    jsonb_build_object(
      'project_id', new.id,
      'category', new.category,
      'location', new.location
    )
  from public.vendor_profiles vp
  where (
    new.category is null
    or cardinality(vp.specialties) = 0
    or new.category = any (vp.specialties)
  )
  and (
    new.location is null
    or coalesce(vp.service_area, '') = ''
    or new.location ilike '%' || split_part(replace(vp.service_area, '·', ','), ',', 1) || '%'
    or vp.service_area ilike '%' || new.location || '%'
  );
  return new;
end;
$$;

drop trigger if exists on_project_posted_notify_vendors on public.projects;
create trigger on_project_posted_notify_vendors
  after insert on public.projects
  for each row execute procedure public.notify_matching_vendors();

create or replace function public.notify_message_recipient()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, body, data)
  values (
    new.recipient_id,
    'message',
    'New message',
    left(new.text, 140),
    jsonb_build_object('bid_id', new.bid_id, 'project_id', null)
  );
  return new;
end;
$$;

drop trigger if exists on_message_notify_recipient on public.messages;
create trigger on_message_notify_recipient
  after insert on public.messages
  for each row execute procedure public.notify_message_recipient();

create or replace function public.notify_bid_accepted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  vendor_user uuid;
begin
  if new.chosen_bid_id is not null and (old.chosen_bid_id is distinct from new.chosen_bid_id) then
    select vp.user_id into vendor_user
    from public.bids b
    join public.vendor_profiles vp on vp.id = b.vendor_id
    where b.id = new.chosen_bid_id;

    if vendor_user is not null then
      insert into public.notifications (user_id, type, title, body, data)
      values (
        vendor_user,
        'bid_accepted',
        'You won a job',
        coalesce(new.title, 'An owner accepted your bid'),
        jsonb_build_object('project_id', new.id, 'bid_id', new.chosen_bid_id)
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_project_accepted_notify_vendor on public.projects;
create trigger on_project_accepted_notify_vendor
  after update on public.projects
  for each row execute procedure public.notify_bid_accepted();
