import assert from "node:assert/strict";
import test from "node:test";
import {
  APIFY_ACTOR,
  APIFY_BASE,
  buildActorInput,
  pullApifyPlaces,
  type ApifyPullResult,
} from "./apify.js";
import { parseReviewRequest, type ReviewPullRequest } from "./request.js";

const TOKEN = "test-token-do-not-leak-9f3a";
const START_URL = `${APIFY_BASE}/acts/${APIFY_ACTOR}/runs`;

function request(mapsUrl: string, maxReviews = 75): ReviewPullRequest {
  const parsed = parseReviewRequest({ mapsUrl, maxReviews });
  if (!parsed.ok) throw new Error(parsed.detail);
  return parsed.request;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function runBody(status: string, extra: Record<string, unknown> = {}): unknown {
  return {
    data: {
      id: "run-1",
      status,
      defaultDatasetId: "dataset-1",
      usageTotalUsd: status === "SUCCEEDED" ? 0.04 : 0.01,
      ...extra,
    },
  };
}

interface RecordedCall {
  readonly url: string;
  readonly authorization: string | null;
  readonly body: string | null;
}

function scriptedFetch(responses: Array<(call: RecordedCall) => Response | Promise<Response>>): {
  fetch: typeof fetch;
  calls: RecordedCall[];
} {
  const calls: RecordedCall[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const headers = new Headers(init?.headers);
    const call = {
      url,
      authorization: headers.get("authorization"),
      body: typeof init?.body === "string" ? init.body : null,
    };
    calls.push(call);
    const next = responses[calls.length - 1];
    if (!next) throw new Error(`unexpected fetch ${url}`);
    return next(call);
  };
  return { fetch: fetchImpl, calls };
}

async function pullWith(
  responses: Array<(call: RecordedCall) => Response | Promise<Response>>,
  mapsUrl = "https://www.google.com/maps/place/Kodes",
  now?: () => number,
): Promise<{ result: ApifyPullResult; calls: RecordedCall[]; delays: number[]; logs: string[] }> {
  const delays: number[] = [];
  const logs: string[] = [];
  const script = scriptedFetch(responses);
  const result = await pullApifyPlaces({
    token: TOKEN,
    request: request(mapsUrl),
    fetch: script.fetch,
    sleep: async (ms) => {
      delays.push(ms);
    },
    ...(now ? { now } : {}),
    log: (line) => {
      logs.push(line);
    },
  });
  const blob = `${JSON.stringify(result)}\n${logs.join("\n")}`;
  assert.equal(blob.includes(TOKEN), false);
  for (const call of script.calls) {
    assert.equal(call.url.includes(TOKEN), false);
    assert.equal(call.authorization, `Bearer ${TOKEN}`);
    assert.equal(call.body?.includes(TOKEN) ?? false, false);
  }
  return { result, calls: script.calls, delays, logs };
}

test("actor input uses startUrls or placeIds and never the token", () => {
  const maps = buildActorInput(request("https://www.google.com/maps/place/Kodes", 75));
  assert.deepEqual(maps, {
    startUrls: [{ url: "https://www.google.com/maps/place/Kodes" }],
    language: "en",
    skipClosedPlaces: false,
    scrapePlaceDetailPage: true,
    scrapeContacts: false,
    maxReviews: 75,
    reviewsSort: "newest",
    reviewsOrigin: "google",
    scrapeReviewsPersonalData: true,
    maxImages: 0,
    maxCrawledPlacesPerSearch: 1,
  });
  const place = buildActorInput(request("place_id:ChIJfake", 10));
  assert.deepEqual(place.placeIds, ["ChIJfake"]);
  assert.equal("startUrls" in place, false);
  assert.equal(place.maxReviews, 10);
});

test("a finished run returns dataset items on the first attempt", async () => {
  const { result, calls, delays } = await pullWith([
    () => jsonResponse(201, runBody("RUNNING")),
    () => jsonResponse(200, runBody("SUCCEEDED")),
    () => jsonResponse(200, [{ title: "Kode's Roofing" }]),
  ]);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.attempts, 1);
  assert.equal(result.runId, "run-1");
  assert.equal(result.datasetId, "dataset-1");
  assert.equal(result.usageUsd, 0.04);
  assert.deepEqual(result.items, [{ title: "Kode's Roofing" }]);
  assert.deepEqual(delays, []);
  assert.equal(calls[0]?.url, START_URL);
  assert.equal(calls[1]?.url, `${APIFY_BASE}/actor-runs/run-1`);
  assert.equal(calls[2]?.url, `${APIFY_BASE}/datasets/dataset-1/items?format=json`);
  assert.equal(calls.length, 3);
});

