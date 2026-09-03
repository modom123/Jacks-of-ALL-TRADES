/* ============================================================================
   Jacks of All Trades — Command Center (Business Hub) Logic
   File: assets/js/admin.js
   Generated: 2026-09-03 16:32 UTC · Expanded 2026-09-03 17:10 UTC

   A nonprofit operations hub: projects, fundraising campaigns, donor CRM,
   outreach, board/team, inbound leads, and three AI agents. Role-based access
   (admin / board / staff). Runs in DEMO mode with sample data until Supabase
   is configured, then authenticates and reads/writes live tables (RLS-guarded).
   ========================================================================== */
(function () {
  "use strict";
  const A = (window.JOAT = window.JOAT || {});
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
  const money = (n) => "$" + Number(n || 0).toLocaleString();
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";
  const toast = (m) => { const t = $("#toast"); t.textContent = m; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2400); };
  const uid = () => "id-" + Math.random().toString(36).slice(2, 10);
  const castId = (v) => (/^\d+$/.test(v) ? Number(v) : v);

  let DEMO = true, db = null, role = "admin";
  const cache = {};

  /* ---- Icons (defined before NAV, which references them) ---------------- */
  function ICO(k) { return ICONS[k] || ""; }
  const ICONS = {
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
    mega: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l15-6v14L3 13zM3 11v2M7 12v5l4 1.5"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>',
    ticket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4z"/><path d="M13 6v12"/></svg>',
    build: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m14 6 4 4M3 21l4-1 11-11-3-3L4 17z"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11 12 4l9 7M5 10v10h14V10"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4zM4 6l8 6 8-6"/></svg>',
    cap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5zM6 12v5c0 1 2.7 3 6 3s6-2 6-3v-5"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    brief: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8M4.6 9a1.6 1.6 0 0 0-.3-1.8M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4-4"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2M5.5 5.5 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.5A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.5z"/></svg>',
  };

  /* =====================================================================
     TABLE DEFINITIONS  (drive tables, forms, CSV, add-record modal)
     ==================================================================== */
  const T = {
    campaigns: {
      label: "Campaigns", singular: "Campaign", kind: "cards",
      form: [
        { k: "name", label: "Campaign name", req: true },
        { k: "type", label: "Type", type: "select", opts: ["annual", "raffle", "grant", "major_gift", "event", "capital"] },
        { k: "goal", label: "Goal ($)", type: "number" },
        { k: "raised", label: "Raised ($)", type: "number" },
        { k: "status", label: "Status", type: "select", opts: ["planning", "active", "paused", "complete"] },
        { k: "end_date", label: "End date", type: "date" },
        { k: "description", label: "Description", type: "textarea" },
      ],
    },
    donors: {
      label: "Donors", singular: "Donor", kind: "table",
      cols: [
        { k: "full_name", label: "Name" }, { k: "type", label: "Type", badge: true },
        { k: "stage", label: "Stage", badge: true }, { k: "total_given", label: "Total given", money: true },
        { k: "last_gift_amount", label: "Last gift", money: true }, { k: "assigned_to", label: "Owner" },
      ],
      status: { field: "stage", opts: ["prospect", "cultivating", "active", "lapsed"] },
      ai: "ada",
      form: [
        { k: "full_name", label: "Name", req: true }, { k: "email", label: "Email", type: "email" },
        { k: "phone", label: "Phone" },
        { k: "type", label: "Type", type: "select", opts: ["individual", "corporate", "foundation", "government"] },
        { k: "stage", label: "Stage", type: "select", opts: ["prospect", "cultivating", "active", "lapsed"] },
        { k: "total_given", label: "Total given ($)", type: "number" },
        { k: "assigned_to", label: "Assigned to" }, { k: "tags", label: "Tags" },
        { k: "notes", label: "Notes", type: "textarea" },
      ],
    },
    outreach: {
      label: "Outreach", singular: "Outreach", kind: "table",
      cols: [
        { k: "donor_name", label: "Donor / prospect" }, { k: "channel", label: "Channel", badge: true },
        { k: "subject", label: "Subject" }, { k: "drafted_by", label: "Drafted by" }, { k: "owner", label: "Owner" },
      ],
      status: { field: "status", opts: ["planned", "sent", "replied", "no_response", "converted"] },
      ai: "ada",
      form: [
        { k: "donor_name", label: "Donor / prospect", req: true },
        { k: "channel", label: "Channel", type: "select", opts: ["email", "call", "meeting", "letter", "event"] },
        { k: "subject", label: "Subject" },
        { k: "status", label: "Status", type: "select", opts: ["planned", "sent", "replied", "no_response", "converted"] },
        { k: "owner", label: "Owner" }, { k: "scheduled_date", label: "Scheduled", type: "date" },
        { k: "body", label: "Message", type: "textarea" },
      ],
    },
    projects: {
      label: "Projects", singular: "Project", kind: "cards",
      form: [
        { k: "name", label: "Project name", req: true },
        { k: "type", label: "Type", type: "select", opts: ["renovation", "program", "event", "community", "grant"] },
        { k: "status", label: "Status", type: "select", opts: ["planning", "active", "on_hold", "complete", "archived"] },
        { k: "location", label: "Location" }, { k: "budget", label: "Budget ($)", type: "number" },
        { k: "spent", label: "Spent ($)", type: "number" }, { k: "progress", label: "Progress (%)", type: "number" },
        { k: "lead_name", label: "Project lead" }, { k: "target_date", label: "Target date", type: "date" },
        { k: "description", label: "Description", type: "textarea" },
      ],
    },
    team_members: {
      label: "Board & Team", singular: "Member", kind: "table",
      cols: [
        { k: "full_name", label: "Name" }, { k: "title", label: "Title" },
        { k: "role", label: "Role", badge: true }, { k: "email", label: "Email" }, { k: "status", label: "Status", badge: true },
      ],
      status: { field: "status", opts: ["active", "invited", "inactive"] },
      form: [
        { k: "full_name", label: "Full name", req: true }, { k: "email", label: "Email", type: "email", req: true },
        { k: "role", label: "Role", type: "select", opts: ["admin", "board", "staff", "volunteer"] },
        { k: "title", label: "Title" }, { k: "phone", label: "Phone" },
        { k: "status", label: "Status", type: "select", opts: ["active", "invited", "inactive"] },
      ],
    },
    // Inbound leads (public forms)
    contact_messages: { label: "Contact Messages", singular: "Message", kind: "table", lead: true,
      cols: [{ k: "full_name", label: "Name" }, { k: "email", label: "Email" }, { k: "topic", label: "Topic" }, { k: "message", label: "Message" }],
      status: { field: "status", opts: ["new", "read", "replied", "closed"] } },
    enrollment_applications: { label: "Enrollment", singular: "Application", kind: "table", lead: true,
      cols: [{ k: "full_name", label: "Name" }, { k: "email", label: "Email" }, { k: "phone", label: "Phone" }, { k: "trade", label: "Trade" }, { k: "message", label: "Notes" }],
      status: { field: "status", opts: ["new", "review", "accepted", "waitlist", "closed"] } },
    volunteer_signups: { label: "Volunteers", singular: "Volunteer", kind: "table", lead: true,
      cols: [{ k: "full_name", label: "Name" }, { k: "email", label: "Email" }, { k: "interest", label: "Interest" }, { k: "message", label: "Notes" }],
      status: { field: "status", opts: ["new", "contacted", "confirmed", "closed"] } },
    partnership_inquiries: { label: "Partnerships", singular: "Inquiry", kind: "table", lead: true,
      cols: [{ k: "organization", label: "Organization" }, { k: "full_name", label: "Contact" }, { k: "email", label: "Email" }, { k: "partnership_type", label: "Type" }, { k: "message", label: "Notes" }],
      status: { field: "status", opts: ["new", "review", "active", "closed"] } },
    newsletter_signups: { label: "Newsletter", singular: "Subscriber", kind: "table", lead: true,
      cols: [{ k: "email", label: "Email" }, { k: "source_page", label: "Source" }],
      status: { field: "status", opts: ["subscribed", "unsubscribed"] } },
  };

  /* =====================================================================
     NAVIGATION  (role-aware)
     ==================================================================== */
  const NAV = [
    { group: "Overview", items: [["dashboard", "Dashboard", ICO("grid")]] },
    { group: "Fundraising", items: [["campaigns", "Campaigns", ICO("mega")], ["donors", "Donors (CRM)", ICO("heart")], ["outreach", "Outreach", ICO("send")], ["raffle", "50/50 Raffle", ICO("ticket")]] },
    { group: "Programs & Projects", items: [["projects", "Projects", ICO("build")], ["renovation", "Renovation Tracker", ICO("home")]] },
    { group: "Inbound Leads", items: [["contact_messages", "Contact", ICO("mail")], ["enrollment_applications", "Enrollment", ICO("cap")], ["volunteer_signups", "Volunteers", ICO("users")], ["partnership_inquiries", "Partnerships", ICO("brief")], ["newsletter_signups", "Newsletter", ICO("mail")]] },
    { group: "Organization", items: [["team", "Board & Team", ICO("users")], ["agents", "AI Agents", ICO("spark")]] },
    { group: "System", items: [["settings", "Setup & Connection", ICO("gear")]] },
  ];
  const ROLE_VIEWS = {
    admin: "*",
    board: ["dashboard", "campaigns", "donors", "outreach", "raffle", "projects", "renovation", "team", "agents"],
    staff: ["dashboard", "campaigns", "donors", "outreach", "raffle", "projects", "renovation", "contact_messages", "enrollment_applications", "volunteer_signups", "partnership_inquiries", "newsletter_signups", "agents"],
  };
  const allowed = (view) => role === "admin" || ROLE_VIEWS[role] === "*" || (ROLE_VIEWS[role] || []).includes(view);

  function buildNav() {
    const nav = $("#side-nav");
    nav.innerHTML = NAV.map((sec) => {
      const items = sec.items.filter(([k]) => allowed(k));
      if (!items.length) return "";
      return `<div class="side-group">${sec.group}</div>` + items.map(([k, label, icon]) =>
        `<button class="side-link" data-view="${k}">${icon}${label}<span class="count" data-count-for="${k}" hidden></span></button>`).join("");
    }).join("");
    nav.querySelectorAll(".side-link[data-view]").forEach((b) => b.addEventListener("click", () => { go(b.dataset.view); closeSidebar(); }));
  }

  /* =====================================================================
     DEMO DATA
     ==================================================================== */
  const iso = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString(); };
  const DEMO_DATA = {
    campaigns: [
      { id: uid(), name: "50/50 Neighborhood Revitalization Raffle", type: "raffle", status: "active", goal: 100000, raised: 42500, description: "Raffle funding a community home renovation.", created_at: iso(-30) },
      { id: uid(), name: "2026 Annual Fund", type: "annual", status: "active", goal: 75000, raised: 18400, description: "General operating support.", created_at: iso(-60) },
      { id: uid(), name: "Tools & Equipment Grant", type: "grant", status: "planning", goal: 40000, raised: 0, description: "Foundation grant to outfit the workshop.", created_at: iso(-14) },
    ],
    projects: [
      { id: uid(), name: "Community Home Renovation — 4BR", type: "renovation", status: "active", location: "Detroit, MI", budget: 100000, spent: 42500, progress: 43, lead_name: "Program Manager", description: "A community project: students restore a vacant home into quality housing.", target_date: iso(120), created_at: iso(-40) },
      { id: uid(), name: "Youth Trades Cohort — Fall", type: "program", status: "active", location: "Detroit, MI", budget: 25000, spent: 8200, progress: 30, lead_name: "Program Manager", description: "Six-trade training cohort with 1:1 mentorship.", target_date: iso(75), created_at: iso(-20) },
      { id: uid(), name: "Adult Apprenticeship Program", type: "program", status: "planning", location: "Detroit, MI", budget: 45000, spent: 0, progress: 5, lead_name: "Executive Director", description: "Paid apprenticeship pathway with partner employers.", target_date: iso(180), created_at: iso(-8) },
    ],
    donors: [
      { id: uid(), full_name: "Midtown Supply Co.", email: "giving@midtown.example", type: "corporate", stage: "active", total_given: 12000, last_gift_amount: 5000, tags: "materials, recurring", assigned_to: "Executive Director", created_at: iso(-90) },
      { id: uid(), full_name: "The Riverside Foundation", email: "grants@riverside.example", type: "foundation", stage: "cultivating", total_given: 0, last_gift_amount: null, tags: "grant, LOI sent", assigned_to: "Executive Director", created_at: iso(-45) },
      { id: uid(), full_name: "Marcus & Dana Reed", email: "reed.family@example.com", type: "individual", stage: "active", total_given: 2500, last_gift_amount: 500, tags: "major gift prospect", assigned_to: "Board Chair", created_at: iso(-120) },
      { id: uid(), full_name: "Great Lakes Credit Union", email: "community@glcu.example", type: "corporate", stage: "prospect", total_given: 0, last_gift_amount: null, tags: "sponsor prospect", assigned_to: "Board Chair", created_at: iso(-15) },
    ],
    outreach: [
      { id: uid(), donor_name: "The Riverside Foundation", channel: "email", status: "planned", subject: "Partnership follow-up — trades workshop grant", drafted_by: "Ada (AI)", owner: "Executive Director", created_at: iso(-3) },
      { id: uid(), donor_name: "Great Lakes Credit Union", channel: "meeting", status: "planned", subject: "Introductory sponsorship conversation", drafted_by: "Board Chair", owner: "Board Chair", created_at: iso(-2) },
    ],
    team_members: [
      { id: uid(), full_name: "Executive Director", email: "director@joatamp.net", role: "admin", title: "Executive Director", status: "active", created_at: iso(-200) },
      { id: uid(), full_name: "Board Chair", email: "chair@joatamp.net", role: "board", title: "Board Chair", status: "active", created_at: iso(-200) },
      { id: uid(), full_name: "Program Manager", email: "programs@joatamp.net", role: "staff", title: "Program Manager", status: "active", created_at: iso(-150) },
      { id: uid(), full_name: "Volunteer Coordinator", email: "volunteer@joatamp.net", role: "staff", title: "Volunteer Coordinator", status: "invited", created_at: iso(-4) },
    ],
    contact_messages: [
      { id: 1, full_name: "Marcus Reed", email: "marcus@example.com", topic: "Enrollment", message: "Interested in the electrical program for my son.", status: "new", created_at: iso(-1) },
      { id: 2, full_name: "Latoya Bennett", email: "latoya@example.com", topic: "Donation", message: "How can our church group support a build day?", status: "new", created_at: iso(-3) },
      { id: 3, full_name: "Dana Cole", email: "dana@example.com", topic: "Media / press", message: "Local reporter — would love to feature the program.", status: "read", created_at: iso(-6) },
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
      { id: 2, email: "supporter2@example.com", source_page: "programs", status: "subscribed", created_at: iso(-2) },
      { id: 3, email: "supporter3@example.com", source_page: "impact", status: "subscribed", created_at: iso(-8) },
    ],
  };
  const DEMO_RAFFLE = { pot_total: 12480, renovation_raised: 42500, goal: 100000, tickets_sold: 640 };
  const DEMO_PHASES = (A.PHASES || []).map((p) => ({ ...p }));

  /* =====================================================================
     DATA ACCESS
     ==================================================================== */
  async function fetchTable(name) {
    if (cache[name]) return cache[name];
    if (DEMO || !db) return (cache[name] = (DEMO_DATA[name] || []).slice());
    try {
      const { data, error } = await db.from(name).select("*").order("created_at", { ascending: false }).limit(1000);
      if (error) throw error;
      return (cache[name] = data || []);
    } catch (e) { console.error(e); toast("Could not load " + name); return (cache[name] = []); }
  }
  async function insertRow(name, row) {
    row.created_at = row.created_at || new Date().toISOString();
    if (DEMO || !db) { row.id = uid(); (cache[name] = cache[name] || []).unshift(row); toast("Saved (demo)"); return row; }
    const { data, error } = await db.from(name).insert([row]).select().maybeSingle();
    if (error) { toast("Save failed: " + error.message); throw error; }
    cache[name] = null; toast("Saved"); return data;
  }
  async function updateField(name, id, patch) {
    const row = (cache[name] || []).find((r) => String(r.id) === String(id)); if (row) Object.assign(row, patch);
    if (DEMO || !db) { toast("Updated (demo)"); return; }
    const { error } = await db.from(name).update(patch).eq("id", id);
    toast(error ? "Update failed" : "Updated");
  }
  async function fetchRaffle() {
    if (DEMO || !db) return { ...DEMO_RAFFLE };
    try { const { data } = await db.from("raffle_stats").select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle(); return data || { ...DEMO_RAFFLE }; }
    catch { return { ...DEMO_RAFFLE }; }
  }
  async function fetchPhases() {
    if (DEMO || !db) return DEMO_PHASES.map((p) => ({ ...p }));
    try { const { data } = await db.from("renovation_phases").select("*").order("n"); return (data && data.length) ? data : DEMO_PHASES.map((p) => ({ ...p })); }
    catch { return DEMO_PHASES.map((p) => ({ ...p })); }
  }

  async function refreshCounts() {
    for (const name of ["contact_messages", "enrollment_applications", "volunteer_signups", "partnership_inquiries", "newsletter_signups", "donors", "outreach"]) {
      const el = $(`[data-count-for="${name}"]`); if (!el) continue;
      const rows = await fetchTable(name); el.textContent = rows.length; el.hidden = rows.length === 0;
    }
  }

  /* =====================================================================
     ROUTER
     ==================================================================== */
  const view = $("#view");
  function go(name) { location.hash = name; }
  window.addEventListener("hashchange", () => route());

  /* ---- Plugin system ---------------------------------------------------- */
  // Plugins register via JOAT.registerPlugin({...}) and are merged once, at
  // sign-in, so they can extend nav, tables, demo data, roles, and views.
  A.plugins = A.plugins || [];
  A.registerPlugin = (p) => { if (p && p.id && !A.plugins.some((x) => x.id === p.id)) A.plugins.push(p); };
  const pluginViews = {};
  let pluginsReady = false;
  function initPlugins() {
    if (pluginsReady) return; pluginsReady = true;
    (A.plugins || []).forEach((p) => {
      try {
        if (p.tables) Object.assign(T, p.tables);
        if (p.demo) Object.assign(DEMO_DATA, p.demo);
        if (p.views) Object.assign(pluginViews, p.views);
        if (p.titles) Object.assign(VIEW_TITLES, p.titles);
        if (p.roles) for (const r in p.roles) { if (Array.isArray(ROLE_VIEWS[r])) ROLE_VIEWS[r].push(...p.roles[r]); }
        if (p.nav) { const i = NAV.findIndex((s) => s.group === "System"); NAV.splice(i < 0 ? NAV.length : i, 0, ...p.nav); }
      } catch (e) { console.error("[plugin]", p && p.id, e); }
    });
  }

  function route() {
    let name = (location.hash.slice(1).split("#")[0]) || "dashboard";
    if (!allowed(name)) name = "dashboard";
    $$(".side-link[data-view]").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
    $("#view-title").textContent = VIEW_TITLES[name] || (T[name] && T[name].label) || "Dashboard";
    if (name === "dashboard") return renderDashboard();
    if (name === "raffle") return renderRaffle();
    if (name === "renovation") return renderRenovation();
    if (name === "agents") return renderAgents();
    if (name === "settings") return renderSettings();
    if (name === "team") return renderTable("team_members");
    if (pluginViews[name]) return pluginViews[name](A.hub);
    if (T[name]) return T[name].kind === "cards" ? renderCards(name) : renderTable(name);
    renderDashboard();
  }
  const VIEW_TITLES = { dashboard: "Dashboard", raffle: "50/50 Raffle", renovation: "Renovation Tracker", agents: "AI Agents", settings: "Setup & Connection", team: "Board & Team" };

  /* =====================================================================
     DASHBOARD
     ==================================================================== */
  async function renderDashboard() {
    const [raffle, campaigns, projects, donors] = await Promise.all([fetchRaffle(), fetchTable("campaigns"), fetchTable("projects"), fetchTable("donors")]);
    const totalRaised = campaigns.reduce((s, c) => s + Number(c.raised || 0), 0);
    const totalGoal = campaigns.reduce((s, c) => s + Number(c.goal || 0), 0);
    const activeProjects = projects.filter((p) => p.status === "active").length;
    let leads = 0, recent = [];
    for (const n of ["contact_messages", "enrollment_applications", "volunteer_signups", "partnership_inquiries", "newsletter_signups"]) {
      const rows = await fetchTable(n); leads += rows.length;
      rows.forEach((r) => recent.push({ t: T[n].label, name: r.full_name || r.organization || r.email, detail: r.message || r.topic || r.interest || r.trade || r.source_page || "", when: r.created_at }));
    }
    recent.sort((a, b) => new Date(b.when) - new Date(a.when));
    const pct = totalGoal ? Math.round((totalRaised / totalGoal) * 100) : 0;

    view.innerHTML = `
      <div class="view-head"><div><h2 style="margin:0">Welcome back 👋</h2><p>How Jacks of All Trades is tracking today.</p></div></div>
      <div class="kpis">
        ${kpi("Raised across campaigns", money(totalRaised), "mega", `<span class="delta up">${pct}% of $${(totalGoal/1000).toFixed(0)}K</span>`)}
        ${kpi("Active projects", activeProjects, "build", "")}
        ${kpi("Donors in CRM", donors.length, "heart", "")}
        ${kpi("Inbound leads", leads, "users", "")}
      </div>
      <div class="dash-2">
        <div class="panel"><div class="panel-head"><h3>Fundraising by campaign</h3><button class="btn btn-ghost btn-sm" data-goto="campaigns">Manage</button></div>
          <div class="panel-body">${campaigns.map((c) => campaignBar(c)).join("") || '<p class="text-soft">No campaigns yet.</p>'}</div></div>
        <div class="panel"><div class="panel-head"><h3>Ask an AI agent</h3></div>
          <div class="panel-body agent-quick">
            ${(A.agents ? A.agents.list : []).map((ag) => `<button class="agent-mini" data-agent="${ag.key}"><span class="agent-dot" style="background:${ag.accent}"></span><b>${ag.name}</b><span>${ag.title}</span></button>`).join("")}
          </div></div>
      </div>
      <div id="plugin-dash-slot"></div>
      <div class="panel"><div class="panel-head"><h3>Recent activity</h3></div>
        <div class="table-wrap"><table class="data"><thead><tr><th>Type</th><th>Name</th><th>Detail</th><th>When</th></tr></thead><tbody>
        ${recent.slice(0, 8).map((r) => `<tr><td><span class="tag new">${esc(r.t)}</span></td><td>${esc(r.name)}</td><td class="muted">${esc((r.detail || "").slice(0, 60) || "—")}</td><td class="muted">${fmtDate(r.when)}</td></tr>`).join("") || emptyRow(4)}
        </tbody></table></div></div>`;
    $$("[data-goto]").forEach((b) => b.onclick = () => go(b.dataset.goto));
    $$(".agent-mini").forEach((b) => b.onclick = () => go("agents#" + b.dataset.agent));
    const slot = view.querySelector("#plugin-dash-slot");
    if (slot) for (const p of (A.plugins || [])) { if (p.dashboardMount) { try { await p.dashboardMount(slot, A.hub); } catch (e) { console.error(e); } } }
  }
  const campaignBar = (c) => { const pct = c.goal ? Math.min(100, Math.round((c.raised / c.goal) * 100)) : 0;
    return `<div class="cbar"><div class="cbar-top"><span><b>${esc(c.name)}</b> <span class="tag">${esc(c.type)}</span></span><span class="text-soft">${money(c.raised)} / ${money(c.goal)}</span></div><div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div></div>`; };

  /* =====================================================================
     GENERIC CARDS  (campaigns, projects)
     ==================================================================== */
  async function renderCards(name) {
    const def = T[name], rows = await fetchTable(name);
    view.innerHTML = `
      <div class="view-head"><div><h2 style="margin:0">${def.label}</h2><p>${rows.length} ${rows.length === 1 ? def.singular.toLowerCase() : def.label.toLowerCase()} · ${DEMO ? "sample data" : "live"}</p></div>
        <div class="toolbar"><button class="btn btn-primary btn-sm" id="add-btn">${ICO("plus")} New ${def.singular}</button></div></div>
      <div class="card-grid">${rows.map((r) => name === "projects" ? projectCard(r) : campaignCard(r)).join("") || emptyPanel(def)}</div>`;
    $("#add-btn").onclick = () => openModal(name);
  }
  function campaignCard(c) {
    const pct = c.goal ? Math.min(100, Math.round((c.raised / c.goal) * 100)) : 0;
    return `<div class="ncard"><div class="ncard-top"><span class="tag ${statusClass(c.status)}">${esc(c.status)}</span><span class="tag">${esc(c.type)}</span></div>
      <h4>${esc(c.name)}</h4><p class="text-soft">${esc(c.description || "")}</p>
      <div class="progress-bar" style="margin:.7rem 0 .5rem"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="ncard-foot"><b>${money(c.raised)}</b> <span class="text-soft">of ${money(c.goal)} · ${pct}%</span></div></div>`;
  }
  function projectCard(p) {
    return `<div class="ncard"><div class="ncard-top"><span class="tag ${statusClass(p.status)}">${esc((p.status || "").replace("_", " "))}</span><span class="tag">${esc(p.type)}</span></div>
      <h4>${esc(p.name)}</h4><p class="text-soft">${esc(p.description || "")}</p>
      <div class="progress-bar" style="margin:.7rem 0 .5rem"><div class="progress-fill" style="width:${Number(p.progress) || 0}%"></div></div>
      <div class="ncard-foot"><span>${Number(p.progress) || 0}% complete</span><span class="text-soft">${money(p.spent)} / ${money(p.budget)}</span></div>
      <div class="ncard-meta text-soft">${p.location ? esc(p.location) + " · " : ""}${p.lead_name ? "Lead: " + esc(p.lead_name) : ""}${p.target_date ? " · Target " + fmtDate(p.target_date) : ""}</div></div>`;
  }

  /* =====================================================================
     GENERIC TABLE  (donors, outreach, team, leads)
     ==================================================================== */
  async function renderTable(name) {
    const def = T[name], rows = await fetchTable(name);
    const addable = !def.lead; // inbound leads are created by the public site
    view.innerHTML = `
      <div class="view-head"><div><h2 style="margin:0">${def.label}</h2><p>${rows.length} record${rows.length === 1 ? "" : "s"} · ${DEMO ? "sample data" : "live"}</p></div>
        <div class="toolbar">
          <div class="search">${ICO("search")}<input type="search" id="tbl-search" placeholder="Search…"></div>
          ${def.ai ? `<span class="text-soft" style="font-size:.82rem">AI: ${def.ai === "ada" ? "Ada" : def.ai}</span>` : ""}
          <button class="btn btn-ghost btn-sm" id="export-csv">${ICO("download")} CSV</button>
          ${addable ? `<button class="btn btn-primary btn-sm" id="add-btn">${ICO("plus")} New ${def.singular}</button>` : ""}
        </div></div>
      <div class="panel"><div class="table-wrap"><table class="data"><thead><tr>
        ${def.cols.map((c) => `<th>${c.label}</th>`).join("")}${def.status ? "<th>Status</th>" : ""}${def.ai ? "<th></th>" : ""}<th>Added</th>
      </tr></thead><tbody id="tbl-body">${tableRows(name, rows)}</tbody></table></div></div>`;
    if (addable) $("#add-btn").onclick = () => openModal(name);
    $("#export-csv").onclick = () => exportCSV(name, rows);
    $("#tbl-search").addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase();
      $("#tbl-body").innerHTML = tableRows(name, rows.filter((r) => Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(q))));
      bindRowActions(name);
    });
    bindRowActions(name);
  }
  function tableRows(name, rows) {
    const def = T[name];
    const span = def.cols.length + (def.status ? 1 : 0) + (def.ai ? 1 : 0) + 1;
    if (!rows.length) return emptyRow(span);
    return rows.map((r) => `<tr>
      ${def.cols.map((c) => `<td>${cell(r, c)}</td>`).join("")}
      ${def.status ? `<td><select class="row-status" data-id="${r.id}" data-field="${def.status.field}">${def.status.opts.map((o) => `<option ${((r[def.status.field] || def.status.opts[0]) === o) ? "selected" : ""}>${o}</option>`).join("")}</select></td>` : ""}
      ${def.ai ? `<td><button class="btn btn-ghost btn-xs ai-draft" data-id="${r.id}">${ICO("spark")} Draft</button></td>` : ""}
      <td class="muted">${fmtDate(r.created_at)}</td></tr>`).join("");
  }
  function cell(r, c) {
    let v = r[c.k];
    if (c.money) return v == null || v === "" ? '<span class="muted">—</span>' : "<b>" + money(v) + "</b>";
    if (c.k === "email") return v ? `<a href="mailto:${esc(v)}">${esc(v)}</a>` : '<span class="muted">—</span>';
    if (c.badge) return v ? `<span class="tag ${statusClass(v)}">${esc(String(v).replace("_", " "))}</span>` : '<span class="muted">—</span>';
    return v ? `<span>${esc(String(v).slice(0, 90))}</span>` : '<span class="muted">—</span>';
  }
  function bindRowActions(name) {
    $$(".row-status").forEach((s) => s.onchange = () => updateField(name, castId(s.dataset.id), { [s.dataset.field]: s.value }));
    $$(".ai-draft").forEach((b) => b.onclick = async () => {
      const row = (cache[name] || []).find((r) => String(r.id) === String(b.dataset.id));
      const who = row.full_name || row.donor_name || "this donor";
      go("agents#" + (T[name].ai || "ada"));
      setTimeout(() => window.dispatchEvent(new CustomEvent("joat:agent-prompt", { detail: { agent: T[name].ai || "ada", text: `Draft outreach to ${who}${row.tags ? " (" + row.tags + ")" : ""}. Recommend an approach and an ask.` } })), 350);
    });
  }

  /* =====================================================================
     ADD-RECORD MODAL
     ==================================================================== */
  function openModal(name) {
    const def = T[name]; const wrap = $("#modal");
    $("#modal-title").textContent = "New " + def.singular;
    $("#modal-fields").innerHTML = def.form.map((f) => {
      const id = "m-" + f.k;
      if (f.type === "textarea") return field(f, `<textarea id="${id}" name="${f.k}"></textarea>`);
      if (f.type === "select") return field(f, `<select id="${id}" name="${f.k}">${f.opts.map((o) => `<option>${o}</option>`).join("")}</select>`);
      return field(f, `<input id="${id}" name="${f.k}" type="${f.type || "text"}" ${f.req ? "required" : ""}>`);
    }).join("");
    wrap.hidden = false;
    $("#modal-form").onsubmit = async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      def.form.forEach((f) => { if (f.type === "number" && data[f.k] !== "") data[f.k] = Number(data[f.k]); if (data[f.k] === "") delete data[f.k]; });
      await insertRow(name, data);
      wrap.hidden = true;
      route();
    };
  }
  const field = (f, inner) => `<div class="field"><label for="m-${f.k}">${f.label}${f.req ? " *" : ""}</label>${inner}</div>`;
  $("#modal-close").onclick = $("#modal-cancel").onclick = () => ($("#modal").hidden = true);
  $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") $("#modal").hidden = true; });

  /* =====================================================================
     RAFFLE / RENOVATION  (existing modules)
     ==================================================================== */
  async function renderRaffle() {
    const r = await fetchRaffle();
    view.innerHTML = `
      <div class="view-head"><div><h2 style="margin:0">50/50 Raffle</h2><p>A community-project fundraiser. Update the live figures shown on the site.</p></div></div>
      <div class="kpis">${kpi("Pot total", money(r.pot_total), "ticket", "")}${kpi("Renovation raised", money(r.renovation_raised), "home", "")}${kpi("Tickets sold", (r.tickets_sold || 0).toLocaleString(), "mega", "")}${kpi("Goal", money(r.goal || 100000), "target", "")}</div>
      <div class="panel"><div class="panel-head"><h3>Edit live figures</h3></div><div class="panel-body">
        <form id="raffle-form"><div class="field-row"><div class="field"><label>Pot total ($)</label><input name="pot_total" type="number" value="${r.pot_total}"></div><div class="field"><label>Renovation raised ($)</label><input name="renovation_raised" type="number" value="${r.renovation_raised}"></div></div>
        <div class="field-row"><div class="field"><label>Tickets sold</label><input name="tickets_sold" type="number" value="${r.tickets_sold || 0}"></div><div class="field"><label>Goal ($)</label><input name="goal" type="number" value="${r.goal || 100000}"></div></div>
        <button class="btn btn-primary" type="submit">Save figures</button></form></div></div>`;
    $("#raffle-form").onsubmit = async (e) => {
      e.preventDefault();
      const p = Object.fromEntries([...new FormData(e.target).entries()].map(([k, v]) => [k, Number(v)])); p.updated_at = new Date().toISOString();
      if (DEMO || !db) { Object.assign(DEMO_RAFFLE, p); toast("Saved (demo)"); return renderRaffle(); }
      const { error } = await db.from("raffle_stats").insert([p]); toast(error ? "Save failed" : "Saved — live on site"); renderRaffle();
    };
  }
  async function renderRenovation() {
    const phases = await fetchPhases();
    view.innerHTML = `
      <div class="view-head"><div><h2 style="margin:0">Renovation Tracker</h2><p>Milestone tracker for the community home-renovation project.</p></div></div>
      <div class="panel"><div class="panel-head"><h3>Milestone phases</h3></div><div class="panel-body" id="phase-list">
        ${phases.map((p) => `<div class="milestone-row"><div class="tl-num" style="width:40px;height:40px;font-size:.95rem">${p.n}</div>
          <div><strong>${esc(p.title)}</strong> <span class="text-soft">· ${money(p.cost)}</span><br><span class="muted text-soft" style="font-size:.86rem">${esc(p.detail)}</span></div>
          <select data-n="${p.n}">${["upcoming", "active", "done"].map((s) => `<option value="${s}" ${p.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></div>`).join("")}
      </div><div class="panel-head" style="border-top:1px solid var(--border);border-bottom:none"><button class="btn btn-primary btn-sm" id="save-phases">Save milestones</button></div></div>`;
    $("#save-phases").onclick = async () => {
      const ups = $$("#phase-list select").map((s) => ({ n: Number(s.dataset.n), status: s.value }));
      ups.forEach((u) => { const p = DEMO_PHASES.find((x) => x.n === u.n); if (p) p.status = u.status; });
      if (DEMO || !db) return toast("Saved (demo)");
      for (const u of ups) await db.from("renovation_phases").update({ status: u.status }).eq("n", u.n); toast("Saved");
    };
  }

  /* =====================================================================
     AI AGENTS CONSOLE
     ==================================================================== */
  const convos = {}; // agentKey -> [{role, content}]
  let activeAgent = "ada";
  async function renderAgents() {
    const hashAgent = (location.hash.split("#")[2]) || (location.hash.includes("#agents#") ? location.hash.split("#").pop() : null);
    if (hashAgent && A.agents.get(hashAgent)) activeAgent = hashAgent;
    const list = A.agents ? A.agents.list : [];
    view.innerHTML = `
      <div class="view-head"><div><h2 style="margin:0">AI Agents</h2><p>Three assistants that help run Jacks of All Trades. ${DEMO ? "Simulated until the <code>ai-agent</code> function is deployed." : "Live via Claude."}</p></div></div>
      <div class="agents-grid">${list.map((a) => `<button class="agent-card ${a.key === activeAgent ? "on" : ""}" data-agent="${a.key}">
        <span class="agent-badge" style="background:${a.accent}">${a.name[0]}</span>
        <b>${a.name}</b><span class="agent-role">${a.title}</span><span class="agent-focus">${a.focus}</span><p>${a.blurb}</p></button>`).join("")}</div>
      <div class="panel chat-panel"><div class="panel-head"><h3 id="chat-title"></h3><button class="btn btn-ghost btn-xs" id="chat-clear">Clear</button></div>
        <div class="chat-log" id="chat-log"></div>
        <div class="chat-starters" id="chat-starters"></div>
        <form class="chat-input" id="chat-form"><textarea id="chat-text" rows="1" placeholder="Message the agent…"></textarea><button class="btn btn-primary" type="submit" id="chat-send">${ICO("send")}</button></form>
      </div>`;
    $$(".agent-card").forEach((b) => b.onclick = () => { activeAgent = b.dataset.agent; renderAgents(); });
    mountChat();
  }
  function mountChat() {
    const a = A.agents.get(activeAgent);
    $("#chat-title").innerHTML = `<span class="agent-dot" style="background:${a.accent}"></span> ${a.name} — ${a.title}`;
    const starters = $("#chat-starters");
    starters.innerHTML = a.starters.map((s) => `<button class="starter" type="button">${esc(s)}</button>`).join("");
    starters.querySelectorAll(".starter").forEach((b) => b.onclick = () => submitChat(b.textContent));
    renderLog();
    $("#chat-clear").onclick = () => { convos[activeAgent] = []; renderLog(); };
    const form = $("#chat-form"), ta = $("#chat-text");
    ta.addEventListener("input", () => { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 160) + "px"; });
    ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
    form.onsubmit = (e) => { e.preventDefault(); const v = ta.value.trim(); if (v) { ta.value = ""; ta.style.height = "auto"; submitChat(v); } };
  }
  function renderLog() {
    const log = $("#chat-log"), msgs = convos[activeAgent] || [];
    const a = A.agents.get(activeAgent);
    if (!msgs.length) { log.innerHTML = `<div class="chat-empty">${ICO("spark")}<p>Ask ${a.name} anything about ${a.focus.toLowerCase()} — or pick a starter below.</p></div>`; return; }
    log.innerHTML = msgs.map((m) => `<div class="msg ${m.role}">${m.role === "assistant" ? `<span class="msg-who" style="color:${a.accent}">${a.name}</span>` : ""}<div class="msg-body">${m.role === "assistant" ? mdLite(m.content) : esc(m.content)}</div></div>`).join("");
    log.scrollTop = log.scrollHeight;
  }
  async function submitChat(text) {
    const msgs = (convos[activeAgent] = convos[activeAgent] || []);
    msgs.push({ role: "user", content: text }); renderLog();
    const log = $("#chat-log");
    const typing = document.createElement("div"); typing.className = "msg assistant"; typing.innerHTML = `<div class="msg-body typing"><span></span><span></span><span></span></div>`;
    log.appendChild(typing); log.scrollTop = log.scrollHeight;
    if (DEMO || !db) await logAgent(activeAgent, "user", text);
    const res = await A.agents.send(activeAgent, msgs, await contextSummary());
    typing.remove();
    msgs.push({ role: "assistant", content: res.text }); renderLog();
    if (!DEMO && db) { logAgent(activeAgent, "user", text); logAgent(activeAgent, "assistant", res.text); }
  }
  async function logAgent(agent_key, role_, content) {
    if (DEMO || !db) return;
    try { await db.from("agent_messages").insert([{ agent_key, role: role_, content, user_email: $("#user-email").textContent }]); } catch {}
  }
  window.addEventListener("joat:agent-prompt", (e) => { activeAgent = e.detail.agent; if (location.hash.slice(1).startsWith("agents")) { renderAgents(); setTimeout(() => submitChat(e.detail.text), 150); } });

  async function contextSummary() {
    const [campaigns, projects, donors] = await Promise.all([fetchTable("campaigns"), fetchTable("projects"), fetchTable("donors")]);
    const lines = ["ORGANIZATION: Jacks of All Trades Community Development (Detroit nonprofit — skilled-trades training, apprenticeship & mentorship, community development)."];
    lines.push("\nCAMPAIGNS:"); campaigns.forEach((c) => lines.push(`- ${c.name} (${c.type}, ${c.status}): ${money(c.raised)} of ${money(c.goal)}`));
    lines.push("\nPROJECTS:"); projects.forEach((p) => lines.push(`- ${p.name} (${p.type}, ${p.status}, ${p.progress}%): ${money(p.spent)} of ${money(p.budget)}`));
    lines.push("\nDONORS:"); donors.slice(0, 12).forEach((d) => lines.push(`- ${d.full_name} (${d.type}, ${d.stage}): given ${money(d.total_given)}${d.tags ? ", tags: " + d.tags : ""}`));
    return lines.join("\n");
  }

  /* =====================================================================
     SETTINGS
     ==================================================================== */
  function renderSettings() {
    const cfg = A.SUPABASE || {};
    view.innerHTML = `
      <div class="view-head"><div><h2 style="margin:0">Setup &amp; Connection</h2><p>Connect Supabase and the AI backend to go live.</p></div></div>
      <div class="panel"><div class="panel-head"><h3>Database connection</h3><span class="env-badge ${DEMO ? "demo" : "live"}">${DEMO ? "Demo mode" : "Live · connected"}</span></div><div class="panel-body">
        <ol class="text-soft" style="line-height:1.9;padding-left:1.2rem">
          <li>Create a project at <a href="https://supabase.com" target="_blank" rel="noopener">supabase.com</a>.</li>
          <li>Paste your Project URL + anon key into <code>assets/js/config.js</code>.</li>
          <li>Run <code>supabase/schema.sql</code>, then <code>schema_hub_2026-09-03_1710.sql</code>, then <code>schema_finance_2026-09-03_1740.sql</code> in the SQL Editor.</li>
          <li>Create an admin user in <strong>Authentication → Users</strong>, then reload and sign in.</li>
        </ol>
        <div class="field" style="max-width:520px"><label>Project URL</label><input value="${esc(cfg.url || "")}" readonly></div></div></div>
      <div class="panel"><div class="panel-head"><h3>AI agents backend</h3><span class="env-badge ${DEMO ? "demo" : "live"}">${DEMO ? "Simulated" : "Ready"}</span></div><div class="panel-body">
        <p class="text-soft">Agents call a Supabase Edge Function so your Anthropic key stays server-side.</p>
        <ol class="text-soft" style="line-height:1.9;padding-left:1.2rem">
          <li><code>supabase secrets set ANTHROPIC_API_KEY=sk-ant-...</code></li>
          <li><code>supabase functions deploy ai-agent</code> (code in <code>supabase/functions/ai-agent</code>)</li>
          <li>Default model <code>claude-opus-5</code> — override with <code>ANTHROPIC_MODEL</code>.</li>
        </ol>
        <p class="form-note">Until deployed, agents produce useful simulated drafts so you can trial the workflow.</p></div></div>`;
  }

  /* =====================================================================
     SHARED RENDER HELPERS
     ==================================================================== */
  function kpi(label, value, icon, delta) { return `<div class="kpi"><div class="kpi-top"><div class="kpi-ico">${ICO(icon)}</div>${delta}</div><b>${value}</b><span>${label}</span></div>`; }
  const emptyRow = (n) => `<tr><td colspan="${n}" class="empty">${ICO("inbox")}<div>No records yet.</div></td></tr>`;
  const emptyPanel = (def) => `<div class="empty" style="grid-column:1/-1;background:#fff;border:1px solid var(--border);border-radius:var(--r-lg)">${ICO("inbox")}<div>No ${def.label.toLowerCase()} yet. Click “New ${def.singular}”.</div></div>`;
  function statusClass(s) { s = String(s || "").toLowerCase();
    if (["done", "active", "converted", "accepted", "subscribed", "complete", "replied", "confirmed", "paid", "cleared", "income", "yes"].includes(s)) return "done";
    if (["new", "planned", "prospect", "planning", "todo", "open", "pending"].includes(s)) return "new";
    if (["on_hold", "paused", "lapsed", "no_response", "waitlist", "review", "cultivating", "invited", "doing", "overdue", "restricted"].includes(s)) return "active";
    return ""; }
  function exportCSV(name, rows) {
    if (!rows.length) return toast("Nothing to export");
    const keys = Object.keys(rows[0]);
    const csv = [keys.join(",")].concat(rows.map((r) => keys.map((k) => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(","))).join("\n");
    const a = document.createElement("a"); const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "").replace(/(\d{8})(\d{4})/, "$1_$2");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `${name}_${stamp}.csv`; a.click(); URL.revokeObjectURL(a.href); toast("CSV exported");
  }
  // Minimal, safe markdown for agent responses
  function mdLite(src) {
    const lines = esc(src).split("\n"); let html = "", inUl = false, inTable = false;
    const inline = (s) => s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`(.+?)`/g, "<code>$1</code>").replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>').replace(/_(.+?)_/g, "<em>$1</em>");
    const closeUl = () => { if (inUl) { html += "</ul>"; inUl = false; } };
    const closeTable = () => { if (inTable) { html += "</tbody></table></div>"; inTable = false; } };
    for (let raw of lines) {
      const line = raw.trim();
      if (/^\|(.+)\|$/.test(line)) {
        const cells = line.slice(1, -1).split("|").map((c) => c.trim());
        if (/^[-:\s|]+$/.test(line.replace(/\|/g, ""))) continue;
        if (!inTable) { closeUl(); html += '<div class="tbl-wrap"><table class="mini"><tbody>'; inTable = true; }
        html += "<tr>" + cells.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>"; continue;
      } else closeTable();
      if (/^#{1,4}\s/.test(line)) { closeUl(); html += `<h5 class="msg-h">${inline(line.replace(/^#+\s/, ""))}</h5>`; }
      else if (/^[-*]\s/.test(line)) { if (!inUl) { html += "<ul>"; inUl = true; } html += `<li>${inline(line.replace(/^[-*]\s/, ""))}</li>`; }
      else if (!line) { closeUl(); }
      else { closeUl(); html += `<p>${inline(line)}</p>`; }
    }
    closeUl(); closeTable(); return html;
  }

  /* =====================================================================
     HUB API  (surface exposed to plugins)
     ==================================================================== */
  A.hub = {
    el: () => view,
    esc, money, fmtDate, toast, ICO, statusClass, uid, castId,
    fetchTable, insertRow, updateField, exportCSV, openModal,
    tableRows, bindRowActions, kpi, emptyRow,
    isDemo: () => DEMO, db: () => db, go, route,
    T, cache,
  };

  /* =====================================================================
     AUTH / BOOT / SIDEBAR
     ==================================================================== */
  const sidebar = $("#sidebar"), scrim = $("#scrim");
  function closeSidebar() { sidebar.classList.remove("open"); scrim.classList.remove("show"); }
  $("#burger").onclick = () => { sidebar.classList.add("open"); scrim.classList.add("show"); };
  scrim.onclick = closeSidebar;
  $("#role-select").onchange = (e) => { role = e.target.value; buildNav(); refreshCounts(); route(); };

  async function enterApp(email) {
    $("#login").hidden = true; $("#app").hidden = false;
    $("#user-email").textContent = email; $("#avatar").textContent = (email || "JA").slice(0, 2).toUpperCase();
    $("#env-badge").className = "env-badge " + (DEMO ? "demo" : "live"); $("#env-badge").textContent = DEMO ? "Demo mode" : "Live";
    $("#role-switch").style.display = DEMO ? "" : "none"; // live role comes from team_members
    if (!DEMO) { role = await resolveRole(email); }
    initPlugins(); buildNav(); await refreshCounts(); route();
  }
  async function resolveRole(email) {
    try { const { data } = await db.from("team_members").select("role").eq("email", email).maybeSingle(); return (data && data.role) || "admin"; }
    catch { return "admin"; }
  }
  async function boot() {
    db = A.db;
    if (A.configured && db) {
      const { data } = await db.auth.getSession();
      if (data && data.session) { DEMO = false; return enterApp(data.session.user.email); }
      const ld = $(".login-demo"); if (ld) ld.hidden = true;
    }
  }
  document.addEventListener("joat:db-ready", boot);
  if (A && "configured" in A) boot();

  $("#login-form").onsubmit = async (e) => {
    e.preventDefault();
    const st = $("#login-status"), email = $("#li-email").value, password = $("#li-pass").value;
    if (!A.configured || !A.db) { DEMO = true; return enterApp(email || "demo@joatamp.net"); }
    st.hidden = false; st.className = "form-status info"; st.textContent = "Signing in…";
    const { data, error } = await A.db.auth.signInWithPassword({ email, password });
    if (error) { st.className = "form-status err"; st.textContent = error.message; return; }
    DEMO = false; enterApp(data.user.email);
  };
  $("#demo-enter").onclick = () => { DEMO = true; enterApp("demo@joatamp.net"); };
  $("#signout").onclick = async () => { if (!DEMO && A.db) await A.db.auth.signOut(); location.hash = ""; $("#app").hidden = true; $("#login").hidden = false; };

})();
