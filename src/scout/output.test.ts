import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildScoutActorInput } from "./actor.js";
import { MISSING_TOKEN_DETAIL, executeScout, renderScoutMarkdown, type ScoutPlaceFile, type ScoutReceipt } from "./output.js";
import type { ScoutPlace } from "./normalize.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const fixture = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "fixtures", "apify-search.json"), "utf8"),
) as unknown[];
const TOKEN = "output-test-token-do-not-leak";
const REQUEST = { query: "window installation", location: "Indianapolis, IN" };

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), "prospect-scout-"));
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function scriptedFetch(items: readonly unknown[], captured: unknown[] = []): typeof fetch {
  const queue = [
    { data: { id: "run-1", status: "RUNNING", defaultDatasetId: "dataset-1", usageTotalUsd: 0 } },
    { data: { id: "run-1", status: "SUCCEEDED", defaultDatasetId: "dataset-1", usageTotalUsd: 0.11 } },
    items,
  ];
  return async (_input, init) => {
    if (typeof init?.body === "string") captured.push(JSON.parse(init.body) as unknown);
    const body = queue.shift();
    if (body === undefined) throw new Error("unexpected fetch");
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  };
}

async function run(
  outDir: string,
  rawRequest: unknown,
  extra: {
    token?: string;
    fetchImpl?: typeof fetch;
    githubRunId?: string;
    githubRunUrl?: string | null;
    now?: () => Date;
    trigger?: "cli" | "push" | "workflow_dispatch";
  } = {},
): Promise<ScoutReceipt> {
  return executeScout({
    rawRequest,
    trigger: extra.trigger ?? "cli",
    outDir,
    sleep: async () => {},
    log: () => {},
    ...extra,
  });
}

