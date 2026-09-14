import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  WRITING_PACKAGE_SCHEMA_VERSION,
  hashWritingPackage,
  parseWritingPackage,
  publisherPayload,
  reviewDocumentTitle,
} from "./index.js";

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../fixtures/google-docs/representative-writing-package.json",
);

test("PR #30 schemaVersion packageId pages hash is the accepted contract", () => {
  const raw = JSON.parse(readFileSync(fixturePath, "utf8")) as Record<string, unknown>;
  assert.equal("version" in raw, false);
  assert.equal("readingOrder" in raw, false);
  const pkg = parseWritingPackage(raw);
  assert.equal(pkg.schemaVersion, WRITING_PACKAGE_SCHEMA_VERSION);
  assert.equal(pkg.packageId, "website-copy-oak-iron-plumbing");
  assert.equal(hashWritingPackage(pkg), pkg.packageHash);
  assert.equal(reviewDocumentTitle(pkg), "Oak & Iron Plumbing — Website Copy — Human Review");
  const quote = pkg.pages[0]?.blocks.find((block) => block.type === "quote");
  assert.ok(quote && quote.type === "quote");
  assert.equal(quote.attribution, "Dana M., Springfield");
  assert.equal(quote.reviewId, "rev-dana-m-springfield");
});

test("top-level version is not a writing-package schema field", () => {
  const raw = JSON.parse(readFileSync(fixturePath, "utf8")) as Record<string, unknown>;
  delete raw.schemaVersion;
  raw.version = "writing-package/v1";
  assert.throws(() => parseWritingPackage(raw), /Unsupported writing package schemaVersion/);
});

test("quote attribution is required", () => {
  const raw = JSON.parse(readFileSync(fixturePath, "utf8")) as {
    pages: Array<{ blocks: Array<Record<string, unknown>> }>;
  };
  const quote = raw.pages[0]?.blocks.find((block) => block.type === "quote");
  assert.ok(quote);
  delete quote.attribution;
  assert.throws(() => parseWritingPackage(raw), /attribution is required/);
});

test("publisherPayload identity uses packageId and packageHash", () => {
  const pkg = parseWritingPackage(JSON.parse(readFileSync(fixturePath, "utf8")));
  const payload = publisherPayload(pkg);
  assert.deepEqual(payload.identity, {
    packageId: pkg.packageId,
    prospectId: pkg.prospectId,
    runId: pkg.runId,
    packageHash: pkg.packageHash,
  });
});
