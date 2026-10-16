-- =============================================================================
-- 0013 REFERENCE DATA
-- Controlled vocabularies needed in every environment: cities, categories and
-- an initial directory of universities and campuses. Administrators maintain
-- this directory from /admin/directory. Departments are intentionally not
-- pre-filled for real institutions; admins add them as societies join.
-- =============================================================================

insert into public.cities (name, province) values
  ('Islamabad', 'Islamabad Capital Territory'),
  ('Rawalpindi', 'Punjab'),
  ('Lahore', 'Punjab'),
  ('Faisalabad', 'Punjab'),
  ('Multan', 'Punjab'),
  ('Gujranwala', 'Punjab'),
  ('Sialkot', 'Punjab'),
  ('Bahawalpur', 'Punjab'),
  ('Sahiwal', 'Punjab'),
  ('Vehari', 'Punjab'),
  ('Attock', 'Punjab'),
  ('Wah Cantt', 'Punjab'),
  ('Chiniot', 'Punjab'),
  ('Karachi', 'Sindh'),
  ('Hyderabad', 'Sindh'),
  ('Jamshoro', 'Sindh'),
  ('Sukkur', 'Sindh'),
  ('Peshawar', 'Khyber Pakhtunkhwa'),
  ('Abbottabad', 'Khyber Pakhtunkhwa'),
  ('Topi', 'Khyber Pakhtunkhwa'),
  ('Mardan', 'Khyber Pakhtunkhwa'),
  ('Quetta', 'Balochistan'),
  ('Gilgit', 'Gilgit-Baltistan'),
  ('Muzaffarabad', 'Azad Jammu and Kashmir')
on conflict (name) do nothing;

insert into public.event_categories (slug, name, description, sort_order) values
  ('software-ai', 'Software & AI', 'Programming, product building, machine learning and AI.', 10),
  ('cybersecurity', 'Cybersecurity', 'CTFs, security research, privacy and digital safety.', 20),
  ('data-science', 'Data Science', 'Analytics, statistics and data competitions.', 30),
  ('robotics-engineering', 'Robotics & Engineering', 'Hardware, robotics, electrical, mechanical and civil engineering.', 40),
  ('science-research', 'Science & Research', 'Natural sciences, research symposia and olympiads.', 50),
  ('business-entrepreneurship', 'Business & Entrepreneurship', 'Startups, case competitions and business strategy.', 60),
  ('finance-economics', 'Finance & Economics', 'Investing, economics, accounting and policy.', 70),
  ('debate-mun', 'Debate & MUN', 'Debating, Model United Nations and public speaking.', 80),
  ('arts-design', 'Arts & Design', 'Visual art, illustration, product and graphic design.', 90),
  ('photography-media', 'Photography & Media', 'Photography, film, journalism and content creation.', 100),
  ('music-performing-arts', 'Music & Performing Arts', 'Music, theatre, dramatics and dance.', 110),
  ('literature-writing', 'Literature & Writing', 'Literary festivals, poetry, creative writing and Urdu adab.', 120),
  ('sports', 'Sports', 'Tournaments, fitness and e-sports.', 130),
  ('social-impact', 'Social Impact', 'Community service, volunteering, sustainability and welfare.', 140),
  ('health-medicine', 'Health & Medicine', 'Medical conferences, health awareness and wellbeing.', 150),
  ('careers', 'Careers & Networking', 'Career fairs, internships, alumni and industry networking.', 160),
  ('culture-festivals', 'Culture & Festivals', 'Cultural nights, food festivals and campus celebrations.', 170)
on conflict (slug) do nothing;

