/**
 * Frozen d2d-factory-intake/v1 request/receipt contract.
 *
 * Canonical producer: companion D2D PR #5 head
 * `00ae71fa67eede3674834e5ad4d81e79e951e395`
 * (`tests/fixtures/d2d-factory-intake-v1.json`,
 * `src/lib/content-factory/contract.ts`).
 *
 * correlationId = `${sourceBusinessId}::${exportId}::d2d-factory-intake/v1`
 * d2dBusinessId === sourceBusinessId
 *
 * Transport status is separate from factory qualification. Google place
 * identity is evidence, not the transport key.
 */

import type { Address, BusinessIdentity, Nap, ProspectSeed } from "../handoff/types.js";
import type { WorkflowSourceCorrelation, WorkflowStage } from "../workflow/state.js";

export const D2D_FACTORY_INTAKE_VERSION = "d2d-factory-intake/v1" as const;

export const D2D_INTAKE_DEFAULT_MAX_BATCH = 40;

export const D2D_TRANSPORT_STATUSES = Object.freeze({
  RECEIVED: "received",
  DUPLICATE: "duplicate",
  INVALID: "invalid",
  RETRYABLE: "retryable",
} as const);

export type D2dTransportStatus = (typeof D2D_TRANSPORT_STATUSES)[keyof typeof D2D_TRANSPORT_STATUSES];

/** @deprecated Use D2D_TRANSPORT_STATUSES. Kept only so older imports fail closed at typecheck. */
export const D2D_INTAKE_STATUSES = D2D_TRANSPORT_STATUSES;
export type D2dIntakeStatus = D2dTransportStatus;

export const FACTORY_QUALIFICATION_OUTCOMES = Object.freeze({
  ADVANCED: "advanced",
  REJECTED: "rejected",
  HELD: "held",
  BACKLOG: "backlog",
} as const);

export type FactoryQualificationOutcome =
  (typeof FACTORY_QUALIFICATION_OUTCOMES)[keyof typeof FACTORY_QUALIFICATION_OUTCOMES];

export const D2D_INTAKE_REASON_CODES = Object.freeze({
  AUTH_NOT_CONFIGURED: "AUTH_NOT_CONFIGURED",
  AUTH_MISSING: "AUTH_MISSING",
  AUTH_INVALID: "AUTH_INVALID",
  INVALID_ENVELOPE: "INVALID_ENVELOPE",
  UNSUPPORTED_VERSION: "UNSUPPORTED_CONTRACT_VERSION",
  EMPTY_BATCH: "EMPTY_BATCH",
  BATCH_LIMIT: "BATCH_LIMIT",
  MALFORMED_BUSINESS: "MALFORMED_BUSINESS",
  MISSING_STABLE_IDENTITY: "MISSING_STABLE_IDENTITY",
  MISSING_SOURCE_BUSINESS_ID: "MISSING_SOURCE_BUSINESS_ID",
  MISSING_D2D_PROSPECT_ID: "MISSING_D2D_PROSPECT_ID",
  MISSING_BUSINESS_NAME: "MISSING_BUSINESS_NAME",
  MISSING_CAMPAIGN_ID: "MISSING_CAMPAIGN_ID",
  MISSING_CAMPAIGN_RUN_ID: "MISSING_CAMPAIGN_RUN_ID",
  MISSING_EXPORT_ID: "MISSING_EXPORT_ID",
  INVALID_TIMESTAMP: "INVALID_TIMESTAMP",
  INHERITED_CONCLUSION: "INHERITED_CONCLUSION",
  INCOMPLETE_IDENTITY: "INCOMPLETE_IDENTITY",
  EXCLUDED_CATEGORY: "EXCLUDED_CATEGORY",
  NOT_SELECTED: "NOT_SELECTED",
  WEAK_OPPORTUNITY: "WEAK_OPPORTUNITY",
  SEARCH_MISMATCH: "SEARCH_MISMATCH",
  INSUFFICIENT_SEED_FACTS: "INSUFFICIENT_SEED_FACTS",
  MISSING_TRADE: "MISSING_TRADE",
  MISSING_SERVICE_AREA: "MISSING_SERVICE_AREA",
  MISSING_NAP_NAME: "MISSING_NAP_NAME",
  MISSING_ADDRESS_STREET: "MISSING_ADDRESS_STREET",
  MISSING_ADDRESS_CITY: "MISSING_ADDRESS_CITY",
  MISSING_ADDRESS_REGION: "MISSING_ADDRESS_REGION",
  MISSING_ADDRESS_POSTAL_CODE: "MISSING_ADDRESS_POSTAL_CODE",
  MISSING_ADDRESS_COUNTRY: "MISSING_ADDRESS_COUNTRY",
  MISSING_PHONE: "MISSING_PHONE",
  MISSING_WEBSITE: "MISSING_WEBSITE",
  INVALID_WEBSITE: "INVALID_WEBSITE",
  EXISTING_FACTORY_RUN: "EXISTING_FACTORY_RUN",
  EXISTING_QUALIFICATION: "EXISTING_QUALIFICATION",
  TRANSIENT_FACTORY_FAILURE: "TRANSIENT_FACTORY_FAILURE",
  FACTORY_ADAPTERS_UNCONFIGURED: "FACTORY_ADAPTERS_UNCONFIGURED",
  WRITER_BEFORE_GATE_FORBIDDEN: "WRITER_BEFORE_GATE_FORBIDDEN",
  FACTORY_ADVANCED: "FACTORY_ADVANCED",
} as const);

