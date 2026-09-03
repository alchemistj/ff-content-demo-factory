/**
 * Lane A's review/domain handoff contract.
 *
 * These types deliberately describe evidence and decisions, not a writing
 * guide implementation.  The authority/source strings are provenance carried
 * by the handoff so a Cursor-backed or Drive-backed guide can be swapped in
 * without changing this contract.
 */

export const LANE_A_HANDOFF_VERSION = "lane-a-review-handoff/v1" as const;

export type ReviewGrade = "A" | "B" | "C";
export type ReviewClassification = "positive" | "negative" | "mixed" | "neutral";
export type ReviewSuitability = "high" | "medium" | "low" | "not_suitable";
export type UpstreamAuthorityJudgment =
  | "authoritative"
  | "partially_authoritative"
  | "not_authoritative"
  | "unknown";

export type EvidenceKind = "confirmed_fact" | "site_evidence" | "image" | "review";

export interface EvidenceRef {
  kind: EvidenceKind;
  refId: string;
}

export interface Address {
  street: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

export interface BusinessIdentity {
  name: string;
  trade: string;
  serviceArea: string;
  legalName?: string;
}

export interface Nap {
  name: string;
  address: Address;
  phone: string;
  website: string;
}

export interface ConfirmedFact {
  id: string;
  fact: string;
  evidence: readonly EvidenceRef[];
  confirmedAt: string;
}

export interface SiteEvidence {
  id: string;
  url: string;
  pageType: string;
  observation: string;
  capturedAt: string;
  source: string;
}

export interface ImageRef {
  id: string;
  url: string;
  altText: string;
  source: string;
  evidenceUse: string;
}

export type ReviewSourceType =
  | "customer_review"
  | "company_testimonial"
  | "business_profile"
  | "user_brief"
  | "other";

export interface ReviewProvenance {
  sourceType: ReviewSourceType;
  sourceUrl: string;
  capturedAt: string;
  sourceLabel: string;
}

export interface ReviewPageSuitability {
  pageId: string;
  suitability: ReviewSuitability;
  reason: string;
}

export interface ReviewRecord {
  id: string;
  reviewer: string;
  exactText: string;
  rating: number;
  date?: string;
  provenance: ReviewProvenance;
  classification: ReviewClassification;
  serviceTopicSignals: readonly string[];
  concreteWorkSignals: readonly string[];
  negatives: readonly string[];
  suitability: ReviewSuitability;
  pageSuitability: readonly ReviewPageSuitability[];
  upstreamAuthorityJudgment: UpstreamAuthorityJudgment;
}

export interface Destination {
  id: string;
  url: string;
  label?: string;
  purpose?: string;
}

export interface StrategyDestination {
  url: string;
  label: string;
  decisionPath: string;
  rationale: string;
}

export interface PagePrescription extends Destination {
  label: string;
  purpose: string;
  keyword: string;
  titleH1Direction: string;
  angleCustomerDecision: string;
  inclusionReason: string;
  majorEvidence: readonly EvidenceRef[];
  recommendedFirstReview: string;
  recommendedFirstReviewReason: string;
  traps: readonly string[];
  siblingOverlapBoundaries: readonly string[];
  reviewGrade?: ReviewGrade;
}

export interface HomepagePrescription extends PagePrescription {
  reviewGrade: ReviewGrade;
}

export interface ContactPagePrescription extends PagePrescription {}

export interface ServicePagePrescription extends Omit<PagePrescription, "label" | "purpose"> {
  id: string;
  reviewGrade: ReviewGrade;
}

export interface DestinationPlan {
  homepage: HomepagePrescription;
  contact: ContactPagePrescription;
  header: readonly Destination[];
  footer: readonly Destination[];
  strategy: StrategyDestination;
  servicePages: readonly [ServicePagePrescription, ServicePagePrescription];
}

export interface ProspectContract {
  id: string;
  business: BusinessIdentity;
  nap: Nap;
  confirmedFacts: readonly ConfirmedFact[];
  siteEvidence: readonly SiteEvidence[];
  imageRefs: readonly ImageRef[];
  reviewInventory: readonly ReviewRecord[];
  destinations: DestinationPlan;
}

export interface ApprovalRecord {
  status: "approved";
  approvedAt: string;
  approvedBy: string;
}

/** A handoff contains exactly one approved prospect, never a prospect list. */
export interface ApprovedProspectHandoff {
  version: typeof LANE_A_HANDOFF_VERSION;
  approval: ApprovalRecord;
  prospect: ProspectContract;
}
