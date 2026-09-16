import assert from "node:assert/strict";
import test from "node:test";
import { mapAdvancedBusinessToSeed } from "./map.js";
import { normalizeRawBusiness, parseD2dIntakeBatch } from "./normalize.js";
import { D2dIntakeEnvelopeError } from "./errors.js";
import { D2D_INTAKE_REASON_CODES } from "./types.js";
import { NORTHLINE_CAMPAIGN, NORTHLINE_RAW, northlineBatch, rawWith } from "./fixture.js";

test("raw D2D payload requires no upstream qualification and maps advanced facts without invention", () => {
  const batch = parseD2dIntakeBatch(northlineBatch());
  assert.equal("prospects" in batch, false);
  const normalized = normalizeRawBusiness(NORTHLINE_RAW);
  assert.equal(normalized.status, "normalized");
  if (normalized.status !== "normalized") return;
  assert.equal(normalized.record.phone, "+1-555-010-1000");
  const mapped = mapAdvancedBusinessToSeed(normalized.record, {
    campaignId: batch.campaignId,
    campaignRunId: batch.campaignRunId,
    exportId: batch.exportId,
    exportedAt: batch.exportedAt,
    campaign: NORTHLINE_CAMPAIGN,
  });
  assert.equal(mapped.ok, true);
  if (!mapped.ok) return;
  assert.equal(mapped.mapped.seed.business.name, "Northline Garage Doors");
  assert.equal(mapped.mapped.seed.nap.website, "https://northline.example/");
  assert.equal(mapped.mapped.seed.nap.phone, "+1-555-010-1000");
  assert.equal(mapped.mapped.correlation.d2dBusinessId, "ChIJ-northline");
  assert.equal(mapped.mapped.correlation.campaignId, "campaign-lake-county");
  assert.equal(mapped.mapped.correlation.factoryQualificationOutcome, "advanced");
  assert.match(mapped.mapped.seed.sourceNotes ?? "", /apify.runId=apify-run-northline/);
});

test("raw record without phone or website is normalized without fabricated values", () => {
  const missingPhone = normalizeRawBusiness(rawWith({ phone: "" }));
  assert.equal(missingPhone.status, "normalized");
  if (missingPhone.status !== "normalized") return;
  assert.equal(missingPhone.record.phone, null);
  const mappedPhone = mapAdvancedBusinessToSeed(missingPhone.record, {
    campaignId: "c",
    campaignRunId: "r",
    exportId: "e",
    exportedAt: "2026-09-15T17:00:00.000Z",
    campaign: NORTHLINE_CAMPAIGN,
  });
  assert.equal(mappedPhone.ok, false);
  if (mappedPhone.ok) return;
  assert.equal(mappedPhone.reasonCode, D2D_INTAKE_REASON_CODES.MISSING_PHONE);

  const noWebsite = normalizeRawBusiness(rawWith({ website: "", websiteUrl: "" }));
  assert.equal(noWebsite.status, "normalized");
  if (noWebsite.status !== "normalized") return;
  assert.equal(noWebsite.record.website, null);
  const mappedWebsite = mapAdvancedBusinessToSeed(noWebsite.record, {
    campaignId: "c",
    campaignRunId: "r",
    exportId: "e",
    exportedAt: "2026-09-15T17:00:00.000Z",
    campaign: NORTHLINE_CAMPAIGN,
  });
  assert.equal(mappedWebsite.ok, false);
  if (mappedWebsite.ok) return;
  assert.equal(mappedWebsite.reasonCode, D2D_INTAKE_REASON_CODES.MISSING_WEBSITE);
});

test("inherited qualification conclusions are non-authoritative and cannot be normalized", () => {
  for (const field of ["qualification", "opportunityScore", "tier", "architectQualified", "strongDemoCandidate"]) {
    const result = normalizeRawBusiness(rawWith({ [field]: { classification: "qualified" } }));
    assert.equal(result.status, "invalid");
    if (result.status !== "invalid") continue;
    assert.equal(result.reasonCode, D2D_INTAKE_REASON_CODES.INHERITED_CONCLUSION);
  }
});

test("malformed stable identity is invalid at transport, not a ProspectSeed hold", () => {
  const result = normalizeRawBusiness({ name: "No Place", address: "Mason, IL" });
  assert.equal(result.status, "invalid");
  if (result.status !== "invalid") return;
  assert.equal(result.reasonCode, D2D_INTAKE_REASON_CODES.MISSING_STABLE_IDENTITY);
});

test("prequalified prospects envelope is rejected", () => {
  assert.throws(
    () =>
      parseD2dIntakeBatch({
        version: "d2d-factory-intake/v1",
        campaignId: "c",
        campaignRunId: "r",
        exportId: "e",
        exportedAt: "2026-09-15T17:00:00.000Z",
        prospects: [NORTHLINE_RAW],
      }),
    D2dIntakeEnvelopeError,
  );
});
