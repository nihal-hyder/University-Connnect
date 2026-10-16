-- =============================================================================
-- DEVELOPMENT SEED DATA — LOCAL USE ONLY
-- Loaded by `supabase db reset` (see config.toml [db.seed]). It is NOT a
-- migration and is never applied to production by `supabase db push`.
--
-- Every society and event here is flagged is_demo = true and is shown in the
-- UI with a "Sample listing" label. None of these are real events, and the
-- societies are fictional organisations attached to real universities only so
-- that filters can be exercised.
--
-- Demo accounts (password for all: DemoPass123)
--   admin@example.com        platform administrator
--   ayesha@example.com       student (NUST)
--   bilal@example.com        student (FAST-NUCES Lahore)
--   sara@example.com         owner, Computing & AI Society (NUST)
--   hamza@example.com        volunteer coordinator, Computing & AI Society
--   zainab@example.com       owner, Entrepreneurship Club (LUMS)
--   omar@example.com         owner, Robotics Circle (UET Lahore)
--   fatima@example.com       owner, Community Service Society (FAST Lahore)
--   hina@example.com         owner, Literary & Arts Society (Habib)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------
do $$
declare
  u record;
begin
  for u in
    select * from (values
      ('00000000-0000-4000-8000-000000000001'::uuid, 'admin@example.com', 'Platform Admin'),
      ('00000000-0000-4000-8000-000000000002'::uuid, 'ayesha@example.com', 'Ayesha Khan'),
      ('00000000-0000-4000-8000-000000000003'::uuid, 'bilal@example.com', 'Bilal Ahmed'),
      ('00000000-0000-4000-8000-000000000004'::uuid, 'sara@example.com', 'Sara Malik'),
      ('00000000-0000-4000-8000-000000000005'::uuid, 'hamza@example.com', 'Hamza Qureshi'),
      ('00000000-0000-4000-8000-000000000006'::uuid, 'zainab@example.com', 'Zainab Hussain'),
      ('00000000-0000-4000-8000-000000000007'::uuid, 'omar@example.com', 'Omar Farooq'),
      ('00000000-0000-4000-8000-000000000008'::uuid, 'fatima@example.com', 'Fatima Raza'),
      ('00000000-0000-4000-8000-000000000009'::uuid, 'hina@example.com', 'Hina Siddiqui')
    ) as t(id, email, name)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
      extensions.crypt('DemoPass123', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', u.name), now(), now(),
      '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), u.id, u.id::text, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
            'email', now(), now(), now());
  end loop;
end;
$$;

insert into public.platform_admins (user_id, note) values ('00000000-0000-4000-8000-000000000001', 'Local development administrator');

-- Profiles (rows were created by the auth trigger; fill in details)
update public.profiles p set
  university_id = (select id from public.universities where slug = x.uni),
  campus_id = (select c.id from public.campuses c join public.universities u on u.id = c.university_id where u.slug = x.uni and c.name = x.campus),
  program = x.program,
  academic_level = x.level::public.academic_level,
  graduation_year = x.grad,
  city_id = (select id from public.cities where name = x.city),
  onboarded_at = now()
from (values
  ('00000000-0000-4000-8000-000000000002'::uuid, 'nust', 'H-12 Main Campus', 'BS Computer Science', 'undergraduate', 2027, 'Islamabad'),
  ('00000000-0000-4000-8000-000000000003'::uuid, 'fast-nuces', 'Lahore Campus', 'BS Software Engineering', 'undergraduate', 2026, 'Lahore'),
  ('00000000-0000-4000-8000-000000000004'::uuid, 'nust', 'H-12 Main Campus', 'BS Electrical Engineering', 'undergraduate', 2026, 'Islamabad'),
  ('00000000-0000-4000-8000-000000000005'::uuid, 'nust', 'H-12 Main Campus', 'BS Computer Science', 'undergraduate', 2027, 'Islamabad'),
  ('00000000-0000-4000-8000-000000000006'::uuid, 'lums', 'Main Campus, DHA', 'BSc Management Science', 'undergraduate', 2026, 'Lahore'),
  ('00000000-0000-4000-8000-000000000007'::uuid, 'uet-lahore', 'Main Campus', 'BSc Mechatronics', 'undergraduate', 2027, 'Lahore'),
  ('00000000-0000-4000-8000-000000000008'::uuid, 'fast-nuces', 'Lahore Campus', 'BS Computer Science', 'undergraduate', 2026, 'Lahore'),
  ('00000000-0000-4000-8000-000000000009'::uuid, 'habib-university', 'Main Campus', 'BA Comparative Liberal Studies', 'undergraduate', 2027, 'Karachi')
) as x(id, uni, campus, program, level, grad, city)
where p.id = x.id;

insert into public.profile_interests (profile_id, category_id)
select '00000000-0000-4000-8000-000000000002', id from public.event_categories where slug in ('software-ai', 'cybersecurity', 'social-impact');
insert into public.profile_interests (profile_id, category_id)
select '00000000-0000-4000-8000-000000000003', id from public.event_categories where slug in ('software-ai', 'business-entrepreneurship', 'robotics-engineering');

-- ---------------------------------------------------------------------------
-- Societies (fictional, flagged as sample data)
-- ---------------------------------------------------------------------------
insert into public.societies (id, slug, name, university_id, campus_id, scope_label, category_id, description,
                              website_url, social_links, public_contact_email, verified_at, events_require_review, is_demo)
