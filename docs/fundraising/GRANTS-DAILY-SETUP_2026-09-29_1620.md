<!--
  Jacks of All Trades — Daily grant leads: setup checklist
  File: docs/fundraising/GRANTS-DAILY-SETUP_2026-09-29_1620.md
  Generated: 2026-09-29 16:20 UTC
-->
# Daily grant leads in the hub: setup checklist

Once these steps are done, **Command Center → Fundraising → Grants** gets about 10 fresh leads every morning. Each lead has a source badge, and new ones are marked **New today**.

| Source | What it finds | Key needed |
|---|---|---|
| **Simpler.Grants.gov** (the new Grants.gov) | Federal grants a 501(c)(3) can apply for, with award floor/ceiling, close date, and contact | `SIMPLER_GRANTS_API_KEY` |
| **Grants.gov (legacy API)** | The same federal grants. Used automatically if the Simpler key isn't set or the Simpler API fails | none |
| **SAM.gov** | Federal contract opportunities (fills 3 of the 10 slots) | `SAM_API_KEY` |

## 1. Get a Simpler.Grants.gov API key (optional, recommended)
Sign in at simpler.grants.gov (with Login.gov), then go to **Developer → API keys** and create a key.

Your fork `modom123/simpler-grants-gov` is the platform's source code. You don't need to run it: the hub calls the hosted API at `api.simpler.grants.gov`.

## 2. Set secrets (server-side only; never in `config.js` or git)
```bash
supabase secrets set SIMPLER_GRANTS_API_KEY=<key>
supabase secrets set SAM_API_KEY=<key>
```

## 3. Deploy the functions
```bash
supabase functions deploy grants-search
supabase functions deploy grants-daily
```

## 4. Turn on the morning schedule
In the Supabase SQL Editor, run `supabase/schedule_grants_daily_2026-09-29_1620.sql`. It runs every day at 8:00am ET.

## 5. Using it (rebuilt 2026-09-29 18:00 UTC)
The Grants screen is now a single view:
- **Find grants** bar: type a keyword (or leave it blank for today's automatic search), choose where to search, and click **Find & save**. Results are saved on the server, duplicates are skipped, and the line underneath reports what was added and names any source that failed.
- **Test connections** shows ✅/❌/⚪ for the database, Simpler.Grants.gov, Grants.gov and SAM.gov.
- **Pipeline** tabs: New → Qualified → Applying → Submitted → Won / Closed. Triage new leads with **✓ Qualify** or **✕**, and change the stage from the dropdown.
- **Open** a lead to edit its details, draft the intro email, call script, proposal or follow-up with Rex or Wes, and send or call.

## Troubleshooting
- **"Unauthorized":** you set `CRON_SECRET`. Add the `x-cron-secret` header to the SQL job. The hub button still works as long as you're signed in.
- **"issue with sam":** SAM.gov keys expire every 90 days. Regenerate the key and set the secret again.
- **0 added:** everything found was already in the pipeline. Leads are de-duplicated by URL.
- **"Can't load grant leads" / Database ❌:** in the Supabase SQL Editor, run `supabase/schema_grants_2026-09-15_1610.sql`.
