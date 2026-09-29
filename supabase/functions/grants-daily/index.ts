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
//   (optional) supabase secrets set SAM_API_KEY=...        # also pull SAM.gov
//   (optional) supabase secrets set SAM_DAILY_TARGET=3     # SAM.gov share of the daily target
//   (optional) supabase secrets set SIMPLER_GRANTS_API_KEY=...  # use Simpler.Grants.gov
//
// SOURCES (updated 2026-09-29 16:20 UTC)
//   Federal grants: Simpler.Grants.gov when SIMPLER_GRANTS_API_KEY is set,
//   otherwise (or if it errors) the legacy Grants.gov API (no key).
//   Contracts: SAM.gov fills SAM_DAILY_TARGET slots when SAM_API_KEY is set.
//   One source failing never blocks the others.
//
// WHO MAY RUN IT: the pg_cron job (x-cron-secret, if CRON_SECRET is set) or a
// signed-in Command Center user (the hub's "Run daily finder now" button).
//
// SCHEDULE: run supabase/schedule_grants_daily_2026-09-29_1620.sql once in the
// Supabase SQL editor (8:00am ET daily).
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { samConfigured, samSearch } from "../_shared/sam.ts";
import { simplerConfigured, simplerSearch } from "../_shared/simpler.ts";

// Official endpoint first (api.grants.gov/v1/api/search2 — no key; per Grants.gov
// API docs), then the grants.gov/api/common mirror. (reordered 2026-09-29 17:20 UTC)
const GG_BASES = ["https://api.grants.gov/v1/api", "https://grants.gov/api/common"];
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
      const out = await res.json();
      // search2 reports failures in-body: { errorcode: <non-zero>, msg, data: { errorMsgs } }
      if (out && out.errorcode && Number(out.errorcode) !== 0) {
        lastErr = new Error(`Grants.gov ${path}: ${out.msg || "errorcode " + out.errorcode}`); continue;
      }
      return out;
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

  const url = Deno.env.get("SUPABASE_URL"), svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !svc) return json({ error: "Service role not configured" }, 500);
  const db = createClient(url, svc);

  // Allow the cron job (secret header) or a signed-in hub user (their session JWT).
  const secret = Deno.env.get("CRON_SECRET");
  if (secret && req.headers.get("x-cron-secret") !== secret) {
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = token ? await db.auth.getUser(token) : { data: { user: null } };
    if (!u || !u.user) return json({ error: "Unauthorized" }, 401);
  }

  let target = Number(Deno.env.get("GRANTS_DAILY_TARGET")) || 10;
  try { const b = await req.json(); if (b && b.target) target = Math.max(1, Math.min(Number(b.target), 25)); } catch (_e) { /* GET/no body ok */ }

  // Existing URLs to avoid duplicates.
  const seen = new Set<string>();
  try {
    const { data } = await db.from("grant_leads").select("url").order("created_at", { ascending: false }).limit(1000);
    (data || []).forEach((r: { url?: string }) => r.url && seen.add(r.url));
  } catch (_e) { /* first run: table may be empty */ }

  // Reserve a few slots for SAM.gov when its key is configured (updated 2026-09-29).
  const samQuota = samConfigured() ? Math.min(target, Number(Deno.env.get("SAM_DAILY_TARGET")) || 3) : 0;
  const ggTarget = target - samQuota;

  const picked: Record<string, unknown>[] = [];
  const counts: Record<string, number> = { simpler: 0, grantsgov: 0, sam: 0 };
  const errors: Record<string, string> = {};
  const take = (lead: Record<string, unknown>, limit: number, src: string) => {
    const u = String(lead.url || "");
    if (picked.length >= limit || !u || seen.has(u)) return;
    seen.add(u); picked.push(lead); counts[src]++;
  };

  if (simplerConfigured()) {
    try {
      for (const keyword of todaysKeywords(3)) {
        if (picked.length >= ggTarget) break;
        for (const lead of await simplerSearch(keyword, 10, "Gwen (auto Simpler.Grants.gov)")) {
          lead.fit_reason = "Auto-found. " + lead.fit_reason;
          take(lead, ggTarget, "simpler");
        }
      }
    } catch (err) {
      errors.simpler = err instanceof Error ? err.message : "Simpler.Grants.gov failed";
      console.error("[grants-daily] Simpler.Grants.gov error:", err);
    }
  }

  // Legacy Grants.gov: primary when no Simpler key, fallback when it came up short.
  try {
    for (const keyword of todaysKeywords(3)) {
      if (picked.length >= ggTarget) break;
      const search = await ggPost("search2", { keyword, rows: 10, oppStatuses: "posted|forecasted" });
      const hits: any[] = (search && search.data && search.data.oppHits) || [];
      for (const h of hits) {
        if (picked.length >= ggTarget) break;
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
        counts.grantsgov++;
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
    // Don't abort — SAM.gov can still fill the day.
    errors.grantsgov = err instanceof Error ? err.message : "Grants.gov failed";
    console.error("[grants-daily] Grants.gov error:", err);
  }

  if (samQuota) {
    try {
      for (const keyword of todaysKeywords(3)) {
        if (picked.length >= target) break;
        for (const lead of await samSearch(keyword, 10, "Gwen (auto SAM.gov)")) {
          lead.fit_reason = "Auto-found. " + lead.fit_reason;
          take(lead, target, "sam");
        }
      }
    } catch (err) {
      errors.sam = err instanceof Error ? err.message : "SAM.gov failed";
      console.error("[grants-daily] SAM.gov error:", err);
    }
  }

  if (!picked.length) return json({ inserted: 0, message: "No new opportunities today", counts, errors });
  const { error } = await db.from("grant_leads").insert(picked);
  if (error) return json({ error: error.message, inserted: 0 }, 500);
  return json({ inserted: picked.length, target, counts, errors, funders: picked.map((p) => p.funder) });
});
