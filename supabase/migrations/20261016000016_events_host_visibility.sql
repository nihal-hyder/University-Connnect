-- =============================================================================
-- 0016 EVENTS: HOST VISIBILITY ON INSERT ... RETURNING
-- private.event_permission() looks the event up by id. During
-- INSERT ... RETURNING the new row is not yet visible to that lookup, so the
-- SELECT policy rejected the returned row and creating an event from the app
-- failed with "new row violates row-level security policy".
--
-- Members of the host society are now matched on the row's own society_id
-- (no self-lookup). Visibility is unchanged: event_permission(...,
-- 'view_society') already granted host members access to existing rows.
-- =============================================================================

drop policy "events visible" on public.events;

create policy "events visible" on public.events for select
  using (
    (status = 'published' and (publish_at is null or publish_at <= now())
      and exists (select 1 from public.societies s where s.id = society_id and s.status = 'active'))
    or private.has_society_permission(society_id, 'view_society')
    or private.event_permission(id, 'view_society')
    or private.is_platform_admin()
    or private.is_event_participant(id)
  );
