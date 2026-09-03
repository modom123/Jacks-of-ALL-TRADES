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
