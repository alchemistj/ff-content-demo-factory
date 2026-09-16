import assert from "node:assert/strict";
import test from "node:test";
import { acceptD2dIntake } from "./accept.js";
import { D2dIntakeEnvelopeError } from "./errors.js";
import { createMemoryIntakeRegistry } from "./registry.js";
import {
  D2D_FACTORY_INTAKE_VERSION,
  D2D_INTAKE_REASON_CODES,
  D2D_TRANSPORT_STATUSES,
  FACTORY_QUALIFICATION_OUTCOMES,
  reconcilableReceiptIdentity,
} from "./types.js";
import {
  NORTHLINE_CORRELATION_ID,
  NORTHLINE_RAW,
  countingQualifier,
  createIntakeAdapters,
  loadD2dFactoryIntakeV1Golden,
  northlineBatch,
  rawWith,
} from "./fixture.js";
import { WORKFLOW_STAGES } from "../workflow/state.js";
import { parseD2dIntakeBatch, normalizeRawBusiness } from "./normalize.js";

const SECRET = "test-d2d-intake-secret";
const D2D_PR5_HEAD = "00ae71fa67eede3674834e5ad4d81e79e951e395";

test("golden D2D PR #5 two-business intake v1 request is accepted directly and receipts are reconcilable", async () => {
  const golden = loadD2dFactoryIntakeV1Golden();
  const request = golden.request;
  assert.equal(request.version, D2D_FACTORY_INTAKE_VERSION);
  assert.equal("schema" in request, false);
  assert.equal("searchContext" in request, false);
  const businesses = request.businesses as Array<Record<string, unknown>>;
  assert.equal(businesses.length, 2);
  const complete = businesses[0]!;
  const sparse = businesses[1]!;
  assert.equal(typeof complete.correlationId, "string");
  assert.equal(typeof sparse.correlationId, "string");
  assert.equal(complete.d2dBusinessId, complete.sourceBusinessId);
  assert.equal(sparse.d2dBusinessId, sparse.sourceBusinessId);
  assert.equal("phone" in sparse && Boolean(sparse.phone), false);
  assert.equal("website" in sparse && Boolean(sparse.website), false);
  assert.equal("apify" in complete, true);
  assert.equal("provenance" in complete, false);

  const parsed = parseD2dIntakeBatch(request);
  const normalizedComplete = normalizeRawBusiness(complete, {
    ...(parsed.provenance ? { provenance: parsed.provenance } : {}),
    exportId: parsed.exportId,
  });
  const normalizedSparse = normalizeRawBusiness(sparse, {
    ...(parsed.provenance ? { provenance: parsed.provenance } : {}),
    exportId: parsed.exportId,
  });
  assert.equal(normalizedComplete.status, "normalized");
  assert.equal(normalizedSparse.status, "normalized");
  if (normalizedComplete.status !== "normalized" || normalizedSparse.status !== "normalized") return;
  assert.equal(normalizedComplete.record.correlationId, complete.correlationId);
  assert.equal(normalizedSparse.record.correlationId, sparse.correlationId);
  assert.equal(normalizedSparse.record.phone, null);
  assert.equal(normalizedSparse.record.website, null);
  assert.equal(normalizedComplete.record.coordinates?.lat, (complete.coordinates as { lat: number }).lat);
  assert.equal(normalizedComplete.record.apify?.runId, (complete.apify as { runId: string }).runId);

  const adapters = createIntakeAdapters();
  const qualifier = countingQualifier();
  const result = await acceptD2dIntake({
    payload: request,
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    qualifier,
    registry: createMemoryIntakeRegistry(),
  });
  assert.equal(result.receipts.length, 2);
  assert.equal(golden.expectedReceipt.receipts.length, 2);

  for (const [index, expected] of golden.expectedReceipt.receipts.entries()) {
    const receipt = result.receipts[index]!;
    assert.deepEqual(reconcilableReceiptIdentity(receipt), {
      version: expected.version,
      status: expected.status,
      d2dProspectId: expected.d2dProspectId,
      sourceBusinessId: expected.sourceBusinessId,
      campaignBusinessId: expected.campaignBusinessId,
      d2dBusinessId: expected.d2dBusinessId,
      correlationId: expected.correlationId,
      campaignId: expected.campaignId,
      campaignRunId: expected.campaignRunId,
      exportId: expected.exportId,
    });
    const expectedQualification = expected.qualification as { outcome: string };
    assert.equal(receipt.qualification?.outcome, expectedQualification.outcome);
    assert.equal(receipt.correlationId, businesses[index]!.correlationId);
    assert.equal(receipt.status, D2D_TRANSPORT_STATUSES.RECEIVED);
  }

  assert.equal(result.receipts[0]?.qualification?.outcome, FACTORY_QUALIFICATION_OUTCOMES.ADVANCED);
  assert.equal(result.receipts[1]?.qualification?.outcome, FACTORY_QUALIFICATION_OUTCOMES.HELD);
  assert.equal(result.receipts[0]?.factoryStage, WORKFLOW_STAGES.AWAITING_PRESCRIPTION_APPROVAL);
  assert.equal(result.receipts[1]?.factoryRunId, undefined);
  assert.equal(qualifier.calls, 2);
  assert.equal(adapters.stats.researchCalls, 1);
  assert.equal(adapters.stats.prescribeCalls, 1);
  assert.equal(adapters.stats.writeCalls, 0);
});

