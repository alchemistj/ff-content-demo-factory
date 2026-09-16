import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { acceptD2dIntake } from "./accept.js";
import { D2dIntakeEnvelopeError } from "./errors.js";
import { createMemoryIntakeRegistry } from "./registry.js";
import {
  D2D_FACTORY_INTAKE_VERSION,
  D2D_GOLDEN_FIXTURE_SHA256,
  D2D_GOLDEN_PRODUCER_FACTS,
  D2D_GOLDEN_PRODUCER_FACTS_SHA256,
  D2D_INTAKE_REASON_CODES,
  D2D_PR5_HEAD,
  D2D_TRANSPORT_STATUSES,
  FACTORY_QUALIFICATION_OUTCOMES,
  intakeCorrelationId,
  reconcilableReceiptIdentity,
} from "./types.js";
import {
  NORTHLINE_RAW,
  countingQualifier,
  createIntakeAdapters,
  loadD2dFactoryIntakeV1Golden,
} from "./fixture.js";
import { WORKFLOW_STAGES } from "../workflow/state.js";
import { parseD2dIntakeBatch, normalizeRawBusiness } from "./normalize.js";

const SECRET = "test-d2d-intake-secret";
const GOLDEN_PATH = join(dirname(fileURLToPath(import.meta.url)), "fixtures/d2d-factory-intake-v1.json");
const CANONICAL_EXPORT_ID = "export:campaign-1:apify-run-1:d2d-factory-intake/v1";
const CANONICAL_BIZ1_CORRELATION = intakeCorrelationId({
  sourceBusinessId: "biz-1",
  exportId: CANONICAL_EXPORT_ID,
});
const CANONICAL_SPARSE_CORRELATION = intakeCorrelationId({
  sourceBusinessId: "biz-sparse",
  exportId: CANONICAL_EXPORT_ID,
});

function loadGoldenFileObject(): ReturnType<typeof loadD2dFactoryIntakeV1Golden> {
  return JSON.parse(readFileSync(GOLDEN_PATH, "utf8")) as ReturnType<typeof loadD2dFactoryIntakeV1Golden>;
}

function producerFactsFromGolden(golden: ReturnType<typeof loadD2dFactoryIntakeV1Golden>) {
  const request = golden.request as {
    exportedAt: string;
    campaign: {
      location: string;
      center: { lat: number; lng: number };
      radiusMiles: number;
      radiusMeters: number;
      search: { query: string };
    };
    provenance: { actor: string };
    businesses: Array<{
      title: string;
      placeId: string;
      googlePlaceId: string;
      cid: string;
      address: { city: string; region: string };
      apify: { itemId: string };
    }>;
  };
  const completeReceipt = golden.expectedReceipt.receipts[0] as {
    factoryRunId: string;
    factoryStage: string;
  };
  return {
    exportedAt: request.exportedAt,
    location: request.campaign.location,
    center: request.campaign.center,
    radiusMiles: request.campaign.radiusMiles,
    radiusMeters: request.campaign.radiusMeters,
    searchQuery: request.campaign.search.query,
    actor: request.provenance.actor,
    completeTitle: request.businesses[0]!.title,
    completePlaceId: request.businesses[0]!.placeId,
    completeGooglePlaceId: request.businesses[0]!.googlePlaceId,
    completeCid: request.businesses[0]!.cid,
    completeItemId: request.businesses[0]!.apify.itemId,
    completeCity: request.businesses[0]!.address.city,
    completeRegion: request.businesses[0]!.address.region,
    sparseTitle: request.businesses[1]!.title,
    completeFactoryRunId: completeReceipt.factoryRunId,
    completeFactoryStage: completeReceipt.factoryStage,
  };
}

