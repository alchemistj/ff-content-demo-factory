import { sha256Json } from "../handoff/fingerprint.js";
import type {
  ApprovedPlan,
  EvidencePacket,
  ModelRef,
  ProposedPrescription,
  ProspectSeed,
  ResearchRecord,
} from "../handoff/types.js";
import type { PublicationReceipt } from "../publisher/types.js";
import type { WritingPackage } from "../writing-package/types.js";

export const WORKFLOW_VERSION = 2 as const;

export const WORKFLOW_STAGES = Object.freeze({
  RESEARCH: "research",
  PRESCRIPTION: "prescription",
  PUBLISHING_PRESCRIPTION: "publishing_prescription",
  AWAITING_PRESCRIPTION_APPROVAL: "awaiting_prescription_approval",
  WRITING: "writing",
  MECHANICAL_VALIDATION: "mechanical_validation",
  PUBLISHING: "publishing",
  AWAITING_COPY_QA: "awaiting_copy_qa",
  COMPLETE: "complete",
} as const);

export type WorkflowStage = (typeof WORKFLOW_STAGES)[keyof typeof WORKFLOW_STAGES];

export const D2D_SOURCE_KIND = "d2d-factory-intake/v1" as const;

export interface WorkflowSourceCorrelation {
  readonly kind: typeof D2D_SOURCE_KIND;
  readonly d2dProspectId: string;
  readonly sourceBusinessId: string;
  readonly d2dBusinessId: string;
  readonly campaignBusinessId?: string;
  readonly placeId?: string;
  readonly campaignId: string;
  readonly campaignRunId: string;
  readonly exportId: string;
  readonly exportedAt: string;
  readonly correlationId: string;
  readonly searchContext?: {
    readonly latitude: number;
    readonly longitude: number;
    readonly radiusMiles: number;
    readonly searchTerms: readonly string[];
  };
  readonly coordinates?: { readonly latitude: number; readonly longitude: number };
  readonly provenance?: {
    readonly actor?: string;
    readonly runId?: string;
    readonly datasetId?: string;
    readonly itemId?: string;
    readonly googlePlaceId?: string;
    readonly placeId?: string;
    readonly mapsUrl?: string;
    readonly googleMapsUrl?: string;
    readonly googleUrl?: string;
    readonly cid?: string;
  };
  readonly factoryQualificationOutcome: "advanced";
  readonly factoryQualificationReason: string;
}

export interface WorkflowModels {
  readonly researcher: ModelRef;
  readonly prescriber: ModelRef;
  readonly writer: ModelRef;
}

export interface WorkflowEvent {
  readonly at: string;
  readonly type: string;
  readonly stage: WorkflowStage;
  readonly detail?: string;
}

export interface WorkflowState {
  readonly version: typeof WORKFLOW_VERSION;
  readonly runId: string;
  readonly prospectId: string;
  stage: WorkflowStage;
  status: "active" | "awaiting_human" | "complete";
  createdAt: string;
  updatedAt: string;
  models: WorkflowModels;
  seed: ProspectSeed;
  research: ResearchRecord | null;
  prescription: ProposedPrescription | null;
  approvedPlan: ApprovedPlan | null;
  writingPackage: WritingPackage | null;
  prescriptionPackage: WritingPackage | null;
  writerInvocations: number;
  writerRunId: string | null;
  publication: PublicationReceipt | null;
  prescriptionPublication: PublicationReceipt | null;
  humanQaTask: HumanQaTask | null;
  events: WorkflowEvent[];
  sourceCorrelation?: WorkflowSourceCorrelation;
}

export interface HumanQaTask {
  readonly kind: "prescription-gate" | "copy-gate";
  readonly prospectId: string;
  readonly runId: string;
  readonly title: string;
  readonly materials: readonly string[];
  readonly googleDocUrl?: string;
  readonly publicationStatus?: PublicationReceipt["status"];
  readonly publicationError?: PublicationReceipt["error"];
}

export interface StateStore {
  load?: () => WorkflowState | null | Promise<WorkflowState | null>;
  get?: () => WorkflowState | null | Promise<WorkflowState | null>;
  save?: (state: WorkflowState) => unknown | Promise<unknown>;
  set?: (state: WorkflowState) => unknown | Promise<unknown>;
}

export function cloneState<T>(value: T): T {
  return structuredClone(value);
}

export function evidenceFingerprint(evidence: EvidencePacket): string {
  return sha256Json(evidence);
}

export function createInitialState(input: {
  readonly seed: ProspectSeed;
  readonly models: WorkflowModels;
  readonly now?: Date;
  readonly sourceCorrelation?: WorkflowSourceCorrelation;
}): WorkflowState {
  const now = (input.now ?? new Date()).toISOString();
  return {
    version: WORKFLOW_VERSION,
    runId: `run-${input.seed.prospectId}`,
    prospectId: input.seed.prospectId,
    stage: WORKFLOW_STAGES.RESEARCH,
    status: "active",
    createdAt: now,
    updatedAt: now,
    models: input.models,
    seed: cloneState(input.seed),
    research: null,
    prescription: null,
    approvedPlan: null,
    writingPackage: null,
    prescriptionPackage: null,
    writerInvocations: 0,
    writerRunId: null,
    publication: null,
    prescriptionPublication: null,
    humanQaTask: null,
    events: [],
    ...(input.sourceCorrelation ? { sourceCorrelation: cloneState(input.sourceCorrelation) } : {}),
  };
}

export function validateWorkflowState(state: WorkflowState): WorkflowState {
  if (!state || typeof state !== "object") throw new Error("Persisted workflow state must be an object");
  if (state.version !== WORKFLOW_VERSION) throw new Error(`Unsupported workflow version: ${state.version}`);
  if (!state.prospectId || !state.runId) throw new Error("Persisted workflow state is missing identity");
  if (!Object.values(WORKFLOW_STAGES).includes(state.stage)) {
    throw new Error(`Unknown workflow stage: ${state.stage}`);
  }
  return state;
}

export function createMemoryStateStore(initial?: WorkflowState): StateStore {
  let current = initial ? cloneState(initial) : null;
  return {
    async load() {
      return current ? cloneState(current) : null;
    },
    async save(next) {
      current = cloneState(validateWorkflowState(next));
      return cloneState(current);
    },
    async get() {
      return current ? cloneState(current) : null;
    },
  };
}

export async function readState(store?: StateStore): Promise<WorkflowState | null> {
  if (!store) return null;
  if (typeof store.load === "function") return store.load();
  if (typeof store.get === "function") return store.get();
  throw new TypeError("stateStore must expose load/get");
}

export async function writeState(store: StateStore | undefined, state: WorkflowState): Promise<unknown> {
  validateWorkflowState(state);
  if (!store) return state;
  if (typeof store.save === "function") return store.save(state);
  if (typeof store.set === "function") return store.set(state);
  throw new TypeError("stateStore must expose save/set");
}

export function markEvent(state: WorkflowState, event: Omit<WorkflowEvent, "at">, now: Date): void {
  state.events.push({ at: now.toISOString(), ...event });
  state.updatedAt = now.toISOString();
}
