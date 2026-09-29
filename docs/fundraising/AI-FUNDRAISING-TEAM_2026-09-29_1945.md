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
