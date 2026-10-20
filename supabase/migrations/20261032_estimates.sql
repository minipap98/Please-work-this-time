-- Estimates: a shop writes a job up before the customer has said yes. The work order sits in
-- status 'estimate' (off the schedule), the shop sends a link, and the customer approves or
-- declines at /estimate/:token with no Bosun account. Approval moves the order to 'scheduled'.
-- Run after 20261031_postgis_to_extensions.sql. Safe to run more than once.

alter type public.notification_type add value if not exists 'estimate_response';

alter table public.shop_work_orders
  add column if not exists estimate_token text unique,
  add column if not exists estimate_sent_at timestamptz,
  add column if not exists estimate_approved_at timestamptz,
  add column if not exists estimate_declined_at timestamptz,
  add column if not exists estimate_note text not null default '';

alter table public.shop_work_orders drop constraint if exists shop_work_orders_status_check;
alter table public.shop_work_orders
  add constraint shop_work_orders_status_check
  check (status in ('estimate', 'scheduled', 'in-progress', 'waiting-parts', 'completed', 'invoiced'));

-- The shop (or a crew manager) sends an estimate: mints the link token once, stamps the send
-- time and clears any earlier answer, so a revised estimate asks the customer again.
create or replace function public.send_estimate(p_order uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  w public.shop_work_orders%rowtype;
  tok text;
begin
  select * into w from public.shop_work_orders where id = p_order;
  if w.id is null or not (public.is_my_vendor(w.vendor_id) or public.is_shop_manager(w.vendor_id)) then
    raise exception 'Work order not found.';
  end if;
  if w.status <> 'estimate' then
    raise exception 'Only an order in the Estimate status can be sent for approval.';
  end if;
  if not exists (select 1 from public.shop_work_order_lines l where l.work_order_id = w.id) then
    raise exception 'Add at least one line before sending the estimate.';
  end if;
  tok := coalesce(w.estimate_token, replace(gen_random_uuid()::text, '-', ''));
  update public.shop_work_orders
    set estimate_token = tok,
        estimate_sent_at = now(),
        estimate_approved_at = null,
        estimate_declined_at = null,
        estimate_note = '',
        updated_at = now()
    where id = w.id;
  return tok;
end;
$$;
revoke execute on function public.send_estimate(uuid) from public, anon;
grant execute on function public.send_estimate(uuid) to authenticated;

-- The only way to read an estimate by link. The customer is the reader, so they see their own
-- name, the boat, the lines and the shop's public details; nothing about other orders.
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
    ), '[]'::jsonb)
  )
  from public.shop_work_orders w
  join public.vendor_profiles vp on vp.id = w.vendor_id
  where coalesce(p_token, '') <> ''
    and w.estimate_token = p_token
    and w.estimate_sent_at is not null;
$$;
revoke execute on function public.public_estimate(text) from public;
grant execute on function public.public_estimate(text) to anon, authenticated;

-- The customer answers from the link. Approving books the job (estimate → scheduled) and can
-- follow an earlier decline; declining after an approval needs a call to the shop. The shop is
-- notified when the answer changes (not when the same button is pressed twice). Links answer
-- for 30 days.
create or replace function public.respond_to_estimate(p_token text, p_approve boolean, p_note text default '')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  w public.shop_work_orders%rowtype;
  shop_user uuid;
  note text := left(trim(coalesce(p_note, '')), 1000);
  who text;
begin
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
  if w.estimate_approved_at is null and w.estimate_sent_at < now() - interval '30 days' then
    raise exception 'This estimate has expired. Ask the shop for a fresh one.';
  end if;

  if p_approve then
    update public.shop_work_orders
      set estimate_approved_at = coalesce(estimate_approved_at, now()),
          estimate_declined_at = null,
          estimate_note = note,
          status = case when status = 'estimate' then 'scheduled' else status end,
          updated_at = now()
      where id = w.id;
  else
    if w.estimate_approved_at is not null then
      raise exception 'This estimate was already approved. Call the shop to change the job.';
    end if;
    update public.shop_work_orders
      set estimate_declined_at = now(),
          estimate_note = note,
          updated_at = now()
      where id = w.id;
  end if;

  select user_id into shop_user from public.vendor_profiles where id = w.vendor_id;
  if shop_user is not null
     and ((p_approve and w.estimate_approved_at is null) or (not p_approve and w.estimate_declined_at is null)) then
    who := coalesce(nullif(trim(w.customer_name), ''), 'Your customer');
    insert into public.notifications (user_id, type, title, body, data)
    values (
      shop_user,
      'estimate_response',
      w.number || case when p_approve then ' approved' else ' declined' end,
      who || case when p_approve then ' approved the estimate for ' else ' declined the estimate for ' end
          || w.title || case when note <> '' then ': "' || note || '"' else '.' end,
      jsonb_build_object('work_order_id', w.id, 'approved', p_approve)
    );
  end if;

  return public.public_estimate(p_token);
end;
$$;
revoke execute on function public.respond_to_estimate(text, boolean, text) from public;
grant execute on function public.respond_to_estimate(text, boolean, text) to anon, authenticated;
