import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { importReviewedDocument, writeApprovedSnapshot } from "./approval.js";
import { assertImportableDocument } from "./document-reader.js";
import { FakeGoogleTransport } from "./fake-google.js";
import { GoogleDocsError } from "./errors.js";
import { publishForHumanReview } from "./publisher.js";
import { parseWritingPackage, hashWritingPackage, type WritingPackage } from "../writing-package/index.js";
import type { GoogleDocsConfig } from "./config.js";
import type { DocsDocument } from "./google-rest.js";
import type { PublicationReceipt } from "./lifecycle.js";

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

function snapshotPaths(prospectId: string): { root: string; relativeDir: string; snapshotDir: string } {
  const root = mkdtempSync(join(tmpdir(), "ff-approved-"));
  const relativeDir = `approved-copy/${prospectId}`;
  const snapshotDir = join(root, relativeDir);
  return { root, relativeDir, snapshotDir };
}

async function publishedFixture(): Promise<{
  original: WritingPackage;
  fake: FakeGoogleTransport;
  receipt: PublicationReceipt;
}> {
  const original = parseWritingPackage(JSON.parse(readFileSync(fixturePath, "utf8")));
  const fake = new FakeGoogleTransport();
  const published = await publishForHumanReview(fake, original, config, undefined);
  assert.equal(published.ok, true);
  if (!published.ok) throw new Error("expected publication");
  return { original, fake, receipt: published.receipt };
}

function assertNoSnapshot(snapshotDir: string): void {
  assert.equal(existsSync(join(snapshotDir, "approved-writing-package.json")), false);
  assert.equal(existsSync(join(snapshotDir, "approval-record.json")), false);
}

test("approval snapshot records actor, document, revision, hash, and does not follow later edits", async () => {
  const { original, fake, receipt } = await publishedFixture();
  const imported = await importReviewedDocument(fake, original, receipt);
  const paths = snapshotPaths(original.prospectId);
  const record = writeApprovedSnapshot({
    snapshotDir: paths.snapshotDir,
    imported,
    actor: "alchemistj",
    receipt,
    original,
    relativeDir: paths.relativeDir,
    now: "2026-09-14T00:00:00.000Z",
  });
  assert.equal(record.actor, "alchemistj");
  assert.equal(record.documentId, receipt.documentId);
  assert.equal(record.importedContentHash, imported.importedContentHash);
  assert.equal(record.sourceRevisionId, imported.sourceRevisionId);
  const snapshot = parseWritingPackage(
    JSON.parse(readFileSync(join(paths.snapshotDir, "approved-writing-package.json"), "utf8")),
  );
  fake.simulateHumanEdit(receipt.documentId, "Later public-link edit\n");
  const later = await importReviewedDocument(fake, original, receipt);
  assert.notEqual(hashWritingPackage(snapshot), later.importedContentHash);
});

test("import refuses each canonical identity mismatch before fetching the document", async () => {
  const { original, fake, receipt } = await publishedFixture();
  const docsGetsBefore = fake.calls.filter((call) => call.method === "GET" && call.url.includes("/v1/documents/")).length;
  const mismatches: Array<[string, WritingPackage, PublicationReceipt]> = [
    ["kind", { ...original, kind: "prescription" }, receipt],
    ["prospectId", { ...original, prospectId: "other-prospect" }, receipt],
    ["runId", { ...original, runId: "run_other" }, receipt],
    ["packageId", { ...original, packageId: "website-copy-other" }, receipt],
    ["packageContentHash", original, { ...receipt, packageContentHash: "b".repeat(64) }],
  ];
  for (const [field, pkg, nextReceipt] of mismatches) {
    await assert.rejects(
      () => importReviewedDocument(fake, pkg, nextReceipt),
      (error: unknown) => {
        assert.ok(error instanceof GoogleDocsError);
        assert.equal(error.code, "import_identity_mismatch");
        assert.match(error.message, new RegExp(field));
        assert.match(error.message, /trusted GitHub run does not bind/);
        return true;
      },
    );
  }
  const docsGetsAfter = fake.calls.filter((call) => call.method === "GET" && call.url.includes("/v1/documents/")).length;
  assert.equal(docsGetsAfter, docsGetsBefore);
});

