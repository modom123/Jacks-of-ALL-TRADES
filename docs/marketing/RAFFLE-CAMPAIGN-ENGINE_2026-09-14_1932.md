<!--
  Jacks of All Trades — Raffle Campaign Engine
  Generated: 2026-09-14 19:32 UTC
  How the AI marketing engine works today, and how to wire real sending
  (Twilio / email / social) compliantly. Keep this with the codebase.
-->

# Raffle Campaign Engine — AI marketing for the 50/50 raffle

**Goal:** use AI agents to market the raffle across **social, email, SMS, and voice**, driving ticket sales to the Dec 28, 2026 Ford Field draw — **without breaking the law or the org's trust.**

## What's built now (Phase 1 — content engine, live)

- **Command Center → Marketing → Raffle Campaign.** Nova (the Communications AI agent) drafts multi-channel content on a countdown cadence. You pick channels, timeframe, and angle; Nova returns ready-to-review items.
- **Human-in-the-loop pipeline.** Every item lands as a **draft**. You edit, then move it through **approved → scheduled → sent**. Nothing sends itself.
- **Consent capture.** The raffle page now has a "Get raffle updates" opt-in that writes to `public.marketing_consent` with explicit SMS/voice/email consent and the exact disclosure text.
- **Tables:** `campaign_content` (the pipeline) and `marketing_consent` (opt-ins). See `supabase/schema_raffle_campaign_2026-09-14_1932.sql`.

### To turn it on
1. Run `supabase/schema_raffle_campaign_2026-09-14_1932.sql` in the Supabase SQL Editor.
2. Make sure the **ai-agent** function is deployed and `ANTHROPIC_API_KEY` is set (Nova needs it for live drafts; otherwise it returns simulated copy).
3. Open the Command Center → **Raffle Campaign** → **Generate drafts**.

## Compliance — read before sending SMS or voice

Your contact list is **not yet opted in**, so:

- **Social & email:** low risk. Email must include a physical mailing address and one-click unsubscribe (CAN-SPAM).
- **SMS & voice:** U.S. **TCPA** requires **prior express written consent** for automated marketing texts/calls. Only message rows in `marketing_consent` where the matching flag (`sms_opt_in` / `voice_opt_in`) is `true` and `opted_out_at` is null. **Honor STOP immediately.** Penalties are $500–$1,500 **per** message/call.
- **Raffle advertising:** follow your Michigan charitable-gaming license terms (18+, MI residents, official rules link, "not a condition of purchase").
- Never imply guaranteed winnings, and never present a Cash App/Zelle donation as a raffle entry (entries go through Zeffy).

## Phase 2 — wiring real sending (next)

Each channel is a small Supabase Edge Function triggered from the pipeline when an item is **approved/scheduled**. Keys stay server-side (secrets), never in the browser.

| Channel | Service you chose | Function (to add) | Notes |
|---|---|---|---|
| Email | your email provider (Resend/Mailchimp/SendGrid) | `send-email` | Include unsubscribe + address. Batch to `email_opt_in`. |
| SMS | Twilio | `send-sms` | To `sms_opt_in` only. Append "Reply STOP to opt out". Handle inbound STOP → set `opted_out_at`. |
| Voice | Twilio | `place-call` | To `voice_opt_in` only. Play the approved script (TTS or recording). Respect call-time-of-day rules. |
| Social | Buffer / Zapier / Meta | scheduler webhook | Push approved posts to your scheduler; or copy/paste from the pipeline. |

**Recommended build order:** Email → Social scheduler → SMS → Voice (rising compliance burden). Say the word and I'll build the `send-email` function first (needs your provider + API key as a Supabase secret), then a Twilio `send-sms` with STOP handling.

## Data model

- `campaign_content(channel, title, body, cta_url, audience, scheduled_at, status, drafted_by, meta)`
- `marketing_consent(name, phone, email, sms_opt_in, voice_opt_in, email_opt_in, consent_text, consent_source, opted_out_at)`
