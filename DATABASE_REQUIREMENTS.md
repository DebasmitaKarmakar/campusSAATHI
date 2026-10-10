# College Saathi Database Requirements

## 1. Purpose

This document describes the persistent data College Saathi needs when moving
from browser-only `localStorage` to a shared backend database. It is intended
for database design, backend implementation, and project handoff.

The current application is a static, local-first React app. Its records are
stored per browser/device and are not shared between users. A backend database
is needed for shared accounts, campus content, workflows, and reporting.

## 1.1 Current Supabase integration status

The initial PostgreSQL schema is maintained as a Supabase migration at
[`supabase/migrations/20261010100000_initial_schema.sql`](./supabase/migrations/20261010100000_initial_schema.sql).
It creates the core tables, constraints, indexes, an Auth-to-profile trigger,
and enables Row Level Security (RLS) on every table.

The migration is a schema foundation only. The frontend does not initialize a
Supabase client or read/write Supabase tables. The fixed test OTP `098765` and
simulated sign-in are available for whitelisted emails in both development and
deployed builds. No email is sent. This demo flow does not establish a verified
identity and must not be treated as authorization for Supabase. Application
data continues to be stored in browser `localStorage`/`sessionStorage`; it is
not shared across users, browsers, or devices. Do not use the demo flow to
protect real or sensitive campus data.

RLS is enabled and the migration intentionally creates no client access
policies. Do not add anonymous/permissive policies. Before connecting feature
data, implement real Supabase Auth identity mapping, trusted role assignment,
and least-privilege RLS policies; then migrate and verify each module. Supabase
Storage buckets and their policies also need to be configured for file uploads.

### Current storage by feature

| Area | Current storage |
|---|---|
| Sign-in and demo OTP | Simulated client-side authentication; OTP challenge uses browser session storage. The fixed code is enabled in development and deployed builds, is not production identity verification, and is not valid for Supabase RLS. |
| Whitelist and device trust | Browser `localStorage`. |
| Profiles and theme | Browser `localStorage` and current app session. |
| Notices, grievances, opportunities, resources, attendance, canteen, Lost & Found, MicroHelp, directory contacts, verification requests, notifications, and admin logs | Browser `localStorage` through the local database service and feature services. |
| Static campus organizations and demo records | Seeded by frontend code into browser storage or defined as local demo data. |
| Supabase | Schema migration only; no frontend data operations. |

### Supabase values needed for a future frontend connection

When authenticated integration is ready, the frontend configuration will need:

1. **Project URL** in `VITE_SUPABASE_URL` — Supabase Dashboard → Project
   Settings → API (sometimes shown as the project URL).
