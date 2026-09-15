-- ============================================================================
--  Jacks of All Trades — Grants pipeline schema
--  File: supabase/schema_grants_2026-09-15_1610.sql
--  Generated: 2026-09-15 16:10 UTC
--
--  Powers the Command Center "Grants" engine driven by two AI agents:
--    • Gwen (Grant Prospector) — finds/qualifies grant leads and drafts
--      funder intro emails + call scripts (business-to-business outreach).
--    • Wes  (Grant Writer)     — drafts LOIs, full proposals, and follow-ups.
--  A human reviews/approves every send. Run in the Supabase SQL Editor.
--  Idempotent: safe to re-run.
-- ============================================================================

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

-- ============================================================================
--  After running this:
--   1. Ensure the ai-agent function is deployed with ANTHROPIC_API_KEY set
--      (Gwen + Wes need it for live drafts; otherwise they simulate).
--   2. Command Center → Fundraising → Grants → "Find grant leads".
--   3. Verify every funder, amount, deadline, email, and phone before sending —
--      the agents flag these as [verify]/[placeholder] and never invent them.
--   Sending emails/calls is wired separately (email provider / Twilio) and is
--   business-to-business funder outreach, reviewed by a human first.
-- ============================================================================
