-- =============================================================================
-- 0009 API: VOLUNTEERS, CERTIFICATES, COLLABORATION
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Applications
-- -----------------------------------------------------------------------------
create or replace function public.apply_for_volunteer_role(
  p_role uuid,
  p_answers jsonb default '{}'::jsonb,
  p_portfolio_url text default null
)
returns table (application_id uuid, reference text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  r public.volunteer_roles;
  e public.events;
  v_form public.form_versions;
  v_answers jsonb;
  v_id uuid;
  v_ref text;
begin
  perform private.enforce_rate_limit('volunteer_apply:' || v_uid, 10, 60);

  select * into r from public.volunteer_roles where id = p_role for update;
  if r.id is null or not private.event_is_public(r.event_id) then
    raise exception 'Volunteer role not found.' using errcode = 'P0002';
  end if;
  select * into e from public.events where id = r.event_id;

  if e.schedule_status = 'cancelled' then
    raise exception 'This event has been cancelled.' using errcode = 'P0001';
  end if;
  if not e.volunteer_recruitment_open or r.status <> 'open' then
    raise exception 'This role is not accepting applications.' using errcode = 'P0001';
  end if;
  if r.application_deadline is not null and r.application_deadline < now() then
    raise exception 'The application deadline has passed.' using errcode = 'P0001';
  end if;
  if e.ends_at is not null and e.ends_at <= now() then
    raise exception 'This event has already ended.' using errcode = 'P0001';
  end if;
  if r.requires_event_registration and not exists (
    select 1 from public.registrations reg where reg.event_id = e.id and reg.user_id = v_uid and reg.status in ('confirmed', 'pending')
  ) then
    raise exception 'The organisers ask volunteers for this role to register for the event first.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.volunteer_applications a where a.role_id = r.id and a.user_id = v_uid and a.status <> 'withdrawn') then
    raise exception 'You have already applied for this role.' using errcode = 'P0001';
  end if;
  if p_portfolio_url is not null and btrim(p_portfolio_url) <> '' and btrim(p_portfolio_url) !~* '^https?://[^\s]+$' then
    raise exception 'Portfolio link must start with https://' using errcode = '22023';
  end if;

  select * into v_form from public.form_versions where volunteer_role_id = r.id order by version desc limit 1;
  v_answers := private.validate_form_answers(coalesce(v_form.fields, '[]'::jsonb), p_answers);

  loop
    v_ref := 'V-' || private.random_code(7);
    exit when not exists (select 1 from public.volunteer_applications where reference_code = v_ref);
  end loop;

  insert into public.volunteer_applications (role_id, event_id, user_id, status, reference_code, form_version_id, answers, portfolio_url)
  values (r.id, e.id, v_uid, 'submitted', v_ref, v_form.id, v_answers, nullif(btrim(p_portfolio_url), ''))
  returning id into v_id;

  insert into public.volunteer_status_history (application_id, from_status, to_status, actor_id)
  values (v_id, null, 'submitted', v_uid);

  perform private.notify(v_uid, 'volunteer.submitted', 'Application received: ' || r.title,
    'Your application to volunteer as ' || r.title || ' at ' || e.title || ' was received. Reference: ' || v_ref,
    '/dashboard/applications', 'volunteer_app:' || v_id || ':submitted', 'transactional',
    'volunteer', jsonb_build_object('reference', v_ref));

  return query select v_id, v_ref;
end;
$$;

-- Allowed organiser transitions. Applicant-driven transitions (accept,
-- decline, withdraw) have their own functions.
create or replace function private.volunteer_transition_allowed(
  p_from public.volunteer_application_status,
  p_to public.volunteer_application_status
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_from
    when 'submitted' then p_to in ('under_review', 'shortlisted', 'interview_requested', 'offered', 'waitlisted', 'rejected')
    when 'under_review' then p_to in ('shortlisted', 'interview_requested', 'offered', 'waitlisted', 'rejected')
    when 'shortlisted' then p_to in ('under_review', 'interview_requested', 'offered', 'waitlisted', 'rejected')
    when 'interview_requested' then p_to in ('shortlisted', 'offered', 'waitlisted', 'rejected')
    when 'waitlisted' then p_to in ('under_review', 'shortlisted', 'interview_requested', 'offered', 'rejected')
    when 'offered' then p_to in ('waitlisted', 'rejected')
    when 'accepted' then p_to in ('completed', 'rejected')
    else false
  end;
$$;

create or replace function public.organizer_update_volunteer_application(
  p_application uuid,
  p_status public.volunteer_application_status,
  p_message text default null,
  p_offer_expires_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  a public.volunteer_applications;
  r public.volunteer_roles;
  e public.events;
  v_title text;
  v_email public.email_category;
begin
  select * into a from public.volunteer_applications where id = p_application for update;
  if a.id is null or not private.can_manage_role(a.role_id) then
    raise exception 'Application not found.' using errcode = 'P0002';
  end if;
  if not private.volunteer_transition_allowed(a.status, p_status) then
    raise exception 'An application that is % cannot be moved to %.', replace(a.status::text, '_', ' '), replace(p_status::text, '_', ' ') using errcode = 'P0001';
  end if;
  select * into r from public.volunteer_roles where id = a.role_id;
  select * into e from public.events where id = a.event_id;

  if p_status = 'offered' then
    if p_offer_expires_at is not null and p_offer_expires_at <= now() then
      raise exception 'Offer expiry must be in the future.' using errcode = '22023';
    end if;
    if r.accepted_count >= r.positions then
      raise exception 'All positions for this role are filled. Increase the number of positions to send more offers.' using errcode = 'P0001';
    end if;
  end if;
  if p_status = 'completed' and (e.starts_at is null or e.starts_at > now()) then
    raise exception 'Participation can be marked complete once the event has started.' using errcode = 'P0001';
  end if;
  if p_status = 'rejected' and a.status = 'accepted' and char_length(coalesce(btrim(p_message), '')) < 5 then
    raise exception 'Please give the volunteer a reason.' using errcode = '22023';
  end if;

  update public.volunteer_applications set
    status = p_status,
    last_status_message = nullif(btrim(p_message), ''),
    offer_message = case when p_status = 'offered' then nullif(btrim(p_message), '') else offer_message end,
    offered_at = case when p_status = 'offered' then now() else offered_at end,
    offer_expires_at = case when p_status = 'offered' then p_offer_expires_at else offer_expires_at end,
    completed_at = case when p_status = 'completed' then now() else completed_at end
  where id = a.id;

  if p_status = 'rejected' and a.status = 'accepted' then
    delete from public.volunteer_shift_assignments where application_id = a.id;
  end if;

  insert into public.volunteer_status_history (application_id, from_status, to_status, actor_id, message)
  values (a.id, a.status, p_status, v_uid, nullif(btrim(p_message), ''));

  v_title := case p_status
    when 'under_review' then 'Your application is being reviewed'
    when 'shortlisted' then 'You have been shortlisted: ' || r.title
    when 'interview_requested' then 'Interview requested: ' || r.title
    when 'offered' then 'Volunteer offer: ' || r.title || ' at ' || e.title
    when 'waitlisted' then 'You are on the volunteer waitlist: ' || r.title
    when 'rejected' then 'Update on your application: ' || r.title
    when 'completed' then 'Thank you for volunteering at ' || e.title
    else 'Application update: ' || r.title
  end;
  v_email := case when p_status in ('under_review') then null else 'transactional'::public.email_category end;

  perform private.notify(a.user_id, 'volunteer.' || p_status, v_title,
    coalesce(nullif(btrim(p_message), ''),
      case p_status
        when 'offered' then 'Open your applications to accept or decline this offer.'
        when 'completed' then 'Your participation has been recorded.'
        else 'Open your applications to see the latest status.'
      end),
    '/dashboard/applications', 'volunteer_app:' || a.id || ':' || p_status || ':' || extract(epoch from now())::bigint, v_email);

  perform private.audit('volunteer.' || p_status, 'volunteer_application', a.id, e.society_id, e.id);
end;
$$;

create or replace function public.respond_volunteer_offer(p_application uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  a public.volunteer_applications;
  r public.volunteer_roles;
  e public.events;
  v_to public.volunteer_application_status;
  v_offer_actor uuid;
begin
  select * into a from public.volunteer_applications where id = p_application;
  if a.id is null or a.user_id <> v_uid then
    raise exception 'Application not found.' using errcode = 'P0002';
  end if;
  -- Lock the role first so acceptances are serialised against positions.
  select * into r from public.volunteer_roles where id = a.role_id for update;
  select * into a from public.volunteer_applications where id = p_application for update;
  select * into e from public.events where id = a.event_id;

  if a.status <> 'offered' then
    raise exception 'There is no open offer on this application.' using errcode = 'P0001';
  end if;
  if a.offer_expires_at is not null and a.offer_expires_at < now() then
    raise exception 'This offer has expired.' using errcode = 'P0001';
  end if;
  if p_accept and r.accepted_count >= r.positions then
    raise exception 'Sorry, all positions for this role have just been filled.' using errcode = 'P0001';
  end if;
  if p_accept and e.schedule_status = 'cancelled' then
    raise exception 'This event has been cancelled.' using errcode = 'P0001';
  end if;

  v_to := case when p_accept then 'accepted'::public.volunteer_application_status else 'declined'::public.volunteer_application_status end;
  update public.volunteer_applications set status = v_to, responded_at = now() where id = a.id;
  insert into public.volunteer_status_history (application_id, from_status, to_status, actor_id)
  values (a.id, 'offered', v_to, v_uid);

  select actor_id into v_offer_actor from public.volunteer_status_history
   where application_id = a.id and to_status = 'offered' order by created_at desc limit 1;
  if v_offer_actor is not null then
    perform private.notify(v_offer_actor, 'volunteer.offer_' || v_to,
      'Volunteer offer ' || v_to || ': ' || r.title,
      'An applicant ' || v_to || ' your offer for ' || r.title || ' at ' || e.title || '.',
      null, 'volunteer_offer_response:' || a.id || ':' || v_to);
  end if;
  perform private.notify(v_uid, 'volunteer.' || v_to,
    case when p_accept then 'You are volunteering as ' || r.title else 'Offer declined: ' || r.title end,
    case when p_accept then 'Welcome to the team. Shift details will appear in your applications once assigned.'
         else 'You declined the offer. Thanks for letting the organisers know.' end,
    '/dashboard/applications', 'volunteer_app:' || a.id || ':' || v_to, 'transactional');
  perform private.audit('volunteer.offer_' || v_to, 'volunteer_application', a.id, e.society_id, e.id);
end;
$$;

create or replace function public.withdraw_volunteer_application(p_application uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  a public.volunteer_applications;
begin
  select * into a from public.volunteer_applications where id = p_application for update;
  if a.id is null or a.user_id <> v_uid then
    raise exception 'Application not found.' using errcode = 'P0002';
  end if;
  if a.status not in ('submitted', 'under_review', 'shortlisted', 'interview_requested', 'waitlisted', 'offered', 'accepted') then
    raise exception 'This application can no longer be withdrawn.' using errcode = 'P0001';
  end if;
  update public.volunteer_applications set status = 'withdrawn', responded_at = now() where id = a.id;
  delete from public.volunteer_shift_assignments where application_id = a.id;
  insert into public.volunteer_status_history (application_id, from_status, to_status, actor_id)
  values (a.id, a.status, 'withdrawn', v_uid);
  perform private.audit('volunteer.withdrawn', 'volunteer_application', a.id, null, a.event_id);
end;
$$;

-- Shift assignments must reference an accepted application for the same role.
create or replace function private.shift_assignment_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shift_role uuid;
  a public.volunteer_applications;
begin
  select role_id into v_shift_role from public.volunteer_shifts where id = new.shift_id;
  select * into a from public.volunteer_applications where id = new.application_id;
  if a.id is null or a.role_id <> v_shift_role then
    raise exception 'This volunteer did not apply for the role this shift belongs to.' using errcode = '22023';
  end if;
  if a.status <> 'accepted' then
    raise exception 'Only volunteers who accepted an offer can be assigned to shifts.' using errcode = '22023';
  end if;
  new.assigned_by := (select auth.uid());
  return new;
end;
$$;

create trigger volunteer_shift_assignments_guard
  before insert on public.volunteer_shift_assignments
  for each row execute function private.shift_assignment_guard();

create or replace function private.shift_assignment_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.volunteer_applications;
  s public.volunteer_shifts;
begin
  select * into a from public.volunteer_applications where id = new.application_id;
  select * into s from public.volunteer_shifts where id = new.shift_id;
  perform private.notify(a.user_id, 'volunteer.shift_assigned', 'New shift: ' || s.title,
    'You have been assigned a volunteer shift. Open your applications for times and instructions.',
    '/dashboard/applications', 'shift_assigned:' || new.shift_id || ':' || new.application_id, 'transactional');
  return new;
end;
$$;

create trigger volunteer_shift_assignments_notify
  after insert on public.volunteer_shift_assignments
  for each row execute function private.shift_assignment_notify();

-- -----------------------------------------------------------------------------
-- Certificates
-- -----------------------------------------------------------------------------
create or replace function public.issue_volunteer_certificate(p_application uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  a public.volunteer_applications;
  r public.volunteer_roles;
  e public.events;
  s public.societies;
  v_name text;
  v_issuer text;
  v_code text;
begin
  select * into a from public.volunteer_applications where id = p_application for update;
  if a.id is null then
    raise exception 'Application not found.' using errcode = 'P0002';
  end if;
  select * into e from public.events where id = a.event_id;
  if not private.has_society_permission(e.society_id, 'issue_certificates') then
    raise exception 'Only the organising society can issue certificates.' using errcode = '42501';
  end if;
  if a.status <> 'completed' then
    raise exception 'Certificates can only be issued after participation is marked complete.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.certificates where volunteer_application_id = a.id and revoked_at is null) then
    raise exception 'A certificate has already been issued for this volunteer.' using errcode = 'P0001';
  end if;

  select * into r from public.volunteer_roles where id = a.role_id;
  select * into s from public.societies where id = e.society_id;
  select nullif(btrim(full_name), '') into v_name from public.profiles where id = a.user_id;
  select nullif(btrim(full_name), '') into v_issuer from public.profiles where id = v_uid;
  if v_name is null then
    raise exception 'The volunteer has not added their name to their profile yet.' using errcode = 'P0001';
  end if;

  loop
    v_code := 'CC-' || private.random_code(4) || '-' || private.random_code(4) || '-' || private.random_code(4);
    exit when not exists (select 1 from public.certificates where code = v_code);
  end loop;

  delete from public.certificates where volunteer_application_id = a.id and revoked_at is not null;
  insert into public.certificates (
    code, user_id, event_id, society_id, volunteer_application_id, recipient_name, role_title,
    event_title, society_name, event_date, issued_by, issuer_name
  ) values (
    v_code, a.user_id, e.id, s.id, a.id, v_name, r.title, e.title, s.name,
    (e.starts_at at time zone e.timezone)::date, v_uid, coalesce(v_issuer, s.name)
  );

  perform private.notify(a.user_id, 'certificate.issued', 'Certificate issued: ' || e.title,
    s.name || ' issued you a volunteer certificate for ' || r.title || '.',
    '/dashboard/certificates', 'certificate:' || a.id, 'transactional');
  perform private.audit('certificate.issued', 'certificate', a.id, s.id, e.id, jsonb_build_object('code', v_code));
  return v_code;
end;
$$;

create or replace function public.revoke_certificate(p_certificate uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.certificates;
begin
  perform private.require_user();
  select * into c from public.certificates where id = p_certificate for update;
  if c.id is null or not private.has_society_permission(c.society_id, 'issue_certificates') then
    raise exception 'Certificate not found.' using errcode = 'P0002';
  end if;
  if char_length(coalesce(btrim(p_reason), '')) < 5 then
    raise exception 'Please give a reason.' using errcode = '22023';
  end if;
  update public.certificates set revoked_at = now(), revoked_reason = p_reason where id = c.id;
  perform private.audit('certificate.revoked', 'certificate', c.id, c.society_id, c.event_id, jsonb_build_object('reason', p_reason));
end;
$$;

-- Public verification: returns only what is printed on the certificate.
create or replace function public.verify_certificate(p_code text)
returns table (
  recipient_name text, role_title text, event_title text, society_name text,
  event_date date, issued_at timestamptz, issuer_name text, revoked boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.recipient_name, c.role_title, c.event_title, c.society_name, c.event_date, c.issued_at, c.issuer_name,
         c.revoked_at is not null
  from public.certificates c
  where c.code = upper(btrim(p_code));
$$;

-- -----------------------------------------------------------------------------
-- Collaboration
-- -----------------------------------------------------------------------------
create or replace function public.invite_collaborator(
  p_event uuid,
  p_society uuid,
  p_can_edit_details boolean default false,
  p_can_manage_volunteers boolean default false,
  p_can_view_registrations boolean default false,
  p_can_check_in boolean default false,
  p_can_view_analytics boolean default false,
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  e public.events;
  s public.societies;
  host public.societies;
  v_id uuid;
begin
  perform private.enforce_rate_limit('collab_invite:' || v_uid, 30, 3600);
  select * into e from public.events where id = p_event;
  if e.id is null or not private.has_society_permission(e.society_id, 'manage_collaborations') then
    raise exception 'You do not have permission to invite collaborators to this event.' using errcode = '42501';
  end if;
  if p_society = e.society_id then
    raise exception 'Your own society already organises this event.' using errcode = '22023';
  end if;
  select * into s from public.societies where id = p_society;
  if s.id is null or s.status <> 'active' then
    raise exception 'Only active, verified societies can be invited.' using errcode = '22023';
  end if;
  select * into host from public.societies where id = e.society_id;

  insert into public.event_collaborations as c (
    event_id, society_id, status, can_edit_details, can_manage_volunteers, can_view_registrations,
    can_check_in, can_view_analytics, message, invited_by
  ) values (
    p_event, p_society, 'pending', p_can_edit_details, p_can_manage_volunteers, p_can_view_registrations,
    p_can_check_in, p_can_view_analytics, nullif(btrim(p_message), ''), v_uid
  )
  on conflict (event_id, society_id) do update set
    status = 'pending',
    can_edit_details = excluded.can_edit_details,
    can_manage_volunteers = excluded.can_manage_volunteers,
    can_view_registrations = excluded.can_view_registrations,
    can_check_in = excluded.can_check_in,
    can_view_analytics = excluded.can_view_analytics,
    message = excluded.message,
    invited_by = excluded.invited_by,
    responded_by = null,
    responded_at = null
  where c.status in ('declined', 'revoked')
  returning id into v_id;

  if v_id is null then
    raise exception 'This society has already been invited.' using errcode = 'P0001';
  end if;

  perform private.notify_society(p_society, 'manage_collaborations', 'collaboration.invited',
    host.name || ' invited you to co-organise ' || e.title,
    coalesce(nullif(btrim(p_message), ''), 'Review the invitation and the access being offered.'),
    '/manage/' || s.slug || '/collaborations', 'collab_invite:' || v_id || ':' || extract(epoch from now())::bigint,
    'transactional');
  perform private.audit('collaboration.invited', 'event_collaboration', v_id, e.society_id, e.id,
    jsonb_build_object('society', p_society));
  return v_id;
end;
$$;

create or replace function public.respond_collaboration(p_collaboration uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  c public.event_collaborations;
  e public.events;
  s public.societies;
begin
  select * into c from public.event_collaborations where id = p_collaboration for update;
  if c.id is null or not private.has_society_permission(c.society_id, 'manage_collaborations') then
    raise exception 'Invitation not found.' using errcode = 'P0002';
  end if;
  if c.status <> 'pending' then
    raise exception 'This invitation is no longer pending.' using errcode = 'P0001';
  end if;
  update public.event_collaborations set
    status = case when p_accept then 'accepted'::public.collaboration_status else 'declined'::public.collaboration_status end,
    responded_by = v_uid, responded_at = now()
  where id = c.id;

  select * into e from public.events where id = c.event_id;
  select * into s from public.societies where id = c.society_id;
  perform private.notify_society(e.society_id, 'manage_collaborations', 'collaboration.' || case when p_accept then 'accepted' else 'declined' end,
    s.name || case when p_accept then ' accepted' else ' declined' end || ' your collaboration invitation',
    'Event: ' || e.title, null, 'collab_response:' || c.id || ':' || extract(epoch from now())::bigint);
  perform private.audit('collaboration.' || case when p_accept then 'accepted' else 'declined' end,
    'event_collaboration', c.id, e.society_id, e.id, jsonb_build_object('society', c.society_id));
end;
$$;

create or replace function public.update_collaboration_permissions(
  p_collaboration uuid,
  p_can_edit_details boolean,
  p_can_manage_volunteers boolean,
  p_can_view_registrations boolean,
  p_can_check_in boolean,
  p_can_view_analytics boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.event_collaborations;
  e public.events;
begin
  perform private.require_user();
  select * into c from public.event_collaborations where id = p_collaboration for update;
  if c.id is null then
    raise exception 'Collaboration not found.' using errcode = 'P0002';
  end if;
  select * into e from public.events where id = c.event_id;
  if not private.has_society_permission(e.society_id, 'manage_collaborations') then
    raise exception 'Only the host society can change collaborator access.' using errcode = '42501';
  end if;
  update public.event_collaborations set
    can_edit_details = p_can_edit_details,
    can_manage_volunteers = p_can_manage_volunteers,
    can_view_registrations = p_can_view_registrations,
    can_check_in = p_can_check_in,
    can_view_analytics = p_can_view_analytics
  where id = c.id;
  perform private.audit('collaboration.permissions_changed', 'event_collaboration', c.id, e.society_id, e.id,
    jsonb_build_object('edit', p_can_edit_details, 'volunteers', p_can_manage_volunteers,
      'registrations', p_can_view_registrations, 'check_in', p_can_check_in, 'analytics', p_can_view_analytics));
end;
$$;

-- Either side may end a collaboration.
create or replace function public.revoke_collaboration(p_collaboration uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.event_collaborations;
  e public.events;
begin
  perform private.require_user();
  select * into c from public.event_collaborations where id = p_collaboration for update;
  if c.id is null then
    raise exception 'Collaboration not found.' using errcode = 'P0002';
  end if;
  select * into e from public.events where id = c.event_id;
  if not (private.has_society_permission(e.society_id, 'manage_collaborations')
          or private.has_society_permission(c.society_id, 'manage_collaborations')) then
    raise exception 'Collaboration not found.' using errcode = 'P0002';
  end if;
  if c.status in ('revoked', 'declined') then
    return;
  end if;
  update public.event_collaborations set status = 'revoked', responded_at = now(), responded_by = (select auth.uid()) where id = c.id;
  update public.volunteer_roles set assigned_society_id = null where event_id = c.event_id and assigned_society_id = c.society_id;
  perform private.audit('collaboration.revoked', 'event_collaboration', c.id, e.society_id, e.id, jsonb_build_object('society', c.society_id));
end;
$$;
