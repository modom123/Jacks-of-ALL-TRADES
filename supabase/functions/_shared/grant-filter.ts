// ============================================================================
// Jacks of All Trades — grant "garbage filter" (shared by Edge Functions)
// File: supabase/functions/_shared/grant-filter.ts
// Generated: 2026-09-29 22:00 UTC
//
// Rules-based screen applied BEFORE a lead is saved (grants-daily) and before
// Gwen spends an AI call on it (grants-agents). Built from a review of the live
// pipeline on 2026-09-29, where 17 of 17 federal leads were misfits: NIH /
// HRSA / CDC research and medical-training grants, rural opioid programs, HIV
// services, national technical-assistance providers, manufactured-housing-only
// programs, and listings whose deadline had already passed.
//
// junkReason(lead) → a short reason string if the lead is clearly not a fit for
// a Detroit trades-training / housing-rehab / youth-apprenticeship nonprofit,
// or null if it should go on to Gwen for scoring.
// ============================================================================

type Lead = Record<string, unknown>;

// Agencies whose grants are research / medical / space / defense — never a fit.
const AGENCY_BLOCK = new RegExp([
  "National Institutes? of Health", "\\bNIH\\b", "National Cancer Institute", "National Institute of",
  "Health Resources and Services", "\\bHRSA\\b", "Centers for Disease Control", "\\bCDC\\b",
  "Food and Drug", "Agency for Healthcare Research", "Indian Health Service",
  "National Science Foundation", "\\bNSF\\b", "National Aeronautics", "\\bNASA\\b",
  "Department of Defense", "\\bDOD\\b", "DOD\\b", "Army", "Navy", "Air Force", "DARPA",
  "Office of Science", "National Oceanic", "\\bNOAA\\b", "National Endowment for the Humanities",
  "Substance Abuse and Mental Health",
].join("|"), "i");

// Titles that signal research, medicine, a population/geography that excludes
// Detroit, or a program for intermediaries rather than local nonprofits.
const TITLE_BLOCK = new RegExp([
  "\\bresearch\\b", "\\bclinical\\b", "biomedical", "scientist", "postdoctoral", "doctoral", "fellowship",
  "\\bHIV\\b", "\\bAIDS\\b", "Ryan White", "opioid", "substance use", "overdose", "cancer", "vaccin", "disease",
  "synchrotron", "\\bNRSA\\b", "Kirschstein", "\\brural\\b", "\\btribal\\b", "Native American", "Alaska Native",
  "Native Hawaiian", "Pacific Island", "international", "foreign", "overseas",
  "Notice of Intent", "technical assistance", "capacity building program",
  "manufactured housing", "Preservation and Reinvestment Initiative",
  // NIH/CDC activity codes in titles, e.g. (T32), U54, R24, P30, C06
  "\\b(?:[CDFGKPRSTU]\\d{2}|UG\\d|UH\\d)\\b",
].join("|"), "i");

/** Parse "Closes 2026-12-01", "Closes 12/01/2026", "Responses due 2026-10-20". */
export function deadlineOf(note: unknown): Date | null {
  const t = String(note || "");
  let m = t.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = t.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? new Date(+m[3], +m[1] - 1, +m[2]) : null;
}

export function junkReason(l: Lead): string | null {
  const agency = String(l.funder || "");
  const title = String(l.focus_area || "");
  const d = deadlineOf(l.deadline_note);
  if (d && d.getTime() < Date.now() - 86400000) return "deadline already passed";
  const a = agency.match(AGENCY_BLOCK);
  if (a) return `research/medical agency (${a[0]})`;
  const t = title.match(TITLE_BLOCK);
  if (t) return `not a fit: "${t[0]}" program`;
  return null;
}
