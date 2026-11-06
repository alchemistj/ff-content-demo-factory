/**
 * Write places.json, places.md, and receipt.json.
 * A failed run still leaves a receipt. places.json and places.md are written only when the scout is ok.
 * A failed re-scout replaces the receipt and leaves the last good places in place.
 */

import { mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { pullApifyDataset, redactSecret, type ApifyPullResult } from "../review-pull/apify.js";
import { MISSING_TOKEN_DETAIL } from "../review-pull/output.js";
import { isValidSlug } from "../review-pull/request.js";
import { buildScoutActorInput } from "./actor.js";
import { normalizeScoutPlaces, type ScoutPlace } from "./normalize.js";
import {
  parseScoutRequest,
  receiptRequestOf,
  scoutSlug,
  type ScoutReceiptRequest,
  type ScoutRequest,
  type ScoutTrigger,
} from "./request.js";

export { MISSING_TOKEN_DETAIL };

export const SCOUT_RECEIPT_STATUSES = ["ok", "invalid_request", "apify_error", "missing_token"] as const;

export type ScoutReceiptStatus = (typeof SCOUT_RECEIPT_STATUSES)[number];

export interface ScoutCounts {
  readonly returned: number;
  readonly advertisements: number;
}

export interface ScoutReceipt {
  readonly kind: "google-prospect-scout-receipt";
  readonly status: ScoutReceiptStatus;
  readonly slug: string;
  readonly request: ScoutReceiptRequest;
  readonly trigger: ScoutTrigger;
  readonly apify: {
    readonly actor: "compass~crawler-google-places";
    readonly runId: string | null;
    readonly datasetId: string | null;
    readonly attempts: number;
    readonly usageUsd: number | null;
  };
  readonly counts: ScoutCounts;
  readonly detail: string | null;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly githubRunUrl: string | null;
}

export interface ScoutPlaceFile {
  readonly kind: "google-prospect-scout";
  readonly version: 1;
  readonly slug: string;
  readonly query: string;
  readonly location: string;
  readonly maxPlaces: number;
  readonly scrapedAt: string;
  readonly places: readonly ScoutPlace[];
}

export interface ExecuteScoutOptions {
  readonly rawRequest: unknown;
  readonly trigger: ScoutTrigger;
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

const EMPTY_COUNTS: ScoutCounts = { returned: 0, advertisements: 0 };

export async function executeScout(options: ExecuteScoutOptions): Promise<ScoutReceipt> {
  const now = options.now ?? (() => new Date());
  const startedAt = now().toISOString();
  const parsed = options.invalidDetail
    ? {
        ok: false as const,
        detail: options.invalidDetail,
        partial: { query: "", location: "", maxPlaces: 60 } satisfies ScoutReceiptRequest,
      }
    : parseScoutRequest(options.rawRequest);
  const token = options.token?.trim() ?? "";
  const baseSlug = !parsed.ok && "slug" in parsed ? parsed.slug : parsed.ok ? parsed.request.slug : undefined;
  const requestText = parsed.ok ? receiptRequestOf(parsed.request) : parsed.partial;

  const finish = (input: {
    status: ScoutReceiptStatus;
    detail: string | null;
    request: ScoutReceiptRequest;
    slugHint?: string;
    counts?: ScoutCounts;
    apify?: ApifyPullResult | null;
    places?: ScoutPlaceFile | null;
  }): ScoutReceipt => {
    const slug = scoutSlug(input.slugHint ?? baseSlug, input.request.query, input.request.location, options.githubRunId);
    const finishedAt = now().toISOString();
    const apify = input.apify;
    const receipt: ScoutReceipt = {
      kind: "google-prospect-scout-receipt",
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
      counts: input.counts ?? EMPTY_COUNTS,
      detail: input.detail === null ? null : redactSecret(input.detail, token),
      startedAt,
      finishedAt,
      githubRunUrl: options.githubRunUrl ?? null,
    };
    publish(options.outDir, receipt, input.places ?? null);
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

    const pulled = await pullApifyDataset({
      token,
      actorInput: buildScoutActorInput(parsed.request),
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

    const places = normalizeScoutPlaces(pulled.items).slice(0, parsed.request.maxPlaces);
    const slug = scoutSlug(parsed.request.slug, parsed.request.query, parsed.request.location, options.githubRunId);
    const file = placeFile(parsed.request, slug, startedAt, places);
    return finish({
      status: "ok",
      detail: null,
      request: receiptRequestOf(parsed.request),
      slugHint: slug,
      counts: {
        returned: places.length,
        advertisements: places.filter((place) => place.isAdvertisement === true).length,
      },
      apify: pulled,
      places: file,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return finish({
      status: "apify_error",
      detail: redactSecret(message, token),
      request: requestText,
      ...(baseSlug ? { slugHint: baseSlug } : {}),
    });
  }
}

export function renderScoutMarkdown(file: ScoutPlaceFile): string {
  const lines = [
    `# ${singleLine(file.query)} in ${singleLine(file.location)}`,
    "",
    `${file.places.length} places · search rank is the position Google returned · scraped ${file.scrapedAt}`,
    "",
    "| Rank | Name | Place ID | Maps URL | Category | Categories | Rating | Reviews | Phone | Website | Address | City | State | Permanently closed | Temporarily closed | Ad | Claim this business | Owner updates |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const place of placesByRank(file.places)) {
    lines.push(
      `| ${num(place.rank)} | ${cell(place.name)} | ${cell(place.placeId)} | ${cell(place.mapsUrl)} | ${cell(place.categoryName)} | ${cell(categoryList(place))} | ${num(place.rating)} | ${num(place.reviewsCount)} | ${cell(place.phone)} | ${cell(place.website)} | ${cell(place.address)} | ${cell(place.city)} | ${cell(place.state)} | ${yesNo(place.permanentlyClosed)} | ${yesNo(place.temporarilyClosed)} | ${yesNo(place.isAdvertisement)} | ${yesNo(place.claimThisBusiness)} | ${cell(ownerCell(place.ownerUpdates))} |`,
    );
  }
  return `${lines.join("\n").replace(/\n+$/g, "")}\n`;
}

function placeFile(request: ScoutRequest, slug: string, scrapedAt: string, places: readonly ScoutPlace[]): ScoutPlaceFile {
  return {
    kind: "google-prospect-scout",
    version: 1,
    slug,
    query: request.query,
    location: request.location,
    maxPlaces: request.maxPlaces,
    scrapedAt,
    places,
  };
}

function placesByRank(places: readonly ScoutPlace[]): ScoutPlace[] {
  return places
    .map((place, index) => ({ place, index }))
    .sort((left, right) => {
      if (left.place.rank === null && right.place.rank === null) return left.index - right.index;
      if (left.place.rank === null) return 1;
      if (right.place.rank === null) return -1;
      if (left.place.rank !== right.place.rank) return left.place.rank - right.place.rank;
      return left.index - right.index;
    })
    .map((entry) => entry.place);
}

function publish(outDir: string, receipt: ScoutReceipt, places: ScoutPlaceFile | null): void {
  const root = resolve(outDir);
  mkdirSync(root, { recursive: true });
  const dir = slugDirectory(root, receipt.slug);
  const succeeded = receipt.status === "ok" && places !== null;
  if (succeeded) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  if (succeeded && places) {
    const stamped: ScoutPlaceFile = { ...places, slug: receipt.slug, scrapedAt: receipt.finishedAt };
    writeJson(join(dir, "places.json"), stamped);
    writeFileSync(join(dir, "places.md"), renderScoutMarkdown(stamped));
  }
  writeJson(join(dir, "receipt.json"), receipt);
}

function slugDirectory(outDir: string, slug: string): string {
  if (!isValidSlug(slug)) throw new Error(`Unsafe scout slug: ${slug}`);
  const dir = resolve(outDir, slug);
  if (dir !== outDir && !dir.startsWith(`${outDir}${sep}`)) throw new Error(`Unsafe scout slug: ${slug}`);
  return dir;
}

function redactRequest(request: ScoutReceiptRequest, token: string): ScoutReceiptRequest {
  return {
    query: redactSecret(request.query, token),
    location: redactSecret(request.location, token),
    maxPlaces: request.maxPlaces,
  };
}

function categoryList(place: ScoutPlace): string {
  if (place.categories === null || place.categories.length === 0) return "";
  return place.categories.join(", ");
}

function ownerCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.length === 1 ? "1 update" : `${value.length} updates`;
  if (typeof value === "string") return value;
  return "yes";
}

function cell(value: string | null): string {
  if (!value) return "";
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

function yesNo(value: boolean | null): string {
  if (value === null) return "";
  return value ? "yes" : "no";
}

function num(value: number | null): string {
  return value === null ? "" : String(value);
}

function singleLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function writeJson(path: string, value: unknown): void {
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temporary, path);
}