2. **Publishable key** in `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase Dashboard
   → Project Settings → API. The legacy `anon` key can be used if the project
   only provides that format. These client keys are intended for browser use
   only when RLS is correctly configured.
3. **Authentication provider configuration** — decide and configure the real
   provider in Supabase Auth before replacing the development-only sign-in.

Do **not** put the `service_role`/secret key, database password, or any
privileged credential in frontend code, a `VITE_*` variable, or a committed
`.env` file. The database password is only needed for trusted administrative
connections such as a protected migration/CLI workflow; it is not a browser
credential. Blank placeholders for the two frontend values are in the ignored
`.env.local` file; the frontend remains intentionally disconnected.

Do not claim shared or cross-device persistence until authenticated database
integration, access policies, and end-to-end behavior have been implemented and
tested.

## 2. Recommended approach

Use a relational database such as PostgreSQL for the records below, plus
private object/file storage for uploaded documents and images.

### Database type conventions

| Type | Use |
|---|---|
| `TEXT` | Names, descriptions, email addresses, URLs, statuses, and IDs. Keep existing prefixed IDs such as `GRV-...` as text. |
| `UUID` | Optional backend-generated primary keys. If retaining the app's current prefixed IDs, use `TEXT` consistently instead. |
| `INTEGER` | Counts, ratings, quantities, semester numbers, and institutional numeric IDs. |
| `NUMERIC(10,2)` | Prices and currency amounts. |
| `BOOLEAN` | True/false flags such as archived, anonymous, available, and read. |
| `DATE` | Calendar dates such as deadlines and class dates. |
| `TIME` | Timetable start/end times. |
| `TIMESTAMPTZ` | Event times, created/updated times, and audit timestamps. Store in UTC. |
| `JSONB` | Small structured values when they are not queried independently. Prefer child tables for repeatable records such as order items, votes, and messages. |

Use `NOT NULL` for required data, `NULL` for optional data, foreign keys for
relationships, and indexes on frequently filtered fields such as email, status,
created time, deadline, and foreign keys. Validate user input and permissions
on the server, not only in the browser.

## 3. Feature-by-feature data requirements

`*` marks a required field. Unless noted otherwise, each table should also have
a primary key and an appropriate creation timestamp.

### 3.1 Accounts, roles, profiles, and administrator access

**Where used:** Sign-in, profile setup, admin identity governance, role-based
dashboards, and permission checks.

| Table | Fields and suggested types |
|---|---|
| `users` | `id TEXT PK`; `institutional_id INTEGER`; `email TEXT UNIQUE NOT NULL`; `full_name TEXT NOT NULL`; `department TEXT`; `preferred_name TEXT NULL`; `profile_photo_asset_id TEXT NULL FK`; `status TEXT NOT NULL` (`Active`, `Disabled`); `created_at TIMESTAMPTZ NOT NULL`; `last_login_at TIMESTAMPTZ NULL`. |
| `user_roles` | `user_id TEXT FK NOT NULL`; `role TEXT NOT NULL` (`student`, `faculty`, `canteen`, `admin`); composite primary key `(user_id, role)`. Use this if an account may have more than one role. |
| `admin_audit_logs` | `id TEXT PK`; `admin_user_id TEXT FK NOT NULL`; `action TEXT NOT NULL`; `target_id TEXT NULL`; `target_name TEXT NULL`; `details TEXT NULL`; `created_at TIMESTAMPTZ NOT NULL`. |

Authentication credentials, Google identity tokens, and OTP challenges should
be managed by a trusted authentication service/backend, not stored as plaintext
database fields. The current whitelist and displayed demo OTP are not production
authentication. Do not trust a client-side role or device-trust flag as proof of
authorization.

### 3.2 Notices and campus announcements

**Where used:** Notice Board; faculty/admin create, target, archive, and publish
notices.

| Table | Fields and suggested types |
|---|---|
| `notices` | `id TEXT PK`; `title TEXT NOT NULL`; `body TEXT NOT NULL`; `publisher_user_id TEXT FK NOT NULL`; `audience TEXT NOT NULL` (`all`, `student`, `faculty`); `priority TEXT NOT NULL` (`Normal`, `Important`, `Urgent`); `attachment_asset_id TEXT NULL FK`; `created_at TIMESTAMPTZ NOT NULL`; `is_archived BOOLEAN NOT NULL DEFAULT FALSE`. |

### 3.3 Grievances

**Where used:** Grievance Portal; users file and vote, faculty/admin review,
respond, and change status.

| Table | Fields and suggested types |
|---|---|
| `grievances` | `id TEXT PK`; `reporter_user_id TEXT FK NOT NULL`; `reporter_name_snapshot TEXT NULL`; `category TEXT NOT NULL`; `priority TEXT NOT NULL`; `subject TEXT NOT NULL`; `description TEXT NOT NULL`; `is_anonymous BOOLEAN NOT NULL DEFAULT FALSE`; `status TEXT NOT NULL` (`Open`, `Under Review`, `Resolved`, `Rejected`); `admin_response TEXT NULL`; `created_at TIMESTAMPTZ NOT NULL`; `updated_at TIMESTAMPTZ NOT NULL`. |
| `grievance_votes` | `grievance_id TEXT FK NOT NULL`; `user_id TEXT FK NOT NULL`; `created_at TIMESTAMPTZ NOT NULL`; composite primary key `(grievance_id, user_id)`. |

Keep the reporter's account ID for authorized workflow and prevent duplicate
votes; suppress identifying details from public views when `is_anonymous` is
true.

### 3.4 Opportunities

**Where used:** Opportunity Window; students submit opportunities for review,
and admins publish, reject, or remove them.

| Table | Fields and suggested types |
|---|---|
| `opportunities` | `id TEXT PK`; `title TEXT NOT NULL`; `mode TEXT NOT NULL` (`Online`, `Offline`, `Hybrid`); `deadline DATE NOT NULL`; `description TEXT NULL`; `document_asset_id TEXT NULL FK`; `external_url TEXT NULL`; `status TEXT NOT NULL` (`Pending`, `Active`, `Expired`, `Rejected`); `poster_user_id TEXT FK NOT NULL`; `created_at TIMESTAMPTZ NOT NULL`. |

### 3.5 Academic resources and peer learning

**Where used:** Resources repository, help requests, tutoring/skill offers, and
moderation or completion workflows.

| Table | Fields and suggested types |
|---|---|
| `academic_resources` | `id TEXT PK`; `year TEXT NOT NULL`; `semester TEXT NOT NULL`; `exam_name TEXT NULL`; `exam_type TEXT NULL`; `subject TEXT NOT NULL`; `branch TEXT NOT NULL`; `resource_type TEXT NOT NULL` (`Paper`, `Notes`); `document_url TEXT NOT NULL` or `document_asset_id TEXT FK`; `canonical_name TEXT NULL`; `uploader_user_id TEXT FK NOT NULL`; `created_at TIMESTAMPTZ NOT NULL`; `is_archived BOOLEAN NOT NULL DEFAULT FALSE`. |
| `peer_help_requests` | `id TEXT PK`; `requester_user_id TEXT FK NOT NULL`; `topic TEXT NOT NULL`; `category TEXT NOT NULL` (`Academic`, `Skill-based`); `session_type TEXT NOT NULL` (`Individual`, `Group`); `description TEXT NULL`; `preferred_time TEXT NULL`; `preferred_place TEXT NULL`; `status TEXT NOT NULL` (`Open`, `Matched`, `Scheduled`, `Completed`, `Archived`); `helper_user_id TEXT NULL FK`; `helper_session_type TEXT NULL`; `created_at TIMESTAMPTZ NOT NULL`. |
| `skill_offers` | `id TEXT PK`; `expert_user_id TEXT FK NOT NULL`; `subject TEXT NOT NULL`; `category TEXT NOT NULL`; `description TEXT NOT NULL`; `proficiency_asset_id TEXT FK NOT NULL`; `created_at TIMESTAMPTZ NOT NULL`. |

The current resource upload form saves HTTPS links rather than uploading a
document. If the app later accepts direct uploads, store the file in object
storage and retain only its asset reference in the database.

### 3.6 Attendance and class scheduling

**Where used:** Admin timetable setup, faculty attendance sessions and
rescheduling, student attendance records, and student branch/semester setup.

| Table | Fields and suggested types |
|---|---|
| `student_academic_profiles` | `user_id TEXT PK FK`; `branch TEXT NOT NULL`; `semester INTEGER NOT NULL`; `is_archived BOOLEAN NOT NULL DEFAULT FALSE`. |
| `timetable_slots` | `id TEXT PK`; `branch TEXT NOT NULL`; `semester INTEGER NOT NULL`; `weekday TEXT NOT NULL`; `start_time TIME NOT NULL`; `end_time TIME NOT NULL`; `subject_name TEXT NOT NULL`; `subject_code TEXT NOT NULL`; `faculty_user_id TEXT FK NOT NULL`; `class_order INTEGER NOT NULL`; `is_active BOOLEAN NOT NULL DEFAULT TRUE`; `created_at TIMESTAMPTZ NOT NULL`. |
| `attendance_sessions` | `id TEXT PK`; `slot_id TEXT FK NOT NULL`; `class_date DATE NOT NULL`; `branch TEXT NOT NULL`; `semester INTEGER NOT NULL`; `weekday TEXT NOT NULL`; `start_time TIME NOT NULL`; `end_time TIME NOT NULL`; `subject_name TEXT NOT NULL`; `subject_code TEXT NOT NULL`; `faculty_user_id TEXT FK NOT NULL`; `status TEXT NOT NULL` (`Scheduled`, `Live`, `Closed`, `Cancelled`); `opened_at TIMESTAMPTZ NULL`; `closed_at TIMESTAMPTZ NULL`; `is_extra BOOLEAN NOT NULL DEFAULT FALSE`; `rescheduled_from TEXT NULL`; `note TEXT NULL`. |
| `attendance_records` | `id TEXT PK`; `session_id TEXT FK NOT NULL`; `slot_id TEXT FK NOT NULL`; `student_user_id TEXT FK NOT NULL`; `enrollment_no TEXT NULL`; `marked_at TIMESTAMPTZ NOT NULL`; `class_date DATE NOT NULL`; `subject_name TEXT NOT NULL`; `subject_code TEXT NOT NULL`; `branch TEXT NOT NULL`; `semester INTEGER NOT NULL`; unique constraint `(session_id, student_user_id)`. |
| `class_reschedule_requests` | `id TEXT PK`; `slot_id TEXT NULL FK`; `requested_by_user_id TEXT FK NOT NULL`; `request_type TEXT NOT NULL` (`Reschedule`, `Extra`); `original_date DATE NULL`; `new_date DATE NOT NULL`; `new_start_time TIME NOT NULL`; `new_end_time TIME NOT NULL`; `reason TEXT NOT NULL`; `status TEXT NOT NULL` (`Pending`, `Approved`, `Rejected`); `reviewed_by_user_id TEXT NULL FK`; `review_note TEXT NULL`; `reviewed_at TIMESTAMPTZ NULL`; `created_at TIMESTAMPTZ NOT NULL`. |

### 3.7 Canteen menu, orders, and feedback

**Where used:** Canteen staff manage menu and ordering slots; students place,
edit/cancel, and track orders; students submit meal and general feedback.

| Table | Fields and suggested types |
|---|---|
| `canteen_menu_items` | `id TEXT PK`; `name TEXT NOT NULL`; `price NUMERIC(10,2) NOT NULL`; `meal_type TEXT NOT NULL` (`Breakfast`, `Lunch`, `Dinner`); `is_available BOOLEAN NOT NULL DEFAULT TRUE`; `created_by_user_id TEXT FK NOT NULL`. |
| `canteen_ordering_slots` | `meal_type TEXT PK`; `is_open BOOLEAN NOT NULL DEFAULT TRUE`. |
| `canteen_orders` | `id TEXT PK`; `student_user_id TEXT FK NOT NULL`; `meal_type TEXT NOT NULL`; `total NUMERIC(10,2) NOT NULL`; `status TEXT NOT NULL` (`Pending`, `Served`, `Expired`, `Cancelled`); `created_at TIMESTAMPTZ NOT NULL`; `served_at TIMESTAMPTZ NULL`; `cancel_reason TEXT NULL`; `decline_reason TEXT NULL`; `feedback_submitted BOOLEAN NOT NULL DEFAULT FALSE`. |
| `canteen_order_items` | `id TEXT PK`; `order_id TEXT FK NOT NULL`; `menu_item_id TEXT NULL FK`; `item_name_snapshot TEXT NOT NULL`; `unit_price NUMERIC(10,2) NOT NULL`; `quantity INTEGER NOT NULL`. |
| `canteen_meal_feedback` | `order_id TEXT PK FK`; `taste_rating INTEGER NOT NULL`; `quantity_rating INTEGER NOT NULL`; `hygiene_rating INTEGER NOT NULL`; `created_at TIMESTAMPTZ NOT NULL`. Validate ratings are 1–5. |
| `canteen_general_feedback` | `id TEXT PK`; `category TEXT NOT NULL` (`Service Speed`, `Staff Behavior`, `Pricing`, `Hygiene`, `Other`); `comment TEXT NOT NULL`; `is_anonymous BOOLEAN NOT NULL`; `reporter_user_id TEXT NULL FK`; `created_at TIMESTAMPTZ NOT NULL`. |

Save the item name and unit price snapshot with each order so historical
receipts remain accurate if the menu changes. The app does not currently
collect payment details.

### 3.8 Lost & Found

**Where used:** Lost/found report creation, claims, finder/reporter updates,
comments, photo evidence, and collection confirmation.

| Table | Fields and suggested types |
|---|---|
| `lost_found_items` | `id TEXT PK`; `post_type TEXT NOT NULL` (`LostReport`, `FoundReport`); `category TEXT NOT NULL`; `title TEXT NOT NULL`; `description TEXT NOT NULL`; `location TEXT NOT NULL`; `event_at TIMESTAMPTZ NULL`; `status TEXT NOT NULL` (`Lost`, `Found`, `PendingHandover`, `Collected`); `reporter_user_id TEXT FK NOT NULL`; `finder_user_id TEXT NULL FK`; `claimant_user_id TEXT NULL FK`; `item_photo_asset_id TEXT NULL FK`; `handover_photo_asset_id TEXT NULL FK`; `created_at TIMESTAMPTZ NOT NULL`; `is_sensitive BOOLEAN NOT NULL DEFAULT FALSE`. |
| `lost_found_comments` | `id TEXT PK`; `item_id TEXT FK NOT NULL`; `user_id TEXT FK NOT NULL`; `text TEXT NOT NULL`; `created_at TIMESTAMPTZ NOT NULL`. |

### 3.9 MicroHelp

**Where used:** Financial, material, and medical requests; review/approval,
offers, accepted helper conversations, reporting, and messages.

| Table | Fields and suggested types |
|---|---|
| `microhelp_requests` | `id TEXT PK`; `author_user_id TEXT FK NOT NULL`; `author_name_snapshot TEXT NOT NULL`; `author_phone TEXT NULL`; `title TEXT NOT NULL`; `category TEXT NOT NULL` (`Financial`, `Material`, `Medical`); `description TEXT NOT NULL`; `contact_info TEXT NULL`; `is_anonymous BOOLEAN NOT NULL DEFAULT FALSE`; `document_asset_id TEXT NULL FK`; `document_name TEXT NULL`; `qr_asset_id TEXT NULL FK`; `status TEXT NOT NULL` (`Pending`, `Approved`, `Rejected`, `Expired`, `Resolved`); `review_note TEXT NULL`; `reviewed_by_user_id TEXT NULL FK`; `reviewed_at TIMESTAMPTZ NULL`; `created_at TIMESTAMPTZ NOT NULL`; `expires_at TIMESTAMPTZ NOT NULL`. |
| `microhelp_reports` | `request_id TEXT FK NOT NULL`; `reporter_user_id TEXT FK NOT NULL`; `created_at TIMESTAMPTZ NOT NULL`; composite primary key `(request_id, reporter_user_id)`. |
| `microhelp_offers` | `id TEXT PK`; `request_id TEXT FK NOT NULL`; `offer_user_id TEXT FK NOT NULL`; `offer_name_snapshot TEXT NOT NULL`; `message TEXT NOT NULL`; `status TEXT NOT NULL` (`Pending`, `Accepted`, `Declined`); `created_at TIMESTAMPTZ NOT NULL`. |
| `microhelp_chats` | `id TEXT PK`; `request_id TEXT FK NOT NULL`; `offer_id TEXT FK NOT NULL`; `requester_user_id TEXT FK NOT NULL`; `helper_user_id TEXT FK NOT NULL`; `status TEXT NOT NULL` (`Active`, `Closed`); `created_at TIMESTAMPTZ NOT NULL`. |
| `microhelp_chat_messages` | `id TEXT PK`; `chat_id TEXT FK NOT NULL`; `sender_user_id TEXT FK NOT NULL`; `text TEXT NOT NULL`; `created_at TIMESTAMPTZ NOT NULL`. |

### 3.10 Campus directory and organizations

**Where used:** Directory browsing and faculty/admin creation, editing,
publishing, and removal of contact entries. Organization records need persistence
if administrators should manage them rather than use the current static seed.

| Table | Fields and suggested types |
|---|---|
| `directory_contacts` | `id TEXT PK`; `name TEXT NOT NULL`; `title TEXT NULL`; `department TEXT NULL`; `email TEXT NULL`; `phone TEXT NULL`; `owner_user_id TEXT NULL FK`; `status TEXT NOT NULL` (`draft`, `published`); `updated_at TIMESTAMPTZ NOT NULL`. |
| `campus_organizations` | `id TEXT PK`; `name TEXT NOT NULL`; `type TEXT NULL` (`club`, `library`, `committee`, `cell`, `service`); `description TEXT NULL`; `website TEXT NULL`; `email TEXT NULL`; `logo_asset_id TEXT NULL FK`; `social_links JSONB NULL`; `status TEXT NULL`; `faculty_advisor_user_id TEXT NULL FK`. |

### 3.11 Verification / review requests

**Where used:** Faculty Review Panel for event, coordinator, notice,
organization-detail, and flagged-content decisions.

| Table | Fields and suggested types |
|---|---|
| `verification_requests` | `id TEXT PK`; `request_type TEXT NOT NULL` (`event`, `coordinator`, `notice`, `org_detail`, `flagged_content`); `target_id TEXT NOT NULL`; `target_name TEXT NOT NULL`; `requested_by_user_id TEXT FK NOT NULL`; `requested_at TIMESTAMPTZ NOT NULL`; `faculty_user_id TEXT NULL FK`; `status TEXT NOT NULL` (`Pending`, `Approved`, `Rejected`); `comment TEXT NULL`; `reviewed_at TIMESTAMPTZ NULL`. |

### 3.12 Notifications

**Where used:** Notification bell and system-generated alerts from notices,
grievances, canteen orders, Lost & Found, help requests, and opportunity
deadlines.

| Table | Fields and suggested types |
|---|---|
| `notifications` | `id TEXT PK`; `recipient_user_id TEXT NULL FK`; `broadcast BOOLEAN NOT NULL DEFAULT FALSE`; `category TEXT NOT NULL`; `title TEXT NOT NULL`; `message TEXT NOT NULL`; `is_read BOOLEAN NOT NULL DEFAULT FALSE`; `created_at TIMESTAMPTZ NOT NULL`; `reference_id TEXT NULL`. |

For broadcast notifications that have per-user read status, use a
`notification_reads(notification_id, user_id, read_at)` child table instead of
one global `is_read` value.

### 3.13 Shared file metadata

**Where used:** Profile photos, notice attachments, opportunity documents,
Lost & Found photos, proficiency PDFs, and MicroHelp documents/QR codes.

| Table | Fields and suggested types |
|---|---|
| `file_assets` | `id TEXT PK`; `storage_key TEXT NOT NULL UNIQUE`; `original_name TEXT NOT NULL`; `content_type TEXT NOT NULL`; `size_bytes BIGINT NOT NULL`; `uploaded_by_user_id TEXT FK NOT NULL`; `created_at TIMESTAMPTZ NOT NULL`. |

Store file bytes in private object storage, not in database `TEXT`/`BYTEA`
columns or Base64 form fields. Save a storage key or asset ID in the related
record. Check file type, size, access permissions, and download authorization
on the server.

## 4. Form input types collected by the application

These are the user-facing input types that populate the records above:

| Input type | Examples |
|---|---|
| Short text | Names, titles, subjects, departments, locations, contact details, item names, branch, semester, and reason. |
| Long text | Notice body, grievance description/reply, opportunity description, feedback, help request, claims, comments, and chat messages. |
| Email | Sign-in, account registration, contact email. Validate on server. |
| Telephone | Directory contact number or optional help contact. Keep as `TEXT`, not a numeric column, to preserve `+`, spaces, and leading zeros. |
| URL | Academic document links, official links, notice attachments. Validate scheme and host on server. |
| Integer / decimal | Institutional ID, ratings, quantity, and menu price. |
| Date / time | Opportunity deadline, class date, timetable start/end, and rescheduled class time. |
| Dropdown / enum | Role, category, priority, status, audience, meal type, resource type, attendance weekday, and session type. |
| Boolean | Anonymous submission, archived, available, active, and read flags. |
| File upload | Images, PDFs, profile photos, QR codes, and evidence documents. Store file contents outside the relational database. |
| System-generated | IDs, timestamps, status transitions, votes, notifications, and audit events. Generate/validate these on the backend. |

Search fields, list filters, unsaved form drafts, and a temporary cart are
transient UI state and do not need database tables unless product requirements
specifically call for saving them.

## 5. Relationship and integrity rules

1. A user may have one or more roles; enforce role assignment and permissions
   on the server for every create, update, and delete action.
2. Every user-owned record should reference `users.id`; use snapshots only
   where historical display should not change after a user profile update.
3. Attendance records must be unique per student and session.
4. Grievance votes and MicroHelp reports must be unique per user and target.
5. Order items, feedback, comments, offers, chat messages, and notification
   reads should be separate child rows with foreign keys.
6. Use transactions for operations that modify related records together, such
   as creating an order and its items or accepting an offer and creating a
   chat.
7. Define deletion behavior explicitly. Prefer soft deletion/archive for
   institutional records and avoid cascading deletion of audit history.
8. Add server-side validation for enum values, required fields, numeric ranges,
   valid dates, and ownership/role permissions.

## 6. Data that does not need shared persistence

- Dark/light theme preference can remain a local browser setting.
- Sign-in form input and unsent form drafts do not need persistence.
- Search terms, filters, modal state, and temporary preview state do not need
  persistence.
- Database schema version and demo seed markers are implementation metadata,
  not campus records.
- Activity summaries shown on profiles can be computed from orders, resources,
  opportunities, and Lost & Found records.

## 7. Migration scope

The current app stores records in browser `localStorage`/`sessionStorage`,
including local whitelist, session, trusted-device, theme, and demo-data keys.
Before launch, choose whether existing demo/browser data should be migrated or
replaced with authoritative institutional data. Do not treat demo records or
client-side local storage as a trusted source for accounts, attendance,
permissions, grievance identity, or audit history.
