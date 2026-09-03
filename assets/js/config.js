/* ============================================================================
   Jacks of All Trades Community Development — Site Configuration
   File: assets/js/config.js
   Generated: 2026-09-03 16:32 UTC  |  joatamp.net redesign

   Single source of truth for public site data + Supabase credentials.
   Update the SUPABASE values below with your project's URL + anon key.
   The anon (public) key is safe to expose in the browser; Row Level Security
   protects your data. NEVER place the service_role key in front-end files.
   ========================================================================== */

window.JOAT = window.JOAT || {};

/* ---- Supabase connection (fill these in) --------------------------------- */
window.JOAT.SUPABASE = {
  url: "https://YOUR-PROJECT-ref.supabase.co",   // e.g. https://abcd1234.supabase.co
  anonKey: "YOUR-SUPABASE-ANON-PUBLIC-KEY",       // Project Settings → API → anon public
};

/* ---- Organization -------------------------------------------------------- */
window.JOAT.ORG = {
  name: "Jacks of All Trades",
  legalName: "Jacks of All Trades Community Development",
  tagline: "One Call. Every Solution.",
  mission: "Revitalizing Detroit neighborhoods and building futures through skilled-trades training.",
  city: "Detroit, Michigan",
  email: "info@joatamp.net",
  phone: "(313) 555-0123",           // update with the real number
  domain: "joatamp.net",
  zeffyUrl: "https://www.zeffy.com/en-US/ticketing/jacks-of-all-trades-community-development",
  social: {
    facebook: "#",
    instagram: "#",
    linkedin: "#",
    youtube: "#",
  },
};

/* ---- 50/50 Raffle -------------------------------------------------------- */
window.JOAT.RAFFLE = {
  drawingDateISO: "2026-11-15T18:00:00-05:00",
  drawingLabel: "November 15, 2026",
  tiers: [
    { price: 1,   tickets: 1,   badge: "" },
    { price: 20,  tickets: 30,  badge: "Popular Choice" },
    { price: 50,  tickets: 70,  badge: "Best Value" },
    { price: 100, tickets: 150, badge: "Community Hero" },
  ],
  // Fallback figures shown before Supabase live data loads.
  potFallback: 12480,
  goal: 100000,
  raisedFallback: 42500,
};

/* ---- Renovation milestone phases ----------------------------------------- */
window.JOAT.PHASES = [
  { n: 1, title: "Mechanicals", detail: "Electrical, plumbing, HVAC & permits", cost: 25000, status: "done" },
  { n: 2, title: "Full Exterior", detail: "Brick paint & seal, windows, porch, roof", cost: 25000, status: "done" },
  { n: 3, title: "Kitchen & Living", detail: "Open layout, cabinets, quartz, LVP flooring", cost: 20000, status: "active" },
  { n: 4, title: "4 Bed / 2 Bath", detail: "Two tile bath remodels, drywall, paint", cost: 15000, status: "upcoming" },
  { n: 5, title: "Basement & Final", detail: "Finished basement + 10% contingency", cost: 15000, status: "upcoming" },
];

/* ---- Impact stats -------------------------------------------------------- */
window.JOAT.STATS = [
  { value: 6,   suffix: "",  label: "Skilled Trade Programs" },
  { value: 100, suffix: "%", label: "Job-Placement Focus" },
  { value: 1,   suffix: ":1", label: "Student–Mentor Ratio" },
  { value: 100, suffix: "K", prefix: "$", label: "Renovation Investment" },
];

/* ---- Trade programs ------------------------------------------------------ */
window.JOAT.TRADES = [
  { key: "electrical", name: "Electrical", desc: "Wiring, circuits, and safety standards for residential systems." },
  { key: "plumbing",   name: "Plumbing",   desc: "Pipefitting, fixtures, drainage, and water-system installation." },
  { key: "carpentry",  name: "Carpentry",  desc: "Framing, finishing, and custom woodwork through real projects." },
  { key: "hvac",       name: "HVAC",       desc: "Heating, ventilation, and air-conditioning system training." },
  { key: "masonry",    name: "Masonry",    desc: "Brick, block, and stone work for durable structures." },
  { key: "welding",    name: "Welding",    desc: "Welding techniques and metal fabrication for the trades." },
];
