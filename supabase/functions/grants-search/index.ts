// ============================================================================
// Jacks of All Trades — Grant search (read-only) + connection test
// File: supabase/functions/grants-search/index.ts
// Generated: 2026-09-15 16:10 UTC
// Updated:   2026-09-29 18:00 UTC · Uses the shared source helpers. Saving
//            leads now happens in grants-daily (find + save); this function
//            only searches and powers "Test grant connections".
//
//   POST { "keyword": "apprenticeship", "rows": 12, "source": "grantsgov"|"simpler"|"sam" }
//     -> { leads: [...grant_leads shape...], count, source }   (nothing saved)
//   POST { "diagnose": true }
//     -> { simpler, grantsgov, sam, database }  each { ok, configured, count, error }
//
// DEPLOY  supabase functions deploy grants-search
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { samConfigured, samSearch } from "../_shared/sam.ts";
import { simplerConfigured, simplerSearch } from "../_shared/simpler.ts";
import { grantsGovSearch } from "../_shared/grantsgov.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

async function test(configured: boolean, run: () => Promise<any[]>) {
  if (!configured) return { configured: false, ok: false, count: 0, error: "no API key secret set" };
  try {
    const r = await run();
    return { configured: true, ok: true, count: r.length, sample: (r[0] && r[0].focus_area) || null };
  } catch (e) { return { configured: true, ok: false, count: 0, error: msg(e) }; }
}

async function testDatabase() {
  const url = Deno.env.get("SUPABASE_URL"), svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !svc) return { configured: false, ok: false, count: 0, error: "service role not available" };
  const { count, error } = await createClient(url, svc).from("grant_leads").select("id", { count: "exact", head: true });
  if (error) return { configured: true, ok: false, count: 0, error: "grant_leads table missing — run supabase/schema_grants_2026-09-15_1610.sql (" + error.message + ")" };
  return { configured: true, ok: true, count: count || 0 };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let p: { keyword?: string; rows?: number; source?: string; diagnose?: boolean };
  try { p = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }

  if (p.diagnose) {
    const [simpler, grantsgov, sam, database] = await Promise.all([
      test(simplerConfigured(), () => simplerSearch("apprenticeship", 2)),
      test(true, () => grantsGovSearch("apprenticeship", 2)),
      test(samConfigured(), () => samSearch("construction", 2)),
      testDatabase(),
    ]);
    return json({ diagnose: true, simpler, grantsgov, sam, database });
  }

  const keyword = String(p.keyword || "").slice(0, 200);
  const rows = Math.max(1, Math.min(Number(p.rows) || 12, 25));
  try {
    if (p.source === "sam") return json({ leads: await samSearch(keyword, rows), source: "sam.gov" });
    if (p.source === "simpler" || (p.source !== "grantsgov" && simplerConfigured())) {
      try {
        const leads = await simplerSearch(keyword, rows);
        if (leads.length || p.source === "simpler") return json({ leads, count: leads.length, source: "simpler.grants.gov" });
      } catch (e) { if (p.source === "simpler") throw e; }
    }
    const leads = await grantsGovSearch(keyword, rows);
    return json({ leads, count: leads.length, source: "grants.gov" });
  } catch (e) {
    console.error("[grants-search]", e);
    return json({ error: msg(e) }, 502);
  }
});
