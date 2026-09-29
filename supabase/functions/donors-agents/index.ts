// ============================================================================
// Jacks of All Trades — Donor AI team: private + corporate giving (Edge Function)
// File: supabase/functions/donors-agents/index.ts
// Generated: 2026-09-29 19:30 UTC
//
// Two AI fundraisers work the donor CRM toward the $2M plan
// (the 5-agent team goal is $2M: grants $1.2M · corporate $550K · individual $250K — FUNDRAISING_TEAM in config.js):
//
//   Paige (Individual Giving)  thanks new donors within days of a gift, asks
//                              lapsing/lapsed donors to renew, and cultivates
//                              individual prospects — each with a suggested ask.
//   Cole  (Corporate Partners) keeps a pipeline of Detroit-area corporate
//                              prospects (adds real companies, flagged verify),
//                              drafts partnership pitches with sponsorship
//                              options, thanks and renews corporate givers.
//
// HOUSE CAMPAIGN (updated 2026-09-29 21:00 UTC): when a partner_campaigns row is
// active (e.g. the $100K 4 Bed / 2 Bath renovation), Cole works it first — each
// run he researches REAL Detroit-area businesses for the least-covered phase
// using web search (public contact info, source links), adds them tagged with
// the phase, and pitches a phase-specific ask: sponsor the phase in cash or
// donate its materials (in-kind). Setup: supabase/setup_house_campaign_2026-09-29_2100.sql
//
// Every email lands in public.outreach as status "planned" (drafted_by Paige/Cole).
// Nothing is sent automatically: a person reviews it in Command Center → Donor
// Team and clicks Send. Donors tagged "do not contact"/"dnc" are always skipped.
//
// REQUEST  POST {SUPABASE_URL}/functions/v1/donors-agents   { "trigger": "cron" | "hub" }
// AUTH     pg_cron (x-cron-secret if CRON_SECRET is set) or a signed-in hub user
// SECRETS  ANTHROPIC_API_KEY (required) · AI_FAST_MODEL / AI_SMART_MODEL (see _shared/claude.ts)
// MODELS   (updated 2026-09-29 20:15 UTC · mixed, to cut cost) fast tier: all of Paige's emails, thank-yous
//          · smart tier: Cole's company research + pitches (real-company accuracy matters)
// SETUP    supabase/setup_donor_team_2026-09-29_1930.sql (columns, log, schedule)
// DEPLOY   supabase functions deploy donors-agents --no-verify-jwt
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { MODELS, Team, type Tier } from "../_shared/claude.ts";

const num = (k: string, d: number) => Number(Deno.env.get(k)) || d;
const LIMITS = {
  thanks: num("DONOR_AI_THANKS_PER_RUN", 6),
  renewals: num("DONOR_AI_RENEWALS_PER_RUN", 4),
  cultivation: num("DONOR_AI_CULTIVATION_PER_RUN", 4),
  pitches: num("DONOR_AI_PITCHES_PER_RUN", 4),
  newProspects: num("DONOR_AI_NEW_PROSPECTS", 5),
};
const CORP_PIPELINE_MIN = num("DONOR_AI_CORP_PIPELINE_MIN", 15); // keep at least this many corporate prospects
const CAMPAIGN_PER_PHASE = num("DONOR_AI_CAMPAIGN_PER_PHASE", 8);  // businesses to recruit per house phase
const CAMPAIGN_NEW_PER_RUN = num("DONOR_AI_CAMPAIGN_NEW_PER_RUN", 6); // businesses researched per run (one phase)
const CAMPAIGN_PITCHES = num("DONOR_AI_CAMPAIGN_PITCHES_PER_RUN", 6);
const TARGETS = { individual: num("DONOR_INDIVIDUAL_TARGET", 250000), corporate: num("DONOR_CORPORATE_TARGET", 550000) };
const TIME_BUDGET_MS = num("DONOR_AI_TIME_BUDGET_MS", 120000);
const QUIET_DAYS = 45; // don't draft another touch for a donor contacted/drafted within this window

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

