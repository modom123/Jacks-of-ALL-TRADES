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
// ============================================================================

const GG = "https://api.grants.gov/v1/api";
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
  const res = await fetch(`${GG}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Grants.gov ${path} HTTP ${res.status}`);
  return await res.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let p: { keyword?: string; rows?: number; statuses?: string };
  try { p = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }

  const keyword = (p.keyword || "").toString().slice(0, 200);
  const rows = Math.max(1, Math.min(Number(p.rows) || 12, 25));
  const oppStatuses = (p.statuses || "posted|forecasted").toString();

  try {
    const search = await ggPost("search2", { keyword, rows, oppStatuses });
    const hits: any[] = (search && search.data && search.data.oppHits) || [];

    const leads = await Promise.all(hits.slice(0, rows).map(async (h) => {
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

    return json({ leads, count: leads.length, source: "grants.gov", hitCount: (search.data && search.data.hitCount) || leads.length });
  } catch (err) {
    console.error("[grants-search] error:", err);
    return json({ error: err instanceof Error ? err.message : "Grants.gov request failed" }, 502);
  }
});
