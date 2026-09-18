/* ============================================================================
   Jacks of All Trades Community Development — Form Handling
   File: assets/js/forms.js
   Generated: 2026-09-03 16:32 UTC  |  joatamp.org redesign
   Updated:   2026-09-18 17:02 UTC  |  Never dead-end: any DB failure now falls
              back to a pre-filled email draft so the visitor can still reach us
              and no lead is lost (fixes the "couldn't submit" error on contact).

   Progressive enhancement: any <form data-collection="table_name"> submits to
   the matching Supabase table. When Supabase is not configured OR the write
   fails for any reason, it falls back to a mailto: draft so no lead is ever
   lost and the visitor always sees a helpful next step, never a dead end.
   ========================================================================== */

(function () {
  "use strict";
  const forms = document.querySelectorAll("form[data-collection]");
  if (!forms.length) return;

  function statusEl(form) {
    let s = form.querySelector(".form-status");
    if (!s) { s = document.createElement("div"); s.className = "form-status"; form.appendChild(s); }
    return s;
  }
  function show(form, type, msg) {
    const s = statusEl(form);
    s.className = "form-status " + type;
    s.textContent = msg;
  }

  forms.forEach((form) => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const table = form.dataset.collection;
      const btn = form.querySelector("[type=submit]");
      const original = btn ? btn.textContent : "";
      const data = Object.fromEntries(new FormData(form).entries());
      data.source_page = location.pathname.split("/").pop() || "index";
      data.created_at = new Date().toISOString();

      if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
      show(form, "info", "Submitting…");

      // Open a pre-filled email so the lead still reaches the org even if the
      // database write is unavailable. Used both when Supabase isn't configured
      // and as a graceful fallback when an insert fails.
      function emailFallback(msg) {
        const org = (window.JOAT && window.JOAT.ORG) || {};
        const to = org.email || "info@joatamp.org";
        const subject = encodeURIComponent("[" + table + "] website submission");
        const skip = { source_page: 1, created_at: 1 };
        const body = encodeURIComponent(
          Object.entries(data).filter(([k]) => !skip[k]).map(([k, v]) => `${k}: ${v}`).join("\n")
        );
        show(form, "ok", msg || "Thanks! Opening your email app so you can send this to us directly…");
        setTimeout(() => { window.location.href = `mailto:${to}?subject=${subject}&body=${body}`; }, 700);
      }

      const db = window.JOAT && window.JOAT.db;
      if (db) {
        try {
          const { error } = await db.from(table).insert([data]);
          if (error) throw error;
          form.reset();
          show(form, "ok", form.dataset.success || "Thank you — we've received your message and will be in touch soon.");
        } catch (err) {
          // Don't dead-end the visitor: fall back to a pre-filled email draft so
          // they can still follow up with us and the lead isn't lost.
          console.error("[JOAT] insert failed, falling back to email:", err);
          emailFallback("We couldn't reach our system just now — opening your email app so you can send this to us directly.");
        }
      } else {
        emailFallback();
      }
      if (btn) { btn.disabled = false; btn.textContent = original; }
    });
  });
})();
