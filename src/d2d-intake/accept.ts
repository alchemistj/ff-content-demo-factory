import { createUnconfiguredPublisher } from "../publisher/index.js";
import { runFactory } from "../workflow/orchestrator.js";
import {
  WORKFLOW_STAGES,
  createInitialState,
  readState,
  writeState,
  type WorkflowState,
} from "../workflow/state.js";
import { WorkflowError, type FactoryAdapters, type WriterAdapter } from "../workflow/types.js";
import type { GoogleDocsPublisher } from "../publisher/types.js";
import type { WritingPackage } from "../writing-package/types.js";
import { assertD2dIntakeAuth } from "./auth.js";
import { D2dIntakeAuthError } from "./errors.js";
import { mapD2dProspectToSeed, parseD2dIntakeBatch } from "./map.js";
import type { D2dIntakeRegistry } from "./registry.js";
import {
  D2D_FACTORY_INTAKE_VERSION,
  D2D_INTAKE_REASON_CODES,
  D2D_INTAKE_STATUSES,
  intakeCorrelationId,
  type D2dIntakeBatch,
  type D2dIntakeBatchReceipt,
  type D2dIntakeReasonCode,
  type D2dProspectReceipt,
  type D2dProspectCandidate,
} from "./types.js";

export interface D2dIntakeInput {
  readonly payload: unknown;
  readonly presentedToken?: string;
  readonly expectedSecret?: string;
  readonly adapters: FactoryAdapters;
  readonly registry: D2dIntakeRegistry;
  readonly now?: Date;
  readonly repoRoot?: string;
}

export async function acceptD2dIntake(input: D2dIntakeInput): Promise<D2dIntakeBatchReceipt> {
  assertD2dIntakeAuth({
    ...(input.presentedToken !== undefined ? { presentedToken: input.presentedToken } : {}),
    ...(input.expectedSecret !== undefined ? { expectedSecret: input.expectedSecret } : {}),
  });
  const batch = parseD2dIntakeBatch(input.payload);
  const adapters = gate1Adapters(input.adapters);
  const receipts: D2dProspectReceipt[] = [];
  for (const candidate of batch.prospects) {
    try {
      receipts.push(await acceptOneProspect(candidate, batch, adapters, input));
    } catch (error) {
      const d2dProspectId = isCandidate(candidate) ? String(candidate.d2dProspectId ?? "") : "";
      receipts.push({
        version: D2D_FACTORY_INTAKE_VERSION,
        status: D2D_INTAKE_STATUSES.RETRYABLE,
        d2dProspectId,
        campaignId: batch.campaignId,
        campaignRunId: batch.campaignRunId,
        exportId: batch.exportId,
        correlationId: intakeCorrelationId({
          d2dProspectId: d2dProspectId || "unknown",
          exportId: batch.exportId,
        }),
        reason: error instanceof Error ? error.message : "Prospect intake failed independently",
        reasonCode: D2D_INTAKE_REASON_CODES.TRANSIENT_FACTORY_FAILURE,
      });
    }
  }
  return {
    version: D2D_FACTORY_INTAKE_VERSION,
    campaignId: batch.campaignId,
    campaignRunId: batch.campaignRunId,
    exportId: batch.exportId,
    receipts,
  };
}

