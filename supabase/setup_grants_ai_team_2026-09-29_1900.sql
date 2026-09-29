-- ============================================================================
--  Jacks of All Trades — Grants AI team automation (Gwen · Rex · Wes)
--  File: supabase/setup_grants_ai_team_2026-09-29_1900.sql
--  Generated: 2026-09-29 19:00 UTC
--
--  HOW TO RUN: Supabase dashboard → project gecnvzjuppmqcfcpmugq → SQL Editor →
--  New query → paste this WHOLE file → Run. Safe to run more than once.
--  (Requires public.grant_leads — already created.)
--
--  WHAT IT ADDS
--   1. AI columns on grant_leads: fit score, priority, next step, last AI touch
--   2. grant_agent_runs: a log of every AI-team run (what each agent did)
--   3. Schedules the AI team to work the pipeline every 2 hours, 8:30am–6:30pm ET
--      (after the 8am grant finder). Each run handles a batch; nothing is ever
--      sent to a funder automatically — a person reviews and clicks Send.
-- ============================================================================

-- 1) AI columns ---------------------------------------------------------------
alter table public.grant_leads add column if not exists fit_score     integer;      -- 0-100 from Gwen
alter table public.grant_leads add column if not exists priority      text;         -- high | medium | low
alter table public.grant_leads add column if not exists ai_next_step  text;         -- what a human should do next
alter table public.grant_leads add column if not exists ai_worked_at  timestamptz;  -- last time an agent touched it
create index if not exists idx_grant_leads_fit on public.grant_leads(fit_score desc nulls last);

-- 2) Run log ------------------------------------------------------------------
create table if not exists public.grant_agent_runs (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  trigger     text,            -- cron | hub
  scored      integer not null default 0,   -- Gwen
  qualified   integer not null default 0,
  dismissed   integer not null default 0,
  outreach    integer not null default 0,   -- Rex
  proposals   integer not null default 0,   -- Wes
  followups   integer not null default 0,   -- Wes
  errors      jsonb   not null default '[]'::jsonb,
  summary     text,
  goal        jsonb            -- snapshot of the Road-to-$2M math at run time
);
create index if not exists idx_grant_agent_runs_created on public.grant_agent_runs(created_at desc);
alter table public.grant_agent_runs enable row level security;
drop policy if exists "staff read" on public.grant_agent_runs;
create policy "staff read" on public.grant_agent_runs for select to authenticated using (true);

notify pgrst, 'reload schema';

-- 3) Schedule: every 2 hours 12:30–22:30 UTC (8:30am–6:30pm EDT) ------------
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule(
  'joat-grants-ai-team',
  '30 12-22/2 * * *',
  $$ select net.http_post(
       url := 'https://gecnvzjuppmqcfcpmugq.supabase.co/functions/v1/grants-agents',
       headers := '{"Content-Type":"application/json"}'::jsonb,
       body := '{"trigger":"cron"}'::jsonb,
       timeout_milliseconds := 300000
     ); $$
);

select jobid, jobname, schedule, active from cron.job where jobname in ('joat-grants-daily', 'joat-grants-ai-team');

-- ----------------------------------------------------------------------------
--  CHECK: select created_at, scored, qualified, outreach, proposals, followups, summary
--           from grant_agent_runs order by created_at desc limit 5;
--  PAUSE: select cron.unschedule('joat-grants-ai-team');
-- ----------------------------------------------------------------------------
