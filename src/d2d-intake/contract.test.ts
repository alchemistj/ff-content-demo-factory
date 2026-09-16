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
} from "./types.js";
import {
  NORTHLINE_RAW,
  countingQualifier,
  createGoldenContractQualifier,
  createIntakeAdapters,
  goldenContractMapSeed,
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
      search: { query: string; searchStrings: string[] };
    };
    provenance: { actor: string };
    businesses: Array<{
      name: string;
      title: string;
      category: string;
      placeId: string;
      googlePlaceId: string;
      cid: string;
      location: string;
      phone?: string;
      rating?: number;
      reviewCount: number;
      coordinates: { lat: number; lng: number };
      address: { city: string; region: string; country?: string };
      apify: { itemId: string };
    }>;
  };
  const complete = request.businesses[0]!;
  const sparse = request.businesses[1]!;
  const completeReceipt = golden.expectedReceipt.receipts[0] as {
    factoryProspectId: string;
    factoryRunId: string;
    factoryStage: string;
    reason: string;
  };
  const sparseReceipt = golden.expectedReceipt.receipts[1] as { reasonCode: string };
  return {
    notes: golden.notes,
    exportedAt: request.exportedAt,
    location: request.campaign.location,
    center: request.campaign.center,
    radiusMiles: request.campaign.radiusMiles,
    radiusMeters: request.campaign.radiusMeters,
    searchQuery: request.campaign.search.query,
    searchStrings: request.campaign.search.searchStrings,
    actor: request.provenance.actor,
    completeName: complete.name,
    completeTitle: complete.title,
    completeCategory: complete.category,
    completePlaceId: complete.placeId,
    completeGooglePlaceId: complete.googlePlaceId,
    completeCid: complete.cid,
    completeItemId: complete.apify.itemId,
    completeCity: complete.address.city,
    completeRegion: complete.address.region,
    completeCountry: complete.address.country ?? null,
    completeLocation: complete.location,
    completePhone: complete.phone,
    completeRating: complete.rating,
    completeReviewCount: complete.reviewCount,
    completeCoordinates: complete.coordinates,
    sparseTitle: sparse.title,
    sparseName: sparse.name,
    sparseReviewCount: sparse.reviewCount,
    sparseHasPhone: Object.prototype.hasOwnProperty.call(sparse, "phone"),
    completeFactoryProspectId: completeReceipt.factoryProspectId,
    completeFactoryRunId: completeReceipt.factoryRunId,
    completeFactoryStage: completeReceipt.factoryStage,
    completeReason: completeReceipt.reason,
    sparseReasonCode: sparseReceipt.reasonCode,
  };
}

test("copied D2D golden is the frozen producer fixture, not a lookalike", () => {
  const fromDisk = loadGoldenFileObject();
  const golden = loadD2dFactoryIntakeV1Golden();
  assert.deepEqual(golden, fromDisk);
  assert.deepEqual(golden.request, fromDisk.request);
  assert.deepEqual(golden.expectedReceipt, fromDisk.expectedReceipt);
  const digest = createHash("sha256").update(JSON.stringify(fromDisk)).digest("hex");
  assert.equal(digest, D2D_GOLDEN_FIXTURE_SHA256);

  const facts = producerFactsFromGolden(fromDisk);
  assert.deepEqual(facts, D2D_GOLDEN_PRODUCER_FACTS);
  const factsDigest = createHash("sha256").update(JSON.stringify(facts)).digest("hex");
  assert.equal(factsDigest, D2D_GOLDEN_PRODUCER_FACTS_SHA256);

  const request = golden.request as {
    campaign: { search: { query: string; searchStrings: string[] } };
    provenance: { actor: string };
    businesses: Array<Record<string, unknown>>;
  };
  assert.deepEqual(request.campaign.search.searchStrings, ["business"]);
  assert.notEqual(request.campaign.search.searchStrings[0], "garage door");
  assert.equal(request.provenance.actor, "compass/crawler-google-places");
  const complete = request.businesses[0]!;
  const sparse = request.businesses[1]!;
  assert.equal(complete.name, "Northline Garage Doors");
  assert.equal(complete.title, "Northline Garage Doors");
  assert.equal(complete.category, "Garage door service");
  assert.equal((complete.address as { country?: string }).country, undefined);
  assert.equal(complete.location, "Mason, IL");
  assert.equal(complete.phone, "5550101000");
  assert.equal(complete.rating, 4.6);
  assert.equal(complete.reviewCount, 18);
  assert.deepEqual(complete.coordinates, { lat: 37.20896, lng: -93.2923 });
  assert.equal(sparse.name, "No website shop");
  assert.equal(sparse.title, "No website shop");
  assert.equal(sparse.reviewCount, 18);
  assert.equal("phone" in sparse, false);
  assert.equal("website" in sparse, false);
  assert.equal("rating" in sparse, false);
  const advanced = golden.expectedReceipt.receipts[0] as Record<string, unknown>;
  const held = golden.expectedReceipt.receipts[1] as Record<string, unknown>;
  assert.equal(advanced.factoryProspectId, "factory-northline");
  assert.equal(advanced.factoryRunId, "run-factory-northline");
  assert.equal(advanced.factoryStage, WORKFLOW_STAGES.AWAITING_PRESCRIPTION_APPROVAL);
  assert.equal(advanced.reason, "Factory advanced this raw listing");
  assert.equal(advanced.reasonCode, D2D_INTAKE_REASON_CODES.FACTORY_ADVANCED);
  assert.equal(held.reasonCode, D2D_INTAKE_REASON_CODES.INSUFFICIENT_SEED_FACTS);
  assert.equal(held.reason, "Missing phone/website; factory will not invent ProspectSeed values");
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
  assert.equal(complete.correlationId, CANONICAL_BIZ1_CORRELATION);
  assert.equal(complete.name, complete.title);
  assert.equal("phone" in sparse, false);
  assert.equal("website" in sparse, false);
  assert.equal("rating" in sparse, false);

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
  assert.equal(normalizedComplete.record.name, complete.name);
  assert.equal(normalizedComplete.record.placeId, complete.placeId);
  assert.notEqual(normalizedComplete.record.d2dBusinessId, complete.googlePlaceId);
  assert.equal(normalizedSparse.record.phone, null);
  assert.equal(normalizedSparse.record.website, null);
  assert.equal(normalizedSparse.record.rating, null);
  assert.equal(normalizedSparse.record.reviewCount, 18);

  const adapters = createIntakeAdapters();
  const qualifier = countingQualifier(createGoldenContractQualifier());
  const result = await acceptD2dIntake({
    payload: request,
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    qualifier,
    mapSeed: goldenContractMapSeed,
    registry: createMemoryIntakeRegistry(),
  });
  assert.equal(result.version, golden.expectedReceipt.version);
  assert.equal(result.campaignId, golden.expectedReceipt.campaignId);
  assert.equal(result.campaignRunId, golden.expectedReceipt.campaignRunId);
  assert.equal(result.exportId, golden.expectedReceipt.exportId);
  assert.equal(result.receipts.length, golden.expectedReceipt.receipts.length);
  for (const [index, expected] of golden.expectedReceipt.receipts.entries()) {
    assert.deepEqual(result.receipts[index], expected);
  }
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
  const qualifier = countingQualifier(createGoldenContractQualifier());
  const result = await acceptD2dIntake({
    payload: request,
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    qualifier,
    mapSeed: goldenContractMapSeed,
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
  assert.equal(result.receipts[1]?.reasonCode, D2D_INTAKE_REASON_CODES.INSUFFICIENT_SEED_FACTS);
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
