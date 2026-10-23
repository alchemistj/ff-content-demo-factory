import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { MISSING_TOKEN_DETAIL, executeReviewPull, type ReviewIndexFile, type ReviewPullReceipt } from "./output.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const fixture = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "fixtures", "apify-place.json"), "utf8"),
) as Record<string, unknown>;
const TOKEN = "output-test-token-do-not-leak";

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), "review-pull-"));
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function succeededFetch(items: readonly unknown[]): typeof fetch {
  const bodies = [
    { data: { id: "run-1", status: "RUNNING", defaultDatasetId: "dataset-1", usageTotalUsd: 0 } },
    { data: { id: "run-1", status: "SUCCEEDED", defaultDatasetId: "dataset-1", usageTotalUsd: 0.04 } },
    items,
  ];
  return async () => {
    const body = bodies.shift();
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
    now?: () => Date;
  } = {},
): Promise<ReviewPullReceipt> {
  return executeReviewPull({
    rawRequest,
    trigger: "cli",
    outDir,
    sleep: async () => {},
    log: () => {},
    ...extra,
  });
}

test("a successful pull writes reviews, markdown, a receipt, and an index row", async () => {
  const outDir = tempDir();
  try {
    const receipt = await run(
      outDir,
      {
        mapsUrl: "place_id:ChIJfakekodesroofing0001",
        expectedPhone: "4175550134",
        expectedName: "kode",
      },
      {
        token: TOKEN,
        fetchImpl: succeededFetch([fixture]),
        now: () => new Date("2026-10-23T18:00:00.000Z"),
      },
    );
    assert.equal(receipt.status, "ok");
    assert.equal(receipt.slug, "kodes-roofing");
    assert.equal(receipt.detail, null);
    assert.equal(receipt.apify.runId, "run-1");
    assert.equal(receipt.apify.usageUsd, 0.04);
    assert.equal(receipt.counts.listingTotal, 59);
    assert.equal(receipt.counts.withText, 10);
    assert.equal(receipt.counts.ratingOnly, 2);
    assert.equal(JSON.stringify(receipt).includes(TOKEN), false);

    const folder = join(outDir, "kodes-roofing");
    const reviews = readJson(join(folder, "reviews.json")) as { reviews: Array<{ reviewer: string }> };
    const markdown = readFileSync(join(folder, "reviews.md"), "utf8");
    const saved = readJson(join(folder, "receipt.json")) as ReviewPullReceipt;
    const index = readJson(join(outDir, "index.json")) as ReviewIndexFile;
    assert.equal(saved.status, "ok");
    assert.equal(reviews.reviews[0]?.reviewer, "Isaac R.");
    assert.match(markdown, /Kode's Roofing/);
    assert.match(markdown, /4\.9 · 59 Google reviews/);
    assert.match(markdown, /Isaac R\./);
    assert.equal(markdown.includes("Isaac Rodriguez"), false);
    assert.equal(index.places.length, 1);
    assert.equal(index.places[0]?.slug, "kodes-roofing");
    assert.equal(index.places[0]?.status, "ok");
    assert.equal(index.places[0]?.name, "Kode's Roofing");
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test("every failure path writes a receipt and no reviews, and a re-pull replaces the index row", async () => {
  const outDir = tempDir();
  try {
    const first = await run(outDir, { mapsUrl: "place_id:ChIJfakekodesroofing0001", slug: "kodes-roofing" }, {
      token: TOKEN,
      fetchImpl: succeededFetch([fixture]),
      now: () => new Date("2026-10-23T18:00:00.000Z"),
    });
    assert.equal(first.status, "ok");
    assert.equal(existsSync(join(outDir, "kodes-roofing", "reviews.md")), true);

    const other = await run(outDir, { mapsUrl: "place_id:ChIJother", slug: "other-roofing" }, {
      token: TOKEN,
      fetchImpl: succeededFetch([{ ...fixture, title: "Other Roofing", placeId: "ChIJother" }]),
      now: () => new Date("2026-10-23T19:00:00.000Z"),
    });
    assert.equal(other.status, "ok");

    const cases: Array<{ raw: unknown; token?: string; fetchImpl?: typeof fetch; status: ReviewPullReceipt["status"] }> = [
      { raw: { mapsUrl: "https://example.com/not-maps" }, token: TOKEN, status: "invalid_request" },
      { raw: { mapsUrl: "place_id:ChIJfake" }, status: "missing_token", fetchImpl: async () => { throw new Error("fetch should not run"); } },
      {
        raw: { mapsUrl: "place_id:ChIJfake" },
        token: TOKEN,
        fetchImpl: async () => new Response("nope", { status: 401 }),
        status: "apify_error",
      },
      { raw: { mapsUrl: "place_id:ChIJfake" }, token: TOKEN, fetchImpl: succeededFetch([]), status: "not_found" },
      {
        raw: { mapsUrl: "place_id:ChIJfake" },
        token: TOKEN,
        fetchImpl: succeededFetch([fixture, { ...fixture, title: "Second Place", address: "200 Oak Ave" }]),
        status: "ambiguous",
      },
      {
        raw: { mapsUrl: "place_id:ChIJfake", expectedPhone: "3145550199" },
        token: TOKEN,
        fetchImpl: succeededFetch([fixture]),
        status: "identity_mismatch",
      },
      {
        raw: { mapsUrl: "place_id:ChIJfake", expectedName: "plumbing" },
        token: TOKEN,
        fetchImpl: succeededFetch([fixture]),
        status: "identity_mismatch",
      },
    ];

    for (const item of cases) {
      const folder = mkdtempSync(join(outDir, "case-"));
      const receipt = await run(folder, item.raw, {
        ...(item.token ? { token: item.token } : {}),
        ...(item.fetchImpl ? { fetchImpl: item.fetchImpl } : {}),
        githubRunId: "4242",
      });
      assert.equal(receipt.status, item.status, item.status);
      if (item.status === "missing_token") assert.equal(receipt.detail, MISSING_TOKEN_DETAIL);
      assert.equal(receipt.slug, item.status === "invalid_request" ? "unnamed-4242" : receipt.slug);
      const slugDir = join(folder, receipt.slug);
      assert.equal(existsSync(join(slugDir, "receipt.json")), true);
      assert.equal(existsSync(join(slugDir, "reviews.json")), false);
      assert.equal(existsSync(join(slugDir, "reviews.md")), false);
      const index = readJson(join(folder, "index.json")) as ReviewIndexFile;
      assert.equal(index.places.length, 1);
      assert.equal(index.places[0]?.status, item.status);
      assert.equal(JSON.stringify(receipt).includes(TOKEN), false);
    }

    const replaced = await run(outDir, { mapsUrl: "https://example.com/nope", slug: "kodes-roofing" }, {
      token: TOKEN,
      now: () => new Date("2026-10-24T18:00:00.000Z"),
    });
    assert.equal(replaced.status, "invalid_request");
    assert.equal(existsSync(join(outDir, "kodes-roofing", "reviews.json")), false);
    assert.equal(existsSync(join(outDir, "kodes-roofing", "reviews.md")), false);
    assert.equal(existsSync(join(outDir, "kodes-roofing", "receipt.json")), true);
    assert.equal(existsSync(join(outDir, "other-roofing", "reviews.json")), true);
    const index = readJson(join(outDir, "index.json")) as ReviewIndexFile;
    assert.deepEqual(
      index.places.map((place) => [place.slug, place.status]),
      [
        ["kodes-roofing", "invalid_request"],
        ["other-roofing", "ok"],
      ],
    );
    assert.equal(index.places[0]?.pulledAt, "2026-10-24T18:00:00.000Z");
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test("the CLI exits 0 only for help and writes the missing-token message", () => {
  const help = spawnSync(process.execPath, ["--import", "tsx", "src/review-pull/cli.ts", "--help"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /reviews:pull/);

  const outDir = tempDir();
  try {
    const env = { ...process.env };
    delete env.APIFY_API_TOKEN;
    const missing = spawnSync(
      process.execPath,
      ["--import", "tsx", "src/review-pull/cli.ts", "--maps-url", "place_id:ChIJfake", "--slug", "cli-missing", "--out", outDir],
      { cwd: repoRoot, encoding: "utf8", env },
    );
    assert.notEqual(missing.status, 0);
    assert.match(missing.stderr, /Add the APIFY_API_TOKEN secret to alchemistj\/ff-content-demo-factory/);
    const receipt = readJson(join(outDir, "cli-missing", "receipt.json")) as ReviewPullReceipt;
    assert.equal(receipt.status, "missing_token");
    assert.equal(receipt.trigger, "cli");
    assert.equal(existsSync(join(outDir, "cli-missing", "reviews.json")), false);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});
