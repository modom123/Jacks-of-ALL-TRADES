/* ============================================================================
   Jacks of All Trades — Raffle Campaign Engine (Command Center plugin)
   File: assets/js/raffle-campaign.plugin.js
   Generated: 2026-09-14 19:32 UTC

   An AI marketing engine for the 50/50 raffle. Nova (the Communications agent)
   DRAFTS multi-channel content — Instagram / Facebook / X / LinkedIn posts,
   emails, SMS, and voice-call scripts — on a countdown cadence to the Dec 28
   Ford Field drawing. A human reviews, edits, approves, and schedules every
   item. Nothing is sent from here; sending is wired to your Twilio / email /
   social accounts separately and MUST respect public.marketing_consent
   (SMS + voice only ever reach opted-in contacts — TCPA compliance).

   Data: public.campaign_content  (see schema_raffle_campaign_*.sql)
   AI:   window.JOAT.agents.send('nova', messages, context)  (ai-agent function)

   To disable, remove the <script src=".../raffle-campaign.plugin.js"> tag.
   ========================================================================== */
(function () {
  "use strict";
  const A = (window.JOAT = window.JOAT || {});
  if (!A.registerPlugin) { console.warn("[raffle-campaign] Command Center core not loaded"); return; }

  const TAG = "raffle-2026";
  const DRAW_ISO = (A.RAFFLE && A.RAFFLE.drawingDateISO) || "2026-12-28T21:15:00-05:00";
  const RAFFLE_URL = (location.origin && location.origin.startsWith("http"))
    ? location.origin + "/raffle.html" : "https://joatamp.org/raffle.html";
  const ZEFFY = (A.ORG && A.ORG.zeffyUrl) || "https://www.zeffy.com/en-US/ticketing/jacks-of-all-trades-community-development";

  const CHANNELS = [
    ["instagram", "Instagram"], ["facebook", "Facebook"], ["x", "X / Twitter"],
    ["linkedin", "LinkedIn"], ["email", "Email"], ["sms", "SMS"], ["voice", "Voice call"],
  ];
  const CH_LABEL = Object.fromEntries(CHANNELS);
  const OPT_IN_CH = { sms: 1, voice: 1 };

  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l18-8-8 18-2-7-8-3z"/></svg>';

  const daysToDraw = () => Math.max(0, Math.ceil((new Date(DRAW_ISO) - new Date()) / 86400000));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
  const localMem = []; // demo fallback when no DB

  /* ---- data access -------------------------------------------------------- */
  async function fetchRaffle(hub) {
    if (!hub.db()) return { pot_total: 0 };
    try {
      const { data } = await hub.db().from("raffle_stats").select("pot_total").order("updated_at", { ascending: false }).limit(1).maybeSingle();
      return data || { pot_total: 0 };
    } catch (e) { return { pot_total: 0 }; }
  }
  async function fetchContent(hub) {
    if (!hub.db()) return localMem.slice();
    try {
      const { data } = await hub.db().from("campaign_content").select("*").eq("campaign_tag", TAG)
        .order("scheduled_at", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false });
      return data || [];
    } catch (e) { hub.toast("Load failed — run the campaign schema"); return []; }
  }
  async function insertMany(hub, rows) {
    if (!hub.db()) { rows.forEach((r) => localMem.unshift({ id: "m" + Math.random().toString(36).slice(2), created_at: new Date().toISOString(), ...r })); return; }
    const { error } = await hub.db().from("campaign_content").insert(rows);
    if (error) throw error;
  }
  async function updateOne(hub, id, patch) {
    if (!hub.db()) { const r = localMem.find((x) => x.id === id); if (r) Object.assign(r, patch); return; }
    const { error } = await hub.db().from("campaign_content").update(patch).eq("id", id);
    if (error) throw error;
  }
  async function deleteOne(hub, id) {
    if (!hub.db()) { const i = localMem.findIndex((x) => x.id === id); if (i >= 0) localMem.splice(i, 1); return; }
    const { error } = await hub.db().from("campaign_content").delete().eq("id", id);
    if (error) throw error;
  }

  /* ---- AI generation ------------------------------------------------------ */
  function buildPrompt(channels, timeframe, angle, pot, days) {
    const winner = pot ? ("$" + Number(pot).toLocaleString()) : "the growing jackpot";
    const spread = { week: "over the next 7 days", two: "over the next 14 days", full: `spread across the ${days} days remaining until the draw` }[timeframe] || "over the next 14 days";
    const angleText = {
      awareness: "Lead with the mission and the story: a vacant Detroit home being rebuilt by students we train, funded 50/50.",
      urgency: "Create urgency for the final push — limited time, the pot is climbing, the draw is at Ford Field on Dec 28.",
      impact: "Focus on impact and gratitude: what tickets have already made possible, and thanking supporters.",
      mixed: "Mix awareness, urgency, and impact across the items.",
    }[angle] || "Mix awareness, urgency, and impact.";
    return [
      "Draft a multi-channel marketing plan for our licensed 50/50 Neighborhood Revitalization Raffle.",
      "",
      "FACTS (use only these — do not invent numbers, winners, or endorsements):",
      `- Winner takes home ${winner} (the 50% share; it grows with every ticket). An equal amount funds the home renovation.`,
      "- Drawing: LIVE at Ford Field, Detroit — Dec 28, 2026 (Lions vs. Giants, MNF halftime).",
      "- Ticket tiers: $1 = 1, $20 = 30, $50 = 70, $100 = 150 entries. 18+ and Michigan resident to enter.",
      `- Buy / enter (official, tax-receipt): ${ZEFFY}`,
      `- Raffle page: ${RAFFLE_URL}`,
      `- ${days} days remain until the draw.`,
      "",
      `CHANNELS to produce: ${channels.map((c) => CH_LABEL[c]).join(", ")}.`,
      `TIMING: schedule the items ${spread}.`,
      `ANGLE: ${angleText}`,
      "",
      "RULES:",
      "- Social posts: platform-appropriate length, 2-4 relevant hashtags, one clear CTA + link.",
      "- Email: include a strong subject line in \"title\" and a skimmable body with one CTA.",
      "- SMS: <=160 chars, include \"Reply STOP to opt out\"; audience is opt-in only.",
      "- Voice: a warm 20-30 second call SCRIPT; audience is opt-in only; no pressure tactics.",
      "- Never imply guaranteed winnings or that a donation is a raffle entry.",
      "",
      "OUTPUT: Return ONLY a JSON array (no prose, no markdown fences). Each element:",
      '{ "channel": one of ' + JSON.stringify(channels) + ',',
      '  "title": short string (subject/hook/call purpose),',
      '  "body": the full copy or script,',
      '  "scheduled_offset_days": integer between 0 and ' + days + ',',
      '  "hashtags": optional string }',
      "Produce 1-3 items per requested channel.",
    ].join("\n");
  }

  function parseItems(text, channels, days) {
    let arr = null;
    try { arr = JSON.parse(text); } catch (e) {
      const m = text.match(/\[[\s\S]*\]/);
      if (m) { try { arr = JSON.parse(m[0]); } catch (e2) { arr = null; } }
    }
    if (!Array.isArray(arr)) return null;
    const now = Date.now(), drawMs = new Date(DRAW_ISO).getTime();
    return arr.filter((it) => it && it.body).map((it) => {
      const ch = channels.includes(it.channel) ? it.channel : channels[0];
      let off = parseInt(it.scheduled_offset_days, 10); if (isNaN(off)) off = 0;
      off = Math.max(0, Math.min(off, days));
      let when = now + off * 86400000; if (when > drawMs) when = drawMs;
      return {
        campaign_tag: TAG, channel: ch, title: String(it.title || "").slice(0, 300),
        body: String(it.body).slice(0, 5000), cta_url: ZEFFY,
        audience: OPT_IN_CH[ch] ? "opt-in only" : "public",
        scheduled_at: new Date(when).toISOString(), status: "draft", drafted_by: "Nova (AI)",
        meta: it.hashtags ? { hashtags: String(it.hashtags) } : null,
      };
    });
  }

  async function generate(hub, channels, timeframe, angle) {
    if (!A.agents || !A.agents.send) { hub.toast("AI agent module not loaded"); return 0; }
    const r = await fetchRaffle(hub);
    const days = daysToDraw();
    const prompt = buildPrompt(channels, timeframe, angle, r.pot_total, days);
    const ctx = `Raffle draw ${DRAW_ISO}. Winner takes home (pot_total): ${r.pot_total}. Days left: ${days}.`;
    const res = await A.agents.send("nova", [{ role: "user", content: prompt }], ctx);
    const items = parseItems(res && res.text ? res.text : "", channels, days);
    if (!items || !items.length) {
      hub.toast(res && res.source === "sim" ? "Deploy the ai-agent function for live drafts" : "Couldn't parse AI output — try again");
      return 0;
    }
    await insertMany(hub, items);
    return items.length;
  }

  /* ---- view --------------------------------------------------------------- */
  const STATUS = ["draft", "approved", "scheduled", "sent", "archived"];
  let filterCh = "all", filterStatus = "all";

  async function render(hub) {
    const view = hub.el(), kpi = hub.kpi, money = hub.money;
    const [r, items] = await Promise.all([fetchRaffle(hub), fetchContent(hub)]);
    const counts = items.reduce((a, x) => { a[x.status] = (a[x.status] || 0) + 1; return a; }, {});
    const shown = items.filter((x) => (filterCh === "all" || x.channel === filterCh) && (filterStatus === "all" || x.status === filterStatus));

    view.innerHTML = `
      <div class="view-head"><div><h2 style="margin:0">Raffle Campaign</h2>
        <p>Nova drafts social, email, SMS &amp; voice content on a countdown cadence. You approve every item before it sends.</p></div></div>

      <div class="kpis">
        ${kpi("Days to Ford Field draw", daysToDraw(), "target", "")}
        ${kpi("Winner takes home", money(r.pot_total || 0), "ticket", "")}
        ${kpi("Drafts to review", counts.draft || 0, "mega", "")}
        ${kpi("Approved / scheduled", (counts.approved || 0) + (counts.scheduled || 0), "home", "")}
      </div>

      <div class="panel" style="border-left:3px solid #e0a100">
        <div class="panel-body" style="font-size:.9rem">
          <b>Compliance:</b> Social &amp; email can go to your general audience. <b>SMS and voice may only be sent to
          people who opted in</b> (see the opt-in form on the raffle page &rarr; <code>marketing_consent</code>), and every
          text must offer <b>STOP</b> to opt out. Nova drafts; a human approves; sending respects consent.
        </div>
      </div>

      <div class="panel"><div class="panel-head"><h3>Generate content with Nova</h3></div><div class="panel-body">
        <form id="gen-form">
          <div class="field"><label>Channels</label>
            <div style="display:flex;flex-wrap:wrap;gap:.5rem 1rem;margin-top:.3rem">
              ${CHANNELS.map(([v, l]) => `<label style="display:flex;align-items:center;gap:.4rem;font-weight:600">
                <input type="checkbox" name="ch" value="${v}" ${v === "sms" || v === "voice" ? "" : "checked"}> ${l}</label>`).join("")}
            </div>
          </div>
          <div class="field-row">
            <div class="field"><label>Timeframe</label>
              <select name="timeframe"><option value="week">This week</option><option value="two" selected>Next 2 weeks</option><option value="full">Full countdown to Dec 28</option></select></div>
            <div class="field"><label>Angle</label>
              <select name="angle"><option value="mixed" selected>Mixed</option><option value="awareness">Awareness &amp; story</option><option value="urgency">Urgency / final push</option><option value="impact">Impact &amp; gratitude</option></select></div>
          </div>
          <button class="btn btn-primary" type="submit" id="gen-btn">Generate drafts</button>
          <span class="text-soft" style="margin-left:.6rem;font-size:.85rem">Uses the Nova AI agent (ai-agent function).</span>
        </form>
      </div></div>

      <div class="panel"><div class="panel-head"><h3>Content pipeline</h3>
        <div style="display:flex;gap:.5rem;align-items:center">
          <select id="f-ch"><option value="all">All channels</option>${CHANNELS.map(([v, l]) => `<option value="${v}" ${filterCh === v ? "selected" : ""}>${l}</option>`).join("")}</select>
          <select id="f-st"><option value="all">All statuses</option>${STATUS.map((s) => `<option value="${s}" ${filterStatus === s ? "selected" : ""}>${s}</option>`).join("")}</select>
        </div></div>
        <div class="panel-body" id="pipeline">
          ${shown.length ? shown.map((it) => card(it)).join("") : `<p class="text-soft">No content yet. Use <b>Generate drafts</b> above to have Nova draft your first batch.</p>`}
        </div>
      </div>`;

    view.querySelector("#gen-form").onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target;
      const channels = Array.from(f.querySelectorAll('input[name="ch"]:checked')).map((c) => c.value);
      if (!channels.length) { hub.toast("Pick at least one channel"); return; }
      const btn = f.querySelector("#gen-btn"); const orig = btn.textContent;
      btn.disabled = true; btn.textContent = "Nova is drafting…";
      try {
        const n = await generate(hub, channels, f.timeframe.value, f.angle.value);
        if (n) hub.toast(`Nova drafted ${n} item${n === 1 ? "" : "s"}`);
      } catch (err) { console.error(err); hub.toast("Generation failed"); }
      btn.disabled = false; btn.textContent = orig;
      render(hub);
    };
    view.querySelector("#f-ch").onchange = (e) => { filterCh = e.target.value; render(hub); };
    view.querySelector("#f-st").onchange = (e) => { filterStatus = e.target.value; render(hub); };

    view.querySelectorAll("[data-card]").forEach((el) => wireCard(hub, el));
  }

  function card(it) {
    const optIn = OPT_IN_CH[it.channel];
    const when = it.scheduled_at ? new Date(it.scheduled_at).toISOString().slice(0, 10) : "";
    const tags = it.meta && it.meta.hashtags ? it.meta.hashtags : "";
    return `<div class="ncard" data-card data-id="${esc(it.id)}" style="border:1px solid var(--line,#e6e8ec);border-radius:12px;padding:1rem;margin-bottom:.9rem">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:.6rem;flex-wrap:wrap">
        <div style="display:flex;gap:.5rem;align-items:center">
          <span class="pill" style="background:var(--navy-900,#062a40);color:#fff">${esc(CH_LABEL[it.channel] || it.channel)}</span>
          ${optIn ? `<span class="pill" style="background:#fbe6c6;color:#7a4a00">opt-in only</span>` : ""}
          <span class="text-soft" style="font-size:.8rem">${esc(it.drafted_by || "")}</span>
        </div>
        <div style="display:flex;gap:.4rem;align-items:center">
          <input type="date" data-when value="${when}" style="max-width:150px">
          <select data-status>${STATUS.map((s) => `<option value="${s}" ${it.status === s ? "selected" : ""}>${s}</option>`).join("")}</select>
        </div>
      </div>
      <div class="field" style="margin-top:.6rem"><input data-title value="${esc(it.title || "")}" placeholder="Title / subject / hook"></div>
      <div class="field"><textarea data-body rows="4">${esc(it.body || "")}</textarea></div>
      ${tags ? `<div class="text-soft" style="font-size:.82rem;margin-bottom:.4rem">${esc(tags)}</div>` : ""}
      <div style="display:flex;gap:.5rem;flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" data-save>Save</button>
        <button class="btn btn-ghost btn-sm" data-copy>Copy</button>
        <button class="btn btn-ghost btn-sm" data-del style="color:#b42318">Delete</button>
      </div>
    </div>`;
  }

  function wireCard(hub, el) {
    const id = el.getAttribute("data-id");
    const val = (sel) => { const n = el.querySelector(sel); return n ? n.value : ""; };
    el.querySelector("[data-save]").onclick = async () => {
      try {
        await updateOne(hub, id, {
          title: val("[data-title]"), body: val("[data-body]"),
          status: val("[data-status]"),
          scheduled_at: val("[data-when]") ? new Date(val("[data-when]") + "T12:00:00Z").toISOString() : null,
        });
        hub.toast("Saved");
      } catch (e) { hub.toast("Save failed"); }
    };
    el.querySelector("[data-copy]").onclick = () => {
      const text = (val("[data-title]") ? val("[data-title]") + "\n\n" : "") + val("[data-body]");
      try { navigator.clipboard.writeText(text); hub.toast("Copied"); } catch (e) { hub.toast("Copy failed"); }
    };
    el.querySelector("[data-del]").onclick = async () => {
      if (!confirm("Delete this item?")) return;
      try { await deleteOne(hub, id); hub.toast("Deleted"); render(hub); } catch (e) { hub.toast("Delete failed"); }
    };
  }

  async function dashboardMount(slot, hub) {
    const items = await fetchContent(hub);
    const drafts = items.filter((x) => x.status === "draft").length;
    slot.insertAdjacentHTML("beforeend", `
      <div class="panel"><div class="panel-head"><h3>Raffle campaign</h3>
        <button class="btn btn-ghost btn-sm" data-goto="raffle_campaign">Open</button></div>
        <div class="kpis" style="padding:1rem">
          ${hub.kpi("Days to draw", daysToDraw(), "target", "")}
          ${hub.kpi("Drafts to review", drafts, "mega", "")}
          ${hub.kpi("Total items", items.length, "home", "")}
        </div></div>`);
  }

  A.registerPlugin({
    id: "raffle_campaign",
    titles: { raffle_campaign: "Raffle Campaign" },
    roles: { board: ["raffle_campaign"], staff: ["raffle_campaign"] },
    views: { raffle_campaign: render },
    nav: [{ group: "Marketing", items: [["raffle_campaign", "Raffle Campaign", ICON]] }],
    dashboardMount,
  });
})();
