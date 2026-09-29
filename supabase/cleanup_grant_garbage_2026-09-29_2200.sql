-- ============================================================================
--  Jacks of All Trades — grant pipeline cleanup ("eliminate garbage first")
--  File: supabase/cleanup_grant_garbage_2026-09-29_2200.sql
--  Generated: 2026-09-29 22:00 UTC
--
--  HOW TO RUN: Supabase dashboard → project gecnvzjuppmqcfcpmugq → SQL Editor →
--  New query → paste this WHOLE file → Run. Safe to run more than once.
--
--  WHAT IT DOES: a review of the 17 open grant leads (export 2026-09-29) found
--  17 of 17 were not a fit for a Detroit trades-training / housing-rehab /
--  youth-apprenticeship nonprofit: NIH / HRSA / CDC research and medical
--  training grants, rural opioid programs, HIV services, a national technical-
--  assistance program, a manufactured-housing-only program, and 2 listings whose
--  deadline had already passed. They are moved to Closed ("archived") with the
--  reason — NOTHING IS DELETED; they stay visible under Grants → Closed.
--
--  Future leads are screened automatically (supabase/functions/_shared/grant-filter.ts).
--  UNDO one: update grant_leads set status = 'identified' where id = '<id>';
-- ============================================================================

with garbage(id, reason) as (values
  ('db6103d8-7543-480b-8db9-bf369d51ebd9', 'research/medical agency (Health Resources and Services)'),  -- Rural Communities Opioid Response Program - Evaluation
  ('11ec68ae-fd8e-4253-b55d-872894c2ec48', 'research/medical agency (Health Resources and Services)'),  -- Rural Communities Opioid Response Program - Community Systems Developm
  ('6f9554ad-1986-4357-902a-d191c4f2da53', 'research/medical agency (National Institutes of Health)'),  -- Ruth L. Kirschstein National Research Service Award (NRSA) Short-Term 
  ('31e7a783-4057-49f6-b28e-5bf0e1e55955', 'not a fit: "Technical Assistance" program'),  -- FY2026/2027 Community Compass Technical Assistance and Capacity Buildi
  ('f7bcd2b7-00c3-48dd-ad07-c19e62b27fa8', 'research/medical agency (National Institutes of Health)'),  -- Development of Collaborative Research Facilities or Research-Resource 
  ('6f1887c7-eb04-4d9a-99f2-853da2824bf0', 'research/medical agency (Centers for Disease Control)'),  -- National Center for Construction Safety and Health Research and Transl
  ('6fa1add5-a274-4be9-a8c9-ef07b8ceaa8f', 'not a fit: "Preservation and Reinvestment Initiative" program'),  -- Preservation and Reinvestment Initiative for Community Enhancement (PR
  ('9a10e901-e087-43c6-ae2f-2f001abc6b09', 'deadline already passed'),  -- Interdisciplinary Research Networks to Advance Biomedical Research on 
  ('3d5b39b2-ded4-4e6e-9224-75f5936c2f4b', 'research/medical agency (National Institutes of Health)'),  -- Hubs of Interdisciplinary Research and Training in Global Environmenta
  ('d2be025e-d8d2-4eb7-93c7-bbfa1bfa52b5', 'deadline already passed'),  -- Notice of Intent to Publish a Funding Opportunity Announcement for NIE
  ('b4168578-4d66-4b6d-a896-0a256180d033', 'research/medical agency (Health Resources and Services)'),  -- Ryan White HIV/AIDS Program Part B AIDS Drug Assistance Program Traini
  ('7eed132b-2988-4c5e-90ce-88f011dd4984', 'research/medical agency (National Institutes of Health)'),  -- NIGMS National and Regional Resources (R24 - Clinical Trial Not Allowe
  ('151be862-696a-4731-ae87-352e15ec213f', 'research/medical agency (Health Resources and Services)'),  -- Ryan White HIV/AIDS Program (RWHAP) Integrated HIV/AIDS Planning Resou
  ('d63aa4a4-7874-437f-841c-5429350f8d1c', 'research/medical agency (National Institutes of Health)'),  -- Limited Competition: NIGMS Mature Synchrotron Resources (MSR) for Stru
  ('22f2cc32-d4ec-4582-b07d-e265b2a6b910', 'research/medical agency (National Institutes of Health)'),  -- Medical Scientist Training Program (MSTP)
  ('1b596e23-0c5e-49dc-86cd-724e6f232976', 'research/medical agency (National Institutes of Health)'),  -- NIGMS Institutional Biomedical Undergraduate Research Training (BURT) 
  ('62facb7f-c2b2-4847-9a55-90764f3ba968', 'research/medical agency (National Institutes of Health)')  -- Medical Scientist Training Program (MSTP) (T32)
)
update public.grant_leads g
set status = 'archived',
    fit_reason = 'Dismissed in pipeline review 2026-09-29: ' || garbage.reason || '. ' || coalesce(g.fit_reason, '')
from garbage
where g.id = garbage.id::uuid
  and g.status <> 'archived';

-- What's left open (should be empty until the fixed finder runs):
select status, count(*) from public.grant_leads group by status order by status;
