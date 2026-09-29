/* ============================================================================
   Jacks of All Trades — Donor Giving (Command Center plugin)
   File: assets/js/donor-giving.plugin.js
   Generated: 2026-09-29 23:00 UTC

   The donor CRM's money view: every donor with their lifetime total and a
   breakdown by fundraiser/campaign (50/50 raffle, house renovation, GoFundMe,
   social, events…), plus gift history per donor.
     • Sync from Zeffy now — zeffy-sync pulls every Zeffy buyer/donor (name +
       email) into the CRM and every payment into the gift ledger.
     • Import CSV — GoFundMe (or any platform) donation exports: auto-maps
       name / email / amount / date columns, previews, de-duplicates re-imports.
     • Export CSV — the whole list with per-fundraiser columns.
   Totals are recalculated across all sources by refresh_donor_totals().
   Updated 2026-09-29 23:30 UTC · click a donor → full profile + agent actions.

   Data: donors, donations, donor_giving (view)
   Setup: supabase/setup_donor_crm_sync_2026-09-29_2300.sql
   ========================================================================== */
(function () {
  "use strict";
  const A = (window.JOAT = window.JOAT || {});
  if (!A.registerPlugin) { console.warn("[donor-giving] Command Center core not loaded"); return; }

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
  const usd = (n) => "$" + (Math.round((Number(n) || 0) * 100) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>';

  let query = "", flash = null, sortBy = "total";

  async function load(hub) {
    const db = hub.db();
    const [d, g, c] = await Promise.all([
      db.from("donors").select("id,full_name,email,phone,type,stage,total_given,last_gift_date,last_gift_amount,source").limit(20000),
      db.from("donor_giving").select("*").limit(50000),
      db.from("campaign_giving").select("*").limit(1000),
    ]);
    return { donors: d.data || [], giving: g.data || [], camp: c.data || [], error: d.error || g.error || c.error };
  }

  async function render(hub) {
    const view = hub.el();
    if (!hub.db()) { view.innerHTML = `<div class="panel"><div class="panel-body">Sign in to the live hub to see donor giving.</div></div>`; return; }
    const { donors, giving, camp, error } = await load(hub);
    const byDonor = giving.reduce((m, r) => { (m[r.donor_id] = m[r.donor_id] || []).push(r); return m; }, {});
    // Fundraiser totals include anonymous gifts (campaign_giving view).
    const campaigns = camp.map((c) => [c.campaign, { total: Number(c.total) || 0, donors: Number(c.donors) || 0, gifts: Number(c.gifts) || 0 }])
      .sort((a, b) => b[1].total - a[1].total);
    const q = query.toLowerCase();
    let rows = donors.filter((d) => byDonor[d.id] || Number(d.total_given) > 0)
      .filter((d) => !q || `${d.full_name} ${d.email || ""}`.toLowerCase().includes(q));
    rows.sort(sortBy === "recent" ? (a, b) => String(b.last_gift_date || "").localeCompare(String(a.last_gift_date || ""))
      : sortBy === "name" ? (a, b) => String(a.full_name).localeCompare(String(b.full_name))
      : (a, b) => (Number(b.total_given) || 0) - (Number(a.total_given) || 0));
    const total = campaigns.reduce((s, [, c]) => s + c.total, 0);
    const giftCount = campaigns.reduce((s, [, c]) => s + c.gifts, 0);

    view.innerHTML = `
      <div class="view-head"><div><h2 style="margin:0">Donor Giving</h2>
        <p>Every donor's total — broken down by fundraiser. Zeffy donors sync in automatically every 15 minutes.</p></div>
        <div style="display:flex;gap:.4rem;flex-wrap:wrap">
          <button class="btn btn-primary" id="dg-sync">Sync from Zeffy now</button>
          <button class="btn btn-ghost" id="dg-import">Import CSV (GoFundMe…)</button>
          <button class="btn btn-ghost" id="dg-export">Export CSV</button></div></div>
      ${error ? `<div class="panel" style="border-left:4px solid #b42318"><div class="panel-body">Couldn't load giving: ${esc(error.message)}.<br>
        Run <code>supabase/setup_donor_crm_sync_2026-09-29_2300.sql</code> in the Supabase SQL Editor, then reload.</div></div>` : ""}
      ${flash ? `<div class="panel" style="border-left:4px solid ${flash.ok ? "#12805c" : "#b42318"}"><div class="panel-body">${flash.ok ? "✅" : "❌"} ${esc(flash.text)}</div></div>` : ""}
      <div class="kpis">
        ${hub.kpi("Donors who gave", rows.length.toLocaleString(), "users", "")}
        ${hub.kpi("Total given (all sources)", usd(total), "heart", "")}
        ${hub.kpi("Gifts", giftCount.toLocaleString(), "ticket", "")}
        ${hub.kpi("Fundraisers", campaigns.length, "campaigns", "")}
      </div>
      <div class="panel"><div class="panel-head"><h3>By fundraiser</h3></div><div class="panel-body" style="display:flex;gap:.5rem;flex-wrap:wrap">
        ${campaigns.length ? campaigns.map(([name, c]) => `<div style="border:1px solid var(--border,#e6e8ec);border-radius:12px;padding:.6rem .8rem;min-width:170px">
          <div style="font-weight:800">${esc(name)}</div><div style="font-size:1.1rem;font-weight:850">${usd(c.total)}</div><div class="text-soft" style="font-size:.8rem">${c.gifts} gift${c.gifts === 1 ? "" : "s"} · ${c.donors} named donor${c.donors === 1 ? "" : "s"}</div></div>`).join("")
          : `<span class="text-soft">No gifts yet — click <b>Sync from Zeffy now</b>.</span>`}
      </div></div>
      <div class="panel"><div class="panel-head" style="gap:.5rem;flex-wrap:wrap"><h3>Donors</h3>
        <div style="display:flex;gap:.4rem"><input id="dg-q" placeholder="Search name or email" value="${esc(query)}" style="max-width:220px">
        <select id="dg-sort"><option value="total" ${sortBy === "total" ? "selected" : ""}>Top givers</option><option value="recent" ${sortBy === "recent" ? "selected" : ""}>Most recent</option><option value="name" ${sortBy === "name" ? "selected" : ""}>Name</option></select></div></div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Donor</th><th>Total</th><th>By fundraiser</th><th>Last gift</th><th></th></tr></thead>
          <tbody>${rows.slice(0, 500).map((d) => {
            const parts = (byDonor[d.id] || []).sort((a, b) => b.total - a.total);
            return `<tr data-id="${esc(d.id)}">
              <td><a href="javascript:void 0" data-prof style="font-weight:700">${esc(d.full_name)}</a><div class="muted">${esc(d.email || "no email")}${d.type && d.type !== "individual" ? " · " + esc(d.type) : ""} · ${esc(d.stage || "")}</div></td>
              <td><b>${usd(d.total_given)}</b></td>
              <td style="max-width:420px">${parts.map((p) => `<span class="pill" style="margin:.1rem;text-transform:none;letter-spacing:0">${esc(p.campaign)}: ${usd(p.total)}${p.gifts > 1 ? ` ×${p.gifts}` : ""}</span>`).join("")}</td>
              <td style="white-space:nowrap">${esc(d.last_gift_date || "—")}${d.last_gift_amount ? `<div class="muted">${usd(d.last_gift_amount)}</div>` : ""}</td>
              <td style="white-space:nowrap"><button class="btn btn-primary btn-sm" data-prof>Profile</button></td></tr>`;
          }).join("") || `<tr><td colspan="5" class="text-soft" style="padding:1.2rem">No donors with gifts yet.</td></tr>`}</tbody>
        </table></div>${rows.length > 500 ? `<p class="text-soft" style="padding:0 1rem">Showing the first 500 — search to narrow.</p>` : ""}</div>`;

    const qi = view.querySelector("#dg-q");
    qi.oninput = () => { query = qi.value; clearTimeout(qi._t); qi._t = setTimeout(() => render(hub).then(() => { const n = hub.el().querySelector("#dg-q"); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }), 250); };
    view.querySelector("#dg-sort").onchange = (e) => { sortBy = e.target.value; render(hub); };
    view.querySelector("#dg-sync").onclick = (e) => syncZeffy(hub, e.target);
    view.querySelector("#dg-import").onclick = () => openImport(hub, donors);
    view.querySelector("#dg-export").onclick = () => exportCsv(rows, byDonor, campaigns.map(([n]) => n));
    // Donor profile (donor-profile.js) with one-click agent actions; falls back to gift history.
    view.querySelectorAll("tr[data-id] [data-prof]").forEach((b) => b.onclick = () => {
      const id = b.closest("tr").dataset.id;
      if (A.donorProfile) A.donorProfile.open(id); else openHistory(hub, donors.find((d) => String(d.id) === id));
    });
  }

  async function syncZeffy(hub, btn) {
    const cfg = A.SUPABASE || {};
    btn.disabled = true; btn.textContent = "Syncing…";
    try {
      // Same call shape as the 50/50 Raffle view's sync button.
      const res = await fetch(cfg.url.replace(/\/$/, "") + "/functions/v1/zeffy-sync", { method: "POST", headers: { "Content-Type": "application/json", apikey: cfg.anonKey || "" } });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out.ok) flash = { ok: false, text: "Zeffy sync failed: " + (out.error || out.detail || res.status) };
      else {
        const c = out.crm || {};
        flash = c.error ? { ok: false, text: `Synced ${out.synced} Zeffy payments, but the donor step failed: ${c.error}` }
          : { ok: true, text: `Synced ${out.synced} Zeffy payments — ${c.donors_created || 0} new donors, ${c.gifts_added || 0} new gifts, ${c.donors_updated || 0} donor totals updated${c.skipped_no_email ? `, ${c.skipped_no_email} payments had no email` : ""}.` };
      }
    } catch (e) { flash = { ok: false, text: "Couldn't reach zeffy-sync — deploy it (supabase functions deploy zeffy-sync --no-verify-jwt)" }; }
    render(hub);
  }

  async function openHistory(hub, d) {
    const { data } = await hub.db().from("donations").select("gift_date,amount,campaign,method,source,note").eq("donor_id", d.id).order("gift_date", { ascending: false }).limit(500);
    modal(`<h3>${esc(d.full_name)}</h3><div class="text-soft" style="font-size:.88rem">${esc(d.email || "")}${d.phone ? " · " + esc(d.phone) : ""} · lifetime ${usd(d.total_given)}</div>`,
      `<div class="table-wrap"><table class="data"><thead><tr><th>Date</th><th>Amount</th><th>Fundraiser</th><th>How</th></tr></thead><tbody>${(data || []).map((g) =>
        `<tr><td>${esc(g.gift_date || "")}</td><td>${usd(g.amount)}</td><td>${esc(g.campaign || "General")}</td><td>${esc(g.source || g.method || "")}${g.note ? `<div class="muted">${esc(g.note)}</div>` : ""}</td></tr>`).join("")}</tbody></table></div>`);
  }

  function modal(head, body) {
    document.querySelectorAll(".dg-modal").forEach((n) => n.remove());
    const w = document.createElement("div");
    w.className = "modal-backdrop dg-modal";
    w.innerHTML = `<div class="modal-card" style="max-width:760px"><div class="modal-head"><div>${head}</div><button class="modal-x" data-x>×</button></div><div style="overflow-y:auto;padding:1rem 1.4rem">${body}</div></div>`;
    document.body.appendChild(w);
    const close = () => w.remove();
    w.querySelector("[data-x]").onclick = close;
    w.addEventListener("click", (e) => { if (e.target === w) close(); });
    return w;
  }

  /* ---- CSV import (GoFundMe or any platform export) ------------------------- */
  function parseCsv(text) {
    const out = []; let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
      else if (ch === '"') q = true;
      else if (ch === ",") { row.push(cell); cell = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); cell = ""; if (row.some((c) => c.trim())) out.push(row); row = []; }
      else cell += ch;
    }
    row.push(cell); if (row.some((c) => c.trim())) out.push(row);
    return out;
  }
  const findCol = (hdr, ...pats) => hdr.findIndex((h) => pats.some((p) => p.test(h)));
  function mapColumns(hdr) {
    const h = hdr.map((x) => x.trim().toLowerCase());
    return {
      name: findCol(h, /^(donor )?name$/, /full name/, /donor$/, /^name/),
      first: findCol(h, /first/), last: findCol(h, /last/),
      email: findCol(h, /e-?mail/),
      amount: findCol(h, /^(donation )?amount/, /amount/, /^gross/, /total/),
      date: findCol(h, /date/, /created/, /time/),
    };
  }
  const money = (s) => Number(String(s || "").replace(/[^0-9.\-]/g, "")) || 0;
  const toDate = (s) => { const d = new Date(s); return isNaN(d) ? null : d.toISOString().slice(0, 10); };
  function hash(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }

  function openImport(hub, donors) {
    const w = modal(`<h3>Import donations from a CSV</h3><div class="text-soft" style="font-size:.88rem">GoFundMe: your campaign dashboard → Donations → Download. Any CSV with name/email/amount/date works.</div>`,
      `<div class="field-row">
        <div class="field"><label>Platform</label><select id="im-src"><option value="gofundme">GoFundMe</option><option value="facebook">Facebook fundraiser</option><option value="instagram">Instagram</option><option value="youtube">YouTube Giving</option><option value="tiktok">TikTok</option><option value="event">Event / cash</option><option value="other">Other</option></select></div>
        <div class="field"><label>Fundraiser name</label><input id="im-camp" value="GoFundMe"></div></div>
      <div class="field"><label>CSV file</label><input type="file" id="im-file" accept=".csv,text/csv"></div>
      <div id="im-preview"></div>`);
    const src = w.querySelector("#im-src"), camp = w.querySelector("#im-camp");
    src.onchange = () => { camp.value = src.selectedOptions[0].textContent; };
    w.querySelector("#im-file").onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const rows = parseCsv(await file.text());
      if (rows.length < 2) { w.querySelector("#im-preview").innerHTML = `<p style="color:#b42318">That file has no data rows.</p>`; return; }
      const hdr = rows[0], m = mapColumns(hdr), data = rows.slice(1);
      const pick = (r, i) => (i >= 0 ? String(r[i] || "").trim() : "");
      const recs = data.map((r, i) => ({
        name: pick(r, m.name) || [pick(r, m.first), pick(r, m.last)].filter(Boolean).join(" ") || "Anonymous",
        email: pick(r, m.email).toLowerCase(), amount: money(pick(r, m.amount)), date: toDate(pick(r, m.date)), row: i,
      })).filter((r) => r.amount > 0);
      const colName = (i) => (i >= 0 ? esc(hdr[i]) : "<i>not found</i>");
      w.querySelector("#im-preview").innerHTML = `
        <p style="font-size:.88rem">Columns found — name: <b>${m.name >= 0 ? colName(m.name) : `${colName(m.first)} + ${colName(m.last)}`}</b> · email: <b>${colName(m.email)}</b> · amount: <b>${colName(m.amount)}</b> · date: <b>${colName(m.date)}</b></p>
        ${m.amount < 0 ? `<p style="color:#b42318">No amount column found — rename the amount column to "Amount" and try again.</p>` : `
        <p><b>${recs.length}</b> donations totaling <b>${usd(recs.reduce((s, r) => s + r.amount, 0))}</b>. First few:</p>
        <table class="data"><tbody>${recs.slice(0, 5).map((r) => `<tr><td>${esc(r.name)}</td><td>${esc(r.email || "—")}</td><td>${usd(r.amount)}</td><td>${esc(r.date || "")}</td></tr>`).join("")}</tbody></table>
        <p class="text-soft" style="font-size:.82rem">Donors are matched by email (then by exact name); new ones are added to the CRM. Re-importing the same file won't double-count.</p>
        <button class="btn btn-primary" id="im-go">Import ${recs.length} donations</button>`}`;
      const go = w.querySelector("#im-go");
      if (go) go.onclick = async () => {
        go.disabled = true; go.textContent = "Importing…";
        try {
          const n = await doImport(hub, donors, recs, src.value, camp.value.trim() || src.selectedOptions[0].textContent, file.name);
          flash = { ok: true, text: `Imported ${n.gifts} donations (${usd(n.total)}) from ${camp.value} — ${n.created} new donors${n.skipped ? `, ${n.skipped} already imported` : ""}.` };
          w.remove(); render(hub);
        } catch (err) { go.disabled = false; go.textContent = "Try again"; hub.toast("Import failed: " + (err.message || err)); }
      };
    };
  }

  async function doImport(hub, donors, recs, source, campaign, fileName) {
    const db = hub.db();
    const byEmail = new Map(donors.filter((d) => d.email).map((d) => [String(d.email).toLowerCase(), d]));
    const byName = new Map(donors.map((d) => [String(d.full_name).toLowerCase(), d]));
    const create = new Map();
    for (const r of recs) {
      if ((r.email && byEmail.has(r.email)) || (!r.email && byName.has(r.name.toLowerCase())) || r.name === "Anonymous") continue;
      const key = r.email || "name:" + r.name.toLowerCase();
      if (!create.has(key)) create.set(key, { full_name: r.name, email: r.email || null, type: "individual", stage: "active", source: campaign, tags: source });
    }
    const newRows = [...create.values()];
    for (let i = 0; i < newRows.length; i += 500) {
      const { data, error } = await db.from("donors").insert(newRows.slice(i, i + 500)).select("id,full_name,email");
      if (error) throw error;
      (data || []).forEach((d) => { if (d.email) byEmail.set(d.email.toLowerCase(), d); byName.set(d.full_name.toLowerCase(), d); });
    }
    const keyOf = (r) => source + ":" + hash([campaign, r.date, r.amount, r.email, r.name, r.row].join("|"));
    const keys = recs.map(keyOf);
    const { data: existing } = await db.from("donations").select("import_key").in("import_key", keys.slice(0, 1000));
    const have = new Set((existing || []).map((x) => x.import_key));
    const gifts = recs.map((r, i) => ({ r, k: keys[i] })).filter(({ k }) => !have.has(k)).map(({ r, k }) => {
      const d = (r.email && byEmail.get(r.email)) || (r.name !== "Anonymous" && byName.get(r.name.toLowerCase())) || null;
      return { donor_id: d ? d.id : null, donor_name: r.name, amount: r.amount, gift_date: r.date || new Date().toISOString().slice(0, 10),
        method: source, source, campaign, import_key: k, note: "Imported from " + fileName };
    });
    for (let i = 0; i < gifts.length; i += 500) { const { error } = await db.from("donations").insert(gifts.slice(i, i + 500)); if (error) throw error; }
    await db.rpc("refresh_donor_totals");
    return { gifts: gifts.length, total: gifts.reduce((s, g) => s + g.amount, 0), created: newRows.length, skipped: recs.length - gifts.length };
  }

  function exportCsv(rows, byDonor, campaigns) {
    const q = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
    const lines = [["Name", "Email", "Phone", "Type", "Stage", "Total given", "Last gift date", "Last gift amount", ...campaigns].map(q).join(",")];
    for (const d of rows) {
      const per = Object.fromEntries((byDonor[d.id] || []).map((p) => [p.campaign, p.total]));
      lines.push([d.full_name, d.email, d.phone, d.type, d.stage, d.total_given, d.last_gift_date, d.last_gift_amount, ...campaigns.map((c) => per[c] || "")].map(q).join(","));
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    const t = new Date(), p2 = (n) => String(n).padStart(2, "0");
    a.download = `donor-giving_${t.getFullYear()}-${p2(t.getMonth() + 1)}-${p2(t.getDate())}_${p2(t.getHours())}${p2(t.getMinutes())}.csv`;
    a.click();
  }

  A.registerPlugin({
    id: "donor-giving",
    titles: { donor_giving: "Donor Giving" },
    roles: { board: ["donor_giving"], staff: ["donor_giving"] },
    views: { donor_giving: render },
    nav: [{ group: "Fundraising", items: [["donor_giving", "Donor Giving", ICON]] }],
  });
})();
