# D2D factory intake contract (`d2d-factory-intake/v1`)

This is the frozen cross-repo request/receipt schema between `alchemistj/ff-gb-door-to-door-system` (companion D2D PR #5 head `fe5b74f5f1059af2808e61a0b13755ead55999a5`) and this Content Demo Factory.

Canonical D2D sources: `tests/fixtures/d2d-factory-intake-v1.json` and `src/lib/content-factory/contract.ts` at `fe5b74f5`. Fixture content is unchanged from `00ae71fa`; the producer head advanced for strict receipt-consumer fixes. The **only** cross-repo golden in this repo is the copied fixture `src/d2d-intake/fixtures/d2d-factory-intake-v1.json` (Springfield, MO campaign envelope; complete `cb-1`/`biz-1` is D2D's Northline Garage Doors listing; sparse `cb-sparse`/`biz-sparse` is D2D's No website shop). The JSON sample below is an illustrative local example, not that golden.

**D2D owns collection and transport facts:** campaign/run/export IDs, campaign geography/search, Apify/Google listing fields, D2D source IDs, and delivery/correlation.

**Content Factory is the only owner of keep/reject/advance.** D2D must not send a qualification conclusion as authority. The route is: **raw geographic cohort (`d2d-factory-intake/v1`) → factory candidate-bench + website/opportunity evidence → independent factory selection → only selected businesses map to `ProspectSeed` / research / prescription → Human Gate 1**.

## Request (`version: d2d-factory-intake/v1`)

`POST /d2d-factory-intake/v1`

Default operator cohort size is **40** (`D2D_INTAKE_MAX_BATCH`, configurable). Transport does not inherit the historical 7-candidate cap.

Illustrative local example (not the cross-repo golden):

```json
{
  "version": "d2d-factory-intake/v1",
  "campaignId": "campaign-lake-county",
  "campaignRunId": "campaign-run-2026-09-15",
  "exportId": "export-2026-09-15-northline",
  "exportedAt": "2026-09-15T17:00:00.000Z",
  "campaign": {
    "location": "Lake County",
    "radiusMiles": 5,
    "radiusMeters": 8047,
    "center": { "lat": 41.9, "lng": -87.8 },
    "search": { "query": "garage door", "searchStrings": ["garage door repair"] }
  },
  "provenance": {
    "provider": "apify",
    "actor": "compass~crawler-google-places",
    "runId": "apify-run-northline",
    "datasetId": "ds-northline"
  },
  "businesses": [
    {
      "d2dProspectId": "d2d-prospect-northline",
      "sourceBusinessId": "src-northline",
      "campaignBusinessId": "campaign-biz-northline",
        "d2dBusinessId": "src-northline",
        "correlationId": "src-northline::export-2026-09-15-northline::d2d-factory-intake/v1",
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
      "placeId": "ChIJ-northline",
      "mapsUrl": "https://maps.example/northline",
      "coordinates": { "lat": 41.901, "lng": -87.812 },
      "apify": {
        "provider": "apify",
        "actor": "compass~crawler-google-places",
        "runId": "apify-run-northline",
        "datasetId": "ds-northline",
        "itemId": "item-northline"
      }
    }
  ]
}
```

Transport identity is `sourceBusinessId` + `d2dProspectId`. `d2dBusinessId` equals `sourceBusinessId`. Google place/maps/cid remain evidence.

Each business **must** present `correlationId` on the request. Content Factory validates it against the frozen derivation and echoes that exact value. It does not invent, recompute, or silently repair a mismatched id.

Missing optional fields stay empty. They are not fabricated and they are not a transport rejection.

## Correlation

```
correlationId = `${sourceBusinessId}::${exportId}::d2d-factory-intake/v1`
```

The golden D2D request is the two-business cohort at `src/d2d-intake/fixtures/d2d-factory-intake-v1.json`: complete `cb-1`/`biz-1` (Northline Garage Doors) and sparse `cb-sparse`/`biz-sparse` titled `No website shop` (no phone/website/rating). Campaign run is `apify-run-1`; export id is `export:campaign-1:apify-run-1:d2d-factory-intake/v1`. It is a duplicated copy of D2D `tests/fixtures/d2d-factory-intake-v1.json` at `fe5b74f5`, including producer `notes` and full expected receipt fields. Do not translate phone, category, address, location, or expected-receipt semantics. Northline/Lake County samples in this document and in unit tests are local examples only; they are not a second golden.

D2D `assignContentFactoryReceipts()` reconciles by `d2dProspectId` plus this `correlationId`. Idempotency is the same triple. A missing or mismatched `correlationId` is transport `invalid` (`MISSING_CORRELATION_ID` / `INVALID_CORRELATION_ID`) for that item only.

## Non-authoritative inherited conclusions

These fields are **not** Content Factory qualification. If present on a business or the envelope, they are rejected as `INHERITED_CONCLUSION` and cannot drive advancement:

`qualification`, `viable`, `architectQualified`, `pagePrescription`, `opportunityScore`, `tier`, `strongDemoCandidate`, `valueHierarchy`, `reviewClassification`, `recommendedFirstReview`.

## Receipts

Transport status and factory qualification are separate. One malformed item does not drop the rest of the batch. D2D-local `failed` is not a CF wire status.

Every receipt includes: `d2dProspectId`, `sourceBusinessId`, `campaignBusinessId`, `d2dBusinessId`, `correlationId`, `exportId`, `campaignId`, `campaignRunId`.

| `status` (transport) | Meaning |
| --- | --- |
| `received` | Raw listing accepted. Qualification ran (or is recorded on `qualification`) |
| `duplicate` | Same `sourceBusinessId` + export + `d2d-factory-intake/v1` (`correlationId`). No repeated qualification or model work. A new export of the same `sourceBusinessId` is a new identity |
| `invalid` | Malformed D2D identity, inherited conclusion, mismatched `correlationId`, or over-limit extra item |
| `retryable` | Transient factory failure after advance. Retry resumes without re-qualifying |

| `qualification.outcome` | Meaning |
| --- | --- |
| `advanced` | Factory selected this business, then mapped to `ProspectSeed` through research + prescription to Human Gate 1 |
| `rejected` | Factory rejected (for example excluded category). Zero research/prescription/writer calls |
| `held` | Factory did not select, or selected but refused to invent a `ProspectSeed` |
| `backlog` | Duplicate on the current factory bench |
| `null` | Transport invalid; qualification did not run |

Being complete enough to form `ProspectSeed` is **not** sufficient to advance.

Poll:

- `GET /d2d-factory-intake/v1/prospects/{d2dProspectId}`
- `GET /d2d-factory-intake/v1/businesses/{sourceBusinessId}` (latest/canonical receipt for operator status; not the idempotency key)
- `GET /d2d-factory-intake/v1/runs/{factoryRunId}`

## Factory boundary

`src/factory/candidates.ts` + `src/factory/qualify.ts` remain the keep/reject/advance path. Intake calls that qualifier **once** per new `sourceBusinessId` + export identity.

Only `advanced` records are mapped into today's `ProspectSeed` and `runFactory()`. After that, the merged workflow is authoritative through Human Gate 1. A later export that independently qualifies the same `sourceBusinessId` is transport `received` for that new `correlationId`. If the factory run is already at Human Gate 1, research/prescription are not rerun; the new observation is linked on the run (`sourceCorrelations`) while `sourceCorrelation` stays the original.
