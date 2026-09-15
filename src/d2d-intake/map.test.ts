import assert from "node:assert/strict";
import test from "node:test";
import { mapD2dProspectToSeed, parseD2dIntakeBatch } from "./map.js";
import { D2dIntakeEnvelopeError } from "./errors.js";
import { D2D_INTAKE_REASON_CODES } from "./types.js";
import {
  EXPECTED_NORTHLINE_SEED,
  NORTHLINE_D2D_CANDIDATE,
  candidateWith,
  northlineBatch,
} from "./fixture.js";

test("valid D2D payload maps to the exact expected ProspectSeed", () => {
  const batch = northlineBatch();
  const parsed = parseD2dIntakeBatch(batch);
  const mapped = mapD2dProspectToSeed(NORTHLINE_D2D_CANDIDATE, parsed);
  assert.equal(mapped.status, "mapped");
  if (mapped.status !== "mapped") return;
  assert.deepEqual(mapped.mapped.seed, EXPECTED_NORTHLINE_SEED);
  assert.equal(mapped.mapped.seed.sourceNotes?.includes("https://example.com"), false);
  assert.equal(mapped.mapped.correlation.campaignId, "campaign-lake-county");
  assert.equal(mapped.mapped.correlation.campaignRunId, "campaign-run-2026-09-15");
  assert.equal(mapped.mapped.correlation.exportId, "export-2026-09-15-northline");
  assert.equal(mapped.mapped.correlation.d2dProspectId, "prospect-northline");
});

test("missing or partial NAP and identity are held without invented values", () => {
  const batch = northlineBatch();
  const cases = [
    { candidate: candidateWith({ business: { name: "" } }), code: D2D_INTAKE_REASON_CODES.MISSING_BUSINESS_NAME },
    {
      candidate: candidateWith({ business: { name: "Northline Garage Doors", trade: "", serviceArea: "Lake County" } }),
      code: D2D_INTAKE_REASON_CODES.MISSING_TRADE,
    },
    {
      candidate: candidateWith({
        business: { name: "Northline Garage Doors", trade: "garage door service", serviceArea: "" },
      }),
      code: D2D_INTAKE_REASON_CODES.MISSING_SERVICE_AREA,
    },
    { candidate: candidateWith({ nap: { phone: "" } }), code: D2D_INTAKE_REASON_CODES.MISSING_PHONE },
    { candidate: candidateWith({ nap: { website: "" } }), code: D2D_INTAKE_REASON_CODES.MISSING_WEBSITE },
    {
      candidate: candidateWith({ nap: { website: "northline.example" } }),
      code: D2D_INTAKE_REASON_CODES.INVALID_WEBSITE,
    },
    {
      candidate: candidateWith({ nap: { address: { city: "" } } }),
      code: D2D_INTAKE_REASON_CODES.MISSING_ADDRESS_CITY,
    },
    {
      candidate: candidateWith({
        qualification: {
          classification: "unqualified",
          reason: "No website on the listing.",
          evidenceRefs: [{ kind: "google_business", refId: "place-x" }],
        },
      }),
      code: D2D_INTAKE_REASON_CODES.NOT_QUALIFIED,
    },
  ] as const;

  for (const item of cases) {
    const mapped = mapD2dProspectToSeed(item.candidate, batch);
    assert.equal(mapped.status, "held");
    if (mapped.status !== "held") continue;
    assert.equal(mapped.reasonCode, item.code);
    assert.match(mapped.reason, /not invented|only qualified|required/i);
    assert.equal("seed" in mapped, false);
  }
});

test("unsupported contract version fails the envelope before mapping prospects", () => {
  assert.throws(
    () => parseD2dIntakeBatch({ ...northlineBatch(), version: "d2d-factory-intake/v0" }),
    D2dIntakeEnvelopeError,
  );
  try {
    parseD2dIntakeBatch({ ...northlineBatch(), version: "d2d-factory-intake/v0" });
  } catch (error) {
    assert.equal(error instanceof D2dIntakeEnvelopeError, true);
    if (error instanceof D2dIntakeEnvelopeError) {
      assert.equal(error.code, D2D_INTAKE_REASON_CODES.UNSUPPORTED_VERSION);
    }
  }
});
