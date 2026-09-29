<!--
  Jacks of All Trades — Social media fundraising: how it works + setup
  File: docs/fundraising/SOCIAL-FUNDRAISING_2026-09-29_2230.md
  Generated: 2026-09-29 22:30 UTC
-->
# Raising money on every social platform

## The pieces
1. **One giving page for every link: `joatamp.org/give.html`.**
   - **Parts:** amount buttons that go to Zeffy (0% fees, automatic tax receipts), plus Cash App, Zelle and **GoFundMe** (https://gofund.me/3034e976f).
   - **Sharing:** buttons to share onward to Facebook, X, LinkedIn, Threads, WhatsApp, text and email, plus **Start your own fundraiser**.
   - **Tracking:** each platform gets its own link, for example `give.html?src=instagram&c=house`. Every visit and every Donate tap is logged with its platform, so you see what works.
   - **Campaigns:** `c=house` (the $100K renovation, the default), `c=raffle`, or `c=general`.
2. **Nova writes the posts.** In the hub, go to **Social Fundraising → Nova's posts → Draft posts for all platforms**.
   - **What she writes:** a week of posts made for each platform, with that platform's tracked link and a suggested photo from your library (or what to film):
     - Facebook posts
     - Instagram Reels and captions
     - TikTok and YouTube Shorts scripts
     - LinkedIn posts
     - X threads
     - Threads posts
     - Nextdoor posts
   - **Posting:** **Copy text**, then **Open** the platform, paste and post, then **Mark posted**. It takes about 30 seconds per post.
3. **Supporter fundraisers (peer-to-peer):**
   - **Start:** anyone can start their own page at `give.html#start`, for a birthday, a memorial, a team challenge and so on.
   - **Approve:** you approve it in **Social Fundraising → Fundraisers**. They then share `give.html?ref=their-name` on their own social media, and their page shows their progress bar.
4. **Record a gift:** use this for money given on a platform itself, such as Facebook or Instagram fundraisers, YouTube Giving, TikTok LIVE or GoFundMe payouts.
   - It's logged with the platform as its source and counts toward the **$250K individual** share of the $2M goal.
   - Choose a supporter's fundraiser and their total updates too.

**Not automatic (yet):** posting straight to each platform. Facebook/Instagram, TikTok, YouTube, LinkedIn and X each require their own approved developer app before anything can post automatically. Copy, open and paste works today, and auto-posting can be added once those accounts are verified.

## One-time setup
1. **Database:** in the Supabase SQL Editor, run `supabase/setup_social_fundraising_2026-09-29_2230.sql`.
2. **Deploy Nova's post writer:**
   ```powershell
   git pull origin main
   supabase functions deploy social-agent --no-verify-jwt --project-ref gecnvzjuppmqcfcpmugq
   ```
3. **Turn on each platform's own giving tools.** Open **Social Fundraising → Platforms → How to set up** for each one:
   - **Facebook and Instagram:** enroll in Meta's charitable giving tools. That turns on the Donate button, birthday fundraisers and the Instagram donation sticker.
   - **YouTube:** apply to the nonprofit program (YouTube Giving).
   - **TikTok:** put the link in your bio, and check the nonprofit and LIVE donation programs.
   - **LinkedIn, X, Threads and Nextdoor:** they have no donation tools, so use the tracked link.
   - Eligibility rules change, so confirm each one on the platform's current nonprofit help pages.
4. **Put each platform's tracked link in its bio or "website" field.** Copy them from **Platforms**, then tick **Link in bio**.
5. **Invite your board, volunteers and past donors to start a fundraiser.** Peer-to-peer is usually the fastest way to grow social giving.

## Rules Nova follows
- **No raffle on TikTok or YouTube:** she doesn't promote the 50/50 raffle there, because of those platforms' rules on gambling content. Those posts ask for donations only.
- **No made-up facts:** she never invents names, quotes, statistics or totals. `[placeholders]` mark anything you fill in.

## Before you go live
- **Check the "what your gift buys" examples on give.html:** $25 for a box of tile, $50 for a bundle of shingles, $100 for a day of training, $250 for a window, $500 for a water heater. They're marked approximate; adjust them to your real costs.
