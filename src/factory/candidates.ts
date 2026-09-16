/**
 * Smallest useful candidate-bench + website/opportunity boundary
 * from historical architect/greenfield-gate1 candidates.js.
 *
 * Not a wholesale resurrection: no 7-item transport cap, no
 * select-one-finalist gate. Today's workflow stays authoritative
 * after a business is factory-selected/advanced.
 */

import type {
  D2dIntakeReasonCode,
  D2dSearchContext,
  NormalizedRawBusiness,
  WebsiteOpportunityEvidence,
} from "../d2d-intake/types.js";
import { D2D_INTAKE_REASON_CODES } from "../d2d-intake/types.js";

export type CandidateDisposition = "rejected" | "uncertain" | "discovered" | "duplicate";

export interface CandidateBenchEntry {
  readonly record: NormalizedRawBusiness;
  readonly identityKey: string;
  readonly hasGbpIdentity: boolean;
  readonly exclusion: { readonly code: string; readonly reason: string } | null;
  readonly duplicateOf: string | null;
  readonly disposition: CandidateDisposition;
  readonly websiteEvidence: WebsiteOpportunityEvidence;
  readonly seedable: boolean;
}

export interface WebsiteOpportunityAuditor {
  audit(input: {
    readonly record: NormalizedRawBusiness;
    readonly searchContext: D2dSearchContext;
  }): Promise<WebsiteOpportunityEvidence> | WebsiteOpportunityEvidence;
}

const MIN_STRONG_RATING = 4;
const MIN_STRONG_REVIEWS = 8;

export function isMoldExcluded(record: Pick<NormalizedRawBusiness, "name" | "category" | "categories">): boolean {
  const haystack = [record.name, record.category, ...(record.categories ?? [])].filter(Boolean).join(" ").toLowerCase();
  return /\bmold(?: remediation| removal| testing| inspection| cleanup| abatement)?\b/.test(haystack);
}

export function stableCandidateIdentity(
  record: Pick<NormalizedRawBusiness, "sourceBusinessId" | "placeId" | "mapsUrl" | "d2dProspectId">,
): string {
  if (record.sourceBusinessId) return record.sourceBusinessId;
  if (record.placeId) return record.placeId;
  if (record.mapsUrl) return record.mapsUrl;
  return record.d2dProspectId;
}

export function listingSearchFit(record: NormalizedRawBusiness, searchContext: D2dSearchContext): boolean {
  const searchTokens = tokenizeAll(searchContext.searchTerms);
  if (searchTokens.size === 0) return false;
  const businessTokens = tokenizeAll([
    record.name,
    record.category ?? "",
    ...(record.categories ?? []),
  ]);
  for (const token of searchTokens) {
    if (businessTokens.has(token)) return true;
    for (const business of businessTokens) {
      if (token.length >= 4 && (business.includes(token) || token.includes(business))) return true;
    }
  }
  return false;
}

export function createListingOpportunityAuditor(): WebsiteOpportunityAuditor {
  return {
    audit({ record, searchContext }) {
      return auditListingOpportunity(record, searchContext);
    },
  };
}

export function auditListingOpportunity(
  record: NormalizedRawBusiness,
  searchContext: D2dSearchContext,
): WebsiteOpportunityEvidence {
  const reasons: string[] = [];
  const searchFit = listingSearchFit(record, searchContext);
  if (!searchFit) reasons.push("Category/name does not fit campaign searchTerms.");

  if (!record.website) {
    reasons.push("No website on the listing; opportunity evidence is incomplete.");
    return {
      inspected: true,
      quality: "unknown",
      opportunity: "unknown",
      searchFit,
      source: "listing-evidence",
      reasons,
    };
  }

  const rating = record.rating;
  const reviews = record.reviewCount;
  const strongRating = rating != null && rating >= MIN_STRONG_RATING;
  const strongReviews = reviews != null && reviews >= MIN_STRONG_REVIEWS;
  let quality: WebsiteOpportunityEvidence["quality"] = "adequate";
  let opportunity: WebsiteOpportunityEvidence["opportunity"] = "weak";
  if (strongRating && strongReviews) {
    quality = "strong";
    opportunity = "strong";
    reasons.push("Listing website plus rating/review evidence supports a factory opportunity.");
  } else {
    quality = "weak";
    opportunity = "weak";
    reasons.push("Website is present but rating/review evidence is too weak for factory selection.");
  }
  if (!searchFit) opportunity = "weak";
  return {
    inspected: true,
    quality,
    opportunity,
    searchFit,
    source: "listing-evidence",
    reasons,
  };
}

