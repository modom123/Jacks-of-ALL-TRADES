/* ============================================================================
   Jacks of All Trades — AI Agents (front-end layer)
   File: assets/js/agents.js
   Generated: 2026-09-03 17:10 UTC  |  Command Center business-hub expansion

   Defines the three Command Center agents and routes chat to the Supabase
   Edge Function `ai-agent` (Claude, server-side). If the function is not
   deployed yet, it falls back to a smart on-device simulation so the console
   is fully usable in demo mode.
   ========================================================================== */
(function () {
  "use strict";
  const A = (window.JOAT = window.JOAT || {});

  const AGENTS = [
    {
      key: "ada", name: "Ada", title: "Development Officer",
      focus: "Fundraising · Donor relations · Grants",
      blurb: "Drafts donor & grant outreach, researches prospects, and recommends asks based on giving history.",
      accent: "#1d4ed8",
      starters: [
        "Draft a grant follow-up email to The Riverside Foundation.",
        "Suggest an ask amount and approach for Marcus & Dana Reed.",
        "Write a year-end appeal for our annual fund.",
      ],
    },
    {
      key: "max", name: "Max", title: "Project Manager",
      focus: "Projects · Operations · Budgets",
      blurb: "Plans and tracks projects, breaks work into tasks, watches budgets and timelines, and drafts status updates.",
      accent: "#0e7490",
      starters: [
        "Break the 4BR renovation into this month's tasks with owners.",
        "Summarize project status for the board.",
        "Flag budget risks across active projects.",
      ],
    },
    {
      key: "nova", name: "Nova", title: "Communications Director",
      focus: "Marketing · Community · Content",
      blurb: "Writes newsletters, social posts, press releases, and recruitment content in the organization's voice.",
      accent: "#7c3aed",
      starters: [
        "Write a newsletter update on the raffle and renovation progress.",
        "Draft 3 social posts to recruit volunteers.",
        "Write a press release for our fall trades cohort.",
      ],
    },
  ];
  const byKey = Object.fromEntries(AGENTS.map((a) => [a.key, a]));

  async function send(agentKey, messages, context) {
    const cfg = A.SUPABASE || {};
    const configured = A.configured && cfg.url && !cfg.url.includes("YOUR-PROJECT");
    if (configured) {
      try {
        const res = await fetch(cfg.url.replace(/\/$/, "") + "/functions/v1/ai-agent", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + cfg.anonKey, apikey: cfg.anonKey },
          body: JSON.stringify({ agent: agentKey, messages, context }),
        });
        const data = await res.json();
        if (res.ok && data.text) return { text: data.text, source: "live" };
        return { text: simulate(agentKey, lastUser(messages), context, data.error), source: "sim" };
      } catch (e) {
        return { text: simulate(agentKey, lastUser(messages), context), source: "sim" };
      }
    }
    // Simulated (no backend yet)
    await wait(500 + Math.random() * 500);
    return { text: simulate(agentKey, lastUser(messages), context), source: "sim" };
  }

  const lastUser = (msgs) => { for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i].role === "user") return msgs[i].content; return ""; };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---- Simulated responses (useful, structured, clearly marked) --------- */
  function simulate(agentKey, prompt, context, errNote) {
    const p = (prompt || "").toLowerCase();
    const note = errNote
      ? `_Simulated draft (the AI service returned: “${errNote}”). Deploy the ai-agent function to go live._\n\n`
      : `_Simulated draft — deploy the \`ai-agent\` Supabase function with your Anthropic key to get live AI responses._\n\n`;
    let body;
    if (agentKey === "ada") body = adaSim(p);
    else if (agentKey === "max") body = maxSim(p);
    else body = novaSim(p);
    return note + body;
  }

  function adaSim(p) {
    if (p.includes("grant") || p.includes("foundation") || p.includes("riverside")) {
      return [
        "**Subject:** Following up — trades workshop grant for Detroit youth",
        "",
        "Dear [Program Officer],",
        "",
        "Thank you for the opportunity to share our work. Jacks of All Trades trains Detroit residents in six skilled trades while renovating vacant homes into quality housing — a model that turns workforce development and neighborhood revitalization into a single, self-reinforcing loop.",
        "",
        "A $40,000 investment from The Riverside Foundation would outfit our training workshop with the tools and equipment 24 students use each cohort, directly funding hands-on learning that leads to certification and full-time employment.",
        "",
        "Could we schedule 20 minutes in the next two weeks to walk you through our outcomes and the specific budget? I'm glad to work around your calendar.",
        "",
        "With gratitude,",
        "[Your name] · Development, Jacks of All Trades Community Development",
      ].join("\n");
    }
    if (p.includes("ask") || p.includes("reed") || p.includes("major")) {
      return [
        "**Prospect recommendation — Marcus & Dana Reed**",
        "",
        "- **Giving history:** $2,500 lifetime, most recent gift $500. Engaged, individual major-gift prospect.",
        "- **Suggested ask:** $2,500 (a 5x step-up), framed around sponsoring one student through a full cohort.",
        "- **Approach:** Personal note from the Board Chair → coffee meeting → invite to a renovation site walkthrough.",
        "- **Hook:** They've given consistently; connect their support to a named student outcome.",
        "",
        "Want me to draft the meeting-request email?",
      ].join("\n");
    }
    if (p.includes("year-end") || p.includes("appeal") || p.includes("annual")) {
      return [
        "**Subject:** Before the year ends — help a Detroit student build a future",
        "",
        "Friend,",
        "",
        "This year, our students turned a vacant house into a home and earned certifications that changed their lives. Your year-end gift keeps that work going into 2027.",
        "",
        "- $50 supplies a student's safety gear",
        "- $250 funds a week of hands-on instruction",
        "- $1,000 sponsors a mentor match",
        "",
        "Every dollar reaches the mission — our platform is 100% fee-free. **[Give before Dec 31 →]**",
        "",
        "With gratitude, [Your name]",
      ].join("\n");
    }
    return [
      "Here's how I can help with fundraising and donor relations:",
      "",
      "- Draft donor, grant, and sponsor outreach (just name the donor)",
      "- Recommend ask amounts from giving history",
      "- Write appeals, thank-you notes, and impact updates",
      "- Summarize a donor's context before a meeting",
      "",
      "Tell me the donor or campaign and I'll draft something ready to send.",
    ].join("\n");
  }

  function maxSim(p) {
    if (p.includes("task") || p.includes("break") || p.includes("renovation")) {
      return [
        "**4BR Renovation — this month's task plan**",
        "",
        "| Task | Owner | Due | Status |",
        "|---|---|---|---|",
        "| Finish kitchen cabinet install | Carpentry lead | +7 days | Doing |",
        "| Quartz countertop template & install | Vendor + student crew | +14 days | To do |",
        "| LVP flooring, main level | Student crew | +18 days | To do |",
        "| Bathroom tile — both baths | Tile mentor | +21 days | To do |",
        "| Inspection checkpoint (Phase 3) | Program Manager | +24 days | To do |",
        "",
        "Phase 3 (Kitchen & Living, $20K) is ~43% funded. Flag if the countertop vendor slips — it blocks flooring.",
      ].join("\n");
    }
    if (p.includes("status") || p.includes("board") || p.includes("summar")) {
      return [
        "**Project status — for the board**",
        "",
        "- **4BR Renovation:** Active · 43% complete · $42,500 of $100,000 spent/funded. Phases 1–2 done (mechanicals, exterior); Phase 3 (kitchen/living) underway.",
        "- **Youth Trades Cohort — Fall:** Active · 30% · $8,200 of $25,000. On schedule; 1:1 mentorship matched.",
        "",
        "**Risks:** Countertop lead time; Q4 fundraising pace on the Annual Fund ($18.4K of $75K).",
        "**Asks of the board:** 2 major-gift introductions; approve tool-grant submission.",
      ].join("\n");
    }
    if (p.includes("budget") || p.includes("risk")) {
      return [
        "**Budget watch — active projects**",
        "",
        "- 4BR Renovation: $42.5K committed of $100K. On track, but Phase 4–5 depend on continued raffle revenue.",
        "- Fall Cohort: $8.2K of $25K. Healthy.",
        "",
        "**Recommendation:** Keep a 10% contingency on the renovation; tie Phase 4 start to reaching $60K raised.",
      ].join("\n");
    }
    return [
      "I can help you run projects:",
      "",
      "- Break a project into tasks with owners and due dates",
      "- Track budgets and flag risks",
      "- Draft board-ready status updates",
      "",
      "Name a project and what you need.",
    ].join("\n");
  }

  function novaSim(p) {
    if (p.includes("newsletter")) {
      return [
        "**Subject:** A house becomes a home — and a student becomes a tradesperson",
        "",
        "**This month at Jacks of All Trades**",
        "",
        "Our 4-bedroom renovation just crossed the halfway mark. Students framed, wired, and finished the exterior — now the kitchen is taking shape. Meanwhile, our 50/50 raffle pot keeps climbing, funding every board and nail.",
        "",
        "**Ways to help this month**",
        "- 🎟️ Enter the 50/50 raffle — win 50% of the pot",
        "- 🔨 Volunteer for a build day",
        "- 💙 Give to the Annual Fund",
        "",
        "**[Enter the raffle →]   [Volunteer →]   [Donate →]**",
        "",
        "Thank you for rebuilding Detroit with us.",
      ].join("\n");
    }
    if (p.includes("social")) {
      return [
        "**3 volunteer-recruitment posts**",
        "",
        "**1 (Instagram/Facebook):** We're turning a vacant Detroit house into a family's home — and we need YOU. 🔨 Join a build day and learn alongside our students. Link in bio to volunteer. #Detroit #Trades #Community",
        "",
        "**2 (LinkedIn):** Skilled tradespeople: your expertise can launch a career. Mentor a Jacks of All Trades student 1:1 and help rebuild a Detroit neighborhood. Comment “mentor” and we'll reach out.",
        "",
        "**3 (X):** Half raffle prize, half neighborhood revival. 🎟️ Enter the 50/50 & help us finish a full home renovation. joatamp.net",
      ].join("\n");
    }
    if (p.includes("press")) {
      return [
        "**FOR IMMEDIATE RELEASE**",
        "",
        "**Jacks of All Trades Launches Fall Skilled-Trades Cohort, Pairing Detroit Residents with Home-Renovation Training**",
        "",
        "DETROIT — Jacks of All Trades Community Development today announced its fall training cohort across six high-demand trades — electrical, plumbing, carpentry, HVAC, masonry, and welding — with 1:1 mentorship and a direct path to employment. Students train by renovating a vacant Detroit home into quality community housing.",
        "",
        "“We're building futures and rebuilding neighborhoods at the same time,” said [Spokesperson].",
        "",
        "To enroll, volunteer, or support the mission, visit joatamp.net.",
        "",
        "###",
      ].join("\n");
    }
    return [
      "I can write your communications:",
      "",
      "- Newsletters and impact updates",
      "- Social posts (per platform)",
      "- Press releases and grant narrative",
      "- Volunteer & enrollment recruitment",
      "",
      "Tell me the audience and the message.",
    ].join("\n");
  }

  A.agents = { list: AGENTS, get: (k) => byKey[k], send, simulate };
})();
