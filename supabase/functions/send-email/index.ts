// ============================================================================
// Jacks of All Trades — Send Email Edge Function
// File: supabase/functions/send-email/index.ts
// Generated: 2026-09-15 16:40 UTC
//
// Sends an email via Resend on behalf of a SIGNED-IN staff member. Used by the
// Command Center to send grant outreach (Rex), grant follow-ups (Wes), and
// (later) raffle email campaigns. The caller must present a valid Supabase
// USER token — the public anon key alone is rejected, so random visitors can't
// send mail from the org's domain.
//
// DEPLOY
//   supabase secrets set RESEND_API_KEY=re_xxxxxxxx
//   supabase secrets set EMAIL_FROM="Jacks of All Trades <grants@joatamp.org>"
//   supabase functions deploy send-email
//   (SUPABASE_URL and SUPABASE_ANON_KEY are injected automatically.)
//
//   POST {SUPABASE_URL}/functions/v1/send-email
//     Authorization: Bearer <the signed-in user's access token>
//     body: { "to": "x@y.org", "subject": "...", "html": "...", "text": "...",
//             "replyTo": "info@joatamp.org", "cc": ["..."] }
//   -> { "id": "<resend id>" }
//
// SWAP PROVIDERS: replace the sendViaResend() body with your provider's API
// (Mailchimp/Mandrill, SendGrid, Postmark). Keep the auth check intact.
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
const isEmail = (s: unknown) => typeof s === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);

async function sendViaResend(from: string, payload: Record<string, unknown>): Promise<{ id?: string; error?: string }> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return { error: "RESEND_API_KEY is not set" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ from, ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: (data && (data.message || data.name)) || `Resend HTTP ${res.status}` };
  return { id: data.id };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // --- Require a real signed-in user (reject the bare anon key) ---
  const auth = req.headers.get("Authorization") || "";
  const supaUrl = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supaUrl || !anon) return json({ error: "Server auth not configured" }, 500);
  const sb = createClient(supaUrl, anon, { global: { headers: { Authorization: auth } } });
  const { data: userData, error: userErr } = await sb.auth.getUser();
  if (userErr || !userData || !userData.user) {
    return json({ error: "Sign in required to send email." }, 401);
  }

  const from = Deno.env.get("EMAIL_FROM");
  if (!from) return json({ error: "EMAIL_FROM is not set (use a verified domain address)." }, 500);

  let b: { to?: string; subject?: string; html?: string; text?: string; replyTo?: string; cc?: string[] };
  try { b = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }

  if (!isEmail(b.to)) return json({ error: "A valid 'to' address is required." }, 400);
  if (!b.subject || !String(b.subject).trim()) return json({ error: "A 'subject' is required." }, 400);
  if (!b.html && !b.text) return json({ error: "Provide 'html' or 'text'." }, 400);

  const payload: Record<string, unknown> = {
    to: [b.to], subject: String(b.subject).slice(0, 300),
    reply_to: isEmail(b.replyTo) ? b.replyTo : undefined,
    cc: Array.isArray(b.cc) ? b.cc.filter(isEmail) : undefined,
    html: b.html ? String(b.html) : undefined,
    text: b.text ? String(b.text) : undefined,
  };

  const result = await sendViaResend(from, payload);
  if (result.error) { console.error("[send-email]", result.error); return json({ error: result.error }, 502); }
  return json({ id: result.id, sent_by: userData.user.email || userData.user.id });
});
