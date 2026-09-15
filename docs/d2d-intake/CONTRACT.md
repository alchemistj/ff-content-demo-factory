# D2D factory intake contract (`d2d-factory-intake/v1`)

This is the versioned cross-repo contract between `alchemistj/ff-gb-door-to-door-system` and this Content Demo Factory.

D2D remains source of truth for campaign geography, business identity, upstream qualification, and upstream evidence/provenance. Content Factory owns factory run state from accepted intake forward.

The old direct D2D → `ff-2-demos` route is not this pipeline. The route is: **qualified D2D candidate → Content Factory → Human Gate 1 → existing factory process**.

## Envelope

`POST /d2d-factory-intake/v1`

```json
{
  "version": "d2d-factory-intake/v1",
  "campaignId": "campaign-lake-county",
  "campaignRunId": "campaign-run-2026-09-15",
  "exportId": "export-2026-09-15-northline",
  "exportedAt": "2026-09-15T17:00:00.000Z",
  "prospects": [
    {
      "d2dProspectId": "prospect-northline",
      "business": {
        "name": "Northline Garage Doors",
        "trade": "garage door service",
        "serviceArea": "Lake County"
      },
      "nap": {
        "name": "Northline Garage Doors",
        "address": {
          "street": "18 Harbor Avenue",
          "city": "Mason",
          "region": "IL",
          "postalCode": "60000",
          "country": "US"
        },
        "phone": "+1-555-010-1000",
        "website": "https://northline.example/"
      },
      "qualification": {
        "classification": "qualified",
        "reason": "Complete NAP and service-area evidence from the Google Business listing.",
        "evidenceRefs": [{ "kind": "google_business", "refId": "place-northline", "url": "https://maps.example/northline" }]
      },
      "provenance": {
        "sourceRefs": [
          {
            "kind": "google_business",
            "refId": "place-northline",
            "url": "https://maps.example/northline",
            "label": "Google Business Profile"
          }
        ],
        "sourceNotes": "Qualified by D2D geographic campaign; not a raw scrape dump."
      },
      "createdAt": "2026-09-15T16:30:00.000Z"
    }
  ]
}
```

Required identity/NAP fields are exactly the `ProspectSeed` fields. Missing values are **held**, never invented.

`qualification.classification` must be `qualified` to start a run. `unqualified` and `needs_review` are held.

## Receipts

Each prospect gets an independent receipt. One malformed item does not drop the rest of the batch.

| `status` | Meaning |
| --- | --- |
| `accepted` | New durable factory run created and progressed through research + prescription to Human Gate 1 |
| `duplicate` | Same D2D prospect + export/intake version, or this prospect already has a factory run. Same `factoryRunId`. No repeated model work |
| `held` | Invalid/partial identity, NAP, provenance, or not qualified. No factory run |
| `failed` | Non-retryable factory contract violation (for example writer/website-copy ran before Gate 1) |
| `retryable` | Transient downstream failure. Retry the same payload; completed research/prescription stages are not redone |

Correlation fields on every receipt: `d2dProspectId`, `campaignId`, `campaignRunId`, `exportId`, `correlationId` (`{d2dProspectId}::{exportId}::d2d-factory-intake/v1`). Accepted/duplicate/retryable receipts also include `factoryRunId`, `factoryProspectId`, and `factoryStage`.

Poll without scraping logs:

- `GET /d2d-factory-intake/v1/prospects/{d2dProspectId}`
- `GET /d2d-factory-intake/v1/runs/{factoryRunId}`

## Factory boundary

Accepted intake maps to the existing `ProspectSeed`, creates/resumes the existing workflow state, runs the existing research and prescription stages, and **stops at `awaiting_prescription_approval`** (Human Gate 1).

It does not run the writer, website-copy publication, website build, `ff-2-demos`, or outreach. D2D seed/provenance is recorded as source notes and `sourceCorrelation` on workflow state. It is not an approved page plan.

The existing `runFactory()` path remains the factory after Gate 1 approval.

## Idempotency

- One accepted D2D prospect → exactly one durable factory run (`run-{d2dProspectId}`).
- Retry of the same prospect + `exportId` + `d2d-factory-intake/v1` returns `duplicate`.
- A later export for a prospect that already has a run also returns `duplicate` of that run.
- Held records are not runs. A later complete payload for the same prospect may be accepted.

Companion upstream: `alchemistj/ff-gb-door-to-door-system#4`. This schema is the Content Factory intake contract those exports should emit.
