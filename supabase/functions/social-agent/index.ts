// ============================================================================
// Jacks of All Trades — Nova: social media fundraising posts (Edge Function)
// File: supabase/functions/social-agent/index.ts
// Generated: 2026-09-29 22:30 UTC
//
// Nova (Communications Director) drafts a week of platform-native fundraising
// posts — Facebook, Instagram (post / reel / story), TikTok, YouTube Shorts,
// LinkedIn, X, Threads, Nextdoor — each with the tracked giving link for that
// platform (give.html?src=<platform>&c=<campaign>) and a suggested photo from
// our own library. Posts are saved to public.social_posts as "planned"; a
// person reviews, copies and posts them (Command Center → Social Fundraising).
// Nothing is posted automatically.
//
// REQUEST  POST {SUPABASE_URL}/functions/v1/social-agent
//          { "campaign": "house" | "raffle" | "general", "days": 7, "platforms": ["facebook", ...] }
// AUTH     pg_cron (x-cron-secret if CRON_SECRET is set) or a signed-in hub user
// SECRETS  ANTHROPIC_API_KEY · SITE_URL (default https://joatamp.org) · AI_SMART_MODEL
// SETUP    supabase/setup_social_fundraising_2026-09-29_2230.sql
// DEPLOY   supabase functions deploy social-agent --no-verify-jwt
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { MODELS, Team } from "../_shared/claude.ts";

const SITE = (Deno.env.get("SITE_URL") || "https://joatamp.org").replace(/\/$/, "");
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

const ORG = `Jacks of All Trades Community Development — a Detroit, Michigan 501(c)(3) nonprofit (EIN 41-2680557) that trains residents in six skilled trades, ` +
  `renovates vacant Detroit homes into quality affordable housing, and runs youth apprenticeship & mentoring with job placement. ` +
  `Current project: a vacant 4-bed / 2-bath brick home, fully renovated in 5 phases ($100,000 budget: mechanicals, exterior, kitchen, bedrooms/baths, basement). ` +
  `A 50/50 raffle (drawing at Ford Field) splits the pot: half to one winner, half to the renovation. Tagline: "One Call. Every Solution." Contact: info@joatamp.org.`;

// Photos we actually have (site-relative), so Nova only suggests real images.
const MEDIA = [
  "assets/img/project-before-after.jpg", "assets/img/home-exterior-before-1.jpg", "assets/img/home-exterior-before-2.jpg",
  "assets/img/home-exterior-after.jpg", "assets/img/interior-living.jpg", "assets/img/interior-bedroom.jpg",
  "assets/img/renovation-crew-joat_2026-09-13_1601.jpg", "assets/img/trades-collage_2026-09-13_1548.jpg",
  "assets/img/volunteer-heroes_2026-09-13_1548.jpg", "assets/img/raffle-booth-fordfield_2026-09-13_1636.jpg",
  "assets/img/programs-before-after_2026-09-14_0137.jpg", "assets/img/community-1.jpg", "assets/img/community-2.jpg",
];

const PLATFORMS: Record<string, string> = {
  facebook: "Facebook — 1–3 short paragraphs, story-driven, link in the post. Also suggest a Facebook Fundraiser/Donate-button angle when fitting.",
  instagram: "Instagram — a feed post or Reel caption (hook in the first line, line breaks, 5–10 hashtags). Link goes in bio / link sticker: say 'link in bio'.",
  tiktok: "TikTok — a 20–40 second video SCRIPT: on-screen hook (first 2 seconds), 3–5 shot beats, voiceover lines, caption with 3–5 hashtags. Say 'link in bio'.",
  youtube: "YouTube Shorts — a 30–50 second video script + title + description with the link.",
  linkedin: "LinkedIn — professional, workforce-development angle (skilled-trades shortage, hiring pipeline, corporate matching/sponsorship). Link in post.",
  x: "X — a 2–4 post thread, each under 270 characters, link in the last post.",
  threads: "Threads — conversational, 1–2 short posts, link included.",
  nextdoor: "Nextdoor — neighborly, hyper-local Detroit tone, invite neighbors to follow the renovation and give. Link included.",
};

const SCHEMA = {
  type: "object",
  properties: {
    posts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          platform: { type: "string", enum: Object.keys(PLATFORMS) },
          kind: { type: "string", enum: ["post", "reel", "story", "short", "video", "thread"] },
          day: { type: "integer", description: "Day offset from today, 0-6" },
          caption: { type: "string", description: "Ready-to-post text (or script). Use {LINK} where the giving link goes." },
          hashtags: { type: "string" },
          media: { type: "string", description: "One path from the provided photo list, or 'film new: <what to film>'" },
        },
        required: ["platform", "kind", "day", "caption", "hashtags", "media"],
        additionalProperties: false,
      },
    },
  },
  required: ["posts"],
  additionalProperties: false,
} as const;