test("copied D2D golden is the frozen producer fixture, not a lookalike", () => {
  const fromDisk = loadGoldenFileObject();
  const golden = loadD2dFactoryIntakeV1Golden();
  assert.deepEqual(golden, fromDisk);
  assert.deepEqual(golden.request, fromDisk.request);
  assert.deepEqual(golden.expectedReceipt, fromDisk.expectedReceipt);
  assert.equal(typeof golden.notes, "string");
  assert.ok((golden.notes ?? "").length > 0);
  const digest = createHash("sha256").update(JSON.stringify(fromDisk)).digest("hex");
  assert.equal(digest, D2D_GOLDEN_FIXTURE_SHA256);

  const facts = producerFactsFromGolden(fromDisk);
  assert.deepEqual(facts, D2D_GOLDEN_PRODUCER_FACTS);
  const factsDigest = createHash("sha256").update(JSON.stringify(facts)).digest("hex");
  assert.equal(factsDigest, D2D_GOLDEN_PRODUCER_FACTS_SHA256);

  const request = golden.request as {
    version: string;
    campaignId: string;
    campaignRunId: string;
    exportId: string;
    exportedAt: string;
    campaign: {
      location: string;
      radiusMiles: number;
      radiusMeters: number;
      center: { lat: number; lng: number };
      search: { query: string };
    };
    provenance: { actor: string };
    businesses: Array<Record<string, unknown>>;
  };
  assert.equal(request.version, D2D_FACTORY_INTAKE_VERSION);
  assert.equal(request.campaignId, "campaign-1");
  assert.equal(request.campaignRunId, "apify-run-1");
  assert.equal(request.exportId, CANONICAL_EXPORT_ID);
  assert.equal(request.exportedAt, "2026-09-16T12:00:00.000Z");
  assert.notEqual(request.exportedAt, "2026-09-15T12:00:00.000Z");
  assert.equal(request.campaign.location, "Springfield, MO");
  assert.equal(request.campaign.center.lat, 37.20896);
  assert.equal(request.campaign.center.lng, -93.2923);
  assert.equal(request.campaign.radiusMiles, 0.25);
  assert.equal(request.campaign.radiusMeters, 402.336);
  assert.equal(request.campaign.search.query, "business");
  assert.notEqual(request.campaign.search.query, "garage door repair");
  assert.equal(request.provenance.actor, "compass/crawler-google-places");
  assert.notEqual(request.provenance.actor, "compass~crawler-google-places");
  const complete = request.businesses[0]!;
  const sparse = request.businesses[1]!;
  assert.equal(complete.campaignBusinessId, "cb-1");
  assert.equal(complete.sourceBusinessId, "biz-1");
  assert.equal(complete.d2dBusinessId, "biz-1");
  assert.equal(complete.title, "Northline Garage Doors");
  assert.equal(complete.placeId, "place-1");
  assert.equal(complete.googlePlaceId, "place-1");
  assert.equal(complete.cid, "cid-northline");
  assert.equal(typeof complete.mapsUrl, "string");
  assert.equal((complete.apify as { itemId: string }).itemId, "item-9");
  assert.equal((complete.address as { city: string; region: string }).city, "Mason");
  assert.equal((complete.address as { city: string; region: string }).region, "IL");
  assert.equal(sparse.campaignBusinessId, "cb-sparse");
  assert.equal(sparse.sourceBusinessId, "biz-sparse");
  assert.equal(sparse.d2dBusinessId, "biz-sparse");
  assert.equal(sparse.title, "No website shop");
  assert.equal(complete.correlationId, CANONICAL_BIZ1_CORRELATION);
  assert.equal(sparse.correlationId, CANONICAL_SPARSE_CORRELATION);
  assert.equal("phone" in sparse, false);
  assert.equal("website" in sparse, false);
  assert.equal("rating" in sparse, false);
  const advanced = golden.expectedReceipt.receipts[0] as Record<string, unknown>;
  const held = golden.expectedReceipt.receipts[1] as Record<string, unknown>;
  assert.equal(advanced.placeId, "place-1");
  assert.equal(advanced.factoryProspectId, "biz-1");
  assert.equal(advanced.factoryRunId, "run-biz-1");
  assert.equal(advanced.factoryStage, WORKFLOW_STAGES.AWAITING_PRESCRIPTION_APPROVAL);
  assert.equal(typeof (advanced.qualification as { reason: string }).reason, "string");
  assert.equal(held.placeId, "place-1");
  assert.equal(typeof held.reason, "string");
  assert.equal(held.reasonCode, D2D_INTAKE_REASON_CODES.WEAK_OPPORTUNITY);
});

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
  assert.equal(complete.campaignBusinessId, "cb-1");
  assert.equal(complete.sourceBusinessId, "biz-1");
  assert.equal(complete.d2dBusinessId, "biz-1");
  assert.equal(sparse.campaignBusinessId, "cb-sparse");
  assert.equal(sparse.sourceBusinessId, "biz-sparse");
  assert.equal(complete.d2dBusinessId, complete.sourceBusinessId);
  assert.equal(sparse.d2dBusinessId, sparse.sourceBusinessId);
  assert.equal(complete.correlationId, CANONICAL_BIZ1_CORRELATION);
  assert.equal(sparse.correlationId, CANONICAL_SPARSE_CORRELATION);
  assert.equal(complete.title, "Northline Garage Doors");
  assert.equal(complete.googlePlaceId, "place-1");
  assert.equal(complete.cid, "cid-northline");
  assert.equal("phone" in sparse, false);
  assert.equal("website" in sparse, false);
  assert.equal("rating" in sparse, false);
  assert.equal("apify" in complete, true);
  assert.equal("provenance" in complete, false);

  const parsed = parseD2dIntakeBatch(request);
  assert.equal(parsed.campaignId, "campaign-1");
  assert.equal(parsed.campaignRunId, "apify-run-1");
  assert.equal(parsed.exportId, CANONICAL_EXPORT_ID);
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
  assert.equal(normalizedComplete.record.name, complete.title);
  assert.equal(normalizedComplete.record.placeId, complete.placeId);
  assert.equal(normalizedComplete.record.placeId, complete.googlePlaceId);
  assert.equal(normalizedComplete.record.d2dBusinessId, complete.sourceBusinessId);
  assert.notEqual(normalizedComplete.record.d2dBusinessId, complete.googlePlaceId);
  assert.notEqual(normalizedComplete.record.d2dBusinessId, complete.cid);
  assert.equal(normalizedSparse.record.phone, null);
  assert.equal(normalizedSparse.record.website, null);
  assert.equal(normalizedSparse.record.rating, null);
  assert.equal(normalizedComplete.record.coordinates?.lat, (complete.coordinates as { lat: number }).lat);
  assert.equal(normalizedComplete.record.apify?.runId, (complete.apify as { runId: string }).runId);
  assert.equal(normalizedComplete.record.apify?.actor, "compass/crawler-google-places");
  assert.equal(normalizedComplete.record.apify?.itemId, "item-9");

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
  assert.equal(result.campaignId, golden.expectedReceipt.campaignId);
  assert.equal(result.campaignRunId, golden.expectedReceipt.campaignRunId);
  assert.equal(result.exportId, golden.expectedReceipt.exportId);

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
    assert.equal(receipt.placeId, expected.placeId);
    assert.equal(receipt.factoryProspectId, expected.factoryProspectId);
    assert.equal(receipt.factoryRunId, expected.factoryRunId);
    assert.equal(receipt.factoryStage, expected.factoryStage);
    assert.equal(receipt.reason, expected.reason);
    assert.equal(receipt.reasonCode, expected.reasonCode);
    assert.deepEqual(receipt.qualification, expected.qualification);
    const expectedQualification = expected.qualification as { outcome: string };
    assert.equal(receipt.qualification?.outcome, expectedQualification.outcome);
    assert.equal(receipt.correlationId, businesses[index]!.correlationId);
    assert.equal(receipt.status, D2D_TRANSPORT_STATUSES.RECEIVED);
    assert.notEqual(receipt.d2dBusinessId, businesses[index]!.googlePlaceId);
    assert.notEqual(receipt.d2dBusinessId, businesses[index]!.cid);
  }

  assert.equal(result.receipts[0]?.qualification?.outcome, FACTORY_QUALIFICATION_OUTCOMES.ADVANCED);
  assert.equal(result.receipts[1]?.qualification?.outcome, FACTORY_QUALIFICATION_OUTCOMES.HELD);
  assert.equal(result.receipts[0]?.factoryStage, WORKFLOW_STAGES.AWAITING_PRESCRIPTION_APPROVAL);
  assert.equal(result.receipts[0]?.factoryRunId, "run-biz-1");
  assert.equal(result.receipts[1]?.factoryRunId, undefined);
  assert.equal(qualifier.calls, 2);
  assert.equal(adapters.stats.researchCalls, 1);
  assert.equal(adapters.stats.prescribeCalls, 1);
  assert.equal(adapters.stats.writeCalls, 0);
});

