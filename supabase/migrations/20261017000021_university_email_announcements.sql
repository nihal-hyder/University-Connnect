-- =============================================================================
-- 0021 UNIVERSITY-EMAIL EVENTS AND ORGANISER ANNOUNCEMENTS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Verified university email. Auth emails are verified at sign-up, so a
--    matching domain proves the person controls an institutional mailbox.
-- -----------------------------------------------------------------------------
create or replace function private.email_domain_matches(p_email text, p_domains text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_email, '') like '%@%' and exists (
    select 1 from unnest(coalesce(p_domains, '{}')) d
    where lower(split_part(p_email, '@', 2)) = lower(d)
       or lower(split_part(p_email, '@', 2)) like '%.' || lower(d)
  );
$$;

alter table public.events add column require_university_email boolean not null default false;
grant select (require_university_email), insert (require_university_email), update (require_university_email)
  on public.events to authenticated;
grant select (require_university_email) on public.events to anon;

-- Enforced on every new registration, whatever path created it.
create or replace function private.registrations_university_email_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.events;
  v_email text;
  v_ok boolean;
begin
  select * into e from public.events where id = new.event_id;
  if not e.require_university_email then
    return new;
  end if;
  select contact_email::text into v_email from public.profiles where id = new.user_id;
  v_ok := case e.eligibility_scope
    when 'host_university' then exists (
      select 1 from public.universities u where u.id = e.university_id and private.email_domain_matches(v_email, u.email_domains))
    when 'selected_universities' then exists (
      select 1 from public.event_target_universities t join public.universities u on u.id = t.university_id
      where t.event_id = e.id and private.email_domain_matches(v_email, u.email_domains))
    else exists (
      select 1 from public.universities u where u.is_active and private.email_domain_matches(v_email, u.email_domains))
  end;
  if not v_ok then
    raise exception 'This event only accepts registrations from verified university email addresses. Sign up with your university email to register.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger registrations_university_email_guard
  before insert on public.registrations
  for each row execute function private.registrations_university_email_guard();

-- -----------------------------------------------------------------------------
-- 2. Announcements from organisers to an event's participants.
-- -----------------------------------------------------------------------------
create table public.event_announcements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  audience text not null check (audience in (
    'all_registrants', 'confirmed', 'waitlisted', 'pending', 'accepted_volunteers', 'all_volunteers', 'shift'
  )),
  shift_id uuid references public.volunteer_shifts (id) on delete set null,
  title text not null check (char_length(title) between 3 and 120),
  body text not null check (char_length(body) between 5 and 2000),
  send_email boolean not null default false,
  recipients int not null default 0,
  created_at timestamptz not null default now()
);
create index event_announcements_event_idx on public.event_announcements (event_id, created_at desc);
alter table public.event_announcements enable row level security;
revoke all on public.event_announcements from anon, authenticated;
grant select on public.event_announcements to authenticated;
create policy "announcements visible to organisers" on public.event_announcements for select to authenticated
  using (private.event_permission(event_id, 'view_society'));

create or replace function public.send_event_announcement(
  p_event uuid,
  p_audience text,
  p_title text,
  p_body text,
  p_send_email boolean default false,
  p_shift uuid default null
)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  e public.events;
  v_id uuid;
  v_count int := 0;
  r record;
  v_volunteer boolean := p_audience in ('accepted_volunteers', 'all_volunteers', 'shift');
begin
  select * into e from public.events where id = p_event;
  if e.id is null then
    raise exception 'Event not found.' using errcode = 'P0002';
  end if;
  -- Host society only: registrant messages need manage_registrations,
  -- volunteer messages need manage_volunteers.
  if not private.has_society_permission(e.society_id, case when v_volunteer then 'manage_volunteers' else 'manage_registrations' end) then
    raise exception 'You do not have permission to message these participants.' using errcode = '42501';
  end if;
  if p_audience not in ('all_registrants', 'confirmed', 'waitlisted', 'pending', 'accepted_volunteers', 'all_volunteers', 'shift') then
    raise exception 'Choose who should receive the announcement.' using errcode = '22023';
  end if;
  if p_audience = 'shift' and not exists (select 1 from public.volunteer_shifts s where s.id = p_shift and s.event_id = e.id) then
    raise exception 'Choose a shift of this event.' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_title, ''))) < 3 or char_length(btrim(coalesce(p_body, ''))) < 5 then
    raise exception 'Write a title and a message.' using errcode = '22023';
  end if;
  perform private.enforce_rate_limit('announce:' || v_uid, 10, 3600);

  insert into public.event_announcements (event_id, author_id, audience, shift_id, title, body, send_email)
  values (e.id, v_uid, p_audience, case when p_audience = 'shift' then p_shift end, btrim(p_title), btrim(p_body), coalesce(p_send_email, false))
  returning id into v_id;

  for r in
    select distinct x.user_id from (
      select reg.user_id from public.registrations reg
      where reg.event_id = e.id and not v_volunteer and (
        (p_audience = 'all_registrants' and reg.status in ('confirmed', 'pending', 'waitlisted'))
        or reg.status::text = p_audience)
      union all
      select a.user_id from public.volunteer_applications a
      where a.event_id = e.id and p_audience = 'accepted_volunteers' and a.status = 'accepted'
      union all
      select a.user_id from public.volunteer_applications a
      where a.event_id = e.id and p_audience = 'all_volunteers'
        and a.status in ('submitted', 'under_review', 'shortlisted', 'interview_requested', 'offered', 'waitlisted', 'accepted')
      union all
      select a.user_id from public.volunteer_shift_assignments sa
      join public.volunteer_applications a on a.id = sa.application_id
      where p_audience = 'shift' and sa.shift_id = p_shift and a.status = 'accepted'
    ) x
  loop
    perform private.notify(
      r.user_id, 'event.announcement', e.title || ': ' || btrim(p_title), btrim(p_body), '/events/' || e.slug,
      'announce:' || v_id || ':' || r.user_id,
      case when p_send_email then 'reminder'::public.email_category end
    );
    v_count := v_count + 1;
  end loop;

  update public.event_announcements set recipients = v_count where id = v_id;
  perform private.audit('event.announcement', 'event', e.id, e.society_id, e.id,
    jsonb_build_object('audience', p_audience, 'recipients', v_count, 'email', p_send_email));
  return v_count;
end;
$$;
revoke execute on function public.send_event_announcement(uuid, text, text, text, boolean, uuid) from public, anon;
grant execute on function public.send_event_announcement(uuid, text, text, text, boolean, uuid) to authenticated;
