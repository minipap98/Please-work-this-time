-- Receipts owners forward to Bosun by email. The server (service role) files them here after
-- matching the sender to an account and reading the attachment; the owner reviews each one
-- in the app before it becomes a Boat Log entry.

create table if not exists public.receipt_inbox (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  from_email text not null default '',
  subject text not null default '',
  received_at timestamptz not null default now(),
  -- the attachment (PDF/photo) in the owner's own boat-documents folder, when there was one
  attachment_path text,
  attachment_name text,
  -- what Claude read (shared/invoice.ts ExtractedInvoice), or null when nothing could be read
  extracted jsonb,
  read_error text,
  status text not null default 'pending' check (status in ('pending', 'added', 'dismissed')),
  resolved_at timestamptz,
  message_id text,
  created_at timestamptz not null default now()
);
create index if not exists receipt_inbox_owner_idx on public.receipt_inbox(owner_id, status, received_at desc);
create unique index if not exists receipt_inbox_message_idx on public.receipt_inbox(owner_id, message_id) where message_id is not null;

alter table public.receipt_inbox enable row level security;
drop policy if exists "Owners read their receipts" on public.receipt_inbox;
create policy "Owners read their receipts" on public.receipt_inbox
  for select using (auth.uid() = owner_id);
drop policy if exists "Owners resolve their receipts" on public.receipt_inbox;
create policy "Owners resolve their receipts" on public.receipt_inbox
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
