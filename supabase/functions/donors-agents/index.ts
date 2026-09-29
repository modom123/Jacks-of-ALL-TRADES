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

  const giftsOf = (id: string) => gifts.filter((g) => g.donor_id === id);
  const lastTouch = (id: string) => touches.find((t) => t.donor_id === id);
  const quiet = (d: Row) => daysAgo(lastTouch(d.id)?.created_at) > QUIET_DAYS && daysAgo(d.ai_worked_at) > 7;

  const counts = { thank_yous: 0, renewals: 0, cultivation: 0, prospects: 0, pitches: 0 };
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

  // 4) COLE — keep the corporate prospect pipeline stocked (at most weekly)
  const corpProspects = donors.filter((d) => isCorp(d) && ["prospect", "cultivating"].includes(d.stage));
  const lastProspecting = rRes.data && rRes.data[0];
  if (corpProspects.length < CORP_PIPELINE_MIN && daysAgo(lastProspecting?.created_at) > 6 && Date.now() < deadline) {
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
    .sort((a, b) => Number(b.suggested_ask || 0) - Number(a.suggested_ask || 0)).slice(0, LIMITS.pitches);
  await pool(toPitch, 4, deadline, async (d) => {
    try {
      const renewal = d.stage === "active" || d.stage === "lapsed";
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
  const summary = `Paige & Cole drafted ${counts.thank_yous} thank-yous, ${counts.renewals} renewals, ${counts.cultivation} cultivation emails and ` +
    `${counts.pitches} corporate pitches` + (counts.prospects ? `; Cole added ${counts.prospects} new corporate prospects (verify each)` : "") + "." +
    (Date.now() >= deadline ? " Stopped at the time limit — the next run continues." : "");
  const cost = team.cost();
  const summaryWithCost = summary + " AI cost " + cost.line + ".";
  const { error: logErr } = await db.from("donor_agent_runs").insert({ trigger, ...counts, errors, summary: summaryWithCost, goal: { ...goal, ai_cost_usd: cost.usd } });
  if (logErr) errors.push("log: " + logErr.message);

  return json({ ok: true, ...counts, errors, summary: summaryWithCost, goal, cost_usd: cost.usd, seconds: Math.round((Date.now() - started) / 1000), models: MODELS });
});
