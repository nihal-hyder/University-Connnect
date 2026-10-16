-- =============================================================================
-- 0007 API: SOCIETY APPLICATIONS, MEMBERSHIP AND ADMIN SOCIETY CONTROLS
-- All functions are SECURITY DEFINER and therefore perform their own
-- authorisation checks. They are the ONLY way to change statuses, roles and
-- ownership; the underlying columns are not writable through the Data API.
-- =============================================================================

-- Notify every platform administrator (in-app only).
create or replace function private.notify_admins(p_type text, p_title text, p_body text, p_link text, p_key text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  for r in select user_id from public.platform_admins loop
    perform private.notify(r.user_id, p_type, p_title, p_body, p_link, p_key || ':' || r.user_id);
  end loop;
end;
$$;

-- Notify society members holding a permission.
create or replace function private.notify_society(
  p_society uuid, p_permission text, p_type text, p_title text, p_body text, p_link text, p_key text,
  p_email public.email_category default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  for r in
    select m.user_id from public.society_memberships m
    where m.society_id = p_society and p_permission = any (private.role_permissions(m.role))
  loop
    perform private.notify(r.user_id, p_type, p_title, p_body, p_link, p_key || ':' || r.user_id, p_email);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Society applications
-- -----------------------------------------------------------------------------
create or replace function public.submit_society_application(p_application uuid)
returns public.society_application_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  a public.society_applications;
begin
  perform private.enforce_rate_limit('society_app:' || v_uid, 5, 3600);

  select * into a from public.society_applications where id = p_application for update;
  if a.id is null or a.applicant_id <> v_uid then
    raise exception 'Application not found.' using errcode = 'P0002';
  end if;
  if a.status not in ('draft', 'info_requested') then
    raise exception 'This application has already been submitted.' using errcode = 'P0001';
  end if;

  if char_length(coalesce(a.description, '')) < 80 then
    raise exception 'Please describe the society in at least 80 characters.' using errcode = '22023';
  end if;
  if coalesce(a.contact_email, '') = '' or coalesce(a.president_name, '') = '' or coalesce(a.applicant_role, '') = '' then
    raise exception 'Contact email, president name and your role are required.' using errcode = '22023';
  end if;
  if char_length(coalesce(a.recognition_details, '')) < 20 and a.evidence_path is null then
    raise exception 'Please explain how the society is recognised by the university or attach evidence.' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.societies s
    where s.university_id = a.university_id and lower(s.name) = lower(a.name)
  ) then
    raise exception 'A verified society with this name already exists at this university. Ask its owner to invite you instead.' using errcode = 'P0001';
  end if;

  update public.society_applications
     set status = 'submitted', submitted_at = now()
   where id = a.id;

  perform private.audit('society_application.submitted', 'society_application', a.id);
  perform private.notify_admins('admin.society_application', 'New society application: ' || a.name,
    'A society verification request is waiting for review.', '/admin/societies/' || a.id,
    'society_app_submitted:' || a.id || ':' || extract(epoch from now())::bigint);
  perform private.notify(v_uid, 'society_application.submitted', 'Application received: ' || a.name,
    'Our team will review your society application. We will let you know when the status changes.',
    '/dashboard/societies', 'society_app_received:' || a.id || ':' || extract(epoch from now())::bigint, 'transactional');

  return 'submitted'::public.society_application_status;
end;
$$;

create or replace function private.unique_society_slug(p_name text, p_university uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_base text := left(private.slugify(p_name), 60);
  v_short text;
  v_slug text;
begin
  select private.slugify(coalesce(short_name, '')) into v_short from public.universities where id = p_university;
  if v_base = '' then v_base := 'society'; end if;
  -- Avoid clashing with static routes under /societies.
  if v_base in ('apply', 'new', 'edit', 'manage', 'search') then v_base := v_base || '-society'; end if;
  v_slug := v_base;
  if exists (select 1 from public.societies where slug = v_slug) and coalesce(v_short, '') <> '' then
    v_slug := v_base || '-' || v_short;
  end if;
  while exists (select 1 from public.societies where slug = v_slug) loop
    v_slug := v_base || '-' || lower(private.random_code(4));
  end loop;
  return v_slug;
end;
$$;

create or replace function public.admin_review_society_application(
  p_application uuid,
  p_decision public.society_application_status,
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  a public.society_applications;
  v_society uuid;
  v_title text;
  v_body text;
begin
  if not private.is_platform_admin() then
    raise exception 'Only platform administrators can review applications.' using errcode = '42501';
  end if;

  select * into a from public.society_applications where id = p_application for update;
  if a.id is null then
    raise exception 'Application not found.' using errcode = 'P0002';
  end if;
  if a.applicant_id = v_uid then
    raise exception 'You cannot review your own application.' using errcode = '42501';
  end if;
  if a.status not in ('submitted', 'under_review') then
    raise exception 'Only submitted applications can be reviewed.' using errcode = 'P0001';
  end if;
  if p_decision not in ('under_review', 'info_requested', 'approved', 'rejected') then
    raise exception 'Unsupported decision.' using errcode = '22023';
  end if;
  if p_decision in ('info_requested', 'rejected') and char_length(coalesce(btrim(p_message), '')) < 10 then
    raise exception 'Please include a message explaining what is needed.' using errcode = '22023';
  end if;

  if p_decision = 'approved' then
    if exists (select 1 from public.societies s where s.university_id = a.university_id and lower(s.name) = lower(a.name)) then
      raise exception 'A society with this name already exists at this university.' using errcode = 'P0001';
    end if;
    insert into public.societies (
      slug, name, university_id, campus_id, department_id, scope_label, category_id, description,
      logo_path, website_url, social_links, public_contact_email, verified_at, application_id
    ) values (
      private.unique_society_slug(a.name, a.university_id), a.name, a.university_id, a.campus_id, a.department_id,
      a.scope_label, a.category_id, a.description, a.logo_path, a.website_url, a.social_links,
      a.public_contact_email, now(), a.id
    ) returning id into v_society;

    insert into public.society_memberships (society_id, user_id, role, title)
    values (v_society, a.applicant_id, 'owner', left(a.applicant_role, 80));
  end if;

  update public.society_applications
     set status = p_decision,
         admin_message = coalesce(nullif(btrim(p_message), ''), admin_message),
         reviewed_by = v_uid,
         reviewed_at = now(),
         society_id = coalesce(v_society, society_id)
   where id = a.id;

  perform private.log_moderation('society_application', a.id, p_decision::text, p_message);
  perform private.audit('society_application.' || p_decision, 'society_application', a.id, v_society, null,
    jsonb_build_object('message', p_message));

  v_title := case p_decision
    when 'under_review' then 'Your society application is under review'
    when 'info_requested' then 'More information needed for ' || a.name
    when 'approved' then a.name || ' is now verified'
    when 'rejected' then 'Update on your application for ' || a.name
  end;
  v_body := case p_decision
    when 'under_review' then 'A reviewer has started looking at your application.'
    when 'approved' then 'Your society dashboard is ready. You can now create events and recruit volunteers.'
    else p_message
  end;
  perform private.notify(a.applicant_id, 'society_application.' || p_decision, v_title, v_body,
    case when p_decision = 'approved' then '/manage' else '/dashboard/societies' end,
    'society_app:' || a.id || ':' || p_decision || ':' || extract(epoch from now())::bigint,
    case when p_decision = 'under_review' then null else 'transactional'::public.email_category end);

  return v_society;
end;
$$;

create or replace function public.admin_set_society_status(p_society uuid, p_status public.society_status, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.societies;
begin
  perform private.require_user();
  if not private.is_platform_admin() then
    raise exception 'Only platform administrators can change society status.' using errcode = '42501';
  end if;
  if char_length(coalesce(btrim(p_note), '')) < 10 then
    raise exception 'Please record a reason (at least 10 characters).' using errcode = '22023';
  end if;
  select * into s from public.societies where id = p_society for update;
  if s.id is null then
    raise exception 'Society not found.' using errcode = 'P0002';
  end if;
  update public.societies set status = p_status, status_note = p_note where id = p_society;
  perform private.log_moderation('society', p_society, 'status:' || p_status, p_note);
  perform private.audit('society.status_changed', 'society', p_society, p_society, null, jsonb_build_object('status', p_status, 'note', p_note));
  perform private.notify_society(p_society, 'manage_members', 'society.status',
    case when p_status = 'suspended' then s.name || ' has been suspended' else s.name || ' has been reinstated' end,
    p_note, '/manage/' || s.slug, 'society_status:' || p_society || ':' || extract(epoch from now())::bigint, 'transactional');
end;
$$;

create or replace function public.admin_set_society_review_policy(p_society uuid, p_requires_review boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_user();
  if not private.is_platform_admin() then
    raise exception 'Only platform administrators can change review policy.' using errcode = '42501';
  end if;
  update public.societies set events_require_review = p_requires_review where id = p_society;
  if not found then
    raise exception 'Society not found.' using errcode = 'P0002';
  end if;
  perform private.log_moderation('society', p_society, case when p_requires_review then 'review_required' else 'trusted' end, null);
end;
$$;

-- -----------------------------------------------------------------------------
-- Membership & invitations
-- -----------------------------------------------------------------------------
create or replace function public.invite_society_member(p_society uuid, p_email text, p_role public.society_role)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_email text := lower(btrim(p_email));
  v_invite uuid;
  v_target uuid;
  s public.societies;
begin
  perform private.enforce_rate_limit('invite:' || v_uid, 30, 3600);
  if not private.has_society_permission(p_society, 'manage_members') then
    raise exception 'You do not have permission to invite members.' using errcode = '42501';
  end if;
  if p_role = 'owner' then
    raise exception 'Ownership can only be transferred to an existing member.' using errcode = '22023';
  end if;
  if p_role = 'admin' and not private.has_society_permission(p_society, 'manage_admins') then
    raise exception 'Only the owner can invite administrators.' using errcode = '42501';
  end if;
  if v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 200 then
    raise exception 'Enter a valid email address.' using errcode = '22023';
  end if;

  select * into s from public.societies where id = p_society;
  select id into v_target from public.profiles where contact_email = v_email::extensions.citext;

  if v_target is not null and exists (
    select 1 from public.society_memberships where society_id = p_society and user_id = v_target
  ) then
    raise exception 'This person is already a member.' using errcode = 'P0001';
  end if;

  -- Expire any previous pending invitation for the same address.
  update public.society_invitations set status = 'revoked'
   where society_id = p_society and email = v_email::extensions.citext and status = 'pending';

  insert into public.society_invitations (society_id, email, role, invited_by)
  values (p_society, v_email, p_role, v_uid)
  returning id into v_invite;

  perform private.audit('society.member_invited', 'society_invitation', v_invite, p_society, null,
    jsonb_build_object('role', p_role));

  if v_target is not null then
    perform private.notify(v_target, 'society.invitation', 'Invitation to join ' || s.name,
      'You have been invited to join ' || s.name || ' as ' || replace(p_role::text, '_', ' ') || '.',
      '/dashboard/invitations', 'society_invite:' || v_invite, 'transactional');
  else
    insert into public.email_outbox (user_id, category, template, subject, payload, idempotency_key)
    values (null, 'transactional', 'generic', 'Invitation to join ' || s.name || ' on CampusConnect',
      jsonb_build_object(
        'to', v_email,
        'title', 'Invitation to join ' || s.name,
        'body', 'You have been invited to join ' || s.name || ' as ' || replace(p_role::text, '_', ' ') || '. Create an account with this email address to accept the invitation.',
        'link', '/signup'),
      'email:society_invite:' || v_invite);
  end if;

  return v_invite;
end;
$$;

create or replace function public.respond_society_invitation(p_invitation uuid, p_accept boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_email extensions.citext;
  i public.society_invitations;
  s public.societies;
begin
  select contact_email into v_email from public.profiles where id = v_uid;
  select * into i from public.society_invitations where id = p_invitation for update;
  if i.id is null or v_email is null or i.email <> v_email then
    raise exception 'Invitation not found.' using errcode = 'P0002';
  end if;
  if i.status <> 'pending' then
    raise exception 'This invitation is no longer active.' using errcode = 'P0001';
  end if;
  if i.expires_at < now() then
    update public.society_invitations set status = 'expired' where id = i.id;
    raise exception 'This invitation has expired. Ask the society to send a new one.' using errcode = 'P0001';
  end if;
  select * into s from public.societies where id = i.society_id;
  if s.status <> 'active' then
    raise exception 'This society is not currently active.' using errcode = 'P0001';
  end if;

  update public.society_invitations
     set status = case when p_accept then 'accepted'::public.invitation_status else 'declined'::public.invitation_status end,
         responded_at = now()
   where id = i.id;

  if p_accept then
    insert into public.society_memberships (society_id, user_id, role)
    values (i.society_id, v_uid, i.role)
    on conflict (society_id, user_id) do nothing;
    perform private.audit('society.member_joined', 'society', i.society_id, i.society_id, null, jsonb_build_object('role', i.role));
    if i.invited_by is not null then
      perform private.notify(i.invited_by, 'society.invitation_accepted', 'Invitation accepted',
        'A new member joined ' || s.name || '.', '/manage/' || s.slug || '/members', 'invite_accepted:' || i.id);
    end if;
  end if;
  return i.society_id;
end;
$$;

create or replace function public.revoke_society_invitation(p_invitation uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  i public.society_invitations;
begin
  perform private.require_user();
  select * into i from public.society_invitations where id = p_invitation for update;
  if i.id is null or not private.has_society_permission(i.society_id, 'manage_members') then
    raise exception 'Invitation not found.' using errcode = 'P0002';
  end if;
  if i.status <> 'pending' then
    raise exception 'Only pending invitations can be revoked.' using errcode = 'P0001';
  end if;
  update public.society_invitations set status = 'revoked', responded_at = now() where id = i.id;
  perform private.audit('society.invitation_revoked', 'society_invitation', i.id, i.society_id);
end;
$$;

create or replace function public.update_society_member_role(p_membership uuid, p_role public.society_role, p_title text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  m public.society_memberships;
begin
  select * into m from public.society_memberships where id = p_membership for update;
  if m.id is null or not private.has_society_permission(m.society_id, 'manage_members') then
    raise exception 'Member not found.' using errcode = 'P0002';
  end if;
  if m.user_id = v_uid then
    raise exception 'You cannot change your own role.' using errcode = '42501';
  end if;
  if m.role = 'owner' or p_role = 'owner' then
    raise exception 'Use ownership transfer to change the owner.' using errcode = '42501';
  end if;
  if (m.role = 'admin' or p_role = 'admin') and not private.has_society_permission(m.society_id, 'manage_admins') then
    raise exception 'Only the owner can add or change administrators.' using errcode = '42501';
  end if;
  update public.society_memberships set role = p_role, title = coalesce(left(p_title, 80), title) where id = m.id;
  perform private.audit('society.member_role_changed', 'society_membership', m.id, m.society_id, null,
    jsonb_build_object('from', m.role, 'to', p_role));
end;
$$;

create or replace function public.remove_society_member(p_membership uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  m public.society_memberships;
begin
  select * into m from public.society_memberships where id = p_membership for update;
  if m.id is null then
    raise exception 'Member not found.' using errcode = 'P0002';
  end if;
  if m.role = 'owner' then
    raise exception 'Transfer ownership before the owner can leave.' using errcode = '42501';
  end if;
  -- Anyone may leave; removing others needs manage_members (manage_admins for admins).
  if m.user_id <> v_uid then
    if not private.has_society_permission(m.society_id, 'manage_members') then
      raise exception 'Member not found.' using errcode = 'P0002';
    end if;
    if m.role = 'admin' and not private.has_society_permission(m.society_id, 'manage_admins') then
      raise exception 'Only the owner can remove administrators.' using errcode = '42501';
    end if;
  end if;
  delete from public.society_memberships where id = m.id;
  perform private.audit(case when m.user_id = v_uid then 'society.member_left' else 'society.member_removed' end,
    'society_membership', m.id, m.society_id, null, jsonb_build_object('user_id', m.user_id, 'role', m.role));
end;
$$;

create or replace function public.transfer_society_ownership(p_society uuid, p_new_owner uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_target public.society_memberships;
  s public.societies;
begin
  if not private.has_society_permission(p_society, 'transfer_ownership') then
    raise exception 'Only the current owner can transfer ownership.' using errcode = '42501';
  end if;
  if p_new_owner = v_uid then
    raise exception 'You already own this society.' using errcode = '22023';
  end if;
  select * into v_target from public.society_memberships where society_id = p_society and user_id = p_new_owner for update;
  if v_target.id is null then
    raise exception 'The new owner must already be a member of the society.' using errcode = '22023';
  end if;
  select * into s from public.societies where id = p_society;

  update public.society_memberships set role = 'admin' where society_id = p_society and user_id = v_uid;
  update public.society_memberships set role = 'owner' where id = v_target.id;

  perform private.audit('society.ownership_transferred', 'society', p_society, p_society, null,
    jsonb_build_object('from', v_uid, 'to', p_new_owner));
  perform private.notify(p_new_owner, 'society.ownership', 'You are now the owner of ' || s.name,
    'Ownership of ' || s.name || ' was transferred to you.', '/manage/' || s.slug,
    'ownership:' || p_society || ':' || extract(epoch from now())::bigint, 'transactional');
end;
$$;