values
  ('00000000-0000-4000-8000-0000000000a1', 'computing-ai-society-nust', 'Computing & AI Society',
    (select id from public.universities where slug = 'nust'),
    (select id from public.campuses where name = 'H-12 Main Campus'),
    'University-wide', (select id from public.event_categories where slug = 'software-ai'),
    'A student-run society for people who like to build things with code. We run beginner workshops every month, an annual hackathon, and reading groups on machine learning and systems. Sample organisation for local development.',
    'https://example.com', '[{"label":"Instagram","url":"https://instagram.com/example"}]', 'computing@example.com', now(), false, true),
  ('00000000-0000-4000-8000-0000000000a2', 'entrepreneurship-club-lums', 'Entrepreneurship & Business Club',
    (select id from public.universities where slug = 'lums'),
    (select id from public.campuses where name = 'Main Campus, DHA'),
    'University-wide', (select id from public.event_categories where slug = 'business-entrepreneurship'),
    'We help students test business ideas early: pitch clinics, founder fireside chats and an inter-university case competition. Sample organisation for local development.',
    'https://example.com', '[]', 'business@example.com', now(), false, true),
  ('00000000-0000-4000-8000-0000000000a3', 'robotics-circle-uet', 'Robotics Circle',
    (select id from public.universities where slug = 'uet-lahore'),
    (select c.id from public.campuses c join public.universities u on u.id = c.university_id where u.slug = 'uet-lahore' limit 1),
    'Department of Mechatronics', (select id from public.event_categories where slug = 'robotics-engineering'),
    'Hands-on robotics: line followers, robo-wars and embedded systems sessions in the lab every Thursday. Sample organisation for local development.',
    null, '[]', null, now(), true, true),
  ('00000000-0000-4000-8000-0000000000a4', 'community-service-society-fast', 'Community Service Society',
    (select id from public.universities where slug = 'fast-nuces'),
    (select id from public.campuses where name = 'Lahore Campus' and university_id = (select id from public.universities where slug = 'fast-nuces')),
    'Lahore Campus', (select id from public.event_categories where slug = 'social-impact'),
    'Volunteer drives, tutoring programmes and blood donation camps run by students, for the city around our campus. Sample organisation for local development.',
    null, '[]', 'service@example.com', now(), false, true),
  ('00000000-0000-4000-8000-0000000000a5', 'literary-arts-society-habib', 'Literary & Arts Society',
    (select id from public.universities where slug = 'habib-university'),
    (select c.id from public.campuses c join public.universities u on u.id = c.university_id where u.slug = 'habib-university' limit 1),
    'University-wide', (select id from public.event_categories where slug = 'literature-writing'),
    'Readings, mushairas, zine-making and an annual cultural evening. Sample organisation for local development.',
    null, '[]', null, now(), false, true);

insert into public.society_memberships (society_id, user_id, role, title) values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000004', 'owner', 'President'),
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000005', 'volunteer_coordinator', 'Volunteer Lead'),
  ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-000000000006', 'owner', 'President'),
  ('00000000-0000-4000-8000-0000000000a3', '00000000-0000-4000-8000-000000000007', 'owner', 'Chair'),
  ('00000000-0000-4000-8000-0000000000a4', '00000000-0000-4000-8000-000000000008', 'owner', 'President'),
  ('00000000-0000-4000-8000-0000000000a5', '00000000-0000-4000-8000-000000000009', 'owner', 'President');

-- A pending society application for the admin review queue.
insert into public.society_applications (applicant_id, status, name, university_id, scope_label, category_id, description,
  contact_email, president_name, applicant_role, recognition_details, team_size, submitted_at)
values ('00000000-0000-4000-8000-000000000002', 'submitted', 'Cyber Security Club',
  (select id from public.universities where slug = 'nust'), 'University-wide',
  (select id from public.event_categories where slug = 'cybersecurity'),
  'A new club for capture-the-flag practice, security talks and responsible-disclosure workshops for students of all departments.',
  'ayesha@example.com', 'Ayesha Khan', 'Founding president',
  'Registered with the student affairs office this semester; faculty advisor confirmed.', 12, now() - interval '1 day');

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------
create temporary table demo_events (key text primary key, id uuid);

