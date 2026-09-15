import type { ReviewKind, WritingPackage } from "../writing-package/index.js";
import { loadGoogleDocsConfig, createLiveTransport } from "./runtime.js";
import { missingConfigPublishResult, publicationFailureFromError, publishForHumanReview } from "./publisher.js";
import { GoogleDocsError } from "./errors.js";
import type { LifecycleRecord, PublicationFailure } from "./lifecycle.js";
import type { GoogleDocsConfigLoad } from "./config.js";
import type { GoogleTransport } from "./google-rest.js";

export type PublicationStatus = "published" | "setup-required" | "failed";

export interface PublicationError {
  readonly code: string;
  readonly message: string;
}

/**
 * Workflow-lane publisher receipt. Matches the PR #30 publisher contract.
 */
export interface PublisherPublicationReceipt {
  readonly status: PublicationStatus;
  readonly kind: ReviewKind;
  readonly prospectId: string;
  readonly runId: string;
  readonly packageIdentity: { readonly packageId: string; readonly packageHash: string };
  readonly url?: string;
  readonly documentId?: string;
  readonly error?: PublicationError;
}

/**
 * Model-neutral publisher boundary for both existing human gates.
 * This does not add a gate. Retrying publication must not rerun the writer.
 */
export interface GoogleDocsPublisher {
  publishReviewPackage(pkg: WritingPackage, lifecycle?: LifecycleRecord): Promise<PublisherPublicationReceipt>;
}

export interface GoogleDocsPublisherOptions {
  readonly loadConfig?: () => GoogleDocsConfigLoad;
  readonly createTransport?: (config: GoogleDocsConfigLoad["config"]) => Promise<GoogleTransport>;
}

export function createGoogleDocsPublisher(options: GoogleDocsPublisherOptions = {}): GoogleDocsPublisher {
  const loadConfig = options.loadConfig ?? loadGoogleDocsConfig;
  const createTransport = options.createTransport ?? createLiveTransport;
  return {
    async publishReviewPackage(pkg: WritingPackage, lifecycle?: LifecycleRecord): Promise<PublisherPublicationReceipt> {
      const identity = {
        kind: pkg.kind,
        prospectId: pkg.prospectId,
        runId: pkg.runId,
        packageIdentity: { packageId: pkg.packageId, packageHash: pkg.packageHash },
      };
      try {
        const loaded = loadConfig();
        if (loaded.missing.length > 0) {
          const unpublished = missingConfigPublishResult(loaded.missing);
          if (!unpublished.ok) {
            return receiptFromFailure(identity, unpublished.failure, "setup-required");
          }
        }
        const transport = await createTransport(loaded.config);
        const result = await publishForHumanReview(transport, pkg, loaded.config, lifecycle);
        if (!result.ok) {
          return receiptFromFailure(identity, result.failure);
        }
        return {
          status: "published",
          ...identity,
          url: result.receipt.documentUrl,
          documentId: result.receipt.documentId,
        };
      } catch (error) {
        if (error instanceof GoogleDocsError && error.code === "human_edits_protected") throw error;
        const failure = publicationFailureFromError(error);
        const status: PublicationStatus = failure.code === "missing_google_config" ? "setup-required" : "failed";
        return receiptFromFailure(identity, failure, status);
      }
    },
  };
}

function receiptFromFailure(
  identity: {
    readonly kind: ReviewKind;
    readonly prospectId: string;
    readonly runId: string;
    readonly packageIdentity: { readonly packageId: string; readonly packageHash: string };
  },
  failure: PublicationFailure,
  status: PublicationStatus = "failed",
): PublisherPublicationReceipt {
  return {
    status,
    ...identity,
    error: { code: failure.code, message: failure.message },
  };
}
