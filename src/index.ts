export {
  GUIDE_CATALOG,
  GUIDE_IDS,
  STAGE_GUIDE_IDS,
  WRITER_GUIDES_DIR,
  WRITING_ASSIGNMENT_GUIDE_IDS,
  defaultRepoRoot,
  loadCanonicalGuideCatalog,
  loadWriterStageGuides,
  loadWritingAssignmentGuides,
  type GuideCatalogReceipt,
  type StageGuideSet,
  type WritingAssignmentGuideSet,
} from "./writer-guides/index.js";

export {
  APPROVED_PLAN_VERSION,
  PROPOSED_PRESCRIPTION_VERSION,
  RESEARCH_RECORD_VERSION,
  WRITER_CONTEXT_VERSION,
  parseApprovedPlan,
  parseProposedPrescription,
  parseResearchRecord,
  parseWriterContext,
  writerContextFromApprovedPlan,
  type ApprovedPlan,
  type EvidencePacket,
  type ProposedPrescription,
  type ResearchRecord,
  type WriterContext,
} from "./handoff/index.js";

export {
  WRITING_PACKAGE_SCHEMA_VERSION,
  WRITER_INTERNAL_ORDER,
  assertWritingPackage,
  buildWritingPackage,
  buildPrescriptionReviewPackage,
  hashWritingPackage,
  parseWritingPackage,
  publisherPayload,
  reviewDocumentTitle,
  type WritingPackage,
} from "./writing-package/index.js";

export {
  GOOGLE_PUBLISHER_UNCONFIGURED,
  createUnconfiguredPublisher,
  type GoogleDocsPublisher,
  type PublicationReceipt,
} from "./publisher/index.js";

export {
  ASSIGNMENT_ENTRY,
  WORKFLOW_STAGES,
  discoverAssignment,
  retryPublication,
  runFactory,
  type FactoryRunInput,
  type FactoryRunResult,
} from "./workflow/index.js";
