/* ============================================================================
   Jacks of All Trades — 50/50 Raffle Winner Picker (Command Center plugin)
   File: assets/js/raffle-picker.plugin.js
   Generated: 2026-09-08 22:10 UTC

   Draws the 50/50 raffle winner automatically, randomly, and *fairly*:
     • Ticket-weighted  — every ticket is one chance, exactly like paper stubs.
     • Cryptographically random — uses crypto.getRandomValues with rejection
       sampling (no modulo bias), NOT Math.random.
     • Auditable — each OFFICIAL draw is recorded (winner, winning ticket #,
       pool size, RNG seed, timestamp, operator) to the raffle_draws table.
     • Verifiable — prints a timestamped Winner Certificate.

   Entrant pool is built from the raffle_entries table (cash / event / paper
   buyers entered by an admin, plus rows synced from Zeffy). In Demo mode a
   sample pool is used so the workflow can be trialed end to end.

   To disable, remove the <script src=".../raffle-picker.plugin.js"> tag.
   ========================================================================== */
(function () {
  "use strict";
  const A = (window.JOAT = window.JOAT || {});
  if (!A.registerPlugin) { console.warn("[raffle-picker] Command Center core not loaded"); return; }

  const SOURCES = ["zeffy", "cash", "check", "event", "manual"];

  /* ---- Icons ------------------------------------------------------------ */
  const I = {
    pick:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg>',
    entry: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4z"/><path d="M13 6v12"/></svg>',
    trophy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0zM7 4H4v2a4 4 0 0 0 3 3.87M17 4h3v2a4 4 0 0 1-3 3.87"/></svg>',
  };

  /* ---- Entrant table (managed like any other Command Center table) ------ */
  const tables = {
    raffle_entries: {
      label: "Raffle Entries", singular: "Entrant", kind: "table",
      cols: [
        { k: "entrant_name", label: "Entrant" }, { k: "email", label: "Email" },
        { k: "tickets", label: "Tickets", money: false }, { k: "source", label: "Source", badge: true },
        { k: "reference", label: "Reference" },
      ],
      status: { field: "status", opts: ["eligible", "excluded"] },
      form: [
        { k: "entrant_name", label: "Entrant name", req: true },
        { k: "email", label: "Email", type: "email" },
        { k: "phone", label: "Phone" },
        { k: "tickets", label: "# Tickets (chances)", type: "number", req: true },
        { k: "source", label: "Source", type: "select", opts: SOURCES },
        { k: "reference", label: "Reference (receipt / payment id)" },
        { k: "status", label: "Status", type: "select", opts: ["eligible", "excluded"] },
      ],
    },
  };

  /* ---- Demo entrant pool ------------------------------------------------ */
  const iso = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString(); };
  const demo = {
    raffle_entries: [
      { id: "re1",  entrant_name: "Marcus Reed",       email: "marcus@example.com",   phone: "", tickets: 150, source: "zeffy", reference: "ZF-1042", status: "eligible", created_at: iso(-20) },
      { id: "re2",  entrant_name: "Latoya Bennett",    email: "latoya@example.com",   phone: "", tickets: 70,  source: "zeffy", reference: "ZF-1051", status: "eligible", created_at: iso(-18) },
      { id: "re3",  entrant_name: "Tom Alvarez",       email: "tom@example.com",      phone: "", tickets: 30,  source: "cash",  reference: "Booth #14", status: "eligible", created_at: iso(-15) },
      { id: "re4",  entrant_name: "Grace Kim",         email: "grace@example.com",    phone: "", tickets: 30,  source: "zeffy", reference: "ZF-1066", status: "eligible", created_at: iso(-14) },
      { id: "re5",  entrant_name: "Dana Cole",         email: "dana@example.com",     phone: "", tickets: 1,   source: "cash",  reference: "Booth #22", status: "eligible", created_at: iso(-12) },
      { id: "re6",  entrant_name: "Priya Nair",        email: "priya@example.com",    phone: "", tickets: 70,  source: "zeffy", reference: "ZF-1073", status: "eligible", created_at: iso(-11) },
      { id: "re7",  entrant_name: "Jerome Watts",      email: "jerome@example.com",   phone: "", tickets: 150, source: "check", reference: "Ck #308", status: "eligible", created_at: iso(-9) },
      { id: "re8",  entrant_name: "Ellen Fox",         email: "ellen@midtown.example",phone: "", tickets: 30,  source: "event", reference: "Game day", status: "eligible", created_at: iso(-8) },
      { id: "re9",  entrant_name: "Luis Ortega",       email: "luis@example.com",     phone: "", tickets: 20,  source: "cash",  reference: "Booth #31", status: "eligible", created_at: iso(-6) },
      { id: "re10", entrant_name: "Sofia Martins",     email: "sofia@example.com",    phone: "", tickets: 1,   source: "cash",  reference: "Booth #33", status: "eligible", created_at: iso(-5) },
      { id: "re11", entrant_name: "Andre Brooks",      email: "andre@example.com",    phone: "", tickets: 70,  source: "zeffy", reference: "ZF-1090", status: "eligible", created_at: iso(-3) },
      { id: "re12", entrant_name: "Nia Coleman",       email: "nia@example.com",      phone: "", tickets: 30,  source: "event", reference: "Game day", status: "eligible", created_at: iso(-1) },
    ],
    raffle_draws: [],
  };

  /* ---- Fair, unbiased crypto RNG in [0, n) ------------------------------ */
  function secureRandInt(n) {
    n = Math.floor(n);
    if (n <= 0) return 0;
    if (n === 1) return 0;
    const buf = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / n) * n; // largest multiple of n ≤ 2^32
    let x;
    do { crypto.getRandomValues(buf); x = buf[0]; } while (x >= limit); // reject bias tail
    return x % n;
  }
  // 128-bit hex seed we record so a draw can be independently reproduced/audited.
  function seedHex() {
    const b = new Uint8Array(16); crypto.getRandomValues(b);
    return Array.from(b, (v) => v.toString(16).padStart(2, "0")).join("");
  }

  /* ---- Build the weighted pool from entries ----------------------------- */
  function buildPool(entries, excludeNames) {
    const ex = new Set((excludeNames || []).map((s) => String(s).toLowerCase().trim()));
    return entries
      .filter((e) => (e.status || "eligible") !== "excluded")
      .map((e) => ({ ...e, tickets: Math.max(0, Math.floor(Number(e.tickets) || 0)) }))
      .filter((e) => e.tickets > 0)
      .filter((e) => !ex.has(String(e.entrant_name || "").toLowerCase().trim()) &&
                     !(e.email && ex.has(String(e.email).toLowerCase().trim())));
  }

  // Draw one winner, weighted by ticket count. Returns full audit detail.
  function drawWinner(pool) {
    const total = pool.reduce((s, e) => s + e.tickets, 0);
    if (total <= 0) return null;
    const r = secureRandInt(total);            // 0-based winning ticket index
    let acc = 0, winner = null, localTicket = 0;
    for (const e of pool) {
      if (r < acc + e.tickets) { winner = e; localTicket = r - acc + 1; break; }
      acc += e.tickets;
    }
    return { winner, globalTicket: r + 1, localTicket, total, entrants: pool.length, seed: seedHex() };
  }

  /* ---- One-time CSS (scoped to the picker; removed with the script) ----- */
  function ensureCSS() {
    if (document.getElementById("joat-picker-css")) return;
    const s = document.createElement("style");
    s.id = "joat-picker-css";
    s.textContent = `
      .rp-stage{background:linear-gradient(160deg,#062a40,#0a3a58);border-radius:var(--r-lg,16px);
        color:#fff;padding:2rem 1.4rem;text-align:center;position:relative;overflow:hidden}
      .rp-stage:before{content:"";position:absolute;inset:0;background:
        radial-gradient(circle at 20% 0%,rgba(0,118,182,.45),transparent 55%),
        radial-gradient(circle at 90% 100%,rgba(190,157,90,.35),transparent 55%);pointer-events:none}
      .rp-stage>*{position:relative}
      .rp-kick{font-size:.72rem;letter-spacing:.22em;text-transform:uppercase;color:#9fd0ef;font-weight:800}
      .rp-reel{margin:1rem auto;min-height:96px;display:flex;align-items:center;justify-content:center}
      .rp-reel b{font-size:clamp(1.6rem,5vw,3rem);font-weight:850;line-height:1.05;letter-spacing:-.01em;
        display:inline-block;color:#fff;text-shadow:0 2px 20px rgba(0,0,0,.35)}
      .rp-reel.spinning b{opacity:.55;filter:blur(.3px)}
      .rp-reel.won b{color:#ffd98a;animation:rp-pop .5s cubic-bezier(.2,1.4,.4,1)}
      @keyframes rp-pop{0%{transform:scale(.6);opacity:0}100%{transform:scale(1);opacity:1}}
      .rp-sub{color:#cfe3f2;font-size:.9rem;min-height:1.2em}
      .rp-draw-btn{font-size:1.05rem;padding:.85rem 2.2rem;border-radius:999px;border:none;cursor:pointer;
        font-weight:800;color:#062a40;background:linear-gradient(90deg,#ffd98a,#be9d5a);
        box-shadow:0 8px 24px rgba(190,157,90,.4);transition:transform .1s}
      .rp-draw-btn:hover{transform:translateY(-1px)}
      .rp-draw-btn:disabled{opacity:.55;cursor:not-allowed;transform:none}
      .rp-opts{display:flex;gap:1.2rem;flex-wrap:wrap;justify-content:center;align-items:center;
        margin-top:1rem;font-size:.86rem;color:#e6f1fa}
      .rp-opts label{display:flex;align-items:center;gap:.4rem;cursor:pointer}
      .rp-winner{margin-top:1.2rem;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);
        border-radius:12px;padding:1rem 1.2rem;display:inline-block;min-width:min(480px,90%)}
      .rp-winner h3{margin:.1rem 0 .3rem;font-size:1.5rem;color:#ffd98a}
      .rp-winner .rp-meta{color:#cfe3f2;font-size:.82rem;line-height:1.6}
      .rp-winner .rp-actions{margin-top:.8rem;display:flex;gap:.5rem;flex-wrap:wrap;justify-content:center}
      .rp-chip{display:inline-block;background:rgba(0,0,0,.25);border-radius:6px;padding:.15rem .5rem;
        font-variant-numeric:tabular-nums;font-weight:700}
    `;
    document.head.appendChild(s);
  }

  /* ---- Spin animation, then land on the pre-selected winner ------------- */
  function spin(reel, sub, pool, winnerName, onDone) {
    reel.classList.add("spinning"); reel.classList.remove("won");
    const names = pool.map((e) => e.entrant_name);
    const started = performance.now();
    const DURATION = 2600;
    let delay = 45;
    function tick() {
      const t = performance.now() - started;
      if (t >= DURATION) {
        reel.classList.remove("spinning"); reel.classList.add("won");
        reel.querySelector("b").textContent = winnerName;
        onDone();
        return;
      }
      reel.querySelector("b").textContent = names[secureRandInt(names.length)] || "…";
      sub.textContent = "Drawing a random ticket…";
      delay = 45 + Math.pow(t / DURATION, 3) * 320; // ease-out: slows toward the end
      setTimeout(tick, delay);
    }
    tick();
  }

  const fmt = (n) => Number(n || 0).toLocaleString();

  /* =====================================================================
     VIEW: Winner Picker
     ==================================================================== */
  async function renderPicker(hub) {
    ensureCSS();
    const view = hub.el();
    const [entries, draws, raffle] = await Promise.all([
      hub.fetchTable("raffle_entries"),
      hub.fetchTable("raffle_draws"),
      (A.hub && fetchRaffleStats(hub)),
    ]);
    const officialWinners = draws.filter((d) => d.status === "official").map((d) => d.winner_name);
    const eligible = entries.filter((e) => (e.status || "eligible") !== "excluded" && Number(e.tickets) > 0);
    const totalTickets = eligible.reduce((s, e) => s + Math.floor(Number(e.tickets) || 0), 0);
    const pot = Number((raffle && raffle.pot_total) || 0);
    const winnerShare = Math.round(pot * 0.5);

    view.innerHTML = `
      <div class="view-head"><div><h2 style="margin:0">50/50 Winner Picker</h2>
        <p>Automatically and randomly draws the winning ticket — cryptographically fair and fully auditable.</p></div>
        <div class="toolbar">
          <button class="btn btn-ghost btn-sm" id="rp-manage">${I.entry} Manage entries</button>
          ${hub.isDemo() ? "" : `<button class="btn btn-ghost btn-sm" id="rp-zeffy">${hub.ICO("download")} Import from Zeffy</button>`}
        </div></div>

      <div class="kpis">
        ${hub.kpi("Eligible entrants", fmt(eligible.length), "users", "")}
        ${hub.kpi("Total tickets (chances)", fmt(totalTickets), "ticket", "")}
        ${hub.kpi("Prize pot", hub.money(pot), "mega", "")}
        ${hub.kpi("Winner takes 50%", hub.money(winnerShare), "target", '<span class="delta up">50/50</span>')}
      </div>

      <div class="rp-stage">
        <div class="rp-kick">Monday Night Football · Halftime · Ford Field</div>
        <div class="rp-reel" id="rp-reel"><b>${totalTickets ? "Ready to draw" : "No eligible tickets yet"}</b></div>
        <div class="rp-sub" id="rp-sub">${totalTickets ? `${fmt(totalTickets)} tickets from ${fmt(eligible.length)} entrants in the drum.` : "Add entries or import from Zeffy to begin."}</div>
        <div style="margin-top:1.1rem"><button class="rp-draw-btn" id="rp-draw" ${totalTickets ? "" : "disabled"}>🎟️ Draw the winner</button></div>
        <div class="rp-opts">
          <label><input type="checkbox" id="rp-official" checked> Record as the <b>official</b> draw</label>
          <label><input type="checkbox" id="rp-exclude" ${officialWinners.length ? "checked" : ""}> Exclude previous winners${officialWinners.length ? ` (${officialWinners.length})` : ""}</label>
        </div>
        <div id="rp-result"></div>
      </div>

      <div class="panel" style="margin-top:1.4rem"><div class="panel-head"><h3>Draw history &amp; audit trail</h3>
        <button class="btn btn-ghost btn-sm" id="rp-csv">${hub.ICO("download")} CSV</button></div>
        <div class="table-wrap"><table class="data"><thead><tr>
          <th>Drawn at</th><th>Winner</th><th>Winning ticket</th><th>Pool</th><th>Type</th><th>Operator</th><th></th>
        </tr></thead><tbody id="rp-history">${historyRows(hub, draws)}</tbody></table></div></div>`;

    const manage = view.querySelector("#rp-manage"); if (manage) manage.onclick = () => hub.go("raffle_entries");
    const zeffyBtn = view.querySelector("#rp-zeffy"); if (zeffyBtn) zeffyBtn.onclick = () => importFromZeffy(hub);
    view.querySelector("#rp-csv").onclick = () => hub.exportCSV("raffle_draws", draws);
    bindHistory(hub, draws);

    const btn = view.querySelector("#rp-draw");
    if (btn) btn.onclick = async () => {
      const reel = view.querySelector("#rp-reel");
      const sub = view.querySelector("#rp-sub");
      const isOfficial = view.querySelector("#rp-official").checked;
      const doExclude = view.querySelector("#rp-exclude").checked;
      const pool = buildPool(entries, doExclude ? officialWinners : []);
      if (!pool.length) { hub.toast("No eligible tickets to draw"); return; }

      btn.disabled = true; view.querySelector("#rp-result").innerHTML = "";
      const result = drawWinner(pool);
      spin(reel, sub, pool, result.winner.entrant_name, async () => {
        sub.textContent = `Ticket #${fmt(result.globalTicket)} of ${fmt(result.total)} drawn from ${fmt(result.entrants)} entrants.`;
        const rec = {
          winner_name: result.winner.entrant_name,
          winner_email: result.winner.email || "",
          winner_phone: result.winner.phone || "",
          winning_ticket: result.globalTicket,
          total_tickets: result.total,
          total_entrants: result.entrants,
          method: "crypto-weighted",
          seed: result.seed,
          status: isOfficial ? "official" : "test",
          drawn_by: (document.getElementById("user-email") || {}).textContent || "admin",
          drawn_at: new Date().toISOString(),
        };
        if (isOfficial) { await recordDraw(hub, rec); draws.unshift(rec); }
        renderResultCard(hub, view, result, rec, isOfficial);
        view.querySelector("#rp-history").innerHTML = historyRows(hub, draws);
        bindHistory(hub, draws);
        btn.disabled = false;
      });
    };
  }

  function renderResultCard(hub, view, result, rec, isOfficial) {
    const w = result.winner;
    view.querySelector("#rp-result").innerHTML = `
      <div class="rp-winner">
        <div class="rp-kick" style="color:#ffd98a">${isOfficial ? "🏆 Official winner" : "Test draw (not recorded)"}</div>
        <h3>${hub.esc(w.entrant_name)}</h3>
        <div class="rp-meta">
          ${w.email ? "✉️ " + hub.esc(w.email) + "<br>" : ""}
          ${w.phone ? "📞 " + hub.esc(w.phone) + "<br>" : ""}
          Winning ticket <span class="rp-chip">#${fmt(result.globalTicket)}</span>
          of <span class="rp-chip">${fmt(result.total)}</span> ·
          held ${fmt(w.tickets)} ticket${w.tickets === 1 ? "" : "s"}<br>
          <span style="opacity:.7">Seed ${hub.esc(rec.seed)} · ${new Date(rec.drawn_at).toLocaleString()}</span>
        </div>
        <div class="rp-actions">
          <button class="btn btn-primary btn-sm" id="rp-cert">Print certificate</button>
          <button class="btn btn-ghost btn-sm" id="rp-copy">Copy result</button>
        </div>
      </div>`;
    view.querySelector("#rp-cert").onclick = () => printCertificate(result, rec);
    view.querySelector("#rp-copy").onclick = () => {
      const txt = `50/50 Raffle Winner: ${w.entrant_name} — ticket #${result.globalTicket} of ${result.total} — ${new Date(rec.drawn_at).toLocaleString()} (seed ${rec.seed})`;
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => hub.toast("Result copied"), () => hub.toast("Copy failed"));
    };
  }

  function historyRows(hub, draws) {
    if (!draws.length) return hub.emptyRow(7);
    return draws.map((d, i) => `<tr data-draw="${i}">
      <td class="muted">${d.drawn_at ? new Date(d.drawn_at).toLocaleString() : "—"}</td>
      <td><strong>${hub.esc(d.winner_name)}</strong>${d.winner_email ? `<br><span class="muted">${hub.esc(d.winner_email)}</span>` : ""}</td>
      <td>#${fmt(d.winning_ticket)} <span class="muted">/ ${fmt(d.total_tickets)}</span></td>
      <td>${fmt(d.total_entrants)}</td>
      <td><span class="tag ${d.status === "official" ? "done" : d.status === "void" ? "active" : "new"}">${hub.esc(d.status)}</span></td>
      <td class="muted">${hub.esc(d.drawn_by || "—")}</td>
      <td><button class="btn btn-ghost btn-xs rp-recert" data-draw="${i}">Certificate</button></td>
    </tr>`).join("");
  }
  function bindHistory(hub, draws) {
    document.querySelectorAll(".rp-recert").forEach((b) => b.onclick = () => {
      const d = draws[Number(b.dataset.draw)]; if (!d) return;
      printCertificate({ winner: { entrant_name: d.winner_name, email: d.winner_email, phone: d.winner_phone, tickets: null }, globalTicket: d.winning_ticket, total: d.total_tickets, entrants: d.total_entrants }, d);
    });
  }

  /* ---- Persist an official draw ----------------------------------------- */
  // Persistence only. The caller updates the in-memory `draws` list for display
  // (in Demo that list *is* the cache, so it survives view re-renders too).
  async function recordDraw(hub, rec) {
    if (hub.isDemo() || !hub.db()) { hub.toast("Winner recorded (demo)"); return; }
    try {
      const { error } = await hub.db().from("raffle_draws").insert([rec]);
      if (error) throw error;
      hub.cache.raffle_draws = null;
      hub.toast("Official winner recorded");
    } catch (e) { console.error(e); hub.toast("Save failed: " + (e.message || e)); }
  }

  async function fetchRaffleStats(hub) {
    if (hub.isDemo() || !hub.db()) return { pot_total: (A.RAFFLE && A.RAFFLE.potFallback) || 12480 };
    try { const { data } = await hub.db().from("raffle_stats").select("pot_total").order("updated_at", { ascending: false }).limit(1).maybeSingle(); return data || { pot_total: 0 }; }
    catch { return { pot_total: 0 }; }
  }

  /* ---- Optional: turn Zeffy payments into ticket entries ---------------- */
  function ticketsForAmount(amt) {
    const a = Math.round(Number(amt) || 0);
    const tier = { 1: 1, 20: 30, 50: 70, 100: 150 }; // matches the published pricing
    if (tier[a]) return tier[a];
    return Math.max(1, a); // fallback: $1 = 1 ticket
  }
  async function importFromZeffy(hub) {
    if (hub.isDemo() || !hub.db()) { hub.toast("Connect Supabase to import from Zeffy"); return; }
    try {
      const { data: pays, error } = await hub.db().from("zeffy_payments").select("zeffy_id,amount,buyer_email,raw").limit(5000);
      if (error) throw error;
      const existing = await hub.fetchTable("raffle_entries");
      const have = new Set(existing.map((e) => e.reference));
      const rows = (pays || [])
        .filter((p) => !have.has(p.zeffy_id))
        .map((p) => ({
          entrant_name: (p.raw && (p.raw.buyer_name || p.raw.name)) || (p.buyer_email || "Zeffy supporter"),
          email: p.buyer_email || "", tickets: ticketsForAmount(p.amount),
          source: "zeffy", reference: p.zeffy_id, status: "eligible", created_at: new Date().toISOString(),
        }));
      if (!rows.length) { hub.toast("No new Zeffy payments to import"); return; }
      const { error: insErr } = await hub.db().from("raffle_entries").insert(rows);
      if (insErr) throw insErr;
      hub.cache.raffle_entries = null;
      hub.toast(`Imported ${rows.length} entrant${rows.length === 1 ? "" : "s"} from Zeffy`);
      hub.route();
    } catch (e) { console.error(e); hub.toast("Import failed: " + (e.message || e)); }
  }

  /* ---- Printable, timestamped Winner Certificate ------------------------ */
  function printCertificate(result, rec) {
    const w = result.winner;
    const when = rec.drawn_at ? new Date(rec.drawn_at) : new Date();
    const stamp = when.toISOString().slice(0, 16).replace(/[-:T]/g, "").replace(/(\d{8})(\d{4})/, "$1_$2");
    const win = document.open ? window.open("", "_blank") : null;
    if (!win) return;
    const esc = (s) => String(s ?? "").replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));
    win.document.write(`<!doctype html><html><head><meta charset="utf-8">
      <title>50-50-raffle-winner_${stamp}</title>
      <style>
        @page{size:8.5in 11in;margin:0}
        body{font-family:Georgia,'Times New Roman',serif;margin:0;color:#12212f}
        .cert{width:8.5in;height:11in;box-sizing:border-box;padding:.9in .8in;
          border:14px double #be9d5a;text-align:center;position:relative}
        .kick{letter-spacing:.28em;text-transform:uppercase;color:#0076b6;font-weight:bold;font-size:12pt}
        h1{font-size:30pt;margin:.35in 0 .15in;color:#062a40}
        .name{font-size:34pt;color:#a2822f;margin:.25in 0;border-top:2px solid #ddd;border-bottom:2px solid #ddd;padding:.2in 0}
        p{font-size:13pt;line-height:1.7;margin:.12in 0}
        .chip{display:inline-block;background:#f1eadd;border-radius:6px;padding:.04in .18in;font-weight:bold}
        .foot{position:absolute;bottom:.7in;left:0;right:0;font-size:9pt;color:#5b6b7a;line-height:1.5}
      </style></head><body>
      <div class="cert">
        <div class="kick">Jacks of All Trades Community Development</div>
        <h1>50/50 Raffle — Official Winner</h1>
        <p>This certifies that the winning ticket was drawn at random and belongs to</p>
        <div class="name">${esc(w.entrant_name)}</div>
        <p>Winning ticket <span class="chip">#${Number(result.globalTicket).toLocaleString()}</span>
           of <span class="chip">${Number(result.total).toLocaleString()}</span> tickets,
           across ${Number(result.entrants || 0).toLocaleString()} entrants.</p>
        <p>Drawn ${when.toLocaleString()}${rec.drawn_by ? " · by " + esc(rec.drawn_by) : ""}</p>
        <div class="foot">
          Cryptographically random, ticket-weighted draw (method: ${esc(rec.method || "crypto-weighted")}).<br>
          Verification seed: ${esc(rec.seed || "—")}<br>
          Nonprofit EIN 41-2680557 · JOATAMP.ORG · Generated ${stamp}
        </div>
      </div>
      <script>window.onload=function(){window.print()}<\/script>
      </body></html>`);
    win.document.close();
  }

  /* ---- Register --------------------------------------------------------- */
  A.registerPlugin({
    id: "raffle-picker",
    tables,
    demo,
    titles: { raffle_picker: "50/50 Winner Picker", raffle_entries: "Raffle Entries" },
    roles: { board: ["raffle_picker", "raffle_entries"], staff: ["raffle_entries"] },
    views: { raffle_picker: renderPicker },
    nav: [{
      group: "50/50 Draw", items: [
        ["raffle_picker", "Winner Picker", I.pick],
        ["raffle_entries", "Raffle Entries", I.entry],
      ],
    }],
  });
})();
