-- ============================================================================
--  Jacks of All Trades — Clear seeded DEMO rows from the Command Center
--  File: supabase/clear_demo_data_2026-09-14_1341.sql
--  Generated: 2026-09-14 13:41 UTC
--
--  Removes ONLY the sample rows the schemas seeded — it keeps your real
--  renovation project, the 50/50 raffle campaign, and any real admin you added.
--  Safe to run after the schemas. (If you already ran go_live_*.sql, this is a
--  harmless no-op.)
-- ============================================================================

-- Demo campaigns (keep the real 50/50 raffle campaign)
delete from public.campaigns
  where name in ('2026 Annual Fund', 'Tools & Equipment Grant');

-- Demo projects (keep 'Neighborhood Revitalization — 4BR Home')
delete from public.projects
  where name in ('Youth Trades Cohort — Fall', 'Adult Apprenticeship Program', 'Community Home Renovation — 4BR');

-- Demo donors (all seeded with example addresses)
delete from public.donors
  where email like '%.example' or email like '%@example.com';

-- Demo outreach
delete from public.outreach
  where donor_name in ('The Riverside Foundation', 'Great Lakes Credit Union');

-- Demo team members (keep your real admin, e.g. new56money@gmail.com)
delete from public.team_members
  where email in ('director@joatamp.org', 'chair@joatamp.org', 'programs@joatamp.org', 'volunteer@joatamp.org');

-- Optional: clear any test form submissions (uncomment to use)
-- delete from public.contact_messages where email like '%@example.com';
-- delete from public.enrollment_applications where email like '%@example.com';
-- delete from public.volunteer_signups where email like '%@example.com';
-- delete from public.partnership_inquiries where email like '%.example';
-- delete from public.newsletter_signups where email like '%@example.com';
-- delete from public.merch_orders where email like '%@example.com';
