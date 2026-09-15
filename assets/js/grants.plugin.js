/* ============================================================================
   Jacks of All Trades — Grants Engine (Command Center plugin)
   File: assets/js/grants.plugin.js
   Generated: 2026-09-15 16:10 UTC

   A grants pipeline driven by three AI agents:
     • Gwen (Grant Prospector) — finds & qualifies grant leads.
     • Rex  (Grant Outreach)   — drafts funder intro emails + call scripts.
     • Wes  (Grant Writer)     — drafts LOIs / proposals + follow-ups.
   Every draft is human-reviewed before it's sent. Amounts, deadlines, contacts
   are agent-flagged [verify]/[placeholder] and must be confirmed.

   Data: public.grant_leads  (see schema_grants_*.sql)
   AI:   window.JOAT.agents.send(agentKey, messages, context)  (ai-agent fn)

   Remove the <script src=".../grants.plugin.js"> tag to disable.
   ========================================================================== */
(function () {
  "use strict";
  const A = (window.JOAT = window.JOAT || {});
  if (!A.registerPlugin) { console.warn("[grants] Command Center core not loaded"); return; }

  const ORG_FACTS =
    "Jacks of All Trades Community Development — a Detroit nonprofit that (1) trains residents in six skilled trades, " +
    "(2) renovates vacant Detroit homes into quality housing, and (3) runs youth apprenticeship & mentoring with job placement. " +
    "A 50/50 raffle funds a home renovation. Mission: revitalize Detroit neighborhoods and build futures through skilled-trades training.";

  const TYPES = [["foundation", "Foundation"], ["corporate", "Corporate"], ["government", "Government"], ["community", "Community"]];
  const TY_LABEL = Object.fromEntries(TYPES);
  const STATUS = ["identified", "qualified", "contacted", "drafting", "submitted", "follow_up", "awarded", "declined", "archived"];
  const IN_PIPE = { qualified: 1, contacted: 1, drafting: 1, submitted: 1, follow_up: 1 };

  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 6 6 .9-4.5 4.3 1 6.3L12 17l-5.5 2.5 1-6.3L3 8.9 9 8z"/></svg>';

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
  const localMem = [];
  let filterStatus = "all";

  /* ---- data --------------------------------------------------------------- */
  async function fetchLeads(hub) {
    if (!hub.db()) return localMem.slice();
    try {
      const { data } = await hub.db().from("grant_leads").select("*").order("created_at", { ascending: false });
      return data || [];
    } catch (e) { hub.toast("Load failed — run the grants schema"); return []; }
  }
  async function insertMany(hub, rows) {
    if (!hub.db()) { rows.forEach((r) => localMem.unshift({ id: "m" + Math.random().toString(36).slice(2), created_at: new Date().toISOString(), ...r })); return; }
    const { error } = await hub.db().from("grant_leads").insert(rows); if (error) throw error;
  }
  async function updateOne(hub, id, patch) {
    if (!hub.db()) { const r = localMem.find((x) => x.id === id); if (r) Object.assign(r, patch); return; }
    const { error } = await hub.db().from("grant_leads").update(patch).eq("id", id); if (error) throw error;
  }
  async function deleteOne(hub, id) {
    if (!hub.db()) { const i = localMem.findIndex((x) => x.id === id); if (i >= 0) localMem.splice(i, 1); return; }
    const { error } = await hub.db().from("grant_leads").delete().eq("id", id); if (error) throw error;
  }

  /* ---- Gwen: prospect for leads ------------------------------------------- */
  async function findLeads(hub, focus, count, types) {
    if (!A.agents || !A.agents.send) { hub.toast("AI agent module not loaded"); return 0; }
    const prompt = [
      `Find ${count} grant opportunities that fit us.` + (focus ? ` Focus: ${focus}.` : ""),
      `Funder types to include: ${types.map((t) => TY_LABEL[t]).join(", ")}.`,
      "Return ONLY a JSON array (no prose/markdown). Each element:",
      '{ "funder": string, "funder_type": one of ["foundation","corporate","government","community"],',
      '  "focus_area": string, "fit_reason": one sentence, "est_amount": range string with "(verify)",',
      '  "deadline_note": string with "(verify)", "url": string or "[verify]", "first_step": string }',
      "Prefer real, still-plausible funders; never present amounts/deadlines as confirmed.",
    ].join("\n");
    const res = await A.agents.send("grant_scout", [{ role: "user", content: prompt }], ORG_FACTS);
    let arr = null; const text = res && res.text ? res.text : "";
    try { arr = JSON.parse(text); } catch (e) { const m = text.match(/\[[\s\S]*\]/); if (m) { try { arr = JSON.parse(m[0]); } catch (e2) {} } }
    if (!Array.isArray(arr) || !arr.length) { hub.toast(res && res.source === "sim" ? "Deploy ai-agent for live prospecting" : "Couldn't parse leads — try again"); return 0; }
    const rows = arr.filter((it) => it && it.funder).map((it) => ({
      funder: String(it.funder).slice(0, 200),
      funder_type: TY_LABEL[it.funder_type] ? it.funder_type : "foundation",
      focus_area: String(it.focus_area || "").slice(0, 300),
      fit_reason: String(it.fit_reason || "").slice(0, 600),
      est_amount: String(it.est_amount || "").slice(0, 120),
      deadline_note: String(it.deadline_note || "").slice(0, 200),
      url: String(it.url || "").slice(0, 400),
      notes: it.first_step ? "First step: " + String(it.first_step).slice(0, 300) : null,
      status: "identified", drafted_by: "Gwen (AI)",
    }));
    await insertMany(hub, rows);
    return rows.length;
  }

  /* ---- Grants.gov: live federal opportunities (real award sizes) ---------- */
  async function searchGrantsGov(hub, keyword, rows) {
    const cfg = A.SUPABASE || {};
    const ok = A.configured && cfg.url && !cfg.url.includes("YOUR-PROJECT");
    if (!ok) { hub.toast("Connect Supabase to use Grants.gov"); return 0; }
    let data;
    try {
      const res = await fetch(cfg.url.replace(/\/$/, "") + "/functions/v1/grants-search", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + cfg.anonKey, apikey: cfg.anonKey },
        body: JSON.stringify({ keyword: keyword || "workforce apprenticeship housing", rows }),
      });
      data = await res.json();
      if (!res.ok || data.error) { hub.toast(data && data.error ? "Grants.gov: " + data.error : "Deploy the grants-search function"); return 0; }
    } catch (e) { hub.toast("Deploy the grants-search function to search Grants.gov"); return 0; }
    const leads = (data.leads || []).map((l) => ({
      funder: l.funder, funder_type: "government", focus_area: l.focus_area, fit_reason: l.fit_reason,
      est_amount: l.est_amount, deadline_note: l.deadline_note, url: l.url,
      contact_email: l.contact_email || null, notes: l.notes || null, status: "identified", drafted_by: "Gwen (Grants.gov)",
    }));
    if (!leads.length) { hub.toast("No federal matches — try a broader keyword"); return 0; }
    await insertMany(hub, leads);
    return leads.length;
  }

  /* ---- Rex / Wes: draft a single field for one lead ----------------------- */
  const DRAFTS = {
    intro_email_draft: { agent: "grant_outreach", who: "Rex", label: "Intro email",
      prompt: (l) => `Draft a short, professional introduction EMAIL to ${l.funder}${l.contact_name ? " (attn: " + l.contact_name + ")" : ""} about our fit for their ${l.focus_area || "funding"} priorities. Include a subject line, one clear ask for a brief call, and offer a one-page overview. Use [placeholders] for any contact detail you don't have.` },
    call_script_draft: { agent: "grant_outreach", who: "Rex", label: "Call script",
      prompt: (l) => `Write a warm ~30-second phone-CALL script to ${l.funder}'s program officer to introduce us, confirm fit for ${l.focus_area || "their priorities"}, and request a brief call about how to apply. Keep it business-to-business and easy to say yes to.` },
    proposal_draft: { agent: "grant_writer", who: "Wes", label: "LOI / proposal",
      prompt: (l) => `Draft a letter of inquiry / proposal to ${l.funder} for ${l.focus_area || "our program"}. ` +
        (l.amount_requested ? `Request $${Number(l.amount_requested).toLocaleString()}. ` :
          l.est_amount ? `Size the request to this funder's available range: ${l.est_amount} — pick a specific, well-justified amount within it. ` : "") +
        (l.deadline_note ? `Deadline: ${l.deadline_note}. ` : "") +
        `Structure: need, our model, measurable outcomes, capacity, budget, sustainability. Use [placeholders] for EIN, 501(c)(3) date, exact figures, and outcome metrics — never invent them. End with the list of placeholders to fill in.` },
    followup_draft: { agent: "grant_writer", who: "Wes", label: "Follow-up",
      prompt: (l) => `Draft a short, warm follow-up email to ${l.funder}${l.submitted_at ? " about the proposal we submitted on " + l.submitted_at : " about our submitted proposal"}. Offer additional materials or a site visit and propose one next step.` },
  };

  async function draftField(hub, lead, field, el) {
    const d = DRAFTS[field];
    const btn = el.querySelector(`[data-draft="${field}"]`); const ta = el.querySelector(`[data-field="${field}"]`);
    if (!A.agents || !A.agents.send) { hub.toast("AI agent module not loaded"); return; }
    const orig = btn ? btn.textContent : ""; if (btn) { btn.disabled = true; btn.textContent = d.who + " is drafting…"; }
    try {
      const res = await A.agents.send(d.agent, [{ role: "user", content: d.prompt(lead) }], ORG_FACTS);
      const text = (res && res.text ? res.text : "").trim();
      if (text) { if (ta) ta.value = text; await updateOne(hub, lead.id, { [field]: text, drafted_by: d.who + " (AI)" }); Object.assign(lead, { [field]: text }); hub.toast(d.who + " drafted the " + d.label.toLowerCase()); }
      else hub.toast("No draft returned");
    } catch (e) { console.error(e); hub.toast("Draft failed"); }
    if (btn) { btn.disabled = false; btn.textContent = orig; }
  }

  /* ---- view --------------------------------------------------------------- */
  async function render(hub) {
    const view = hub.el(), kpi = hub.kpi, money = hub.money;
    const leads = await fetchLeads(hub);
    const c = leads.reduce((a, x) => { a[x.status] = (a[x.status] || 0) + 1; return a; }, {});
    const inPipe = leads.filter((x) => IN_PIPE[x.status]).length;
    const awardedSum = leads.filter((x) => x.status === "awarded").reduce((s, x) => s + (Number(x.amount_requested) || 0), 0);
    const shown = leads.filter((x) => filterStatus === "all" || x.status === filterStatus);

    view.innerHTML = `
      <div class="view-head"><div><h2 style="margin:0">Grants</h2>
        <p>Gwen finds leads &middot; Rex opens the door &middot; Wes writes the proposal. You approve every send.</p></div></div>

      <div class="kpis">
        ${kpi("Leads identified", c.identified || 0, "target", "")}
        ${kpi("In pipeline", inPipe, "mega", "")}
        ${kpi("Submitted", c.submitted || 0, "home", "")}
        ${kpi("Awarded", (c.awarded || 0) + (awardedSum ? " · " + money(awardedSum) : ""), "ticket", "")}
      </div>

      <div class="panel" style="border-left:3px solid #e0a100"><div class="panel-body" style="font-size:.9rem">
        <b>Verify before you send.</b> Funder names, amounts, deadlines, emails, and phone numbers are AI suggestions flagged
        <code>[verify]</code>/<code>[placeholder]</code> — confirm each one. Funder outreach is business-to-business cultivation;
        still honor any do-not-contact request, and never present a donation as a grant.
      </div></div>

      <div class="panel"><div class="panel-head"><h3>Find grant leads — Gwen</h3></div><div class="panel-body">
        <form id="find-form">
          <div class="field"><label>Source</label>
            <select name="source">
              <option value="grantsgov">Grants.gov — live federal grants (real award sizes)</option>
              <option value="ai">AI shortlist — Gwen (foundations, corporate &amp; government ideas)</option>
            </select></div>
          <div class="field"><label>Keyword / focus</label><input name="focus" placeholder="e.g. apprenticeship, Detroit housing, workforce, youth"></div>
          <div class="field" data-ai-only style="display:none"><label>Funder types (AI only)</label>
            <div style="display:flex;flex-wrap:wrap;gap:.5rem 1rem;margin-top:.3rem">
              ${TYPES.map(([v, l]) => `<label style="display:flex;align-items:center;gap:.4rem;font-weight:600"><input type="checkbox" name="ty" value="${v}" checked> ${l}</label>`).join("")}
            </div></div>
          <div class="field" style="max-width:160px"><label>How many</label>
            <select name="count"><option>5</option><option selected>8</option><option>12</option></select></div>
          <button class="btn btn-primary" type="submit" id="find-btn">Find leads</button>
          <span class="text-soft" style="margin-left:.6rem;font-size:.85rem" id="find-note">Grants.gov returns real federal opportunities with award ceilings and deadlines.</span>
        </form>
      </div></div>

      <div class="panel"><div class="panel-head"><h3>Pipeline</h3>
        <select id="f-st"><option value="all">All statuses</option>${STATUS.map((s) => `<option value="${s}" ${filterStatus === s ? "selected" : ""}>${s}</option>`).join("")}</select>
      </div><div class="panel-body" id="grantlist">
        ${shown.length ? shown.map(card).join("") : `<p class="text-soft">No leads yet. Use <b>Find leads</b> above to have Gwen build a shortlist.</p>`}
      </div></div>`;

    const findForm = view.querySelector("#find-form");
    const syncSource = () => {
      const gov = findForm.source.value === "grantsgov";
      const aiOnly = findForm.querySelector("[data-ai-only]"); if (aiOnly) aiOnly.style.display = gov ? "none" : "";
      const note = view.querySelector("#find-note");
      if (note) note.textContent = gov
        ? "Grants.gov returns real federal opportunities with award ceilings and deadlines."
        : "Gwen (AI) suggests foundation, corporate & government leads — amounts/deadlines flagged verify.";
    };
    findForm.source.onchange = syncSource; syncSource();
    findForm.onsubmit = async (e) => {
      e.preventDefault(); const f = e.target;
      const btn = f.querySelector("#find-btn"), orig = btn.textContent; btn.disabled = true;
      try {
        let n = 0;
        if (f.source.value === "grantsgov") {
          btn.textContent = "Searching Grants.gov…";
          n = await searchGrantsGov(hub, f.focus.value.trim(), Number(f.count.value));
          if (n) hub.toast(`Added ${n} federal opportunit${n === 1 ? "y" : "ies"}`);
        } else {
          const types = Array.from(f.querySelectorAll('input[name="ty"]:checked')).map((c) => c.value);
          if (!types.length) { hub.toast("Pick at least one funder type"); btn.disabled = false; btn.textContent = orig; return; }
          btn.textContent = "Gwen is searching…";
          n = await findLeads(hub, f.focus.value.trim(), f.count.value, types);
          if (n) hub.toast(`Gwen found ${n} lead${n === 1 ? "" : "s"}`);
        }
      } catch (err) { console.error(err); hub.toast("Search failed"); }
      btn.disabled = false; btn.textContent = orig; render(hub);
    };
    view.querySelector("#f-st").onchange = (e) => { filterStatus = e.target.value; render(hub); };
    view.querySelectorAll("[data-lead]").forEach((el) => wireCard(hub, el, leads.find((l) => String(l.id) === el.getAttribute("data-id"))));
  }

  function draftBlock(l, field) {
    const d = DRAFTS[field]; const has = l[field];
    return `<details ${has ? "" : ""} style="margin-top:.5rem"><summary style="cursor:pointer;font-weight:700;color:var(--navy-900,#062a40)">${d.label} <span class="text-soft" style="font-weight:500">— ${d.who}${has ? " ✓" : ""}</span></summary>
      <div style="margin-top:.4rem">
        <textarea data-field="${field}" rows="5" placeholder="No draft yet.">${esc(l[field] || "")}</textarea>
        <div style="display:flex;gap:.5rem;margin-top:.3rem">
          <button class="btn btn-ghost btn-sm" data-draft="${field}">${has ? "Redraft" : "Draft"} with ${d.who}</button>
          <button class="btn btn-ghost btn-sm" data-copy="${field}">Copy</button>
        </div>
      </div></details>`;
  }

  function card(l) {
    const req = l.amount_requested != null ? l.amount_requested : "";
    return `<div class="ncard" data-lead data-id="${esc(l.id)}" style="border:1px solid var(--line,#e6e8ec);border-radius:12px;padding:1rem;margin-bottom:.9rem">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:.6rem;flex-wrap:wrap">
        <div style="display:flex;gap:.5rem;align-items:center">
          <span class="pill" style="background:var(--navy-900,#062a40);color:#fff">${esc(TY_LABEL[l.funder_type] || l.funder_type)}</span>
          <b>${esc(l.funder)}</b>
        </div>
        <select data-field="status">${STATUS.map((s) => `<option value="${s}" ${l.status === s ? "selected" : ""}>${s}</option>`).join("")}</select>
      </div>
      ${l.fit_reason ? `<p class="text-soft" style="margin:.5rem 0 0">${esc(l.fit_reason)}</p>` : ""}
      <div class="field-row" style="margin-top:.5rem">
        <div class="field"><label>Focus area</label><input data-field="focus_area" value="${esc(l.focus_area || "")}"></div>
        <div class="field"><label>Est. amount (verify)</label><input data-field="est_amount" value="${esc(l.est_amount || "")}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Deadline (verify)</label><input data-field="deadline_note" value="${esc(l.deadline_note || "")}"></div>
        <div class="field"><label>Apply / URL</label><input data-field="url" value="${esc(l.url || "")}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Contact name</label><input data-field="contact_name" value="${esc(l.contact_name || "")}"></div>
        <div class="field"><label>Contact email</label><input data-field="contact_email" value="${esc(l.contact_email || "")}"></div>
        <div class="field"><label>Contact phone</label><input data-field="contact_phone" value="${esc(l.contact_phone || "")}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Amount requested ($)</label><input data-field="amount_requested" type="number" value="${esc(req)}"></div>
        <div class="field"><label>Submitted</label><input data-field="submitted_at" type="date" value="${esc(l.submitted_at || "")}"></div>
        <div class="field"><label>Decision</label><input data-field="decision_at" type="date" value="${esc(l.decision_at || "")}"></div>
      </div>
      ${draftBlock(l, "intro_email_draft")}
      ${draftBlock(l, "call_script_draft")}
      ${draftBlock(l, "proposal_draft")}
      ${draftBlock(l, "followup_draft")}
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.7rem">
        <button class="btn btn-primary btn-sm" data-save>Save</button>
        <button class="btn btn-ghost btn-sm" data-del style="color:#b42318">Delete</button>
      </div>
    </div>`;
  }

  function wireCard(hub, el, lead) {
    const id = el.getAttribute("data-id");
    if (!lead) lead = { id };
    const get = (f) => { const n = el.querySelector(`[data-field="${f}"]`); return n ? n.value : undefined; };
    el.querySelectorAll("[data-draft]").forEach((b) => b.onclick = () => draftField(hub, lead, b.getAttribute("data-draft"), el));
    el.querySelectorAll("[data-copy]").forEach((b) => b.onclick = () => {
      const f = b.getAttribute("data-copy"); const n = el.querySelector(`[data-field="${f}"]`);
      try { navigator.clipboard.writeText(n ? n.value : ""); hub.toast("Copied"); } catch (e) { hub.toast("Copy failed"); }
    });
    el.querySelector("[data-save]").onclick = async () => {
      const patch = {};
      ["status", "focus_area", "est_amount", "deadline_note", "url", "contact_name", "contact_email", "contact_phone",
       "intro_email_draft", "call_script_draft", "proposal_draft", "followup_draft"].forEach((f) => { const v = get(f); if (v !== undefined) patch[f] = v; });
      const amt = get("amount_requested"); patch.amount_requested = amt === "" || amt == null ? null : Number(amt);
      ["submitted_at", "decision_at"].forEach((f) => { const v = get(f); patch[f] = v || null; });
      try { await updateOne(hub, id, patch); hub.toast("Saved"); } catch (e) { hub.toast("Save failed"); }
    };
    el.querySelector("[data-del]").onclick = async () => {
      if (!confirm("Delete this grant lead?")) return;
      try { await deleteOne(hub, id); hub.toast("Deleted"); render(hub); } catch (e) { hub.toast("Delete failed"); }
    };
  }

  async function dashboardMount(slot, hub) {
    const leads = await fetchLeads(hub);
    slot.insertAdjacentHTML("beforeend", `
      <div class="panel"><div class="panel-head"><h3>Grants</h3>
        <button class="btn btn-ghost btn-sm" data-goto="grants">Open</button></div>
        <div class="kpis" style="padding:1rem">
          ${hub.kpi("Leads", leads.length, "target", "")}
          ${hub.kpi("Submitted", leads.filter((x) => x.status === "submitted").length, "home", "")}
          ${hub.kpi("Awarded", leads.filter((x) => x.status === "awarded").length, "ticket", "")}
        </div></div>`);
  }

  A.registerPlugin({
    id: "grants",
    titles: { grants: "Grants" },
    roles: { board: ["grants"], staff: ["grants"] },
    views: { grants: render },
    nav: [{ group: "Fundraising", items: [["grants", "Grants", ICON]] }],
    dashboardMount,
  });
})();
