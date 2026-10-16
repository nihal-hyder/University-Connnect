-- =============================================================================
-- 0020 DIRECTORY: MORE UNIVERSITIES, CAMPUSES AND EMAIL DOMAINS
-- Reference data (applied in every environment, not demo data). Administrators
-- can correct names, hide entries and edit email domains from /admin/directory.
-- email_domains: the institutional domains students' verified sign-up emails
-- may end with (a subdomain also matches, e.g. student.nust.edu.pk).
-- =============================================================================

alter table public.universities
  add column email_domains text[] not null default '{}'
    check (cardinality(email_domains) <= 10);

insert into public.cities (name, province) values
  ('Khairpur', 'Sindh'),
  ('Nawabshah', 'Sindh'),
  ('Tando Jam', 'Sindh'),
  ('Larkana', 'Sindh'),
  ('Taxila', 'Punjab'),
  ('Gujrat', 'Punjab'),
  ('Sargodha', 'Punjab'),
  ('Rahim Yar Khan', 'Punjab'),
  ('Kamra', 'Punjab'),
  ('Kohat', 'Khyber Pakhtunkhwa'),
  ('Dera Ismail Khan', 'Khyber Pakhtunkhwa'),
  ('Swat', 'Khyber Pakhtunkhwa'),
  ('Mansehra', 'Khyber Pakhtunkhwa'),
  ('Mirpur', 'Azad Jammu and Kashmir')
on conflict (name) do nothing;