export type D2dIntakeReasonCode = (typeof D2D_INTAKE_REASON_CODES)[keyof typeof D2D_INTAKE_REASON_CODES];

export const D2D_INTAKE_SHARED_SECRET_ENV = "D2D_INTAKE_SHARED_SECRET" as const;
export const D2D_INTAKE_TOKEN_ENV = "D2D_INTAKE_TOKEN" as const;
export const D2D_INTAKE_STATE_DIR_ENV = "D2D_INTAKE_STATE_DIR" as const;
export const D2D_INTAKE_HOST_ENV = "D2D_INTAKE_HOST" as const;
export const D2D_INTAKE_PORT_ENV = "D2D_INTAKE_PORT" as const;
export const D2D_INTAKE_ADAPTERS_MODULE_ENV = "D2D_INTAKE_ADAPTERS_MODULE" as const;
export const D2D_INTAKE_MAX_BATCH_ENV = "D2D_INTAKE_MAX_BATCH" as const;

export const D2D_INTAKE_HTTP_PATH = "/d2d-factory-intake/v1" as const;

export interface D2dLatLng {
  readonly lat: number;
  readonly lng: number;
}

export interface D2dCampaignContext {
  readonly location?: string;
  readonly radiusMiles?: number;
  readonly radiusMeters?: number;
  readonly center?: D2dLatLng;
  readonly search?: {
    readonly query?: string;
    readonly searchStrings?: readonly string[];
    readonly categories?: readonly string[];
  };
}

export interface D2dApifyProvenance {
  readonly provider?: string;
  readonly actor?: string;
  readonly runId?: string;
  readonly datasetId?: string;
  readonly itemId?: string;
}

export interface D2dRawAddress {
  readonly street?: string;
  readonly city?: string;
  readonly region?: string;
  readonly postalCode?: string;
  readonly country?: string;
}

export interface D2dRawBusiness {
  readonly d2dProspectId?: string;
  readonly sourceBusinessId?: string;
  readonly campaignBusinessId?: string;
  readonly d2dBusinessId?: string;
  readonly placeId?: string;
  readonly googlePlaceId?: string;
  readonly cid?: string;
  readonly mapsUrl?: string;
  readonly googleMapsUrl?: string;
  readonly googleUrl?: string;
  readonly url?: string;
  readonly name?: string;
  readonly title?: string;
  readonly category?: string;
  readonly categories?: readonly string[];
  readonly address?: string | D2dRawAddress;
  readonly location?: string;
  readonly coordinates?: D2dLatLng;
  readonly phone?: string;
  readonly website?: string;
  readonly websiteUrl?: string;
  readonly rating?: number;
  readonly reviewCount?: number;
  readonly listingReviewCount?: number;
  readonly apify?: D2dApifyProvenance;
}

export interface D2dIntakeBatch {
  readonly version: typeof D2D_FACTORY_INTAKE_VERSION;
  readonly campaignId: string;
  readonly campaignRunId: string;
  readonly exportId: string;
  readonly exportedAt: string;
  readonly campaign: D2dCampaignContext;
  readonly provenance?: D2dApifyProvenance;
  readonly businesses: readonly unknown[];
}

