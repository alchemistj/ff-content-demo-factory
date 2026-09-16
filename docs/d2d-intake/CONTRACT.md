# D2D factory intake contract (`d2d-factory-intake/v1`)

This is the versioned cross-repo contract between `alchemistj/ff-gb-door-to-door-system` and this Content Demo Factory.

**D2D owns collection and transport facts:** campaign geography (center/radius/search), Apify/Google Business identity, raw listing fields, deterministic hygiene, and delivery/correlation status.

**Content Factory is the only owner of keep/reject/advance qualification.** D2D must not send a qualification conclusion as authority. The route is: **raw/normalized geographic cohort → Content Factory qualification → only advanced businesses enter `ProspectSeed` / research / prescription → Human Gate 1**.

The old direct D2D → `ff-2-demos` route is not this pipeline. D2D is not asked to prequalify a 4–7 demo shortlist.

## Envelope

`POST /d2d-factory-intake/v1`

Default operator cohort size is **40** (`D2D_INTAKE_MAX_BATCH`, configurable). Transport does not inherit the historical 7-candidate cap.

```json
{
  "version": "d2d-factory-intake/v1",
  "campaignId": "campaign-lake-county",
  "campaignRunId": "campaign-run-2026-09-15",
  "exportId": "export-2026-09-15-northline",
  "exportedAt": "2026-09-15T17:00:00.000Z",
  "campaign": {
    "location": "Lake County",
    "radiusMeters": 8000,
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
      "placeId": "ChIJ-northline",
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
      "mapsUrl": "https://maps.example/northline",
      "coordinates": { "lat": 41.901, "lng": -87.812 }
    }
  ]
}
```

Raw intake accepts available source facts. Missing optional fields (phone, website, category, street address, rating) remain evidence for factory qualification. They are not fabricated and they are not a transport rejection.

Stable identity is required at transport: `placeId` / `googlePlaceId` / `cid`, or a Google/maps URL, plus a name/title.

## Non-authoritative inherited conclusions

These fields are **not** Content Factory qualification. If present on a business or the envelope, they are rejected as `INHERITED_CONCLUSION` and cannot drive advancement:

`qualification`, `viable`, `architectQualified`, `pagePrescription`, `opportunityScore`, `tier`, `strongDemoCandidate`, `valueHierarchy`, `reviewClassification`, `recommendedFirstReview`.

## Receipts

Transport status and factory qualification are separate. One malformed item does not drop the rest of the batch.

| `status` (transport) | Meaning |
| --- | --- |
| `received` | Raw listing accepted into Content Factory. Qualification ran (or is recorded on `qualification`) |
| `duplicate` | Same stable business + export/intake version (or an existing qualification). No repeated qualification or model work |
| `invalid` | Malformed identity, inherited conclusion, or over-limit extra item |
| `retryable` | Transient factory failure after advance. Retry resumes without re-qualifying |

| `qualification.outcome` | Meaning |
| --- | --- |
| `advanced` | Factory selected this business. Mapped to `ProspectSeed` and run through research + prescription to Human Gate 1 |
| `rejected` | Factory rejected (for example excluded category). Zero research/prescription/writer calls |
| `held` | Factory judged the record not ready to advance (for example missing phone/website). No invented `ProspectSeed` |
| `backlog` | Duplicate on the current factory bench |
| `null` | Transport invalid; qualification did not run |

Correlation: `d2dBusinessId`, `placeId`, `campaignId`, `campaignRunId`, `exportId`, `correlationId`. Advanced receipts also include `factoryRunId`, `factoryProspectId`, and `factoryStage`.

Poll:

- `GET /d2d-factory-intake/v1/businesses/{d2dBusinessId}`
- `GET /d2d-factory-intake/v1/runs/{factoryRunId}`

## Factory boundary

`src/factory/qualify.ts` is the keep/reject/advance path (smallest useful port of historical seeded-discovery / candidate-bench rules). Intake calls it **once** per new raw business + export identity.

Only `advanced` records are mapped into today's `ProspectSeed` and `runFactory()`. After that, the merged workflow is authoritative through Human Gate 1. Intake does not run the writer, website-copy publication, website build, or outreach.

Companion upstream: `alchemistj/ff-gb-door-to-door-system#4`. D2D should emit this raw cohort, not a prequalified shortlist.
