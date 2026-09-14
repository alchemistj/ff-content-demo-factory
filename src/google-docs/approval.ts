import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { docsGet, type GoogleTransport } from "./google-rest.js";
import { importPagesFromDocument, importedPackageFromReadback } from "./document-reader.js";
import type { ApprovalRecord, PublicationReceipt } from "./lifecycle.js";
import { parseWritingPackage, type WritingPackage } from "../writing-package/index.js";

export interface ImportedReview {
  readonly documentId: string;
  readonly sourceRevisionId?: string;
  readonly importedContentHash: string;
  readonly package: WritingPackage;
}

export async function importReviewedDocument(
  transport: GoogleTransport,
  original: WritingPackage,
  receipt: PublicationReceipt,
): Promise<ImportedReview> {
  const document = await docsGet(transport, receipt.documentId);
  const readback = importPagesFromDocument(document, original.pages);
  const imported = parseWritingPackage(importedPackageFromReadback(original, readback));
  const result: ImportedReview = {
    documentId: receipt.documentId,
    importedContentHash: imported.packageHash,
    package: imported,
  };
  if (readback.revisionId !== undefined) {
    return { ...result, sourceRevisionId: readback.revisionId };
  }
  return result;
}

export function writeApprovedSnapshot(input: {
  readonly snapshotDir: string;
  readonly imported: ImportedReview;
  readonly actor: string;
  readonly receipt: PublicationReceipt;
  readonly relativeDir: string;
  readonly now?: string;
}): ApprovalRecord {
  mkdirSync(input.snapshotDir, { recursive: true });
  const packagePath = join(input.snapshotDir, "approved-writing-package.json");
  writeFileSync(packagePath, `${JSON.stringify(input.imported.package, null, 2)}\n`);
  const record: ApprovalRecord = {
    approvedAt: input.now ?? new Date().toISOString(),
    actor: input.actor,
    documentId: input.imported.documentId,
    importedContentHash: input.imported.importedContentHash,
    snapshotRelativeDir: input.relativeDir,
    packageId: input.receipt.packageId,
    prospectId: input.receipt.prospectId,
  };
  if (input.imported.sourceRevisionId !== undefined) {
    const withRevision = { ...record, sourceRevisionId: input.imported.sourceRevisionId };
    writeFileSync(join(input.snapshotDir, "approval-record.json"), `${JSON.stringify(withRevision, null, 2)}\n`);
    return withRevision;
  }
  writeFileSync(join(input.snapshotDir, "approval-record.json"), `${JSON.stringify(record, null, 2)}\n`);
  return record;
}