test("writeApprovedSnapshot refuses each identity mismatch and writes no snapshot", async () => {
  const { original, fake, receipt } = await publishedFixture();
  const imported = await importReviewedDocument(fake, original, receipt);
  const cases: Array<[string, Parameters<typeof writeApprovedSnapshot>[0]]> = [
    [
      "kind",
      {
        snapshotDir: snapshotPaths(original.prospectId).snapshotDir,
        imported,
        actor: "alchemistj",
        receipt: { ...receipt, kind: "prescription" },
        original,
        relativeDir: `approved-copy/${original.prospectId}`,
      },
    ],
    [
      "prospectId",
      {
        snapshotDir: snapshotPaths(original.prospectId).snapshotDir,
        imported,
        actor: "alchemistj",
        receipt: { ...receipt, prospectId: "other-prospect" },
        original,
        relativeDir: `approved-copy/${original.prospectId}`,
      },
    ],
    [
      "runId",
      {
        snapshotDir: snapshotPaths(original.prospectId).snapshotDir,
        imported,
        actor: "alchemistj",
        receipt: { ...receipt, runId: "run_other" },
        original,
        relativeDir: `approved-copy/${original.prospectId}`,
      },
    ],
    [
      "packageId",
      {
        snapshotDir: snapshotPaths(original.prospectId).snapshotDir,
        imported,
        actor: "alchemistj",
        receipt: { ...receipt, packageId: "website-copy-other" },
        original,
        relativeDir: `approved-copy/${original.prospectId}`,
      },
    ],
    [
      "packageContentHash",
      {
        snapshotDir: snapshotPaths(original.prospectId).snapshotDir,
        imported,
        actor: "alchemistj",
        receipt: { ...receipt, packageContentHash: "c".repeat(64) },
        original,
        relativeDir: `approved-copy/${original.prospectId}`,
      },
    ],
    [
      "documentId",
      {
        snapshotDir: snapshotPaths(original.prospectId).snapshotDir,
        imported: { ...imported, documentId: "doc_other" },
        actor: "alchemistj",
        receipt,
        original,
        relativeDir: `approved-copy/${original.prospectId}`,
      },
    ],
    [
      "prospectId",
      {
        snapshotDir: snapshotPaths(original.prospectId).snapshotDir,
        imported: { ...imported, package: { ...imported.package, prospectId: "other-prospect" } },
        actor: "alchemistj",
        receipt,
        original,
        relativeDir: `approved-copy/${original.prospectId}`,
      },
    ],
    [
      "runId",
      {
        snapshotDir: snapshotPaths(original.prospectId).snapshotDir,
        imported: { ...imported, package: { ...imported.package, runId: "run_other" } },
        actor: "alchemistj",
        receipt,
        original,
        relativeDir: `approved-copy/${original.prospectId}`,
      },
    ],
    [
      "packageId",
      {
        snapshotDir: snapshotPaths(original.prospectId).snapshotDir,
        imported: { ...imported, package: { ...imported.package, packageId: "website-copy-other" } },
        actor: "alchemistj",
        receipt,
        original,
        relativeDir: `approved-copy/${original.prospectId}`,
      },
    ],
    [
      "importedContentHash",
      {
        snapshotDir: snapshotPaths(original.prospectId).snapshotDir,
        imported: { ...imported, importedContentHash: "d".repeat(64) },
        actor: "alchemistj",
        receipt,
        original,
        relativeDir: `approved-copy/${original.prospectId}`,
      },
    ],
  ];
  for (const [field, input] of cases) {
    assert.throws(
      () => writeApprovedSnapshot(input),
      (error: unknown) => {
        assert.ok(error instanceof GoogleDocsError);
        assert.equal(error.code, "import_identity_mismatch");
        assert.match(error.message, new RegExp(field));
        return true;
      },
    );
    assertNoSnapshot(input.snapshotDir);
  }
});

test("writeApprovedSnapshot refuses a wrong destination prospect path", async () => {
  const { original, fake, receipt } = await publishedFixture();
  const imported = await importReviewedDocument(fake, original, receipt);
  const root = mkdtempSync(join(tmpdir(), "ff-approved-"));
  const snapshotDir = join(root, "approved-copy", "other-prospect");
  mkdirSync(snapshotDir, { recursive: true });
  assert.throws(
    () =>
      writeApprovedSnapshot({
        snapshotDir,
        imported,
        actor: "alchemistj",
        receipt,
        original,
        relativeDir: "approved-copy/other-prospect",
      }),
    (error: unknown) => {
      assert.ok(error instanceof GoogleDocsError);
      assert.equal(error.code, "import_identity_mismatch");
      assert.match(error.message, /destination relativeDir mismatch/);
      return true;
    },
  );
  assertNoSnapshot(snapshotDir);
});

test("writeApprovedSnapshot refuses a snapshotDir that is not approved-copy/<prospectId>", async () => {
  const { original, fake, receipt } = await publishedFixture();
  const imported = await importReviewedDocument(fake, original, receipt);
  const snapshotDir = mkdtempSync(join(tmpdir(), "ff-approved-"));
  assert.throws(
    () =>
      writeApprovedSnapshot({
        snapshotDir,
        imported,
        actor: "alchemistj",
        receipt,
        original,
        relativeDir: `approved-copy/${original.prospectId}`,
      }),
    (error: unknown) => {
      assert.ok(error instanceof GoogleDocsError);
      assert.equal(error.code, "import_identity_mismatch");
      assert.match(error.message, /destination snapshotDir is not/);
      return true;
    },
  );
  assertNoSnapshot(snapshotDir);
});

