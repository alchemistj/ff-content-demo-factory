import { D2D_SOURCE_KIND, type WorkflowSourceCorrelation } from "../workflow/state.js";
import type { Address, BusinessIdentity, Nap, ProspectSeed } from "../handoff/types.js";
import {
  D2D_FACTORY_INTAKE_VERSION,
  D2D_INTAKE_REASON_CODES,
  D2D_RAW_EXPORT_SCHEMA,
  intakeCorrelationId,
  type D2dIntakeReasonCode,
  type D2dSearchContext,
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
  searchContext?: D2dSearchContext,
): SeedMappingResult {
  return mapAdvancedBusinessToSeed(record, {
    campaignId: "campaign",
    campaignRunId: "campaign-run",
    exportId: "export",
    exportedAt: "2026-01-01T00:00:00.000Z",
    ...(searchContext ? { searchContext } : { searchContext: { latitude: 0, longitude: 0, radiusMiles: 1, searchTerms: ["x"] } }),
  });
}

export function mapAdvancedBusinessToSeed(
  record: NormalizedRawBusiness,
  envelope: {
    readonly campaignId: string;
    readonly campaignRunId: string;
    readonly exportId: string;
    readonly exportedAt: string;
    readonly searchContext: D2dSearchContext;
  },
): SeedMappingResult {
  const trade = record.category;
  if (!trade) {
    return fail(D2D_INTAKE_REASON_CODES.MISSING_TRADE, "category/trade is missing; it was not invented");
  }
  const serviceArea = serviceAreaFrom(record);
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
  const correlationId = intakeCorrelationId({
    sourceBusinessId: record.sourceBusinessId,
    exportId: envelope.exportId,
  });
  const correlation: WorkflowSourceCorrelation = {
    kind: D2D_SOURCE_KIND,
    d2dProspectId: record.d2dProspectId,
    sourceBusinessId: record.sourceBusinessId,
    d2dBusinessId: record.sourceBusinessId,
    campaignId: envelope.campaignId,
    campaignRunId: envelope.campaignRunId,
    exportId: envelope.exportId,
    exportedAt: envelope.exportedAt,
    correlationId,
    searchContext: envelope.searchContext,
    factoryQualificationOutcome: "advanced",
    factoryQualificationReason: "Advanced by Content Factory after candidate-bench + website/opportunity selection.",
    ...(record.campaignBusinessId ? { campaignBusinessId: record.campaignBusinessId } : {}),
    ...(record.placeId ? { placeId: record.placeId } : {}),
    ...(record.coordinates ? { coordinates: record.coordinates } : {}),
    ...(record.provenance ? { provenance: record.provenance } : {}),
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
    readonly searchContext: D2dSearchContext;
  },
): string {
  const refs = [
    `d2dProspectId=${record.d2dProspectId}`,
    `sourceBusinessId=${record.sourceBusinessId}`,
    record.campaignBusinessId ? `campaignBusinessId=${record.campaignBusinessId}` : null,
    record.placeId ? `placeId=${record.placeId}` : null,
    record.mapsUrl ? `mapsUrl=${record.mapsUrl}` : null,
    record.googleUrl ? `googleUrl=${record.googleUrl}` : null,
    record.coordinates
      ? `coordinates=${record.coordinates.latitude},${record.coordinates.longitude}`
      : null,
    record.provenance?.actor ? `provenance.actor=${record.provenance.actor}` : null,
    record.provenance?.runId ? `provenance.runId=${record.provenance.runId}` : null,
    record.provenance?.datasetId ? `provenance.datasetId=${record.provenance.datasetId}` : null,
    record.provenance?.itemId ? `provenance.itemId=${record.provenance.itemId}` : null,
  ].filter(Boolean);
  const searchBits = [
    `searchContext.latitude=${envelope.searchContext.latitude}`,
    `searchContext.longitude=${envelope.searchContext.longitude}`,
    `searchContext.radiusMiles=${envelope.searchContext.radiusMiles}`,
    `searchContext.searchTerms=${envelope.searchContext.searchTerms.join(",")}`,
  ];
  return [
    `D2D raw intake ${D2D_FACTORY_INTAKE_VERSION} consuming ${D2D_RAW_EXPORT_SCHEMA}.`,
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

function serviceAreaFrom(record: NormalizedRawBusiness): string | null {
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
