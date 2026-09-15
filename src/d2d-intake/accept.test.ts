import assert from "node:assert/strict";
import test from "node:test";
import { acceptD2dIntake } from "./accept.js";
import { D2dIntakeAuthError, D2dIntakeEnvelopeError } from "./errors.js";
import { createMemoryIntakeRegistry } from "./registry.js";
import { WORKFLOW_STAGES, readState } from "../workflow/state.js";
import { runFactory } from "../workflow/orchestrator.js";
import { createFixtureAdapters } from "../workflow/northline.fixture.js";
import {
  D2D_INTAKE_REASON_CODES,
  D2D_INTAKE_STATUSES,
} from "./types.js";
import {
  EXPECTED_NORTHLINE_SEED,
  INTAKE_NOW,
  candidateWith,
  createIntakeAdapters,
  northlineBatch,
} from "./fixture.js";

const SECRET = "test-d2d-intake-secret";

test("accepted D2D prospect runs research and prescription and stops at Human Gate 1", async () => {
  const adapters = createIntakeAdapters();
  const registry = createMemoryIntakeRegistry();
  const result = await acceptD2dIntake({
    payload: northlineBatch(),
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    registry,
    now: INTAKE_NOW,
  });
  assert.equal(result.receipts.length, 1);
  const receipt = result.receipts[0]!;
  assert.equal(receipt.status, D2D_INTAKE_STATUSES.ACCEPTED);
  assert.equal(receipt.factoryRunId, "run-prospect-northline");
  assert.equal(receipt.factoryProspectId, "prospect-northline");
  assert.equal(receipt.factoryStage, WORKFLOW_STAGES.AWAITING_PRESCRIPTION_APPROVAL);
  assert.equal(receipt.campaignId, "campaign-lake-county");
  assert.equal(receipt.campaignRunId, "campaign-run-2026-09-15");
  assert.equal(receipt.exportId, "export-2026-09-15-northline");
  assert.equal(adapters.stats.researchCalls, 1);
  assert.equal(adapters.stats.prescribeCalls, 1);
  assert.equal(adapters.stats.writeCalls, 0);
  assert.deepEqual(adapters.stats.publishKinds, ["prescription"]);

  const state = await readState(await registry.getStateStore(receipt.factoryRunId!));
  assert.ok(state);
  assert.deepEqual(state.seed, EXPECTED_NORTHLINE_SEED);
  assert.equal(state.stage, WORKFLOW_STAGES.AWAITING_PRESCRIPTION_APPROVAL);
  assert.equal(state.writingPackage, null);
  assert.equal(state.publication, null);
  assert.equal(state.writerInvocations, 0);
  assert.equal(state.humanQaTask?.kind, "prescription-gate");
  assert.ok(state.research);
  assert.ok(state.prescription);
  assert.ok(state.prescriptionPackage);
  assert.equal(state.sourceCorrelation?.campaignId, "campaign-lake-county");
  assert.equal(state.sourceCorrelation?.campaignRunId, "campaign-run-2026-09-15");
  assert.equal(state.sourceCorrelation?.exportId, "export-2026-09-15-northline");
  assert.equal(state.sourceCorrelation?.d2dProspectId, "prospect-northline");
});

test("duplicate retry of the same prospect and export returns the same run without repeating model work", async () => {
  const adapters = createIntakeAdapters();
  const registry = createMemoryIntakeRegistry();
  const first = await acceptD2dIntake({
    payload: northlineBatch(),
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    registry,
    now: INTAKE_NOW,
  });
  const second = await acceptD2dIntake({
    payload: northlineBatch(),
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    registry,
    now: INTAKE_NOW,
  });
  assert.equal(first.receipts[0]?.status, D2D_INTAKE_STATUSES.ACCEPTED);
  assert.equal(second.receipts[0]?.status, D2D_INTAKE_STATUSES.DUPLICATE);
  assert.equal(second.receipts[0]?.factoryRunId, first.receipts[0]?.factoryRunId);
  assert.equal(second.receipts[0]?.reasonCode, D2D_INTAKE_REASON_CODES.EXISTING_FACTORY_RUN);
  assert.equal(adapters.stats.researchCalls, 1);
  assert.equal(adapters.stats.prescribeCalls, 1);
  assert.equal(adapters.stats.writeCalls, 0);
});

