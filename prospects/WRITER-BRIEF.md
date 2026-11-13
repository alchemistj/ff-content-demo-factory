# Writer brief: one prospect's pages

Version 2, Josh, 2026-11-09. You write one demo's business pages in the content factory. Work in `/home/user/ff-content-demo-factory`, only inside your prospect folder `prospects/<market>/<slug>/`. **Do not run git**; the Architect commits for you.

You are writing pages people read, not filling a form. The pages are converted into the site format later.

## Read first, in this order
1. `docs/writer-guides/HOW_TO_WRITE_A_PAGE.md`: the method, and the approved Evolve before-and-after. This matters most.
2. `examples/approved-copy/evolve-exteriors/homepage.md`: the approved model for a multi-service homepage. Read it twice. Learn how each section works, then write your own; never reuse its sentences.
3. The Springfield examples in `examples/approved-copy/` (Window Dudes, Greene Planet, SRA): at least the homepages and one service page each.
4. `docs/writer-guides/README.md` and the guides it lists, for keywords, reviews, the homepage, service pages and contact.
5. Your prospect folder:
   - `facts.md` is the only source of claims about the business (services, people, warranty, years, prices, area).
   - `reviews.json` is the only source of quotes.
   - `audit.md` is the problems on their current site.

General trade knowledge is fine and expected: why windows fog, why sliders drag, what wears out siding, what drives a price. It is not a claim about the business.

## Steps
1. **Plan** (`plan.md`). Write this before any page copy.
   - The company type and homepage H1 (`[Company Type] in [City, ST] — [Business]`, one city), and the two service pages, each owning one service keyword.
   - **The idea** the homepage argues, in one or two sentences, found in the reviews and facts.
   - For each section of each page: the homeowner's moment, the reason behind it, what the business does, and the review that proves it (reviewer plus the line).
   - The real questions a visitor asks before calling, with the real answer from the facts and the pattern in the reviews.
2. **Write the pages** as Markdown in `pages/`: `home.md`, one file per service page (for example `window-replacement.md`), and `contact.md`.
   - Copy minimums, not counting reviews, menus or footer: home 900, service 700, contact 150. Depth comes from teaching and answering, never padding.
   - Short paragraphs: one to three sentences.
   - Reviews as block quotes, word for word, with `> — First L.` under them. Two to five per page, each right after the paragraph it proves.
   - Link a service to its page where it has one.
3. **Check** with `node scripts/check-page.mjs prospects/<market>/<slug>`. Fix every FAIL. Look at every WARN and use judgment.
4. **Reread every page twice.** Once aloud as the owner: would they say this? Is anything invented, hedged or generic? Once as a homeowner on a phone: do they learn something, and do they know what to do next? Fix what you find.

## Report back (short)
- The idea, in one sentence.
- The homepage H1 and the two service-page H1s.
- `check-page` output, with word counts.
- Anything you could not support from the facts, and anything you left out because of that.
