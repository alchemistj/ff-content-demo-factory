import { createUnconfiguredPublisher } from "../publisher/index.js";
import { createFactoryQualifier, type QualificationAdapter } from "../factory/qualify.js";
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
import { mapAdvancedBusinessToSeed } from "./map.js";
import { configuredMaxBatch, normalizeRawBusiness, parseD2dIntakeBatch } from "./normalize.js";
import type { D2dIntakeRegistry } from "./registry.js";
import {
  D2D_FACTORY_INTAKE_VERSION,
  D2D_INTAKE_REASON_CODES,
  D2D_TRANSPORT_STATUSES,
  FACTORY_QUALIFICATION_OUTCOMES,
  intakeCorrelationId,
  type D2dBusinessReceipt,
  type D2dIntakeBatch,
  type D2dIntakeBatchReceipt,
  type D2dIntakeReasonCode,
  type FactoryQualification,
  type NormalizedRawBusiness,
} from "./types.js";

export interface D2dIntakeInput {
  readonly payload: unknown;
  readonly presentedToken?: string;
  readonly expectedSecret?: string;
  readonly adapters: FactoryAdapters;
  readonly registry: D2dIntakeRegistry;
  readonly qualifier?: QualificationAdapter;
  readonly now?: Date;
  readonly repoRoot?: string;
  readonly maxBatch?: number;
}

