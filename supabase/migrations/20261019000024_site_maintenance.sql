-- =============================================================================
-- 0024 SITE MAINTENANCE MODE
-- A single settings row. While maintenance is on, the proxy shows every
-- visitor except platform administrators the /maintenance page (HTTP 503).
-- Read through get_site_status() (anyone, including signed-out visitors);
-- changed only through admin_set_maintenance() (platform administrators).
-- =============================================================================

create table public.site_settings (
  id boolean primary key default true check (id),
  maintenance_enabled boolean not null default false,
  maintenance_message text check (char_length(maintenance_message) <= 500),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);
insert into public.site_settings (id) values (true) on conflict do nothing;

alter table public.site_settings enable row level security;
revoke all on public.site_settings from anon, authenticated;
-- No policies: only the functions below read or write it.

create or replace function public.get_site_status()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'maintenance', coalesce(s.maintenance_enabled, false),
    'message', s.maintenance_message,
    'updated_at', s.updated_at
  )
  from public.site_settings s
  where s.id;
$$;
revoke execute on function public.get_site_status() from public;
grant execute on function public.get_site_status() to anon, authenticated;

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
    maintenance_message = case when p_enabled then left(nullif(btrim(p_message), ''), 500) else maintenance_message end,
    updated_at = now(),
    updated_by = v_uid
  where id;
  perform private.audit(case when p_enabled then 'site.maintenance_on' else 'site.maintenance_off' end, 'site_settings', null,
    null, null, jsonb_build_object('message', nullif(btrim(p_message), '')));
end;
$$;
revoke execute on function public.admin_set_maintenance(boolean, text) from public, anon;
grant execute on function public.admin_set_maintenance(boolean, text) to authenticated;
