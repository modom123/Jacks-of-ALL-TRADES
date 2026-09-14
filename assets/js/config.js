/* ============================================================================
   Jacks of All Trades Community Development — Site Configuration
   File: assets/js/config.js
   Generated: 2026-09-03 16:32 UTC  |  joatamp.org redesign
   Updated: 2026-09-13 17:00 UTC  |  Live Supabase URL + anon public key wired in
   Updated: 2026-09-14 00:59 UTC  |  Zeroed raffle fallbacks (no placeholder numbers; live from raffle_stats)
   Updated: 2026-09-14 11:40 UTC  |  Added shop merchandise list (JOAT.MERCH) + ORG.shopUrl
   Updated: 2026-09-14 11:57 UTC  |  Added individual product images per merch item

   Single source of truth for public site data + Supabase credentials.
   Update the SUPABASE values below with your project's URL + anon key.
   The anon (public) key is safe to expose in the browser; Row Level Security
   protects your data. NEVER place the service_role key in front-end files.
   ========================================================================== */

window.JOAT = window.JOAT || {};

/* ---- Supabase connection (fill these in) --------------------------------- */
window.JOAT.SUPABASE = {
  url: "https://gecnvzjuppmqcfcpmugq.supabase.co",   // Project Settings → API → Project URL
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlY252emp1cHBtcWNmY3BtdWdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMTI0MzAsImV4cCI6MjEwNDg4ODQzMH0.j-I03fuwAX4R_lq3Z6J3GT13WsxosBk755l8GXqbKjw", // anon public — safe to commit (RLS protects data)
};

/* ---- Organization -------------------------------------------------------- */
window.JOAT.ORG = {
  name: "Jacks of All Trades",
  legalName: "Jacks of All Trades Community Development",
  tagline: "One Call. Every Solution.",
  mission: "Revitalizing Detroit neighborhoods and building futures through skilled-trades training.",
  city: "Detroit, Michigan",
  email: "info@joatamp.org",
  phone: "(313) 639-9373",           // update with the real number
  domain: "joatamp.org",
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
  drawingDateISO: "2026-12-28T21:15:00-05:00",
  drawingLabel: "December 28, 2026",
  tiers: [
    { price: 1,   tickets: 1,   badge: "" },
    { price: 20,  tickets: 30,  badge: "Popular Choice" },
    { price: 50,  tickets: 70,  badge: "Best Value" },
    { price: 100, tickets: 150, badge: "Community Hero" },
  ],
  // Fallback figures shown only if live data can't load. Kept at 0 so no
  // placeholder numbers ever appear — real figures come from raffle_stats
  // (set in Command Center → 50/50 Raffle).
  potFallback: 0,
  goal: 100000,
  raisedFallback: 0,
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

/* ---- Shop merchandise ---------------------------------------------------- */
// Optional store URL for instant card checkout (Zeffy store, Shopify, Bonfire,
// etc.). Leave blank to use the on-site order form (saved to Supabase).
window.JOAT.ORG.shopUrl = "";
// Set `price` (a number) on each item when you know it; null shows "See order form".
window.JOAT.MERCH = [
  { name: "Card Logo Hoodie",         cat: "Apparel",   price: null, img: "assets/img/products/hoodie_2026-09-14_1157.jpg",      desc: "Heavyweight fleece hoodie with the Jack of All Trades crest." },
  { name: "Crest Crewneck",           cat: "Apparel",   price: null, img: "assets/img/products/crewneck_2026-09-14_1157.jpg",    desc: "Classic crewneck sweatshirt with embroidered crest." },
  { name: "Card Fan Tee",             cat: "Apparel",   price: null, img: "assets/img/products/tee_2026-09-14_1157.jpg",         desc: "Soft cotton tee with the full card-fan logo." },
  { name: "Sweatsuit Set",            cat: "Apparel",   price: null, img: "assets/img/products/sweatsuit_2026-09-14_1157.jpg",   desc: "Matching hoodie + joggers in the collection colorways." },
  { name: "Card Logo Robe",           cat: "Apparel",   price: null, img: "assets/img/products/robe_2026-09-14_1157.jpg",        desc: "Plush robe with crest embroidery." },
  { name: "Dad Cap",                  cat: "Headwear",  price: null, img: "assets/img/products/cap_2026-09-14_1157.jpg",         desc: "Structured cap with embroidered mark." },
  { name: "Cuffed Beanie",            cat: "Headwear",  price: null, img: "assets/img/products/beanie_2026-09-14_1157.jpg",      desc: "Ribbed knit beanie with woven label." },
  { name: "Varsity Bomber",           cat: "Outerwear", price: null, img: "assets/img/products/varsity_2026-09-14_1157.jpg",     desc: "Wool-body varsity bomber with crest." },
  { name: "MA-1 Flight Bomber",       cat: "Outerwear", price: null, img: "assets/img/products/bomber-navy_2026-09-14_1157.jpg", desc: "Navy flight bomber with full-back card-fan graphic." },
  { name: "Wool Trench Coat",         cat: "Outerwear", price: null, img: "assets/img/products/trench_2026-09-14_1157.jpg",      desc: "Belted burgundy trench with embossed crest." },
  { name: "Hooded Puffer",            cat: "Outerwear", price: null, img: "assets/img/products/puffer_2026-09-14_1157.jpg",      desc: "Insulated puffer with fur-trim hood." },
  { name: "Shearling Leather Jacket", cat: "Outerwear", price: null, img: "assets/img/products/leather_2026-09-14_1157.jpg",    desc: "Distressed leather with shearling collar." },
];

/* ---- Trade programs ------------------------------------------------------ */
window.JOAT.TRADES = [
  { key: "electrical", name: "Electrical", desc: "Wiring, circuits, and safety standards for residential systems." },
  { key: "plumbing",   name: "Plumbing",   desc: "Pipefitting, fixtures, drainage, and water-system installation." },
  { key: "carpentry",  name: "Carpentry",  desc: "Framing, finishing, and custom woodwork through real projects." },
  { key: "hvac",       name: "HVAC",       desc: "Heating, ventilation, and air-conditioning system training." },
  { key: "masonry",    name: "Masonry",    desc: "Brick, block, and stone work for durable structures." },
  { key: "drywall",    name: "Drywall",    desc: "Hanging, taping, mudding, and finishing walls and ceilings for interior build-outs." },
];
