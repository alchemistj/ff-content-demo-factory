import assert from "node:assert/strict";
import test from "node:test";
import { FakeGoogleTransport } from "./fake-google.js";
import { importReviewedDocument } from "./approval.js";
import { createGoogleDocsPublisher } from "./publisher-adapter.js";
import { publishForHumanReview } from "./publisher.js";
import {
  WRITING_PACKAGE_SCHEMA_VERSION,
  buildWritingPackage,
  parseWritingPackage,
  type ContentBlock,
  type WritingPackage,
  type WritingPackagePage,
} from "../writing-package/index.js";
import type { GoogleDocsConfig } from "./config.js";

const config: GoogleDocsConfig = {
  clientId: "client",
  clientSecret: "secret",
  refreshToken: "refresh",
  folderId: "folder_review",
};

function heading(level: 1 | 2 | 3, text: string): ContentBlock {
  return { type: "heading", level, text };
}

function paragraph(text: string): ContentBlock {
  return { type: "paragraph", spans: [{ text }] };
}

function quote(text: string, attribution: string, reviewId: string): ContentBlock {
  return { type: "quote", spans: [{ text }], attribution, reviewId };
}

function page(input: WritingPackagePage): WritingPackagePage {
  return input;
}

/**
 * Exact PR #30 contract shape (schemaVersion, packageId, required quote
 * attribution, no top-level version, no top-level readingOrder). Built with
 * PR #30's buildWritingPackage and passed to Google Docs with no translation.
 */
function pr30WritingPackage(): WritingPackage {
  return buildWritingPackage({
    kind: "website_copy",
    packageId: "website-copy-prospect-northline",
    prospectId: "prospect-northline",
    runId: "run-prospect-northline",
    businessName: "Northline Garage Doors",
    pages: [
      page({
        pageId: "page-home",
        role: "homepage",
        audience: "business",
        route: "/home",
        readingOrder: 1,
        title: "Garage door help for the next practical step",
        seoTitle: "Garage door repair and replacement in Mason | Northline",
        metaDescription:
          "Northline Garage Doors helps Mason homeowners repair a door that still has life or replace one that is worn through.",
        blocks: [
          heading(1, "Garage door help for the next practical step"),
          heading(2, "Repair or replacement"),
          paragraph("Northline Garage Doors serves Lake County homeowners who need a door repaired or replaced."),
          { type: "paragraph", spans: [{ text: "Call " }, { text: "+1-555-010-1000", bold: true }, { text: "." }] },
        ],
      }),
      page({
        pageId: "page-repair",
        role: "service",
        audience: "business",
        route: "/garage-door-repair",
        readingOrder: 2,
        title: "Garage door repair when the door stops working",
        seoTitle: "Garage door repair in Mason | Northline Garage Doors",
        metaDescription:
          "When a Mason garage door stops working, Northline explains the problem and repairs it when the door still has useful life.",
        blocks: [
          heading(1, "Garage door repair when the door stops working"),
          heading(2, "What a repair visit is for"),
          paragraph("When the door still has life in it, a repair visit can explain the problem and get it moving again."),
          quote("The repair solved the noise", "Ari K.", "review-unclassified"),
        ],
      }),
      page({
        pageId: "page-replacement",
        role: "service",
        audience: "business",
        route: "/garage-door-replacement",
        readingOrder: 3,
        title: "Replacement when the opener and door are worn through",
        seoTitle: "Garage door replacement in Mason | Northline Garage Doors",
        metaDescription:
          "Northline replaces worn garage doors and openers in Mason when repair will not restore reliable daily use.",
        blocks: [
          heading(1, "Replacement when the opener and door are worn through"),
          heading(2, "A worn opener is a different job"),
          paragraph("Replacement is the path when repair will not restore reliable daily use."),
          quote("They replaced the worn opener and walked me through the new controls.", "Jon P.", "review-jon"),
        ],
      }),
      page({
        pageId: "page-contact",
        role: "contact",
        audience: "business",
        route: "/contact",
        readingOrder: 4,
        title: "Call Northline Garage Doors",
        seoTitle: "Call Northline Garage Doors in Mason",
        metaDescription: "Call Northline Garage Doors at +1-555-010-1000. Shop at 18 Harbor Avenue, Mason, IL 60000.",
        blocks: [
          heading(1, "Call Northline Garage Doors"),
          paragraph("Call +1-555-010-1000. 18 Harbor Avenue, Mason, IL 60000."),
        ],
      }),
      page({
        pageId: "header-footer",
        role: "header_footer",
        audience: "business",
        readingOrder: 5,
        title: "Header and footer",
        blocks: [
          heading(1, "Header and footer"),
          heading(2, "Header"),
          {
            type: "list",
            ordered: false,
            items: [
              { spans: [{ text: "Home", href: "/home" }] },
              { spans: [{ text: "Repair", href: "/garage-door-repair" }] },
              { spans: [{ text: "Replacement", href: "/garage-door-replacement" }] },
              { spans: [{ text: "Contact", href: "/contact" }] },
            ],
          },
          heading(2, "Footer"),
          paragraph("Northline Garage Doors · +1-555-010-1000 · 18 Harbor Avenue, Mason, IL 60000"),
        ],
      }),
      page({
        pageId: "page-strategy",
        role: "strategy_overview",
        audience: "owner",
        route: "/",
        readingOrder: 6,
        title: "Why this site uses two service jobs",
        blocks: [
          heading(1, "Why this site uses two service jobs"),
          heading(2, "What we built"),
          paragraph(
            "The public site keeps repair and replacement on separate routes because the captured company pages and customer accounts describe two jobs. This page is for the owner, not for customers.",
          ),
        ],
      }),
    ],
  });
}

