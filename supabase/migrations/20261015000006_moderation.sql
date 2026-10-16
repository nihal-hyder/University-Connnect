-- =============================================================================
-- 0006 MODERATION
-- User reports and the record of administrator decisions.
-- =============================================================================

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  target_type public.report_target not null,
  event_id uuid references public.events (id) on delete cascade,
  society_id uuid references public.societies (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,
  reason public.report_reason not null,
  details text check (char_length(details) <= 2000),
  status public.report_status not null default 'open',
  resolution_note text check (char_length(resolution_note) <= 2000),
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint reports_single_target check (
    (target_type = 'event' and event_id is not null and society_id is null and profile_id is null) or
    (target_type = 'society' and society_id is not null and event_id is null and profile_id is null) or
    (target_type = 'profile' and profile_id is not null and event_id is null and society_id is null)
  )
);
create index reports_status_idx on public.reports (status, created_at);
-- A user can hold only one open report per target.
create unique index reports_open_unique on public.reports (reporter_id, target_type, coalesce(event_id, society_id, profile_id)) where status in ('open', 'reviewing');

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles (id) on delete set null,
  target_type text not null check (target_type in ('society_application', 'society', 'event', 'report', 'directory')),
  target_id uuid,
  action text not null check (char_length(action) <= 60),
  note text check (char_length(note) <= 2000),
  created_at timestamptz not null default now()
);
create index moderation_actions_target_idx on public.moderation_actions (target_type, target_id, created_at desc);

create or replace function private.log_moderation(p_target_type text, p_target uuid, p_action text, p_note text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.moderation_actions (admin_id, target_type, target_id, action, note)
  values ((select auth.uid()), p_target_type, p_target, p_action, p_note);
$$;
