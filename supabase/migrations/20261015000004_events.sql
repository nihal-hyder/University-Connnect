-- =============================================================================
-- 0004 EVENTS
-- Events, versioned forms, registrations, tickets, attendance, collaborations,
-- saved events and privacy-preserving page-view counts.
--
-- Two independent status fields:
--   status          -> publishing lifecycle (draft ... published, archived)
--   schedule_status -> what is happening to the event itself
--                      (scheduled, postponed, cancelled)
-- Registration availability is derived from both plus the registration
-- window and capacity (see private.registration_state).
-- =============================================================================

create table public.events (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies (id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  title text not null check (char_length(title) between 4 and 140),
  summary text check (char_length(summary) <= 280),
  description text check (char_length(description) <= 12000),
  agenda jsonb not null default '[]'::jsonb check (jsonb_typeof(agenda) = 'array' and jsonb_array_length(agenda) <= 40),
  speakers jsonb not null default '[]'::jsonb check (jsonb_typeof(speakers) = 'array' and jsonb_array_length(speakers) <= 30),
  tags text[] not null default '{}' check (cardinality(tags) <= 10),
  category_id smallint references public.event_categories (id) on delete set null,
  event_type public.event_type not null default 'other',
  cover_path text check (char_length(cover_path) <= 300),

  starts_at timestamptz,
  ends_at timestamptz,
  timezone text not null default 'Asia/Karachi' check (char_length(timezone) <= 60),
  format public.event_format not null default 'in_person',
  university_id uuid references public.universities (id) on delete set null,
  campus_id uuid references public.campuses (id) on delete set null,
  city_id smallint references public.cities (id) on delete set null,
  venue text check (char_length(venue) <= 200),
  -- Meeting link is only revealed to confirmed participants (ticket page).
  online_url text check (online_url is null or online_url ~* '^https://'),
  accessibility_info text check (char_length(accessibility_info) <= 1000),

  eligibility_scope public.eligibility_scope not null default 'open',
  eligible_levels public.academic_level[] not null default '{}',
  eligibility_notes text check (char_length(eligibility_notes) <= 1000),

  registration_mode public.registration_mode not null default 'individual',
  external_registration_url text check (external_registration_url is null or external_registration_url ~* '^https://'),
  requires_approval boolean not null default false,
  capacity int check (capacity is null or capacity between 1 and 100000),
  waitlist_enabled boolean not null default true,
  team_min int check (team_min is null or team_min between 1 and 20),
  team_max int check (team_max is null or team_max between 1 and 20),
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  terms_text text check (char_length(terms_text) <= 3000),

  is_free boolean not null default true,
  fee_amount numeric(10, 2) check (fee_amount is null or fee_amount >= 0),
  fee_currency text not null default 'PKR' check (fee_currency ~ '^[A-Z]{3}$'),
  fee_description text check (char_length(fee_description) <= 1000),
  payment_instructions text check (char_length(payment_instructions) <= 2000),
  payment_url text check (payment_url is null or payment_url ~* '^https://'),
  refund_policy text check (char_length(refund_policy) <= 2000),

  contact_email text check (char_length(contact_email) <= 200),
  contact_phone text check (char_length(contact_phone) <= 30),

  volunteer_recruitment_open boolean not null default false,

  status public.event_status not null default 'draft',
  schedule_status public.event_schedule_status not null default 'scheduled',
  schedule_note text check (char_length(schedule_note) <= 1000),
  publish_at timestamptz,
  published_at timestamptz,
  submitted_at timestamptz,
  review_note text check (char_length(review_note) <= 2000),
  reviewed_by uuid references public.profiles (id) on delete set null,

  confirmed_count int not null default 0,
  pending_count int not null default 0,
  waitlist_count int not null default 0,

  is_demo boolean not null default false,
  search tsvector,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint events_dates_valid check (ends_at is null or starts_at is null or ends_at > starts_at),
  constraint events_registration_window_valid check (
    registration_opens_at is null or registration_closes_at is null or registration_closes_at > registration_opens_at
  ),
  constraint events_registration_before_end check (
    registration_closes_at is null or ends_at is null or registration_closes_at <= ends_at
  ),
  constraint events_team_sizes_valid check (team_min is null or team_max is null or team_max >= team_min),
  constraint events_fee_consistent check (is_free or fee_description is not null)
);
create index events_public_idx on public.events (starts_at) where status = 'published';
create index events_society_idx on public.events (society_id, created_at desc);
create index events_status_idx on public.events (status, submitted_at);
create index events_university_idx on public.events (university_id, starts_at);
create index events_campus_idx on public.events (campus_id);
create index events_city_idx on public.events (city_id, starts_at);
create index events_category_idx on public.events (category_id, starts_at);
create index events_type_idx on public.events (event_type, starts_at);
create index events_reg_close_idx on public.events (registration_closes_at);
create index events_search_idx on public.events using gin (search);
create index events_title_trgm on public.events using gin (title extensions.gin_trgm_ops);
create trigger events_updated_at before update on public.events
  for each row execute function private.set_updated_at();

create table public.event_target_universities (
  event_id uuid not null references public.events (id) on delete cascade,
  university_id uuid not null references public.universities (id) on delete cascade,
  primary key (event_id, university_id)
);

-- Search document includes organiser, university and category names so a
-- single full-text query covers "title, description, organiser, university
-- and category".
create or replace function private.events_build_search()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_society text;
  v_university text;
  v_university_short text;
  v_category text;
begin
  select name into v_society from public.societies where id = new.society_id;
  select name, short_name into v_university, v_university_short from public.universities where id = new.university_id;
  select name into v_category from public.event_categories where id = new.category_id;

  new.search :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(array_to_string(new.tags, ' '), '') || ' ' || coalesce(v_category, '') || ' ' || replace(new.event_type::text, '_', ' ')), 'B') ||
    setweight(to_tsvector('simple', coalesce(v_society, '') || ' ' || coalesce(v_university, '') || ' ' || coalesce(v_university_short, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.summary, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(new.description, '')), 'D');
  return new;
end;
$$;

create trigger events_search_refresh
  before insert or update of title, summary, description, tags, category_id, event_type, society_id, university_id
  on public.events
  for each row execute function private.events_build_search();

-- -----------------------------------------------------------------------------
-- Collaborations (invitation + resulting grant in one row)
-- -----------------------------------------------------------------------------
create table public.event_collaborations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  society_id uuid not null references public.societies (id) on delete cascade,
  status public.collaboration_status not null default 'pending',
  can_edit_details boolean not null default false,
  can_manage_volunteers boolean not null default false,
  can_view_registrations boolean not null default false,
  can_check_in boolean not null default false,
  can_view_analytics boolean not null default false,
  message text check (char_length(message) <= 1000),
  invited_by uuid references public.profiles (id) on delete set null,
  responded_by uuid references public.profiles (id) on delete set null,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, society_id)
);
create index event_collaborations_society_idx on public.event_collaborations (society_id, status);
create trigger event_collaborations_updated_at before update on public.event_collaborations
  for each row execute function private.set_updated_at();

