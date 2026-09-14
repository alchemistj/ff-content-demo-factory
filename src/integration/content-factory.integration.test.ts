import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { loadApprovedCopyCatalog, EXAMPLE_IDS } from "../approved-copy/index.js";
import { loadApprovedExampleLibrary } from "../examples/index.js";
import { createGoogleDocsPublisher } from "../google-docs/publisher-adapter.js";
import { importReviewedDocument, writeApprovedSnapshot } from "../google-docs/approval.js";
import { FakeGoogleTransport } from "../google-docs/fake-google.js";
import { buildNativeDocument } from "../google-docs/document-builder.js";
import { publishForHumanReview } from "../google-docs/publisher.js";
import { discoverAssignment } from "../workflow/assignment.js";
import { createMemoryStateStore, WORKFLOW_STAGES } from "../workflow/state.js";
import { retryPublication, runFactory } from "../workflow/orchestrator.js";
import {
  createFixtureAdapters,
  northlineSeed,
  northlineWritingPackage,
  northlineWriterContext,
} from "../workflow/northline.fixture.js";
import {
  validateWritingMechanics,
  writerMaySetAsideRecommendations,
} from "../workflow/mechanical.js";
import { loadCanonicalGuideCatalog, loadWritingAssignmentGuides } from "../writer-guides/index.js";
import { isFaithfulReviewExcerpt, parseWritingPackage } from "../writing-package/index.js";
import type { WriterAssignment } from "../workflow/types.js";
import type { GoogleDocsConfig } from "../google-docs/config.js";
import type { WritingPackage } from "../writing-package/types.js";

const approval = {
  status: "approved" as const,
  approvedAt: "2026-09-14",
  approvedBy: "integration-human",
};

const googleConfig: GoogleDocsConfig = {
  clientId: "client",
  clientSecret: "secret",
  refreshToken: "refresh",
  folderId: "folder_review",
};

test("canonical guides and the twelve approved examples load together", () => {
  const guides = loadCanonicalGuideCatalog();
  const writing = loadWritingAssignmentGuides();
  const catalog = loadApprovedCopyCatalog();
  const examples = loadApprovedExampleLibrary();
  assert.equal(guides.guides.length, 6);
  assert.equal(writing.assignment, "writing");
  assert.equal(catalog.examples.length, 12);
  assert.deepEqual(catalog.examples.map((example) => example.id), [...EXAMPLE_IDS]);
  assert.equal(examples.pages.length, 12);
  assert.equal(examples.chromePages.length, 3);
  assert.equal(
    examples.pages.some((page) => /README|SOURCE_MANIFEST|_chrome\.md/i.test(page.relativePath)),
    false,
  );
});

test("one writing assignment is one writer run and carries original evidence plus both recommendation sets", async () => {
  const captured: WriterAssignment[] = [];
  const fake = new FakeGoogleTransport();
  const publisher = createGoogleDocsPublisher({
    loadConfig: () => ({ config: googleConfig, missing: [], source: "env" }),
    createTransport: async () => fake,
  });
  const adapters = createFixtureAdapters({ publisher });
  const original = adapters.writer.writeCompletePackage.bind(adapters.writer);
  adapters.writer.writeCompletePackage = async (assignment) => {
    captured.push(assignment);
    return original(assignment);
  };

  const result = await runFactory({
    seed: northlineSeed,
    adapters,
    prescriptionApproval: approval,
  });

  assert.equal(adapters.stats.writeCalls, 1);
  assert.equal(result.state.writerInvocations, 1);
  assert.equal(captured.length, 1);
  const assignment = captured[0];
  assert.ok(assignment);
  assert.equal(assignment.examples.pages.length, 12);
  assert.equal(assignment.context.evidence.reviews.length, 3);
  assert.equal(assignment.context.researchRecommendations.items.length, 2);
  assert.equal(assignment.context.prescriptionRecommendations.items.length, 3);
  assert.equal(assignment.internalOrder.length, 3);
  assert.equal(result.state.prescriptionPublication?.kind, "prescription");
  assert.equal(result.state.publication?.kind, "website_copy");
  assert.equal(result.state.prescriptionPublication?.status, "published");
  assert.equal(result.state.publication?.status, "published");
  assert.equal(result.state.humanQaTask?.kind, "copy-gate");
  assert.equal(
    Object.values(WORKFLOW_STAGES).filter((stage) => stage.startsWith("awaiting_")).join(","),
    "awaiting_prescription_approval,awaiting_copy_qa",
  );
  assert.equal(result.state.events.some((event) => event.type === "qa-pass"), false);
});

