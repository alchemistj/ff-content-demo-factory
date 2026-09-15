# RLB Electric clean-room two-service-page writing test

## Purpose

Redo the RLB Electric Remodel & Repair service-page writing test from scratch using the current Content Demo Factory architecture on this branch.

This phase is intentionally a **writing-quality test of only two service pages**. It is not the full website-copy package yet.

Write:

1. Panel Upgrade — `/panel-upgrade-springfield`
2. Electrical Repair — `/electrical-repair-springfield`

Stop after those two pages for Josh's editorial review.

## Absolute clean-room rule

Do **not** inspect, fetch, search, quote, summarize, diff, or otherwise use any previously authored RLB copy.

Specifically excluded:

- PR #25 in `alchemistj/ff-content-demo-factory`
- branch `claude/rlb-electric-writer-test`
- commit `48e4db8b8de0f5006b922e9b7e6892b1165a17e9`
- `ELECTRICAL_REPAIR_PAGE.md`
- `PANEL_UPGRADE_PAGE.md`
- historical RLB `copy-artifact.json`, `copy-blueprint.json`, `copy-evidence.json`, `copy-pages/**`, `copy-review.md`, `copy-sitewide/**`, quality output, or render-binding output
- any current or historical FF-2 Demos browsing for this task

Those are prior writer outputs or uncontrolled alternate source paths and are contamination for this test.

The only RLB-specific authority is the four SHA-verified inputs defined in `INPUT_MANIFEST.json` and materialized by `scripts/materialize-rlb-clean-room-inputs.mjs`.

## Why the source path is safe

The materializer reads from Content Factory commit:

`82b72510cb480f12fc02358263781528d30c39ab`

That commit is a validated **pre-writing clean-room packet** created before any RLB service-page prose was authored. It contains the four verified source inputs that had been copied from the pinned FF-2 Demos evidence/approval lineage.

The source snapshot contains no RLB service-page drafts. The materializer also verifies the expected SHA-256 for every file before writing it locally.

Do not browse the old branch or FF-2 Demos to confirm or supplement these files. If the materializer fails, stop and report the failure.

## Start here

1. Read repository-root `ASSIGNMENT.md`.
2. Read `docs/runtime/AUTHORITY.md`.
3. Read `docs/runtime/WRITER.md`.
4. Read the current canonical writer guides under `docs/writer-guides/`.
5. Read the approved example library under `examples/approved-copy/` through the repository's normal assignment/example loader. The examples teach craft; their facts belong to those businesses.
6. Run:

```bash
node scripts/materialize-rlb-clean-room-inputs.mjs
```

7. Read all four files created under `writer-runs/rlb-electric-remodel-repair/inputs/`:
   - `review-inventory.json`
   - `strategy-recipe.json`
   - `confirmed-facts.json`
   - `prescription-approval.json`

## Source authority

The four inputs mean:

- `review-inventory.json` — full exact-place Google review inventory: 68 listing reviews, 44 retrieved written reviews, 4.9 listing rating.
- `strategy-recipe.json` — the approved RLB strategy/page prescription plus embedded evidence/context.
- `confirmed-facts.json` — confirmed business facts.
- `prescription-approval.json` — records the human approval of the prescription (`authorized: true`, `recordedJoshApproval: true`).

The writer has the **full source-backed review inventory**. Review grades/classifications or suggested lead-review choices in older artifacts are not commands under the current architecture. Use your own editorial judgment to choose the strongest truthful evidence for each page.

Every quotation must preserve exact source wording or a faithful contiguous excerpt and correct attribution. Do not convert a customer's individual experience into a company-wide promise.

## Human-approved service-page jobs

### Panel Upgrade

Route: `/panel-upgrade-springfield`

Job: considered-purchase / planned-capacity electrical work. Help a Springfield homeowner understand when a panel upgrade is the relevant service and why RLB is a credible company to call.

### Electrical Repair

Route: `/electrical-repair-springfield`

Job: urgent/problem-solving residential electrical repair and troubleshooting. Help a Springfield homeowner with an active electrical problem understand that RLB diagnoses and repairs this kind of work.

