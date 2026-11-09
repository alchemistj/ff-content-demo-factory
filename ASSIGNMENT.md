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
- The approved example library at `examples/approved-copy/` (twelve Springfield customer-facing pages from the approved-copy catalog; `_chrome.md` is supplemental; `strategy-overview-examples.md` is the owner-facing Strategy Overview craft reference)
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

Canonical craft-guide wording and the Springfield example library live in `docs/writer-guides/` and `examples/approved-copy/`. Google OAuth and native Doc publication live in `src/google-docs/`. This file remains the assignment entry point for the integrated factory.

## Demo outreach (Josh's standing rules)

- **Contact form only (for now).** Outreach goes through each prospect's own website contact form, not email. Claude or a Sonnet fills and sends it, with honest name and reply details, and keeps a screenshot of the confirmation. When a send is blocked (CAPTCHA, bot check, login, no form, form error), never try to get around it: add the prospect to Josh's hand-send list with the message ready to paste, and Josh sends those himself.
- Send the demo through the business's own website contact form when it has one, with a line like: "By the way, our contact form system would have recognized this as a solicitation, and you wouldn't have even seen it." Say solicitation or sales pitch, never spam.
- Demo links go out plain. Never add `?utm_source=email` or any other tracking query to a link the owner will read.
- Offer call times from Josh's real openings: the "Book a Call with Josh" calendar in Go High Level (Fluid Frame Legacy location), not guesses.
- When Josh states a rule for future work, write it into the repo's notes right away. Don't ask first.

## Prospect picking (Josh's standing rules)

- Pull 50 businesses per scout search (trade + city). Work from the bottom: check rank 50 first, then 49, 48 and up, and take the first ones that qualify. Lower-ranked businesses have the most to gain.
- Keep a ledger per search on the `scout-data` branch (`scout/<slug>/ledger.json` and `ledger.md`): every rank checked, with status picked / qualified-backlog / disqualified and a one-line reason, plus `next_start_rank` so the next day's run continues upward from where the last one stopped.
- Qualified businesses not picked today stay in the backlog for the next run.
- Never filter the search by Google category. Owners often pick the wrong primary category, so real prospects hide under the wrong one. Judge each business by its name, website and reviews instead.
- Find the owner's first name in the reviews and the owner's replies to reviews too, not only on the website (reviews named the owner for two of four businesses in the Nov 7 run).
- Qualify from the business's own website and the web (Sonnet), never from a review pull. Apify review pulls are the scarcer budget: pull reviews only for the final picks, for writing the words (Josh, 2026-11-08).
- Fit for a trade search means the trade is what they really do: for a window search, windows and doors are the headline of their own site or about half their services (siding usually comes with it). Not filtering by category is about the label; fit is about the work (Josh, 2026-11-08).
- Three kinds of business, three offers: (1) a small specialist with a weak site gets a 5-page demo; (2) a handyman, general contractor or exterior remodeler that does many things gets a demo built around what their reviews show they really do (homepage H1 broad enough for their main work, separate pages for the money services, and a strategy page that tells the owner "your reviews say X, your site says Y"); (3) an established multi-page exterior remodeler is too big for a 5-page demo: log it as "too big for a demo" and skip for now.
- A brand certification or dealer status (Pella, Andersen, GAF, Owens Corning, Mitsubishi...) ranks a prospect higher but is not required. Only call it certified on a demo when the manufacturer's own locator confirms it (link in the facts file); if the locator can't be checked, leave it for the onboarding call.

## The offer (Josh, 2026-11-08)

- Most businesses: one-time $300 setup, then $125 a month. It fixes their website design problem for good (no more "© 2021" in the footer) for a small, predictable cost.
- With custom images of their own work added: about $700 one-time setup.
- For the few who are hungry for growth: the full SRA system, for far less than they expect, because they are pricing it in WordPress-era terms.
- Goal: about 30 clients at $125 a month, across trades (handymen, chiropractors and barbers count as much as window companies).
