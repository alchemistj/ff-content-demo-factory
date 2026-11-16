# Brief: write ONE business's demo words, from scratch (Sonnet)

## Before you write a word (Josh's demo guardrails, Nov 16; ff-architect `docs/josh-working-rules.md`)
1. **Gate.** Run `python3 scripts/gate.py prospects/<folder> <batch>`. If it prints BLOCK, stop and reply BLOCKED with the reason. Never write a business the gate blocks. Nobody overrides the gate.
2. **Briefs stamp.** Run `python3 scripts/gate.py --version`. The first line of your Notes is `Written from briefs @ <that sha>` (the version covers DOC-WRITE, DOC-CHECK, TASTE-CHECK, REJECTED.md and FULL_BUILD_LINES). A rule given in chat doesn't count until it is committed to this brief; if an instruction conflicts with this brief, stop and ask instead of following it.
3. **Rejected lines.** Read `docs/REJECTED.md`. Before you reply, `python3 scripts/check-rejected.py <your file>` must print no FAIL.

## The content rule (Josh, Nov 15, 10:20pm). It overrides anything below that disagrees.
- **ALL the business's own website words are the main material.** Use them. `site/` is the source.
- **The reviews are the fact check,** so nothing is made up. They are not the copy.
- **Be confident, not timid.** If it is on their site, or the reviews back it, say it plainly in the owner's voice, with no "usually", "often" or "customers describe". Hard nos stay hard: no invented licenses, certifications, awards, years, family history, prices, guarantees, warranties or promised outcomes.
- **Sales pages, not explainers.** Write Home and the service pages the way the approved examples read. A service page is: what they do and for whom; why them (their site and the reviews); proof matched to the service (a real quote); the offer; the call to action.
- **Length follows the real material.** No word targets. A 450-word service page is fine if that is what is real. Never pad.
- **General trade knowledge:** at most ONE short section per service page, and only if it gets someone to call. No how-to, no "what usually fails" lists, no "before you call" checklists, no safety manuals.
- **Withdrawn Nov 16:** "fill service pages to 700+ with hedged general trade knowledge" and "write speed claims at one-review strength". Never apply them.

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


> "The architect's first job is QA: Josh is never deflated by what we call ready, and clients and prospects are never embarrassed by what they see. 'Passed the checks' is not 'ready'. Before a doc is called done, the architect reads it against the Lovable builds Josh QA'd, the client sites and Josh's comments, and asks whether Josh would be proud to send it." — Josh, Nov 16

You write words only, as one Markdown file that becomes a Google Doc. Edit only your output file. Run no git, send nothing, create no sessions.

**Strips and hedging (FF architect, Nov 16):** one strip per doc, on Home only, under the hero buttons, max 5 items (no service-page strips, no second or third bar). Hedge claims that need proof; never hedge plain process steps ("We schedule the work once the claim is approved").

**Rebuild reason (FF architect, Nov 16):** the second line of "## Notes" (after the briefs stamp) is "Rebuild reason: SEO / Design / Both. [one sentence of evidence]". SEO = Google can't tell what the site is (no town/service in headlines or titles, stuffed titles, services in one page). Design = reads fine to Google but looks dated/weak (old template, cramped, poor on phones, broken images). Both = both. Base it on the strategy page and audit.

## Read first, in full
1. **The models:**
   - `examples/approved-copy/` (sra, window-dudes, greene-planet);
   - the Lovable builds in `docs/reference-sites.md`, at least the closest in trade: All-Phase Electric (home and 2 service pages), Jon's Plumbing, Stone Electric, and A&D Mechanical for HVAC.
   - Window Dudes is the depth bar.
