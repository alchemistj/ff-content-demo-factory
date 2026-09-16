/**
 * Factory-owned keep/reject/advance qualification.
 *
 * Candidate bench + website/opportunity evidence + independent
 * selection (smallest useful port of historical greenfield-gate1).
 * Seedability is recorded but is not the advance decision.
 * After a business is advanced, today's runFactory() remains authoritative.
 */

import {
  buildCandidateEntry,
  createListingOpportunityAuditor,
  factorySelection,
  isMoldExcluded,
  stableCandidateIdentity,
  type WebsiteOpportunityAuditor,
} from "./candidates.js";
import {
  D2D_INTAKE_REASON_CODES,
  FACTORY_QUALIFICATION_OUTCOMES,
  type D2dCampaignContext,
  type FactoryQualification,
  type NormalizedRawBusiness,
} from "../d2d-intake/types.js";

export const FORBIDDEN_CONCLUSION_FIELDS = Object.freeze([
  "qualification",
  "viable",
  "architectQualified",
  "pagePrescription",
  "valueHierarchy",
  "reviewClassification",
  "recommendedFirstReview",
  "opportunityScore",
  "tier",
  "strongDemoCandidate",
] as const);

export interface QualificationAssignment {
  readonly record: NormalizedRawBusiness;
  readonly campaign: D2dCampaignContext;
  readonly duplicateOf?: string | null;
  readonly seedable?: boolean;
}

export interface QualificationAdapter {
  readonly provider: string;
  readonly model: string;
  qualify(input: QualificationAssignment): Promise<FactoryQualification>;
}

export function findForbiddenConclusion(value: unknown, path = "$"): string | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const nested = findForbiddenConclusion(value[index], `${path}[${index}]`);
      if (nested) return nested;
    }
    return null;
  }
  for (const [key, child] of Object.entries(value)) {
    if ((FORBIDDEN_CONCLUSION_FIELDS as readonly string[]).includes(key)) {
      return `${path}.${key}`;
    }
    const nested = findForbiddenConclusion(child, `${path}.${key}`);
    if (nested) return nested;
  }
  return null;
}

export { isMoldExcluded, stableCandidateIdentity as stableBusinessIdentity };

export function createFactoryQualifier(options?: {
  readonly auditor?: WebsiteOpportunityAuditor;
}): QualificationAdapter {
  const auditor = options?.auditor ?? createListingOpportunityAuditor();
  return {
    provider: "content-factory",
    model: "factory-qualifier/v1",
    async qualify(input) {
      return qualifyRawBusiness(input, auditor);
    },
  };
}

export async function qualifyRawBusiness(
  input: QualificationAssignment,
  auditor: WebsiteOpportunityAuditor = createListingOpportunityAuditor(),
): Promise<FactoryQualification> {
  const websiteEvidence = await auditor.audit({
    record: input.record,
    campaign: input.campaign,
  });
  const entry = buildCandidateEntry({
    record: input.record,
    campaign: input.campaign,
    websiteEvidence,
    duplicateOf: input.duplicateOf ?? null,
    seedable: input.seedable === true,
  });
  const selection = factorySelection(entry);
  if (!selection.selected) {
    const outcome =
      selection.reasonCode === D2D_INTAKE_REASON_CODES.EXISTING_QUALIFICATION
        ? FACTORY_QUALIFICATION_OUTCOMES.BACKLOG
        : selection.reasonCode === D2D_INTAKE_REASON_CODES.EXCLUDED_CATEGORY
          ? FACTORY_QUALIFICATION_OUTCOMES.REJECTED
          : FACTORY_QUALIFICATION_OUTCOMES.HELD;
    return {
      outcome,
      reasonCode: selection.reasonCode,
      reason: selection.reason,
      websiteOpportunity: websiteEvidence,
    };
  }
  return {
    outcome: FACTORY_QUALIFICATION_OUTCOMES.ADVANCED,
    reasonCode: D2D_INTAKE_REASON_CODES.FACTORY_ADVANCED,
    reason: selection.reason,
    websiteOpportunity: websiteEvidence,
  };
}
