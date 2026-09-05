// ============================================================================
// Jacks of All Trades — Zeffy → Supabase Sync (Edge Function)
// File: supabase/functions/zeffy-sync/index.ts
// Generated: 2026-09-05 15:35 UTC  |  external website ⇄ Zeffy ⇄ Command Center
//
// WHAT IT DOES
//   Pulls raffle/donation data from the Zeffy API (server-side, key kept secret),
//   stores each payment in public.zeffy_payments, and updates public.raffle_stats
//   (pot_total, renovation_raised) so the public site's live "current pot" and the
//   Command Center both reflect real Zeffy numbers. Read-only against Zeffy.
//
// SECURITY
//   The Zeffy key is read from the ZEFFY_API_KEY secret and NEVER returned to the
//   browser. Do not place it in assets/js/config.js. Set it with:
//     supabase secrets set ZEFFY_API_KEY=***  (then REGENERATE the key in Zeffy)
//
// CONFIRM BEFORE PRODUCTION
//   Zeffy's exact base URL / auth header / endpoint paths + JSON field names come
//   from your dashboard's interactive API docs (Settings → Organization →
//   Integrations → API). They are all env-overridable below so no code change is
//   needed — set the ones that differ as secrets. The response mapping in
//   `extractAmount()` / `extractId()` is defensive; adjust field names once
//   confirmed.
//
// DEPLOY
//   supabase functions deploy zeffy-sync --no-verify-jwt
// SCHEDULE (Supabase SQL editor — every 15 min):
//   select cron.schedule('joat-zeffy-15min','*/15 * * * *',
//     $$ select net.http_post(
//          url:='https://YOUR-PROJECT-ref.supabase.co/functions/v1/zeffy-sync',
//          headers:='{"Content-Type":"application/json"}'::jsonb) $$);
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

const env = (k: string, d = "") => Deno.env.get(k) ?? d;

// ---- Zeffy request helper (auth style is env-configurable) -----------------
function zeffyHeaders(): HeadersInit {
  const key = env("ZEFFY_API_KEY");
  const headerName = env("ZEFFY_AUTH_HEADER", "Authorization");
  const scheme = env("ZEFFY_AUTH_SCHEME", "Bearer");
  const value = scheme ? `${scheme} ${key}` : key;
  return { [headerName]: value, "Content-Type": "application/json" };
}

// Defensive field extraction — adjust once the real payload is confirmed.
function extractId(p: Record<string, unknown>): string {
  return String(p.id ?? p.paymentId ?? p.transactionId ?? p.uuid ?? crypto.randomUUID());
}
function extractAmount(p: Record<string, unknown>): number {
  const raw = (p.amount ?? p.totalAmount ?? p.netAmount ?? p.total ?? 0) as number | string;
  const n = typeof raw === "string" ? parseFloat(raw) : Number(raw);
  return Number.isFinite(n) ? n : 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const SUPA_URL = env("SUPABASE_URL");
  const SUPA_KEY = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPA_URL || !SUPA_KEY) return json({ error: "Supabase service credentials missing." }, 500);
  if (!env("ZEFFY_API_KEY")) return json({ error: "ZEFFY_API_KEY secret not set." }, 500);

  const db = createClient(SUPA_URL, SUPA_KEY);
  const base = env("ZEFFY_API_BASE", "https://api.zeffy.com").replace(/\/$/, "");
  const paymentsPath = env("ZEFFY_PAYMENTS_PATH", "/v1/payments");
  const campaignId = env("ZEFFY_RAFFLE_CAMPAIGN_ID");
  const potShare = parseFloat(env("ZEFFY_POT_SHARE", "0.5"));   // 50% to the winner
  const renoShare = parseFloat(env("ZEFFY_RENO_SHARE", "0.5")); // 50% funds renovation

  try {
    // 1) Page through Zeffy payments (cursor/next style, defensive).
    let url: string | null = `${base}${paymentsPath}?limit=100${campaignId ? `&campaignId=${encodeURIComponent(campaignId)}` : ""}`;
    const payments: Record<string, unknown>[] = [];
    let guard = 0;
    while (url && guard++ < 50) {
      const res = await fetch(url, { headers: zeffyHeaders() });
      if (!res.ok) {
        const body = await res.text();
        return json({ error: `Zeffy API ${res.status}`, detail: body.slice(0, 500), url }, 502);
      }
      const data = await res.json();
      const batch: Record<string, unknown>[] = Array.isArray(data) ? data : (data.data ?? data.payments ?? data.results ?? []);
      payments.push(...batch);
      const next = (data && (data.next ?? data.nextCursor ?? data.paging?.next)) as string | undefined;
      url = next ? (next.startsWith("http") ? next : `${base}${next}`) : null;
    }

    // 2) Upsert each payment (idempotent on zeffy_id).
    if (payments.length) {
      const rows = payments.map((p) => ({
        zeffy_id: extractId(p),
        amount: extractAmount(p),
        currency: (p.currency ?? "USD") as string,
        campaign_id: (p.campaignId ?? campaignId ?? null) as string | null,
        buyer_email: (p.email ?? (p.contact as Record<string, unknown>)?.email ?? null) as string | null,
        status: (p.status ?? null) as string | null,
        created_at: (p.createdAt ?? p.date ?? new Date().toISOString()) as string,
        raw: p,
      }));
      const { error } = await db.from("zeffy_payments").upsert(rows, { onConflict: "zeffy_id" });
      if (error) return json({ error: "upsert zeffy_payments failed", detail: error.message }, 500);
    }

    // 3) Recompute totals from stored payments (single source of truth).
    const { data: agg, error: aggErr } = await db
      .from("zeffy_payments")
      .select("amount")
      .not("status", "eq", "refunded");
    if (aggErr) return json({ error: "aggregate failed", detail: aggErr.message }, 500);
    const gross = (agg ?? []).reduce((s, r) => s + Number(r.amount || 0), 0);

    // 4) Update the single row the public site + Command Center already read.
    //    (raffle_stats.id is an identity column, so update-latest or insert once.)
    const stats = {
      pot_total: Math.round(gross * potShare),
      renovation_raised: Math.round(gross * renoShare),
      gross_raised: Math.round(gross),
      payment_count: (agg ?? []).length,
      updated_at: new Date().toISOString(),
    };
    const { data: existing } = await db
      .from("raffle_stats").select("id").order("updated_at", { ascending: false }).limit(1).maybeSingle();
    const upErr = existing
      ? (await db.from("raffle_stats").update(stats).eq("id", existing.id)).error
      : (await db.from("raffle_stats").insert(stats)).error;
    if (upErr) return json({ error: "update raffle_stats failed", detail: upErr.message }, 500);

    return json({ ok: true, synced: payments.length, gross, pot_total: stats.pot_total });
  } catch (err) {
    return json({ error: "zeffy-sync exception", detail: String(err) }, 500);
  }
});
