-- ============================================================================
--  Jacks of All Trades — Donor CRM sync (Zeffy donors + totals by fundraiser)
--  File: supabase/setup_donor_crm_sync_2026-09-29_2300.sql
--  Generated: 2026-09-29 23:00 UTC
--
--  HOW TO RUN: Supabase dashboard → project gecnvzjuppmqcfcpmugq → SQL Editor →
--  New query → paste this WHOLE file → Run. Safe to run more than once.
--  Requires: schema_hub (donors, donations) and schema_zeffy (zeffy_payments).
--
--  WHAT IT ADDS
--   1. donations.zeffy_id (unique) — each Zeffy payment becomes exactly one gift
--      in the donations ledger, linked to a donor. Also source/ref if missing.
--   2. donations.import_key (unique) — de-duplicates CSV imports (GoFundMe etc.).
--   3. refresh_donor_totals() — recalculates every donor's total_given,
--      last gift date/amount, and moves prospects who gave to "active",
--      from ALL of their gifts (Zeffy, GoFundMe, Cash App, social…).
--   4. donor_giving — per donor × fundraiser/campaign totals (staff only).
--   5. campaign_giving — totals per fundraiser incl. anonymous gifts (staff only).
-- ============================================================================

alter table public.donations add column if not exists zeffy_id   text;
alter table public.donations add column if not exists import_key text;
alter table public.donations add column if not exists source     text;
alter table public.donations add column if not exists ref        text;
create unique index if not exists uq_donations_zeffy_id   on public.donations(zeffy_id)   where zeffy_id is not null;
create unique index if not exists uq_donations_import_key on public.donations(import_key) where import_key is not null;
create index if not exists idx_donations_donor on public.donations(donor_id);
create index if not exists idx_donors_email_lower on public.donors(lower(email));

-- Recalculate donor totals from the donations ledger ---------------------------
create or replace function public.refresh_donor_totals()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  with s as (
    select donor_id,
           sum(amount) as total,
           max(gift_date) as last_date,
           (array_agg(amount order by gift_date desc nulls last, created_at desc))[1] as last_amount
    from public.donations
    where donor_id is not null
    group by donor_id
  )
  update public.donors d
     set total_given      = s.total,
         last_gift_date   = s.last_date,
         last_gift_amount = s.last_amount,
         stage            = case when d.stage in ('prospect', 'cultivating') and s.total > 0 then 'active' else d.stage end
    from s
   where d.id = s.donor_id
     and (d.total_given is distinct from s.total
          or d.last_gift_date is distinct from s.last_date
          or d.last_gift_amount is distinct from s.last_amount
          or (d.stage in ('prospect', 'cultivating') and s.total > 0));
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.refresh_donor_totals() from public, anon;
grant execute on function public.refresh_donor_totals() to authenticated, service_role;

-- Per donor × fundraiser totals (runs with the caller's permissions, so the
-- donations table's staff-only policies still apply) ----------------------------
create or replace view public.donor_giving with (security_invoker = true) as
  select donor_id,
         coalesce(nullif(campaign, ''), 'General') as campaign,
         sum(amount)::numeric  as total,
         count(*)::int         as gifts,
         max(gift_date)        as last_gift
  from public.donations
  where donor_id is not null
  group by donor_id, coalesce(nullif(campaign, ''), 'General');
revoke all on public.donor_giving from anon;
grant select on public.donor_giving to authenticated;

-- Totals per fundraiser/campaign, INCLUDING anonymous gifts (no donor record).
create or replace view public.campaign_giving with (security_invoker = true) as
  select coalesce(nullif(campaign, ''), 'General') as campaign,
         sum(amount)::numeric as total,
         count(*)::int        as gifts,
         count(distinct donor_id)::int as donors,
         max(gift_date)       as last_gift
  from public.donations
  group by coalesce(nullif(campaign, ''), 'General');
revoke all on public.campaign_giving from anon;
grant select on public.campaign_giving to authenticated;

notify pgrst, 'reload schema';

select public.refresh_donor_totals() as donors_updated;
