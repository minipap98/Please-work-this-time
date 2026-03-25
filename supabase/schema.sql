-- ============================================================
-- BOSUN — Full Supabase Database Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "postgis";  -- for GPS/geolocation

-- ============================================================
-- ENUMS
-- ============================================================
create type user_role as enum ('owner', 'vendor');
create type project_status as enum ('active', 'bidding', 'in-progress', 'completed', 'expired', 'gathering');
create type bid_message_sender as enum ('vendor', 'user');
create type crew_role as enum ('Captain', 'Mate', 'Stewardess', 'Day Laborer', 'Chef', 'Fishing Guide');
create type crew_availability as enum ('available', 'limited', 'busy');
create type maintenance_category as enum ('Engine Oil & Fuel', 'Cooling System', 'Drivetrain', 'Electrical & Safety', 'Hull & Bottom');
create type engine_type as enum ('Outboard', 'Inboard', 'I/O (Sterndrive)');
create type fee_tier_name as enum ('Bronze', 'Silver', 'Gold');
create type message_status as enum ('sent', 'delivered', 'read');
create type notification_type as enum ('bid_received', 'bid_accepted', 'bid_rejected', 'message', 'payment', 'maintenance_due', 'project_update');
create type payment_status as enum ('pending', 'processing', 'completed', 'failed', 'refunded');
create type document_type as enum ('insurance', 'registration', 'warranty', 'survey', 'title', 'other');

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text not null,
  initials text not null default '',
  role user_role not null default 'owner',
  avatar_url text,
  phone text,
  location text,
  onboarding_complete boolean not null default false,
  stripe_customer_id text,
  stripe_account_id text,  -- for vendor payouts (Stripe Connect)
  push_subscription jsonb,  -- OneSignal player ID / web push
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- BOATS
-- ============================================================
create table boats (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  make text not null,
  model text not null,
  year text not null,
  engine_type engine_type,
  engine_make text,
  engine_model text,
  engine_count int default 1,
  propulsion text,
  length_ft numeric,
  home_port text,
  registration_number text,
  hull_id text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- BOAT DOCUMENTS (insurance, registration, warranties)
-- ============================================================
create table boat_documents (
  id uuid primary key default uuid_generate_v4(),
  boat_id uuid not null references boats(id) on delete cascade,
  owner_id uuid not null references profiles(id) on delete cascade,
  document_type document_type not null,
  title text not null,
  file_url text not null,  -- Supabase Storage URL
  file_name text not null,
  file_size int,
  expiry_date date,  -- for insurance, registration
  notes text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- VENDOR PROFILES
-- ============================================================
create table vendor_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid unique not null references profiles(id) on delete cascade,
  business_name text not null,
  initials text not null default '',
  bio text,
  response_time text,
  insured boolean not null default false,
  licensed boolean not null default false,
  years_in_business int not null default 0,
  specialties text[] not null default '{}',
  certifications text[] not null default '{}',
  service_area text,
  service_radius_miles int default 50,
  location geography(Point, 4326),  -- PostGIS point for GPS
  completed_jobs int not null default 0,
  website text,
  phone text,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- PROJECTS (RFPs / Service Requests)
-- ============================================================
create table projects (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references profiles(id) on delete cascade,
  boat_id uuid references boats(id) on delete set null,
  title text not null,
  description text not null,
  status project_status not null default 'active',
  category text,
  location text,
  chosen_bid_id uuid,  -- FK added after bids table
  date timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- PROJECT PHOTOS
-- ============================================================
create table project_photos (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  url text not null,  -- Supabase Storage URL
  caption text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- BIDS
-- ============================================================
create table bids (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  vendor_id uuid not null references vendor_profiles(id) on delete cascade,
  price numeric not null,
  message text,
  submitted_at timestamptz not null default now(),
  expiry_date timestamptz,
  accepted boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add FK from projects.chosen_bid_id → bids.id
alter table projects
  add constraint fk_chosen_bid
  foreign key (chosen_bid_id) references bids(id) on delete set null;

-- ============================================================
-- BID LINE ITEMS
-- ============================================================
create table bid_line_items (
  id uuid primary key default uuid_generate_v4(),
  bid_id uuid not null references bids(id) on delete cascade,
  description text not null,
  quantity int not null default 1,
  unit_price numeric not null,
  sort_order int not null default 0
);

-- ============================================================
-- MESSAGES (real-time chat — bid threads + general inbox)
-- ============================================================
create table messages (
  id uuid primary key default uuid_generate_v4(),
  bid_id uuid references bids(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  recipient_id uuid not null references profiles(id) on delete cascade,
  text text not null,
  status message_status not null default 'sent',
  -- Quote proposal fields (optional)
  is_quote boolean not null default false,
  quote_title text,
  quote_price numeric,
  quote_description text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- INVOICES
-- ============================================================
create table invoices (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  bid_id uuid not null references bids(id) on delete cascade,
  invoice_number text unique not null,
  vendor_id uuid not null references vendor_profiles(id) on delete cascade,
  owner_id uuid not null references profiles(id) on delete cascade,
  subtotal numeric not null,
  fee_rate numeric not null default 0.10,
  platform_fee numeric not null,
  net_payout numeric not null,
  issued_at timestamptz not null default now(),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table invoice_items (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  description text not null,
  quantity int not null default 1,
  unit_price numeric not null,
  sort_order int not null default 0
);

-- ============================================================
-- PAYMENTS (Stripe integration)
-- ============================================================
create table payments (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  payer_id uuid not null references profiles(id),
  payee_id uuid not null references profiles(id),
  amount numeric not null,
  platform_fee numeric not null default 0,
  stripe_payment_intent_id text unique,
  stripe_transfer_id text,
  status payment_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- REVIEWS & RATINGS (user-generated)
-- ============================================================
create table reviews (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  reviewer_id uuid not null references profiles(id) on delete cascade,
  vendor_id uuid not null references vendor_profiles(id) on delete cascade,
  stars int not null check (stars >= 1 and stars <= 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, reviewer_id)  -- one review per project per user
);

-- ============================================================
-- CREW MEMBERS
-- ============================================================
create table crew_members (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete set null,  -- if crew can login
  name text not null,
  initials text not null default '',
  role crew_role not null,
  location text,
  coordinates geography(Point, 4326),
  rating numeric not null default 5.0,
  review_count int not null default 0,
  years_experience int not null default 0,
  day_rate numeric not null,
  certifications text[] not null default '{}',
  bio text,
  availability crew_availability not null default 'available',
  languages text[] not null default '{English}',
  specialties text[] not null default '{}',
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- MAINTENANCE TASKS (engine-specific templates)
-- ============================================================
create table maintenance_tasks (
  id uuid primary key default uuid_generate_v4(),
  engine_make text not null,
  engine_model_pattern text not null,  -- e.g. "Verado", "F-series", "DF"
  task text not null,
  category maintenance_category not null,
  interval_months int not null,
  interval_hours int,
  notes text,
  sort_order int not null default 0
);

-- ============================================================
-- SERVICE RECORDS (owner logs maintenance per boat)
-- ============================================================
create table service_records (
  id uuid primary key default uuid_generate_v4(),
  boat_id uuid not null references boats(id) on delete cascade,
  owner_id uuid not null references profiles(id) on delete cascade,
  maintenance_task_id uuid references maintenance_tasks(id) on delete set null,
  title text not null,
  category maintenance_category,
  date date not null,
  engine_hours int,
  cost numeric,
  vendor_name text,
  notes text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text,
  data jsonb,  -- flexible payload (project_id, bid_id, etc.)
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- FEE TIERS (reference table)
-- ============================================================
create table fee_tiers (
  id uuid primary key default uuid_generate_v4(),
  name fee_tier_name unique not null,
  min_earnings numeric not null,
  max_earnings numeric,  -- null for unlimited (Gold)
  fee_rate numeric not null,
  color text not null,
  bg_color text not null,
  badge_color text not null
);

-- Seed fee tiers
insert into fee_tiers (name, min_earnings, max_earnings, fee_rate, color, bg_color, badge_color)
values
  ('Bronze', 0, 5000, 0.10, '#CD7F32', '#FDF2E9', '#CD7F32'),
  ('Silver', 5000, 20000, 0.07, '#C0C0C0', '#F5F5F5', '#71717A'),
  ('Gold', 20000, null, 0.05, '#FFD700', '#FFFBEB', '#B8860B');

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_boats_owner on boats(owner_id);
create index idx_projects_owner on projects(owner_id);
create index idx_projects_status on projects(status);
create index idx_projects_boat on projects(boat_id);
create index idx_bids_project on bids(project_id);
create index idx_bids_vendor on bids(vendor_id);
create index idx_messages_bid on messages(bid_id);
create index idx_messages_sender on messages(sender_id);
create index idx_messages_recipient on messages(recipient_id);
create index idx_messages_created on messages(created_at desc);
create index idx_reviews_vendor on reviews(vendor_id);
create index idx_reviews_project on reviews(project_id);
create index idx_notifications_user on notifications(user_id, read, created_at desc);
create index idx_service_records_boat on service_records(boat_id);
create index idx_payments_invoice on payments(invoice_id);
create index idx_boat_documents_boat on boat_documents(boat_id);
create index idx_project_photos_project on project_photos(project_id);
create index idx_vendor_profiles_location on vendor_profiles using gist(location);
create index idx_crew_members_location on crew_members using gist(coordinates);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table profiles enable row level security;
alter table boats enable row level security;
alter table boat_documents enable row level security;
alter table vendor_profiles enable row level security;
alter table projects enable row level security;
alter table project_photos enable row level security;
alter table bids enable row level security;
alter table bid_line_items enable row level security;
alter table messages enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table payments enable row level security;
alter table reviews enable row level security;
alter table crew_members enable row level security;
alter table maintenance_tasks enable row level security;
alter table service_records enable row level security;
alter table notifications enable row level security;
alter table fee_tiers enable row level security;

-- PROFILES: users can read all profiles, update own
create policy "Profiles are viewable by everyone" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- BOATS: owners see own boats, vendors can see boats on their projects
create policy "Owners see own boats" on boats for select using (auth.uid() = owner_id);
create policy "Owners manage own boats" on boats for all using (auth.uid() = owner_id);

-- BOAT DOCUMENTS: owner only
create policy "Owners manage own docs" on boat_documents for all using (auth.uid() = owner_id);

-- VENDOR PROFILES: everyone can read, vendors update own
create policy "Vendor profiles are public" on vendor_profiles for select using (true);
create policy "Vendors update own profile" on vendor_profiles for update using (auth.uid() = user_id);
create policy "Vendors insert own profile" on vendor_profiles for insert with check (auth.uid() = user_id);

-- PROJECTS: owners see own, vendors see active/bidding projects
create policy "Owners see own projects" on projects for select using (auth.uid() = owner_id);
create policy "Vendors see active projects" on projects for select using (status in ('active', 'bidding', 'gathering'));
create policy "Owners manage own projects" on projects for insert with check (auth.uid() = owner_id);
create policy "Owners update own projects" on projects for update using (auth.uid() = owner_id);

-- PROJECT PHOTOS: follow project access
create policy "Photos follow project access" on project_photos for select using (
  exists (select 1 from projects where projects.id = project_photos.project_id
    and (projects.owner_id = auth.uid() or projects.status in ('active', 'bidding', 'gathering')))
);
create policy "Owners add photos" on project_photos for insert with check (
  exists (select 1 from projects where projects.id = project_photos.project_id and projects.owner_id = auth.uid())
);

-- BIDS: vendors see own, owners see bids on their projects
create policy "Owners see bids on their projects" on bids for select using (
  exists (select 1 from projects where projects.id = bids.project_id and projects.owner_id = auth.uid())
);
create policy "Vendors see own bids" on bids for select using (
  exists (select 1 from vendor_profiles where vendor_profiles.id = bids.vendor_id and vendor_profiles.user_id = auth.uid())
);
create policy "Vendors create bids" on bids for insert with check (
  exists (select 1 from vendor_profiles where vendor_profiles.id = bids.vendor_id and vendor_profiles.user_id = auth.uid())
);
create policy "Vendors update own bids" on bids for update using (
  exists (select 1 from vendor_profiles where vendor_profiles.id = bids.vendor_id and vendor_profiles.user_id = auth.uid())
);

-- BID LINE ITEMS: follow bid access
create policy "Line items follow bid access" on bid_line_items for select using (
  exists (select 1 from bids join projects on projects.id = bids.project_id
    where bids.id = bid_line_items.bid_id
    and (projects.owner_id = auth.uid()
      or exists (select 1 from vendor_profiles where vendor_profiles.id = bids.vendor_id and vendor_profiles.user_id = auth.uid())))
);

-- MESSAGES: sender and recipient can see
create policy "Users see own messages" on messages for select using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "Users send messages" on messages for insert with check (auth.uid() = sender_id);
create policy "Recipients update status" on messages for update using (auth.uid() = recipient_id);

-- INVOICES: involved parties only
create policy "Invoice parties can view" on invoices for select using (auth.uid() = owner_id or
  exists (select 1 from vendor_profiles where vendor_profiles.id = invoices.vendor_id and vendor_profiles.user_id = auth.uid()));

-- INVOICE ITEMS: follow invoice access
create policy "Invoice items follow invoice" on invoice_items for select using (
  exists (select 1 from invoices where invoices.id = invoice_items.invoice_id
    and (invoices.owner_id = auth.uid()
      or exists (select 1 from vendor_profiles where vendor_profiles.id = invoices.vendor_id and vendor_profiles.user_id = auth.uid())))
);

-- PAYMENTS: involved parties
create policy "Payment parties can view" on payments for select using (auth.uid() = payer_id or auth.uid() = payee_id);

-- REVIEWS: public read, reviewer can create/update
create policy "Reviews are public" on reviews for select using (true);
create policy "Reviewers create reviews" on reviews for insert with check (auth.uid() = reviewer_id);
create policy "Reviewers update own" on reviews for update using (auth.uid() = reviewer_id);

-- CREW: public read
create policy "Crew profiles are public" on crew_members for select using (true);
create policy "Crew update own" on crew_members for update using (auth.uid() = user_id);

-- MAINTENANCE TASKS: public read (reference data)
create policy "Maintenance tasks are public" on maintenance_tasks for select using (true);

-- SERVICE RECORDS: owner only
create policy "Owners see own records" on service_records for select using (auth.uid() = owner_id);
create policy "Owners manage records" on service_records for all using (auth.uid() = owner_id);

-- NOTIFICATIONS: user only
create policy "Users see own notifications" on notifications for select using (auth.uid() = user_id);
create policy "Users update own notifications" on notifications for update using (auth.uid() = user_id);

-- FEE TIERS: public reference
create policy "Fee tiers are public" on fee_tiers for select using (true);

-- ============================================================
-- REALTIME — enable for messages and notifications
-- ============================================================
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table notifications;

-- ============================================================
-- FUNCTIONS — auto-create profile on signup
-- ============================================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name, initials, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    upper(left(coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 2)),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'owner')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- FUNCTIONS — update vendor stats after review
-- ============================================================
create or replace function update_vendor_rating()
returns trigger
language plpgsql
security definer
as $$
begin
  update vendor_profiles set
    completed_jobs = (select count(*) from reviews where reviews.vendor_id = new.vendor_id),
    updated_at = now()
  where id = new.vendor_id;
  return new;
end;
$$;

create trigger on_review_created
  after insert on reviews
  for each row execute procedure update_vendor_rating();

-- ============================================================
-- FUNCTIONS — update updated_at timestamp
-- ============================================================
create or replace function update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_profiles_timestamp before update on profiles for each row execute procedure update_updated_at();
create trigger update_boats_timestamp before update on boats for each row execute procedure update_updated_at();
create trigger update_vendor_profiles_timestamp before update on vendor_profiles for each row execute procedure update_updated_at();
create trigger update_projects_timestamp before update on projects for each row execute procedure update_updated_at();
create trigger update_bids_timestamp before update on bids for each row execute procedure update_updated_at();
create trigger update_crew_members_timestamp before update on crew_members for each row execute procedure update_updated_at();
create trigger update_payments_timestamp before update on payments for each row execute procedure update_updated_at();

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
-- Run these separately in Storage settings or via API:
-- 1. "project-photos" — public read, auth write
-- 2. "boat-photos" — public read, auth write
-- 3. "boat-documents" — private (owner only)
-- 4. "avatars" — public read, auth write
-- 5. "vendor-logos" — public read, vendor write
