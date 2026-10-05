-- Billing on work orders: when the invoice went out and when it was paid.
alter table public.shop_work_orders
  add column if not exists invoiced_at timestamptz,
  add column if not exists paid_at timestamptz,
  add column if not exists payment_method text not null default '';
