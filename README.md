# ff-content-demo-factory

This repository is the GitHub-native home of the Fluid Frame Content Demo Factory writer authorities. A writer agent with ordinary GitHub read access can load the current guides from this repo. **Google Drive is not required at runtime.**

## Canonical writer guides

Current authority lives here:

```text
docs/writer-guides/README.md
docs/writer-guides/FLUID_FRAME_DEMO_WRITING_GUIDE.md
docs/writer-guides/SERVICE_PAGE_GUIDE.md
docs/writer-guides/HOMEPAGE_GUIDE.md
docs/writer-guides/CONTACT_PAGE_GUIDE.md
docs/writer-guides/HEADER_FOOTER_GUIDE.md
```

`docs/writer-guides/README.md` is the human-readable index for this set. It is part of the canonical six-file catalog. For new Content Demo Factory writing work, **these guides replace — they do not sit beside — older overlapping writer instructions.** Do not also load deprecated FF2 craft guides or Google Doc copies of the same documents.

Raw Markdown in those files is the writer context. Do not summarize them into a second source of truth.

## What to read by writing stage

| Stage | Also called | Read these files | Then write |
| --- | --- | --- | --- |
| Writer 1 | Copy Agent 1 | `FLUID_FRAME_DEMO_WRITING_GUIDE.md`, `SERVICE_PAGE_GUIDE.md`, plus the approved prospect prescription/evidence | only the two service pages |
| Writer 2 | Copy Agent 2 | `FLUID_FRAME_DEMO_WRITING_GUIDE.md`, `HOMEPAGE_GUIDE.md`, `CONTACT_PAGE_GUIDE.md`, `HEADER_FOOTER_GUIDE.md`, plus finished accepted service pages and the approved prescription/evidence | homepage, contact, header, and footer |
| Writer 3 | Copy Agent 3 | `FLUID_FRAME_DEMO_WRITING_GUIDE.md`, plus the finished business-facing site and the original audit/prescription/evidence needed for Strategy | Strategy Overview last |

## Programmatic loader

Entry point: `src/writer-guides/index.ts` (compiled export: `dist/src/writer-guides/index.js`, package export `./writer-guides`).

```ts
import { loadWriterStageGuides, loadCanonicalGuideCatalog } from "./src/writer-guides/index.ts";

const writer1 = loadWriterStageGuides("writer1");
const catalog = loadCanonicalGuideCatalog();
```

- Loads those exact repository Markdown files from disk.
- Discovers the repository root from the loader module path. Callers do not need to pass `repoRoot`. This works from TypeScript source (`tsx`) and from the compiled `dist` package — not from a naive `../..` that would resolve to `dist/` after `tsc`.
- Validates that all six catalog files exist and are non-empty before returning a stage set.
- Preserves full raw Markdown on each loaded guide (`guide.markdown` / `guide.bytes`).
- Fails closed on missing, empty, or unknown guide IDs and unknown stages.
- Emits SHA-256 per file plus a deterministic catalog `manifestHash` and per-stage `setHash`.
- Does not fetch Google Drive, Google Docs, or any network source.

Print a receipt:

```bash
npm install
npm run writer-guides:receipt
npm run test:all
```

`npm run test:all` typechecks, runs the source tests, then `npm run build` and a fresh Node process that imports the compiled `dist` exports with network disabled.

## Lineage note

Current `main` contains prospect word packages and does not yet include the draft Words Factory v3 system from PR #2 (`workgpt/words-factory-v3`). That factory still pointed at a closed Google Doc catalog. This repo-native loader is the current canonical writer-guide boundary for GitHub-only writer tests. It is not a merge of the unfinished factory pipeline.

## Google Docs human review

Writer-guide loading still does not call Google. When a finished writing package reaches an existing human gate, trusted factory code can publish a native Google Doc for human QA.

- Operator setup: `docs/google-docs/OPERATOR_SETUP.md`
- Workflow-lane interface: `docs/google-docs/WORKFLOW_INTERFACE.md`
- Shared package contract: `src/writing-package/` from PR #30 (`schemaVersion: "writing-package/v1"`; export `ff-content-demo-factory/writing-package`)
- Package export: `ff-content-demo-factory/google-docs`

Secret-bearing publish/approve workflows run only from trusted `main` (`refs/heads/main`). Mocked tests are not live Google proof; `npm run google-docs:live-verify` reports pending until the operator Gmail account is authorized.

```bash
npm run google-docs:authorize
npm run google-docs:init-folder
npm run google-docs:test-connection
```

