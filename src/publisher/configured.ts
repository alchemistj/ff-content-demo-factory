import { createGoogleDocsPublisher } from "../google-docs/publisher-adapter.js";
import type { GoogleDocsPublisher } from "./types.js";

/**
 * Default publisher for both human gates. Missing Gmail OAuth becomes
 * setup-required and preserves the stored package.
 */
export function createConfiguredPublisher(): GoogleDocsPublisher {
  const inner = createGoogleDocsPublisher();
  return {
    publishReviewPackage(pkg) {
      return inner.publishReviewPackage(pkg);
    },
  };
}
