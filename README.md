<!--
  Jacks of All Trades Community Development — README
  File: README.md
  Generated: 2026-09-03 16:32 UTC  |  joatamp.net redesign
-->

# Jacks of All Trades Community Development — joatamp.net

A modern, Fortune 500–quality website and business hub for **Jacks of All Trades
Community Development**, a Detroit nonprofit revitalizing neighborhoods and
building futures through skilled-trades training.

- **Public site** — splash entry, homepage, 50/50 raffle, impact/renovation
  showcase, programs, get-involved, shop, and contact.
- **Command Center** — an auth-protected business hub (`/admin`) to manage
  leads, fundraising figures, and renovation milestones.
- **Supabase-ready** — forms and the dashboard connect to Supabase; the site
  runs in graceful demo/fallback mode until you add your credentials.

Built as dependency-free HTML/CSS/JS (no build step) so it deploys anywhere,
including GitHub Pages. The Supabase SDK loads from a CDN at runtime.

---

## Palette

Blue · White · Silver · Black — defined as design tokens in
`assets/css/theme.css`.

---

## Project structure

```
/
├── index.html              Splash / entry page
├── home.html               Homepage
├── raffle.html             50/50 Raffle hub (tiers, countdown, Zeffy + QR)
├── impact.html             Impact & before/after renovation showcase
├── programs.html           Trades training + enrollment form
├── get-involved.html       Donate · volunteer · partner
├── shop.html               Shop to support
├── contact.html            Contact + transparency
├── admin/
│   └── index.html          Command Center (operations hub)
├── assets/
│   ├── css/  theme.css · main.css · admin.css
│   ├── js/   config.js · supabase-client.js · main.js · forms.js
│   │         admin.js · agents.js · finance.plugin.js
│   └── img/  photography, renders, QR, brochure
├── supabase/
│   ├── schema.sql                          Public-site tables (run first)
│   ├── schema_hub_2026-09-03_1710.sql      Hub tables (run second)
│   ├── schema_finance_2026-09-03_1740.sql  Finance tables (run third)
│   └── functions/
│       ├── ai-agent/index.ts               AI-agent Edge Function (Claude)
│       └── ops-cron/index.ts               24/7 scheduled operations
├── CNAME                   joatamp.net
└── .nojekyll               Serve asset folders verbatim on GitHub Pages
```

---

## Connect Supabase (go from demo → live)

