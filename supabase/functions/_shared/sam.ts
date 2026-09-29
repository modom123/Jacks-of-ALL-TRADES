// ============================================================================
// Jacks of All Trades — SAM.gov Opportunities helper (shared by Edge Functions)
// File: supabase/functions/_shared/sam.ts
// Generated: 2026-09-29 15:51 UTC
//
// Pulls live federal opportunities from the SAM.gov "Get Opportunities" public
// API (v2) and normalizes them to the grant_leads shape. The API key is a
// SERVER-SIDE secret — never put it in assets/js/config.js or in git:
//
//   supabase secrets set SAM_API_KEY=SAM-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
//
// Note: SAM.gov keys expire every 90 days — regenerate at sam.gov → Profile →
// Account Details → Public API Key, then re-run the command above.
// ============================================================================

const SAM_SEARCH = "https://api.sam.gov/opportunities/v2/search";
// Notice types that aren't open opportunities.
const SKIP_TYPES = /award notice|justification|sale of surplus/i;

export function samConfigured(): boolean {
  return !!Deno.env.get("SAM_API_KEY");
}

// SAM.gov wants MM/dd/yyyy.
function samDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCMonth() + 1)}/${p(d.getUTCDate())}/${d.getUTCFullYear()}`;
}

function money(v: unknown): string {
  const n = Number(String(v ?? "").replace(/[^0-9.]/g, ""));
  return isFinite(n) && n > 0 ? "$" + n.toLocaleString() : "";
}

export async function samSearch(keyword: string, rows: number, draftedBy = "Gwen (SAM.gov)"): Promise<Record<string, unknown>[]> {
  const key = Deno.env.get("SAM_API_KEY");
  if (!key) throw new Error("SAM_API_KEY not set — run: supabase secrets set SAM_API_KEY=...");

  const days = Number(Deno.env.get("SAM_LOOKBACK_DAYS")) || 60;
  const now = new Date();
  const qs = new URLSearchParams({
    api_key: key,
    postedFrom: samDate(new Date(now.getTime() - days * 86400000)),
    postedTo: samDate(now),
    limit: String(Math.min(rows * 3, 100)), // over-fetch; inactive/award notices are filtered below
    offset: "0",
  });
  if (keyword) qs.set("title", keyword);

  const res = await fetch(`${SAM_SEARCH}?${qs}`, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    // Never echo the URL — it carries the API key.
    const hint = res.status === 401 || res.status === 403 ? " (check / renew SAM_API_KEY)" : res.status === 429 ? " (daily rate limit reached)" : "";
    throw new Error(`SAM.gov HTTP ${res.status}${hint}`);
  }
  const data = await res.json();
  const opps: any[] = (data && data.opportunitiesData) || [];

  return opps
    .filter((o) => String(o.active || "Yes").toLowerCase() === "yes" && !SKIP_TYPES.test(String(o.type || "")))
    .slice(0, rows)
    .map((o) => {
      const poc = (Array.isArray(o.pointOfContact) && (o.pointOfContact.find((c: any) => c.type === "primary") || o.pointOfContact[0])) || {};
      const org = String(o.fullParentPathName || o.department || "Federal agency").split(".").filter(Boolean);
      const awardAmt = money(o.award && o.award.amount);
      return {
        funder: org.slice(0, 2).join(" — ").slice(0, 200) || "Federal agency",
        funder_type: "government",
        focus_area: String(o.title || "").slice(0, 300),
        fit_reason: `SAM.gov ${o.type || "opportunity"} matching “${keyword || "all"}”.` +
          (o.typeOfSetAsideDescription ? " Set-aside: " + o.typeOfSetAsideDescription + "." : "") + " Verify eligibility.",
        est_amount: awardAmt ? `${awardAmt} (SAM.gov)` : "see opportunity (verify)",
        deadline_note: (o.responseDeadLine ? "Responses due " + String(o.responseDeadLine).slice(0, 10) : "See opportunity") + " (SAM.gov)",
        url: o.uiLink || (o.noticeId ? `https://sam.gov/opp/${o.noticeId}/view` : "https://sam.gov"),
        contact_name: poc.fullName ? String(poc.fullName).slice(0, 160) : null,
        contact_email: poc.email ? String(poc.email).slice(0, 160) : null,
        notes: [o.solicitationNumber ? "Sol # " + o.solicitationNumber : "", o.naicsCode ? "NAICS " + o.naicsCode : "", o.postedDate ? "Posted " + o.postedDate : ""].filter(Boolean).join(" · ") || null,
        status: "identified",
        drafted_by: draftedBy,
      };
    });
}
