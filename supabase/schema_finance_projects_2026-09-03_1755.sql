-- ============================================================================
-- Jacks of All Trades — Finance: project budgets & contractor/mentor tracking
-- File: supabase/schema_finance_projects_2026-09-03_1755.sql
-- Generated: 2026-09-03 17:55 UTC
--
-- Adds per-project expense linkage, a project_budget_lines table, and
-- contractor/mentor fields. Run AFTER schema_finance_*.sql. Idempotent.
-- ============================================================================

-- Link ledger entries & bills to a specific project -------------------------
alter table public.ledger_entries add column if not exists project text;
alter table public.bills          add column if not exists project text;

-- Contractor / mentor tracking ---------------------------------------------
alter table public.contractors add column if not exists role    text default 'Trades Contractor'; -- Trades Contractor | Mentor | Both
alter table public.contractors add column if not exists project text;
alter table public.contractors add column if not exists mentees integer default 0;
alter table public.contractors add column if not exists hours   numeric default 0;
alter table public.contractors add column if not exists rate    numeric default 0;
alter table public.contractors add column if not exists phone   text;
alter table public.contractors add column if not exists status  text default 'active';

-- Per-project budget lines --------------------------------------------------
create table if not exists public.project_budget_lines (
  id          uuid primary key default gen_random_uuid(),
  project     text not null,
  category    text,
  budgeted    numeric not null default 0,
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_project_budget_lines_updated on public.project_budget_lines;
create trigger trg_project_budget_lines_updated before update on public.project_budget_lines
  for each row execute function public.set_updated_at();

alter table public.project_budget_lines enable row level security;
drop policy if exists "staff all" on public.project_budget_lines;
create policy "staff all" on public.project_budget_lines for all to authenticated using (true) with check (true);
-- ============================================================================
