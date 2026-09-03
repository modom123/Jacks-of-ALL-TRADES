/* ============================================================================
   Jacks of All Trades — Command Center (Business Hub) Logic
   File: assets/js/admin.js
   Generated: 2026-09-03 16:32 UTC  |  joatamp.net redesign

   Auth-protected dashboard. Runs in DEMO mode (sample data, no login required)
   until Supabase is configured in config.js; then it authenticates against
   Supabase Auth and reads/writes live tables (protected by RLS policies).
   ========================================================================== */
(function () {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
  const money = (n) => "$" + Number(n || 0).toLocaleString();
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";
  const toast = (msg) => { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2400); };

  let DEMO = true;   // flips to false once a Supabase session is established
  let db = null;

  /* ---- Collection definitions ------------------------------------------- */
  const COLLECTIONS = {
    contact_messages:        { label: "Contact Messages",   cols: ["full_name", "email", "topic", "message"], titles: ["Name", "Email", "Topic", "Message"] },
    enrollment_applications: { label: "Enrollment",         cols: ["full_name", "email", "phone", "trade", "message"], titles: ["Name", "Email", "Phone", "Trade", "Notes"] },
    volunteer_signups:       { label: "Volunteers",         cols: ["full_name", "email", "interest", "message"], titles: ["Name", "Email", "Interest", "Notes"] },
    partnership_inquiries:   { label: "Partnerships",       cols: ["organization", "full_name", "email", "partnership_type", "message"], titles: ["Organization", "Contact", "Email", "Type", "Notes"] },
    newsletter_signups:      { label: "Newsletter",         cols: ["email", "source_page"], titles: ["Email", "Source"] },
  };

  /* ---- Demo data --------------------------------------------------------- */
  const DEMO_DATA = {
    contact_messages: [
      { id: 1, full_name: "Marcus Reed", email: "marcus@example.com", topic: "Enrollment", message: "Interested in the electrical program for my son.", status: "new", created_at: iso(-1) },
      { id: 2, full_name: "Latoya Bennett", email: "latoya@example.com", topic: "Donation", message: "How can our church group support a build day?", status: "new", created_at: iso(-3) },
      { id: 3, full_name: "Dana Cole", email: "dana@example.com", topic: "Media / press", message: "Local reporter — would love to feature the raffle.", status: "read", created_at: iso(-6) },
    ],
    enrollment_applications: [
      { id: 1, full_name: "Jerome Watts", email: "jerome@example.com", phone: "(313) 555-0142", trade: "Carpentry", message: "Available mornings.", status: "new", created_at: iso(-2) },
      { id: 2, full_name: "Priya Nair", email: "priya@example.com", phone: "(313) 555-0177", trade: "HVAC", message: "", status: "review", created_at: iso(-5) },
    ],
    volunteer_signups: [
      { id: 1, full_name: "Tom Alvarez", email: "tom@example.com", interest: "Mentorship", message: "20 yrs as a master plumber.", status: "new", created_at: iso(-1) },
      { id: 2, full_name: "Grace Kim", email: "grace@example.com", interest: "Raffle / event booth", message: "Weekends free.", status: "confirmed", created_at: iso(-4) },
    ],
    partnership_inquiries: [
      { id: 1, organization: "Midtown Supply Co.", full_name: "Ellen Fox", email: "ellen@midtown.example", partnership_type: "Materials & tools", message: "Can donate lumber quarterly.", status: "new", created_at: iso(-2) },
    ],
    newsletter_signups: [
      { id: 1, email: "supporter1@example.com", source_page: "home", status: "subscribed", created_at: iso(-1) },
      { id: 2, email: "supporter2@example.com", source_page: "raffle", status: "subscribed", created_at: iso(-2) },
      { id: 3, email: "supporter3@example.com", source_page: "impact", status: "subscribed", created_at: iso(-8) },
    ],
  };
  const DEMO_RAFFLE = { pot_total: 12480, renovation_raised: 42500, goal: 100000, tickets_sold: 640 };
  const DEMO_PHASES = (window.JOAT.PHASES || []).map((p) => ({ ...p }));
  function iso(daysAgo) { const d = new Date(); d.setDate(d.getDate() + daysAgo); return d.toISOString(); }

  const cache = {};   // collection -> rows

  /* ---- Data access ------------------------------------------------------- */
  async function fetchCollection(name) {
    if (DEMO || !db) return (DEMO_DATA[name] || []).slice();
    try {
      const { data, error } = await db.from(name).select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data || [];
    } catch (e) { console.error(e); toast("Could not load " + name); return []; }
  }
  async function fetchRaffle() {
    if (DEMO || !db) return { ...DEMO_RAFFLE };
    try {
      const { data } = await db.from("raffle_stats").select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle();
      return data || { ...DEMO_RAFFLE };
    } catch (e) { return { ...DEMO_RAFFLE }; }
  }
  async function fetchPhases() {
    if (DEMO || !db) return DEMO_PHASES.map((p) => ({ ...p }));
    try {
      const { data } = await db.from("renovation_phases").select("*").order("n", { ascending: true });
      return (data && data.length) ? data : DEMO_PHASES.map((p) => ({ ...p }));
    } catch (e) { return DEMO_PHASES.map((p) => ({ ...p })); }
  }
  async function updateStatus(name, id, status) {
    const row = (cache[name] || []).find((r) => r.id === id); if (row) row.status = status;
    if (DEMO || !db) { toast("Status updated (demo)"); return; }
    const { error } = await db.from(name).update({ status }).eq("id", id);
    toast(error ? "Update failed" : "Status updated");
  }

  /* ---- Sidebar counts ---------------------------------------------------- */
  async function refreshCounts() {
    for (const name of Object.keys(COLLECTIONS)) {
      const rows = cache[name] || (cache[name] = await fetchCollection(name));
      const el = $(`[data-count-for="${name}"]`);
      if (el) el.textContent = rows.length;
    }
  }

  /* ---- Views ------------------------------------------------------------- */
  const view = $("#view");
  const titles = { dashboard: "Dashboard", raffle: "Raffle & Fundraising", renovation: "Renovation Progress", settings: "Setup & Connection" };

  async function render(name) {
    $$(".side-link").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
    $("#view-title").textContent = titles[name] || (COLLECTIONS[name] && COLLECTIONS[name].label) || "Dashboard";
    if (name === "dashboard") return renderDashboard();
    if (name === "raffle") return renderRaffle();
    if (name === "renovation") return renderRenovation();
    if (name === "settings") return renderSettings();
    if (COLLECTIONS[name]) return renderCollection(name);
  }

  async function renderDashboard() {
    const raffle = await fetchRaffle();
    let totalLeads = 0, recent = [];
    for (const name of Object.keys(COLLECTIONS)) {
      const rows = cache[name] || (cache[name] = await fetchCollection(name));
      totalLeads += rows.length;
      rows.forEach((r) => recent.push({ ...r, _type: COLLECTIONS[name].label, _coll: name }));
    }
    recent.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const weekAgo = Date.now() - 7 * 864e5;
    const newThisWeek = recent.filter((r) => new Date(r.created_at).getTime() > weekAgo).length;
    const pct = Math.min(100, Math.round((raffle.renovation_raised / (raffle.goal || 100000)) * 100));

    view.innerHTML = `
      <div class="view-head"><div><h2 style="margin:0">Welcome back 👋</h2><p>Here's how the mission is tracking today.</p></div></div>
      <div class="kpis">
        ${kpi("Current raffle pot", money(raffle.pot_total), "trophy", '<span class="delta up">Live</span>')}
        ${kpi("Renovation raised", money(raffle.renovation_raised), "home", `<span class="delta up">${pct}% of goal</span>`)}
        ${kpi("Total leads", totalLeads, "users", "")}
        ${kpi("New this week", newThisWeek, "spark", '<span class="delta up">7 days</span>')}
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Fundraising toward $${(raffle.goal || 100000).toLocaleString()} renovation</h3><span class="tag">${pct}%</span></div>
        <div class="panel-body"><div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
          <p class="text-soft" style="margin:.9rem 0 0;font-size:.9rem">${money(raffle.renovation_raised)} raised · ${money((raffle.goal||100000) - raffle.renovation_raised)} to go · ${(raffle.tickets_sold||0).toLocaleString()} tickets sold</p></div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Recent activity</h3><button class="btn btn-ghost btn-sm" data-goto="contact_messages">View all leads</button></div>
        <div class="table-wrap"><table class="data"><thead><tr><th>Type</th><th>Name</th><th>Detail</th><th>When</th></tr></thead><tbody>
          ${recent.slice(0, 8).map((r) => `<tr>
            <td><span class="tag new">${esc(r._type)}</span></td>
            <td>${esc(r.full_name || r.organization || r.email)}</td>
            <td class="muted">${esc((r.message || r.topic || r.interest || r.trade || r.source_page || "").slice(0, 60) || "—")}</td>
            <td class="muted">${fmtDate(r.created_at)}</td></tr>`).join("") || emptyRow(4)}
        </tbody></table></div>
      </div>`;
    $$("[data-goto]").forEach((b) => b.onclick = () => go(b.dataset.goto));
  }

  function kpi(label, value, icon, delta) {
    return `<div class="kpi"><div class="kpi-top"><div class="kpi-ico">${ICONS[icon] || ""}</div>${delta}</div><b>${value}</b><span>${label}</span></div>`;
  }
  function emptyRow(cols) { return `<tr><td colspan="${cols}" class="empty">${ICONS.inbox}<div>No records yet.</div></td></tr>`; }

  async function renderCollection(name) {
    const def = COLLECTIONS[name];
    const rows = cache[name] || (cache[name] = await fetchCollection(name));
    view.innerHTML = `
      <div class="view-head"><div><h2 style="margin:0">${def.label}</h2><p>${rows.length} record${rows.length === 1 ? "" : "s"} · ${DEMO ? "sample data" : "live"}</p></div>
        <div class="toolbar">
          <div class="search">${ICONS.search}<input type="search" id="tbl-search" placeholder="Search ${def.label.toLowerCase()}…"></div>
          <button class="btn btn-ghost btn-sm" id="export-csv">${ICONS.download} Export CSV</button>
        </div>
      </div>
      <div class="panel"><div class="table-wrap"><table class="data"><thead><tr>
        ${def.titles.map((t) => `<th>${t}</th>`).join("")}<th>Status</th><th>Received</th>
      </tr></thead><tbody id="tbl-body">${renderRows(name, rows)}</tbody></table></div></div>`;

    $("#tbl-search").addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase();
      const filtered = rows.filter((r) => Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(q)));
      $("#tbl-body").innerHTML = renderRows(name, filtered);
      bindStatus(name);
    });
    $("#export-csv").addEventListener("click", () => exportCSV(name, rows));
    bindStatus(name);
  }

  function renderRows(name, rows) {
    const def = COLLECTIONS[name];
    if (!rows.length) return emptyRow(def.titles.length + 2);
    return rows.map((r) => `<tr>
      ${def.cols.map((c) => `<td>${c === "email" ? `<a href="mailto:${esc(r[c])}">${esc(r[c] || "—")}</a>` : `<span>${esc(r[c] || "—")}</span>`}</td>`).join("")}
      <td><select class="status-sel" data-id="${r.id}" data-coll="${name}">
        ${["new", "read", "review", "confirmed", "closed"].map((s) => `<option ${((r.status || "new") === s) ? "selected" : ""}>${s}</option>`).join("")}
      </select></td>
      <td class="muted">${fmtDate(r.created_at)}</td></tr>`).join("");
  }
  function bindStatus(name) {
    $$(".status-sel").forEach((sel) => sel.addEventListener("change", () => updateStatus(sel.dataset.coll, castId(sel.dataset.id), sel.value)));
  }
  function castId(v) { return /^\d+$/.test(v) ? Number(v) : v; }

  function exportCSV(name, rows) {
    if (!rows.length) return toast("Nothing to export");
    const keys = Object.keys(rows[0]);
    const csv = [keys.join(",")].concat(rows.map((r) => keys.map((k) => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(","))).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "").replace(/(\d{8})(\d{4})/, "$1_$2");
    a.href = URL.createObjectURL(blob); a.download = `${name}_${stamp}.csv`; a.click();
    URL.revokeObjectURL(a.href); toast("CSV exported");
  }

  async function renderRaffle() {
    const r = await fetchRaffle();
    view.innerHTML = `
      <div class="view-head"><div><h2 style="margin:0">Raffle &amp; Fundraising</h2><p>Update the live figures shown across the public site.</p></div></div>
      <div class="kpis">
        ${kpi("Pot total", money(r.pot_total), "trophy", "")}
        ${kpi("Renovation raised", money(r.renovation_raised), "home", "")}
        ${kpi("Tickets sold", (r.tickets_sold || 0).toLocaleString(), "ticket", "")}
        ${kpi("Goal", money(r.goal || 100000), "target", "")}
      </div>
      <div class="panel"><div class="panel-head"><h3>Edit live figures</h3></div><div class="panel-body">
        <form id="raffle-form">
          <div class="field-row"><div class="field"><label>Current pot total ($)</label><input name="pot_total" type="number" min="0" value="${r.pot_total}"></div>
            <div class="field"><label>Renovation raised ($)</label><input name="renovation_raised" type="number" min="0" value="${r.renovation_raised}"></div></div>
          <div class="field-row"><div class="field"><label>Tickets sold</label><input name="tickets_sold" type="number" min="0" value="${r.tickets_sold || 0}"></div>
            <div class="field"><label>Renovation goal ($)</label><input name="goal" type="number" min="0" value="${r.goal || 100000}"></div></div>
          <button class="btn btn-primary" type="submit">Save figures</button>
        </form>
      </div></div>
      <div class="panel"><div class="panel-head"><h3>Ticket tiers</h3><span class="tag">Configured in config.js</span></div>
        <div class="table-wrap"><table class="data"><thead><tr><th>Price</th><th>Tickets</th><th>Badge</th></tr></thead><tbody>
        ${(window.JOAT.RAFFLE.tiers || []).map((t) => `<tr><td><strong>${money(t.price)}</strong></td><td>${t.tickets}</td><td>${t.badge ? `<span class="tag new">${esc(t.badge)}</span>` : "—"}</td></tr>`).join("")}
        </tbody></table></div></div>`;
    $("#raffle-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = Object.fromEntries([...new FormData(e.target).entries()].map(([k, v]) => [k, Number(v)]));
      payload.updated_at = new Date().toISOString();
      if (DEMO || !db) { Object.assign(DEMO_RAFFLE, payload); toast("Saved (demo)"); return renderRaffle(); }
      const { error } = await db.from("raffle_stats").insert([payload]);
      toast(error ? "Save failed" : "Figures saved — live on site"); renderRaffle();
    });
  }

  async function renderRenovation() {
    const phases = await fetchPhases();
    view.innerHTML = `
      <div class="view-head"><div><h2 style="margin:0">Renovation Progress</h2><p>Update the five-phase milestone tracker shown on the Impact page.</p></div></div>
      <div class="panel"><div class="panel-head"><h3>Milestone phases</h3></div><div class="panel-body" id="phase-list">
        ${phases.map((p) => `<div class="milestone-row">
          <div class="tl-num" style="width:40px;height:40px;font-size:.95rem">${p.n}</div>
          <div><strong>${esc(p.title)}</strong> <span class="text-soft">· ${money(p.cost)}</span><br><span class="muted text-soft" style="font-size:.86rem">${esc(p.detail)}</span></div>
          <select data-n="${p.n}">
            ${["upcoming", "active", "done"].map((s) => `<option value="${s}" ${p.status === s ? "selected" : ""}>${s}</option>`).join("")}
          </select>
        </div>`).join("")}
      </div><div class="panel-head" style="border-top:1px solid var(--border);border-bottom:none"><button class="btn btn-primary btn-sm" id="save-phases">Save milestones</button></div></div>`;
    $("#save-phases").addEventListener("click", async () => {
      const updates = $$("#phase-list select").map((s) => ({ n: Number(s.dataset.n), status: s.value }));
      updates.forEach((u) => { const p = DEMO_PHASES.find((x) => x.n === u.n); if (p) p.status = u.status; });
      if (DEMO || !db) return toast("Milestones saved (demo)");
      for (const u of updates) await db.from("renovation_phases").update({ status: u.status }).eq("n", u.n);
      toast("Milestones saved");
    });
  }

  function renderSettings() {
    const cfg = window.JOAT.SUPABASE || {};
    view.innerHTML = `
      <div class="view-head"><div><h2 style="margin:0">Setup &amp; Connection</h2><p>Connect Supabase to switch from demo data to your live database.</p></div></div>
      <div class="panel"><div class="panel-head"><h3>Connection status</h3><span class="env-badge ${DEMO ? "demo" : "live"}">${DEMO ? "Demo mode" : "Live · connected"}</span></div>
      <div class="panel-body">
        <p class="text-soft">${DEMO
          ? "You're viewing sample data. To go live, add your Supabase project URL and anon key, then create the tables."
          : "Connected to Supabase. The dashboard is reading and writing your live tables."}</p>
        <ol class="text-soft" style="line-height:1.9;padding-left:1.2rem">
          <li>Create a project at <a href="https://supabase.com" target="_blank" rel="noopener">supabase.com</a>.</li>
          <li>Open <strong>Project Settings → API</strong> and copy the <em>Project URL</em> and <em>anon public</em> key.</li>
          <li>Paste them into <code>assets/js/config.js</code> (the <code>SUPABASE</code> object).</li>
          <li>In the Supabase <strong>SQL Editor</strong>, run <code>supabase/schema.sql</code> to create all tables, policies, and an admin account.</li>
          <li>Reload this page and sign in with your admin email + password.</li>
        </ol>
        <div class="stat-edit" style="margin-top:1rem">
          <div class="field" style="margin:0"><label>Project URL (read-only preview)</label><input value="${esc(cfg.url || "")}" readonly></div>
        </div>
        <p class="form-note" style="margin-top:1rem">The <strong>anon</strong> key is safe in the browser — Row Level Security protects your data. Never place the <strong>service_role</strong> key in front-end files.</p>
      </div></div>`;
  }

  /* ---- Router ------------------------------------------------------------ */
  function go(name) { location.hash = name; }
  window.addEventListener("hashchange", () => render(location.hash.slice(1) || "dashboard"));
  $$(".side-link[data-view]").forEach((b) => b.addEventListener("click", () => go(b.dataset.view)));

  /* ---- Mobile sidebar ---------------------------------------------------- */
  const sidebar = $("#sidebar"), scrim = $("#scrim");
  $("#burger").addEventListener("click", () => { sidebar.classList.add("open"); scrim.classList.add("show"); });
  scrim.addEventListener("click", () => { sidebar.classList.remove("open"); scrim.classList.remove("show"); });
  $$(".side-link").forEach((b) => b.addEventListener("click", () => { sidebar.classList.remove("open"); scrim.classList.remove("show"); }));

  /* ---- Auth -------------------------------------------------------------- */
  async function enterApp(email) {
    $("#login").hidden = true; $("#app").hidden = false;
    $("#user-email").textContent = email;
    $("#avatar").textContent = (email || "JA").slice(0, 2).toUpperCase();
    $("#env-badge").className = "env-badge " + (DEMO ? "demo" : "live");
    $("#env-badge").textContent = DEMO ? "Demo mode" : "Live";
    await refreshCounts();
    render(location.hash.slice(1) || "dashboard");
  }

  async function boot() {
    db = window.JOAT.db;
    if (window.JOAT.configured && db) {
      const { data } = await db.auth.getSession();
      if (data && data.session) { DEMO = false; return enterApp(data.session.user.email); }
      // configured but not logged in → show login (real auth)
      $("#demo-enter").closest(".login-demo").hidden = true;
    }
  }
  document.addEventListener("joat:db-ready", boot);
  if (window.JOAT && "configured" in window.JOAT) boot();

  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = $("#login-status");
    const email = $("#li-email").value, password = $("#li-pass").value;
    if (!window.JOAT.configured || !window.JOAT.db) {
      DEMO = true; return enterApp(email || "demo@joatamp.net");
    }
    status.hidden = false; status.className = "form-status info"; status.textContent = "Signing in…";
    const { data, error } = await window.JOAT.db.auth.signInWithPassword({ email, password });
    if (error) { status.className = "form-status err"; status.textContent = error.message; return; }
    DEMO = false; enterApp(data.user.email);
  });
  $("#demo-enter").addEventListener("click", () => { DEMO = true; enterApp("demo@joatamp.net"); });
  $("#signout").addEventListener("click", async () => {
    if (!DEMO && window.JOAT.db) await window.JOAT.db.auth.signOut();
    location.hash = ""; $("#app").hidden = true; $("#login").hidden = false;
  });

  /* ---- Icons ------------------------------------------------------------- */
  const ICONS = {
    trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4a2 2 0 0 1-2-2V5h4M18 9h2a2 2 0 0 0 2-2V5h-4M6 5h12v5a6 6 0 0 1-12 0zM9 20h6M10 16v4M14 16v4"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11 12 4l9 7M5 10v10h14V10"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M19 5l-4 4M9 15l-4 4"/></svg>',
    ticket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4z"/><path d="M13 6v12"/></svg>',
    target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4-4"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2M5.5 5.5 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.5A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.5z"/></svg>',
  };
})();
