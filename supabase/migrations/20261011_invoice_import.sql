-- Imported invoices on Boat Log entries.
-- Run in the SQL Editor and choose "Run without RLS".
--
-- The file lives in the private boat-documents bucket under the owner's own
-- folder (storage RLS already limits that folder to its owner). Entries made
-- from an invoice are still owner entries (source = 'owner'), never "verified".
-- public_boat_history() doesn't read these columns, so share links never expose them.

alter table public.service_records
  add column if not exists invoice_path text,
  add column if not exists invoice_number text;

alter table public.service_records
  drop constraint if exists service_records_invoice_path_owner;
alter table public.service_records
  add constraint service_records_invoice_path_owner
  check (invoice_path is null or invoice_path like owner_id::text || '/%');
