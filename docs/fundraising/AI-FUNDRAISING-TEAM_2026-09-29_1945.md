<!--
  Jacks of All Trades — AI fundraising team: how it works + one-time setup
  File: docs/fundraising/AI-FUNDRAISING-TEAM_2026-09-29_1945.md
  Generated: 2026-09-29 19:45 UTC
-->
# AI fundraising team: 5 agents, one $2M goal

| Team | Agent | Job | Share of $2M |
|---|---|---|---|
| Grants | **Gwen**, Grant Prospector | Scores every new grant lead 0–100 for fit, qualifies strong fits, dismisses misfits (including passed deadlines), suggests a request size | $1,200,000 |
| | **Rex**, Grant Outreach | Drafts the intro email and call script for each qualified funder | |
| | **Wes**, Grant Writer | Drafts proposals for the highest-value leads, soonest deadline first, and sets the ask. Drafts follow-ups 14 days after submission | |
| Donors | **Paige**, Individual Giving | Thank-yous within days of a gift, renewal asks, lapsed-donor reactivation, cultivating individual prospects | $250,000 |
| | **Cole**, Corporate Partnerships | Keeps 15+ Detroit-area companies in the pipeline (each flagged *verify*), pitches sponsorship, in-kind, build-day and hiring-pipeline partnerships, and renews partners | $550,000 |

To change the split, edit `window.JOAT.FUNDRAISING_TEAM` in `assets/js/config.js`.

**Nothing is ever sent automatically.** The agents write drafts, and a person reviews and clicks **Send**:
- **Grants**: in the Grants screen, open a lead to see its email, call script, proposal and follow-up.
- **Donors**: in the Fundraising Team screen, use the **Review & send** list.

Donors tagged `do not contact` or `dnc` are always skipped. A donor contacted in the last 45 days isn't drafted again.

## House campaign: $100K renovation, businesses and materials (added 2026-09-29 21:00 UTC)
Cole's first priority is the **4 Bed / 2 Bath Community Renovation**. It has the same five phases and $100,000 budget as the 50/50 raffle flyer:

| Phase | Budget | Businesses Cole looks for |
|---|---|---|
| 1. Mechanicals | $25,000 | Electrical and plumbing supply houses, HVAC contractors and distributors |
| 2. Full Exterior | $25,000 | Paint stores, roofing contractors and suppliers, window companies, lumber yards, masons |
| 3. Kitchen & Living | $20,000 | Cabinet shops, quartz fabricators, flooring stores, drywall suppliers, appliance stores |
| 4. 4 Bed / 2 Bath | $15,000 | Tile shops, plumbing fixture showrooms, millwork and door suppliers, paint stores |
| 5. Basement / Final | $15,000 | Waterproofing companies, insulation suppliers, lumber yards, lighting stores |

**How Cole works it:**
- **Research:** each run, he picks the phase with the fewest businesses so far. He then **searches the web** for about 6 real businesses in Detroit and Wayne, Oakland and Macomb counties.
- **Records:** he saves each business with its public email, phone, website and address exactly as published, plus the source link.
- **Asks:** he drafts a phase-specific ask: donate the materials, sponsor part or all of the phase in cash, or supply at cost. Every ask offers recognition and requests a 15-minute call or a site visit.

**Your part:**
- **Review and send:** in **Fundraising Team → Review & send**, verify each contact, fill any `[Contact name]`, and send.
- **Record pledges:** when a business says yes, click **Record pledge** in the House project panel and enter cash or material value for its phase. The panel shows each phase's progress, and Cole drafts the thank-you on his next run.

**Setup:** in the Supabase SQL Editor, run `supabase/setup_house_campaign_2026-09-29_2100.sql` once. Then redeploy `donors-agents`.

**Cost:** web research adds about $0.10–0.15 per run, including about 8 searches at $10 per 1,000.

**Tuning secrets:**
- `DONOR_AI_CAMPAIGN_PER_PHASE`: businesses to recruit per phase (default 8).
- `DONOR_AI_CAMPAIGN_NEW_PER_RUN`: businesses researched per run (default 6).
- `DONOR_AI_CAMPAIGN_PITCHES_PER_RUN`: pitches drafted per run (default 6).

