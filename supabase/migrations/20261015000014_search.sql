-- =============================================================================
-- 0014 SEARCH
-- search_events: public discovery with combinable filters, full-text search,
-- sorting and pagination against real records. SECURITY INVOKER, and it also
-- filters to publicly visible events explicitly so organisers never see
-- drafts in search results.
-- =============================================================================

create or replace function private.to_prefix_tsquery(p_q text)
returns tsquery
language sql
immutable
set search_path = ''
as $$
  select case
    when coalesce(btrim(p_q), '') = '' then null
    else nullif(
      array_to_string(
        array(
          select t || ':*'
          from unnest(regexp_split_to_array(lower(regexp_replace(p_q, '[^[:alnum:][:space:]]+', ' ', 'g')), '\s+')) as t
          where char_length(t) > 0
          limit 8
        ),
        ' & '
      ),
      ''
    )::tsquery
  end;
$$;
grant execute on function private.to_prefix_tsquery(text) to anon, authenticated;

create or replace function public.search_events(
  p_q text default null,
  p_category text default null,
  p_type public.event_type default null,
  p_university uuid default null,
  p_campus uuid default null,
  p_city smallint default null,
  p_format public.event_format default null,
  p_from date default null,
  p_to date default null,
  p_free boolean default null,
  p_open_only boolean default false,
  p_eligible_for uuid default null,
  p_scope public.eligibility_scope default null,
  p_society uuid default null,
  p_volunteering boolean default false,
  p_include_past boolean default false,
  p_sort text default 'soonest',
  p_limit int default 12,
  p_offset int default 0
)
returns table (
  id uuid,
  slug text,
  title text,
  summary text,
  cover_path text,
  event_type public.event_type,
  category_name text,
  category_slug text,
  starts_at timestamptz,
  ends_at timestamptz,
  timezone text,
  format public.event_format,
  venue text,
  city_name text,
  university_name text,
  university_short text,
  society_name text,
  society_slug text,
  society_logo text,
  is_free boolean,
  fee_amount numeric,
  fee_currency text,
  capacity int,
  confirmed_count int,
  registration_mode public.registration_mode,
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  waitlist_enabled boolean,
  schedule_status public.event_schedule_status,
  eligibility_scope public.eligibility_scope,
  volunteer_recruitment_open boolean,
  open_roles int,
  is_demo boolean,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (select private.to_prefix_tsquery(p_q) as tsq)
  select
    e.id, e.slug, e.title, e.summary, e.cover_path, e.event_type,
    c.name, c.slug, e.starts_at, e.ends_at, e.timezone, e.format, e.venue,
    ci.name, u.name, u.short_name, s.name, s.slug, s.logo_path,
    e.is_free, e.fee_amount, e.fee_currency, e.capacity, e.confirmed_count,
    e.registration_mode, e.registration_opens_at, e.registration_closes_at, e.waitlist_enabled,
    e.schedule_status, e.eligibility_scope, e.volunteer_recruitment_open,
    (select count(*)::int from public.volunteer_roles r where r.event_id = e.id and r.status = 'open'
       and (r.application_deadline is null or r.application_deadline > now())),
    e.is_demo,
    count(*) over ()
  from public.events e
  cross join q
  join public.societies s on s.id = e.society_id and s.status = 'active'
  left join public.event_categories c on c.id = e.category_id
  left join public.universities u on u.id = e.university_id
  left join public.cities ci on ci.id = e.city_id
  where e.status = 'published'
    and (e.publish_at is null or e.publish_at <= now())
    and (p_include_past or e.ends_at > now())
    and (q.tsq is null or e.search @@ q.tsq or e.title ilike '%' || btrim(p_q) || '%' or s.name ilike '%' || btrim(p_q) || '%')
    and (p_category is null or c.slug = p_category)
    and (p_type is null or e.event_type = p_type)
    and (p_university is null or e.university_id = p_university)
    and (p_campus is null or e.campus_id = p_campus)
    and (p_city is null or e.city_id = p_city)
    and (p_format is null or e.format = p_format)
    and (p_from is null or e.ends_at >= (p_from::timestamp at time zone 'Asia/Karachi'))
    and (p_to is null or e.starts_at < ((p_to + 1)::timestamp at time zone 'Asia/Karachi'))
    and (p_free is null or e.is_free = p_free)
    and (p_society is null or e.society_id = p_society)
    and (p_scope is null or e.eligibility_scope = p_scope)
    and (
      p_eligible_for is null
      or e.eligibility_scope = 'open'
      or (e.eligibility_scope = 'host_university' and e.university_id = p_eligible_for)
      or (e.eligibility_scope = 'selected_universities' and exists (
            select 1 from public.event_target_universities t where t.event_id = e.id and t.university_id = p_eligible_for))
    )
    and (
      not p_open_only
      or (
        e.schedule_status = 'scheduled'
        and e.registration_mode in ('individual', 'team', 'external')
        and (e.registration_opens_at is null or e.registration_opens_at <= now())
        and coalesce(e.registration_closes_at, e.starts_at) > now()
        and (e.capacity is null or e.confirmed_count < e.capacity or e.waitlist_enabled or e.registration_mode = 'external')
      )
    )
    and (
      not p_volunteering
      or (e.volunteer_recruitment_open and exists (
            select 1 from public.volunteer_roles r where r.event_id = e.id and r.status = 'open'
              and (r.application_deadline is null or r.application_deadline > now())))
    )
  order by
    case when p_sort = 'relevance' and q.tsq is not null then ts_rank(e.search, q.tsq) end desc nulls last,
    case when p_sort = 'newest' then e.published_at end desc nulls last,
    case when p_sort = 'deadline' then coalesce(e.registration_closes_at, e.starts_at) end asc nulls last,
    e.starts_at asc nulls last,
    e.id
  limit least(greatest(p_limit, 1), 48)
  offset greatest(p_offset, 0);
$$;

grant execute on function public.search_events(
  text, text, public.event_type, uuid, uuid, smallint, public.event_format, date, date, boolean, boolean,
  uuid, public.eligibility_scope, uuid, boolean, boolean, text, int, int
) to anon, authenticated;
