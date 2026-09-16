import assert from "node:assert/strict";
import test from "node:test";
import { acceptD2dIntake } from "./accept.js";
import { D2dIntakeAuthError, D2dIntakeEnvelopeError } from "./errors.js";
import { createMemoryIntakeRegistry } from "./registry.js";
import { WORKFLOW_STAGES, readState } from "../workflow/state.js";
import { runFactory } from "../workflow/orchestrator.js";
import { createFixtureAdapters } from "../workflow/northline.fixture.js";
import { createFactoryQualifier } from "../factory/qualify.js";
import {
  D2D_INTAKE_REASON_CODES,
  D2D_TRANSPORT_STATUSES,
  FACTORY_QUALIFICATION_OUTCOMES,
  intakeCorrelationId,
} from "./types.js";
import {
  EXPECTED_NORTHLINE_SEED,
  INTAKE_NOW,
  NORTHLINE_CORRELATION_ID,
  NORTHLINE_EXPORT_ID,
  NORTHLINE_RAW,
  SEEDABLE_HVAC_RAW,
  countingQualifier,
  createIntakeAdapters,
  northlineBatch,
  rawWith,
} from "./fixture.js";
import { factoryProspectId } from "./map.js";
import { normalizeRawBusiness } from "./normalize.js";

const SECRET = "test-d2d-intake-secret";

function northlineProspectId(): string {
  const normalized = normalizeRawBusiness(NORTHLINE_RAW);
  assert.equal(normalized.status, "normalized");
  if (normalized.status !== "normalized") return "";
  return factoryProspectId(normalized.record);
}

function exportBatch(input: {
  readonly exportId: string;
  readonly campaignRunId: string;
  readonly business?: Record<string, unknown>;
}) {
  const business = input.business ?? { ...NORTHLINE_RAW };
  const sourceBusinessId = String(business.sourceBusinessId ?? "src-northline");
  return {
    ...northlineBatch({
      exportId: input.exportId,
      businesses: [
        {
          ...business,
          correlationId: intakeCorrelationId({ sourceBusinessId, exportId: input.exportId }),
        },
      ],
    }),
    campaignRunId: input.campaignRunId,
  };
}

test("advanced raw business maps to downstream workflow, preserves source correlation, and stops at Human Gate 1", async () => {
  const adapters = createIntakeAdapters();
  const qualifier = countingQualifier();
  const registry = createMemoryIntakeRegistry();
  const result = await acceptD2dIntake({
    payload: northlineBatch(),
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    qualifier,
    registry,
    now: INTAKE_NOW,
  });
  const receipt = result.receipts[0]!;
  assert.equal(result.receipts.length, 1);
  assert.equal(receipt.status, D2D_TRANSPORT_STATUSES.RECEIVED);
  assert.equal(receipt.qualification?.outcome, FACTORY_QUALIFICATION_OUTCOMES.ADVANCED);
  assert.equal(receipt.factoryRunId, `run-${northlineProspectId()}`);
  assert.equal(receipt.factoryStage, WORKFLOW_STAGES.AWAITING_PRESCRIPTION_APPROVAL);
  assert.equal(receipt.d2dProspectId, "d2d-prospect-northline");
  assert.equal(receipt.sourceBusinessId, "src-northline");
  assert.equal(receipt.campaignId, "campaign-lake-county");
  assert.equal(receipt.exportId, "export-2026-09-15-northline");
  assert.equal(receipt.correlationId, "src-northline::export-2026-09-15-northline::d2d-factory-intake/v1");
  assert.equal(qualifier.calls, 1);
  assert.equal(adapters.stats.researchCalls, 1);
  assert.equal(adapters.stats.prescribeCalls, 1);
  assert.equal(adapters.stats.writeCalls, 0);

  const state = await readState(await registry.getStateStore(receipt.factoryRunId!));
  assert.ok(state);
  assert.deepEqual(state.seed, EXPECTED_NORTHLINE_SEED);
  assert.equal(state.sourceCorrelation?.d2dProspectId, "d2d-prospect-northline");
  assert.equal(state.sourceCorrelation?.sourceBusinessId, "src-northline");
  assert.equal(state.sourceCorrelation?.d2dBusinessId, "src-northline");
  assert.equal(state.sourceCorrelation?.placeId, "ChIJ-northline");
  assert.equal(state.sourceCorrelation?.campaignRunId, "campaign-run-2026-09-15");
  assert.equal(state.sourceCorrelation?.coordinates?.lat, 41.901);
  assert.equal(state.sourceCorrelation?.apify?.runId, "apify-run-northline");
  assert.equal(state.sourceCorrelation?.campaign?.radiusMiles, 5);
  assert.equal(state.sourceCorrelation?.factoryQualificationOutcome, "advanced");
  assert.equal(state.writingPackage, null);
  assert.equal(state.writerInvocations, 0);
});

