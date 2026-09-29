// ============================================================================
// Jacks of All Trades — Grants AI team automation (Edge Function)
// File: supabase/functions/grants-agents/index.ts
// Generated: 2026-09-29 19:00 UTC
//
// Works the grant pipeline toward the $2M goal. Each run, every agent does its
// job on a batch of leads (nothing is ever SENT — a person reviews and sends):
//
//   Gwen (Prospector)  scores every New lead 0-100 for fit; qualifies strong
//                      fits, dismisses clear misfits, suggests a request size.
//   Rex  (Outreach)    for Qualified leads: drafts the intro email + call script.
//   Wes  (Writer)      for the highest-value Qualified/Contacted leads: drafts
//                      the proposal/LOI and sets our request amount (→ Drafting);
//                      for Submitted leads 14+ days old: drafts the follow-up.
//
// Then it logs the run (grant_agent_runs) with the Road-to-$2M math.
//
// REQUEST  POST {SUPABASE_URL}/functions/v1/grants-agents   { "trigger": "cron" | "hub" }
// AUTH     pg_cron (x-cron-secret if CRON_SECRET is set) or a signed-in hub user
// SECRETS  ANTHROPIC_API_KEY (required) · AI_FAST_MODEL / AI_SMART_MODEL (see _shared/claude.ts)
// MODELS   (updated 2026-09-29 20:15 UTC · mixed, to cut cost) fast tier: Gwen scoring, Rex outreach,
//          Wes follow-ups · smart tier: Wes proposals
// SETUP    supabase/setup_grants_ai_team_2026-09-29_1900.sql (columns, log, schedule)
// DEPLOY   supabase functions deploy grants-agents --no-verify-jwt
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { MODELS, Team } from "../_shared/claude.ts";

const num = (k: string, d: number) => Number(Deno.env.get(k)) || d;
const LIMITS = {
  score: num("GRANTS_AI_SCORE_PER_RUN", 12),
  outreach: num("GRANTS_AI_OUTREACH_PER_RUN", 4),
  proposals: num("GRANTS_AI_PROPOSALS_PER_RUN", 2),
  followups: num("GRANTS_AI_FOLLOWUPS_PER_RUN", 3),
};
const QUALIFY_AT = num("GRANTS_AI_QUALIFY_SCORE", 65);
const DISMISS_AT = num("GRANTS_AI_DISMISS_SCORE", 30);
const GRANTS_TARGET = num("GRANTS_ANNUAL_TARGET", 1200000); // $800K gov + $400K foundations (config.js)
const TIME_BUDGET_MS = num("GRANTS_AI_TIME_BUDGET_MS", 120000); // stop starting new work after this

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

// Public org facts (same as assets/js/config.js).
const ORG = `Jacks of All Trades Community Development — a Detroit, Michigan 501(c)(3) nonprofit that (1) trains residents in six skilled trades, ` +
  `(2) renovates vacant Detroit homes into quality affordable housing, and (3) runs youth apprenticeship & mentoring with job placement. ` +
  `A 50/50 raffle funds a home renovation. Mission: revitalizing Detroit neighborhoods and building futures through skilled-trades training. ` +
  `Grant applicant legal name (use verbatim): Jacks of All Trades. Federal EIN (use verbatim): 41-2680557. ` +
  `Contact: info@joatamp.org · (313) 639-9373 · joatamp.org. Early-stage organization building toward a $2,000,000 annual budget.`;

const HONESTY = "Never invent facts, statistics, program-officer names, emails, phone numbers, deadlines or dollar amounts. " +
  "Use [placeholders] in square brackets for anything not given. A person reviews everything before it is sent.";

const AGENTS = {
  gwen: "You are Gwen, the Grant Prospector for this nonprofit. You judge how well a funding opportunity fits the organization and whether it is worth the team's time. " +
    "Be strict about eligibility: an opportunity only for states, tribes, universities, hospitals, for-profit contractors with past performance, or a different geography is a poor fit. " +
    "SAM.gov items are federal CONTRACTS (earned revenue, competitive bids), not grants — score them on whether a small Detroit trades nonprofit could realistically bid. " + HONESTY,
  rex: "You are Rex, Grant Outreach. You write short, warm, professional first-touch emails and ~30-second phone scripts to a funder's program office: introduce the " +
    "organization, confirm fit and how to apply, and ask for a brief call. Business-to-business cultivation; no pressure, no implied relationship. " + HONESTY,
  wes: "You are Wes, the Grant Writer. You draft letters of inquiry / proposals structured as: need, our model, measurable outcomes, organizational capacity, " +
    "budget, sustainability; and short follow-up emails after submission. Use the org facts given verbatim; use [placeholders] for anything else " +
    "(e.g. [501(c)(3) determination date], [budget line items], [outcome metrics]). End proposals with the list of placeholders to fill in. " + HONESTY,
};

