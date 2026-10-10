-- College Saathi initial Supabase schema.
-- Apply with `supabase db push` after linking a Supabase project, or run in
-- the Supabase SQL Editor. Client access is intentionally closed until
-- feature-specific Row Level Security policies are added.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  institutional_id integer unique,
  email text not null unique,
  full_name text not null,
  department text,
  preferred_name text,
  profile_photo_storage_key text,
  status text not null default 'Active'
    check (status in ('Active', 'Disabled')),
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('student', 'faculty', 'canteen', 'admin')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.file_assets (
  id uuid primary key default gen_random_uuid(),
  storage_key text not null unique,
  original_name text not null,
  content_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  uploaded_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.profiles (id),
  action text not null,
  target_id text,
  target_name text,
  details text,
  created_at timestamptz not null default now()
);

create table public.notices (
  id text primary key,
  title text not null,
  body text not null,
  publisher_user_id uuid not null references public.profiles (id),
  audience text not null check (audience in ('all', 'student', 'faculty')),
  priority text not null check (priority in ('Normal', 'Important', 'Urgent')),
  attachment_asset_id uuid references public.file_assets (id) on delete set null,
  created_at timestamptz not null default now(),
  is_archived boolean not null default false
);

create table public.grievances (
  id text primary key,
  reporter_user_id uuid not null references public.profiles (id),
  reporter_name_snapshot text,
  category text not null,
  priority text not null check (priority in ('Low', 'Medium', 'High', 'Urgent')),
  subject text not null,
  description text not null,
  is_anonymous boolean not null default false,
  status text not null default 'Open'
    check (status in ('Open', 'Under Review', 'Resolved', 'Rejected')),
  admin_response text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.grievance_votes (
  grievance_id text not null references public.grievances (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (grievance_id, user_id)
);

create table public.opportunities (
  id text primary key,
  title text not null,
  mode text not null check (mode in ('Online', 'Offline', 'Hybrid')),
  deadline date not null,
  description text,
  document_asset_id uuid references public.file_assets (id) on delete set null,
  external_url text,
  status text not null default 'Pending'
    check (status in ('Pending', 'Active', 'Expired', 'Rejected')),
  poster_user_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.academic_resources (
  id text primary key,
  year text not null,
  semester text not null,
  exam_name text,
  exam_type text check (exam_type in ('End-Sem', 'Mid-Sem', 'CA1', 'CA2')),
  subject text not null,
  branch text not null,
  resource_type text not null check (resource_type in ('Paper', 'Notes')),
  document_url text,
  document_asset_id uuid references public.file_assets (id) on delete set null,
  canonical_name text,
  uploader_user_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  is_archived boolean not null default false,
  check (document_url is not null or document_asset_id is not null)
);

create table public.peer_help_requests (
  id text primary key,
  requester_user_id uuid not null references public.profiles (id),
  topic text not null,
  category text not null check (category in ('Academic', 'Skill-based')),
  session_type text not null check (session_type in ('Individual', 'Group')),
  description text,
  preferred_time text,
  preferred_place text,
  status text not null default 'Open'
    check (status in ('Open', 'Matched', 'Scheduled', 'Completed', 'Archived')),
  helper_user_id uuid references public.profiles (id) on delete set null,
  helper_session_type text check (helper_session_type in ('Individual', 'Group')),
  created_at timestamptz not null default now()
);

create table public.skill_offers (
  id text primary key,
  expert_user_id uuid not null references public.profiles (id),
  subject text not null,
  category text not null check (category in ('Academic', 'Skill-based')),
  description text not null,
  proficiency_asset_id uuid not null references public.file_assets (id),
  created_at timestamptz not null default now()
);

create table public.student_academic_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  branch text not null,
  semester integer not null check (semester between 1 and 8),
  is_archived boolean not null default false
);

create table public.timetable_slots (
  id text primary key,
  branch text not null,
  semester integer not null check (semester between 1 and 8),
  weekday text not null
    check (weekday in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
  start_time time not null,
  end_time time not null,
  subject_name text not null,
  subject_code text not null,
  faculty_user_id uuid not null references public.profiles (id),
  class_order integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create table public.attendance_sessions (
  id text primary key,
  slot_id text not null references public.timetable_slots (id),
  class_date date not null,
  branch text not null,
  semester integer not null check (semester between 1 and 8),
  weekday text not null
    check (weekday in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
  start_time time not null,
  end_time time not null,
  subject_name text not null,
  subject_code text not null,
  faculty_user_id uuid not null references public.profiles (id),
  status text not null default 'Scheduled'
    check (status in ('Scheduled', 'Live', 'Closed', 'Cancelled')),
  opened_at timestamptz,
  closed_at timestamptz,
  is_extra boolean not null default false,
  rescheduled_from text,
  note text,
  check (end_time > start_time)
);

create table public.attendance_records (
  id text primary key,
  session_id text not null references public.attendance_sessions (id) on delete cascade,
  slot_id text not null references public.timetable_slots (id),
  student_user_id uuid not null references public.profiles (id),
  enrollment_no text,
  marked_at timestamptz not null default now(),
  class_date date not null,
  subject_name text not null,
  subject_code text not null,
  branch text not null,
  semester integer not null check (semester between 1 and 8),
  unique (session_id, student_user_id)
);

create table public.class_reschedule_requests (
  id text primary key,
  slot_id text references public.timetable_slots (id) on delete set null,
  requested_by_user_id uuid not null references public.profiles (id),
  request_type text not null check (request_type in ('Reschedule', 'Extra')),
  original_date date,
  new_date date not null,
  new_start_time time not null,
  new_end_time time not null,
  reason text not null,
  status text not null default 'Pending'
    check (status in ('Pending', 'Approved', 'Rejected')),
  reviewed_by_user_id uuid references public.profiles (id) on delete set null,
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (new_end_time > new_start_time)
);

create table public.canteen_menu_items (
  id text primary key,
  name text not null,
  price numeric(10, 2) not null check (price >= 0),
  meal_type text not null check (meal_type in ('Breakfast', 'Lunch', 'Dinner')),
  is_available boolean not null default true,
  created_by_user_id uuid not null references public.profiles (id)
);

create table public.canteen_ordering_slots (
  meal_type text primary key check (meal_type in ('Breakfast', 'Lunch', 'Dinner')),
  is_open boolean not null default true
);

create table public.canteen_orders (
  id text primary key,
  student_user_id uuid not null references public.profiles (id),
  meal_type text not null check (meal_type in ('Breakfast', 'Lunch', 'Dinner')),
  total numeric(10, 2) not null check (total >= 0),
  status text not null default 'Pending'
    check (status in ('Pending', 'Served', 'Expired', 'Cancelled')),
  created_at timestamptz not null default now(),
  served_at timestamptz,
  cancel_reason text,
  decline_reason text,
  feedback_submitted boolean not null default false
);

create table public.canteen_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.canteen_orders (id) on delete cascade,
  menu_item_id text references public.canteen_menu_items (id) on delete set null,
  item_name_snapshot text not null,
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0)
);

create table public.canteen_meal_feedback (
  order_id text primary key references public.canteen_orders (id) on delete cascade,
  taste_rating integer not null check (taste_rating between 1 and 5),
  quantity_rating integer not null check (quantity_rating between 1 and 5),
  hygiene_rating integer not null check (hygiene_rating between 1 and 5),
  created_at timestamptz not null default now()
);

create table public.canteen_general_feedback (
  id text primary key,
  category text not null
    check (category in ('Service Speed', 'Staff Behavior', 'Pricing', 'Hygiene', 'Other')),
  comment text not null,
  is_anonymous boolean not null default false,
  reporter_user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.lost_found_items (
  id text primary key,
  post_type text not null check (post_type in ('LostReport', 'FoundReport')),
  category text not null check (category in ('ID Card', 'Wallet', 'Electronics', 'Documents', 'Keys', 'Other')),
  title text not null,
  description text not null,
  location text not null,
  event_at timestamptz,
  status text not null check (status in ('Lost', 'Found', 'PendingHandover', 'Collected')),
  reporter_user_id uuid not null references public.profiles (id),
  finder_user_id uuid references public.profiles (id) on delete set null,
  claimant_user_id uuid references public.profiles (id) on delete set null,
  item_photo_asset_id uuid references public.file_assets (id) on delete set null,
  handover_photo_asset_id uuid references public.file_assets (id) on delete set null,
  created_at timestamptz not null default now(),
  is_sensitive boolean not null default false
);

create table public.lost_found_comments (
  id text primary key,
  item_id text not null references public.lost_found_items (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  comment_text text not null,
  created_at timestamptz not null default now()
);

create table public.microhelp_requests (
  id text primary key,
  author_user_id uuid not null references public.profiles (id),
  author_name_snapshot text not null,
  author_phone text,
  title text not null,
  category text not null check (category in ('Financial', 'Material', 'Medical')),
  description text not null,
  contact_info text,
  is_anonymous boolean not null default false,
  document_asset_id uuid references public.file_assets (id) on delete set null,
  document_name text,
  qr_asset_id uuid references public.file_assets (id) on delete set null,
  status text not null default 'Pending'
    check (status in ('Pending', 'Approved', 'Rejected', 'Expired', 'Resolved')),
  review_note text,
  reviewed_by_user_id uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table public.microhelp_reports (
  request_id text not null references public.microhelp_requests (id) on delete cascade,
  reporter_user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (request_id, reporter_user_id)
);

create table public.microhelp_offers (
  id text primary key,
  request_id text not null references public.microhelp_requests (id) on delete cascade,
  offer_user_id uuid not null references public.profiles (id),
  offer_name_snapshot text not null,
  message text not null,
  status text not null default 'Pending' check (status in ('Pending', 'Accepted', 'Declined')),
  created_at timestamptz not null default now()
);

create table public.microhelp_chats (
  id text primary key,
  request_id text not null references public.microhelp_requests (id),
  offer_id text not null unique references public.microhelp_offers (id),
  requester_user_id uuid not null references public.profiles (id),
  helper_user_id uuid not null references public.profiles (id),
  status text not null default 'Active' check (status in ('Active', 'Closed')),
  created_at timestamptz not null default now()
);

create table public.microhelp_chat_messages (
  id text primary key,
  chat_id text not null references public.microhelp_chats (id) on delete cascade,
  sender_user_id uuid not null references public.profiles (id),
  message_text text not null,
  created_at timestamptz not null default now()
);

create table public.directory_contacts (
  id text primary key,
  name text not null,
  title text,
  department text,
  email text,
  phone text,
  owner_user_id uuid references public.profiles (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  updated_at timestamptz not null default now()
);

create table public.campus_organizations (
  id text primary key,
  name text not null,
  type text check (type in ('club', 'library', 'committee', 'cell', 'service')),
  description text,
  website text,
  email text,
  logo_asset_id uuid references public.file_assets (id) on delete set null,
  social_links jsonb,
  status text check (status in ('active', 'inactive')),
  faculty_advisor_user_id uuid references public.profiles (id) on delete set null
);

create table public.verification_requests (
  id text primary key,
  request_type text not null
    check (request_type in ('event', 'coordinator', 'notice', 'org_detail', 'flagged_content')),
  target_id text not null,
  target_name text not null,
  requested_by_user_id uuid not null references public.profiles (id),
  requested_at timestamptz not null default now(),
  faculty_user_id uuid references public.profiles (id) on delete set null,
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
  comment text,
  reviewed_at timestamptz
);

create table public.notifications (
  id text primary key,
  recipient_user_id uuid references public.profiles (id) on delete cascade,
  broadcast boolean not null default false,
  category text not null,
  title text not null,
  message text not null,
  created_at timestamptz not null default now(),
  reference_id text,
  check ((broadcast and recipient_user_id is null) or (not broadcast and recipient_user_id is not null))
);

create table public.notification_reads (
  notification_id text not null references public.notifications (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

create index profiles_email_idx on public.profiles (lower(email));
create index notices_audience_created_idx on public.notices (audience, created_at desc);
create index grievances_status_created_idx on public.grievances (status, created_at desc);
create index opportunities_status_deadline_idx on public.opportunities (status, deadline);
create index academic_resources_lookup_idx
  on public.academic_resources (branch, semester, subject, year);
create index peer_help_requests_status_created_idx
  on public.peer_help_requests (status, created_at desc);
create index timetable_slots_lookup_idx
  on public.timetable_slots (branch, semester, weekday, is_active);
create index attendance_sessions_date_idx
  on public.attendance_sessions (class_date, branch, semester);
create index attendance_records_student_date_idx
  on public.attendance_records (student_user_id, class_date desc);
create index canteen_orders_student_created_idx
  on public.canteen_orders (student_user_id, created_at desc);
create index canteen_orders_status_created_idx
  on public.canteen_orders (status, created_at);
create index lost_found_status_created_idx
  on public.lost_found_items (status, created_at desc);
create index microhelp_requests_status_created_idx
  on public.microhelp_requests (status, created_at desc);
create index microhelp_messages_chat_created_idx
  on public.microhelp_chat_messages (chat_id, created_at);
create index directory_contacts_status_name_idx
  on public.directory_contacts (status, name);
create index notifications_recipient_created_idx
  on public.notifications (recipient_user_id, created_at desc);

-- A profile is created for each Supabase Auth user. Role assignment is
-- deliberately not inferred from user-editable metadata.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', new.email, 'New User')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

-- Enable RLS everywhere. No client policies are intentionally granted by
-- this first migration; add explicit role- and ownership-aware policies
-- before connecting the frontend with the Supabase anon/publishable key.
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.file_assets enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.notices enable row level security;
alter table public.grievances enable row level security;
alter table public.grievance_votes enable row level security;
alter table public.opportunities enable row level security;
alter table public.academic_resources enable row level security;
alter table public.peer_help_requests enable row level security;
alter table public.skill_offers enable row level security;
alter table public.student_academic_profiles enable row level security;
alter table public.timetable_slots enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.class_reschedule_requests enable row level security;
alter table public.canteen_menu_items enable row level security;
alter table public.canteen_ordering_slots enable row level security;
alter table public.canteen_orders enable row level security;
alter table public.canteen_order_items enable row level security;
alter table public.canteen_meal_feedback enable row level security;
alter table public.canteen_general_feedback enable row level security;
alter table public.lost_found_items enable row level security;
alter table public.lost_found_comments enable row level security;
alter table public.microhelp_requests enable row level security;
alter table public.microhelp_reports enable row level security;
alter table public.microhelp_offers enable row level security;
alter table public.microhelp_chats enable row level security;
alter table public.microhelp_chat_messages enable row level security;
alter table public.directory_contacts enable row level security;
alter table public.campus_organizations enable row level security;
alter table public.verification_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;
