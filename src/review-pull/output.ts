/**
 * Write reviews.json, reviews.md, receipt.json, and reviews/index.json.
 * A failed run still leaves a receipt and an index row. reviews.md is only written when the pull is ok.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { pullApifyPlaces, redactSecret, type ApifyPullResult } from "./apify.js";
import { checkIdentity } from "./identity.js";
import type { GoogleRatingOnly, GoogleReview, GoogleReviewPlace } from "./normalize.js";
import {
  isValidSlug,
  parseReviewRequest,
  receiptRequestOf,
  slugFromName,
  type ReceiptRequest,
  type ReviewPullTrigger,
} from "./request.js";

export const MISSING_TOKEN_DETAIL =
  "Add the APIFY_API_TOKEN secret to alchemistj/ff-content-demo-factory";

export const RECEIPT_STATUSES = [
  "ok",
  "not_found",
  "ambiguous",
  "identity_mismatch",
  "invalid_request",
  "apify_error",
  "missing_token",
] as const;

export type ReceiptStatus = (typeof RECEIPT_STATUSES)[number];

export interface ReviewCounts {
  readonly listingTotal: number | null;
  readonly withText: number;
  readonly ratingOnly: number;
}

export interface ReviewPullReceipt {
  readonly kind: "google-review-pull-receipt";
  readonly status: ReceiptStatus;
  readonly slug: string;
  readonly request: ReceiptRequest;
  readonly trigger: ReviewPullTrigger;
  readonly apify: {
    readonly actor: "compass~crawler-google-places";
    readonly runId: string | null;
    readonly datasetId: string | null;
    readonly attempts: number;
    readonly usageUsd: number | null;
  };
  readonly counts: ReviewCounts;
  readonly detail: string | null;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly githubRunUrl: string | null;
}

export interface GoogleReviewFile {
  readonly kind: "google-review-pull";
  readonly version: 1;
  readonly slug: string;
  readonly place: GoogleReviewPlace;
  readonly pulledAt: string;
  readonly requestedMax: number;
  readonly reviews: readonly GoogleReview[];
  readonly ratingOnly: readonly GoogleRatingOnly[];
}

export interface ReviewIndexRow {
  readonly slug: string;
  readonly name: string | null;
  readonly placeId: string | null;
  readonly status: ReceiptStatus;
  readonly counts: ReviewCounts;
  readonly pulledAt: string;
}

export interface ReviewIndexFile {
  readonly kind: "google-review-pull-index";
  readonly version: 1;
  readonly places: readonly ReviewIndexRow[];
}

export interface ExecuteReviewPullOptions {
  readonly rawRequest: unknown;
  readonly trigger: ReviewPullTrigger;
  readonly outDir: string;
  readonly token?: string;
  readonly githubRunId?: string;
  readonly githubRunUrl?: string | null;
  readonly fetchImpl?: typeof fetch;
  readonly sleep?: (ms: number) => Promise<void>;
  readonly now?: () => Date;
  readonly log?: (line: string) => void;
  readonly invalidDetail?: string;
}

const EMPTY_APIFY = {
  actor: "compass~crawler-google-places",
  runId: null,
  datasetId: null,
  attempts: 0,
  usageUsd: null,
} as const;

export async function executeReviewPull(options: ExecuteReviewPullOptions): Promise<ReviewPullReceipt> {
  const now = options.now ?? (() => new Date());
  const startedAt = now().toISOString();
  const parsed = options.invalidDetail
    ? {
        ok: false as const,
        detail: options.invalidDetail,
        partial: { mapsUrl: "", maxReviews: 75 } satisfies ReceiptRequest,
      }
    : parseReviewRequest(options.rawRequest);
  const token = options.token?.trim() ?? "";
  const baseSlug = !parsed.ok && "slug" in parsed ? parsed.slug : parsed.ok ? parsed.request.slug : undefined;

  const finish = (input: {
    status: ReceiptStatus;
    detail: string | null;
    request: ReceiptRequest;
    slugHint?: string;
    placeName?: string | null;
    placeId?: string | null;
    counts?: ReviewCounts;
    apify?: ApifyPullResult | null;
    normalized?: GoogleReviewFile | null;
  }): ReviewPullReceipt => {
    const slug = chooseSlug(input.slugHint ?? baseSlug, input.placeName ?? null, options.githubRunId);
    const finishedAt = now().toISOString();
    const apify = input.apify;
    const receipt: ReviewPullReceipt = {
      kind: "google-review-pull-receipt",
      status: input.status,
      slug,
      request: redactRequest(input.request, token),
      trigger: options.trigger,
      apify: apify
        ? {
            actor: "compass~crawler-google-places",
            runId: apify.runId,
            datasetId: apify.datasetId,
            attempts: apify.attempts,
            usageUsd: apify.usageUsd,
          }
        : EMPTY_APIFY,
      counts: input.counts ?? { listingTotal: null, withText: 0, ratingOnly: 0 },
      detail: input.detail === null ? null : redactSecret(input.detail, token),
      startedAt,
      finishedAt,
      githubRunUrl: options.githubRunUrl ?? null,
    };
    publish(options.outDir, receipt, input.normalized ?? null, {
      name: input.placeName ?? null,
      placeId: input.placeId ?? null,
    });
    return receipt;
  };

  try {
    if (!parsed.ok) {
      return finish({
        status: "invalid_request",
        detail: parsed.detail,
        request: parsed.partial,
        ...(parsed.slug ? { slugHint: parsed.slug } : {}),
      });
    }
    if (!token) {
      return finish({
        status: "missing_token",
        detail: MISSING_TOKEN_DETAIL,
        request: receiptRequestOf(parsed.request),
        ...(parsed.request.slug ? { slugHint: parsed.request.slug } : {}),
      });
    }

    const pulled = await pullApifyPlaces({
      token,
      request: parsed.request,
      now: () => now().getTime(),
      ...(options.fetchImpl ? { fetch: options.fetchImpl } : {}),
      ...(options.sleep ? { sleep: options.sleep } : {}),
      ...(options.log ? { log: options.log } : {}),
    });
    if (!pulled.ok) {
      return finish({
        status: "apify_error",
        detail: pulled.detail,
        request: receiptRequestOf(parsed.request),
        ...(parsed.request.slug ? { slugHint: parsed.request.slug } : {}),
        apify: pulled,
      });
    }

    const identity = checkIdentity(pulled.items, parsed.request);
    if (!identity.ok) {
      return finish({
        status: identity.status,
        detail: identity.detail,
        request: receiptRequestOf(parsed.request),
        ...(parsed.request.slug ? { slugHint: parsed.request.slug } : {}),
        placeName: identity.name,
        placeId: identity.placeId,
        counts: {
          listingTotal: identity.listingTotal,
          withText: 0,
          ratingOnly: 0,
        },
        apify: pulled,
      });
    }

    const slug = chooseSlug(parsed.request.slug, identity.normalized.place.name, options.githubRunId);
    const file: GoogleReviewFile = {
      kind: "google-review-pull",
      version: 1,
      slug,
      place: identity.normalized.place,
      pulledAt: startedAt,
      requestedMax: parsed.request.maxReviews,
      reviews: identity.normalized.reviews,
      ratingOnly: identity.normalized.ratingOnly,
    };
    return finish({
      status: "ok",
      detail: null,
      request: receiptRequestOf(parsed.request),
      slugHint: slug,
      placeName: file.place.name,
      placeId: file.place.placeId,
      counts: {
        listingTotal: file.place.totalReviewCount,
        withText: file.reviews.length,
        ratingOnly: file.ratingOnly.length,
      },
      apify: pulled,
      normalized: file,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const request = parsed.ok ? receiptRequestOf(parsed.request) : parsed.partial;
    return finish({
      status: "apify_error",
      detail: redactSecret(message, token),
      request,
      ...(baseSlug ? { slugHint: baseSlug } : {}),
    });
  }
}

export function renderReviewsMarkdown(file: GoogleReviewFile): string {
  const rating = file.place.rating === null ? "no rating" : String(file.place.rating);
  const total = file.place.totalReviewCount === null ? "unknown total" : `${file.place.totalReviewCount} Google reviews`;
  const lines = [
    `# ${file.place.name}`,
    "",
    `${rating} · ${total} · pulled ${file.pulledAt}`,
    "",
  ];
  for (const review of file.reviews) {
    lines.push(`## ${stars(review.rating)} · ${review.reviewer} · ${displayDate(review.publishedAt)}`, "", review.text, "");
    if (review.ownerResponse) lines.push(`Owner response: ${review.ownerResponse}`, "");
    if (review.language) lines.push(`Language: ${review.language}`, "");
  }
  for (const review of file.ratingOnly) {
    lines.push(`## ${stars(review.rating)} · ${review.reviewer} · ${displayDate(review.publishedAt)}`, "");
  }
  return `${lines.join("\n").replace(/\n+$/g, "")}\n`;
}

export function chooseSlug(requested: string | undefined, placeName: string | null, githubRunId: string | undefined): string {
  if (requested && isValidSlug(requested)) return requested;
  if (placeName) {
    const fromName = slugFromName(placeName);
    if (fromName) return fromName;
  }
  const run = githubRunId && /^[0-9]{1,40}$/.test(githubRunId) ? githubRunId : "local";
  const fallback = `unnamed-${run}`;
  return isValidSlug(fallback) ? fallback : "unnamed-local";
}

function publish(
  outDir: string,
  receipt: ReviewPullReceipt,
  reviews: GoogleReviewFile | null,
  indexPlace: { name: string | null; placeId: string | null },
): void {
  const root = resolve(outDir);
  mkdirSync(root, { recursive: true });
  const index = loadIndex(root);
  const dir = slugDirectory(root, receipt.slug);
  const succeeded = receipt.status === "ok" && reviews !== null;
  // A failed pull only replaces the receipt, so the last good reviews stay readable.
  if (succeeded) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  if (succeeded && reviews) {
    const stamped: GoogleReviewFile = { ...reviews, slug: receipt.slug, pulledAt: receipt.finishedAt };
    writeJson(join(dir, "reviews.json"), stamped);
    writeFileSync(join(dir, "reviews.md"), renderReviewsMarkdown(stamped));
  }
  writeJson(join(dir, "receipt.json"), receipt);
  const row: ReviewIndexRow = {
    slug: receipt.slug,
    name: indexPlace.name,
    placeId: indexPlace.placeId,
    status: receipt.status,
    counts: receipt.counts,
    pulledAt: receipt.finishedAt,
  };
  const previous = index.places.find((place) => place.slug === receipt.slug);
  const places = index.places.filter((place) => place.slug !== receipt.slug);
  places.push(!succeeded && previous?.status === "ok" ? previous : row);
  places.sort((left, right) => left.slug.localeCompare(right.slug));
  writeJson(join(root, "index.json"), {
    kind: "google-review-pull-index",
    version: 1,
    places,
  } satisfies ReviewIndexFile);
}

function loadIndex(outDir: string): ReviewIndexFile {
  const path = join(outDir, "index.json");
  if (!existsSync(path)) return { kind: "google-review-pull-index", version: 1, places: [] };
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!isRecord(parsed) || !Array.isArray(parsed.places)) {
    throw new Error("reviews/index.json could not be read.");
  }
  const places: ReviewIndexRow[] = [];
  for (const row of parsed.places) {
    if (!isRecord(row) || typeof row.slug !== "string" || !isValidSlug(row.slug)) continue;
    places.push(row as unknown as ReviewIndexRow);
  }
  return { kind: "google-review-pull-index", version: 1, places };
}

function slugDirectory(outDir: string, slug: string): string {
  if (!isValidSlug(slug)) throw new Error(`Unsafe review slug: ${slug}`);
  const dir = resolve(outDir, slug);
  if (dir !== outDir && !dir.startsWith(`${outDir}${sep}`)) throw new Error(`Unsafe review slug: ${slug}`);
  return dir;
}

function redactRequest(request: ReceiptRequest, token: string): ReceiptRequest {
  return {
    ...request,
    mapsUrl: redactSecret(request.mapsUrl, token),
    ...(request.expectedName ? { expectedName: redactSecret(request.expectedName, token) } : {}),
  };
}

function stars(rating: number): string {
  const rounded = Math.round(rating);
  if (rounded < 1 || rounded > 5) return String(rating);
  return `${"★".repeat(rounded)}${"☆".repeat(5 - rounded)}`;
}

function displayDate(value: string | null): string {
  if (!value) return "unknown date";
  return /^(\d{4}-\d{2}-\d{2})/.exec(value)?.[1] ?? value;
}

function writeJson(path: string, value: unknown): void {
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temporary, path);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
