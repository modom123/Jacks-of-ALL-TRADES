-- ============================================================================
-- Jacks of All Trades — Finance Plugin Schema
-- File: supabase/schema_finance_2026-09-03_1740.sql
-- Generated: 2026-09-03 17:40 UTC  |  Command Center finance plugin
--
-- Adds the nonprofit accounting tables used by assets/js/finance.plugin.js.
-- Run AFTER schema.sql + schema_hub_*.sql. Idempotent.
-- Internal tables: authenticated users only (RLS).
-- ============================================================================

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- General ledger ------------------------------------------------------------
create table if not exists public.ledger_entries (
  id          uuid primary key default gen_random_uuid(),
  date        date not null default now(),
  type        text not null default 'expense',   -- income | expense
  category    text,
  fund        text default 'Unrestricted',        -- Unrestricted | Restricted | Board-Designated
  program     text,
  payee       text,
  method      text,                                -- bank | card | cash | zeffy | check | in_kind
  amount      numeric not null default 0,
  status      text not null default 'cleared',     -- cleared | pending
  memo        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Bills / accounts payable --------------------------------------------------
create table if not exists public.bills (
  id          uuid primary key default gen_random_uuid(),
  vendor      text not null,
  description text,
  category    text,
  program     text,
  amount      numeric not null default 0,
  due_date    date,
  status      text not null default 'open',        -- open | paid | overdue
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Contractors / 1099 --------------------------------------------------------
create table if not exists public.contractors (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  email       text,
  work        text,
  ytd_paid    numeric not null default 0,
  w9          text default 'no',                   -- yes | no
  needs_1099  text default 'no',                   -- yes | no
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Budget lines --------------------------------------------------------------
create table if not exists public.budget_lines (
  id          uuid primary key default gen_random_uuid(),
  category    text not null,
  period      integer default extract(year from now()),
  budgeted    numeric not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Optional: recurring templates the 24/7 ops job posts into the ledger ------
create table if not exists public.recurring_entries (
  id          uuid primary key default gen_random_uuid(),
  type        text not null default 'expense',
  category    text,
  fund        text default 'Unrestricted',
  program     text,
  payee       text,
  amount      numeric not null default 0,
  frequency   text not null default 'monthly',     -- weekly | monthly | quarterly | yearly
  next_run    date not null default now(),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- updated_at triggers -------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['ledger_entries','bills','contractors','budget_lines','recurring_entries'] loop
    execute format('drop trigger if exists trg_%1$s_updated on public.%1$s;', t);
    execute format('create trigger trg_%1$s_updated before update on public.%1$s for each row execute function public.set_updated_at();', t);
  end loop;
end $$;

-- RLS: authenticated users only --------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['ledger_entries','bills','contractors','budget_lines','recurring_entries'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "staff all" on public.%I;', t);
    execute format('create policy "staff all" on public.%I for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;
-- ============================================================================