export interface WebsiteOpportunityEvidence {
  readonly inspected: boolean;
  readonly quality: "unknown" | "weak" | "adequate" | "strong";
  readonly opportunity: "unknown" | "weak" | "strong";
  readonly searchFit: boolean;
  readonly source: "listing-evidence";
  readonly reasons: readonly string[];
}

export interface NormalizedRawBusiness {
  readonly d2dProspectId: string;
  readonly sourceBusinessId: string;
  readonly campaignBusinessId: string | null;
  readonly d2dBusinessId: string;
  readonly placeId: string | null;
  readonly mapsUrl: string | null;
  readonly googleUrl: string | null;
  readonly name: string;
  readonly category: string | null;
  readonly categories: readonly string[];
  readonly location: string | null;
  readonly address: D2dRawAddress | null;
  readonly addressText: string | null;
  readonly coordinates: D2dLatLng | null;
  readonly phone: string | null;
  readonly website: string | null;
  readonly rating: number | null;
  readonly reviewCount: number | null;
  readonly apify: D2dApifyProvenance | null;
}

export interface FactoryQualification {
  readonly outcome: FactoryQualificationOutcome;
  readonly reason: string;
  readonly reasonCode: D2dIntakeReasonCode;
  readonly websiteOpportunity?: WebsiteOpportunityEvidence;
}

export interface D2dBusinessReceipt {
  readonly version: typeof D2D_FACTORY_INTAKE_VERSION;
  readonly status: D2dTransportStatus;
  readonly qualification: FactoryQualification | null;
  readonly d2dProspectId: string;
  readonly sourceBusinessId: string;
  readonly campaignBusinessId: string | null;
  readonly d2dBusinessId: string;
  readonly placeId: string | null;
  readonly campaignId: string;
  readonly campaignRunId: string;
  readonly exportId: string;
  readonly correlationId: string;
  readonly factoryProspectId?: string;
  readonly factoryRunId?: string;
  readonly factoryStage?: WorkflowStage;
  readonly reason?: string;
  readonly reasonCode?: D2dIntakeReasonCode;
}

export interface D2dIntakeBatchReceipt {
  readonly version: typeof D2D_FACTORY_INTAKE_VERSION;
  readonly campaignId: string;
  readonly campaignRunId: string;
  readonly exportId: string;
  readonly receipts: readonly D2dBusinessReceipt[];
}

export interface MappedD2dBusiness {
  readonly seed: ProspectSeed;
  readonly correlation: WorkflowSourceCorrelation;
  readonly business: BusinessIdentity;
  readonly nap: Nap;
  readonly address: Address;
}

export function intakeCorrelationId(input: {
  readonly sourceBusinessId: string;
  readonly exportId: string;
  readonly version?: string;
}): string {
  const version = input.version ?? D2D_FACTORY_INTAKE_VERSION;
  return `${input.sourceBusinessId}::${input.exportId}::${version}`;
}

export function campaignSearchTerms(campaign: D2dCampaignContext): readonly string[] {
  const terms: string[] = [];
  if (campaign.search?.query?.trim()) terms.push(campaign.search.query.trim());
  for (const item of campaign.search?.searchStrings ?? []) {
    if (typeof item === "string" && item.trim()) terms.push(item.trim());
  }
  return terms;
}

export function reconcilableReceiptIdentity(receipt: D2dBusinessReceipt): {
  readonly version: typeof D2D_FACTORY_INTAKE_VERSION;
  readonly status: D2dTransportStatus;
  readonly d2dProspectId: string;
  readonly sourceBusinessId: string;
  readonly campaignBusinessId: string | null;
  readonly d2dBusinessId: string;
  readonly correlationId: string;
  readonly campaignId: string;
  readonly campaignRunId: string;
  readonly exportId: string;
} {
  return {
    version: receipt.version,
    status: receipt.status,
    d2dProspectId: receipt.d2dProspectId,
    sourceBusinessId: receipt.sourceBusinessId,
    campaignBusinessId: receipt.campaignBusinessId,
    d2dBusinessId: receipt.d2dBusinessId,
    correlationId: receipt.correlationId,
    campaignId: receipt.campaignId,
    campaignRunId: receipt.campaignRunId,
    exportId: receipt.exportId,
  };
}
