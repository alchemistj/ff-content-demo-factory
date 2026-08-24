/**
 * Lane A's review/domain handoff contract.
 *
 * This contract carries the complete evidence packet plus immutable provenance
 * and approval bindings required before writing can begin.
 */
export const LANE_A_HANDOFF_VERSION = "lane-a-review-handoff/v1" as const;
export const STANDARD_BUSINESS_HOME_ROUTE = "/" as const;
export const STANDARD_CONTACT_ROUTE = "/contact" as const;

export type ReviewGrade = "A" | "B" | "C";
export type ReviewClassification = "positive" | "negative" | "mixed" | "neutral";
export type ReviewSuitability = "high" | "medium" | "low" | "not_suitable";
export type UpstreamAuthorityJudgment = "authoritative" | "partially_authoritative" | "not_authoritative" | "unknown";
export type EvidenceKind = "confirmed_fact" | "site_evidence" | "image" | "review";

export interface EvidenceRef { kind: EvidenceKind; refId: string; }
export interface Address { street: string; city: string; region: string; postalCode: string; country: string; }
export interface BusinessIdentity { name: string; trade: string; serviceArea: string; legalName?: string; }
export interface Nap { name: string; address: Address; phone: string; website: string; }
export interface ConfirmedFact { id: string; fact: string; evidence: readonly EvidenceRef[]; confirmedAt: string; }
export interface SiteEvidence { id: string; url: string; pageType: string; observation: string; capturedAt: string; source: string; serviceId?: string; servicePagePresent?: boolean; serviceIdsWithoutPages?: readonly string[]; }
export interface ImageRef { id: string; url: string; altText: string; source: string; evidenceUse: string; }
export type ReviewSourceType = "customer_review" | "company_testimonial" | "business_profile" | "user_brief" | "other";
export interface ReviewProvenance { sourceType: ReviewSourceType; sourceUrl: string; capturedAt: string; sourceLabel: string; }
export interface ReviewPageSuitability { pageId: string; suitability: ReviewSuitability; reason: string; }
export interface ReviewRecord {
  id: string; reviewer: string; exactText: string; rating: number; date?: string;
  provenance: ReviewProvenance; classification: ReviewClassification;
  serviceTopicSignals: readonly string[]; concreteWorkSignals: readonly string[]; negatives: readonly string[];
  suitability: ReviewSuitability; pageSuitability: readonly ReviewPageSuitability[];
  upstreamAuthorityJudgment: UpstreamAuthorityJudgment;
}
export interface Destination { id: string; url: string; label?: string; purpose?: string; }
export interface StrategyDestination {
  /** Internal Writer 3 deliverable; never a public business route. */
  visibility: "internal"; label: string; decisionPath: string; rationale: string;
  internalId?: "strategy-overview"; /** Legacy internal metadata only; never rendered as navigation. */
  /** Legacy fields are accepted by TypeScript only so validation can reject them deterministically. */
  url?: string;
  path?: string;
  route?: string;
}
export interface PagePrescription extends Destination {
  label: string; purpose: string; keyword: string; titleH1Direction: string; angleCustomerDecision: string;
  inclusionReason: string; majorEvidence: readonly EvidenceRef[]; recommendedFirstReview: string;
  recommendedFirstReviewReason: string; traps: readonly string[]; siblingOverlapBoundaries: readonly string[];
  reviewGrade?: ReviewGrade;
}
export interface HomepagePrescription extends PagePrescription { reviewGrade: ReviewGrade; }
export interface ContactPagePrescription extends PagePrescription {}
export interface ServicePagePrescription extends Omit<PagePrescription, "label" | "purpose"> { id: string; reviewGrade: ReviewGrade; }
export interface PageExpansionOverride {
  status: "approved"; approvedBy: "Josh Lenz"; approvedAt: string; reason: string;
  prospectId: string; placeId: string; runId: string; sourceCheckpointDigest: string; evidenceDigest: string;
  approvedPageIds: readonly string[]; canonicalIntents: readonly string[];
  additionalRoutes: readonly string[]; digest: string;
}
export interface DestinationPlan {
  homepage: HomepagePrescription; contact: ContactPagePrescription;
  header: readonly Destination[]; footer: readonly Destination[]; strategy: StrategyDestination;
  /** Exactly two in standard mode; more require a valid explicit expansion override. */
  servicePages: readonly ServicePagePrescription[];
}
export type ServiceComparisonStatus = "prescribed" | "folded" | "passed_over" | "excluded";
export interface ServiceComparison {
  id: string; name: string; status: ServiceComparisonStatus; evidenceCount: number; directEvidenceCount: number;
  evidence: readonly EvidenceRef[]; aliases?: readonly string[]; route?: string; foldInto?: string;
}
export interface SealedReviewAnalysisFacts {
  retrievedWrittenReviewCount: number; reviewRetrievalDate: string;
  reviewBackedServicesWithoutPages: number; reviewBackedServiceNames: readonly string[];
}
export interface SourceCheckpointIdentity {
  runId: string; artifactId: string; sourceSha: string; archiveDigest: string; manifestDigest: string;
  /** Immutable archive manifest bound to the source SHA and archive digest. */
  manifest: readonly SourceManifestEntry[];
}
export interface SourceManifestEntry { path: string; digest: string; }
export interface HandoffDigests {
  sourceCheckpointDigest: string; prescriptionDigest: string; evidenceDigest: string;
  approvedPageSetDigest: string; approvalDigest: string; handoffDigest: string;
}
export interface ProspectContract {
  id: string; business: BusinessIdentity; nap: Nap; confirmedFacts: readonly ConfirmedFact[];
  siteEvidence: readonly SiteEvidence[]; imageRefs: readonly ImageRef[]; reviewInventory: readonly ReviewRecord[];
  destinations: DestinationPlan;
}
export interface ApprovalRecord { status: "approved"; approvedAt: string; approvedBy: string; }
export interface ApprovedProspectHandoff {
  version: typeof LANE_A_HANDOFF_VERSION; approval: ApprovalRecord; sourceCheckpoint: SourceCheckpointIdentity;
  digests: HandoffDigests; serviceComparison: readonly ServiceComparison[];
  reviewAnalysisFacts: SealedReviewAnalysisFacts; expansionOverride?: PageExpansionOverride;
  prospect: ProspectContract;
}
