# Brief: check ONE business's demo words (separate Sonnet)

## New patterns from FF's Josh-voice passes on Wickey, Big Dog and Cool Concepts (Nov 16). Check every one.
- **No Google/Yelp star ratings or review counts; BBB letter grades are credentials and allowed if confirmed** (FF, Nov 16). This covers "What we'd confirm" too.
- **No ratings or review counts in "What we'd confirm" either.** Example: "5.0 on Angi and Yelp vs 4.9 Google". Ask about the unnamed claim without the numbers.
- **Plurals match the evidence.** One job note is "a customer had us install a power-vent heater", not "we've installed power-vent heaters".
- **After cutting a line or clause, re-read the sentence that's left: it must stand on its own** (FF, Nov 16; a cut subject garbled Cutter's Contact).
- **No unsourced business-voice process lines** ("we bring the right parts", "we try to leave it as we found it"). Cut them, or say what one customer noticed.
- **Define each trade word once per page, the first time it appears** (adjuster, deductible, soffit, fascia, valley, eaves, TPO…). Never define it twice on a page.
- **An FAQ answer must not repeat a paragraph on the same page.** Move the detail into the FAQ and cut it from the page, or drop the FAQ.
- **Name a person in a review claim only if a quoted review backs it.** Say "customers name Jason", not "Jason and Matt" when only Jason is quoted.
- **Keep Notes current after every edit:** word counts and every "said once" or "used on X" claim.
- **Every strategy "Current site problem" bullet ends with what the problem costs the owner or the customer** ("…so a customer who taps it hits a dead end"), not a bare observation.
- **The four cards' "A full build would also add" lines are all different and fit their page.** Homepage gets line 8 (FULL_BUILD_LINES.md); Contact gets call and form tracking (line 7).
- **Notes "Rebuild reason" label is bold everywhere.**
- **The full-build list is the CANONICAL block in FULL_BUILD_LINES.md only.** Any other version is stale.


> "The architect's first job is QA: Josh is never deflated by what we call ready, and clients and prospects are never embarrassed by what they see. 'Passed the checks' is not 'ready'. Before a doc is called done, the architect reads it against the Lovable builds Josh QA'd, the client sites and Josh's comments, and asks whether Josh would be proud to send it." — Josh, Nov 16

Checker: end your review by reading each page side by side with the closest Lovable build and client-site page; if Josh wouldn't be proud to send it, say BACK TO WRITER with why.

**After any backport, read the page top to bottom for repetition; any fact more than twice on a page is a fail.** (FF architect, Nov 16)

**Mechanical repeat count (required, FF architect Nov 16):** run `python3 scripts/check-repeats.py outreach/words-2026-11-16/<slug>.md` (or the saved `<slug>.gdoc.md`). Any FAIL (speed or 24/7 phrases more than twice on one business page) must be fixed and the script re-run until it prints no FAIL. Review WARN lines with judgment.



