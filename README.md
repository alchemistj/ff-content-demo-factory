# FF Content Demo Factory

Version 3.0 is a clean-room Words Factory. It begins with one approved Human Gate 1 handoff and stops after producing one complete, human-readable Human Gate 2 website-words artifact.

It does not discover prospects, retrieve reviews, prescribe pages, build websites, deploy code, or perform outreach.

## Pipeline

1. Validate the approved business, page-prescription, and complete-review handoff.
2. Load only the canonical guides required by the active writer stage.
3. Writer 1 creates exactly two prescribed service pages.
4. Deterministic and intelligent QA repair Writer 1 before continuing.
5. Writer 2 reads the approved service-page copy and creates the homepage, contact page, header, and footer.
6. Deterministic and intelligent QA repair Writer 2 before continuing.
7. Writer 3 reads the finished business-facing site and creates only the Strategy Overview.
8. Deterministic and intelligent QA repair Writer 3.
9. A separately owned assessor performs independent whole-site QA.
10. Render all website words in natural reading order and stop at `awaiting-human-gate-2`.

The three writing stages are sequential by design. The complete verified review inventory remains available to every writer.

## Canonical writing authorities

The loader uses a closed catalog and an injected provider. Guides are not required to live as Markdown in this repository. Version 3.1 can replace the version 3.0 provider with Cursor + Google Drive without changing the handoff contract, writer sequence, or QA gates.

- [Fluid Frame Demo Writing Guide](https://docs.google.com/document/d/10xIuYOon6zxWbatccGVU66BccbPaT2VyFsbCJfYnSSo)
- [Service Page Guide](https://docs.google.com/document/d/1MCZPwhj3FzRfZPNERx-HmOgeymSyiZ8XFuRPozdm2rk)
- [Homepage Guide](https://docs.google.com/document/d/1yLw8LCQys_SLyqmwDgOWdM-FkW03ZAa7AqvVqPIEK8A)
- [Contact Page Guide](https://docs.google.com/document/d/10dJ6h42fkmwUvAyhi2FZ8uY8EHlcdFwa_lKAwe1K2l0)
- [Header & Footer Guide](https://docs.google.com/document/d/1MNBqqdzKsrqOp6tWgb79oOoukXzo6cbMmaFb7JEeBTU)
- [Writer Guides — README](https://docs.google.com/document/d/1cVBPXF-wFMTatnN7jIH01M-sUzm2I0aIENNKBcBuzdg)

The runtime never searches for fallback guides.

`loadCanonicalGuides(stage, provider)` is the only guide-loading boundary. The provider must return non-empty content for the catalog entry it receives; source-ID or URL drift fails closed. Writer and QA adapters consume the loaded documents, so replacing the provider does not alter the handoff, stage sequence, or review contracts.

## Review contract

Every handoff preserves the entire retrieved written-review inventory, including stable identity, exact text, rating/date, provenance, classifications, service and completed-work signals, negative signals, page-specific suitability, and upstream evidence judgment.

Deterministic gates enforce:

- Grade A: one lead and two supporting reviews
- Grade B: one lead and one supporting review
- Grade C: one suitable review when one exists; zero only when none exists
- no zero-review eligible sales page when suitable evidence exists
- no adjacent or clumped reviews
- an assigned, resolvable nearby claim for every placed review
- approximately 150-word claim proximity
- exact or faithful quote text with correct reviewer attribution
- no negative/caution evidence presented as positive proof

Words per review is reported, never used as a pass/fail gate.

## Runtime contracts

- Writer output must explicitly preserve the approved route, prescription ID, page type, and primary keyword. The orchestrator validates the raw output before normalizing it.
- Adapter inputs are cloned and deeply frozen. Persisted review evidence is protected by a content fingerprint and revalidated on resume.
- Each stage runs built-in deterministic QA plus a structured thinking assessment covering the dimensions relevant to that writer. Bare boolean QA results are rejected.
- Whole-site QA requires a separately identified assessor, all thinking dimensions, the complete final topology, and a clean reassessment after any repair.
- A whole-site repair must return the complete site. Missing pages cannot silently fall back to stale copy.
- The successful terminal state is `awaiting-human-gate-2`; the runtime does not infer human approval or continue into a coded build.

## Development

```bash
npm install
npm run test:all
```

All included prospect data is synthetic regression data. It is not a live prospect run.
