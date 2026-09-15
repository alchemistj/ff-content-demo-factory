import type { ApprovedDecisions, EvidencePacket, ReviewRecord, WriterContext } from "../handoff/types.js";
import { isFaithfulReviewExcerpt, plainTextFromSpans } from "../writing-package/excerpt.js";
import type { WritingPackage } from "../writing-package/types.js";
import { assertWritingPackage } from "../writing-package/validate.js";

export class MechanicalValidationError extends Error {
  readonly failures: readonly string[];

  constructor(failures: readonly string[]) {
    super(`Mechanical validation failed: ${failures.join("; ")}`);
    this.name = "MechanicalValidationError";
    this.failures = failures;
  }
}

function quotedReviews(pkg: WritingPackage): readonly { reviewId: string; text: string; attribution: string }[] {
  const quotes: { reviewId: string; text: string; attribution: string }[] = [];
  for (const page of pkg.pages) {
    for (const block of page.blocks) {
      if (block.type === "quote" && block.reviewId) {
        quotes.push({
          reviewId: block.reviewId,
          text: plainTextFromSpans(block.spans),
          attribution: block.attribution,
        });
      }
    }
  }
  return quotes;
}

export function validateWritingMechanics(input: {
  readonly pkg: WritingPackage;
  readonly decisions: ApprovedDecisions;
  readonly evidence: EvidencePacket;
}): void {
  const failures: string[] = [];
  try {
    assertWritingPackage(input.pkg);
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }

  if (input.pkg.kind !== "website_copy") {
    failures.push("copy-gate mechanical validation requires a website_copy package");
  }

  const expectedRoutes = new Map(input.decisions.routeMap.map((entry) => [entry.pageId, entry.route]));
  for (const page of input.pkg.pages) {
    if (page.role === "header_footer" || page.role === "prescription") continue;
    const expected = expectedRoutes.get(page.pageId);
    if (!expected) {
      failures.push(`writing package includes unapproved pageId ${page.pageId}`);
      continue;
    }
    if (page.route !== expected) {
      failures.push(`${page.pageId} must keep approved route ${expected}`);
    }
  }
  for (const entry of input.decisions.routeMap) {
    if (entry.pageType === "chrome") continue;
    if (!input.pkg.pages.some((page) => page.pageId === entry.pageId)) {
      failures.push(`approved page ${entry.pageId} is missing from the writing package`);
    }
  }

  const reviews = new Map<string, ReviewRecord>(input.evidence.reviews.map((review) => [review.id, review]));
  for (const quote of quotedReviews(input.pkg)) {
    const source = reviews.get(quote.reviewId);
    if (!source) {
      failures.push(`quoted review ${quote.reviewId} is not in the source inventory`);
      continue;
    }
    if (!isFaithfulReviewExcerpt(source.exactText, quote.text)) {
      failures.push(`quoted review ${quote.reviewId} must be the exact source text or a contiguous excerpt`);
    }
    if (source.reviewer !== quote.attribution) {
      failures.push(`quoted review ${quote.reviewId} must keep source attribution`);
    }
  }

  if (failures.length) throw new MechanicalValidationError(failures);
}

export function mechanicalScope(): readonly string[] {
  return [
    "package structure",
    "approved route map",
    "audience distinction",
    "quoted-review source fidelity (exact or contiguous excerpt)",
    "package hash integrity",
  ];
}

export function writerMaySetAsideRecommendations(context: WriterContext): boolean {
  return (
    context.researchRecommendations.items.every((item) => item.stance === "advisory") &&
    context.prescriptionRecommendations.items.every((item) => item.stance === "advisory")
  );
}