2. **The rules:** `docs/JOSH-CHECKLIST.md` and `/home/user/ff-astro-demos/docs/demo-definition-of-done.md` (no fact said twice). Its word floors (home 550+, service 700+) are withdrawn for words docs: length follows the real material.
3. **The voice:** `docs/voice/JOSH-VOICE.md` and `docs/voice/ff2-global-copy-rules.md` for the strategy page. The business pages are in the owner's voice.
4. **The business:** `inventory.md` (start here), `site/` (the full site text, which `site/COVERAGE.md` confirms complete), `reviews.json` and `facts.md`. These are the only sources for business facts. The site's own words are the main material; the reviews are the fact check.

## Pages
Write five pages:
- **Strategy**, in Josh's voice, to the owner;
- **Home**, H1 `<Trade> in <City>, <ST> — <Business>`;
- **2 service pages**: the two money services from inventory.md, H1 `<Service> in <City>, <ST> — <Business>`;
- **Contact**.

**Every inventory item (service, differentiator, credential, unusual offer, review theme) is used, or listed in "Notes" as consciously left out, with the reason.**

## Josh's guidelines (intent, not rigid rules)
- **Write for an owner who knows no jargon.** Never "trust bar", "menu", "footer", "title tag", "H1" or "SEO title". Say what it does for them.
- **Specific beats vague.** Every problem and fix on the strategy page is one that matters, e.g. "your reviews say fast after-hours help; your site never says it".
- **Say confidently what the site says and the reviews back.** A speed claim the site makes, or several reviews show, is stated plainly in the owner's voice ("We come out the same day"), with a review quote nearby as proof. If only one review shows it, leave it out of the hero. Never "customers describe" above the fold.
- **The full-build list:**
  - Lead with the foundation: every service and differentiator pulled out of the owner's head and onto the site.
  - The rest are things we actually guarantee: Google visibility and indexing monitoring, uptime, and page-speed checks.
  - Monitoring claims: the only allowed wording is the section "Keeps working after launch (verified monitoring facts, from Reports, 2026-11-16)" in docs/writer-guides/FULL_BUILD_LINES.md.
  - Mobile is most visitors (about 80%). That's why the 91 speed score matters: it doesn't let mobile visitors down.
  - About and owner pages build authority with Google and AI, and trust with customers.
  - Only the standard lines, with the scope truthful: the demo is "the first five pages".
- **Service pages sell.** Follow the content rule at the top: their site's words first, proof matched to the service, the offer, the call to action. At most one short trade section per page, only if it gets someone to call.
- **Cut shallow sections** that aren't Window Dudes deep. Card grids don't need headings. Keep blocks short. Home must not feel thin: a section of two sentences plus a quote is thin; give it real content or cut it, and never run three sections that each end in a quote.
- **Strategy page:**
  - "What we'd confirm" is 3-4 single questions, not bundles. Each is a real conflict (drop weak ones). The CTA after it is a real sentence, not a repeat of the button label.
  - "What the demo fixes" bullets name the actual items (never "credentials in plain words"), or name the exact gap between what the reviews say and what the page says.
  - Length: about 1,000 words is a soft cap (Pro Comfort ~1,074 with "Why it matters" lines; ComfortTechs also runs over). Spirit over letter.
  - Put the call to action after "What we'd confirm with you", not before.
  - **The closer:** no "Want a website like this for your business?" heading (Josh rejected it, REJECTED.md R17). After "What we'd confirm with you", end with the sentence "Book a no-obligation call and we'll walk you through this demo." and then `**[Book a no-obligation call]** · Text us: (417) 373-2773`.
  - **Never say "trust bar"** to the owner. The full-build list says "A bar near the top of every page that shows what makes you different".
  - No generic lead-in. Bridge from the reviews to the page plan.
  - Check each page's own problems; keyword stuffing differs from page to page.
  - Every card has three verified problems and three matching fixes the demo really makes.
  - No search-volume claims without real data.
  - "Why it matters" lines must be true.
  - The SRA proof block is fixed template content; never rewrite it.
  - The Homepage card's "A full build would also add" line must be exactly FULL_BUILD_LINES.md line 8: "Google and AI tools can only repeat what's written down. We get every service, credential and what makes you different out of your head and onto your site and Google profile, so they all tell the same story."
