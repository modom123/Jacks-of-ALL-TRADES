// ============================================================================
// Jacks of All Trades — Zeffy → Supabase Sync (Edge Function)
// File: supabase/functions/zeffy-sync/index.ts
// Generated: 2026-09-05 15:35 UTC  |  external website ⇄ Zeffy ⇄ Command Center
// Updated:   2026-09-29 23:00 UTC  |  Donor CRM: every Zeffy buyer/donor (name +
//            email) becomes a donor record; every payment becomes a gift in the
//            donations ledger tagged with its Zeffy campaign/form; donor totals
//            are recalculated across ALL sources (refresh_donor_totals()).
//
// WHAT IT DOES
//   1. Pulls ALL Zeffy payments (every form: raffle, donations, events…), plus the
//      raffle campaign's payments separately so raffle rows are always labeled
//      correctly. Stores each in public.zeffy_payments (idempotent on zeffy_id).
//   2. Updates public.raffle_stats from RAFFLE payments only (pot + renovation).
//   3. Donor CRM: upserts donors by email (case-insensitive — existing records
//      are matched, never duplicated), inserts each succeeded payment once into
//      public.donations (method zeffy, campaign = Zeffy form name), then runs
//      refresh_donor_totals() so total_given / last gift reflect every source.
//
// SECURITY  ZEFFY_API_KEY is a server-side secret; never returned to the browser.
//
// ZEFFY API (confirmed 2026-09-14)
//   Base: https://api.zeffy.com/api/v1  ·  GET /payments  ·  Authorization: Bearer <key>
//   Cursor pagination: has_more + next_cursor → starting_after. Env overrides:
//     ZEFFY_API_BASE, ZEFFY_PAYMENTS_PATH, ZEFFY_RAFFLE_CAMPAIGN_ID, ZEFFY_CAMPAIGN_PARAM,
//     ZEFFY_AMOUNT_DIVISOR (default 100 — Zeffy amounts are in cents),
//     ZEFFY_CAMPAIGN_NAMES  (optional JSON {"<campaign id>": "Readable name"}),
//     ZEFFY_SYNC_CRM        (default "true"; "false" = raffle stats only)
//   POST {"inspect": true} returns the field NAMES of one payment (values hidden)
//   to confirm the payload shape.
//
// DEPLOY    supabase functions deploy zeffy-sync --no-verify-jwt
// SCHEDULE  supabase/schedule_zeffy_sync_15min_2026-09-23_1400.sql (every 15 min)
// SETUP     supabase/setup_donor_crm_sync_2026-09-29_2300.sql (for the CRM step)
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

const env = (k: string, d = "") => Deno.env.get(k) ?? d;
type P = Record<string, any>;

function zeffyHeaders(): HeadersInit {
  const key = env("ZEFFY_API_KEY");
  const headerName = env("ZEFFY_AUTH_HEADER", "Authorization");
  const scheme = env("ZEFFY_AUTH_SCHEME", "Bearer");
  return { [headerName]: scheme ? `${scheme} ${key}` : key, "Content-Type": "application/json" };
}

