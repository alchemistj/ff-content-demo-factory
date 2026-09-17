import assert from "node:assert/strict";
import test from "node:test";
import { acceptD2dIntake } from "./accept.js";
import { createEnvFactoryAdapters, envAdapterConfigured } from "./env-adapters.js";
import { createMemoryIntakeRegistry } from "./registry.js";
import { intakeHealthReport } from "./runtime.js";
import {
  D2D_INTAKE_ADAPTERS_MODULE_ENV,
  D2D_INTAKE_REASON_CODES,
  D2D_TRANSPORT_STATUSES,
  FACTORY_QUALIFICATION_OUTCOMES,
} from "./types.js";
import { WorkflowError, type WriterAssignment } from "../workflow/types.js";
import { northlineResearchRecord } from "../workflow/northline.fixture.js";
import { countingQualifier, northlineBatch, rawWith } from "./fixture.js";

const SECRET = "test-env-adapter-secret";

const PROVIDER_AND_KEY: NodeJS.ProcessEnv = {
  FACTORY_RESEARCH_PROVIDER: "openai",
  FACTORY_MODEL_API_KEY: "sk-test-not-for-network",
};

const FULLY_CONFIGURED: NodeJS.ProcessEnv = {
  FACTORY_RESEARCH_PROVIDER: "openai",
  FACTORY_RESEARCH_MODEL: "gpt-test",
  FACTORY_MODEL_API_KEY: "sk-test-not-for-network",
};

function unusedCompleteJson() {
  const stats = { calls: 0 };
  return {
    stats,
    completeJson: async () => {
      stats.calls += 1;
      throw new Error("completeJson/network must not be invoked");
    },
  };
}

test("provider+key without model reports research and prescription not-ready", () => {
  assert.equal(envAdapterConfigured(PROVIDER_AND_KEY, "research"), false);
  assert.equal(envAdapterConfigured(PROVIDER_AND_KEY, "prescription"), false);
  const health = intakeHealthReport(PROVIDER_AND_KEY);
  assert.equal(health.ready.researchAdapter, false);
  assert.equal(health.ready.prescriptionAdapter, false);

  const blankModel = { ...PROVIDER_AND_KEY, FACTORY_RESEARCH_MODEL: "   " };
  assert.equal(envAdapterConfigured(blankModel, "research"), false);
  const literal = { ...PROVIDER_AND_KEY, FACTORY_RESEARCH_MODEL: "unconfigured" };
  assert.equal(envAdapterConfigured(literal, "research"), false);
  assert.equal(envAdapterConfigured(literal, "prescription"), false);
});

test("fully configured env remains ready; missing model does not", () => {
  assert.equal(envAdapterConfigured(FULLY_CONFIGURED, "research"), true);
  assert.equal(envAdapterConfigured(FULLY_CONFIGURED, "prescription"), true);
  const health = intakeHealthReport(FULLY_CONFIGURED);
  assert.equal(health.ready.researchAdapter, true);
  assert.equal(health.ready.prescriptionAdapter, true);

  const researchOnlyModelMissing = {
    FACTORY_RESEARCH_PROVIDER: "openai",
    FACTORY_PRESCRIPTION_PROVIDER: "openai",
    FACTORY_PRESCRIPTION_MODEL: "gpt-prescription",
    FACTORY_MODEL_API_KEY: "sk-test-not-for-network",
  };
  assert.equal(envAdapterConfigured(researchOnlyModelMissing, "research"), false);
  assert.equal(envAdapterConfigured(researchOnlyModelMissing, "prescription"), true);
});

test("prescription readiness falls back to research provider and model", () => {
  assert.equal(envAdapterConfigured(FULLY_CONFIGURED, "prescription"), true);
  const adapters = createEnvFactoryAdapters(FULLY_CONFIGURED);
  assert.equal(adapters.researcher.provider, "openai");
  assert.equal(adapters.researcher.model, "gpt-test");
  assert.equal(adapters.prescriber.provider, "openai");
  assert.equal(adapters.prescriber.model, "gpt-test");

  const explicitPrescription = createEnvFactoryAdapters({
    ...FULLY_CONFIGURED,
    FACTORY_PRESCRIPTION_PROVIDER: "anthropic",
    FACTORY_PRESCRIPTION_MODEL: "claude-test",
  });
  assert.equal(explicitPrescription.prescriber.provider, "anthropic");
  assert.equal(explicitPrescription.prescriber.model, "claude-test");
  assert.equal(explicitPrescription.researcher.provider, "openai");
  assert.equal(explicitPrescription.researcher.model, "gpt-test");
  assert.equal(
    envAdapterConfigured(
      {
        FACTORY_RESEARCH_PROVIDER: "openai",
        FACTORY_RESEARCH_MODEL: "gpt-test",
        FACTORY_MODEL_API_KEY: "sk-test-not-for-network",
      },
      "prescription",
    ),
    true,
  );
});

async function assertPartialPrescriptionOverrideFailsClosed(env: NodeJS.ProcessEnv): Promise<void> {
  assert.equal(envAdapterConfigured(env, "research"), true);
  assert.equal(envAdapterConfigured(env, "prescription"), false);
  const health = intakeHealthReport(env);
  assert.equal(health.ready.researchAdapter, true);
  assert.equal(health.ready.prescriptionAdapter, false);

  const spy = unusedCompleteJson();
  const adapters = createEnvFactoryAdapters(env, { completeJson: spy.completeJson });
  assert.equal(adapters.prescriber.provider, "unconfigured");
  assert.equal(adapters.prescriber.model, "unconfigured");
  await assert.rejects(
    () =>
      adapters.prescriber.prescribe({
        research: northlineResearchRecord(),
        instructions: "",
        authority: "",
      }),
    (error: unknown) =>
      error instanceof WorkflowError &&
      error.code === D2D_INTAKE_REASON_CODES.FACTORY_ADAPTERS_UNCONFIGURED,
  );
  assert.equal(spy.stats.calls, 0);
}