test("partial batch failure holds the invalid prospect and accepts the rest independently", async () => {
  const adapters = createIntakeAdapters();
  const registry = createMemoryIntakeRegistry();
  const held = candidateWith({
    d2dProspectId: "prospect-held-nap",
    nap: { phone: "" },
  });
  const second = candidateWith({
    d2dProspectId: "prospect-second-door",
  });
  const result = await acceptD2dIntake({
    payload: northlineBatch({
      prospects: [NORTHLINE_FROM_BATCH(), held, second],
    }),
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    registry,
    now: INTAKE_NOW,
  });
  assert.equal(result.receipts.length, 3);
  assert.equal(result.receipts[0]?.status, D2D_INTAKE_STATUSES.ACCEPTED);
  assert.equal(result.receipts[1]?.status, D2D_INTAKE_STATUSES.HELD);
  assert.equal(result.receipts[1]?.reasonCode, D2D_INTAKE_REASON_CODES.MISSING_PHONE);
  assert.equal(result.receipts[1]?.factoryRunId, undefined);
  assert.equal(result.receipts[2]?.status, D2D_INTAKE_STATUSES.ACCEPTED);
  assert.equal(result.receipts[2]?.factoryRunId, "run-prospect-second-door");
  assert.equal(adapters.stats.researchCalls, 2);
  assert.equal(adapters.stats.prescribeCalls, 2);
  assert.equal(adapters.stats.writeCalls, 0);
});

function NORTHLINE_FROM_BATCH() {
  return northlineBatch().prospects[0]!;
}

test("missing or invalid authentication fails closed before resource-spending work", async () => {
  const adapters = createIntakeAdapters();
  const registry = createMemoryIntakeRegistry();
  await assert.rejects(
    () =>
      acceptD2dIntake({
        payload: northlineBatch(),
        presentedToken: SECRET,
        expectedSecret: "",
        adapters,
        registry,
      }),
    (error: unknown) => {
      assert.equal(error instanceof D2dIntakeAuthError, true);
      if (error instanceof D2dIntakeAuthError) {
        assert.equal(error.code, D2D_INTAKE_REASON_CODES.AUTH_NOT_CONFIGURED);
        assert.equal(error.httpStatus, 503);
      }
      return true;
    },
  );
  await assert.rejects(
    () =>
      acceptD2dIntake({
        payload: northlineBatch(),
        expectedSecret: SECRET,
        adapters,
        registry,
      }),
    (error: unknown) => {
      assert.equal(error instanceof D2dIntakeAuthError, true);
      if (error instanceof D2dIntakeAuthError) {
        assert.equal(error.code, D2D_INTAKE_REASON_CODES.AUTH_MISSING);
        assert.equal(error.httpStatus, 401);
      }
      return true;
    },
  );
  await assert.rejects(
    () =>
      acceptD2dIntake({
        payload: northlineBatch(),
        presentedToken: "wrong-token",
        expectedSecret: SECRET,
        adapters,
        registry,
      }),
    (error: unknown) => {
      assert.equal(error instanceof D2dIntakeAuthError, true);
      if (error instanceof D2dIntakeAuthError) {
        assert.equal(error.code, D2D_INTAKE_REASON_CODES.AUTH_INVALID);
        assert.equal(error.httpStatus, 401);
      }
      return true;
    },
  );
  assert.equal(adapters.stats.researchCalls, 0);
  assert.equal(adapters.stats.prescribeCalls, 0);
  assert.equal(adapters.stats.writeCalls, 0);
  assert.deepEqual(adapters.stats.publishKinds, []);
});

