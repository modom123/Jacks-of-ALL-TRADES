-- ============================================================================
--  Jacks of All Trades — Raffle Marketing Campaign schema
--  File: supabase/schema_raffle_campaign_2026-09-14_1932.sql
--  Generated: 2026-09-14 19:32 UTC
--
--  Powers the Command Center "Raffle Campaign" engine: an AI (Nova) drafts
--  multi-channel content (social, email, SMS, voice scripts) on a countdown
--  cadence; a human approves before anything is sent. Also captures marketing
--  CONSENT so SMS/voice only ever reach people who opted in (TCPA compliance).
--
--  Run in the Supabase SQL Editor. Idempotent: safe to re-run.
-- ============================================================================

create extension if not exists pgcrypto;

-- Reuse the shared updated_at helper if present; define if not.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------------------------------------------------------------------------
-- CAMPAIGN CONTENT  — the AI-drafted, human-approved content pipeline
-- ---------------------------------------------------------------------------
create table if not exists public.campaign_content (
  id           uuid primary key default gen_random_uuid(),
  campaign_tag text not null default 'raffle-2026',
  channel      text not null default 'instagram',   -- instagram | facebook | x | linkedin | email | sms | voice
  title        text,                                -- email subject / social hook / call purpose
  body         text,                                -- the post copy, email body, SMS text, or call script
  cta_url      text,                                -- link to include (raffle page / Zeffy)
  audience     text not null default 'public',      -- public | opt-in only
  scheduled_at timestamptz,                         -- when to send/post
  status       text not null default 'draft',       -- draft | approved | scheduled | sent | archived
  drafted_by   text not null default 'Nova (AI)',
  meta         jsonb,                               -- freeform (hashtags, phase, notes)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_campaign_content_status  on public.campaign_content(status);
create index if not exists idx_campaign_content_channel on public.campaign_content(channel);
create index if not exists idx_campaign_content_sched   on public.campaign_content(scheduled_at);

drop trigger if exists trg_campaign_content_updated on public.campaign_content;
create trigger trg_campaign_content_updated before update on public.campaign_content
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- MARKETING CONSENT  — opt-in registry for SMS / voice / email marketing
--   Compliance foundation: never text or call anyone whose matching opt-in
--   flag is not TRUE, and always honor opted_out_at.
-- ---------------------------------------------------------------------------
create table if not exists public.marketing_consent (
  id            uuid primary key default gen_random_uuid(),
  name          text,
  phone         text,
  email         text,
  sms_opt_in    boolean not null default false,
  voice_opt_in  boolean not null default false,
  email_opt_in  boolean not null default false,
  consent_text  text,          -- the exact disclosure the person agreed to
  consent_source text,         -- e.g. 'raffle-page-form'
  source_page   text,
  opted_out_at  timestamptz,   -- set when they reply STOP / unsubscribe
  created_at    timestamptz not null default now()
);
create index if not exists idx_marketing_consent_phone on public.marketing_consent(phone);
create index if not exists idx_marketing_consent_email on public.marketing_consent(email);

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
--   campaign_content: signed-in staff/board only (all access).
--   marketing_consent: staff can read/manage; the PUBLIC opt-in form may
--   INSERT only (so people can subscribe) but can never read the list.
-- ---------------------------------------------------------------------------
alter table public.campaign_content   enable row level security;
alter table public.marketing_consent  enable row level security;

drop policy if exists "staff all" on public.campaign_content;
create policy "staff all" on public.campaign_content
  for all to authenticated using (true) with check (true);

drop policy if exists "staff all" on public.marketing_consent;
create policy "staff all" on public.marketing_consent
  for all to authenticated using (true) with check (true);

-- Public may submit an opt-in (INSERT only) — matches newsletter/contact forms.
drop policy if exists "public opt-in insert" on public.marketing_consent;
create policy "public opt-in insert" on public.marketing_consent
  for insert to anon with check (true);

-- ============================================================================
--  After running this:
--   1. Deploy the ai-agent function (if not already) and set ANTHROPIC_API_KEY
--      so Nova produces live drafts instead of simulated ones.
--   2. Command Center → Marketing → Raffle Campaign → "Generate with Nova".
--   3. Review/approve each item; sending is wired separately (Twilio / email
--      provider / social scheduler) and must respect marketing_consent.
-- ============================================================================