test("later stages may set aside advisory recommendations without failing", () => {
  const context = northlineWriterContext();
  assert.equal(writerMaySetAsideRecommendations(context), true);
  validateWritingMechanics({
    pkg: northlineWritingPackage(),
    decisions: context.decisions,
    evidence: context.evidence,
  });
});

test("publication retry uses the stored package and does not rerun the writer", async () => {
  const store = createMemoryStateStore();
  const fake = new FakeGoogleTransport();
  let publishCalls = 0;
  const publisher = createGoogleDocsPublisher({
    loadConfig: () => ({ config: googleConfig, missing: [], source: "env" }),
    createTransport: async () => {
      publishCalls += 1;
      return fake;
    },
  });
  const adapters = createFixtureAdapters({ publisher });
  const first = await runFactory({
    seed: northlineSeed,
    adapters,
    stateStore: store,
    prescriptionApproval: approval,
  });
  assert.equal(adapters.stats.writeCalls, 1);
  const writingHash = first.state.writingPackage?.packageHash;
  assert.ok(writingHash);
  const retry = await retryPublication({ stateStore: store, publisher });
  assert.equal(adapters.stats.writeCalls, 1);
  assert.equal(retry.state.writingPackage?.packageHash, writingHash);
  assert.ok(publishCalls >= 2);
});

test("PR #30 writing-package objects publish and import through the Google Docs publisher with no translation schema", async () => {
  const pkg = northlineWritingPackage();
  assert.equal(pkg.schemaVersion, "writing-package/v1");
  assert.equal("version" in pkg, false);
  const fake = new FakeGoogleTransport();
  const published = await publishForHumanReview(fake, pkg, googleConfig, undefined);
  assert.equal(published.ok, true);
  if (!published.ok) return;
  const imported = await importReviewedDocument(fake, pkg, published.receipt);
  assert.equal(imported.package.schemaVersion, "writing-package/v1");
  assert.equal(imported.package.packageId, pkg.packageId);
  const quote = imported.package.pages.flatMap((page) => page.blocks).find((block) => block.type === "quote");
  const sourceQuote = pkg.pages.flatMap((page) => page.blocks).find((block) => block.type === "quote");
  assert.ok(quote && quote.type === "quote");
  assert.ok(sourceQuote && sourceQuote.type === "quote");
  assert.equal(quote.reviewId, sourceQuote.reviewId);
  assert.equal(quote.attribution, sourceQuote.attribution);
  const built = buildNativeDocument(pkg);
  assert.ok(sourceQuote.reviewId);
  assert.equal(built.insertText.includes(sourceQuote.reviewId), false);

  const dir = mkdtempSync(join(tmpdir(), "ff-approved-"));
  const record = writeApprovedSnapshot({
    snapshotDir: dir,
    imported,
    actor: "integration",
    receipt: published.receipt,
    relativeDir: "approved-copy/prospect-northline",
  });
  assert.equal(record.snapshotRelativeDir, "approved-copy/prospect-northline");
  assert.equal(existsSync(join(dir, "approved-writing-package.json")), true);
  parseWritingPackage(JSON.parse(readFileSync(join(dir, "approved-writing-package.json"), "utf8")));
});

test("faithful excerpts pass and paraphrases or wrong attribution fail", () => {
  const context = northlineWriterContext();
  const source = context.evidence.reviews.find((review) => review.id === "review-unclassified");
  assert.ok(source);
  assert.equal(isFaithfulReviewExcerpt(source.exactText, "The repair solved the noise"), true);
  assert.equal(isFaithfulReviewExcerpt(source.exactText, "The repair basically solved the noise"), false);
  const pkg = northlineWritingPackage();
  const misattributed: WritingPackage = {
    ...pkg,
    pages: pkg.pages.map((page) => ({
      ...page,
      blocks: page.blocks.map((block) =>
        block.type === "quote" && block.reviewId === "review-unclassified"
          ? { ...block, attribution: "Someone else" }
          : block,
      ),
    })),
  };
  assert.throws(
    () =>
      validateWritingMechanics({
        pkg: misattributed,
        decisions: context.decisions,
        evidence: context.evidence,
      }),
    /must keep source attribution/,
  );
});

test("assignment discovery still has one entry point and no second editorial model", () => {
  const assignment = discoverAssignment();
  assert.equal(assignment.entryPoint, "ASSIGNMENT.md");
  assert.equal(assignment.examples.pages.length, 12);
  assert.match(assignment.instructions.writer, /one writer run/i);
  assert.doesNotMatch(assignment.instructions.writer, /intelligent QA repair/);
  assert.doesNotMatch(assignment.instructions.authority, /Writer 1 creates exactly two/);
});
