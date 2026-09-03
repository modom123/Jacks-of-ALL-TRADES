/* ============================================================================
   Jacks of All Trades — Finance Plugin for the Command Center
   File: assets/js/finance.plugin.js
   Generated: 2026-09-03 17:40 UTC

   A pluggable nonprofit accounting module. Registers itself with the Command
   Center (JOAT.registerPlugin) and adds a "Finances" section: general ledger,
   bills & vendors (A/P), contractors (1099), budgets vs. actual, and a
   nonprofit Statement of Activities — with fund + program tracking.

   To disable, simply remove the <script src=".../finance.plugin.js"> tag.
   ========================================================================== */
(function () {
  "use strict";
  const A = (window.JOAT = window.JOAT || {});
  if (!A.registerPlugin) { console.warn("[finance] Command Center core not loaded"); return; }

  /* ---- Nonprofit chart of accounts -------------------------------------- */
  const INCOME_CATS = ["Individual Donations", "Grants", "Corporate Sponsorship", "Program Fees / Tuition", "Raffle & Events", "In-Kind Contributions", "Investment / Interest", "Other Income"];
  const EXPENSE_CATS = ["Salaries & Wages", "Contractor / Trades Labor", "Materials & Supplies", "Tools & Equipment", "Property & Renovation", "Training & Certification", "Rent & Utilities", "Insurance", "Fundraising Costs", "Office & Admin", "Professional Fees", "Travel & Vehicle", "Other Expense"];
  const ALL_CATS = INCOME_CATS.concat(EXPENSE_CATS);
  const FUNDS = ["Unrestricted", "Restricted", "Board-Designated"];
  const PROGRAMS = ["Trades Training", "Community Home Renovation", "Apprenticeship", "General Operating", "Fundraising"];
  const METHODS = ["bank", "card", "cash", "zeffy", "check", "in_kind"];
  const ROLES = ["Trades Contractor", "Mentor", "Both"];
  // Live list of project names for the project-linking dropdowns.
  const projectOpts = () => (A.hub && A.hub.cache && A.hub.cache.projects ? A.hub.cache.projects.map((p) => p.name) : []);

  /* ---- SVG icons -------------------------------------------------------- */
  const I = {
    ledger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h13a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2zM8 4v16M11 9h5M11 13h5"/></svg>',
    bill: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h12v20l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6"/></svg>',
    contractor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM4 21v-1a6 6 0 0 1 12 0v1M18 8l2 2 3-3"/></svg>',
    budget: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18M8 15l3-4 3 2 4-6"/></svg>',
    report: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l5 5v15H6zM15 2v5h5M9 13h6M9 17h6M9 9h2"/></svg>',
  };

  /* ---- Table definitions ------------------------------------------------ */
  const tables = {
    ledger_entries: {
      label: "Ledger", singular: "Entry", kind: "table",
      cols: [
        { k: "date", label: "Date" }, { k: "type", label: "Type", badge: true }, { k: "category", label: "Category" },
        { k: "fund", label: "Fund", badge: true }, { k: "project", label: "Project" },
        { k: "payee", label: "Payee / Source" }, { k: "amount", label: "Amount", money: true },
      ],
      status: { field: "status", opts: ["cleared", "pending"] },
      form: [
        { k: "date", label: "Date", type: "date", req: true },
        { k: "type", label: "Type", type: "select", opts: ["income", "expense"] },
        { k: "category", label: "Category", type: "select", opts: ALL_CATS },
        { k: "fund", label: "Fund", type: "select", opts: FUNDS },
        { k: "program", label: "Program area", type: "select", opts: PROGRAMS },
        { k: "project", label: "Project", type: "select", optsFrom: projectOpts },
        { k: "payee", label: "Payee / Source" },
        { k: "method", label: "Method", type: "select", opts: METHODS },
        { k: "amount", label: "Amount ($)", type: "number", req: true },
        { k: "status", label: "Status", type: "select", opts: ["cleared", "pending"] },
        { k: "memo", label: "Memo", type: "textarea" },
      ],
    },
    bills: {
      label: "Bills & Vendors", singular: "Bill", kind: "table",
      cols: [
        { k: "vendor", label: "Vendor" }, { k: "description", label: "Description" }, { k: "category", label: "Category" },
        { k: "project", label: "Project" }, { k: "amount", label: "Amount", money: true }, { k: "due_date", label: "Due" },
      ],
      status: { field: "status", opts: ["open", "paid", "overdue"] },
      form: [
        { k: "vendor", label: "Vendor", req: true }, { k: "description", label: "Description" },
        { k: "category", label: "Category", type: "select", opts: EXPENSE_CATS },
        { k: "program", label: "Program area", type: "select", opts: PROGRAMS },
        { k: "project", label: "Project", type: "select", optsFrom: projectOpts },
        { k: "amount", label: "Amount ($)", type: "number", req: true },
        { k: "due_date", label: "Due date", type: "date" },
        { k: "status", label: "Status", type: "select", opts: ["open", "paid", "overdue"] },
      ],
    },
    contractors: {
      label: "Contractors & Mentors", singular: "Person", kind: "table",
      cols: [
        { k: "full_name", label: "Name" }, { k: "role", label: "Role", badge: true }, { k: "work", label: "Trade / work" },
        { k: "project", label: "Project" }, { k: "mentees", label: "Mentees" }, { k: "ytd_paid", label: "YTD paid", money: true },
        { k: "needs_1099", label: "1099?", badge: true },
      ],
      status: { field: "status", opts: ["active", "inactive"] },
      form: [
        { k: "full_name", label: "Name", req: true }, { k: "email", label: "Email", type: "email" }, { k: "phone", label: "Phone" },
        { k: "role", label: "Role", type: "select", opts: ROLES },
        { k: "work", label: "Trade / type of work" },
        { k: "project", label: "Assigned project", type: "select", optsFrom: projectOpts },
        { k: "mentees", label: "# Students mentored", type: "number" },
        { k: "hours", label: "Hours (period)", type: "number" },
        { k: "rate", label: "Rate ($/hr)", type: "number" },
        { k: "ytd_paid", label: "YTD paid ($)", type: "number" },
        { k: "w9", label: "W-9 on file", type: "select", opts: ["yes", "no"] },
        { k: "needs_1099", label: "Needs 1099", type: "select", opts: ["yes", "no"] },
        { k: "status", label: "Status", type: "select", opts: ["active", "inactive"] },
      ],
    },
    budget_lines: {
      label: "Budget lines", singular: "Budget line", kind: "table",
      cols: [{ k: "category", label: "Category" }, { k: "budgeted", label: "Budgeted", money: true }],
      form: [
        { k: "category", label: "Category", type: "select", opts: EXPENSE_CATS },
        { k: "period", label: "Period (year)", type: "number" },
        { k: "budgeted", label: "Budgeted ($)", type: "number", req: true },
      ],
    },
    project_budget_lines: {
      label: "Project budget lines", singular: "Budget line", kind: "table",
      cols: [{ k: "project", label: "Project" }, { k: "category", label: "Category" }, { k: "budgeted", label: "Budgeted", money: true }],
      form: [
        { k: "project", label: "Project", type: "select", optsFrom: projectOpts, req: true },
        { k: "category", label: "Category", type: "select", opts: EXPENSE_CATS },
        { k: "budgeted", label: "Budgeted ($)", type: "number", req: true },
        { k: "note", label: "Note" },
      ],
    },
  };

  /* ---- Demo data -------------------------------------------------------- */
  const iso = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
  const RENO = "Community Home Renovation — 4BR", COHORT = "Youth Trades Cohort — Fall", APPR = "Adult Apprenticeship Program";
  const demo = {
    ledger_entries: [
      { id: "le1", date: iso(-40), type: "income", category: "Grants", fund: "Restricted", program: "Trades Training", project: COHORT, payee: "The Riverside Foundation", method: "check", amount: 15000, status: "cleared", created_at: iso(-40) },
      { id: "le2", date: iso(-30), type: "income", category: "Corporate Sponsorship", fund: "Unrestricted", program: "General Operating", project: "", payee: "Midtown Supply Co.", method: "check", amount: 5000, status: "cleared", created_at: iso(-30) },
      { id: "le3", date: iso(-21), type: "income", category: "Raffle & Events", fund: "Restricted", program: "Community Home Renovation", project: RENO, payee: "50/50 Raffle (Zeffy)", method: "zeffy", amount: 4200, status: "cleared", created_at: iso(-21) },
      { id: "le4", date: iso(-14), type: "income", category: "Individual Donations", fund: "Unrestricted", program: "General Operating", project: "", payee: "Marcus & Dana Reed", method: "zeffy", amount: 500, status: "cleared", created_at: iso(-14) },
      { id: "le5", date: iso(-10), type: "income", category: "In-Kind Contributions", fund: "Restricted", program: "Community Home Renovation", project: RENO, payee: "Donated lumber", method: "in_kind", amount: 3000, status: "cleared", created_at: iso(-10) },
      { id: "le6", date: iso(-35), type: "expense", category: "Salaries & Wages", fund: "Unrestricted", program: "General Operating", project: "", payee: "Staff payroll", method: "bank", amount: 8000, status: "cleared", created_at: iso(-35) },
      { id: "le7", date: iso(-28), type: "expense", category: "Materials & Supplies", fund: "Restricted", program: "Community Home Renovation", project: RENO, payee: "Midtown Supply Co.", method: "card", amount: 6400, status: "cleared", created_at: iso(-28) },
      { id: "le8", date: iso(-24), type: "expense", category: "Contractor / Trades Labor", fund: "Restricted", program: "Community Home Renovation", project: RENO, payee: "Licensed trades", method: "bank", amount: 3500, status: "cleared", created_at: iso(-24) },
      { id: "le9", date: iso(-18), type: "expense", category: "Tools & Equipment", fund: "Restricted", program: "Trades Training", project: COHORT, payee: "ToolPro", method: "card", amount: 2100, status: "cleared", created_at: iso(-18) },
      { id: "le10", date: iso(-12), type: "expense", category: "Training & Certification", fund: "Restricted", program: "Trades Training", project: COHORT, payee: "Cert exams", method: "card", amount: 1200, status: "cleared", created_at: iso(-12) },
      { id: "le11", date: iso(-8), type: "expense", category: "Rent & Utilities", fund: "Unrestricted", program: "General Operating", project: "", payee: "Workshop rent + DTE", method: "bank", amount: 1500, status: "cleared", created_at: iso(-8) },
      { id: "le12", date: iso(-4), type: "expense", category: "Office & Admin", fund: "Unrestricted", program: "General Operating", project: "", payee: "Software & supplies", method: "card", amount: 450, status: "pending", created_at: iso(-4) },
    ],
    bills: [
      { id: "b1", vendor: "Midtown Supply Co.", description: "Lumber & drywall", category: "Materials & Supplies", program: "Community Home Renovation", project: RENO, amount: 2400, due_date: iso(9), status: "open", created_at: iso(-3) },
      { id: "b2", vendor: "DTE Energy", description: "Workshop utilities", category: "Rent & Utilities", program: "General Operating", project: "", amount: 320, due_date: iso(-2), status: "overdue", created_at: iso(-10) },
      { id: "b3", vendor: "ToolPro Rental", description: "Scaffolding rental", category: "Tools & Equipment", program: "Community Home Renovation", project: RENO, amount: 580, due_date: iso(14), status: "open", created_at: iso(-1) },
      { id: "b4", vendor: "City of Detroit — Permits", description: "Building permits", category: "Property & Renovation", program: "Community Home Renovation", project: RENO, amount: 750, due_date: iso(-20), status: "paid", created_at: iso(-25) },
    ],
    contractors: [
      { id: "c1", full_name: "Tom Alvarez", email: "tom@example.com", role: "Both", work: "Master plumber", project: RENO, mentees: 3, hours: 60, rate: 45, ytd_paid: 4200, w9: "yes", needs_1099: "yes", status: "active", created_at: iso(-60) },
      { id: "c2", full_name: "Grace Kim", email: "grace@example.com", role: "Mentor", work: "Electrical instructor", project: COHORT, mentees: 5, hours: 40, rate: 40, ytd_paid: 3800, w9: "yes", needs_1099: "yes", status: "active", created_at: iso(-50) },
      { id: "c3", full_name: "R. Daniels", email: "rd@example.com", role: "Trades Contractor", work: "Roofing subcontractor", project: RENO, mentees: 0, hours: 12, rate: 55, ytd_paid: 520, w9: "no", needs_1099: "no", status: "active", created_at: iso(-20) },
      { id: "c4", full_name: "Luis Ortega", email: "luis@example.com", role: "Both", work: "Master carpenter", project: RENO, mentees: 4, hours: 72, rate: 50, ytd_paid: 5600, w9: "yes", needs_1099: "yes", status: "active", created_at: iso(-45) },
    ],
    project_budget_lines: [
      { id: "pb1", project: RENO, category: "Materials & Supplies", budgeted: 40000, created_at: iso(-40) },
      { id: "pb2", project: RENO, category: "Contractor / Trades Labor", budgeted: 25000, created_at: iso(-40) },
      { id: "pb3", project: RENO, category: "Tools & Equipment", budgeted: 8000, created_at: iso(-40) },
      { id: "pb4", project: RENO, category: "Property & Renovation", budgeted: 20000, created_at: iso(-40) },
      { id: "pb5", project: COHORT, category: "Training & Certification", budgeted: 10000, created_at: iso(-20) },
      { id: "pb6", project: COHORT, category: "Tools & Equipment", budgeted: 6000, created_at: iso(-20) },
      { id: "pb7", project: COHORT, category: "Salaries & Wages", budgeted: 9000, created_at: iso(-20) },
    ],
    budget_lines: [
      { id: "bl1", category: "Salaries & Wages", period: 2026, budgeted: 96000, created_at: iso(-200) },
      { id: "bl2", category: "Contractor / Trades Labor", period: 2026, budgeted: 40000, created_at: iso(-200) },
      { id: "bl3", category: "Materials & Supplies", period: 2026, budgeted: 60000, created_at: iso(-200) },
      { id: "bl4", category: "Tools & Equipment", period: 2026, budgeted: 15000, created_at: iso(-200) },
      { id: "bl5", category: "Training & Certification", period: 2026, budgeted: 12000, created_at: iso(-200) },
      { id: "bl6", category: "Rent & Utilities", period: 2026, budgeted: 18000, created_at: iso(-200) },
      { id: "bl7", category: "Fundraising Costs", period: 2026, budgeted: 8000, created_at: iso(-200) },
      { id: "bl8", category: "Office & Admin", period: 2026, budgeted: 10000, created_at: iso(-200) },
    ],
  };

  /* ---- Helpers ---------------------------------------------------------- */
  const sum = (rows, pred) => rows.filter(pred).reduce((s, r) => s + Number(r.amount || 0), 0);
  const groupSum = (rows, key) => rows.reduce((m, r) => { const k = r[key] || "Uncategorized"; m[k] = (m[k] || 0) + Number(r.amount || 0); return m; }, {});

  /* =====================================================================
     VIEW: Ledger  (summary + transactions table)
     ==================================================================== */
  async function renderLedger(hub) {
    await hub.fetchTable("projects"); // populate project dropdown options
    const rows = await hub.fetchTable("ledger_entries");
    const income = sum(rows, (r) => r.type === "income");
    const expense = sum(rows, (r) => r.type === "expense");
    const net = income - expense;
    const view = hub.el();
    view.innerHTML = `
      <div class="view-head"><div><h2 style="margin:0">Finance Ledger</h2><p>General ledger for Jacks of All Trades — income &amp; expenses by fund and program.</p></div>
        <div class="toolbar">
          <div class="search">${hub.ICO("search")}<input type="search" id="led-search" placeholder="Search entries…"></div>
          <button class="btn btn-ghost btn-sm" id="led-csv">${hub.ICO("download")} CSV</button>
          <button class="btn btn-primary btn-sm" id="led-add">${hub.ICO("plus")} New Entry</button>
        </div></div>
      <div class="kpis">
        ${hub.kpi("Total income", hub.money(income), "mega", '<span class="delta up">YTD</span>')}
        ${hub.kpi("Total expenses", hub.money(expense), "build", "")}
        ${hub.kpi("Net (change in assets)", (net < 0 ? "-" : "") + hub.money(Math.abs(net)), "target", net >= 0 ? '<span class="delta up">Surplus</span>' : '<span class="tag active">Deficit</span>')}
        ${hub.kpi("Entries", rows.length, "ledger", "")}
      </div>
      <div class="panel"><div class="table-wrap"><table class="data"><thead><tr>
        ${tables.ledger_entries.cols.map((c) => `<th>${c.label}</th>`).join("")}<th>Status</th><th>Added</th>
      </tr></thead><tbody id="led-body">${hub.tableRows("ledger_entries", rows)}</tbody></table></div></div>`;
    hub.bindRowActions("ledger_entries");
    view.querySelector("#led-add").onclick = () => hub.openModal("ledger_entries");
    view.querySelector("#led-csv").onclick = () => hub.exportCSV("ledger_entries", rows);
    view.querySelector("#led-search").addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase();
      view.querySelector("#led-body").innerHTML = hub.tableRows("ledger_entries", rows.filter((r) => Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(q))));
      hub.bindRowActions("ledger_entries");
    });
  }

  /* =====================================================================
     VIEW: Budgets  (budgeted vs. actual from ledger)
     ==================================================================== */
  async function renderBudgets(hub) {
    const [budgets, ledger] = await Promise.all([hub.fetchTable("budget_lines"), hub.fetchTable("ledger_entries")]);
    const actualByCat = groupSum(ledger.filter((r) => r.type === "expense"), "category");
    const view = hub.el();
    const rows = budgets.map((b) => {
      const actual = actualByCat[b.category] || 0;
      const pct = b.budgeted ? Math.min(100, Math.round((actual / b.budgeted) * 100)) : 0;
      const over = actual > b.budgeted;
      return `<tr>
        <td><strong>${hub.esc(b.category)}</strong></td>
        <td>${hub.money(b.budgeted)}</td>
        <td>${hub.money(actual)}</td>
        <td><b style="color:${over ? "var(--danger)" : "var(--success)"}">${over ? "-" : ""}${hub.money(Math.abs(b.budgeted - actual))}</b></td>
        <td style="min-width:160px"><div class="progress-bar" style="height:10px"><div class="progress-fill" style="width:${pct}%;background:${over ? "var(--danger)" : "linear-gradient(90deg,var(--blue-600),var(--blue-400))"}"></div></div><span class="text-soft" style="font-size:.76rem">${pct}% used</span></td>
      </tr>`;
    }).join("");
    view.innerHTML = `
      <div class="view-head"><div><h2 style="margin:0">Budgets</h2><p>Annual budget vs. actual spend — actuals are computed live from the ledger.</p></div>
        <div class="toolbar"><button class="btn btn-primary btn-sm" id="bud-add">${hub.ICO("plus")} New Budget Line</button></div></div>
      <div class="panel"><div class="table-wrap"><table class="data"><thead><tr><th>Category</th><th>Budgeted</th><th>Actual (YTD)</th><th>Remaining</th><th>Utilization</th></tr></thead>
        <tbody>${rows || hub.emptyRow(5)}</tbody></table></div></div>`;
    view.querySelector("#bud-add").onclick = () => hub.openModal("budget_lines");
  }

  /* =====================================================================
     VIEW: Financial Reports  (Statement of Activities)
     ==================================================================== */
  async function renderReports(hub) {
    const ledger = await hub.fetchTable("ledger_entries");
    const income = ledger.filter((r) => r.type === "income");
    const expense = ledger.filter((r) => r.type === "expense");
    const incBy = groupSum(income, "category"), expBy = groupSum(expense, "category");
    const totalInc = sum(income, () => true), totalExp = sum(expense, () => true), net = totalInc - totalExp;
    const fundNet = FUNDS.map((f) => ({ fund: f, net: sum(income, (r) => r.fund === f) - sum(expense, (r) => r.fund === f) }));
    const progNet = PROGRAMS.map((p) => ({ program: p, inc: sum(income, (r) => r.program === p), exp: sum(expense, (r) => r.program === p) }));
    const row = (k, v) => `<tr><td>${hub.esc(k)}</td><td style="text-align:right">${hub.money(v)}</td></tr>`;
    const view = hub.el();
    view.innerHTML = `
      <div class="view-head"><div><h2 style="margin:0">Financial Reports</h2><p>Statement of Activities · fund &amp; program breakdown · year to date.</p></div>
        <div class="toolbar"><button class="btn btn-ghost btn-sm" id="rep-print">${hub.ICO("download")} Print / PDF</button></div></div>
      <div id="rep-doc" class="dash-2" style="align-items:start">
        <div class="panel"><div class="panel-head"><h3>Statement of Activities</h3><span class="tag">YTD</span></div>
          <div class="panel-body">
            <table class="data" style="font-size:.92rem"><tbody>
              <tr><td colspan="2" style="font-weight:800;color:var(--navy-900);padding-top:.4rem">Revenue &amp; Support</td></tr>
              ${Object.entries(incBy).map(([k, v]) => row(k, v)).join("") || '<tr><td class="muted">No income</td><td></td></tr>'}
              <tr style="border-top:2px solid var(--border)"><td><strong>Total revenue</strong></td><td style="text-align:right"><strong>${hub.money(totalInc)}</strong></td></tr>
              <tr><td colspan="2" style="font-weight:800;color:var(--navy-900);padding-top:.8rem">Expenses</td></tr>
              ${Object.entries(expBy).map(([k, v]) => row(k, v)).join("") || '<tr><td class="muted">No expenses</td><td></td></tr>'}
              <tr style="border-top:2px solid var(--border)"><td><strong>Total expenses</strong></td><td style="text-align:right"><strong>${hub.money(totalExp)}</strong></td></tr>
              <tr style="border-top:2px solid var(--navy-900)"><td style="font-weight:850;color:var(--navy-900)">Change in net assets</td><td style="text-align:right;font-weight:850;color:${net >= 0 ? "var(--success)" : "var(--danger)"}">${net < 0 ? "-" : ""}${hub.money(Math.abs(net))}</td></tr>
            </tbody></table>
          </div></div>
        <div>
          <div class="panel"><div class="panel-head"><h3>By fund</h3></div><div class="panel-body">
            <table class="data" style="font-size:.9rem"><tbody>${fundNet.map((f) => `<tr><td><span class="tag ${hub.statusClass(f.fund)}">${hub.esc(f.fund)}</span></td><td style="text-align:right;font-weight:700;color:${f.net >= 0 ? "var(--success)" : "var(--danger)"}">${f.net < 0 ? "-" : ""}${hub.money(Math.abs(f.net))}</td></tr>`).join("")}</tbody></table>
          </div></div>
          <div class="panel"><div class="panel-head"><h3>By program</h3></div><div class="panel-body">
            <table class="data" style="font-size:.85rem"><thead><tr><th>Program</th><th style="text-align:right">Income</th><th style="text-align:right">Expense</th></tr></thead>
            <tbody>${progNet.map((p) => `<tr><td>${hub.esc(p.program)}</td><td style="text-align:right">${hub.money(p.inc)}</td><td style="text-align:right">${hub.money(p.exp)}</td></tr>`).join("")}</tbody></table>
          </div></div>
        </div>
      </div>`;
    view.querySelector("#rep-print").onclick = () => {
      const w = window.open("", "_blank");
      w.document.write(`<html><head><title>Statement of Activities — Jacks of All Trades</title>
        <style>body{font-family:system-ui,sans-serif;padding:40px;color:#0c1220}h1{font-size:20px}table{width:100%;border-collapse:collapse;font-size:14px}td,th{padding:6px 4px;border-bottom:1px solid #ddd;text-align:left}td:last-child,th:last-child{text-align:right}</style>
        </head><body><h1>Jacks of All Trades Community Development</h1><h2>Statement of Activities — Year to Date</h2>${view.querySelector("#rep-doc").innerHTML.replace(/<div class="progress-bar[\s\S]*?<\/div>/g, "")}<script>window.onload=()=>window.print()<\/script></body></html>`);
      w.document.close();
    };
  }

  /* =====================================================================
     DASHBOARD widget: finance snapshot
     ==================================================================== */
  async function dashboardMount(slot, hub) {
    await hub.fetchTable("projects"); // populate project dropdown options
    const ledger = await hub.fetchTable("ledger_entries");
    const bills = await hub.fetchTable("bills");
    const income = sum(ledger, (r) => r.type === "income");
    const expense = sum(ledger, (r) => r.type === "expense");
    const net = income - expense;
    const openBills = bills.filter((b) => b.status !== "paid");
    const openTotal = openBills.reduce((s, b) => s + Number(b.amount || 0), 0);
    const overdue = bills.filter((b) => b.status === "overdue").length;
    const el = document.createElement("div");
    el.className = "panel";
    el.style.marginBottom = "1.4rem";
    el.innerHTML = `
      <div class="panel-head"><h3>Financial snapshot</h3><button class="btn btn-ghost btn-sm" data-fin-goto="finances">Open ledger</button></div>
      <div class="panel-body"><div class="kpis" style="margin:0">
        ${hub.kpi("Income (YTD)", hub.money(income), "mega", "")}
        ${hub.kpi("Expenses (YTD)", hub.money(expense), "build", "")}
        ${hub.kpi("Net assets", (net < 0 ? "-" : "") + hub.money(Math.abs(net)), "target", net >= 0 ? '<span class="delta up">Surplus</span>' : '<span class="tag active">Deficit</span>')}
        ${hub.kpi("Open bills", hub.money(openTotal), "bill", overdue ? `<span class="tag active">${overdue} overdue</span>` : "")}
      </div></div>`;
    slot.appendChild(el);
    el.querySelector("[data-fin-goto]").onclick = () => hub.go("finances");
  }

  /* =====================================================================
     VIEW: Project Budgets  (per-project budget vs. actual + detail)
     ==================================================================== */
  async function renderProjectBudgets(hub) {
    await hub.fetchTable("projects");
    const id = location.hash.split("#")[2] || null;
    if (id) return renderProjectDetail(hub, id);
    const [projects, ledger, pbLines, contractors] = await Promise.all([
      hub.fetchTable("projects"), hub.fetchTable("ledger_entries"),
      hub.fetchTable("project_budget_lines"), hub.fetchTable("contractors"),
    ]);
    const view = hub.el();
    const cards = projects.map((p) => {
      const budgeted = pbLines.filter((l) => l.project === p.name).reduce((s, l) => s + Number(l.budgeted || 0), 0) || Number(p.budget || 0);
      const actual = sum(ledger, (e) => e.type === "expense" && e.project === p.name);
      const team = contractors.filter((c) => c.project === p.name).length;
      const pct = budgeted ? Math.min(100, Math.round((actual / budgeted) * 100)) : 0;
      const over = actual > budgeted;
      return `<div class="ncard" data-open="${hub.esc(p.id)}" style="cursor:pointer">
        <div class="ncard-top"><span class="tag ${hub.statusClass(p.status)}">${hub.esc((p.status || "").replace("_", " "))}</span><span class="tag">${hub.esc(p.type)}</span></div>
        <h4>${hub.esc(p.name)}</h4>
        <div class="progress-bar" style="margin:.6rem 0 .5rem"><div class="progress-fill" style="width:${pct}%;background:${over ? "var(--danger)" : ""}"></div></div>
        <div class="ncard-foot"><span><b>${hub.money(actual)}</b> <span class="text-soft">/ ${hub.money(budgeted)}</span></span><span class="text-soft">${pct}% ${over ? "· over" : "used"}</span></div>
        <div class="ncard-meta text-soft">${team} contractor${team === 1 ? "" : "s"} / mentor${team === 1 ? "" : "s"} · tap for detail</div></div>`;
    }).join("");
    view.innerHTML = `
      <div class="view-head"><div><h2 style="margin:0">Project Budgets</h2><p>Budget &amp; expense tracking per project — actuals computed live from the ledger.</p></div></div>
      <div class="card-grid">${cards || hub.emptyRow(1)}</div>`;
    view.querySelectorAll(".ncard[data-open]").forEach((c) => c.onclick = () => hub.go("project_budgets#" + c.dataset.open));
  }

  async function renderProjectDetail(hub, id) {
    const [projects, ledger, bills, pbLines, contractors] = await Promise.all([
      hub.fetchTable("projects"), hub.fetchTable("ledger_entries"), hub.fetchTable("bills"),
      hub.fetchTable("project_budget_lines"), hub.fetchTable("contractors"),
    ]);
    const p = projects.find((x) => String(x.id) === String(id));
    const view = hub.el();
    if (!p) { view.innerHTML = `<div class="view-head"><h2>Project not found</h2></div><button class="btn btn-ghost" onclick="location.hash='project_budgets'">← Back</button>`; return; }
    const exp = ledger.filter((e) => e.type === "expense" && e.project === p.name);
    const inc = ledger.filter((e) => e.type === "income" && e.project === p.name);
    const lines = pbLines.filter((l) => l.project === p.name);
    const outstanding = bills.filter((b) => b.project === p.name && b.status !== "paid");
    const team = contractors.filter((c) => c.project === p.name);
    const actualBy = groupSum(exp, "category");
    const budgeted = lines.reduce((s, l) => s + Number(l.budgeted || 0), 0) || Number(p.budget || 0);
    const spent = sum(exp, () => true);
    const funding = sum(inc, () => true);
    const remaining = budgeted - spent;
    // union of budget + expense categories
    const cats = Array.from(new Set(lines.map((l) => l.category).concat(Object.keys(actualBy))));
    const budgetRows = cats.map((cat) => {
      const b = lines.filter((l) => l.category === cat).reduce((s, l) => s + Number(l.budgeted || 0), 0);
      const a = actualBy[cat] || 0; const pct = b ? Math.min(100, Math.round((a / b) * 100)) : (a ? 100 : 0); const over = a > b;
      return `<tr><td><strong>${hub.esc(cat)}</strong></td><td>${hub.money(b)}</td><td>${hub.money(a)}</td>
        <td><b style="color:${over ? "var(--danger)" : "var(--success)"}">${over ? "-" : ""}${hub.money(Math.abs(b - a))}</b></td>
        <td style="min-width:130px"><div class="progress-bar" style="height:9px"><div class="progress-fill" style="width:${pct}%;background:${over ? "var(--danger)" : ""}"></div></div></td></tr>`;
    }).join("");
    view.innerHTML = `
      <div class="view-head"><div>
        <button class="btn btn-ghost btn-xs" id="pd-back" style="margin-bottom:.5rem">← All projects</button>
        <h2 style="margin:0">${hub.esc(p.name)}</h2><p><span class="tag ${hub.statusClass(p.status)}">${hub.esc((p.status || "").replace("_", " "))}</span> ${p.location ? "· " + hub.esc(p.location) : ""} ${p.lead_name ? "· Lead: " + hub.esc(p.lead_name) : ""}</p>
      </div></div>
      <div class="kpis">
        ${hub.kpi("Budget", hub.money(budgeted), "budget", "")}
        ${hub.kpi("Spent", hub.money(spent), "build", "")}
        ${hub.kpi("Remaining", (remaining < 0 ? "-" : "") + hub.money(Math.abs(remaining)), "target", remaining >= 0 ? '<span class="delta up">On budget</span>' : '<span class="tag active">Over</span>')}
        ${hub.kpi("Funding raised", hub.money(funding), "mega", "")}
      </div>
      <div class="dash-2" style="align-items:start">
        <div class="panel"><div class="panel-head"><h3>Budget vs. actual</h3><button class="btn btn-primary btn-sm" id="pd-addbudget">${hub.ICO("plus")} Budget line</button></div>
          <div class="table-wrap"><table class="data"><thead><tr><th>Category</th><th>Budgeted</th><th>Actual</th><th>Remaining</th><th>Used</th></tr></thead>
          <tbody>${budgetRows || hub.emptyRow(5)}</tbody></table></div></div>
        <div class="panel"><div class="panel-head"><h3>Contractors &amp; mentors</h3><button class="btn btn-primary btn-sm" id="pd-addteam">${hub.ICO("plus")} Assign</button></div>
          <div class="table-wrap"><table class="data"><thead><tr><th>Name</th><th>Role</th><th>Mentees</th><th>YTD paid</th></tr></thead>
          <tbody>${team.map((c) => `<tr><td><strong>${hub.esc(c.full_name)}</strong><br><span class="muted">${hub.esc(c.work || "")}</span></td><td><span class="tag ${hub.statusClass(c.role)}">${hub.esc(c.role || "")}</span></td><td>${c.mentees || 0}</td><td>${hub.money(c.ytd_paid)}</td></tr>`).join("") || hub.emptyRow(4)}</tbody></table></div></div>
      </div>
      <div class="panel"><div class="panel-head"><h3>Expenses &amp; bills</h3><button class="btn btn-primary btn-sm" id="pd-addexp">${hub.ICO("plus")} Log expense</button></div>
        <div class="table-wrap"><table class="data"><thead><tr><th>Date</th><th>Category</th><th>Payee / Vendor</th><th>Type</th><th>Amount</th></tr></thead><tbody>
        ${exp.map((e) => `<tr><td>${hub.esc(e.date)}</td><td>${hub.esc(e.category || "")}</td><td>${hub.esc(e.payee || "")}</td><td><span class="tag">ledger</span></td><td><b>${hub.money(e.amount)}</b></td></tr>`).join("")}
        ${outstanding.map((b) => `<tr><td>${hub.esc(b.due_date || "")}</td><td>${hub.esc(b.category || "")}</td><td>${hub.esc(b.vendor || "")}</td><td><span class="tag ${hub.statusClass(b.status)}">${hub.esc(b.status)}</span></td><td><b>${hub.money(b.amount)}</b></td></tr>`).join("")}
        ${(!exp.length && !outstanding.length) ? hub.emptyRow(5) : ""}
        </tbody></table></div></div>`;
    view.querySelector("#pd-back").onclick = () => hub.go("project_budgets");
    view.querySelector("#pd-addbudget").onclick = () => hub.openModal("project_budget_lines", { project: p.name });
    view.querySelector("#pd-addteam").onclick = () => hub.openModal("contractors", { project: p.name, status: "active" });
    view.querySelector("#pd-addexp").onclick = () => hub.openModal("ledger_entries", { type: "expense", project: p.name, program: p.type === "renovation" ? "Community Home Renovation" : "Trades Training", fund: "Restricted", date: new Date().toISOString().slice(0, 10) });
  }

  /* ---- Register --------------------------------------------------------- */
  A.registerPlugin({
    id: "finance",
    tables,
    demo,
    titles: { finances: "Finance Ledger", budgets: "Budgets", finance_reports: "Financial Reports", bills: "Bills & Vendors", contractors: "Contractors & Mentors", project_budgets: "Project Budgets" },
    roles: {
      board: ["finances", "budgets", "finance_reports", "project_budgets", "contractors"],
      staff: ["finances", "bills", "contractors", "budgets", "project_budgets"],
    },
    views: { finances: renderLedger, budgets: renderBudgets, finance_reports: renderReports, project_budgets: renderProjectBudgets },
    nav: [{
      group: "Finances", items: [
        ["finances", "Ledger", I.ledger],
        ["project_budgets", "Project Budgets", I.budget],
        ["bills", "Bills & Vendors", I.bill],
        ["contractors", "Contractors & Mentors", I.contractor],
        ["budgets", "Org Budget", I.report],
        ["finance_reports", "Financial Reports", I.report],
      ],
    }],
    dashboardMount,
  });
})();
