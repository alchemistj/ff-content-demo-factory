import { loadApprovedExampleLibrary } from "../examples/catalog.js";
import {
  parseApprovedPlan,
  parseProposedPrescription,
  parseResearchRecord,
  writerContextFromApprovedPlan,
  type ApprovedPlan,
  type PrescriptionApproval,
} from "../handoff/index.js";
import { sha256Json } from "../handoff/fingerprint.js";
import { APPROVED_PLAN_VERSION } from "../handoff/types.js";
import { createUnconfiguredPublisher, type GoogleDocsPublisher, type PublicationReceipt } from "../publisher/index.js";
import { loadWritingAssignmentGuides } from "../writer-guides/loader.js";
import { buildWritingPackage, type WritingPackagePages } from "../writing-package/index.js";
import { discoverAssignment } from "./assignment.js";
import { MechanicalValidationError, validateWritingMechanics } from "./mechanical.js";
import { loadActiveRuntimeInstructions } from "./runtime-docs.js";
import {
  WORKFLOW_STAGES,
  WRITING_INTERNAL_PHASES,
  cloneState,
  createInitialState,
  createMemoryStateStore,
  evidenceFingerprint,
  markEvent,
  readState,
  writeState,
  type HumanQaTask,
  type StateStore,
  type WorkflowState,
} from "./state.js";
import {
  WorkflowError,
  type FactoryAdapters,
  type FactoryRunInput,
  type FactoryRunResult,
  type WriterPhaseInput,
} from "./types.js";

function repoRootOption(repoRoot: string | undefined): { readonly repoRoot: string } | undefined {
  return repoRoot ? { repoRoot } : undefined;
}

function clock(input: FactoryRunInput): Date {
  return input.now ?? new Date();
}

function publisherOf(adapters: FactoryAdapters): GoogleDocsPublisher {
  return adapters.publisher ?? createUnconfiguredPublisher();
}

function prescriptionTask(state: WorkflowState): HumanQaTask {
  return {
    kind: "prescription-gate",
    prospectId: state.prospectId,
    runId: state.runId,
    title: `${state.seed.business.name} — Page plan — Human review`,
    materials: [
      "proposed page plan (jobs, routes, intents, scope)",
      "research evidence packet",
      "advisory research and prescription recommendations",
    ],
  };
}

function copyTask(state: WorkflowState, publication: PublicationReceipt | null): HumanQaTask {
  const task: HumanQaTask = {
    kind: "copy-gate",
    prospectId: state.prospectId,
    runId: state.runId,
    title: `${state.seed.business.name} — Website Copy — Human Review`,
    materials: [
      "complete writing package",
      "approved route map",
      "owner-facing Strategy Overview",
    ],
  };
  if (publication?.url) {
    return {
      ...task,
      googleDocUrl: publication.url,
      publicationStatus: publication.status,
    };
  }
  if (publication) {
    return {
      ...task,
      publicationStatus: publication.status,
      ...(publication.error ? { publicationError: publication.error } : {}),
    };
  }
  return task;
}

async function persist(store: StateStore, state: WorkflowState): Promise<void> {
  await writeState(store, state);
}

function requireResearch(state: WorkflowState) {
  if (!state.research) throw new WorkflowError("RESEARCH_REQUIRED", "Research record is missing");
  return state.research;
}

function requirePrescription(state: WorkflowState) {
  if (!state.prescription) throw new WorkflowError("PRESCRIPTION_REQUIRED", "Prescription is missing");
  return state.prescription;
}

function requirePlan(state: WorkflowState) {
  if (!state.approvedPlan) throw new WorkflowError("APPROVED_PLAN_REQUIRED", "Approved page plan is missing");
  return state.approvedPlan;
}

function requirePackage(state: WorkflowState) {
  if (!state.writingPackage) {
    throw new WorkflowError("WRITING_PACKAGE_REQUIRED", "Writing package is missing; publication cannot invent copy");
  }
  return state.writingPackage;
}

function applyPrescriptionApproval(state: WorkflowState, approval: PrescriptionApproval, now: Date): ApprovedPlan {
  const research = requireResearch(state);
  const prescription = requirePrescription(state);
  const plan = parseApprovedPlan({
    version: APPROVED_PLAN_VERSION,
    prospectId: state.prospectId,
    approval,
    decisions: prescription.proposedPagePlan,
    researchRecommendations: research.recommendations,
    prescriptionRecommendations: prescription.recommendations,
    evidence: research.evidence,
  });
  state.approvedPlan = plan;
  markEvent(state, { type: "prescription-approved", stage: state.stage, detail: approval.approvedBy }, now);
  return plan;
}

