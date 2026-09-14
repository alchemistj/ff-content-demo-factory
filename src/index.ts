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
  loadApprovedCopyCatalog,
  loadExampleById,
  type ApprovedCopyCatalogReceipt,
  type LoadedExample,
} from "./approved-copy/index.js";
