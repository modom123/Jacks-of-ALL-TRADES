// ============================================================================
// Jacks of All Trades — 24/7 Operations Cron (Edge Function)
// File: supabase/functions/ops-cron/index.ts
// Generated: 2026-09-03 17:40 UTC  |  Command Center "always-on" automation
//
// Runs on a schedule so the hub keeps working around the clock, with no one
// logged in. Each run:
//   1. Flags open bills whose due date has passed as "overdue".
//   2. Posts any due recurring_entries into the general ledger and advances
//      their next_run date.
// Uses the service-role key (auto-injected in Edge Functions) so it can write
// under RLS. Safe to run as often as you like (hourly or daily).
//
// DEPLOY
//   supabase functions deploy ops-cron --no-verify-jwt
//
// SCHEDULE (in the Supabase SQL editor — runs every hour):
//   select cron.schedule(
//     'joat-ops-hourly', '0 * * * *',
//     $$ select net.http_post(
//          url:='https://YOUR-PROJECT-ref.supabase.co/functions/v1/ops-cron',
//          headers:='{"Content-Type":"application/json"}'::jsonb
//        ); $$
//   );
//   -- requires: create extension if not exists pg_cron; create extension if not exists pg_net;
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "POST, GET, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

function addFreq(dateStr: string, freq: string): string {
  const d = new Date(dateStr);
  if (freq === "weekly") d.setDate(d.getDate() + 7);
  else if (freq === "quarterly") d.setMonth(d.getMonth() + 3);
  else if (freq === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1); // monthly default
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return json({ error: "Service credentials not available in this environment." }, 500);

  const db = createClient(url, key);
  const today = new Date().toISOString().slice(0, 10);
  const result = { overdue_flagged: 0, recurring_posted: 0, errors: [] as string[] };

  // 1) Flag overdue bills ---------------------------------------------------
  try {
    const { data, error } = await db.from("bills")
      .update({ status: "overdue" })
      .eq("status", "open").lt("due_date", today).select("id");
    if (error) throw error;
    result.overdue_flagged = data?.length ?? 0;
  } catch (e) { result.errors.push("bills: " + (e instanceof Error ? e.message : String(e))); }

  // 2) Post due recurring entries ------------------------------------------
  try {
    const { data: due, error } = await db.from("recurring_entries")
      .select("*").eq("active", true).lte("next_run", today);
    if (error) throw error;
    for (const r of due ?? []) {
      const { error: insErr } = await db.from("ledger_entries").insert([{
        date: r.next_run, type: r.type, category: r.category, fund: r.fund,
        program: r.program, payee: r.payee, amount: r.amount, method: "bank",
        status: "pending", memo: "Auto-posted recurring entry",
      }]);
      if (insErr) { result.errors.push("post " + r.id + ": " + insErr.message); continue; }
      await db.from("recurring_entries").update({ next_run: addFreq(r.next_run, r.frequency) }).eq("id", r.id);
      result.recurring_posted++;
    }
  } catch (e) { result.errors.push("recurring: " + (e instanceof Error ? e.message : String(e))); }

  return json({ ok: true, ran_at: new Date().toISOString(), ...result });
});
