-- ============================================================================
--  Jacks of All Trades — Marketing settings schema
--  File: supabase/schema_marketing_2026-09-14_0204.sql
--  Generated: 2026-09-14 02:04 UTC
--
--  Singleton row (id = 1) that the public site reads for the promo bar and the
--  Command Center → Marketing module controls + tracks. World-readable (so the
--  banner shows), admin-writable (RLS mirrors raffle_stats / live_stream).
--  Run in the Supabase SQL Editor after the base schema.
-- ============================================================================

create table if not exists public.marketing_settings (
  id                integer primary key default 1 check (id = 1),  -- singleton
  banner_enabled    boolean not null default true,
  banner_message    text    not null default 'Win 50% of the pot — rebuild a Detroit home. Drawing Dec 28 at Ford Field.',
  banner_cta_label  text    not null default 'Buy raffle tickets',
  banner_cta_url    text    not null default 'raffle.html',
  show_pot          boolean not null default true,   -- append the live pot from raffle_stats
  goal              numeric not null default 100000,
  -- campaign metrics the team updates to "follow" progress
  emails_sent       integer not null default 0,
  posts_published   integer not null default 0,
  sponsors_secured  integer not null default 0,
  media_mentions    integer not null default 0,
  updated_at        timestamptz not null default now()
);

insert into public.marketing_settings (id) values (1) on conflict (id) do nothing;

alter table public.marketing_settings enable row level security;

drop policy if exists "public read marketing" on public.marketing_settings;
create policy "public read marketing" on public.marketing_settings
  for select using (true);

drop policy if exists "auth write marketing" on public.marketing_settings;
create policy "auth write marketing" on public.marketing_settings
  for all to authenticated using (true) with check (true);