with ins as (
  insert into public.events (
    society_id, slug, title, summary, description, agenda, speakers, tags, category_id, event_type,
    starts_at, ends_at, format, university_id, campus_id, city_id, venue, online_url, accessibility_info,
    eligibility_scope, eligible_levels, eligibility_notes, registration_mode, requires_approval, capacity, waitlist_enabled,
    team_min, team_max, registration_opens_at, registration_closes_at, terms_text,
    is_free, fee_amount, fee_description, payment_instructions, payment_url, refund_policy,
    contact_email, volunteer_recruitment_open, status, schedule_status, schedule_note, published_at, submitted_at, is_demo
  )
  select * from (values
    -- 1. Hackathon
    ('00000000-0000-4000-8000-0000000000a1'::uuid, 'build-for-pakistan-hackathon', 'Build for Pakistan Hackathon',
     '36 hours, teams of 2–4, building tools for fintech, climate, education and health in Pakistan.',
     E'A weekend for building software that solves a real local problem. Teams pick one of four tracks, get mentoring from working engineers, and demo to a panel on Sunday afternoon.\n\nBeginners are welcome — we run a Saturday-morning crash course on Git and deployment. Meals, a quiet room and overnight space are provided on campus.',
     '[{"time":"Sat 9:00 am","title":"Check-in and breakfast"},{"time":"Sat 10:30 am","title":"Opening and track briefings"},{"time":"Sat 11:00 am","title":"Hacking begins"},{"time":"Sun 2:00 pm","title":"Submissions close"},{"time":"Sun 3:00 pm","title":"Demos and judging"},{"time":"Sun 6:00 pm","title":"Awards"}]'::jsonb,
     '[{"name":"Mentors from local engineering teams","title":"Announced closer to the event"}]'::jsonb,
     array['hackathon','fintech','climate','beginner friendly'],
     (select id from public.event_categories where slug = 'software-ai'), 'hackathon'::public.event_type,
     date_trunc('day', now()) + interval '21 days 4 hours', date_trunc('day', now()) + interval '22 days 13 hours',
     'in_person'::public.event_format, (select id from public.universities where slug = 'nust'),
     (select id from public.campuses where name = 'H-12 Main Campus'), (select id from public.cities where name = 'Islamabad'),
     'School of Electrical Engineering & CS, Main Hall', null::text,
     'Ground-floor hall with step-free access. Prayer room and quiet room available.',
     'open'::public.eligibility_scope, array['undergraduate','masters']::public.academic_level[], 'Open to students of any university in Pakistan.',
     'team'::public.registration_mode, false, 60, true, 2, 4, now() - interval '5 days', date_trunc('day', now()) + interval '18 days',
     'Participants must follow the event code of conduct. Photos may be taken during demos.',
     true, null::numeric, null::text, null::text, null::text, null::text,
     'computing@example.com', true, 'published'::public.event_status, 'scheduled'::public.event_schedule_status, null::text, now() - interval '5 days', now() - interval '5 days', true),
    -- 2. Robotics competition (paid)
    ('00000000-0000-4000-8000-0000000000a3', 'line-follower-challenge', 'Line-Follower Robotics Challenge',
     'Build a line-following robot and race the clock on a track with junctions and gaps.',
     E'An inter-university technical competition. Teams of up to three bring an autonomous robot that follows a black line across a track with sharp turns, junctions and gaps. Fastest valid run wins.\n\nTrack specification, robot size limits and judging rules are shared with registered teams.',
     '[{"time":"9:00 am","title":"Robot inspection"},{"time":"10:00 am","title":"Qualifying runs"},{"time":"2:00 pm","title":"Finals"},{"time":"4:30 pm","title":"Results"}]'::jsonb,
     '[]'::jsonb, array['robotics','embedded','competition'],
     (select id from public.event_categories where slug = 'robotics-engineering'), 'competition'::public.event_type,
     date_trunc('day', now()) + interval '35 days 4 hours', date_trunc('day', now()) + interval '35 days 12 hours',
     'in_person'::public.event_format, (select id from public.universities where slug = 'uet-lahore'),
     (select c.id from public.campuses c join public.universities u on u.id = c.university_id where u.slug = 'uet-lahore' limit 1),
     (select id from public.cities where name = 'Lahore'), 'Mechatronics Lab Block', null::text, null::text,
     'open'::public.eligibility_scope, array[]::public.academic_level[], null::text,
     'team'::public.registration_mode, false, 40, false, 1, 3, now() - interval '2 days', date_trunc('day', now()) + interval '30 days',
     null::text,
     false, 1500::numeric, 'PKR 1,500 per team, covering track time and lunch for team members.',
     'Pay by bank transfer after registering. Account details are emailed by the organisers. Bring your transfer receipt to inspection.',
     null::text, 'Fees are refundable until 7 days before the event. No refunds after robot inspection begins.',
     null::text, false, 'published'::public.event_status, 'scheduled'::public.event_schedule_status, null::text, now() - interval '2 days', now() - interval '2 days', true),
    -- 3. Seminar (hybrid)
    ('00000000-0000-4000-8000-0000000000a1', 'careers-in-cybersecurity-seminar', 'Careers in Cybersecurity',
     'Practitioners talk honestly about entry routes into security work — and what the job is actually like.',
     E'A two-hour seminar with a panel of security practitioners: a SOC analyst, a penetration tester and a privacy engineer. Bring questions about certifications, internships and building a portfolio.\n\nThe session is hybrid: join in the seminar room or online.',
     '[{"time":"4:00 pm","title":"Panel introductions"},{"time":"4:20 pm","title":"Discussion"},{"time":"5:15 pm","title":"Audience Q&A"}]'::jsonb,
     '[{"name":"Panel of three practitioners","title":"Names published a week before"}]'::jsonb,
     array['cybersecurity','careers','panel'],
     (select id from public.event_categories where slug = 'cybersecurity'), 'seminar'::public.event_type,
     date_trunc('day', now()) + interval '7 days 11 hours', date_trunc('day', now()) + interval '7 days 13 hours',
     'hybrid'::public.event_format, (select id from public.universities where slug = 'nust'),
     (select id from public.campuses where name = 'H-12 Main Campus'), (select id from public.cities where name = 'Islamabad'),
     'Seminar Room 2', 'https://meet.example.com/cyber-careers', null::text,
     'open'::public.eligibility_scope, array[]::public.academic_level[], null::text,
     'individual'::public.registration_mode, false, 120, true, null::int, null::int, now() - interval '3 days', date_trunc('day', now()) + interval '7 days 10 hours',
     null::text, true, null::numeric, null::text, null::text, null::text, null::text,
     'computing@example.com', false, 'published'::public.event_status, 'scheduled'::public.event_schedule_status, null::text, now() - interval '3 days', now() - interval '3 days', true),
    -- 4. Cultural festival (no registration, volunteers)
    ('00000000-0000-4000-8000-0000000000a5', 'spring-mushaira-cultural-evening', 'Mushaira & Cultural Evening',
     'An evening of Urdu poetry, qawwali and food stalls run by student societies.',
     E'Our annual cultural evening on the campus lawn. Student poets open the mushaira, followed by a qawwali performance and food stalls run by societies across campus.\n\nEntry is free and open to visitors from other universities with a student ID. No registration is needed.',
     '[{"time":"6:00 pm","title":"Food stalls open"},{"time":"7:00 pm","title":"Mushaira"},{"time":"9:00 pm","title":"Qawwali"}]'::jsonb,
     '[]'::jsonb, array['mushaira','poetry','qawwali','festival'],
     (select id from public.event_categories where slug = 'culture-festivals'), 'festival'::public.event_type,
     date_trunc('day', now()) + interval '45 days 13 hours', date_trunc('day', now()) + interval '45 days 18 hours',
     'in_person'::public.event_format, (select id from public.universities where slug = 'habib-university'),
     (select c.id from public.campuses c join public.universities u on u.id = c.university_id where u.slug = 'habib-university' limit 1),
     (select id from public.cities where name = 'Karachi'), 'Campus Lawn', null::text, 'Seating available. The lawn is step-free from the main gate.',
     'open'::public.eligibility_scope, array[]::public.academic_level[], 'Bring your student ID.',
     'none'::public.registration_mode, false, null::int, false, null::int, null::int, null::timestamptz, null::timestamptz,
     null::text, true, null::numeric, null::text, null::text, null::text, null::text,
     null::text, true, 'published'::public.event_status, 'scheduled'::public.event_schedule_status, null::text, now() - interval '1 day', now() - interval '1 day', true),
    -- 5. Workshop (approval required, host university only)
    ('00000000-0000-4000-8000-0000000000a2', 'pitch-deck-clinic', 'Pitch Deck Clinic',
     'Bring your startup idea and leave with a sharper ten-slide deck. Small group, mentor feedback.',
     E'A hands-on workshop for students with an early-stage idea. In the first hour we cover how investors and competition judges read a deck. Then you rework your own slides with feedback from a mentor in groups of five.\n\nPlaces are limited and approved by the organisers to keep groups small.',
     '[{"time":"2:00 pm","title":"What a deck needs to do"},{"time":"3:00 pm","title":"Small-group feedback"},{"time":"4:30 pm","title":"Lightning pitches"}]'::jsonb,
     '[]'::jsonb, array['startups','pitching','workshop'],
     (select id from public.event_categories where slug = 'business-entrepreneurship'), 'workshop'::public.event_type,
     date_trunc('day', now()) + interval '10 days 9 hours', date_trunc('day', now()) + interval '10 days 12 hours',
     'in_person'::public.event_format, (select id from public.universities where slug = 'lums'),
     (select id from public.campuses where name = 'Main Campus, DHA'), (select id from public.cities where name = 'Lahore'),
     'Academic Block, Room A-12', null::text, null::text,
     'host_university'::public.eligibility_scope, array[]::public.academic_level[], 'Open to students of the host university.',
     'individual'::public.registration_mode, true, 30, true, null::int, null::int, now() - interval '1 day', date_trunc('day', now()) + interval '8 days',
     null::text, true, null::numeric, null::text, null::text, null::text, null::text,
     'business@example.com', false, 'published'::public.event_status, 'scheduled'::public.event_schedule_status, null::text, now() - interval '1 day', now() - interval '1 day', true),
    -- 6. Volunteering drive
    ('00000000-0000-4000-8000-0000000000a4', 'winter-clothing-drive', 'Winter Clothing Drive',
     'A week of collecting, sorting and delivering warm clothes. Volunteers needed for every shift.',
     E'Every winter we collect warm clothing and blankets on campus and deliver them with partner community organisations. This year we need volunteers for collection points, sorting and packing, and outreach.\n\nYou do not need to register as an attendee — apply directly for a volunteer role below.',
     '[]'::jsonb, '[]'::jsonb, array['volunteering','community','winter'],
     (select id from public.event_categories where slug = 'social-impact'), 'other'::public.event_type,
     date_trunc('day', now()) + interval '12 days 4 hours', date_trunc('day', now()) + interval '18 days 12 hours',
     'in_person'::public.event_format, (select id from public.universities where slug = 'fast-nuces'),
     (select id from public.campuses where name = 'Lahore Campus' and university_id = (select id from public.universities where slug = 'fast-nuces')),
     (select id from public.cities where name = 'Lahore'), 'Main Gate collection point and Student Centre', null::text, null::text,
     'open'::public.eligibility_scope, array[]::public.academic_level[], null::text,
     'none'::public.registration_mode, false, null::int, false, null::int, null::int, null::timestamptz, null::timestamptz,
     null::text, true, null::numeric, null::text, null::text, null::text, null::text,
     'service@example.com', true, 'published'::public.event_status, 'scheduled'::public.event_schedule_status, null::text, now() - interval '4 days', now() - interval '4 days', true),
    -- 7. Case competition, deadline soon
    ('00000000-0000-4000-8000-0000000000a2', 'retail-case-competition', 'Case Competition: Retail in Pakistan',
     'Teams of 3–4 crack a live retail case and present to a judging panel. Registration closes soon.',
     E'An inter-university case competition. Teams receive the case 48 hours before the final and present a 10-minute recommendation followed by questions from the judges.\n\nThe case focuses on expanding a retail brand into secondary cities.',
     '[{"time":"10:00 am","title":"Final presentations"},{"time":"1:00 pm","title":"Lunch"},{"time":"3:00 pm","title":"Results"}]'::jsonb,
     '[]'::jsonb, array['case competition','strategy','retail'],
     (select id from public.event_categories where slug = 'business-entrepreneurship'), 'competition'::public.event_type,
     date_trunc('day', now()) + interval '14 days 5 hours', date_trunc('day', now()) + interval '14 days 11 hours',
     'in_person'::public.event_format, (select id from public.universities where slug = 'lums'),
     (select id from public.campuses where name = 'Main Campus, DHA'), (select id from public.cities where name = 'Lahore'),
     'Auditorium', null::text, null::text,
     'open'::public.eligibility_scope, array['undergraduate']::public.academic_level[], 'Undergraduate students only.',
     'team'::public.registration_mode, false, 32, true, 3, 4, now() - interval '10 days', now() + interval '40 hours',
     null::text, true, null::numeric, null::text, null::text, null::text, null::text,
     'business@example.com', false, 'published'::public.event_status, 'scheduled'::public.event_schedule_status, null::text, now() - interval '10 days', now() - interval '10 days', true),
    -- 8. Past workshop (for analytics and certificates)
    ('00000000-0000-4000-8000-0000000000a1', 'intro-to-git-workshop', 'Intro to Git & GitHub',
     'A beginner workshop on version control, branches and pull requests.',
     E'A two-hour beginner workshop. We cover commits, branches, merging and opening your first pull request on a shared practice repository.',
     '[]'::jsonb, '[]'::jsonb, array['git','beginner','workshop'],
     (select id from public.event_categories where slug = 'software-ai'), 'workshop'::public.event_type,
     date_trunc('day', now()) - interval '20 days' + interval '9 hours', date_trunc('day', now()) - interval '20 days' + interval '11 hours',
     'in_person'::public.event_format, (select id from public.universities where slug = 'nust'),
     (select id from public.campuses where name = 'H-12 Main Campus'), (select id from public.cities where name = 'Islamabad'),
     'Computer Lab 3', null::text, null::text,
     'open'::public.eligibility_scope, array[]::public.academic_level[], null::text,
     'individual'::public.registration_mode, false, 40, false, null::int, null::int, now() - interval '40 days', date_trunc('day', now()) - interval '21 days',
     null::text, true, null::numeric, null::text, null::text, null::text, null::text,
     'computing@example.com', false, 'published'::public.event_status, 'scheduled'::public.event_schedule_status, null::text, now() - interval '40 days', now() - interval '40 days', true),
    -- 9. Small workshop that is full (waitlist demo)
    ('00000000-0000-4000-8000-0000000000a1', 'data-visualisation-workshop', 'Data Visualisation with Python',
     'A small, hands-on lab on telling clear stories with charts. Currently full — join the waitlist.',
     E'A hands-on lab session on matplotlib and good chart design: choosing the right chart, colour, labelling and avoiding misleading axes. Bring a laptop with Python installed.',
     '[]'::jsonb, '[]'::jsonb, array['python','data','workshop'],
     (select id from public.event_categories where slug = 'data-science'), 'workshop'::public.event_type,
     date_trunc('day', now()) + interval '9 days 10 hours', date_trunc('day', now()) + interval '9 days 12 hours',
     'in_person'::public.event_format, (select id from public.universities where slug = 'nust'),
     (select id from public.campuses where name = 'H-12 Main Campus'), (select id from public.cities where name = 'Islamabad'),
     'Computer Lab 1', null::text, null::text,
     'open'::public.eligibility_scope, array[]::public.academic_level[], null::text,
     'individual'::public.registration_mode, false, 2, true, null::int, null::int, now() - interval '6 days', date_trunc('day', now()) + interval '9 days',
     null::text, true, null::numeric, null::text, null::text, null::text, null::text,
     'computing@example.com', false, 'published'::public.event_status, 'scheduled'::public.event_schedule_status, null::text, now() - interval '6 days', now() - interval '6 days', true),
    -- 10. Awaiting admin review
    ('00000000-0000-4000-8000-0000000000a3', 'robo-wars-exhibition', 'Robo Wars Exhibition Night',
     'Combat robots, built by students, in a safety-caged arena.',
     E'An exhibition evening of student-built combat robots in a caged arena, with safety officers on site. Spectators welcome; participating teams must pass a safety inspection.',
     '[]'::jsonb, '[]'::jsonb, array['robotics','exhibition'],
     (select id from public.event_categories where slug = 'robotics-engineering'), 'other'::public.event_type,
     date_trunc('day', now()) + interval '50 days 12 hours', date_trunc('day', now()) + interval '50 days 16 hours',
     'in_person'::public.event_format, (select id from public.universities where slug = 'uet-lahore'),
     (select c.id from public.campuses c join public.universities u on u.id = c.university_id where u.slug = 'uet-lahore' limit 1),
     (select id from public.cities where name = 'Lahore'), 'Sports Complex', null::text, null::text,
     'open'::public.eligibility_scope, array[]::public.academic_level[], null::text,
     'none'::public.registration_mode, false, null::int, false, null::int, null::int, null::timestamptz, null::timestamptz,
     null::text, true, null::numeric, null::text, null::text, null::text, null::text,
     null::text, false, 'pending_review'::public.event_status, 'scheduled'::public.event_schedule_status, null::text, null::timestamptz, now() - interval '6 hours', true),
    -- 11. Cancelled event
    ('00000000-0000-4000-8000-0000000000a4', 'blood-donation-camp', 'Blood Donation Camp',
     'A one-day donation camp with a partner blood bank.',
     E'A one-day blood donation camp on campus in partnership with a licensed blood bank. Donors are screened on site.',
     '[]'::jsonb, '[]'::jsonb, array['health','community'],
     (select id from public.event_categories where slug = 'health-medicine'), 'other'::public.event_type,
     date_trunc('day', now()) + interval '5 days 4 hours', date_trunc('day', now()) + interval '5 days 10 hours',
     'in_person'::public.event_format, (select id from public.universities where slug = 'fast-nuces'),
     (select id from public.campuses where name = 'Lahore Campus' and university_id = (select id from public.universities where slug = 'fast-nuces')),
     (select id from public.cities where name = 'Lahore'), 'Student Centre', null::text, null::text,
     'open'::public.eligibility_scope, array[]::public.academic_level[], null::text,
     'individual'::public.registration_mode, false, 100, false, null::int, null::int, now() - interval '8 days', date_trunc('day', now()) + interval '4 days',
     null::text, true, null::numeric, null::text, null::text, null::text, null::text,
     'service@example.com', false, 'published'::public.event_status, 'cancelled'::public.event_schedule_status,
     'The partner blood bank had to withdraw. We will announce a new date soon.', now() - interval '8 days', now() - interval '8 days', true)
  ) as v(
    society_id, slug, title, summary, description, agenda, speakers, tags, category_id, event_type,
    starts_at, ends_at, format, university_id, campus_id, city_id, venue, online_url, accessibility_info,
    eligibility_scope, eligible_levels, eligibility_notes, registration_mode, requires_approval, capacity, waitlist_enabled,
    team_min, team_max, registration_opens_at, registration_closes_at, terms_text,
    is_free, fee_amount, fee_description, payment_instructions, payment_url, refund_policy,
    contact_email, volunteer_recruitment_open, status, schedule_status, schedule_note, published_at, submitted_at, is_demo
  )
  returning id, slug
)
insert into demo_events (key, id) select slug, id from ins;

