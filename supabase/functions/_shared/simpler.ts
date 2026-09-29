// ============================================================================
// Jacks of All Trades — Simpler.Grants.gov helper (shared by Edge Functions)
// File: supabase/functions/_shared/simpler.ts
// Generated: 2026-09-29 16:20 UTC
// Updated:   2026-09-29 17:00 UTC · OR keyword matching + widening fallback
//
// Searches the Simpler.Grants.gov API (the new Grants.gov — HHS/simpler-grants-gov,
// forked at modom123/simpler-grants-gov) and normalizes results to grant_leads.
// One call returns award floor/ceiling, close date, eligibility and contact, so
// no per-opportunity detail requests are needed (unlike legacy Grants.gov).
//
//   POST https://api.simpler.grants.gov/v1/opportunities/search
//   header X-API-Key: <key>   (simpler.grants.gov → sign in → Developer → API keys)
//
// SERVER-SIDE secret only:  supabase secrets set SIMPLER_GRANTS_API_KEY=...
// ============================================================================

const SIMPLER_SEARCH = "https://api.simpler.grants.gov/v1/opportunities/search";
const DETAIL = "https://simpler.grants.gov/opportunity/";
// Legacy Grants.gov detail link — used as the lead URL when available so leads
// dedupe against ones already pulled from the legacy Grants.gov API.
const GG_DETAIL = "https://www.grants.gov/search-results-detail/";

// Opportunities a 501(c)(3) can apply to.
const APPLICANT_TYPES = ["nonprofits_non_higher_education_with_501c3", "unrestricted"];

export function simplerConfigured(): boolean {
  return !!Deno.env.get("SIMPLER_GRANTS_API_KEY");
}

function money(v: unknown): string {
  const n = Number(v);
  return isFinite(n) && n > 0 ? "$" + n.toLocaleString() : "";
}
function awardRange(s: Record<string, any>): string {
  const floor = money(s.award_floor), ceil = money(s.award_ceiling);
  if (floor && ceil) return `${floor}–${ceil} per award (Simpler.Grants.gov)`;
  if (ceil) return `up to ${ceil} per award (Simpler.Grants.gov)`;
  if (floor) return `from ${floor} per award (Simpler.Grants.gov)`;
  const est = money(s.estimated_total_program_funding);
  return est ? `${est} total program funding (Simpler.Grants.gov)` : "see opportunity (verify)";
}
const clean = (v: unknown, n: number) => String(v || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, n);

export async function simplerSearch(keyword: string, rows: number, draftedBy = "Gwen (Simpler.Grants.gov)"): Promise<Record<string, unknown>[]> {
  const key = Deno.env.get("SIMPLER_GRANTS_API_KEY");
  if (!key) throw new Error("SIMPLER_GRANTS_API_KEY not set — run: supabase secrets set SIMPLER_GRANTS_API_KEY=...");

  const size = Math.max(1, Math.min(rows, 50));
  const query = async (q: string, nonprofitOnly: boolean): Promise<any[]> => {
    const filters: Record<string, unknown> = { opportunity_status: { one_of: ["posted", "forecasted"] } };
    if (nonprofitOnly) filters.applicant_type = { one_of: APPLICANT_TYPES };
    const body: Record<string, unknown> = {
      filters,
      pagination: {
        page_offset: 1,
        page_size: size,
        sort_order: [{ order_by: q ? "relevancy" : "post_date", sort_direction: "descending" }],
      },
    };
    // OR, not the API's default AND — "workforce apprenticeship housing" should
    // match any of the words, not require all three.
    if (q) { body.query = q.slice(0, 100); body.query_operator = "OR"; }
    const res = await fetch(SIMPLER_SEARCH, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "X-API-Key": key },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const hint = res.status === 401 || res.status === 403 ? " (check SIMPLER_GRANTS_API_KEY)" : res.status === 429 ? " (rate limit — try later)" : "";
      let detail = "";
      try { const e = await res.json(); detail = e && e.message ? " — " + String(e.message).slice(0, 160) : ""; } catch (_e) { /* no body */ }
      throw new Error(`Simpler.Grants.gov HTTP ${res.status}${hint}${detail}`);
    }
    const data = await res.json();
    return (data && data.data) || [];
  };

  // Widen step by step until something comes back (updated 2026-09-29 17:00 UTC).
  let opps = await query(keyword, true);
  if (!opps.length) opps = await query(keyword, false);
  if (!opps.length && keyword) opps = await query("", true);

  return opps.map((o) => {
    const s = o.summary || {};
    const close = s.close_date || s.forecasted_close_date;
    const eligibility = clean(s.applicant_eligibility_description, 300);
    return {
      funder: String(o.agency_name || o.top_level_agency_name || o.agency_code || "Federal agency").slice(0, 200),
      funder_type: "government",
      focus_area: String(o.opportunity_title || "").slice(0, 300),
      fit_reason: `Federal ${o.opportunity_status || ""} opportunity matching “${keyword || "latest"}”.` +
        (eligibility ? " Eligibility: " + eligibility : " Verify eligibility."),
      est_amount: awardRange(s),
      deadline_note: (close ? "Closes " + close : clean(s.close_date_description, 120) || "See opportunity") + " (Simpler.Grants.gov)",
      url: o.legacy_opportunity_id ? GG_DETAIL + o.legacy_opportunity_id
        : o.opportunity_id ? DETAIL + o.opportunity_id : "https://simpler.grants.gov",
      contact_email: s.agency_email_address ? String(s.agency_email_address).slice(0, 160) : null,
      notes: [
        money(s.estimated_total_program_funding) ? "Est. total " + money(s.estimated_total_program_funding) : "",
        s.expected_number_of_awards ? "~" + s.expected_number_of_awards + " awards" : "",
        o.opportunity_number ? "Opp # " + o.opportunity_number : "",
        s.is_cost_sharing ? "Cost share required" : "",
        o.opportunity_id ? "Simpler: " + DETAIL + o.opportunity_id : "",
      ].filter(Boolean).join(" · ") || null,
      status: "identified",
      drafted_by: draftedBy,
    };
  });
}
