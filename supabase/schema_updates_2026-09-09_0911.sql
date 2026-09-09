-- ============================================================================
-- Jacks of All Trades — Updates, Winners & Live Stream schema
-- File: supabase/schema_updates_2026-09-09_0911.sql
-- Generated: 2026-09-09 09:11 UTC
--
-- Backs the public Updates page (updates.html) and its Command Center editor
-- (assets/js/updates.plugin.js). All three tables are PUBLIC-READ, like
-- raffle_stats: the site loads them with the anon key. They deliberately hold
-- NO donor PII — raffle_winners stores only the display name the winner agreed
-- to publish, never their email/phone (that stays in the admin-only
-- raffle_draws audit table).
-- Run in the Supabase SQL editor AFTER schema.sql.
-- ============================================================================

-- 1) Project updates feed (photos + video embeds) ----------------------------
create table if not exists public.project_updates (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text,
  posted_on  date not null default current_date,
  media_type text not null default 'photo',    -- photo | video
  image_url  text,                              -- photo, or video poster
  video_url  text,                              -- embed URL (YouTube/Vimeo/Facebook) or .mp4
  tag        text,                              -- e.g. Renovation, Cohort, Event
  status     text not null default 'published', -- published | draft
  created_at timestamptz not null default now()
);
create index if not exists project_updates_posted_idx on public.project_updates (posted_on desc);

-- 2) Public raffle winners showcase ------------------------------------------
create table if not exists public.raffle_winners (
  id            uuid primary key default gen_random_uuid(),
  display_name  text not null,                  -- publish-approved name only
  prize_amount  numeric,
  draw_date     date,
  event_label   text,                           -- e.g. "MNF Halftime · Ford Field"
  photo_url     text,
  note          text,
  status        text not null default 'published', -- published | hidden
  created_at    timestamptz not null default now()
);
create index if not exists raffle_winners_date_idx on public.raffle_winners (draw_date desc);

-- 3) Live stream (single settings row) ---------------------------------------
create table if not exists public.live_stream (
  id               integer primary key default 1 check (id = 1), -- singleton
  is_live          boolean not null default false,
  title            text,
  embed_url        text,                          -- full iframe embed URL
  scheduled_label  text,                          -- shown when offline
  updated_at       timestamptz not null default now()
);
insert into public.live_stream (id, is_live, title, scheduled_label)
  values (1, false, 'Live Stream', 'Next live: the 50/50 draw — Mon, Dec 28, 2026 · MNF Halftime · Ford Field')
  on conflict (id) do nothing;

-- 4) RLS — world-readable, admin-writable (mirrors raffle_stats) -------------
alter table public.project_updates enable row level security;
alter table public.raffle_winners  enable row level security;
alter table public.live_stream      enable row level security;

do $$
declare t text;
begin
  foreach t in array array['project_updates','raffle_winners','live_stream'] loop
    execute format('drop policy if exists "public read %1$s" on public.%1$I;', t);
    execute format('drop policy if exists "admin write %1$s" on public.%1$I;', t);
    execute format('create policy "public read %1$s" on public.%1$I for select to anon, authenticated using (true);', t);
    execute format('create policy "admin write %1$s" on public.%1$I for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;
