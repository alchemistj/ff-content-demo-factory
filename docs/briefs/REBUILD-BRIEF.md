# Brief: rebuild ONE demo to Josh's bar (11/15 evening)

## READ FIRST: the examples

1. **The words of Josh's client websites are the model:** Window Dudes, SRA Roofing & Gutters and Greene Planet (Josh will name a 4th). Their copy is in ff-content-demo-factory `examples/approved-copy/`.
2. **The 12 Lovable builds are the model for demos.** A human QA'd every one of them heavily. They're listed, with live .lovable.app URLs, in ff-content-demo-factory `docs/reference-sites.md`.
3. **The rules are in ff-astro-demos `docs/demo-definition-of-done.md`:** home 550+ words, each service page 700+, no fact said twice, and everything else in that file.
4. **Every writer reads all three before writing. Every reviewer compares each page side by side with the closest example and fails anything weaker.** Never use other Astro demos (Wichita or any other) as models.

---

Josh reviewed this demo and judged it not good enough to send, even though QA passed it. QA checked facts and rules, not whether the page sells. You rewrite it from scratch to the bar set by 16 reference sites he approved.

Work only in `/home/user/ff-content-demo-factory/prospects/<folder>/`. Write `usp.md` (update), `words.json` (new) and `outreach.md` (new). You may also save an untouched copy of the old words.json as `words-v1.json`. Run no git, send nothing, create no sessions.

## Read first, in this order
0. **`/home/user/ff-content-demo-factory/docs/JOSH-CHECKLIST.md` IN FULL. It is the single list of Josh's lessons. Every item is pass/fail, and one FAIL means NOT YET.** Writers: check each page against it before replying.
1. **Josh's rules:** `ASSIGNMENT.md`, section "Demo copy (Josh's standing rules, 2026-11-15)". Every bullet there is an automatic fail.
2. **The references, IN FULL (voice, structure, how a page sells; never their facts).** These are what "good" means.
   - Client sites: everything in `examples/approved-copy/sra/`, `window-dudes/` and `greene-planet/`.
   - Lovable builds:
     - `/home/user/ad-mechanical-services/src/pages/Index.tsx` (HVAC homepage, the closest trade match);
     - `/home/user/all-phase-electric/src/routes/home.tsx`, `electrical-panel-upgrade-nixa-mo.tsx`, `commercial-electrician-nixa-mo.tsx` and `src/data/site.ts`;
     - `/home/user/jons-plumbing/src/pages/Home.tsx`, `SpringfieldPlumber.tsx`, `BackflowTesting.tsx`;
     - `/home/user/stone-electric-llc/src/pages/Home.tsx`, `Generac.tsx`.
   - Skim the rest listed in `docs/reference-sites.md`.
   - As you read, note what these pages do that the old demo doesn't. Typically:
     - a clear reason to hire this company in the first lines;
     - specifics from the business itself;
     - real review quotes placed where they prove a point;
     - no explainer filler;
     - headings whose paragraphs deliver exactly what the heading promises.
3. **The business, the only allowed source of facts:** the FULL text of its own site in `site/` (start with `site/INDEX.md`; run `scripts/fetch-site-text.mjs` first if it is missing), plus `facts.md`, `reviews.json`, `audit.md`, `qualify.md`. The old `words.json` and `usp.md` are for what was learned, not for copying. Also read `outreach/qa-results/2026-11-15/` for fact problems QA already caught; don't repeat them.
4. **Format:** `docs/words-package.md`, and the current `words.json` for the JSON shape the template reads.

## Scope (smaller, so you don't pad)
- `/home/` with the keyword H1 `HVAC Company in <City>, <ST> — <Business>`.
- **Two service pages: the business's two main money services**, each with a keyword H1 `<Service> in <City>, <ST> — <Business>` and a route like `/furnace-repair-<city>-<st>/`. Pick the two with the most real material: the business's own site pages, plus on-topic reviews.
- `/contact/`: phone and email as written in facts.md; hero primaryCta call only.
- The strategy section.
- **No word-count targets.** Write what the material supports, then stop. If the business can't fill two strong service pages from its own material, don't write them: stop and reply "TOO THIN" with what is missing.

