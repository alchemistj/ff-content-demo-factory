import type { ExampleLibraryReceipt } from "../examples/catalog.js";
import type {
  PrescriptionApproval,
  ProposedPrescription,
  ProspectSeed,
  ResearchRecord,
  WriterContext,
} from "../handoff/types.js";
import type { GoogleDocsPublisher } from "../publisher/types.js";
import type { WritingAssignmentGuideSet } from "../writer-guides/loader.js";
import type { WritingPackage } from "../writing-package/types.js";
import type { WriterInternalPhase } from "../writing-package/types.js";

export interface ResearchAssignment {
  readonly seed: ProspectSeed;
  readonly instructions: string;
  readonly authority: string;
}

export interface PrescriptionAssignment {
  readonly research: ResearchRecord;
  readonly instructions: string;
  readonly authority: string;
}

/**
 * One writer run. Internal order is recommended sequencing inside this call,
 * not three independent model sessions.
 */
export interface WriterAssignment {
  /** Durable writer session. Created once for the complete package. */
  readonly writerRunId: string;
  /** Factory run id recorded on the writing package. */
  readonly runId: string;
  readonly context: WriterContext;
  readonly guides: WritingAssignmentGuideSet;
  readonly examples: ExampleLibraryReceipt;
  readonly instructions: string;
  readonly authority: string;
  readonly internalOrder: readonly WriterInternalPhase[];
}

export interface ResearchAdapter {
  readonly provider: string;
  readonly model: string;
  research(input: ResearchAssignment): Promise<ResearchRecord>;
}

export interface PrescriptionAdapter {
  readonly provider: string;
  readonly model: string;
  prescribe(input: PrescriptionAssignment): Promise<ProposedPrescription>;
}

export interface WriterAdapter {
  readonly provider: string;
  readonly model: string;
  writeCompletePackage(assignment: WriterAssignment): Promise<WritingPackage>;
}

export interface FactoryAdapters {
  readonly researcher: ResearchAdapter;
  readonly prescriber: PrescriptionAdapter;
  readonly writer: WriterAdapter;
  readonly publisher?: GoogleDocsPublisher;
}

export interface FactoryRunInput {
  readonly seed: ProspectSeed;
  readonly adapters: FactoryAdapters;
  readonly prescriptionApproval?: PrescriptionApproval;
  readonly stateStore?: import("./state.js").StateStore;
  readonly now?: Date;
  readonly repoRoot?: string;
}

export interface FactoryRunResult {
  readonly state: import("./state.js").WorkflowState;
  readonly complete: boolean;
  readonly awaitingHuman: boolean;
}

export class WorkflowError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "WorkflowError";
    this.code = code;
  }
}