You didn't write this. Check `/home/user/ff-content-demo-factory/outreach/words-2026-11-16/<slug>.md` against the same sources the writer used:
- `docs/briefs/DOC-WRITE-BRIEF.md` (all of Josh's guidelines);
- `docs/JOSH-CHECKLIST.md`;
- `demo-definition-of-done.md`;
- `inventory.md`, `site/`, `reviews.json` and `facts.md`;
- the closest model page in `examples/approved-copy/` or the Lovable builds.

**Actively search for each of these (not just read); fix small issues directly in the file:**
- every conflict logged in Notes: search the copy for it (FAQ, hero line, quotes under contradicting headings) and fix leaks;
- credentials inventory marks as not on their site or contradicted, said flatly: cut, or move to "What we'd confirm";
- website talk on Contact ("the form asks…", "send the form any hour");
- case studies / portfolio jobs on their site neither used nor explained in Notes;
- step-by-step homeowner instructions (DIY manual): cut to essentials;
- "What we'd confirm" bundles: make it 3-4 single questions;
- a claim stronger than its source, or an absolute claim copied from their site that isn't hedged;
- an invented credential, license, award, year or guarantee (cut it); a site-sourced one is fine in the owner's voice, and a conflict belongs in "What we'd confirm" (never drop a top differentiator);
- unexplained trade jargon (tear-off, decking, flashing, ACV, RTUs, TPO, EPDM, curbs, coping, "soft metals", soffit, fascia, brand product names): plain phrase or explain once;
- an idea repeated anywhere in the doc (same repair-or-replace line, insurer-decides line, tech explainer, staff-role line): one idea, one place;
- review-inferred process or reply speed stated as policy or repeated: change to "usually"/"often", once;
- filler copied from the business's own site ("years of experience", "good hands", "finish the job right", "X is part of what we do"): cut or replace with something specific;
- speed claims the reviews support missing or timid: same day, within hours, at the reviews' strength, in the home hero/subheading, service-page heroes and FAQ;
- home or either service page without a short FAQ (3-5 questions) at the ComfortTechs bar, or an FAQ using facts not in the doc;
- strategy "What the demo fixes" bullets that are vague ("credentials in plain words"): must name the actual items or the exact gap between reviews and page;
- differentiators (veteran owned, same-day, free estimates) missing from a strip right under the home hero buttons, or only in the last home section: move them;
- a service that conflicts with posted hours (e.g. "emergency repair" with 9-to-5 hours) appearing in page copy: cut it, keep it in "What we'd confirm";
- trade-knowledge filler turned into a business claim ("we size the replacement") with no source: rephrase as general advice;
- weak "What we'd confirm" items (not real conflicts), or a CTA after it that just repeats the button label: fix;
- strategy length: about 1,000 words is a soft cap (Pro Comfort ~1,074 is fine); don't fail on the number, fail on padding;
- anything listed under "What we'd confirm" appearing in page copy (minimum charges, "posted hours are X, but…", disputed years): cut it from the copy;
- a one-line or one-review claim (permits, cameras) written as a general offer: rewrite at that strength ("Customers have also had us…");
- trade-knowledge filler not specific to this business's services and area;
- a thin section (two sentences plus a quote) on any page, or three sections in a row each ending in a quote: flag (writer adds content or cuts);
- a repeat;
- jargon;
- a report-style line;
- website talk on a business page;
- a quote that isn't word for word, or a quote used twice;
- a vague strategy problem that could be specific;
- two review quotes back to back (move one);
- the Homepage card's full-build line not matching FULL_BUILD_LINES.md's new standard line (replace it).

Edit nothing else. Run no git, send nothing, create no sessions.

**Strips and hedging (FF architect, Nov 16):** one strip per doc, on Home only, under the hero buttons, max 5 items (no service-page strips, no second or third bar). Hedge claims that need proof; never hedge plain process steps ("We schedule the work once the claim is approved").

**Rebuild reason (FF architect, Nov 16):** the first line of "## Notes" is "Rebuild reason: SEO / Design / Both. [one sentence of evidence]". SEO = Google can't tell what the site is (no town/service in headlines or titles, stuffed titles, services in one page). Design = reads fine to Google but looks dated/weak (old template, cramped, poor on phones, broken images). Both = both. Base it on the strategy page and audit.

## FAIL conditions (send back)
- **Missing inventory:** a differentiator, unusual offer or service from inventory.md is missing and not listed as consciously left out.
- **Invented business claims:** services, credentials, speed, guarantees, prices or promised process not in `site/`, `facts.md` or `reviews.json`, including process steps inferred from reviews. Do NOT cut hedged general trade knowledge (what usually fails, what to check, safety, repair-vs-replace, what a visit involves); it is expected.
- **Thin page:** home under 550 words or a service page under 700 is a FAIL: send back to the writer to add trade knowledge, not padding.
- **Shallow:** sections that aren't Window Dudes deep, or a home page that feels thin.
- **Strategy page:**
  - jargon, a generic lead-in, or a CTA placed before "What we'd confirm";
  - a card problem not verified on that page;
  - a fix the demo doesn't make;
  - search-volume claims without data.

## Reply
Start with **READY** or **BACK TO WRITER**.
- **Fixes:** one line per fix you made.
- **Unfixed issues**, each with exactly what to change.
- **Facts to verify.**

Keep the reply under 120 words.