export function buildCandidateEntry(input: {
  readonly record: NormalizedRawBusiness;
  readonly searchContext: D2dSearchContext;
  readonly websiteEvidence: WebsiteOpportunityEvidence;
  readonly duplicateOf?: string | null;
  readonly seedable: boolean;
}): CandidateBenchEntry {
  const mold = isMoldExcluded(input.record);
  const hasGbpIdentity = Boolean(input.record.placeId || input.record.mapsUrl);
  const exclusion = mold
    ? { code: "mold-services", reason: "Mold service category is excluded from this factory." }
    : null;
  let disposition: CandidateDisposition = "discovered";
  if (input.duplicateOf) disposition = "duplicate";
  else if (exclusion) disposition = "rejected";
  else if (!hasGbpIdentity) disposition = "uncertain";
  return {
    record: input.record,
    identityKey: stableCandidateIdentity(input.record),
    hasGbpIdentity,
    exclusion,
    duplicateOf: input.duplicateOf ?? null,
    disposition,
    websiteEvidence: input.websiteEvidence,
    seedable: input.seedable,
  };
}

export function factorySelection(entry: CandidateBenchEntry): {
  readonly selected: boolean;
  readonly reasonCode: D2dIntakeReasonCode;
  readonly reason: string;
} {
  if (entry.disposition === "duplicate" && entry.duplicateOf) {
    return {
      selected: false,
      reasonCode: D2D_INTAKE_REASON_CODES.EXISTING_QUALIFICATION,
      reason: `Duplicate of ${entry.duplicateOf} on this factory bench; not advanced.`,
    };
  }
  if (entry.exclusion) {
    return {
      selected: false,
      reasonCode: D2D_INTAKE_REASON_CODES.EXCLUDED_CATEGORY,
      reason: entry.exclusion.reason,
    };
  }
  if (!entry.hasGbpIdentity) {
    return {
      selected: false,
      reasonCode: D2D_INTAKE_REASON_CODES.INCOMPLETE_IDENTITY,
      reason: "GBP identity is incomplete; Content Factory will not invent a place id.",
    };
  }
  if (!entry.websiteEvidence.inspected) {
    return {
      selected: false,
      reasonCode: D2D_INTAKE_REASON_CODES.WEAK_OPPORTUNITY,
      reason: "Factory website/opportunity evidence was not inspected; the record is not selected.",
    };
  }
  if (!entry.websiteEvidence.searchFit) {
    return {
      selected: false,
      reasonCode: D2D_INTAKE_REASON_CODES.SEARCH_MISMATCH,
      reason: "Factory did not select this seedable listing; it does not fit campaign searchTerms.",
    };
  }
  if (entry.websiteEvidence.opportunity !== "strong") {
    return {
      selected: false,
      reasonCode: D2D_INTAKE_REASON_CODES.WEAK_OPPORTUNITY,
      reason: "Factory website/opportunity evidence is not strong enough to select this business.",
    };
  }
  return {
    selected: true,
    reasonCode: D2D_INTAKE_REASON_CODES.FACTORY_ADVANCED,
    reason: "Content Factory selected this business from candidate-bench + website/opportunity evidence, not from ProspectSeed completeness or a D2D qualification conclusion.",
  };
}

function tokenizeAll(values: readonly string[]): Set<string> {
  const tokens = new Set<string>();
  for (const value of values) {
    for (const token of String(value)
      .toLowerCase()
      .split(/[^a-z0-9]+/g)) {
      if (token.length >= 3) tokens.add(token);
    }
  }
  return tokens;
}
