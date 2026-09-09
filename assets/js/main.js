/* ============================================================================
   Jacks of All Trades Community Development — Front-end Interactions
   File: assets/js/main.js
   Generated: 2026-09-03 16:32 UTC  |  joatamp.org redesign

   Handles: mobile nav, sticky-nav state, scroll reveal, animated counters,
   before/after slider, raffle countdown, and live figures from Supabase
   (with graceful fallback to config values).
   ========================================================================== */

(function () {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Mobile nav + sticky state ---------------------------------------- */
  const nav = $(".site-nav");
  const toggle = $(".nav-toggle");
  const links = $(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    $$(".nav-links a").forEach((a) => a.addEventListener("click", () => links.classList.remove("open")));
  }
  if (nav) {
    const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---- Footer year ------------------------------------------------------- */
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  /* ---- Scroll reveal ----------------------------------------------------- */
  // Elements stay visible by default; we only hide those below the fold, then
  // reveal them on scroll. If JS/IO is unavailable, nothing is ever hidden.
  const reveal = $$("[data-reveal]");
  if (reveal.length && !reduce && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    const fold = window.innerHeight * 0.92;
    reveal.forEach((el) => {
      if (el.getBoundingClientRect().top > fold) el.classList.add("pre");  // hide only below-fold
      io.observe(el);
    });
  }

  /* ---- Animated counters ------------------------------------------------- */
  function animateCount(el) {
    const target = parseFloat(el.dataset.count);
    const dur = 1400, start = performance.now();
    const prefix = el.dataset.prefix || "", suffix = el.dataset.suffix || "";
    const dec = (String(target).split(".")[1] || "").length;
    function frame(now) {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = target * eased;
      el.textContent = prefix + val.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  const counters = $$("[data-count]");
  if (counters.length) {
    if (reduce || !("IntersectionObserver" in window)) {
      counters.forEach((el) => (el.textContent = (el.dataset.prefix || "") + Number(el.dataset.count).toLocaleString() + (el.dataset.suffix || "")));
    } else {
      const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { animateCount(e.target); io.unobserve(e.target); } }), { threshold: 0.5 });
      counters.forEach((el) => io.observe(el));
    }
  }

  /* ---- Before / After slider -------------------------------------------- */
  $$(".ba").forEach((ba) => {
    const range = $("input[type=range]", ba);
    const set = (v) => ba.style.setProperty("--pos", v + "%");
    if (range) { set(range.value); range.addEventListener("input", () => set(range.value)); }
  });

  /* ---- Raffle countdown -------------------------------------------------- */
  const cd = $("[data-countdown]");
  if (cd) {
    const target = new Date(cd.dataset.countdown).getTime();
    const cells = { d: $("[data-cd=d]", cd), h: $("[data-cd=h]", cd), m: $("[data-cd=m]", cd), s: $("[data-cd=s]", cd) };
    function tick() {
      const diff = target - Date.now();
      if (diff <= 0) { Object.values(cells).forEach((c) => c && (c.textContent = "00")); return; }
      const d = Math.floor(diff / 864e5), h = Math.floor((diff % 864e5) / 36e5),
            m = Math.floor((diff % 36e5) / 6e4), s = Math.floor((diff % 6e4) / 1e3);
      const pad = (n) => String(n).padStart(2, "0");
      if (cells.d) cells.d.textContent = pad(d);
      if (cells.h) cells.h.textContent = pad(h);
      if (cells.m) cells.m.textContent = pad(m);
      if (cells.s) cells.s.textContent = pad(s);
    }
    tick(); setInterval(tick, 1000);
  }

  /* ---- Live raffle figures (Supabase → fallback) ------------------------- */
  async function loadRaffleStats() {
    const R = window.JOAT.RAFFLE || {};
    let pot = R.potFallback, raised = R.raisedFallback;
    const db = window.JOAT.db;
    if (db) {
      try {
        const { data, error } = await db
          .from("raffle_stats").select("pot_total,renovation_raised").order("updated_at", { ascending: false }).limit(1).maybeSingle();
        if (!error && data) { pot = data.pot_total ?? pot; raised = data.renovation_raised ?? raised; }
      } catch (e) { /* keep fallback */ }
    }
    const fmt = (n) => "$" + Number(n).toLocaleString();
    $$("[data-pot]").forEach((el) => (el.textContent = fmt(pot)));
    $$("[data-raised]").forEach((el) => (el.textContent = fmt(raised)));
    const goal = R.goal || 100000;
    const pct = Math.min(100, Math.round((raised / goal) * 100));
    $$("[data-goal]").forEach((el) => (el.textContent = fmt(goal)));
    $$("[data-pct]").forEach((el) => (el.textContent = pct + "%"));
    const fill = $(".progress-fill");
    if (fill) requestAnimationFrame(() => (fill.style.width = pct + "%"));
  }
  document.addEventListener("joat:db-ready", loadRaffleStats);
  // Also run once in case the db module already resolved.
  if (window.JOAT && "configured" in window.JOAT) loadRaffleStats();

  /* ---- Updates page: live stream, updates feed, winners ------------------ */
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
  const fmtDate = (d) => { if (!d) return ""; const x = new Date(d + (String(d).length <= 10 ? "T00:00:00" : "")); return isNaN(x) ? "" : x.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); };
  const usd = (n) => (n == null || n === "") ? "" : "$" + Number(n).toLocaleString();

  function mediaEmbed(mediaType, videoUrl, imageUrl, alt) {
    if (mediaType === "video" && videoUrl) {
      if (/\.(mp4|webm|ogg)(\?|$)/i.test(videoUrl))
        return `<div class="media-embed"><video controls preload="metadata" ${imageUrl ? `poster="${esc(imageUrl)}"` : ""}><source src="${esc(videoUrl)}"></video></div>`;
      return `<div class="media-embed"><iframe src="${esc(videoUrl)}" title="${esc(alt || "Video")}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
    }
    return `<div class="media-embed"><img src="${esc(imageUrl || "assets/img/logo-jack.png")}" alt="${esc(alt || "")}"></div>`;
  }

  async function loadLiveStream() {
    const slot = $("[data-livestream]"); const db = window.JOAT && window.JOAT.db;
    if (!slot || !db) return;
    try {
      const { data, error } = await db.from("live_stream").select("*").eq("id", 1).maybeSingle();
      if (error || !data) return;
      if (data.is_live && data.embed_url) {
        slot.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.6rem;margin-bottom:1rem">
            <span class="live-badge"><span class="dot"></span> Live now</span>
            <span style="color:#cfe3f2;font-size:.9rem">${esc(data.title || "We're live")}</span></div>
          <div class="media-embed"><iframe src="${esc(data.embed_url)}" title="${esc(data.title || "Live stream")}" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>`;
      } else if (data.scheduled_label) {
        const label = slot.querySelector('[style*="cfe3f2"]');
        if (label) label.textContent = data.scheduled_label;
      }
    } catch (e) { /* keep static fallback */ }
  }

  async function loadUpdates() {
    const wrap = $("[data-updates]"); const db = window.JOAT && window.JOAT.db;
    if (!wrap || !db) return;
    try {
      const { data, error } = await db.from("project_updates").select("*").eq("status", "published").order("posted_on", { ascending: false }).limit(24);
      if (error || !data || !data.length) return;
      wrap.innerHTML = data.map((u, i) => `
        <article class="update-card" data-reveal ${i % 3 ? `data-delay="${i % 3}"` : ""}>
          ${mediaEmbed(u.media_type, u.video_url, u.image_url, u.title)}
          <div class="u-body">
            <div class="u-meta">${u.tag ? `<span class="u-tag">${esc(u.tag)}</span>` : ""}<span>${esc(fmtDate(u.posted_on))}</span></div>
            <h3>${esc(u.title)}</h3>${u.body ? `<p>${esc(u.body)}</p>` : ""}
          </div>
        </article>`).join("");
    } catch (e) { /* keep static fallback */ }
  }

  async function loadWinners() {
    const wrap = $("[data-winners]"); const db = window.JOAT && window.JOAT.db;
    if (!wrap || !db) return;
    try {
      const { data, error } = await db.from("raffle_winners").select("*").eq("status", "published").order("draw_date", { ascending: false }).limit(24);
      if (error || !data || !data.length) return;
      wrap.innerHTML = data.map((w, i) => `
        <div class="winner-card" data-reveal ${i % 2 ? 'data-delay="1"' : ""}>
          ${w.photo_url
            ? `<img class="winner-photo" src="${esc(w.photo_url)}" alt="${esc(w.display_name)}">`
            : `<svg class="winner-photo" viewBox="0 0 24 24" fill="none" stroke="#a2822f" stroke-width="1.5" style="padding:14px"><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0zM7 4H4v2a4 4 0 0 0 3 3.87M17 4h3v2a4 4 0 0 1-3 3.87" stroke-linecap="round" stroke-linejoin="round"/></svg>`}
          <div>
            <h4>${esc(w.display_name)}</h4>
            ${w.prize_amount != null ? `<div class="prize">${esc(usd(w.prize_amount))} won</div>` : ""}
            <div class="w-meta">${[fmtDate(w.draw_date), w.event_label, w.note].filter(Boolean).map(esc).join(" &middot; ")}</div>
          </div>
        </div>`).join("");
    } catch (e) { /* keep static fallback */ }
  }

  function loadUpdatesPage() { loadLiveStream(); loadUpdates(); loadWinners(); }
  document.addEventListener("joat:db-ready", loadUpdatesPage);
  if (window.JOAT && "configured" in window.JOAT) loadUpdatesPage();
})();