test("mismatched request correlationId is per-item invalid against canonical D2D IDs", async () => {
  const golden = loadD2dFactoryIntakeV1Golden();
  const request = structuredClone(golden.request) as Record<string, unknown> & {
    businesses: Array<Record<string, unknown>>;
    exportId: string;
  };
  assert.equal(request.exportId, CANONICAL_EXPORT_ID);
  const complete = request.businesses[0]!;
  assert.equal(complete.sourceBusinessId, "biz-1");
  const tampered = `${complete.sourceBusinessId}::${request.exportId}::tampered`;
  complete.correlationId = tampered;
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
  const receipt = result.receipts[0]!;
  assert.equal(receipt.status, D2D_TRANSPORT_STATUSES.INVALID);
  assert.equal(receipt.reasonCode, D2D_INTAKE_REASON_CODES.INVALID_CORRELATION_ID);
  assert.equal(receipt.qualification, null);
  assert.equal(receipt.sourceBusinessId, "biz-1");
  assert.equal(receipt.campaignBusinessId, "cb-1");
  assert.equal(receipt.exportId, CANONICAL_EXPORT_ID);
  assert.equal(receipt.correlationId, tampered);
  assert.notEqual(receipt.correlationId, CANONICAL_BIZ1_CORRELATION);
  assert.equal(result.receipts[1]?.status, D2D_TRANSPORT_STATUSES.RECEIVED);
  assert.equal(result.receipts[1]?.sourceBusinessId, "biz-sparse");
  assert.equal(result.receipts[1]?.qualification?.outcome, FACTORY_QUALIFICATION_OUTCOMES.HELD);
  assert.equal(qualifier.calls, 1);
  assert.equal(adapters.stats.researchCalls, 0);
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

test("D2D PR #5 head referenced by this frozen contract is fe5b74f5", () => {
  assert.equal(D2D_PR5_HEAD, "fe5b74f5f1059af2808e61a0b13755ead55999a5");
  assert.notEqual(D2D_PR5_HEAD, "00ae71fa67eede3674834e5ad4d81e79e951e395");
});