export async function acceptD2dIntake(input: D2dIntakeInput): Promise<D2dIntakeBatchReceipt> {
  assertD2dIntakeAuth({
    ...(input.presentedToken !== undefined ? { presentedToken: input.presentedToken } : {}),
    ...(input.expectedSecret !== undefined ? { expectedSecret: input.expectedSecret } : {}),
  });
  const batch = parseD2dIntakeBatch(input.payload);
  const adapters = gate1Adapters(input.adapters);
  const qualifier = input.qualifier ?? createFactoryQualifier();
  const maxBatch = input.maxBatch ?? configuredMaxBatch();
  const receipts: D2dBusinessReceipt[] = [];
  const seenIds = new Map<string, string>();

  for (const [index, raw] of batch.businesses.entries()) {
    try {
      if (index >= maxBatch) {
        const ids = transportIdsFromRaw(raw);
        receipts.push(
          transportReceipt(batch, ids, {
            status: D2D_TRANSPORT_STATUSES.INVALID,
            reasonCode: D2D_INTAKE_REASON_CODES.BATCH_LIMIT,
            reason: `Raw cohort item ${index} exceeds configured max ${maxBatch}. Transport does not inherit a 7-item cap; raise D2D_INTAKE_MAX_BATCH for a larger operator cohort.`,
          }),
        );
        continue;
      }
      receipts.push(await acceptOneBusiness(raw, batch, adapters, qualifier, input, seenIds));
    } catch (error) {
      const ids = transportIdsFromRaw(raw);
      receipts.push(
        transportReceipt(batch, ids, {
          status: D2D_TRANSPORT_STATUSES.RETRYABLE,
          reasonCode: D2D_INTAKE_REASON_CODES.TRANSIENT_FACTORY_FAILURE,
          reason: error instanceof Error ? error.message : "Business intake failed independently",
        }),
      );
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

async function acceptOneBusiness(
  raw: unknown,
  batch: D2dIntakeBatch,
  adapters: FactoryAdapters,
  qualifier: QualificationAdapter,
  input: D2dIntakeInput,
  seenIds: Map<string, string>,
): Promise<D2dBusinessReceipt> {
  const normalized = normalizeRawBusiness(raw, batch.provenance);
  if (normalized.status === "invalid") {
    return transportReceipt(
      batch,
      {
        d2dProspectId: normalized.d2dProspectId,
        sourceBusinessId: normalized.sourceBusinessId,
        campaignBusinessId: null,
        d2dBusinessId: normalized.d2dBusinessId,
        placeId: null,
      },
      {
        status: D2D_TRANSPORT_STATUSES.INVALID,
        reasonCode: normalized.reasonCode,
        reason: normalized.reason,
      },
    );
  }

  const record = normalized.record;
  const correlationId = intakeCorrelationId({
    sourceBusinessId: record.sourceBusinessId,
    exportId: batch.exportId,
  });

  const existing = await input.registry.getReceipt(correlationId);
  if (existing) {
    if (
      existing.status === D2D_TRANSPORT_STATUSES.RETRYABLE &&
      existing.qualification?.outcome === FACTORY_QUALIFICATION_OUTCOMES.ADVANCED &&
      existing.factoryRunId
    ) {
      const store = await input.registry.getStateStore(existing.factoryRunId);
      const state = await readState(store);
      if (state) {
        const mapped = mapAdvancedBusinessToSeed(record, {
          campaignId: batch.campaignId,
          campaignRunId: batch.campaignRunId,
          exportId: batch.exportId,
          exportedAt: batch.exportedAt,
          campaign: batch.campaign,
        });
        if (mapped.ok) {
          return runAdvanced(
            batch,
            record,
            mapped.mapped.seed,
            mapped.mapped.correlation,
            existing.qualification,
            adapters,
            input,
          );
        }
      }
    }
    return {
      ...existing,
      status: D2D_TRANSPORT_STATUSES.DUPLICATE,
      reason: existing.reason ?? "Idempotent retry of the same raw business and export/intake version",
      reasonCode: existing.reasonCode ?? D2D_INTAKE_REASON_CODES.EXISTING_QUALIFICATION,
    };
  }

  const existingBusiness = await input.registry.getReceiptByBusiness(record.sourceBusinessId);
  if (existingBusiness?.qualification) {
    const duplicate: D2dBusinessReceipt = {
      ...existingBusiness,
      status: D2D_TRANSPORT_STATUSES.DUPLICATE,
      campaignId: batch.campaignId,
      campaignRunId: batch.campaignRunId,
      exportId: batch.exportId,
      correlationId,
      reason: "This raw business already has a factory qualification decision",
      reasonCode: D2D_INTAKE_REASON_CODES.EXISTING_QUALIFICATION,
    };
    await input.registry.saveReceipt(duplicate);
    return duplicate;
  }

  const duplicateOf = seenIds.get(record.sourceBusinessId) ?? null;
  if (!duplicateOf) seenIds.set(record.sourceBusinessId, record.sourceBusinessId);

  const qualification = await qualifier.qualify({
    record,
    campaign: batch.campaign,
    ...(duplicateOf ? { duplicateOf } : {}),
  });

  if (qualification.outcome !== FACTORY_QUALIFICATION_OUTCOMES.ADVANCED) {
    const receipt = transportReceipt(batch, record, {
      status: D2D_TRANSPORT_STATUSES.RECEIVED,
      qualification,
      reason: qualification.reason,
      reasonCode: qualification.reasonCode,
    });
    await input.registry.saveReceipt(receipt);
    return receipt;
  }

  const mapped = mapAdvancedBusinessToSeed(record, {
    campaignId: batch.campaignId,
    campaignRunId: batch.campaignRunId,
    exportId: batch.exportId,
    exportedAt: batch.exportedAt,
    campaign: batch.campaign,
  });
  if (!mapped.ok) {
    const held: FactoryQualification = {
      outcome: FACTORY_QUALIFICATION_OUTCOMES.HELD,
      reasonCode: mapped.reasonCode,
      reason: `${mapped.reason} Factory selected this listing but refused to invent ProspectSeed values.`,
      ...(qualification.websiteOpportunity ? { websiteOpportunity: qualification.websiteOpportunity } : {}),
    };
    const receipt = transportReceipt(batch, record, {
      status: D2D_TRANSPORT_STATUSES.RECEIVED,
      qualification: held,
      reason: held.reason,
      reasonCode: held.reasonCode,
    });
    await input.registry.saveReceipt(receipt);
    return receipt;
  }

  return runAdvanced(batch, record, mapped.mapped.seed, mapped.mapped.correlation, qualification, adapters, input);
}

async function runAdvanced(
  batch: D2dIntakeBatch,
  record: NormalizedRawBusiness,
  seed: import("../handoff/types.js").ProspectSeed,
  correlation: import("../workflow/state.js").WorkflowSourceCorrelation,
  qualification: FactoryQualification,
  adapters: FactoryAdapters,
  input: D2dIntakeInput,
): Promise<D2dBusinessReceipt> {
  const correlationId = intakeCorrelationId({
    sourceBusinessId: record.sourceBusinessId,
    exportId: batch.exportId,
  });
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

  if (isAtOrPastGate1(state)) {
    const duplicate = receiptFromState(batch, record, correlationId, qualification, state, {
      status: D2D_TRANSPORT_STATUSES.DUPLICATE,
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
      const failed = receiptFromState(batch, record, correlationId, qualification, next, {
        status: D2D_TRANSPORT_STATUSES.RETRYABLE,
        reasonCode: D2D_INTAKE_REASON_CODES.WRITER_BEFORE_GATE_FORBIDDEN,
        reason: "Intake must stop at Human Gate 1 and must not run the writer or website-copy publication",
      });
      await input.registry.saveReceipt(failed);
      return failed;
    }
    if (next.stage !== WORKFLOW_STAGES.AWAITING_PRESCRIPTION_APPROVAL) {
      const retryable = receiptFromState(batch, record, correlationId, qualification, next, {
        status: D2D_TRANSPORT_STATUSES.RETRYABLE,
        reasonCode: D2D_INTAKE_REASON_CODES.TRANSIENT_FACTORY_FAILURE,
        reason: `Factory run stopped at ${next.stage} before Human Gate 1`,
      });
      await input.registry.saveReceipt(retryable);
      return retryable;
    }
    const received = receiptFromState(batch, record, correlationId, qualification, next, {
      status: D2D_TRANSPORT_STATUSES.RECEIVED,
    });
    await input.registry.saveReceipt(received);
    return received;
  } catch (error) {
    const latest = (await readState(store)) ?? state;
    const retryable = receiptFromState(batch, record, correlationId, qualification, latest, {
      status: D2D_TRANSPORT_STATUSES.RETRYABLE,
      reasonCode: D2D_INTAKE_REASON_CODES.TRANSIENT_FACTORY_FAILURE,
      reason: transientReason(error),
    });
    await input.registry.saveReceipt(retryable);
    return retryable;
  }
}

function receiptFromState(
  batch: D2dIntakeBatch,
  record: NormalizedRawBusiness,
  correlationId: string,
  qualification: FactoryQualification,
  state: WorkflowState,
  outcome: {
    readonly status: D2dBusinessReceipt["status"];
    readonly reason?: string;
    readonly reasonCode?: D2dIntakeReasonCode;
  },
): D2dBusinessReceipt {
  return {
    version: D2D_FACTORY_INTAKE_VERSION,
    status: outcome.status,
    qualification,
    d2dProspectId: record.d2dProspectId,
    sourceBusinessId: record.sourceBusinessId,
    campaignBusinessId: record.campaignBusinessId,
    d2dBusinessId: record.sourceBusinessId,
    placeId: record.placeId,
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

function transportReceipt(
  batch: D2dIntakeBatch,
  ids: {
    readonly d2dProspectId: string;
    readonly sourceBusinessId: string;
    readonly campaignBusinessId: string | null;
    readonly d2dBusinessId: string;
    readonly placeId: string | null;
  },
  outcome: {
    readonly status: D2dBusinessReceipt["status"];
    readonly qualification?: FactoryQualification | null;
    readonly reason?: string;
    readonly reasonCode?: D2dIntakeReasonCode;
  },
): D2dBusinessReceipt {
  const sourceBusinessId = ids.sourceBusinessId || "unknown";
  const d2dProspectId = ids.d2dProspectId || "unknown";
  return {
    version: D2D_FACTORY_INTAKE_VERSION,
    status: outcome.status,
    qualification: outcome.qualification ?? null,
    d2dProspectId,
    sourceBusinessId,
    campaignBusinessId: ids.campaignBusinessId,
    d2dBusinessId: sourceBusinessId,
    placeId: ids.placeId,
    campaignId: batch.campaignId,
    campaignRunId: batch.campaignRunId,
    exportId: batch.exportId,
    correlationId: intakeCorrelationId({
      sourceBusinessId,
      exportId: batch.exportId,
    }),
    ...(outcome.reason ? { reason: outcome.reason } : {}),
    ...(outcome.reasonCode ? { reasonCode: outcome.reasonCode } : {}),
  };
}

function transportIdsFromRaw(raw: unknown): {
  readonly d2dProspectId: string;
  readonly sourceBusinessId: string;
  readonly campaignBusinessId: string | null;
  readonly d2dBusinessId: string;
  readonly placeId: string | null;
} {
  if (!isRecord(raw)) {
    return {
      d2dProspectId: "",
      sourceBusinessId: "",
      campaignBusinessId: null,
      d2dBusinessId: "",
      placeId: null,
    };
  }
  const sourceBusinessId = String(raw.sourceBusinessId ?? "");
  const d2dProspectId = String(raw.d2dProspectId ?? "");
  return {
    d2dProspectId,
    sourceBusinessId,
    campaignBusinessId: typeof raw.campaignBusinessId === "string" ? raw.campaignBusinessId : null,
    d2dBusinessId: sourceBusinessId,
    placeId: typeof raw.placeId === "string" ? raw.placeId : null,
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export { D2dIntakeAuthError };
