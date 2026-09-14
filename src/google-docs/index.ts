export {
  DRIVE_FILE_SCOPE,
  GOOGLE_PUBLIC_ENV,
  GOOGLE_SECRET_ENV,
  missingGoogleConfigNames,
  publicationFailureFromConfig,
  requireGoogleConfig,
  type GoogleDocsConfig,
  type GoogleDocsConfigLoad,
} from "./config.js";
export { GoogleDocsError, isGoogleDocsError } from "./errors.js";
export { redactSecrets } from "./redaction.js";
export {
  REVIEW_KINDS,
  WRITING_PACKAGE_SCHEMA_VERSION,
  WEBSITE_COPY_READING_ORDER,
  buildWritingPackage,
  canonicalizeWritingPackage,
  hashWritingPackage,
  parseWritingPackage,
  publisherPayload,
  reviewDocumentTitle,
  type ContentBlock,
  type PageRole,
  type ReviewKind,
  type TextSpan,
  type WritingPackage,
  type WritingPackagePage,
} from "../writing-package/index.js";
export { namedRangeForPage, namedRangeForQuote, parseQuoteNamedRange } from "./named-ranges.js";
export {
  humanQaTaskFromReceipt,
  initialLifecycle,
  type ApprovalRecord,
  type LifecycleRecord,
  type PublicationReceipt,
  type PublishResult,
} from "./lifecycle.js";
export { buildNativeDocument, looksLikeMarkdownDump } from "./document-builder.js";
export { importPagesFromDocument, importedPackageFromReadback } from "./document-reader.js";
export {
  lifecycleAfterPublish,
  missingConfigPublishResult,
  publishForHumanReview,
} from "./publisher.js";
export { createGoogleDocsPublisher, type GoogleDocsPublisher, type GoogleDocsPublisherOptions, type PublicationError, type PublisherPublicationReceipt } from "./publisher-adapter.js";
export { importReviewedDocument, writeApprovedSnapshot } from "./approval.js";
export {
  createLabeledTestDocument,
  initializeReviewFolder,
  testGoogleConnection,
  trashLabeledTestDocument,
} from "./connection.js";
export { authorizeDesktopUser, authorizationReceiptLog } from "./authorize.js";
export { loadGoogleDocsConfig, createLiveTransport } from "./runtime.js";
export { createAuthorizedTransport, type GoogleTransport } from "./google-rest.js";
export { APPROVED_COPY_ROOT, TRUSTED_BRANCH, TRUSTED_REF } from "./trust.js";
export {
  APPROVE_WORKFLOW_FILE,
  PUBLISH_ARTIFACT_NAME,
  PUBLISH_HANDOFF_DIR,
  PUBLISH_WORKFLOW_FILE,
  assertTrustedPublishRun,
  formatPublishJobSummary,
} from "./publish-handoff.js";
