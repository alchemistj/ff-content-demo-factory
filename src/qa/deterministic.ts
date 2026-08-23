import type { QaFinding, QaOptions, QaPage, QaReport, QaReview, QaSite } from "./types.js";
import { normalizeSite, nestedPlacements, pageText, pageRoute, words } from "./normalize.js";

const DEFAULT_OPTIONS: Required<QaOptions> = {
  claimProximityWords: 150,
  contactPageTypes: ["contact"],
  ineligiblePageTypes: ["strategy", "strategy-overview", "thank-you", "legal", "privacy"],
};

function finding(code: string, severity: QaFinding["severity"], message: string, extra: Partial<QaFinding> = {}): QaFinding {
  return { code, severity, message, ...extra };
}

function isContact(page: QaPage, options: Required<QaOptions>): boolean {
  const route = pageRoute(page).toLowerCase();
  return options.contactPageTypes.some((type) => (page.pageType ?? "").toLowerCase() === type || route === `/${type}` || route.endsWith(`/${type}`));
}

function eligible(page: QaPage, options: Required<QaOptions>): boolean {
  // Contact stays lean by default. If the approved handoff explicitly assigns
  // a review grade, however, that upstream decision makes it review-eligible.
  if (isContact(page, options) && !page.reviewGrade) return false;
  if (page.eligibleForReviews === false) return false;
  const type = (page.pageType ?? "").toLowerCase();
  if (options.ineligiblePageTypes.includes(type)) return false;
  return true;
}

function suitableReviews(page: QaPage, reviews: QaReview[]): QaReview[] {
  const explicit = page.suitableReviewIds;
  const candidates = explicit ? reviews.filter((review) => explicit.includes(review.id)) : reviews;
  return candidates.filter((review) => {
    if (review.suitable === false) return false;
    const pageKeys = [page.url, page.pageId, page.prescriptionId, page.pageType].filter((value): value is string => Boolean(value));
    if (review.notSuitableFor?.some((value) => pageKeys.includes(value))) return false;
    if (!review.suitableFor?.length) return true;
    return review.suitableFor.some((route) => pageKeys.includes(route));
  });
}

function requiredReviewCount(page: QaPage, suitableCount: number): number {
  // The floor is a property of the assigned grade, not a reward for having
  // only one suitable review. If the inventory cannot meet it, QA must expose
  // that contradiction as a hard failure.
  if (page.reviewGrade === "A") return 3;
  if (page.reviewGrade === "B") return 2;
  if (page.reviewGrade === "C") return suitableCount > 0 ? 1 : 0;
  return 0;
}

function sectionSequence(page: QaPage): Map<string, number> {
  const result = new Map<string, number>();
  let sequence = 0;
  const scan = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(scan);
    if (!value || typeof value !== "object") return;
    const item = value as Record<string, unknown>;
    const id = typeof item.sectionId === "string" ? item.sectionId : typeof item.id === "string" ? item.id : typeof item.heading === "string" ? item.heading : undefined;
    if (id && !result.has(id)) result.set(id, sequence++);
    [item.sections, item.blocks, item.items].forEach(scan);
  };
  scan(page.sections);
  return result;
}

