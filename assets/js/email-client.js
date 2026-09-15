/* ============================================================================
   Jacks of All Trades — Email client helper (Command Center)
   File: assets/js/email-client.js
   Generated: 2026-09-15 16:40 UTC

   Exposes window.JOAT.email.send({ to, subject, html, text, replyTo }) which
   calls the `send-email` Edge Function using the SIGNED-IN staff member's
   Supabase access token (so only authenticated users can send). Plain text is
   converted to simple HTML paragraphs. Returns { ok, id, error }.
   ========================================================================== */
(function () {
  "use strict";
  const A = (window.JOAT = window.JOAT || {});

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));
  function textToHtml(t) {
    return String(t || "").split(/\n{2,}/).map((p) => "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>").join("\n");
  }

  async function token() {
    try {
      if (!A.db || !A.db.auth) return null;
      const { data } = await A.db.auth.getSession();
      return data && data.session ? data.session.access_token : null;
    } catch (e) { return null; }
  }

  async function send({ to, subject, html, text, replyTo, cc }) {
    const cfg = A.SUPABASE || {};
    if (!A.configured || !cfg.url) return { ok: false, error: "Supabase not configured" };
    const tok = await token();
    if (!tok) return { ok: false, error: "Sign in to the Command Center to send email" };
    if (!html && text) html = textToHtml(text);
    try {
      const res = await fetch(cfg.url.replace(/\/$/, "") + "/functions/v1/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok, apikey: cfg.anonKey },
        body: JSON.stringify({ to, subject, html, text, replyTo: replyTo || (A.ORG && A.ORG.email), cc }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) return { ok: false, error: data.error || ("HTTP " + res.status) };
      return { ok: true, id: data.id };
    } catch (e) {
      return { ok: false, error: "Deploy the send-email function, or check your connection" };
    }
  }

  // Pull a "Subject: ..." first line out of a drafted email body, if present.
  function splitSubject(body, fallback) {
    const m = String(body || "").match(/^\s*(?:\*\*)?subject(?:\*\*)?\s*:\s*(.+?)\s*$/im);
    if (!m) return { subject: fallback || "", body: String(body || "") };
    const subject = m[1].replace(/\*\*/g, "").trim();
    const stripped = String(body).replace(m[0], "").replace(/^\s+/, "");
    return { subject, body: stripped };
  }

  A.email = { send, splitSubject };
})();
