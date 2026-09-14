import { writingPackageContentHash, type ReviewKind, type WritingPackage } from "../writing-package/index.js";
import type { DrivePermission } from "./google-rest.js";

export const PUBLICATION_STATES = Object.freeze([
  "draft_ready",
  "published",
  "human_review",
  "publication_failed",
  "approved",
] as const);
export type PublicationState = (typeof PUBLICATION_STATES)[number];

export const REVIEW_PERMISSION = Object.freeze({
  type: "anyone",
  role: "writer",
  allowFileDiscovery: false,
} as const);

export interface PageIdentity {
  readonly pageId: string;
  readonly role: string;
  readonly namedRange: string;
  readonly route?: string;
}

export interface PublicationReceipt {
  readonly schemaVersion: "1.0.0";
  readonly kind: ReviewKind;
  readonly publicationStatus: "published" | "reused" | "new_review_version";
  readonly documentId: string;
  readonly documentUrl: string;
  readonly title: string;
  readonly prospectId: string;
  readonly runId: string;
  readonly packageId: string;
  readonly packageContentHash: string;
  readonly revisionId?: string;
  readonly folderId?: string;
  readonly publishedAt: string;
  readonly permission: typeof REVIEW_PERMISSION;
  readonly pageIdentities: readonly PageIdentity[];
  readonly reviewVersion: number;
}

export interface PublicationFailure {
  readonly status: "publication_failed";
  readonly code: string;
  readonly message: string;
  readonly missing?: readonly string[];
}

export type PublishResult =
  | { readonly ok: true; readonly receipt: PublicationReceipt; readonly state: "human_review" }
  | { readonly ok: false; readonly failure: PublicationFailure; readonly writingPreserved: true };

export interface LifecycleRecord {
  readonly schemaVersion: "1.0.0";
  readonly state: PublicationState;
  readonly prospectId: string;
  readonly packageId: string;
  readonly packageContentHash: string;
  readonly receipt?: PublicationReceipt;
  readonly approval?: ApprovalRecord;
  readonly lastError?: { readonly code: string; readonly message: string };
}

export interface ApprovalRecord {
  readonly approvedAt: string;
  readonly actor: string;
  readonly documentId: string;
  readonly sourceRevisionId?: string;
  readonly importedContentHash: string;
  readonly snapshotRelativeDir: string;
  readonly packageId: string;
  readonly prospectId: string;
}

export function humanQaTaskFromReceipt(receipt: PublicationReceipt): {
  readonly kind: ReviewKind;
  readonly documentUrl: string;
  readonly documentId: string;
  readonly title: string;
  readonly instruction: string;
} {
  return {
    kind: receipt.kind,
    documentUrl: receipt.documentUrl,
    documentId: receipt.documentId,
    title: receipt.title,
    instruction: `Open the Google Doc and edit the copy in place: ${receipt.documentUrl}`,
  };
}

export function matchesAnyoneWriter(permissions: readonly DrivePermission[]): boolean {
  return permissions.some(
    (permission) =>
      permission.type === "anyone" &&
      permission.role === "writer" &&
      permission.allowFileDiscovery === false,
  );
}

export function packageIdentity(pkg: WritingPackage): string {
  return `${pkg.prospectId}/${pkg.runId}`;
}

export function initialLifecycle(pkg: WritingPackage): LifecycleRecord {
  return {
    schemaVersion: "1.0.0",
    state: "draft_ready",
    prospectId: pkg.prospectId,
    packageId: packageIdentity(pkg),
    packageContentHash: writingPackageContentHash(pkg),
  };
}

export function documentUrlFor(documentId: string): string {
  return `https://docs.google.com/document/d/${documentId}/edit`;
}
