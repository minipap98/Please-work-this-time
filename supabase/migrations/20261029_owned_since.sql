-- When the current owner took the boat on. The Boat Log splits spend into "yours" and "all owners"
-- at this date once a boat has changed hands. Run after 20261028_boat_transfers.sql. Safe to re-run.

alter table public.boats add column if not exists owned_since timestamptz;
update public.boats set owned_since = created_at where owned_since is null;
update public.boats b
   set owned_since = t.accepted_at
  from public.boat_transfers t
 where t.boat_id = b.id and t.status = 'accepted' and t.accepted_by = b.owner_id and t.accepted_at > b.owned_since;
alter table public.boats alter column owned_since set default now();
alter table public.boats alter column owned_since set not null;

-- accept_boat_transfer() now stamps the handover date on the boat.
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

  update public.boats set owner_id = me, owned_since = now(), updated_at = now() where id = t.boat_id;

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
