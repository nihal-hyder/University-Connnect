-- =============================================================================
-- 0005 VOLUNTEER RECRUITMENT
-- Roles, applications (with an enforced state machine), private reviewer
-- notes, status history, shifts, assignments and certificates.
-- Offers live on the application row (offer_* columns) rather than a separate
-- table: an application has at most one live offer and its history is kept in
-- volunteer_status_history.
-- =============================================================================

create table public.volunteer_roles (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  -- A collaborating society may be assigned to run a role.
  assigned_society_id uuid references public.societies (id) on delete set null,
  title text not null check (char_length(title) between 2 and 120),
  description text check (char_length(description) <= 3000),
  responsibilities text check (char_length(responsibilities) <= 3000),
  positions int not null check (positions between 1 and 1000),
  skills text[] not null default '{}' check (cardinality(skills) <= 15),
  eligibility text check (char_length(eligibility) <= 1000),
  experience_level public.experience_level not null default 'none',
  time_commitment text check (char_length(time_commitment) <= 300),
  schedule_notes text check (char_length(schedule_notes) <= 1000),
  application_deadline timestamptz,
  -- Compensation must always be explicit. Default is unpaid.
  is_paid boolean not null default false,
  compensation_details text check (char_length(compensation_details) <= 500),
  benefits text check (char_length(benefits) <= 1000),
  selection_process text check (char_length(selection_process) <= 1000),
  requires_event_registration boolean not null default false,
  status public.volunteer_role_status not null default 'open',
  sort_order int not null default 0,
  accepted_count int not null default 0,
  application_count int not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint volunteer_roles_paid_details check (not is_paid or compensation_details is not null)
);
create index volunteer_roles_event_idx on public.volunteer_roles (event_id, sort_order);
create index volunteer_roles_deadline_idx on public.volunteer_roles (application_deadline) where status = 'open';
create trigger volunteer_roles_updated_at before update on public.volunteer_roles
  for each row execute function private.set_updated_at();

alter table public.form_versions
  add constraint form_versions_role_fk foreign key (volunteer_role_id) references public.volunteer_roles (id) on delete cascade;

create table public.volunteer_applications (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.volunteer_roles (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.volunteer_application_status not null default 'submitted',
  reference_code text not null unique,
  form_version_id uuid references public.form_versions (id) on delete restrict,
  answers jsonb not null default '{}'::jsonb,
  portfolio_url text check (portfolio_url is null or portfolio_url ~* '^https?://'),
  offer_message text check (char_length(offer_message) <= 2000),
  offered_at timestamptz,
  offer_expires_at timestamptz,
  responded_at timestamptz,
  completed_at timestamptz,
  last_status_message text check (char_length(last_status_message) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- One live application per student per role. Withdrawn applications do not
-- block re-applying.
create unique index volunteer_applications_active_unique on public.volunteer_applications (role_id, user_id) where status <> 'withdrawn';
create index volunteer_applications_role_status_idx on public.volunteer_applications (role_id, status, created_at);
create index volunteer_applications_event_idx on public.volunteer_applications (event_id, status);
create index volunteer_applications_user_idx on public.volunteer_applications (user_id, created_at desc);
create trigger volunteer_applications_updated_at before update on public.volunteer_applications
  for each row execute function private.set_updated_at();

create table public.volunteer_status_history (
  id bigint generated always as identity primary key,
  application_id uuid not null references public.volunteer_applications (id) on delete cascade,
  from_status public.volunteer_application_status,
  to_status public.volunteer_application_status not null,
  actor_id uuid references public.profiles (id) on delete set null,
  -- Message shown to the applicant (internal notes are separate).
  message text check (char_length(message) <= 2000),
  created_at timestamptz not null default now()
);
create index volunteer_status_history_app_idx on public.volunteer_status_history (application_id, created_at);

-- Private reviewer notes: never visible to the applicant.
create table public.volunteer_application_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.volunteer_applications (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index volunteer_application_notes_app_idx on public.volunteer_application_notes (application_id, created_at);

create or replace function private.volunteer_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update public.volunteer_roles set
      accepted_count = accepted_count - (old.status in ('accepted', 'completed'))::int,
      application_count = application_count - (old.status <> 'withdrawn')::int
    where id = old.role_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    update public.volunteer_roles set
      accepted_count = accepted_count + (new.status in ('accepted', 'completed'))::int,
      application_count = application_count + (new.status <> 'withdrawn')::int
    where id = new.role_id;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger volunteer_applications_counts
  after insert or update of status or delete on public.volunteer_applications
  for each row execute function private.volunteer_counts();

create table public.volunteer_shifts (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.volunteer_roles (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text check (char_length(location) <= 200),
  instructions text check (char_length(instructions) <= 2000),
  created_at timestamptz not null default now(),
  constraint volunteer_shifts_dates check (ends_at > starts_at)
);
create index volunteer_shifts_role_idx on public.volunteer_shifts (role_id, starts_at);

create table public.volunteer_shift_assignments (
  shift_id uuid not null references public.volunteer_shifts (id) on delete cascade,
  application_id uuid not null references public.volunteer_applications (id) on delete cascade,
  assigned_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (shift_id, application_id)
);
create index volunteer_shift_assignments_app_idx on public.volunteer_shift_assignments (application_id);

create table public.saved_opportunities (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_id uuid not null references public.volunteer_roles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

-- Certificates are issued explicitly by an authorised organiser; never
-- automatically. Snapshots of names are stored so a later profile change
-- does not alter an issued certificate.
create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  user_id uuid references public.profiles (id) on delete set null,
  event_id uuid not null references public.events (id) on delete restrict,
  society_id uuid not null references public.societies (id) on delete restrict,
  volunteer_application_id uuid unique references public.volunteer_applications (id) on delete set null,
  recipient_name text not null check (char_length(recipient_name) between 1 and 120),
  role_title text not null check (char_length(role_title) <= 120),
  event_title text not null,
  society_name text not null,
  event_date date,
  issued_by uuid references public.profiles (id) on delete set null,
  issuer_name text not null,
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_reason text check (char_length(revoked_reason) <= 500)
);
create index certificates_user_idx on public.certificates (user_id);
create index certificates_event_idx on public.certificates (event_id);

-- Owner society with manage_volunteers manages every role. A collaborating
-- society with can_manage_volunteers manages only the roles assigned to it.
create or replace function private.can_manage_role(p_role uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.volunteer_roles r
    join public.events e on e.id = r.event_id
    where r.id = p_role
      and (
        private.has_society_permission(e.society_id, 'manage_volunteers')
        or exists (
          select 1 from public.event_collaborations c
          where c.event_id = e.id
            and c.status = 'accepted'
            and c.can_manage_volunteers
            and c.society_id = r.assigned_society_id
            and private.has_society_permission(c.society_id, 'manage_volunteers')
        )
      )
  );
$$;
