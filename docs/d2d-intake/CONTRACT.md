# D2D factory intake contract (`d2d-factory-intake/v1`)

This is the frozen cross-repo request/receipt schema between `alchemistj/ff-gb-door-to-door-system` (companion D2D PR #5 head `56c8fd4fe3e8ce95b9e281c01e382737b815c24b`) and this Content Demo Factory.

**D2D owns collection and transport facts:** campaign/run/export IDs, search/map context, Apify/Google listing fields, D2D source IDs, and delivery/correlation.

**Content Factory is the only owner of keep/reject/advance.** D2D must not send a qualification conclusion as authority. The route is: **raw geographic cohort (`d2d-factory-raw-export/v1`) → factory candidate-bench + website/opportunity evidence → independent factory selection → only selected businesses map to `ProspectSeed` / research / prescription → Human Gate 1**.

POST body is the D2D-produced raw export. Receipts are `d2d-factory-intake/v1`. Sharing the version string without this request/receipt shape is not the contract.

## Request (`schema: d2d-factory-raw-export/v1`)

`POST /d2d-factory-intake/v1`

Default operator cohort size is **40** (`D2D_INTAKE_MAX_BATCH`, configurable). Transport does not inherit the historical 7-candidate cap.

```json
{
  "schema": "d2d-factory-raw-export/v1",
  "campaignId": "campaign-lake-county",
  "campaignRunId": "campaign-run-2026-09-15",
  "exportId": "export-2026-09-15-northline",
  "exportedAt": "2026-09-15T17:00:00.000Z",
  "searchContext": {
    "latitude": 41.9,
    "longitude": -87.8,
    "radiusMiles": 5,
    "searchTerms": ["garage door repair"]
  },
  "businesses": [
    {
      "d2dProspectId": "d2d-prospect-northline",
      "sourceBusinessId": "src-northline",
      "campaignBusinessId": "campaign-biz-northline",
      "name": "Northline Garage Doors",
      "category": "garage door service",
      "categories": ["garage door service"],
      "address": {
        "street": "18 Harbor Avenue",
        "city": "Mason",
        "region": "IL",
        "postalCode": "60000",
        "country": "US"
      },
      "location": "Lake County",
      "phone": "+1-555-010-1000",
      "website": "https://northline.example/",
      "rating": 4.8,
      "reviewCount": 42,
      "coordinates": { "latitude": 41.901, "longitude": -87.812 },
      "provenance": {
        "actor": "compass~crawler-google-places",
        "runId": "apify-run-northline",
        "datasetId": "ds-northline",
        "itemId": "item-northline",
        "googlePlaceId": "ChIJ-northline",
        "mapsUrl": "https://maps.example/northline",
        "googleUrl": "https://maps.google.com/?cid=northline"
      }
    }
  ]
}
```

Golden fixture: `src/d2d-intake/fixtures/d2d-pr5-raw-export.v1.json`.

Transport identity is `sourceBusinessId` + `d2dProspectId`. Google place identity is evidence, not a replacement transport key.

Missing optional fields (phone, website, category, street address, rating) remain evidence for factory qualification. They are not fabricated and they are not a transport rejection.

## Correlation

```
correlationId = `${sourceBusinessId}::${exportId}::d2d-factory-raw-export/v1`
```

D2D reconciles receipts by `d2dProspectId` plus this `correlationId`. Idempotency is `sourceBusinessId + exportId + d2d-factory-raw-export/v1`.

## Non-authoritative inherited conclusions

These fields are **not** Content Factory qualification. If present on a business or the envelope, they are rejected as `INHERITED_CONCLUSION` and cannot drive advancement:

`qualification`, `viable`, `architectQualified`, `pagePrescription`, `opportunityScore`, `tier`, `strongDemoCandidate`, `valueHierarchy`, `reviewClassification`, `recommendedFirstReview`.

## Receipts

Transport status and factory qualification are separate. One malformed item does not drop the rest of the batch.

Every receipt includes reconcilable D2D identity: `d2dProspectId`, `sourceBusinessId`, `campaignBusinessId`, `correlationId`, `exportId`, `campaignId`, `campaignRunId`.

| `status` (transport) | Meaning |
| --- | --- |
| `received` | Raw listing accepted into Content Factory. Qualification ran (or is recorded on `qualification`) |
| `duplicate` | Same `sourceBusinessId` + export/schema version (or an existing qualification). No repeated qualification or model work |
| `invalid` | Malformed D2D identity, inherited conclusion, or over-limit extra item |
| `retryable` | Transient factory failure after advance. Retry resumes without re-qualifying |

| `qualification.outcome` | Meaning |
| --- | --- |
| `advanced` | Factory selected this business from candidate-bench + website/opportunity evidence, then mapped to `ProspectSeed` through research + prescription to Human Gate 1 |
| `rejected` | Factory rejected (for example excluded category). Zero research/prescription/writer calls |
| `held` | Factory did not select, or selected but refused to invent a `ProspectSeed` |
| `backlog` | Duplicate on the current factory bench |
| `null` | Transport invalid; qualification did not run |

Being complete enough to form `ProspectSeed` is **not** sufficient to advance.

Poll:

- `GET /d2d-factory-intake/v1/prospects/{d2dProspectId}`
- `GET /d2d-factory-intake/v1/businesses/{sourceBusinessId}`
- `GET /d2d-factory-intake/v1/runs/{factoryRunId}`

## Factory boundary

`src/factory/candidates.ts` + `src/factory/qualify.ts` are the keep/reject/advance path (smallest useful port of historical candidate-bench, website/opportunity audit, and independent selection). Intake calls that qualifier **once** per new `sourceBusinessId` + export identity.

Only `advanced` records are mapped into today's `ProspectSeed` and `runFactory()`. After that, the merged workflow is authoritative through Human Gate 1. Intake does not run the writer, website-copy publication, website build, or outreach.

Companion upstream: `alchemistj/ff-gb-door-to-door-system#5`. D2D should emit this raw export, not a prequalified shortlist.
