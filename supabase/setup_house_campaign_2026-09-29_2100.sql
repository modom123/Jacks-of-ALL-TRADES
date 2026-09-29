-- ============================================================================
--  Jacks of All Trades — $100K house renovation: business sponsorship campaign
--  File: supabase/setup_house_campaign_2026-09-29_2100.sql
--  Generated: 2026-09-29 21:00 UTC
--
--  HOW TO RUN: Supabase dashboard → project gecnvzjuppmqcfcpmugq → SQL Editor →
--  New query → paste this WHOLE file → Run. Safe to run more than once.
--  (Requires the donor team setup: supabase/setup_donor_team_2026-09-29_1930.sql)
--
--  WHAT IT ADDS
--   1. partner_campaigns — a project businesses can sponsor, with phases, each
--      phase's cost, the materials it needs, and the trades that supply them.
--      Seeded with the 4 Bed / 2 Bath renovation ($100,000, 5 phases — the
--      budget on the 50/50 raffle flyer).
--   2. donors.partner_campaign / campaign_phase — which project + phase a
--      business was recruited for.
--   3. donations.campaign_phase — which phase a gift (cash or in-kind) covers.
--  Cole (Corporate Partnerships) then researches REAL Detroit-area businesses
--  phase by phase (web search) and drafts phase-specific asks: sponsor the
--  phase in cash, or donate the materials. Nothing is sent automatically.
-- ============================================================================

create table if not exists public.partner_campaigns (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  goal        numeric not null default 0,
  active      boolean not null default true,
  location    text,
  brief       text,          -- what Cole tells businesses about the project
  phases      jsonb not null default '[]'::jsonb,  -- [{n, name, cost, scope, materials[], businesses[]}]
  created_at  timestamptz not null default now()
);
alter table public.partner_campaigns enable row level security;
drop policy if exists "staff all" on public.partner_campaigns;
create policy "staff all" on public.partner_campaigns for all to authenticated using (true) with check (true);

alter table public.donors    add column if not exists partner_campaign text;
alter table public.donors    add column if not exists campaign_phase   integer;
alter table public.donations add column if not exists campaign_phase   integer;

insert into public.partner_campaigns (name, goal, location, brief, phases) values (
  '4 Bed / 2 Bath Community Renovation',
  100000,
  'Detroit, Michigan',
  'Jacks of All Trades is fully renovating a vacant 4-bedroom, 2-bath Detroit brick home into quality housing, with residents in our skilled-trades program working alongside licensed pros. Budget $100,000 in five phases. Half of our 50/50 raffle pot goes to the renovation. Businesses can sponsor a phase in cash or donate the materials for it, and get recognition on site signage, our website, social media and the raffle materials.',
  '[
    {"n":1,"name":"Mechanicals","cost":25000,"scope":"Electrical, plumbing, HVAC and permits",
     "materials":["electrical panel, wire and devices","PEX/copper pipe and fittings","water heater","furnace and central air unit, ductwork"],
     "businesses":["electrical supply houses","plumbing supply houses","HVAC contractors and equipment distributors","licensed electrical and plumbing contractors"]},
    {"n":2,"name":"Full Exterior","cost":25000,"scope":"Modern navy masonry brick paint and restoration (no siding), porch, roof, windows",
     "materials":["masonry paint and primer","roofing shingles, underlayment, flashing","replacement windows","porch lumber, railings, concrete"],
     "businesses":["paint stores and manufacturers","roofing contractors and roofing supply","window and door companies","lumber yards and home-improvement stores","masonry contractors"]},
    {"n":3,"name":"Kitchen & Living","cost":20000,"scope":"Cabinets, quartz counters, flooring, drywall",
     "materials":["kitchen cabinets","quartz countertops and fabrication","LVP/hardwood flooring","drywall, mud and tape","kitchen appliances"],
     "businesses":["cabinet makers and kitchen showrooms","countertop and stone fabricators","flooring stores and distributors","drywall suppliers","appliance retailers"]},
    {"n":4,"name":"4 Bed / 2 Bath","cost":15000,"scope":"Four full bedroom remodels and two tiled bathrooms",
     "materials":["ceramic/porcelain tile and setting materials","bathroom vanities, toilets, tubs/showers, faucets","interior doors and trim","interior paint"],
     "businesses":["tile shops and distributors","plumbing fixture showrooms","millwork and door suppliers","paint stores"]},
    {"n":5,"name":"Basement / Final","cost":15000,"scope":"Dry basement finish plus 10% contingency",
     "materials":["basement waterproofing","insulation","framing lumber and drywall","lighting"],
     "businesses":["basement waterproofing companies","insulation contractors and suppliers","lumber yards","lighting stores"]}
  ]'::jsonb
) on conflict (name) do nothing;

notify pgrst, 'reload schema';

select name, goal, active, jsonb_array_length(phases) as phases from public.partner_campaigns;

-- ----------------------------------------------------------------------------
--  Record a pledge from the hub (Fundraising Team → House project → Record pledge),
--  or by SQL, e.g. roofing materials worth $6,000 for phase 2:
--    insert into donations (donor_id, donor_name, amount, method, campaign, campaign_phase, note)
--    values ('<donor id>', 'ABC Roofing Supply', 6000, 'in_kind',
--            '4 Bed / 2 Bath Community Renovation', 2, 'Shingles + underlayment');
--  Pause the campaign: update partner_campaigns set active = false where name = '4 Bed / 2 Bath Community Renovation';
-- ----------------------------------------------------------------------------
