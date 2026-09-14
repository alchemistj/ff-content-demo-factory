/**
 * Independent-thinking handoff contract.
 *
 * Three distinct input kinds, never collapsed into one blob:
 * 1. Evidence and facts — original source material.
 * 2. Approved decisions — the page plan a human explicitly approved.
 * 3. Recommendations to consider — advisory ideas a later stage may adopt,
 *    improve, combine, or set aside.
 */

export const RESEARCH_RECORD_VERSION = "factory-research/v1" as const;
export const PROPOSED_PRESCRIPTION_VERSION = "factory-prescription/v1" as const;
export const APPROVED_PLAN_VERSION = "factory-approved-plan/v1" as const;
export const WRITER_CONTEXT_VERSION = "factory-writer-context/v1" as const;

export type FactStatus = "confirmed" | "inference";
export type EvidenceKind = "source_document" | "site_evidence" | "review" | "image" | "business_identity";
export type PageType = "homepage" | "service" | "contact" | "strategy" | "chrome";
export type Audience = "business" | "owner";
export type RecommendationKind =
  | "observation"
  | "differentiator"
  | "customer_language"
  | "review_use"
  | "angle"
  | "section"
  | "emphasis";
export type ReviewClassification = "positive" | "negative" | "mixed" | "neutral";

export interface SourceRef {
  readonly kind: EvidenceKind;
  readonly refId: string;
}

export interface Address {
  readonly street: string;
  readonly city: string;
  readonly region: string;
  readonly postalCode: string;
  readonly country: string;
}

export interface BusinessIdentity {
  readonly name: string;
  readonly trade: string;
  readonly serviceArea: string;
  readonly legalName?: string;
}

export interface Nap {
  readonly name: string;
  readonly address: Address;
  readonly phone: string;
  readonly website: string;
}

export interface FactRecord {
  readonly id: string;
  readonly statement: string;
  readonly status: FactStatus;
  readonly sourceRefs: readonly SourceRef[];
  readonly capturedAt: string;
}

export interface SiteEvidence {
  readonly id: string;
  readonly url: string;
  readonly pageType: string;
  readonly observation: string;
  readonly capturedAt: string;
  readonly source: string;
}

export interface ImageRef {
  readonly id: string;
  readonly url: string;
  readonly altText: string;
  readonly source: string;
  readonly evidenceUse: string;
}

export interface ReviewProvenance {
  readonly sourceType: string;
  readonly sourceUrl: string;
  readonly capturedAt: string;
  readonly sourceLabel: string;
}

export interface ReviewRecord {
  readonly id: string;
  readonly reviewer: string;
  readonly exactText: string;
  readonly provenance: ReviewProvenance;
  readonly rating?: number;
  readonly date?: string;
  /**
   * Editorial classification is optional advice, never a gate.
   * Unclassified source-backed reviews remain available to later stages.
   */
  readonly classification?: ReviewClassification;
}

export interface EvidencePacket {
  readonly prospectId: string;
  readonly business: BusinessIdentity;
  readonly nap: Nap;
  readonly facts: readonly FactRecord[];
  readonly siteEvidence: readonly SiteEvidence[];
  readonly imageRefs: readonly ImageRef[];
  /** Complete retrieved inventory. Never a themes/top-five summary. */
  readonly reviews: readonly ReviewRecord[];
}

export interface Recommendation {
  readonly id: string;
  readonly kind: RecommendationKind;
  /** Structural marker: later stages may change or set this aside. */
  readonly stance: "advisory";
  /** May-language. Not customer-facing copy. */
  readonly text: string;
  readonly reason: string;
  readonly sourceRefs: readonly SourceRef[];
  readonly pageId?: string;
  readonly reviewId?: string;
}

export interface RecommendationSet {
  readonly stage: "research" | "prescription";
  readonly items: readonly Recommendation[];
}

export interface PageJob {
  readonly pageId: string;
  readonly pageType: PageType;
  readonly route: string;
  readonly job: string;
  readonly targetIntent: string;
}

export interface RouteMapEntry {
  readonly pageId: string;
  readonly route: string;
  readonly pageType: PageType;
}

/**
 * Decisions a human can approve. Recommendations do not live here.
 * Approving a page plan does not lock accompanying suggestions.
 */
export interface ApprovedDecisions {
  readonly pageJobs: readonly PageJob[];
  readonly routeMap: readonly RouteMapEntry[];
  readonly businessScope: string;
  readonly reservedHumanDecisions: readonly string[];
}

export interface ModelRef {
  readonly provider: string;
  readonly model: string;
}

export interface ResearchRecord {
  readonly version: typeof RESEARCH_RECORD_VERSION;
  readonly prospectId: string;
  readonly evidence: EvidencePacket;
  readonly recommendations: RecommendationSet;
  readonly researcher: ModelRef;
  readonly completedAt: string;
}

export interface ProposedPrescription {
  readonly version: typeof PROPOSED_PRESCRIPTION_VERSION;
  readonly prospectId: string;
  readonly proposedPagePlan: ApprovedDecisions;
  readonly recommendations: RecommendationSet;
  readonly rationale: string;
  readonly evidenceFingerprint: string;
  readonly prescriber: ModelRef;
  readonly completedAt: string;
}

export interface PrescriptionApproval {
  readonly status: "approved";
  readonly approvedAt: string;
  readonly approvedBy: string;
}

export interface ApprovedPlan {
  readonly version: typeof APPROVED_PLAN_VERSION;
  readonly prospectId: string;
  readonly approval: PrescriptionApproval;
  readonly decisions: ApprovedDecisions;
  /** Still advisory after approval. Not merged into decisions. */
  readonly researchRecommendations: RecommendationSet;
  readonly prescriptionRecommendations: RecommendationSet;
  readonly evidence: EvidencePacket;
}

/**
 * Full writer input: original evidence plus both recommendation sets,
 * not a compressed summary of a summary.
 */
export interface WriterContext {
  readonly version: typeof WRITER_CONTEXT_VERSION;
  readonly prospectId: string;
  readonly evidence: EvidencePacket;
  readonly decisions: ApprovedDecisions;
  readonly researchRecommendations: RecommendationSet;
  readonly prescriptionRecommendations: RecommendationSet;
}

export interface ProspectSeed {
  readonly prospectId: string;
  readonly business: BusinessIdentity;
  readonly nap: Nap;
  readonly sourceNotes?: string;
}
