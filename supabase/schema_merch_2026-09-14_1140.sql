-- ============================================================================
--  Jacks of All Trades — Shop / merch orders schema
--  File: supabase/schema_merch_2026-09-14_1140.sql
--  Generated: 2026-09-14 11:40 UTC
--
--  Stores orders submitted from the Shop page order form
--  (<form data-collection="merch_orders">). Public may INSERT (anon), admins
--  read/update/delete (RLS mirrors the other lead tables). Run in the SQL
--  Editor after the base schema.
-- ============================================================================

create table if not exists public.merch_orders (
  id           bigint generated always as identity primary key,
  full_name    text not null,
  email        text not null,
  phone        text,
  product      text not null,
  size         text,
  quantity     integer not null default 1,
  message      text,
  source_page  text,
  status       text not null default 'new',   -- new | confirmed | paid | fulfilled | cancelled
  created_at   timestamptz not null default now()
);

alter table public.merch_orders enable row level security;

drop policy if exists "public insert" on public.merch_orders;
create policy "public insert" on public.merch_orders for insert to anon, authenticated with check (true);
drop policy if exists "admin read" on public.merch_orders;
create policy "admin read" on public.merch_orders for select to authenticated using (true);
drop policy if exists "admin update" on public.merch_orders;
create policy "admin update" on public.merch_orders for update to authenticated using (true) with check (true);
drop policy if exists "admin delete" on public.merch_orders;
create policy "admin delete" on public.merch_orders for delete to authenticated using (true);
