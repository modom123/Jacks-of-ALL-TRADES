// ============================================================================
// Jacks of All Trades — legacy Grants.gov helper (shared by Edge Functions)
// File: supabase/functions/_shared/grantsgov.ts
// Generated: 2026-09-29 18:00 UTC
//
// search2 (matching opportunities) + fetchOpportunity (award floor/ceiling,
// eligibility, contact) from the free public Grants.gov API — no key.
//   POST https://api.grants.gov/v1/api/search2   { keyword, rows, oppStatuses }
// Moved here from grants-search / grants-daily so both use one implementation.
// Updated 2026-09-29 22:00 UTC · category + nonprofit-eligibility filters on search2.
// ============================================================================

// Official endpoint first, then the grants.gov/api/common mirror.
const GG_BASES = ["https://api.grants.gov/v1/api", "https://grants.gov/api/common"];
const DETAIL = "https://www.grants.gov/search-results-detail/";

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
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { lastErr = new Error(`${base}/${path} HTTP ${res.status}`); continue; }
      const out = await res.json();
      // search2 reports failures in-body: { errorcode: <non-zero>, msg }
      if (out && out.errorcode && Number(out.errorcode) !== 0) {
        lastErr = new Error(`Grants.gov ${path}: ${out.msg || "errorcode " + out.errorcode}`); continue;
      }
      return out;
    } catch (e) { lastErr = e; }
  }
  throw lastErr instanceof Error ? lastErr : new Error(`Grants.gov ${path} unreachable`);
}

// Widens the keyword if nothing matches: full phrase → first word → latest.
export async function grantsGovSearch(
  keyword: string, rows: number, draftedBy = "Gwen (Grants.gov)", oppStatuses = "posted|forecasted",
): Promise<Record<string, unknown>[]> {
  const tries = [keyword, keyword.split(/\s+/)[0], ""].filter((k, i, a) => a.indexOf(k) === i);
  let hits: any[] = [];
  for (const kw of tries) {
    // Same screen as Simpler (updated 2026-09-29 22:00 UTC): employment/training (ELT),
    // housing (HO), community development (CD); nonprofits with 501(c)(3) (12) or unrestricted (99).
    const search = await ggPost("search2", { keyword: kw, rows, oppStatuses, fundingCategories: "ELT|HO|CD", eligibilities: "12|99" });
    hits = (search && search.data && search.data.oppHits) || [];
    if (hits.length) break;
  }

  return await Promise.all(hits.slice(0, rows).map(async (h) => {
    const id = h.id || h.opportunityId;
    let est_amount = "see opportunity (verify)", notes = "", contact_email = "", eligibility = "";
    try {
      const det = await ggPost("fetchOpportunity", { opportunityId: id });
      const syn = (det && det.data && (det.data.synopsis || det.data.forecast)) || {};
      est_amount = awardRange(syn);
      eligibility = String(syn.applicantEligibilityDesc || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
      contact_email = String(syn.agencyContactEmail || "").slice(0, 160);
      const awards = syn.numberOfAwards || syn.expectedNumberOfAwards;
      notes = [
        money(syn.estimatedFunding) ? "Est. total " + money(syn.estimatedFunding) : "",
        awards ? "~" + awards + " awards" : "",
        h.number ? "Opp # " + h.number : "",
      ].filter(Boolean).join(" · ");
    } catch (_e) { /* detail is best-effort */ }

    return {
      funder: String(h.agencyName || h.agency || h.agencyCode || "Federal agency").slice(0, 200),
      funder_type: "government",
      focus_area: String(h.title || "").slice(0, 300),
      fit_reason: `Federal opportunity matching “${keyword || "latest"}”.` + (eligibility ? " Eligibility: " + eligibility : " Verify eligibility."),
      est_amount,
      deadline_note: (h.closeDate ? "Closes " + h.closeDate : "See opportunity") + " (Grants.gov)",
      url: id ? DETAIL + id : "https://www.grants.gov",
      contact_email: contact_email || null,
      notes: notes || null,
      status: "identified",
      drafted_by: draftedBy,
    };
  }));
}
