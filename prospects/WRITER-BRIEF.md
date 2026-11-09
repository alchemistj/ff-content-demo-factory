# Writer brief: one prospect's words package

You write one demo's complete words package in the content factory. Work in `/home/user/ff-content-demo-factory`, and only inside your prospect folder `prospects/<market>/<slug>/`. **Do not run git** (no commit, no push, no checkout); the Architect commits for you.

## Read first (in this order)
1. `docs/writer-guides/README.md` and every guide it lists: the overall writing guide, the keyword guide, review quotes, homepage, service page, contact, header/footer, strategy page, and full-build lines.
2. The approved examples in `examples/approved-copy/`: Window Dudes, SRA and Greene Planet, plus `strategy-overview-examples.md`. Learn the voice, depth and rhythm from them.
3. `docs/words-package.md`: the exact file you deliver.
4. `docs/runtime/SITE-AUDIT.md`.
5. Your prospect folder:
   - `facts.md` (cited facts; the only source of business facts)
   - `reviews.json` (the only source of quotes)
   - `reviews.md` (if present)
   - `old-WORDS.md`: last night's version. Use it **only** for its notes (owner names, phone numbers, decisions, onboarding questions). Do not reuse its sentences: its voice and its H1 broke the guides.

## Steps
1. **Audit their current site** (`audit.md`) by `docs/runtime/SITE-AUDIT.md`.
   - Use Playwright from Node (`require('playwright')`; Chromium is preinstalled, no install needed), at 390x844 and 1440x900.
   - Click every menu link and button, test every `tel:` and `mailto:` link and every phone number shown, and check forms and placeholder pages.
   - Save screenshots of broken things in `audit/`.
   - Write findings with evidence, the most costly problem first.
2. **Plan** (`plan.md`, one page):
   - company type and homepage H1 (`[Company Type] in [City, ST] — [Business]`, one city)
   - two service pages, each owning a different keyword, plus contact, with the cannibalization test run
   - the full confirmed services list
   - every office and number
   - what the strategy page argues: their reviews versus their site, in their customers' words, plus the audit's biggest findings
3. **Write `words.json`** following `docs/words-package.md`.
   - Business pages talk to the visitor as "you", and the business speaks as "we/our".
   - State each benefit first, then a review block that proves it. Never "Customers tell us…", "Most people notice…", "One customer…" or "The crew… They…".
   - The homepage has a `services` section, and `services[]` holds the full confirmed list.
   - The footer has `about` and two to four `why` items.
   - Every phone number goes in `business.phones`.
   - Quotes are word for word from five-star reviews, First L., each used once, spread through the pages.
   - No fact outside `facts.md`.
   - Write the strategy page last, from the audit and your finished pages, using only lines from FULL_BUILD_LINES.md for `alsoAdd`.
   - Hero and section `image` fields need `alt` and a short `brief` (the subject on the side away from the text, calm background behind the text, no readable text, no tools in hands).
4. **Check:** run `node scripts/check-words-package.mjs prospects/<market>/<slug>` and fix every FAIL. Then reread every page aloud in your head as the business owner would hear it, and fix anything that sounds generic, hedged or invented.
5. **`questions.md`:** the onboarding-call questions (certifications to verify, owner surname, phone numbers, years, services to confirm).

## Report back (short)
- the checker summary and the rendered word counts
- the homepage H1 and the two service-page H1s
- the three biggest audit findings
- anything you could not verify
