-- ============================================================================
--  Jacks of All Trades — In-kind needs (materials / services asks)
--  File: supabase/setup_inkind_needs_2026-09-30_0030.sql
--  Generated: 2026-09-30 00:30 UTC
--
--  HOW TO RUN: Supabase dashboard → project gecnvzjuppmqcfcpmugq → SQL Editor →
--  New query → paste this WHOLE file → Run. Safe to run more than once.
--  (Works with the house campaign + donor CRM setup files already run.)
--
--  WHAT IT ADDS
--   1. inkind_needs — a specific ask, e.g. "48 replacement windows (~$250 each)
--      — or $12,000 cash for installation", tied to a project/campaign + phase,
--      with the kinds of businesses to approach (window manufacturers,
--      distributors, installers…).
--   2. Tracking columns so every business, outreach email and pledge can be
--      tied to a need: donors.need_id, outreach.need_id,
--      donations.need_id + donations.quantity (e.g. 20 windows).
--   3. inkind_need_progress — per need: quantity pledged, $ value pledged,
--      businesses targeted / contacted / replied / said yes (staff only).
--  Cole (Corporate Partnerships) researches real Detroit-area businesses for
--  each open need and drafts need-specific asks. Nothing is sent automatically.
-- ============================================================================

create table if not exists public.inkind_needs (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  title             text not null,                  -- "48 replacement windows"
  item              text not null,                  -- "replacement windows"
  quantity_needed   numeric not null default 1,
  unit              text not null default 'units',  -- windows, squares, gallons, sheets…
  unit_value        numeric,                        -- estimated $ per unit
  cash_alternative  numeric,                        -- e.g. 12000 for installation
  cash_label        text,                           -- "installation"
  campaign          text,                           -- partner campaign name (the house)
  campaign_phase    integer,
  business_types    text,                           -- "window manufacturers; window distributors; window installers"
  specs             text,                           -- sizes, style, energy rating…
  status            text not null default 'open',   -- open | fulfilled | paused
  target_businesses integer not null default 12     -- how many businesses Cole should line up
);
alter table public.inkind_needs enable row level security;
drop policy if exists "staff all" on public.inkind_needs;
create policy "staff all" on public.inkind_needs for all to authenticated using (true) with check (true);

alter table public.donors    add column if not exists need_id  uuid references public.inkind_needs(id) on delete set null;
alter table public.outreach  add column if not exists need_id  uuid references public.inkind_needs(id) on delete set null;
alter table public.donations add column if not exists need_id  uuid references public.inkind_needs(id) on delete set null;
alter table public.donations add column if not exists quantity numeric;
create index if not exists idx_donors_need    on public.donors(need_id);
create index if not exists idx_outreach_need  on public.outreach(need_id);
create index if not exists idx_donations_need on public.donations(need_id);

create or replace view public.inkind_need_progress with (security_invoker = true) as
  select n.id as need_id,
         coalesce((select sum(quantity) from public.donations g where g.need_id = n.id and g.method = 'in_kind'), 0) as qty_pledged,
         coalesce((select sum(amount)   from public.donations g where g.need_id = n.id), 0)                          as value_pledged,
         coalesce((select sum(amount)   from public.donations g where g.need_id = n.id and g.method <> 'in_kind'), 0) as cash_pledged,
         (select count(*) from public.donors d where d.need_id = n.id)                                              as targeted,
         (select count(distinct o.donor_id) from public.outreach o where o.need_id = n.id and o.status in ('sent','replied','no_response','converted')) as contacted,
         (select count(distinct o.donor_id) from public.outreach o where o.need_id = n.id and o.status in ('replied','converted')) as replied,
         (select count(distinct g.donor_id) from public.donations g where g.need_id = n.id)                         as said_yes
  from public.inkind_needs n;
revoke all on public.inkind_need_progress from anon;
grant select on public.inkind_need_progress to authenticated;

-- Example need (edit or delete in the hub): the windows for the house, Phase 2.
insert into public.inkind_needs (title, item, quantity_needed, unit, unit_value, cash_alternative, cash_label, campaign, campaign_phase, business_types, specs)
select '48 replacement windows', 'replacement windows', 48, 'windows', 250, 12000, 'window installation',
       '4 Bed / 2 Bath Community Renovation', 2,
       'window manufacturers; window & door distributors; window replacement installers; building supply stores',
       'Double-hung, vinyl or fiberglass, energy-efficient (ENERGY STAR); exact sizes to be confirmed on site [verify]'
where not exists (select 1 from public.inkind_needs where title = '48 replacement windows');

notify pgrst, 'reload schema';

select n.title, p.* from public.inkind_needs n join public.inkind_need_progress p on p.need_id = n.id;
