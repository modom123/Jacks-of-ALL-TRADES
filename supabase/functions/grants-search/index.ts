// ============================================================================
// Jacks of All Trades — Grants.gov Search Edge Function
// File: supabase/functions/grants-search/index.ts
// Generated: 2026-09-15 16:10 UTC
//
// Pulls REAL federal grant opportunities (with award size + deadlines) from the
// public Grants.gov API — no API key, no scraping. Used by the Command Center
// Grants engine so Gwen's shortlist can be backed by live, structured data and
// Wes can size a proposal to the actual award range.
//
//   search2         -> matching opportunities (title, agency, close date)
//   fetchOpportunity -> award floor/ceiling, estimated funding, # of awards
//
// DEPLOY
//   supabase functions deploy grants-search
//   (No secret required. The Command Center calls it with the anon bearer.)
//
//   POST {SUPABASE_URL}/functions/v1/grants-search
//   body: { "keyword": "apprenticeship", "rows": 12, "statuses": "posted|forecasted" }
//   -> { "leads": [ ... normalized grant_leads shape ... ], "count": N, "source": "grants.gov" }
//
// SAM.gov (updated 2026-09-29 15:51 UTC): pass "source": "sam" to search live
// SAM.gov federal opportunities instead. Requires the server-side secret:
//   supabase secrets set SAM_API_KEY=...
//
// Simpler.Grants.gov (updated 2026-09-29 16:20 UTC): when the secret
// SIMPLER_GRANTS_API_KEY is set, Grants.gov searches go through the new
// Simpler.Grants.gov API first (falls back to legacy Grants.gov on error).
// "source": "simpler" forces it.
//
// DIAGNOSE (updated 2026-09-29 17:00 UTC): POST { "diagnose": true } tests every
// source and reports configured / ok / count / error — used by the hub's
// "Test grant connections" button.
// ============================================================================

import { samConfigured, samSearch } from "../_shared/sam.ts";
import { simplerConfigured, simplerSearch } from "../_shared/simpler.ts";

// Try the current grants.gov base first, then the documented api.grants.gov
// mirror. Both expose the same search2 / fetchOpportunity service.
// Official endpoint first (api.grants.gov/v1/api/search2 — no key; per Grants.gov
// API docs), then the grants.gov/api/common mirror. (reordered 2026-09-29 17:20 UTC)
const GG_BASES = ["https://api.grants.gov/v1/api", "https://grants.gov/api/common"];
const DETAIL = "https://www.grants.gov/search-results-detail/";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

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
      const res = await fetch(`${base}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(body),
      });
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

// Legacy Grants.gov search2 + fetchOpportunity. Widens the keyword if nothing
// matches: full phrase → first word → latest postings (updated 2026-09-29 17:00 UTC).
async function legacySearch(keyword: string, oppStatuses: string, rows: number): Promise<Record<string, unknown>[]> {
  const tries = [keyword, keyword.split(/\s+/)[0], ""].filter((k, i, a) => a.indexOf(k) === i);
  let hits: any[] = [];
  for (const kw of tries) {
    const search = await ggPost("search2", { keyword: kw, rows, oppStatuses });
    hits = (search && search.data && search.data.oppHits) || [];
    if (hits.length) break;
  }
  return await Promise.all(hits.slice(0, rows).map(async (h) => {
      const id = h.id || h.opportunityId;
      const agency = h.agencyName || h.agency || h.agencyCode || "Federal agency";
      let est_amount = "see opportunity (verify)";
      let notes = "";
      let contact_email = "";
      let eligibility = "";
      try {
        const det = await ggPost("fetchOpportunity", { opportunityId: id });
        const syn = (det && det.data && (det.data.synopsis || det.data.forecast)) || {};
        est_amount = awardRange(syn);
        eligibility = String(syn.applicantEligibilityDesc || "").replace(/<[^>]+>/g, " ").trim().slice(0, 300);
        contact_email = String(syn.agencyContactEmail || "").slice(0, 160);
        const awards = syn.numberOfAwards || syn.expectedNumberOfAwards;
        notes = [
          money(syn.estimatedFunding) ? "Est. total funding " + money(syn.estimatedFunding) : "",
          awards ? "~" + awards + " awards" : "",
          h.number ? "Opp # " + h.number : "",
        ].filter(Boolean).join(" · ");
      } catch (_e) { /* detail is best-effort */ }

      return {
        funder: String(agency).slice(0, 200),
        funder_type: "government",
        focus_area: String(h.title || "").slice(0, 300),
        fit_reason: `Federal opportunity matching “${keyword}”.` + (eligibility ? " Eligibility: " + eligibility : " Verify eligibility."),
        est_amount,
        deadline_note: (h.closeDate ? "Closes " + h.closeDate : "See opportunity") + " (Grants.gov)",
        url: id ? DETAIL + id : "https://www.grants.gov",
        contact_email,
        notes: notes || null,
        status: "identified",
        drafted_by: "Gwen (Grants.gov)",
      };
    }));

}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let p: { keyword?: string; rows?: number; statuses?: string; source?: string; diagnose?: boolean };
  try { p = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }

  const keyword = (p.keyword || "").toString().slice(0, 200);
  const rows = Math.max(1, Math.min(Number(p.rows) || 12, 25));
  const oppStatuses = (p.statuses || "posted|forecasted").toString();

  if (p.diagnose) {
    const test = async (configured: boolean, run: () => Promise<unknown[]>) => {
      if (!configured) return { configured: false, ok: false, count: 0, error: "no API key secret set" };
      try { const r = await run(); return { configured: true, ok: true, count: r.length, sample: (r[0] as any)?.focus_area || null }; }
      catch (e) { return { configured: true, ok: false, count: 0, error: e instanceof Error ? e.message : String(e) }; }
    };
    const [simpler, grantsgov, sam] = await Promise.all([
      test(simplerConfigured(), () => simplerSearch("apprenticeship", 2)),
      test(true, async () => { const r = await legacySearch("apprenticeship", oppStatuses, 2); return r; }),
      test(samConfigured(), () => samSearch("construction", 2)),
    ]);
    return json({ diagnose: true, simpler, grantsgov, sam });
  }

  if (p.source === "sam") {
    try {
      const leads = await samSearch(keyword, rows);
      return json({ leads, count: leads.length, source: "sam.gov" });
    } catch (err) {
      console.error("[grants-search] SAM.gov error:", err);
      return json({ error: err instanceof Error ? err.message : "SAM.gov request failed" }, 502);
    }
  }

  if (p.source === "simpler" || simplerConfigured()) {
    try {
      const leads = await simplerSearch(keyword, rows);
      if (leads.length || p.source === "simpler") return json({ leads, count: leads.length, source: "simpler.grants.gov" });
      // nothing from Simpler — try legacy Grants.gov below
    } catch (err) {
      console.error("[grants-search] Simpler.Grants.gov error:", err);
      if (p.source === "simpler") return json({ error: err instanceof Error ? err.message : "Simpler.Grants.gov request failed" }, 502);
      // otherwise fall through to legacy Grants.gov
    }
  }

  try {
    const leads = await legacySearch(keyword, oppStatuses, rows);
    return json({ leads, count: leads.length, source: "grants.gov" });
  } catch (err) {
    console.error("[grants-search] error:", err);
    return json({ error: err instanceof Error ? err.message : "Grants.gov request failed" }, 502);
  }
});
