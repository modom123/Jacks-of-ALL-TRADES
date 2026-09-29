-- ============================================================================
--  Jacks of All Trades — ONE-STEP grants setup (table + daily 8am schedule)
--  File: supabase/setup_grants_ALL_2026-09-29_1815.sql
--  Generated: 2026-09-29 18:15 UTC
--
--  HOW TO RUN: Supabase dashboard → project gecnvzjuppmqcfcpmugq → SQL Editor →
--  New query → paste this WHOLE file → Run. Safe to run more than once.
--
--  1. Creates public.grant_leads (the Grants pipeline in the Command Center)
--     = supabase/schema_grants_2026-09-15_1610.sql
--  2. Refreshes the API's table list so the hub can see it immediately
--  3. Schedules the grant finder every morning at 8:00am ET
--     = supabase/schedule_grants_daily_2026-09-29_1620.sql
-- ============================================================================

-- ======================= 1. grant_leads table ==============================
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------------------------------------------------------------------------
-- GRANT LEADS  — one row per opportunity, moving through the pipeline
-- ---------------------------------------------------------------------------
create table if not exists public.grant_leads (
  id             uuid primary key default gen_random_uuid(),
  funder         text not null,
  funder_type    text not null default 'foundation',  -- foundation | corporate | government | community
  focus_area     text,
  fit_reason     text,                                 -- why it fits JOAT (from Gwen)
  est_amount     text,                                 -- range, always 'verify'
  deadline_note  text,                                 -- 'rolling', 'annual NOFO — verify', etc.
  url            text,                                 -- application / funder page (verify)
  -- funder contact (verify before use)
  contact_name   text,
  contact_email  text,
  contact_phone  text,
  -- pipeline
  status         text not null default 'identified',   -- identified | qualified | contacted | drafting | submitted | follow_up | awarded | declined | archived
  amount_requested numeric,
  submitted_at   date,
  decision_at    date,
  -- AI-drafted content (human-approved before sending)
  intro_email_draft text,   -- Gwen: funder introduction email
  call_script_draft text,   -- Gwen: phone-call script
  proposal_draft    text,   -- Wes: LOI / full proposal
  followup_draft    text,   -- Wes: post-submission follow-up
  assigned_to    text,
  drafted_by     text,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_grant_leads_status on public.grant_leads(status);
create index if not exists idx_grant_leads_type   on public.grant_leads(funder_type);

drop trigger if exists trg_grant_leads_updated on public.grant_leads;
create trigger trg_grant_leads_updated before update on public.grant_leads
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY — internal only (signed-in staff/board)
-- ---------------------------------------------------------------------------
alter table public.grant_leads enable row level security;
drop policy if exists "staff all" on public.grant_leads;
create policy "staff all" on public.grant_leads
  for all to authenticated using (true) with check (true);

-- ======================= 2. refresh the API schema cache ====================
notify pgrst, 'reload schema';

-- ======================= 3. daily 8am ET grant finder =======================
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

-- Done. Expected result: one row — joat-grants-daily | 0 12 * * * | true
-- Then in the hub: Grants → Test connections (Database ✅) → Find & save.
