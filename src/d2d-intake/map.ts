import { D2D_SOURCE_KIND, type WorkflowSourceCorrelation } from "../workflow/state.js";
import type { Address, BusinessIdentity, Nap, ProspectSeed } from "../handoff/types.js";
import {
  D2D_FACTORY_INTAKE_VERSION,
  D2D_INTAKE_REASON_CODES,
  campaignSearchTerms,
  type D2dCampaignContext,
  type D2dIntakeReasonCode,
  type MappedD2dBusiness,
  type NormalizedRawBusiness,
} from "./types.js";

export interface SeedMappingFailure {
  readonly ok: false;
  readonly reasonCode: D2dIntakeReasonCode;
  readonly reason: string;
}

export interface SeedMappingSuccess {
  readonly ok: true;
  readonly mapped: MappedD2dBusiness;
}

export type SeedMappingResult = SeedMappingSuccess | SeedMappingFailure;

export function canFormProspectSeed(
  record: NormalizedRawBusiness,
  campaign?: D2dCampaignContext,
): SeedMappingResult {
  return mapAdvancedBusinessToSeed(record, {
    campaignId: "campaign",
    campaignRunId: "campaign-run",
    exportId: "export",
    exportedAt: "2026-01-01T00:00:00.000Z",
    campaign: campaign ?? { center: { lat: 0, lng: 0 }, radiusMiles: 1 },
  });
}

export function mapAdvancedBusinessToSeed(
  record: NormalizedRawBusiness,
  envelope: {
    readonly campaignId: string;
    readonly campaignRunId: string;
    readonly exportId: string;
    readonly exportedAt: string;
    readonly campaign: D2dCampaignContext;
  },
): SeedMappingResult {
  const trade = record.category;
  if (!trade) {
    return fail(D2D_INTAKE_REASON_CODES.MISSING_TRADE, "category/trade is missing; it was not invented");
  }
  const serviceArea = serviceAreaFrom(record, envelope.campaign);
  if (!serviceArea) {
    return fail(D2D_INTAKE_REASON_CODES.MISSING_SERVICE_AREA, "service area/location is missing; it was not invented");
  }
  const address = completeAddress(record.address);
  if (!address.ok) return address;
  if (!record.phone) {
    return fail(D2D_INTAKE_REASON_CODES.MISSING_PHONE, "phone is missing; it was not invented");
  }
  if (!record.website) {
    return fail(D2D_INTAKE_REASON_CODES.MISSING_WEBSITE, "website is missing; it was not invented");
  }
  if (!isHttpUrl(record.website)) {
    return fail(D2D_INTAKE_REASON_CODES.INVALID_WEBSITE, "website must be an absolute http(s) URL; it was not invented");
  }

  const business: BusinessIdentity = {
    name: record.name,
    trade,
    serviceArea,
  };
  const nap: Nap = {
    name: record.name,
    address: address.address,
    phone: record.phone,
    website: record.website,
  };
  const prospectId = factoryProspectId(record);
  const correlation: WorkflowSourceCorrelation = {
    kind: D2D_SOURCE_KIND,
    d2dProspectId: record.d2dProspectId,
    sourceBusinessId: record.sourceBusinessId,
    d2dBusinessId: record.sourceBusinessId,
    campaignId: envelope.campaignId,
    campaignRunId: envelope.campaignRunId,
    exportId: envelope.exportId,
    exportedAt: envelope.exportedAt,
    correlationId: record.correlationId,
    campaign: envelope.campaign,
    factoryQualificationOutcome: "advanced",
    factoryQualificationReason: "Advanced by Content Factory after candidate-bench + website/opportunity selection.",
    ...(record.campaignBusinessId ? { campaignBusinessId: record.campaignBusinessId } : {}),
    ...(record.placeId ? { placeId: record.placeId } : {}),
    ...(record.coordinates ? { coordinates: record.coordinates } : {}),
    ...(record.apify ? { apify: record.apify } : {}),
  };
  const seed: ProspectSeed = {
    prospectId,
    business,
    nap,
    sourceNotes: composeRawSourceNotes(record, envelope),
  };
  return { ok: true, mapped: { seed, correlation, business, nap, address: address.address } };
}

export function factoryProspectId(record: NormalizedRawBusiness): string {
  const raw = record.sourceBusinessId || record.d2dProspectId;
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug.length > 0 ? slug : "source-unknown";
}

