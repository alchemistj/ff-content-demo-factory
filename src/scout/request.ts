/**
 * Read and check a prospect scout request.
 * Sources: workflow inputs, a scout-requests JSON file, or CLI flags.
 */

import { isValidSlug, loadRequestFile, slugFromName } from "../review-pull/request.js";

export const DEFAULT_MAX_PLACES = 60;
export const MAX_PLACES_LIMIT = 120;
export const QUERY_LIMIT = 200;
export const LOCATION_LIMIT = 200;

export type ScoutTrigger = "workflow_dispatch" | "push" | "cli";

export interface ScoutRequest {
  readonly query: string;
  readonly location: string;
  readonly maxPlaces: number;
  readonly slug?: string;
}

export interface ScoutReceiptRequest {
  readonly query: string;
  readonly location: string;
  readonly maxPlaces: number;
}

export type ScoutRequestParse =
  | { readonly ok: true; readonly request: ScoutRequest }
  | { readonly ok: false; readonly detail: string; readonly partial: ScoutReceiptRequest; readonly slug?: string };

export { loadRequestFile };

export function scoutSlug(
  requested: string | undefined,
  query: string,
  location: string,
  githubRunId?: string,
): string {
  if (requested && isValidSlug(requested)) return requested;
  const fromSearch = slugFromName(`${query} ${location}`.trim());
  if (fromSearch) return fromSearch;
  const run = githubRunId && /^[0-9]{1,40}$/.test(githubRunId) ? githubRunId : "local";
  const fallback = `unnamed-${run}`;
  return isValidSlug(fallback) ? fallback : "unnamed-local";
}

export function parseScoutRequest(input: unknown): ScoutRequestParse {
  const record = isRecord(input) ? input : {};
  const problems: string[] = [];
  const query = firstFilled(record, ["query"]);
  const location = firstFilled(record, ["location"]);
  const slugRaw = firstFilled(record, ["slug"]);
  const maxRaw = firstPresent(record, ["maxPlaces", "max_places"]);

  if (!query) {
    problems.push("query is required. Example: window installation.");
  } else if ([...query].length > QUERY_LIMIT) {
    problems.push(`query must be ${QUERY_LIMIT} characters or fewer.`);
  }

  if (!location) {
    problems.push("location is required. Example: Indianapolis, IN.");
  } else if ([...location].length > LOCATION_LIMIT) {
    problems.push(`location must be ${LOCATION_LIMIT} characters or fewer.`);
  }

  let slug: string | undefined;
  if (slugRaw) {
    if (!isValidSlug(slugRaw)) {
      problems.push("slug must be 2 to 60 characters of lowercase letters, digits, and dashes.");
    } else {
      slug = slugRaw;
    }
  }

  const maxPlaces = parseMaxPlaces(maxRaw, problems);
  const partial: ScoutReceiptRequest = { query, location, maxPlaces };
  if (problems.length > 0) {
    return {
      ok: false,
      detail: problems.join(" "),
      partial,
      ...(slug ? { slug } : {}),
    };
  }

  const request: ScoutRequest = {
    query,
    location,
    maxPlaces,
    ...(slug ? { slug } : {}),
  };
  return { ok: true, request };
}

export function receiptRequestOf(request: ScoutRequest): ScoutReceiptRequest {
  return {
    query: request.query,
    location: request.location,
    maxPlaces: request.maxPlaces,
  };
}

function parseMaxPlaces(value: unknown, problems: string[]): number {
  if (value === undefined) return DEFAULT_MAX_PLACES;
  const numeric = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
  if (!Number.isInteger(numeric)) {
    problems.push(`maxPlaces must be a whole number from 1 to ${MAX_PLACES_LIMIT}.`);
    return DEFAULT_MAX_PLACES;
  }
  if (numeric < 1 || numeric > MAX_PLACES_LIMIT) {
    problems.push(`maxPlaces must be a whole number from 1 to ${MAX_PLACES_LIMIT}.`);
    return numeric;
  }
  return numeric;
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
