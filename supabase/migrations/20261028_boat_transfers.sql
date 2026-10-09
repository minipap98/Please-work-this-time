-- Transfer a boat to its new owner when it's sold: the boat moves with its Boat Log, service plan
-- and photo; the seller keeps their account, their jobs and their invoice files.
-- Run after 20261027_hardening.sql in the SQL Editor (without RLS). Safe to run more than once.

alter type public.notification_type add value if not exists 'boat_transfer';

create table if not exists public.boat_transfers (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  boat_id uuid not null references public.boats(id) on delete cascade,
  from_owner_id uuid not null references public.profiles(id) on delete cascade,
  to_email text not null,
  -- Costs and line-item prices are the seller's business; off unless they choose to pass them on.
  include_costs boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'cancelled')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  accepted_at timestamptz,
  accepted_by uuid references public.profiles(id) on delete set null
);
create index if not exists boat_transfers_boat_idx on public.boat_transfers(boat_id);
create index if not exists boat_transfers_to_email_idx on public.boat_transfers(lower(to_email));
alter table public.boat_transfers enable row level security;

-- Sellers manage transfers for boats they own; the only edit they make is cancelling.
drop policy if exists "Sellers manage their transfers" on public.boat_transfers;
create policy "Sellers manage their transfers" on public.boat_transfers
  for all to authenticated
  using (from_owner_id = auth.uid())
  with check (
    from_owner_id = auth.uid()
    and exists (select 1 from public.boats b where b.id = boat_id and b.owner_id = auth.uid())
  );

-- Buyers see what's addressed to their account's email. Accepting goes through the function below.
drop policy if exists "Buyers see transfers to their email" on public.boat_transfers;
create policy "Buyers see transfers to their email" on public.boat_transfers
  for select to authenticated
  using (lower(to_email) = (select lower(p.email) from public.profiles p where p.id = auth.uid()));

-- One live transfer per boat.
create unique index if not exists boat_transfers_one_pending
  on public.boat_transfers(boat_id) where status = 'pending';

-- Tell the buyer when they already have a Bosun account (the seller shares the link either way).
create or replace function public.boat_transfer_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  buyer uuid;
  label text;
begin
  select p.id into buyer from public.profiles p where lower(p.email) = lower(new.to_email) limit 1;
  if buyer is null or buyer = new.from_owner_id then
    return new;
  end if;
  select nullif(trim(concat_ws(' ', b.year, b.make, b.model)), '') into label from public.boats b where b.id = new.boat_id;
  insert into public.notifications (user_id, type, title, body, data)
  values (
    buyer,
    'boat_transfer',
    'A boat is waiting for you',
    coalesce(label, 'A boat') || ' and its service history are ready to move to your account.',
    jsonb_build_object('transfer_token', new.token, 'boat_id', new.boat_id)
  );
  return new;
end;
$$;
drop trigger if exists boat_transfer_notify on public.boat_transfers;
create trigger boat_transfer_notify
  after insert on public.boat_transfers
  for each row execute function public.boat_transfer_notify();

-- What the buyer sees before accepting: the boat and who it's from. Nothing about the seller's
-- location or other boats, and null for an unknown token.
create or replace function public.boat_transfer_preview(transfer_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', t.id,
    'status', case
      when t.status = 'pending' and t.expires_at < now() then 'expired'
      else t.status
    end,
    'toEmail', t.to_email,
    'includeCosts', t.include_costs,
    'expiresAt', t.expires_at,
    'fromName', (select p.name from public.profiles p where p.id = t.from_owner_id),
    'boat', (
      select jsonb_build_object(
        'id', b.id, 'name', b.name, 'year', b.year, 'make', b.make, 'model', b.model, 'photoUrl', b.photo_url,
        'engine', nullif(concat_ws(' ', case when b.engine_count > 1 then b.engine_count || '×' end, b.engine_make, b.engine_model), '')
      )
      from public.boats b where b.id = t.boat_id
    ),
    'entries', (select count(*) from public.service_records r where r.boat_id = t.boat_id),
    'verified', (select count(*) from public.service_records r where r.boat_id = t.boat_id and r.source <> 'owner')
  )
  from public.boat_transfers t
  where t.token = transfer_token
  limit 1;
$$;
revoke execute on function public.boat_transfer_preview(text) from public;
grant execute on function public.boat_transfer_preview(text) to authenticated;

-- The handover. Only the signed-in account whose email the transfer names can accept it, and only
-- while it's pending, unexpired, and the seller still owns the boat. Moves the boat, its service
-- records (minus the seller's invoice files, and minus prices unless the seller allowed them) and
-- its service plan; drops the seller's documents and share links for it; tells the seller.
create or replace function public.accept_boat_transfer(transfer_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.boat_transfers%rowtype;
  me uuid := auth.uid();
  my_email text;
  label text;
begin
  if me is null then
    raise exception 'Sign in to accept a transfer.';
  end if;
  select lower(p.email) into my_email from public.profiles p where p.id = me;

  select * into t from public.boat_transfers where token = transfer_token for update;
  if t.id is null then
    raise exception 'This transfer link isn''t valid.';
  end if;
  if t.status <> 'pending' then
    raise exception 'This transfer has already been %.', t.status;
  end if;
  if t.expires_at < now() then
    raise exception 'This transfer link has expired. Ask the seller to send a new one.';
  end if;
  if my_email is null or my_email <> lower(t.to_email) then
    raise exception 'This transfer was sent to %. Sign in with that email to accept it.', t.to_email;
  end if;
  if t.from_owner_id = me then
    raise exception 'You can''t transfer a boat to yourself.';
  end if;
  if not exists (select 1 from public.boats b where b.id = t.boat_id and b.owner_id = t.from_owner_id) then
    raise exception 'The seller no longer owns this boat.';
  end if;

  select nullif(trim(concat_ws(' ', b.year, b.make, b.model)), '') into label from public.boats b where b.id = t.boat_id;

  update public.boats set owner_id = me, updated_at = now() where id = t.boat_id;

  update public.service_records
     set owner_id = me,
         invoice_path = null,
         cost = case when t.include_costs then cost else null end,
         line_items = case when t.include_costs then line_items else '[]'::jsonb end
   where boat_id = t.boat_id;

  update public.boat_service_plans set owner_id = me, updated_at = now() where boat_id = t.boat_id;

  delete from public.boat_documents where boat_id = t.boat_id;
  update public.boat_history_shares set revoked_at = now() where boat_id = t.boat_id and revoked_at is null;

  update public.boat_transfers
     set status = 'accepted', accepted_at = now(), accepted_by = me
   where id = t.id;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    t.from_owner_id,
    'boat_transfer',
    coalesce(label, 'Your boat') || ' has a new owner',
    'The transfer was accepted. The boat and its Boat Log now live on their account.',
    jsonb_build_object('boat_id', t.boat_id, 'accepted', true)
  );

  return jsonb_build_object('boatId', t.boat_id);
end;
$$;
revoke execute on function public.accept_boat_transfer(text) from public;
grant execute on function public.accept_boat_transfer(text) to authenticated;
