/**
 * Turn Apify search rows into prospect places.
 * Rank stays the 1-based position Google returned. Missing values stay null.
 * Dataset order is kept. Nothing is sorted by rating or review count.
 */

export interface ScoutPlace {
  readonly rank: number | null;
  readonly name: string | null;
  readonly placeId: string | null;
  readonly mapsUrl: string | null;
  readonly categoryName: string | null;
  readonly categories: readonly string[] | null;
  readonly rating: number | null;
  readonly reviewsCount: number | null;
  readonly website: string | null;
  readonly phone: string | null;
  readonly address: string | null;
  readonly city: string | null;
  readonly state: string | null;
  readonly permanentlyClosed: boolean | null;
  readonly temporarilyClosed: boolean | null;
  readonly isAdvertisement: boolean | null;
  readonly claimThisBusiness: boolean | null;
  readonly ownerUpdates: unknown | null;
}

export function normalizeScoutPlaces(items: readonly unknown[]): ScoutPlace[] {
  const records: Array<{ readonly item: Record<string, unknown>; readonly position: number }> = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!isRecord(item)) continue;
    records.push({ item, position: index + 1 });
  }
  const anyReportedRank = records.some((record) => positiveInteger(record.item.rank) !== null);
  return records.map((record) => normalizeScoutPlace(record.item, record.position, anyReportedRank));
}

function normalizeScoutPlace(item: Record<string, unknown>, position: number, anyReportedRank: boolean): ScoutPlace {
  const reported = positiveInteger(item.rank);
  const rank = reported ?? (anyReportedRank ? null : position);
  return {
    rank,
    name: text(item.title) ?? text(item.name),
    placeId: text(item.placeId) ?? text(item.place_id),
    mapsUrl: text(item.url) ?? text(item.mapsUrl),
    categoryName: text(item.categoryName),
    categories: categoriesOf(item.categories),
    rating: finiteNumber(item.totalScore) ?? finiteNumber(item.rating),
    reviewsCount: finiteNumber(item.reviewsCount),
    website: text(item.website),
    phone: text(item.phone) ?? text(item.phoneUnformatted),
    address: text(item.address),
    city: text(item.city),
    state: text(item.state),
    permanentlyClosed: booleanOrNull(item.permanentlyClosed),
    temporarilyClosed: booleanOrNull(item.temporarilyClosed),
    isAdvertisement: booleanOrNull(item.isAdvertisement),
    claimThisBusiness: booleanOrNull(item.claimThisBusiness),
    ownerUpdates: jsonValue(item.ownerUpdates),
  };
}

function categoriesOf(value: unknown): readonly string[] | null {
  if (!Array.isArray(value)) return null;
  const categories = value.filter((entry): entry is string => typeof entry === "string").flatMap((entry) => {
    const trimmed = entry.trim();
    return trimmed ? [trimmed] : [];
  });
  if (categories.length > 0) return categories;
  return value.length === 0 ? [] : null;
}

function positiveInteger(value: unknown): number | null {
  const numeric = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
  if (!Number.isInteger(numeric) || numeric < 1) return null;
  return numeric;
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function booleanOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function jsonValue(value: unknown): unknown | null {
  if (value === undefined || value === null) return null;
  try {
    return JSON.parse(JSON.stringify(value)) as unknown;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