1. Create a free project at [supabase.com](https://supabase.com).
2. **Project Settings → API** — copy the **Project URL** and **anon public** key.
3. Paste both into `assets/js/config.js`:
   ```js
   window.JOAT.SUPABASE = {
     url: "https://YOUR-PROJECT-ref.supabase.co",
     anonKey: "YOUR-SUPABASE-ANON-PUBLIC-KEY",
   };
   ```
4. In the Supabase **SQL Editor**, paste and run `supabase/schema.sql`. This
   creates every table, Row-Level-Security policy, and seed data.
5. **Authentication → Users → Add user** — create your admin email + password
   (disable email confirmation so you can sign in immediately).
6. Reload `/admin` and sign in.

> The **anon** key is safe to expose in the browser — Row Level Security
> protects the data. **Never** put the `service_role` key in front-end files.

### What connects where

| Front-end | Supabase table |
|---|---|
| Contact form | `contact_messages` |
| Enrollment form | `enrollment_applications` |
| Volunteer form | `volunteer_signups` |
| Partnership form | `partnership_inquiries` |
| Newsletter | `newsletter_signups` |
| Raffle pot / progress bar | `raffle_stats` |
| Milestone tracker | `renovation_phases` |

Any `<form data-collection="table_name">` automatically submits to that table.
Before Supabase is configured, forms fall back to a pre-filled email so no lead
is ever lost.

---

## Command Center (`/admin`) — the operations hub

A full nonprofit operations hub, separate from the public site. Runs in **demo
mode** with realistic sample data until Supabase is connected — click *Explore
the hub* to try everything.

**Modules**
- **Dashboard** — fundraising totals, active projects, donor count, inbound
  leads, campaign progress, an "Ask an AI agent" panel, and recent activity.
- **Campaigns** — create and track fundraising campaigns (goal vs. raised).
- **Donors (CRM)** — donor records, giving history, stages, tags, owners, and a
  one-click "Draft" that hands the donor to an AI agent for outreach.
- **Outreach** — the donor-outreach pipeline (planned → sent → replied →
  converted), AI-drafted where useful.
- **50/50 Raffle** — edit the live pot, raised, tickets, and goal shown on the
  public site. (The raffle is one community-project fundraiser, not the org.)
- **Projects** — create and track projects (renovation, programs, events) with
  budget/spent, progress, lead, and target dates.
- **Renovation Tracker** — milestone phases for the community renovation project.
- **Inbound Leads** — searchable, exportable (CSV) tables for every public-form
  submission, with per-record status.
- **Board & Team** — members with roles (admin / board / staff / volunteer).
- **AI Agents** — three assistants (see below).
- **Setup & Connection** — connection status and step-by-step setup.

**Role-based access.** Access is scoped by role — `admin` sees everything,
`board` sees fundraising/projects/team/agents (not raw inbound leads or
settings), `staff` sees operations (not team management or settings). In demo
mode a **Role** switcher in the top bar previews each level; in live mode the
role is read from the signed-in user's `team_members` row.

## AI Agents

Three agents help run the organization, each with a defined role:

| Agent | Role | Helps with |
|---|---|---|
| **Ada** | Development Officer | Donor & grant outreach, prospect research, ask amounts, appeals |
| **Max** | Project Manager | Task plans, budgets, timelines, board-ready status updates |
| **Nova** | Communications Director | Newsletters, social posts, press releases, recruitment content |

Agents run through a **Supabase Edge Function** (`supabase/functions/ai-agent`)
so your Anthropic API key stays **server-side, never in the browser**. Each
request is grounded with a live summary of your campaigns, projects, and donors.

**Deploy the AI backend**
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...   # your Anthropic key
# optional — defaults to claude-opus-5:
supabase secrets set ANTHROPIC_MODEL=claude-opus-5
supabase functions deploy ai-agent
```
Until it's deployed, the agents produce useful **simulated drafts** so you can
trial the workflow end-to-end.

## Finances plugin (nonprofit accounting)

The Command Center has a **plugin system**. The Finances module ships as a
self-contained plugin — `assets/js/finance.plugin.js` — that self-registers and
adds a **Finances** section, customized for a nonprofit:

- **Ledger** — general ledger of income & expenses, tagged by **fund**
  (Unrestricted / Restricted / Board-Designated), **program**, and **project**,
  with a live income / expense / net summary.
- **Project Budgets** — per-project budget & expense tracking. Each project
  shows budget-vs-actual by category (actuals computed live from ledger
  expenses tagged to it), its expenses & outstanding bills, and the contractors
  & mentors assigned. Click a project card (in Projects or here) to drill in.
- **Bills & Vendors** — accounts payable (open / paid / overdue), linkable to a
  project.
- **Contractors & Mentors** — tracks the people doing the work *and* the
  mentoring: role (Trades Contractor / Mentor / Both), assigned project, number
  of students mentored, hours, rate, YTD pay, W-9, and 1099 flags.
- **Org Budget** — organization-wide annual budget vs. actual by category.
- **Financial Reports** — a nonprofit **Statement of Activities** plus fund and
  program breakdowns, printable to PDF.

It also adds a **Financial snapshot** to the dashboard. Access follows the same
roles (admin sees all; board sees ledger/budgets/reports; staff sees
ledger/bills/contractors/budgets).

**Writing your own plugin:** call `JOAT.registerPlugin({ id, nav, tables, demo,
roles, views, titles, dashboardMount })`. Load it with a `<script>` after
`admin.js` in `admin/index.html`. Remove the script tag to disable a plugin.

## Always-on (24/7) operation

The hub is static + Supabase, so it stays online continuously on any static host
(Vercel / Netlify / Cloudflare Pages / GitHub Pages) with Supabase as the
always-on backend — nothing to keep running on a server.

For work that must happen **even when no one is logged in**, deploy the
scheduled ops function:

```bash
supabase functions deploy ops-cron --no-verify-jwt
```
Then schedule it in the SQL editor (needs `pg_cron` + `pg_net`) — the header
comment in `supabase/functions/ops-cron/index.ts` has the exact `cron.schedule`
snippet. Each run flags overdue bills and posts due recurring ledger entries.

## Database setup for the hub

Run these SQL files in the Supabase SQL Editor **in order**:
1. `supabase/schema.sql` — public-site tables (leads, raffle, renovation).
2. `supabase/schema_hub_2026-09-03_1710.sql` — hub tables (campaigns, donors,
   donations, outreach, projects, tasks, team, agent log).
3. `supabase/schema_finance_2026-09-03_1740.sql` — finance tables (ledger,
   bills, contractors, budgets, recurring entries).
4. `supabase/schema_finance_projects_2026-09-03_1755.sql` — project expense
   linkage, `project_budget_lines`, and contractor/mentor fields.

Internal hub/finance tables are readable/writable by **authenticated users
only**; the optional block at the bottom of the hub schema shows how to tighten
access to specific roles at the database level.

---

## Editing site content

Most business data lives in one place — `assets/js/config.js`:
organization details, the Zeffy checkout URL, raffle tiers, drawing date,
milestone phases, impact stats, and trade programs. Update values there and they
flow through the site.

---

## Deploy

**GitHub Pages** — push to the default branch and enable Pages (root). The
`CNAME` maps the site to `joatamp.net`; `.nojekyll` keeps `assets/` intact.

**Any static host** (Vercel, Netlify, Cloudflare Pages) — deploy the repository
root as-is; there is no build step.

> Set your custom domain's DNS to your host per their instructions. Update the
> real phone number and social links in `assets/js/config.js` and the footer
> before launch.

---

## Conventions

Per the project workflow, every source file carries a timestamp comment block,
and standalone deliverables (the SQL schema snapshot) use a
`FILENAME_YYYY-MM-DD_HHMM.ext` name. Web-served files keep canonical names so
routing and asset links resolve correctly.
