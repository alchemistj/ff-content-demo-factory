import type { WritingPackage } from "../writing-package/index.js";
import type { ReviewKind } from "../writing-package/types.js";

export type PublicationStatus = "published" | "setup-required" | "failed";

export interface PublicationError {
  readonly code: string;
  readonly message: string;
}

export interface PublicationReceipt {
  readonly status: PublicationStatus;
  readonly kind: ReviewKind;
  readonly prospectId: string;
  readonly runId: string;
  readonly packageIdentity: {
    readonly packageId: string;
    readonly packageHash: string;
  };
  readonly url?: string;
  readonly documentId?: string;
  readonly error?: PublicationError;
}

/**
 * Model-neutral publisher boundary for both existing human gates.
 * The Google Docs lane owns the real implementation. Retrying publication
 * must not rerun research, prescription, or the writer.
 */
export interface GoogleDocsPublisher {
  publishReviewPackage(pkg: WritingPackage): Promise<PublicationReceipt>;
}

export const GOOGLE_PUBLISHER_UNCONFIGURED = "GOOGLE_PUBLISHER_UNCONFIGURED" as const;
export const GOOGLE_PUBLISHER_FAILED = "GOOGLE_PUBLISHER_FAILED" as const;
