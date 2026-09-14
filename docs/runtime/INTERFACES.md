# Lane interfaces

This document is the compact contract surface for sibling lanes. Workflow owns these shapes. Other lanes should consume them from this branch rather than reconstructing them.

## Handoff kinds

| Kind | Version | Who writes it | Who reads it |
| --- | --- | --- | --- |
| Evidence and facts | `factory-research/v1` (`evidence`) | researcher | prescriber, writer, human |
| Advisory recommendations | `RecommendationSet` | researcher, then prescriber | later stages; never auto-locked |
| Proposed page plan | `factory-prescription/v1` | prescriber | human prescription gate |
| Approved decisions | `factory-approved-plan/v1` | human approval of the page plan | writer |
| Writer context | `factory-writer-context/v1` | workflow | one writer model |

TypeScript entry: `src/handoff/index.ts`.

Approved decisions contain page jobs, routes, target intents, business scope, and reserved human decisions. They do **not** contain recommended first reviews or other editorial suggestions. Those remain in the recommendation sets after human approval.

## Canonical review package (Google Docs lane must import this)

**This lane owns the shared package.** Import `src/writing-package/index.ts` (package export `ff-content-demo-factory/writing-package`). Do not define a second package type in `src/google-docs/`.

| Field | Contract |
| --- | --- |
| `schemaVersion` | `writing-package/v1` |
| `kind` | `website_copy` or `prescription` |
| Identity | `packageId`, `prospectId`, `runId`, `businessName`, deterministic `packageHash` |
| Pages | flat `pages[]` — not a nested homepage/services object |
| Stable identity | `pageId` (never derived from H1) |
| Role | `homepage` \| `service` \| `contact` \| `header_footer` \| `strategy_overview` \| `prescription` |
| Audience | `business` or `owner` (Strategy Overview is owner) |
| Route | required on website-copy pages except header/footer |
| Reading order | `readingOrder` integers; website copy must be homepage, two services, contact, header/footer, strategy overview |
| Title | default H1; humans may edit it without changing `pageId` |
| Blocks | `heading` (level 1–3, text only), `paragraph` (text spans), `list` (ordered + item spans), `quote` (spans + attribution + optional `reviewId`) |
| Text spans | `text` plus optional `bold`, `italic`, `href` |

Quote `reviewId`, when present, is used for source-fidelity checks: the quoted plain text must be the full source review or a contiguous excerpt (whitespace/line-break normalization only). Paraphrase inside quotation marks is invalid.

Validator/hash: `parseWritingPackage`, `assertWritingPackage`, `hashWritingPackage`, `buildWritingPackage`. One implementation.

Package export: `ff-content-demo-factory/writing-package`.

**PR #31 must import this module** and delete `src/google-docs/writing-package.ts`. Do not keep `schemaVersion: "1.0.0"`, optional `runId`, optional quote attribution, or a second hash function. Differences this contract adds on purpose:

- `schemaVersion` is `writing-package/v1`
- `audience` is required on every page (`business` or `owner`)
- `runId` is required
- `packageHash` is stored on the package; use `hashWritingPackage` / `parseWritingPackage`
- quote `attribution` is required; `reviewId` is optional and used for source-fidelity checks

Publisher boundary: `GoogleDocsPublisher.publishReviewPackage(pkg)` in `src/publisher/index.ts`.

Both existing human gates call that method:

- Prescription gate: `kind: "prescription"`. Pages distinguish (1) proposed decisions for approval, (2) evidence for context, (3) advisory recommendations that are not approvals. Title: `[Business Name] — Prescription — Human Review`.
- Copy gate: `kind: "website_copy"`. Title: `[Business Name] — Website Copy — Human Review`.

If Google is missing or publication fails, the package is preserved and the error is recorded on the human-QA task. `retryPublication()` republishes the stored package for the current gate and does not rerun research, prescription, or the writer.

This lane ships `createUnconfiguredPublisher()` so the workflow can finish without the google-docs implementation.

## Writer run

The factory calls `writer.writeCompletePackage()` **once**. The adapter receives full `WriterContext`, guides, examples, and `internalOrder`. Returning the complete website-copy package is required. Internal order is recommended sequencing inside that one run, not three stateless model calls.

## Examples lane

The writer assignment loads `examples/approved-copy/` when present. If that directory is missing, discovery reports `pending-examples-lane` and writing still proceeds with canonical guides plus the prospect packet.

Canonical guide files remain at `docs/writer-guides/`. This lane adds a complete writing-assignment loader; it does not rewrite the craft guides.

## Human gates

The only routine human gates are:

1. Prescription / page-plan approval (`awaiting_prescription_approval`)
2. Copy QA after the writing package exists (`awaiting_copy_qa`)

No additional human gates. No model-as-editor gate. Prescription publication is the same existing gate, with a Doc link when configured.
