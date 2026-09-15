# RLB Electric clean-room writer test

## Purpose

Redo the RLB Electric Remodel & Repair writing test from scratch using the current Content Demo Factory architecture on this branch.

This is a **writing-quality test of the new one-writer system**. Produce a fresh complete website-copy package from source evidence, the already-approved page plan, the current Fluid Frame guides, and the current approved Springfield examples.

## Absolute clean-room rule

Do **not** inspect, fetch, search, quote, summarize, diff, or otherwise use any previously authored RLB copy.

Specifically excluded:

- PR #25 in `alchemistj/ff-content-demo-factory`
- branch `claude/rlb-electric-writer-test`
- commit `48e4db8b8de0f5006b922e9b7e6892b1165a17e9`
- `ELECTRICAL_REPAIR_PAGE.md`
- `PANEL_UPGRADE_PAGE.md`
- any historical RLB `copy-artifact.json`, `copy-blueprint.json`, `copy-evidence.json`, `copy-pages/**`, `copy-review.md`, `copy-sitewide/**`, copy-quality output, or render-binding output

Those are prior writer outputs and are contamination for this test.

The only RLB-specific authority is the immutable upstream evidence/prescription material listed in `INPUT_MANIFEST.json` and materialized by `scripts/materialize-rlb-clean-room-inputs.mjs`.

## Start here

1. Read repository-root `ASSIGNMENT.md`.
2. Read `docs/runtime/AUTHORITY.md`.
3. Read `docs/runtime/WRITER.md`.
4. Read the canonical writer guides under `docs/writer-guides/`.
5. Read the approved example library under `examples/approved-copy/` through the repository's normal assignment/example loader. The primary corpus is the twelve approved Springfield pages; `_chrome.md` files are supplemental.
6. Run:

```bash
node scripts/materialize-rlb-clean-room-inputs.mjs
```

7. Read all four files created under `writer-runs/rlb-electric-remodel-repair/inputs/`.

Do not search GitHub for prior RLB writing. The materializer is the approved source path.

## Source authority

The materializer pins the original FF-2 Demos evidence and approved prescription to exact commits and verifies SHA-256 hashes before writing local files.

The four inputs are:

- `review-inventory.json` — original exact-place Google review inventory
- `strategy-recipe.json` — approved RLB strategy/page prescription and embedded evidence/context
- `confirmed-facts.json` — confirmed business facts
- `prescription-approval.json` — record of Josh's approval of the prescription

Source provenance is documented in `INPUT_MANIFEST.json`.

## Human-approved page plan

Preserve the approved five-page demo architecture:

1. Owner-facing Strategy Overview at `/`
2. Business homepage at `/home`
3. Panel Upgrade service page at `/panel-upgrade-springfield`
4. Electrical Repair service page at `/electrical-repair-springfield`
5. Contact page at `/contact`

Shared header/footer is part of the complete writing package, not a separate public route.

The two service jobs are intentionally distinct:

- **Panel Upgrade** — considered-purchase/planned-capacity work
- **Electrical Repair** — urgent/problem-solving residential repair and troubleshooting

Kitchen & bath remodel electrical installation remains a confirmed business capability but is intentionally **not** one of the two dedicated demo service landers. Do not add a third service page.

## How to treat the old prescription under the new architecture

The approved page jobs, routes, business scope, and explicit human locks are binding.

Research/prescription suggestions about which review to lead with, exact section order, review counts, word counts, FAQ counts, paragraph lengths, or other editorial tactics are **recommendations to consider**, not commands, unless the source clearly records them as an explicit Josh-approved decision.

Use your own writing judgment under `docs/runtime/AUTHORITY.md`.

The full source-backed review inventory remains available to you. You may choose the reviews that best support the final written page. Preserve quotation fidelity and attribution.

## One writer owns the entire package

This assignment is **one writer run**.

Do not split the work into separate fresh agents or model sessions for services, homepage, chrome, or strategy.

Recommended internal sequence inside the same run:

1. Write the two service pages.
2. Write homepage, contact, header, and footer with continuity from the service pages.
3. Write the owner-facing Strategy Overview last, describing the site that now actually exists.
4. Reread and polish the complete package as a whole.

## Writing philosophy

Use the current positive-framework system on this branch.

- Make RLB's specific, source-supported case.
- Write direct customer-facing business copy where evidence supports it.
- Use reviews as proof beside the benefits they support, not as a compliance exercise.
- Do not narrate evidence limitations to customers.
- Do not mechanically recreate the old rubric.
- Do not write to fixed review counts, FAQ counts, word counts, paragraph lengths, or review-distance quotas.
- Do not manufacture claims, offers, credentials, timing, availability, warranties, pricing, service areas, or customer outcomes.
- Do not convert one customer's experience into a company-wide promise.
- Do not copy facts, claims, or wording from the Springfield example businesses; they teach craft only.

## SEO metadata is required

The same writer must produce final SEO metadata as part of the copy package.

`seoTitle` and `metaDescription` are required for:

- homepage
- Panel Upgrade service page
- Electrical Repair service page
- contact page

Do not put SEO metadata on shared header/footer. Strategy Overview SEO metadata is not required.

Use the approved page job, route, and target intent to guide literal, useful search-result wording. Do not keyword-stuff and do not treat character/pixel counts as a grading gate.

The later website builder should consume these final SEO words rather than invent replacements.

## Required output

Create exactly one complete canonical `writing-package/v1` JSON artifact at:

`writer-runs/rlb-electric-remodel-repair/output/writing-package.json`

It must contain the complete package in this order:

1. homepage
2. Panel Upgrade service page
3. Electrical Repair service page
4. contact
5. shared header/footer
6. owner-facing Strategy Overview

Use stable page IDs; do not derive identity from H1 text.

The package must satisfy the current `src/writing-package/` contract, including required routes, audiences, content blocks, SEO metadata, and canonical package hash.

Do not create separate Markdown page drafts as the authoritative output. The JSON writing package is the source of truth for this test.

## Validation before handoff

Before declaring the writing complete:

- Validate the package with the repository's current `writing-package/v1` parser/validator.
- Confirm homepage/services/contact all have non-empty `seoTitle` and `metaDescription`.
- Confirm header/footer has no SEO metadata.
- Confirm Strategy Overview is owner-facing and business pages are customer-facing.
- Confirm every quoted review is exact source text or a faithful contiguous excerpt with correct attribution.
- Confirm the package contains only the approved page set/routes.
- Run the repository typecheck/tests relevant to your changes.

## Scope boundary

For this test, do not:

- change the factory architecture, writer guides, examples, schemas, or tests unless a genuine blocking defect prevents producing a valid package
- build the website
- touch FF-2 Demos
- publish to production
- perform outreach
- use the old RLB writer branch or PR
- add another editorial-model gate

If you discover a framework defect that prevents the assignment, stop and report the defect rather than silently redesigning the factory.

## Handoff

When finished, report:

- exact branch and HEAD SHA
- output path
- validation/test results
- which source reviews were actually used
- any source ambiguity or unsupported claim you deliberately excluded
- confirmation that no historical RLB authored copy was consulted

Do not self-grade the prose as approved. Josh is the editorial quality gate.