-- Collaboration: Community Service Society co-organises the hackathon.
insert into public.event_collaborations (event_id, society_id, status, can_manage_volunteers, can_check_in, responded_at)
values ((select id from demo_events where key = 'build-for-pakistan-hackathon'), '00000000-0000-4000-8000-0000000000a4', 'accepted', true, true, now());

-- Registration forms
insert into public.form_versions (event_id, version, fields)
values
  ((select id from demo_events where key = 'build-for-pakistan-hackathon'), 1,
   '[{"id":"portfolio","type":"url","label":"GitHub or portfolio link","required":false},
     {"id":"experience","type":"single_choice","label":"How much hackathon experience does your team have?","required":true,"options":["First hackathon","1–2 hackathons","3 or more"]},
     {"id":"track","type":"dropdown","label":"Preferred track","required":true,"options":["Fintech","Climate","Education","Health"]},
     {"id":"dietary","type":"short_text","label":"Dietary requirements (optional)","required":false},
     {"id":"conduct","type":"consent","label":"Our team agrees to follow the event code of conduct.","required":true}]'::jsonb),
  ((select id from demo_events where key = 'careers-in-cybersecurity-seminar'), 1,
   '[{"id":"attendance","type":"single_choice","label":"How will you attend?","required":true,"options":["In person","Online"]},
     {"id":"question","type":"long_text","label":"A question for the panel (optional)","required":false}]'::jsonb),
  ((select id from demo_events where key = 'pitch-deck-clinic'), 1,
   '[{"id":"idea","type":"long_text","label":"Describe your idea in a few sentences","required":true},
     {"id":"stage","type":"single_choice","label":"Stage","required":true,"options":["Idea","Prototype","Early users"]}]'::jsonb);

