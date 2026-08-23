# FF Content Demo Factory

## Operating contract

The production entry point is an Architect-invoked `run-one`. GitHub is the
durable source/artifact system, not the scheduler. The first release has one
production slot and stops at `awaiting-human-gate-1`.

```sh
# wake the factory (safe to repeat)
npm run run-one -- --json

# enqueue a discovered/known candidate
npm run run-one -- --candidate requests/candidate.json --json

# start explicit production discovery (paid/vendor work)
npm run run-one -- --production --request examples/discovery-request.json --json

# continue production with an independent Architect decision
npm run run-one -- --production --decision state/architect-decision.json --json

# replay raw canary discovery; every downstream stage remains production
npm run run-one -- --production --seed-discovery canary/inputs/360-garage-door-and-more.discovery.json --json

# inject controlled adapters for an offline test
npm run run-one -- --request examples/discovery-request.json --adapters requests/adapters.js --json
```

The JSON request files are ordinary local artifacts and should be reviewed by
Architect before use:

- `candidate.json`: one GBP identity with the owned website and discovery facts.
- `discovery.json`: `{ "searchStrings": ["..."], "location": "..." }`; both
  fields are required for a fresh paid discovery request.
- `selection.json`: `qualifiedPlaceIds`, exactly one `selectedPlaceId`, and a
  reason. Other qualified candidates remain backlog.
- `prescription.json`: explicit pages, value hierarchy, evidence, collisions,
  and review recommendations.
- `qa.json`: Architect corrections/pass decision. A pass is not Josh approval.

Install dependencies with `npm install`, export the three variables shown in
`.env.example`, and use `--production` to compose the shipped Apify and Cursor
adapters. This is the only built-in paid/vendor path. It cannot be combined
with `--adapters`; that flag is an explicit controlled-run override for offline
tests.

The seeded canary replaces only discovery. Its captured reviews remain
sample-only; website audit, exact-place enrichment, authoritative judgment,
prescription, Architect QA, and Gate 1 still use the new production path. The
first wake stops for candidate selection. Save that independent decision in
ignored `state/architect-decision.json`, then repeat with `--decision`.

Operator entry is fail-closed: a bare `run-one --json` only wakes the queue and
returns `IDLE` when no candidate is queued. It never invents a trade, location,
or discovery query. Paid discovery requires `--production` plus explicit search
strings and a location. Credentials alone never authorize a vendor call.

## Persisted state and recovery

`state/factory-state.json` is the durable run ledger. It records the queue,
capacity, run owner/lease, monotonic stage, artifacts, interruption state, and
`paidWork` receipts. Vendor receipts are stored in
`state/vendor-receipts.json` by the Apify/Cursor adapters. A receipt is written
only after a stable provider result; an interrupted run resumes from its last
valid receipt and must not repeat finalist enrichment.

The run stages are:

`candidate-qualification` → `finalist-enrichment` → `review-intelligence` →
`page-prescription` → `architect-qa` → `awaiting-human-gate-1`.

## Exact stop condition

The run is complete for this MVP only when one compact, human-readable Gate 1
artifact exists and state reports `awaiting-human-gate-1`. A repeat wake returns
that state idempotently. It must not claim another prospect, generate copy,
build a client, host/deploy, send outreach, or advance a later human gate.

See [`docs/CONTROL-PLANE.md`](docs/CONTROL-PLANE.md) and the executable
20-condition matrix in [`test/acceptance-matrix.test.js`](test/acceptance-matrix.test.js).

The automated matrix is offline contract QA; it is not evidence that a vendor
call succeeded. Only one controlled live canary, run with configured Apify and
Cursor credentials and independently inspected by Architect, proves real
vendor execution. The canary must still stop at this Gate 1 boundary.

After Gate 1, the operator action is stop and handoff. There is no copy, client,
build, hosting, deploy, outreach, or later-gate entry point in this release.

## Seeded discovery replay

For a controlled replay of a previously captured raw discovery boundary, use
`src/adapters/seeded-discovery.js`. The packet must have
`kind: "seeded-apify-discovery-result"` and raw candidates with stable place
identity, name, location/address, and optional review records. The adapter
preserves the captured request/receipt, marks all review records as
`sampleOnly: true`, and performs no paid discovery call.

Seeded packets must not contain conclusions such as `viable`, `qualification`,
`architectQualified`, `pagePrescription`, `valueHierarchy`,
`reviewClassification`, or `recommendedFirstReview`. Website audit, finalist
enrichment, authoritative review judgment, prescription, and Architect QA still
run through the new factory after replay.
