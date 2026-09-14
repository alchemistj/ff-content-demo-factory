export {
  GUIDE_CATALOG,
  GUIDE_IDS,
  STAGE_GUIDE_IDS,
  WRITER_GUIDES_DIR,
  defaultRepoRoot,
  loadCanonicalGuideCatalog,
  loadWriterStageGuides,
  type GuideCatalogReceipt,
  type StageGuideSet,
} from "./writer-guides/index.js";
export {
  APPROVED_COPY_DIR,
  EXAMPLE_CATALOG,
  EXAMPLE_IDS,
  EXPECTED_COMPLETE_EXAMPLE_IDS,
  REQUIRED_CLIENT_REFS,
  loadApprovedCopyCatalog,
  loadExampleById,
  provenanceLooksLikeGitSource,
  type ApprovedCopyCatalogReceipt,
  type ExampleProvenance,
  type LoadedExample,
} from "./approved-copy/index.js";