-- ---------------------------------------------------------------------------
-- Volunteer roles
-- ---------------------------------------------------------------------------
insert into public.volunteer_roles (event_id, assigned_society_id, title, description, responsibilities, positions, skills, eligibility,
  experience_level, time_commitment, schedule_notes, application_deadline, benefits, selection_process, sort_order)
values
  ((select id from demo_events where key = 'build-for-pakistan-hackathon'), null, 'Technical support volunteer',
   'Help teams with Wi-Fi, power, deployment issues and the submission portal.',
   'Staff the help desk in shifts; triage technical issues; escalate to mentors.', 6,
   array['Linux basics','Git','Networking'], 'Any university. Comfortable explaining technical problems.',
   'some', 'Two 6-hour shifts over the weekend', 'Shifts are assigned after selection.',
   date_trunc('day', now()) + interval '14 days', 'Volunteer certificate on completion; meals during shifts.', 'Short application review, then a 10-minute call.', 1),
  ((select id from demo_events where key = 'build-for-pakistan-hackathon'), null, 'Registration desk volunteer',
   'Welcome participants, check tickets and hand out badges.',
   'Check in teams using the scanner app; answer questions at the front desk.', 4,
   array['Communication'], 'Any university.', 'none', 'One 5-hour morning shift', null,
   date_trunc('day', now()) + interval '14 days', 'Volunteer certificate on completion.', 'Application review.', 2),
  ((select id from demo_events where key = 'build-for-pakistan-hackathon'), '00000000-0000-4000-8000-0000000000a4', 'Photography & social media',
   'Capture the weekend and post live updates.',
   'Photograph demos and the awards; post approved updates to social channels.', 3,
   array['Photography','Canva or Figma'], 'Bring your own camera or a recent phone.', 'some', 'Flexible, about 8 hours total', null,
   date_trunc('day', now()) + interval '14 days', 'Photo credit on published images; certificate on completion.', 'Portfolio review.', 3),
  ((select id from demo_events where key = 'winter-clothing-drive'), null, 'Collection point volunteer',
   'Staff a collection point and log donations.', 'Receive donations, keep the log sheet, keep the point tidy.', 20,
   array[]::text[], 'Any university.', 'none', 'At least two 3-hour shifts during the week', 'Morning and afternoon shifts available.',
   date_trunc('day', now()) + interval '10 days', 'Certificate on completion.', 'First come, first reviewed.', 1),
  ((select id from demo_events where key = 'winter-clothing-drive'), null, 'Sorting & packing volunteer',
   'Sort donations by size and condition and pack them for delivery.', 'Sort, label and pack donation bags.', 15,
   array[]::text[], 'Any university.', 'none', 'One 4-hour shift', null,
   date_trunc('day', now()) + interval '10 days', 'Certificate on completion.', 'Application review.', 2),
  ((select id from demo_events where key = 'winter-clothing-drive'), null, 'Outreach & logistics coordinator',
   'Coordinate pickups and deliveries with partner organisations.', 'Plan routes, confirm pickups, keep the team informed.', 4,
   array['Organisation','Communication'], 'Some event or society experience preferred.', 'experienced', 'About 10 hours across the week', null,
   date_trunc('day', now()) + interval '8 days', 'Certificate on completion; reference letter on request.', 'Application review and a short interview.', 3),
  ((select id from demo_events where key = 'spring-mushaira-cultural-evening'), null, 'Stage management volunteer',
   'Keep the programme running on time backstage.', 'Cue performers, manage microphones and seating for poets.', 5,
   array['Calm under pressure'], 'Any university.', 'none', '6:00 pm – 10:30 pm on the night, plus one rehearsal', null,
   date_trunc('day', now()) + interval '38 days', 'Certificate on completion.', 'Application review.', 1),
  ((select id from demo_events where key = 'intro-to-git-workshop'), null, 'Lab assistant',
   'Help participants get unstuck during the hands-on part.', 'Walk around the lab and help with Git issues.', 3,
   array['Git'], 'Any university.', 'some', '2.5 hours', null, null, 'Certificate on completion.', 'Application review.', 1);

