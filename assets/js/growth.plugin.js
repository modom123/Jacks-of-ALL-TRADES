/* ============================================================================
   Jacks of All Trades — Growth to $2M tracker (Command Center plugin)
   File: assets/js/growth.plugin.js
   Generated: 2026-09-15 17:30 UTC

   A north-star view for growing the annual budget from $0 toward $2,000,000.
   Shows: progress to goal from live data (grants awarded, donations, raffle,
   campaigns), the grant pipeline in flight, a diversified funding-mix plan,
   and a phased roadmap. Targets are plans, not projections — reconcile the
   "raised so far" roll-up against your books.

   Reads: campaigns, donations, raffle_stats, grant_leads.
   Remove the <script src=".../growth.plugin.js"> tag to disable.
   ========================================================================== */
(function () {
  "use strict";
  const A = (window.JOAT = window.JOAT || {});
  if (!A.registerPlugin) { console.warn("[growth] Command Center core not loaded"); return; }

  const GOAL = Number(A.ANNUAL_GOAL) || 2000000;
  const TARGETS = A.REVENUE_TARGETS || {};
  const TARGET_ROWS = [
    ["gov_grants", "Government grants", "Federal/state workforce & housing — your biggest lever"],
    ["foundations", "Foundation grants", "Private foundations aligned to trades, youth, housing"],
    ["corporate", "Corporate partnerships", "Sponsors: trades companies, suppliers, Detroit corporates"],
    ["earned", "Earned revenue", "Renovated-home sales/rent + trainee contract work"],
    ["individual", "Individual & major gifts", "Recurring donors and major-gift relationships"],
    ["events_raffle", "Events & 50/50 raffle", "Annual event + the licensed raffle net"],
  ];

  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18M7 15l4-4 3 3 5-6"/></svg>';
  const pctf = (n, d) => (d ? Math.min(100, Math.round((n / d) * 100)) : 0);

  function progress(done, goal, color, height) {
    const pct = pctf(done, goal);
    return `<div style="height:${height || 12}px;border-radius:8px;background:#e6e8ec;overflow:hidden">
      <div style="height:100%;width:${pct}%;background:${color || "#062a40"}"></div></div>`;
  }

  async function gather(hub) {
    const db = hub.db();
    const num = (v) => Number(v || 0);
    const sum = (arr, f) => (arr || []).reduce((s, x) => s + num(f(x)), 0);
    let campaigns = [], grants = [], donations = [], raffle = { gross_raised: 0 };
    try { campaigns = await hub.fetchTable("campaigns"); } catch (e) {}
    if (db) {
      try { const g = await db.from("grant_leads").select("amount_requested,status,funder_type").limit(2000); grants = g.data || []; } catch (e) {}
      try { const d = await db.from("donations").select("amount").limit(5000); donations = d.data || []; } catch (e) {}
      try { const r = await db.from("raffle_stats").select("gross_raised").order("updated_at", { ascending: false }).limit(1).maybeSingle(); raffle = r.data || raffle; } catch (e) {}
    }
    const grantsAwarded = sum(grants.filter((x) => x.status === "awarded"), (x) => x.amount_requested);
    const awardedByType = (t) => sum(grants.filter((x) => x.status === "awarded" && x.funder_type === t), (x) => x.amount_requested);
    const pipeline = sum(grants.filter((x) => x.status === "submitted" || x.status === "follow_up"), (x) => x.amount_requested);
    const donationsTotal = sum(donations, (x) => x.amount);
    const raffleGross = num(raffle.gross_raised);
    // Non-grant, non-raffle campaigns, to avoid double-counting those already summed above.
    const otherCampaigns = sum(campaigns.filter((c) => c.type !== "raffle" && c.type !== "grant"), (c) => c.raised);
    const realized = grantsAwarded + donationsTotal + raffleGross + otherCampaigns;
    const actuals = {
      gov_grants: awardedByType("government"),
      foundations: awardedByType("foundation"),
      corporate: awardedByType("corporate"),
      earned: 0,
      individual: donationsTotal,
      events_raffle: raffleGross,
    };
    return { realized, pipeline, grantsAwarded, donationsTotal, raffleGross, otherCampaigns, actuals };
  }

  async function render(hub) {
    const view = hub.el(), kpi = hub.kpi, money = hub.money;
    const g = await gather(hub);
    const remaining = Math.max(0, GOAL - g.realized);
    const pct = pctf(g.realized, GOAL);

    view.innerHTML = `
      <div class="view-head"><div><h2 style="margin:0">Growth to ${money(GOAL)}</h2>
        <p>Your annual-budget north star. Progress is rolled up from live data &mdash; reconcile against your books.</p></div></div>

      <div class="panel"><div class="panel-body">
        <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:.5rem">
          <div style="font-size:1.6rem;font-weight:850">${money(g.realized)} <span class="text-soft" style="font-size:1rem;font-weight:600">of ${money(GOAL)}</span></div>
          <div style="font-weight:800;color:#0f766e">${pct}%</div>
        </div>
        ${progress(g.realized, GOAL, pct >= 100 ? "#12805c" : "#0f766e", 16)}
        <div class="text-soft" style="margin-top:.5rem;font-size:.9rem">${money(remaining)} to go &middot; plus ${money(g.pipeline)} in grant requests pending a decision.</div>
      </div></div>

      <div class="kpis">
        ${kpi("Realized revenue", money(g.realized), "mega", "")}
        ${kpi("Grant pipeline (in flight)", money(g.pipeline), "target", "")}
        ${kpi("Grants awarded", money(g.grantsAwarded), "ticket", "")}
        ${kpi("% to $2M", pct + "%", "home", "")}
      </div>

      <div class="dash-2">
        <div class="panel"><div class="panel-head"><h3>Your diversified plan to ${money(GOAL)}</h3></div><div class="panel-body">
          <p class="text-soft" style="margin-top:0;font-size:.9rem">A realistic funding mix. Bars show progress toward each stream's target.</p>
          ${TARGET_ROWS.map(([k, label, note]) => {
            const t = Number(TARGETS[k]) || 0, a = Number(g.actuals[k]) || 0;
            return `<div style="margin:.7rem 0">
              <div style="display:flex;justify-content:space-between;font-size:.9rem"><b>${label}</b><span class="text-soft">${money(a)} / ${money(t)}</span></div>
              <div style="font-size:.78rem;color:var(--text-soft,#667)">${note}</div>
              ${progress(a, t, "#062a40", 8)}
            </div>`;
          }).join("")}
        </div></div>

        <div class="panel"><div class="panel-head"><h3>Phased roadmap</h3></div><div class="panel-body" style="font-size:.92rem">
          <p style="margin:.2rem 0 .1rem"><b>Year 1 — Foundation (~$250K–$400K)</b></p>
          <p class="text-soft" style="margin:.1rem 0 .7rem">Land 2–3 anchor grants (one federal, one foundation), formalize 2–3 corporate partners, run the raffle, and build a recurring-donor base. Get books, EIN docs, and outcome tracking audit-ready.</p>
          <p style="margin:.2rem 0 .1rem"><b>Year 2 — Scale (~$800K–$1.2M)</b></p>
          <p class="text-soft" style="margin:.1rem 0 .7rem">Win a multi-year federal award, stand up earned revenue (home sales/rent + trainee contract work), add major gifts and an annual event. Hire against restricted grant budgets.</p>
          <p style="margin:.2rem 0 .1rem"><b>Year 3+ — $2M diversified</b></p>
          <p class="text-soft" style="margin:.1rem 0 0">Recurring multi-year government contracts, a corporate sponsor portfolio, a self-sustaining earned-revenue engine, and an operating reserve. No single source over ~40%.</p>
        </div></div>
      </div>

      <div class="panel"><div class="panel-body" style="font-size:.86rem" class="text-soft">
        <b>How the Command Center feeds this:</b> Grants engine (Gwen/Rex/Wes + daily auto-find) drives the government & foundation lines · Donors/Campaigns track corporate, individual & major gifts · the Raffle + events line is the 50/50. Log corporate sponsorships as Campaigns (type <i>event/capital</i>) or Donors (type <i>corporate</i>) so they roll up here.
      </div></div>`;
  }

  async function dashboardMount(slot, hub) {
    const g = await gather(hub);
    const pct = pctf(g.realized, GOAL);
    slot.insertAdjacentHTML("afterbegin", `
      <div class="panel"><div class="panel-head"><h3>Growth to ${hub.money(GOAL)}</h3>
        <button class="btn btn-ghost btn-sm" data-goto="growth">Open</button></div>
        <div class="panel-body">
          <div style="display:flex;justify-content:space-between;align-items:baseline"><div style="font-size:1.3rem;font-weight:850">${hub.money(g.realized)}</div><div style="font-weight:800;color:#0f766e">${pct}%</div></div>
          ${progress(g.realized, GOAL, pct >= 100 ? "#12805c" : "#0f766e", 12)}
          <div class="text-soft" style="margin-top:.4rem;font-size:.85rem">${hub.money(g.pipeline)} in grant requests pending</div>
        </div></div>`);
  }

  A.registerPlugin({
    id: "growth",
    titles: { growth: "Growth to $2M" },
    roles: { board: ["growth"], staff: ["growth"] },
    views: { growth: render },
    nav: [{ group: "Overview", items: [["growth", "Growth to $2M", ICON]] }],
    dashboardMount,
  });
})();
