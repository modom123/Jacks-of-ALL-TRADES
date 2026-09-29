/* ============================================================================
   Jacks of All Trades — Social Fundraising (Command Center plugin)
   File: assets/js/social.plugin.js
   Generated: 2026-09-29 22:30 UTC

   Raise money through every major social platform from one screen:
     • Platforms   — tracked giving link per platform (give.html?src=<platform>),
                     setup checklist (native donate tools, link in bio), 30-day
                     visits / donate taps / dollars raised per platform.
     • Nova's posts — "Draft this week's posts" (social-agent) → a queue of
                     platform-native posts to copy, post, and mark as posted.
     • Fundraisers — supporters' own pages (give.html?ref=<slug>): approve,
                     update amounts, leaderboard.
     • Record a gift — money raised ON a platform (Facebook/Instagram fundraisers,
                     YouTube Giving, TikTok LIVE, GoFundMe…) so it counts toward
                     the $2M (as individual giving, with the platform as source).
   Nothing is posted automatically — each platform requires its own approved app
   for that; this screen makes posting a 30-second copy-and-paste.

   Data: social_platforms, social_posts, give_clicks, fundraisers, donations
   Setup: supabase/setup_social_fundraising_2026-09-29_2230.sql
   ========================================================================== */
(function () {
  "use strict";
  const A = (window.JOAT = window.JOAT || {});
  if (!A.registerPlugin) { console.warn("[social] Command Center core not loaded"); return; }

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
  const usd = (n) => "$" + Math.round(Number(n) || 0).toLocaleString();
  const SITE = (location.origin && location.origin.startsWith("http") && !location.origin.includes("localhost")) ? location.origin : "https://joatamp.org";
  const giveLink = (src, c) => `${SITE}/give.html?src=${encodeURIComponent(src)}${c ? "&c=" + encodeURIComponent(c) : ""}`;
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>';

  // How to switch on each platform's own giving tools. Requirements change —
  // always confirm on the platform's current nonprofit help pages.
  const HOWTO = {
    facebook: "Enroll the Page in Meta's charitable giving tools (search \"Meta for Nonprofits\" / \"Facebook fundraising tools\") to add a Donate button and let supporters start birthday fundraisers for you. Put the tracked link in the Page's About → website.",
    instagram: "Uses the same Meta enrollment as Facebook: then you can add the Donation sticker to Stories and fundraisers to posts and Lives. Put the tracked link in your bio (or a Link sticker).",
    tiktok: "Put the tracked link in your bio (check TikTok's current rules for bio links). Look up TikTok's nonprofit program for LIVE donations and donation stickers if eligible. Donations-only content — no raffle promotion.",
    youtube: "Apply to YouTube's nonprofit program (YouTube Giving) for a Donate button on videos, Shorts and Lives. Put the tracked link in every description and your channel links. No raffle promotion.",
    linkedin: "Post from the organization Page; the tracked link goes in posts and the Page's website field. Great for corporate sponsors and employee matching gifts.",
    x: "Pin a post with the tracked link; add it to the profile website field.",
    threads: "Linked to your Instagram account; add the tracked link to your Threads bio and posts.",
    nextdoor: "Create a Nextdoor page for the organization and post renovation updates to nearby neighborhoods with the tracked link.",
    gofundme: "Paste the GoFundMe page link into config.js (ORG.gofundmeUrl) so it shows on give.html. GoFundMe has no public API for totals — record the amount raised here with Record a gift.",
  };
  // Where "Open" takes you to post (web intents where they exist).
  const OPEN = {
    facebook: (p) => "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(p.link || giveLink("facebook")),
    x: (p) => "https://twitter.com/intent/tweet?text=" + encodeURIComponent(String(p.caption || "").slice(0, 270)),
    linkedin: (p) => "https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(p.link || giveLink("linkedin")),
    threads: (p) => "https://www.threads.net/intent/post?text=" + encodeURIComponent(String(p.caption || "").slice(0, 480)),
    instagram: () => "https://www.instagram.com/",
    tiktok: () => "https://www.tiktok.com/upload",
    youtube: () => "https://studio.youtube.com/",
    nextdoor: () => "https://nextdoor.com/",
  };
  const COLORS = { facebook: "#1877f2", instagram: "#c13584", tiktok: "#111", youtube: "#ff0000", linkedin: "#0a66c2", x: "#111", threads: "#111", nextdoor: "#00b246", gofundme: "#02a95c" };

  async function sel(hub, table, build) {
    try { const { data, error } = await build(hub.db().from(table)); return { data: data || [], error }; } catch (e) { return { data: [], error: e }; }
  }
  async function load(hub) {
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const [plat, posts, clicks, frs, gifts] = await Promise.all([
      sel(hub, "social_platforms", (q) => q.select("*").order("sort")),
      sel(hub, "social_posts", (q) => q.select("*").in("status", ["planned"]).order("scheduled_date", { ascending: true }).limit(100)),
      sel(hub, "give_clicks", (q) => q.select("event,src,ref,method").gte("created_at", since).limit(20000)),
      sel(hub, "fundraisers", (q) => q.select("*").order("raised", { ascending: false }).limit(500)),
      sel(hub, "donations", (q) => q.select("amount,source,ref,gift_date").not("source", "is", null).limit(20000)),
    ]);
    const { data: postedCount } = await sel(hub, "social_posts", (q) => q.select("platform").eq("status", "posted").gte("posted_at", since).limit(5000));
    return { plat, posts: posts.data, clicks: clicks.data, frs: frs.data, gifts: gifts.data, posted30: postedCount };
  }

  async function callFn(hub, name, body) {
    const cfg = A.SUPABASE || {};
    if (!hub.db() || !cfg.url) throw new Error("Not connected to Supabase — sign in on the live hub");
    let token = cfg.anonKey;
    try { const { data } = await hub.db().auth.getSession(); if (data && data.session) token = data.session.access_token; } catch (e) {}
    let res;
    try {
      res = await fetch(cfg.url.replace(/\/$/, "") + "/functions/v1/" + name, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, apikey: cfg.anonKey }, body: JSON.stringify(body || {}),
      });
    } catch (e) { throw new Error(`Couldn't reach ${name} — deploy it (supabase functions deploy ${name} --no-verify-jwt)`); }
    const out = await res.json().catch(() => ({}));
    if (!res.ok || out.error) throw new Error(out.error || out.message || `${name} HTTP ${res.status}`);
    return out;
  }

  let flash = null, tab = "posts";

  async function render(hub) {
    const view = hub.el();
    if (!hub.db()) { view.innerHTML = `<div class="panel"><div class="panel-body">Sign in to the live hub to use Social Fundraising.</div></div>`; return; }
    const d = await load(hub);
    if (d.plat.error) {
      view.innerHTML = `<div class="panel" style="border-left:4px solid #b42318"><div class="panel-body"><b>Social fundraising isn't set up yet.</b><br>
        Run <code>supabase/setup_social_fundraising_2026-09-29_2230.sql</code> in the Supabase SQL Editor, then reload. (${esc(d.plat.error.message || d.plat.error)})</div></div>`;
      return;
    }
    const platforms = d.plat.data;
    const by = (arr, k) => arr.reduce((m, x) => { const key = x[k] || "other"; (m[key] = m[key] || []).push(x); return m; }, {});
    const clicksBy = by(d.clicks, "src"), giftsBy = by(d.gifts, "source");
    const raisedSocial = d.gifts.reduce((s, g) => s + (Number(g.amount) || 0), 0);
    const views30 = d.clicks.filter((c) => c.event === "view").length, taps30 = d.clicks.filter((c) => c.event === "donate").length;
    const pending = d.frs.filter((f) => f.status === "pending"), active = d.frs.filter((f) => f.status === "active");

    view.innerHTML = `
      <div class="view-head"><div><h2 style="margin:0">Social Fundraising</h2>
        <p>One tracked giving link per platform, Nova's weekly posts, supporter fundraisers, and every social dollar counted toward the $2M.</p></div></div>
      ${flash ? `<div class="panel" style="border-left:4px solid ${flash.ok ? "#12805c" : "#b42318"}"><div class="panel-body">${flash.ok ? "✅" : "❌"} ${esc(flash.text)}</div></div>` : ""}
      <div class="kpis">
        ${hub.kpi("Raised via social", usd(raisedSocial), "heart", "")}
        ${hub.kpi("Giving-page visits (30d)", views30.toLocaleString(), "target", "")}
        ${hub.kpi("Donate taps (30d)", taps30.toLocaleString(), "ticket", "")}
        ${hub.kpi("Supporter fundraisers", active.length + (pending.length ? ` (+${pending.length} to approve)` : ""), "users", "")}
      </div>
      <div class="panel"><div class="panel-head" style="flex-wrap:wrap;gap:.4rem">
        <div style="display:flex;gap:.3rem;flex-wrap:wrap">
          ${[["posts", `Nova's posts (${d.posts.length})`], ["platforms", "Platforms"], ["fundraisers", `Fundraisers${pending.length ? " (" + pending.length + " new)" : ""}`], ["record", "Record a gift"]]
            .map(([k, l]) => `<button class="btn btn-sm ${tab === k ? "btn-primary" : "btn-ghost"}" data-tab="${k}">${l}</button>`).join("")}
        </div></div>
        <div class="panel-body" id="s-body"></div></div>`;
    view.querySelectorAll("[data-tab]").forEach((b) => b.onclick = () => { tab = b.dataset.tab; flash = null; render(hub); });
    const body = view.querySelector("#s-body");
    if (tab === "posts") postsTab(hub, body, d);
    else if (tab === "platforms") platformsTab(hub, body, platforms, clicksBy, giftsBy, d.posted30, d.clicks);
    else if (tab === "fundraisers") fundraisersTab(hub, body, d.frs);
    else recordTab(hub, body, platforms, active);
  }

  /* ---- Nova's posts ------------------------------------------------------- */
  function postsTab(hub, el, d) {
    el.innerHTML = `
      <form id="s-draft" style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:flex-end;margin-bottom:1rem">
        <div class="field" style="margin:0"><label>Campaign</label><select name="c">
          <option value="house">House renovation ($100K)</option><option value="raffle">50/50 raffle</option><option value="general">General support</option></select></div>
        <div class="field" style="margin:0"><label>Days</label><select name="days"><option>7</option><option>3</option><option>14</option></select></div>
        <button class="btn btn-primary" type="submit">Nova: draft posts for all platforms</button>
        <span class="text-soft" style="font-size:.85rem">~1 minute · each post carries that platform's tracked giving link</span>
      </form>
      ${d.posts.length ? d.posts.map((p) => `
        <div class="ncard" data-pid="${esc(p.id)}" style="border:1px solid var(--border,#e6e8ec);border-radius:12px;padding:.9rem;margin-bottom:.8rem">
          <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin-bottom:.4rem">
            <span class="pill" style="background:${COLORS[p.platform] || "#062a40"};color:#fff">${esc(p.platform)}</span>
            <b>${esc(p.kind || "post")}</b><span class="text-soft">· ${esc(p.scheduled_date || "")} · ${esc(p.campaign)}</span></div>
          <div style="display:grid;grid-template-columns:${p.media_hint && /^assets\//.test(p.media_hint) ? "1fr 140px" : "1fr"};gap:.8rem">
            <textarea rows="7" style="width:100%" data-cap>${esc(p.caption || "")}${p.hashtags ? "\n\n" + esc(p.hashtags) : ""}</textarea>
            ${p.media_hint && /^assets\//.test(p.media_hint) ? `<a href="../${esc(p.media_hint)}" target="_blank" download><img src="../${esc(p.media_hint)}" alt="Suggested photo" style="width:140px;border-radius:10px"><div class="text-soft" style="font-size:.75rem">Suggested photo — tap to download</div></a>` : ""}
          </div>
          ${p.media_hint && !/^assets\//.test(p.media_hint) ? `<div class="text-soft" style="font-size:.85rem;margin-top:.3rem">🎥 ${esc(p.media_hint)}</div>` : ""}
          <div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.5rem">
            <button class="btn btn-primary btn-sm" data-copy>Copy text</button>
            <a class="btn btn-ghost btn-sm" data-open href="${esc((OPEN[p.platform] || (() => "#"))(p))}" target="_blank" rel="noopener">Open ${esc(p.platform)}</a>
            <button class="btn btn-ghost btn-sm" data-posted>Mark posted</button>
            <button class="btn btn-ghost btn-sm" data-skip style="color:#b42318">Skip</button>
          </div></div>`).join("")
      : `<p class="text-soft">No posts waiting. Pick a campaign and let Nova draft a week of posts for every platform.</p>`}`;
    el.querySelector("#s-draft").onsubmit = async (e) => {
      e.preventDefault(); const f = e.target, btn = f.querySelector("[type=submit]");
      btn.disabled = true; btn.textContent = "Nova is writing…";
      try { const out = await callFn(hub, "social-agent", { campaign: f.c.value, days: Number(f.days.value) }); flash = { ok: true, text: out.summary }; }
      catch (err) { flash = { ok: false, text: err.message || String(err) }; }
      render(hub);
    };
    el.querySelectorAll("[data-pid]").forEach((card) => {
      const id = card.dataset.pid, cap = card.querySelector("[data-cap]");
      const upd = async (patch, note) => { const { error } = await hub.db().from("social_posts").update(patch).eq("id", id); if (error) return hub.toast("Update failed: " + error.message); hub.toast(note); render(hub); };
      card.querySelector("[data-copy]").onclick = async () => { try { await navigator.clipboard.writeText(cap.value); hub.toast("Copied — paste it into the app"); } catch (e) { cap.select(); } };
      card.querySelector("[data-posted]").onclick = () => { const u = prompt("Posted! Paste the post's link (optional):", ""); if (u === null) return; upd({ status: "posted", posted_at: new Date().toISOString(), post_url: u || null, caption: cap.value }, "Marked posted"); };
      card.querySelector("[data-skip]").onclick = () => upd({ status: "skipped" }, "Skipped");
    });
  }

  /* ---- Platforms ------------------------------------------------------------ */
  function platformsTab(hub, el, platforms, clicksBy, giftsBy, posted30, allClicks) {
    const postedBy = posted30.reduce((m, p) => { m[p.platform] = (m[p.platform] || 0) + 1; return m; }, {});
    el.innerHTML = `<div class="table-wrap"><table class="data">
      <thead><tr><th>Platform</th><th>Tracked giving link</th><th>Setup</th><th>30 days</th><th>Raised</th></tr></thead>
      <tbody>${platforms.map((p) => {
        // GoFundMe isn't a traffic source — count taps on its button on give.html instead.
        const c = p.key === "gofundme" ? allClicks.filter((x) => x.method === "gofundme") : (clicksBy[p.key] || []), g = giftsBy[p.key] || [];
        const link = p.key === "gofundme" ? (A.ORG && A.ORG.gofundmeUrl) || "(add ORG.gofundmeUrl in config.js)" : giveLink(p.key, "house");
        return `<tr data-key="${esc(p.key)}">
          <td><span class="pill" style="background:${COLORS[p.key] || "#062a40"};color:#fff">${esc(p.name)}</span>
            <details style="margin-top:.4rem;max-width:320px"><summary class="text-soft" style="cursor:pointer;font-size:.82rem">How to set up</summary><div style="font-size:.82rem">${esc(HOWTO[p.key] || "")}</div></details></td>
          <td style="max-width:280px"><code style="font-size:.75rem;word-break:break-all">${esc(link)}</code>${p.key !== "gofundme" ? `<br><button class="btn btn-ghost btn-sm" data-copylink="${esc(link)}">Copy</button>` : ""}</td>
          <td style="font-size:.85rem;white-space:nowrap">
            <label><input type="checkbox" data-f="native_giving" ${p.native_giving ? "checked" : ""}> Donate tools on</label><br>
            <label><input type="checkbox" data-f="link_in_bio" ${p.link_in_bio ? "checked" : ""}> Link in bio</label></td>
          <td style="font-size:.85rem;white-space:nowrap">${c.filter((x) => x.event === "view").length} visits<br>${c.filter((x) => x.event === "donate").length} donate taps<br>${postedBy[p.key] || 0} posts</td>
          <td><b>${usd(g.reduce((s, x) => s + (Number(x.amount) || 0), 0))}</b><div class="muted">${g.length} gift${g.length === 1 ? "" : "s"}</div></td></tr>`;
      }).join("")}</tbody></table></div>
      <p class="text-soft" style="font-size:.82rem;margin-top:.6rem">Visits and taps come from give.html automatically. Dollars given on a platform itself (Facebook fundraisers, YouTube Giving, GoFundMe…) appear once you add them under <b>Record a gift</b>. Gifts through Zeffy count when you record their source.</p>`;
    el.querySelectorAll("[data-copylink]").forEach((b) => b.onclick = async () => { try { await navigator.clipboard.writeText(b.dataset.copylink); hub.toast("Link copied"); } catch (e) { prompt("Copy:", b.dataset.copylink); } });
    el.querySelectorAll("tr[data-key] input[type=checkbox]").forEach((cb) => cb.onchange = async () => {
      const key = cb.closest("tr").dataset.key;
      const { error } = await hub.db().from("social_platforms").update({ [cb.dataset.f]: cb.checked }).eq("key", key);
      hub.toast(error ? "Save failed: " + error.message : "Saved");
    });
  }

  /* ---- Supporter fundraisers -------------------------------------------------- */
  function fundraisersTab(hub, el, frs) {
    const row = (f) => `<tr data-fid="${esc(f.id)}">
        <td><b>${esc(f.name)}</b><div class="muted">${esc(f.email || "")}${f.phone ? " · " + esc(f.phone) : ""}</div>${f.story ? `<div style="font-size:.8rem;max-width:340px">${esc(f.story)}</div>` : ""}</td>
        <td style="white-space:nowrap">${esc(f.campaign)}<br><span class="pill">${esc(f.status)}</span></td>
        <td style="white-space:nowrap"><input type="number" data-raised value="${Number(f.raised) || 0}" style="width:100px"> of ${usd(f.goal)}</td>
        <td style="white-space:nowrap">
          ${f.status === "pending" ? `<button class="btn btn-primary btn-sm" data-st="active">Approve</button> <button class="btn btn-ghost btn-sm" data-st="closed">Decline</button>` : ""}
          ${f.status === "active" ? `<button class="btn btn-ghost btn-sm" data-link>Copy link</button> <button class="btn btn-ghost btn-sm" data-st="closed">Close</button>` : ""}
        </td></tr>`;
    el.innerHTML = `<p class="text-soft" style="margin-top:0">Supporters start their own page at <b>${esc(SITE)}/give.html#start</b> and share it on their own social media. Approve new ones here; when a gift comes in for someone's fundraiser, record it under <b>Record a gift</b> and pick their fundraiser — their total updates automatically.</p>
      <div class="table-wrap"><table class="data"><thead><tr><th>Supporter</th><th>Campaign</th><th>Raised</th><th></th></tr></thead>
      <tbody>${frs.length ? frs.map(row).join("") : `<tr><td colspan="4" class="text-soft" style="padding:1.2rem">No fundraisers yet. Share ${esc(SITE)}/give.html#start with your board, volunteers and past donors.</td></tr>`}</tbody></table></div>`;
    el.querySelectorAll("tr[data-fid]").forEach((tr) => {
      const id = tr.dataset.fid, f = frs.find((x) => String(x.id) === id);
      const upd = async (patch, note) => { const { error } = await hub.db().from("fundraisers").update(patch).eq("id", id); hub.toast(error ? "Update failed: " + error.message : note); if (!error) render(hub); };
      tr.querySelectorAll("[data-st]").forEach((b) => b.onclick = () => upd({ status: b.dataset.st }, b.dataset.st === "active" ? "Approved — send them their link" : "Updated"));
      tr.querySelector("[data-raised]").onchange = (e) => upd({ raised: Number(e.target.value) || 0 }, "Saved");
      const l = tr.querySelector("[data-link]");
      if (l) l.onclick = async () => { const link = `${SITE}/give.html?ref=${f.slug}`; try { await navigator.clipboard.writeText(link); hub.toast("Link copied: " + link); } catch (e) { prompt("Copy:", link); } };
    });
  }

  /* ---- Record a gift raised through social -------------------------------------- */
  function recordTab(hub, el, platforms, active) {
    el.innerHTML = `<form id="s-rec" style="max-width:620px">
      <p class="text-soft" style="margin-top:0">For money raised on a platform itself (Facebook/Instagram fundraisers, YouTube Giving, TikTok LIVE, GoFundMe payouts) — or a Zeffy / Cash App / Zelle gift you know came from social. It counts toward the $2M as individual giving.</p>
      <div class="field-row">
        <div class="field"><label>Where it came from</label><select name="source">${platforms.map((p) => `<option value="${esc(p.key)}">${esc(p.name)}</option>`).join("")}<option value="email">Email</option><option value="other">Other</option></select></div>
        <div class="field"><label>Amount ($)</label><input name="amount" type="number" min="1" step="0.01" required></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Donor name (or "Facebook fundraiser payout")</label><input name="donor" required></div>
        <div class="field"><label>Date</label><input name="date" type="date" value="${new Date().toISOString().slice(0, 10)}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Supporter fundraiser (optional)</label><select name="ref"><option value="">—</option>${active.map((f) => `<option value="${esc(f.slug)}">${esc(f.name)}</option>`).join("")}</select></div>
        <div class="field"><label>Campaign</label><select name="campaign"><option value="">General</option><option value="4 Bed / 2 Bath Community Renovation">House renovation</option><option value="50/50 Raffle">50/50 raffle</option></select></div>
      </div>
      <div class="field"><label>Note</label><input name="note" placeholder="e.g. Birthday fundraiser by Jane — 14 donors"></div>
      <button class="btn btn-primary" type="submit">Save gift</button></form>`;
    el.querySelector("#s-rec").onsubmit = async (e) => {
      e.preventDefault(); const f = e.target, amount = Number(f.amount.value);
      const row = { donor_name: f.donor.value.trim(), amount, gift_date: f.date.value || new Date().toISOString().slice(0, 10),
        method: f.source.value, source: f.source.value, ref: f.ref.value || null, campaign: f.campaign.value || null, note: f.note.value.trim() || null };
      const { error } = await hub.db().from("donations").insert(row);
      if (error) { hub.toast("Save failed: " + error.message); return; }
      if (row.ref) {
        const fr = active.find((x) => x.slug === row.ref);
        if (fr) await hub.db().from("fundraisers").update({ raised: (Number(fr.raised) || 0) + amount }).eq("id", fr.id);
      }
      flash = { ok: true, text: `Recorded ${usd(amount)} from ${f.source.selectedOptions[0].textContent}.` };
      tab = "platforms"; render(hub);
    };
  }

  A.registerPlugin({
    id: "social",
    titles: { social: "Social Fundraising" },
    roles: { board: ["social"], staff: ["social"] },
    views: { social: render },
    nav: [{ group: "Fundraising", items: [["social", "Social Fundraising", ICON]] }],
  });
})();