test("provider-only prescription override is not ready and does not call completeJson", async () => {
  await assertPartialPrescriptionOverrideFailsClosed({
    ...FULLY_CONFIGURED,
    FACTORY_PRESCRIPTION_PROVIDER: "anthropic",
  });
});

test("model-only prescription override is not ready and does not call completeJson", async () => {
  await assertPartialPrescriptionOverrideFailsClosed({
    ...FULLY_CONFIGURED,
    FACTORY_PRESCRIPTION_MODEL: "claude-test",
  });
});

test("advanced path with provider+key but no model fails before completeJson", async () => {
  const spy = unusedCompleteJson();
  const adapters = createEnvFactoryAdapters(PROVIDER_AND_KEY, { completeJson: spy.completeJson });
  await assert.rejects(
    () => adapters.researcher.research({ seed: northlineBatch() as never, instructions: "", authority: "" }),
    (error: unknown) =>
      error instanceof WorkflowError &&
      error.code === D2D_INTAKE_REASON_CODES.FACTORY_ADAPTERS_UNCONFIGURED &&
      /FACTORY_RESEARCH_MODEL/.test(error.message),
  );
  assert.equal(spy.stats.calls, 0);

  const literalModel = unusedCompleteJson();
  const unconfiguredModelAdapters = createEnvFactoryAdapters(
    { ...PROVIDER_AND_KEY, FACTORY_RESEARCH_MODEL: "unconfigured" },
    { completeJson: literalModel.completeJson },
  );
  const result = await acceptD2dIntake({
    payload: northlineBatch(),
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters: unconfiguredModelAdapters,
    qualifier: countingQualifier(),
    registry: createMemoryIntakeRegistry(),
  });
  assert.equal(result.receipts[0]?.status, D2D_TRANSPORT_STATUSES.RETRYABLE);
  assert.equal(result.receipts[0]?.reasonCode, D2D_INTAKE_REASON_CODES.TRANSIENT_FACTORY_FAILURE);
  assert.match(result.receipts[0]?.reason ?? "", /required for advanced intake/);
  assert.equal(literalModel.stats.calls, 0);
});

test("held and rejected records stay provider-free when model is missing", async () => {
  const spy = unusedCompleteJson();
  const adapters = createEnvFactoryAdapters(PROVIDER_AND_KEY, { completeJson: spy.completeJson });
  const held = await acceptD2dIntake({
    payload: northlineBatch({ businesses: [rawWith({ phone: "" })] }),
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    qualifier: countingQualifier(),
    registry: createMemoryIntakeRegistry(),
  });
  assert.equal(held.receipts[0]?.status, D2D_TRANSPORT_STATUSES.RECEIVED);
  assert.equal(held.receipts[0]?.qualification?.outcome, FACTORY_QUALIFICATION_OUTCOMES.HELD);
  assert.equal(held.receipts[0]?.factoryRunId, undefined);
  assert.equal(spy.stats.calls, 0);

  const rejectedSpy = unusedCompleteJson();
  const rejectedAdapters = createEnvFactoryAdapters(PROVIDER_AND_KEY, { completeJson: rejectedSpy.completeJson });
  const rejected = await acceptD2dIntake({
    payload: northlineBatch(),
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters: rejectedAdapters,
    qualifier: countingQualifier({
      provider: "test",
      model: "always-reject",
      async qualify() {
        return {
          outcome: FACTORY_QUALIFICATION_OUTCOMES.REJECTED,
          reasonCode: D2D_INTAKE_REASON_CODES.EXCLUDED_CATEGORY,
          reason: "Fixture qualifier rejected independently of adapter config.",
        };
      },
    }),
    registry: createMemoryIntakeRegistry(),
  });
  assert.equal(rejected.receipts[0]?.qualification?.outcome, FACTORY_QUALIFICATION_OUTCOMES.REJECTED);
  assert.equal(rejectedSpy.stats.calls, 0);
});

test("D2D_INTAKE_ADAPTERS_MODULE stays unused by env adapters and writer is forbidden before Gate 1", async () => {
  const spy = unusedCompleteJson();
  const adapters = createEnvFactoryAdapters(
    {
      ...FULLY_CONFIGURED,
      [D2D_INTAKE_ADAPTERS_MODULE_ENV]: "/tmp/does-not-exist-factory-adapters.mjs",
    },
    { completeJson: spy.completeJson },
  );
  assert.equal(adapters.writer.provider, "forbidden");
  assert.equal(adapters.writer.model, "forbidden-before-gate-1");
  await assert.rejects(
    () => adapters.writer.writeCompletePackage({} as WriterAssignment),
    (error: unknown) =>
      error instanceof WorkflowError &&
      error.code === D2D_INTAKE_REASON_CODES.WRITER_BEFORE_GATE_FORBIDDEN,
  );
  assert.equal(spy.stats.calls, 0);
  assert.equal(adapters.researcher.provider, "openai");
  assert.equal(adapters.researcher.model, "gpt-test");
});
