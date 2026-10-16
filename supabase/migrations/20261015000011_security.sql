-- =============================================================================
-- 0011 SECURITY: GRANTS + ROW LEVEL SECURITY
--
-- Strategy
--   1. Revoke everything from anon/authenticated, then grant an explicit
--      allow-list. Column-level INSERT/UPDATE grants prevent mass assignment
--      (e.g. a client cannot set events.status, societies.status,
--      registrations.*, or any counter).
--   2. RLS is enabled on every public table. Policies define WHICH rows a
--      role may touch; grants define WHICH columns/operations.
--   3. State transitions (statuses, roles, ownership, capacity) only happen
--      inside SECURITY DEFINER functions that perform their own checks.
--   4. Administrators are identified via public.platform_admins, which has no
--      client write path.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extra triggers that protect ownership columns
-- -----------------------------------------------------------------------------
create or replace function private.events_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := (select auth.uid());
    new.updated_by := (select auth.uid());
  else
    new.updated_by := coalesce((select auth.uid()), new.updated_by);
    if new.slug is distinct from old.slug and old.status <> 'draft' then
      raise exception 'The link of a submitted or published event cannot be changed.' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;

create trigger events_guard
  before insert or update on public.events
  for each row execute function private.events_guard();

create or replace function private.roles_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := (select auth.uid());
  end if;
  return new;
end;
$$;

create trigger volunteer_roles_guard
  before insert on public.volunteer_roles
  for each row execute function private.roles_guard();

create or replace function private.notes_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.author_id := (select auth.uid());
  return new;
end;
$$;

create trigger volunteer_application_notes_guard
  before insert on public.volunteer_application_notes
  for each row execute function private.notes_guard();

create or replace function private.shift_event_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select event_id into new.event_id from public.volunteer_roles where id = new.role_id;
  return new;
end;
$$;

create trigger volunteer_shifts_event_guard
  before insert or update on public.volunteer_shifts
  for each row execute function private.shift_event_guard();