insert into public.form_versions (volunteer_role_id, version, fields)
select r.id, 1,
  '[{"id":"motivation","type":"long_text","label":"Why would you like to volunteer for this role?","required":true},
    {"id":"availability","type":"multiple_choice","label":"When are you available?","required":true,"options":["Weekday mornings","Weekday afternoons","Weekends"]},
    {"id":"phone","type":"short_text","label":"Phone number for shift coordination","required":true}]'::jsonb
from public.volunteer_roles r;

-- ---------------------------------------------------------------------------
-- Registrations, tickets, attendance
-- ---------------------------------------------------------------------------
insert into public.registrations (event_id, user_id, status, reference_code, form_version_id, answers, team_name, team_members)
values
  ((select id from demo_events where key = 'build-for-pakistan-hackathon'), '00000000-0000-4000-8000-000000000002', 'confirmed', 'R-DEMO001',
   (select id from public.form_versions where event_id = (select id from demo_events where key = 'build-for-pakistan-hackathon')),
   '{"experience":"1–2 hackathons","track":"Climate","conduct":true}', 'Team Monsoon',
   '[{"name":"Ali Raza","email":"ali@example.com"},{"name":"Mahnoor Iqbal","email":"mahnoor@example.com"}]'),
  ((select id from demo_events where key = 'build-for-pakistan-hackathon'), '00000000-0000-4000-8000-000000000003', 'confirmed', 'R-DEMO002',
   (select id from public.form_versions where event_id = (select id from demo_events where key = 'build-for-pakistan-hackathon')),
   '{"experience":"First hackathon","track":"Education","conduct":true}', 'Chai & Code',
   '[{"name":"Usman Tariq","email":"usman@example.com"}]'),
  ((select id from demo_events where key = 'careers-in-cybersecurity-seminar'), '00000000-0000-4000-8000-000000000002', 'confirmed', 'R-DEMO003',
   (select id from public.form_versions where event_id = (select id from demo_events where key = 'careers-in-cybersecurity-seminar')),
   '{"attendance":"In person"}', null, '[]'),
  ((select id from demo_events where key = 'data-visualisation-workshop'), '00000000-0000-4000-8000-000000000004', 'confirmed', 'R-DEMO004', null, '{}', null, '[]'),
  ((select id from demo_events where key = 'data-visualisation-workshop'), '00000000-0000-4000-8000-000000000005', 'confirmed', 'R-DEMO005', null, '{}', null, '[]'),
  ((select id from demo_events where key = 'data-visualisation-workshop'), '00000000-0000-4000-8000-000000000003', 'waitlisted', 'R-DEMO006', null, '{}', null, '[]'),
  ((select id from demo_events where key = 'intro-to-git-workshop'), '00000000-0000-4000-8000-000000000002', 'confirmed', 'R-DEMO007', null, '{}', null, '[]'),
  ((select id from demo_events where key = 'intro-to-git-workshop'), '00000000-0000-4000-8000-000000000003', 'confirmed', 'R-DEMO008', null, '{}', null, '[]'),
  ((select id from demo_events where key = 'intro-to-git-workshop'), '00000000-0000-4000-8000-000000000009', 'cancelled', 'R-DEMO009', null, '{}', null, '[]'),
  ((select id from demo_events where key = 'pitch-deck-clinic'), '00000000-0000-4000-8000-000000000006', 'pending', 'R-DEMO010',
   (select id from public.form_versions where event_id = (select id from demo_events where key = 'pitch-deck-clinic')),
   '{"idea":"A marketplace connecting home bakers with office catering orders.","stage":"Prototype"}', null, '[]');

