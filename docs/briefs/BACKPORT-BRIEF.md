# Brief: one in-place backport pass on ONE finished doc (Sonnet)

## New patterns from FF's Josh-voice passes on Wickey, Big Dog and Cool Concepts (Nov 16). Check every one.
- **No Google/Yelp star ratings or review counts; BBB letter grades are credentials and allowed if confirmed** (FF, Nov 16). This covers "What we'd confirm" too.
- **No ratings or review counts in "What we'd confirm" either.** Example: "5.0 on Angi and Yelp vs 4.9 Google". Ask about the unnamed claim without the numbers.
- **Plurals match the evidence.** One job note is "a customer had us install a power-vent heater", not "we've installed power-vent heaters".
- **No unsourced business-voice process lines** ("we bring the right parts", "we try to leave it as we found it"). Cut them, or say what one customer noticed.
- **Define each trade word once per page, the first time it appears** (adjuster, deductible, soffit, fascia, valley, eaves, TPO…). Never define it twice on a page.
- **An FAQ answer must not repeat a paragraph on the same page.** Move the detail into the FAQ and cut it from the page, or drop the FAQ.
- **Name a person in a review claim only if a quoted review backs it.** Say "customers name Jason", not "Jason and Matt" when only Jason is quoted.
- **Keep Notes current after every edit:** word counts and every "said once" or "used on X" claim.
- **Every strategy "Current site problem" bullet ends with what the problem costs the owner or the customer** ("…so a customer who taps it hits a dead end"), not a bare observation.
- **The four cards' "A full build would also add" lines are all different and fit their page.** Homepage gets line 8 (FULL_BUILD_LINES.md); Contact gets call and form tracking (line 7).
- **Notes "Rebuild reason" label is bold everywhere.**
- **The full-build list is the CANONICAL block in FULL_BUILD_LINES.md only.** Any other version is stale.


**This is a judgment pass, not a checklist stamped onto every doc** (FF architect, Nov 16, after 4Ever got worse). Before adding anything, check whether the page already says it. If it does, add nothing.
- **Speed claim placement:** once in the home strip, once in the home hero OR the home FAQ (not both), and once per service page (hero OR FAQ, not both). Never more.
- **FAQs:** a new FAQ question must answer something the page doesn't already say. If the page already has a good FAQ, or nothing new is left, add no FAQ. One FAQ block per page; every question **bold**; answers plain text; never turn an answer into a heading.
- **No ratings or review counts** anywhere, strips included.
- **Notes:** update the Notes to match every change (counts, strip contents, what was removed).
- **Finish:** read each page top to bottom. Any fact said more than twice on a page is a fail; fix it before you reply.

Josh and the FF architect found patterns in their own full passes on Sterling and Pro Comfort (Nov 16). Apply all of them to this doc in one pass, in place. Josh's standard: would he be proud to send it? Use `outreach/words-2026-11-16/4ever.md` as the bar.


**Mechanical repeat count (required, FF architect Nov 16):** run `python3 scripts/check-repeats.py outreach/words-2026-11-16/<slug>.md` (or the saved `<slug>.gdoc.md`). Any FAIL (speed or 24/7 phrases more than twice on one business page) must be fixed and the script re-run until it prints no FAIL. Review WARN lines with judgment.

**Strips and hedging (FF architect, Nov 16):** one strip per doc, on Home only, under the hero buttons, max 5 items (no service-page strips, no second or third bar). Hedge claims that need proof; never hedge plain process steps ("We schedule the work once the claim is approved").

## Read first
- `docs/briefs/DOC-CHECK-BRIEF.md`. Checklist items 94–104 in `docs/JOSH-CHECKLIST.md` are the new ones.
- `docs/writer-guides/FULL_BUILD_LINES.md`. Its approved lines are the only allowed wording.
- The business folder: `inventory.md`, `site/` and `reviews.json`.

## Fix, in place, across the whole doc
1. **Filler:** cut generic lines, even when they're copied from the business's own site ("years of experience", "good hands", "finish the job right", "X is part of what we do"). Replace them with something specific, or cut them.
2. **Speed:** state speed claims at the strength the reviews show ("same day", "within hours"). Put them in:
   - the home hero or subheading;
   - both service-page heroes;
   - the FAQs.
3. **FAQs:** home and both service pages each get a short FAQ of 3–5 questions. Use only facts already in the doc.
4. **Confirm-list items stay out of the copy:** nothing listed under "What we'd confirm" appears in the page copy. That includes minimum charges, hours contrasts and disputed years. A claimed service that conflicts with the posted hours belongs in the confirm list.
5. **One-review claims:** a claim with one review or one line behind it is written at that strength ("Customers have also had us…"), never as a general offer.
6. **Differentiators strip:** add a strip right under the home hero buttons with the real differentiators. Example: "Licensed team · 17 years in the trade · Homes and businesses · Customers describe same-day visits". Use only sourced facts.
7. **Advice, not claims:** trade advice never turns into a business claim ("we size the replacement") unless a source supports it. Otherwise phrase it as general advice.
8. **Strategy page:**
   - **"What the demo fixes" bullets** name the actual items, or the exact gap between what the reviews say and what the page says.
   - **"Why it matters":** each card has one true line.
   - **Standard line:** "We built <Business> the first five pages of that kind of website. More on that below." sits under the hero subhead, and "This demo is the first five pages." is not repeated later.
   - **"What we'd confirm":** 3–4 real, single-question conflicts, followed by a real CTA sentence.
   - **Length:** about 1,000 words is a soft cap.
9. **Full-build list:**
   - Delete "New team members, booking systems and new services, updated for you" wherever it appears; it is not approved.
   - The speed bullet reads exactly: Scores 91 or higher on Google's mobile speed test at launch, in Google's "good" range. Most visitors are on a phone, and a slow page lets them down.
   - The call-and-book bar is its own bullet: "A call-and-book bar that stays on screen on phones".
   - The browser-test line reads exactly: "Page links, buttons and contact forms tested in a real browser twice a day."

## How to edit
1. Load the tools with ToolSearch `select:mcp__Google_Drive__read_file_content,mcp__Google_Docs__update_doc`.
2. Read the doc.
3. Edit with `replaceAllText` (`containsText` = exact current text, `matchCase: true`). To add new blocks, such as an FAQ or a strip, use `insertText` at an index from a fresh read, or replace a nearby paragraph with itself plus the new text.
4. Re-read the doc. Save the full text to `outreach/words-2026-11-16/<slug>.gdoc.md`.

## Limits
- Never create a doc.
- Never change sharing.
- Run no git.
- Send nothing.
- Keep review quotes word for word.

## Reply
Under 60 words: what you changed. Start with PASS, or with FAIL if something couldn't be fixed.
