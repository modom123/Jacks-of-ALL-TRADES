// ============================================================================
// Jacks of All Trades — shared Claude helper for the AI fundraising team
// File: supabase/functions/_shared/claude.ts
// Generated: 2026-09-29 20:15 UTC
//
// "Mixed" model routing to keep cost down:
//   fast  (routine: scoring, intro emails, thank-yous, renewals, follow-ups)
//         → AI_FAST_MODEL,  default claude-haiku-4-5   ($1 / $5 per 1M tokens)
//   smart (high-stakes: Wes's proposals, Cole's company research + pitches)
//         → AI_SMART_MODEL, default claude-sonnet-5-5  ($2 / $10 per 1M tokens)
// Set either secret to any Claude model id to change it, e.g.
//   supabase secrets set AI_SMART_MODEL=claude-opus-5-5
//
// Every call uses structured outputs (JSON schema) and returns token usage so
// each run can report its estimated cost.
//
// Updated 2026-09-29 21:00 UTC · research(): smart model + Anthropic web search
// (located in Detroit) for finding REAL local businesses and their public
// contact info. Web search can't be combined with structured outputs, so
// research returns notes that a fast-model ask() then turns into JSON.
// ============================================================================

import Anthropic from "npm:@anthropic-ai/sdk@0.129.0";
import { betaJSONSchemaOutputFormat } from "npm:@anthropic-ai/sdk@0.129.0/helpers/beta/json-schema";

export type Tier = "fast" | "smart";

export const MODELS: Record<Tier, string> = {
  fast: Deno.env.get("AI_FAST_MODEL") ?? "claude-haiku-4-5",
  // GRANTS_AI_MODEL / DONOR_AI_MODEL (older setting) still override the smart tier.
  smart: Deno.env.get("AI_SMART_MODEL") ?? Deno.env.get("GRANTS_AI_MODEL") ?? Deno.env.get("DONOR_AI_MODEL") ?? "claude-sonnet-5-5",
};

// $ per 1M tokens [input, output] — for the run's cost estimate only.
const PRICES: [RegExp, number, number][] = [
  [/haiku-4-5/, 1, 5],
  [/sonnet-5-5|sonnet-5\b/, 2, 10],
  [/sonnet-4/, 3, 15],
  [/opus-5-5/, 4, 20],
  [/opus/, 5, 25],
  [/fable|mythos/, 10, 50],
];
const price = (model: string) => PRICES.find(([re]) => re.test(model)) ?? [/./, 5, 25];

// Feature support differs by model: Haiku 4.5 rejects `effort` and server-side fallbacks.
const supportsEffort = (m: string) => !/haiku/.test(m);
const supportsFallbacks = (m: string) => /^claude-(opus-5|sonnet-5-5|fable-5)/.test(m);

const WEB_SEARCH_USD = 10 / 1000; // $10 per 1,000 searches

export class Team {
  private client: Anthropic;
  usage: Record<string, { calls: number; input: number; output: number }> = {};
  searches = 0;

  constructor(apiKey: string, private org: string) {
    this.client = new Anthropic({ apiKey });
  }

  async ask<T>(tier: Tier, system: string, prompt: string, schema: any, effort: "low" | "medium" | "high", maxTokens: number): Promise<T> {
    const model = MODELS[tier];
    const params: any = {
      model,
      max_tokens: maxTokens,
      output_config: supportsEffort(model) ? { effort, format: betaJSONSchemaOutputFormat(schema) } : { format: betaJSONSchemaOutputFormat(schema) },
      system: system + "\n\nOrganization facts: " + this.org + "\nToday's date: " + new Date().toISOString().slice(0, 10) + ".",
      messages: [{ role: "user", content: prompt }],
    };
    if (supportsFallbacks(model)) {
      params.betas = ["server-side-fallback-2026-07-01"];
      params.fallbacks = "default"; // re-run on Anthropic's recommended model if a safety classifier declines
    }
    const res = await this.client.beta.messages.parse(params);
    const u = (this.usage[model] ??= { calls: 0, input: 0, output: 0 });
    u.calls++;
    u.input += (res.usage?.input_tokens ?? 0) + (res.usage?.cache_read_input_tokens ?? 0) + (res.usage?.cache_creation_input_tokens ?? 0);
    u.output += res.usage?.output_tokens ?? 0;
    if (res.stop_reason === "refusal") throw new Error("model declined");
    if (res.stop_reason === "max_tokens") throw new Error("response cut off (max_tokens)");
    if (!res.parsed_output) throw new Error("no structured output");
    return res.parsed_output as T;
  }

  /** Web research with the smart model: returns plain-text findings (with sources). */
  async research(system: string, prompt: string, maxSearches = 8): Promise<string> {
    const model = MODELS.smart;
    const messages: any[] = [{ role: "user", content: prompt }];
    const params: any = {
      model,
      max_tokens: 16000,
      system: system + "\n\nOrganization facts: " + this.org + "\nToday's date: " + new Date().toISOString().slice(0, 10) + ".",
      tools: [{
        type: "web_search_20260209", name: "web_search", max_uses: maxSearches,
        user_location: { type: "approximate", city: "Detroit", region: "Michigan", country: "US", timezone: "America/Detroit" },
      }],
      messages,
    };
    if (supportsEffort(model)) params.output_config = { effort: "medium" };
    let text = "";
    // A long server-side search loop can pause; resume by sending the paused turn back (max 3 times).
    for (let i = 0; i < 4; i++) {
      const res: any = await this.client.beta.messages.create(params);
      const u = (this.usage[model] ??= { calls: 0, input: 0, output: 0 });
      u.calls++;
      u.input += (res.usage?.input_tokens ?? 0) + (res.usage?.cache_read_input_tokens ?? 0) + (res.usage?.cache_creation_input_tokens ?? 0);
      u.output += res.usage?.output_tokens ?? 0;
      this.searches += res.usage?.server_tool_use?.web_search_requests ?? 0;
      if (res.stop_reason === "refusal") throw new Error("model declined");
      text += res.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
      if (res.stop_reason !== "pause_turn") break;
      messages.push({ role: "assistant", content: res.content });
    }
    if (!text.trim()) throw new Error("research returned no findings");
    return text;
  }

  /** Estimated $ for this run, plus a one-line breakdown per model. */
  cost(): { usd: number; line: string } {
    let usd = 0;
    const parts = Object.entries(this.usage).map(([m, u]) => {
      const [, pin, pout] = price(m);
      const c = (u.input * pin + u.output * pout) / 1e6;
      usd += c;
      return `${m} ×${u.calls}`;
    });
    if (this.searches) { usd += this.searches * WEB_SEARCH_USD; parts.push(`${this.searches} web searches`); }
    return { usd: Math.round(usd * 1000) / 1000, line: parts.length ? `~$${usd.toFixed(2)} (${parts.join(", ")})` : "$0 (no AI calls)" };
  }
}
