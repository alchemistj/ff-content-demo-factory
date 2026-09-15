import { basename, dirname, resolve } from "node:path";
import { GoogleDocsError } from "./errors.js";
import type { PublicationReceipt } from "./lifecycle.js";
import { APPROVED_COPY_ROOT, approvedSnapshotRelativeDir } from "./trust.js";
import type { WritingPackage } from "../writing-package/index.js";

export interface CanonicalReviewIdentity {
  readonly kind: WritingPackage["kind"];
  readonly prospectId: string;
  readonly runId: string;
  readonly packageId: string;
  readonly packageContentHash: string;
}

export interface ImportedDocumentIdentity {
  readonly documentId: string;
  readonly importedContentHash: string;
  readonly package: WritingPackage;
}

const IDENTITY_FIELDS = ["kind", "prospectId", "runId", "packageId", "packageContentHash"] as const;

function mismatch(label: string, field: string, actual: string, expected: string): never {
  throw new GoogleDocsError(
    "import_identity_mismatch",
    `${label}: ${field} mismatch (${actual} !== ${expected}). A trusted GitHub run does not bind review identity.`,
  );
}

export function identityFromPackage(pkg: WritingPackage): CanonicalReviewIdentity {
  return {
    kind: pkg.kind,
    prospectId: pkg.prospectId,
    runId: pkg.runId,
    packageId: pkg.packageId,
    packageContentHash: pkg.packageHash,
  };
}

export function identityFromReceipt(receipt: PublicationReceipt): CanonicalReviewIdentity {
  return {
    kind: receipt.kind,
    prospectId: receipt.prospectId,
    runId: receipt.runId,
    packageId: receipt.packageId,
    packageContentHash: receipt.packageContentHash,
  };
}

export function assertCanonicalIdentityEqual(
  actual: CanonicalReviewIdentity,
  expected: CanonicalReviewIdentity,
  label: string,
  fields: readonly (typeof IDENTITY_FIELDS)[number][] = IDENTITY_FIELDS,
): void {
  for (const field of fields) {
    if (actual[field] !== expected[field]) {
      mismatch(label, field, actual[field], expected[field]);
    }
  }
}

/**
 * Bind the supplied writing package to the publication receipt before any
 * document import. Content hash is required here because this is the published
 * package, not the later human-edited snapshot.
 */
export function assertPackageReceiptIdentity(pkg: WritingPackage, receipt: PublicationReceipt): void {
  assertCanonicalIdentityEqual(identityFromPackage(pkg), identityFromReceipt(receipt), "package/receipt");
}

/**
 * Bind imported document identity to the supplied package and receipt.
 * Human edits may change packageHash; kind/prospect/run/packageId and documentId
 * must still match. A trusted GitHub run is not a substitute for this check.
 */
export function assertImportedDocumentIdentity(
  pkg: WritingPackage,
  receipt: PublicationReceipt,
  imported: ImportedDocumentIdentity,
): void {
  assertPackageReceiptIdentity(pkg, receipt);
  if (imported.documentId !== receipt.documentId) {
    mismatch("imported/receipt", "documentId", imported.documentId, receipt.documentId);
  }
  assertCanonicalIdentityEqual(identityFromPackage(imported.package), identityFromPackage(pkg), "imported/package", [
    "kind",
    "prospectId",
    "runId",
    "packageId",
  ]);
  assertCanonicalIdentityEqual(identityFromPackage(imported.package), identityFromReceipt(receipt), "imported/receipt", [
    "kind",
    "prospectId",
    "runId",
    "packageId",
  ]);
  if (imported.importedContentHash !== imported.package.packageHash) {
    mismatch(
      "imported",
      "importedContentHash",
      imported.importedContentHash,
      imported.package.packageHash,
    );
  }
}

/**
 * Fail closed if the approved snapshot destination is not approved-copy/<prospectId>
 * for the bound package/receipt. Path shape is checked on both relativeDir and
 * the filesystem snapshotDir.
 */
export function assertApprovedSnapshotIdentity(input: {
  readonly original: WritingPackage;
  readonly receipt: PublicationReceipt;
  readonly imported: ImportedDocumentIdentity;
  readonly relativeDir: string;
  readonly snapshotDir: string;
}): void {
  assertImportedDocumentIdentity(input.original, input.receipt, input.imported);
  const prospectId = input.original.prospectId;
  const expectedRelative = approvedSnapshotRelativeDir(prospectId);
  if (input.relativeDir !== expectedRelative) {
    throw new GoogleDocsError(
      "import_identity_mismatch",
      `destination relativeDir mismatch (${input.relativeDir} !== ${expectedRelative}). A trusted GitHub run does not bind the approved snapshot path.`,
    );
  }
  const resolved = resolve(input.snapshotDir);
  if (basename(resolved) !== prospectId || basename(dirname(resolved)) !== APPROVED_COPY_ROOT) {
    throw new GoogleDocsError(
      "import_identity_mismatch",
      `destination snapshotDir is not ${expectedRelative}. A trusted GitHub run does not bind the approved snapshot path.`,
    );
  }
}
