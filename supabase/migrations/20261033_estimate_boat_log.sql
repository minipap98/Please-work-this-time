-- Estimate jobs reach the owner's Boat Log. A phoned-in job approved from /estimate/:token has no
-- project_id, so log_completed_work_order() never wrote a service_records row for it. The customer
-- can now keep the job with one of their own boats (owner_boat_id → boats, the owner's boat, not the
-- shop's shop_boats row): claim_estimate() from the public page once they're signed in, or
-- automatically when their account email matches the order and they have exactly one boat. Once
-- the order is completed, the same vendor-verified log row a Bosun job gets is written, keyed on
-- work_order_id. The shop reads nothing new about the owner: only that an opaque boat id is set.
-- Run after 20261032_estimates.sql. Safe to run more than once.

alter table public.shop_work_orders
  add column if not exists owner_boat_id uuid references public.boats(id) on delete set null;
create index if not exists shop_work_orders_owner_boat_idx
  on public.shop_work_orders(owner_boat_id) where owner_boat_id is not null;
create index if not exists shop_work_orders_customer_email_idx
  on public.shop_work_orders(lower(trim(customer_email))) where customer_email <> '';

-- Bosun-job path unchanged; an order with owner_boat_id set writes the same row for the owner's
-- boat (project_id stays null, so the (work_order_id) unique index is the key). The owner branch
-- also fires when owner_boat_id is set on an order that is already completed, so a late claim
-- files immediately.
create or replace function public.log_completed_work_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_boat uuid;
  vname text;
  lines jsonb;
  labor numeric;
  total numeric;
  done boolean := new.status in ('completed', 'invoiced');
  just_done boolean := tg_op = 'INSERT' or old.status not in ('completed', 'invoiced');
begin
  if done and just_done and new.project_id is not null then
    -- Only a job this shop actually won qualifies.
    v_owner := (
      select pr.owner_id from public.projects pr
      join public.bids bd on bd.id = pr.chosen_bid_id
      where pr.id = new.project_id and bd.vendor_id = new.vendor_id
    );
    v_boat := (
      select pr.boat_id from public.projects pr
      join public.bids bd on bd.id = pr.chosen_bid_id
      where pr.id = new.project_id and bd.vendor_id = new.vendor_id
    );
    if v_owner is null or v_boat is null then
      return new;
    end if;

    vname := (select business_name from public.vendor_profiles where id = new.vendor_id);
    lines := (
      select coalesce(jsonb_agg(jsonb_build_object(
        'kind', l.kind, 'description', l.description,
        'quantity', l.quantity, 'unitPrice', l.unit_price) order by l.sort_order), '[]'::jsonb)
      from public.shop_work_order_lines l where l.work_order_id = new.id
    );
    labor := (
      select coalesce(sum(l.quantity), 0)
      from public.shop_work_order_lines l where l.work_order_id = new.id and l.kind = 'labor'
    );
    total := (
      select coalesce(sum(l.quantity * l.unit_price), 0)
        + coalesce(sum(case when l.kind = 'part' then l.quantity * l.unit_price else 0 end), 0) * new.tax_rate / 100
      from public.shop_work_order_lines l where l.work_order_id = new.id
    );

    insert into public.service_records
      (boat_id, owner_id, title, date, engine_hours, cost, vendor_name, notes,
       source, vendor_id, project_id, work_order_id, labor_hours, line_items)
    values (
      v_boat, v_owner, new.title, coalesce(new.completed_at, now())::date,
      new.engine_hours, round(total, 2), vname, nullif(new.description, ''),
      'vendor', new.vendor_id, new.project_id, new.id, labor, lines
    )
    on conflict (project_id) where project_id is not null do update set
      title = excluded.title,
      date = excluded.date,
      engine_hours = excluded.engine_hours,
      cost = excluded.cost,
      notes = coalesce(excluded.notes, public.service_records.notes),
      source = 'vendor',
      work_order_id = excluded.work_order_id,
      labor_hours = excluded.labor_hours,
      line_items = excluded.line_items;

  elsif done and new.project_id is null and new.owner_boat_id is not null
        and (just_done or old.owner_boat_id is distinct from new.owner_boat_id) then
    -- An estimate job the customer kept with their own boat.
    v_boat := new.owner_boat_id;
    v_owner := (select b.owner_id from public.boats b where b.id = v_boat);
    if v_owner is null then
      return new;
    end if;

    vname := (select business_name from public.vendor_profiles where id = new.vendor_id);
    lines := (
      select coalesce(jsonb_agg(jsonb_build_object(
        'kind', l.kind, 'description', l.description,
        'quantity', l.quantity, 'unitPrice', l.unit_price) order by l.sort_order), '[]'::jsonb)
      from public.shop_work_order_lines l where l.work_order_id = new.id
    );
    labor := (
      select coalesce(sum(l.quantity), 0)
      from public.shop_work_order_lines l where l.work_order_id = new.id and l.kind = 'labor'
    );
    total := (
      select coalesce(sum(l.quantity * l.unit_price), 0)
        + coalesce(sum(case when l.kind = 'part' then l.quantity * l.unit_price else 0 end), 0) * new.tax_rate / 100
      from public.shop_work_order_lines l where l.work_order_id = new.id
    );

    insert into public.service_records
      (boat_id, owner_id, title, date, engine_hours, cost, vendor_name, notes,
       source, vendor_id, project_id, work_order_id, labor_hours, line_items)
    values (
      v_boat, v_owner, new.title, coalesce(new.completed_at, now())::date,
      new.engine_hours, round(total, 2), vname, nullif(new.description, ''),
      'vendor', new.vendor_id, null, new.id, labor, lines
    )
    on conflict (work_order_id) where work_order_id is not null do update set
      boat_id = excluded.boat_id,
      owner_id = excluded.owner_id,
      title = excluded.title,
      date = excluded.date,
      engine_hours = excluded.engine_hours,
      cost = excluded.cost,
      notes = coalesce(excluded.notes, public.service_records.notes),
      source = 'vendor',
      vendor_id = excluded.vendor_id,
      labor_hours = excluded.labor_hours,
      line_items = excluded.line_items;
  end if;
  return new;
end;
$$;
revoke execute on function public.log_completed_work_order() from public, anon, authenticated;

-- Files every approved or completed estimate order addressed to this owner's email to their boat,
-- but only when they have exactly one boat; with several, the Boat Log asks which. Internal: the
-- boats trigger and claim_my_estimates() call it. Returns how many orders were filed.
create or replace function public.file_estimates_for_owner(p_owner uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  my_email text;
  only_boat uuid;
  n int;
begin
  if p_owner is null then
    return 0;
  end if;
  select lower(trim(email)) into my_email from public.profiles where id = p_owner;
  if coalesce(my_email, '') = '' then
    return 0;
  end if;
  if (select count(*) from public.boats b where b.owner_id = p_owner) <> 1 then
    return 0;
  end if;
  select b.id into only_boat from public.boats b where b.owner_id = p_owner;

  update public.shop_work_orders w
    set owner_boat_id = only_boat
    where w.owner_boat_id is null
      and w.estimate_token is not null
      and w.estimate_sent_at is not null
      and lower(trim(w.customer_email)) = my_email
      and (w.estimate_approved_at is not null or w.status in ('completed', 'invoiced'));
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function public.file_estimates_for_owner(uuid) from public, anon, authenticated;

-- The signed-in owner asks for the auto-file (the Boat Log does this when it opens).
create or replace function public.claim_my_estimates()
returns int
language sql
security definer
set search_path = public
as $$
  select public.file_estimates_for_owner(auth.uid());
$$;
revoke execute on function public.claim_my_estimates() from public, anon;
grant execute on function public.claim_my_estimates() to authenticated;

-- Auto-claim when an owner adds their first boat (onboarding on either app).
create or replace function public.claim_estimates_for_new_boat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.file_estimates_for_owner(new.owner_id);
  return new;
end;
$$;
revoke execute on function public.claim_estimates_for_new_boat() from public, anon, authenticated;
drop trigger if exists on_boat_created_claim_estimates on public.boats;
create trigger on_boat_created_claim_estimates
  after insert on public.boats
  for each row execute procedure public.claim_estimates_for_new_boat();

-- The customer keeps an estimate job with one of their boats. Only the owner of the boat, and
-- only when the order was addressed to the email on their account. Re-claiming moves it to
-- another of the same owner's boats; a job filed to someone else's boat stays put. Setting
-- owner_boat_id on a completed order fires log_completed_work_order(), so the log row is written
-- immediately. Returns {boatId, filed}.
create or replace function public.claim_estimate(p_token text, p_boat uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  w public.shop_work_orders%rowtype;
  me uuid := auth.uid();
  my_email text;
begin
  if me is null then
    raise exception 'Sign in to keep this job with your boat.';
  end if;
  if coalesce(p_token, '') = '' then
    raise exception 'This estimate link isn''t valid.';
  end if;
  select * into w
    from public.shop_work_orders
    where estimate_token = p_token and estimate_sent_at is not null
    for update;
  if w.id is null then
    raise exception 'This estimate link isn''t valid.';
  end if;
  if w.estimate_approved_at is null and w.status not in ('completed', 'invoiced') then
    raise exception 'Approve the estimate first, then keep it with your boat.';
  end if;
  select lower(trim(email)) into my_email from public.profiles where id = me;
  if coalesce(my_email, '') = '' or lower(trim(w.customer_email)) <> my_email then
    raise exception 'This estimate was sent to a different email address than the one on your account.';
  end if;
  if not exists (select 1 from public.boats b where b.id = p_boat and b.owner_id = me) then
    raise exception 'That boat isn''t one of yours.';
  end if;
  if w.owner_boat_id is not null
     and not exists (select 1 from public.boats b where b.id = w.owner_boat_id and b.owner_id = me) then
    raise exception 'This job is already filed to another owner''s boat.';
  end if;

  update public.shop_work_orders set owner_boat_id = p_boat where id = w.id;

  return jsonb_build_object(
    'boatId', p_boat,
    'filed', exists (select 1 from public.service_records r where r.work_order_id = w.id)
  );
end;
$$;
revoke execute on function public.claim_estimate(text, uuid) from public, anon;
grant execute on function public.claim_estimate(text, uuid) to authenticated;

-- Approved or completed estimate orders addressed to the signed-in owner's email that aren't
-- filed to a boat yet: the "waiting to be filed" strip on the Boat Log. Only the caller's own
-- orders, never another owner's; the shop's side of the order (bay, tech, dates) isn't included.
create or replace function public.pending_estimate_claims()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'token', w.estimate_token,
    'number', w.number,
    'title', w.title,
    'shopName', vp.business_name,
    'boatLabel', w.boat_label,
    'approvedAt', w.estimate_approved_at,
    'completedAt', case when w.status in ('completed', 'invoiced') then coalesce(w.completed_at, w.updated_at) end
  ) order by coalesce(w.completed_at, w.estimate_approved_at, w.updated_at) desc), '[]'::jsonb)
  from public.shop_work_orders w
  join public.vendor_profiles vp on vp.id = w.vendor_id
  join public.profiles p on p.id = auth.uid()
  where auth.uid() is not null
    and w.owner_boat_id is null
    and w.estimate_token is not null
    and w.estimate_sent_at is not null
    and coalesce(p.email, '') <> ''
    and lower(trim(w.customer_email)) = lower(trim(p.email))
    and (w.estimate_approved_at is not null or w.status in ('completed', 'invoiced'));
