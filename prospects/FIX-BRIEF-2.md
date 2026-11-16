# Fix brief 2: one service per page, first-person owners (Josh's review of Evolve)

Edit one prospect's `words.json` in `/home/user/ff-content-demo-factory`. Do not run git.

First re-read `docs/writer-guides/HOMEPAGE_GUIDE.md` (the "One service per service page" paragraph), `docs/writer-guides/FLUID_FRAME_DEMO_WRITING_GUIDE.md` (the voice paragraphs) and `docs/words-package.md`.

## 1. One service per service page
- **Rename each service page to a single service.** If a page's H1 combines services ("Doors & Siding", "Siding, Painting & Decks", "Roof Replacement & Hail Damage Repair", "Insulation & Weatherization", "Gutter Installation, Repair & Cleaning"), make it one service. Pick the one with the most demand and review evidence in `facts.md`, `reviews.json` and `plan.md`.
- **Update the page to match:** route (`/<service>-wichita-ks/`), H1 (`<Service> in Wichita, KS — <Business>`), `keyword`, `navLabel`, and the page's content. Remove sections about the other services. Write the page so it fully serves that one service, using only facts and reviews you have, and stay within 750–900 rendered words.
- **Give every service exactly one route at most.** In `services[]`, only the service a page is about gets that page's route. Every other service gets `"route": null` and shows as a plain card and footer line.
- **Fix cross-references:** update the strategy page's cards, problems and fixes, the homepage section links, and any `[text](/route/)` links to the new routes and names.

## 2. Owners speak in the first person
- Add `business.owners` with the owners' first names (empty if none are confirmed).
- **Rewrite third-person owner sentences** ("Colton and Riley own Evolve and stay close to every job", "Rick Timsah owns…", "Geremy handles…") as "we" sentences, for example "We're Colton and Riley, and we own Evolve." Names inside review quotes stay as they are.

## 3. Odd numbers
Superseded: do not remove a review-backed detail that sounds odd. State the benefit it shows, then the review as proof (see the writing guide).

## Check
Run `node scripts/check-words-package.mjs <folder>` and get PASS. Keep every review quote word for word, each used once.

## Report
For each change, give the new service-page H1s and routes and the checker line.