**Pausing:** `update partner_campaigns set active = false where name = '4 Bed / 2 Bath Community Renovation';`

## When they work
- **8:00am ET:** the grant finder adds about 10 new leads.
- **8:30am, 12:30pm and 4:30pm ET:** the grants team (Gwen, then Rex, then Wes) works a batch.
- **Monday, Wednesday and Friday at 9:15am ET:** the donor team (Paige and Cole) works a batch.

**Quality over quantity** (2026-09-29 20:30 UTC): half the runs of the original schedule, Gwen qualifies only leads scoring 70 or more, and Wes thinks harder on each proposal.
- **Any time:** the **Run grants team** and **Run donor team** buttons on the Fundraising Team screen start a run immediately.

## One-time setup
1. **Database:** in the Supabase SQL Editor, run each of these files once:
   - `supabase/setup_grants_ai_team_2026-09-29_1900.sql`
   - `supabase/setup_donor_team_2026-09-29_1930.sql`
2. **Claude API key:** it must already be set as a Supabase secret (Gwen, Rex and Wes chat use it). If it isn't:
   `supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref gecnvzjuppmqcfcpmugq`
3. **Deploy the functions** from the repo folder:
   ```powershell
   git pull origin main
   supabase functions deploy grants-agents --no-verify-jwt --project-ref gecnvzjuppmqcfcpmugq
   supabase functions deploy donors-agents --no-verify-jwt --project-ref gecnvzjuppmqcfcpmugq
   supabase functions deploy ai-agent --project-ref gecnvzjuppmqcfcpmugq
   ```
   If the `SUPABASE_ACCESS_TOKEN` GitHub secret is set, the **Deploy grant functions** GitHub Action does this automatically on every push.
4. In the hub, open **Fundraising Team** and click **Run grants team**, then **Run donor team**.

## Cost: mixed models (updated 2026-09-29 20:15 UTC)
The team uses two Claude models to keep costs low:

| Tier | Default model | Price per 1M tokens | Used for |
|---|---|---|---|
| **Fast** | `claude-haiku-4-5` | $1 in / $5 out | Gwen's scoring, Rex's intro emails and call scripts, Wes's follow-ups, all of Paige's emails, thank-yous |
| **Smart** | `claude-sonnet-5-5` | $2 in / $10 out | Wes's proposals, Cole's company research and partnership pitches |

Every run reports its estimated AI cost in the run summary, for example *"AI cost ~$0.25 (claude-haiku-4-5 ×14, claude-sonnet-5-5 ×4)"*. You'll see it on the Fundraising Team screen and in `grant_agent_runs` / `donor_agent_runs`.

To change a tier, set a Supabase secret:
```powershell
supabase secrets set AI_SMART_MODEL=claude-opus-5-5 --project-ref gecnvzjuppmqcfcpmugq   # best proposals, higher cost
supabase secrets set AI_FAST_MODEL=claude-sonnet-5-5 --project-ref gecnvzjuppmqcfcpmugq   # better routine emails
```
The older `GRANTS_AI_MODEL` / `DONOR_AI_MODEL` secrets, if set, override the smart tier. To go back to the defaults, run `supabase secrets unset` on them.

## Tuning (optional Supabase secrets)
- **Grants batch size per run:** `GRANTS_AI_SCORE_PER_RUN` (12), `GRANTS_AI_OUTREACH_PER_RUN` (4), `GRANTS_AI_PROPOSALS_PER_RUN` (2), `GRANTS_AI_FOLLOWUPS_PER_RUN` (3).
- **Gwen's score thresholds:** `GRANTS_AI_QUALIFY_SCORE` (70) and `GRANTS_AI_DISMISS_SCORE` (30).
- **Donor batch size per run:** `DONOR_AI_THANKS_PER_RUN` (6), `DONOR_AI_RENEWALS_PER_RUN` (4), `DONOR_AI_CULTIVATION_PER_RUN` (4), `DONOR_AI_PITCHES_PER_RUN` (4), `DONOR_AI_NEW_PROSPECTS` (5).
- **Cole's pipeline size:** `DONOR_AI_CORP_PIPELINE_MIN` (15).
- **Pausing a team:** in the SQL Editor, run `select cron.unschedule('joat-grants-ai-team');` or `select cron.unschedule('joat-donor-team');`.