// Defensive field extraction (Zeffy payload names vary by form type).
const first = (...v: unknown[]) => v.find((x) => x !== undefined && x !== null && String(x).trim() !== "");
function extractId(p: P): string {
  return String(first(p.id, p.paymentId, p.transactionId, p.uuid) ?? crypto.randomUUID());
}
function extractAmount(p: P, divisor: number): number {
  const raw = first(p.amount, p.totalAmount, p.netAmount, p.total, p.amountInCents, 0) as number | string;
  const n = typeof raw === "string" ? parseFloat(raw) : Number(raw);
  return Number.isFinite(n) ? n / divisor : 0;
}
function extractCampaignId(p: P): string | null {
  const v = first(p.campaign_id, p.campaignId, p.campaign?.id, p.form_id, p.formId, p.form?.id);
  return v == null ? null : String(v);
}
function extractCampaignName(p: P): string | null {
  const v = first(p.campaign?.title, p.campaign?.name, p.form?.title, p.form?.name, p.campaign_title, p.campaignTitle,
    p.campaign_name, p.campaignName, p.form_title, p.formTitle, p.form_name, p.formName);
  return v == null ? null : String(v).slice(0, 200);
}
function extractBuyer(p: P): { email: string | null; name: string | null; phone: string | null; address: string | null } {
  const b = (p.buyer ?? p.donor ?? p.payer ?? p.customer ?? {}) as P;
  const email = first(b.email, p.email, p.buyer_email, p.buyerEmail) as string | undefined;
  const fn = first(b.first_name, b.firstName, p.first_name, p.firstName);
  const ln = first(b.last_name, b.lastName, p.last_name, p.lastName);
  const full = first(b.name, b.full_name, b.fullName, p.name, p.donor_name, p.buyer_name, p.buyerName,
    fn || ln ? [fn, ln].filter(Boolean).join(" ") : undefined);
  const addr = b.address ?? p.address;
  const address = addr && typeof addr === "object"
    ? [addr.line1 ?? addr.street, addr.city, addr.state ?? addr.region, addr.postal_code ?? addr.postalCode ?? addr.zip].filter(Boolean).join(", ")
    : (addr ? String(addr) : null);
  return {
    email: email ? String(email).trim().toLowerCase().slice(0, 200) : null,
    name: full ? String(full).trim().slice(0, 160) : null,
    phone: (first(b.phone, b.phone_number, b.phoneNumber, p.phone) as string | undefined)?.toString().slice(0, 40) ?? null,
    address: address ? String(address).slice(0, 300) : null,
  };
}
function shape(v: unknown, depth = 0): unknown {
  if (v === null || typeof v !== "object") return typeof v;
  if (Array.isArray(v)) return v.length ? [shape(v[0], depth + 1)] : [];
  if (depth > 3) return "object";
  return Object.fromEntries(Object.entries(v as P).map(([k, x]) => [k, shape(x, depth + 1)]));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const SUPA_URL = env("SUPABASE_URL"), SUPA_KEY = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPA_URL || !SUPA_KEY) return json({ error: "Supabase service credentials missing." }, 500);
  if (!env("ZEFFY_API_KEY")) return json({ error: "ZEFFY_API_KEY secret not set." }, 500);
  let body: P = {};
  try { body = (await req.json()) || {}; } catch (_e) { /* cron / empty body */ }

  const db = createClient(SUPA_URL, SUPA_KEY);
  const base = env("ZEFFY_API_BASE", "https://api.zeffy.com/api/v1").replace(/\/$/, "");
  const paymentsPath = env("ZEFFY_PAYMENTS_PATH", "/payments");
  const raffleId = env("ZEFFY_RAFFLE_CAMPAIGN_ID");
  const campaignParam = env("ZEFFY_CAMPAIGN_PARAM", "campaignId");
  const amountDivisor = parseFloat(env("ZEFFY_AMOUNT_DIVISOR", "100")) || 100;
  const potShare = parseFloat(env("ZEFFY_POT_SHARE", "0.5"));
  const renoShare = parseFloat(env("ZEFFY_RENO_SHARE", "0.5"));
  let names: Record<string, string> = {};
  try { names = JSON.parse(env("ZEFFY_CAMPAIGN_NAMES", "{}")); } catch (_e) { /* optional */ }

  const listUrl = (campaign: string | null, cursor?: string) => {
    const u = new URL(`${base}${paymentsPath}`);
    u.searchParams.set("limit", "100");
    if (campaign) u.searchParams.set(campaignParam, campaign);
    if (cursor) u.searchParams.set("starting_after", cursor);
    return u.toString();
  };
  async function fetchAll(campaign: string | null): Promise<P[]> {
    let url: string | null = listUrl(campaign);
    const out: P[] = [];
    let guard = 0;
    while (url && guard++ < 200) {
      const res = await fetch(url, { headers: zeffyHeaders() });
      if (!res.ok) throw new Error(`Zeffy API ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const data = await res.json();
      const batch: P[] = Array.isArray(data) ? data : (data.data ?? data.payments ?? data.results ?? []);
      out.push(...batch);
      const hasMore = Boolean(data && (data.has_more ?? data.hasMore ?? false));
      const cursor = (data && (data.next_cursor ?? data.nextCursor ?? null)) as string | null;
      url = hasMore && cursor ? listUrl(campaign, cursor) : null;
    }
    return out;
  }
  const toRow = (p: P, forcedCampaign: string | null) => {
    const buyer = extractBuyer(p);
    const createdSec = Number(p.created);
    return {
      zeffy_id: extractId(p),
      amount: extractAmount(p, amountDivisor),
      currency: (p.currency ?? "USD") as string,
      campaign_id: forcedCampaign ?? extractCampaignId(p),
      buyer_email: buyer.email,
      status: (p.status ?? null) as string | null,
      created_at: Number.isFinite(createdSec) ? new Date(createdSec * 1000).toISOString() : String(p.createdAt ?? p.date ?? new Date().toISOString()),
      raw: p,
    };
  };

  try {
    // 1) Fetch: everything, then the raffle list (labels raffle rows reliably).
    const all = await fetchAll(null);
    if (body.inspect) return json({ ok: true, payments: all.length, example_fields: all[0] ? shape(all[0]) : null });
    const raffle = raffleId ? await fetchAll(raffleId) : [];
    const raffleIds = new Set(raffle.map(extractId));
    const rowsById = new Map<string, ReturnType<typeof toRow>>();
    for (const p of all) rowsById.set(extractId(p), toRow(p, null));
    for (const p of raffle) rowsById.set(extractId(p), toRow(p, raffleId));
    const rows = [...rowsById.values()];
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await db.from("zeffy_payments").upsert(rows.slice(i, i + 500), { onConflict: "zeffy_id" });
      if (error) return json({ error: "upsert zeffy_payments failed", detail: error.message }, 500);
    }

    // 2) Raffle stats from RAFFLE payments only (all payments if no raffle id is configured).
    let aggQ = db.from("zeffy_payments").select("amount").eq("status", "succeeded");
    if (raffleId) aggQ = aggQ.eq("campaign_id", raffleId);
    const { data: agg, error: aggErr } = await aggQ.limit(50000);
    if (aggErr) return json({ error: "aggregate failed", detail: aggErr.message }, 500);
    const gross = (agg ?? []).reduce((s, r) => s + Number(r.amount || 0), 0);
    const stats = {
      pot_total: Math.round(gross * potShare), renovation_raised: Math.round(gross * renoShare),
      gross_raised: Math.round(gross), payment_count: (agg ?? []).length, updated_at: new Date().toISOString(),
    };
    const { data: existing } = await db.from("raffle_stats").select("id").order("updated_at", { ascending: false }).limit(1).maybeSingle();
    const upErr = existing
      ? (await db.from("raffle_stats").update(stats).eq("id", existing.id)).error
      : (await db.from("raffle_stats").insert(stats)).error;
    if (upErr) return json({ error: "update raffle_stats failed", detail: upErr.message }, 500);

    // 3) Donor CRM
    const crm = { donors_created: 0, gifts_added: 0, donors_updated: 0, skipped_no_email: 0, error: null as string | null };
    if (env("ZEFFY_SYNC_CRM", "true") !== "false") {
      try {
        const { data: stored, error: sErr } = await db.from("zeffy_payments").select("zeffy_id,amount,campaign_id,created_at,raw").eq("status", "succeeded").limit(50000);
        if (sErr) throw new Error(sErr.message);
        const { data: have, error: hErr } = await db.from("donations").select("zeffy_id").not("zeffy_id", "is", null).limit(100000);
        if (hErr) throw new Error(hErr.message + " — run supabase/setup_donor_crm_sync_2026-09-29_2300.sql");
        const already = new Set((have ?? []).map((r: P) => r.zeffy_id));
        const fresh = (stored ?? []).filter((r: P) => !already.has(r.zeffy_id));

        const { data: donorRows, error: dErr } = await db.from("donors").select("id,email,full_name,phone,address").not("email", "is", null).limit(100000);
        if (dErr) throw new Error(dErr.message);
        const byEmail = new Map<string, P>((donorRows ?? []).map((d: P) => [String(d.email).trim().toLowerCase(), d]));

        // New donors (one per email), then fill blanks on existing ones.
        const toCreate = new Map<string, P>();
        for (const r of fresh) {
          const b = extractBuyer(r.raw || {});
          if (!b.email) { crm.skipped_no_email++; continue; }
          if (byEmail.has(b.email) || toCreate.has(b.email)) continue;
          toCreate.set(b.email, { full_name: b.name || b.email.split("@")[0], email: b.email, phone: b.phone, address: b.address,
            type: "individual", stage: "active", source: "Zeffy", tags: "zeffy" });
        }
        const created = [...toCreate.values()];
        for (let i = 0; i < created.length; i += 500) {
          const { data, error } = await db.from("donors").insert(created.slice(i, i + 500)).select("id,email");
          if (error) throw new Error("donors insert: " + error.message);
          (data ?? []).forEach((d: P) => byEmail.set(String(d.email).toLowerCase(), d));
          crm.donors_created += (data ?? []).length;
        }

        const campaignName = (r: P) => {
          if (raffleId && r.campaign_id === raffleId) return names[raffleId] || "50/50 Raffle";
          return extractCampaignName(r.raw || {}) || (r.campaign_id && names[r.campaign_id]) || (r.campaign_id ? `Zeffy form ${String(r.campaign_id).slice(0, 8)}` : "Zeffy donation");
        };
        const gifts = fresh.map((r: P) => {
          const b = extractBuyer(r.raw || {});
          const donor = b.email ? byEmail.get(b.email) : null;
          return {
            zeffy_id: r.zeffy_id, donor_id: donor ? donor.id : null, donor_name: b.name || b.email || "Zeffy donor",
            amount: Number(r.amount) || 0, gift_date: String(r.created_at || "").slice(0, 10) || null,
            method: "zeffy", campaign: campaignName(r), note: "Synced from Zeffy",
          };
        });
        for (let i = 0; i < gifts.length; i += 500) {
          const { error } = await db.from("donations").insert(gifts.slice(i, i + 500));
          if (error) throw new Error("donations insert: " + error.message);
          crm.gifts_added += Math.min(500, gifts.length - i);
        }
        if (gifts.length || crm.donors_created) {
          const { data: n, error } = await db.rpc("refresh_donor_totals");
          if (error) throw new Error("refresh_donor_totals: " + error.message);
          crm.donors_updated = Number(n) || 0;
        }
      } catch (e) {
        crm.error = e instanceof Error ? e.message : String(e);
        console.error("[zeffy-sync] CRM step:", e);
      }
    }

    return json({ ok: true, synced: rows.length, raffle_payments: raffle.length, gross, pot_total: stats.pot_total, crm });
  } catch (err) {
    return json({ error: "zeffy-sync exception", detail: String(err) }, 500);
  }
});