-- Owner-society permission OR an accepted collaboration that explicitly grants
-- the matching capability. Collaborating members must ALSO hold the
-- permission inside their own society (least privilege on both sides).
create or replace function private.event_permission(p_event uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event and private.has_society_permission(e.society_id, p_permission)
  )
  or exists (
    select 1 from public.event_collaborations c
    where c.event_id = p_event
      and c.status = 'accepted'
      and private.has_society_permission(c.society_id, p_permission)
      and case p_permission
        when 'view_society' then true
        when 'edit_events' then c.can_edit_details
        when 'manage_volunteers' then c.can_manage_volunteers
        when 'view_volunteer_applicants' then c.can_manage_volunteers
        when 'view_registrations' then c.can_view_registrations
        when 'export_data' then c.can_view_registrations
        when 'check_in' then c.can_check_in
        when 'view_analytics' then c.can_view_analytics
        else false
      end
  );
$$;

create or replace function private.event_is_public(p_event uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.events e
    join public.societies s on s.id = e.society_id
    where e.id = p_event
      and e.status = 'published'
      and (e.publish_at is null or e.publish_at <= now())
      and s.status = 'active'
  );
$$;

-- -----------------------------------------------------------------------------
-- Versioned forms (event registration + volunteer applications)
-- A form version is immutable once anything has been submitted against it;
-- editing then creates a new version so earlier answers keep their meaning.
-- -----------------------------------------------------------------------------
create table public.form_versions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events (id) on delete cascade,
  volunteer_role_id uuid,
  version int not null check (version >= 1),
  fields jsonb not null default '[]'::jsonb check (jsonb_typeof(fields) = 'array'),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint form_versions_one_owner check ((event_id is null) <> (volunteer_role_id is null))
);
create unique index form_versions_event_unique on public.form_versions (event_id, version) where event_id is not null;
create unique index form_versions_role_unique on public.form_versions (volunteer_role_id, version) where volunteer_role_id is not null;

create or replace function private.validate_form_fields(p_fields jsonb)
returns void
language plpgsql
immutable
set search_path = ''
as $$
declare
  f jsonb;
  v_ids text[] := array[]::text[];
  v_type text;
  v_opt jsonb;
