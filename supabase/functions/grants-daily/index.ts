// ============================================================================
// Jacks of All Trades — Daily Grant Auto-Finder (Edge Function)
// File: supabase/functions/grants-daily/index.ts
// Generated: 2026-09-15 17:10 UTC
//
// Runs on a daily schedule and drops ~10 FRESH federal grant opportunities
// (with real award sizes) into public.grant_leads, so the team opens the
// Command Center each morning to a ready pipeline. Deduplicates against
// existing leads so the same opportunity is never added twice. Writes with the
// service-role key (auto-injected) to satisfy RLS.
//
// DEPLOY
//   supabase functions deploy grants-daily --no-verify-jwt
//   (optional) supabase secrets set CRON_SECRET=some-long-random-string
//   (optional) supabase secrets set GRANTS_DAILY_TARGET=10
//
// SCHEDULE (Supabase SQL editor — 8:00am ET daily; cron is UTC):
//   create extension if not exists pg_cron;  create extension if not exists pg_net;
//   select cron.schedule('joat-grants-daily','0 12 * * *', $$
//     select net.http_post(
//       url:='https://gecnvzjuppmqcfcpmugq.supabase.co/functions/v1/grants-daily',
//       headers:='{"Content-Type":"application/json","x-cron-secret":"some-long-random-string"}'::jsonb
//     ); $$);
//   -- (or use the Supabase Dashboard → Integrations → Cron to invoke it daily)
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const GG_BASES = ["https://grants.gov/api/common", "https://api.grants.gov/v1/api"];
const DETAIL = "https://www.grants.gov/search-results-detail/";

// Rotating keyword pool so different opportunities surface across days.
const KEYWORDS = [
  "apprenticeship", "workforce development", "skilled trades training",
  "affordable housing rehabilitation", "youth mentoring", "neighborhood revitalization",
  "job training", "construction training", "community development",
];

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "POST, GET, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

function money(v: unknown): string {
  const n = Number(String(v ?? "").replace(/[^0-9.]/g, ""));
  return isFinite(n) && n > 0 ? "$" + n.toLocaleString() : "";
}
function awardRange(syn: Record<string, unknown>): string {
  const floor = money(syn.awardFloor), ceil = money(syn.awardCeiling);
  if (floor && ceil) return `${floor}–${ceil} per award (Grants.gov)`;
  if (ceil) return `up to ${ceil} per award (Grants.gov)`;
  if (floor) return `from ${floor} per award (Grants.gov)`;
  const est = money(syn.estimatedFunding);
  return est ? `${est} total program funding (Grants.gov)` : "see opportunity (verify)";
}
async function ggPost(path: string, body: unknown): Promise<any> {
  let lastErr: unknown = null;
  for (const base of GG_BASES) {
    try {
      const res = await fetch(`${base}/${path}`, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { lastErr = new Error(`${base}/${path} HTTP ${res.status}`); continue; }
      return await res.json();
    } catch (e) { lastErr = e; }
  }
  throw lastErr instanceof Error ? lastErr : new Error(`Grants.gov ${path} unreachable`);
}

// Pick today's rotating slice of keywords (3 per day, advancing by day-of-year).
function todaysKeywords(n = 3): string[] {
  const doy = Math.floor((Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 0)) / 86400000);
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(KEYWORDS[(doy * n + i) % KEYWORDS.length]);
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const secret = Deno.env.get("CRON_SECRET");
  if (secret && req.headers.get("x-cron-secret") !== secret) return json({ error: "Unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL"), svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !svc) return json({ error: "Service role not configured" }, 500);
  const db = createClient(url, svc);

  let target = Number(Deno.env.get("GRANTS_DAILY_TARGET")) || 10;
  try { const b = await req.json(); if (b && b.target) target = Math.max(1, Math.min(Number(b.target), 25)); } catch (_e) { /* GET/no body ok */ }

  // Existing URLs to avoid duplicates.
  const seen = new Set<string>();
  try {
    const { data } = await db.from("grant_leads").select("url").order("created_at", { ascending: false }).limit(1000);
    (data || []).forEach((r: { url?: string }) => r.url && seen.add(r.url));
  } catch (_e) { /* first run: table may be empty */ }

  const picked: Record<string, unknown>[] = [];
  try {
    for (const keyword of todaysKeywords(3)) {
      if (picked.length >= target) break;
      const search = await ggPost("search2", { keyword, rows: 10, oppStatuses: "posted|forecasted" });
      const hits: any[] = (search && search.data && search.data.oppHits) || [];
      for (const h of hits) {
        if (picked.length >= target) break;
        const id = h.id || h.opportunityId;
        const url2 = id ? DETAIL + id : "";
        if (!url2 || seen.has(url2)) continue;
        seen.add(url2);
        let est_amount = "see opportunity (verify)", notes = "", contact_email = "", eligibility = "";
        try {
          const det = await ggPost("fetchOpportunity", { opportunityId: id });
          const syn = (det && det.data && (det.data.synopsis || det.data.forecast)) || {};
          est_amount = awardRange(syn);
          eligibility = String(syn.applicantEligibilityDesc || "").replace(/<[^>]+>/g, " ").trim().slice(0, 300);
          contact_email = String(syn.agencyContactEmail || "").slice(0, 160);
          notes = [money(syn.estimatedFunding) ? "Est. total " + money(syn.estimatedFunding) : "", h.number ? "Opp # " + h.number : ""].filter(Boolean).join(" · ");
        } catch (_e) { /* detail best-effort */ }
        picked.push({
          funder: String(h.agencyName || h.agency || h.agencyCode || "Federal agency").slice(0, 200),
          funder_type: "government",
          focus_area: String(h.title || "").slice(0, 300),
          fit_reason: `Auto-found federal opportunity matching “${keyword}”.` + (eligibility ? " Eligibility: " + eligibility : " Verify eligibility."),
          est_amount,
          deadline_note: (h.closeDate ? "Closes " + h.closeDate : "See opportunity") + " (Grants.gov)",
          url: url2, contact_email: contact_email || null, notes: notes || null,
          status: "identified", drafted_by: "Gwen (auto Grants.gov)",
        });
      }
    }
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Grants.gov failed", inserted: 0 }, 502);
  }

  if (!picked.length) return json({ inserted: 0, message: "No new opportunities today" });
  const { error } = await db.from("grant_leads").insert(picked);
  if (error) return json({ error: error.message, inserted: 0 }, 500);
  return json({ inserted: picked.length, target, funders: picked.map((p) => p.funder) });
});
