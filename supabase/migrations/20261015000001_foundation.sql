-- =============================================================================
-- 0001 FOUNDATION
-- Extensions, enums, reference directory (cities, universities, campuses,
-- departments, categories), profiles, preferences, platform administrators,
-- audit log and rate limiting.
--
-- Conventions
--   * public schema  -> objects reachable through the Supabase Data API
--   * private schema -> internal helpers, never exposed through the API
--   * Every table in public has RLS enabled (see 0008_rls.sql) and explicit
--     grants (see 0009_grants.sql). Nothing relies on Supabase default grants.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create schema if not exists private;
revoke all on schema private from public;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.academic_level as enum ('undergraduate', 'masters', 'phd', 'diploma', 'other');
create type public.society_role as enum ('owner', 'admin', 'event_manager', 'volunteer_coordinator', 'analyst');
create type public.society_application_status as enum ('draft', 'submitted', 'under_review', 'info_requested', 'approved', 'rejected');
create type public.society_status as enum ('active', 'suspended');
create type public.invitation_status as enum ('pending', 'accepted', 'declined', 'revoked', 'expired');
create type public.event_status as enum ('draft', 'pending_review', 'changes_requested', 'rejected', 'published', 'archived');
create type public.event_schedule_status as enum ('scheduled', 'postponed', 'cancelled');
create type public.event_format as enum ('in_person', 'online', 'hybrid');
create type public.event_type as enum (
  'hackathon', 'competition', 'workshop', 'seminar', 'conference', 'webinar', 'festival',
  'debate', 'mun', 'sports', 'cultural', 'career_fair', 'networking', 'other'
);
create type public.registration_mode as enum ('none', 'individual', 'team', 'external');
create type public.eligibility_scope as enum ('open', 'host_university', 'selected_universities');
create type public.registration_status as enum ('pending', 'confirmed', 'waitlisted', 'rejected', 'cancelled');
create type public.volunteer_role_status as enum ('open', 'paused', 'closed');
create type public.experience_level as enum ('none', 'some', 'experienced');
create type public.volunteer_application_status as enum (
  'submitted', 'under_review', 'shortlisted', 'interview_requested', 'offered',
  'accepted', 'declined', 'waitlisted', 'rejected', 'withdrawn', 'completed'
);
create type public.collaboration_status as enum ('pending', 'accepted', 'declined', 'revoked');
create type public.report_reason as enum (
  'fraudulent_event', 'impersonation', 'misleading_fees', 'spam', 'inappropriate_content', 'misuse_of_data', 'other'
);
create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
create type public.report_target as enum ('event', 'society', 'profile');
create type public.email_status as enum ('queued', 'sending', 'sent', 'failed', 'skipped', 'logged_dev');
create type public.email_category as enum ('transactional', 'reminder', 'promotional');

-- -----------------------------------------------------------------------------
-- Generic helpers
-- -----------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Random code from an unambiguous alphabet (no 0/O/1/I/L). Used for human
-- readable references such as application numbers.
create or replace function private.random_code(p_length int)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  bytes bytea := extensions.gen_random_bytes(p_length);
  result text := '';
begin
  for i in 0 .. p_length - 1 loop
    result := result || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
  end loop;
  return result;
end;
$$;

-- URL-safe unguessable token (used for tickets). 18 random bytes = 144 bits.
create or replace function private.random_token()
returns text
language sql
volatile
set search_path = ''
as $$
  select translate(encode(extensions.gen_random_bytes(18), 'base64'), '+/=', '-_');
$$;

create or replace function private.slugify(p_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(p_value, '')), '[^a-z0-9]+', '-', 'g'));
$$;

