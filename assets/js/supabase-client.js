/* ============================================================================
   Jacks of All Trades Community Development — Supabase Client
   File: assets/js/supabase-client.js
   Generated: 2026-09-03 16:32 UTC  |  joatamp.net redesign

   Loads the Supabase JS SDK from CDN and exposes window.JOAT.db.
   `configured` is false until you fill in real credentials in config.js —
   the site degrades gracefully (forms fall back to mailto / notices).
   ========================================================================== */

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

(function initSupabase() {
  const cfg = (window.JOAT && window.JOAT.SUPABASE) || {};
  const looksReal =
    cfg.url &&
    cfg.anonKey &&
    !cfg.url.includes("YOUR-PROJECT") &&
    !cfg.anonKey.includes("YOUR-SUPABASE");

  window.JOAT = window.JOAT || {};
  window.JOAT.configured = !!looksReal;
  window.JOAT.db = null;

  if (looksReal) {
    try {
      window.JOAT.db = createClient(cfg.url, cfg.anonKey, {
        auth: { persistSession: true, autoRefreshToken: true },
      });
    } catch (err) {
      console.error("[JOAT] Supabase init failed:", err);
      window.JOAT.configured = false;
    }
  } else {
    console.info(
      "[JOAT] Supabase not configured yet. Add your URL + anon key in assets/js/config.js. " +
      "Forms and the Command Center will run in demo/fallback mode until then."
    );
  }

  // Notify any listeners waiting for the client (modules load async).
  document.dispatchEvent(new CustomEvent("joat:db-ready", { detail: { configured: window.JOAT.configured } }));
})();
