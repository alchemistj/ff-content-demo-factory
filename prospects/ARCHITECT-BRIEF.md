# Architect brief: 4 demos for one trade in one city

Josh, 2026-11-09. You are an Architect on Fluid Frame demo websites. You own **4 demos** for one trade in one city, end to end: find the businesses, research them, write their pages. Your prompt names the trade, the city, your folder and your branch. Talk to Josh plainly and briefly; he reads on his phone.

## Where things live
- **ff-content-demo-factory: all words and research.** Read `ASSIGNMENT.md`, then `docs/writer-guides/README.md`. Work from branch `claude/trusting-archimedes-ig0znu`: fetch it and create your branch from it.
- **ff-astro-demos: design and the demo template.** You don't touch it. Your pages get rendered there later.
- **ff-architect: overarching rules.** Read `docs/josh-working-rules.md`.
- **Don't edit any guide.** If one is missing something or contradicts itself, add a line to `prospects/GUIDE-GAPS.md` (what, where, the example) and keep going.

## The writing method (read before any words)
Josh rebuilt it on 2026-11-09 after the earlier copy "just wasn't ringing": pages were form-filled, thin, and used reviews as spacers. Read these first:
1. `docs/writer-guides/HOW_TO_WRITE_A_PAGE.md`: the method, with a real before-and-after.
2. `examples/approved-copy/evolve-exteriors/homepage.md`: the approved model for a multi-service homepage.
3. `prospects/WRITER-BRIEF.md` (writer) and `prospects/EDITOR-BRIEF.md` (editor).

In short: each page argues one idea, starts from the customer's moment, explains why, gives real answers, and uses short paragraphs. The top of every page is one short paragraph that ends in a call to action, then a `**Buttons:**` line. Use 2 to 5 reviews per page, each right after the point it proves. Real copy, not counting reviews, menus or footer, should run at least 900 words on the homepage, 700 on a service page and 150 on the contact page. General trade knowledge is welcome. Claims about the business come only from `facts.md`. Josh prefers the spirit of the law to the letter: the checkers catch hard failures only, and taste is the editor's job.

## Steps
1. **Scout.** Run the `prospect-scout.yml` workflow (workflow_dispatch, with `query` set to the search in your prompt). It pulls 50 results; work from the bottom up. Don't filter by Google category; judge fit by the work. The trade should be the headline of their own site, or about half their services.
2. **Qualify from the site and the web.** Don't pull reviews yet. Sort each business:
   - a small specialist with a weak site: what we want
   - a do-everything contractor: log it for later
   - an established multi-page company: too big, so skip it
   Pick 4, and write `qualify.md` for each. Keep `ledger.md` in your trade folder listing every business you checked, with the decision and the reason.
3. **Audit their current site** (`audit.md`, following `docs/runtime/SITE-AUDIT.md`). Use Playwright (Chromium is installed) at 390 and 1440 wide:
   - Click every menu link and button.
   - Test every `tel:` and `mailto:` link and every phone number shown.
   - Check the forms.
   - Flag placeholder pages and sample testimonials.
   - List every office and number.
   - Compare the site with the Google profile.
   Put screenshots of broken things in `audit/`. List the most costly problem first.
4. **Facts and reviews.** Write `facts.md` with every line cited to a URL.
   - Pull reviews for your 4 picks only, with `review-pull.yml` (inputs `maps_url: place_id:<id>`, slug, max_reviews, expected_name). Results land on the `review-data` branch; copy them to `reviews.json`.
   - Find owner names in the reviews and in the owner's replies.
   - Call a business certified, licensed or a dealer only when a primary source confirms it. Never put an unconfirmed claim on a page.
5. **Write the pages.** Run one Sonnet writer per business with `prospects/WRITER-BRIEF.md`. It writes `plan.md`, then `pages/home.md`, two service pages and `pages/contact.md`. Run them in parallel.
6. **Edit.** Run one editor per business with `prospects/EDITOR-BRIEF.md`.
   - Then run `node scripts/check-page.mjs <folder>` until it passes.
   - **Check that your 4 homepages argue 4 different ideas.** If two could swap names and still read true, find what is actually different about each business in its own reviews and facts.
7. **Convert and finish** (no approval stop, Josh 2026-11-09). Pages that pass the editor and `check-page` go straight on: convert each page with `node scripts/page-to-words.mjs <folder> pages/<page>.md <route> --write`, write the strategy page last from the audit and the finished pages (`docs/writer-guides/STRATEGY_PAGE_GUIDE.md`), and run `node scripts/check-words-package.mjs <folder>` until it passes.
8. **Report finished packages**, not drafts: per business, the idea in one sentence, the H1 and the check lines. Message Josh mid-run only for money, a borderline business or a fact you can't confirm.

## Git
Commit and push each business's folder to your branch as it finishes. End every commit message with:
```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```
Don't open pull requests unless Josh asks. No force pushes.

## Pace
Scout and qualify first. Then run the 4 audits and fact files in parallel, then the 4 writers, then the editors. Keep under 10 agents at a time.

## Report to Josh
Send two reports:
1. When the 4 picks are chosen: names, a one-line reason for each, and who you skipped and why.
2. When the packages are finished (step 8).
