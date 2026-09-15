// ============================================================================
// Jacks of All Trades — Place Call Edge Function (Twilio)
// File: supabase/functions/place-call/index.ts
// Generated: 2026-09-15 18:00 UTC
//
// Places an outbound phone call via Twilio that reads an approved script aloud
// (text-to-speech). Used by the Command Center so Rex (Grant Outreach) can dial
// a funder's program officer with the human-approved call script. The caller
// must present a valid Supabase USER token — the public anon key is rejected,
// so random visitors can't place calls on the org's Twilio number.
//
// This is business-to-business grant cultivation. Keep it professional; honor
// do-not-contact; the team reviews every script before the call is placed.
//
// DEPLOY
//   supabase secrets set TWILIO_ACCOUNT_SID=ACxxxxxxxx
//   supabase secrets set TWILIO_AUTH_TOKEN=xxxxxxxx
//   supabase secrets set TWILIO_FROM="+1313XXXXXXX"     # your Twilio number
//   supabase functions deploy place-call
//
//   POST {SUPABASE_URL}/functions/v1/place-call
//     Authorization: Bearer <signed-in user's access token>
//     body: { "to": "+13135550123", "script": "Hi, this is ..." }
//   -> { "sid": "<call sid>" }
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}
const xml = (s: string) => String(s).replace(/[<>&'"]/g, (m) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[m] as string));

// Normalize to E.164 (+1 default for 10-digit US numbers).
function toE164(raw: string): string | null {
  const t = String(raw).trim();
  if (/^\+\d{8,15}$/.test(t)) return t;
  const d = t.replace(/\D/g, "");
  if (d.length === 10) return "+1" + d;
  if (d.length === 11 && d.startsWith("1")) return "+" + d;
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Require a signed-in user (reject the bare anon key).
  const auth = req.headers.get("Authorization") || "";
  const supaUrl = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supaUrl || !anon) return json({ error: "Server auth not configured" }, 500);
  const sb = createClient(supaUrl, anon, { global: { headers: { Authorization: auth } } });
  const { data: userData, error: userErr } = await sb.auth.getUser();
  if (userErr || !userData || !userData.user) return json({ error: "Sign in required to place a call." }, 401);

  const sid = Deno.env.get("TWILIO_ACCOUNT_SID"), token = Deno.env.get("TWILIO_AUTH_TOKEN"), from = Deno.env.get("TWILIO_FROM");
  if (!sid || !token || !from) return json({ error: "Twilio is not configured (set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM)." }, 500);

  let b: { to?: string; script?: string };
  try { b = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
  const to = toE164(b.to || "");
  if (!to) return json({ error: "A valid 'to' phone number is required." }, 400);
  const script = String(b.script || "").trim();
  if (!script) return json({ error: "A call 'script' is required." }, 400);

  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">${xml(script.slice(0, 3000))}</Say></Response>`;
  const form = new URLSearchParams({ To: to, From: from, Twiml: twiml });

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`, {
      method: "POST",
      headers: { "Authorization": "Basic " + btoa(`${sid}:${token}`), "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return json({ error: data.message || `Twilio HTTP ${res.status}` }, 502);
    return json({ sid: data.sid, status: data.status, to, placed_by: userData.user.email || userData.user.id });
  } catch (err) {
    console.error("[place-call]", err);
    return json({ error: err instanceof Error ? err.message : "Twilio request failed" }, 502);
  }
});
