/* ============================================================================
   Jacks of All Trades Community Development — Front-end Interactions
   File: assets/js/main.js
   Generated: 2026-09-03 16:32 UTC  |  joatamp.net redesign

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
})();
