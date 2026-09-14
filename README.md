# ff-content-demo-factory

This repository is the GitHub-native home of the Fluid Frame Content Demo Factory.

**Start here:** [`ASSIGNMENT.md`](ASSIGNMENT.md). That is the one assignment entry point. Provider-specific files point at it instead of copying policy.

A newly started model with ordinary GitHub read access can discover its assignment, runtime instructions, canonical guides, and (when present) the approved example library from this repo. **Google Drive is not required to load writer guides.**

## Executable path

Current `main` already had the repo-native writer-guide loader. This factory path adds the independent-thinking workflow on top of that loader:

1. Research produces an evidence packet plus advisory recommendations.
2. Prescription proposes a page plan plus advisory recommendations.
3. A human approves the page plan (existing prescription gate). Approval does not lock accompanying suggestions.
4. One configurable writer model completes the package (service pages, homepage/contact/chrome, Strategy Overview as internal phases, with optional self-polish). There is no second-model editor and no routine human stop between those phases.
5. Mechanical validation checks artifact integrity only.
6. The writing package is handed to a Google Docs publisher interface. If Google is unconfigured or publication fails, the writing is preserved and the error is recorded. Retrying publication does not rerun the writer.
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

Lane interfaces for the examples and Google Docs work live in [`docs/runtime/INTERFACES.md`](docs/runtime/INTERFACES.md).

## Canonical writer guides

Current craft-guide authority lives here (owned with the positive-examples lane):

```text
docs/writer-guides/README.md
docs/writer-guides/FLUID_FRAME_DEMO_WRITING_GUIDE.md
docs/writer-guides/SERVICE_PAGE_GUIDE.md
docs/writer-guides/HOMEPAGE_GUIDE.md
docs/writer-guides/CONTACT_PAGE_GUIDE.md
docs/writer-guides/HEADER_FOOTER_GUIDE.md
```

Raw Markdown in those files is the writer context. Do not summarize them into a second source of truth. Historical prospect folders in this repo are finished packages, not active factory instructions.

The complete writing assignment loads the five craft guides. Writer 1/2/3 loaders remain as **internal phase** helpers, not separate human-gated jobs.

```ts
import { loadWritingAssignmentGuides, loadWriterStageGuides } from "./src/writer-guides/index.ts";

const writing = loadWritingAssignmentGuides();
const servicePhase = loadWriterStageGuides("writer1");
```

The loader still:

- Discovers the repository root from the loader module path
- Validates that all six catalog files exist and are non-empty
- Preserves full raw Markdown
- Fails closed on missing, empty, or unknown guide IDs
- Emits SHA-256 per file plus catalog and set hashes
- Does not fetch Google Drive, Google Docs, or any network source

## Lineage note

Unmerged Words Factory v3 (`workgpt/words-factory-v3`, PR #2) implemented a sequential Writer 1 → model QA → Writer 2 → model QA → Writer 3 pipeline against a closed Google Doc catalog. That is not the active path. This workflow reuses the idea of a complete review inventory and a human copy gate, and it replaces three-writer/model-editor sequencing with one writer model and independent-thinking handoffs.