type Lead = Record<string, any>;
const leadBrief = (l: Lead) => [
  `Opportunity: ${l.focus_area || "(untitled)"}`,
  `Funder: ${l.funder} (${l.funder_type})`,
  l.est_amount && `Award size: ${l.est_amount}`,
  l.deadline_note && `Deadline: ${l.deadline_note}`,
  l.fit_reason && `Notes: ${l.fit_reason}`,
  l.notes && `Details: ${l.notes}`,
  l.contact_name && `Contact: ${l.contact_name}`,
  l.contact_email && `Contact email: ${l.contact_email}`,
  l.url && `Listing: ${l.url}`,
  l.amount_requested && `Our request: $${Number(l.amount_requested).toLocaleString()}`,
  l.submitted_at && `Submitted on: ${l.submitted_at}`,
].filter(Boolean).join("\n");

// ---- schemas (structured outputs) -------------------------------------------
const SCORE = {
  type: "object",
  properties: {
    fit_score: { type: "integer", description: "0-100: how well this fits the org AND how likely they are eligible and competitive" },
    decision: { type: "string", enum: ["qualify", "review", "dismiss"] },
    priority: { type: "string", enum: ["high", "medium", "low"] },
    reason: { type: "string", description: "1-2 sentences: why, including any eligibility concern" },
    suggested_request_usd: { type: "integer", description: "Realistic request for this org within the award range; 0 if unknown" },
    next_step: { type: "string", description: "The single next action for a person, e.g. 'Confirm nonprofit eligibility in the NOFO'" },
  },
  required: ["fit_score", "decision", "priority", "reason", "suggested_request_usd", "next_step"],
  additionalProperties: false,
} as const;
const OUTREACH = {
  type: "object",
  properties: {
    email_subject: { type: "string" },
    email_body: { type: "string" },
    call_script: { type: "string" },
    next_step: { type: "string" },
  },
  required: ["email_subject", "email_body", "call_script", "next_step"],
  additionalProperties: false,
} as const;
const PROPOSAL = {
  type: "object",
  properties: {
    request_usd: { type: "integer", description: "The specific amount we request (0 if the award size is unknown)" },
    proposal: { type: "string", description: "The full LOI/proposal draft, ending with the placeholders list" },
    next_step: { type: "string" },
  },
  required: ["request_usd", "proposal", "next_step"],
  additionalProperties: false,
} as const;
const FOLLOWUP = {
  type: "object",
  properties: { email_subject: { type: "string" }, email_body: { type: "string" }, next_step: { type: "string" } },
  required: ["email_subject", "email_body", "next_step"],
  additionalProperties: false,
} as const;

// Run fn over items with limited concurrency, skipping work once the time budget is spent.
async function pool<T>(items: T[], size: number, deadline: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  const worker = async () => { while (i < items.length && Date.now() < deadline) await fn(items[i++]); };
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
}

const deadlineOf = (l: Lead): Date | null => {
  const t = String(l.deadline_note || "");
  let m = t.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = t.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? new Date(+m[3], +m[1] - 1, +m[2]) : null;
};
const isClosed = (l: Lead) => { const d = deadlineOf(l); return !!d && d.getTime() < Date.now() - 86400000; };