test("Google Docs publisher and importer accept the PR #30 contract without translation", async () => {
  const pkg = pr30WritingPackage();
  assert.equal(pkg.schemaVersion, WRITING_PACKAGE_SCHEMA_VERSION);
  assert.equal("version" in pkg, false);
  assert.equal("readingOrder" in pkg, false);
  assert.equal(pkg.packageId, "website-copy-prospect-northline");
  const roundTrip = parseWritingPackage(JSON.parse(JSON.stringify(pkg)));
  assert.equal(roundTrip.packageHash, pkg.packageHash);

  const fake = new FakeGoogleTransport();
  const published = await publishForHumanReview(fake, pkg, config, undefined);
  assert.equal(published.ok, true);
  if (!published.ok) return;
  assert.equal(published.receipt.packageId, pkg.packageId);
  assert.equal(published.receipt.kind, "website_copy");

  const imported = await importReviewedDocument(fake, pkg, published.receipt);
  assert.equal(imported.package.schemaVersion, WRITING_PACKAGE_SCHEMA_VERSION);
  assert.equal(imported.package.packageId, pkg.packageId);
  assert.equal(imported.package.pages[1]?.pageId, "page-repair");
  assert.equal(imported.package.pages[1]?.seoTitle, "Garage door repair in Mason | Northline Garage Doors");
  assert.equal(imported.package.pages[0]?.seoTitle, pkg.pages[0]?.seoTitle);
  const quote = imported.package.pages[1]?.blocks.find((block) => block.type === "quote");
  assert.ok(quote && quote.type === "quote");
  assert.equal(quote.attribution, "Ari K.");
  assert.equal(quote.reviewId, "review-unclassified");

  const adapter = await createGoogleDocsPublisher({
    loadConfig: () => ({ config, missing: [], source: "env" }),
    createTransport: async () => new FakeGoogleTransport(),
  }).publishReviewPackage(pkg);
  assert.equal(adapter.status, "published");
  assert.equal(adapter.packageIdentity.packageId, pkg.packageId);
  assert.equal(adapter.packageIdentity.packageHash, pkg.packageHash);
  assert.equal(adapter.kind, "website_copy");
});
