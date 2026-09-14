import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { importReviewedDocument, writeApprovedSnapshot } from "./approval.js";
import { assertImportableDocument } from "./document-reader.js";
import { FakeGoogleTransport } from "./fake-google.js";
import { GoogleDocsError } from "./errors.js";
import { publishForHumanReview } from "./publisher.js";
import { parseWritingPackage, hashWritingPackage } from "../writing-package/index.js";
import type { GoogleDocsConfig } from "./config.js";
import type { DocsDocument } from "./google-rest.js";

const fixturePath = join(dirname(fileURLToPath(import.meta.url)), "../../fixtures/google-docs/representative-writing-package.json");

const config: GoogleDocsConfig = {
  clientId: "client",
  clientSecret: "secret",
  refreshToken: "refresh",
  folderId: "folder_review",
};

test("import preserves wording, lists, quotes, and page ids", async () => {
  const original = parseWritingPackage(JSON.parse(readFileSync(fixturePath, "utf8")));
  const fake = new FakeGoogleTransport();
  const published = await publishForHumanReview(fake, original, config, undefined);
  assert.equal(published.ok, true);
  if (!published.ok) return;
  const imported = await importReviewedDocument(fake, original, published.receipt);
  assert.equal(imported.package.pages[0]?.pageId, "homepage");
  assert.ok(imported.package.pages[0]?.blocks.some((block) => block.type === "list" && block.ordered === false));
  const leak = imported.package.pages.find((page) => page.pageId === "leak-repair");
  assert.ok(leak?.blocks.some((block) => block.type === "list" && block.ordered === true));
  const quote = imported.package.pages[0]?.blocks.find((block) => block.type === "quote");
  assert.ok(quote && quote.type === "quote");
  assert.equal(quote.attribution, "Dana M., Springfield");
  assert.equal(quote.reviewId, "rev-dana-m-springfield");
  assert.ok(imported.importedContentHash.length === 64);
});

test("unresolved suggestions refuse import", () => {
  const document: DocsDocument = {
    documentId: "doc1",
    title: "Review",
    body: {
      content: [
        {
          paragraph: {
            elements: [
              { textRun: { content: "Suggested\n", suggestedInsertionIds: ["suggest.abc"] } },
            ],
          },
        },
      ],
    },
  };
  assert.throws(() => assertImportableDocument(document), (error: unknown) => {
    assert.ok(error instanceof GoogleDocsError);
    assert.equal(error.code, "unresolved_suggestions");
    return true;
  });
});

test("multiple content tabs refuse import", () => {
  const document: DocsDocument = {
    documentId: "doc1",
    tabs: [
      {
        tabProperties: { title: "Copy" },
        documentTab: {
          body: {
            content: [{ paragraph: { elements: [{ textRun: { content: "Hello\n" } }] } }],
          },
        },
      },
      {
        tabProperties: { title: "Other" },
        documentTab: {
          body: {
            content: [{ paragraph: { elements: [{ textRun: { content: "Second tab\n" } }] } }],
          },
        },
      },
    ],
  };
  assert.throws(() => assertImportableDocument(document), (error: unknown) => {
    assert.ok(error instanceof GoogleDocsError);
    assert.equal(error.code, "multiple_content_tabs");
    return true;
  });
});

test("approval snapshot records actor, document, revision, hash, and does not follow later edits", async () => {
  const original = parseWritingPackage(JSON.parse(readFileSync(fixturePath, "utf8")));
  const fake = new FakeGoogleTransport();
  const published = await publishForHumanReview(fake, original, config, undefined);
  assert.equal(published.ok, true);
  if (!published.ok) return;
  const imported = await importReviewedDocument(fake, original, published.receipt);
  const dir = mkdtempSync(join(tmpdir(), "ff-approved-"));
  const record = writeApprovedSnapshot({
    snapshotDir: dir,
    imported,
    actor: "alchemistj",
    receipt: published.receipt,
    relativeDir: "oak-iron-plumbing/approved-copy",
    now: "2026-09-14T00:00:00.000Z",
  });
  assert.equal(record.actor, "alchemistj");
  assert.equal(record.documentId, published.receipt.documentId);
  assert.equal(record.importedContentHash, imported.importedContentHash);
  assert.equal(record.sourceRevisionId, imported.sourceRevisionId);
  const snapshot = parseWritingPackage(JSON.parse(readFileSync(join(dir, "approved-writing-package.json"), "utf8")));
  fake.simulateHumanEdit(published.receipt.documentId, "Later public-link edit\n");
  const later = await importReviewedDocument(fake, original, published.receipt);
  assert.notEqual(hashWritingPackage(snapshot), later.importedContentHash);
});
