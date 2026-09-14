import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  WRITING_PACKAGE_SCHEMA_VERSION,
  buildPrescriptionReviewPackage,
  hashWritingPackage,
  parseWritingPackage,
  publisherPayload,
  reviewDocumentTitle,
  WEBSITE_COPY_READING_ORDER,
} from "./index.js";
import {
  northlinePrescription,
  northlineResearchRecord,
  northlineWritingPackage,
} from "../workflow/northline.fixture.js";

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../fixtures/google-docs/representative-writing-package.json",
);

test("publisher payload uses the human-review title and natural reading order", () => {
  const pkg = northlineWritingPackage();
  const payload = publisherPayload(pkg);
  assert.equal(payload.title, "Northline Garage Doors — Website Copy — Human Review");
  assert.equal(reviewDocumentTitle(pkg), payload.title);
  assert.deepEqual(
    payload.pages.map((page) => page.pageId),
    ["page-home", "page-repair", "page-replacement", "page-contact", "header-footer", "page-strategy"],
  );
  assert.deepEqual(
    payload.pages.map((page) => page.role),
    [...WEBSITE_COPY_READING_ORDER],
  );
  assert.equal(payload.pages[5]?.audience, "owner");
  assert.equal(payload.kind, "website_copy");
  assert.equal(payload.identity.packageHash, pkg.packageHash);
  assert.equal("evidence" in payload, false);
});

test("shared writing-package/v1 is the only accepted schema; google-docs 1.0.0 is not a second contract", () => {
  const pkg = northlineWritingPackage();
  assert.equal(pkg.schemaVersion, WRITING_PACKAGE_SCHEMA_VERSION);
  assert.equal(parseWritingPackage(JSON.parse(JSON.stringify(pkg))).packageHash, pkg.packageHash);
  assert.equal(hashWritingPackage(pkg), pkg.packageHash);
  assert.ok(pkg.pages.every((page) => page.audience === "business" || page.audience === "owner"));
  assert.ok(
    pkg.pages.some((page) =>
      page.blocks.some((block) => block.type === "quote" && block.reviewId && block.attribution),
    ),
  );
  assert.throws(
    () => parseWritingPackage({ ...pkg, schemaVersion: "1.0.0" }),
    /Unsupported writing package schemaVersion/,
  );
});

test("prescription review package separates decisions, evidence context, and advisory recommendations", () => {
  const pkg = buildPrescriptionReviewPackage({
    research: northlineResearchRecord(),
    prescription: northlinePrescription(),
    runId: "run-prospect-northline",
  });
  assert.equal(pkg.kind, "prescription");
  assert.equal(pkg.schemaVersion, WRITING_PACKAGE_SCHEMA_VERSION);
  assert.deepEqual(
    pkg.pages.map((page) => page.pageId),
    ["prescription-decisions", "prescription-evidence", "prescription-recommendations"],
  );
  assert.ok(pkg.pages.every((page) => page.role === "prescription"));
  assert.match(pkg.pages[0]?.title ?? "", /for approval/i);
  assert.match(pkg.pages[1]?.title ?? "", /not for approval/i);
  assert.match(pkg.pages[2]?.title ?? "", /advisory/i);
  assert.equal(reviewDocumentTitle(pkg), "Northline Garage Doors — Prescription — Human Review");
  assert.equal(parseWritingPackage(pkg).packageHash, pkg.packageHash);
});

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
