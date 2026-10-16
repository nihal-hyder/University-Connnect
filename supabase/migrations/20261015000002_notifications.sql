-- =============================================================================
-- 0002 NOTIFICATIONS
-- In-app notifications plus a durable email outbox. Emails are never sent from
-- request handlers directly: business functions enqueue rows here and a
-- scheduled worker (/api/jobs/process) delivers them with retries.
-- =============================================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (char_length(type) <= 60),
  title text not null check (char_length(title) <= 200),
  body text check (char_length(body) <= 1000),
  link text check (link is null or link ~ '^/[^/]'),
  idempotency_key text unique,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  notification_id uuid references public.notifications (id) on delete set null,
  category public.email_category not null,
  template text not null check (char_length(template) <= 60),
  subject text not null check (char_length(subject) <= 200),
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null unique,
  status public.email_status not null default 'queued',
  attempts int not null default 0,
  max_attempts int not null default 5,
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  provider_message_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index email_outbox_due_idx on public.email_outbox (next_attempt_at) where status in ('queued', 'sending');
create trigger email_outbox_updated_at before update on public.email_outbox
  for each row execute function private.set_updated_at();

-- Record of each scheduled job run, for the admin health view.
create table public.job_runs (
  id bigint generated always as identity primary key,
  job text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  ok boolean,
  summary jsonb not null default '{}'::jsonb
);
create index job_runs_recent_idx on public.job_runs (job, started_at desc);

-- -----------------------------------------------------------------------------
-- private.notify: the single entry point for creating notifications.
--   * Always creates the in-app notification (idempotent on p_key).
--   * Queues an email when p_email_category is given and the recipient's
--     preferences allow it. Transactional email ignores promotional settings.
-- -----------------------------------------------------------------------------
create or replace function private.notify(
  p_user uuid,
  p_type text,
  p_title text,
  p_body text,
  p_link text,
  p_key text,
  p_email_category public.email_category default null,
  p_template text default 'generic',
  p_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_notification_id uuid;
  v_prefs public.user_preferences;
  v_send boolean := false;
  v_key text := coalesce(p_key, gen_random_uuid()::text);
begin
  if p_user is null then
    return;
  end if;

  insert into public.notifications (user_id, type, title, body, link, idempotency_key)
  values (p_user, p_type, p_title, p_body, p_link, v_key)
  on conflict (idempotency_key) do nothing
  returning id into v_notification_id;

  -- Already notified for this key: do not queue a duplicate email either.
  if v_notification_id is null or p_email_category is null then
    return;
  end if;

  select * into v_prefs from public.user_preferences where user_id = p_user;

  v_send := case p_email_category
    when 'transactional' then true
    when 'reminder' then coalesce(v_prefs.email_reminders, true)
    when 'promotional' then coalesce(v_prefs.email_recommendations, false)
  end;

  if v_send then
    insert into public.email_outbox (user_id, notification_id, category, template, subject, payload, idempotency_key)
    values (
      p_user, v_notification_id, p_email_category, p_template, p_title,
      coalesce(p_payload, '{}'::jsonb) || jsonb_build_object('body', p_body, 'link', p_link, 'title', p_title),
      'email:' || v_key
    )
    on conflict (idempotency_key) do nothing;
  end if;
end;
$$;
