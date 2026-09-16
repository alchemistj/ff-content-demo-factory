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
  APPROVED_COPY_DIR,
  EXAMPLE_CATALOG,
  EXAMPLE_IDS,
  EXPECTED_COMPLETE_EXAMPLE_IDS,
  REQUIRED_CLIENT_REFS,
  loadApprovedCopyCatalog,
  loadExampleById,
  provenanceHasTruthfulIdentity,
  type ApprovedCopyCatalogReceipt,
  type ExampleProvenance,
  type LoadedExample,
} from "./approved-copy/index.js";

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
  createConfiguredPublisher,
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

export { createGoogleDocsPublisher } from "./google-docs/publisher-adapter.js";

export {
  D2D_FACTORY_INTAKE_VERSION,
  D2D_INTAKE_HTTP_PATH,
  D2D_INTAKE_SHARED_SECRET_ENV,
  D2D_TRANSPORT_STATUSES,
  FACTORY_QUALIFICATION_OUTCOMES,
  acceptD2dIntake,
  handleD2dIntakeRequest,
  intakeCorrelationId,
  mapAdvancedBusinessToSeed,
  normalizeRawBusiness,
  parseD2dIntakeBatch,
  type D2dIntakeBatch,
  type D2dIntakeBatchReceipt,
  type D2dBusinessReceipt,
} from "./d2d-intake/index.js";

export {
  createFactoryQualifier,
  FORBIDDEN_CONCLUSION_FIELDS,
} from "./factory/index.js";