async function runResearch(state: WorkflowState, input: FactoryRunInput, now: Date): Promise<void> {
  const instructions = loadActiveRuntimeInstructions(repoRootOption(input.repoRoot));
  const record = parseResearchRecord(
    await input.adapters.researcher.research({
      seed: state.seed,
      instructions: instructions.research,
      authority: instructions.authority,
    }),
  );
  if (record.prospectId !== state.prospectId) {
    throw new WorkflowError("PROSPECT_MISMATCH", "Research record prospectId does not match the run");
  }
  state.research = record;
  markEvent(state, { type: "stage-complete", stage: WORKFLOW_STAGES.RESEARCH }, now);
  state.stage = WORKFLOW_STAGES.PRESCRIPTION;
}

async function runPrescription(state: WorkflowState, input: FactoryRunInput, now: Date): Promise<void> {
  const research = requireResearch(state);
  const instructions = loadActiveRuntimeInstructions(repoRootOption(input.repoRoot));
  const proposed = parseProposedPrescription(
    await input.adapters.prescriber.prescribe({
      research,
      instructions: instructions.prescription,
      authority: instructions.authority,
    }),
    research.evidence,
  );
  if (proposed.evidenceFingerprint !== evidenceFingerprint(research.evidence)) {
    throw new WorkflowError(
      "EVIDENCE_FINGERPRINT_MISMATCH",
      "Prescription must bind to the original research evidence fingerprint",
    );
  }
  state.prescription = proposed;
  state.humanQaTask = prescriptionTask(state);
  markEvent(state, { type: "stage-complete", stage: WORKFLOW_STAGES.PRESCRIPTION }, now);
  state.stage = WORKFLOW_STAGES.AWAITING_PRESCRIPTION_APPROVAL;
  state.status = "awaiting_human";
}

async function runWriting(state: WorkflowState, input: FactoryRunInput, now: Date): Promise<void> {
  const plan = requirePlan(state);
  const context = writerContextFromApprovedPlan(plan);
  const guides = loadWritingAssignmentGuides(repoRootOption(input.repoRoot));
  const examples = loadApprovedExampleLibrary(repoRootOption(input.repoRoot));
  const instructions = loadActiveRuntimeInstructions(repoRootOption(input.repoRoot));
  const priorWork: Partial<WritingPackagePages> = {};

  for (const phase of WRITING_INTERNAL_PHASES) {
    const phaseInput: WriterPhaseInput = {
      phase,
      context,
      guides,
      examples,
      instructions: instructions.writer,
      authority: instructions.authority,
      priorWork: cloneState(priorWork),
    };
    const output = await input.adapters.writer.write(phaseInput);
    if (output.phase !== phase) {
      throw new WorkflowError("WRITER_PHASE_MISMATCH", `Writer returned ${output.phase} during ${phase}`);
    }
    Object.assign(priorWork, output.pages);
    state.writingPhasesCompleted.push(phase);
    markEvent(state, { type: "writing-phase", stage: WORKFLOW_STAGES.WRITING, detail: phase }, now);
  }

  const pages = priorWork as WritingPackagePages;
  state.writingPackage = buildWritingPackage({
    prospectId: state.prospectId,
    runId: state.runId,
    businessName: plan.evidence.business.name,
    routeMap: plan.decisions.routeMap,
    pages,
  });
  markEvent(state, { type: "stage-complete", stage: WORKFLOW_STAGES.WRITING }, now);
  state.stage = WORKFLOW_STAGES.MECHANICAL_VALIDATION;
}

function runMechanical(state: WorkflowState, now: Date): void {
  const plan = requirePlan(state);
  const pkg = requirePackage(state);
  try {
    validateWritingMechanics({
      pkg,
      decisions: plan.decisions,
      evidence: plan.evidence,
    });
  } catch (error) {
    if (error instanceof MechanicalValidationError) {
      throw new WorkflowError("MECHANICAL_VALIDATION_FAILED", error.message);
    }
    throw error;
  }
  markEvent(state, { type: "stage-complete", stage: WORKFLOW_STAGES.MECHANICAL_VALIDATION }, now);
  state.stage = WORKFLOW_STAGES.PUBLISHING;
}

async function runPublishing(state: WorkflowState, input: FactoryRunInput, now: Date): Promise<void> {
  const pkg = requirePackage(state);
  const publication = await publisherOf(input.adapters).publishWritingPackage(pkg);
  if (publication.packageIdentity.packageHash !== pkg.packageHash) {
    throw new WorkflowError("PUBLICATION_PACKAGE_MISMATCH", "Publisher receipt does not match the preserved writing package");
  }
  state.publication = publication;
  state.humanQaTask = copyTask(state, publication);
  markEvent(
    state,
    {
      type: publication.status === "published" ? "published" : "publication-recorded",
      stage: WORKFLOW_STAGES.PUBLISHING,
      detail: publication.status,
    },
    now,
  );
  state.stage = WORKFLOW_STAGES.AWAITING_COPY_QA;
  state.status = "awaiting_human";
}