test("raw record without phone is received and evaluated without fabricated values or research", async () => {
  const adapters = createIntakeAdapters();
  const qualifier = countingQualifier();
  const result = await acceptD2dIntake({
    payload: northlineBatch({ businesses: [rawWith({ phone: "" })] }),
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    qualifier,
    registry: createMemoryIntakeRegistry(),
  });
  const receipt = result.receipts[0]!;
  assert.equal(receipt.status, D2D_TRANSPORT_STATUSES.RECEIVED);
  assert.equal(receipt.qualification?.outcome, FACTORY_QUALIFICATION_OUTCOMES.HELD);
  assert.equal(receipt.qualification?.reasonCode, D2D_INTAKE_REASON_CODES.MISSING_PHONE);
  assert.equal(receipt.factoryRunId, undefined);
  assert.equal(qualifier.calls, 1);
  assert.equal(adapters.stats.researchCalls, 0);
  assert.equal(adapters.stats.prescribeCalls, 0);
  assert.equal(adapters.stats.writeCalls, 0);
  assert.match(receipt.reason ?? "", /not invented/i);
});

test("inherited qualification conclusions cannot drive advancement", async () => {
  const adapters = createIntakeAdapters();
  const qualifier = countingQualifier();
  const result = await acceptD2dIntake({
    payload: northlineBatch({
      businesses: [rawWith({ qualification: { classification: "qualified" } })],
    }),
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    qualifier,
    registry: createMemoryIntakeRegistry(),
  });
  const receipt = result.receipts[0]!;
  assert.equal(receipt.status, D2D_TRANSPORT_STATUSES.INVALID);
  assert.equal(receipt.reasonCode, D2D_INTAKE_REASON_CODES.INHERITED_CONCLUSION);
  assert.equal(receipt.qualification, null);
  assert.equal(qualifier.calls, 0);
  assert.equal(adapters.stats.researchCalls, 0);
});

test("factory qualifier/selection path is invoked once, not duplicated in intake", async () => {
  const adapters = createIntakeAdapters();
  const alwaysReject = countingQualifier({
    provider: "test",
    model: "always-reject",
    async qualify() {
      return {
        outcome: FACTORY_QUALIFICATION_OUTCOMES.REJECTED,
        reasonCode: D2D_INTAKE_REASON_CODES.EXCLUDED_CATEGORY,
        reason: "Fixture qualifier rejected independently of D2D labels.",
      };
    },
  });
  const complete = await acceptD2dIntake({
    payload: northlineBatch(),
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    qualifier: alwaysReject,
    registry: createMemoryIntakeRegistry(),
  });
  assert.equal(complete.receipts[0]?.qualification?.outcome, FACTORY_QUALIFICATION_OUTCOMES.REJECTED);
  assert.equal(alwaysReject.calls, 1);
  assert.equal(adapters.stats.researchCalls, 0);

  const once = countingQualifier(createFactoryQualifier());
  const registry = createMemoryIntakeRegistry();
  await acceptD2dIntake({
    payload: northlineBatch(),
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    qualifier: once,
    registry,
  });
  await acceptD2dIntake({
    payload: northlineBatch(),
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    qualifier: once,
    registry,
  });
  assert.equal(once.calls, 1);
});

