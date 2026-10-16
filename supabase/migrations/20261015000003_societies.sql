-- =============================================================================
-- 0003 SOCIETIES
-- Verification applications, approved societies, memberships with explicit
-- role permissions, and member invitations.
-- =============================================================================

create table public.society_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.profiles (id) on delete cascade,
  status public.society_application_status not null default 'draft',
  name text not null check (char_length(name) between 3 and 140),
  university_id uuid not null references public.universities (id) on delete restrict,
  campus_id uuid references public.campuses (id) on delete set null,
  department_id uuid references public.departments (id) on delete set null,
  scope_label text check (char_length(scope_label) <= 120),
  category_id smallint references public.event_categories (id) on delete set null,
  description text check (char_length(description) <= 3000),
  logo_path text check (char_length(logo_path) <= 300),
  website_url text check (website_url is null or website_url ~* '^https?://'),
  social_links jsonb not null default '[]'::jsonb check (jsonb_typeof(social_links) = 'array' and jsonb_array_length(social_links) <= 6),
  faculty_advisor_name text check (char_length(faculty_advisor_name) <= 120),
  faculty_advisor_title text check (char_length(faculty_advisor_title) <= 120),
  faculty_advisor_email text check (char_length(faculty_advisor_email) <= 200),
  president_name text check (char_length(president_name) <= 120),
  president_email text check (char_length(president_email) <= 200),
  contact_email text check (char_length(contact_email) <= 200),
  contact_phone text check (char_length(contact_phone) <= 30),
  public_contact_email text check (char_length(public_contact_email) <= 200),
  team_size int check (team_size between 1 and 5000),
  recognition_details text check (char_length(recognition_details) <= 2000),
  evidence_path text check (char_length(evidence_path) <= 300),
  applicant_role text check (char_length(applicant_role) <= 120),
  admin_message text check (char_length(admin_message) <= 2000),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  submitted_at timestamptz,
  society_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index society_applications_status_idx on public.society_applications (status, submitted_at);
create index society_applications_applicant_idx on public.society_applications (applicant_id);
create trigger society_applications_updated_at before update on public.society_applications
  for each row execute function private.set_updated_at();

create table public.societies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 3 and 140),
  university_id uuid not null references public.universities (id) on delete restrict,
  campus_id uuid references public.campuses (id) on delete set null,
  department_id uuid references public.departments (id) on delete set null,
  scope_label text check (char_length(scope_label) <= 120),
  category_id smallint references public.event_categories (id) on delete set null,
  description text check (char_length(description) <= 3000),
  logo_path text check (char_length(logo_path) <= 300),
  website_url text check (website_url is null or website_url ~* '^https?://'),
  social_links jsonb not null default '[]'::jsonb check (jsonb_typeof(social_links) = 'array' and jsonb_array_length(social_links) <= 6),
  public_contact_email text check (char_length(public_contact_email) <= 200),
  status public.society_status not null default 'active',
  status_note text check (char_length(status_note) <= 1000),
  verified_at timestamptz,
  -- New societies have their events reviewed by platform staff before they
  -- go live. Administrators can mark an established society as trusted.
  events_require_review boolean not null default true,
  application_id uuid references public.society_applications (id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index societies_name_unique on public.societies (university_id, lower(name));
create index societies_university_idx on public.societies (university_id) where status = 'active';
create index societies_name_trgm on public.societies using gin (name extensions.gin_trgm_ops);
create trigger societies_updated_at before update on public.societies
  for each row execute function private.set_updated_at();

alter table public.society_applications
  add constraint society_applications_society_fk foreign key (society_id) references public.societies (id) on delete set null;

create table public.society_memberships (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.society_role not null,
  title text check (char_length(title) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (society_id, user_id)
);
-- Exactly one owner per society.
create unique index society_memberships_one_owner on public.society_memberships (society_id) where role = 'owner';
create index society_memberships_user_idx on public.society_memberships (user_id);
create trigger society_memberships_updated_at before update on public.society_memberships
  for each row execute function private.set_updated_at();

create table public.society_invitations (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies (id) on delete cascade,
  email extensions.citext not null check (char_length(email) <= 200),
  role public.society_role not null check (role <> 'owner'),
  status public.invitation_status not null default 'pending',
  invited_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  responded_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index society_invitations_pending_unique on public.society_invitations (society_id, email) where status = 'pending';
create index society_invitations_email_idx on public.society_invitations (email) where status = 'pending';

-- -----------------------------------------------------------------------------
-- Role -> permission mapping. This is the single source of truth for what
-- each society role may do. It is mirrored (read-only) in
-- src/lib/permissions.ts for UI decisions; the database is authoritative.
-- -----------------------------------------------------------------------------
create or replace function private.role_permissions(p_role public.society_role)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_role
    when 'owner' then array[
      'view_society', 'manage_profile', 'manage_members', 'manage_admins', 'transfer_ownership',
      'create_events', 'edit_events', 'publish_events', 'cancel_events',
      'view_registrations', 'manage_registrations', 'export_data', 'check_in',
      'manage_volunteers', 'view_volunteer_applicants', 'issue_certificates',
      'manage_collaborations', 'view_analytics'
    ]
    when 'admin' then array[
      'view_society', 'manage_profile', 'manage_members',
      'create_events', 'edit_events', 'publish_events', 'cancel_events',
      'view_registrations', 'manage_registrations', 'export_data', 'check_in',
      'manage_volunteers', 'view_volunteer_applicants', 'issue_certificates',
      'manage_collaborations', 'view_analytics'
    ]
    when 'event_manager' then array[
      'view_society', 'create_events', 'edit_events', 'publish_events', 'cancel_events',
      'view_registrations', 'manage_registrations', 'export_data', 'check_in',
      'manage_collaborations', 'view_analytics'
    ]
    when 'volunteer_coordinator' then array[
      'view_society', 'manage_volunteers', 'view_volunteer_applicants', 'issue_certificates', 'check_in'
    ]
    when 'analyst' then array['view_society', 'view_analytics']
  end;
$$;

-- Read-only permissions remain available while a society is suspended so
-- members can still see (and export) their existing data obligations.
create or replace function private.has_society_permission(p_society uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.society_memberships m
    join public.societies s on s.id = m.society_id
    where m.society_id = p_society
      and m.user_id = (select auth.uid())
      and p_permission = any (private.role_permissions(m.role))
      and (s.status = 'active' or p_permission in ('view_society', 'view_registrations', 'view_volunteer_applicants', 'view_analytics', 'export_data'))
  );
$$;

create or replace function private.is_society_member(p_society uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.society_memberships m
    where m.society_id = p_society and m.user_id = (select auth.uid())
  );
$$;
