-- =============================================================================
-- 0019 FIX: SHIFT POLICY RECURSION
-- The SELECT policies of volunteer_shifts and volunteer_shift_assignments each
-- queried the other table, so any read raised "infinite recursion detected in
-- policy" (42P17): organisers could not list shifts and volunteers could not
-- see their assignments. The old shifts policy also compared sa.shift_id with
-- the application's id (unqualified "id" resolved to the joined table).
--
-- Cross-table checks now go through SECURITY DEFINER helpers, which read the
-- other table without re-entering its policies.
-- =============================================================================

create or replace function private.shift_role(p_shift uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select role_id from public.volunteer_shifts where id = p_shift;
$$;

create or replace function private.is_assigned_to_shift(p_shift uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.volunteer_shift_assignments sa
    join public.volunteer_applications a on a.id = sa.application_id
    where sa.shift_id = p_shift and a.user_id = (select auth.uid()) and a.status in ('accepted', 'completed')
  );
$$;

revoke execute on function private.shift_role(uuid), private.is_assigned_to_shift(uuid) from public, anon;
grant execute on function private.shift_role(uuid), private.is_assigned_to_shift(uuid) to authenticated;

drop policy "shifts managers or assigned" on public.volunteer_shifts;
create policy "shifts managers or assigned" on public.volunteer_shifts for select to authenticated
  using (private.can_manage_role(role_id) or private.is_assigned_to_shift(id));

drop policy "assignments managers or self" on public.volunteer_shift_assignments;
create policy "assignments managers or self" on public.volunteer_shift_assignments for select to authenticated
  using (
    exists (select 1 from public.volunteer_applications a where a.id = application_id and a.user_id = (select auth.uid()))
    or private.can_manage_role(private.shift_role(shift_id))
  );

drop policy "assignments managers insert" on public.volunteer_shift_assignments;
create policy "assignments managers insert" on public.volunteer_shift_assignments for insert to authenticated
  with check (private.can_manage_role(private.shift_role(shift_id)));

drop policy "assignments managers delete" on public.volunteer_shift_assignments;
create policy "assignments managers delete" on public.volunteer_shift_assignments for delete to authenticated
  using (private.can_manage_role(private.shift_role(shift_id)));