export function composeRawSourceNotes(
  record: NormalizedRawBusiness,
  envelope: {
    readonly campaignId: string;
    readonly campaignRunId: string;
    readonly exportId: string;
    readonly exportedAt: string;
    readonly campaign: D2dCampaignContext;
  },
): string {
  const refs = [
    `d2dProspectId=${record.d2dProspectId}`,
    `sourceBusinessId=${record.sourceBusinessId}`,
    `d2dBusinessId=${record.d2dBusinessId}`,
    `correlationId=${record.correlationId}`,
    record.campaignBusinessId ? `campaignBusinessId=${record.campaignBusinessId}` : null,
    record.placeId ? `placeId=${record.placeId}` : null,
    record.mapsUrl ? `mapsUrl=${record.mapsUrl}` : null,
    record.googleUrl ? `googleUrl=${record.googleUrl}` : null,
    record.coordinates ? `coordinates=${record.coordinates.lat},${record.coordinates.lng}` : null,
    record.apify?.actor ? `apify.actor=${record.apify.actor}` : null,
    record.apify?.runId ? `apify.runId=${record.apify.runId}` : null,
    record.apify?.datasetId ? `apify.datasetId=${record.apify.datasetId}` : null,
    record.apify?.itemId ? `apify.itemId=${record.apify.itemId}` : null,
  ].filter(Boolean);
  const searchBits = [
    envelope.campaign.center ? `campaign.center=${envelope.campaign.center.lat},${envelope.campaign.center.lng}` : null,
    envelope.campaign.radiusMiles != null ? `campaign.radiusMiles=${envelope.campaign.radiusMiles}` : null,
    envelope.campaign.radiusMeters != null ? `campaign.radiusMeters=${envelope.campaign.radiusMeters}` : null,
    envelope.campaign.location ? `campaign.location=${envelope.campaign.location}` : null,
    campaignSearchTerms(envelope.campaign).length
      ? `campaign.search=${campaignSearchTerms(envelope.campaign).join(",")}`
      : null,
  ].filter(Boolean);
  return [
    `D2D raw intake ${D2D_FACTORY_INTAKE_VERSION}.`,
    `campaignId=${envelope.campaignId};`,
    `campaignRunId=${envelope.campaignRunId};`,
    `exportId=${envelope.exportId};`,
    `exportedAt=${envelope.exportedAt};`,
    `${refs.join("; ")}.`,
    `${searchBits.join("; ")}.`,
  ]
    .filter(Boolean)
    .join(" ");
}

function serviceAreaFrom(record: NormalizedRawBusiness, campaign: D2dCampaignContext): string | null {
  if (campaign.location?.trim()) return campaign.location.trim();
  if (record.location) return record.location;
  if (record.address?.city && record.address.region) return `${record.address.city}, ${record.address.region}`;
  if (record.address?.city) return record.address.city;
  return null;
}

function completeAddress(
  address: NormalizedRawBusiness["address"],
): { readonly ok: true; readonly address: Address } | SeedMappingFailure {
  if (!address?.street) {
    return fail(D2D_INTAKE_REASON_CODES.MISSING_ADDRESS_STREET, "address.street is missing; it was not invented");
  }
  if (!address.city) {
    return fail(D2D_INTAKE_REASON_CODES.MISSING_ADDRESS_CITY, "address.city is missing; it was not invented");
  }
  if (!address.region) {
    return fail(D2D_INTAKE_REASON_CODES.MISSING_ADDRESS_REGION, "address.region is missing; it was not invented");
  }
  if (!address.postalCode) {
    return fail(D2D_INTAKE_REASON_CODES.MISSING_ADDRESS_POSTAL_CODE, "address.postalCode is missing; it was not invented");
  }
  if (!address.country) {
    return fail(D2D_INTAKE_REASON_CODES.MISSING_ADDRESS_COUNTRY, "address.country is missing; it was not invented");
  }
  return {
    ok: true,
    address: {
      street: address.street,
      city: address.city,
      region: address.region,
      postalCode: address.postalCode,
      country: address.country,
    },
  };
}

function fail(reasonCode: D2dIntakeReasonCode, reason: string): SeedMappingFailure {
  return { ok: false, reasonCode, reason };
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
