-- =============================================================================
-- 0010 API: REPORTS, NOTIFICATIONS, ANALYTICS, SCHEDULED JOBS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Reports & moderation
-- -----------------------------------------------------------------------------
create or replace function public.submit_report(
  p_target public.report_target,
  p_target_id uuid,
  p_reason public.report_reason,
  p_details text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_id uuid;
begin
  perform private.enforce_rate_limit('report:' || v_uid, 10, 3600);
  if p_target = 'event' and not private.event_is_public(p_target_id) then
    raise exception 'Event not found.' using errcode = 'P0002';
  elsif p_target = 'society' and not exists (select 1 from public.societies where id = p_target_id and status = 'active') then
    raise exception 'Society not found.' using errcode = 'P0002';
  elsif p_target = 'profile' and not exists (select 1 from public.profiles where id = p_target_id) then
    raise exception 'Profile not found.' using errcode = 'P0002';
  end if;
  if p_target_id = v_uid then
    raise exception 'You cannot report yourself.' using errcode = '22023';
  end if;

  insert into public.reports (reporter_id, target_type, event_id, society_id, profile_id, reason, details)
  values (
    v_uid, p_target,
    case when p_target = 'event' then p_target_id end,
    case when p_target = 'society' then p_target_id end,
    case when p_target = 'profile' then p_target_id end,
    p_reason, left(nullif(btrim(p_details), ''), 2000)
  )
  on conflict do nothing
  returning id into v_id;

  if v_id is null then
    raise exception 'You have already reported this. Our team is looking into it.' using errcode = 'P0001';
  end if;
  perform private.notify_admins('admin.report', 'New report: ' || replace(p_reason::text, '_', ' '),
    'A ' || p_target || ' was reported.', '/admin/reports', 'report:' || v_id);
  return v_id;
end;
$$;

create or replace function public.admin_update_report(p_report uuid, p_status public.report_status, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  rep public.reports;
begin
  if not private.is_platform_admin() then
    raise exception 'Only platform administrators can manage reports.' using errcode = '42501';
  end if;
  select * into rep from public.reports where id = p_report for update;
  if rep.id is null then
    raise exception 'Report not found.' using errcode = 'P0002';
  end if;
  if p_status in ('resolved', 'dismissed') and char_length(coalesce(btrim(p_note), '')) < 5 then
    raise exception 'Please add a resolution note.' using errcode = '22023';
  end if;
  update public.reports set
    status = p_status,
    resolution_note = coalesce(nullif(btrim(p_note), ''), resolution_note),
    resolved_by = case when p_status in ('resolved', 'dismissed') then v_uid end,
    resolved_at = case when p_status in ('resolved', 'dismissed') then now() end
  where id = rep.id;
  perform private.log_moderation('report', rep.id, 'status:' || p_status, p_note);
  if p_status in ('resolved', 'dismissed') and rep.reporter_id is not null then
    perform private.notify(rep.reporter_id, 'report.closed', 'Your report has been reviewed',
      'Thank you for helping keep the platform safe. Our team has reviewed your report.',
      null, 'report_closed:' || rep.id);
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Notifications
-- -----------------------------------------------------------------------------
create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications
     set read_at = now()
   where user_id = (select auth.uid())
     and read_at is null
     and (p_ids is null or id = any (p_ids));
$$;

-- -----------------------------------------------------------------------------
-- Analytics
-- Metric definitions (shown in the UI as well):
--   unique_visitors   distinct anonymous visitors per event per day, summed
--   registrations     registrations created in range (any status)
--   confirmed         registrations currently confirmed
--   cancellations     registrations currently cancelled
--   attendance        confirmed registrations checked in at the event
--   volunteer_*       volunteer applications and their outcomes
-- Only aggregates are returned; no individual records.
-- -----------------------------------------------------------------------------
create or replace function public.society_analytics(p_society uuid, p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_from timestamptz := (p_from::timestamp at time zone 'Asia/Karachi');
  v_to timestamptz := ((p_to + 1)::timestamp at time zone 'Asia/Karachi');
  v_events uuid[];
  v_result jsonb;
begin
  if not private.has_society_permission(p_society, 'view_analytics') then
    raise exception 'You do not have access to analytics for this society.' using errcode = '42501';
  end if;
  if p_to < p_from or p_to - p_from > 400 then
    raise exception 'Choose a date range of up to 400 days.' using errcode = '22023';
  end if;

  select coalesce(array_agg(id), '{}') into v_events from public.events where society_id = p_society;

  select jsonb_build_object(
    'published_events', (select count(*) from public.events where society_id = p_society and status = 'published'
                          and published_at >= v_from and published_at < v_to),
    'unique_visitors', (select count(*) from public.event_daily_visitors where event_id = any (v_events)
                          and day between p_from and p_to),
    'registrations', (select count(*) from public.registrations where event_id = any (v_events)
                          and created_at >= v_from and created_at < v_to),
    'confirmed', (select count(*) from public.registrations where event_id = any (v_events)
                          and created_at >= v_from and created_at < v_to and status = 'confirmed'),
    'cancellations', (select count(*) from public.registrations where event_id = any (v_events)
                          and created_at >= v_from and created_at < v_to and status = 'cancelled'),
    'attendance', (select count(*) from public.attendance_records where event_id = any (v_events)
                          and checked_in_at >= v_from and checked_in_at < v_to),
    'volunteer_applications', (select count(*) from public.volunteer_applications where event_id = any (v_events)
                          and created_at >= v_from and created_at < v_to),
    'offers_sent', (select count(*) from public.volunteer_status_history h
                          join public.volunteer_applications a on a.id = h.application_id
                          where a.event_id = any (v_events) and h.to_status = 'offered'
                          and h.created_at >= v_from and h.created_at < v_to),
    'offers_accepted', (select count(*) from public.volunteer_status_history h
                          join public.volunteer_applications a on a.id = h.application_id
                          where a.event_id = any (v_events) and h.to_status = 'accepted'
                          and h.created_at >= v_from and h.created_at < v_to),
    'shortlisted_or_better', (select count(*) from public.volunteer_applications where event_id = any (v_events)
                          and created_at >= v_from and created_at < v_to
                          and status in ('shortlisted', 'interview_requested', 'offered', 'accepted', 'completed')),
    'weekly', coalesce((
      select jsonb_agg(w order by w ->> 'week')
      from (
        select jsonb_build_object(
          'week', to_char(wk, 'YYYY-MM-DD'),
          'registrations', (select count(*) from public.registrations r where r.event_id = any (v_events)
                              and r.created_at >= wk and r.created_at < wk + interval '7 days'),
          'attendance', (select count(*) from public.attendance_records ar where ar.event_id = any (v_events)
                              and ar.checked_in_at >= wk and ar.checked_in_at < wk + interval '7 days'),
          'visitors', (select count(*) from public.event_daily_visitors v where v.event_id = any (v_events)
                              and v.day >= wk::date and v.day < (wk + interval '7 days')::date),
          'volunteer_applications', (select count(*) from public.volunteer_applications va where va.event_id = any (v_events)
                              and va.created_at >= wk and va.created_at < wk + interval '7 days')
        ) as w
        from generate_series(date_trunc('week', v_from), v_to, interval '7 days') as wk
      ) weeks
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(row_to_json(x) order by x.starts_at desc nulls last)
      from (
        select e.id, e.title, e.slug, e.status, e.schedule_status, e.starts_at, e.capacity,
               e.confirmed_count as confirmed, e.waitlist_count as waitlisted,
               (select count(*) from public.registrations r where r.event_id = e.id) as registrations,
               (select count(*) from public.registrations r where r.event_id = e.id and r.status = 'cancelled') as cancellations,
               (select count(*) from public.attendance_records ar where ar.event_id = e.id) as attendance,
               (select count(*) from public.event_daily_visitors v where v.event_id = e.id) as unique_visitors,
               (select count(*) from public.volunteer_applications va where va.event_id = e.id) as volunteer_applications
        from public.events e
        where e.society_id = p_society and e.status <> 'draft'
        order by e.starts_at desc nulls last
        limit 50
      ) x
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

create or replace function public.event_analytics(p_event uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  e public.events;
begin
  if not private.event_permission(p_event, 'view_analytics') then
    raise exception 'You do not have access to analytics for this event.' using errcode = '42501';
  end if;
  select * into e from public.events where id = p_event;
  return jsonb_build_object(
    'capacity', e.capacity,
    'confirmed', e.confirmed_count,
    'pending', e.pending_count,
    'waitlisted', e.waitlist_count,
    'registrations', (select count(*) from public.registrations where event_id = p_event),
    'cancellations', (select count(*) from public.registrations where event_id = p_event and status = 'cancelled'),
    'attendance', (select count(*) from public.attendance_records where event_id = p_event),
    'unique_visitors', (select count(*) from public.event_daily_visitors where event_id = p_event),
    'saves', (select count(*) from public.saved_events where event_id = p_event),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', d::date, 'visitors', coalesce(v.c, 0), 'registrations', coalesce(r.c, 0)) order by d)
      from generate_series(
        coalesce((select min(created_at) from public.registrations where event_id = p_event), e.published_at, e.created_at)::date,
        least(now(), coalesce(e.ends_at, now()))::date, interval '1 day') d
      left join (select day, count(*) c from public.event_daily_visitors where event_id = p_event group by day) v on v.day = d::date
      left join (select (created_at at time zone 'Asia/Karachi')::date as day, count(*) c from public.registrations where event_id = p_event group by 1) r on r.day = d::date
    ), '[]'::jsonb),
    'checkins_by_hour', coalesce((
      select jsonb_agg(jsonb_build_object('hour', h, 'count', c) order by h)
      from (select to_char(date_trunc('hour', checked_in_at at time zone e.timezone), 'YYYY-MM-DD HH24:00') h, count(*) c
            from public.attendance_records where event_id = p_event group by 1) t
    ), '[]'::jsonb),
    'volunteers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'role', r.title, 'positions', r.positions, 'accepted', r.accepted_count, 'applications', r.application_count) order by r.sort_order)
      from public.volunteer_roles r where r.event_id = p_event
    ), '[]'::jsonb)
  );
end;
$$;

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
    'email_sent_last_7_days', (select count(*) from public.email_outbox where status = 'sent' and updated_at > now() - interval '7 days'),
    'email_logged_dev_last_7_days', (select count(*) from public.email_outbox where status = 'logged_dev' and updated_at > now() - interval '7 days'),
    'last_job_run', (select jsonb_build_object('job', job, 'started_at', started_at, 'finished_at', finished_at, 'ok', ok, 'summary', summary)
                     from public.job_runs order by started_at desc limit 1)
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Scheduled jobs (service role only — see 0011 grants)
-- -----------------------------------------------------------------------------
create or replace function public.job_enqueue_reminders()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_event_reminders int := 0;
  v_deadline_reminders int := 0;
  v_shift_reminders int := 0;
  v_expired_invites int := 0;
  v_expired_offers int := 0;
begin
  -- 1. Event reminders ~24h before start, for confirmed participants.
  for r in
    select reg.id, reg.user_id, e.title, e.slug, e.starts_at
    from public.registrations reg
    join public.events e on e.id = reg.event_id
    where reg.status = 'confirmed'
      and e.status = 'published' and e.schedule_status = 'scheduled'
      and e.starts_at between now() and now() + interval '26 hours'
  loop
    perform private.notify(r.user_id, 'reminder.event', 'Tomorrow: ' || r.title,
      'A reminder that ' || r.title || ' starts soon. Your ticket is in your registrations.',
      '/dashboard/registrations', 'reminder:event24:' || r.id, 'reminder');
    v_event_reminders := v_event_reminders + 1;
  end loop;

  -- 2. Registration deadline reminders for saved (not yet registered) events.
  for r in
    select se.user_id, e.id as event_id, e.title, e.slug
    from public.saved_events se
    join public.events e on e.id = se.event_id
    where e.status = 'published' and e.schedule_status = 'scheduled'
      and e.registration_mode in ('individual', 'team')
      and e.registration_closes_at between now() and now() + interval '48 hours'
      and not exists (select 1 from public.registrations reg where reg.event_id = e.id and reg.user_id = se.user_id and reg.status <> 'cancelled')
  loop
    perform private.notify(r.user_id, 'reminder.deadline', 'Registration closing soon: ' || r.title,
      'You saved this event. Registration closes within 48 hours.',
      '/events/' || r.slug, 'reminder:deadline:' || r.event_id || ':' || r.user_id, 'reminder');
    v_deadline_reminders := v_deadline_reminders + 1;
  end loop;

  -- 3. Volunteer shift reminders ~24h ahead.
  for r in
    select a.user_id, s.id as shift_id, s.title, a.id as app_id
    from public.volunteer_shift_assignments sa
    join public.volunteer_shifts s on s.id = sa.shift_id
    join public.volunteer_applications a on a.id = sa.application_id
    where a.status = 'accepted' and s.starts_at between now() and now() + interval '26 hours'
  loop
    perform private.notify(r.user_id, 'reminder.shift', 'Upcoming volunteer shift: ' || r.title,
      'Your volunteer shift starts within the next day. Check the instructions in your applications.',
      '/dashboard/applications', 'reminder:shift:' || r.shift_id || ':' || r.app_id, 'reminder');
    v_shift_reminders := v_shift_reminders + 1;
  end loop;

  -- 4. Expire stale invitations and offers.
  with x as (
    update public.society_invitations set status = 'expired'
    where status = 'pending' and expires_at < now() returning 1
  ) select count(*) into v_expired_invites from x;

  for r in
    select id, user_id, status from public.volunteer_applications
    where status = 'offered' and offer_expires_at is not null and offer_expires_at < now()
    for update skip locked
  loop
    update public.volunteer_applications set status = 'declined', responded_at = now(),
      last_status_message = 'Offer expired without a response.' where id = r.id;
    insert into public.volunteer_status_history (application_id, from_status, to_status, message)
    values (r.id, 'offered', 'declined', 'Offer expired without a response.');
    perform private.notify(r.user_id, 'volunteer.offer_expired', 'A volunteer offer expired',
      'The offer expired before it was accepted.', '/dashboard/applications', 'offer_expired:' || r.id, 'transactional');
    v_expired_offers := v_expired_offers + 1;
  end loop;

  return jsonb_build_object(
    'event_reminders_checked', v_event_reminders,
    'deadline_reminders_checked', v_deadline_reminders,
    'shift_reminders_checked', v_shift_reminders,
    'invitations_expired', v_expired_invites,
    'offers_expired', v_expired_offers
  );
end;
$$;

create or replace function public.job_claim_emails(p_limit int default 20)
returns table (
  id uuid, to_email text, subject text, template text, payload jsonb, category public.email_category, attempts int
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with due as (
    select o.id from public.email_outbox o
    where (o.status = 'queued' and o.next_attempt_at <= now())
       or (o.status = 'sending' and o.locked_at < now() - interval '10 minutes')
    order by o.next_attempt_at
    limit least(greatest(p_limit, 1), 100)
    for update skip locked
  )
  update public.email_outbox o set status = 'sending', locked_at = now(), attempts = o.attempts + 1
  from due
  where o.id = due.id
  returning o.id,
    coalesce(o.payload ->> 'to', (select p.contact_email::text from public.profiles p where p.id = o.user_id)),
    o.subject, o.template, o.payload, o.category, o.attempts;
end;
$$;

create or replace function public.job_complete_email(
  p_id uuid,
  p_status public.email_status,
  p_provider_id text default null,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.email_outbox;
begin
  select * into o from public.email_outbox where id = p_id for update;
  if o.id is null then
    return;
  end if;
  if p_status = 'failed' and o.attempts < o.max_attempts then
    -- Exponential back-off: 2, 4, 8, 16 minutes.
    update public.email_outbox set status = 'queued', locked_at = null, last_error = left(p_error, 1000),
      next_attempt_at = now() + make_interval(mins => power(2, o.attempts)::int)
    where id = p_id;
  else
    update public.email_outbox set status = p_status, locked_at = null,
      provider_message_id = coalesce(p_provider_id, provider_message_id),
      last_error = left(p_error, 1000),
      sent_at = case when p_status in ('sent', 'logged_dev') then now() else sent_at end
    where id = p_id;
  end if;
end;
$$;
