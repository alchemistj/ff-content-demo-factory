import type { ApprovedDecisions, EvidencePacket, ReviewRecord, WriterContext } from "../handoff/types.js";
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

function quotedReviewIds(pkg: WritingPackage): readonly { reviewId: string; text: string; attribution: string }[] {
  const quotes: { reviewId: string; text: string; attribution: string }[] = [];
  const pages = [
    pkg.pages.homepage,
    ...pkg.pages.servicePages,
    pkg.pages.contact,
    pkg.pages.strategyOverview,
  ];
  for (const page of pages) {
    for (const block of page.blocks) {
      if (block.quote?.reviewId) {
        quotes.push({
          reviewId: block.quote.reviewId,
          text: block.quote.text,
          attribution: block.quote.attribution,
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

  const expectedRoutes = new Map(input.decisions.routeMap.map((entry) => [entry.pageId, entry.route]));
  const actualPages = [
    input.pkg.pages.homepage,
    ...input.pkg.pages.servicePages,
    input.pkg.pages.contact,
    input.pkg.pages.strategyOverview,
  ];
  for (const page of actualPages) {
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
    if (!actualPages.some((page) => page.pageId === entry.pageId)) {
      failures.push(`approved page ${entry.pageId} is missing from the writing package`);
    }
  }

  const reviews = new Map<string, ReviewRecord>(input.evidence.reviews.map((review) => [review.id, review]));
  for (const quote of quotedReviewIds(input.pkg)) {
    const source = reviews.get(quote.reviewId);
    if (!source) {
      failures.push(`quoted review ${quote.reviewId} is not in the source inventory`);
      continue;
    }
    if (source.exactText !== quote.text) {
      failures.push(`quoted review ${quote.reviewId} must use exact source text`);
    }
    if (source.reviewer !== quote.attribution) {
      failures.push(`quoted review ${quote.reviewId} must keep source attribution`);
    }
  }

  if (failures.length) throw new MechanicalValidationError(failures);
}

/**
 * Taste and evidence selection are writer/human work. Mechanical validation
 * does not score copy, force recommended reviews, or compare against a taste
 * catalog.
 */
export function mechanicalScope(): readonly string[] {
  return [
    "package structure",
    "approved route map",
    "audience distinction",
    "quoted-review source fidelity",
    "package hash integrity",
  ];
}

export function writerMaySetAsideRecommendations(context: WriterContext): boolean {
  return (
    context.researchRecommendations.items.every((item) => item.stance === "advisory") &&
    context.prescriptionRecommendations.items.every((item) => item.stance === "advisory")
  );
}
