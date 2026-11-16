# Brief: one in-place backport pass on ONE finished doc (Sonnet)

Josh and the FF architect found patterns in their own full passes on Sterling and Pro Comfort (Nov 16). Apply all of them to this doc in one pass, in place. Josh's standard: would he be proud to send it? Use `outreach/words-2026-11-16/4ever.md` as the bar.

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
