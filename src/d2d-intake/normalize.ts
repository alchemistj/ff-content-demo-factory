import { D2dIntakeEnvelopeError } from "./errors.js";
import { findForbiddenConclusion } from "../factory/qualify.js";
import {
  D2D_FACTORY_INTAKE_VERSION,
  D2D_INTAKE_DEFAULT_MAX_BATCH,
  D2D_INTAKE_REASON_CODES,
  intakeCorrelationId,
  parseIntakeCorrelationId,
  type D2dApifyProvenance,
  type D2dCampaignContext,
  type D2dIntakeBatch,
  type D2dLatLng,
  type D2dRawAddress,
  type NormalizedRawBusiness,
} from "./types.js";

type AnyRecord = Record<string, unknown>;

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export interface NormalizeSuccess {
  readonly status: "normalized";
  readonly record: NormalizedRawBusiness;
}

export interface NormalizeInvalid {
  readonly status: "invalid";
  readonly d2dProspectId: string;
  readonly sourceBusinessId: string;
  readonly d2dBusinessId: string;
  readonly campaignBusinessId: string | null;
  readonly correlationId: string;
  readonly reasonCode: (typeof D2D_INTAKE_REASON_CODES)[keyof typeof D2D_INTAKE_REASON_CODES];
  readonly reason: string;
}

export type NormalizeRawResult = NormalizeSuccess | NormalizeInvalid;

export function configuredMaxBatch(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.D2D_INTAKE_MAX_BATCH;
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number(raw);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return D2D_INTAKE_DEFAULT_MAX_BATCH;
}

export function parseD2dIntakeBatch(input: unknown): D2dIntakeBatch {
  if (!isRecord(input)) {
    throw new D2dIntakeEnvelopeError(D2D_INTAKE_REASON_CODES.INVALID_ENVELOPE, "D2D intake payload must be an object");
  }
  if (input.version !== D2D_FACTORY_INTAKE_VERSION) {
    throw new D2dIntakeEnvelopeError(
      D2D_INTAKE_REASON_CODES.UNSUPPORTED_VERSION,
      `version must be ${D2D_FACTORY_INTAKE_VERSION}`,
    );
  }
  if ("prospects" in input && !("businesses" in input)) {
    throw new D2dIntakeEnvelopeError(
      D2D_INTAKE_REASON_CODES.INVALID_ENVELOPE,
      "D2D intake v1 carries raw businesses, not prequalified prospects",
    );
  }
  const envelopeForbidden = findForbiddenConclusion(envelopeWithoutBusinesses(input));
  if (envelopeForbidden) {
    throw new D2dIntakeEnvelopeError(
      D2D_INTAKE_REASON_CODES.INHERITED_CONCLUSION,
      `Raw D2D envelope contains non-authoritative conclusion field at ${envelopeForbidden}`,
    );
  }
  const campaignId = requiredId(input.campaignId, D2D_INTAKE_REASON_CODES.MISSING_CAMPAIGN_ID, "campaignId");
  const campaignRunId = requiredId(
    input.campaignRunId,
    D2D_INTAKE_REASON_CODES.MISSING_CAMPAIGN_RUN_ID,
    "campaignRunId",
  );
  const exportId = requiredId(input.exportId, D2D_INTAKE_REASON_CODES.MISSING_EXPORT_ID, "exportId");
  const exportedAt = requiredTimestamp(input.exportedAt, "exportedAt");
  const campaign = parseCampaign(input.campaign);
  if (!Array.isArray(input.businesses)) {
    throw new D2dIntakeEnvelopeError(D2D_INTAKE_REASON_CODES.INVALID_ENVELOPE, "businesses must be an array");
  }
  if (input.businesses.length === 0) {
    throw new D2dIntakeEnvelopeError(D2D_INTAKE_REASON_CODES.EMPTY_BATCH, "businesses must contain at least one raw listing");
  }
  return {
    version: D2D_FACTORY_INTAKE_VERSION,
    campaignId,
    campaignRunId,
    exportId,
    exportedAt,
    campaign,
    businesses: input.businesses,
    ...(isRecord(input.provenance) ? { provenance: input.provenance as D2dApifyProvenance } : {}),
  };
}

export interface NormalizeBusinessEnvelope {
  readonly provenance?: D2dApifyProvenance;
  readonly exportId?: string;
}