const ORG = `Jacks of All Trades Community Development — a Detroit, Michigan 501(c)(3) nonprofit (EIN 41-2680557) that (1) trains residents in six skilled trades, ` +
  `(2) renovates vacant Detroit homes into quality affordable housing, and (3) runs youth apprenticeship & mentoring with job placement. ` +
  `A 50/50 raffle funds a home renovation. Mission: revitalizing Detroit neighborhoods and building futures through skilled-trades training. ` +
  `Contact: info@joatamp.org · (313) 639-9373 · joatamp.org. Gifts are tax-deductible to the extent allowed by law.`;
const HONESTY = "Never invent facts, statistics, outcomes, names, emails, phone numbers, or past gifts. Use [placeholders] in square brackets for anything not given. " +
  "No pressure tactics or false urgency. A person reviews every email before it is sent.";
const AGENTS = {
  paige: "You are Paige, the Individual Giving Officer. You write warm, personal, specific emails to individual donors and prospects: prompt thank-yous that " +
    "show impact, renewal and upgrade asks grounded in the donor's own giving history, lapsed-donor reactivation, and cultivation invitations " +
    "(site visit, volunteer day, the 50/50 raffle, monthly giving). Recommend a realistic ask (typically last gift × 1.2–1.5 for renewals; modest for new prospects). " + HONESTY,
  cole: "You are Cole, the Corporate Partnerships Manager. You build relationships with companies — especially Detroit and Southeast Michigan construction, " +
    "trades, building-supply, utilities, auto, banking and real-estate firms — that benefit from a skilled-trades workforce and stronger neighborhoods. " +
    "You pitch concrete partnership options: cash sponsorship tiers, in-kind tools/materials, employee volunteer build days, sponsoring a home renovation, " +
    "and a hiring pipeline for program graduates. Business-to-business tone, short, one clear next step (a 20-minute call). " + HONESTY,
};

type Row = Record<string, any>;
const DAY = 86400000;
const daysAgo = (d?: string | null) => (d ? (Date.now() - new Date(d).getTime()) / DAY : Infinity);
const dnc = (d: Row) => /do\s*not\s*contact|\bdnc\b|unsubscribe/i.test(`${d.tags || ""} ${d.notes || ""}`);
const isCorp = (d: Row) => d.type === "corporate";
const isIndividual = (d: Row) => !d.type || d.type === "individual";

const donorBrief = (d: Row, gifts: Row[]) => [
  `Name: ${d.full_name} (${d.type || "individual"}, stage: ${d.stage})`,
  d.email && `Email on file: yes`,
  `Total given: $${Number(d.total_given || 0).toLocaleString()}`,
  d.last_gift_amount && `Last gift: $${Number(d.last_gift_amount).toLocaleString()} on ${d.last_gift_date || "unknown date"}`,
  gifts.length && `Recent gifts: ${gifts.slice(0, 5).map((g) => `$${Number(g.amount).toLocaleString()} ${g.gift_date || ""}${g.campaign ? " (" + g.campaign + ")" : ""}`).join("; ")}`,
  d.tags && `Tags: ${d.tags}`,
  d.notes && `Notes: ${String(d.notes).slice(0, 600)}`,
].filter(Boolean).join("\n");

const EMAIL = {
  type: "object",
  properties: {
    subject: { type: "string" },
    body: { type: "string", description: "Plain-text email body, signed from the organization with [Your name] placeholder" },
    suggested_ask_usd: { type: "integer", description: "Recommended ask for the next gift; 0 for a pure thank-you" },
    next_step: { type: "string", description: "The single next action for a person" },
  },
  required: ["subject", "body", "suggested_ask_usd", "next_step"],
  additionalProperties: false,
} as const;
const PROSPECTS = {
  type: "object",
  properties: {
    prospects: {
      type: "array",
      items: {
        type: "object",
        properties: {
          company: { type: "string", description: "A real, currently operating company" },
          industry: { type: "string" },
          why_fit: { type: "string" },
          partnership_angle: { type: "string", description: "Best-fit option: sponsorship, in-kind, volunteer build day, sponsor-a-home, hiring pipeline" },
          suggested_ask_usd: { type: "integer" },
          contact_hint: { type: "string", description: "Which team to reach (e.g. community relations / foundation), never an invented person" },
        },
        required: ["company", "industry", "why_fit", "partnership_angle", "suggested_ask_usd", "contact_hint"],
        additionalProperties: false,
      },
    },
  },
  required: ["prospects"],
  additionalProperties: false,
} as const;

