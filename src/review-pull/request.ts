/**
 * Read and check a Google review pull request.
 * Sources: workflow inputs, a review-requests JSON file, or CLI flags.
 */

import { readFileSync } from "node:fs";
import { basename } from "node:path";

export const DEFAULT_MAX_REVIEWS = 75;
export const MAX_REVIEWS_LIMIT = 250;

export type ReviewPullTrigger = "workflow_dispatch" | "push" | "cli";

export type MapsTarget =
  | { readonly kind: "url"; readonly url: string }
  | { readonly kind: "place_id"; readonly placeId: string };

export interface ReviewPullRequest {
  readonly mapsUrl: string;
  readonly maxReviews: number;
  readonly target: MapsTarget;
  readonly slug?: string;
  readonly expectedPhone?: string;
  readonly expectedName?: string;
}

export interface ReceiptRequest {
  readonly mapsUrl: string;
  readonly maxReviews: number;
  readonly expectedPhone?: string;
  readonly expectedName?: string;
}

export type RequestParse =
  | { readonly ok: true; readonly request: ReviewPullRequest }
  | { readonly ok: false; readonly detail: string; readonly partial: ReceiptRequest; readonly slug?: string };

const SLUG_PATTERN = /^[a-z0-9-]{2,60}$/;
const PLACE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export function isValidSlug(value: string): boolean {
  return SLUG_PATTERN.test(value);
}

export function slugFromName(name: string): string | null {
  const ascii = name.normalize("NFD").replace(/\p{M}/gu, "");
  const slug = ascii
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return isValidSlug(slug) ? slug : null;
}

/** Strip formatting. An 11-digit number starting with 1 drops the country code. */
export function cleanExpectedPhone(value: string): string | null {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  return /^\d{10}$/.test(digits) ? digits : null;
}

export function loadRequestFile(filePath: string): unknown {
  const parsed: unknown = JSON.parse(readFileSync(filePath, "utf8"));
  if (!isRecord(parsed)) return parsed;
  const explicit = typeof parsed.slug === "string" ? parsed.slug.trim() : "";
  if (explicit) return parsed;
  const fromName = basename(filePath, ".json");
  if (!isValidSlug(fromName)) return parsed;
  return { ...parsed, slug: fromName };
}

export function parseReviewRequest(input: unknown): RequestParse {
  const record = isRecord(input) ? input : {};
  const problems: string[] = [];
  const mapsRaw = firstFilled(record, ["mapsUrl", "maps_url"]);
  const slugRaw = firstFilled(record, ["slug"]);
  const maxRaw = firstPresent(record, ["maxReviews", "max_reviews"]);
  const phoneRaw = firstFilled(record, ["expectedPhone", "expected_phone"]);
  const nameRaw = firstFilled(record, ["expectedName", "expected_name"]);

  let target: MapsTarget | null = null;
  if (!mapsRaw) {
    problems.push(
      "mapsUrl is required. Use a google.com/maps URL, a maps.app.goo.gl or goo.gl/maps share link, or place_id:<id>.",
    );
  } else {
    target = classifyMapsTarget(mapsRaw);
    if (!target) {
      problems.push(
        "mapsUrl must be a google.com/maps URL, a maps.app.goo.gl or goo.gl/maps share link, or place_id:<id>.",
      );
    }
  }

  let slug: string | undefined;
  if (slugRaw) {
    if (!isValidSlug(slugRaw)) {
      problems.push("slug must be 2 to 60 characters of lowercase letters, digits, and dashes.");
    } else {
      slug = slugRaw;
    }
  }

  const maxReviews = parseMaxReviews(maxRaw, problems);
  let expectedPhone: string | undefined;
  if (phoneRaw) {
    const cleaned = cleanExpectedPhone(phoneRaw);
    if (!cleaned) {
      problems.push("expectedPhone must be a 10-digit phone number after removing formatting.");
    } else {
      expectedPhone = cleaned;
    }
  }

  const expectedName = nameRaw || undefined;

  const partial: ReceiptRequest = {
    mapsUrl: mapsRaw,
    maxReviews,
    ...(expectedPhone ? { expectedPhone } : {}),
    ...(expectedName ? { expectedName } : {}),
  };

  if (!target || problems.length > 0) {
    return {
      ok: false,
      detail: problems.join(" "),
      partial,
      ...(slug ? { slug } : {}),
    };
  }

  const request: ReviewPullRequest = {
    mapsUrl: mapsRaw,
    maxReviews,
    target,
    ...(slug ? { slug } : {}),
    ...(expectedPhone ? { expectedPhone } : {}),
    ...(expectedName ? { expectedName } : {}),
  };
  return { ok: true, request };
}

export function receiptRequestOf(request: ReviewPullRequest): ReceiptRequest {
  return {
    mapsUrl: request.mapsUrl,
    maxReviews: request.maxReviews,
    ...(request.expectedPhone ? { expectedPhone: request.expectedPhone } : {}),
    ...(request.expectedName ? { expectedName: request.expectedName } : {}),
  };
}

function parseMaxReviews(value: unknown, problems: string[]): number {
  if (value === undefined) return DEFAULT_MAX_REVIEWS;
  const numeric = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
  if (!Number.isInteger(numeric)) {
    problems.push(`maxReviews must be a whole number from 1 to ${MAX_REVIEWS_LIMIT}.`);
    return DEFAULT_MAX_REVIEWS;
  }
  if (numeric < 1 || numeric > MAX_REVIEWS_LIMIT) {
    problems.push(`maxReviews must be a whole number from 1 to ${MAX_REVIEWS_LIMIT}.`);
    return numeric;
  }
  return numeric;
}

function classifyMapsTarget(value: string): MapsTarget | null {
  const place = /^place_id:(.+)$/i.exec(value);
  if (place) {
    const placeId = place[1]?.trim() ?? "";
    if (!PLACE_ID_PATTERN.test(placeId)) return null;
    return { kind: "place_id", placeId };
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  const host = url.hostname.toLowerCase();
  const path = url.pathname;
  if (host === "maps.app.goo.gl") {
    return path.length > 1 ? { kind: "url", url: value } : null;
  }
  if (host === "goo.gl") {
    return path === "/maps" || path.startsWith("/maps/") ? { kind: "url", url: value } : null;
  }
  if (host === "google.com" || host === "www.google.com") {
    return path === "/maps" || path.startsWith("/maps/") ? { kind: "url", url: value } : null;
  }
  return null;
}

function firstFilled(record: Record<string, unknown>, keys: readonly string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function firstPresent(record: Record<string, unknown>, keys: readonly string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== "") return record[key];
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
