import { GOOGLE_PUBLISHER_UNCONFIGURED, type GoogleDocsPublisher, type PublicationReceipt } from "./types.js";
import type { WritingPackage } from "../writing-package/index.js";

export function createUnconfiguredPublisher(): GoogleDocsPublisher {
  return {
    async publishReviewPackage(pkg: WritingPackage): Promise<PublicationReceipt> {
      const preserved =
        pkg.kind === "prescription"
          ? "The proposed page plan is preserved. Retry publication without rerunning research or prescription."
          : "The writing package is preserved. Retry publication without rerunning the writer.";
      return {
        status: "setup-required",
        kind: pkg.kind,
        prospectId: pkg.prospectId,
        runId: pkg.runId,
        packageIdentity: { packageId: pkg.packageId, packageHash: pkg.packageHash },
        error: {
          code: GOOGLE_PUBLISHER_UNCONFIGURED,
          message: `Google Docs publication is not configured in this repository yet. ${preserved}`,
        },
      };
    },
  };
}
