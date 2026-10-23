/**
 * Start compass~crawler-google-places, poll the run, and read its dataset.
 * The token is sent only as a Bearer header and is redacted from errors and logs.
 */

import type { ReviewPullRequest } from "./request.js";

export const APIFY_ACTOR = "compass~crawler-google-places";
export const APIFY_BASE = "https://api.apify.com/v2";
export const DEFAULT_POLL_INTERVAL_MS = 10_000;
export const DEFAULT_POLL_TIMEOUT_MS = 15 * 60 * 1000;
export const DEFAULT_RETRY_DELAY_MS = 20_000;

export type ApifyPullResult =
  | {
      readonly ok: true;
      readonly runId: string;
      readonly datasetId: string;
      readonly attempts: number;
      readonly usageUsd: number | null;
      readonly items: readonly unknown[];
    }
  | {
      readonly ok: false;
      readonly status: "apify_error";
      readonly detail: string;
      readonly runId: string | null;
      readonly datasetId: string | null;
      readonly attempts: number;
      readonly usageUsd: number | null;
    };

export interface ApifyPullOptions {
  readonly token: string;
  readonly request: ReviewPullRequest;
  readonly fetch?: typeof fetch;
  readonly sleep?: (ms: number) => Promise<void>;
  readonly now?: () => number;
  readonly pollIntervalMs?: number;
  readonly pollTimeoutMs?: number;
  readonly retryDelayMs?: number;
  readonly log?: (line: string) => void;
}

interface AttemptFailure {
  readonly ok: false;
  readonly retryable: boolean;
  readonly detail: string;
  readonly runId: string | null;
  readonly datasetId: string | null;
  readonly usageUsd: number | null;
}

interface AttemptSuccess {
  readonly ok: true;
  readonly runId: string;
  readonly datasetId: string;
  readonly usageUsd: number | null;
  readonly items: readonly unknown[];
}

export function buildActorInput(request: ReviewPullRequest): Record<string, unknown> {
  const shared = {
    language: "en",
    skipClosedPlaces: false,
    scrapePlaceDetailPage: true,
    scrapeContacts: false,
    maxReviews: request.maxReviews,
    reviewsSort: "newest",
    reviewsOrigin: "google",
    scrapeReviewsPersonalData: true,
    maxImages: 0,
    maxCrawledPlacesPerSearch: 1,
  };
  if (request.target.kind === "place_id") {
    return { placeIds: [request.target.placeId], ...shared };
  }
  return { startUrls: [{ url: request.target.url }], ...shared };
}

export function redactSecret(text: string, secret: string): string {
  if (!secret) return text;
  const encoded = encodeURIComponent(secret);
  return text.split(secret).join("[redacted]").split(encoded).join("[redacted]");
}