async function acceptOneProspect(
  candidate: unknown,
  batch: D2dIntakeBatch,
  adapters: FactoryAdapters,
  input: D2dIntakeInput,
): Promise<D2dProspectReceipt> {
  const mapped = mapD2dProspectToSeed(candidate, batch);
  if (mapped.status === "held") {
    const d2dProspectId =
      mapped.d2dProspectId ||
      (isCandidate(candidate) ? String(candidate.d2dProspectId ?? "") : "");
    return heldReceipt(batch, d2dProspectId, mapped.reasonCode, mapped.reason);
  }

  const { seed, correlation } = mapped.mapped;
  const correlationId = intakeCorrelationId({
    d2dProspectId: correlation.d2dProspectId,
    exportId: batch.exportId,
  });

  const existingSameExport = await input.registry.getReceipt(correlationId);
  if (existingSameExport?.factoryRunId) {
    const store = await input.registry.getStateStore(existingSameExport.factoryRunId);
    const state = await readState(store);
    if (state && isAtOrPastGate1(state)) {
      const duplicate = receiptFromState(batch, correlation.d2dProspectId, correlationId, state, {
        status: D2D_INTAKE_STATUSES.DUPLICATE,
        reasonCode: D2D_INTAKE_REASON_CODES.EXISTING_FACTORY_RUN,
        reason: "Idempotent retry of the same D2D prospect and export/intake version",
      });
      await input.registry.saveReceipt(duplicate);
      return duplicate;
    }
    if (state) {
      return resumeRun(batch, correlation.d2dProspectId, correlationId, state, adapters, input);
    }
  }

  const existingProspect = await input.registry.getReceiptByProspect(correlation.d2dProspectId);
  if (existingProspect?.factoryRunId && existingProspect.correlationId !== correlationId) {
    const store = await input.registry.getStateStore(existingProspect.factoryRunId);
    const state = await readState(store);
    if (state) {
      const duplicate = receiptFromState(batch, correlation.d2dProspectId, correlationId, state, {
        status: D2D_INTAKE_STATUSES.DUPLICATE,
        reasonCode: D2D_INTAKE_REASON_CODES.EXISTING_FACTORY_RUN,
        reason: "This D2D prospect already has a durable Content Factory run",
      });
      await input.registry.saveReceipt(duplicate);
      return duplicate;
    }
  }

  const runId = `run-${seed.prospectId}`;
  const store = await input.registry.getStateStore(runId);
  let state = await readState(store);
  if (!state) {
    state = createInitialState({
      seed,
      models: {
        researcher: { provider: adapters.researcher.provider, model: adapters.researcher.model },
        prescriber: { provider: adapters.prescriber.provider, model: adapters.prescriber.model },
        writer: { provider: adapters.writer.provider, model: adapters.writer.model },
      },
      ...(input.now ? { now: input.now } : {}),
      sourceCorrelation: correlation,
    });
    await writeState(store, state);
  }

  return resumeRun(batch, correlation.d2dProspectId, correlationId, state, adapters, input);
}

async function resumeRun(
  batch: D2dIntakeBatch,
  d2dProspectId: string,
  correlationId: string,
  state: WorkflowState,
  adapters: FactoryAdapters,
  input: D2dIntakeInput,
): Promise<D2dProspectReceipt> {
  const store = await input.registry.getStateStore(state.runId);
  if (isAtOrPastGate1(state)) {
    const duplicate = receiptFromState(batch, d2dProspectId, correlationId, state, {
      status: D2D_INTAKE_STATUSES.DUPLICATE,
      reasonCode: D2D_INTAKE_REASON_CODES.EXISTING_FACTORY_RUN,
      reason: "Existing factory run already stopped at Human Gate 1",
    });
    await input.registry.saveReceipt(duplicate);
    return duplicate;
  }

  try {
    const result = await runFactory({
      seed: state.seed,
      adapters,
      stateStore: store,
      ...(input.now ? { now: input.now } : {}),
      ...(input.repoRoot ? { repoRoot: input.repoRoot } : {}),
    });
    const next = result.state;
    if (next.writerInvocations > 0 || next.writingPackage || next.publication) {
      const failed = receiptFromState(batch, d2dProspectId, correlationId, next, {
        status: D2D_INTAKE_STATUSES.FAILED,
        reasonCode: D2D_INTAKE_REASON_CODES.WRITER_BEFORE_GATE_FORBIDDEN,
        reason: "Intake must stop at Human Gate 1 and must not run the writer or website-copy publication",
      });
      await input.registry.saveReceipt(failed);
      return failed;
    }
    if (next.stage !== WORKFLOW_STAGES.AWAITING_PRESCRIPTION_APPROVAL) {
      const retryable = receiptFromState(batch, d2dProspectId, correlationId, next, {
        status: D2D_INTAKE_STATUSES.RETRYABLE,
        reasonCode: D2D_INTAKE_REASON_CODES.TRANSIENT_FACTORY_FAILURE,
        reason: `Factory run stopped at ${next.stage} before Human Gate 1`,
      });
      await input.registry.saveReceipt(retryable);
      return retryable;
    }
    const accepted = receiptFromState(batch, d2dProspectId, correlationId, next, {
      status: D2D_INTAKE_STATUSES.ACCEPTED,
    });
    await input.registry.saveReceipt(accepted);
    return accepted;
  } catch (error) {
    const latest = (await readState(store)) ?? state;
    const retryable = receiptFromState(batch, d2dProspectId, correlationId, latest, {
      status: D2D_INTAKE_STATUSES.RETRYABLE,
      reasonCode: D2D_INTAKE_REASON_CODES.TRANSIENT_FACTORY_FAILURE,
      reason: transientReason(error),
    });
    await input.registry.saveReceipt(retryable);
    return retryable;
  }
}

