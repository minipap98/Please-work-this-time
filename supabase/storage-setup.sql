-- ============================================================
-- STORAGE BUCKETS — Run in Supabase SQL Editor
-- ============================================================

-- Create buckets
insert into storage.buckets (id, name, public) values ('project-photos', 'project-photos', true);
insert into storage.buckets (id, name, public) values ('boat-photos', 'boat-photos', true);
insert into storage.buckets (id, name, public) values ('boat-documents', 'boat-documents', false);
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
insert into storage.buckets (id, name, public) values ('vendor-logos', 'vendor-logos', true);

-- POLICIES

-- Project photos: public read, auth users can upload
create policy "Public read project photos" on storage.objects
  for select using (bucket_id = 'project-photos');

create policy "Auth users upload project photos" on storage.objects
  for insert with check (bucket_id = 'project-photos' and auth.role() = 'authenticated');

create policy "Owners delete own project photos" on storage.objects
  for delete using (bucket_id = 'project-photos' and auth.uid()::text = (storage.foldername(name))[1]);

-- Boat photos: public read, owner upload
create policy "Public read boat photos" on storage.objects
  for select using (bucket_id = 'boat-photos');

create policy "Auth users upload boat photos" on storage.objects
  for insert with check (bucket_id = 'boat-photos' and auth.role() = 'authenticated');

-- Boat documents: owner only (private)
create policy "Owners read own boat docs" on storage.objects
  for select using (bucket_id = 'boat-documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Owners upload boat docs" on storage.objects
  for insert with check (bucket_id = 'boat-documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Owners delete own boat docs" on storage.objects
  for delete using (bucket_id = 'boat-documents' and auth.uid()::text = (storage.foldername(name))[1]);

-- Avatars: public read, users manage own
create policy "Public read avatars" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "Users upload own avatar" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users update own avatar" on storage.objects
  for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- Vendor logos: public read, vendors manage own
create policy "Public read vendor logos" on storage.objects
  for select using (bucket_id = 'vendor-logos');

create policy "Vendors upload logo" on storage.objects
  for insert with check (bucket_id = 'vendor-logos' and auth.role() = 'authenticated');
