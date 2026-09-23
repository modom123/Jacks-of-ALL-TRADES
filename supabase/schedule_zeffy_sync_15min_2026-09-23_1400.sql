-- ============================================================================
--  Jacks of All Trades — Turn on the Zeffy auto sync (every 15 minutes)
--  File: supabase/schedule_zeffy_sync_15min_2026-09-23_1400.sql
--  Generated: 2026-09-23 14:00 UTC
--
--  HOW TO RUN: Supabase dashboard → project gecnvzjuppmqcfcpmugq → SQL Editor →
--  paste this whole file → Run. Safe to run more than once (re-running just
--  replaces the same job).
--
--  WHAT IT DOES: every 15 minutes, calls the zeffy-sync Edge Function, which
--  pulls new Zeffy raffle payments and updates raffle_stats — the numbers the
--  public website and the Command Center (business hub) both show.
--
--  REQUIRES: the zeffy-sync function deployed, with the ZEFFY_API_KEY secret set.
-- ============================================================================

-- 1) Scheduler + outbound HTTP extensions (no-ops if already on)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2) Create / replace the 15-minute job
select cron.schedule(
  'joat-zeffy-15min',
  '*/15 * * * *',
  $$ select net.http_post(
       url := 'https://gecnvzjuppmqcfcpmugq.supabase.co/functions/v1/zeffy-sync',
       headers := '{"Content-Type":"application/json"}'::jsonb,
       timeout_milliseconds := 60000
     ); $$
);

-- 3) Confirm the job exists (should show joat-zeffy-15min, */15 * * * *, active = true)
select jobid, jobname, schedule, active from cron.job where jobname = 'joat-zeffy-15min';

-- ----------------------------------------------------------------------------
--  CHECK IT'S WORKING (run these after ~15 minutes):
--    select status, return_message, start_time from cron.job_run_details
--      where jobid = (select jobid from cron.job where jobname = 'joat-zeffy-15min')
--      order by start_time desc limit 5;
--    select status_code, content, created from net._http_response
--      order by created desc limit 5;       -- content should include "ok":true
--    select pot_total, renovation_raised, gross_raised, payment_count, updated_at
--      from raffle_stats order by updated_at desc limit 1;
--
--  TURN IT OFF:
--    select cron.unschedule('joat-zeffy-15min');
-- ----------------------------------------------------------------------------
