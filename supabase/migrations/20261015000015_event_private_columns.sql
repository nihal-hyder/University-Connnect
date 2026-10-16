-- =============================================================================
-- 0015 EVENT PRIVATE COLUMNS
-- RLS controls rows, not columns. Several event columns must not be readable
-- by everyone who can see a published event:
--   online_url  -> only confirmed participants and organisers
--   review_note, reviewed_by, created_by, updated_by -> organisers / admins
-- Replace the table-wide SELECT grant with a column list and expose the
-- private fields through an authorised function.
-- =============================================================================

revoke select on public.events from anon, authenticated;

grant select (
  id, society_id, slug, title, summary, description, agenda, speakers, tags, category_id, event_type, cover_path,
  starts_at, ends_at, timezone, format, university_id, campus_id, city_id, venue, accessibility_info,
  eligibility_scope, eligible_levels, eligibility_notes, registration_mode, external_registration_url,
  requires_approval, capacity, waitlist_enabled, team_min, team_max, registration_opens_at, registration_closes_at,
  terms_text, is_free, fee_amount, fee_currency, fee_description, payment_instructions, payment_url, refund_policy,
  contact_email, contact_phone, volunteer_recruitment_open, status, schedule_status, schedule_note, publish_at,
  published_at, submitted_at, confirmed_count, pending_count, waitlist_count, is_demo, search, created_at, updated_at
) on public.events to anon, authenticated;

-- The application-review link is internal.
revoke select on public.societies from anon, authenticated;
grant select (
  id, slug, name, university_id, campus_id, department_id, scope_label, category_id, description, logo_path,
  website_url, social_links, public_contact_email, status, status_note, verified_at, events_require_review,
  is_demo, created_at, updated_at
) on public.societies to anon, authenticated;

create or replace function public.event_private_details(p_event uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  e public.events;
  v_organiser boolean;
  v_participant boolean;
begin
  if (select auth.uid()) is null then
    return '{}'::jsonb;
  end if;
  select * into e from public.events where id = p_event;
  if e.id is null then
    return '{}'::jsonb;
  end if;
  v_organiser := private.event_permission(p_event, 'view_society') or private.is_platform_admin();
  v_participant := exists (
    select 1 from public.registrations r
    where r.event_id = p_event and r.user_id = (select auth.uid()) and r.status = 'confirmed'
  ) or exists (
    select 1 from public.volunteer_applications a
    where a.event_id = p_event and a.user_id = (select auth.uid()) and a.status in ('accepted', 'completed')
  );
  return jsonb_build_object(
    'online_url', case when v_organiser or v_participant then e.online_url end,
    'review_note', case when v_organiser then e.review_note end
  );
end;
$$;

grant execute on function public.event_private_details(uuid) to authenticated;