test("HTTP 500 and HTTP 429 retry once and then succeed", async () => {
  for (const status of [500, 429]) {
    const { result, delays, calls } = await pullWith([
      () => new Response("nope", { status }),
      () => jsonResponse(201, runBody("RUNNING")),
      () => jsonResponse(200, runBody("SUCCEEDED")),
      () => jsonResponse(200, [{ title: "Kode's Roofing" }]),
    ]);
    assert.equal(result.ok, true, String(status));
    if (!result.ok) return;
    assert.equal(result.attempts, 2);
    assert.deepEqual(delays, [20_000]);
    assert.equal(calls.length, 4);
  }
});

test("HTTP 401 does not retry, and two failures stop as apify_error", async () => {
  const denied = await pullWith([
    () => jsonResponse(401, { error: { message: `denied ${TOKEN}` } }),
  ]);
  assert.equal(denied.result.ok, false);
  if (denied.result.ok) return;
  assert.equal(denied.result.status, "apify_error");
  assert.equal(denied.result.attempts, 1);
  assert.deepEqual(denied.delays, []);
  assert.equal(denied.calls.length, 1);
  assert.match(denied.result.detail, /401/);

  const twice = await pullWith([
    () => new Response("nope", { status: 500 }),
    () => new Response("nope", { status: 502 }),
  ]);
  assert.equal(twice.result.ok, false);
  if (twice.result.ok) return;
  assert.equal(twice.result.status, "apify_error");
  assert.equal(twice.result.attempts, 2);
  assert.deepEqual(twice.delays, [20_000]);
  assert.match(twice.result.detail, /Both attempts failed/);
});

test("a network error redacts the token from the result and the log", async () => {
  const { result, logs, delays } = await pullWith([
    () => {
      throw new Error(`connect ${TOKEN} failed`);
    },
    () => {
      throw new Error(`connect ${TOKEN} failed again`);
    },
  ]);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.attempts, 2);
  assert.equal(result.detail.includes(TOKEN), false);
  assert.equal(logs.join("\n").includes(TOKEN), false);
  assert.match(result.detail, /\[redacted\]/);
  assert.deepEqual(delays, [20_000]);
});

test("a poll that exceeds 15 minutes does not retry", async () => {
  const times = [0, 15 * 60 * 1000];
  const { result, delays, calls } = await pullWith(
    [
      () => jsonResponse(201, runBody("RUNNING")),
      () => jsonResponse(200, runBody("RUNNING")),
    ],
    "https://www.google.com/maps/place/Kodes",
    () => times.shift() ?? 15 * 60 * 1000,
  );
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.attempts, 1);
  assert.equal(result.runId, "run-1");
  assert.match(result.detail, /did not finish within 15 minutes/);
  assert.deepEqual(delays, []);
  assert.equal(calls.length, 2);
});

test("a run that fails for a reason other than bad input is retried once", async () => {
  const { result, delays } = await pullWith([
    () => jsonResponse(201, runBody("RUNNING")),
    () => jsonResponse(200, runBody("FAILED", { statusMessage: "actor crashed" })),
    () => jsonResponse(201, runBody("RUNNING")),
    () => jsonResponse(200, runBody("SUCCEEDED")),
    () => jsonResponse(200, [{ title: "Kode's Roofing" }]),
  ]);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.attempts, 2);
  assert.deepEqual(delays, [20_000]);
});

test("bad input is not retried", async () => {
  const { result, delays } = await pullWith([
    () => jsonResponse(201, runBody("RUNNING")),
    () => jsonResponse(200, runBody("FAILED", { statusMessage: "invalid input schema" })),
  ]);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.attempts, 1);
  assert.match(result.detail, /invalid input schema/);
  assert.equal(result.detail.includes(TOKEN), false);
  assert.deepEqual(delays, []);
});
