/* ============================================================================
   Jacks of All Trades — Marketing Plugin for the Command Center
   File: assets/js/marketing.plugin.js
   Generated: 2026-09-14 02:04 UTC

   Adds a "Marketing" section to the Command Center to CONTROL the public site
   promo bar (on/off, message, CTA) and FOLLOW the $100K campaign: live pot,
   days to the Ford Field draw, goal progress, and editable channel metrics.
   Reads/writes public.marketing_settings (id = 1). Share kit for one-tap posts.

   To disable, remove the <script src=".../marketing.plugin.js"> tag.
   ========================================================================== */
(function () {
  "use strict";
  const A = (window.JOAT = window.JOAT || {});
  if (!A.registerPlugin) { console.warn("[marketing] Command Center core not loaded"); return; }

  const DRAW_ISO = (A.RAFFLE && A.RAFFLE.drawingDateISO) || "2026-12-28T21:15:00-05:00";
  const RAFFLE_URL = (location.origin && location.origin.startsWith("http"))
    ? location.origin + "/raffle.html" : "https://joatamp.org/raffle.html";
  const DEFAULTS = {
    id: 1, banner_enabled: true,
    banner_message: "Win 50% of the pot — rebuild a Detroit home. Drawing Dec 28 at Ford Field.",
    banner_cta_label: "Buy raffle tickets", banner_cta_url: "raffle.html", show_pot: true,
    goal: 100000, emails_sent: 0, posts_published: 0, sponsors_secured: 0, media_mentions: 0,
  };

  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11v2a1 1 0 0 0 1 1h3l4 4V6L7 10H4a1 1 0 0 0-1 1zM15 8a4 4 0 0 1 0 8M18 5a8 8 0 0 1 0 14"/></svg>';

  const daysToDraw = () => Math.max(0, Math.ceil((new Date(DRAW_ISO) - new Date()) / 86400000));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));

  async function fetchSettings(hub) {
    if (hub.isDemo() || !hub.db()) return { ...DEFAULTS };
    try {
      const { data } = await hub.db().from("marketing_settings").select("*").eq("id", 1).maybeSingle();
      return data || { ...DEFAULTS };
    } catch (e) { return { ...DEFAULTS }; }
  }
  async function fetchRaffle(hub) {
    if (hub.isDemo() || !hub.db()) return { pot_total: 0, renovation_raised: 0, gross_raised: 0, goal: 100000 };
    try {
      const { data } = await hub.db().from("raffle_stats").select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle();
      return data || { pot_total: 0, renovation_raised: 0, gross_raised: 0, goal: 100000 };
    } catch (e) { return { pot_total: 0, renovation_raised: 0, gross_raised: 0, goal: 100000 }; }
  }
  async function saveSettings(hub, patch) {
    if (hub.isDemo() || !hub.db()) { hub.toast("Saved (demo)"); return; }
    patch.id = 1; patch.updated_at = new Date().toISOString();
    const { error } = await hub.db().from("marketing_settings").upsert([patch], { onConflict: "id" });
    hub.toast(error ? "Save failed" : "Saved — live on site");
  }

  async function renderMarketing(hub) {
    const view = hub.el(), money = hub.money, kpi = hub.kpi;
    const [s, r] = await Promise.all([fetchSettings(hub), fetchRaffle(hub)]);
    const goal = Number(s.goal || r.goal || 100000);
    const raised = Number(r.renovation_raised || 0);
    const pct = goal ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
    const shareText = "Win 50% of the pot — rebuild a Detroit home with Jacks of All Trades. Drawing Dec 28 at Ford Field! " + RAFFLE_URL;
    const enc = encodeURIComponent, u = enc(RAFFLE_URL), t = enc(shareText);

    view.innerHTML = `
      <div class="view-head"><div><h2 style="margin:0">Marketing</h2><p>Control the site promo bar and follow the $100K campaign. ${hub.isDemo() ? "Sample data" : "Live"}.</p></div></div>

      <div class="kpis">
        ${kpi("Live pot", money(r.pot_total || 0), "ticket", "")}
        ${kpi("Raised for renovation", money(raised), "home", `<span class="delta up">${pct}% of ${money(goal)}</span>`)}
        ${kpi("Gross raised", money(r.gross_raised || 0), "mega", "")}
        ${kpi("Days to Ford Field draw", daysToDraw(), "target", "")}
      </div>

      <div class="dash-2">
        <div class="panel"><div class="panel-head"><h3>Site promo bar</h3></div><div class="panel-body">
          <form id="mkt-banner">
            <label class="switch-row" style="display:flex;align-items:center;gap:.6rem;margin-bottom:.8rem">
              <input type="checkbox" name="banner_enabled" ${s.banner_enabled ? "checked" : ""}> <span>Show the promo bar on the public site</span></label>
            <div class="field"><label>Message</label><input name="banner_message" value="${esc(s.banner_message)}"></div>
            <div class="field-row">
              <div class="field"><label>Button label</label><input name="banner_cta_label" value="${esc(s.banner_cta_label)}"></div>
              <div class="field"><label>Button link</label><input name="banner_cta_url" value="${esc(s.banner_cta_url)}"></div>
            </div>
            <label class="switch-row" style="display:flex;align-items:center;gap:.6rem;margin:.4rem 0 .9rem">
              <input type="checkbox" name="show_pot" ${s.show_pot ? "checked" : ""}> <span>Append the live pot amount</span></label>
            <button class="btn btn-primary" type="submit">Save promo bar</button>
          </form>
        </div></div>

        <div class="panel"><div class="panel-head"><h3>Campaign metrics</h3></div><div class="panel-body">
          <form id="mkt-metrics">
            <div class="field-row">
              <div class="field"><label>Emails sent</label><input name="emails_sent" type="number" value="${Number(s.emails_sent) || 0}"></div>
              <div class="field"><label>Posts published</label><input name="posts_published" type="number" value="${Number(s.posts_published) || 0}"></div>
            </div>
            <div class="field-row">
              <div class="field"><label>Sponsors secured</label><input name="sponsors_secured" type="number" value="${Number(s.sponsors_secured) || 0}"></div>
              <div class="field"><label>Media mentions</label><input name="media_mentions" type="number" value="${Number(s.media_mentions) || 0}"></div>
            </div>
            <div class="field"><label>Renovation goal ($)</label><input name="goal" type="number" value="${goal}"></div>
            <button class="btn btn-primary" type="submit">Save metrics</button>
          </form>
        </div></div>
      </div>

      <div class="panel"><div class="panel-head"><h3>Share kit</h3></div><div class="panel-body">
        <div class="field"><label>Raffle link</label><input id="mkt-link" readonly value="${esc(RAFFLE_URL)}"></div>
        <div class="field"><label>Share message</label><textarea id="mkt-msg" readonly rows="2">${esc(shareText)}</textarea></div>
        <div class="share-row">
          <button class="share-btn" id="mkt-copy" type="button">Copy link</button>
          <a class="share-btn" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${u}">Facebook</a>
          <a class="share-btn" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=${t}">X / Twitter</a>
          <a class="share-btn" target="_blank" rel="noopener" href="https://api.whatsapp.com/send?text=${t}">WhatsApp</a>
          <a class="share-btn" target="_blank" rel="noopener" href="mailto:?subject=${enc("Support the 50/50 Neighborhood Revitalization Raffle")}&body=${t}">Email</a>
        </div>
      </div></div>`;

    view.querySelector("#mkt-banner").onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target;
      await saveSettings(hub, {
        banner_enabled: f.banner_enabled.checked,
        banner_message: f.banner_message.value,
        banner_cta_label: f.banner_cta_label.value,
        banner_cta_url: f.banner_cta_url.value,
        show_pot: f.show_pot.checked,
      });
    };
    view.querySelector("#mkt-metrics").onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target;
      await saveSettings(hub, {
        emails_sent: Number(f.emails_sent.value) || 0,
        posts_published: Number(f.posts_published.value) || 0,
        sponsors_secured: Number(f.sponsors_secured.value) || 0,
        media_mentions: Number(f.media_mentions.value) || 0,
        goal: Number(f.goal.value) || 100000,
      });
    };
    const copyBtn = view.querySelector("#mkt-copy");
    if (copyBtn) copyBtn.onclick = () => {
      const link = view.querySelector("#mkt-link");
      link.select();
      try { navigator.clipboard.writeText(RAFFLE_URL); } catch (e) { document.execCommand("copy"); }
      hub.toast("Link copied");
    };
  }

  async function dashboardMount(slot, hub) {
    const [s, r] = await Promise.all([fetchSettings(hub), fetchRaffle(hub)]);
    const on = s.banner_enabled ? "On" : "Off";
    slot.insertAdjacentHTML("beforeend", `
      <div class="panel"><div class="panel-head"><h3>Campaign snapshot</h3>
        <button class="btn btn-ghost btn-sm" data-goto="marketing">Marketing</button></div>
        <div class="kpis" style="padding:1rem">
          ${hub.kpi("Live pot", hub.money(r.pot_total || 0), "ticket", "")}
          ${hub.kpi("Days to draw", daysToDraw(), "target", "")}
          ${hub.kpi("Promo bar", on, "mega", "")}
        </div></div>`);
  }

  A.registerPlugin({
    id: "marketing",
    titles: { marketing: "Marketing" },
    roles: { board: ["marketing"], staff: ["marketing"] },
    views: { marketing: renderMarketing },
    nav: [{ group: "Marketing", items: [["marketing", "Marketing", ICON]] }],
    dashboardMount,
  });
})();