// Businesses found by web research, turned into structured records by the fast model.
const BUSINESSES = {
  type: "object",
  properties: {
    businesses: {
      type: "array",
      items: {
        type: "object",
        properties: {
          company: { type: "string" },
          category: { type: "string", description: "e.g. roofing supply, tile shop, HVAC contractor" },
          city: { type: "string" },
          why_fit: { type: "string", description: "Why they could supply/sponsor this phase" },
          ask_type: { type: "string", enum: ["in_kind", "cash", "both"] },
          in_kind_items: { type: "string", description: "Specific materials/services to ask them for; empty if cash only" },
          suggested_cash_usd: { type: "integer", description: "Realistic cash ask; 0 if in-kind only" },
          in_kind_value_usd: { type: "integer", description: "Rough retail value of the in-kind ask; 0 if cash only" },
          email: { type: "string", description: "Public email exactly as found in the sources, else empty" },
          phone: { type: "string", description: "Public phone exactly as found, else empty" },
          website: { type: "string" },
          address: { type: "string" },
          source_url: { type: "string", description: "Where the business/contact info was found" },
        },
        required: ["company", "category", "city", "why_fit", "ask_type", "in_kind_items", "suggested_cash_usd", "in_kind_value_usd", "email", "phone", "website", "address", "source_url"],
        additionalProperties: false,
      },
    },
  },
  required: ["businesses"],
  additionalProperties: false,
} as const;

