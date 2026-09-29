/* ============================================================================
   Jacks of All Trades — In-Kind Needs (Command Center plugin)
   File: assets/js/inkind.plugin.js
   Generated: 2026-09-30 00:45 UTC

   The in-kind donations category: create a specific need for a project, e.g.
   "48 replacement windows (~$250 each) — or $12,000 cash for installation",
   then track every business approached for it:
     • Progress per need — items pledged of items needed, $ value, cash pledged,
       businesses targeted / contacted / replied / said yes.
     • Find businesses now — Cole (donors-agents, {need_id}) researches real
       Detroit-area window companies / suppliers and drafts need-specific asks
       (drafts land in Outreach as "planned"; a person reviews and sends).
     • Need detail — each business with its latest outreach status; mark
       replied / no response, open the donor profile, add a business by hand.
     • Record pledge — items (in-kind, with quantity) or cash toward the need.
     • Pause / reopen / mark fulfilled.

   Data: inkind_needs, inkind_need_progress (view), donors, outreach, donations
   Setup: supabase/setup_inkind_needs_2026-09-30_0030.sql
   ========================================================================== */
(function () {
  "use strict";
  const A = (window.JOAT = window.JOAT || {});
  if (!A.registerPlugin) { console.warn("[inkind] Command Center core not loaded"); return; }

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
  const usd = (n) => "$" + Math.round(Number(n) || 0).toLocaleString();
  const num = (n) => (Number(n) || 0).toLocaleString();
  const pct = (a, b) => (b ? Math.min(100, (a / b) * 100) : 0);
  const today = () => new Date().toISOString().slice(0, 10);
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18M3 12h18"/></svg>';
  const STATUS_COLOR = { open: "#1d4ed8", fulfilled: "#12805c", paused: "#6b7280" };

  let flash = null, showClosed = false;

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

  async function load(hub) {
    const db = hub.db();
    const [n, p] = await Promise.all([
      db.from("inkind_needs").select("*").order("created_at", { ascending: true }),
      db.from("inkind_need_progress").select("*"),
    ]);
    const prog = {};
    (p.data || []).forEach((r) => { prog[r.need_id] = r; });
    return { needs: n.data || [], prog, error: n.error || p.error };
  }

  const bar = (v, target, color) => `<div style="height:10px;border-radius:8px;background:#e6e8ec;overflow:hidden;margin:.3rem 0">
      <div style="height:100%;width:${pct(v, target)}%;background:${color}"></div></div>`;

  async function render(hub) {
    const view = hub.el();
    if (!hub.db()) { view.innerHTML = `<div class="panel"><div class="panel-body">Sign in to the live hub to see in-kind needs.</div></div>`; return; }
    const { needs, prog, error } = await load(hub);
    const open = needs.filter((n) => n.status === "open");
    const list = showClosed ? needs : open;
    const tot = needs.reduce((s, n) => { const p = prog[n.id] || {}; s.value += Number(p.value_pledged) || 0; s.targeted += Number(p.targeted) || 0; s.yes += Number(p.said_yes) || 0; return s; }, { value: 0, targeted: 0, yes: 0 });

    view.innerHTML = `
      <div class="view-head"><div><h2 style="margin:0">In-Kind Needs</h2>
        <p>Materials and services we're asking businesses to donate — or sponsor in cash. Cole finds local suppliers for each open need and drafts the asks; you review and send from Outreach.</p></div>
        <div style="display:flex;gap:.4rem;flex-wrap:wrap"><button class="btn btn-primary" id="ik-new">+ New need</button></div></div>
      ${error ? `<div class="panel" style="border-left:4px solid #b42318"><div class="panel-body">Couldn't load in-kind needs: ${esc(error.message)}.<br>
        Run <code>supabase/setup_inkind_needs_2026-09-30_0030.sql</code> in the Supabase SQL Editor, then reload.</div></div>` : ""}
      ${flash ? `<div class="panel" style="border-left:4px solid ${flash.ok ? "#12805c" : "#b42318"}"><div class="panel-body">${flash.ok ? "✅" : "❌"} ${esc(flash.text)}</div></div>` : ""}
      <div class="kpis">
        ${hub.kpi("Open needs", open.length, "campaigns", "")}
        ${hub.kpi("Pledged (items + cash)", usd(tot.value), "heart", "")}
        ${hub.kpi("Businesses targeted", num(tot.targeted), "users", "")}
        ${hub.kpi("Businesses said yes", num(tot.yes), "ticket", "")}
      </div>
      <div class="panel"><div class="panel-head" style="gap:.5rem;flex-wrap:wrap"><h3>Needs</h3>
        <label class="text-soft" style="display:flex;gap:.35rem;align-items:center;font-size:.85rem"><input type="checkbox" id="ik-closed" ${showClosed ? "checked" : ""}> Show fulfilled / paused</label></div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Need</th><th>Items pledged</th><th>Cash / value</th><th>Businesses</th><th></th></tr></thead>
          <tbody>${list.map((n) => {
            const p = prog[n.id] || {}, qty = Number(p.qty_pledged) || 0, need = Number(n.quantity_needed) || 0;
            const itemValue = need * (Number(n.unit_value) || 0);
            return `<tr data-id="${esc(n.id)}">
              <td style="min-width:240px;max-width:360px"><a href="javascript:void 0" data-open style="font-weight:800">${esc(n.title)}</a>
                <span class="pill" style="margin-left:.3rem;background:${STATUS_COLOR[n.status] || "#6b7280"};color:#fff">${esc(n.status)}</span>
                <div class="muted">${esc(n.campaign || "No campaign")}${n.campaign_phase ? ` · Phase ${esc(n.campaign_phase)}` : ""}</div>
                <div class="muted">Ask: ${num(need)} ${esc(n.unit)}${n.unit_value ? ` (~${usd(n.unit_value)} each = ${usd(itemValue)})` : ""}${n.cash_alternative ? ` — or ${usd(n.cash_alternative)} for ${esc(n.cash_label || "the need")}` : ""}</div></td>
              <td style="white-space:nowrap"><b>${num(qty)}</b> of ${num(need)} ${esc(n.unit)}${bar(qty, need, qty >= need ? "#12805c" : "#b45309")}</td>
              <td style="white-space:nowrap">${usd(p.value_pledged)} pledged${Number(p.cash_pledged) ? `<div class="muted">${usd(p.cash_pledged)} cash</div>` : ""}${n.cash_alternative ? `<div class="muted">cash goal ${usd(n.cash_alternative)}</div>` : ""}</td>
              <td style="white-space:nowrap;font-size:.85rem">${num(p.targeted)} of ${num(n.target_businesses)} found<br>${num(p.contacted)} contacted · ${num(p.replied)} replied · <b>${num(p.said_yes)} yes</b></td>
              <td><div style="display:flex;flex-direction:column;gap:.3rem;align-items:stretch"><button class="btn btn-primary btn-sm" data-open>Open</button>
                ${n.status === "open" ? `<button class="btn btn-ghost btn-sm" data-find>Find businesses now</button>` : ""}
                <button class="btn btn-ghost btn-sm" data-pledge>Record pledge</button></div></td></tr>`;
          }).join("") || `<tr><td colspan="5" class="text-soft" style="padding:1.2rem">No ${showClosed ? "" : "open "}needs yet — click <b>+ New need</b> (e.g. 48 windows, or $12,000 for installation).</td></tr>`}</tbody>
        </table></div></div>`;

    const byId = (tr) => needs.find((n) => String(n.id) === tr.closest("tr").dataset.id);
    view.querySelector("#ik-new").onclick = () => openNeedForm(hub, null);
    view.querySelector("#ik-closed").onchange = (e) => { showClosed = e.target.checked; render(hub); };
    view.querySelectorAll("tr[data-id] [data-open]").forEach((b) => b.onclick = () => openNeed(hub, byId(b)));
    view.querySelectorAll("tr[data-id] [data-pledge]").forEach((b) => b.onclick = () => openPledge(hub, byId(b)));
    view.querySelectorAll("tr[data-id] [data-find]").forEach((b) => b.onclick = () => findNow(hub, byId(b), b));
  }

  async function findNow(hub, n, btn) {
    btn.disabled = true; btn.textContent = "Cole is researching… (1–3 min)";
    try {
      const out = await callFn(hub, "donors-agents", { trigger: "hub", need_id: n.id });
      flash = { ok: true, text: `${n.title}: ${out.summary || "done"} Drafts are in Outreach as "planned" — review and send.` };
    } catch (e) { flash = { ok: false, text: `${n.title}: ${e.message || e}` }; }
    render(hub);
  }

  function modal(title, inner, maxW) {
    document.querySelectorAll(".ik-modal").forEach((m) => m.remove());
    const wrap = document.createElement("div");
    wrap.className = "modal-backdrop ik-modal";
    wrap.innerHTML = `<div class="modal-card" style="max-width:${maxW || 560}px;min-width:0">
      <div class="modal-head"><h3>${esc(title)}</h3><button class="modal-x" data-x aria-label="Close">×</button></div>
      <div style="overflow-y:auto;padding:1.2rem 1.4rem">${inner}</div></div>`;
    document.body.appendChild(wrap);
    return wrap;
  }

  async function openNeedForm(hub, n) {
    const { data: camps } = await hub.db().from("partner_campaigns").select("name").limit(50).then((r) => r, () => ({ data: [] }));
    const v = n || { unit: "units", target_businesses: 12, status: "open" };
    const campOpts = [...new Set([...(camps || []).map((c) => c.name), v.campaign].filter(Boolean))];
    const w = modal(n ? "Edit need" : "New in-kind need", `<form>
      <div class="field"><label>Title</label><input name="title" required value="${esc(v.title || "")}" placeholder="48 replacement windows"></div>
      <div class="field-row">
        <div class="field"><label>Item</label><input name="item" required value="${esc(v.item || "")}" placeholder="replacement windows"></div>
        <div class="field"><label>Quantity needed</label><input name="quantity_needed" type="number" min="1" step="any" required value="${esc(v.quantity_needed || "")}"></div>
        <div class="field"><label>Unit</label><input name="unit" required value="${esc(v.unit || "")}" placeholder="windows"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Est. value per unit ($)</label><input name="unit_value" type="number" min="0" step="any" value="${esc(v.unit_value || "")}"></div>
        <div class="field"><label>Cash alternative ($)</label><input name="cash_alternative" type="number" min="0" step="any" value="${esc(v.cash_alternative || "")}" placeholder="12000"></div>
        <div class="field"><label>Cash is for</label><input name="cash_label" value="${esc(v.cash_label || "")}" placeholder="window installation"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Project / campaign</label><input name="campaign" list="ik-camps" value="${esc(v.campaign || "")}" placeholder="4 Bed / 2 Bath Community Renovation">
          <datalist id="ik-camps">${campOpts.map((c) => `<option value="${esc(c)}">`).join("")}</datalist></div>
        <div class="field"><label>Phase</label><input name="campaign_phase" type="number" min="1" value="${esc(v.campaign_phase || "")}"></div>
      </div>
      <div class="field"><label>Businesses to approach</label><input name="business_types" value="${esc(v.business_types || "")}" placeholder="window manufacturers; window & door distributors; installers; building supply stores"></div>
      <div class="field"><label>Specs / details for the ask</label><textarea name="specs" rows="2" placeholder="Sizes, style, energy rating…">${esc(v.specs || "")}</textarea></div>
      <div class="field-row">
        <div class="field"><label>Businesses for Cole to line up</label><input name="target_businesses" type="number" min="1" max="100" value="${esc(v.target_businesses || 12)}"></div>
        <div class="field"><label>Status</label><select name="status">${["open", "paused", "fulfilled"].map((s) => `<option ${v.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></div>
      </div>
      <div class="modal-actions">${n ? `<button type="button" class="btn btn-ghost" data-del style="color:#b42318;margin-right:auto">Delete</button>` : ""}
        <button type="button" class="btn btn-ghost" data-x>Cancel</button><button class="btn btn-primary" type="submit">${n ? "Save" : "Create need"}</button></div>
    </form>`, 640);
    const f = w.querySelector("form");
    const close = () => { w.remove(); render(hub); };
    w.querySelectorAll("[data-x]").forEach((b) => b.onclick = () => w.remove());
    w.addEventListener("click", (e) => { if (e.target === w) w.remove(); });
    const del = w.querySelector("[data-del]");
    if (del) del.onclick = async () => {
      if (!confirm(`Delete "${n.title}"? Businesses, outreach and pledges stay, just untagged from this need.`)) return;
      const { error } = await hub.db().from("inkind_needs").delete().eq("id", n.id);
      if (error) return hub.toast("Delete failed: " + error.message);
      hub.toast("Need deleted"); close();
    };
    f.onsubmit = async (e) => {
      e.preventDefault();
      const nz = (x) => (x === "" ? null : Number(x));
      const row = {
        title: f.title.value.trim(), item: f.item.value.trim(), unit: f.unit.value.trim() || "units",
        quantity_needed: Number(f.quantity_needed.value), unit_value: nz(f.unit_value.value), cash_alternative: nz(f.cash_alternative.value),
        cash_label: f.cash_label.value.trim() || null, campaign: f.campaign.value.trim() || null, campaign_phase: nz(f.campaign_phase.value),
        business_types: f.business_types.value.trim() || null, specs: f.specs.value.trim() || null,
        target_businesses: Number(f.target_businesses.value) || 12, status: f.status.value,
      };
      const q = n ? hub.db().from("inkind_needs").update(row).eq("id", n.id) : hub.db().from("inkind_needs").insert(row);
      const { error } = await q;
      if (error) return hub.toast("Save failed: " + error.message);
      hub.toast(n ? "Need saved" : "Need created — click Find businesses now, or Cole picks it up on the next run");
      close();
    };
  }

  async function openNeed(hub, n) {
    const db = hub.db();
    const [pr, dr, or, gr] = await Promise.all([
      db.from("inkind_need_progress").select("*").eq("need_id", n.id).maybeSingle(),
      db.from("donors").select("id,full_name,email,phone,stage,notes").eq("need_id", n.id).limit(500),
      db.from("outreach").select("id,donor_id,status,subject,created_at,channel").eq("need_id", n.id).order("created_at", { ascending: false }).limit(2000),
      db.from("donations").select("donor_id,donor_name,amount,quantity,method,gift_date,note").eq("need_id", n.id).order("gift_date", { ascending: false }).limit(500),
    ]);
    const p = pr.data || {}, biz = dr.data || [], outs = or.data || [], gifts = gr.data || [];
    const latest = {};
    outs.forEach((o) => { if (!latest[o.donor_id]) latest[o.donor_id] = o; });
    const gaveBy = {};
    gifts.forEach((g) => { (gaveBy[g.donor_id] = gaveBy[g.donor_id] || []).push(g); });
    const rank = (d) => (gaveBy[d.id] ? 0 : latest[d.id] ? { replied: 1, converted: 1, sent: 2, planned: 3, no_response: 4 }[latest[d.id].status] || 3 : 5);
    biz.sort((a, b) => rank(a) - rank(b) || String(a.full_name).localeCompare(String(b.full_name)));
    const qty = Number(p.qty_pledged) || 0, need = Number(n.quantity_needed) || 0;

    const w = modal(n.title, `
      <div style="display:flex;gap:1.2rem;flex-wrap:wrap;margin-bottom:.6rem">
        <div><div class="text-soft" style="font-size:.8rem">Items pledged</div><b style="font-size:1.2rem">${num(qty)} of ${num(need)} ${esc(n.unit)}</b>${bar(qty, need, qty >= need ? "#12805c" : "#b45309")}</div>
        <div><div class="text-soft" style="font-size:.8rem">Value pledged</div><b style="font-size:1.2rem">${usd(p.value_pledged)}</b>${n.cash_alternative ? `<div class="muted">${usd(p.cash_pledged)} cash of ${usd(n.cash_alternative)} for ${esc(n.cash_label || "the need")}</div>` : ""}</div>
        <div><div class="text-soft" style="font-size:.8rem">Businesses</div><b>${num(p.targeted)} found · ${num(p.contacted)} contacted · ${num(p.replied)} replied · ${num(p.said_yes)} yes</b></div>
      </div>
      ${n.specs ? `<p class="text-soft" style="margin:.2rem 0 .6rem">Specs: ${esc(n.specs)}</p>` : ""}
      <div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:.6rem">
        <button class="btn btn-primary btn-sm" data-pledge>Record pledge</button>
        <button class="btn btn-ghost btn-sm" data-add>+ Add a business</button>
        <button class="btn btn-ghost btn-sm" data-edit>Edit need</button>
        ${n.status === "open" ? `<button class="btn btn-ghost btn-sm" data-st="fulfilled">Mark fulfilled</button><button class="btn btn-ghost btn-sm" data-st="paused">Pause</button>`
          : `<button class="btn btn-ghost btn-sm" data-st="open">Reopen</button>`}
      </div>
      <form data-addform style="display:none;border:1px solid var(--border,#e6e8ec);border-radius:12px;padding:.7rem;margin-bottom:.6rem">
        <div class="field-row"><div class="field"><label>Business name</label><input name="name" required></div>
          <div class="field"><label>Email</label><input name="email" type="email"></div><div class="field"><label>Phone</label><input name="phone"></div></div>
        <div class="modal-actions"><button class="btn btn-primary btn-sm" type="submit">Add to this need</button></div></form>
      <div class="table-wrap"><table class="data">
        <thead><tr><th>Business</th><th>Latest outreach</th><th>Pledged</th><th></th></tr></thead>
        <tbody>${biz.map((d) => {
          const o = latest[d.id], g = gaveBy[d.id] || [];
          const gq = g.reduce((s, x) => s + (Number(x.quantity) || 0), 0), gv = g.reduce((s, x) => s + (Number(x.amount) || 0), 0);
          return `<tr data-did="${esc(d.id)}">
            <td><a href="javascript:void 0" data-prof style="font-weight:700">${esc(d.full_name)}</a><div class="muted">${esc(d.email || d.phone || "no contact yet")}</div></td>
            <td>${o ? `<span class="tag">${esc(o.status)}</span><div class="muted">${esc(String(o.created_at || "").slice(0, 10))} · ${esc(o.subject || o.channel || "")}</div>` : `<span class="text-soft">not drafted yet</span>`}</td>
            <td style="white-space:nowrap">${g.length ? `<b>${gq ? `${num(gq)} ${esc(n.unit)} · ` : ""}${usd(gv)}</b>` : "—"}</td>
            <td style="white-space:nowrap">${o && ["sent", "planned", "no_response"].includes(o.status) ? `<button class="btn btn-ghost btn-sm" data-mark="replied">Replied</button>` : ""}
              ${o && o.status === "sent" ? `<button class="btn btn-ghost btn-sm" data-mark="no_response">No response</button>` : ""}
              <button class="btn btn-ghost btn-sm" data-yes>Said yes</button></td></tr>`;
        }).join("") || `<tr><td colspan="4" class="text-soft" style="padding:1rem">No businesses yet — close this and click <b>Find businesses now</b>, or add one by hand.</td></tr>`}</tbody>
      </table></div>
      ${gifts.length ? `<h4 style="margin:1rem 0 .3rem">Pledges</h4><div class="table-wrap"><table class="data"><thead><tr><th>Date</th><th>From</th><th>What</th><th>Value</th></tr></thead><tbody>
        ${gifts.map((g) => `<tr><td>${esc(g.gift_date || "")}</td><td>${esc(g.donor_name || "")}</td><td>${g.quantity ? `${num(g.quantity)} ${esc(n.unit)}` : esc(g.method)}${g.note ? `<div class="muted">${esc(g.note)}</div>` : ""}</td><td>${usd(g.amount)}</td></tr>`).join("")}</tbody></table></div>` : ""}
    `, 860);

    const reopen = () => { w.remove(); openNeed(hub, n); };
    w.querySelectorAll("[data-x]").forEach((b) => b.onclick = () => { w.remove(); render(hub); });
    w.addEventListener("click", (e) => { if (e.target === w) { w.remove(); render(hub); } });
    w.querySelector("[data-pledge]").onclick = () => { w.remove(); openPledge(hub, n, null, biz); };
    w.querySelector("[data-edit]").onclick = () => { w.remove(); openNeedForm(hub, n); };
    w.querySelectorAll("[data-st]").forEach((b) => b.onclick = async () => {
      const { error } = await db.from("inkind_needs").update({ status: b.dataset.st }).eq("id", n.id);
      if (error) return hub.toast("Update failed: " + error.message);
      n.status = b.dataset.st; hub.toast("Need is now " + n.status); reopen();
    });
    const af = w.querySelector("[data-addform]");
    w.querySelector("[data-add]").onclick = () => { af.style.display = af.style.display === "none" ? "block" : "none"; if (af.style.display === "block") af.name.focus(); };
    af.onsubmit = async (e) => {
      e.preventDefault();
      const { error } = await db.from("donors").insert({ full_name: af.name.value.trim(), email: af.email.value.trim() || null, phone: af.phone.value.trim() || null,
        type: "corporate", stage: "prospect", need_id: n.id, partner_campaign: n.campaign || null, campaign_phase: n.campaign_phase || null,
        source: "In-kind need: " + n.title, tags: "corporate, in-kind need, " + n.item });
      if (error) return hub.toast("Add failed: " + error.message);
      hub.toast("Added — Cole drafts the ask on the next run (or Find businesses now)"); reopen();
    };
    w.querySelectorAll("tr[data-did]").forEach((tr) => {
      const d = biz.find((x) => String(x.id) === tr.dataset.did);
      tr.querySelector("[data-prof]").onclick = () => { if (A.donorProfile) { w.remove(); A.donorProfile.open(d.id, "outreach"); } };
      tr.querySelectorAll("[data-mark]").forEach((b) => b.onclick = async () => {
        const o = latest[d.id];
        const { error } = await db.from("outreach").update({ status: b.dataset.mark }).eq("id", o.id);
        if (error) return hub.toast("Update failed: " + error.message);
        hub.toast(`${d.full_name}: ${b.dataset.mark.replace("_", " ")}`); reopen();
      });
      tr.querySelector("[data-yes]").onclick = () => { w.remove(); openPledge(hub, n, d.id, biz); };
    });
  }

  async function openPledge(hub, n, donorId, biz) {
    const db = hub.db();
    if (!biz) biz = ((await db.from("donors").select("id,full_name").eq("need_id", n.id).limit(500)).data) || [];
    biz = [...biz].sort((a, b) => String(a.full_name).localeCompare(String(b.full_name)));
    const w = modal("Record pledge — " + n.title, `<form>
      <div class="field"><label>Business / donor</label><select name="donor">
        ${biz.map((b) => `<option value="${esc(b.id)}" ${String(b.id) === String(donorId) ? "selected" : ""}>${esc(b.full_name)}</option>`).join("")}
        <option value="" ${biz.length ? "" : "selected"}>— Other (type name below) —</option></select></div>
      <div class="field"><label>Other name</label><input name="other" placeholder="Only if not in the list"></div>
      <div class="field"><label>They're giving</label><select name="kind">
        <option value="items">${esc(n.unit)} (in-kind)</option><option value="cash">Cash toward ${esc(n.cash_label || n.item)}</option></select></div>
      <div class="field-row">
        <div class="field" data-qty><label>How many ${esc(n.unit)}</label><input name="quantity" type="number" min="0" step="any"></div>
        <div class="field"><label>Value ($)</label><input name="amount" type="number" min="0" step="any" required></div>
      </div>
      <div class="field"><label>Note</label><input name="note" placeholder="e.g. delivering in 3 weeks; white vinyl double-hung"></div>
      <div class="modal-actions"><button type="button" class="btn btn-ghost" data-x>Cancel</button><button class="btn btn-primary" type="submit">Save pledge</button></div>
    </form>`);
    const f = w.querySelector("form");
    const close = () => { w.remove(); render(hub); };
    w.querySelectorAll("[data-x]").forEach((b) => b.onclick = close);
    w.addEventListener("click", (e) => { if (e.target === w) close(); });
    const syncKind = () => { w.querySelector("[data-qty]").style.display = f.kind.value === "items" ? "" : "none"; };
    f.kind.onchange = syncKind; syncKind();
    f.quantity.oninput = () => { if (n.unit_value && f.quantity.value) f.amount.value = Math.round(Number(f.quantity.value) * Number(n.unit_value)); };
    f.onsubmit = async (e) => {
      e.preventDefault();
      const items = f.kind.value === "items", quantity = items ? Number(f.quantity.value) || null : null, amount = Number(f.amount.value) || 0;
      if (items && !quantity) return hub.toast(`Enter how many ${n.unit}`);
      let id = f.donor.value, name = id ? f.donor.selectedOptions[0].textContent : f.other.value.trim();
      if (!name) return hub.toast("Pick a business or type its name");
      try {
        if (!id) {
          const { data, error } = await db.from("donors").insert({ full_name: name, type: "corporate", stage: "active", need_id: n.id,
            partner_campaign: n.campaign || null, campaign_phase: n.campaign_phase || null, source: "In-kind need: " + n.title }).select().single();
          if (error) throw error; id = data.id;
        }
        const { error } = await db.from("donations").insert({ donor_id: id, donor_name: name, amount, method: items ? "in_kind" : "check", gift_date: today(),
          campaign: n.campaign || "In-kind: " + n.title, campaign_phase: n.campaign_phase || null, need_id: n.id, quantity,
          note: [items ? `${quantity} ${n.unit} (${n.item})` : `Cash toward ${n.cash_label || n.item}`, f.note.value.trim()].filter(Boolean).join(" — ") });
        if (error) throw error;
        await db.from("donors").update({ stage: "active" }).eq("id", id);
        await db.from("outreach").update({ status: "converted" }).eq("donor_id", id).eq("need_id", n.id).in("status", ["sent", "replied", "no_response"]);
        try { await db.rpc("refresh_donor_totals"); } catch (e) {}
        hub.toast("Pledge saved — Cole drafts the thank-you on the next run");
        close();
      } catch (err) { hub.toast("Save failed: " + (err.message || err)); }
    };
  }

  A.registerPlugin({
    id: "inkind",
    titles: { inkind: "In-Kind Needs" },
    roles: { board: ["inkind"], staff: ["inkind"] },
    views: { inkind: render },
    nav: [{ group: "Fundraising", items: [["inkind", "In-Kind Needs", ICON]] }],
  });
})();