function stop(state: WorkflowState): FactoryRunResult {
  return {
    state: cloneState(state),
    complete: state.stage === WORKFLOW_STAGES.COMPLETE,
    awaitingHuman:
      state.stage === WORKFLOW_STAGES.AWAITING_PRESCRIPTION_APPROVAL ||
      state.stage === WORKFLOW_STAGES.AWAITING_COPY_QA,
  };
}

export async function runFactory(input: FactoryRunInput): Promise<FactoryRunResult> {
  const store = input.stateStore ?? createMemoryStateStore();
  let state = await readState(store);
  const now = clock(input);
  if (!state) {
    state = createInitialState({
      seed: input.seed,
      models: {
        researcher: { provider: input.adapters.researcher.provider, model: input.adapters.researcher.model },
        prescriber: { provider: input.adapters.prescriber.provider, model: input.adapters.prescriber.model },
        writer: { provider: input.adapters.writer.provider, model: input.adapters.writer.model },
      },
      now,
    });
    await persist(store, state);
  }

  while (
    state.stage !== WORKFLOW_STAGES.COMPLETE &&
    state.stage !== WORKFLOW_STAGES.AWAITING_COPY_QA
  ) {
    if (state.stage === WORKFLOW_STAGES.RESEARCH) {
      await runResearch(state, input, now);
      await persist(store, state);
      continue;
    }
    if (state.stage === WORKFLOW_STAGES.PRESCRIPTION) {
      await runPrescription(state, input, now);
      await persist(store, state);
      continue;
    }
    if (state.stage === WORKFLOW_STAGES.AWAITING_PRESCRIPTION_APPROVAL) {
      if (!input.prescriptionApproval) {
        return stop(state);
      }
      applyPrescriptionApproval(state, input.prescriptionApproval, now);
      state.stage = WORKFLOW_STAGES.WRITING;
      state.status = "active";
      await persist(store, state);
      continue;
    }
    if (state.stage === WORKFLOW_STAGES.WRITING) {
      await runWriting(state, input, now);
      await persist(store, state);
      continue;
    }
    if (state.stage === WORKFLOW_STAGES.MECHANICAL_VALIDATION) {
      runMechanical(state, now);
      await persist(store, state);
      continue;
    }
    if (state.stage === WORKFLOW_STAGES.PUBLISHING) {
      await runPublishing(state, input, now);
      await persist(store, state);
      continue;
    }
    throw new WorkflowError("PIPELINE_STAGE_INVALID", `Cannot resume unknown stage: ${state.stage}`);
  }

  return stop(state);
}

/**
 * Retry Google Docs publication without invoking the writer.
 */
export async function retryPublication(input: {
  readonly stateStore: StateStore;
  readonly publisher: GoogleDocsPublisher;
  readonly now?: Date;
}): Promise<FactoryRunResult> {
  const state = await readState(input.stateStore);
  if (!state) throw new WorkflowError("STATE_REQUIRED", "No workflow state to publish");
  if (!state.writingPackage) {
    throw new WorkflowError("WRITING_PACKAGE_REQUIRED", "Cannot publish before the writing package exists");
  }
  if (
    state.stage !== WORKFLOW_STAGES.AWAITING_COPY_QA &&
    state.stage !== WORKFLOW_STAGES.PUBLISHING
  ) {
    throw new WorkflowError(
      "PUBLICATION_RETRY_NOT_READY",
      "Publication retry is only valid after writing is complete",
    );
  }
  const writerCallsBefore = state.writingPhasesCompleted.length;
  const now = input.now ?? new Date();
  state.stage = WORKFLOW_STAGES.PUBLISHING;
  state.status = "active";
  const publication = await input.publisher.publishWritingPackage(state.writingPackage);
  if (publication.packageIdentity.packageHash !== state.writingPackage.packageHash) {
    throw new WorkflowError("PUBLICATION_PACKAGE_MISMATCH", "Publisher receipt does not match the preserved writing package");
  }
  state.publication = publication;
  state.humanQaTask = copyTask(state, publication);
  if (state.writingPhasesCompleted.length !== writerCallsBefore) {
    throw new WorkflowError("WRITER_RERUN_FORBIDDEN", "Publication retry must not rerun the writer");
  }
  markEvent(state, { type: "publication-retry", stage: WORKFLOW_STAGES.PUBLISHING, detail: publication.status }, now);
  state.stage = WORKFLOW_STAGES.AWAITING_COPY_QA;
  state.status = "awaiting_human";
  await writeState(input.stateStore, state);
  return stop(state);
}

export function currentWriterContext(state: WorkflowState) {
  if (!state.approvedPlan) return null;
  return writerContextFromApprovedPlan(state.approvedPlan);
}

export function assignmentFingerprint(state: WorkflowState): string {
  return sha256Json({
    prospectId: state.prospectId,
    stage: state.stage,
    evidence: state.research?.evidence ?? null,
    decisions: state.approvedPlan?.decisions ?? null,
    researchRecommendations: state.research?.recommendations ?? null,
    prescriptionRecommendations: state.prescription?.recommendations ?? null,
  });
}

export { discoverAssignment };