begin
  if jsonb_typeof(p_fields) <> 'array' then
    raise exception 'Form fields must be a list.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_fields) > 40 then
    raise exception 'Forms can have at most 40 questions.' using errcode = '22023';
  end if;
  for f in select value from jsonb_array_elements(p_fields) loop
    if coalesce(f ->> 'id', '') !~ '^[a-z0-9_]{1,40}$' then
      raise exception 'Invalid question identifier.' using errcode = '22023';
    end if;
    if (f ->> 'id') = any (v_ids) then
      raise exception 'Duplicate question identifier: %', f ->> 'id' using errcode = '22023';
    end if;
    v_ids := v_ids || (f ->> 'id');
    v_type := f ->> 'type';
    if v_type is null or v_type not in ('short_text', 'long_text', 'single_choice', 'multiple_choice', 'dropdown', 'email', 'number', 'url', 'statement', 'consent') then
      raise exception 'Unsupported question type.' using errcode = '22023';
    end if;
    if char_length(coalesce(f ->> 'label', '')) not between 1 and 500 then
      raise exception 'Every question needs a label (max 500 characters).' using errcode = '22023';
    end if;
    if v_type in ('single_choice', 'multiple_choice', 'dropdown') then
      if jsonb_typeof(f -> 'options') <> 'array' or jsonb_array_length(f -> 'options') not between 1 and 30 then
        raise exception 'Choice questions need between 1 and 30 options.' using errcode = '22023';
      end if;
      for v_opt in select value from jsonb_array_elements(f -> 'options') loop
        if jsonb_typeof(v_opt) <> 'string' or char_length(v_opt #>> '{}') not between 1 and 200 then
          raise exception 'Choice options must be text up to 200 characters.' using errcode = '22023';
        end if;
      end loop;
    end if;
  end loop;
end;
$$;

-- Validates answers against a stored form schema and returns only the known,
-- cleaned answers. Called from every submission function so direct API calls
-- cannot bypass validation.
create or replace function private.validate_form_answers(p_fields jsonb, p_answers jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  f jsonb;
  v_id text;
  v_type text;
  v_required boolean;
  v_label text;
  v_val jsonb;
  v_text text;
  v_clean jsonb := '{}'::jsonb;
  v_item jsonb;
  v_num numeric;
begin
  p_answers := coalesce(p_answers, '{}'::jsonb);
  if jsonb_typeof(p_answers) <> 'object' then
    raise exception 'Answers must be an object.' using errcode = '22023';
  end if;

  for f in select value from jsonb_array_elements(coalesce(p_fields, '[]'::jsonb)) loop
    v_id := f ->> 'id';
    v_type := f ->> 'type';
    v_label := f ->> 'label';
    v_required := coalesce((f ->> 'required')::boolean, false);

    if v_type = 'statement' then
      continue;
    end if;

    v_val := p_answers -> v_id;

    if v_val is null
       or jsonb_typeof(v_val) = 'null'
       or (jsonb_typeof(v_val) = 'string' and btrim(v_val #>> '{}') = '')
       or (jsonb_typeof(v_val) = 'array' and jsonb_array_length(v_val) = 0)
       or (v_type = 'consent' and v_val <> 'true'::jsonb) then
      if v_required then
        raise exception 'Please answer the required question: %', v_label using errcode = '22023';
      end if;
      continue;
    end if;

    if v_type in ('short_text', 'long_text', 'email', 'url', 'single_choice', 'dropdown') then
      if jsonb_typeof(v_val) <> 'string' then
        raise exception 'Invalid answer for: %', v_label using errcode = '22023';
      end if;
      v_text := btrim(v_val #>> '{}');
    end if;

    case v_type
      when 'short_text' then
        if char_length(v_text) > 300 then
          raise exception 'Answer is too long for: %', v_label using errcode = '22023';
        end if;
      when 'long_text' then
        if char_length(v_text) > 5000 then
          raise exception 'Answer is too long for: %', v_label using errcode = '22023';
        end if;
      when 'email' then
        if char_length(v_text) > 200 or v_text !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
          raise exception 'Enter a valid email address for: %', v_label using errcode = '22023';
        end if;
      when 'url' then
        if char_length(v_text) > 500 or v_text !~* '^https?://[^\s]+$' then
          raise exception 'Enter a valid link (starting with https://) for: %', v_label using errcode = '22023';
        end if;
      when 'number' then
        if jsonb_typeof(v_val) <> 'number' then
          raise exception 'Enter a number for: %', v_label using errcode = '22023';
        end if;
        v_num := (v_val #>> '{}')::numeric;
        if (f ? 'min' and v_num < (f ->> 'min')::numeric) or (f ? 'max' and v_num > (f ->> 'max')::numeric) then
          raise exception 'Number is out of range for: %', v_label using errcode = '22023';
        end if;
      when 'single_choice', 'dropdown' then
        if not (f -> 'options') ? v_text then
          raise exception 'Choose one of the listed options for: %', v_label using errcode = '22023';
        end if;
      when 'multiple_choice' then
        if jsonb_typeof(v_val) <> 'array' then
          raise exception 'Invalid answer for: %', v_label using errcode = '22023';
        end if;
        for v_item in select value from jsonb_array_elements(v_val) loop
          if jsonb_typeof(v_item) <> 'string' or not (f -> 'options') ? (v_item #>> '{}') then
            raise exception 'Choose only listed options for: %', v_label using errcode = '22023';
          end if;
        end loop;
      when 'consent' then
        null;
      else
        raise exception 'Unsupported question type.' using errcode = '22023';
    end case;

    v_clean := v_clean || jsonb_build_object(
      v_id,
      case when v_type in ('short_text', 'long_text', 'email', 'url', 'single_choice', 'dropdown') then to_jsonb(v_text) else v_val end
    );
  end loop;

  return v_clean;
end;
$$;

-- -----------------------------------------------------------------------------
-- Registrations, tickets and attendance
-- -----------------------------------------------------------------------------
create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.registration_status not null,
  reference_code text not null unique,
  form_version_id uuid references public.form_versions (id) on delete restrict,
  answers jsonb not null default '{}'::jsonb,
  team_name text check (char_length(team_name) <= 120),
  team_members jsonb not null default '[]'::jsonb check (jsonb_typeof(team_members) = 'array' and jsonb_array_length(team_members) <= 20),
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  decision_note text check (char_length(decision_note) <= 1000),
  cancelled_at timestamptz,
  cancel_reason text check (char_length(cancel_reason) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- One active registration per student per event (re-registering after a
-- cancellation creates a new row).
create unique index registrations_active_unique on public.registrations (event_id, user_id) where status <> 'cancelled';
create index registrations_event_status_idx on public.registrations (event_id, status, created_at);
create index registrations_user_idx on public.registrations (user_id, created_at desc);
create trigger registrations_updated_at before update on public.registrations
  for each row execute function private.set_updated_at();

create table public.registration_history (
  id bigint generated always as identity primary key,
  registration_id uuid not null references public.registrations (id) on delete cascade,
  from_status public.registration_status,
  to_status public.registration_status not null,
  actor_id uuid references public.profiles (id) on delete set null,
  note text check (char_length(note) <= 1000),
  created_at timestamptz not null default now()
);
create index registration_history_reg_idx on public.registration_history (registration_id, created_at);

-- Keep per-event counters exact. All registration writes happen inside
-- SECURITY DEFINER functions that lock the event row first, so these
-- counters are race-free.
create or replace function private.registrations_maintain_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update public.events set
      confirmed_count = confirmed_count - (old.status = 'confirmed')::int,
      pending_count = pending_count - (old.status = 'pending')::int,
      waitlist_count = waitlist_count - (old.status = 'waitlisted')::int
    where id = old.event_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    update public.events set
      confirmed_count = confirmed_count + (new.status = 'confirmed')::int,
      pending_count = pending_count + (new.status = 'pending')::int,
      waitlist_count = waitlist_count + (new.status = 'waitlisted')::int
    where id = new.event_id;
  end if;
  if tg_op = 'INSERT' or (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    insert into public.registration_history (registration_id, from_status, to_status, actor_id, note)
    values (new.id, case when tg_op = 'UPDATE' then old.status end, new.status, (select auth.uid()), new.decision_note);
  end if;
  return coalesce(new, old);
end;
$$;

create trigger registrations_counts
  after insert or update of status or delete on public.registrations
  for each row execute function private.registrations_maintain_counts();

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references public.registrations (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  code text not null unique check (char_length(code) >= 20),
  issued_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index tickets_event_idx on public.tickets (event_id);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  registration_id uuid not null unique references public.registrations (id) on delete cascade,
  ticket_id uuid references public.tickets (id) on delete set null,
  method text not null check (method in ('qr', 'code', 'manual')),
  checked_in_by uuid references public.profiles (id) on delete set null,
  checked_in_at timestamptz not null default now()
);
create index attendance_event_idx on public.attendance_records (event_id, checked_in_at);

-- -----------------------------------------------------------------------------
-- Saved events
-- -----------------------------------------------------------------------------
create table public.saved_events (
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);
create index saved_events_event_idx on public.saved_events (event_id);

-- -----------------------------------------------------------------------------
-- Page views. We count at most one view per anonymous visitor per event per
-- day. The visitor key is a random first-party cookie hashed with the date on
-- the server, so it cannot be linked across days or to an account.
-- -----------------------------------------------------------------------------
create table public.event_daily_visitors (
  event_id uuid not null references public.events (id) on delete cascade,
  day date not null,
  visitor_hash text not null check (char_length(visitor_hash) between 16 and 128),
  primary key (event_id, day, visitor_hash)
);
create index event_daily_visitors_day_idx on public.event_daily_visitors (event_id, day);
