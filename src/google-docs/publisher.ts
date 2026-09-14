import { GoogleDocsError } from "./errors.js";
import { publicationFailureFromConfig, type GoogleDocsConfig } from "./config.js";
import { buildNativeDocument } from "./document-builder.js";
import { assertImportableDocument, documentEndIndex } from "./document-reader.js";
import {
  docsBatchUpdate,
  docsGet,
  driveCreateFile,
  driveCreatePermission,
  driveGetFile,
  driveListPermissions,
  driveUpdateFile,
  type DocsDocument,
  type DocsRequest,
  type GoogleTransport,
} from "./google-rest.js";
import { redactSecrets } from "./redaction.js";
import {
  REVIEW_PERMISSION,
  documentUrlFor,
  initialLifecycle,
  matchesAnyoneWriter,
  packageIdentity,
  type LifecycleRecord,
  type PublicationFailure,
  type PublicationReceipt,
  type PublishResult,
} from "./lifecycle.js";
import { hashWritingPackage, type WritingPackage } from "../writing-package/index.js";

export interface PublishOptions {
  readonly newReviewVersion?: boolean;
  readonly now?: string;
}

const GOOGLE_DOC_MIME = "application/vnd.google-apps.document";

export async function publishForHumanReview(
  transport: GoogleTransport,
  pkg: WritingPackage,
  config: GoogleDocsConfig,
  lifecycle: LifecycleRecord | undefined,
  options: PublishOptions = {},
): Promise<PublishResult> {
  const current = lifecycle ?? initialLifecycle(pkg);
  const contentHash = hashWritingPackage(pkg);
  try {
    if (!config.folderId) {
      return failed(
        "folder_inaccessible",
        "GOOGLE_DRIVE_FOLDER_ID is not set. Run npm run google-docs:init-folder and store the returned folder ID.",
      );
    }

    const existing = current.receipt;
    if (existing && existing.packageId === packageIdentity(pkg) && !options.newReviewVersion) {
      const live = await docsGet(transport, existing.documentId);
      const humanEdited = Boolean(
        existing.revisionId && live.revisionId && live.revisionId !== existing.revisionId,
      );
      if (humanEdited && (current.state === "human_review" || contentHash !== existing.packageContentHash)) {
        throw new GoogleDocsError(
          "human_edits_protected",
          "The Google Doc has changed since publication. Refusing to overwrite human edits. Pass a new review version only when a replacement Doc is intended.",
        );
      }
      if (contentHash === existing.packageContentHash && current.state !== "publication_failed") {
        const verified = await readBackReceipt(transport, pkg, existing, contentHash, existing.reviewVersion);
        return { ok: true, receipt: { ...verified, publicationStatus: "reused" }, state: "human_review" };
      }
      if (!humanEdited) {
        const built = buildNativeDocument(pkg, existing.reviewVersion);
        await rewriteDocument(transport, existing.documentId, live, built.insertText, built.requests, live.revisionId);
        await driveUpdateFile(transport, existing.documentId, { name: built.title });
        const receipt = await readBackReceipt(transport, pkg, existing, contentHash, existing.reviewVersion);
        return { ok: true, receipt: { ...receipt, publicationStatus: "reused", title: built.title }, state: "human_review" };
      }
    }

    const version = options.newReviewVersion && existing ? existing.reviewVersion + 1 : 1;
    const built = buildNativeDocument(pkg, version);
    const created = await driveCreateFile(transport, {
      name: built.title,
      mimeType: GOOGLE_DOC_MIME,
      parents: [config.folderId],
      description: `ff-content-factory ${pkg.kind} ${packageIdentity(pkg)}`,
    });
    const createdDoc = await docsGet(transport, created.id);
    await docsBatchUpdate(transport, created.id, {
      requests: built.requests,
      ...(createdDoc.revisionId ? { writeControl: { requiredRevisionId: createdDoc.revisionId } } : {}),
    });
    await driveCreatePermission(transport, created.id, REVIEW_PERMISSION);
    const seed: PublicationReceipt = {
      schemaVersion: "1.0.0",
      kind: pkg.kind,
      publicationStatus: version > 1 ? "new_review_version" : "published",
      documentId: created.id,
      documentUrl: created.webViewLink ?? documentUrlFor(created.id),
      title: built.title,
      prospectId: pkg.prospectId,
      runId: pkg.runId,
      packageId: packageIdentity(pkg),
      packageContentHash: contentHash,
      folderId: config.folderId,
      publishedAt: options.now ?? new Date().toISOString(),
      permission: REVIEW_PERMISSION,
      pageIdentities: built.pageRanges.map((page) => {
        const identity: PublicationReceipt["pageIdentities"][number] = {
          pageId: page.pageId,
          role: page.role,
          namedRange: page.namedRange,
        };
        return page.route !== undefined ? { ...identity, route: page.route } : identity;
      }),
      reviewVersion: version,
    };
    const receipt = await readBackReceipt(transport, pkg, seed, contentHash, version);
    return { ok: true, receipt, state: "human_review" };
  } catch (error) {
    if (error instanceof GoogleDocsError && error.code === "human_edits_protected") throw error;
    const failure = toFailure(error);
    return { ok: false, failure, writingPreserved: true };
  }
}