insert into public.tickets (registration_id, event_id, code)
select r.id, r.event_id, 'demo-ticket-' || lower(r.reference_code) || '-' || substr(md5(r.id::text), 1, 8)
from public.registrations r where r.status = 'confirmed';

insert into public.attendance_records (event_id, registration_id, ticket_id, method, checked_in_by, checked_in_at)
select r.event_id, r.id, t.id, 'qr', '00000000-0000-4000-8000-000000000004', e.starts_at + interval '10 minutes'
from public.registrations r
join public.tickets t on t.registration_id = r.id
join public.events e on e.id = r.event_id
where e.slug = 'intro-to-git-workshop' and r.status = 'confirmed';

-- Anonymous visitor counts (sample) for analytics charts
insert into public.event_daily_visitors (event_id, day, visitor_hash)
select e.id, (now() at time zone 'Asia/Karachi')::date - d, md5(e.id::text || d::text || n::text)
from public.events e
cross join generate_series(0, 13) d
cross join generate_series(1, 6) n
where e.is_demo and e.status = 'published' and (n + d) % 3 <> 0;

-- ---------------------------------------------------------------------------
-- Volunteer applications in a range of states
-- ---------------------------------------------------------------------------
insert into public.volunteer_applications (role_id, event_id, user_id, status, reference_code, form_version_id, answers, offered_at, offer_message, completed_at)
select r.id, r.event_id, x.user_id::uuid, x.status::public.volunteer_application_status, x.ref,
       (select id from public.form_versions where volunteer_role_id = r.id),
       '{"motivation":"I enjoy helping events run smoothly and want to meet people from other universities.","availability":["Weekends"],"phone":"0300 0000000"}',
       case when x.status in ('offered', 'accepted', 'completed') then now() - interval '2 days' end,
       case when x.status in ('offered', 'accepted', 'completed') then 'We would love to have you on the team.' end,
       case when x.status = 'completed' then now() - interval '19 days' end