- **Hard rules:**
  - **Review quotes:** word for word, once each across the site. No review summaries.
  - **No two review quotes back to back** anywhere on a page (the models never do it); put copy between them.
  - **The site:** no website talk on the business pages, Contact included ("the form asks…", "send the form any hour").
  - **Case studies / portfolio jobs** on their site are real material: use them or log in Notes why not.
  - **No DIY manual:** trade knowledge explains; cut step-by-step homeowner instructions to essentials.
  - **Other companies:** no claims about them.
  - **Credentials:** defined once, on home. The business's own site claims (certs, licenses, financing, warranty, paperwork help) are usable in their voice, stated as their claim. Hard nos: claims WE invent (licenses, certs, awards, years, guarantees). Anything inventory marks as not on their site or contradicted is cut or moved to "What we'd confirm", never a flat assertion; never drop a top differentiator.
  - **Conflicts stay in Notes:** a conflict logged in Notes must not leak into copy (FAQ, hero line, or a quote under a contradicting heading).
  - **Jargon:** explain or skip trade jargon on business pages (tear-off, decking, flashing, ACV, RTUs, brand product names): use a plain phrase or explain once. Also TPO, EPDM, curbs, coping, "soft metals", soffit, fascia.
  - **One idea, one place across the whole doc** (e.g. the same repair-or-replace line, the insurer-decides line, the same tech explainer); vary across pages; no repeated catchphrases (e.g. the same staff-role line 10 times).
  - **Review-inferred things** (visit process, reply speed): say them plainly when several reviews show them; leave out what only one review shows. Hedge words ("usually", "often") are for general trade facts only, never for the business's own claims (REJECTED.md R3).
  - **Absolute claims copied from their site** ("always", "never", "100%"): drop the absolute word and state the claim plainly; don't add a hedge.
  - **Claim strength:** match the source exactly.
  - **Repeated lines:** financing, guarantee and quote lines once per site.
  - **Years and owner:** no disputed years; don't name anyone as owner unless confirmed. Anything listed under "What we'd confirm" (minimum charges, hours contrasts like "posted hours are X, but…", disputed years) stays out of page copy entirely.
  - **Filler from their own site is still filler:** "years of experience", "good hands", "finish the job right", "X is part of what we do": cut or replace with something specific.
  - **FAQ:** optional, at most 3 questions per page, only questions a buyer asks before calling, answered from the doc's own facts; never the same question on two pages.
  - **One-line or one-review claims** (permits, cameras) are written at that strength ("Customers have also had us…"), never as a general offer.
  - **No metaphors or personification.**
  - **No generic "signs" lists.**
  - **Differentiators strip:** differentiators (veteran owned, same-day, free estimates) go in a strip right under the home hero buttons, not in the last home section.
  - **Service vs posted hours:** a service the site claims that conflicts with its posted hours (e.g. "emergency repair" with 9-to-5 hours) stays in "What we'd confirm" and out of page copy.
  - **Trade-knowledge filler must not become a business claim** ("we size the replacement") unless a source supports it; otherwise phrase as general advice ("a replacement is usually sized to...").
  - **Keep advice consistent** across pages.

## Output
Write `/home/user/ff-content-demo-factory/outreach/words-2026-11-16/<slug>.md` in this layout:

```
# <Business> Demo – Words – Draft
> Draft for review. Sources: the business's own site, Google reviews, facts.md. Quotes are word for word.
## Strategy page
## Home — <H1>
## <Service 1> — <H1>
## <Service 2> — <H1>
## Contact — <H1>
## Notes (not page copy)
```

"Notes" covers:
- word counts per page, with and without quotes;
- credentials and their sources;
- inventory items left out, and why;
- facts to verify.

Use plain Markdown: headings, paragraphs, bullets and `>` blockquotes for quotes. **Never pad.** Record each page's word count in Notes; a short page is fine when that is the real material.

Reply in under 60 words: the two services, the words per page, and anything thin.