test("not-advanced business causes zero research, prescription, or writer calls", async () => {
  const adapters = createIntakeAdapters();
  const result = await acceptD2dIntake({
    payload: northlineBatch({
      businesses: [rawWith({ category: "mold remediation", categories: ["mold remediation"] })],
    }),
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    registry: createMemoryIntakeRegistry(),
  });
  assert.equal(result.receipts[0]?.qualification?.outcome, FACTORY_QUALIFICATION_OUTCOMES.REJECTED);
  assert.equal(adapters.stats.researchCalls, 0);
  assert.equal(adapters.stats.prescribeCalls, 0);
  assert.equal(adapters.stats.writeCalls, 0);
});

test("duplicate retry does not repeat qualification or later model work", async () => {
  const adapters = createIntakeAdapters();
  const qualifier = countingQualifier();
  const registry = createMemoryIntakeRegistry();
  const first = await acceptD2dIntake({
    payload: northlineBatch(),
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    qualifier,
    registry,
    now: INTAKE_NOW,
  });
  const second = await acceptD2dIntake({
    payload: northlineBatch(),
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    qualifier,
    registry,
    now: INTAKE_NOW,
  });
  assert.equal(first.receipts[0]?.qualification?.outcome, FACTORY_QUALIFICATION_OUTCOMES.ADVANCED);
  assert.equal(second.receipts[0]?.status, D2D_TRANSPORT_STATUSES.DUPLICATE);
  assert.equal(second.receipts[0]?.factoryRunId, first.receipts[0]?.factoryRunId);
  assert.equal(qualifier.calls, 1);
  assert.equal(adapters.stats.researchCalls, 1);
  assert.equal(adapters.stats.prescribeCalls, 1);
});

test("same payload/same export retried twice is duplicate and qualifier/model work runs once", async () => {
  const adapters = createIntakeAdapters();
  const qualifier = countingQualifier();
  const registry = createMemoryIntakeRegistry();
  const payload = northlineBatch();
  const first = await acceptD2dIntake({
    payload,
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    qualifier,
    registry,
    now: INTAKE_NOW,
  });
  const second = await acceptD2dIntake({
    payload,
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    qualifier,
    registry,
    now: INTAKE_NOW,
  });
  assert.equal(first.receipts[0]?.status, D2D_TRANSPORT_STATUSES.RECEIVED);
  assert.equal(first.receipts[0]?.correlationId, NORTHLINE_CORRELATION_ID);
  assert.equal(first.receipts[0]?.exportId, NORTHLINE_EXPORT_ID);
  assert.equal(second.receipts[0]?.status, D2D_TRANSPORT_STATUSES.DUPLICATE);
  assert.equal(second.receipts[0]?.correlationId, NORTHLINE_CORRELATION_ID);
  assert.equal(second.receipts[0]?.exportId, NORTHLINE_EXPORT_ID);
  assert.equal(second.receipts[0]?.factoryRunId, first.receipts[0]?.factoryRunId);
  assert.equal(qualifier.calls, 1);
  assert.equal(adapters.stats.researchCalls, 1);
  assert.equal(adapters.stats.prescribeCalls, 1);
  assert.equal(adapters.stats.writeCalls, 0);
});