export async function pullApifyPlaces(options: ApifyPullOptions): Promise<ApifyPullResult> {
  const fetchImpl = options.fetch ?? fetch;
  const sleep = options.sleep ?? delay;
  const now = options.now ?? Date.now;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const pollTimeoutMs = options.pollTimeoutMs ?? DEFAULT_POLL_TIMEOUT_MS;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const log = (line: string) => {
    const safe = redactSecret(line, options.token);
    (options.log ?? defaultLog)(safe);
  };

  let attempts = 0;
  let last: AttemptFailure = {
    ok: false,
    retryable: false,
    detail: "Apify did not run.",
    runId: null,
    datasetId: null,
    usageUsd: null,
  };

  for (let tryIndex = 0; tryIndex < 2; tryIndex += 1) {
    if (tryIndex === 1) {
      log(`Retrying the Apify run after ${retryDelayMs} milliseconds.`);
      await sleep(retryDelayMs);
    }
    attempts += 1;
    let result: AttemptSuccess | AttemptFailure;
    try {
      result = await oneAttempt({
        token: options.token,
        request: options.request,
        fetchImpl,
        sleep,
        now,
        pollIntervalMs,
        pollTimeoutMs,
        log,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result = {
        ok: false,
        retryable: true,
        detail: `Apify request failed: ${redactSecret(message, options.token)}`,
        runId: null,
        datasetId: null,
        usageUsd: null,
      };
    }
    if (result.ok) {
      return { ...result, attempts };
    }
    last = result;
    log(result.detail);
    if (!result.retryable) break;
  }

  const detail = attempts > 1 ? `${last.detail} Both attempts failed.` : last.detail;
  return {
    ok: false,
    status: "apify_error",
    detail: redactSecret(detail, options.token),
    runId: last.runId,
    datasetId: last.datasetId,
    attempts,
    usageUsd: last.usageUsd,
  };
}

async function oneAttempt(options: {
  token: string;
  request: ReviewPullRequest;
  fetchImpl: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
  pollIntervalMs: number;
  pollTimeoutMs: number;
  log: (line: string) => void;
}): Promise<AttemptSuccess | AttemptFailure> {
  const input = buildActorInput(options.request);
  const startUrl = `${APIFY_BASE}/acts/${APIFY_ACTOR}/runs`;
  const started = await requestJson(options.fetchImpl, options.token, startUrl, {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!started.ok) return started.failure;

  const startedRun = readRun(started.body);
  if (!startedRun.id) {
    return failure("Apify did not return a run id.", true, null, null, null);
  }

  const deadline = options.now() + options.pollTimeoutMs;
  const maxPolls = Math.max(1, Math.ceil(options.pollTimeoutMs / Math.max(options.pollIntervalMs, 1)));
  let run = startedRun;
  for (let poll = 0; poll < maxPolls; poll += 1) {
    const polled = await requestJson(
      options.fetchImpl,
      options.token,
      `${APIFY_BASE}/actor-runs/${encodeURIComponent(startedRun.id)}`,
      { method: "GET" },
    );
    if (!polled.ok) {
      return { ...polled.failure, runId: startedRun.id, datasetId: startedRun.datasetId };
    }
    run = readRun(polled.body);
    const status = run.status || "unknown";
    options.log(`Apify run ${startedRun.id} status ${status}.`);
    if (status === "SUCCEEDED") break;
    if (status === "FAILED" || status === "TIMED-OUT" || status === "ABORTED") {
      const badInput = status === "FAILED" && /invalid input|input schema|bad input|validation failed/i.test(run.statusMessage);
      const retryable = !badInput && (status === "FAILED" || status === "TIMED-OUT");
      const why = run.statusMessage ? ` ${redactSecret(run.statusMessage, options.token)}` : "";
      return failure(
        `Apify run ${startedRun.id} ended ${status}.${why}`,
        retryable,
        startedRun.id,
        run.datasetId ?? startedRun.datasetId,
        run.usageUsd,
      );
    }
    if (options.now() >= deadline) {
      return failure(
        `Apify run ${startedRun.id} did not finish within 15 minutes.`,
        false,
        startedRun.id,
        run.datasetId ?? startedRun.datasetId,
        run.usageUsd,
      );
    }
    await options.sleep(options.pollIntervalMs);
  }

  if (run.status !== "SUCCEEDED") {
    return failure(
      `Apify run ${startedRun.id} did not finish within 15 minutes.`,
      false,
      startedRun.id,
      run.datasetId ?? startedRun.datasetId,
      run.usageUsd,
    );
  }

  const datasetId = run.datasetId ?? startedRun.datasetId;
  if (!datasetId) {
    return failure("Apify did not return a dataset id.", true, startedRun.id, null, run.usageUsd);
  }
  const itemsResponse = await requestJson(
    options.fetchImpl,
    options.token,
    `${APIFY_BASE}/datasets/${encodeURIComponent(datasetId)}/items?format=json`,
    { method: "GET" },
  );
  if (!itemsResponse.ok) {
    return { ...itemsResponse.failure, runId: startedRun.id, datasetId, usageUsd: run.usageUsd };
  }
  if (!Array.isArray(itemsResponse.body)) {
    return failure("Apify dataset items were not a list.", true, startedRun.id, datasetId, run.usageUsd);
  }
  return {
    ok: true,
    runId: run.id ?? startedRun.id,
    datasetId,
    usageUsd: run.usageUsd,
    items: itemsResponse.body,
  };
}

type JsonCall =
  | { readonly ok: true; readonly body: unknown }
  | { readonly ok: false; readonly failure: AttemptFailure };

async function requestJson(
  fetchImpl: typeof fetch,
  token: string,
  url: string,
  init: { method: "GET" | "POST"; body?: string },
): Promise<JsonCall> {
  if (url.includes(token) || (init.body?.includes(token) ?? false)) {
    return { ok: false, failure: failure("Refusing to put the Apify token in the request URL or body.", false, null, null, null) };
  }
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: init.method,
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/json",
        ...(init.body ? { "content-type": "application/json" } : {}),
      },
      ...(init.body ? { body: init.body } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      failure: failure(`Apify request failed: ${redactSecret(message, token)}`, true, null, null, null),
    };
  }

  const body = await readBody(response);
  if (response.ok) return { ok: true, body };
  const retryable = response.status === 429 || response.status === 408 || response.status >= 500;
  const message = errorMessage(body);
  const suffix = message ? `: ${redactSecret(message, token)}` : "";
  return {
    ok: false,
    failure: failure(`Apify returned HTTP ${response.status}${suffix}.`, retryable, null, null, null),
  };
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function errorMessage(body: unknown): string {
  if (!isRecord(body)) return "";
  const error = isRecord(body.error) ? body.error : body;
  const message = error.message ?? body.message;
  return typeof message === "string" ? message : "";
}

interface RunFields {
  readonly id: string | null;
  readonly datasetId: string | null;
  readonly status: string;
  readonly statusMessage: string;
  readonly usageUsd: number | null;
}

function readRun(body: unknown): RunFields {
  const data = isRecord(body) && isRecord(body.data) ? body.data : isRecord(body) ? body : {};
  return {
    id: typeof data.id === "string" && data.id ? data.id : null,
    datasetId: typeof data.defaultDatasetId === "string" && data.defaultDatasetId ? data.defaultDatasetId : null,
    status: typeof data.status === "string" ? data.status : "",
    statusMessage: typeof data.statusMessage === "string" ? data.statusMessage : "",
    usageUsd: finiteNumber(data.usageTotalUsd) ?? finiteNumber(data.usageUsd),
  };
}

function failure(
  detail: string,
  retryable: boolean,
  runId: string | null,
  datasetId: string | null,
  usageUsd: number | null,
): AttemptFailure {
  return { ok: false, retryable, detail, runId, datasetId, usageUsd };
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function defaultLog(line: string): void {
  process.stderr.write(`${line}\n`);
}
