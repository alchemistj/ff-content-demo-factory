# Writer kickoff

Work on branch:

`writer/rlb-electric-clean-room-v2`

Read:

`writer-runs/rlb-electric-remodel-repair/WRITER_TASK.md`

## Current test phase

Josh has intentionally reduced this run to **only the two service pages**:

1. Panel Upgrade — `/panel-upgrade-springfield`
2. Electrical Repair — `/electrical-repair-springfield`

Do not write the homepage, contact, header/footer, or Strategy Overview yet. Stop after these two pages for Josh's editorial review.

## Clean-room inputs

Do not browse or open FF-2 Demos. Do not inspect PR #25, branch `claude/rlb-electric-writer-test`, commit `48e4db8b8de0f5006b922e9b7e6892b1165a17e9`, or any previously authored RLB copy.

The materializer has been repaired to read only a validated **pre-writing Content Factory snapshot** that predates all RLB service-page prose. Run:

```bash
node scripts/materialize-rlb-clean-room-inputs.mjs
```

Then read the four files under:

`writer-runs/rlb-electric-remodel-repair/inputs/`

The script SHA-verifies every input. If materialization fails, stop; do not search another repository for substitutes.

## Output for this partial test

Do not weaken or change `writing-package/v1`, and do not manufacture a fake full six-part package.

Create a clearly labeled two-service-page review artifact on this branch. For each page include:

- stable page ID
- route
- SEO title
- meta description
- H1
- complete page copy using normal headings, paragraphs, lists, and source-backed review quotations

Use one readable review document/artifact containing Panel Upgrade first and Electrical Repair second. If you also create structured JSON, label it as a partial test artifact rather than a complete `writing-package/v1`.

Validate everything that legitimately applies at page level: routes, IDs, non-empty SEO metadata, content structure, quote fidelity/attribution, and factual support.

One writer owns both pages in this same run. Josh is the editorial quality gate; do not self-approve the prose.