test("same sourceBusinessId in a new export is a new intake identity and is qualified once per export", async () => {
  const adapters = createIntakeAdapters();
  const qualifier = countingQualifier();
  const registry = createMemoryIntakeRegistry();
  const firstExportId = NORTHLINE_EXPORT_ID;
  const secondExportId = "export-2026-09-16-second";
  const first = await acceptD2dIntake({
    payload: exportBatch({
      exportId: firstExportId,
      campaignRunId: "campaign-run-2026-09-15",
      business: { ...SEEDABLE_HVAC_RAW },
    }),
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    qualifier,
    registry,
  });
  const second = await acceptD2dIntake({
    payload: exportBatch({
      exportId: secondExportId,
      campaignRunId: "campaign-run-2026-09-16",
      business: { ...SEEDABLE_HVAC_RAW },
    }),
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    qualifier,
    registry,
  });
  const firstReceipt = first.receipts[0]!;
  const secondReceipt = second.receipts[0]!;
  const firstCorrelation = intakeCorrelationId({
    sourceBusinessId: "src-harbor-hvac",
    exportId: firstExportId,
  });
  const secondCorrelation = intakeCorrelationId({
    sourceBusinessId: "src-harbor-hvac",
    exportId: secondExportId,
  });
  assert.equal(firstReceipt.status, D2D_TRANSPORT_STATUSES.RECEIVED);
  assert.equal(secondReceipt.status, D2D_TRANSPORT_STATUSES.RECEIVED);
  assert.notEqual(secondReceipt.status, D2D_TRANSPORT_STATUSES.DUPLICATE);
  assert.equal(firstReceipt.sourceBusinessId, "src-harbor-hvac");
  assert.equal(secondReceipt.sourceBusinessId, "src-harbor-hvac");
  assert.equal(firstReceipt.campaignRunId, "campaign-run-2026-09-15");
  assert.equal(secondReceipt.campaignRunId, "campaign-run-2026-09-16");
  assert.equal(firstReceipt.exportId, firstExportId);
  assert.equal(secondReceipt.exportId, secondExportId);
  assert.equal(firstReceipt.correlationId, firstCorrelation);
  assert.equal(secondReceipt.correlationId, secondCorrelation);
  assert.equal(qualifier.calls, 2);
  assert.equal(adapters.stats.researchCalls, 0);
  assert.equal(adapters.stats.prescribeCalls, 0);
  assert.equal(adapters.stats.writeCalls, 0);
});

test("business status lookup returns latest receipt without collapsing per-correlation identity", async () => {
  const adapters = createIntakeAdapters();
  const qualifier = countingQualifier();
  const registry = createMemoryIntakeRegistry();
  const firstExportId = NORTHLINE_EXPORT_ID;
  const secondExportId = "export-2026-09-16-second";
  const firstCorrelation = intakeCorrelationId({
    sourceBusinessId: "src-harbor-hvac",
    exportId: firstExportId,
  });
  const secondCorrelation = intakeCorrelationId({
    sourceBusinessId: "src-harbor-hvac",
    exportId: secondExportId,
  });
  await acceptD2dIntake({
    payload: exportBatch({
      exportId: firstExportId,
      campaignRunId: "campaign-run-2026-09-15",
      business: { ...SEEDABLE_HVAC_RAW },
    }),
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    qualifier,
    registry,
  });
  await acceptD2dIntake({
    payload: exportBatch({
      exportId: secondExportId,
      campaignRunId: "campaign-run-2026-09-16",
      business: { ...SEEDABLE_HVAC_RAW },
    }),
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    qualifier,
    registry,
  });
  const latest = await registry.getReceiptByBusiness("src-harbor-hvac");
  const firstStored = await registry.getReceipt(firstCorrelation);
  const secondStored = await registry.getReceipt(secondCorrelation);
  assert.equal(latest?.exportId, secondExportId);
  assert.equal(latest?.campaignRunId, "campaign-run-2026-09-16");
  assert.equal(latest?.correlationId, secondCorrelation);
  assert.equal(firstStored?.status, D2D_TRANSPORT_STATUSES.RECEIVED);
  assert.equal(firstStored?.exportId, firstExportId);
  assert.equal(firstStored?.correlationId, firstCorrelation);
  assert.equal(secondStored?.status, D2D_TRANSPORT_STATUSES.RECEIVED);
  assert.equal(secondStored?.exportId, secondExportId);
  const retryFirst = await acceptD2dIntake({
    payload: exportBatch({
      exportId: firstExportId,
      campaignRunId: "campaign-run-2026-09-15",
      business: { ...SEEDABLE_HVAC_RAW },
    }),
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    qualifier,
    registry,
  });
  assert.equal(retryFirst.receipts[0]?.status, D2D_TRANSPORT_STATUSES.DUPLICATE);
  assert.equal(retryFirst.receipts[0]?.correlationId, firstCorrelation);
  assert.equal(retryFirst.receipts[0]?.exportId, firstExportId);
  assert.equal(qualifier.calls, 2);
  const latestAfterRetry = await registry.getReceiptByBusiness("src-harbor-hvac");
  assert.equal(latestAfterRetry?.correlationId, secondCorrelation);
  assert.equal(latestAfterRetry?.exportId, secondExportId);
  assert.equal((await registry.getReceipt(firstCorrelation))?.status, D2D_TRANSPORT_STATUSES.RECEIVED);
  assert.equal((await registry.getReceipt(secondCorrelation))?.status, D2D_TRANSPORT_STATUSES.RECEIVED);
});

