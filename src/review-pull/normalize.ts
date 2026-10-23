/**
 * Turn one Apify place record into the review file shape.
 * Reviewer names are shortened. Profile URLs are never copied.
 */

export interface GoogleReviewPlace {
  readonly name: string;
  readonly placeId: string;
  readonly mapsUrl: string;
  readonly address: string;
  readonly phone: string | null;
  readonly rating: number | null;
  readonly totalReviewCount: number | null;
}

export interface GoogleReview {
  readonly id: string;
  readonly reviewer: string;
  readonly rating: number;
  readonly text: string;
  readonly publishedAt: string | null;
  readonly ownerResponse: string | null;
  readonly reviewUrl: string | null;
  readonly language?: string;
}

export interface GoogleRatingOnly {
  readonly id: string;
  readonly reviewer: string;
  readonly rating: number;
  readonly publishedAt: string | null;
}

export interface ListingFields {
  readonly name: string;
  readonly placeId: string;
  readonly mapsUrl: string;
  readonly address: string;
  readonly phone: string | null;
  readonly phoneDigits: string;
  readonly rating: number | null;
  readonly totalReviewCount: number | null;
}

export interface NormalizedPlace {
  readonly place: GoogleReviewPlace;
  readonly phoneDigits: string;
  readonly reviews: readonly GoogleReview[];
  readonly ratingOnly: readonly GoogleRatingOnly[];
}

const GOOGLE_USER = "Google user";
const EMOJI = /\p{Extended_Pictographic}|\p{Emoji_Modifier}|\uFE0F|\u200D/gu;

export function formatReviewerName(raw: unknown): string {
  const source = typeof raw === "string" ? raw : "";
  const collapsed = source.replace(EMOJI, "").replace(/[\s\u00A0]+/g, " ").trim();
  if (!collapsed || collapsed.toLowerCase() === "google user") return GOOGLE_USER;
  const parts = collapsed.split(" ");
  const first = parts[0] ?? "";
  if (!first) return GOOGLE_USER;
  if (parts.length === 1) return first;
  const last = parts[parts.length - 1] ?? "";
  const initial = last.match(/\p{L}/u)?.[0];
  if (!initial) return first;
  return `${first} ${initial}.`;
}

export function readListing(item: unknown): ListingFields | null {
  if (!isRecord(item)) return null;
  const name = firstString(item, ["title", "name"]);
  const placeId = firstString(item, ["placeId", "place_id"]);
  const explicitUrl = firstString(item, ["url", "mapsUrl"]);
  const mapsUrl = explicitUrl || (placeId ? `https://www.google.com/maps/place/?q=place_id:${placeId}` : "");
  const phone = firstString(item, ["phone"]) || firstString(item, ["phoneUnformatted"]) || null;
  const digitsSource = firstString(item, ["phoneUnformatted"]) || firstString(item, ["phone"]);
  return {
    name,
    placeId,
    mapsUrl,
    address: firstString(item, ["address"]),
    phone,
    phoneDigits: digitsSource.replace(/\D/g, ""),
    rating: finiteNumber(item.totalScore),
    totalReviewCount: finiteNumber(item.reviewsCount),
  };
}

export function normalizePlace(item: unknown, maxReviews: number): NormalizedPlace | null {
  const listing = readListing(item);
  if (!listing || !isRecord(item)) return null;
  const drafts: DraftReview[] = [];
  const reviews = Array.isArray(item.reviews) ? item.reviews : [];
  for (const review of reviews) {
    const draft = draftReview(review);
    if (draft) drafts.push(draft);
  }
  drafts.sort((left, right) => {
    if (left.sortKey !== right.sortKey) return right.sortKey - left.sortKey;
    return 0;
  });
  const seen = new Set<string>();
  const unique: DraftReview[] = [];
  for (const draft of drafts) {
    if (seen.has(draft.id)) continue;
    seen.add(draft.id);
    unique.push(draft);
  }
  const capped = unique.slice(0, Math.max(0, maxReviews));
  const withText: GoogleReview[] = [];
  const ratingOnly: GoogleRatingOnly[] = [];
  for (const draft of capped) {
    if (draft.text) {
      withText.push({
        id: draft.id,
        reviewer: draft.reviewer,
        rating: draft.rating,
        text: draft.text,
        publishedAt: draft.publishedAt,
        ownerResponse: draft.ownerResponse,
        reviewUrl: draft.reviewUrl,
        ...(draft.language ? { language: draft.language } : {}),
      });
    } else {
      ratingOnly.push({
        id: draft.id,
        reviewer: draft.reviewer,
        rating: draft.rating,
        publishedAt: draft.publishedAt,
      });
    }
  }
  return {
    place: {
      name: listing.name,
      placeId: listing.placeId,
      mapsUrl: listing.mapsUrl,
      address: listing.address,
      phone: listing.phone,
      rating: listing.rating,
      totalReviewCount: listing.totalReviewCount,
    },
    phoneDigits: listing.phoneDigits,
    reviews: withText,
    ratingOnly,
  };
}

interface DraftReview {
  readonly id: string;
  readonly reviewer: string;
  readonly rating: number;
  readonly text: string;
  readonly publishedAt: string | null;
  readonly ownerResponse: string | null;
  readonly reviewUrl: string | null;
  readonly language?: string;
  readonly sortKey: number;
}

function draftReview(item: unknown): DraftReview | null {
  if (!isRecord(item)) return null;
  const id = firstString(item, ["reviewId", "id"]);
  if (!id) return null;
  const rating = finiteNumber(item.stars) ?? finiteNumber(item.rating);
  if (rating === null) return null;
  const publishedAt = toIso(firstString(item, ["publishedAtDate", "publishedAt"]));
  const text = reviewText(item);
  const owner = firstString(item, ["responseFromOwnerText", "ownerResponse"]);
  return {
    id,
    reviewer: formatReviewerName(firstString(item, ["name", "reviewerName", "author"])),
    rating,
    text: text.text,
    publishedAt,
    ownerResponse: owner || null,
    reviewUrl: safeReviewUrl(firstString(item, ["reviewUrl"])),
    ...(text.language ? { language: text.language } : {}),
    sortKey: publishedAt ? Date.parse(publishedAt) : Number.NEGATIVE_INFINITY,
  };
}

function reviewText(review: Record<string, unknown>): { text: string; language?: string } {
  const original = firstString(review, ["originalText"]);
  const primary = original || firstString(review, ["text", "reviewText"]);
  const text = (primary || firstString(review, ["textTranslated", "translatedText"])).trim();
  const language = firstString(review, ["originalLanguage", "language"]);
  return { text, ...(language ? { language } : {}) };
}

function safeReviewUrl(value: string): string | null {
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower.includes("/contrib/") || lower.includes("googleusercontent.com")) return null;
  return value;
}

function toIso(value: string): string | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString();
}

function firstString(record: Record<string, unknown>, keys: readonly string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
