// ============================================================================
// Jacks of All Trades — Grant Finder: find + save (Edge Function)
// File: supabase/functions/grants-daily/index.ts
// Generated: 2026-09-15 17:10 UTC
// Updated:   2026-09-29 18:00 UTC · Rebuilt as the ONE find-and-save path.
//            The 8am cron job and the hub's "Find grants" button both call it,
//            so leads are always saved server-side (service role — no RLS
//            surprises) and de-duplicated. Fixed CORS so browsers can call it.
//
// REQUEST  POST {SUPABASE_URL}/functions/v1/grants-daily
//   {}                                   -> daily run: rotating keywords, all sources
//   { "keyword": "youth", "target": 8,   -> hub search
//     "sources": ["federal","sam"] }
// RESPONSE { inserted, found, skipped_duplicates, counts:{simpler,grantsgov,sam}, errors:{...} }
//
// SOURCES  federal: Simpler.Grants.gov when SIMPLER_GRANTS_API_KEY is set, else /
//                   also legacy Grants.gov (no key)
//          sam:     SAM.gov contract opportunities when SAM_API_KEY is set
//
// AUTH     pg_cron (x-cron-secret, if CRON_SECRET is set) or a signed-in hub user.
// DEPLOY   supabase functions deploy grants-daily --no-verify-jwt
// SCHEDULE supabase/schedule_grants_daily_2026-09-29_1620.sql
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { samConfigured, samSearch } from "../_shared/sam.ts";
import { simplerConfigured, simplerSearch } from "../_shared/simpler.ts";
import { grantsGovSearch } from "../_shared/grantsgov.ts";

// Rotating keyword pool for the daily run so different opportunities surface.
const KEYWORDS = [
  "apprenticeship", "workforce development", "skilled trades training",
  "affordable housing rehabilitation", "youth mentoring", "neighborhood revitalization",
  "job training", "construction training", "community development",
];

// Browsers do NOT treat "Allow-Headers: *" as covering Authorization, so list them.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

function todaysKeywords(n = 3): string[] {
  const doy = Math.floor((Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 0)) / 86400000);
  return Array.from({ length: n }, (_, i) => KEYWORDS[(doy * n + i) % KEYWORDS.length]);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const url = Deno.env.get("SUPABASE_URL"), svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !svc) return json({ error: "Service role not configured" }, 500);
  const db = createClient(url, svc);

  // Cron job (secret header) or a signed-in hub user (their session JWT).
  const secret = Deno.env.get("CRON_SECRET");
  if (secret && req.headers.get("x-cron-secret") !== secret) {
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = token ? await db.auth.getUser(token) : { data: { user: null } };
    if (!u || !u.user) return json({ error: "Unauthorized — sign in to the hub" }, 401);
  }

  let b: { keyword?: string; target?: number; sources?: string[] } = {};
  try { b = (await req.json()) || {}; } catch (_e) { /* GET / empty body = daily run */ }
  const keyword = String(b.keyword || "").trim().slice(0, 100);
  const target = Math.max(1, Math.min(Number(b.target) || Number(Deno.env.get("GRANTS_DAILY_TARGET")) || 10, 25));
  const want = new Set(Array.isArray(b.sources) && b.sources.length ? b.sources : ["federal", "sam"]);
  const keywords = keyword ? [keyword] : todaysKeywords(3);

  // Existing URLs, to skip duplicates. A failure here usually means the table is missing.
  const seen = new Set<string>();
  const existing = await db.from("grant_leads").select("url").order("created_at", { ascending: false }).limit(2000);
  if (existing.error) {
    return json({ error: "Can't read grant_leads — run supabase/schema_grants_2026-09-15_1610.sql in the Supabase SQL Editor. (" + existing.error.message + ")", inserted: 0 }, 500);
  }
  (existing.data || []).forEach((r: { url?: string }) => r.url && seen.add(r.url));

  const samOn = want.has("sam") && samConfigured();
  const fedOn = want.has("federal");
  // SAM.gov gets a few slots when mixed with federal grants; all of them when alone.
  const samQuota = samOn ? (fedOn ? Math.min(target, Number(Deno.env.get("SAM_DAILY_TARGET")) || 3) : target) : 0;
  const fedTarget = target - samQuota;

  const picked: Record<string, unknown>[] = [];
  const counts: Record<string, number> = { simpler: 0, grantsgov: 0, sam: 0 };
  const errors: Record<string, string> = {};
  let found = 0, dupes = 0;
  const take = (lead: Record<string, unknown>, limit: number, src: string) => {
    if (picked.length >= limit) return;
    found++;
    const u = String(lead.url || "");
    if (!u || seen.has(u)) { dupes++; return; }
    seen.add(u);
    if (!keyword) lead.fit_reason = "Auto-found (daily). " + lead.fit_reason;
    picked.push(lead); counts[src]++;
  };
  const who = (src: string) => (keyword ? "Gwen (" : "Gwen (auto ") + src + ")";

  if (fedOn && simplerConfigured()) {
    try {
      for (const kw of keywords) {
        if (picked.length >= fedTarget) break;
        for (const l of await simplerSearch(kw, 15, who("Simpler.Grants.gov"))) take(l, fedTarget, "simpler");
      }
    } catch (e) { errors.simpler = msg(e); console.error("[grants-daily] simpler", e); }
  }
  // Legacy Grants.gov: primary without a Simpler key, fallback when Simpler came up short.
  if (fedOn && picked.length < fedTarget) {
    try {
      for (const kw of keywords) {
        if (picked.length >= fedTarget) break;
        for (const l of await grantsGovSearch(kw, 15, who("Grants.gov"))) take(l, fedTarget, "grantsgov");
      }
    } catch (e) { errors.grantsgov = msg(e); console.error("[grants-daily] grants.gov", e); }
  }
  if (samOn) {
    try {
      for (const kw of keywords) {
        if (picked.length >= target) break;
        for (const l of await samSearch(kw, 15, who("SAM.gov"))) take(l, target, "sam");
      }
    } catch (e) { errors.sam = msg(e); console.error("[grants-daily] sam", e); }
  } else if (want.has("sam") && !fedOn) {
    errors.sam = "SAM_API_KEY secret not set";
  }

  const base = { found, skipped_duplicates: dupes, counts, errors, target };
  if (!picked.length) {
    return json({ ...base, inserted: 0, message: found ? "Everything found is already in your pipeline" : "No matching opportunities — try a broader keyword" });
  }
  const { error } = await db.from("grant_leads").insert(picked);
  if (error) return json({ ...base, inserted: 0, error: "Saving leads failed: " + error.message }, 500);
  return json({ ...base, inserted: picked.length });
});
