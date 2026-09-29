/* ============================================================================
   Jacks of All Trades — Donor profile + one-click agent actions
   File: assets/js/donor-profile.js
   Generated: 2026-09-29 23:30 UTC

   window.JOAT.donorProfile.open(donorId) opens a full donor profile from
   anywhere in the Command Center (Donor Giving, Donors CRM, Fundraising Team):
     • Summary — contact, type/stage, lifetime total, last gift, suggested ask,
       the AI's next step.
     • Agent actions — one click and the agent DOES it: Paige (individuals) or
       Cole (companies) / Ada (foundations) drafts a thank-you, renewal/upgrade
       ask, win-back, invitation, monthly-giving ask, sponsorship pitch or call
       script from this donor's real history — or any instruction you type. The
       draft is saved to Outreach (planned) and opens right here to edit + Send.
       Also: Record a gift, Log a call/meeting, Do not contact.
     • Giving — totals by fundraiser + full gift history.
     • Outreach — every email/call drafted or sent to this donor.
     • Edit — contact details, stage, owner, tags, notes.
   Nothing is sent without a person clicking Send.
   ========================================================================== */
(function () {
  "use strict";
  const A = (window.JOAT = window.JOAT || {});
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
  const usd = (n) => "$" + (Math.round((Number(n) || 0) * 100) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const today = () => new Date().toISOString().slice(0, 10);
  const toast = (m) => (A.hub && A.hub.toast ? A.hub.toast(m) : alert(m));
  const db = () => (A.hub && A.hub.db && A.hub.db()) || A.db;

  // Which agent works this donor.
  function agentFor(d) {
    if (d.type === "corporate") return { key: "donor_corporate", name: "Cole", color: "#7c3aed" };
    if (d.type === "foundation" || d.type === "government") return { key: "ada", name: "Ada", color: "#0f766e" };
    return { key: "donor_individual", name: "Paige", color: "#be185d" };
  }
  const ACTIONS = [
    { id: "thank", label: "Thank-you", for: "all", channel: "email", task: "Write a prompt, heartfelt THANK-YOU email for their most recent gift. Say concretely what support like theirs makes possible (no invented statistics). No new ask." },
    { id: "renew", label: "Renewal / upgrade ask", for: "all", channel: "email", task: "Write a RENEWAL email: thank them for past support and ask them to give again — suggest a specific amount based on their history (typically last gift × 1.2–1.5)." },
    { id: "winback", label: "Win back (lapsed)", for: "all", channel: "email", task: "Write a warm WIN-BACK email to a donor who hasn't given in a while: thank them, share what's new (the house renovation and trades program), and invite them back with a specific, modest ask." },
    { id: "invite", label: "Invite to a site visit / event", for: "all", channel: "email", task: "Write a short INVITATION to visit the renovation site or an upcoming event and meet the trainees. No money ask in this email; offer [date/time options]." },
    { id: "monthly", label: "Ask to give monthly", for: "individual", channel: "email", task: "Write an email inviting them to become a MONTHLY donor at a specific, comfortable amount based on their history, explaining what steady monthly support makes possible." },
    { id: "sponsor", label: "Sponsorship / in-kind pitch", for: "org", channel: "email", task: "Write a short PARTNERSHIP PITCH: 2–3 concrete options (sponsor a renovation phase, donate materials in-kind, employee build day, hiring pipeline) and ask for a 15-minute call." },
    { id: "call", label: "Call script", for: "all", channel: "call", task: "Write a warm ~45-second phone CALL SCRIPT for this donor (thank them, one update, one clear ask or next step). Start with a line 'Subject: Call script — <name>'." },
  ];

  function brief(d, gifts, outreach) {
    const byCamp = gifts.reduce((m, g) => { const k = g.campaign || "General"; m[k] = (m[k] || 0) + (Number(g.amount) || 0); return m; }, {});
    const org = A.ORG || {};
    return [
      `ORGANIZATION: ${org.legalName || "Jacks of All Trades Community Development"} — Detroit nonprofit (EIN ${org.ein || "[EIN]"}): skilled-trades training, vacant-home renovation, youth apprenticeship & mentoring. Contact ${org.email || "info@joatamp.org"} · ${org.phone || ""}.`,
      `CURRENT PROJECT: renovating a vacant 4-bed / 2-bath Detroit home ($100,000, five phases) with trainees; 50/50 raffle funds half.`,
      `DONOR: ${d.full_name} (${d.type || "individual"}, stage ${d.stage || "?"})${d.email ? ", email on file" : ", no email"}${d.tags ? ", tags: " + d.tags : ""}.`,
      `GIVING: lifetime ${usd(d.total_given)}; last gift ${d.last_gift_amount ? usd(d.last_gift_amount) + " on " + d.last_gift_date : "none"}.`,
      Object.keys(byCamp).length ? `BY FUNDRAISER: ${Object.entries(byCamp).map(([k, v]) => `${k} ${usd(v)}`).join("; ")}.` : "",
      gifts.length ? `RECENT GIFTS: ${gifts.slice(0, 8).map((g) => `${usd(g.amount)} ${g.gift_date || ""} (${g.campaign || "General"})`).join("; ")}.` : "",
      outreach.length ? `RECENT OUTREACH: ${outreach.slice(0, 5).map((o) => `${o.status} ${o.channel} "${o.subject || ""}" ${String(o.created_at || "").slice(0, 10)}`).join("; ")}.` : "",
      d.notes ? `NOTES: ${String(d.notes).slice(0, 800)}` : "",
      "Rules: use only these facts; [placeholders] for anything else; include a 'Subject:' first line for emails; sign as [Your name], Jacks of All Trades.",
    ].filter(Boolean).join("\n");
  }

  async function open(donorId, focus) {
    const c = db(); if (!c) return toast("Sign in to view donor profiles");
    const [dr, gr, or] = await Promise.all([
      c.from("donors").select("*").eq("id", donorId).single(),
      c.from("donations").select("*").eq("donor_id", donorId).order("gift_date", { ascending: false }).limit(500),
      c.from("outreach").select("*").eq("donor_id", donorId).order("created_at", { ascending: false }).limit(200),
    ]);
    if (dr.error || !dr.data) return toast("Couldn't load donor: " + (dr.error ? dr.error.message : "not found"));
    const d = dr.data, gifts = gr.data || [], outreach = or.data || [];
    const ag = agentFor(d);
    const isOrg = d.type && d.type !== "individual";
    const actions = ACTIONS.filter((a) => a.for === "all" || (a.for === "individual" && !isOrg) || (a.for === "org" && isOrg));
    const dnc = /do\s*not\s*contact|\bdnc\b/i.test(`${d.tags || ""} ${d.notes || ""}`);
    const byCamp = Object.entries(gifts.reduce((m, g) => { const k = g.campaign || "General"; (m[k] = m[k] || { t: 0, n: 0 }); m[k].t += Number(g.amount) || 0; m[k].n++; return m; }, {})).sort((a, b) => b[1].t - a[1].t);

    document.querySelectorAll(".dp-modal").forEach((n) => n.remove());
    const w = document.createElement("div");
    w.className = "modal-backdrop dp-modal";
    w.innerHTML = `<div class="modal-card" style="max-width:920px;width:100%">
      <div class="modal-head"><div>
        <h3 style="margin:0">${esc(d.full_name)}</h3>
        <div class="text-soft" style="font-size:.88rem">${esc(d.type || "individual")} · ${esc(d.stage || "")}${d.email ? ` · <a href="mailto:${esc(d.email)}">${esc(d.email)}</a>` : ""}${d.phone ? ` · <a href="tel:${esc(d.phone)}">${esc(d.phone)}</a>` : ""}${dnc ? ' · <b style="color:#b42318">DO NOT CONTACT</b>' : ""}</div></div>
        <button class="modal-x" data-x aria-label="Close">×</button></div>
      <div style="overflow-y:auto;padding:1rem 1.4rem">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.6rem;margin-bottom:.8rem">
          ${[["Lifetime", usd(d.total_given)], ["Gifts", gifts.length], ["Last gift", d.last_gift_amount ? `${usd(d.last_gift_amount)}<div class="muted" style="font-size:.78rem">${esc(d.last_gift_date || "")}</div>` : "—"],
            ["Suggested ask", d.suggested_ask ? usd(d.suggested_ask) : "—"]].map(([k, v]) => `<div style="border:1px solid var(--border,#e6e8ec);border-radius:12px;padding:.6rem .8rem"><div class="text-soft" style="font-size:.78rem">${k}</div><div style="font-weight:850;font-size:1.1rem">${v}</div></div>`).join("")}
        </div>
        ${d.ai_next_step ? `<p style="margin:.2rem 0 .8rem"><b>➜ Next step:</b> ${esc(d.ai_next_step)}</p>` : ""}

        <div style="border:2px solid ${ag.color};border-radius:14px;padding:.8rem 1rem;margin-bottom:1rem">
          <div style="font-weight:850;margin-bottom:.4rem"><span style="color:${ag.color}">${ag.name}</span> — one click, ${ag.name} writes it from ${esc(d.full_name.split(" ")[0])}'s history</div>
          ${dnc ? `<p style="color:#b42318;margin:.2rem 0">This donor is marked do-not-contact — outreach is disabled.</p>` : `
          <div style="display:flex;gap:.4rem;flex-wrap:wrap">${actions.map((a) => `<button class="btn btn-sm btn-ghost" data-act="${a.id}">${esc(a.label)}</button>`).join("")}</div>
          <form data-custom style="display:flex;gap:.4rem;margin-top:.5rem">
            <input name="t" placeholder="Or tell ${ag.name} what to do… e.g. “thank her for the $1,000 GoFundMe gift and invite her to the ribbon cutting”" style="flex:1">
            <button class="btn btn-primary btn-sm" type="submit">Do it</button></form>`}
          <div data-draft style="margin-top:.6rem"></div>
          <div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.5rem;border-top:1px solid var(--border,#e6e8ec);padding-top:.5rem">
            <button class="btn btn-ghost btn-sm" data-gift>Record a gift</button>
            <button class="btn btn-ghost btn-sm" data-log>Log a call / meeting</button>
            <button class="btn btn-ghost btn-sm" data-dnc style="color:#b42318">${dnc ? "Allow contact again" : "Do not contact"}</button>
          </div>
        </div>

        <div style="display:flex;gap:.3rem;flex-wrap:wrap;margin-bottom:.6rem">
          ${[["giving", `Giving (${gifts.length})`], ["outreach", `Outreach (${outreach.length})`], ["edit", "Edit details"]].map(([k, l], i) => `<button class="btn btn-sm ${(focus || "giving") === k ? "btn-primary" : "btn-ghost"}" data-tab="${k}">${l}</button>`).join("")}
        </div>
        <div data-pane></div>
      </div></div>`;
    document.body.appendChild(w);
    const $ = (s) => w.querySelector(s);
    const close = (refresh) => { w.remove(); if (refresh && A.hub && A.hub.route) A.hub.route(); };
    let changed = false;
    w.querySelector("[data-x]").onclick = () => close(changed);
    w.addEventListener("click", (e) => { if (e.target === w) close(changed); });

    const panes = {
      giving: () => `${byCamp.length ? `<div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:.6rem">${byCamp.map(([k, v]) => `<span class="pill" style="text-transform:none;letter-spacing:0">${esc(k)}: ${usd(v.t)}${v.n > 1 ? ` ×${v.n}` : ""}</span>`).join("")}</div>` : ""}
        <div class="table-wrap"><table class="data"><thead><tr><th>Date</th><th>Amount</th><th>Fundraiser</th><th>How</th></tr></thead><tbody>${gifts.map((g) =>
          `<tr><td>${esc(g.gift_date || "")}</td><td><b>${usd(g.amount)}</b></td><td>${esc(g.campaign || "General")}</td><td>${esc(g.source || g.method || "")}${g.note ? `<div class="muted">${esc(g.note)}</div>` : ""}</td></tr>`).join("") || `<tr><td colspan="4" class="text-soft">No gifts yet.</td></tr>`}</tbody></table></div>`,
      outreach: () => `<div class="table-wrap"><table class="data"><thead><tr><th>Date</th><th>Channel</th><th>Subject</th><th>Status</th><th>By</th></tr></thead><tbody>${outreach.map((o) =>
          `<tr data-oid="${esc(o.id)}" style="cursor:pointer"><td>${esc(String(o.created_at || "").slice(0, 10))}</td><td>${esc(o.channel)}</td><td>${esc(o.subject || "")}</td><td><span class="tag">${esc(o.status)}</span></td><td>${esc(o.drafted_by || "")}</td></tr>`).join("") || `<tr><td colspan="5" class="text-soft">No outreach yet — use an action above.</td></tr>`}</tbody></table></div>`,
      edit: () => `<form data-edit><div class="field-row">
          <div class="field"><label>Name</label><input name="full_name" value="${esc(d.full_name)}" required></div>
          <div class="field"><label>Email</label><input name="email" type="email" value="${esc(d.email || "")}"></div></div>
        <div class="field-row"><div class="field"><label>Phone</label><input name="phone" value="${esc(d.phone || "")}"></div>
          <div class="field"><label>Address</label><input name="address" value="${esc(d.address || "")}"></div></div>
        <div class="field-row"><div class="field"><label>Type</label><select name="type">${["individual", "corporate", "foundation", "government"].map((t) => `<option ${d.type === t ? "selected" : ""}>${t}</option>`).join("")}</select></div>
          <div class="field"><label>Stage</label><select name="stage">${["prospect", "cultivating", "active", "lapsed"].map((t) => `<option ${d.stage === t ? "selected" : ""}>${t}</option>`).join("")}</select></div>
          <div class="field"><label>Owner</label><input name="assigned_to" value="${esc(d.assigned_to || "")}"></div></div>
        <div class="field"><label>Tags</label><input name="tags" value="${esc(d.tags || "")}"></div>
        <div class="field"><label>Notes</label><textarea name="notes" rows="4">${esc(d.notes || "")}</textarea></div>
        <button class="btn btn-primary" type="submit">Save</button></form>`,
    };
    function showPane(k) {
      w.querySelectorAll("[data-tab]").forEach((b) => b.className = "btn btn-sm " + (b.dataset.tab === k ? "btn-primary" : "btn-ghost"));
      $("[data-pane]").innerHTML = panes[k]();
      if (k === "edit") $("[data-edit]").onsubmit = async (e) => {
        e.preventDefault();
        const patch = Object.fromEntries(new FormData(e.target).entries());
        Object.keys(patch).forEach((x) => { if (patch[x] === "" && x !== "full_name") patch[x] = null; });
        const { error } = await c.from("donors").update(patch).eq("id", d.id);
        if (error) return toast("Save failed: " + error.message);
        Object.assign(d, patch); changed = true; toast("Saved");
      };
      if (k === "outreach") w.querySelectorAll("tr[data-oid]").forEach((tr) => tr.onclick = () => editDraft(outreach.find((o) => String(o.id) === tr.dataset.oid)));
    }
    w.querySelectorAll("[data-tab]").forEach((b) => b.onclick = () => showPane(b.dataset.tab));
    showPane(focus && panes[focus] ? focus : "giving");

    // Draft editor (new or existing outreach row) with Send.
    function editDraft(o) {
      const box = $("[data-draft]");
      const isCall = o.channel === "call";
      box.innerHTML = `<div style="background:#f8fafc;border-radius:12px;padding:.7rem">
        <div class="text-soft" style="font-size:.8rem;margin-bottom:.3rem">${esc(o.drafted_by || "")} · ${esc(o.status)} · saved to Outreach</div>
        ${isCall ? "" : `<div class="field" style="margin-bottom:.4rem"><label>To</label><input data-to type="email" value="${esc(d.email || "")}" placeholder="Add an email address"></div>`}
        <div class="field" style="margin-bottom:.4rem"><label>Subject</label><input data-subj value="${esc(o.subject || "")}"></div>
        <textarea data-body rows="11" style="width:100%">${esc(o.body || "")}</textarea>
        <div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.4rem">
          ${o.status === "planned" && !isCall ? `<button class="btn btn-primary btn-sm" data-send>Send email</button>` : ""}
          ${isCall && d.phone && A.phone ? `<button class="btn btn-primary btn-sm" data-callnow>Call ${esc(d.phone)}</button>` : ""}
          <button class="btn btn-ghost btn-sm" data-save>Save</button>
          ${o.status === "planned" ? `<button class="btn btn-ghost btn-sm" data-done>${isCall ? "Mark called" : "I sent it myself"}</button>` : ""}
          <button class="btn btn-ghost btn-sm" data-copy>Copy</button></div></div>`;
      const cur = () => ({ subject: box.querySelector("[data-subj]").value, body: box.querySelector("[data-body]").value });
      const upd = async (patch, note) => { const { error } = await c.from("outreach").update(patch).eq("id", o.id); if (error) return toast("Update failed: " + error.message); Object.assign(o, patch); changed = true; toast(note); };
      box.querySelector("[data-save]").onclick = () => upd(cur(), "Saved");
      box.querySelector("[data-copy]").onclick = async () => { try { await navigator.clipboard.writeText(cur().body); toast("Copied"); } catch (e) {} };
      const done = box.querySelector("[data-done]");
      if (done) done.onclick = async () => { await upd({ ...cur(), status: "sent", scheduled_date: today() }, isCall ? "Logged the call" : "Marked sent"); editDraft(o); };
      const send = box.querySelector("[data-send]");
      if (send) send.onclick = async () => {
        if (!A.email || !A.email.send) return toast("Email module not loaded");
        const to = box.querySelector("[data-to]").value.trim(), { subject, body } = cur();
        if (!to) return toast("Add an email address first");
        if (/\[[^\]]+\]/.test(subject + body) && !confirm("The email still has [placeholders]. Send anyway?")) return;
        if (!confirm(`Send to ${to}?\n\nSubject: ${subject}`)) return;
        send.disabled = true; send.textContent = "Sending…";
        const r = await A.email.send({ to, subject, text: body });
        if (!r.ok) { send.disabled = false; send.textContent = "Send email"; return toast("Send failed: " + (r.error || "unknown")); }
        await upd({ subject, body, status: "sent", scheduled_date: today() }, "Sent ✓");
        const patch = {}; if (to !== d.email) patch.email = to; if (d.stage === "prospect") patch.stage = "cultivating";
        if (Object.keys(patch).length) { await c.from("donors").update(patch).eq("id", d.id); Object.assign(d, patch); }
        editDraft(o);
      };
      const callNow = box.querySelector("[data-callnow]");
      if (callNow) callNow.onclick = async () => {
        if (!confirm(`Place an automated call to ${d.phone}? It reads the script aloud.`)) return;
        const r = await A.phone.call({ to: d.phone, script: cur().body });
        if (r.ok) { await upd({ status: "sent", scheduled_date: today() }, "Call placed"); editDraft(o); } else toast("Call failed: " + (r.error || "unknown"));
      };
      box.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    // Execute an agent action → AI draft → saved to Outreach → editor.
    async function run(task, channel, label, btn) {
      if (!A.agents || !A.agents.send) return toast("AI agent module not loaded");
      const orig = btn ? btn.textContent : "";
      if (btn) { btn.disabled = true; btn.textContent = `${ag.name} is writing…`; }
      $("[data-draft]").innerHTML = `<p class="text-soft">${ag.name} is writing “${esc(label)}” for ${esc(d.full_name)}…</p>`;
      try {
        const res = await A.agents.send(ag.key, [{ role: "user", content: task }], brief(d, gifts, outreach));
        const text = String((res && res.text) || "").trim();
        if (!text) throw new Error("No draft returned");
        const split = A.email && A.email.splitSubject ? A.email.splitSubject(text, `${label} — ${d.full_name}`) : { subject: `${label} — ${d.full_name}`, body: text };
        const row = { donor_id: d.id, donor_name: d.full_name, channel, status: "planned", subject: split.subject.slice(0, 300), body: split.body,
          drafted_by: `${ag.name} (AI${res.source === "sim" ? " — simulated" : ""})`, scheduled_date: today() };
        const ins = await c.from("outreach").insert(row).select().single();
        if (ins.error) throw ins.error;
        outreach.unshift(ins.data); changed = true;
        await c.from("donors").update({ ai_next_step: channel === "call" ? `Call ${d.full_name.split(" ")[0]} using ${ag.name}'s script` : `Review and send ${ag.name}'s ${label.toLowerCase()}` }).eq("id", d.id);
        editDraft(ins.data);
        if (res.source === "sim") toast("Simulated draft — deploy ai-agent with ANTHROPIC_API_KEY for live writing");
      } catch (e) { $("[data-draft]").innerHTML = `<p style="color:#b42318">Couldn't draft: ${esc(e.message || e)}</p>`; }
      if (btn) { btn.disabled = false; btn.textContent = orig; }
    }
    w.querySelectorAll("[data-act]").forEach((b) => b.onclick = () => { const a = ACTIONS.find((x) => x.id === b.dataset.act); run(a.task, a.channel, a.label, b); });
    const custom = w.querySelector("[data-custom]");
    if (custom) custom.onsubmit = (e) => { e.preventDefault(); const t = e.target.t.value.trim(); if (t) run(t + " (Write it as a ready-to-send email with a 'Subject:' first line, unless it's clearly a call script.)", /call|phone/i.test(t) ? "call" : "email", t.slice(0, 40), e.target.querySelector("button")); };

    // Quick records
    w.querySelector("[data-gift]").onclick = async () => {
      const amt = Number(prompt(`Gift amount from ${d.full_name} ($):`, "")); if (!amt) return;
      const campaign = prompt("Fundraiser / campaign (e.g. 50/50 Raffle, GoFundMe, House renovation):", "General") || "General";
      const method = prompt("How (check, cash, card, zelle, cashapp, in_kind, gofundme…):", "check") || "check";
      const { error } = await c.from("donations").insert({ donor_id: d.id, donor_name: d.full_name, amount: amt, gift_date: today(), campaign, method, note: "Recorded from donor profile" });
      if (error) return toast("Save failed: " + error.message);
      try { await c.rpc("refresh_donor_totals"); } catch (e) {}
      toast("Gift recorded"); close(true); open(d.id, "giving");
    };
    w.querySelector("[data-log]").onclick = async () => {
      const kind = (prompt("Call or meeting?", "call") || "call").toLowerCase().startsWith("m") ? "meeting" : "call";
      const notes = prompt(`What happened on the ${kind}?`, ""); if (notes === null) return;
      const { error } = await c.from("outreach").insert({ donor_id: d.id, donor_name: d.full_name, channel: kind, status: "sent", subject: `${kind === "call" ? "Call" : "Meeting"} — ${today()}`, body: notes, drafted_by: "Staff", scheduled_date: today() });
      if (error) return toast("Save failed: " + error.message);
      toast("Logged"); close(true); open(d.id, "outreach");
    };
    w.querySelector("[data-dnc]").onclick = async () => {
      const tags = dnc ? String(d.tags || "").replace(/,?\s*do not contact/ig, "").replace(/,?\s*\bdnc\b/ig, "").replace(/^,\s*/, "") : [d.tags, "do not contact"].filter(Boolean).join(", ");
      const { error } = await c.from("donors").update({ tags }).eq("id", d.id);
      if (error) return toast("Save failed: " + error.message);
      toast(dnc ? "Contact allowed" : "Marked do-not-contact — agents will skip this donor"); close(true); open(d.id);
    };
    if (focus === "act") { const first = w.querySelector("[data-act]"); if (first) first.focus(); }
  }

  A.donorProfile = { open };
})();
