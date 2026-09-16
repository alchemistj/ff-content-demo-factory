/**
 * Factory-owned keep/reject/advance qualification.
 *
 * Ported from the smallest useful boundary on historical
 * architect/greenfield-gate1 (seeded-discovery forbidden conclusions +
 * candidate bench/exclusion/dedupe). Not a second factory. After a
 * business is advanced, today's runFactory() remains authoritative.
 */

import { canFormProspectSeed } from "../d2d-intake/map.js";
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
  readonly campaign?: D2dCampaignContext;
  readonly duplicateOf?: string | null;
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

export function isMoldExcluded(record: Pick<NormalizedRawBusiness, "name" | "category" | "categories">): boolean {
  const haystack = [record.name, record.category, ...(record.categories ?? [])].filter(Boolean).join(" ").toLowerCase();
  return /\bmold(?: remediation| removal| testing| inspection| cleanup| abatement)?\b/.test(haystack);
}

export function stableBusinessIdentity(record: Pick<NormalizedRawBusiness, "placeId" | "mapsUrl" | "d2dBusinessId">): string {
  if (record.placeId) return record.placeId;
  if (record.mapsUrl) return record.mapsUrl;
  return record.d2dBusinessId;
}

export function createFactoryQualifier(): QualificationAdapter {
  return {
    provider: "content-factory",
    model: "factory-qualifier/v1",
    async qualify(input) {
      return qualifyRawBusiness(input);
    },
  };
}

export function qualifyRawBusiness(input: QualificationAssignment): FactoryQualification {
  if (input.duplicateOf) {
    return {
      outcome: FACTORY_QUALIFICATION_OUTCOMES.BACKLOG,
      reasonCode: D2D_INTAKE_REASON_CODES.EXISTING_QUALIFICATION,
      reason: `Duplicate of ${input.duplicateOf} on this factory bench; not advanced.`,
    };
  }
  if (isMoldExcluded(input.record)) {
    return {
      outcome: FACTORY_QUALIFICATION_OUTCOMES.REJECTED,
      reasonCode: D2D_INTAKE_REASON_CODES.EXCLUDED_CATEGORY,
      reason: "Mold service category is excluded from this factory.",
    };
  }
  if (!input.record.placeId && !input.record.mapsUrl) {
    return {
      outcome: FACTORY_QUALIFICATION_OUTCOMES.HELD,
      reasonCode: D2D_INTAKE_REASON_CODES.INCOMPLETE_IDENTITY,
      reason: "GBP identity is incomplete; Content Factory will not invent a place id.",
    };
  }
  const seedable = canFormProspectSeed(input.record, input.campaign);
  if (!seedable.ok) {
    return {
      outcome: FACTORY_QUALIFICATION_OUTCOMES.HELD,
      reasonCode: seedable.reasonCode,
      reason: `${seedable.reason} Content Factory will not invent missing source facts or spend research until the record can advance.`,
    };
  }
  return {
    outcome: FACTORY_QUALIFICATION_OUTCOMES.ADVANCED,
    reasonCode: D2D_INTAKE_REASON_CODES.FACTORY_ADVANCED,
    reason: "Content Factory advanced this business from raw source facts without an inherited D2D qualification conclusion.",
  };
}
