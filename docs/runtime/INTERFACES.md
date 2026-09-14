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

## Writing package (Google Docs lane)

Version: `writing-package/v1`

TypeScript entry: `src/writing-package/index.ts`

Publisher boundary: `src/publisher/index.ts` (`GoogleDocsPublisher.publishWritingPackage`)

The copy gate calls the publisher automatically. Reading order:

1. Homepage
2. Service page 1
3. Service page 2
4. Contact
5. Shared header/footer chrome
6. Owner-facing Strategy Overview

Payload identity is `{ prospectId, runId, packageHash }`. Evidence administration and research notes stay out of the published copy.

If Google configuration is missing or publication fails, the writing package is preserved and the error is recorded on the human-QA task. `retryPublication()` republishes that package and does not rerun the writer.

Expected Google Doc title: `[Business Name] — Website Copy — Human Review`.

The google-docs lane should implement `GoogleDocsPublisher`. This lane ships `createUnconfiguredPublisher()` so the workflow can finish without that implementation.

## Examples lane

The writer assignment loads `examples/approved-copy/` when present. If that directory is missing, discovery reports `pending-examples-lane` and writing still proceeds with canonical guides plus the prospect packet.

Canonical guide files remain at `docs/writer-guides/`. This lane adds a complete writing-assignment loader; it does not rewrite the craft guides.

## Human gates

The only routine human gates are:

1. Prescription / page-plan approval (`awaiting_prescription_approval`)
2. Copy QA after the writing package exists (`awaiting_copy_qa`)

No additional human gates. No model-as-editor gate.
