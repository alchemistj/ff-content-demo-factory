import { GOOGLE_PUBLISHER_UNCONFIGURED, type GoogleDocsPublisher, type PublicationReceipt } from "./types.js";
import type { WritingPackage } from "../writing-package/index.js";

export function createUnconfiguredPublisher(): GoogleDocsPublisher {
  return {
    async publishWritingPackage(pkg: WritingPackage): Promise<PublicationReceipt> {
      return {
        status: "setup-required",
        prospectId: pkg.prospectId,
        runId: pkg.runId,
        packageIdentity: { packageHash: pkg.packageHash },
        error: {
          code: GOOGLE_PUBLISHER_UNCONFIGURED,
          message:
            "Google Docs publication is not configured in this repository yet. The writing package is preserved. Retry publication without rerunning the writer once the google-docs lane is wired.",
        },
      };
    },
  };
}