These two pages must remain meaningfully distinct. Do not write the same page twice with swapped keywords.

Kitchen & bath remodel electrical installation remains a confirmed RLB capability but is intentionally not a dedicated service lander in this test. Do not add a third service page.

## What remains binding vs advisory

Binding:

- factual evidence
- business identity/contact facts
- the two approved routes
- the distinct jobs/intents of the two pages
- explicit human locks recorded in the approved prescription

Advisory rather than mandatory:

- suggested first review
- section sketches/order
- review counts
- word counts
- FAQ counts
- paragraph-length targets
- review-distance rules
- other editorial tactics that were not explicitly human-approved decisions

Use the current positive-framework system and your own writing judgment.

## Writing philosophy

- Make RLB's specific, source-supported case.
- Write as the business to a customer choosing whom to call.
- Use concrete evidence and customer experiences rather than generic contractor praise.
- Use reviews as proof beside the benefits they genuinely support, not as a compliance exercise.
- Do not narrate evidence limitations to customers.
- Do not mechanically recreate the old V2 rubric.
- Do not write to fixed review counts, FAQ counts, word counts, paragraph lengths, or review-distance quotas.
- Do not manufacture services, credentials, response times, emergency/24-hour claims, warranties, pricing, financing, service areas, guarantees, or customer outcomes.
- Do not copy facts, claims, or wording from the Springfield example businesses; they teach craft only.

## SEO metadata is required

For **both** service pages, write final:

- `seoTitle`
- `metaDescription`

Use the approved page job, route, and search intent to guide literal, useful, evidence-supported search-result wording.

Do not keyword-stuff. Do not treat character or pixel counts as a grading gate. The later website builder should consume these approved words rather than invent replacements.

## Output for this partial test

Do **not** weaken or change the canonical `writing-package/v1` schema.

Do **not** fake a full package containing only two pages and claim it is valid `writing-package/v1`; the full schema correctly requires the entire site package.

Instead, create a clearly labeled partial review artifact under:

`writer-runs/rlb-electric-remodel-repair/output/`

Use a machine-readable structure that preserves, for each page:

- stable page ID
- role = `service`
- audience = `business`
- route
- SEO title
- meta description
- H1/title
- full content blocks (headings, paragraphs, lists, quotations)
- source review ID for any quoted review where practical

Also create one **readable review document/artifact** containing both pages in this order:

1. Panel Upgrade
2. Electrical Repair

For each page, visibly show:

- route
- SEO title
- meta description
- H1
- complete page copy

This readable artifact is what Josh should review first. Do not make Josh review raw JSON to judge prose.

## Validation before handoff

Do not run the full six-part `writing-package/v1` validator against this intentionally partial artifact and then try to “fix” the schema when it fails.

Validate the things that legitimately apply at page level:

- exactly the two approved service routes
- stable page IDs
- business-facing audience
- non-empty SEO title and meta description on both pages
- valid content-block structure
- every quotation maps to source-backed review text and uses exact wording or a faithful contiguous excerpt
- correct reviewer attribution
- no unsupported claims
- the two pages own meaningfully different customer decisions
- no historical RLB authored copy was consulted

Run repository typecheck/tests only as relevant to ensure your changes did not break existing factory code. Do not change factory architecture, schemas, guides, examples, or tests merely to accommodate this partial experiment.

## Scope boundary

Do not:

- write homepage/contact/chrome/Strategy Overview in this phase
- build the website
- touch FF-2 Demos
- publish to production
- perform outreach
- add another editorial-model gate
- inspect prior RLB authored copy
- redesign the factory

If a genuine framework defect blocks the writing task, stop and report it rather than silently working around it.

## Handoff

When finished, report:

- exact branch and HEAD SHA
- paths to the structured partial artifact and readable review artifact
- validation/test results
- which source reviews were actually used on each page
- any source ambiguity or unsupported claim deliberately excluded
- confirmation that no historical RLB authored copy or FF-2 Demos material was consulted outside the four materialized inputs

Do not self-grade the prose as approved. Josh is the editorial quality gate.