test("invalid envelope fails before any prospect work", async () => {
  const adapters = createIntakeAdapters();
  await assert.rejects(
    () =>
      acceptD2dIntake({
        payload: { version: "d2d-factory-intake/v0", prospects: [northlineBatch().prospects[0]] },
        presentedToken: SECRET,
        expectedSecret: SECRET,
        adapters,
        registry: createMemoryIntakeRegistry(),
      }),
    D2dIntakeEnvelopeError,
  );
  assert.equal(adapters.stats.researchCalls, 0);
});

test("transient downstream failure can resume without redoing completed research", async () => {
  const adapters = createIntakeAdapters({ prescribeErrorOnce: { throws: 1 } });
  const registry = createMemoryIntakeRegistry();
  const first = await acceptD2dIntake({
    payload: northlineBatch(),
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    registry,
    now: INTAKE_NOW,
  });
  assert.equal(first.receipts[0]?.status, D2D_INTAKE_STATUSES.RETRYABLE);
  assert.equal(first.receipts[0]?.factoryRunId, "run-prospect-northline");
  assert.equal(adapters.stats.researchCalls, 1);
  assert.equal(adapters.stats.prescribeCalls, 1);
  const stateAfterFail = await readState(await registry.getStateStore("run-prospect-northline"));
  assert.equal(stateAfterFail?.stage, WORKFLOW_STAGES.PRESCRIPTION);
  assert.ok(stateAfterFail?.research);
  assert.equal(stateAfterFail?.prescription, null);

  const second = await acceptD2dIntake({
    payload: northlineBatch(),
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    registry,
    now: INTAKE_NOW,
  });
  assert.equal(second.receipts[0]?.status, D2D_INTAKE_STATUSES.ACCEPTED);
  assert.equal(second.receipts[0]?.factoryRunId, "run-prospect-northline");
  assert.equal(second.receipts[0]?.factoryStage, WORKFLOW_STAGES.AWAITING_PRESCRIPTION_APPROVAL);
  assert.equal(adapters.stats.researchCalls, 1);
  assert.equal(adapters.stats.prescribeCalls, 2);
  assert.equal(adapters.stats.writeCalls, 0);
});

test("intake does not run writer, website-copy publication, or a demo build before approval", async () => {
  const adapters = createIntakeAdapters();
  const registry = createMemoryIntakeRegistry();
  const result = await acceptD2dIntake({
    payload: northlineBatch(),
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    registry,
    now: INTAKE_NOW,
  });
  const state = await readState(await registry.getStateStore(result.receipts[0]!.factoryRunId!));
  assert.equal(state?.stage, WORKFLOW_STAGES.AWAITING_PRESCRIPTION_APPROVAL);
  assert.equal(state?.writingPackage, null);
  assert.equal(state?.publication, null);
  assert.equal(state?.writerInvocations, 0);
  assert.equal(adapters.stats.writeCalls, 0);
  assert.equal(adapters.stats.publishKinds.includes("website_copy"), false);
  assert.equal("websiteBuild" in (state ?? {}), false);
  assert.equal("outreach" in (state ?? {}), false);
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

test("held invalid NAP does not create a factory run", async () => {
  const adapters = createIntakeAdapters();
  const registry = createMemoryIntakeRegistry();
  const result = await acceptD2dIntake({
    payload: northlineBatch({
      prospects: [candidateWith({ nap: { website: "" } })],
    }),
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    registry,
  });
  assert.equal(result.receipts[0]?.status, D2D_INTAKE_STATUSES.HELD);
  assert.equal(result.receipts[0]?.reasonCode, D2D_INTAKE_REASON_CODES.MISSING_WEBSITE);
  assert.equal(result.receipts[0]?.factoryRunId, undefined);
  const state = await readState(await registry.getStateStore("run-prospect-northline"));
  assert.equal(state, null);
  assert.equal(adapters.stats.researchCalls, 0);
});
