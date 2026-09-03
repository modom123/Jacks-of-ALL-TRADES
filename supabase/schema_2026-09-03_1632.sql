-- ============================================================================
-- Jacks of All Trades Community Development — Supabase Schema
-- File: supabase/schema_2026-09-03_1632.sql
-- Generated: 2026-09-03 16:32 UTC  |  joatamp.net redesign
--
-- HOW TO USE
--   1. Create a project at supabase.com.
--   2. Open the SQL Editor and paste + run this entire file.
--   3. Copy Project URL + anon public key into assets/js/config.js.
--   4. Create your admin user (see the bottom of this file) and sign in at
--      /admin. Public site forms insert here; the Command Center reads/writes.
--
-- SECURITY MODEL (Row Level Security)
--   * Lead tables  : anyone (anon) may INSERT (public forms). Only authenticated
--                    admins may SELECT / UPDATE / DELETE.
--   * Public data  : raffle_stats + renovation_phases are world-readable
--                    (the site displays them); only admins may write.
-- ============================================================================

-- Helpful for gen_random_uuid()
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- LEAD / SUBMISSION TABLES
-- ---------------------------------------------------------------------------
create table if not exists public.contact_messages (
  id           bigint generated always as identity primary key,
  full_name    text not null,
  email        text not null,
  topic        text,
  message      text,
  source_page  text,
  status       text not null default 'new',
  created_at   timestamptz not null default now()
);

create table if not exists public.enrollment_applications (
  id           bigint generated always as identity primary key,
  full_name    text not null,
  email        text not null,
  phone        text,
  trade        text,
  message      text,
  source_page  text,
  status       text not null default 'new',
  created_at   timestamptz not null default now()
);

create table if not exists public.volunteer_signups (
  id           bigint generated always as identity primary key,
  full_name    text not null,
  email        text not null,
  interest     text,
  message      text,
  source_page  text,
  status       text not null default 'new',
  created_at   timestamptz not null default now()
);

create table if not exists public.partnership_inquiries (
  id                bigint generated always as identity primary key,
  organization      text not null,
  full_name         text not null,
  email             text not null,
  partnership_type  text,
  message           text,
  source_page       text,
  status            text not null default 'new',
  created_at        timestamptz not null default now()
);

create table if not exists public.newsletter_signups (
  id           bigint generated always as identity primary key,
  email        text not null,
  source_page  text,
  status       text not null default 'subscribed',
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- PUBLIC DASHBOARD DATA
-- ---------------------------------------------------------------------------
create table if not exists public.raffle_stats (
  id                 bigint generated always as identity primary key,
  pot_total          numeric not null default 0,
  renovation_raised  numeric not null default 0,
  goal               numeric not null default 100000,
  tickets_sold       integer not null default 0,
  updated_at         timestamptz not null default now()
);

create table if not exists public.renovation_phases (
  n          integer primary key,
  title      text not null,
  detail     text,
  cost       numeric not null default 0,
  status     text not null default 'upcoming',   -- upcoming | active | done
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- SEED DATA
-- ---------------------------------------------------------------------------
insert into public.raffle_stats (pot_total, renovation_raised, goal, tickets_sold)
select 12480, 42500, 100000, 640
where not exists (select 1 from public.raffle_stats);

insert into public.renovation_phases (n, title, detail, cost, status) values
  (1, 'Mechanicals',      'Electrical, plumbing, HVAC & permits',        25000, 'done'),
  (2, 'Full Exterior',    'Brick paint & seal, windows, porch, roof',    25000, 'done'),
  (3, 'Kitchen & Living', 'Open layout, cabinets, quartz, LVP flooring', 20000, 'active'),
  (4, '4 Bed / 2 Bath',   'Two tile bath remodels, drywall, paint',      15000, 'upcoming'),
  (5, 'Basement & Final', 'Finished basement + 10% contingency',         15000, 'upcoming')
on conflict (n) do nothing;

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
alter table public.contact_messages        enable row level security;
alter table public.enrollment_applications enable row level security;
alter table public.volunteer_signups       enable row level security;
alter table public.partnership_inquiries   enable row level security;
alter table public.newsletter_signups      enable row level security;
alter table public.raffle_stats            enable row level security;
alter table public.renovation_phases       enable row level security;

-- Public forms may INSERT into lead tables (anon + authenticated).
do $$
declare t text;
begin
  foreach t in array array[
    'contact_messages','enrollment_applications','volunteer_signups',
    'partnership_inquiries','newsletter_signups'
  ] loop
    execute format('drop policy if exists "public insert" on public.%I;', t);
    execute format('create policy "public insert" on public.%I for insert to anon, authenticated with check (true);', t);
    execute format('drop policy if exists "admin read" on public.%I;', t);
    execute format('create policy "admin read" on public.%I for select to authenticated using (true);', t);
    execute format('drop policy if exists "admin update" on public.%I;', t);
    execute format('create policy "admin update" on public.%I for update to authenticated using (true) with check (true);', t);
    execute format('drop policy if exists "admin delete" on public.%I;', t);
    execute format('create policy "admin delete" on public.%I for delete to authenticated using (true);', t);
  end loop;
end $$;

-- Public dashboard data: world-readable, admin-writable.
do $$
declare t text;
begin
  foreach t in array array['raffle_stats','renovation_phases'] loop
    execute format('drop policy if exists "public read" on public.%I;', t);
    execute format('create policy "public read" on public.%I for select to anon, authenticated using (true);', t);
    execute format('drop policy if exists "admin write" on public.%I;', t);
    execute format('create policy "admin write" on public.%I for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- CREATE YOUR ADMIN USER
-- ---------------------------------------------------------------------------
-- Easiest: Supabase Dashboard → Authentication → Users → "Add user"
--   (set email + password, and turn OFF "email confirmation" so you can sign
--    in immediately). Then log in at /admin with those credentials.
--
-- Optional hardening: restrict the Command Center to specific admin emails by
-- adding "using ( auth.jwt() ->> 'email' in ('you@joatamp.net') )" to the
-- admin read/update policies above.
-- ============================================================================
