-- ============================================================================
-- Jacks of All Trades — Zeffy integration schema
-- File: supabase/schema_zeffy_2026-09-05_1535.sql
-- Generated: 2026-09-05 15:35 UTC
--
-- Adds the table the zeffy-sync Edge Function writes to, and extends
-- raffle_stats with the totals the public site + Command Center display.
-- Run in the Supabase SQL editor AFTER the base schema.sql.
-- ============================================================================

-- 1) Extend the public dashboard row with Zeffy-derived totals ---------------
alter table public.raffle_stats
  add column if not exists gross_raised  numeric  not null default 0,
  add column if not exists payment_count integer  not null default 0;

-- 2) Raw Zeffy payments (contains donor email → NOT world-readable) ----------
create table if not exists public.zeffy_payments (
  zeffy_id     text primary key,               -- Zeffy payment id (idempotent key)
  amount       numeric not null default 0,
  currency     text    not null default 'USD',
  campaign_id  text,
  buyer_email  text,                            -- donor PII: admin-only
  status       text,
  created_at   timestamptz,
  raw          jsonb,                           -- full payload for auditing
  synced_at    timestamptz not null default now()
);

create index if not exists zeffy_payments_created_idx on public.zeffy_payments (created_at desc);
create index if not exists zeffy_payments_campaign_idx on public.zeffy_payments (campaign_id);

-- 3) RLS — service role (the Edge Function) bypasses RLS and writes.
--    Donor rows are readable ONLY by signed-in Command Center admins.
--    There is deliberately NO anon/public read policy on zeffy_payments.
alter table public.zeffy_payments enable row level security;
drop policy if exists "admin read zeffy" on public.zeffy_payments;
create policy "admin read zeffy" on public.zeffy_payments
  for select to authenticated using (true);

-- Aggregate totals for the public site come from raffle_stats (already
-- world-readable via the base schema's "public read" policy) — never from the
-- raw payments table.