-- -----------------------------------------------------------------------------
-- Reference directory
-- -----------------------------------------------------------------------------
create table public.cities (
  id smallint generated always as identity primary key,
  name text not null unique check (char_length(name) between 2 and 80),
  province text not null check (char_length(province) between 2 and 80),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.universities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 160),
  short_name text check (char_length(short_name) <= 30),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  city_id smallint references public.cities (id) on delete restrict,
  website_url text check (website_url ~* '^https://'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index universities_name_unique on public.universities (lower(name));
create index universities_city_idx on public.universities (city_id);

create table public.campuses (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  city_id smallint references public.cities (id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index campuses_name_unique on public.campuses (university_id, lower(name));

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index departments_name_unique on public.departments (university_id, lower(name));

create table public.event_categories (
  id smallint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null unique check (char_length(name) between 2 and 60),
  description text check (char_length(description) <= 240),
  sort_order int not null default 100,
  is_active boolean not null default true
);

-- -----------------------------------------------------------------------------
-- Profiles & preferences
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  -- Copy of the verified auth email so authorised organisers can contact
  -- registrants. Maintained by trigger; never writable by clients.
  contact_email extensions.citext,
  avatar_path text check (char_length(avatar_path) <= 300),
  university_id uuid references public.universities (id) on delete set null,
  campus_id uuid references public.campuses (id) on delete set null,
  department_id uuid references public.departments (id) on delete set null,
  program text check (char_length(program) <= 120),
  academic_level public.academic_level,
  graduation_year int check (graduation_year between 1980 and 2100),
  city_id smallint references public.cities (id) on delete set null,
  bio text check (char_length(bio) <= 600),
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_university_idx on public.profiles (university_id);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

-- Interests are explicit, user-chosen categories. They drive explainable
-- recommendations ("Because you selected Cybersecurity").
create table public.profile_interests (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  category_id smallint not null references public.event_categories (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, category_id)
);

-- Notification preferences. Essential transactional/security messages cannot
-- be switched off here; only reminders and promotional recommendations can.
create table public.user_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  email_reminders boolean not null default true,
  email_recommendations boolean not null default false,
  email_society_updates boolean not null default true,
  updated_at timestamptz not null default now()
);
create trigger user_preferences_updated_at before update on public.user_preferences
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Platform administrators
-- Rows can only be created by the database owner / service role (see
-- README "Bootstrapping the first administrator"). There is deliberately no
-- client-side path to insert into this table.
-- -----------------------------------------------------------------------------
create table public.platform_admins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid references public.profiles (id) on delete set null,
  note text check (char_length(note) <= 300)
);

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())
  );
$$;

-- -----------------------------------------------------------------------------
-- New-user trigger: creates the profile + default preferences. Only the
-- display name is read from sign-up metadata; roles are NEVER read from it.
-- -----------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 120);
begin
  insert into public.profiles (id, full_name, contact_email)
  values (new.id, v_name, new.email);
  insert into public.user_preferences (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set contact_email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function private.handle_user_email_change();

-- -----------------------------------------------------------------------------
-- Audit log
-- -----------------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null check (char_length(action) <= 80),
  entity_type text not null check (char_length(entity_type) <= 60),
  entity_id uuid,
  society_id uuid,
  event_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);
create index audit_logs_society_idx on public.audit_logs (society_id, created_at desc);
create index audit_logs_event_idx on public.audit_logs (event_id, created_at desc);

create or replace function private.audit(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_society_id uuid default null,
  p_event_id uuid default null,
  p_details jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, society_id, event_id, details)
  values ((select auth.uid()), p_action, p_entity_type, p_entity_id, p_society_id, p_event_id, coalesce(p_details, '{}'::jsonb));
$$;

-- -----------------------------------------------------------------------------
-- Rate limiting (fixed window, stored in Postgres so it works on serverless
-- hosting without an extra service).
-- -----------------------------------------------------------------------------
create table private.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (key, window_start)
);

create or replace function private.enforce_rate_limit(p_key text, p_max int, p_window_seconds int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits int;
begin
  insert into private.rate_limits as rl (key, window_start, hits)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = rl.hits + 1
  returning hits into v_hits;

  if v_hits > p_max then
    raise exception 'Too many requests. Please wait a moment and try again.'
      using errcode = 'P0429';
  end if;

  -- Opportunistic clean-up of stale windows.
  if random() < 0.01 then
    delete from private.rate_limits where window_start < now() - interval '1 day';
  end if;
end;
$$;

-- Standard "must be signed in" guard used by API functions.
create or replace function private.require_user()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'You need to sign in to do that.' using errcode = '42501';
  end if;
  return v_uid;
end;
$$;
