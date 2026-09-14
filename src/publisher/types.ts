import type { WritingPackage } from "../writing-package/index.js";

export type PublicationStatus = "published" | "setup-required" | "failed";

export interface PublicationError {
  readonly code: string;
  readonly message: string;
}

export interface PublicationReceipt {
  readonly status: PublicationStatus;
  readonly prospectId: string;
  readonly runId: string;
  readonly packageIdentity: {
    readonly packageHash: string;
  };
  readonly url?: string;
  readonly documentId?: string;
  readonly error?: PublicationError;
}

/**
 * Model-neutral publisher boundary. The Google Docs lane owns the real
 * implementation. This lane calls the interface at the copy gate and never
 * reruns the writer to retry publication.
 */
export interface GoogleDocsPublisher {
  publishWritingPackage(pkg: WritingPackage): Promise<PublicationReceipt>;
}

export const GOOGLE_PUBLISHER_UNCONFIGURED = "GOOGLE_PUBLISHER_UNCONFIGURED" as const;
export const GOOGLE_PUBLISHER_FAILED = "GOOGLE_PUBLISHER_FAILED" as const;
