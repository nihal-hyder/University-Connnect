-- =============================================================================
-- 0018 REGISTRATION STARTS, SHIFT CAPACITY, EMAIL DELIVERY EVENTS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Registration starts: someone opened the registration form. Counted like
--    page views: one anonymous daily hash per visitor, no account link.
-- -----------------------------------------------------------------------------
create table public.event_registration_starts (
  event_id uuid not null references public.events (id) on delete cascade,
  day date not null,
  visitor_hash text not null check (char_length(visitor_hash) between 16 and 128),
  primary key (event_id, day, visitor_hash)
);
create index event_registration_starts_day_idx on public.event_registration_starts (event_id, day);
alter table public.event_registration_starts enable row level security;
revoke all on public.event_registration_starts from anon, authenticated;
-- No policies: only security-definer functions read or write it.

create or replace function public.record_registration_start(p_event uuid, p_visitor_hash text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_visitor_hash is null or char_length(p_visitor_hash) not between 16 and 128 then
    return;
  end if;
  if not private.event_is_public(p_event) then
    return;
  end if;
  insert into public.event_registration_starts (event_id, day, visitor_hash)
  values (p_event, (now() at time zone 'Asia/Karachi')::date, p_visitor_hash)
  on conflict do nothing;
end;
$$;
revoke execute on function public.record_registration_start(uuid, text) from public;
grant execute on function public.record_registration_start(uuid, text) to anon, authenticated;

-- Funnel numbers for one event (organisers with analytics access).
create or replace function public.event_funnel(p_event uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.event_permission(p_event, 'view_analytics') then
    raise exception 'You do not have access to analytics for this event.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'starts', (select count(*) from public.event_registration_starts where event_id = p_event),
    'daily_starts', coalesce((
      select jsonb_object_agg(day::text, c)
      from (select day, count(*) c from public.event_registration_starts where event_id = p_event group by day) t
    ), '{}'::jsonb)
  );
end;
$$;
revoke execute on function public.event_funnel(uuid) from public;
grant execute on function public.event_funnel(uuid) to authenticated;

create or replace function public.society_registration_starts(p_society uuid, p_from date, p_to date)
returns bigint
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_society_permission(p_society, 'view_analytics') then
    raise exception 'You do not have access to analytics for this society.' using errcode = '42501';
  end if;
  return (
    select count(*)
    from public.event_registration_starts s
    join public.events e on e.id = s.event_id
    where e.society_id = p_society and s.day between p_from and p_to
  );
end;
$$;
revoke execute on function public.society_registration_starts(uuid, date, date) from public;
grant execute on function public.society_registration_starts(uuid, date, date) to authenticated;

-- -----------------------------------------------------------------------------
-- 2. Shift capacity. NULL = no limit. Enforced under a row lock on the shift
--    so two coordinators cannot overfill it at the same time.
-- -----------------------------------------------------------------------------
alter table public.volunteer_shifts
  add column capacity int check (capacity is null or capacity between 1 and 1000);
grant insert (capacity), update (capacity) on public.volunteer_shifts to authenticated;

create or replace function private.shift_assignment_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.volunteer_shifts;
  a public.volunteer_applications;
  v_taken int;
begin
  select * into s from public.volunteer_shifts where id = new.shift_id for update;
  select * into a from public.volunteer_applications where id = new.application_id;
  if a.id is null or a.role_id <> s.role_id then
    raise exception 'This volunteer did not apply for the role this shift belongs to.' using errcode = '22023';
  end if;
  if a.status <> 'accepted' then
    raise exception 'Only volunteers who accepted an offer can be assigned to shifts.' using errcode = '22023';
  end if;
  if s.capacity is not null then
    select count(*) into v_taken from public.volunteer_shift_assignments where shift_id = s.id;
    if v_taken >= s.capacity then
      raise exception 'This shift is full (% of % places taken). Raise its capacity or choose another shift.', v_taken, s.capacity
        using errcode = 'P0001';
    end if;
  end if;
  new.assigned_by := (select auth.uid());
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. Email delivery events from the provider's webhook (service role only).
-- -----------------------------------------------------------------------------
alter table public.email_outbox
  add column delivered_at timestamptz,
  add column bounced_at timestamptz,
  add column complained_at timestamptz;
create index email_outbox_provider_idx on public.email_outbox (provider_message_id) where provider_message_id is not null;

create or replace function public.job_record_email_event(p_provider_id text, p_event text, p_at timestamptz default now())
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.email_outbox;
begin
  select * into o from public.email_outbox where provider_message_id = p_provider_id for update;
  if o.id is null then
    return false;
  end if;
  case p_event
    when 'delivered' then
      -- Never downgrade a bounce/complaint that arrived first.
      update public.email_outbox set delivered_at = coalesce(delivered_at, p_at),
        status = case when status in ('sent', 'delivered') then 'delivered'::public.email_status else status end
      where id = o.id;
    when 'bounced' then
      update public.email_outbox set bounced_at = coalesce(bounced_at, p_at), status = 'bounced' where id = o.id;
    when 'complained' then
      update public.email_outbox set complained_at = coalesce(complained_at, p_at), status = 'complained' where id = o.id;
      -- A spam complaint switches off everything optional for that person.
      if o.user_id is not null then
        update public.user_preferences
           set email_reminders = false, email_recommendations = false, email_society_updates = false
         where user_id = o.user_id;
      end if;
    else
      return false;
  end case;
  return true;
end;
$$;
revoke execute on function public.job_record_email_event(text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.job_record_email_event(text, text, timestamptz) to service_role;

-- Admin metrics gain delivery outcomes.
create or replace function public.admin_platform_metrics()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_platform_admin() then
    raise exception 'Only platform administrators can view platform metrics.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'users_last_30_days', (select count(*) from public.profiles where created_at > now() - interval '30 days'),
    'active_societies', (select count(*) from public.societies where status = 'active'),
    'suspended_societies', (select count(*) from public.societies where status = 'suspended'),
    'pending_society_applications', (select count(*) from public.society_applications where status in ('submitted', 'under_review')),
    'events_pending_review', (select count(*) from public.events where status = 'pending_review'),
    'published_upcoming_events', (select count(*) from public.events where status = 'published' and ends_at > now()),
    'registrations_last_30_days', (select count(*) from public.registrations where created_at > now() - interval '30 days'),
    'volunteer_applications_last_30_days', (select count(*) from public.volunteer_applications where created_at > now() - interval '30 days'),
    'open_reports', (select count(*) from public.reports where status in ('open', 'reviewing')),
    'email_queued', (select count(*) from public.email_outbox where status in ('queued', 'sending')),
    'email_failed_last_7_days', (select count(*) from public.email_outbox where status = 'failed' and updated_at > now() - interval '7 days'),
    'email_sent_last_7_days', (select count(*) from public.email_outbox where status in ('sent', 'delivered', 'bounced', 'complained') and sent_at > now() - interval '7 days'),
    'email_delivered_last_7_days', (select count(*) from public.email_outbox where status = 'delivered' and sent_at > now() - interval '7 days'),
    'email_bounced_last_7_days', (select count(*) from public.email_outbox where status in ('bounced', 'complained') and sent_at > now() - interval '7 days'),
    'email_logged_dev_last_7_days', (select count(*) from public.email_outbox where status = 'logged_dev' and updated_at > now() - interval '7 days'),
    'last_job_run', (select jsonb_build_object('job', job, 'started_at', started_at, 'finished_at', finished_at, 'ok', ok, 'summary', summary)
                     from public.job_runs order by started_at desc limit 1)
  );
end;
$$;