with u (name, short_name, slug, city, website) as (
  values
    -- Sindh
    ('Sir Syed University of Engineering and Technology', 'SSUET', 'ssuet', 'Karachi', 'https://ssuet.edu.pk'),
    ('Dawood University of Engineering and Technology', 'DUET', 'duet', 'Karachi', 'https://duet.edu.pk'),
    ('Karachi Institute of Economics and Technology', 'KIET', 'kiet', 'Karachi', 'https://kiet.edu.pk'),
    ('Iqra University', 'Iqra', 'iqra-university', 'Karachi', 'https://iqra.edu.pk'),
    ('Hamdard University', 'Hamdard', 'hamdard-university', 'Karachi', 'https://hamdard.edu.pk'),
    ('Dow University of Health Sciences', 'DUHS', 'duhs', 'Karachi', 'https://duhs.edu.pk'),
    ('Institute of Business Management', 'IoBM', 'iobm', 'Karachi', 'https://iobm.edu.pk'),
    ('Sindh Madressatul Islam University', 'SMIU', 'smiu', 'Karachi', 'https://smiu.edu.pk'),
    ('Federal Urdu University of Arts, Science and Technology', 'FUUAST', 'fuuast', 'Karachi', 'https://fuuast.edu.pk'),
    ('Jinnah Sindh Medical University', 'JSMU', 'jsmu', 'Karachi', 'https://jsmu.edu.pk'),
    ('DHA Suffa University', 'DSU', 'dha-suffa-university', 'Karachi', 'https://dsu.edu.pk'),
    ('Indus Valley School of Art and Architecture', 'IVS', 'ivs', 'Karachi', 'https://ivs.edu.pk'),
    ('University of Sindh', 'UoS', 'university-of-sindh', 'Jamshoro', 'https://usindh.edu.pk'),
    ('Liaquat University of Medical and Health Sciences', 'LUMHS', 'lumhs', 'Jamshoro', 'https://lumhs.edu.pk'),
    ('Isra University', 'Isra', 'isra-university', 'Hyderabad', 'https://isra.edu.pk'),
    ('Shah Abdul Latif University', 'SALU', 'salu', 'Khairpur', 'https://salu.edu.pk'),
    ('Sukkur IBA University', 'Sukkur IBA', 'sukkur-iba', 'Sukkur', 'https://iba-suk.edu.pk'),
    ('Quaid-e-Awam University of Engineering, Science and Technology', 'QUEST', 'quest', 'Nawabshah', 'https://quest.edu.pk'),
    ('Sindh Agriculture University', 'SAU', 'sindh-agriculture-university', 'Tando Jam', 'https://sau.edu.pk'),
    -- Islamabad / Rawalpindi
    ('International Islamic University, Islamabad', 'IIUI', 'iiui', 'Islamabad', 'https://iiu.edu.pk'),
    ('Riphah International University', 'Riphah', 'riphah', 'Islamabad', 'https://riphah.edu.pk'),
    ('Capital University of Science and Technology', 'CUST', 'cust', 'Islamabad', 'https://cust.edu.pk'),
    ('National University of Modern Languages', 'NUML', 'numl', 'Islamabad', 'https://numl.edu.pk'),
    ('Allama Iqbal Open University', 'AIOU', 'aiou', 'Islamabad', 'https://aiou.edu.pk'),
    ('Shifa Tameer-e-Millat University', 'STMU', 'stmu', 'Islamabad', 'https://stmu.edu.pk'),
    ('PMAS Arid Agriculture University', 'UAAR', 'uaar', 'Rawalpindi', 'https://uaar.edu.pk'),
    ('Fatima Jinnah Women University', 'FJWU', 'fjwu', 'Rawalpindi', 'https://fjwu.edu.pk'),
    -- Punjab
    ('University of Engineering and Technology, Taxila', 'UET Taxila', 'uet-taxila', 'Taxila', 'https://uettaxila.edu.pk'),
    ('Government College University, Lahore', 'GCU Lahore', 'gcu-lahore', 'Lahore', 'https://gcu.edu.pk'),
    ('University of Management and Technology', 'UMT', 'umt', 'Lahore', 'https://umt.edu.pk'),
    ('University of Central Punjab', 'UCP', 'ucp', 'Lahore', 'https://ucp.edu.pk'),
    ('Lahore College for Women University', 'LCWU', 'lcwu', 'Lahore', 'https://lcwu.edu.pk'),
    ('King Edward Medical University', 'KEMU', 'kemu', 'Lahore', 'https://kemu.edu.pk'),
    ('National College of Arts', 'NCA', 'nca', 'Lahore', 'https://nca.edu.pk'),
    ('The University of Lahore', 'UOL', 'university-of-lahore', 'Lahore', 'https://uol.edu.pk'),
    ('Kinnaird College for Women', 'Kinnaird', 'kinnaird', 'Lahore', 'https://kinnaird.edu.pk'),
    ('Beaconhouse National University', 'BNU', 'bnu', 'Lahore', 'https://bnu.edu.pk'),
    ('University of Education', 'UE', 'university-of-education', 'Lahore', 'https://ue.edu.pk'),
    ('University of Veterinary and Animal Sciences', 'UVAS', 'uvas', 'Lahore', 'https://uvas.edu.pk'),
    ('Government College University, Faisalabad', 'GCUF', 'gcuf', 'Faisalabad', 'https://gcuf.edu.pk'),
    ('National Textile University', 'NTU', 'ntu', 'Faisalabad', 'https://ntu.edu.pk'),
    ('Bahauddin Zakariya University', 'BZU', 'bzu', 'Multan', 'https://bzu.edu.pk'),
    ('Muhammad Nawaz Sharif University of Engineering and Technology', 'MNS-UET', 'mns-uet', 'Multan', 'https://mnsuet.edu.pk'),
    ('The Islamia University of Bahawalpur', 'IUB', 'iub', 'Bahawalpur', 'https://iub.edu.pk'),
    ('University of Sargodha', 'UoS Sargodha', 'university-of-sargodha', 'Sargodha', 'https://su.edu.pk'),
    ('University of Gujrat', 'UOG', 'university-of-gujrat', 'Gujrat', 'https://uog.edu.pk'),
    ('Khwaja Fareed University of Engineering and Information Technology', 'KFUEIT', 'kfueit', 'Rahim Yar Khan', 'https://kfueit.edu.pk'),
    -- Khyber Pakhtunkhwa
    ('University of Engineering and Technology, Peshawar', 'UET Peshawar', 'uet-peshawar', 'Peshawar', 'https://uetpeshawar.edu.pk'),
    ('Institute of Management Sciences', 'IMSciences', 'imsciences', 'Peshawar', 'https://imsciences.edu.pk'),
    ('Khyber Medical University', 'KMU', 'kmu', 'Peshawar', 'https://kmu.edu.pk'),
    ('Islamia College Peshawar', 'ICP', 'islamia-college-peshawar', 'Peshawar', 'https://icp.edu.pk'),
    ('Abdul Wali Khan University Mardan', 'AWKUM', 'awkum', 'Mardan', 'https://awkum.edu.pk'),
    ('Kohat University of Science and Technology', 'KUST', 'kust', 'Kohat', 'https://kust.edu.pk'),
    ('Gomal University', 'GU', 'gomal-university', 'Dera Ismail Khan', 'https://gu.edu.pk'),
    ('University of Swat', 'UoSwat', 'university-of-swat', 'Swat', 'https://uswat.edu.pk'),
    ('Hazara University', 'Hazara', 'hazara-university', 'Mansehra', 'https://hu.edu.pk'),
    -- Balochistan, Gilgit-Baltistan, Azad Jammu and Kashmir
    ('Balochistan University of Information Technology, Engineering and Management Sciences', 'BUITEMS', 'buitems', 'Quetta', 'https://buitms.edu.pk'),
    ('Sardar Bahadur Khan Women''s University', 'SBKWU', 'sbkwu', 'Quetta', 'https://sbkwu.edu.pk'),
    ('Karakoram International University', 'KIU', 'kiu', 'Gilgit', 'https://kiu.edu.pk'),
    ('University of Azad Jammu and Kashmir', 'UAJK', 'uajk', 'Muzaffarabad', 'https://ajku.edu.pk'),
    ('Mirpur University of Science and Technology', 'MUST', 'must', 'Mirpur', 'https://must.edu.pk')
)
insert into public.universities (name, short_name, slug, city_id, website_url)
select u.name, u.short_name, u.slug, c.id, u.website
from u join public.cities c on c.name = u.city
on conflict do nothing;

