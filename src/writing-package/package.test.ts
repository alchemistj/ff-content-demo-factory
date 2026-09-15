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

test("customer-facing routed pages require seoTitle and metaDescription", () => {
  const pkg = northlineWritingPackage();
  for (const page of pkg.pages) {
    if (page.role === "homepage" || page.role === "service" || page.role === "contact") {
      assert.ok(page.seoTitle && page.seoTitle.length > 0, `${page.pageId} seoTitle`);
      assert.ok(page.metaDescription && page.metaDescription.length > 0, `${page.pageId} metaDescription`);
    }
    if (page.role === "header_footer") {
      assert.equal(page.seoTitle, undefined);
      assert.equal(page.metaDescription, undefined);
    }
    if (page.role === "strategy_overview") {
      assert.equal(page.seoTitle, undefined);
      assert.equal(page.metaDescription, undefined);
    }
  }
  const home = pkg.pages.find((page) => page.pageId === "page-home");
  assert.ok(home);
  const withoutSeo = pkg.pages.map((page) =>
    page.pageId === "page-home"
      ? { pageId: page.pageId, role: page.role, audience: page.audience, route: page.route, readingOrder: page.readingOrder, title: page.title, blocks: page.blocks }
      : page,
  );
  assert.throws(
    () =>
      parseWritingPackage({
        schemaVersion: WRITING_PACKAGE_SCHEMA_VERSION,
        kind: pkg.kind,
        packageId: pkg.packageId,
        prospectId: pkg.prospectId,
        runId: pkg.runId,
        businessName: pkg.businessName,
        pages: withoutSeo,
      }),
    /requires seoTitle and metaDescription/,
  );
  assert.throws(
    () =>
      parseWritingPackage({
        schemaVersion: WRITING_PACKAGE_SCHEMA_VERSION,
        kind: pkg.kind,
        packageId: pkg.packageId,
        prospectId: pkg.prospectId,
        runId: pkg.runId,
        businessName: pkg.businessName,
        pages: pkg.pages.map((page) =>
          page.pageId === "header-footer" ? { ...page, seoTitle: "Header should not rank", metaDescription: "Not a route" } : page,
        ),
      }),
    /header\/footer copy must not include SEO metadata/,
  );
});

test("SEO metadata is part of the canonical hash and optional on Strategy Overview", () => {
  const pkg = northlineWritingPackage();
  const changed = {
    ...pkg,
    pages: pkg.pages.map((page) =>
      page.pageId === "page-home" ? { ...page, seoTitle: "Different garage door title | Northline" } : page,
    ),
  };
  assert.notEqual(hashWritingPackage(changed), pkg.packageHash);
  const withStrategySeo = {
    ...pkg,
    packageHash: "",
    pages: pkg.pages.map((page) =>
      page.pageId === "page-strategy"
        ? { ...page, seoTitle: "Why two service jobs | Northline owner review", metaDescription: "Owner-facing explanation of the two-job site." }
        : page,
    ),
  };
  const parsed = parseWritingPackage({
    schemaVersion: WRITING_PACKAGE_SCHEMA_VERSION,
    kind: withStrategySeo.kind,
    packageId: withStrategySeo.packageId,
    prospectId: withStrategySeo.prospectId,
    runId: withStrategySeo.runId,
    businessName: withStrategySeo.businessName,
    pages: withStrategySeo.pages,
  });
  const strategy = parsed.pages.find((page) => page.pageId === "page-strategy");
  assert.equal(strategy?.seoTitle, "Why two service jobs | Northline owner review");
  assert.equal(hashWritingPackage(parsed), parsed.packageHash);
});
