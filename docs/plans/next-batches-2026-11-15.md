# Next demo batches (proposal, 2026-11-15)

FF Architect's ask: the next two city × trade batches, with reasons. Facts-first pipeline (sources plus Apify), built to the current strict bar, with the new automatic gates (`docs/demo-gates.md`).

## ~~Batch 1: Springfield, MO plumbers~~ (dropped: Josh excluded Springfield/417 on 11/14, since he runs into those owners locally)

The first batch now comes from the factory city list (`data/cities.json`): metros of 300k–600k outside FL, CO, OR, WA and Northern California, not Springfield.

### Original reasoning (kept for reference)
**Why:**
- **Cheapest strong batch.** The plumbing avatar, plumbing image pool (with this weekend's expansion), template and gates are all done and tested on Wichita. Nothing new to make before writing.
- **Local proof.** Every strategy page opens with the SRA Roofing case study, a Springfield result ("top 10 across two-thirds of Springfield on Maps"). For a Springfield plumber that's a neighbor's result, not a far-off one.
- **Home market.** Fluid Frame is in Springfield, so a local call or visit is possible, and no client conflict: current Springfield clients are roofing and windows.

**Selection rule (from the Wichita lesson):** only prospects with **40+ written Google reviews** and a site with real service content, so two service pages can reach 595+ honest words. Service pages are picked where a prospect has 5+ on-topic reviews.

**Pipeline:**
1. prospect-scout.yml (Apify) gives candidates.
2. Haiku research: audit, facts, qualify.
3. review-pull.yml, sequential.
4. Competitor scan.
5. Sonnet USP and words, with the SRA/Window Dudes voice reference.
6. `npm run gate` (words, sameness, sources).
7. Build, then a strict-rubric score, then fix only to the score.

## Batch 2: Wichita garage doors (6 demos)
**Why:**
- **Avatar already built** (`avatars/garage-doors.md`, this weekend), and Wichita competitor knowledge carries over.
- **High-ticket and urgent:** a broken spring or a stuck door means a same-day call, and the jobs (springs, openers, new doors) are big enough to justify a real site.
- **Weak sites are common** among small door companies, which are often single-page or builder sites.

**Needs first:** a garage-door image pool from Cursor (same spec format as `docs/image-pool/plumbing/SPEC.md`: spring, opener, new door, tech at door, home exterior, contact). That's about an hour of Cursor time, so dispatch it the day the batch starts.

## Considered, not first
- **Wichita lawn care:** the avatar is done, but November is off-season, so outreach lands better in late February.
- **Springfield electricians:** a good batch 3, reusing the electrical pool the same way.