$$;
revoke execute on function public.pending_estimate_claims() from public, anon;
grant execute on function public.pending_estimate_claims() to authenticated;

-- The public page tells the owner who filed the job (and nobody else) which boat it's with and
-- whether the log row exists yet. Anonymous readers and other accounts see null for both.
create or replace function public.public_estimate(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'number', w.number,
    'title', w.title,
    'description', w.description,
    'customerName', w.customer_name,
    'boatLabel', w.boat_label,
    'engineHours', w.engine_hours,
    'taxRate', w.tax_rate,
    'status', w.status,
    'sentAt', w.estimate_sent_at,
    'expiresAt', w.estimate_sent_at + interval '30 days',
    'approvedAt', w.estimate_approved_at,
    'declinedAt', w.estimate_declined_at,
    'note', w.estimate_note,
    'shop', jsonb_build_object(
      'name', vp.business_name,
      'phone', vp.phone,
      'website', vp.website,
      'logoUrl', vp.logo_url,
      'serviceArea', vp.service_area
    ),
    'lines', coalesce((
      select jsonb_agg(jsonb_build_object(
        'kind', l.kind, 'description', l.description, 'quantity', l.quantity, 'unitPrice', l.unit_price
      ) order by l.sort_order)
      from public.shop_work_order_lines l
      where l.work_order_id = w.id
    ), '[]'::jsonb),
    'ownerBoatId', case when ob.owner_id is not null and ob.owner_id = auth.uid() then w.owner_boat_id end,
    'filed', case when ob.owner_id is not null and ob.owner_id = auth.uid()
      then exists (select 1 from public.service_records r where r.work_order_id = w.id and r.owner_id = ob.owner_id)
      else null end
  )
  from public.shop_work_orders w
  join public.vendor_profiles vp on vp.id = w.vendor_id
  left join public.boats ob on ob.id = w.owner_boat_id
  where coalesce(p_token, '') <> ''
    and w.estimate_token = p_token
    and w.estimate_sent_at is not null;
$$;
revoke execute on function public.public_estimate(text) from public;
grant execute on function public.public_estimate(text) to anon, authenticated;