export function normalizeRawBusiness(input: unknown, envelope: NormalizeBusinessEnvelope = {}): NormalizeRawResult {
  if (!isRecord(input)) {
    return invalid("", "", D2D_INTAKE_REASON_CODES.MALFORMED_BUSINESS, "Business entry must be an object");
  }
  const presentedCorrelationId = firstTrimmed(input.correlationId) ?? "";
  const campaignBusinessId = firstTrimmed(input.campaignBusinessId) ?? null;
  const ids = { correlationId: presentedCorrelationId, campaignBusinessId };
  const forbidden = findForbiddenConclusion(input);
  if (forbidden) {
    const d2dProspectId = firstTrimmed(input.d2dProspectId) ?? "";
    const sourceBusinessId = firstTrimmed(input.sourceBusinessId) ?? "";
    return invalid(
      d2dProspectId,
      sourceBusinessId,
      D2D_INTAKE_REASON_CODES.INHERITED_CONCLUSION,
      `Inherited conclusion field at ${forbidden} is not Content Factory qualification authority`,
      ids,
    );
  }
  const d2dProspectId = firstTrimmed(input.d2dProspectId);
  const sourceBusinessId = firstTrimmed(input.sourceBusinessId);
  if (!sourceBusinessId) {
    return invalid(
      d2dProspectId ?? "",
      "",
      D2D_INTAKE_REASON_CODES.MISSING_SOURCE_BUSINESS_ID,
      "Raw listing is missing sourceBusinessId; Google place identity is not a substitute transport key",
      ids,
    );
  }
  if (!d2dProspectId) {
    return invalid(
      "",
      sourceBusinessId,
      D2D_INTAKE_REASON_CODES.MISSING_D2D_PROSPECT_ID,
      "Raw listing is missing d2dProspectId; Content Factory will not invent a D2D prospect id",
      ids,
    );
  }
  const presentedBusinessId = firstTrimmed(input.d2dBusinessId);
  if (presentedBusinessId && presentedBusinessId !== sourceBusinessId) {
    return invalid(
      d2dProspectId,
      sourceBusinessId,
      D2D_INTAKE_REASON_CODES.MALFORMED_BUSINESS,
      "d2dBusinessId must equal sourceBusinessId",
      ids,
    );
  }
  if (!presentedCorrelationId) {
    return invalid(
      d2dProspectId,
      sourceBusinessId,
      D2D_INTAKE_REASON_CODES.MISSING_CORRELATION_ID,
      "Raw listing is missing correlationId; Content Factory will not invent or repair D2D correlation identity",
      ids,
    );
  }
  const parsedCorrelation = parseIntakeCorrelationId(presentedCorrelationId);
  const expectedCorrelation = envelope.exportId
    ? intakeCorrelationId({ sourceBusinessId, exportId: envelope.exportId })
    : parsedCorrelation && parsedCorrelation.sourceBusinessId === sourceBusinessId
      ? presentedCorrelationId
      : null;
  if (
    !parsedCorrelation ||
    parsedCorrelation.sourceBusinessId !== sourceBusinessId ||
    (envelope.exportId && presentedCorrelationId !== expectedCorrelation)
  ) {
    return invalid(
      d2dProspectId,
      sourceBusinessId,
      D2D_INTAKE_REASON_CODES.INVALID_CORRELATION_ID,
      envelope.exportId
        ? `correlationId must equal ${intakeCorrelationId({ sourceBusinessId, exportId: envelope.exportId })}; presented value was not repaired`
        : `correlationId must equal ${sourceBusinessId}::<exportId>::${D2D_FACTORY_INTAKE_VERSION}; presented value was not repaired`,
      ids,
    );
  }
  const name = firstTrimmed(input.name, input.title);
  if (!name) {
    return invalid(
      d2dProspectId,
      sourceBusinessId,
      D2D_INTAKE_REASON_CODES.MISSING_BUSINESS_NAME,
      "Raw listing is missing name/title; a name was not invented",
      ids,
    );
  }
  const apify = isRecord(input.apify) ? (input.apify as D2dApifyProvenance) : envelope.provenance ?? null;
  const placeId = firstTrimmed(input.placeId, input.googlePlaceId, input.cid) ?? null;
  const mapsUrl = firstTrimmed(input.mapsUrl, input.googleMapsUrl, input.googleUrl, input.url) ?? null;
  const categories = Array.isArray(input.categories)
    ? input.categories.map((item) => optionalTrimmed(item)).filter((item): item is string => Boolean(item))
    : [];
  const category = firstTrimmed(input.category) ?? categories[0] ?? null;
  const address = parseAddress(input.address);
  const addressText = typeof input.address === "string" ? optionalTrimmed(input.address) ?? null : null;
  const location = firstTrimmed(input.location) ?? addressText ?? composeLocation(address);
  const website = firstTrimmed(input.website, input.websiteUrl) ?? null;
  const coordinates = parseCoordinates(input.coordinates);
  const rating = typeof input.rating === "number" && Number.isFinite(input.rating) ? input.rating : null;
  const reviewCount =
    typeof input.reviewCount === "number" && Number.isFinite(input.reviewCount)
      ? input.reviewCount
      : typeof input.listingReviewCount === "number" && Number.isFinite(input.listingReviewCount)
        ? input.listingReviewCount
        : null;

  return {
    status: "normalized",
    record: {
      d2dProspectId,
      sourceBusinessId,
      campaignBusinessId: firstTrimmed(input.campaignBusinessId) ?? null,
      d2dBusinessId: sourceBusinessId,
      placeId,
      mapsUrl,
      googleUrl: firstTrimmed(input.googleUrl, input.googleMapsUrl, input.mapsUrl) ?? null,
      name,
      category,
      categories,
      location,
      address,
      addressText,
      coordinates,
      phone: firstTrimmed(input.phone) ?? null,
      website,
      rating,
      reviewCount,
      apify,
      correlationId: presentedCorrelationId,
    },
  };
}

