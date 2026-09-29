/* ============================================================================
   Jacks of All Trades — Grants (finder + CRM in one view)
   File: assets/js/grants.plugin.js
   Generated: 2026-09-15 16:10 UTC
   Updated:   2026-09-29 18:00 UTC · Rebuilt lean. One "Find grants" bar saves
              leads server-side (grants-daily), a compact pipeline table with
              stage tabs is the CRM, and each lead opens in a detail window
              (fields + AI drafts + email/call). Errors are shown, not hidden.
   Updated:   2026-09-29 19:00 UTC · AI team panel: Gwen scores/qualifies, Rex drafts
              outreach, Wes drafts proposals + follow-ups (grants-agents, every
              2 hours). Fit score + next step per lead; Road-to-goal numbers.

   Agents: Gwen (finds leads) · Rex (intro email / call script) · Wes (proposal /
   follow-up). Every draft is human-reviewed before it's sent.

   Data:  public.grant_leads            (supabase/schema_grants_*.sql)
   Find:  POST functions/v1/grants-daily  { keyword, target, sources }  (saves)
   Test:  POST functions/v1/grants-search { diagnose: true }
   Remove the <script src=".../grants.plugin.js"> tag to disable.
   ========================================================================== */
(function () {
  "use strict";
  const A = (window.JOAT = window.JOAT || {});
  if (!A.registerPlugin) { console.warn("[grants] Command Center core not loaded"); return; }

  const EIN = (A.ORG && A.ORG.ein) || "";
  const LEGAL = (A.ORG && A.ORG.grantLegalName) || "Jacks of All Trades";
  const GOALS = A.GRANTS_GOALS || { findPerDay: 10, proposalsPerDay: 5 };
  const ORG_FACTS =
    "Jacks of All Trades Community Development — a Detroit nonprofit that (1) trains residents in six skilled trades, " +
    "(2) renovates vacant Detroit homes into quality housing, and (3) runs youth apprenticeship & mentoring with job placement. " +
    "A 50/50 raffle funds a home renovation. Mission: revitalize Detroit neighborhoods and build futures through skilled-trades training. " +
    "Grant applicant legal name (use verbatim): " + LEGAL + ". " +
    (EIN ? "Federal EIN (use verbatim; do not use a placeholder for it): " + EIN + ". " : "");

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
  const todayStr = () => new Date().toISOString().slice(0, 10);
  const isToday = (ts) => { try { return new Date(ts).toDateString() === new Date().toDateString(); } catch (e) { return false; } };
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 6 6 .9-4.5 4.3 1 6.3L12 17l-5.5 2.5 1-6.3L3 8.9 9 8z"/></svg>';

  /* ---- pipeline model ------------------------------------------------------ */
  const STATUS = ["identified", "qualified", "contacted", "drafting", "submitted", "follow_up", "awarded", "declined", "archived"];
  const STATUS_LABEL = { identified: "New", qualified: "Qualified", contacted: "Contacted", drafting: "Drafting", submitted: "Submitted", follow_up: "Follow-up", awarded: "Won", declined: "Declined", archived: "Dismissed" };
  const TABS = [
    ["new", "New", ["identified"]],
    ["qualified", "Qualified", ["qualified"]],
    ["applying", "Applying", ["contacted", "drafting"]],
    ["submitted", "Submitted", ["submitted", "follow_up"]],
    ["won", "Won", ["awarded"]],
    ["closed", "Closed", ["declined", "archived"]],
    ["all", "All", null],
  ];
  const SOURCES = { simpler: ["Simpler.Grants.gov", "#0f766e"], grantsgov: ["Grants.gov", "#1d4ed8"], sam: ["SAM.gov", "#7c3aed"], ai: ["AI idea", "#6b7280"] };
  function sourceOf(l) {
    const t = (l.drafted_by || "") + " " + (l.deadline_note || "");
    if (/Simpler\.Grants\.gov/i.test(t)) return "simpler";
    if (/SAM\.gov/i.test(t)) return "sam";
    if (/Grants\.gov/i.test(t)) return "grantsgov";
    return "ai";
  }
  // "Closes 2026-12-01", "Closes 12/01/2026", "Responses due 2026-10-20" → Date | null
  function deadlineOf(l) {
    const t = String(l.deadline_note || "");
    let m = t.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    m = t.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return new Date(+m[3], +m[1] - 1, +m[2]);
    return null;
  }
  function deadlineCell(l) {
    const d = deadlineOf(l);
    if (!d) return `<span class="text-soft">${esc((l.deadline_note || "—").replace(/\s*\([^)]*\)\s*$/, "").slice(0, 28))}</span>`;
    const days = Math.ceil((d - new Date(new Date().toDateString())) / 86400000);
    const color = days < 0 ? "#6b7280" : days <= 14 ? "#b42318" : days <= 45 ? "#b45309" : "#12805c";
    const note = days < 0 ? "closed" : days === 0 ? "today" : days + " days";
    return `<b style="color:${color}">${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</b><div style="font-size:.78rem;color:${color}">${note}</div>`;
  }
  const amountShort = (l) => esc(String(l.est_amount || "—").replace(/\s*\((Simpler\.Grants\.gov|Grants\.gov|SAM\.gov|verify)\)\s*$/i, "").replace(/ per award$/, "").slice(0, 32));

  const usd = (n) => "$" + Math.round(Number(n) || 0).toLocaleString();
  const GRANTS_TARGET = (A.FUNDRAISING_TEAM && Number(A.FUNDRAISING_TEAM.grants)) ||
    (A.REVENUE_TARGETS && (Number(A.REVENUE_TARGETS.gov_grants) || 0) + (Number(A.REVENUE_TARGETS.foundations) || 0)) || 1200000;
  const WIN_ODDS = { qualified: 0.05, contacted: 0.08, drafting: 0.12, submitted: 0.2, follow_up: 0.22 };
  function goalMath(leads) {
    const amt = (l) => Number(l.amount_requested) || 0;
    const won = leads.filter((l) => l.status === "awarded").reduce((s, l) => s + amt(l), 0);
    const weighted = leads.reduce((s, l) => s + amt(l) * (WIN_ODDS[l.status] || 0), 0);
    const asks = leads.filter((l) => ["submitted", "follow_up", "awarded", "declined"].includes(l.status) && amt(l) > 0).map(amt);
    const avg = asks.length ? asks.reduce((a, b) => a + b, 0) / asks.length : 150000;
    const gap = Math.max(0, GRANTS_TARGET - won - weighted);
    return { won, weighted, gap, avg, needed: Math.ceil(gap / Math.max(1, avg * 0.2)) };
  }
  const fitPill = (l) => l.fit_score == null ? "" : `<span class="pill" title="Gwen's fit score" style="background:${l.fit_score >= 65 ? "#12805c" : l.fit_score > 30 ? "#b45309" : "#6b7280"};color:#fff;font-size:.66rem;padding:.2em .6em">Fit ${l.fit_score}</span>`;

  /* ---- data --------------------------------------------------------------- */
  const localMem = [];
  async function fetchLeads(hub) {
    if (!hub.db()) return { leads: localMem.slice(), error: null };
    const { data, error } = await hub.db().from("grant_leads").select("*").order("created_at", { ascending: false }).limit(500);
    return { leads: data || [], error };
  }
  async function updateOne(hub, id, patch) {
    if (!hub.db()) { const r = localMem.find((x) => x.id === id); if (r) Object.assign(r, patch); return; }
    const { error } = await hub.db().from("grant_leads").update(patch).eq("id", id); if (error) throw error;
  }
  async function deleteOne(hub, id) {
    if (!hub.db()) { const i = localMem.findIndex((x) => x.id === id); if (i >= 0) localMem.splice(i, 1); return; }
    const { error } = await hub.db().from("grant_leads").delete().eq("id", id); if (error) throw error;
  }
  async function insertMany(hub, rows) {
    if (!hub.db()) { rows.forEach((r) => localMem.unshift({ id: "m" + Math.random().toString(36).slice(2), created_at: new Date().toISOString(), ...r })); return; }
    const { error } = await hub.db().from("grant_leads").insert(rows); if (error) throw error;
  }

  async function callFn(hub, name, body) {
    const cfg = A.SUPABASE || {};
    if (!hub.db() || !cfg.url) throw new Error("Not connected to Supabase — sign in on the live hub");
    let token = cfg.anonKey;
    try { const { data } = await hub.db().auth.getSession(); if (data && data.session) token = data.session.access_token; } catch (e) {}
    let res;
    try {
      res = await fetch(cfg.url.replace(/\/$/, "") + "/functions/v1/" + name, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, apikey: cfg.anonKey },
        body: JSON.stringify(body || {}),
      });
    } catch (e) { throw new Error(`Couldn't reach the ${name} function — deploy it (supabase functions deploy ${name})`); }
    const out = await res.json().catch(() => ({}));
    if (!res.ok || out.error) throw new Error(out.error || out.message || `${name} HTTP ${res.status}`);
    return out;
  }

  /* ---- finding ------------------------------------------------------------- */
  // Federal / SAM: grants-daily searches AND saves server-side (service role, de-duped).
  async function findAndSave(hub, keyword, count, source) {
    const sources = source === "sam" ? ["sam"] : source === "federal" ? ["federal"] : ["federal", "sam"];
    const out = await callFn(hub, "grants-daily", { keyword, target: count, sources });
    const c = out.counts || {};
    const parts = [c.simpler && `${c.simpler} Simpler.Grants.gov`, c.grantsgov && `${c.grantsgov} Grants.gov`, c.sam && `${c.sam} SAM.gov`].filter(Boolean);
    const errs = Object.entries(out.errors || {}).map(([k, v]) => `${SOURCES[k] ? SOURCES[k][0] : k}: ${v}`);
    let text = out.inserted
      ? `Saved ${out.inserted} new lead${out.inserted === 1 ? "" : "s"}${parts.length ? " (" + parts.join(", ") + ")" : ""}.`
      : (out.message || "No new leads.");
    if (out.skipped_duplicates) text += ` ${out.skipped_duplicates} already in your pipeline.`;
    return { ok: true, inserted: out.inserted || 0, text, errs };
  }

  // AI ideas (foundations, corporate, state & local) — Gwen, saved from the browser.
  async function findAI(hub, focus, count) {
    if (!A.agents || !A.agents.send) throw new Error("AI agent module not loaded");
    const prompt = [
      `Find ${count} grant opportunities that fit us.` + (focus ? ` Focus: ${focus}.` : ""),
      "Mix foundations, corporate funders, Michigan state agencies (MSHDA, MEDC, LEO/Michigan Works!), and local/city sources (City of Detroit CDBG/HRD, Detroit at Work, Wayne County, Detroit Land Bank Authority). Skip federal Grants.gov listings — we pull those live.",
      "Return ONLY a JSON array. Each element:",
      '{ "funder": string, "funder_type": one of ["foundation","corporate","government","community"], "focus_area": string,',
      '  "fit_reason": one sentence, "est_amount": range with "(verify)", "deadline_note": string with "(verify)", "url": string or "[verify]" }',
      "Prefer real funders; never present amounts/deadlines as confirmed.",
    ].join("\n");
    const res = await A.agents.send("grant_scout", [{ role: "user", content: prompt }], ORG_FACTS);
    const text = (res && res.text) || "";
    let arr = null;
    try { arr = JSON.parse(text); } catch (e) { const m = text.match(/\[[\s\S]*\]/); if (m) { try { arr = JSON.parse(m[0]); } catch (e2) {} } }
    if (!Array.isArray(arr) || !arr.length) throw new Error(res && res.source === "sim" ? "Deploy ai-agent (with ANTHROPIC_API_KEY) for live AI ideas" : "Couldn't read Gwen's answer — try again");
    const types = { foundation: 1, corporate: 1, government: 1, community: 1 };
    const rows = arr.filter((it) => it && it.funder).map((it) => ({
      funder: String(it.funder).slice(0, 200), funder_type: types[it.funder_type] ? it.funder_type : "foundation",
      focus_area: String(it.focus_area || "").slice(0, 300), fit_reason: String(it.fit_reason || "").slice(0, 600),
      est_amount: String(it.est_amount || "").slice(0, 120), deadline_note: String(it.deadline_note || "").slice(0, 200),
      url: String(it.url || "").slice(0, 400), status: "identified", drafted_by: "Gwen (AI)",
    }));
    await insertMany(hub, rows);
    return { ok: true, inserted: rows.length, text: `Gwen added ${rows.length} AI idea${rows.length === 1 ? "" : "s"} — verify each before outreach.`, errs: [] };
  }

  async function testConnections(hub) {
    const d = await callFn(hub, "grants-search", { diagnose: true });
    const row = (name, r) => {
      r = r || {};
      const mark = r.ok ? "✅" : r.configured === false ? "⚪" : "❌";
      const detail = r.ok ? (name === "Database" ? `${r.count} leads saved` : `working${r.sample ? " — e.g. “" + esc(r.sample) + "”" : ""}`) : esc(r.error || "failed");
      return `<li>${mark} <b>${name}</b> — ${detail}</li>`;
    };
    return `<ul style="list-style:none;padding:0;margin:0;line-height:1.8">${row("Database", d.database)}${row("Simpler.Grants.gov", d.simpler)}${row("Grants.gov", d.grantsgov)}${row("SAM.gov", d.sam)}</ul>
      <div class="text-soft" style="font-size:.82rem">⚪ = optional key not set</div>`;
  }

  /* ---- AI drafts ------------------------------------------------------------ */
  const DRAFTS = {
    intro_email_draft: { agent: "grant_outreach", who: "Rex", label: "Intro email", email: true,
      prompt: (l) => `Draft a short, professional introduction EMAIL to ${l.funder}${l.contact_name ? " (attn: " + l.contact_name + ")" : ""} about our fit for "${l.focus_area || "their funding"}". Include a subject line, one clear ask for a brief call, and offer a one-page overview. Use [placeholders] for any contact detail you don't have.` },
    call_script_draft: { agent: "grant_outreach", who: "Rex", label: "Call script", call: true,
      prompt: (l) => `Write a warm ~30-second phone-CALL script to ${l.funder}'s program officer to introduce us, confirm fit for "${l.focus_area || "their priorities"}", and request a brief call about how to apply. Business-to-business and easy to say yes to.` },
    proposal_draft: { agent: "grant_writer", who: "Wes", label: "Proposal / LOI",
      prompt: (l) => `Draft a letter of inquiry / proposal to ${l.funder} for "${l.focus_area || "our program"}". ` +
        (l.amount_requested ? `Request $${Number(l.amount_requested).toLocaleString()}. ` : l.est_amount ? `Size the request to this funder's range: ${l.est_amount} — pick a specific, justified amount within it. ` : "") +
        (l.deadline_note ? `Deadline: ${l.deadline_note}. ` : "") +
        "Structure: need, our model, measurable outcomes, capacity, budget, sustainability. Use [placeholders] for 501(c)(3) date, exact figures, and outcome metrics — never invent them. End with the list of placeholders to fill in." },
    followup_draft: { agent: "grant_writer", who: "Wes", label: "Follow-up", email: true,
      prompt: (l) => `Draft a short, warm follow-up email to ${l.funder}${l.submitted_at ? " about the proposal we submitted on " + l.submitted_at : " about our submitted proposal"}. Offer more materials or a site visit and propose one next step.` },
  };

  /* ---- view ----------------------------------------------------------------- */
  let tab = "new", query = "", lastResult = null, connHtml = "", aiResult = null;

  async function lastRun(hub) {
    if (!hub.db()) return null;
    const { data } = await hub.db().from("grant_agent_runs").select("*").order("created_at", { ascending: false }).limit(1);
    return data && data[0];
  }

  async function render(hub) {
    const view = hub.el();
    const { leads, error } = await fetchLeads(hub);
    const run = await lastRun(hub).catch(() => null);
    const g = goalMath(leads);
    const inTab = (l, t) => { const def = TABS.find((x) => x[0] === t); return !def[2] || def[2].includes(l.status); };
    const count = (t) => leads.filter((l) => inTab(l, t)).length;
    const q = query.toLowerCase();
    let rows = leads.filter((l) => inTab(l, tab) && (!q || [l.funder, l.focus_area, l.notes, l.fit_reason].join(" ").toLowerCase().includes(q)));
    if (tab !== "new" && tab !== "all") {
      const far = new Date(8640000000000000);
      rows = rows.sort((a, b) => (deadlineOf(a) || far) - (deadlineOf(b) || far));
    }
    const foundToday = leads.filter((l) => isToday(l.created_at)).length;
    const sentToday = leads.filter((l) => l.submitted_at === todayStr()).length;
    const openValue = leads.filter((l) => ["qualified", "contacted", "drafting", "submitted", "follow_up"].includes(l.status)).length;

    view.innerHTML = `
      <div class="view-head"><div><h2 style="margin:0">Grants</h2>
        <p>Find → qualify → apply → win. New leads arrive every morning at 8am; search any time below.</p></div></div>

      ${error ? `<div class="panel" style="border-left:4px solid #b42318"><div class="panel-body"><b>Can't load grant leads:</b> ${esc(error.message)}<br>
        Run <code>supabase/schema_grants_2026-09-15_1610.sql</code> in the Supabase SQL Editor, then reload.</div></div>` : ""}

      <div class="panel"><div class="panel-body">
        <form id="g-find" style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:flex-end">
          <div class="field" style="flex:2 1 220px;margin:0"><label>Find grants</label>
            <input name="kw" placeholder="Keyword — e.g. apprenticeship, housing, youth (blank = today's auto search)"></div>
          <div class="field" style="flex:1 1 180px;margin:0"><label>Where</label>
            <select name="src">
              <option value="all">All federal (grants + SAM.gov contracts)</option>
              <option value="federal">Federal grants only</option>
              <option value="sam">SAM.gov contracts only</option>
              <option value="ai">AI ideas — foundations, state &amp; local</option>
            </select></div>
          <div class="field" style="flex:0 0 90px;margin:0"><label>How many</label>
            <select name="n"><option>5</option><option selected>10</option><option>20</option></select></div>
          <button class="btn btn-primary" type="submit" id="g-find-btn">Find &amp; save</button>
          <button class="btn btn-ghost" type="button" id="g-test">Test connections</button>
        </form>
        ${lastResult ? `<div style="margin-top:.7rem;font-size:.9rem">${lastResult.ok ? "✅" : "❌"} ${esc(lastResult.text)}${(lastResult.errs || []).map((e) => `<div style="color:#b42318">⚠ ${esc(e)}</div>`).join("")}</div>` : ""}
        ${connHtml ? `<div style="margin-top:.7rem;padding-top:.7rem;border-top:1px solid var(--border,#e6e8ec)">${connHtml}</div>` : ""}
      </div></div>

      <div class="panel"><div class="panel-head"><h3>AI grants team</h3>
        <button class="btn btn-primary btn-sm" id="g-ai">Run AI team now</button></div>
        <div class="panel-body">
          <div class="text-soft" style="font-size:.88rem;margin-bottom:.6rem"><b>Gwen</b> scores &amp; qualifies new leads · <b>Rex</b> drafts intro emails &amp; call scripts ·
            <b>Wes</b> drafts proposals &amp; follow-ups. Runs automatically 3 times a day (8:30am, 12:30pm, 4:30pm ET) — quality over quantity. Nothing is sent until you click Send.</div>
          ${aiResult ? `<div style="margin-bottom:.5rem">${aiResult.ok ? "✅" : "❌"} ${esc(aiResult.text)}${(aiResult.errs || []).slice(0, 4).map((e) => `<div style="color:#b42318;font-size:.85rem">⚠ ${esc(e)}</div>`).join("")}</div>`
            : run ? `<div style="margin-bottom:.5rem;font-size:.9rem"><b>Last run</b> ${esc(new Date(run.created_at).toLocaleString())}: ${esc(run.summary || "")}</div>`
            : `<div style="margin-bottom:.5rem;font-size:.9rem" class="text-soft">No AI-team runs yet — click <b>Run AI team now</b>.</div>`}
          <div style="font-weight:800;margin-top:.4rem">Road to ${usd(GRANTS_TARGET)} in grants <span class="text-soft" style="font-weight:500">(the grants team's share of the $2M team goal)</span></div>
          <div style="height:12px;border-radius:8px;background:#e6e8ec;overflow:hidden;margin:.35rem 0;display:flex">
            <div style="width:${Math.min(100, g.won / GRANTS_TARGET * 100)}%;background:#12805c"></div>
            <div style="width:${Math.min(100, g.weighted / GRANTS_TARGET * 100)}%;background:#93c5fd"></div></div>
          <div style="font-size:.88rem">🟩 Won <b>${usd(g.won)}</b> · 🟦 Likely from pipeline <b>${usd(g.weighted)}</b> · Gap <b>${usd(g.gap)}</b>
            ${g.gap ? ` → about <b>${g.needed}</b> more proposals at ~${usd(g.avg)} each (20% win rate)` : " — on track 🎉"}</div>
        </div></div>

      <div class="kpis">
        ${hub.kpi("New today", foundToday + " / " + GOALS.findPerDay, "target", "")}
        ${hub.kpi("To review", count("new"), "mega", "")}
        ${hub.kpi("In progress", openValue, "home", "")}
        ${hub.kpi("Submitted today", sentToday + " / " + GOALS.proposalsPerDay, "ticket", "")}
      </div>

      <div class="panel">
        <div class="panel-head" style="flex-wrap:wrap;gap:.5rem">
          <div style="display:flex;gap:.3rem;flex-wrap:wrap">
            ${TABS.map(([k, label]) => `<button type="button" class="btn btn-sm ${tab === k ? "btn-primary" : "btn-ghost"}" data-tab="${k}">${label} <span style="opacity:.7">${count(k)}</span></button>`).join("")}
          </div>
          <input id="g-q" placeholder="Filter…" value="${esc(query)}" style="max-width:200px">
        </div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Opportunity</th><th>Amount</th><th>Deadline</th><th>Stage</th><th></th></tr></thead>
          <tbody>${rows.length ? rows.map(row).join("") : `<tr><td colspan="5" class="text-soft" style="padding:1.5rem">${
            error ? "—" : tab === "new" ? "No new leads to review. Use <b>Find &amp; save</b> above — results land here." : "Nothing in this stage yet."}</td></tr>`}</tbody>
        </table></div>
      </div>`;

    const f = view.querySelector("#g-find");
    f.onsubmit = async (e) => {
      e.preventDefault();
      const btn = view.querySelector("#g-find-btn"); btn.disabled = true; btn.textContent = "Searching…";
      try {
        lastResult = f.src.value === "ai"
          ? await findAI(hub, f.kw.value.trim(), Number(f.n.value))
          : await findAndSave(hub, f.kw.value.trim(), Number(f.n.value), f.src.value);
        if (lastResult.inserted) tab = "new";
      } catch (err) { console.error(err); lastResult = { ok: false, text: err.message || String(err) }; }
      render(hub);
    };
    view.querySelector("#g-ai").onclick = async (e) => {
      e.target.disabled = true; e.target.textContent = "Team is working… (up to 2 min)";
      try {
        const out = await callFn(hub, "grants-agents", { trigger: "hub" });
        aiResult = { ok: true, text: out.summary || "Done.", errs: out.errors || [] };
      } catch (err) { aiResult = { ok: false, text: err.message || String(err) }; }
      render(hub);
    };
    view.querySelector("#g-test").onclick = async (e) => {
      e.target.disabled = true; e.target.textContent = "Testing…";
      try { connHtml = await testConnections(hub); } catch (err) { connHtml = "❌ " + esc(err.message || err); }
      render(hub);
    };
    view.querySelectorAll("[data-tab]").forEach((b) => b.onclick = () => { tab = b.getAttribute("data-tab"); render(hub); });
    const qi = view.querySelector("#g-q");
    qi.oninput = () => { query = qi.value; clearTimeout(qi._t); qi._t = setTimeout(() => { render(hub).then(() => { const n = hub.el().querySelector("#g-q"); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }); }, 250); };

    view.querySelectorAll("tr[data-id]").forEach((tr) => {
      const lead = leads.find((l) => String(l.id) === tr.getAttribute("data-id"));
      tr.querySelector("[data-open]").onclick = () => openLead(hub, lead);
      tr.querySelector(".g-title").onclick = () => openLead(hub, lead);
      tr.querySelector("[data-stage]").onchange = async (e) => {
        try { await updateOne(hub, lead.id, { status: e.target.value }); hub.toast("Moved to " + STATUS_LABEL[e.target.value]); render(hub); }
        catch (err) { hub.toast("Update failed: " + (err.message || err)); }
      };
      tr.querySelectorAll("[data-quick]").forEach((b) => b.onclick = async () => {
        const st = b.getAttribute("data-quick");
        try { await updateOne(hub, lead.id, { status: st }); hub.toast(st === "qualified" ? "Qualified ✓" : "Dismissed"); render(hub); }
        catch (err) { hub.toast("Update failed: " + (err.message || err)); }
      });
    });
  }

  function row(l) {
    const [srcLabel, srcColor] = SOURCES[sourceOf(l)];
    return `<tr data-id="${esc(l.id)}">
      <td style="max-width:420px">
        <a href="javascript:void 0" class="g-title" style="font-weight:700;color:inherit;text-decoration:none">${esc(l.focus_area || l.funder)}</a>
        <div class="muted">${esc(l.funder)}</div>
        ${l.ai_next_step && !["awarded", "declined", "archived"].includes(l.status) ? `<div style="font-size:.8rem;margin-top:.2rem">➜ ${esc(l.ai_next_step)}</div>` : ""}
        <div style="margin-top:.25rem;display:flex;gap:.3rem;flex-wrap:wrap">
          ${fitPill(l)}<span class="pill" style="background:${srcColor};color:#fff;font-size:.66rem;padding:.2em .6em">${srcLabel}</span>
          ${isToday(l.created_at) ? '<span class="pill" style="background:#12805c;color:#fff;font-size:.66rem;padding:.2em .6em">New today</span>' : ""}
        </div></td>
      <td style="white-space:nowrap">${amountShort(l)}</td>
      <td style="white-space:nowrap">${deadlineCell(l)}</td>
      <td><select data-stage>${STATUS.map((s) => `<option value="${s}" ${l.status === s ? "selected" : ""}>${STATUS_LABEL[s]}</option>`).join("")}</select></td>
      <td style="white-space:nowrap;text-align:right">
        ${l.status === "identified" ? `<button class="btn btn-ghost btn-sm" data-quick="qualified" title="Worth pursuing">✓ Qualify</button>
          <button class="btn btn-ghost btn-sm" data-quick="archived" title="Not a fit">✕</button>` : ""}
        <button class="btn btn-primary btn-sm" data-open>Open</button></td>
    </tr>`;
  }

  /* ---- lead detail window --------------------------------------------------- */
  function openLead(hub, lead) {
    document.querySelectorAll(".g-modal").forEach((n) => n.remove());
    const wrap = document.createElement("div");
    wrap.className = "modal-backdrop g-modal";
    const fld = (k, label, type) => `<div class="field"><label>${label}</label><input data-f="${k}" ${type ? `type="${type}"` : ""} value="${esc(lead[k] == null ? "" : lead[k])}"></div>`;
    let active = Object.keys(DRAFTS).find((k) => lead[k]) || "intro_email_draft";
    wrap.innerHTML = `<div class="modal-card" style="max-width:780px">
      <div class="modal-head"><div><h3>${esc(lead.focus_area || lead.funder)}</h3>
        <div class="text-soft" style="font-size:.88rem">${esc(lead.funder)} · ${SOURCES[sourceOf(lead)][0]}${lead.url && /^https?:/.test(lead.url) ? ` · <a href="${esc(lead.url)}" target="_blank" rel="noopener">Open listing ↗</a>` : ""}</div></div>
        <button class="modal-x" data-x aria-label="Close">×</button></div>
      <div style="overflow-y:auto;padding:1.2rem 1.4rem">
        ${lead.fit_score != null || lead.ai_next_step ? `<div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin-bottom:.5rem">${fitPill(lead)}${lead.priority ? `<span class="text-soft" style="font-size:.85rem">Priority: ${esc(lead.priority)}</span>` : ""}${lead.ai_next_step ? `<b style="font-size:.9rem">➜ Next: ${esc(lead.ai_next_step)}</b>` : ""}</div>` : ""}
        ${lead.fit_reason ? `<p class="text-soft" style="margin-top:0">${esc(lead.fit_reason)}</p>` : ""}
        ${lead.notes ? `<p style="font-size:.88rem;margin-top:0">${esc(lead.notes)}</p>` : ""}
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0 1rem">
          <div class="field"><label>Stage</label><select data-f="status">${STATUS.map((s) => `<option value="${s}" ${lead.status === s ? "selected" : ""}>${STATUS_LABEL[s]}</option>`).join("")}</select></div>
          ${fld("est_amount", "Award size (verify)")}${fld("deadline_note", "Deadline (verify)")}
          ${fld("amount_requested", "Our request ($)", "number")}${fld("submitted_at", "Submitted", "date")}${fld("decision_at", "Decision", "date")}
          ${fld("contact_name", "Contact name")}${fld("contact_email", "Contact email", "email")}${fld("contact_phone", "Contact phone")}
          ${fld("url", "Listing / apply URL")}${fld("assigned_to", "Owner")}
        </div>
        <div style="margin-top:.6rem"><div style="display:flex;gap:.3rem;flex-wrap:wrap;margin-bottom:.4rem">
          ${Object.entries(DRAFTS).map(([k, d]) => `<button type="button" class="btn btn-sm ${k === active ? "btn-primary" : "btn-ghost"}" data-dtab="${k}">${d.label}${lead[k] ? " ✓" : ""}</button>`).join("")}
        </div>
        <textarea data-draft-text rows="9" style="width:100%"></textarea>
        <div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.4rem" data-draft-actions></div></div>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:1rem;border-top:1px solid var(--border,#e6e8ec);padding-top:1rem">
          <button class="btn btn-primary" data-save>Save</button>
          <button class="btn btn-ghost" data-submitted>Mark submitted today</button>
          <span style="flex:1"></span>
          <button class="btn btn-ghost" data-del style="color:#b42318">Delete</button>
        </div>
      </div></div>`;
    document.body.appendChild(wrap);
    const $ = (s) => wrap.querySelector(s);
    const drafts = Object.fromEntries(Object.keys(DRAFTS).map((k) => [k, lead[k] || ""]));
    const close = () => { wrap.remove(); render(hub); };
    wrap.addEventListener("click", (e) => { if (e.target === wrap) close(); });
    $("[data-x]").onclick = close;

    const collect = () => {
      const patch = {};
      wrap.querySelectorAll("[data-f]").forEach((n) => {
        const k = n.getAttribute("data-f"); let v = n.value;
        if (k === "amount_requested") v = v === "" ? null : Number(v);
        else if ((k === "submitted_at" || k === "decision_at") && !v) v = null;
        patch[k] = v;
      });
      drafts[active] = $("[data-draft-text]").value;
      Object.assign(patch, drafts);
      return patch;
    };
    const save = async (extra, note) => {
      const patch = Object.assign(collect(), extra || {});
      await updateOne(hub, lead.id, patch); Object.assign(lead, patch);
      if (note) hub.toast(note);
    };

    function showDraft() {
      const d = DRAFTS[active];
      $("[data-draft-text]").value = drafts[active];
      $("[data-draft-text]").placeholder = `No ${d.label.toLowerCase()} yet — ${d.who} can draft one.`;
      wrap.querySelectorAll("[data-dtab]").forEach((b) => { b.className = "btn btn-sm " + (b.getAttribute("data-dtab") === active ? "btn-primary" : "btn-ghost"); });
      $("[data-draft-actions]").innerHTML = `<button class="btn btn-ghost btn-sm" data-ai>${drafts[active] ? "Redraft" : "Draft"} with ${d.who}</button>
        <button class="btn btn-ghost btn-sm" data-copy>Copy</button>
        ${d.email ? '<button class="btn btn-primary btn-sm" data-send>Send email</button>' : ""}
        ${d.call ? '<button class="btn btn-primary btn-sm" data-call>Call funder</button>' : ""}`;
      $("[data-ai]").onclick = async (e) => {
        if (!A.agents || !A.agents.send) return hub.toast("AI agent module not loaded");
        const b = e.target; b.disabled = true; b.textContent = d.who + " is drafting…";
        try {
          const res = await A.agents.send(d.agent, [{ role: "user", content: d.prompt(Object.assign({}, lead, collect())) }], ORG_FACTS);
          const text = ((res && res.text) || "").trim();
          if (!text) hub.toast("No draft returned");
          else { drafts[active] = text; $("[data-draft-text]").value = text; await save({}, d.who + " drafted the " + d.label.toLowerCase()); }
        } catch (err) { hub.toast("Draft failed: " + (err.message || err)); }
        showDraft();
      };
      $("[data-copy]").onclick = () => { try { navigator.clipboard.writeText($("[data-draft-text]").value); hub.toast("Copied"); } catch (e) { hub.toast("Copy failed"); } };
      const send = $("[data-send]");
      if (send) send.onclick = async () => {
        if (!A.email || !A.email.send) return hub.toast("Email module not loaded");
        const to = ($('[data-f="contact_email"]').value || "").trim(), raw = $("[data-draft-text]").value;
        if (!to) return hub.toast("Add the contact email first");
        if (!raw.trim()) return hub.toast("Draft the email first");
        const { subject, body } = A.email.splitSubject(raw, (active === "followup_draft" ? "Following up — " : "Introduction — ") + lead.funder);
        if (!confirm(`Send this email to ${to}?\n\nSubject: ${subject}`)) return;
        send.disabled = true; send.textContent = "Sending…";
        const r = await A.email.send({ to, subject, text: body });
        if (r.ok) {
          const bump = active === "intro_email_draft" && ["identified", "qualified"].includes(lead.status) ? { status: "contacted" } : {};
          if (bump.status) $('[data-f="status"]').value = "contacted";
          try { await save(bump, "Email sent"); } catch (e) { hub.toast("Sent, but saving failed"); }
        } else hub.toast("Send failed: " + (r.error || "unknown"));
        showDraft();
      };
      const call = $("[data-call]");
      if (call) call.onclick = async () => {
        if (!A.phone || !A.phone.call) return hub.toast("Phone module not loaded");
        const to = ($('[data-f="contact_phone"]').value || "").trim(), script = $("[data-draft-text]").value.trim();
        if (!to) return hub.toast("Add the contact phone first");
        if (!script) return hub.toast("Draft the call script first");
        if (!confirm(`Place an automated call to ${to}? It reads the script aloud (business-to-business funder outreach).`)) return;
        call.disabled = true; call.textContent = "Calling…";
        const r = await A.phone.call({ to, script });
        if (r.ok) {
          const bump = ["identified", "qualified"].includes(lead.status) ? { status: "contacted" } : {};
          if (bump.status) $('[data-f="status"]').value = "contacted";
          try { await save(bump, "Call placed"); } catch (e) { hub.toast("Called, but saving failed"); }
        } else hub.toast("Call failed: " + (r.error || "unknown"));
        showDraft();
      };
    }
    wrap.querySelectorAll("[data-dtab]").forEach((b) => b.onclick = () => { drafts[active] = $("[data-draft-text]").value; active = b.getAttribute("data-dtab"); showDraft(); });
    showDraft();

    $("[data-save]").onclick = async () => { try { await save({}, "Saved"); close(); } catch (e) { hub.toast("Save failed: " + (e.message || e)); } };
    $("[data-submitted]").onclick = async () => {
      $('[data-f="status"]').value = "submitted"; $('[data-f="submitted_at"]').value = todayStr();
      try { await save({}, "Marked submitted today"); close(); } catch (e) { hub.toast("Save failed: " + (e.message || e)); }
    };
    $("[data-del]").onclick = async () => {
      if (!confirm("Delete this grant lead?")) return;
      try { await deleteOne(hub, lead.id); hub.toast("Deleted"); close(); } catch (e) { hub.toast("Delete failed: " + (e.message || e)); }
    };
  }

  /* ---- dashboard card -------------------------------------------------------- */
  async function dashboardMount(slot, hub) {
    const { leads } = await fetchLeads(hub);
    const soon = leads.filter((l) => { const d = deadlineOf(l); return d && ["qualified", "contacted", "drafting"].includes(l.status) && d - new Date() < 30 * 86400000 && d >= new Date(new Date().toDateString()); }).length;
    slot.insertAdjacentHTML("beforeend", `
      <div class="panel"><div class="panel-head"><h3>Grants</h3><button class="btn btn-ghost btn-sm" data-goto="grants">Open</button></div>
        <div class="kpis" style="padding:0 1rem 1rem">
          ${hub.kpi("New today", leads.filter((l) => isToday(l.created_at)).length, "target", "")}
          ${hub.kpi("To review", leads.filter((l) => l.status === "identified").length, "mega", "")}
          ${hub.kpi("Due in 30 days", soon, "home", "")}
          ${hub.kpi("Won", leads.filter((l) => l.status === "awarded").length, "ticket", "")}
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