export function missingConfigPublishResult(missing: readonly string[]): PublishResult {
  return {
    ok: false,
    failure: publicationFailureFromConfig(missing),
    writingPreserved: true,
  };
}

export function lifecycleAfterPublish(
  pkg: WritingPackage,
  result: PublishResult,
): LifecycleRecord {
  const base = initialLifecycle(pkg);
  if (!result.ok) {
    return {
      ...base,
      state: "publication_failed",
      lastError: { code: result.failure.code, message: result.failure.message },
    };
  }
  return {
    ...base,
    state: "human_review",
    packageContentHash: result.receipt.packageContentHash,
    receipt: result.receipt,
  };
}

async function rewriteDocument(
  transport: GoogleTransport,
  documentId: string,
  live: DocsDocument,
  insertText: string,
  requests: readonly DocsRequest[],
  requiredRevisionId?: string,
): Promise<void> {
  const end = documentEndIndex(live);
  const deleteRanges: DocsRequest[] = Object.keys(live.namedRanges ?? {}).map((name) => ({
    deleteNamedRange: { name },
  }));
  const rewrite: DocsRequest[] = [
    ...deleteRanges,
    ...(end > 2
      ? [{ deleteContentRange: { range: { startIndex: 1, endIndex: end - 1 } } }]
      : []),
    ...requests,
  ];
  await docsBatchUpdate(transport, documentId, {
    requests: rewrite,
    ...(requiredRevisionId ? { writeControl: { requiredRevisionId } } : {}),
  });
  void insertText;
}

async function readBackReceipt(
  transport: GoogleTransport,
  pkg: WritingPackage,
  seed: PublicationReceipt,
  contentHash: string,
  version: number,
): Promise<PublicationReceipt> {
  const file = await driveGetFile(transport, seed.documentId);
  const permissions = await driveListPermissions(transport, seed.documentId);
  const document = await docsGet(transport, seed.documentId);
  assertImportableDocument(document);
  if (!matchesAnyoneWriter(permissions)) {
    throw new GoogleDocsError(
      "permission_mismatch",
      "Published document is not Anyone with the link — Editor (type=anyone, role=writer, allowFileDiscovery=false).",
    );
  }
  const receipt: PublicationReceipt = {
    ...seed,
    documentUrl: file.webViewLink ?? documentUrlFor(seed.documentId),
    title: file.name,
    packageContentHash: contentHash,
    publishedAt: seed.publishedAt,
    reviewVersion: version,
    kind: pkg.kind,
  };
  if (document.revisionId !== undefined) {
    return { ...receipt, revisionId: document.revisionId };
  }
  return receipt;
}

function failed(code: string, message: string): PublishResult {
  const failure: PublicationFailure = { status: "publication_failed", code, message };
  return { ok: false, failure, writingPreserved: true };
}

function toFailure(error: unknown): PublicationFailure {
  if (error instanceof GoogleDocsError) {
    return { status: "publication_failed", code: error.code, message: redactSecrets(error.message) };
  }
  return {
    status: "publication_failed",
    code: "google_api_error",
    message: redactSecrets(error instanceof Error ? error.message : error),
  };
}