function envelopeWithoutBusinesses(input: AnyRecord): AnyRecord {
  const copy: AnyRecord = { ...input };
  delete copy.businesses;
  return copy;
}

function parseCampaign(value: unknown): D2dCampaignContext {
  if (!isRecord(value)) {
    throw new D2dIntakeEnvelopeError(D2D_INTAKE_REASON_CODES.INVALID_ENVELOPE, "campaign is required");
  }
  const center = parseCoordinates(value.center);
  if (!center) {
    throw new D2dIntakeEnvelopeError(
      D2D_INTAKE_REASON_CODES.INVALID_ENVELOPE,
      "campaign.center requires lat and lng",
    );
  }
  const radiusMiles = asFiniteNumber(value.radiusMiles);
  const radiusMeters = asFiniteNumber(value.radiusMeters);
  if (radiusMiles == null && radiusMeters == null) {
    throw new D2dIntakeEnvelopeError(
      D2D_INTAKE_REASON_CODES.INVALID_ENVELOPE,
      "campaign requires radiusMiles or radiusMeters",
    );
  }
  const search = isRecord(value.search) ? value.search : null;
  const query = search ? optionalTrimmed(search.query) : undefined;
  const searchStrings =
    search && Array.isArray(search.searchStrings)
      ? search.searchStrings.map((item) => optionalTrimmed(item)).filter((item): item is string => Boolean(item))
      : undefined;
  const categories =
    search && Array.isArray(search.categories)
      ? search.categories.map((item) => optionalTrimmed(item)).filter((item): item is string => Boolean(item))
      : undefined;
  const location = optionalTrimmed(value.location);
  return {
    center,
    ...(location ? { location } : {}),
    ...(radiusMiles != null ? { radiusMiles } : {}),
    ...(radiusMeters != null ? { radiusMeters } : {}),
    ...(query || searchStrings || categories
      ? {
          search: {
            ...(query ? { query } : {}),
            ...(searchStrings ? { searchStrings } : {}),
            ...(categories ? { categories } : {}),
          },
        }
      : {}),
  };
}

function parseAddress(value: unknown): D2dRawAddress | null {
  if (!isRecord(value)) return null;
  const street = optionalTrimmed(value.street);
  const city = optionalTrimmed(value.city);
  const region = optionalTrimmed(value.region);
  const postalCode = optionalTrimmed(value.postalCode);
  const country = optionalTrimmed(value.country);
  if (!street && !city && !region && !postalCode && !country) return null;
  return {
    ...(street ? { street } : {}),
    ...(city ? { city } : {}),
    ...(region ? { region } : {}),
    ...(postalCode ? { postalCode } : {}),
    ...(country ? { country } : {}),
  };
}

function parseCoordinates(value: unknown): D2dLatLng | null {
  if (!isRecord(value)) return null;
  const lat = asFiniteNumber(value.lat);
  const lng = asFiniteNumber(value.lng);
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

function composeLocation(address: D2dRawAddress | null): string | null {
  if (!address) return null;
  const parts = [address.city, address.region].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

function invalid(
  d2dProspectId: string,
  sourceBusinessId: string,
  reasonCode: NormalizeInvalid["reasonCode"],
  reason: string,
  extra?: { readonly correlationId?: string; readonly campaignBusinessId?: string | null },
): NormalizeInvalid {
  return {
    status: "invalid",
    d2dProspectId,
    sourceBusinessId,
    d2dBusinessId: sourceBusinessId || d2dProspectId,
    campaignBusinessId: extra?.campaignBusinessId ?? null,
    correlationId: extra?.correlationId ?? "",
    reasonCode,
    reason,
  };
}

function requiredId(value: unknown, code: (typeof D2D_INTAKE_REASON_CODES)[keyof typeof D2D_INTAKE_REASON_CODES], field: string): string {
  const trimmed = optionalTrimmed(value);
  if (!trimmed) {
    throw new D2dIntakeEnvelopeError(code, `${field} is required`);
  }
  return trimmed;
}

function requiredTimestamp(value: unknown, field: string): string {
  if (typeof value !== "string" || !ISO_TIMESTAMP.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new D2dIntakeEnvelopeError(D2D_INTAKE_REASON_CODES.INVALID_TIMESTAMP, `${field} must be an ISO-8601 timestamp`);
  }
  return value;
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function firstTrimmed(...values: unknown[]): string | undefined {
  for (const value of values) {
    const trimmed = optionalTrimmed(value);
    if (trimmed) return trimmed;
  }
  return undefined;
}

export function optionalTrimmed(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
