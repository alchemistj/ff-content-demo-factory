/**
 * QA-facing, deliberately small structural types.
 *
 * The writer runtime owns the canonical handoff contracts.  QA only needs to
 * inspect the resulting shape, so this module accepts a few equivalent field
 * names used by adapters (url/path, quote/excerpt, etc.) without coupling QA
 * to a guide-loader or a particular writer implementation.
 */

export type QaSeverity = "hard-fail" | "warning" | "info";

export interface QaFinding {
  code: string;
  severity: QaSeverity;
  message: string;
  route?: string | undefined;
  reviewId?: string | undefined;
  claimId?: string | undefined;
  details?: Record<string, unknown> | undefined;
}

export interface QaReport {
  pass: boolean;
  findings: QaFinding[];
  metrics: {
    pageCount: number;
    reviewCount: number;
    usedReviewCount: number;
    wordsPerReview: Record<string, number>;
  };
}

export interface QaReview {
  id: string;
  reviewer?: string | undefined;
  text: string;
  rating?: number | undefined;
  date?: string | undefined;
  source?: string | undefined;
  negativeSignals?: string[] | undefined;
  cautionSignals?: string[] | undefined;
  evidenceClassification?: string | undefined;
  suitable?: boolean | undefined;
  suitableFor?: string[] | undefined;
  notSuitableFor?: string[] | undefined;
}

export interface QaReviewPlacement {
  reviewId: string;
  quote: string;
  attribution?: string | undefined;
  claimId?: string | undefined;
  /** Absolute word offset in the flattened page, when available. */
  wordOffset?: number | undefined;
  /** If true, the writer intentionally uses the review as positive proof. */
  proofRole?: "lead" | "support" | "positive" | "context" | "negative" | "caution" | undefined;
  sectionId?: string | undefined;
  order?: number | undefined;
}

export interface QaClaim {
  id: string;
  text: string;
  /** Absolute word offset in flattened page text, when available. */
  wordOffset?: number | undefined;
  reviewId?: string | undefined;
}

export interface QaPage {
  url: string;
  pageId?: string | undefined;
  prescriptionId?: string | undefined;
  seoTitle?: string | undefined;
  metaDescription?: string | undefined;
  h1?: string | undefined;
  primaryKeyword?: string | undefined;
  pageType?: string | undefined;
  reviewGrade?: "A" | "B" | "C" | undefined;
  eligibleForReviews?: boolean | undefined;
  suitableReviewIds?: string[] | undefined;
  claims?: QaClaim[] | undefined;
  reviewPlacements?: QaReviewPlacement[] | undefined;
  sections?: unknown[] | undefined;
  /** Complete page text is optional; QA can flatten sections when absent. */
  text?: string | undefined;
  [key: string]: unknown;
}

export interface QaSite {
  pages: QaPage[];
  reviews: QaReview[];
  header?: unknown;
  footer?: unknown;
  strategyOverview?: unknown;
  [key: string]: unknown;
}

export interface QaOptions {
  /** Approximate claim-to-proof limit from the writing brief. */
  claimProximityWords?: number;
  /** Contact is intentionally exempt from sales-page review floors. */
  contactPageTypes?: string[];
  /** Additional routes that are not eligible for review floors. */
  ineligiblePageTypes?: string[];
}