test("operator-sized ~40-item raw batch is contract-valid with per-item isolation and no 7-item cap", async () => {
  const adapters = createIntakeAdapters();
  const qualifier = countingQualifier();
  const businesses: unknown[] = [];
  for (let index = 0; index < 37; index += 1) {
    businesses.push(
      rawWith({
        placeId: `place-held-${index}`,
        d2dProspectId: `d2d-held-${index}`,
        sourceBusinessId: `src-held-${index}`,
        campaignBusinessId: `campaign-held-${index}`,
        d2dBusinessId: `src-held-${index}`,
        phone: "",
        apify: {
          provider: "apify",
          actor: "compass~crawler-google-places",
          runId: "apify-run-northline",
          datasetId: "ds-northline",
          itemId: `item-held-${index}`,
        },
      }),
    );
  }
  businesses.push(
    rawWith({
      d2dProspectId: "",
      sourceBusinessId: "",
      campaignBusinessId: "",
      placeId: "",
      googlePlaceId: "",
      cid: "",
      mapsUrl: "",
      googleMapsUrl: "",
      googleUrl: "",
      url: "",
      name: "No Identity Listing",
      apify: {},
    }),
  );
  businesses.push(
    rawWith({
      placeId: "place-inherited",
      d2dProspectId: "d2d-inherited",
      sourceBusinessId: "src-inherited",
      d2dBusinessId: "src-inherited",
      qualification: { classification: "qualified" },
    }),
  );
  businesses.push(NORTHLINE_RAW);
  assert.equal(businesses.length, 40);

  const result = await acceptD2dIntake({
    payload: northlineBatch({ businesses }),
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    qualifier,
    registry: createMemoryIntakeRegistry(),
    now: INTAKE_NOW,
  });
  assert.equal(result.receipts.length, 40);
  assert.equal(result.receipts.filter((item) => item.status === D2D_TRANSPORT_STATUSES.RECEIVED).length, 38);
  assert.equal(result.receipts.filter((item) => item.status === D2D_TRANSPORT_STATUSES.INVALID).length, 2);
  assert.equal(
    result.receipts.filter((item) => item.qualification?.outcome === FACTORY_QUALIFICATION_OUTCOMES.ADVANCED).length,
    1,
  );
  assert.equal(qualifier.calls, 38);
  assert.equal(adapters.stats.researchCalls, 1);
  assert.equal(adapters.stats.writeCalls, 0);
});

test("missing or invalid authentication fails closed before resource-spending work", async () => {
  const adapters = createIntakeAdapters();
  const qualifier = countingQualifier();
  const registry = createMemoryIntakeRegistry();
  await assert.rejects(
    () =>
      acceptD2dIntake({
        payload: northlineBatch(),
        presentedToken: SECRET,
        expectedSecret: "",
        adapters,
        qualifier,
        registry,
      }),
    D2dIntakeAuthError,
  );
  await assert.rejects(
    () =>
      acceptD2dIntake({
        payload: northlineBatch(),
        expectedSecret: SECRET,
        adapters,
        qualifier,
        registry,
      }),
    D2dIntakeAuthError,
  );
  await assert.rejects(
    () =>
      acceptD2dIntake({
        payload: northlineBatch(),
        presentedToken: "wrong-token",
        expectedSecret: SECRET,
        adapters,
        qualifier,
        registry,
      }),
    D2dIntakeAuthError,
  );
  assert.equal(qualifier.calls, 0);
  assert.equal(adapters.stats.researchCalls, 0);
});

