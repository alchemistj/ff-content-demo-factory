# ff-content-demo-factory

This repository is the GitHub-native home of the Fluid Frame Content Demo Factory.

**Start here:** [`ASSIGNMENT.md`](ASSIGNMENT.md). That is the one assignment entry point. Provider-specific files point at it instead of copying policy.

A newly started model with ordinary GitHub read access can discover its assignment, runtime instructions, canonical guides, and the approved Springfield example library from this repo. **Google Drive is not required to load writer guides or examples.**

## Executable path

1. Research produces an evidence packet plus advisory recommendations.
2. Prescription proposes a page plan plus advisory recommendations.
3. A human approves the page plan (existing prescription gate, published through the same Google Docs review surface when configured). Approval does not lock accompanying suggestions.
4. One configurable writer model completes the package in **one writer run**. Service pages, homepage/contact/chrome, and Strategy Overview are recommended internal order, not three model sessions. There is no second-model editor and no routine human stop inside that run.
5. Mechanical validation checks artifact integrity only, including faithful review excerpts.
6. Both human gates use `publishReviewPackage()`. If Google is unconfigured or publication fails, the stored package is preserved and the error is recorded. Retrying publication does not rerun research, prescription, or the writer.
7. The human copy-QA task receives the Doc link when publication succeeded.

Programmatic entry:

```ts
import { discoverAssignment, runFactory, retryPublication } from "./src/workflow/index.ts";

const assignment = discoverAssignment();
```

```bash
npm install
npm run assignment:receipt
npm run writer-guides:receipt
npm run test:all
```

Lane interfaces live in [`docs/runtime/INTERFACES.md`](docs/runtime/INTERFACES.md).

## Canonical writer guides

The guides are a short affirmative framework. **Finished Springfield pages in `examples/approved-copy/` do most of the teaching.** For new Content Demo Factory writing work, **these guides replace — they do not sit beside — older overlapping writer instructions.** Do not also load deprecated FF2 craft guides or Google Doc copies of the same documents.

```text
docs/writer-guides/README.md
docs/writer-guides/FLUID_FRAME_DEMO_WRITING_GUIDE.md
docs/writer-guides/SERVICE_PAGE_GUIDE.md
docs/writer-guides/HOMEPAGE_GUIDE.md
docs/writer-guides/CONTACT_PAGE_GUIDE.md
docs/writer-guides/HEADER_FOOTER_GUIDE.md
```

`docs/writer-guides/README.md` is the human-readable index for this set. It is part of the canonical six-file catalog. Raw Markdown in those files is the writer context. Do not summarize them into a second source of truth. Historical prospect folders in this repo are finished packages, not active factory instructions.

The complete writing assignment loads the five craft guides. The old Writer 1 / Writer 2 / Writer 3 loaders remain as **internal phase** helpers inside that one writer run, not separate human-gated jobs.

```ts
import { loadWritingAssignmentGuides, loadWriterStageGuides } from "./src/writer-guides/index.ts";
import { loadApprovedCopyCatalog } from "./src/approved-copy/index.ts";

const writing = loadWritingAssignmentGuides();
const servicePhase = loadWriterStageGuides("writer1");
const examples = loadApprovedCopyCatalog();
```

## Approved examples

```text
examples/approved-copy/README.md
examples/approved-copy/SOURCE_MANIFEST.md
examples/approved-copy/window-dudes/
examples/approved-copy/sra/
examples/approved-copy/greene-planet/
```

Twelve Springfield reference pages (homepage, two services, contact for each business). They are faithful extractions from the captured builds recorded in `SOURCE_MANIFEST.md`. Window Dudes’ repair-side example is Glass Repair (`/springfield/glass-repair/`). Shared `_chrome.md` files are supplemental header/footer examples and are not part of the twelve-page primary corpus. See `examples/approved-copy/README.md`.

## Internal writing phases (one writer run)

| Internal phase | Also called historically | Read these files | Then write |
| --- | --- | --- | --- |
| Service-page pass | Writer 1 / Copy Agent 1 | `FLUID_FRAME_DEMO_WRITING_GUIDE.md`, `SERVICE_PAGE_GUIDE.md`, matching service examples, plus the approved prospect prescription/evidence | only the two service pages |
| Site/chrome pass | Writer 2 / Copy Agent 2 | `FLUID_FRAME_DEMO_WRITING_GUIDE.md`, `HOMEPAGE_GUIDE.md`, `CONTACT_PAGE_GUIDE.md`, `HEADER_FOOTER_GUIDE.md`, matching examples, plus finished service pages and the approved prescription/evidence | homepage, contact, header, and footer |
| Strategy Overview pass | Writer 3 / Copy Agent 3 | `FLUID_FRAME_DEMO_WRITING_GUIDE.md`, plus the finished business-facing site and the original audit/prescription/evidence needed for Strategy | Strategy Overview last |

These names describe sequencing inside `writeCompletePackage()`. They are not instructions to dispatch three independent writers.

The loader still:

- Discovers the repository root from the loader module path
- Validates that all six catalog files exist and are non-empty
- Preserves full raw Markdown
- Fails closed on missing, empty, or unknown guide IDs
- Emits SHA-256 per file plus catalog and set hashes
- Does not fetch Google Drive, Google Docs, or any network source

## Lineage note

Unmerged Words Factory v3 (`workgpt/words-factory-v3`, PR #2) implemented a sequential Writer 1 → model QA → Writer 2 → model QA → Writer 3 pipeline against a closed Google Doc catalog. That is not the active path. Historical canary and old Words Factory work remains in repository history and should not be treated as the current factory. This workflow reuses the idea of a complete review inventory and a human copy gate, and it replaces three-writer/model-editor sequencing with one writer model and independent-thinking handoffs.

## Google Docs human review

Writer-guide loading still does not call Google. When a finished writing package reaches an existing human gate, trusted factory code can publish a native Google Doc for human QA.

- Operator setup: `docs/google-docs/OPERATOR_SETUP.md`
- Workflow-lane interface: `docs/google-docs/WORKFLOW_INTERFACE.md`
- Shared package contract: `src/writing-package/` (`schemaVersion: "writing-package/v1"`; export `ff-content-demo-factory/writing-package`)
- Package export: `ff-content-demo-factory/google-docs`

Secret-bearing publish/approve workflows run only from trusted `main` (`refs/heads/main`). Mocked tests are not live Google proof; `npm run google-docs:live-verify` reports pending until the operator Gmail account is authorized.

```bash
npm run google-docs:authorize
npm run google-docs:init-folder
npm run google-docs:test-connection
```

