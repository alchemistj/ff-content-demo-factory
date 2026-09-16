import assert from "node:assert/strict";
import test from "node:test";
import { acceptD2dIntake } from "./accept.js";
import { D2dIntakeEnvelopeError } from "./errors.js";
import { createMemoryIntakeRegistry } from "./registry.js";
import {
  D2D_FACTORY_INTAKE_VERSION,
  D2D_TRANSPORT_STATUSES,
  intakeCorrelationId,
  reconcilableReceiptIdentity,
} from "./types.js";
import { createIntakeAdapters, loadD2dFactoryIntakeV1Golden, NORTHLINE_RAW } from "./fixture.js";
import { WORKFLOW_STAGES } from "../workflow/state.js";
import { parseD2dIntakeBatch, normalizeRawBusiness } from "./normalize.js";

const SECRET = "test-d2d-intake-secret";
const D2D_PR5_HEAD = "00ae71fa67eede3674834e5ad4d81e79e951e395";

test("golden D2D PR #5 intake v1 request is accepted directly and receipt is reconcilable", async () => {
  const golden = loadD2dFactoryIntakeV1Golden();
  const request = golden.request;
  assert.equal(request.version, D2D_FACTORY_INTAKE_VERSION);
  assert.equal("schema" in request, false);
  assert.equal("searchContext" in request, false);
  assert.equal(typeof request.campaign, "object");
  const campaign = request.campaign as Record<string, unknown>;
  const center = campaign.center as { lat: number; lng: number };
  assert.equal(typeof center.lat, "number");
  assert.equal(typeof center.lng, "number");
  assert.equal("latitude" in center, false);
  assert.equal("longitude" in center, false);
  assert.equal(typeof campaign.radiusMiles, "number");
  assert.equal(typeof campaign.radiusMeters, "number");
  const search = campaign.search as { query: string; searchStrings: string[] };
  assert.equal(typeof search.query, "string");
  assert.ok(Array.isArray(search.searchStrings));
  assert.equal("provenance" in request, true);
  const business = (request.businesses as Array<Record<string, unknown>>)[0]!;
  assert.equal(business.d2dProspectId, "d2d-prospect-northline");
  assert.equal(business.d2dBusinessId, business.sourceBusinessId);
  assert.equal("apify" in business, true);
  assert.equal("provenance" in business, false);
  const coordinates = business.coordinates as { lat: number; lng: number };
  assert.equal(typeof coordinates.lat, "number");
  assert.equal(typeof coordinates.lng, "number");
  assert.equal("latitude" in coordinates, false);
  assert.equal("longitude" in coordinates, false);

  const parsed = parseD2dIntakeBatch(request);
  assert.equal(parsed.campaign.center?.lat, center.lat);
  const normalized = normalizeRawBusiness(business, parsed.provenance);
  assert.equal(normalized.status, "normalized");
  if (normalized.status !== "normalized") return;
  assert.equal(normalized.record.coordinates?.lat, coordinates.lat);
  assert.equal(normalized.record.apify?.runId, (business.apify as { runId: string }).runId);

  const adapters = createIntakeAdapters();
  const result = await acceptD2dIntake({
    payload: request,
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    registry: createMemoryIntakeRegistry(),
  });
  const expected = golden.expectedReceipt.receipts[0]!;
  const receipt = result.receipts[0]!;
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
  assert.equal(
    receipt.correlationId,
    intakeCorrelationId({
      sourceBusinessId: String(expected.sourceBusinessId),
      exportId: String(expected.exportId),
    }),
  );
  assert.equal(receipt.correlationId, `${expected.sourceBusinessId}::${expected.exportId}::${D2D_FACTORY_INTAKE_VERSION}`);
  assert.equal(receipt.status, D2D_TRANSPORT_STATUSES.RECEIVED);
  assert.equal(receipt.d2dBusinessId, receipt.sourceBusinessId);
  assert.equal(receipt.factoryStage, WORKFLOW_STAGES.AWAITING_PRESCRIPTION_APPROVAL);
  assert.equal(adapters.stats.researchCalls, 1);
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
