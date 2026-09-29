-- ============================================================================
--  Jacks of All Trades — Donor AI team (Paige: individuals · Cole: corporate)
--  File: supabase/setup_donor_team_2026-09-29_1930.sql
--  Generated: 2026-09-29 19:30 UTC
--
--  HOW TO RUN: Supabase dashboard → project gecnvzjuppmqcfcpmugq → SQL Editor →
--  New query → paste this WHOLE file → Run. Safe to run more than once.
--  (Uses the existing donors / donations / outreach tables from schema_hub.)
--
--  WHAT IT ADDS
--   1. AI columns on donors: suggested ask, next step, last AI touch
--   2. donor_agent_runs: a log of every run (what Paige and Cole did)
--   3. Schedules the donor team every weekday at 9:15am ET. Each run drafts
--      emails into Outreach as "planned" — nothing is sent until a person
--      reviews it in Command Center → Donor Team and clicks Send.
-- ============================================================================

-- 1) AI columns ---------------------------------------------------------------
alter table public.donors add column if not exists suggested_ask numeric;       -- $ the agent recommends asking for
alter table public.donors add column if not exists ai_next_step  text;          -- what a person should do next
alter table public.donors add column if not exists ai_worked_at  timestamptz;   -- last time an agent touched it

-- 2) Run log ------------------------------------------------------------------
create table if not exists public.donor_agent_runs (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  trigger     text,               -- cron | hub
  thank_yous  integer not null default 0,
  renewals    integer not null default 0,
  cultivation integer not null default 0,
  prospects   integer not null default 0,   -- new corporate prospects Cole added
  pitches     integer not null default 0,   -- corporate partnership emails
  errors      jsonb   not null default '[]'::jsonb,
  summary     text,
  goal        jsonb                -- YTD individual/corporate giving vs targets
);
create index if not exists idx_donor_agent_runs_created on public.donor_agent_runs(created_at desc);
alter table public.donor_agent_runs enable row level security;
drop policy if exists "staff read" on public.donor_agent_runs;
create policy "staff read" on public.donor_agent_runs for select to authenticated using (true);

notify pgrst, 'reload schema';

-- 3) Schedule: weekdays 13:15 UTC (9:15am EDT) --------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule(
  'joat-donor-team',
  '15 13 * * 1-5',
  $$ select net.http_post(
       url := 'https://gecnvzjuppmqcfcpmugq.supabase.co/functions/v1/donors-agents',
       headers := '{"Content-Type":"application/json"}'::jsonb,
       body := '{"trigger":"cron"}'::jsonb,
       timeout_milliseconds := 300000
     ); $$
);

select jobid, jobname, schedule, active from cron.job where jobname = 'joat-donor-team';

-- ----------------------------------------------------------------------------
--  CHECK: select created_at, thank_yous, renewals, cultivation, prospects, pitches, summary
--           from donor_agent_runs order by created_at desc limit 5;
--  PAUSE: select cron.unschedule('joat-donor-team');
-- ----------------------------------------------------------------------------