-- Every newly added university gets a main campus in its city.
insert into public.campuses (university_id, name, city_id)
select u.id, 'Main Campus', u.city_id
from public.universities u
where not exists (select 1 from public.campuses c where c.university_id = u.id)
on conflict do nothing;

-- Additional campuses of existing universities.
with cp (uni, campus, city) as (
  values
    ('nust', 'PNEC Campus', 'Karachi'),
    ('nust', 'College of E&ME', 'Rawalpindi'),
    ('nust', 'Military College of Signals', 'Rawalpindi'),
    ('muet', 'Shaheed Zulfiqar Ali Bhutto Campus', 'Khairpur'),
    ('air-university', 'Multan Campus', 'Multan'),
    ('air-university', 'Aerospace and Aviation Campus', 'Kamra'),
    ('bahria-university', 'Health Sciences Campus', 'Karachi'),
    ('szabist', 'Larkana Campus', 'Larkana'),
    ('szabist', 'Hyderabad Campus', 'Hyderabad'),
    ('iqra-university', 'Islamabad Campus', 'Islamabad'),
    ('riphah', 'Lahore Campus', 'Lahore'),
    ('riphah', 'Faisalabad Campus', 'Faisalabad'),
    ('umt', 'Sialkot Campus', 'Sialkot'),
    ('university-of-lahore', 'Sargodha Campus', 'Sargodha'),
    ('punjab-university', 'Gujranwala Campus', 'Gujranwala'),
    ('uet-lahore', 'Faisalabad Campus', 'Faisalabad'),
    ('uet-peshawar', 'Abbottabad Campus', 'Abbottabad'),
    ('uet-peshawar', 'Mardan Campus', 'Mardan'),
    ('iiui', 'Female Campus', 'Islamabad'),
    ('numl', 'Karachi Campus', 'Karachi'),
    ('numl', 'Lahore Campus', 'Lahore'),
    ('ned', 'City Campus', 'Karachi')
)
insert into public.campuses (university_id, name, city_id)
select u.id, cp.campus, c.id
from cp
join public.universities u on u.slug = cp.uni
join public.cities c on c.name = cp.city
on conflict do nothing;

-- Default email domain = the website host; plus well-known extra domains.
update public.universities
   set email_domains = array[regexp_replace(website_url, '^https?://(www\.)?([^/]+).*$', '\2')]
 where website_url is not null and email_domains = '{}';

update public.universities u set email_domains = array(select distinct d from unnest(u.email_domains || x.extra) d)
from (values
  ('fast-nuces', array['nu.edu.pk']),
  ('nust', array['seecs.edu.pk', 'smme.edu.pk', 'sines.edu.pk']),
  ('comsats', array['cuilahore.edu.pk', 'cuiatd.edu.pk', 'cuiwah.edu.pk'])
) as x(slug, extra)
where u.slug = x.slug
  and cardinality(x.extra) > 0;