const NOVA = "You are Nova, Communications Director for this Detroit nonprofit. You write platform-native social media posts that raise money: a strong hook, " +
  "a real human story (trainees learning a trade while rebuilding a home for a family), one specific ask with a concrete dollar-to-impact example, and a clear call " +
  "to action with the giving link. Vary angles across the week (before/after, meet-a-trainee, what $X buys, milestone/progress, behind-the-scenes, thank-you, " +
  "start-your-own-fundraiser). Never invent statistics, names, quotes, dollar totals or outcomes — use [placeholders] for any specific the team must fill in. " +
  "Do NOT promote the 50/50 raffle on TikTok or YouTube (platform rules on gambling content); there, ask for donations only.";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
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

  let b: { campaign?: string; days?: number; platforms?: string[] } = {};
  try { b = (await req.json()) || {}; } catch (_e) { /* defaults */ }
  const campaign = ["house", "raffle", "general"].includes(String(b.campaign)) ? String(b.campaign) : "house";
  const days = Math.max(1, Math.min(Number(b.days) || 7, 14));
  const platforms = (Array.isArray(b.platforms) && b.platforms.length ? b.platforms : Object.keys(PLATFORMS)).filter((p) => PLATFORMS[p]);

  // Ground the posts in live progress (optional tables — ignore if missing).
  let progress = "";
  try {
    const { data: c } = await db.from("partner_campaigns").select("name,goal").eq("active", true).limit(1);
    if (c && c[0]) {
      const { data: g } = await db.from("donations").select("amount").eq("campaign", c[0].name).limit(5000);
      const raised = (g || []).reduce((s: number, x: any) => s + (Number(x.amount) || 0), 0);
      progress = `House campaign progress: $${Math.round(raised).toLocaleString()} of $${Number(c[0].goal).toLocaleString()} pledged (cash + donated materials).`;
    }
  } catch (_e) { /* optional */ }
  const { data: old } = await db.from("social_posts").select("caption").order("created_at", { ascending: false }).limit(20);
  const recent = (old || []).map((p: any) => String(p.caption || "").slice(0, 120)).join("\n- ");

  const team = new Team(apiKey, ORG);
  try {
    const r = await team.ask<any>("smart", NOVA,
      `Draft ${days} days of fundraising posts for the "${campaign}" campaign. Write ONE post per platform for each of these platforms` +
      (days > 3 ? `, and a SECOND post (different angle, later day) for facebook, instagram and tiktok` : "") + `:\n` +
      platforms.map((p) => `- ${PLATFORMS[p]}`).join("\n") +
      `\n\nSpread them across days 0-${days - 1}. ${progress}\nPhotos you may suggest (use exact paths): ${MEDIA.join(", ")}.\n` +
      (recent ? `Avoid repeating these recent posts:\n- ${recent}\n` : ""),
      SCHEMA, "medium", 16000);

    const today = new Date();
    const rows = (r.posts || []).filter((p: any) => PLATFORMS[p.platform]).map((p: any) => {
      const link = `${SITE}/give.html?src=${p.platform}&c=${campaign}`;
      const d = new Date(today.getTime() + Math.max(0, Math.min(days - 1, Number(p.day) || 0)) * 86400000);
      return {
        platform: p.platform, campaign, kind: p.kind, scheduled_date: d.toISOString().slice(0, 10),
        caption: String(p.caption || "").replaceAll("{LINK}", link), hashtags: p.hashtags || null,
        media_hint: p.media || null, link, status: "planned", drafted_by: "Nova (AI)",
      };
    });
    if (!rows.length) return json({ error: "Nova returned no posts — try again" }, 502);
    const { error } = await db.from("social_posts").insert(rows);
    if (error) return json({ error: "Saving posts failed: " + error.message + " — run supabase/setup_social_fundraising_2026-09-29_2230.sql" }, 500);
    const cost = team.cost();
    return json({ ok: true, created: rows.length, campaign, summary: `Nova drafted ${rows.length} posts for ${platforms.length} platforms. AI cost ${cost.line}.`, models: MODELS });
  } catch (e) {
    console.error("[social-agent]", e);
    return json({ error: msg(e) }, 502);
  }
});