## Every service page must
- Say plainly, near the top, why to hire this company for this job: specific to them, from their own site or a quoted review.
- Use only quotes that are about that service.
- Read like the reference service pages, not like a blog post about HVAC.

## Hard rules (each one is an automatic fail)
- **Reviews appear only as exact quotes** with the reviewer's name (trim with "…", never change words). Never summarize reviews: no "customers mention / describe / say", no "one customer said", no "reviewers…".
- Every paragraph delivers what its heading says. If a heading names three things, the text covers all three, or you narrow the heading.
- No forced metaphors or cute lines.
- No fee-first leads. Never open on after-hours cost. Don't mention a plan price before the plan is explained.
- No advice that ignores how the trade works (for example "ask what the fix costs" before anyone has looked).
- The facts rules still apply: nothing that isn't in the business's own material.
  - No invented prices, years, licenses, warranties, guarantees, response times, after-hours or weekend claims, or service area.
  - No quotes that criticize another company or carry a price.
  - Gender: "they".
- **Images** from the HVAC pool only: home-hero, home-hero-alt, ac-repair-hero, furnace-detail, airflow-vent, thermostat, service-van, contact-hero. **Never `tech-at-door` or `furnace-hero`** (banned). No slot twice on a page. Leave a section without an image rather than force one.

## Strategy section
- `whyHeading` and `why`, plus one card per page (home, both service pages, contact), with `alsoAdd` only where there is a real item.
- `reportCard` rows must match audit.md exactly.
- `confirm`: 3 real open questions from facts.md.
- `lead` (showScores false) or `offer`, from usp.md.
- Don't claim anything about the business's site or its competitors that audit.md doesn't show.

## Strategy page (Josh)
From Josh's ComfortTechs review, 11/15 (checklist items 77 to 85).
- The strategy page is in Josh's voice; business pages stay in the owner's voice. Voice guide: fluid-frame-marketing JOSH-VOICE.md and the ff2 guides (JOSH-VOICE.md is not on main yet).
- The proof block (SRA Maps before/after plus stats) is fixed template content. Never rewrite it.
- Explain jargon in plain words at first use. For a 404: the website links to pages that no longer exist, a bad signal to Google and a terrible one for a customer who clicks.
- Never split "SEO title" and "H1" for an owner. One plain point: the homepage tells Google your name, not what you do or where. If the tab title comes up, call it the "homepage browser tab title"; it should target the main search phrase.
- Keyword stuffing is an outdated practice Google ignores at best. Say so, and say plainly that the fix removes it.
- Bridge from the reviews to the page plan, e.g. "...which is what Google needs from your homepage. More on that below."
- Every card has three problems and three matching fixes. Verify each problem on the page it is listed under; the demo must actually fix what the card claims.
- Only the standard full-build lines. The demo is "the first five pages". Fixed line: "We built {name} the first five pages of that kind of website. More on that below." (template change pending on the next build PR). Never claim a full site.
- "Why it matters" lines must be true. No unsupported claims such as "people call the first company they reach".

## outreach.md
Use the template in `outreach/form-message-template.md`, with these changes:
- **the demo link is plain, with no `?utm_source`** (Josh's rule): `https://<astro-slug>.websitepreview.fluidframemarketing.com/`;
- the customer detail is an **exact quote** from reviews.json, not a summary.

Keep the `## Form` section from the old outreach.md, and add `## Variant (only if Josh confirms)` with the "My daughter and I" line.

## Check before you reply
- `cd /home/user/ff-content-demo-factory && node scripts/gate.mjs --allow-logged prospects/<folder>` must PASS. Short pages are fine: if the gate flags one, add a row to `outreach/2026-11-14-short-pages.md` with the reason "smaller scope, real material only (11/15 rebuild)".
- Read each page next to its closest reference page and ask: is this as good? Would Josh want to send it? Fix anything weaker.

Reply in under 100 words:
- the two service pages and why those two;
- the word count per page;
- the gate result;
- anything that's thin, or "TOO THIN" if it is.
