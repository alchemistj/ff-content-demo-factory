# Content Factory assignment

This file is the **one repository entry point** for a newly started model. Provider-specific files (`AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`) point here. They do not keep a second copy of the policy.

Read this file first, then the runtime documents it names. Do not load historical prospect folders (`barones-heat-air/`, `kingdom-roofing-and-construction/`, `sheres-construction-handyman/`) as competing instructions. Those packages are finished examples of past work, not the active factory.

## Discover materials

Programmatic discovery:

```ts
import { discoverAssignment, runFactory } from "./src/workflow/index.ts";

const assignment = discoverAssignment();
```

`discoverAssignment()` returns:

- Canonical writer guides from `docs/writer-guides/`
- The complete writing-assignment guide set (service, homepage/contact/chrome, and Strategy Overview as recommended order inside **one writer run**)
- The approved example library when the examples lane has landed at `examples/approved-copy/`
- The current run, if one exists
- These runtime instructions

## Active runtime instructions

| Document | Job |
| --- | --- |
| `docs/runtime/AUTHORITY.md` | Independent thinking, ownership, and handoff distinctions |
| `docs/runtime/RESEARCH.md` | Researcher assignment |
| `docs/runtime/PRESCRIPTION.md` | Prescriber assignment and the existing human page-plan gate |
| `docs/runtime/WRITER.md` | One-writer assignment for the complete package |
| `docs/runtime/INTERFACES.md` | Handoff and writing-package contracts for other lanes |

Load those files as written. Do not summarize them into a second source of truth.

## Workflow

Research → prescription → **human page-plan gate** (same gate, published through the Google Docs review surface when configured) → **one writer run** → mechanical validation → Google Docs publication → **human copy QA**.

The human is the editorial quality gate for website copy. There is no second model acting as editor, judge, scorer, or approval gate.

The writer model is configurable. This workflow belongs to Fluid Frame, not to one vendor.

## What this lane owns

Workflow code, handoff contracts, assignment discovery, and these runtime instructions.

Canonical craft-guide wording and the Springfield example library belong to the positive-examples lane. Google OAuth and native Doc publication belong to the Google Docs lane.
