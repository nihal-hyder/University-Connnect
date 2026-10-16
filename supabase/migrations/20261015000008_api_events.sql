-- =============================================================================
-- 0008 API: EVENTS, FORMS, REGISTRATIONS, TICKETS, CHECK-IN
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Forms
-- -----------------------------------------------------------------------------
create or replace function public.save_form(p_event uuid, p_role uuid, p_fields jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_latest public.form_versions;
  v_has_submissions boolean;
  v_id uuid;
begin
  if (p_event is null) = (p_role is null) then
    raise exception 'Specify either an event or a volunteer role.' using errcode = '22023';
  end if;
  if p_event is not null and not private.event_permission(p_event, 'edit_events') then
    raise exception 'You do not have permission to edit this form.' using errcode = '42501';
  end if;
  if p_role is not null and not private.can_manage_role(p_role) then
    raise exception 'You do not have permission to edit this form.' using errcode = '42501';
  end if;

  perform private.validate_form_fields(p_fields);

  select * into v_latest from public.form_versions
   where (p_event is not null and event_id = p_event) or (p_role is not null and volunteer_role_id = p_role)
   order by version desc limit 1
   for update;

  if v_latest.id is not null and v_latest.fields = p_fields then
    return v_latest.id;
  end if;

  if v_latest.id is not null then
    v_has_submissions := exists (select 1 from public.registrations where form_version_id = v_latest.id)
                      or exists (select 1 from public.volunteer_applications where form_version_id = v_latest.id);
    if not v_has_submissions then
      update public.form_versions set fields = p_fields where id = v_latest.id;
      return v_latest.id;
    end if;
  end if;

  -- Submissions exist against the current version: keep it intact and create
  -- a new version so earlier answers keep their original questions.
  insert into public.form_versions (event_id, volunteer_role_id, version, fields, created_by)
  values (p_event, p_role, coalesce(v_latest.version, 0) + 1, p_fields, v_uid)
  returning id into v_id;
  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Publishing workflow
-- -----------------------------------------------------------------------------
create or replace function private.assert_event_publishable(e public.events)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if char_length(coalesce(e.description, '')) < 50 then
    raise exception 'Add a description of at least 50 characters before publishing.' using errcode = '22023';
  end if;
  if e.category_id is null then
    raise exception 'Choose a category before publishing.' using errcode = '22023';
  end if;
  if e.starts_at is null or e.ends_at is null then
    raise exception 'Set the start and end time before publishing.' using errcode = '22023';
  end if;
  if e.ends_at <= now() then
    raise exception 'This event has already ended.' using errcode = '22023';
  end if;
  if e.format in ('in_person', 'hybrid') and (coalesce(e.venue, '') = '' or e.city_id is null) then
    raise exception 'In-person events need a venue and city.' using errcode = '22023';
  end if;
  if e.registration_mode = 'external' and e.external_registration_url is null then
    raise exception 'Add the external registration link.' using errcode = '22023';
  end if;
  if e.registration_mode = 'team' and (e.team_min is null or e.team_max is null) then
    raise exception 'Set the minimum and maximum team size.' using errcode = '22023';
  end if;
  if e.registration_closes_at is not null and e.registration_closes_at > e.ends_at then
    raise exception 'Registration must close before the event ends.' using errcode = '22023';
  end if;
  if not e.is_free and coalesce(e.fee_description, '') = '' then
    raise exception 'Paid events must describe the fee.' using errcode = '22023';
  end if;
  if e.eligibility_scope = 'selected_universities' and not exists (
    select 1 from public.event_target_universities where event_id = e.id
  ) then
    raise exception 'Select at least one eligible university.' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.submit_event(p_event uuid)
returns public.event_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  e public.events;
  s public.societies;
  v_status public.event_status;
begin
  select * into e from public.events where id = p_event for update;
  if e.id is null or not private.has_society_permission(e.society_id, 'publish_events') then
    raise exception 'You do not have permission to publish this event.' using errcode = '42501';
  end if;
  if e.status not in ('draft', 'changes_requested', 'rejected') then
    raise exception 'This event has already been submitted or published.' using errcode = 'P0001';
  end if;
  perform private.assert_event_publishable(e);
  select * into s from public.societies where id = e.society_id;

  v_status := case when s.events_require_review then 'pending_review'::public.event_status else 'published'::public.event_status end;
  update public.events set
    status = v_status,
    submitted_at = now(),
    published_at = case when v_status = 'published' then now() else published_at end,
    updated_by = v_uid
  where id = e.id;

  perform private.audit('event.' || v_status, 'event', e.id, e.society_id, e.id);
  if v_status = 'pending_review' then
    perform private.notify_admins('admin.event_review', 'Event awaiting review: ' || e.title,
      s.name || ' submitted an event for publication.', '/admin/events',
      'event_review:' || e.id || ':' || extract(epoch from now())::bigint);
  end if;
  return v_status;
end;
$$;

-- Return a draft (or changes-requested event) to editing. Published events
-- are edited in place.
create or replace function public.withdraw_event_submission(p_event uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.events;
begin
  perform private.require_user();
  select * into e from public.events where id = p_event for update;
  if e.id is null or not private.has_society_permission(e.society_id, 'publish_events') then
    raise exception 'Event not found.' using errcode = 'P0002';
  end if;
  if e.status <> 'pending_review' then
    raise exception 'Only events awaiting review can be withdrawn.' using errcode = 'P0001';
  end if;
  update public.events set status = 'draft' where id = e.id;
  perform private.audit('event.withdrawn', 'event', e.id, e.society_id, e.id);
end;
$$;

create or replace function public.admin_review_event(p_event uuid, p_decision public.event_status, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  e public.events;
  s public.societies;
begin
  if not private.is_platform_admin() then
    raise exception 'Only platform administrators can review events.' using errcode = '42501';
  end if;
  select * into e from public.events where id = p_event for update;
  if e.id is null then
    raise exception 'Event not found.' using errcode = 'P0002';
  end if;
  select * into s from public.societies where id = e.society_id;

  if p_decision = 'published' then
    if e.status <> 'pending_review' then
      raise exception 'Only events awaiting review can be approved.' using errcode = 'P0001';
    end if;
  elsif p_decision in ('changes_requested', 'rejected') then
    if e.status not in ('pending_review', 'published') then
      raise exception 'This event cannot be sent back in its current state.' using errcode = 'P0001';
    end if;
    if char_length(coalesce(btrim(p_note), '')) < 10 then
      raise exception 'Please explain the decision (at least 10 characters).' using errcode = '22023';
    end if;
  else
    raise exception 'Unsupported decision.' using errcode = '22023';
  end if;

  update public.events set
    status = p_decision,
    review_note = nullif(btrim(p_note), ''),
    reviewed_by = v_uid,
    published_at = case when p_decision = 'published' then now() else published_at end
  where id = e.id;

  perform private.log_moderation('event', e.id, p_decision::text, p_note);
  perform private.audit('event.review.' || p_decision, 'event', e.id, e.society_id, e.id, jsonb_build_object('note', p_note));
  perform private.notify_society(e.society_id, 'publish_events', 'event.review',
    case p_decision
      when 'published' then e.title || ' is now live'
      when 'changes_requested' then 'Changes requested for ' || e.title
      else e.title || ' was not approved'
    end,
    coalesce(p_note, 'Your event has been approved and is visible to students.'),
    '/manage/' || s.slug || '/events/' || e.id,
    'event_review_result:' || e.id || ':' || p_decision || ':' || extract(epoch from now())::bigint,
    'transactional');
end;
$$;

-- Postpone, cancel or restore an event. Participants are notified.
create or replace function public.set_event_schedule_status(
  p_event uuid,
  p_status public.event_schedule_status,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.events;
  r record;
  v_title text;
  v_stamp text := extract(epoch from now())::bigint::text;
begin
  perform private.require_user();
  select * into e from public.events where id = p_event for update;
  if e.id is null or not private.has_society_permission(e.society_id, 'cancel_events') then
    raise exception 'You do not have permission to change this event.' using errcode = '42501';
  end if;
  if e.schedule_status = 'cancelled' then
    raise exception 'Cancelled events cannot be reopened. Create a new event instead.' using errcode = 'P0001';
  end if;
  if e.schedule_status = p_status then
    return;
  end if;
  if p_status in ('cancelled', 'postponed') and char_length(coalesce(btrim(p_note), '')) < 10 then
    raise exception 'Please tell participants why (at least 10 characters).' using errcode = '22023';
  end if;

  update public.events set schedule_status = p_status, schedule_note = nullif(btrim(p_note), '') where id = e.id;

  -- Cancelling ends the commitment for everyone and closes volunteer roles.
  if p_status = 'cancelled' then
    update public.volunteer_roles set status = 'closed' where event_id = e.id;
    update public.events set volunteer_recruitment_open = false where id = e.id;
  end if;

  v_title := case p_status
    when 'cancelled' then e.title || ' has been cancelled'
    when 'postponed' then e.title || ' has been postponed'
    else e.title || ' is back on schedule'
  end;

  if e.status = 'published' then
    for r in
      select user_id from public.registrations where event_id = e.id and status in ('confirmed', 'pending', 'waitlisted')
      union
      select user_id from public.volunteer_applications where event_id = e.id and status not in ('withdrawn', 'rejected', 'declined')
    loop
      perform private.notify(r.user_id, 'event.schedule_status', v_title, p_note, '/events/' || e.slug,
        'schedule_status:' || e.id || ':' || p_status || ':' || v_stamp || ':' || r.user_id, 'transactional');
    end loop;
  end if;

  perform private.audit('event.schedule.' || p_status, 'event', e.id, e.society_id, e.id, jsonb_build_object('note', p_note));
end;
$$;

-- Notify participants when the time or place of a published event changes.
create or replace function private.events_notify_logistics_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_stamp text := extract(epoch from now())::bigint::text;
begin
  if new.status <> 'published' then
    return new;
  end if;
  if new.starts_at is distinct from old.starts_at
     or new.ends_at is distinct from old.ends_at
     or new.venue is distinct from old.venue
     or new.format is distinct from old.format
     or new.campus_id is distinct from old.campus_id then
    for r in
      select user_id from public.registrations where event_id = new.id and status in ('confirmed', 'pending', 'waitlisted')
      union
      select user_id from public.volunteer_applications where event_id = new.id and status in ('accepted', 'offered')
    loop
      perform private.notify(r.user_id, 'event.updated', 'Schedule or venue updated: ' || new.title,
        'The organisers changed the time or location. Please check the event page for the latest details.',
        '/events/' || new.slug, 'logistics:' || new.id || ':' || v_stamp || ':' || r.user_id, 'transactional');
    end loop;
    perform private.audit('event.logistics_changed', 'event', new.id, new.society_id, new.id,
      jsonb_build_object('starts_at', new.starts_at, 'ends_at', new.ends_at, 'venue', new.venue));
  end if;
  return new;
end;
$$;

create trigger events_logistics_change
  after update of starts_at, ends_at, venue, format, campus_id on public.events
  for each row execute function private.events_notify_logistics_change();

create or replace function public.duplicate_event(p_event uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  e public.events;
  v_new uuid;
  v_form public.form_versions;
  r public.volunteer_roles;
  v_role uuid;
begin
  select * into e from public.events where id = p_event;
  if e.id is null or not private.has_society_permission(e.society_id, 'create_events') then
    raise exception 'You do not have permission to duplicate this event.' using errcode = '42501';
  end if;

  insert into public.events (
    society_id, slug, title, summary, description, agenda, speakers, tags, category_id, event_type, cover_path,
    timezone, format, university_id, campus_id, city_id, venue, accessibility_info,
    eligibility_scope, eligible_levels, eligibility_notes, registration_mode, external_registration_url,
    requires_approval, capacity, waitlist_enabled, team_min, team_max, terms_text,
    is_free, fee_amount, fee_currency, fee_description, payment_instructions, payment_url, refund_policy,
    contact_email, contact_phone, created_by, updated_by
  ) values (
    e.society_id, left(e.slug, 100) || '-copy-' || lower(private.random_code(4)), left('Copy of ' || e.title, 140),
    e.summary, e.description, e.agenda, e.speakers, e.tags, e.category_id, e.event_type, e.cover_path,
    e.timezone, e.format, e.university_id, e.campus_id, e.city_id, e.venue, e.accessibility_info,
    e.eligibility_scope, e.eligible_levels, e.eligibility_notes, e.registration_mode, e.external_registration_url,
    e.requires_approval, e.capacity, e.waitlist_enabled, e.team_min, e.team_max, e.terms_text,
    e.is_free, e.fee_amount, e.fee_currency, e.fee_description, e.payment_instructions, e.payment_url, e.refund_policy,
    e.contact_email, e.contact_phone, v_uid, v_uid
  ) returning id into v_new;

  insert into public.event_target_universities (event_id, university_id)
  select v_new, university_id from public.event_target_universities where event_id = e.id;

  select * into v_form from public.form_versions where event_id = e.id order by version desc limit 1;
  if v_form.id is not null then
    insert into public.form_versions (event_id, version, fields, created_by) values (v_new, 1, v_form.fields, v_uid);
  end if;

  for r in select * from public.volunteer_roles where event_id = e.id order by sort_order loop
    insert into public.volunteer_roles (
      event_id, title, description, responsibilities, positions, skills, eligibility, experience_level,
      time_commitment, schedule_notes, is_paid, compensation_details, benefits, selection_process,
      requires_event_registration, sort_order, created_by
    ) values (
      v_new, r.title, r.description, r.responsibilities, r.positions, r.skills, r.eligibility, r.experience_level,
      r.time_commitment, r.schedule_notes, r.is_paid, r.compensation_details, r.benefits, r.selection_process,
      r.requires_event_registration, r.sort_order, v_uid
    ) returning id into v_role;
    insert into public.form_versions (volunteer_role_id, version, fields, created_by)
    select v_role, 1, fv.fields, v_uid from public.form_versions fv
     where fv.volunteer_role_id = r.id order by fv.version desc limit 1;
  end loop;

  perform private.audit('event.duplicated', 'event', v_new, e.society_id, v_new, jsonb_build_object('source', e.id));
  return v_new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Registrations
-- -----------------------------------------------------------------------------
create or replace function private.issue_ticket(p_registration uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event uuid;
begin
  select event_id into v_event from public.registrations where id = p_registration;
  insert into public.tickets (registration_id, event_id, code)
  values (p_registration, v_event, private.random_token())
  on conflict (registration_id) do update set revoked_at = null;
end;
$$;

create or replace function private.registration_message(p_status public.registration_status, p_title text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_status
    when 'confirmed' then 'Your place at ' || p_title || ' is confirmed. Your ticket is ready.'
    when 'pending' then 'Your registration for ' || p_title || ' was received and is awaiting the organiser''s approval.'
    when 'waitlisted' then 'The event is currently full. You are on the waitlist for ' || p_title || ' and will be notified if a place opens.'
    when 'rejected' then 'Your registration for ' || p_title || ' was not accepted.'
    when 'cancelled' then 'Your registration for ' || p_title || ' has been cancelled.'
  end;
$$;

-- Promote waitlisted registrations while seats are available. Caller must
-- already hold the event row lock.
create or replace function private.promote_waitlist(p_event uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.events;
  r public.registrations;
  v_new_status public.registration_status;
begin
  loop
    select * into e from public.events where id = p_event;
    exit when e.capacity is not null and e.confirmed_count >= e.capacity;
    exit when e.schedule_status = 'cancelled' or e.ends_at <= now();

    select * into r from public.registrations
     where event_id = p_event and status = 'waitlisted'
     order by created_at
     limit 1
     for update skip locked;
    exit when r.id is null;

    v_new_status := case when e.requires_approval then 'pending'::public.registration_status else 'confirmed'::public.registration_status end;
    update public.registrations set status = v_new_status, decision_note = 'Promoted from the waitlist' where id = r.id;
    if v_new_status = 'confirmed' then
      perform private.issue_ticket(r.id);
    end if;
    perform private.notify(r.user_id, 'registration.waitlist_promoted',
      case when v_new_status = 'confirmed' then 'A place opened up: you are in for ' || e.title
           else 'A place opened up for ' || e.title end,
      private.registration_message(v_new_status, e.title),
      '/dashboard/registrations', 'waitlist_promoted:' || r.id, 'transactional');
    -- Approval-required events: one promotion per freed seat is enough.
    exit when v_new_status = 'pending';
  end loop;
end;
$$;

create or replace function public.register_for_event(
  p_event uuid,
  p_answers jsonb default '{}'::jsonb,
  p_team_name text default null,
  p_team_members jsonb default '[]'::jsonb
)
returns table (registration_id uuid, registration_status public.registration_status, reference text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  e public.events;
  p public.profiles;
  v_form public.form_versions;
  v_answers jsonb;
  v_status public.registration_status;
  v_id uuid;
  v_ref text;
  v_member jsonb;
  v_team_size int;
begin
  perform private.enforce_rate_limit('register:' || v_uid, 10, 60);

  -- Lock the event row: all capacity decisions for this event are serialised.
  select * into e from public.events where id = p_event for update;
  if e.id is null or not private.event_is_public(e.id) then
    raise exception 'Event not found.' using errcode = 'P0002';
  end if;
  if e.schedule_status = 'cancelled' then
    raise exception 'This event has been cancelled.' using errcode = 'P0001';
  end if;
  if e.schedule_status = 'postponed' then
    raise exception 'Registration is paused while this event is postponed.' using errcode = 'P0001';
  end if;
  if e.registration_mode = 'none' then
    raise exception 'This event does not require registration.' using errcode = 'P0001';
  end if;
  if e.registration_mode = 'external' then
    raise exception 'Registration for this event is handled on the organiser''s website.' using errcode = 'P0001';
  end if;
  if e.registration_opens_at is not null and now() < e.registration_opens_at then
    raise exception 'Registration has not opened yet.' using errcode = 'P0001';
  end if;
  if now() > coalesce(e.registration_closes_at, e.starts_at, e.ends_at) or e.ends_at <= now() then
    raise exception 'Registration for this event has closed.' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.registrations r where r.event_id = e.id and r.user_id = v_uid and r.status <> 'cancelled') then
    raise exception 'You are already registered for this event.' using errcode = 'P0001';
  end if;

  -- Eligibility
  select * into p from public.profiles where id = v_uid;
  if e.eligibility_scope = 'host_university' then
    if p.university_id is null then
      raise exception 'Add your university to your profile to register for this event.' using errcode = 'P0001';
    end if;
    if p.university_id is distinct from e.university_id then
      raise exception 'This event is only open to students of the host university.' using errcode = 'P0001';
    end if;
  elsif e.eligibility_scope = 'selected_universities' then
    if p.university_id is null then
      raise exception 'Add your university to your profile to register for this event.' using errcode = 'P0001';
    end if;
    if not exists (select 1 from public.event_target_universities t where t.event_id = e.id and t.university_id = p.university_id) then
      raise exception 'This event is not open to students of your university.' using errcode = 'P0001';
    end if;
  end if;
  if cardinality(e.eligible_levels) > 0 then
    if p.academic_level is null then
      raise exception 'Add your academic level to your profile to register for this event.' using errcode = 'P0001';
    end if;
    if not (p.academic_level = any (e.eligible_levels)) then
      raise exception 'This event is not open to your academic level.' using errcode = 'P0001';
    end if;
  end if;

  -- Team validation
  if e.registration_mode = 'team' then
    if char_length(coalesce(btrim(p_team_name), '')) not between 2 and 120 then
      raise exception 'Enter a team name.' using errcode = '22023';
    end if;
    if jsonb_typeof(coalesce(p_team_members, '[]'::jsonb)) <> 'array' then
      raise exception 'Invalid team members.' using errcode = '22023';
    end if;
    v_team_size := jsonb_array_length(coalesce(p_team_members, '[]'::jsonb)) + 1;
    if v_team_size < coalesce(e.team_min, 1) or v_team_size > coalesce(e.team_max, 20) then
      raise exception 'Teams must have between % and % members (including you).', coalesce(e.team_min, 1), coalesce(e.team_max, 20) using errcode = '22023';
    end if;
    for v_member in select value from jsonb_array_elements(coalesce(p_team_members, '[]'::jsonb)) loop
      if char_length(coalesce(btrim(v_member ->> 'name'), '')) not between 2 and 120
         or coalesce(v_member ->> 'email', '') !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
        raise exception 'Every team member needs a name and a valid email.' using errcode = '22023';
      end if;
    end loop;
  else
    p_team_name := null;
    p_team_members := '[]'::jsonb;
  end if;

  -- Form answers are validated against the stored schema, server side.
  select * into v_form from public.form_versions where event_id = e.id order by version desc limit 1;
  v_answers := private.validate_form_answers(coalesce(v_form.fields, '[]'::jsonb), p_answers);

  -- Capacity
  if e.capacity is not null and e.confirmed_count >= e.capacity then
    if not e.waitlist_enabled then
      raise exception 'This event is full.' using errcode = 'P0001';
    end if;
    v_status := 'waitlisted';
  elsif e.requires_approval then
    v_status := 'pending';
  else
    v_status := 'confirmed';
  end if;

  loop
    v_ref := 'R-' || private.random_code(7);
    exit when not exists (select 1 from public.registrations where reference_code = v_ref);
  end loop;

  insert into public.registrations (event_id, user_id, status, reference_code, form_version_id, answers, team_name, team_members)
  values (e.id, v_uid, v_status, v_ref, v_form.id, v_answers, nullif(btrim(p_team_name), ''), coalesce(p_team_members, '[]'::jsonb))
  returning id into v_id;

  if v_status = 'confirmed' then
    perform private.issue_ticket(v_id);
  end if;

  perform private.notify(v_uid, 'registration.' || v_status,
    case v_status when 'confirmed' then 'Registration confirmed: ' || e.title
                  when 'pending' then 'Registration received: ' || e.title
                  else 'You are on the waitlist: ' || e.title end,
    private.registration_message(v_status, e.title) || ' Reference: ' || v_ref,
    '/dashboard/registrations', 'registration:' || v_id || ':' || v_status, 'transactional',
    'registration', jsonb_build_object('reference', v_ref, 'event_slug', e.slug));

  return query select v_id, v_status, v_ref;
end;
$$;

create or replace function public.cancel_registration(p_registration uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  r public.registrations;
  e public.events;
begin
  select * into r from public.registrations where id = p_registration;
  if r.id is null or r.user_id <> v_uid then
    raise exception 'Registration not found.' using errcode = 'P0002';
  end if;
  select * into e from public.events where id = r.event_id for update;
  select * into r from public.registrations where id = p_registration for update;
  if r.status not in ('pending', 'confirmed', 'waitlisted') then
    raise exception 'This registration cannot be cancelled.' using errcode = 'P0001';
  end if;
  if e.starts_at is not null and e.starts_at <= now() then
    raise exception 'The event has already started. Contact the organiser if you cannot attend.' using errcode = 'P0001';
  end if;

  update public.registrations
     set status = 'cancelled', cancelled_at = now(), cancel_reason = left(nullif(btrim(p_reason), ''), 500), decision_note = null
   where id = r.id;
  update public.tickets set revoked_at = now() where registration_id = r.id;

  perform private.notify(v_uid, 'registration.cancelled', 'Registration cancelled: ' || e.title,
    private.registration_message('cancelled', e.title), '/dashboard/registrations',
    'registration:' || r.id || ':cancelled', 'transactional');

  if r.status = 'confirmed' then
    perform private.promote_waitlist(e.id);
  end if;
end;
$$;

create or replace function public.organizer_set_registration_status(
  p_registration uuid,
  p_status public.registration_status,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.registrations;
  e public.events;
begin
  perform private.require_user();
  select * into r from public.registrations where id = p_registration;
  if r.id is null then
    raise exception 'Registration not found.' using errcode = 'P0002';
  end if;
  select * into e from public.events where id = r.event_id for update;
  if not private.has_society_permission(e.society_id, 'manage_registrations') then
    raise exception 'You do not have permission to manage registrations for this event.' using errcode = '42501';
  end if;
  select * into r from public.registrations where id = p_registration for update;

  if not (
    (r.status = 'pending' and p_status in ('confirmed', 'rejected', 'waitlisted')) or
    (r.status = 'waitlisted' and p_status in ('confirmed', 'rejected')) or
    (r.status = 'confirmed' and p_status = 'rejected')
  ) then
    raise exception 'Cannot change a % registration to %.', r.status, p_status using errcode = 'P0001';
  end if;

  if p_status = 'confirmed' and e.capacity is not null and e.confirmed_count >= e.capacity then
    raise exception 'The event is at capacity. Increase capacity or remove a confirmed participant first.' using errcode = 'P0001';
  end if;
  if p_status = 'rejected' and r.status = 'confirmed' and char_length(coalesce(btrim(p_note), '')) < 5 then
    raise exception 'Please give the participant a reason.' using errcode = '22023';
  end if;

  update public.registrations
     set status = p_status, decided_by = (select auth.uid()), decided_at = now(), decision_note = nullif(btrim(p_note), '')
   where id = r.id;

  if p_status = 'confirmed' then
    perform private.issue_ticket(r.id);
  elsif r.status = 'confirmed' then
    update public.tickets set revoked_at = now() where registration_id = r.id;
  end if;

  perform private.notify(r.user_id, 'registration.' || p_status,
    case p_status when 'confirmed' then 'Registration confirmed: ' || e.title
                  when 'waitlisted' then 'You are on the waitlist: ' || e.title
                  else 'Registration update: ' || e.title end,
    private.registration_message(p_status, e.title) || coalesce(' Note from the organiser: ' || nullif(btrim(p_note), ''), ''),
    '/dashboard/registrations', 'registration:' || r.id || ':' || p_status || ':' || extract(epoch from now())::bigint,
    'transactional');

  perform private.audit('registration.' || p_status, 'registration', r.id, e.society_id, e.id, jsonb_build_object('note', p_note));

  if r.status = 'confirmed' then
    perform private.promote_waitlist(e.id);
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Check-in
-- -----------------------------------------------------------------------------
create or replace function public.check_in_ticket(p_event uuid, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  t public.tickets;
  r public.registrations;
  v_name text;
  v_att public.attendance_records;
  v_code text := btrim(coalesce(p_code, ''));
begin
  if not private.event_permission(p_event, 'check_in') then
    raise exception 'You do not have permission to check in attendees for this event.' using errcode = '42501';
  end if;
  perform private.enforce_rate_limit('checkin:' || v_uid, 120, 60);

  -- Accept either the raw code or the full ticket URL from the QR.
  if v_code ~ '/t/' then
    v_code := regexp_replace(v_code, '^.*/t/', '');
  end if;

  select * into t from public.tickets where code = v_code;
  if t.id is null then
    return jsonb_build_object('result', 'invalid');
  end if;
  if t.event_id <> p_event then
    return jsonb_build_object('result', 'wrong_event');
  end if;
  select * into r from public.registrations where id = t.registration_id;
  select full_name into v_name from public.profiles where id = r.user_id;
  if t.revoked_at is not null or r.status <> 'confirmed' then
    return jsonb_build_object('result', 'not_eligible', 'name', v_name, 'reference', r.reference_code, 'status', r.status);
  end if;

  insert into public.attendance_records (event_id, registration_id, ticket_id, method, checked_in_by)
  values (p_event, r.id, t.id, 'qr', v_uid)
  on conflict (registration_id) do nothing
  returning * into v_att;

  if v_att.id is null then
    select * into v_att from public.attendance_records where registration_id = r.id;
    return jsonb_build_object('result', 'already_checked_in', 'name', v_name, 'reference', r.reference_code, 'checked_in_at', v_att.checked_in_at);
  end if;
  return jsonb_build_object('result', 'checked_in', 'name', v_name, 'reference', r.reference_code, 'checked_in_at', v_att.checked_in_at);
end;
$$;

create or replace function public.manual_check_in(p_registration uuid, p_undo boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  r public.registrations;
  v_att public.attendance_records;
begin
  select * into r from public.registrations where id = p_registration;
  if r.id is null or not private.event_permission(r.event_id, 'check_in') then
    raise exception 'Registration not found.' using errcode = 'P0002';
  end if;
  if p_undo then
    delete from public.attendance_records where registration_id = r.id;
    perform private.audit('attendance.undone', 'registration', r.id, null, r.event_id);
    return jsonb_build_object('result', 'undone');
  end if;
  if r.status <> 'confirmed' then
    return jsonb_build_object('result', 'not_eligible', 'status', r.status);
  end if;
  insert into public.attendance_records (event_id, registration_id, ticket_id, method, checked_in_by)
  values (r.event_id, r.id, (select id from public.tickets where registration_id = r.id), 'manual', v_uid)
  on conflict (registration_id) do nothing
  returning * into v_att;
  if v_att.id is null then
    return jsonb_build_object('result', 'already_checked_in');
  end if;
  return jsonb_build_object('result', 'checked_in', 'checked_in_at', v_att.checked_in_at);
end;
$$;

-- -----------------------------------------------------------------------------
-- Anonymous page-view counting (one per visitor per event per day)
-- -----------------------------------------------------------------------------
create or replace function public.record_event_view(p_event uuid, p_visitor_hash text)
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
  insert into public.event_daily_visitors (event_id, day, visitor_hash)
  values (p_event, (now() at time zone 'Asia/Karachi')::date, p_visitor_hash)
  on conflict do nothing;
end;
$$;