test("mismatched request correlationId is per-item invalid and spends zero qualifier or model work", async () => {
  const adapters = createIntakeAdapters();
  const qualifier = countingQualifier();
  const tampered = "src-northline::export-2026-09-15-northline::tampered";
  const result = await acceptD2dIntake({
    payload: northlineBatch({
      businesses: [rawWith({ correlationId: tampered })],
    }),
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    qualifier,
    registry: createMemoryIntakeRegistry(),
  });
  const receipt = result.receipts[0]!;
  assert.equal(receipt.status, D2D_TRANSPORT_STATUSES.INVALID);
  assert.equal(receipt.reasonCode, D2D_INTAKE_REASON_CODES.INVALID_CORRELATION_ID);
  assert.equal(receipt.qualification, null);
  assert.equal(receipt.correlationId, tampered);
  assert.notEqual(receipt.correlationId, NORTHLINE_CORRELATION_ID);
  assert.equal(qualifier.calls, 0);
  assert.equal(adapters.stats.researchCalls, 0);
  assert.equal(adapters.stats.prescribeCalls, 0);
  assert.equal(adapters.stats.writeCalls, 0);
});

test("stale d2d-factory-raw-export aliases are not remapped", () => {
  assert.throws(
    () =>
      parseD2dIntakeBatch({
        schema: "d2d-factory-raw-export/v1",
        searchContext: { latitude: 41.9, longitude: -87.8, radiusMiles: 5, searchTerms: ["garage door"] },
        businesses: [NORTHLINE_RAW],
      }),
    D2dIntakeEnvelopeError,
  );
  assert.throws(
    () =>
      parseD2dIntakeBatch({
        version: D2D_FACTORY_INTAKE_VERSION,
        campaignId: "campaign-lake-county",
        campaignRunId: "campaign-run-2026-09-15",
        exportId: "export-2026-09-15-northline",
        exportedAt: "2026-09-15T17:00:00.000Z",
        campaign: { center: { latitude: 41.9, longitude: -87.8 }, radiusMiles: 5 },
        businesses: [NORTHLINE_RAW],
      }),
    (error: unknown) => error instanceof D2dIntakeEnvelopeError && /campaign\.center requires lat and lng/.test(error.message),
  );
  const aliasedCoords = normalizeRawBusiness({
    ...NORTHLINE_RAW,
    coordinates: { latitude: 41.901, longitude: -87.812 },
  });
  assert.equal(aliasedCoords.status, "normalized");
  if (aliasedCoords.status !== "normalized") return;
  assert.equal(aliasedCoords.record.coordinates, null);
});

test("D2D PR #5 head referenced by this frozen contract is 00ae71fa", () => {
  assert.equal(D2D_PR5_HEAD, "00ae71fa67eede3674834e5ad4d81e79e951e395");
});
