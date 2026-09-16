import { D2dIntakeEnvelopeError } from "./errors.js";
import { findForbiddenConclusion } from "../factory/qualify.js";
import {
  D2D_FACTORY_INTAKE_VERSION,
  D2D_INTAKE_DEFAULT_MAX_BATCH,
  D2D_INTAKE_REASON_CODES,
  type D2dApifyProvenance,
  type D2dCampaignContext,
  type D2dIntakeBatch,
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
  readonly d2dBusinessId: string;
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
    businesses: input.businesses,
    ...(isRecord(input.campaign) ? { campaign: input.campaign as D2dCampaignContext } : {}),
    ...(isRecord(input.provenance) ? { provenance: input.provenance as D2dApifyProvenance } : {}),
  };
}

export function normalizeRawBusiness(input: unknown, provenance?: D2dApifyProvenance): NormalizeRawResult {
  if (!isRecord(input)) {
    return invalid("", D2D_INTAKE_REASON_CODES.MALFORMED_BUSINESS, "Business entry must be an object");
  }
  const forbidden = findForbiddenConclusion(input);
  if (forbidden) {
    const id = stableIdFromRaw(input);
    return invalid(
      id,
      D2D_INTAKE_REASON_CODES.INHERITED_CONCLUSION,
      `Inherited conclusion field at ${forbidden} is not Content Factory qualification authority`,
    );
  }
  const placeId = firstTrimmed(input.placeId, input.googlePlaceId, input.cid);
  const mapsUrl = firstTrimmed(input.mapsUrl, input.googleMapsUrl, input.googleUrl, input.url);
  const name = firstTrimmed(input.name, input.title);
  if (!placeId && !mapsUrl) {
    return invalid(
      name ?? "",
      D2D_INTAKE_REASON_CODES.MISSING_STABLE_IDENTITY,
      "Raw listing is missing stable Google/place identity (placeId or maps URL)",
    );
  }
  if (!name) {
    return invalid(
      placeId ?? mapsUrl ?? "",
      D2D_INTAKE_REASON_CODES.MISSING_BUSINESS_NAME,
      "Raw listing is missing name/title; a name was not invented",
    );
  }
  const d2dBusinessId = placeId ?? mapsUrl ?? name;
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
  const itemApify = isRecord(input.apify) ? (input.apify as D2dApifyProvenance) : provenance ?? null;

  return {
    status: "normalized",
    record: {
      d2dBusinessId,
      placeId: placeId ?? null,
      mapsUrl: mapsUrl ?? null,
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
      apify: itemApify,
    },
  };
}

function envelopeWithoutBusinesses(input: AnyRecord): AnyRecord {
  const copy: AnyRecord = { ...input };
  delete copy.businesses;
  return copy;
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

function parseCoordinates(value: unknown): { readonly lat: number; readonly lng: number } | null {
  if (!isRecord(value)) return null;
  if (typeof value.lat !== "number" || typeof value.lng !== "number") return null;
  if (!Number.isFinite(value.lat) || !Number.isFinite(value.lng)) return null;
  return { lat: value.lat, lng: value.lng };
}

function composeLocation(address: D2dRawAddress | null): string | null {
  if (!address) return null;
  const parts = [address.city, address.region].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

function stableIdFromRaw(input: AnyRecord): string {
  return firstTrimmed(input.placeId, input.googlePlaceId, input.cid, input.mapsUrl, input.googleMapsUrl, input.name, input.title) ?? "";
}

function invalid(
  d2dBusinessId: string,
  reasonCode: NormalizeInvalid["reasonCode"],
  reason: string,
): NormalizeInvalid {
  return { status: "invalid", d2dBusinessId, reasonCode, reason };
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
