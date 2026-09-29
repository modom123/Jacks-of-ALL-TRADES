-- ============================================================================
--  Jacks of All Trades — Social media fundraising
--  File: supabase/setup_social_fundraising_2026-09-29_2230.sql
--  Generated: 2026-09-29 22:30 UTC
--
--  HOW TO RUN: Supabase dashboard → project gecnvzjuppmqcfcpmugq → SQL Editor →
--  New query → paste this WHOLE file → Run. Safe to run more than once.
--
--  WHAT IT ADDS
--   1. donations.source / donations.ref — which platform (facebook, instagram,
--      tiktok, …) and which supporter's fundraiser a gift came through.
--   2. give_clicks — every visit to joatamp.org/give.html and every "Donate"
--      tap, tagged with platform + campaign + supporter. Anyone can ADD a click
--      (the public page does); only signed-in staff can READ them.
--   3. fundraisers — peer-to-peer: supporters start their own fundraiser page
--      (give.html?ref=their-name) and share it on their own social media.
--      Public sign-ups arrive as "pending" until staff approve them in the hub.
--   4. social_platforms — setup status for each platform's donation tools.
--   5. social_posts — Nova's drafted posts per platform (review → post → log).
--   6. Public, read-only views the give page uses: active fundraisers and
--      totals raised through social (aggregates only — no donor data).
-- ============================================================================

create extension if not exists pgcrypto;

-- 1) Attribution on donations --------------------------------------------------
alter table public.donations add column if not exists source text;   -- facebook | instagram | tiktok | youtube | linkedin | x | threads | nextdoor | email | website …
alter table public.donations add column if not exists ref    text;   -- fundraiser slug (peer-to-peer)
create index if not exists idx_donations_source on public.donations(source);

-- 2) Click tracking --------------------------------------------------------------
create table if not exists public.give_clicks (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  event       text not null default 'view',   -- view | donate
  src         text,                            -- platform the visitor came from
  ref         text,                            -- fundraiser slug
  campaign    text,                            -- house | raffle | general
  method      text                             -- zeffy | cashapp | zelle (on donate)
);
create index if not exists idx_give_clicks_created on public.give_clicks(created_at desc);
alter table public.give_clicks enable row level security;
drop policy if exists "public add click" on public.give_clicks;
create policy "public add click" on public.give_clicks for insert to anon, authenticated
  with check (event in ('view','donate') and coalesce(length(src),0) <= 40 and coalesce(length(ref),0) <= 60
              and coalesce(length(campaign),0) <= 40 and coalesce(length(method),0) <= 20);
drop policy if exists "staff read clicks" on public.give_clicks;
create policy "staff read clicks" on public.give_clicks for select to authenticated using (true);

-- 3) Peer-to-peer fundraisers ----------------------------------------------------
create table if not exists public.fundraisers (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,            -- used in give.html?ref=<slug>
  name        text not null,                   -- supporter's display name
  email       text,
  phone       text,
  goal        numeric not null default 500,
  raised      numeric not null default 0,      -- staff update as gifts are attributed
  story       text,                            -- why they're fundraising (shown on the page)
  campaign    text not null default 'general',
  status      text not null default 'pending', -- pending | active | closed
  created_at  timestamptz not null default now()
);
alter table public.fundraisers enable row level security;
drop policy if exists "public start fundraiser" on public.fundraisers;
create policy "public start fundraiser" on public.fundraisers for insert to anon, authenticated
  with check (status = 'pending' and raised = 0 and length(name) between 2 and 80
              and slug ~ '^[a-z0-9-]{3,60}$' and goal between 50 and 100000 and coalesce(length(story),0) <= 600);
drop policy if exists "staff manage fundraisers" on public.fundraisers;
create policy "staff manage fundraisers" on public.fundraisers for all to authenticated using (true) with check (true);

-- 4) Platform setup ----------------------------------------------------------------
create table if not exists public.social_platforms (
  key          text primary key,
  name         text not null,
  sort         integer not null default 0,
  handle       text,              -- @jacksofalltrades…
  profile_url  text,
  native_giving boolean not null default false,  -- platform's own donate tools are set up
  link_in_bio  boolean not null default false,   -- give.html?src=<key> is in the bio / about
  notes        text
);
alter table public.social_platforms enable row level security;
drop policy if exists "staff manage platforms" on public.social_platforms;
create policy "staff manage platforms" on public.social_platforms for all to authenticated using (true) with check (true);
insert into public.social_platforms (key, name, sort) values
  ('facebook','Facebook',1), ('instagram','Instagram',2), ('tiktok','TikTok',3), ('youtube','YouTube',4),
  ('linkedin','LinkedIn',5), ('x','X (Twitter)',6), ('threads','Threads',7), ('nextdoor','Nextdoor',8),
  ('gofundme','GoFundMe',9)
on conflict (key) do nothing;

-- 5) Social posts ------------------------------------------------------------------
create table if not exists public.social_posts (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  platform        text not null,
  campaign        text not null default 'general',
  kind            text,            -- post | reel | story | short | video | thread | article
  scheduled_date  date,
  caption         text,
  hashtags        text,
  media_hint      text,            -- which photo/video to use (Nova suggests one of ours)
  link            text,            -- tracked give.html link for this platform
  status          text not null default 'planned',  -- planned | posted | skipped
  post_url        text,
  posted_at       timestamptz,
  drafted_by      text
);
create index if not exists idx_social_posts_status on public.social_posts(status, scheduled_date);
alter table public.social_posts enable row level security;
drop policy if exists "staff manage posts" on public.social_posts;
create policy "staff manage posts" on public.social_posts for all to authenticated using (true) with check (true);

-- 6) Public read-only views for give.html -------------------------------------------
create or replace view public.public_fundraisers as
  select slug, name, goal, raised, story, campaign from public.fundraisers where status = 'active';
create or replace view public.public_give_stats as
  select coalesce(sum(amount), 0)::numeric as raised_social, count(*)::int as gifts_social
  from public.donations where source is not null;
grant select on public.public_fundraisers to anon, authenticated;
grant select on public.public_give_stats  to anon, authenticated;

notify pgrst, 'reload schema';

select key, name, native_giving, link_in_bio from public.social_platforms order by sort;
