# ff-content-demo-factory

This repository is the GitHub-native home of the Fluid Frame Content Demo Factory writer authorities. A writer agent with ordinary GitHub read access can load the current guides and Springfield examples from this repo. **Google Drive is not required at runtime.**

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

`docs/writer-guides/README.md` is the human-readable index for this set. It is part of the canonical six-file catalog. The guides are a short affirmative framework. **Finished Springfield pages in `examples/approved-copy/` do most of the teaching.** For new Content Demo Factory writing work, **these guides replace — they do not sit beside — older overlapping writer instructions.** Do not also load deprecated FF2 craft guides or Google Doc copies of the same documents.

Raw Markdown in those files is the writer context. Do not summarize them into a second source of truth.

## Approved examples

```text
examples/approved-copy/README.md
examples/approved-copy/SOURCE_MANIFEST.md
examples/approved-copy/window-dudes/
examples/approved-copy/sra/
examples/approved-copy/greene-planet/
```

Twelve Springfield reference pages (homepage, two services, contact for each business). They are faithful extractions, not templates. See `examples/approved-copy/README.md` for how to use them and `SOURCE_MANIFEST.md` for branch, route, and source-access notes.

## What to read by writing stage

| Stage | Also called | Read these files | Then write |
| --- | --- | --- | --- |
| Writer 1 | Copy Agent 1 | `FLUID_FRAME_DEMO_WRITING_GUIDE.md`, `SERVICE_PAGE_GUIDE.md`, matching service examples, plus the approved prospect prescription/evidence | only the two service pages |
| Writer 2 | Copy Agent 2 | `FLUID_FRAME_DEMO_WRITING_GUIDE.md`, `HOMEPAGE_GUIDE.md`, `CONTACT_PAGE_GUIDE.md`, `HEADER_FOOTER_GUIDE.md`, matching examples, plus finished accepted service pages and the approved prescription/evidence | homepage, contact, header, and footer |
| Writer 3 | Copy Agent 3 | `FLUID_FRAME_DEMO_WRITING_GUIDE.md`, plus the finished business-facing site and the original audit/prescription/evidence needed for Strategy | Strategy Overview last |

## Programmatic loader

Entry point: `src/writer-guides/index.ts` (compiled export: `dist/src/writer-guides/index.js`, package export `./writer-guides`).

```ts
import { loadWriterStageGuides, loadCanonicalGuideCatalog } from "./src/writer-guides/index.ts";
import { loadApprovedCopyCatalog } from "./src/approved-copy/index.ts";

const writer1 = loadWriterStageGuides("writer1");
const catalog = loadCanonicalGuideCatalog();
const examples = loadApprovedCopyCatalog();
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
