# Demo gates (automatic, from 2026-11-14)

Every words package must pass `npm run gate -- <folder>` before it is built. CI runs the same gate on every PR, for each demo folder the PR changes (`--allow-logged --changed origin/<base>`).

The gate runs three checks:
1. **`scripts/check-words-package.mjs`:** structure and the hard rules. **Length:** a page may be up to 15% under its minimum (logged as a short page). Below that it fails, unless the page is already in a committed `outreach/*short-pages*.md` log, which is FF Architect's "logged, not padded" rule, pending Josh's decision on word minimums.
2. **`scripts/lint-sameness.mjs`:** catches template feel inside one demo:
   - repeated sentences or headings;
   - stock label headings;
   - an eyebrow that repeats the trust bar;
   - any reviewer named more than twice (one story per customer).
3. **`scripts/check-sources.mjs`:** checks that facts trace to the folder's own sources:
   - every quote is word for word in reviews.json, with that reviewer's First L. caption;
   - every phone number is in facts.md;
   - every year count, "since YYYY", percentage and dollar figure is in facts.md, audit.md or a review;
   - claim words (guarantee, warranty, licensed, insured, certified, award, 24/7, family-owned, generation, master plumber or electrician) are used by a source.

   Lines that facts.md marks "Unverified" or "Conflict" don't count as sources. `[[confirm: …]]` chips are skipped.

## Why (the weekend 87→93 pass)
On a strict rubric the first Wichita 12 started at 41–63. Most of the loss was unsourced claims, retold reviews used as padding, and label headings. Each one is now caught before a scorer ever sees the demo.

## Service-page selection rule (new)
Pick a demo's two service pages **only where the folder has enough on-topic material**: at least 5 reviews about that service, or the business's own site describing it in some depth. A page with one review can't reach 595 honest words; Brockmeyer's EV page had to be swapped out for this reason. Check this at the plan step, before writing.
