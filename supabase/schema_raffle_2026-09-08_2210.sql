-- ============================================================================
-- Jacks of All Trades — 50/50 Raffle draw schema
-- File: supabase/schema_raffle_2026-09-08_2210.sql
-- Generated: 2026-09-08 22:10 UTC
--
-- Backs the Command Center "Winner Picker" plugin (assets/js/raffle-picker.plugin.js).
--   * raffle_entries — the ticket drum: one row per purchase/entrant, weighted
--     by ticket count. Rows come from admins (cash/paper/event buyers) and from
--     Zeffy import. Contains PII (email/phone) → admin-only, NO anon read.
--   * raffle_draws   — the audit trail: one row per OFFICIAL draw, recording the
--     winner, the winning ticket number, the pool size, the RNG seed, and who
--     drew it. Also admin-only.
-- Run in the Supabase SQL editor AFTER schema.sql (and, if used, schema_zeffy).
-- ============================================================================

-- 1) Entrant / ticket drum ---------------------------------------------------
create table if not exists public.raffle_entries (
  id           uuid primary key default gen_random_uuid(),
  entrant_name text    not null,
  email        text,
  phone        text,
  tickets      integer not null default 1 check (tickets >= 0),
  source       text    not null default 'manual',   -- zeffy | cash | check | event | manual
  reference    text,                                 -- receipt / Zeffy payment id (dedupe key)
  status       text    not null default 'eligible',  -- eligible | excluded
  created_at   timestamptz not null default now()
);

create index if not exists raffle_entries_created_idx on public.raffle_entries (created_at desc);
-- Prevent importing the same Zeffy payment twice.
create unique index if not exists raffle_entries_reference_uidx
  on public.raffle_entries (reference) where reference is not null;

-- 2) Draw audit trail --------------------------------------------------------
create table if not exists public.raffle_draws (
  id             uuid primary key default gen_random_uuid(),
  winner_name    text not null,
  winner_email   text,
  winner_phone   text,
  winning_ticket integer,                 -- 1-based index of the drawn ticket
  total_tickets  integer,                 -- size of the pool at draw time
  total_entrants integer,
  method         text default 'crypto-weighted',
  seed           text,                    -- 128-bit hex seed recorded for verification
  status         text not null default 'official',  -- official | test | void
  drawn_by       text,
  drawn_at       timestamptz not null default now(),
  notes          text,
  created_at     timestamptz not null default now()
);

create index if not exists raffle_draws_drawn_idx on public.raffle_draws (drawn_at desc);

-- 3) RLS — both tables hold PII, so there is deliberately NO anon policy.
--    The service role (server-side jobs) bypasses RLS. Signed-in Command
--    Center users (authenticated) may read and write.
alter table public.raffle_entries enable row level security;
alter table public.raffle_draws   enable row level security;

do $$
declare t text;
begin
  foreach t in array array['raffle_entries','raffle_draws'] loop
    execute format('drop policy if exists "admin read %1$s"   on public.%1$I;', t);
    execute format('drop policy if exists "admin write %1$s"  on public.%1$I;', t);
    execute format('create policy "admin read %1$s"  on public.%1$I for select to authenticated using (true);', t);
    execute format('create policy "admin write %1$s" on public.%1$I for all    to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- Note: aggregate figures shown on the PUBLIC site (pot, tickets sold) continue
-- to come from the world-readable raffle_stats table — never from these tables.
