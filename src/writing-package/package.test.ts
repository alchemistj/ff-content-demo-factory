import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  WRITING_PACKAGE_VERSION,
  buildWritingPackage,
  reviewDocumentTitle,
  validateWritingPackage,
  writingPackageContentHash,
} from "./index.js";
import { WritingPackageError } from "./errors.js";

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../fixtures/google-docs/representative-writing-package.json",
);

test("representative website copy package validates and hashes stably", () => {
  const pkg = validateWritingPackage(JSON.parse(readFileSync(fixturePath, "utf8")));
  assert.equal(pkg.version, WRITING_PACKAGE_VERSION);
  assert.equal(pkg.kind, "website_copy");
  assert.equal(pkg.pages.length, 6);
  assert.equal(
    pkg.pages.map((page) => page.role).join(","),
    "homepage,service,service,contact,header_footer,strategy_overview",
  );
  assert.equal(writingPackageContentHash(pkg), pkg.packageHash);
  assert.equal(reviewDocumentTitle(pkg), "Oak & Iron Plumbing — Website Copy — Human Review");
  assert.equal(reviewDocumentTitle(pkg, 2), "Oak & Iron Plumbing — Website Copy — Human Review (v2)");
  const quote = pkg.pages[0]?.blocks.find((block) => block.type === "quote");
  assert.ok(quote && quote.type === "quote");
  assert.equal(quote.reviewId, "rev.dana-m-springfield");
  assert.equal(quote.attribution, "Dana M., Springfield");
});

test("page identity is the slug, not the heading", () => {
  const pkg = validateWritingPackage(JSON.parse(readFileSync(fixturePath, "utf8")));
  const home = pkg.pages[0];
  assert.equal(home?.pageId, "homepage");
  assert.notEqual(home?.pageId, home?.title);
});

test("invalid reading order fails closed", () => {
  const raw = JSON.parse(readFileSync(fixturePath, "utf8")) as { pages: Array<{ role: string }> };
  const contact = raw.pages.find((page) => page.role === "contact");
  const home = raw.pages.find((page) => page.role === "homepage");
  assert.ok(contact && home);
  contact.role = "homepage";
  assert.throws(() => validateWritingPackage(raw), (error: unknown) => {
    assert.ok(error instanceof WritingPackageError);
    return true;
  });
});

test("stale packageHash fails closed", () => {
  const raw = JSON.parse(readFileSync(fixturePath, "utf8")) as { packageHash?: string };
  raw.packageHash = "0".repeat(64);
  assert.throws(() => validateWritingPackage(raw), /hash does not match/);
});

test("prescription packages use the same contract without adding a gate", () => {
  const pkg = buildWritingPackage({
    kind: "prescription",
    prospectId: "oak-iron-plumbing",
    runId: "run_fixture_001",
    businessName: "Oak & Iron Plumbing",
    pages: [
      {
        pageId: "prescription",
        role: "prescription",
        audience: "owner",
        readingOrder: 1,
        title: "Proposed page plan",
        blocks: [
          { type: "heading", level: 2, text: "Proposed decisions" },
          { type: "paragraph", spans: [{ text: "Two service pages: leak repair and water heaters." }] },
          { type: "heading", level: 2, text: "Advisory ideas" },
          { type: "paragraph", spans: [{ text: "You may consider leading with after-hours response." }] },
        ],
      },
    ],
  });
  assert.equal(pkg.kind, "prescription");
  assert.equal(pkg.packageHash.length, 64);
  assert.equal(reviewDocumentTitle(pkg), "Oak & Iron Plumbing — Prescription — Human Review");
});

test("invalid quote reviewId fails closed", () => {
  const raw = JSON.parse(readFileSync(fixturePath, "utf8")) as {
    pages: Array<{ blocks: Array<Record<string, unknown>> }>;
  };
  const quote = raw.pages[0]?.blocks.find((block) => block.type === "quote");
  assert.ok(quote);
  quote.reviewId = "not a valid id";
  assert.throws(() => validateWritingPackage(raw), /reviewId is invalid/);
});
