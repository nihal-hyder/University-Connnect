-- =============================================================================
-- 0022 EVERY REGISTRATION NEEDS APPROVAL; PLATFORM ADMINS HAVE FULL POWERS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Registrations are never confirmed automatically. A society member with
--    manage_registrations confirms each one (capacity is checked then).
--    register_for_event() and promote_waitlist() already produce 'pending'
--    when requires_approval is true, so the flag is now always true.
-- -----------------------------------------------------------------------------
update public.events set requires_approval = true where not requires_approval;
alter table public.events alter column requires_approval set default true;
alter table public.events add constraint events_requires_approval check (requires_approval);

-- Tell the people who can approve that registrations are waiting.
-- At most one notification per approver, per event, per day.
create or replace function private.registrations_notify_approvers()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.events;
  s public.societies;
  m record;
begin
  if new.status <> 'pending' then
    return new;
  end if;
  select * into e from public.events where id = new.event_id;
  select * into s from public.societies where id = e.society_id;
  for m in
    select sm.user_id from public.society_memberships sm
    where sm.society_id = e.society_id
      and 'manage_registrations' = any (private.role_permissions(sm.role))
  loop
    perform private.notify(
      m.user_id, 'registration.awaiting_approval', 'Registrations awaiting approval: ' || e.title,
      'New people have registered and are waiting for your team to confirm them.',
      '/manage/' || s.slug || '/events/' || e.id || '/registrations?status=pending',
      'pending_regs:' || e.id || ':' || m.user_id || ':' || ((now() at time zone 'Asia/Karachi')::date)::text
    );
  end loop;
  return new;
end;
$$;

create trigger registrations_notify_approvers
  after insert or update of status on public.registrations
  for each row execute function private.registrations_notify_approvers();

-- -----------------------------------------------------------------------------
-- 2. Platform administrators hold every society permission, in every society,
--    so they can act on any event or registration (all actions are audited
--    with their user id). Admin status itself still comes only from
--    platform_admins, which has no client write path.
-- -----------------------------------------------------------------------------
create or replace function private.has_society_permission(p_society uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_platform_admin()
  or exists (
    select 1
    from public.society_memberships m
    join public.societies s on s.id = m.society_id
    where m.society_id = p_society
      and m.user_id = (select auth.uid())
      and p_permission = any (private.role_permissions(m.role))
      and (s.status = 'active' or p_permission in ('view_society', 'view_registrations', 'view_volunteer_applicants', 'view_analytics', 'export_data'))
  );
$$;