async function pool<T>(items: T[], size: number, deadline: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  const worker = async () => { while (i < items.length && Date.now() < deadline) await fn(items[i++]); };
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const started = Date.now(), deadline = started + TIME_BUDGET_MS;

  const url = Deno.env.get("SUPABASE_URL"), svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !svc) return json({ error: "Service role not configured" }, 500);
  const db = createClient(url, svc);

  const secret = Deno.env.get("CRON_SECRET");
  if (secret && req.headers.get("x-cron-secret") !== secret) {
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = token ? await db.auth.getUser(token) : { data: { user: null } };
    if (!u || !u.user) return json({ error: "Unauthorized — sign in to the hub" }, 401);
  }
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "ANTHROPIC_API_KEY secret not set" }, 500);
  const team = new Team(apiKey, ORG);

  let trigger = "hub";
  try { const b = await req.json(); if (b && b.trigger) trigger = String(b.trigger).slice(0, 20); } catch (_e) { /* no body */ }

  const [dRes, gRes, oRes, rRes] = await Promise.all([
    db.from("donors").select("*").limit(5000),
    db.from("donations").select("donor_id,amount,gift_date,campaign").order("gift_date", { ascending: false }).limit(5000),
    db.from("outreach").select("donor_id,status,created_at,drafted_by").order("created_at", { ascending: false }).limit(5000),
    db.from("donor_agent_runs").select("created_at,prospects").gt("prospects", 0).order("created_at", { ascending: false }).limit(1),
  ]);
  for (const [name, r] of [["donors", dRes], ["donations", gRes], ["outreach", oRes]] as const) {
    if (r.error) return json({ error: `Can't read ${name}: ${r.error.message} — run supabase/schema_hub_2026-09-03_1710.sql` }, 500);
  }
  if (rRes.error) return json({ error: "Run supabase/setup_donor_team_2026-09-29_1930.sql in the Supabase SQL Editor first (" + rRes.error.message + ")" }, 500);
  const donors: Row[] = dRes.data || [], gifts: Row[] = gRes.data || [], touches: Row[] = oRes.data || [];
  // Active house/project campaign (table is optional — only after setup_house_campaign SQL).
  const cRes = await db.from("partner_campaigns").select("*").eq("active", true).order("created_at", { ascending: true }).limit(1);
  const campaign: Row | null = !cRes.error && cRes.data && cRes.data[0] ? cRes.data[0] : null;
  const phaseOf = (n: number) => (campaign?.phases || []).find((p: Row) => Number(p.n) === Number(n));

  const giftsOf = (id: string) => gifts.filter((g) => g.donor_id === id);
  const lastTouch = (id: string) => touches.find((t) => t.donor_id === id);
  const quiet = (d: Row) => daysAgo(lastTouch(d.id)?.created_at) > QUIET_DAYS && daysAgo(d.ai_worked_at) > 7;

  const counts = { thank_yous: 0, renewals: 0, cultivation: 0, prospects: 0, pitches: 0 };
  let researchedPhase = "";
  const errors: string[] = [];
  const fail = (who: string, d: Row, e: unknown) => { errors.push(`${who} · ${d.full_name || d.company}: ${msg(e)}`); console.error("[donors-agents]", who, e); };
  const today = new Date().toISOString().slice(0, 10);

  // Draft one email for a donor → outreach (planned) + donor next step.
  const draft = async (who: "paige" | "cole", d: Row, kind: keyof typeof counts, instruction: string, effort: "low" | "medium") => {
    // Thank-yous and all of Paige's emails are routine (fast); Cole's pitches are first impressions with companies (smart).
    const tier: Tier = who === "cole" && kind !== "thank_yous" ? "smart" : "fast";
    const r = await team.ask<any>(tier, AGENTS[who], instruction + "\n\n" + donorBrief(d, giftsOf(d.id)), EMAIL, effort, 6000);
    const name = who === "paige" ? "Paige (AI)" : "Cole (AI)";
    const ins = await db.from("outreach").insert({
      donor_id: d.id, donor_name: d.full_name, channel: "email", status: "planned",
      subject: String(r.subject).slice(0, 300), body: r.body, drafted_by: name, scheduled_date: today,
    });
    if (ins.error) throw new Error("outreach: " + ins.error.message);
    const patch: Row = { ai_next_step: String(r.next_step || "Review and send the drafted email").slice(0, 300), ai_worked_at: new Date().toISOString() };
    if (r.suggested_ask_usd > 0) patch.suggested_ask = r.suggested_ask_usd;
    const up = await db.from("donors").update(patch).eq("id", d.id);
    if (up.error) throw new Error("donor: " + up.error.message);
    Object.assign(d, patch);
    touches.unshift({ donor_id: d.id, status: "planned", created_at: new Date().toISOString(), drafted_by: name });
    counts[kind]++;
  };

  // 1) THANK-YOUS (both agents): gifts in the last 10 days with no touch since the gift
  const thankIds = new Set<string>();
  for (const g of gifts) {
    if (!g.donor_id || daysAgo(g.gift_date) > 10 || thankIds.has(g.donor_id)) continue;
    const t = lastTouch(g.donor_id);
    if (t && new Date(t.created_at) >= new Date(g.gift_date)) continue;
    thankIds.add(g.donor_id);
  }
  const toThank = donors.filter((d) => thankIds.has(d.id) && !dnc(d)).slice(0, LIMITS.thanks);
  await pool(toThank, 4, deadline, async (d) => {
    try {
      await draft(isCorp(d) ? "cole" : "paige", d, "thank_yous",
        "Write a prompt, heartfelt THANK-YOU for their most recent gift. Say concretely what support like theirs makes possible (without inventing statistics). No new ask in this email; suggested_ask_usd = 0 unless an upgrade later is clearly appropriate.", "low");
    } catch (e) { fail("Thank-you", d, e); }
  });

  // 2) PAIGE — renewals (active, last gift 10+ months) and reactivation (lapsed)
  const toRenew = donors.filter((d) => isIndividual(d) && !dnc(d) && quiet(d) && !thankIds.has(d.id) &&
    ((d.stage === "active" && daysAgo(d.last_gift_date) > 300) || d.stage === "lapsed"))
    .sort((a, b) => Number(b.total_given || 0) - Number(a.total_given || 0)).slice(0, LIMITS.renewals);
  await pool(toRenew, 4, deadline, async (d) => {
    try {
      await draft("paige", d, "renewals", d.stage === "lapsed"
        ? "Write a warm REACTIVATION email to this lapsed donor: thank them for past support, share what's new, and invite them back with a specific, modest ask."
        : "Write a RENEWAL email: thank them for last year's support and ask them to renew — suggest a specific amount (or monthly giving) based on their history.", "medium");
    } catch (e) { fail("Paige", d, e); }
  });

  // 3) PAIGE — cultivate individual prospects that have an email
  const toCultivate = donors.filter((d) => isIndividual(d) && !dnc(d) && d.email && ["prospect", "cultivating"].includes(d.stage) && quiet(d) && !thankIds.has(d.id))
    .slice(0, LIMITS.cultivation);
  await pool(toCultivate, 4, deadline, async (d) => {
    try {
      await draft("paige", d, "cultivation",
        "Write a friendly CULTIVATION email to this prospect: introduce the work, invite them to one concrete way to get involved (site visit, volunteer day, the 50/50 raffle), and include a soft first-gift ask.", "medium");
    } catch (e) { fail("Paige", d, e); }
  });

  // 4a) COLE — house campaign: research real local businesses for the least-covered phase
  if (campaign && Date.now() < deadline) {
    const recruited = (n: number) => donors.filter((d) => d.partner_campaign === campaign.name && Number(d.campaign_phase) === Number(n)).length;
    const phase = [...(campaign.phases || [])].sort((a: Row, b: Row) => recruited(a.n) - recruited(b.n))[0];
    if (phase && recruited(phase.n) < CAMPAIGN_PER_PHASE) {
      try {
        const known = donors.filter(isCorp).map((d) => d.full_name).slice(0, 300).join("; ") || "(none yet)";
        const notes = await team.research(AGENTS.cole,
          `Use web search to find ${CAMPAIGN_NEW_PER_RUN} REAL, currently operating businesses in Detroit and nearby communities (Wayne, Oakland and Macomb counties) ` +
          `that could donate materials/services for, or sponsor, this phase of our house renovation:\n\n` +
          `Project: ${campaign.name} — ${campaign.location || "Detroit"}. ${campaign.brief || ""}\n` +
          `Phase ${phase.n}: ${phase.name} ($${Number(phase.cost).toLocaleString()}) — ${phase.scope}\n` +
          `Materials needed: ${(phase.materials || []).join("; ")}\nBusiness types to look for: ${(phase.businesses || []).join("; ")}\n\n` +
          `Prefer locally owned or Detroit-rooted suppliers and contractors, plus local branches of larger suppliers with community-giving programs. ` +
          `For each, report: name, category, city, why they fit, what to ask for (materials or cash), and their PUBLIC contact email, phone, website and address ` +
          `exactly as published, with the source URL. Leave a field blank rather than guess. Skip these (already contacted): ${known}.`,
          10);
        const r = await team.ask<any>("fast", "You convert research notes into structured records. Copy contact details exactly as written in the notes; leave a field empty if it isn't there. Never invent a business, email or phone.",
          "Research notes:\n\n" + notes, BUSINESSES, "low", 8000);
        const seen = new Set(donors.map((d) => String(d.full_name).toLowerCase().trim()));
        const clean = (v: unknown, n: number) => { const t = String(v || "").trim(); return t && !/^(n\/a|none|unknown|not found)$/i.test(t) ? t.slice(0, n) : null; };
        const rows = (r.businesses || []).filter((b: Row) => b.company && !seen.has(String(b.company).toLowerCase().trim())).slice(0, CAMPAIGN_NEW_PER_RUN).map((b: Row) => ({
          full_name: String(b.company).slice(0, 200), type: "corporate", stage: "prospect", source: "Cole (AI web research) — verify",
          email: clean(b.email, 160) && /@/.test(b.email) ? clean(b.email, 160) : null,
          phone: clean(b.phone, 40), address: clean(b.address, 300),
          partner_campaign: campaign.name, campaign_phase: Number(phase.n),
          tags: ["corporate", "house campaign", `phase ${phase.n}`, String(b.category || "").slice(0, 40), b.ask_type === "cash" ? "cash" : "in-kind"].filter(Boolean).join(", "),
          notes: [`Phase ${phase.n} (${phase.name}) — ${b.category}, ${b.city}`, `Why: ${b.why_fit}`,
            b.in_kind_items ? `Ask for (in-kind): ${b.in_kind_items}${b.in_kind_value_usd > 0 ? ` (~$${Number(b.in_kind_value_usd).toLocaleString()} value)` : ""}` : "",
            b.suggested_cash_usd > 0 ? `Cash ask: $${Number(b.suggested_cash_usd).toLocaleString()}` : "",
            b.website ? `Website: ${b.website}` : "", b.source_url ? `Source: ${b.source_url}` : "", "[verify contact before sending]"].filter(Boolean).join("\n"),
          suggested_ask: (Number(b.suggested_cash_usd) || 0) + (Number(b.in_kind_value_usd) || 0) || null,
          ai_next_step: b.email ? "Verify the contact, then review Cole's phase pitch" : "Find a contact email (see website), then review Cole's phase pitch",
        }));
        if (rows.length) {
          const ins = await db.from("donors").insert(rows).select();
          if (ins.error) throw new Error(ins.error.message);
          donors.push(...(ins.data || []));
          counts.prospects += rows.length;
        }
        researchedPhase = `Phase ${phase.n} (${phase.name})`;
      } catch (e) { fail("Cole house-campaign research", { full_name: `phase ${phase.n}` }, e); }
    }
  }

  // 4) COLE — keep the corporate prospect pipeline stocked (at most weekly)
  const corpProspects = donors.filter((d) => isCorp(d) && ["prospect", "cultivating"].includes(d.stage));
  const lastProspecting = rRes.data && rRes.data[0];
  if (!campaign && corpProspects.length < CORP_PIPELINE_MIN && daysAgo(lastProspecting?.created_at) > 6 && Date.now() < deadline) {
    try {
      const known = donors.filter(isCorp).map((d) => d.full_name).join("; ") || "(none yet)";
      const r = await team.ask<any>("smart", AGENTS.cole,
        `Suggest ${LIMITS.newProspects} NEW corporate partnership prospects in Detroit / Southeast Michigan that are real, currently operating companies ` +
        `with a plausible reason to support a skilled-trades workforce and neighborhood-housing nonprofit. Mix sizes (not only Fortune 500). ` +
        `Exclude companies already in our CRM: ${known}. Never invent a contact person.`, PROSPECTS, "medium", 8000);
      const seen = new Set(donors.map((d) => String(d.full_name).toLowerCase().trim()));
      const rows = (r.prospects || []).filter((p: Row) => p.company && !seen.has(String(p.company).toLowerCase().trim())).slice(0, LIMITS.newProspects).map((p: Row) => ({
        full_name: String(p.company).slice(0, 200), type: "corporate", stage: "prospect", source: "Cole (AI) — verify",
        tags: ["corporate", "AI prospect", String(p.industry || "").slice(0, 40)].filter(Boolean).join(", "),
        notes: `Why: ${p.why_fit}\nAngle: ${p.partnership_angle}\nReach: ${p.contact_hint} [verify the right contact]`,
        suggested_ask: p.suggested_ask_usd > 0 ? p.suggested_ask_usd : null,
        ai_next_step: `Find the ${p.contact_hint || "community relations"} contact, add their email, then review Cole's pitch`,
      })); // ai_worked_at left empty so Cole pitches the new prospects in this same run
      if (rows.length) {
        const ins = await db.from("donors").insert(rows).select();
        if (ins.error) throw new Error(ins.error.message);
        donors.push(...(ins.data || []));
        counts.prospects = rows.length;
      }
    } catch (e) { fail("Cole prospecting", { full_name: "pipeline" }, e); }
  }

  // 5) COLE — pitches to corporate prospects + renewals for corporate givers
  const toPitch = donors.filter((d) => isCorp(d) && !dnc(d) && quiet(d) && !thankIds.has(d.id) &&
    (["prospect", "cultivating"].includes(d.stage) || (d.stage === "active" && daysAgo(d.last_gift_date) > 300) || d.stage === "lapsed"))
    .sort((a, b) => (Number(!!b.partner_campaign) - Number(!!a.partner_campaign)) || (Number(b.suggested_ask || 0) - Number(a.suggested_ask || 0)))
    .slice(0, campaign ? Math.max(LIMITS.pitches, CAMPAIGN_PITCHES) : LIMITS.pitches);
  await pool(toPitch, 4, deadline, async (d) => {
    try {
      const renewal = d.stage === "active" || d.stage === "lapsed";
      const ph = campaign && d.partner_campaign === campaign.name ? phaseOf(d.campaign_phase) : null;
      if (ph && !renewal) {
        await draft("cole", d, "pitches",
          `Write a short, specific first-touch email asking this local business to help with ONE phase of our house renovation.\n` +
          `Project: ${campaign!.name} (${campaign!.location || "Detroit"}), total budget $${Number(campaign!.goal).toLocaleString()}. ${campaign!.brief || ""}\n` +
          `Their phase: Phase ${ph.n} — ${ph.name} ($${Number(ph.cost).toLocaleString()}): ${ph.scope}. Materials needed: ${(ph.materials || []).join("; ")}.\n` +
          `Make ONE clear ask based on their notes (donate specific materials/services, sponsor part or all of the phase in cash, or a discount at cost), ` +
          `offer recognition (site signage, website, social media, raffle materials, a ribbon-cutting), and ask for a 15-minute call or a site visit. ` +
          `Mention that residents in our trades program help build it. Set suggested_ask_usd to the dollar value of the ask. ` +
          (d.email ? "" : "We don't have a named contact — address it to [Contact name] and note in next_step that a contact is needed."), "medium");
        return;
      }
      await draft("cole", d, "pitches", renewal
        ? "Write a short partnership RENEWAL email: thank them for their past support and propose renewing (or growing) the partnership for the coming year with 2–3 concrete options."
        : "Write a short first-touch PARTNERSHIP PITCH email to this company's community-relations / giving team: why this partnership fits them, 2–3 concrete options " +
          "(e.g. sponsor a home renovation, tools/materials in-kind, employee build day, hiring pipeline, cash sponsorship tier), and a request for a 20-minute call. " +
          (d.email ? "" : "We don't have a contact yet — address it to [Contact name] and note that in next_step."), "medium");
    } catch (e) { fail("Cole", d, e); }
  });

  // 6) Log the run with YTD giving vs targets
  const year = String(new Date().getFullYear());
  const typeOf = new Map(donors.map((d) => [d.id, d.type || "individual"]));
  const ytd = (t: string) => gifts.filter((g) => String(g.gift_date || "").startsWith(year) && (typeOf.get(g.donor_id) || "individual") === t)
    .reduce((s, g) => s + (Number(g.amount) || 0), 0);
  const pendingAsks = (t: string) => donors.filter((d) => (d.type || "individual") === t && touches.some((x) => x.donor_id === d.id && x.status === "planned"))
    .reduce((s, d) => s + (Number(d.suggested_ask) || 0), 0);
  const goal = {
    individual: { target: TARGETS.individual, ytd: Math.round(ytd("individual")), asks_in_review: Math.round(pendingAsks("individual")) },
    corporate: { target: TARGETS.corporate, ytd: Math.round(ytd("corporate")), asks_in_review: Math.round(pendingAsks("corporate")) },
  };
  let campaignGoal: Row | null = null;
  if (campaign) {
    const cg = gifts.filter((g) => g.campaign === campaign.name);
    campaignGoal = {
      name: campaign.name, goal: Number(campaign.goal), pledged: Math.round(cg.reduce((s, g) => s + (Number(g.amount) || 0), 0)),
      businesses: donors.filter((d) => d.partner_campaign === campaign.name).length,
    };
    (goal as Row).campaign = campaignGoal;
  }
  const summary = `Paige & Cole drafted ${counts.thank_yous} thank-yous, ${counts.renewals} renewals, ${counts.cultivation} cultivation emails and ` +
    `${counts.pitches} corporate pitches` + (counts.prospects ? `; Cole added ${counts.prospects} new corporate prospects${researchedPhase ? " for the house " + researchedPhase : ""} (verify each)` : "") + "." +
    (campaignGoal ? ` House campaign: $${campaignGoal.pledged.toLocaleString()} of $${campaignGoal.goal.toLocaleString()} pledged, ${campaignGoal.businesses} businesses in the pipeline.` : "") +
    (Date.now() >= deadline ? " Stopped at the time limit — the next run continues." : "");
  const cost = team.cost();
  const summaryWithCost = summary + " AI cost " + cost.line + ".";
  const { error: logErr } = await db.from("donor_agent_runs").insert({ trigger, ...counts, errors, summary: summaryWithCost, goal: { ...goal, ai_cost_usd: cost.usd } });
  if (logErr) errors.push("log: " + logErr.message);

  return json({ ok: true, ...counts, errors, summary: summaryWithCost, goal, cost_usd: cost.usd, seconds: Math.round((Date.now() - started) / 1000), models: MODELS });
});