-- Who may see a profile: the person, administrators, fellow society members,
-- and organisers authorised to review that person's registration or
-- volunteer application.
create or replace function private.can_view_profile(p_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_profile = (select auth.uid())
    or private.is_platform_admin()
    or exists (
      select 1 from public.society_memberships mine
      join public.society_memberships theirs on theirs.society_id = mine.society_id
      where mine.user_id = (select auth.uid()) and theirs.user_id = p_profile
    )
    or exists (
      select 1 from public.registrations r
      where r.user_id = p_profile and private.event_permission(r.event_id, 'view_registrations')
    )
    or exists (
      select 1 from public.volunteer_applications a
      where a.user_id = p_profile and private.can_manage_role(a.role_id)
    );
$$;

-- Participants keep access to an event they registered or applied for, even
-- if it is later archived or its society is suspended.
create or replace function private.is_event_participant(p_event uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and (
    exists (select 1 from public.registrations r where r.event_id = p_event and r.user_id = (select auth.uid()))
    or exists (select 1 from public.volunteer_applications a where a.event_id = p_event and a.user_id = (select auth.uid()))
  );
$$;

create or replace function private.try_uuid(p_value text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return p_value::uuid;
exception when others then
  return null;
end;
$$;

-- -----------------------------------------------------------------------------
-- 1. Grants
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges in schema private revoke execute on functions from public, anon, authenticated;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema private to anon, authenticated;

-- Policy helpers must be executable by the roles whose policies call them.
grant execute on function
  private.is_platform_admin(),
  private.has_society_permission(uuid, text),
  private.is_society_member(uuid),
  private.event_permission(uuid, text),
  private.event_is_public(uuid),
  private.can_manage_role(uuid),
  private.can_view_profile(uuid),
  private.is_event_participant(uuid),
  private.try_uuid(text),
  private.role_permissions(public.society_role)
to anon, authenticated;

-- Reference directory
grant select on public.cities, public.universities, public.campuses, public.departments, public.event_categories to anon, authenticated;
grant insert, update, delete on public.universities, public.campuses, public.departments, public.event_categories to authenticated;
grant insert (name, province, is_active), update (name, province, is_active) on public.cities to authenticated;

-- Profiles & preferences
grant select on public.profiles to authenticated;
grant update (full_name, avatar_path, university_id, campus_id, department_id, program, academic_level,
              graduation_year, city_id, bio, onboarded_at) on public.profiles to authenticated;
grant select, insert, delete on public.profile_interests to authenticated;
grant select on public.user_preferences to authenticated;
grant update (email_reminders, email_recommendations, email_society_updates) on public.user_preferences to authenticated;
grant select on public.platform_admins to authenticated;

-- Notifications / platform
grant select on public.notifications, public.job_runs, public.audit_logs to authenticated;

-- Societies
grant select on public.societies to anon, authenticated;
grant update (scope_label, category_id, description, logo_path, website_url, social_links, public_contact_email,
              campus_id, department_id) on public.societies to authenticated;
grant select, delete on public.society_applications to authenticated;
grant insert (applicant_id, name, university_id, campus_id, department_id, scope_label, category_id, description,
              logo_path, website_url, social_links, faculty_advisor_name, faculty_advisor_title, faculty_advisor_email,
              president_name, president_email, contact_email, contact_phone, public_contact_email, team_size,
              recognition_details, evidence_path, applicant_role),
      update (name, university_id, campus_id, department_id, scope_label, category_id, description,
              logo_path, website_url, social_links, faculty_advisor_name, faculty_advisor_title, faculty_advisor_email,
              president_name, president_email, contact_email, contact_phone, public_contact_email, team_size,
              recognition_details, evidence_path, applicant_role)
  on public.society_applications to authenticated;
grant select on public.society_memberships, public.society_invitations to authenticated;

-- Events
grant select on public.events, public.event_target_universities, public.event_collaborations, public.form_versions
  to anon, authenticated;
grant insert (society_id, slug, title, summary, description, agenda, speakers, tags, category_id, event_type, cover_path,
              starts_at, ends_at, timezone, format, university_id, campus_id, city_id, venue, online_url, accessibility_info,
              eligibility_scope, eligible_levels, eligibility_notes, registration_mode, external_registration_url,
              requires_approval, capacity, waitlist_enabled, team_min, team_max, registration_opens_at,
              registration_closes_at, terms_text, is_free, fee_amount, fee_currency, fee_description,
              payment_instructions, payment_url, refund_policy, contact_email, contact_phone,
              volunteer_recruitment_open, publish_at),
      update (slug, title, summary, description, agenda, speakers, tags, category_id, event_type, cover_path,
              starts_at, ends_at, timezone, format, university_id, campus_id, city_id, venue, online_url, accessibility_info,
              eligibility_scope, eligible_levels, eligibility_notes, registration_mode, external_registration_url,
              requires_approval, capacity, waitlist_enabled, team_min, team_max, registration_opens_at,
              registration_closes_at, terms_text, is_free, fee_amount, fee_currency, fee_description,
              payment_instructions, payment_url, refund_policy, contact_email, contact_phone,
              volunteer_recruitment_open, publish_at)
  on public.events to authenticated;
grant delete on public.events to authenticated;
grant insert, delete on public.event_target_universities to authenticated;
grant select on public.registrations, public.registration_history, public.tickets, public.attendance_records to authenticated;
grant select, insert, delete on public.saved_events to authenticated;

-- Volunteers
grant select on public.volunteer_roles to anon, authenticated;
grant insert (event_id, assigned_society_id, title, description, responsibilities, positions, skills, eligibility,
              experience_level, time_commitment, schedule_notes, application_deadline, is_paid, compensation_details,
              benefits, selection_process, requires_event_registration, status, sort_order),
      update (assigned_society_id, title, description, responsibilities, positions, skills, eligibility,
              experience_level, time_commitment, schedule_notes, application_deadline, is_paid, compensation_details,
              benefits, selection_process, requires_event_registration, status, sort_order)
  on public.volunteer_roles to authenticated;
grant delete on public.volunteer_roles to authenticated;
grant select on public.volunteer_applications, public.volunteer_status_history, public.certificates to authenticated;
grant select, insert (application_id, body) on public.volunteer_application_notes to authenticated;
grant select, delete on public.volunteer_shifts to authenticated;
grant insert (role_id, title, starts_at, ends_at, location, instructions),
      update (title, starts_at, ends_at, location, instructions) on public.volunteer_shifts to authenticated;
grant select, insert (shift_id, application_id), delete on public.volunteer_shift_assignments to authenticated;
grant select, insert, delete on public.saved_opportunities to authenticated;

-- Moderation
grant select on public.reports, public.moderation_actions to authenticated;

-- API functions callable by signed-in users
grant execute on function
  public.submit_society_application(uuid),
  public.admin_review_society_application(uuid, public.society_application_status, text),
  public.admin_set_society_status(uuid, public.society_status, text),
  public.admin_set_society_review_policy(uuid, boolean),
  public.invite_society_member(uuid, text, public.society_role),
  public.respond_society_invitation(uuid, boolean),
  public.revoke_society_invitation(uuid),
  public.update_society_member_role(uuid, public.society_role, text),
  public.remove_society_member(uuid),
  public.transfer_society_ownership(uuid, uuid),
  public.save_form(uuid, uuid, jsonb),
  public.submit_event(uuid),
  public.withdraw_event_submission(uuid),
  public.admin_review_event(uuid, public.event_status, text),
  public.set_event_schedule_status(uuid, public.event_schedule_status, text),
  public.duplicate_event(uuid),
  public.register_for_event(uuid, jsonb, text, jsonb),
  public.cancel_registration(uuid, text),
  public.organizer_set_registration_status(uuid, public.registration_status, text),
  public.check_in_ticket(uuid, text),
  public.manual_check_in(uuid, boolean),
  public.apply_for_volunteer_role(uuid, jsonb, text),
  public.organizer_update_volunteer_application(uuid, public.volunteer_application_status, text, timestamptz),
  public.respond_volunteer_offer(uuid, boolean),
  public.withdraw_volunteer_application(uuid),
  public.issue_volunteer_certificate(uuid),
  public.revoke_certificate(uuid, text),
  public.invite_collaborator(uuid, uuid, boolean, boolean, boolean, boolean, boolean, text),
  public.respond_collaboration(uuid, boolean),
  public.update_collaboration_permissions(uuid, boolean, boolean, boolean, boolean, boolean),
  public.revoke_collaboration(uuid),
  public.submit_report(public.report_target, uuid, public.report_reason, text),
  public.admin_update_report(uuid, public.report_status, text),
  public.mark_notifications_read(uuid[]),
  public.society_analytics(uuid, date, date),
  public.event_analytics(uuid),
  public.admin_platform_metrics()
to authenticated;

-- Public (anonymous) functions
grant execute on function public.record_event_view(uuid, text), public.verify_certificate(text) to anon, authenticated;

-- Server-only job functions (called with the service role key from the job route)
grant execute on function public.job_enqueue_reminders(), public.job_claim_emails(int),
  public.job_complete_email(uuid, public.email_status, text, text) to service_role;

-- -----------------------------------------------------------------------------
-- 2. Row Level Security
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'cities', 'universities', 'campuses', 'departments', 'event_categories', 'profiles', 'profile_interests',
    'user_preferences', 'platform_admins', 'audit_logs', 'notifications', 'email_outbox', 'job_runs',
    'society_applications', 'societies', 'society_memberships', 'society_invitations', 'events',
    'event_target_universities', 'event_collaborations', 'form_versions', 'registrations', 'registration_history',
    'tickets', 'attendance_records', 'saved_events', 'event_daily_visitors', 'volunteer_roles',
    'volunteer_applications', 'volunteer_status_history', 'volunteer_application_notes', 'volunteer_shifts',
    'volunteer_shift_assignments', 'saved_opportunities', 'certificates', 'reports', 'moderation_actions'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

-- Reference directory: public read of active rows, admin write.
create policy "directory readable" on public.cities for select using (is_active or private.is_platform_admin());
create policy "directory admin insert" on public.cities for insert to authenticated with check (private.is_platform_admin());
create policy "directory admin update" on public.cities for update to authenticated using (private.is_platform_admin()) with check (private.is_platform_admin());

create policy "directory readable" on public.universities for select using (is_active or private.is_platform_admin());
create policy "directory admin insert" on public.universities for insert to authenticated with check (private.is_platform_admin());
create policy "directory admin update" on public.universities for update to authenticated using (private.is_platform_admin()) with check (private.is_platform_admin());
create policy "directory admin delete" on public.universities for delete to authenticated using (private.is_platform_admin());

create policy "directory readable" on public.campuses for select using (is_active or private.is_platform_admin());
create policy "directory admin insert" on public.campuses for insert to authenticated with check (private.is_platform_admin());
create policy "directory admin update" on public.campuses for update to authenticated using (private.is_platform_admin()) with check (private.is_platform_admin());
create policy "directory admin delete" on public.campuses for delete to authenticated using (private.is_platform_admin());

create policy "directory readable" on public.departments for select using (is_active or private.is_platform_admin());
create policy "directory admin insert" on public.departments for insert to authenticated with check (private.is_platform_admin());
create policy "directory admin update" on public.departments for update to authenticated using (private.is_platform_admin()) with check (private.is_platform_admin());
create policy "directory admin delete" on public.departments for delete to authenticated using (private.is_platform_admin());

create policy "directory readable" on public.event_categories for select using (is_active or private.is_platform_admin());
create policy "directory admin insert" on public.event_categories for insert to authenticated with check (private.is_platform_admin());
create policy "directory admin update" on public.event_categories for update to authenticated using (private.is_platform_admin()) with check (private.is_platform_admin());
create policy "directory admin delete" on public.event_categories for delete to authenticated using (private.is_platform_admin());

-- Profiles
create policy "profiles visible to authorised viewers" on public.profiles for select to authenticated
  using (private.can_view_profile(id));
create policy "profiles self update" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "interests self read" on public.profile_interests for select to authenticated using (profile_id = (select auth.uid()));
create policy "interests self insert" on public.profile_interests for insert to authenticated with check (profile_id = (select auth.uid()));
create policy "interests self delete" on public.profile_interests for delete to authenticated using (profile_id = (select auth.uid()));

create policy "preferences self read" on public.user_preferences for select to authenticated using (user_id = (select auth.uid()));
create policy "preferences self update" on public.user_preferences for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "admins see admin list" on public.platform_admins for select to authenticated
  using (user_id = (select auth.uid()) or private.is_platform_admin());

-- Notifications & platform
create policy "own notifications" on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "admin job runs" on public.job_runs for select to authenticated using (private.is_platform_admin());
create policy "audit visible to admins and society leads" on public.audit_logs for select to authenticated
  using (
    private.is_platform_admin()
    or (society_id is not null and private.has_society_permission(society_id, 'manage_members'))
    or (event_id is not null and private.event_permission(event_id, 'edit_events'))
  );
-- email_outbox / event_daily_visitors: no policies -> no client access.

-- Society applications
create policy "applications own or admin" on public.society_applications for select to authenticated
  using (applicant_id = (select auth.uid()) or private.is_platform_admin());
create policy "applications create own draft" on public.society_applications for insert to authenticated
  with check (applicant_id = (select auth.uid()) and status = 'draft');
create policy "applications edit own while open" on public.society_applications for update to authenticated
  using (applicant_id = (select auth.uid()) and status in ('draft', 'info_requested'))
  with check (applicant_id = (select auth.uid()) and status in ('draft', 'info_requested'));
create policy "applications delete own draft" on public.society_applications for delete to authenticated
  using (applicant_id = (select auth.uid()) and status = 'draft');

-- Societies
create policy "societies public when active" on public.societies for select
  using (status = 'active' or private.is_society_member(id) or private.is_platform_admin());
create policy "societies profile editable by managers" on public.societies for update to authenticated
  using (private.has_society_permission(id, 'manage_profile'))
  with check (private.has_society_permission(id, 'manage_profile'));

create policy "memberships visible to members" on public.society_memberships for select to authenticated
  using (user_id = (select auth.uid()) or private.is_society_member(society_id) or private.is_platform_admin());

create policy "invitations visible to managers and invitee" on public.society_invitations for select to authenticated
  using (
    private.has_society_permission(society_id, 'manage_members')
    or email = (select p.contact_email from public.profiles p where p.id = (select auth.uid()))
    or private.is_platform_admin()
  );

-- Events
create policy "events visible" on public.events for select
  using (
    (status = 'published' and (publish_at is null or publish_at <= now())
      and exists (select 1 from public.societies s where s.id = society_id and s.status = 'active'))
    or private.event_permission(id, 'view_society')
    or private.is_platform_admin()
    or private.is_event_participant(id)
  );
create policy "events create as draft" on public.events for insert to authenticated
  with check (private.has_society_permission(society_id, 'create_events') and status = 'draft');
create policy "events edit with permission" on public.events for update to authenticated
  using (private.event_permission(id, 'edit_events'))
  with check (private.event_permission(id, 'edit_events'));
create policy "events delete drafts" on public.events for delete to authenticated
  using (status = 'draft' and private.has_society_permission(society_id, 'edit_events')
         and not exists (select 1 from public.registrations r where r.event_id = id));

create policy "targets visible with event" on public.event_target_universities for select
  using (exists (select 1 from public.events e where e.id = event_id));
create policy "targets editable" on public.event_target_universities for insert to authenticated
  with check (private.event_permission(event_id, 'edit_events'));
create policy "targets removable" on public.event_target_universities for delete to authenticated
  using (private.event_permission(event_id, 'edit_events'));

create policy "collaborations visible" on public.event_collaborations for select
  using (
    (status = 'accepted' and private.event_is_public(event_id))
    or private.event_permission(event_id, 'view_society')
    or private.is_society_member(society_id)
    or private.is_platform_admin()
  );

create policy "forms visible with parent" on public.form_versions for select
  using (
    (event_id is not null and exists (select 1 from public.events e where e.id = event_id))
    or (volunteer_role_id is not null and exists (select 1 from public.volunteer_roles r where r.id = volunteer_role_id))
  );

create policy "registrations own or authorised organiser" on public.registrations for select to authenticated
  using (user_id = (select auth.uid()) or private.event_permission(event_id, 'view_registrations'));
create policy "registration history with registration" on public.registration_history for select to authenticated
  using (exists (select 1 from public.registrations r where r.id = registration_id));
create policy "tickets own only" on public.tickets for select to authenticated
  using (exists (select 1 from public.registrations r where r.id = registration_id and r.user_id = (select auth.uid())));
create policy "attendance own or organiser" on public.attendance_records for select to authenticated
  using (
    exists (select 1 from public.registrations r where r.id = registration_id and r.user_id = (select auth.uid()))
    or private.event_permission(event_id, 'view_registrations')
    or private.event_permission(event_id, 'check_in')
  );

create policy "saved events own read" on public.saved_events for select to authenticated using (user_id = (select auth.uid()));
create policy "saved events own insert" on public.saved_events for insert to authenticated
  with check (user_id = (select auth.uid()) and private.event_is_public(event_id));
create policy "saved events own delete" on public.saved_events for delete to authenticated using (user_id = (select auth.uid()));

-- Volunteer roles & applications
create policy "roles visible with event" on public.volunteer_roles for select
  using (exists (select 1 from public.events e where e.id = event_id));
create policy "roles created by host managers" on public.volunteer_roles for insert to authenticated
  with check (exists (select 1 from public.events e where e.id = event_id and private.has_society_permission(e.society_id, 'manage_volunteers')));
create policy "roles edited by role managers" on public.volunteer_roles for update to authenticated
  using (private.can_manage_role(id)) with check (private.can_manage_role(id));
create policy "roles deleted by host when empty" on public.volunteer_roles for delete to authenticated
  using (application_count = 0
         and exists (select 1 from public.events e where e.id = event_id and private.has_society_permission(e.society_id, 'manage_volunteers')));

create policy "volunteer applications own or manager" on public.volunteer_applications for select to authenticated
  using (user_id = (select auth.uid()) or private.can_manage_role(role_id));
create policy "volunteer history with application" on public.volunteer_status_history for select to authenticated
  using (exists (select 1 from public.volunteer_applications a where a.id = application_id));
create policy "notes managers read" on public.volunteer_application_notes for select to authenticated
  using (exists (select 1 from public.volunteer_applications a where a.id = application_id and private.can_manage_role(a.role_id)));
create policy "notes managers write" on public.volunteer_application_notes for insert to authenticated
  with check (exists (select 1 from public.volunteer_applications a where a.id = application_id and private.can_manage_role(a.role_id)));

create policy "shifts managers or assigned" on public.volunteer_shifts for select to authenticated
  using (
    private.can_manage_role(role_id)
    or exists (
      select 1 from public.volunteer_shift_assignments sa
      join public.volunteer_applications a on a.id = sa.application_id
      where sa.shift_id = id and a.user_id = (select auth.uid()) and a.status = 'accepted'
    )
  );
create policy "shifts managers insert" on public.volunteer_shifts for insert to authenticated with check (private.can_manage_role(role_id));
create policy "shifts managers update" on public.volunteer_shifts for update to authenticated
  using (private.can_manage_role(role_id)) with check (private.can_manage_role(role_id));
create policy "shifts managers delete" on public.volunteer_shifts for delete to authenticated using (private.can_manage_role(role_id));

create policy "assignments managers or self" on public.volunteer_shift_assignments for select to authenticated
  using (
    exists (select 1 from public.volunteer_applications a where a.id = application_id and a.user_id = (select auth.uid()))
    or exists (select 1 from public.volunteer_shifts s where s.id = shift_id and private.can_manage_role(s.role_id))
  );
create policy "assignments managers insert" on public.volunteer_shift_assignments for insert to authenticated
  with check (exists (select 1 from public.volunteer_shifts s where s.id = shift_id and private.can_manage_role(s.role_id)));
create policy "assignments managers delete" on public.volunteer_shift_assignments for delete to authenticated
  using (exists (select 1 from public.volunteer_shifts s where s.id = shift_id and private.can_manage_role(s.role_id)));

create policy "saved opportunities own read" on public.saved_opportunities for select to authenticated using (user_id = (select auth.uid()));
create policy "saved opportunities own insert" on public.saved_opportunities for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.volunteer_roles r where r.id = role_id));
create policy "saved opportunities own delete" on public.saved_opportunities for delete to authenticated using (user_id = (select auth.uid()));

create policy "certificates own or issuer" on public.certificates for select to authenticated
  using (user_id = (select auth.uid()) or private.has_society_permission(society_id, 'issue_certificates'));

-- Moderation
create policy "reports own or admin" on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or private.is_platform_admin());
create policy "moderation admin only" on public.moderation_actions for select to authenticated
  using (private.is_platform_admin());
