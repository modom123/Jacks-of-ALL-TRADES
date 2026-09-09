/* ============================================================================
   Jacks of All Trades — Updates & Winners (Command Center plugin)
   File: assets/js/updates.plugin.js
   Generated: 2026-09-09 09:11 UTC

   Lets staff run the public Updates page (updates.html) without touching code:
     • Project Updates — post photo/video updates from the field.
     • Raffle Winners  — publish winners (display name + prize only; no PII).
     • Live Stream     — paste an embed URL and flip the site "Live" on/off.

   All three back world-readable tables (schema_updates_2026-09-09_0911.sql), so
   saved rows appear on the public site immediately. Runs in Demo mode with
   sample data until Supabase is connected.

   To disable, remove the <script src=".../updates.plugin.js"> tag.
   ========================================================================== */
(function () {
  "use strict";
  const A = (window.JOAT = window.JOAT || {});
  if (!A.registerPlugin) { console.warn("[updates] Command Center core not loaded"); return; }

  const I = {
    news: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h13a2 2 0 0 1 2 2v13a2 2 0 0 0 2 2H5a2 2 0 0 1-1-2zM8 8h7M8 12h7M8 16h4"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 18.6 6.2 21.4l1.1-6.5L2.6 9.8l6.5-.9z"/></svg>',
    live: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m23 7-7 5 7 5V7zM14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"/></svg>',
  };

  const tables = {
    project_updates: {
      label: "Project Updates", singular: "Update", kind: "table",
      cols: [
        { k: "posted_on", label: "Date" }, { k: "title", label: "Title" },
        { k: "tag", label: "Tag", badge: true }, { k: "media_type", label: "Media", badge: true },
      ],
      status: { field: "status", opts: ["published", "draft"] },
      form: [
        { k: "title", label: "Title", req: true },
        { k: "posted_on", label: "Date", type: "date", req: true },
        { k: "tag", label: "Tag", type: "select", opts: ["Renovation", "Cohort", "Event", "Community", "Announcement"] },
        { k: "media_type", label: "Media type", type: "select", opts: ["photo", "video"] },
        { k: "image_url", label: "Photo URL (or video poster)" },
        { k: "video_url", label: "Video embed URL or .mp4 (for video)" },
        { k: "body", label: "Update text", type: "textarea" },
        { k: "status", label: "Status", type: "select", opts: ["published", "draft"] },
      ],
    },
    raffle_winners: {
      label: "Raffle Winners", singular: "Winner", kind: "table",
      cols: [
        { k: "draw_date", label: "Draw date" }, { k: "display_name", label: "Winner (public name)" },
        { k: "prize_amount", label: "Prize", money: true }, { k: "event_label", label: "Event" },
      ],
      status: { field: "status", opts: ["published", "hidden"] },
      form: [
        { k: "display_name", label: "Public display name", req: true },
        { k: "prize_amount", label: "Prize amount ($)", type: "number" },
        { k: "draw_date", label: "Draw date", type: "date" },
        { k: "event_label", label: "Event label", },
        { k: "photo_url", label: "Photo URL (optional)" },
        { k: "note", label: "Note (optional)" },
        { k: "status", label: "Status", type: "select", opts: ["published", "hidden"] },
      ],
    },
  };

  const iso = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
  const demo = {
    project_updates: [
      { id: "u1", title: "Exterior restoration complete", posted_on: iso(-3), tag: "Renovation", media_type: "photo", image_url: "../assets/img/home-exterior-after.jpg", body: "New windows, rebuilt porch, and a fully sealed brick facade.", status: "published", created_at: iso(-3) },
      { id: "u2", title: "Open-concept living takes shape", posted_on: iso(-11), tag: "Renovation", media_type: "photo", image_url: "../assets/img/interior-living.jpg", body: "Framed the new layout, hung drywall, laid LVP throughout.", status: "published", created_at: iso(-11) },
      { id: "u3", title: "On the block for game day", posted_on: iso(-19), tag: "Event", media_type: "photo", image_url: "../assets/img/event-booth.jpg", body: "Our raffle booth met neighbors and sold tickets.", status: "published", created_at: iso(-19) },
    ],
    raffle_winners: [],
    live_stream: [{ id: 1, is_live: false, title: "Live Stream", embed_url: "", scheduled_label: "Next live: the 50/50 draw — Mon, Dec 28, 2026 · MNF Halftime · Ford Field", updated_at: iso(0) }],
  };

  /* ---- Live Stream control view ----------------------------------------- */
  async function renderLive(hub) {
    const view = hub.el();
    let row;
    if (hub.isDemo() || !hub.db()) { row = (hub.cache.live_stream = hub.cache.live_stream || demo.live_stream.slice())[0]; }
    else { try { const { data } = await hub.db().from("live_stream").select("*").eq("id", 1).maybeSingle(); row = data || { id: 1, is_live: false }; } catch { row = { id: 1, is_live: false }; } }
    view.innerHTML = `
      <div class="view-head"><div><h2 style="margin:0">Live Stream</h2><p>Paste an embed URL and flip the site "Live" banner on when you go live.</p></div>
        <div class="toolbar"><a class="btn btn-ghost btn-sm" href="../updates.html" target="_blank" rel="noopener">${hub.ICO("send")} View Updates page</a></div></div>
      <div class="panel" style="max-width:680px"><div class="panel-head"><h3>Stream settings</h3>
        <span class="env-badge ${row.is_live ? "live" : "demo"}">${row.is_live ? "● Live now" : "Offline"}</span></div>
        <div class="panel-body"><form id="live-form">
          <label class="field" style="flex-direction:row;align-items:center;gap:.6rem;margin-bottom:1rem">
            <input type="checkbox" id="lv-on" ${row.is_live ? "checked" : ""} style="width:auto"> <b>We are live now</b> (shows the stream on the public site)</label>
          <div class="field"><label>Title / caption</label><input name="title" value="${hub.esc(row.title || "")}" placeholder="50/50 Raffle Drawing — LIVE"></div>
          <div class="field"><label>Embed URL <span class="text-soft">(YouTube/Facebook/Vimeo <em>embed</em> link)</span></label>
            <input name="embed_url" value="${hub.esc(row.embed_url || "")}" placeholder="https://www.youtube.com/embed/XXXXXXXXXXX"></div>
          <div class="field"><label>Offline message <span class="text-soft">(shown when not live)</span></label>
            <input name="scheduled_label" value="${hub.esc(row.scheduled_label || "")}" placeholder="Next live: the 50/50 draw — Dec 28"></div>
          <button class="btn btn-primary" type="submit">Save live settings</button>
        </form>
        <p class="form-note" style="margin-top:1rem">Tip: use the <b>embed</b> URL, not the watch URL. On YouTube, Share → Embed and copy the <code>src</code> (looks like <code>youtube.com/embed/…</code>).</p>
      </div></div>`;
    view.querySelector("#live-form").onsubmit = async (e) => {
      e.preventDefault();
      const p = Object.fromEntries(new FormData(e.target).entries());
      p.is_live = view.querySelector("#lv-on").checked; p.id = 1; p.updated_at = new Date().toISOString();
      if (hub.isDemo() || !hub.db()) { Object.assign(row, p); hub.toast("Saved (demo)"); return renderLive(hub); }
      const { error } = await hub.db().from("live_stream").upsert([p]); hub.toast(error ? "Save failed: " + error.message : "Saved — live on site"); renderLive(hub);
    };
  }

  A.registerPlugin({
    id: "updates",
    tables,
    demo,
    titles: { project_updates: "Project Updates", raffle_winners: "Raffle Winners", live_stream: "Live Stream" },
    roles: { board: ["project_updates", "raffle_winners", "live_stream"], staff: ["project_updates", "raffle_winners", "live_stream"] },
    views: { live_stream: renderLive },
    nav: [{
      group: "News & Media", items: [
        ["project_updates", "Project Updates", I.news],
        ["raffle_winners", "Raffle Winners", I.star],
        ["live_stream", "Live Stream", I.live],
      ],
    }],
  });
})();
