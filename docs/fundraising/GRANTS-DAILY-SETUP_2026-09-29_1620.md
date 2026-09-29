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

## 5. Check it
In the hub's Grants view, click **Run daily finder now**. The message that pops up shows how many leads each source added and names any source that failed. New leads show up in the Pipeline, and you can narrow it with the **All sources** filter.

## Troubleshooting
- **"Unauthorized":** you set `CRON_SECRET`. Add the `x-cron-secret` header to the SQL job. The hub button still works as long as you're signed in.
- **"issue with sam":** SAM.gov keys expire every 90 days. Regenerate the key and set the secret again.
- **0 added:** every opportunity found today was already in the pipeline. Leads are de-duplicated by URL.