function receiptFromState(
  batch: D2dIntakeBatch,
  d2dProspectId: string,
  correlationId: string,
  state: WorkflowState,
  outcome: {
    readonly status: D2dProspectReceipt["status"];
    readonly reason?: string;
    readonly reasonCode?: D2dIntakeReasonCode;
  },
): D2dProspectReceipt {
  return {
    version: D2D_FACTORY_INTAKE_VERSION,
    status: outcome.status,
    d2dProspectId,
    campaignId: batch.campaignId,
    campaignRunId: batch.campaignRunId,
    exportId: batch.exportId,
    correlationId,
    factoryProspectId: state.prospectId,
    factoryRunId: state.runId,
    factoryStage: state.stage,
    ...(outcome.reason ? { reason: outcome.reason } : {}),
    ...(outcome.reasonCode ? { reasonCode: outcome.reasonCode } : {}),
  };
}

function heldReceipt(
  batch: D2dIntakeBatch,
  d2dProspectId: string,
  reasonCode: D2dIntakeReasonCode,
  reason: string,
): D2dProspectReceipt {
  return {
    version: D2D_FACTORY_INTAKE_VERSION,
    status: D2D_INTAKE_STATUSES.HELD,
    d2dProspectId,
    campaignId: batch.campaignId,
    campaignRunId: batch.campaignRunId,
    exportId: batch.exportId,
    correlationId: intakeCorrelationId({
      d2dProspectId: d2dProspectId || "unknown",
      exportId: batch.exportId,
    }),
    reason,
    reasonCode,
  };
}

function isAtOrPastGate1(state: WorkflowState): boolean {
  return (
    state.stage === WORKFLOW_STAGES.AWAITING_PRESCRIPTION_APPROVAL ||
    state.stage === WORKFLOW_STAGES.WRITING ||
    state.stage === WORKFLOW_STAGES.MECHANICAL_VALIDATION ||
    state.stage === WORKFLOW_STAGES.PUBLISHING ||
    state.stage === WORKFLOW_STAGES.AWAITING_COPY_QA ||
    state.stage === WORKFLOW_STAGES.COMPLETE
  );
}

function gate1Adapters(adapters: FactoryAdapters): FactoryAdapters {
  const publisher = gate1Publisher(adapters.publisher ?? createUnconfiguredPublisher());
  return {
    researcher: adapters.researcher,
    prescriber: adapters.prescriber,
    writer: forbiddenWriter(adapters.writer),
    publisher,
  };
}

function forbiddenWriter(inner: WriterAdapter): WriterAdapter {
  return {
    provider: inner.provider,
    model: inner.model,
    async writeCompletePackage() {
      throw new WorkflowError(
        "WRITER_RERUN_FORBIDDEN",
        "D2D intake stops at Human Gate 1 and must not start the writer",
      );
    },
  };
}

function gate1Publisher(inner: GoogleDocsPublisher): GoogleDocsPublisher {
  return {
    async publishReviewPackage(pkg: WritingPackage) {
      if (pkg.kind !== "prescription") {
        throw new WorkflowError(
          "WRITER_RERUN_FORBIDDEN",
          "D2D intake must not publish website copy before Human Gate 1",
        );
      }
      return inner.publishReviewPackage(pkg);
    },
  };
}

function transientReason(error: unknown): string {
  if (error instanceof WorkflowError) return error.message;
  if (error instanceof Error) return error.message;
  return "Transient factory failure";
}

function isCandidate(value: unknown): value is D2dProspectCandidate {
  return typeof value === "object" && value !== null;
}

export { D2dIntakeAuthError };