test("invalid envelope fails before any business work", async () => {
  const adapters = createIntakeAdapters();
  const qualifier = countingQualifier();
  await assert.rejects(
    () =>
      acceptD2dIntake({
        payload: { version: "d2d-factory-intake/v0", businesses: [NORTHLINE_RAW] },
        presentedToken: SECRET,
        expectedSecret: SECRET,
        adapters,
        qualifier,
        registry: createMemoryIntakeRegistry(),
      }),
    D2dIntakeEnvelopeError,
  );
  assert.equal(qualifier.calls, 0);
  assert.equal(adapters.stats.researchCalls, 0);
});

test("transient downstream failure can resume without redoing qualification or research", async () => {
  const adapters = createIntakeAdapters({ prescribeErrorOnce: { throws: 1 } });
  const qualifier = countingQualifier();
  const registry = createMemoryIntakeRegistry();
  const first = await acceptD2dIntake({
    payload: northlineBatch(),
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    qualifier,
    registry,
    now: INTAKE_NOW,
  });
  assert.equal(first.receipts[0]?.status, D2D_TRANSPORT_STATUSES.RETRYABLE);
  assert.equal(qualifier.calls, 1);
  assert.equal(adapters.stats.researchCalls, 1);
  const second = await acceptD2dIntake({
    payload: northlineBatch(),
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    qualifier,
    registry,
    now: INTAKE_NOW,
  });
  assert.equal(second.receipts[0]?.status, D2D_TRANSPORT_STATUSES.RECEIVED);
  assert.equal(second.receipts[0]?.qualification?.outcome, FACTORY_QUALIFICATION_OUTCOMES.ADVANCED);
  assert.equal(second.receipts[0]?.factoryStage, WORKFLOW_STAGES.AWAITING_PRESCRIPTION_APPROVAL);
  assert.equal(qualifier.calls, 1);
  assert.equal(adapters.stats.researchCalls, 1);
  assert.equal(adapters.stats.prescribeCalls, 2);
});

test("existing factory can continue from the intake store after Human Gate 1 approval", async () => {
  const intakeAdapters = createIntakeAdapters();
  const registry = createMemoryIntakeRegistry();
  const intake = await acceptD2dIntake({
    payload: northlineBatch(),
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters: intakeAdapters,
    registry,
    now: INTAKE_NOW,
  });
  const store = await registry.getStateStore(intake.receipts[0]!.factoryRunId!);
  const continuedAdapters = createFixtureAdapters();
  const continued = await runFactory({
    seed: EXPECTED_NORTHLINE_SEED,
    adapters: continuedAdapters,
    stateStore: store,
    prescriptionApproval: {
      status: "approved",
      approvedAt: "2026-09-15",
      approvedBy: "fixture-human",
    },
  });
  assert.equal(continued.state.stage, WORKFLOW_STAGES.AWAITING_COPY_QA);
  assert.equal(continuedAdapters.stats.writeCalls, 1);
  assert.equal(intakeAdapters.stats.writeCalls, 0);
});

test("seedable-but-not-qualified business causes zero research, prescription, or writer calls", async () => {
  const adapters = createIntakeAdapters();
  const qualifier = countingQualifier();
  const result = await acceptD2dIntake({
    payload: northlineBatch({ businesses: [SEEDABLE_HVAC_RAW] }),
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    qualifier,
    registry: createMemoryIntakeRegistry(),
  });
  const receipt = result.receipts[0]!;
  assert.equal(receipt.status, D2D_TRANSPORT_STATUSES.RECEIVED);
  assert.equal(receipt.qualification?.outcome, FACTORY_QUALIFICATION_OUTCOMES.HELD);
  assert.equal(receipt.qualification?.reasonCode, D2D_INTAKE_REASON_CODES.SEARCH_MISMATCH);
  assert.equal(receipt.factoryRunId, undefined);
  assert.equal(receipt.d2dProspectId, "d2d-prospect-harbor-hvac");
  assert.equal(qualifier.calls, 1);
  assert.equal(adapters.stats.researchCalls, 0);
  assert.equal(adapters.stats.prescribeCalls, 0);
  assert.equal(adapters.stats.writeCalls, 0);
});

