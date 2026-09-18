/* ============================================================================
   Jacks of All Trades — Email Center (Command Center plugin)
   File: assets/js/email-center.plugin.js
   Generated: 2026-09-18 17:02 UTC

   A single place for staff to read everyone who reached out through the website
   and follow up by email — without leaving the hub.

     • Inbox pane  — merges every inbound-lead table (contact messages,
                     enrollment, volunteer, partnership, newsletter) into one
                     time-ordered list you can search.
     • Reader      — the full message, who sent it, and when.
     • Reply / New — a composer that sends from the org's verified domain via
                     the existing `send-email` Edge Function (Resend). Sending a
                     reply marks that message "replied" so nothing slips.

   Sending requires: a signed-in Command Center user, the `send-email` function
   deployed, and RESEND_API_KEY + EMAIL_FROM set as Supabase secrets. Until then
   the composer runs in a safe simulate mode and tells you exactly what's needed.

   To disable, remove the <script src=".../email-center.plugin.js"> tag.
   ========================================================================== */
(function () {
  "use strict";
  const A = (window.JOAT = window.JOAT || {});
  if (!A.registerPlugin) { console.warn("[email-center] Command Center core not loaded"); return; }

  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4zM4 6l8 6 8-6"/></svg>';

  // Inbound-lead tables and how to read a person + message out of each row,
  // written defensively so it works whatever the exact column set turns out
  // to be. `status` is the column we flip to "replied" when it exists.
  const SOURCES = {
    contact_messages:        { label: "Contact",     status: "status" },
    enrollment_applications: { label: "Enrollment",  status: "status" },
    volunteer_signups:       { label: "Volunteer",   status: "status" },
    partnership_inquiries:   { label: "Partnership", status: "status" },
    newsletter_signups:      { label: "Newsletter",  status: "status" },
  };

  const pick = (r, keys) => { for (const k of keys) if (r[k] != null && r[k] !== "") return r[k]; return ""; };

  function normalize(table, r) {
    const meta = SOURCES[table];
    const name  = pick(r, ["full_name", "name", "contact_name", "organization", "org_name"]) || (r.email || "Unknown");
    const email = pick(r, ["email", "contact_email"]);
    const topic = pick(r, ["topic", "subject", "trade", "program", "interest", "partnership_type", "role"]) || meta.label;
    const body  = pick(r, ["message", "details", "notes", "comments", "interest", "availability", "reason"]);
    const status = meta.status && r[meta.status] ? String(r[meta.status]) : "new";
    return { table, id: r.id, source: meta.label, name, email, topic, body, status, when: r.created_at || r.inserted_at || "" };
  }

  // ---- send readiness -------------------------------------------------------
  function readiness(hub) {
    if (hub.isDemo()) return { mode: "demo", note: "Demo mode — the composer works but emails are simulated, not sent." };
    if (!A.email || typeof A.email.send !== "function") return { mode: "off", note: "Email client not loaded." };
    return { mode: "live", note: "Live — replies send from the org's verified domain. Sign-in required; if the send-email function isn't deployed yet you'll see a note when you send." };
  }

  const state = { items: [], selected: null, filter: "" };

  async function load(hub) {
    const all = [];
    for (const table of Object.keys(SOURCES)) {
      const rows = await hub.fetchTable(table);
      (rows || []).forEach((r) => all.push(normalize(table, r)));
    }
    all.sort((a, b) => new Date(b.when || 0) - new Date(a.when || 0));
    state.items = all;
  }

  function matches(it, q) {
    if (!q) return true;
    return (it.name + " " + it.email + " " + it.topic + " " + it.body + " " + it.source).toLowerCase().includes(q);
  }

  // ---- rendering ------------------------------------------------------------
  async function render(hub) {
    const view = hub.el();
    const esc = hub.esc, R = readiness(hub);

    view.innerHTML = `
      <div class="view-head">
        <div><h2 style="margin:0">Email Center</h2><p>Read everyone who reached out and follow up by email — all in one place.</p></div>
        <div class="toolbar">
          <span class="env-badge ${R.mode === "live" ? "live" : "demo"}">${R.mode === "live" ? "● Live" : R.mode === "off" ? "Unavailable" : "Demo"}</span>
          <button class="btn btn-primary btn-sm" id="ec-new">${hub.ICO("plus")} New email</button>
        </div>
      </div>
      <p class="form-note" style="margin:-.4rem 0 1rem">${esc(R.note)}</p>
      <div class="ec-grid" style="display:grid;grid-template-columns:340px 1fr;gap:1rem;align-items:start">
        <div class="panel" style="min-width:0">
          <div class="panel-head" style="gap:.5rem">
            <h3 style="margin:0">Inbox</h3><span class="tag" id="ec-count">0</span>
          </div>
          <div style="padding:.7rem .9rem;border-bottom:1px solid var(--border,#e6e8ec)">
            <div class="search">${hub.ICO("search")}<input type="search" id="ec-search" placeholder="Search name, email, message…"></div>
          </div>
          <div id="ec-list" style="max-height:62vh;overflow:auto"></div>
        </div>
        <div class="panel" id="ec-detail" style="min-width:0"></div>
      </div>`;

    // Responsive: stack panes on narrow screens.
    const grid = view.querySelector(".ec-grid");
    const mq = window.matchMedia("(max-width: 860px)");
    const applyMq = () => { grid.style.gridTemplateColumns = mq.matches ? "1fr" : "340px 1fr"; };
    applyMq(); mq.addEventListener?.("change", applyMq);

    view.querySelector("#ec-search").addEventListener("input", (e) => { state.filter = e.target.value.trim().toLowerCase(); paintList(hub); });
    view.querySelector("#ec-new").addEventListener("click", () => { state.selected = null; paintList(hub); paintCompose(hub, null); });

    await load(hub);
    paintList(hub);
    if (state.items.length) { state.selected = state.items[0]; paintCompose(hub, state.selected); }
    else paintEmpty(hub);
  }

  function paintList(hub) {
    const view = hub.el(), esc = hub.esc;
    const list = view.querySelector("#ec-list"); if (!list) return;
    const rows = state.items.filter((it) => matches(it, state.filter));
    view.querySelector("#ec-count").textContent = String(rows.length);
    if (!rows.length) {
      list.innerHTML = `<div class="empty" style="padding:2rem 1rem">${hub.ICO("inbox")}<div>No messages${state.filter ? " match your search" : " yet"}.</div></div>`;
      return;
    }
    list.innerHTML = rows.map((it, i) => {
      const on = state.selected && state.selected.table === it.table && String(state.selected.id) === String(it.id);
      const replied = /replied|closed|done/i.test(it.status);
      return `<button class="ec-item" data-idx="${i}" style="display:block;width:100%;text-align:left;border:0;border-bottom:1px solid var(--border,#eef0f3);background:${on ? "var(--blue-050,#eef5fb)" : "#fff"};padding:.7rem .9rem;cursor:pointer">
        <div style="display:flex;justify-content:space-between;gap:.5rem;align-items:center">
          <b style="font-size:.92rem">${esc(it.name)}</b>
          <span class="text-soft" style="font-size:.72rem;white-space:nowrap">${esc(hub.fmtDate(it.when))}</span>
        </div>
        <div style="display:flex;gap:.4rem;align-items:center;margin:.15rem 0">
          <span class="tag">${esc(it.source)}</span>${replied ? '<span class="tag" style="background:rgba(18,138,90,.12);color:#0a7a4a">replied</span>' : ""}
          <span class="text-soft" style="font-size:.76rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(it.email || "no email")}</span>
        </div>
        <div class="text-soft" style="font-size:.8rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(it.topic ? it.topic + " — " : "")}${esc((it.body || "").slice(0, 80) || "(no message)")}</div>
      </button>`;
    }).join("");
    // Re-map indices against the filtered set.
    const filtered = rows;
    list.querySelectorAll(".ec-item").forEach((b) => b.addEventListener("click", () => {
      state.selected = filtered[Number(b.dataset.idx)];
      paintList(hub); paintCompose(hub, state.selected);
    }));
  }

  function composerHTML(hub, to, subject, bodyText, showSource) {
    const esc = hub.esc;
    return `
      <form id="ec-form">
        <div class="field"><label>To</label><input name="to" type="email" value="${esc(to)}" placeholder="name@example.com" required></div>
        <div class="field"><label>Subject</label><input name="subject" value="${esc(subject)}" placeholder="Following up with Jacks of All Trades" required></div>
        <div class="field"><label>Message</label><textarea name="text" rows="12" required>${esc(bodyText)}</textarea></div>
        <div class="toolbar" style="justify-content:flex-end;gap:.6rem">
          <button type="submit" class="btn btn-primary">${hub.ICO("send")} Send email</button>
        </div>
        <div class="form-status" id="ec-status" hidden></div>
      </form>`;
  }

  function greeting(it, hub) {
    const org = A.ORG || {};
    const first = String(it.name || "").trim().split(/\s+/)[0] || "there";
    const ref = it.topic ? ` about ${it.topic.toLowerCase()}` : "";
    return `Hi ${first},\n\nThank you for reaching out to Jacks of All Trades${ref}. `
      + `We appreciate you taking the time to get in touch.\n\n\n\n`
      + `Warm regards,\nThe Jacks of All Trades Team\n${org.email || "info@joatamp.org"}${org.phone ? " · " + org.phone : ""}`;
  }

  function paintEmpty(hub) {
    const d = hub.el().querySelector("#ec-detail");
    d.innerHTML = `<div class="panel-body"><div class="empty" style="padding:2.5rem 1rem">${hub.ICO("mail")}
      <div>No messages yet. When someone submits a form on the website, it lands here — and you can reply by email in one click.</div>
      <div style="margin-top:1rem"><button class="btn btn-ghost btn-sm" id="ec-new2">${hub.ICO("plus")} Compose a new email</button></div></div></div>`;
    d.querySelector("#ec-new2").addEventListener("click", () => paintCompose(hub, null));
  }

  function paintCompose(hub, it) {
    const view = hub.el(), esc = hub.esc;
    const d = view.querySelector("#ec-detail"); if (!d) return;

    let to = "", subject = "", body = "", header = "";
    if (it) {
      to = it.email || "";
      subject = it.topic ? `Re: ${it.topic}` : "Following up with Jacks of All Trades";
      body = greeting(it, hub);
      header = `
        <div class="panel-head" style="align-items:flex-start">
          <div><h3 style="margin:0">${esc(it.name)}</h3>
            <div class="text-soft" style="font-size:.85rem;margin-top:.2rem">${esc(it.email || "no email on file")} · <span class="tag">${esc(it.source)}</span> · ${esc(hub.fmtDate(it.when))}</div></div>
        </div>
        <div class="panel-body" style="border-bottom:1px solid var(--border,#e6e8ec)">
          ${it.topic ? `<div style="font-weight:700;margin-bottom:.3rem">${esc(it.topic)}</div>` : ""}
          <div style="white-space:pre-wrap;color:var(--ink,#1a2230)">${esc(it.body || "(No message text was included with this submission.)")}</div>
        </div>`;
    } else {
      header = `<div class="panel-head"><h3 style="margin:0">New email</h3></div>`;
    }

    d.innerHTML = `${header}<div class="panel-body">
      <h4 style="margin:.2rem 0 .8rem">${it ? "Reply" : "Compose"}</h4>
      ${composerHTML(hub, to, subject, body)}
    </div>`;

    const form = d.querySelector("#ec-form");
    const status = d.querySelector("#ec-status");
    const setStatus = (type, msg) => { status.hidden = false; status.className = "form-status " + type; status.textContent = msg; };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = form.querySelector('[type="submit"]');
      const p = Object.fromEntries(new FormData(form).entries());
      if (!p.to || !p.subject || !p.text) return;
      btn.disabled = true; const orig = btn.innerHTML; btn.innerHTML = "Sending…";
      setStatus("info", "Sending…");

      const R = readiness(hub);
      try {
        if (R.mode === "demo") {
          await new Promise((r) => setTimeout(r, 500));
          setStatus("ok", "Email sent (demo) — connect Supabase and deploy the send-email function to send for real.");
        } else if (R.mode === "off") {
          setStatus("err", "Email client isn't available. Reload the Command Center and try again.");
        } else {
          const res = await A.email.send({ to: p.to, subject: p.subject, text: p.text, replyTo: (A.ORG && A.ORG.email) });
          if (!res.ok) { setStatus("err", res.error || "Could not send. Check that you're signed in and the send-email function is deployed."); }
          else {
            setStatus("ok", "Sent ✓ Your email is on its way to " + p.to + ".");
            hub.toast("Email sent");
            if (it && SOURCES[it.table] && SOURCES[it.table].status) {
              try { await hub.updateField(it.table, it.id, { [SOURCES[it.table].status]: "replied" }); it.status = "replied"; paintList(hub); } catch (_) {}
            }
          }
        }
      } catch (err) {
        console.error("[email-center] send failed:", err);
        setStatus("err", "Something went wrong sending that email. Please try again.");
      } finally {
        btn.disabled = false; btn.innerHTML = orig;
      }
    });
  }

  A.registerPlugin({
    id: "email-center",
    titles: { email_center: "Email Center" },
    roles: { board: ["email_center"], staff: ["email_center"] },
    views: { email_center: render },
    nav: [{ group: "Communications", items: [["email_center", "Email Center", ICON]] }],
  });
})();