from (values
  ('Technical support volunteer', 'build-for-pakistan-hackathon', '00000000-0000-4000-8000-000000000003', 'offered', 'V-DEMO001'),
  ('Registration desk volunteer', 'build-for-pakistan-hackathon', '00000000-0000-4000-8000-000000000002', 'under_review', 'V-DEMO002'),
  ('Photography & social media', 'build-for-pakistan-hackathon', '00000000-0000-4000-8000-000000000009', 'shortlisted', 'V-DEMO003'),
  ('Collection point volunteer', 'winter-clothing-drive', '00000000-0000-4000-8000-000000000002', 'accepted', 'V-DEMO004'),
  ('Lab assistant', 'intro-to-git-workshop', '00000000-0000-4000-8000-000000000003', 'completed', 'V-DEMO005')
) as x(role_title, event_slug, user_id, status, ref)
join public.volunteer_roles r on r.title = x.role_title
join public.events e on e.id = r.event_id and e.slug = x.event_slug;

insert into public.volunteer_status_history (application_id, from_status, to_status, actor_id, created_at)
select a.id, null, 'submitted', a.user_id, a.created_at - interval '3 days' from public.volunteer_applications a;
insert into public.volunteer_status_history (application_id, from_status, to_status, actor_id, message, created_at)
select a.id, 'submitted', a.status, '00000000-0000-4000-8000-000000000005', a.offer_message, now() - interval '2 days'
from public.volunteer_applications a where a.status <> 'submitted';

insert into public.volunteer_shifts (role_id, title, starts_at, ends_at, location, instructions)
select r.id, 'Monday morning — Main Gate', e.starts_at, e.starts_at + interval '3 hours', 'Main Gate collection point',
       'Arrive 15 minutes early and collect your volunteer lanyard from the Student Centre.'
from public.volunteer_roles r join public.events e on e.id = r.event_id
where r.title = 'Collection point volunteer';

insert into public.volunteer_shift_assignments (shift_id, application_id)
select s.id, a.id from public.volunteer_shifts s
join public.volunteer_applications a on a.role_id = s.role_id and a.status = 'accepted';

insert into public.certificates (code, user_id, event_id, society_id, volunteer_application_id, recipient_name, role_title,
  event_title, society_name, event_date, issued_by, issuer_name)
select 'CC-DEMO-GIT1-2026', a.user_id, e.id, e.society_id, a.id, 'Bilal Ahmed', 'Lab assistant', e.title, 'Computing & AI Society',
       (e.starts_at at time zone 'Asia/Karachi')::date, '00000000-0000-4000-8000-000000000004', 'Sara Malik'
from public.volunteer_applications a join public.events e on e.id = a.event_id
where a.reference_code = 'V-DEMO005';

insert into public.saved_events (user_id, event_id)
values ('00000000-0000-4000-8000-000000000002', (select id from demo_events where key = 'retail-case-competition')),
       ('00000000-0000-4000-8000-000000000002', (select id from demo_events where key = 'line-follower-challenge'));

insert into public.notifications (user_id, type, title, body, link, idempotency_key)
values ('00000000-0000-4000-8000-000000000003', 'volunteer.offered', 'Volunteer offer: Technical support volunteer at Build for Pakistan Hackathon',
        'We would love to have you on the team.', '/dashboard/applications', 'demo:offer:bilal');

drop table demo_events;
