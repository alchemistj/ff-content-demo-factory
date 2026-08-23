# Content Demo Factory control plane

## Architect operator runbook

1. Treat a bare `run-one --json` response of `IDLE` as a no-op: it does not
   choose a trade, location, or discovery query. Provide an explicit candidate
   or controlled adapter composition before expecting vendor work. Do not use
   Actions, cron, or `workflow_dispatch`.
2. For a fresh vendor-backed cycle, pass `--production --request
   <discovery.json>`. The request must contain non-empty `searchStrings` and
   `location`; there is no trade/location default. Use `--adapters` only for a
   controlled offline composition.
3. If the response is `architect-candidate-review-required`, inspect the
   returned candidate bench and save a selection request containing explicit
   qualified IDs, exactly one selected finalist, and a reason.
4. Inspect the generated proposal/evidence packet and save an independent QA
   decision with Why We Built evidence. Never infer this pass from Cursor
   output; the orchestrator validates the prescription before Gate 1.
5. Confirm the returned code is `awaiting-human-gate-1`, then hand Josh the
   Markdown artifact in the originating Work thread. Stop.

Discovery is never parameterized by an implicit business default. The Apify
boundary requires both search strings and a location before it can make a paid
request; credentials by themselves are insufficient. The complete factory
cycle also requires an explicit adapter composition so a missing vendor or
research capability fails closed instead of selecting an unrelated target.

The supported CLI request surfaces are:

```text
run-one --json
run-one --candidate <candidate.json> --json
run-one --production --request <discovery.json> --json
run-one --production --decision <selection-or-qa.json> --json
run-one --production --seed-discovery <raw-discovery.json> --json
run-one --request <discovery.json> --adapters <controlled-adapters.js> --decision <decision.json> --json
```

`--production` explicitly composes the shipped Apify/Cursor boundaries and is
mutually exclusive with `--adapters`. A seeded run substitutes only the raw
discovery boundary and derives the captured request; downstream research still
uses production adapters. Unknown flags and ambiguous combinations fail before
a vendor call.

Persisted files are operational receipts, not prompts: `state/factory-state.json`
contains queue/run/stage ownership, `state/vendor-receipts.json` contains
provider request/result receipts, and `state/run-one.lock` serializes concurrent
wakeups. Inspect these files when recovering; never recreate a paid request
from memory.

`run-one` is an Architect-invoked, queue-first entry point. It persists one
capacity slot (`productionCapacity: 1`) and claims at most one prospect. The
state model already has a queue and run collection so capacity can later grow
to 2 or 4 without changing stage identity.

The durable run stages are:

`candidate-qualification` → `finalist-enrichment` → `review-intelligence` →
`page-prescription` → `architect-qa` → `awaiting-human-gate-1`.

Stage transitions are monotonic. Paid boundaries carry receipts in `paidWork`,
and an interrupted run retains its stage and receipts for resumption. The
process lock prevents two `run-one` invocations from mutating state together;
the persisted lease identifies which Architect worker owns the next action.

The production path has no GitHub Actions dependency, and it intentionally has
no copy generation, client build, hosting, deploy, outreach, or later human
gates. These are explicit scope boundaries for this first release and must not
be introduced into the control plane.

Integration contract for later lanes:

- use `src/factory/control-plane.js` for queue/claim/transition/interrupt;
- persist paid work only after the external result has a stable receipt;
- never call finalist enrichment for a queued non-finalist;
- stop at `awaiting-human-gate-1` and treat a repeat wake as idempotent;
- keep `CURSOR_MODEL=cursor-grok-4.6-high` and Fast off;
- enforce mold exclusion before paid work.

The acceptance matrix in `test/acceptance-matrix.test.js` is the machine-checkable
operator contract for all 20 packet conditions, including negative boundaries.
`test/operator-entry.test.js` covers the entrypoint-specific fail-closed and
terminal-stop invariants.

## Controlled seeded-discovery replay

`src/adapters/seeded-discovery.js` provides a generic raw-boundary replay for
QA. A packet with `kind: "seeded-apify-discovery-result"` may be passed to
`createSeededDiscoveryAdapter({ packet })` or loaded with `packetPath`. It
validates stable identity/name/location fields, preserves the captured receipt,
and marks every included review as discovery sample-only. It does not call
Apify. The validator fails closed on inherited conclusions (`viable`,
`qualification`, `architectQualified`, `pagePrescription`, `valueHierarchy`,
`reviewClassification`, or `recommendedFirstReview`).

Use `discoverCandidates()` when the caller needs the normalized packet and
receipt; `discover()` remains the array-returning orchestrator compatibility
method. Both accept raw `reviews` or `discoveryReviews` and canonicalize either
`request` or `discoveryRequest`.

Replay is only a discovery input. The new system must still perform website
audit, exact-place finalist enrichment, authoritative review judgment, page
prescription, and Architect QA; a seeded sample can never directly authorize a
prescription.

## Security boundary

Provider tokens are process inputs only: receipts may retain provider IDs and
results, but never API keys or bearer material. Cursor research is read-only and
must retain its no-repository-write, no-copy/build/deploy, and no-Google-scrape
boundaries. Checked-in operator examples use empty placeholders; candidate text
is data, not a path, and persisted Gate 1 artifacts stay under fixed state roots.