function quoteMatches(quote: string, source: string): boolean {
  const q = quote.trim().replace(/[“”"']/gu, "").replace(/\s+/gu, " ").toLowerCase();
  const s = source.trim().replace(/[“”"']/gu, "").replace(/\s+/gu, " ").toLowerCase();
  if (!q || !s) return false;
  // Exact contiguous text is preferred. Ellipses are allowed only at boundaries
  // or between words, and each remaining fragment must be source-contiguous.
  if (s.includes(q)) return true;
  const parts = q.split(/\.{3}|…/u).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return false;
  let cursor = 0;
  for (const part of parts) {
    const at = s.indexOf(part, cursor);
    if (at < cursor) return false;
    cursor = at + part.length;
  }
  return true;
}

function usedReviewWordMetrics(site: QaSite): Record<string, number> {
  const byId: Record<string, number> = {};
  for (const page of site.pages) {
    const totalWords = words(pageText(page));
    const placements = nestedPlacements(page);
    for (const placement of placements) {
      byId[placement.reviewId] = (byId[placement.reviewId] ?? 0) + totalWords;
    }
  }
  return byId;
}

/**
 * Counting and text-integrity gates.  No density threshold is applied: the
 * words-per-review metric is informational only.
 */
export function runDeterministicQa(input: unknown, options: QaOptions = {}): QaReport {
  const site = normalizeSite(input);
  const opts: Required<QaOptions> = { ...DEFAULT_OPTIONS, ...options };
  const findings: QaFinding[] = [];
  const routes = new Map<string, number>();
  const knownReviews = new Map(site.reviews.map((review) => [review.id, review]));

  if (!site.pages.length) findings.push(finding("missing-pages", "hard-fail", "No website pages were supplied."));
  for (const page of site.pages) {
    const route = pageRoute(page);
    const routeCount = (routes.get(route) ?? 0) + 1;
    routes.set(route, routeCount);
    if (!route || route === `page-${site.pages.indexOf(page) + 1}`) findings.push(finding("missing-route", "hard-fail", "Page is missing a URL/route.", route ? { route } : {}));
    if (!page.seoTitle) findings.push(finding("missing-seo-title", "hard-fail", "Page is missing an SEO title.", { route }));
    if (!page.metaDescription) findings.push(finding("missing-meta-description", "hard-fail", "Page is missing a meta description.", { route }));
    if (!page.h1) findings.push(finding("missing-h1", "hard-fail", "Page is missing an H1.", { route }));
  }
  for (const [route, count] of routes) if (route && count > 1) findings.push(finding("duplicate-route", "hard-fail", `Route ${route} is used by ${count} pages.`, { route }));

  const wordsPerReview = usedReviewWordMetrics(site);
  let usedReviewCount = 0;
  for (const page of site.pages) {
    const route = pageRoute(page);
    // Preserve authored block order. `order` is metadata and must not be
    // trusted to manufacture intervening content (1,3,5 is still adjacent).
    const placements = nestedPlacements(page);
    const pageEligible = eligible(page, opts);
    const suitable = suitableReviews(page, site.reviews);
    const suitableIds = new Set(suitable.map((review) => review.id));
    for (const suitableId of page.suitableReviewIds ?? []) {
      if (!knownReviews.has(suitableId)) findings.push(finding("unresolvable-suitable-review-id", "hard-fail", `Suitable-review reference ${suitableId} is not in the verified review inventory.`, { route, reviewId: suitableId }));
    }
    const required = pageEligible ? requiredReviewCount(page, suitable.length) : 0;
    const usedIds = new Set(placements.map((placement) => placement.reviewId));
    usedReviewCount += usedIds.size;
    if (pageEligible && suitable.length > 0 && usedIds.size === 0) {
      findings.push(finding("zero-review-eligible-sales-page", "hard-fail", "An eligible sales page has suitable review anchors but uses zero reviews.", { route }));
    }
    const kind = (page.pageType ?? "").toLowerCase().replace(/[ _-]+/gu, "");
    if (pageEligible && (kind === "service" || kind === "servicepage" || kind === "homepage") && !page.prescriptionId) {
      findings.push(finding("missing-prescription-page-id", "hard-fail", "Eligible sales page cannot be mapped to its approved page prescription.", { route }));
    }
    if (pageEligible && page.reviewGrade && usedIds.size < required) {
      findings.push(finding("review-floor", "hard-fail", `Grade ${page.reviewGrade} page uses ${usedIds.size} review(s); ${required} required.`, { route, details: { grade: page.reviewGrade, used: usedIds.size, required, suitable: suitable.length } }));
    }
    if (pageEligible && (page.reviewGrade === "A" || page.reviewGrade === "B")) {
      const leads = placements.filter((placement) => placement.proofRole === "lead").length;
      const supports = placements.filter((placement) => placement.proofRole === "support").length;
      const requiredLeads = 1;
      const requiredSupports = page.reviewGrade === "A" ? 2 : 1;
      if (leads < requiredLeads || supports < requiredSupports) {
        findings.push(finding("review-role-floor", "hard-fail", `Grade ${page.reviewGrade} requires at least ${requiredLeads} lead and ${requiredSupports} support review(s).`, { route, details: { leads, supports, requiredLeads, requiredSupports } }));
      }
    }
    for (const placement of placements) {
      const review = knownReviews.get(placement.reviewId);
      if (!review) {
        findings.push(finding("unresolvable-review-id", "hard-fail", `Placed review ${placement.reviewId} is not in the verified review inventory.`, { route, reviewId: placement.reviewId }));
        continue;
      }
      if (pageEligible && !suitableIds.has(placement.reviewId)) {
        findings.push(finding("unsuitable-review-placement", "hard-fail", `Placed review ${placement.reviewId} is not suitable for this prescribed page.`, { route, reviewId: placement.reviewId }));
      }
      if (!placement.attribution) {
        findings.push(finding("missing-review-attribution", "hard-fail", `Placed review ${placement.reviewId || "[missing ID]"} has no reviewer attribution.`, { route, reviewId: placement.reviewId || undefined }));
      }
      if (!quoteMatches(placement.quote, review.text)) {
        findings.push(finding("review-quote-mismatch", "hard-fail", `Placed quote for ${placement.reviewId} is not an exact or faithful excerpt of the source review.`, { route, reviewId: placement.reviewId }));
      }
      if (placement.attribution && review.reviewer && !placement.attribution.toLowerCase().includes(review.reviewer.toLowerCase())) {
        findings.push(finding("review-attribution-mismatch", "hard-fail", `Placed attribution does not preserve reviewer identity for ${placement.reviewId}.`, { route, reviewId: placement.reviewId }));
      }
      if ((placement.proofRole === "positive" || placement.proofRole === "lead" || placement.proofRole === "support") && ((review.negativeSignals?.length ?? 0) > 0 || (review.cautionSignals?.length ?? 0) > 0 || (review.evidenceClassification?.toLowerCase().includes("negative") ?? false))) {
        findings.push(finding("negative-review-used-as-positive-proof", "hard-fail", `Negative/caution review ${placement.reviewId} is marked as positive proof.`, { route, reviewId: placement.reviewId }));
      }
    }
    const sectionIndexes = sectionSequence(page);
    for (const placement of placements) {
      if (placement.sectionId && !sectionIndexes.has(placement.sectionId)) findings.push(finding("orphan-review-placement", "hard-fail", `Review ${placement.reviewId} targets an authored section that does not exist.`, { route, reviewId: placement.reviewId, details: { sectionId: placement.sectionId } }));
    }
    for (let i = 1; i < placements.length; i += 1) {
      const previous = placements[i - 1];
      const current = placements[i];
      if (!previous || !current) continue;
      if (previous.sectionId && previous.sectionId === current.sectionId) {
        findings.push(finding("adjacent-reviews", "hard-fail", "Two reviews are adjacent/clumped in one page section.", { route, reviewId: current.reviewId }));
      } else if (previous.wordOffset !== undefined && current.wordOffset !== undefined) {
        const gap = current.wordOffset - (previous.wordOffset + words(previous.quote));
        if (gap <= 1) findings.push(finding("adjacent-reviews", "hard-fail", "Two reviews are adjacent in the authored word sequence.", { route, reviewId: current.reviewId, details: { gap } }));
      } else if (previous.sectionId && current.sectionId && sectionIndexes.has(previous.sectionId) && sectionIndexes.has(current.sectionId) && Math.abs((sectionIndexes.get(current.sectionId) ?? 0) - (sectionIndexes.get(previous.sectionId) ?? 0)) <= 1) {
        findings.push(finding("adjacent-reviews", "hard-fail", "Consecutive review blocks have no intervening authored content.", { route, reviewId: current.reviewId }));
      } else {
        findings.push(finding("review-sequence-unverifiable", "hard-fail", "Review placement sequence lacks offsets or authored section/block structure; adjacency fails closed.", { route, reviewId: current.reviewId }));
      }
    }
    const text = pageText(page);
    for (const placement of placements) {
      if (!placement.claimId) {
        findings.push(finding("missing-assigned-claim", "hard-fail", `Placed review ${placement.reviewId || "[missing ID]"} does not name the claim it proves.`, { route, reviewId: placement.reviewId || undefined }));
        continue;
      }
      const claim = (page.claims ?? []).find((candidate) => candidate.id === placement.claimId);
      if (!claim) {
        findings.push(finding("unresolvable-claim-id", "hard-fail", `Review ${placement.reviewId} names a claim that is not present.`, { route, reviewId: placement.reviewId, claimId: placement.claimId }));
        continue;
      }
      const claimOffset = claim.wordOffset ?? wordOffset(text, claim.text);
      const reviewOffset = placement.wordOffset ?? wordOffset(text, placement.quote);
      if (claimOffset === undefined || reviewOffset === undefined) {
        findings.push(finding("review-claim-proximity-unmeasurable", "hard-fail", `Proximity for review ${placement.reviewId} cannot be measured from offsets or authored text.`, { route, reviewId: placement.reviewId, claimId: placement.claimId }));
      } else if (Math.abs(claimOffset - reviewOffset) > opts.claimProximityWords) {
        findings.push(finding("review-claim-too-distant", "hard-fail", `Review ${placement.reviewId} is more than approximately ${opts.claimProximityWords} words from its assigned claim.`, { route, reviewId: placement.reviewId, claimId: placement.claimId, details: { distance: Math.abs(claimOffset - reviewOffset), limit: opts.claimProximityWords } }));
      }
    }
    // Density is observable but deliberately never emitted as a failure.
    if (placements.length > 0) findings.push(finding("review-density-reported", "info", `Page contains ${words(text)} words across ${placements.length} review placement(s); density is informational only.`, { route, details: { words: words(text), reviews: placements.length } }));
  }
  return {
    pass: !findings.some((item) => item.severity === "hard-fail"),
    findings,
    metrics: { pageCount: site.pages.length, reviewCount: site.reviews.length, usedReviewCount, wordsPerReview },
  };
}

function wordOffset(text: string, needle: string): number | undefined {
  const at = text.toLowerCase().indexOf(needle.trim().toLowerCase());
  if (at < 0) return undefined;
  return words(text.slice(0, at));
}
