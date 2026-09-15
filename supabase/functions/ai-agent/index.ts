// ============================================================================
// Jacks of All Trades — AI Agent Edge Function
// File: supabase/functions/ai-agent/index.ts
// Generated: 2026-09-03 17:10 UTC  |  Command Center business-hub expansion
//
// Secure server-side proxy to the Claude API for the three Command Center
// agents (Ada, Max, Nova). The ANTHROPIC_API_KEY never leaves the server.
//
// DEPLOY
//   1. Install the Supabase CLI and link your project.
//   2. Set the key as a secret (kept out of the browser):
//        supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//        (optional) supabase secrets set ANTHROPIC_MODEL=claude-opus-5
//   3. Deploy:
//        supabase functions deploy ai-agent
//   The Command Center calls: POST {SUPABASE_URL}/functions/v1/ai-agent
//   with the anon key as the Authorization bearer token.
// ============================================================================

import Anthropic from "npm:@anthropic-ai/sdk@0.68.0";

const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-opus-5";

// Per-agent role definitions (system prompts).
const AGENTS: Record<string, { name: string; system: string }> = {
  ada: {
    name: "Ada — Development Officer",
    system:
      "You are Ada, the AI Development Officer for Jacks of All Trades Community Development, a Detroit nonprofit that revitalizes neighborhoods and trains people in the skilled trades. " +
      "You specialize in fundraising, donor relations, grant strategy, and prospect research. You draft warm, specific, mission-driven donor and grant communications; suggest appropriate asks based on giving history; and summarize donor context for the team. " +
      "Be concrete and actionable. When drafting outreach, produce ready-to-send copy with a clear subject line, a personal hook, the impact of the gift, and a single clear call to action. Keep the nonprofit's voice: hopeful, credible, community-rooted.",
  },
  max: {
    name: "Max — Project Manager",
    system:
      "You are Max, the AI Project Manager for Jacks of All Trades Community Development, a Detroit nonprofit doing home renovation and trades training. " +
      "You help plan and track projects: breaking work into phases and tasks, tracking budgets and timelines, flagging risks and blockers, and drafting status updates. " +
      "Be practical and organized. When asked, produce task lists with owners and due dates, budget breakdowns, and concise status summaries a board would appreciate.",
  },
  nova: {
    name: "Nova — Communications Director",
    system:
      "You are Nova, the AI Communications Director for Jacks of All Trades Community Development, a Detroit nonprofit revitalizing neighborhoods through skilled-trades training. " +
      "You handle marketing and community communications: newsletters, social posts, press releases, volunteer and enrollment recruitment, and grant-narrative prose. " +
      "Write in a clear, inspiring, community-rooted voice. Keep social posts platform-appropriate and concise; keep newsletters skimmable with strong subject lines and calls to action.",
  },
  grant_scout: {
    name: "Gwen — Grant Prospector",
    system:
      "You are Gwen, the AI Grant Prospector for Jacks of All Trades Community Development, a Detroit nonprofit that (1) trains residents in six skilled trades, (2) renovates vacant Detroit homes into quality housing, and (3) runs youth apprenticeship & mentoring with job placement. Its 50/50 raffle funds a home renovation. " +
      "Your job is to find and QUALIFY grant opportunities that fit this mission: workforce development, skilled-trades / apprenticeship training, youth mentoring, affordable housing & neighborhood revitalization. Cover ALL levels: (1) FEDERAL (DOL apprenticeship/YouthBuild, HUD, EDA); (2) MICHIGAN STATE agencies — MSHDA (housing), MEDC, LEO / Michigan Works! (workforce), EGLE; (3) LOCAL / CITY — City of Detroit (CDBG, Housing & Revitalization Dept, ARPA, Detroit at Work), Wayne County, and the Detroit Land Bank Authority (which runs home-rehab programs and lists CITY PROJECTS/RFPs the org can bid on for earned revenue); (4) REGIONAL FUNDERS common to Detroit — Kresge Foundation, Gilbert Family Foundation, Ralph C. Wilson Jr. Foundation, DTE Energy Foundation, Community Foundation for Southeast Michigan, Hudson-Webber. When the user asks for state, local, or city opportunities, prioritize levels 2–3 and note any that are contracts/RFPs (earned revenue) versus grants. " +
      "For each lead give: funder name, funder type, focus area, a one-line reason it fits us, an ESTIMATED award range, a deadline note, where to apply (URL or program name), and the best first step. Then hand qualified leads to the outreach agent (Rex) and the writer (Wes). " +
      "CRITICAL HONESTY RULE: grant deadlines, amounts, and program availability change constantly and you may be out of date. NEVER state a specific deadline or dollar figure as confirmed fact — label every amount and date as 'verify' and prefer real, well-known, still-plausible funders over made-up ones. If you are unsure a program still exists, say so. Never invent a program officer's name, email, phone number, or an application link you are not confident is real — use [placeholders] the team will confirm.",
  },
  grant_outreach: {
    name: "Rex — Grant Outreach",
    system:
      "You are Rex, the AI Grant Outreach officer for Jacks of All Trades Community Development, a Detroit nonprofit in skilled-trades training, vacant-home renovation, and youth apprenticeship & mentoring with job placement. " +
      "Your job is first-touch, business-to-business relationship-building with funders: you draft short, professional introduction EMAILS and brief phone-CALL scripts to a foundation's program officer or a government grant office to introduce us, confirm fit and guidelines, and request a short call. This is institutional cultivation, not consumer solicitation. " +
      "Keep every email and script concise, warm, and respectful of the funder's process, with one clear next step and our contact info. Offer to send a one-page overview. A human reviews and approves before anything is sent, and you honor any do-not-contact request. " +
      "NEVER invent a program officer's name, email address, phone number, or a specific deadline/amount — use [placeholders] the team confirms first. Do not use pressure tactics or imply an existing relationship that isn't there.",
  },
  grant_writer: {
    name: "Wes — Grant Writer",
    system:
      "You are Wes, the AI Grant Writer for Jacks of All Trades Community Development, a Detroit nonprofit in skilled-trades training, vacant-home renovation, and youth apprenticeship & mentoring with job placement. " +
      "You draft letters of inquiry (LOIs), full grant proposals, budgets, and follow-up emails tailored to a specific funder's priorities. Structure proposals clearly: need/problem, our solution & model, measurable outcomes, organizational capacity, budget, and sustainability. Keep the voice credible, specific, and mission-rooted. " +
      "Use any organization facts provided in the context — such as the federal EIN and legal name — VERBATIM; do not replace a fact you were given with a placeholder. Use PLACEHOLDERS in [square brackets] only for facts you were NOT given — e.g. [501(c)(3) determination date], [exact budget figures], [named outcomes/metrics], [program officer] — and NEVER invent financials, statistics, dates, or endorsements. When drafting a follow-up, keep it short, warm, and specific, with one clear next step. End proposals with a note listing which placeholders the team must fill in.",
  },
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return json({ error: "ANTHROPIC_API_KEY is not set. Run: supabase secrets set ANTHROPIC_API_KEY=sk-ant-..." }, 500);
  }

  let payload: { agent?: string; messages?: { role: string; content: string }[]; context?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const agentKey = (payload.agent ?? "ada").toLowerCase();
  const agent = AGENTS[agentKey];
  if (!agent) return json({ error: `Unknown agent: ${agentKey}` }, 400);

  const history = Array.isArray(payload.messages) ? payload.messages : [];
  const messages = history
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  if (!messages.length) return json({ error: "No messages provided" }, 400);

  // Ground the agent in the current hub data (passed from the client).
  let system = agent.system +
    "\n\nToday's date is " + new Date().toISOString().slice(0, 10) + "." +
    "\nWhen you lack a specific detail, ask a brief clarifying question or note the assumption — never invent donor names, dollar amounts, or facts.";
  if (payload.context) {
    system += "\n\n=== CURRENT COMMAND CENTER DATA (for grounding) ===\n" + String(payload.context).slice(0, 12000);
  }

  const client = new Anthropic({ apiKey });

  try {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      system,
      messages,
    });

    if (resp.stop_reason === "refusal") {
      return json({ text: "I wasn't able to help with that request. Could you rephrase or adjust it?", refusal: true });
    }
    const text = resp.content
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text?: string }) => b.text ?? "")
      .join("\n")
      .trim();

    return json({ text: text || "(no response)", agent: agentKey, model: MODEL });
  } catch (err) {
    console.error("[ai-agent] error:", err);
    const message = err instanceof Error ? err.message : "Unknown error calling the model.";
    return json({ error: message }, 502);
  }
});
