/* ============================================================================
   Jacks of All Trades — Fundraising Team (Command Center plugin)
   File: assets/js/fundraising-team.plugin.js
   Generated: 2026-09-29 19:45 UTC

   One view for the 5-agent AI fundraising team and its single goal ($2M):
     Grants team:  Gwen (prospector) · Rex (outreach) · Wes (writer)
                   → works in the Grants view; runs via grants-agents
     Donor team:   Paige (individual giving) · Cole (corporate partnerships)
                   → drafts land in Outreach as "planned"; reviewed + sent here;
                     runs via donors-agents
   Nothing is sent automatically — every email is reviewed and sent by a person.

   Goal split: window.JOAT.FUNDRAISING_TEAM in config.js.
   Data: grant_leads, grant_agent_runs, donors, donations, outreach, donor_agent_runs
   Remove the <script src=".../fundraising-team.plugin.js"> tag to disable.
   ========================================================================== */
(function () {
  "use strict";
  const A = (window.JOAT = window.JOAT || {});
  if (!A.registerPlugin) { console.warn("[fundraising-team] Command Center core not loaded"); return; }

  const T = Object.assign({ goal: 2000000, grants: 1200000, corporate: 550000, individual: 250000 }, A.FUNDRAISING_TEAM || {});
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
  const usd = (n) => "$" + Math.round(Number(n) || 0).toLocaleString();
  const pct = (a, b) => (b ? Math.min(100, (a / b) * 100) : 0);
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M14 20c0-2.2 1.3-4 3-4s3 1.8 3 4"/></svg>';
  const WIN_ODDS = { qualified: 0.05, contacted: 0.08, drafting: 0.12, submitted: 0.2, follow_up: 0.22 };

  const AGENTS = [
    { name: "Gwen", role: "Grant Prospector", team: "grants", color: "#0f766e", job: "Scores every new grant lead for fit; qualifies or dismisses" },
    { name: "Rex", role: "Grant Outreach", team: "grants", color: "#1d4ed8", job: "Drafts funder intro emails and call scripts" },
    { name: "Wes", role: "Grant Writer", team: "grants", color: "#b45309", job: "Drafts proposals, sets the ask, drafts follow-ups" },
    { name: "Paige", role: "Individual Giving", team: "individual", color: "#be185d", job: "Thank-yous, renewals, lapsed donors, new prospects" },
    { name: "Cole", role: "Corporate Partnerships", team: "corporate", color: "#7c3aed", job: "Finds Detroit companies, pitches sponsorships, renews partners" },
  ];

  async function sel(hub, table, build) {
    try { const { data, error } = await build(hub.db().from(table)); return error ? [] : (data || []); } catch (e) { return []; }
  }
  async function load(hub) {
    if (!hub.db()) return null;
    const year = String(new Date().getFullYear());
    const [leads, donors, gifts, queue, gRun, dRun] = await Promise.all([
      sel(hub, "grant_leads", (q) => q.select("status,amount_requested,proposal_draft,intro_email_draft").limit(3000)),
      sel(hub, "donors", (q) => q.select("id,full_name,email,type,stage,suggested_ask,ai_next_step").limit(5000)),
      sel(hub, "donations", (q) => q.select("donor_id,amount,gift_date").gte("gift_date", year + "-01-01").limit(10000)),
      sel(hub, "outreach", (q) => q.select("*").eq("status", "planned").or("drafted_by.ilike.Paige%,drafted_by.ilike.Cole%").order("created_at", { ascending: false }).limit(200)),
      sel(hub, "grant_agent_runs", (q) => q.select("*").order("created_at", { ascending: false }).limit(1)),
      sel(hub, "donor_agent_runs", (q) => q.select("*").order("created_at", { ascending: false }).limit(1)),
    ]);
    const typeOf = new Map(donors.map((d) => [d.id, d.type || "individual"]));
    const ytd = (t) => gifts.filter((g) => (typeOf.get(g.donor_id) || "individual") === t).reduce((s, g) => s + (Number(g.amount) || 0), 0);
    const amt = (l) => Number(l.amount_requested) || 0;
    const grantsWon = leads.filter((l) => l.status === "awarded").reduce((s, l) => s + amt(l), 0);
    const grantsLikely = leads.reduce((s, l) => s + amt(l) * (WIN_ODDS[l.status] || 0), 0);
    const asks = (t) => queue.filter((o) => (typeOf.get(o.donor_id) || "individual") === t)
      .reduce((s, o) => s + (Number((donors.find((d) => d.id === o.donor_id) || {}).suggested_ask) || 0), 0) * 0.25;
    return {
      donors, queue, gRun: gRun[0], dRun: dRun[0],
      grants: { raised: grantsWon, likely: grantsLikely, awaiting: leads.filter((l) => l.status === "drafting" && l.proposal_draft).length },
      corporate: { raised: ytd("corporate"), likely: asks("corporate") },
      individual: { raised: ytd("individual"), likely: asks("individual") },
    };
  }

  async function callFn(hub, name, body) {
    const cfg = A.SUPABASE || {};
    if (!hub.db() || !cfg.url) throw new Error("Not connected to Supabase — sign in on the live hub");
    let token = cfg.anonKey;
    try { const { data } = await hub.db().auth.getSession(); if (data && data.session) token = data.session.access_token; } catch (e) {}
    let res;
    try {
      res = await fetch(cfg.url.replace(/\/$/, "") + "/functions/v1/" + name, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, apikey: cfg.anonKey },
        body: JSON.stringify(body || {}),
      });
    } catch (e) { throw new Error(`Couldn't reach ${name} — deploy it (supabase functions deploy ${name} --no-verify-jwt)`); }
    const out = await res.json().catch(() => ({}));
    if (!res.ok || out.error) throw new Error(out.error || out.message || `${name} HTTP ${res.status}`);
    return out;
  }

  const bar = (raised, likely, target, color) => `<div style="height:12px;border-radius:8px;background:#e6e8ec;overflow:hidden;display:flex;margin:.35rem 0">
      <div style="width:${pct(raised, target)}%;background:${color}"></div><div style="width:${pct(likely, target)}%;background:${color};opacity:.35"></div></div>`;

  let flash = null;

  async function render(hub) {
    const view = hub.el();
    const d = await load(hub);
    if (!d) { view.innerHTML = `<div class="panel"><div class="panel-body">Sign in to the live hub (Supabase) to see the fundraising team.</div></div>`; return; }
    const raised = d.grants.raised + d.corporate.raised + d.individual.raised;
    const likely = d.grants.likely + d.corporate.likely + d.individual.likely;
    const teamRow = (label, who, x, target, color) => `<div style="margin-top:.7rem">
        <div style="display:flex;justify-content:space-between;gap:.5rem;flex-wrap:wrap"><b>${label} <span class="text-soft" style="font-weight:500">· ${who}</span></b>
          <span>${usd(x.raised)} <span class="text-soft">of ${usd(target)}</span></span></div>
        ${bar(x.raised, x.likely, target, color)}</div>`;

    view.innerHTML = `
      <div class="view-head"><div><h2 style="margin:0">Fundraising Team</h2>
        <p>Five AI fundraisers, one goal: <b>${usd(T.goal)}</b>. They research and draft; you review and send.</p></div></div>

      ${flash ? `<div class="panel" style="border-left:4px solid ${flash.ok ? "#12805c" : "#b42318"}"><div class="panel-body">${flash.ok ? "✅" : "❌"} ${esc(flash.text)}
        ${(flash.errs || []).slice(0, 5).map((e) => `<div style="color:#b42318;font-size:.85rem">⚠ ${esc(e)}</div>`).join("")}</div></div>` : ""}

      <div class="panel"><div class="panel-body">
        <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:.5rem">
          <div style="font-size:1.6rem;font-weight:850">${usd(raised)} <span class="text-soft" style="font-size:1rem;font-weight:600">raised of ${usd(T.goal)}</span></div>
          <div class="text-soft">+ ~${usd(likely)} likely from work in progress · gap ${usd(Math.max(0, T.goal - raised - likely))}</div></div>
        ${bar(raised, likely, T.goal, "#0f766e")}
        ${teamRow("Grants", "Gwen · Rex · Wes", d.grants, T.grants, "#0f766e")}
        ${teamRow("Corporate", "Cole", d.corporate, T.corporate, "#7c3aed")}
        ${teamRow("Individual donors", "Paige", d.individual, T.individual, "#be185d")}
        <div class="text-soft" style="font-size:.8rem;margin-top:.5rem">Solid = raised this year (awarded grants + donations). Light = likely from open work (grant pipeline by stage; drafted donor asks at ~25%).</div>
      </div></div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:.8rem;margin-bottom:1rem">
        ${AGENTS.map((a) => `<div class="panel" style="margin:0;border-top:4px solid ${a.color}"><div class="panel-body">
          <div style="font-weight:850;font-size:1.05rem">${a.name}</div><div class="text-soft" style="font-size:.85rem">${a.role}</div>
          <div style="font-size:.85rem;margin-top:.4rem">${a.job}</div></div></div>`).join("")}
      </div>

      <div class="panel"><div class="panel-head"><h3>Run the team</h3></div><div class="panel-body">
        <div style="display:flex;gap:.5rem;flex-wrap:wrap">
          <button class="btn btn-primary" id="ft-grants">Run grants team</button>
          <button class="btn btn-primary" id="ft-donors">Run donor team</button>
          <button class="btn btn-ghost" data-goto-view="grants">Open Grants →</button>
        </div>
        <div style="font-size:.88rem;margin-top:.6rem">
          <div><b>Grants team</b> (every 2 hours, 8:30am–6:30pm ET): ${d.gRun ? esc(new Date(d.gRun.created_at).toLocaleString()) + " — " + esc(d.gRun.summary || "") : "no runs yet"}</div>
          <div><b>Donor team</b> (weekdays 9:15am ET): ${d.dRun ? esc(new Date(d.dRun.created_at).toLocaleString()) + " — " + esc(d.dRun.summary || "") : "no runs yet"}</div>
          ${d.grants.awaiting ? `<div style="margin-top:.3rem">📝 <b>${d.grants.awaiting}</b> grant proposal${d.grants.awaiting === 1 ? "" : "s"} from Wes waiting for you in <a href="#grants">Grants → Applying</a>.</div>` : ""}
        </div></div></div>

      <div class="panel"><div class="panel-head"><h3>Review &amp; send — Paige and Cole's drafts <span class="text-soft" style="font-weight:500">(${d.queue.length})</span></h3></div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Donor</th><th>Email</th><th>Suggested ask</th><th>Drafted by</th><th></th></tr></thead>
          <tbody>${d.queue.length ? d.queue.map((o) => {
            const donor = d.donors.find((x) => x.id === o.donor_id) || {};
            return `<tr data-oid="${esc(o.id)}">
              <td><b>${esc(o.donor_name || donor.full_name)}</b><div class="muted">${esc(donor.type || "individual")} · ${esc(donor.stage || "")}</div>
                ${donor.ai_next_step ? `<div style="font-size:.8rem">➜ ${esc(donor.ai_next_step)}</div>` : ""}</td>
              <td style="max-width:320px">${esc(o.subject)}</td>
              <td>${donor.suggested_ask ? usd(donor.suggested_ask) : "—"}</td>
              <td>${esc(o.drafted_by)}</td>
              <td style="text-align:right"><button class="btn btn-primary btn-sm" data-review>Review</button></td></tr>`;
          }).join("") : `<tr><td colspan="5" class="text-soft" style="padding:1.5rem">Nothing waiting. Click <b>Run donor team</b> — or add donors in Donors (CRM) for Paige and Cole to work.</td></tr>`}</tbody>
        </table></div></div>`;

    const run = (btn, fn, label) => async () => {
      btn.disabled = true; btn.textContent = "Working… (up to 2 min)";
      try { const out = await callFn(hub, fn, { trigger: "hub" }); flash = { ok: true, text: label + ": " + (out.summary || "done"), errs: out.errors || [] }; }
      catch (e) { flash = { ok: false, text: label + ": " + (e.message || e) }; }
      render(hub);
    };
    const gb = view.querySelector("#ft-grants"), db = view.querySelector("#ft-donors");
    gb.onclick = run(gb, "grants-agents", "Grants team");
    db.onclick = run(db, "donors-agents", "Donor team");
    view.querySelector("[data-goto-view]").onclick = () => { location.hash = "grants"; };
    view.querySelectorAll("tr[data-oid]").forEach((tr) => {
      const o = d.queue.find((x) => String(x.id) === tr.getAttribute("data-oid"));
      tr.querySelector("[data-review]").onclick = () => openDraft(hub, o, d.donors.find((x) => x.id === o.donor_id) || {});
    });
  }

  function openDraft(hub, o, donor) {
    document.querySelectorAll(".ft-modal").forEach((n) => n.remove());
    const wrap = document.createElement("div");
    wrap.className = "modal-backdrop ft-modal";
    wrap.innerHTML = `<div class="modal-card" style="max-width:720px">
      <div class="modal-head"><div><h3>${esc(o.donor_name || donor.full_name)}</h3>
        <div class="text-soft" style="font-size:.88rem">${esc(donor.type || "individual")} · drafted by ${esc(o.drafted_by)}${donor.suggested_ask ? " · suggested ask " + usd(donor.suggested_ask) : ""}</div></div>
        <button class="modal-x" data-x aria-label="Close">×</button></div>
      <div style="overflow-y:auto;padding:1.2rem 1.4rem">
        ${donor.ai_next_step ? `<p style="margin-top:0"><b>➜ ${esc(donor.ai_next_step)}</b></p>` : ""}
        <div class="field"><label>To</label><input data-to type="email" value="${esc(donor.email || "")}" placeholder="Add the contact's email"></div>
        <div class="field"><label>Subject</label><input data-subj value="${esc(o.subject || "")}"></div>
        <div class="field"><label>Email</label><textarea data-body rows="13" style="width:100%">${esc(o.body || "")}</textarea></div>
        <p class="text-soft" style="font-size:.82rem">Fill in any [placeholders] before sending. Verify names and facts — especially for AI-suggested companies.</p>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap">
          <button class="btn btn-primary" data-send>Send email</button>
          <button class="btn btn-ghost" data-save>Save edits</button>
          <button class="btn btn-ghost" data-marked>I sent it myself</button>
          <span style="flex:1"></span>
          <button class="btn btn-ghost" data-discard style="color:#b42318">Discard draft</button>
        </div></div></div>`;
    document.body.appendChild(wrap);
    const $ = (s) => wrap.querySelector(s);
    const close = () => { wrap.remove(); render(hub); };
    wrap.addEventListener("click", (e) => { if (e.target === wrap) close(); });
    $("[data-x]").onclick = close;
    const upd = async (patch) => { const { error } = await hub.db().from("outreach").update(patch).eq("id", o.id); if (error) throw error; };
    const sent = async (to) => {
      await upd({ status: "sent", subject: $("[data-subj]").value, body: $("[data-body]").value, scheduled_date: new Date().toISOString().slice(0, 10) });
      const patch = {};
      if (to && to !== donor.email) patch.email = to;
      if (donor.stage === "prospect") patch.stage = "cultivating";
      if (Object.keys(patch).length) await hub.db().from("donors").update(patch).eq("id", donor.id);
    };
    $("[data-send]").onclick = async (e) => {
      if (!A.email || !A.email.send) return hub.toast("Email module not loaded");
      const to = $("[data-to]").value.trim(), subject = $("[data-subj]").value.trim(), text = $("[data-body]").value;
      if (!to) return hub.toast("Add the recipient's email first");
      if (/\[[^\]]+\]/.test(subject + text) && !confirm("The email still has [placeholders]. Send anyway?")) return;
      if (!confirm(`Send to ${to}?\n\nSubject: ${subject}`)) return;
      e.target.disabled = true; e.target.textContent = "Sending…";
      const r = await A.email.send({ to, subject, text });
      if (!r.ok) { hub.toast("Send failed: " + (r.error || "unknown")); e.target.disabled = false; e.target.textContent = "Send email"; return; }
      try { await sent(to); hub.toast("Sent ✓"); } catch (err) { hub.toast("Sent, but saving failed: " + (err.message || err)); }
      close();
    };
    $("[data-save]").onclick = async () => { try { await upd({ subject: $("[data-subj]").value, body: $("[data-body]").value }); hub.toast("Saved"); } catch (err) { hub.toast("Save failed: " + (err.message || err)); } };
    $("[data-marked]").onclick = async () => { try { await sent($("[data-to]").value.trim()); hub.toast("Marked sent"); close(); } catch (err) { hub.toast("Update failed: " + (err.message || err)); } };
    $("[data-discard]").onclick = async () => {
      if (!confirm("Discard this draft?")) return;
      const { error } = await hub.db().from("outreach").delete().eq("id", o.id);
      if (error) hub.toast("Discard failed: " + error.message); else { hub.toast("Discarded"); close(); }
    };
  }

  async function dashboardMount(slot, hub) {
    const d = await load(hub); if (!d) return;
    const raised = d.grants.raised + d.corporate.raised + d.individual.raised;
    slot.insertAdjacentHTML("beforeend", `
      <div class="panel"><div class="panel-head"><h3>AI fundraising team → ${usd(T.goal)}</h3><button class="btn btn-ghost btn-sm" data-goto="fund_team">Open</button></div>
        <div class="panel-body">${usd(raised)} raised · ${d.queue.length} donor email${d.queue.length === 1 ? "" : "s"} to review · ${d.grants.awaiting} grant proposal${d.grants.awaiting === 1 ? "" : "s"} ready
          ${bar(raised, 0, T.goal, "#0f766e")}</div></div>`);
  }

  A.registerPlugin({
    id: "fundraising-team",
    titles: { fund_team: "Fundraising Team" },
    roles: { board: ["fund_team"], staff: ["fund_team"] },
    views: { fund_team: render },
    nav: [{ group: "Fundraising", items: [["fund_team", "Fundraising Team", ICON]] }],
    dashboardMount,
  });
})();
