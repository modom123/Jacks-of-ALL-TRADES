-- ============================================================================
--  Jacks of All Trades — Consolidate to ONE project with fundraising tied live
--  File: supabase/seed_single_project_2026-09-14_0042.sql
--  Generated: 2026-09-14 00:42 UTC
--
--  WHAT THIS DOES
--    1. Removes the demo/sample extras so the Command Center shows a single
--       renovation project + the 50/50 raffle campaign.
--    2. Links the raffle campaign to the project and adds a gross_raised column
--       so BOTH figures (renovation 50% and full gross) can be displayed.
--    3. Adds a trigger so the raffle campaign's raised/gross/goal always mirror
--       the live raffle_stats row (updated by zeffy-sync OR by the Command
--       Center raffle editor) — the project's fundraising stays live with no
--       Edge Function redeploy.
--    4. Backfills the campaign from the latest raffle_stats row now.
--
--  RUN THIS in the Supabase SQL Editor AFTER the base + hub + zeffy schemas.
--  Safe to run more than once (idempotent).
-- ============================================================================

-- 1) Remove the demo extras (seed rows only) ---------------------------------
delete from public.campaigns
  where name in ('2026 Annual Fund', 'Tools & Equipment Grant');
delete from public.projects
  where name in ('Youth Trades Cohort — Fall');

-- 2) Schema: tie campaigns to a project + track gross for the "both" display --
alter table public.campaigns
  add column if not exists project_id   uuid references public.projects(id) on delete set null,
  add column if not exists gross_raised numeric not null default 0;

-- 3) Ensure exactly one renovation project with a $100,000 budget ------------
insert into public.projects (name, type, status, location, budget, spent, progress, lead_name, description)
select 'Neighborhood Revitalization — 4BR Home', 'renovation', 'active', 'Detroit, MI',
       100000, 0, 0, 'Program Manager',
       'Full gut renovation restored by student trainees; funded by the 50/50 raffle.'
where not exists (select 1 from public.projects where type = 'renovation');

update public.projects set budget = 100000 where type = 'renovation';

-- 4) Ensure one raffle campaign, linked to that project ---------------------
insert into public.campaigns (name, type, status, goal, raised, description)
select '50/50 Neighborhood Revitalization Raffle', 'raffle', 'active', 100000, 0,
       'Raffle funding the renovation of a Detroit home.'
where not exists (select 1 from public.campaigns where type = 'raffle');

update public.campaigns
   set project_id = (select id from public.projects where type = 'renovation' order by created_at limit 1)
 where type = 'raffle';

-- 5) Keep the raffle campaign in sync with live raffle_stats -----------------
create or replace function public.sync_raffle_campaign() returns trigger
language plpgsql security definer as $$
begin
  update public.campaigns
     set raised       = coalesce(NEW.renovation_raised, raised),
         gross_raised = coalesce(NEW.gross_raised, gross_raised),
         goal         = coalesce(NEW.goal, goal),
         updated_at   = now()
   where type = 'raffle';
  return NEW;
end $$;

drop trigger if exists trg_sync_raffle_campaign on public.raffle_stats;
create trigger trg_sync_raffle_campaign
  after insert or update on public.raffle_stats
  for each row execute function public.sync_raffle_campaign();

-- 6) Backfill the campaign from the latest raffle_stats row now --------------
update public.campaigns c
   set raised       = s.renovation_raised,
       gross_raised = coalesce(s.gross_raised, 0),
       goal         = coalesce(s.goal, c.goal),
       updated_at   = now()
  from (select * from public.raffle_stats order by updated_at desc limit 1) s
 where c.type = 'raffle';
