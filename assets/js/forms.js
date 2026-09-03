/* ============================================================================
   Jacks of All Trades Community Development — Form Handling
   File: assets/js/forms.js
   Generated: 2026-09-03 16:32 UTC  |  joatamp.net redesign

   Progressive enhancement: any <form data-collection="table_name"> submits to
   the matching Supabase table. When Supabase is not yet configured, it falls
   back to a mailto: draft so no lead is ever lost.
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

      const db = window.JOAT && window.JOAT.db;
      if (db) {
        try {
          const { error } = await db.from(table).insert([data]);
          if (error) throw error;
          form.reset();
          show(form, "ok", form.dataset.success || "Thank you — we've received your message and will be in touch soon.");
        } catch (err) {
          console.error("[JOAT] insert failed:", err);
          show(form, "err", "We couldn't submit right now. Please email " + (window.JOAT.ORG?.email || "info@joatamp.net") + ".");
        }
      } else {
        // Fallback: open a pre-filled email so the lead still reaches the org.
        const org = (window.JOAT && window.JOAT.ORG) || {};
        const subject = encodeURIComponent("[" + table + "] website submission");
        const body = encodeURIComponent(Object.entries(data).map(([k, v]) => `${k}: ${v}`).join("\n"));
        show(form, "ok", "Thanks! Opening your email app to complete the message…");
        setTimeout(() => { window.location.href = `mailto:${org.email || "info@joatamp.net"}?subject=${subject}&body=${body}`; }, 600);
      }
      if (btn) { btn.disabled = false; btn.textContent = original; }
    });
  });
})();