test("a search writes places in Google's order, a rank-sorted table, and a receipt", async () => {
  const outDir = tempDir();
  const captured: unknown[] = [];
  try {
    const receipt = await run(outDir, REQUEST, {
      token: TOKEN,
      fetchImpl: scriptedFetch(fixture, captured),
      githubRunUrl: "https://github.com/alchemistj/ff-content-demo-factory/actions/runs/15",
      now: () => new Date("2026-11-06T21:00:00.000Z"),
      trigger: "workflow_dispatch",
    });
    assert.equal(receipt.status, "ok");
    assert.equal(receipt.slug, "window-installation-indianapolis-in");
    assert.equal(receipt.detail, null);
    assert.equal(receipt.trigger, "workflow_dispatch");
    assert.equal(receipt.apify.actor, "compass~crawler-google-places");
    assert.equal(receipt.apify.runId, "run-1");
    assert.equal(receipt.apify.datasetId, "dataset-1");
    assert.equal(receipt.apify.usageUsd, 0.11);
    assert.equal(receipt.counts.returned, 4);
    assert.equal(receipt.counts.advertisements, 1);
    assert.deepEqual(receipt.request, { query: "window installation", location: "Indianapolis, IN", maxPlaces: 60 });
    assert.equal(receipt.githubRunUrl, "https://github.com/alchemistj/ff-content-demo-factory/actions/runs/15");
    assert.deepEqual(captured, [buildScoutActorInput({ query: "window installation", location: "Indianapolis, IN", maxPlaces: 60 })]);

    const folder = join(outDir, receipt.slug);
    const places = readJson(join(folder, "places.json")) as ScoutPlaceFile;
    const markdown = readFileSync(join(folder, "places.md"), "utf8");
    const saved = readJson(join(folder, "receipt.json")) as ScoutReceipt;
    assert.equal(saved.status, "ok");
    assert.equal(places.kind, "google-prospect-scout");
    assert.equal(places.query, "window installation");
    assert.equal(places.location, "Indianapolis, IN");
    assert.equal(places.scrapedAt, receipt.finishedAt);
    assert.deepEqual(
      places.places.map((place) => [place.rank, place.name]),
      [
        [2, "Second In File"],
        [null, "Ad Windows"],
        [1, "First On Google"],
        [null, null],
      ],
    );
    const first = markdown.indexOf("First On Google");
    const second = markdown.indexOf("Second In File");
    const ad = markdown.indexOf("Ad Windows");
    assert.ok(first !== -1 && second !== -1 && ad !== -1);
    assert.ok(first < second && second < ad);
    assert.match(markdown, /window installation in Indianapolis, IN/);
    assert.equal(markdown.includes("REVIEW_TEXT_DO_NOT_KEEP"), false);
    assert.equal(JSON.stringify(places).includes(TOKEN), false);
    assert.equal(JSON.stringify(receipt).includes(TOKEN), false);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test("max places keeps the first rows Google returned and does not renumber rank", async () => {
  const outDir = tempDir();
  try {
    const receipt = await run(outDir, { ...REQUEST, maxPlaces: 1, slug: "top-row" }, {
      token: TOKEN,
      fetchImpl: scriptedFetch(fixture),
    });
    assert.equal(receipt.status, "ok");
    assert.equal(receipt.counts.returned, 1);
    const places = readJson(join(outDir, "top-row", "places.json")) as ScoutPlaceFile;
    assert.equal(places.places.length, 1);
    assert.equal(places.places[0]?.name, "Second In File");
    assert.equal(places.places[0]?.rank, 2);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test("an empty search is saved, and failure paths write only a receipt", async () => {
  const outDir = tempDir();
  try {
    const empty = await run(outDir, { ...REQUEST, slug: "empty-search" }, {
      token: TOKEN,
      fetchImpl: scriptedFetch([]),
    });
    assert.equal(empty.status, "ok");
    assert.equal(empty.counts.returned, 0);
    const emptyFile = readJson(join(outDir, "empty-search", "places.json")) as ScoutPlaceFile;
    assert.deepEqual(emptyFile.places, []);
    assert.equal(existsSync(join(outDir, "empty-search", "places.md")), true);

    const first = await run(outDir, { ...REQUEST, slug: "kept-search" }, {
      token: TOKEN,
      fetchImpl: scriptedFetch(fixture),
      now: () => new Date("2026-11-06T21:00:00.000Z"),
    });
    assert.equal(first.status, "ok");

    let fetches = 0;
    const blocked: typeof fetch = async () => {
      fetches += 1;
      throw new Error("fetch should not run");
    };
    const invalid = await run(outDir, { query: "!!!", location: "???", maxPlaces: 0 }, {
      token: TOKEN,
      fetchImpl: blocked,
      githubRunId: "4242",
    });
    assert.equal(invalid.status, "invalid_request");
    assert.equal(invalid.slug, "unnamed-4242");
    assert.equal(fetches, 0);
    assert.equal(existsSync(join(outDir, "unnamed-4242", "receipt.json")), true);
    assert.equal(existsSync(join(outDir, "unnamed-4242", "places.json")), false);

    const missing = await run(outDir, { ...REQUEST, slug: "needs-token" }, { fetchImpl: blocked });
    assert.equal(missing.status, "missing_token");
    assert.equal(missing.detail, MISSING_TOKEN_DETAIL);
    assert.equal(fetches, 0);
    assert.equal(existsSync(join(outDir, "needs-token", "places.json")), false);

    const denied = await run(outDir, { ...REQUEST, slug: "denied" }, {
      token: TOKEN,
      fetchImpl: async () => new Response(JSON.stringify({ error: { message: `denied ${TOKEN}` } }), { status: 401 }),
    });
    assert.equal(denied.status, "apify_error");
    assert.equal(denied.detail?.includes(TOKEN), false);
    assert.match(denied.detail ?? "", /401/);
    assert.equal(existsSync(join(outDir, "denied", "places.json")), false);

    const leaked = await run(outDir, { query: `window ${TOKEN}`, location: "Indianapolis, IN", slug: "redacted" }, {
      token: TOKEN,
      fetchImpl: blocked,
    });
    assert.equal(leaked.status, "apify_error");
    assert.equal(leaked.request.query.includes(TOKEN), false);
    assert.match(leaked.request.query, /\[redacted\]/);
    assert.equal(fetches, 0);
    assert.equal(JSON.stringify(leaked).includes(TOKEN), false);

    const failedAgain = await run(outDir, { mapsUrl: "nope", slug: "kept-search" }, { token: TOKEN });
    assert.equal(failedAgain.status, "invalid_request");
    assert.equal(existsSync(join(outDir, "kept-search", "places.json")), true);
    assert.equal(existsSync(join(outDir, "kept-search", "places.md")), true);
    const kept = readJson(join(outDir, "kept-search", "places.json")) as ScoutPlaceFile;
    assert.equal(kept.places[0]?.name, "Second In File");
    const keptReceipt = readJson(join(outDir, "kept-search", "receipt.json")) as ScoutReceipt;
    assert.equal(keptReceipt.status, "invalid_request");
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test("the markdown table sorts by rank and escapes pipes", () => {
  const markdown = renderScoutMarkdown({
    kind: "google-prospect-scout",
    version: 1,
    slug: "pipes",
    query: "window installation",
    location: "Indianapolis, IN",
    maxPlaces: 60,
    scrapedAt: "2026-11-06T21:00:00.000Z",
    places: [
      emptyPlace({ rank: 2, name: "B | Windows" }),
      emptyPlace({ rank: 1, name: "A Windows" }),
      emptyPlace({ rank: null, name: "Unranked" }),
    ],
  });
  const a = markdown.indexOf("A Windows");
  const b = markdown.indexOf("B \\| Windows");
  const unranked = markdown.indexOf("Unranked");
  assert.ok(a !== -1 && b !== -1 && unranked !== -1);
  assert.ok(a < b && b < unranked);
});

test("the CLI exits 0 only for help and writes the missing-token message", () => {
  const help = spawnSync(process.execPath, ["--import", "tsx", "src/scout/cli.ts", "--help"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /prospects:scout/);

  const outDir = tempDir();
  try {
    const env = { ...process.env };
    delete env.APIFY_API_TOKEN;
    const missing = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "src/scout/cli.ts",
        "--query",
        "window installation",
        "--location",
        "Indianapolis, IN",
        "--slug",
        "cli-missing",
        "--out",
        outDir,
      ],
      { cwd: repoRoot, encoding: "utf8", env },
    );
    assert.notEqual(missing.status, 0);
    assert.match(missing.stderr, /Add the APIFY_API_TOKEN secret to alchemistj\/ff-content-demo-factory/);
    const receipt = readJson(join(outDir, "cli-missing", "receipt.json")) as ScoutReceipt;
    assert.equal(receipt.status, "missing_token");
    assert.equal(receipt.trigger, "cli");
    assert.equal(receipt.request.query, "window installation");
    assert.equal(receipt.request.location, "Indianapolis, IN");
    assert.equal(existsSync(join(outDir, "cli-missing", "places.json")), false);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

function emptyPlace(overrides: Partial<ScoutPlace>): ScoutPlace {
  return {
    rank: null,
    name: null,
    placeId: null,
    mapsUrl: null,
    categoryName: null,
    categories: null,
    rating: null,
    reviewsCount: null,
    website: null,
    phone: null,
    address: null,
    city: null,
    state: null,
    permanentlyClosed: null,
    temporarilyClosed: null,
    isAdvertisement: null,
    claimThisBusiness: null,
    ownerUpdates: null,
    ...overrides,
  };
}
