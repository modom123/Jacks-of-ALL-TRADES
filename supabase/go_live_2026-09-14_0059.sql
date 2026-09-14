-- ============================================================================
--  Jacks of All Trades — GO LIVE: remove all demo data, keep one real project
--  File: supabase/go_live_2026-09-14_0059.sql
--  Generated: 2026-09-14 00:59 UTC
--
--  WHAT THIS DOES  (run ONCE, in the Supabase SQL Editor, AFTER the 7 schemas)
--    • Wipes every demo/sample row from the operational tables.
--    • Leaves ONE real project (Neighborhood Revitalization — 4BR Home, $100k)
--      and ONE raffle campaign, linked, with fundraising tied live to
--      raffle_stats via a trigger (no Edge Function needed).
--    • Resets raffle_stats to $0 so no placeholder numbers show — you set the
--      real figures in Command Center → 50/50 Raffle.
--    • Makes you the admin so you can sign in to the Command Center.
--
--  This SUPERSEDES seed_single_project_2026-09-14_0042.sql (it includes it).
--  Idempotent-ish: safe to re-run, but it CLEARS data each time — do not run
--  after you have real donors/leads you want to keep.
-- ============================================================================

-- 0) Schema tie-ins the live model needs (safe if already added) --------------
alter table public.campaigns
  add column if not exists project_id   uuid references public.projects(id) on delete set null,
  add column if not exists gross_raised numeric not null default 0;

-- 1) WIPE all demo/sample + operational data ---------------------------------
--    (CASCADE clears child rows; RESTART IDENTITY resets counters.)
truncate table
  public.donations,
  public.donors,
  public.outreach,
  public.agent_messages,
  public.project_tasks,
  public.project_budget_lines,
  public.ledger_entries,
  public.bills,
  public.budget_lines,
  public.recurring_entries,
  public.contractors,
  public.raffle_entries,
  public.raffle_draws,
  public.raffle_winners,
  public.project_updates,
  public.campaigns,
  public.projects,
  public.team_members
  restart identity cascade;

-- Inbound leads from the public forms: uncomment to also clear test submissions.
-- truncate table public.contact_messages, public.enrollment_applications,
--   public.volunteer_signups, public.partnership_inquiries, public.newsletter_signups
--   restart identity cascade;

-- 2) The ONE real project ($100,000 budget) ----------------------------------
insert into public.projects (name, type, status, location, budget, spent, progress, lead_name, description)
values ('Neighborhood Revitalization — 4BR Home', 'renovation', 'active', 'Detroit, MI',
        100000, 0, 0, 'Program Manager',
        'Full gut renovation restored by student trainees; funded by the 50/50 raffle.');

-- 3) The ONE raffle campaign, linked to that project -------------------------
insert into public.campaigns (name, type, status, goal, raised, gross_raised, description, project_id)
values ('50/50 Neighborhood Revitalization Raffle', 'raffle', 'active', 100000, 0, 0,
        'Raffle funding the renovation of a Detroit home.',
        (select id from public.projects where type = 'renovation' order by created_at limit 1));

-- 4) Keep the raffle campaign in sync with live raffle_stats -----------------
create or replace function public.sync_raffle_campaign() returns trigger
language plpgsql security definer as $$
begin
  update public.campaigns
     set raised       = coalesce(NEW.renovation_raised, raised),
         gross_raised = coalesce(NEW.gross_raised, gross_raised),
         goal         = coalesce(NEW.goal, goal),
         updated_at   = now()
   where type = 'raffle';
  return NEW;
end $$;

drop trigger if exists trg_sync_raffle_campaign on public.raffle_stats;
create trigger trg_sync_raffle_campaign
  after insert or update on public.raffle_stats
  for each row execute function public.sync_raffle_campaign();

-- 5) Reset the live figures to $0 (enter real numbers in the raffle editor) --
truncate table public.raffle_stats restart identity;
insert into public.raffle_stats (pot_total, renovation_raised, gross_raised, goal, tickets_sold)
values (0, 0, 0, 100000, 0);

-- 6) Make YOU the admin ------------------------------------------------------
--    IMPORTANT: create this same email under Authentication → Users first,
--    then this row grants it the admin role in the Command Center.
insert into public.team_members (full_name, email, role, title, status)
values ('Site Administrator', 'new56money@gmail.com', 'admin', 'Administrator', 'active')
on conflict (email) do update set role = 'admin', status = 'active';