// Road-to-goal math: won + stage-weighted pipeline vs the annual grants target.
const WIN_ODDS: Record<string, number> = { qualified: 0.05, contacted: 0.08, drafting: 0.12, submitted: 0.2, follow_up: 0.22 };
function goalMath(leads: Lead[]) {
  const amt = (l: Lead) => Number(l.amount_requested) || 0;
  const won = leads.filter((l) => l.status === "awarded").reduce((s, l) => s + amt(l), 0);
  const weighted = leads.reduce((s, l) => s + amt(l) * (WIN_ODDS[l.status] || 0), 0);
  const submittedAsks = leads.filter((l) => ["submitted", "follow_up", "awarded", "declined"].includes(l.status) && amt(l) > 0).map(amt);
  const avgAsk = submittedAsks.length ? submittedAsks.reduce((a, b) => a + b, 0) / submittedAsks.length : 150000;
  const gap = Math.max(0, GRANTS_TARGET - won - weighted);
  return {
    target: GRANTS_TARGET, won: Math.round(won), weighted_pipeline: Math.round(weighted), gap: Math.round(gap),
    avg_request: Math.round(avgAsk),
    // At ~20% win rate, each submitted proposal is worth ~avgAsk × 0.2
    proposals_needed: Math.ceil(gap / Math.max(1, avgAsk * 0.2)),
    submitted: leads.filter((l) => ["submitted", "follow_up"].includes(l.status)).length,
  };
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

  const { data: all, error: loadErr } = await db.from("grant_leads")
    .select("*").not("status", "in", "(archived,declined)").order("created_at", { ascending: false }).limit(1000);
  if (loadErr) return json({ error: "Can't read grant_leads: " + loadErr.message }, 500);
  const leads: Lead[] = all || [];
  if (leads.length && !("fit_score" in leads[0])) {
    return json({ error: "Run supabase/setup_grants_ai_team_2026-09-29_1900.sql in the Supabase SQL Editor first (adds the AI columns)." }, 500);
  }

  const counts = { scored: 0, qualified: 0, dismissed: 0, outreach: 0, proposals: 0, followups: 0 };
  const errors: string[] = [];
  const now = () => new Date().toISOString();
  const save = async (l: Lead, patch: Lead) => {
    const { error } = await db.from("grant_leads").update({ ...patch, ai_worked_at: now() }).eq("id", l.id);
    if (error) throw new Error("save: " + error.message);
    Object.assign(l, patch);
  };
  const fail = (who: string, l: Lead, e: unknown) => { errors.push(`${who} · ${String(l.focus_area || l.funder).slice(0, 60)}: ${msg(e)}`); console.error("[grants-agents]", who, e); };

  // 1) GWEN — score New leads (unscored first; closed deadlines dismissed without an AI call)
  const toScore = leads.filter((l) => l.status === "identified" && l.fit_score == null).slice(0, LIMITS.score);
  await pool(toScore, 6, deadline, async (l) => {
    try {
      if (isClosed(l)) {
        await save(l, { fit_score: 0, priority: "low", status: "archived", ai_next_step: "Deadline passed", fit_reason: "Dismissed by Gwen: the deadline has passed. " + (l.fit_reason || "") });
        counts.scored++; counts.dismissed++; return;
      }
      const r = await team.ask<any>("fast", AGENTS.gwen, "Score this opportunity for our organization.\n\n" + leadBrief(l), SCORE, "low", 4000);
      const score = Math.max(0, Math.min(100, Math.round(r.fit_score)));
      const status = score >= QUALIFY_AT && r.decision !== "dismiss" ? "qualified" : score <= DISMISS_AT || r.decision === "dismiss" ? "archived" : "identified";
      const patch: Lead = {
        fit_score: score, priority: ["high", "medium", "low"].includes(r.priority) ? r.priority : "medium",
        ai_next_step: String(r.next_step || "").slice(0, 300), status,
        fit_reason: (status === "archived" ? "Dismissed by Gwen: " : "Gwen: ") + String(r.reason || "").slice(0, 500),
      };
      if (!l.amount_requested && r.suggested_request_usd > 0) patch.amount_requested = r.suggested_request_usd;
      await save(l, patch);
      counts.scored++;
      if (status === "qualified") counts.qualified++;
      if (status === "archived") counts.dismissed++;
    } catch (e) { fail("Gwen", l, e); }
  });

  const byValue = (a: Lead, b: Lead) => (b.fit_score || 0) * (Number(b.amount_requested) || 1) - (a.fit_score || 0) * (Number(a.amount_requested) || 1);
  const open = (l: Lead) => !isClosed(l);

  // 2) REX — intro email + call script for Qualified leads without one
  const toOutreach = leads.filter((l) => l.status === "qualified" && !l.intro_email_draft && open(l)).sort(byValue).slice(0, LIMITS.outreach);
  await pool(toOutreach, 4, deadline, async (l) => {
    try {
      const r = await team.ask<any>("fast", AGENTS.rex, "Draft the first-touch intro email and a ~30-second call script for this funder.\n\n" + leadBrief(l), OUTREACH, "medium", 6000);
      await save(l, {
        intro_email_draft: `Subject: ${r.email_subject}\n\n${r.email_body}`,
        call_script_draft: r.call_script,
        ai_next_step: String(r.next_step || "Review Rex's intro email, confirm the contact, and send").slice(0, 300),
      });
      counts.outreach++;
    } catch (e) { fail("Rex", l, e); }
  });

  // 3) WES — proposals for the highest-value leads with a live deadline (or rolling), soonest first
  const soonest = (a: Lead, b: Lead) => ((deadlineOf(a)?.getTime() ?? 9e15) - (deadlineOf(b)?.getTime() ?? 9e15)) || byValue(a, b);
  const toPropose = leads.filter((l) => ["qualified", "contacted"].includes(l.status) && !l.proposal_draft && (l.fit_score == null || l.fit_score >= QUALIFY_AT) && open(l))
    .sort(soonest).slice(0, LIMITS.proposals);
  await pool(toPropose, 2, deadline, async (l) => {
    try {
      const r = await team.ask<any>("smart", AGENTS.wes,
        "Draft the letter of inquiry / proposal for this opportunity. Size the request realistically within the award range for an early-stage organization.\n\n" + leadBrief(l),
        PROPOSAL, "medium", 16000);
      const patch: Lead = { proposal_draft: r.proposal, status: "drafting", ai_next_step: String(r.next_step || "Fill the [placeholders] in Wes's proposal, then submit").slice(0, 300) };
      if (r.request_usd > 0) patch.amount_requested = r.request_usd;
      await save(l, patch);
      counts.proposals++;
    } catch (e) { fail("Wes", l, e); }
  });

  // 4) WES — follow-ups for Submitted leads 14+ days old
  const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
  const toFollow = leads.filter((l) => l.status === "submitted" && l.submitted_at && l.submitted_at <= twoWeeksAgo && !l.followup_draft).slice(0, LIMITS.followups);
  await pool(toFollow, 3, deadline, async (l) => {
    try {
      const r = await team.ask<any>("fast", AGENTS.wes, "Draft a short, warm follow-up email about our submitted proposal.\n\n" + leadBrief(l), FOLLOWUP, "low", 4000);
      await save(l, { followup_draft: `Subject: ${r.email_subject}\n\n${r.email_body}`, status: "follow_up", ai_next_step: String(r.next_step || "Review and send Wes's follow-up").slice(0, 300) });
      counts.followups++;
    } catch (e) { fail("Wes", l, e); }
  });

  // 5) Log the run with the Road-to-$2M snapshot
  const { data: fresh } = await db.from("grant_leads").select("status,amount_requested").limit(2000);
  const goal = goalMath(fresh || leads);
  const backlog = {
    to_score: leads.filter((l) => l.status === "identified" && l.fit_score == null).length,
    to_outreach: leads.filter((l) => l.status === "qualified" && !l.intro_email_draft).length,
  };
  const summary = `Gwen scored ${counts.scored} (${counts.qualified} qualified, ${counts.dismissed} dismissed) · ` +
    `Rex drafted ${counts.outreach} intro emails · Wes drafted ${counts.proposals} proposals and ${counts.followups} follow-ups.` +
    (backlog.to_score ? ` ${backlog.to_score} leads still waiting for Gwen.` : "") +
    (Date.now() >= deadline ? " Stopped at the time limit — the next run continues." : "");
  const cost = team.cost();
  const summaryWithCost = summary + " AI cost " + cost.line + ".";
  const { error: logErr } = await db.from("grant_agent_runs").insert({ trigger, ...counts, errors, summary: summaryWithCost, goal: { ...goal, ai_cost_usd: cost.usd } });
  if (logErr) errors.push("log: " + logErr.message);

  return json({ ok: true, ...counts, errors, summary: summaryWithCost, goal, backlog, cost_usd: cost.usd, seconds: Math.round((Date.now() - started) / 1000), models: MODELS });
});
