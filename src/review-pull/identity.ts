/**
 * The pull must be the one listing that was asked for, or nothing is saved as reviews.
 */

import { normalizePlace, readListing, type NormalizedPlace } from "./normalize.js";
import type { ReviewPullRequest } from "./request.js";

export type IdentityResult =
  | { readonly ok: true; readonly normalized: NormalizedPlace }
  | {
      readonly ok: false;
      readonly status: "not_found" | "ambiguous" | "identity_mismatch";
      readonly detail: string;
      readonly name: string | null;
      readonly placeId: string | null;
      readonly listingTotal: number | null;
    };

export function checkIdentity(items: readonly unknown[], request: ReviewPullRequest): IdentityResult {
  if (items.length === 0) {
    return {
      ok: false,
      status: "not_found",
      detail: "Apify returned no place for that Maps link.",
      name: null,
      placeId: null,
      listingTotal: null,
    };
  }
  if (items.length > 1) {
    const labels = items.map(placeLabel);
    const listed = labels.map((place) => `"${place.name}" (${place.address || "no address"})`).join("; ");
    return {
      ok: false,
      status: "ambiguous",
      detail: `Apify returned ${items.length} places instead of one: ${listed}.`,
      name: null,
      placeId: null,
      listingTotal: null,
    };
  }

  const item = items[0];
  const listing = readListing(item);
  if (!listing) {
    return {
      ok: false,
      status: "not_found",
      detail: "Apify returned a place record that could not be read.",
      name: null,
      placeId: null,
      listingTotal: null,
    };
  }

  const problems: string[] = [];
  if (request.expectedPhone && !listing.phoneDigits.endsWith(request.expectedPhone)) {
    problems.push(
      listing.phone
        ? `Expected the listing phone to end with ${request.expectedPhone}, but the listing phone was ${listing.phone}.`
        : `Expected the listing phone to end with ${request.expectedPhone}, but the listing had no phone.`,
    );
  }
  if (request.expectedName && !listing.name.toLowerCase().includes(request.expectedName.toLowerCase())) {
    problems.push(
      `Expected the listing name to contain "${request.expectedName}", but the listing name was "${listing.name || "(unnamed)"}".`,
    );
  }
  if (problems.length > 0) {
    return {
      ok: false,
      status: "identity_mismatch",
      detail: problems.join(" "),
      name: listing.name || null,
      placeId: listing.placeId || null,
      listingTotal: listing.totalReviewCount,
    };
  }

  const normalized = normalizePlace(item, request.maxReviews);
  if (!normalized) {
    return {
      ok: false,
      status: "not_found",
      detail: "Apify returned a place record that could not be read.",
      name: null,
      placeId: null,
      listingTotal: null,
    };
  }
  return { ok: true, normalized };
}

function placeLabel(item: unknown): { name: string; address: string } {
  const listing = readListing(item);
  if (!listing) return { name: "(unreadable place)", address: "" };
  return { name: listing.name || "(unnamed place)", address: listing.address };
}
