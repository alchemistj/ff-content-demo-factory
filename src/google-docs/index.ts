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
  canonicalizeWritingPackage,
  namedRangeForPage,
  reviewDocumentTitle,
  validateWritingPackage,
  writingPackageContentHash,
  type ContentBlock,
  type PageRole,
  type ReviewKind,
  type TextSpan,
  type WritingPackage,
  type WritingPackagePage,
} from "./writing-package.js";
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
