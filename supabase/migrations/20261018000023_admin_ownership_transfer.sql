-- =============================================================================
-- 0023 OWNERSHIP TRANSFER BY PLATFORM ADMINS
-- Platform admins now hold every society permission (0022) but have no
-- membership row, so the transfer must demote the current owner rather than
-- the caller. Behaviour for an owner transferring their own society is unchanged.
-- =============================================================================

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
    raise exception 'Only the current owner (or a platform administrator) can transfer ownership.' using errcode = '42501';
  end if;
  if p_new_owner = v_uid then
    raise exception 'You already own this society.' using errcode = '22023';
  end if;
  select * into v_target from public.society_memberships where society_id = p_society and user_id = p_new_owner for update;
  if v_target.id is null then
    raise exception 'The new owner must already be a member of the society.' using errcode = '22023';
  end if;
  select * into s from public.societies where id = p_society;

  -- Demote whoever owns it now (the caller, or the previous owner when a platform admin transfers).
  update public.society_memberships set role = 'admin' where society_id = p_society and role = 'owner';
  update public.society_memberships set role = 'owner' where id = v_target.id;

  perform private.audit('society.ownership_transferred', 'society', p_society, p_society, null,
    jsonb_build_object('from', v_uid, 'to', p_new_owner));
  perform private.notify(p_new_owner, 'society.ownership', 'You are now the owner of ' || s.name,
    'Ownership of ' || s.name || ' was transferred to you.', '/manage/' || s.slug,
    'ownership:' || p_society || ':' || extract(epoch from now())::bigint, 'transactional');
end;
$$;
