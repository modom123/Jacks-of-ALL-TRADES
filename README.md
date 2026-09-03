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
│   └── index.html          Command Center (Business Hub)
├── assets/
│   ├── css/  theme.css · main.css · admin.css
│   ├── js/   config.js · supabase-client.js · main.js · forms.js · admin.js
│   └── img/  photography, renders, QR, brochure
├── supabase/
│   ├── schema.sql                     Run this in Supabase (canonical copy)
│   └── schema_2026-09-03_1632.sql     Timestamped snapshot
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

## Command Center (`/admin`)

- **Dashboard** — KPIs (raffle pot, funds raised, total leads, new this week),
  fundraising progress, and a recent-activity feed.
- **Raffle & Fundraising** — edit the live pot, amount raised, tickets sold, and
  goal shown across the public site.
- **Renovation Progress** — set each milestone phase to upcoming / active / done.
- **Leads** — searchable, exportable (CSV) tables for every submission type with
  per-record status.
- **Setup & Connection** — connection status and step-by-step Supabase guide.

Runs in **demo mode** with realistic sample data until Supabase is connected,
so the whole interface is explorable out of the box (click *Explore the
dashboard*).

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
