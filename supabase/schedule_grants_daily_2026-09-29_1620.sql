-- ============================================================================
--  Jacks of All Trades — Turn on the daily grant auto-finder (8:00am ET)
--  File: supabase/schedule_grants_daily_2026-09-29_1620.sql
--  Generated: 2026-09-29 16:20 UTC
--
--  HOW TO RUN: Supabase dashboard → project gecnvzjuppmqcfcpmugq → SQL Editor →
--  paste this whole file → Run. Safe to run more than once (re-running just
--  replaces the same job).
--
--  WHAT IT DOES: every morning, calls the grants-daily Edge Function, which adds
--  ~10 fresh, de-duplicated leads to public.grant_leads — the list the Command
--  Center → Fundraising → Grants view shows (badged "New today").
--    • Simpler.Grants.gov  (if SIMPLER_GRANTS_API_KEY is set; else legacy Grants.gov)
--    • SAM.gov             (3 of the 10, if SAM_API_KEY is set)
--
--  REQUIRES: grants-daily deployed:  supabase functions deploy grants-daily
--  If you set a CRON_SECRET secret, add  "x-cron-secret":"<that value>"  to the
--  headers below.
-- ============================================================================

-- 1) Scheduler + outbound HTTP extensions (no-ops if already on)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2) Create / replace the daily job. Cron is UTC: 12:00 UTC = 8:00am EDT
--    (7:00am EST in winter).
select cron.schedule(
  'joat-grants-daily',
  '0 12 * * *',
  $$ select net.http_post(
       url := 'https://gecnvzjuppmqcfcpmugq.supabase.co/functions/v1/grants-daily',
       headers := '{"Content-Type":"application/json"}'::jsonb,
       body := '{}'::jsonb,
       timeout_milliseconds := 120000
     ); $$
);

-- 3) Confirm the job exists (should show joat-grants-daily, 0 12 * * *, active = true)
select jobid, jobname, schedule, active from cron.job where jobname = 'joat-grants-daily';

-- ----------------------------------------------------------------------------
--  RUN IT ONCE RIGHT NOW (optional — or use "Run daily finder now" in the hub):
--    select net.http_post(
--      url := 'https://gecnvzjuppmqcfcpmugq.supabase.co/functions/v1/grants-daily',
--      headers := '{"Content-Type":"application/json"}'::jsonb, body := '{}'::jsonb,
--      timeout_milliseconds := 120000);
--
--  CHECK IT'S WORKING:
--    select status_code, content, created from net._http_response
--      order by created desc limit 5;   -- content shows inserted, counts, errors
--    select funder, focus_area, drafted_by, created_at from grant_leads
--      order by created_at desc limit 10;
--
--  TURN IT OFF:
--    select cron.unschedule('joat-grants-daily');
-- ----------------------------------------------------------------------------
