-- ============================================================================
-- Jacks of All Trades Community Development — Command Center HUB Schema
-- File: supabase/schema_hub_2026-09-03_1710.sql
-- Generated: 2026-09-03 17:10 UTC  |  Command Center business-hub expansion
--
-- Adds the operations tables that power the Command Center: projects, tasks,
-- fundraising campaigns, donor CRM, donations, outreach, board/team members,
-- and the AI-agent activity log. Run AFTER schema.sql (or on its own — it only
-- creates new objects). Idempotent: safe to re-run.
--
-- ACCESS MODEL
--   * Internal hub tables are for signed-in staff/board only: any authenticated
--     user may read/write. Public/anon has NO access.
--   * Role scoping (admin / board / staff) is enforced in the app UI and can be
--     tightened at the database with the optional policy pattern at the bottom.
-- ============================================================================

create extension if not exists pgcrypto;

-- Auto-update updated_at on write ------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------------------------------------------------------------------------
-- TEAM & BOARD
-- ---------------------------------------------------------------------------
create table if not exists public.team_members (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  email       text unique not null,
  role        text not null default 'staff',   -- admin | board | staff | volunteer
  title       text,
  status      text not null default 'active',   -- active | invited | inactive
  phone       text,
  joined_date date default now(),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- PROJECTS & TASKS
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  type        text not null default 'renovation', -- renovation | program | event | community | grant
  status      text not null default 'planning',   -- planning | active | on_hold | complete | archived
  description text,
  location    text,
  budget      numeric not null default 0,
  spent       numeric not null default 0,
  progress    integer not null default 0,         -- 0..100
  lead_name   text,
  start_date  date,
  target_date date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.project_tasks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.projects(id) on delete cascade,
  title       text not null,
  status      text not null default 'todo',       -- todo | doing | done
  assignee    text,
  due_date    date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- FUNDRAISING CAMPAIGNS
-- ---------------------------------------------------------------------------
create table if not exists public.campaigns (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  type        text not null default 'annual',     -- annual | raffle | grant | major_gift | event | capital
  status      text not null default 'active',      -- planning | active | paused | complete
  goal        numeric not null default 0,
  raised      numeric not null default 0,
  description text,
  start_date  date,
  end_date    date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- DONOR CRM
-- ---------------------------------------------------------------------------
create table if not exists public.donors (
  id              uuid primary key default gen_random_uuid(),
  full_name       text not null,
  email           text,
  phone           text,
  type            text not null default 'individual', -- individual | corporate | foundation | government
  stage           text not null default 'prospect',   -- prospect | cultivating | active | lapsed
  total_given     numeric not null default 0,
  last_gift_date  date,
  last_gift_amount numeric,
  tags            text,
  assigned_to     text,
  address         text,
  notes           text,
  source          text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.donations (
  id          uuid primary key default gen_random_uuid(),
  donor_id    uuid references public.donors(id) on delete set null,
  donor_name  text,
  amount      numeric not null default 0,
  gift_date   date default now(),
  method      text,                                -- card | check | cash | zeffy | in_kind | grant
  campaign    text,
  note        text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- DONOR OUTREACH
-- ---------------------------------------------------------------------------
create table if not exists public.outreach (
  id            uuid primary key default gen_random_uuid(),
  donor_id      uuid references public.donors(id) on delete set null,
  donor_name    text,
  channel       text not null default 'email',     -- email | call | meeting | letter | event
  status        text not null default 'planned',    -- planned | sent | replied | no_response | converted
  subject       text,
  body          text,
  drafted_by    text,                               -- which AI agent / person drafted it
  owner         text,
  scheduled_date date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- AI AGENT ACTIVITY LOG
-- ---------------------------------------------------------------------------
create table if not exists public.agent_messages (
  id          uuid primary key default gen_random_uuid(),
  agent_key   text not null,                        -- ada | max | nova
  role        text not null,                        -- user | assistant
  content     text,
  user_email  text,
  created_at  timestamptz not null default now()
);

-- updated_at triggers -------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['team_members','projects','project_tasks','campaigns','donors','outreach'] loop
    execute format('drop trigger if exists trg_%1$s_updated on public.%1$s;', t);
    execute format('create trigger trg_%1$s_updated before update on public.%1$s for each row execute function public.set_updated_at();', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- SEED DATA (only if empty)
-- ---------------------------------------------------------------------------
insert into public.team_members (full_name, email, role, title)
select * from (values
  ('Executive Director', 'director@joatamp.net', 'admin', 'Executive Director'),
  ('Board Chair',        'chair@joatamp.net',    'board', 'Board Chair'),
  ('Program Manager',    'programs@joatamp.net', 'staff', 'Program Manager')
) as v(full_name,email,role,title)
where not exists (select 1 from public.team_members);

insert into public.projects (name, type, status, location, budget, spent, progress, lead_name, description)
select * from (values
  ('Neighborhood Revitalization — 4BR Home', 'renovation', 'active', 'Detroit, MI', 100000, 42500, 43, 'Program Manager', 'Full gut renovation restored by student trainees; funds the 50/50 raffle property.'),
  ('Youth Trades Cohort — Fall', 'program', 'active', 'Detroit, MI', 25000, 8200, 30, 'Program Manager', 'Six-trade training cohort with 1:1 mentorship and job placement.')
) as v(name,type,status,location,budget,spent,progress,lead_name,description)
where not exists (select 1 from public.projects);

insert into public.campaigns (name, type, status, goal, raised, description)
select * from (values
  ('50/50 Neighborhood Revitalization Raffle', 'raffle', 'active', 100000, 42500, 'Raffle funding the renovation of a Detroit home.'),
  ('2026 Annual Fund', 'annual', 'active', 75000, 18400, 'General operating support for training and mentorship.'),
  ('Tools & Equipment Grant', 'grant', 'planning', 40000, 0, 'Foundation grant to outfit the training workshop.')
) as v(name,type,status,goal,raised,description)
where not exists (select 1 from public.campaigns);

insert into public.donors (full_name, email, type, stage, total_given, last_gift_amount, tags, assigned_to)
select * from (values
  ('Midtown Supply Co.', 'giving@midtown.example', 'corporate', 'active', 12000, 5000, 'materials, recurring', 'Executive Director'),
  ('The Riverside Foundation', 'grants@riverside.example', 'foundation', 'cultivating', 0, null, 'grant, LOI sent', 'Executive Director'),
  ('Marcus & Dana Reed', 'reed.family@example.com', 'individual', 'active', 2500, 500, 'major gift prospect', 'Board Chair'),
  ('Great Lakes Credit Union', 'community@glcu.example', 'corporate', 'prospect', 0, null, 'sponsor prospect', 'Board Chair')
) as v(full_name,email,type,stage,total_given,last_gift_amount,tags,assigned_to)
where not exists (select 1 from public.donors);

insert into public.outreach (donor_name, channel, status, subject, drafted_by, owner)
select * from (values
  ('The Riverside Foundation', 'email', 'planned', 'Partnership follow-up — trades workshop grant', 'Ada (AI)', 'Executive Director'),
  ('Great Lakes Credit Union', 'meeting', 'planned', 'Introductory sponsorship conversation', 'Board Chair', 'Board Chair')
) as v(donor_name,channel,status,subject,drafted_by,owner)
where not exists (select 1 from public.outreach);

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY — internal tables: authenticated users only
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'team_members','projects','project_tasks','campaigns',
    'donors','donations','outreach','agent_messages'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "staff all" on public.%I;', t);
    execute format('create policy "staff all" on public.%I for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- OPTIONAL: tighten role scoping at the database
-- ---------------------------------------------------------------------------
-- Map signed-in users to a role via team_members.email, then gate sensitive
-- tables. Example (donors readable by admin/board/staff, writable by admin/staff):
--
--   create or replace function public.my_role() returns text language sql stable as $$
--     select role from public.team_members where email = auth.jwt() ->> 'email' limit 1
--   $$;
--   drop policy if exists "staff all" on public.donors;
--   create policy "donors read"  on public.donors for select to authenticated
--     using (public.my_role() in ('admin','board','staff'));
--   create policy "donors write" on public.donors for all to authenticated
--     using (public.my_role() in ('admin','staff')) with check (public.my_role() in ('admin','staff'));
-- ============================================================================