with u (name, short_name, slug, city, website) as (
  values
    ('National University of Sciences and Technology', 'NUST', 'nust', 'Islamabad', 'https://nust.edu.pk'),
    ('Lahore University of Management Sciences', 'LUMS', 'lums', 'Lahore', 'https://lums.edu.pk'),
    ('FAST National University of Computer and Emerging Sciences', 'FAST-NUCES', 'fast-nuces', 'Islamabad', 'https://nu.edu.pk'),
    ('COMSATS University Islamabad', 'CUI', 'comsats', 'Islamabad', 'https://comsats.edu.pk'),
    ('University of Engineering and Technology, Lahore', 'UET Lahore', 'uet-lahore', 'Lahore', 'https://uet.edu.pk'),
    ('NED University of Engineering and Technology', 'NED', 'ned', 'Karachi', 'https://neduet.edu.pk'),
    ('Institute of Business Administration, Karachi', 'IBA', 'iba-karachi', 'Karachi', 'https://iba.edu.pk'),
    ('Ghulam Ishaq Khan Institute of Engineering Sciences and Technology', 'GIKI', 'giki', 'Topi', 'https://giki.edu.pk'),
    ('University of the Punjab', 'PU', 'punjab-university', 'Lahore', 'https://pu.edu.pk'),
    ('Quaid-i-Azam University', 'QAU', 'qau', 'Islamabad', 'https://qau.edu.pk'),
    ('Habib University', 'HU', 'habib-university', 'Karachi', 'https://habib.edu.pk'),
    ('Information Technology University', 'ITU', 'itu', 'Lahore', 'https://itu.edu.pk'),
    ('Aga Khan University', 'AKU', 'aku', 'Karachi', 'https://aku.edu'),
    ('University of Karachi', 'KU', 'university-of-karachi', 'Karachi', 'https://uok.edu.pk'),
    ('Air University', 'AU', 'air-university', 'Islamabad', 'https://au.edu.pk'),
    ('Bahria University', 'BU', 'bahria-university', 'Islamabad', 'https://bahria.edu.pk'),
    ('University of Peshawar', 'UoP', 'university-of-peshawar', 'Peshawar', 'https://uop.edu.pk'),
    ('Mehran University of Engineering and Technology', 'MUET', 'muet', 'Jamshoro', 'https://muet.edu.pk'),
    ('Pakistan Institute of Engineering and Applied Sciences', 'PIEAS', 'pieas', 'Islamabad', 'https://pieas.edu.pk'),
    ('Forman Christian College', 'FCCU', 'fccu', 'Lahore', 'https://fccollege.edu.pk'),
    ('University of Agriculture, Faisalabad', 'UAF', 'uaf', 'Faisalabad', 'https://uaf.edu.pk'),
    ('Institute of Space Technology', 'IST', 'ist', 'Islamabad', 'https://ist.edu.pk'),
    ('University of Balochistan', 'UoB', 'university-of-balochistan', 'Quetta', 'https://uob.edu.pk'),
    ('Shaheed Zulfikar Ali Bhutto Institute of Science and Technology', 'SZABIST', 'szabist', 'Karachi', 'https://szabist.edu.pk')
)
insert into public.universities (name, short_name, slug, city_id, website_url)
select u.name, u.short_name, u.slug, c.id, u.website
from u join public.cities c on c.name = u.city
on conflict (slug) do nothing;

with cp (uni, campus, city) as (
  values
    ('nust', 'H-12 Main Campus', 'Islamabad'),
    ('lums', 'Main Campus, DHA', 'Lahore'),
    ('fast-nuces', 'Islamabad Campus', 'Islamabad'),
    ('fast-nuces', 'Lahore Campus', 'Lahore'),
    ('fast-nuces', 'Karachi Campus', 'Karachi'),
    ('fast-nuces', 'Peshawar Campus', 'Peshawar'),
    ('fast-nuces', 'Chiniot-Faisalabad Campus', 'Chiniot'),
    ('comsats', 'Islamabad Campus', 'Islamabad'),
    ('comsats', 'Lahore Campus', 'Lahore'),
    ('comsats', 'Abbottabad Campus', 'Abbottabad'),
    ('comsats', 'Wah Campus', 'Wah Cantt'),
    ('comsats', 'Attock Campus', 'Attock'),
    ('comsats', 'Sahiwal Campus', 'Sahiwal'),
    ('comsats', 'Vehari Campus', 'Vehari'),
    ('uet-lahore', 'Main Campus', 'Lahore'),
    ('ned', 'Main Campus', 'Karachi'),
    ('iba-karachi', 'Main Campus', 'Karachi'),
    ('iba-karachi', 'City Campus', 'Karachi'),
    ('giki', 'Main Campus', 'Topi'),
    ('punjab-university', 'Quaid-e-Azam Campus', 'Lahore'),
    ('qau', 'Main Campus', 'Islamabad'),
    ('habib-university', 'Main Campus', 'Karachi'),
    ('itu', 'Main Campus', 'Lahore'),
    ('aku', 'Stadium Road Campus', 'Karachi'),
    ('university-of-karachi', 'Main Campus', 'Karachi'),
    ('air-university', 'Islamabad Campus', 'Islamabad'),
    ('bahria-university', 'Islamabad Campus', 'Islamabad'),
    ('bahria-university', 'Karachi Campus', 'Karachi'),
    ('bahria-university', 'Lahore Campus', 'Lahore'),
    ('university-of-peshawar', 'Main Campus', 'Peshawar'),
    ('muet', 'Main Campus', 'Jamshoro'),
    ('pieas', 'Main Campus', 'Islamabad'),
    ('fccu', 'Main Campus', 'Lahore'),
    ('uaf', 'Main Campus', 'Faisalabad'),
    ('ist', 'Main Campus', 'Islamabad'),
    ('university-of-balochistan', 'Main Campus', 'Quetta'),
    ('szabist', 'Karachi Campus', 'Karachi'),
    ('szabist', 'Islamabad Campus', 'Islamabad')
)
insert into public.campuses (university_id, name, city_id)
select u.id, cp.campus, c.id
from cp
join public.universities u on u.slug = cp.uni
join public.cities c on c.name = cp.city
on conflict do nothing;
