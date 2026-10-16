-- =============================================================================
-- 0025 SCHEDULED MAINTENANCE
-- Administrators can schedule maintenance in advance. Until the start time
-- every page shows a notice; from the start time the site is in maintenance
-- (get_site_status reports maintenance = true) until an admin brings it back.
-- =============================================================================

alter table public.site_settings add column maintenance_starts_at timestamptz;

create or replace function public.get_site_status()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'maintenance', s.maintenance_enabled or coalesce(s.maintenance_starts_at <= now(), false),
    'message', s.maintenance_message,
    'scheduled_at', case when not s.maintenance_enabled and s.maintenance_starts_at > now() then s.maintenance_starts_at end,
    'updated_at', s.updated_at
  )
  from public.site_settings s
  where s.id;
$$;

-- Switching maintenance on or off by hand also clears any schedule, so a past
-- start time can't keep the site down after an admin brings it back online.
create or replace function public.admin_set_maintenance(p_enabled boolean, p_message text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
begin
  if not private.is_platform_admin() then
    raise exception 'Only platform administrators can change site availability.' using errcode = '42501';
  end if;
  update public.site_settings set
    maintenance_enabled = coalesce(p_enabled, false),
    maintenance_starts_at = null,
    maintenance_message = case when p_enabled then left(nullif(btrim(p_message), ''), 500) else maintenance_message end,
    updated_at = now(),
    updated_by = v_uid
  where id;
  perform private.audit(case when p_enabled then 'site.maintenance_on' else 'site.maintenance_off' end, 'site_settings', null,
    null, null, jsonb_build_object('message', nullif(btrim(p_message), '')));
end;
$$;

-- Schedule (p_starts_at in the future) or cancel (p_starts_at null).
create or replace function public.admin_schedule_maintenance(p_starts_at timestamptz, p_message text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
begin
  if not private.is_platform_admin() then
    raise exception 'Only platform administrators can change site availability.' using errcode = '42501';
  end if;
  if p_starts_at is not null and p_starts_at <= now() + interval '1 minute' then
    raise exception 'Choose a start time in the future, or turn maintenance on now instead.' using errcode = '22023';
  end if;
  if p_starts_at > now() + interval '90 days' then
    raise exception 'Maintenance can be scheduled up to 90 days ahead.' using errcode = '22023';
  end if;
  update public.site_settings set
    maintenance_starts_at = p_starts_at,
    maintenance_message = case when p_starts_at is not null then left(nullif(btrim(p_message), ''), 500) else maintenance_message end,
    updated_at = now(),
    updated_by = v_uid
  where id and not maintenance_enabled;
  if not found then
    raise exception 'The site is already in maintenance mode.' using errcode = 'P0001';
  end if;
  perform private.audit(case when p_starts_at is null then 'site.maintenance_unscheduled' else 'site.maintenance_scheduled' end,
    'site_settings', null, null, null, jsonb_build_object('starts_at', p_starts_at, 'message', nullif(btrim(p_message), '')));
end;
$$;
revoke execute on function public.admin_schedule_maintenance(timestamptz, text) from public, anon;
grant execute on function public.admin_schedule_maintenance(timestamptz, text) to authenticated;
