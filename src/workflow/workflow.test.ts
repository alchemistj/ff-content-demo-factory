import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createMemoryStateStore, WORKFLOW_STAGES } from "./state.js";
import { retryPublication, runFactory } from "./orchestrator.js";
import {
  mechanicalScope,
  MechanicalValidationError,
  validateWritingMechanics,
  writerMaySetAsideRecommendations,
} from "./mechanical.js";
import { discoverAssignment, assertProviderEntriesPointToAssignment } from "./assignment.js";
import { loadActiveRuntimeInstructions } from "./runtime-docs.js";
import { loadApprovedExampleLibrary } from "../examples/catalog.js";
import {
  createFixtureAdapters,
  northlineSeed,
  northlineWebsitePages,
  northlineWriterContext,
  northlineWritingPackage,
  publishedReceipt,
} from "./northline.fixture.js";
import { createUnconfiguredPublisher } from "../publisher/index.js";
import type { GoogleDocsPublisher } from "../publisher/types.js";
import {
  buildWritingPackage,
  isFaithfulReviewExcerpt,
  parseWritingPackage,
  websiteCopyPages,
  type WritingPackage,
} from "../writing-package/index.js";

const approval = {
  status: "approved" as const,
  approvedAt: "2026-09-14",
  approvedBy: "fixture-human",
};

test("research-to-prescription publishes the existing human page-plan gate and does not start writing", async () => {
  const store = createMemoryStateStore();
  const publishCalls: WritingPackage[] = [];
  const publisher: GoogleDocsPublisher = {
    async publishReviewPackage(pkg) {
      publishCalls.push(pkg);
      return publishedReceipt(pkg);
    },
  };
  const adapters = createFixtureAdapters({ publisher });
  const first = await runFactory({ seed: northlineSeed, adapters, stateStore: store });
  assert.equal(first.state.stage, WORKFLOW_STAGES.AWAITING_PRESCRIPTION_APPROVAL);
  assert.equal(first.awaitingHuman, true);
  assert.equal(first.state.writingPackage, null);
  assert.equal(adapters.stats.writeCalls, 0);
  assert.equal(publishCalls.length, 1);
  assert.equal(publishCalls[0]?.kind, "prescription");
  assert.equal(first.state.humanQaTask?.kind, "prescription-gate");
  assert.equal(
    first.state.humanQaTask?.googleDocUrl,
    "https://docs.google.com/document/d/fixture-northline-prescription",
  );
  assert.ok(first.state.prescriptionPackage);
  assert.deepEqual(
    first.state.prescriptionPackage.pages.map((page) => page.pageId),
    ["prescription-decisions", "prescription-evidence", "prescription-recommendations"],
  );
  assert.match(first.state.prescriptionPackage.pages[0]?.title ?? "", /for approval/i);
  assert.match(first.state.prescriptionPackage.pages[2]?.title ?? "", /advisory/i);
  assert.equal(
    first.state.events.filter((event) => event.stage === WORKFLOW_STAGES.AWAITING_COPY_QA).length,
    0,
  );
});

test("one writer run owns the complete package; internal order is not three model calls", async () => {
  const store = createMemoryStateStore();
  const publishKinds: string[] = [];
  const publisher: GoogleDocsPublisher = {
    async publishReviewPackage(pkg) {
      publishKinds.push(pkg.kind);
      return publishedReceipt(pkg);
    },
  };
  const adapters = createFixtureAdapters({ publisher });
  const result = await runFactory({
    seed: northlineSeed,
    adapters,
    stateStore: store,
    prescriptionApproval: approval,
  });
  assert.equal(result.state.stage, WORKFLOW_STAGES.AWAITING_COPY_QA);
  assert.equal(adapters.stats.writeCalls, 1);
  assert.equal(result.state.writerInvocations, 1);
  assert.equal(adapters.stats.writerRunIds.length, 1);
  assert.equal(adapters.stats.writerRunIds[0], result.state.writerRunId);
  assert.equal(result.state.events.some((event) => event.type === "qa-pass"), false);
  assert.equal(result.state.events.filter((event) => event.type === "writing-phase").length, 0);
  assert.deepEqual(publishKinds, ["prescription", "website_copy"]);
  assert.equal(result.state.humanQaTask?.kind, "copy-gate");
  assert.equal(result.state.humanQaTask?.googleDocUrl, "https://docs.google.com/document/d/fixture-northline");
  assert.equal("write" in adapters.writer, false);
  assert.equal(result.state.writerRunId, `${result.state.runId}:writer`);
  assert.equal(result.state.prescriptionPublication?.kind, "prescription");
  assert.equal(result.state.publication?.kind, "website_copy");
  assert.equal(
    result.state.events.filter((event) => event.type === "published" || event.type === "publication-recorded").length,
    2,
  );
  const pages = websiteCopyPages(result.state.writingPackage!);
  assert.equal(pages.strategyOverview.audience, "owner");
  assert.equal(pages.homepage.audience, "business");
  assert.equal(pages.servicePages.length, 2);
});

test("writer may set aside a prescribed review and quote a faithful excerpt", async () => {
  const adapters = createFixtureAdapters({ useAriExcerpt: true });
  const result = await runFactory({
    seed: northlineSeed,
    adapters,
    prescriptionApproval: approval,
  });
  const pkg = result.state.writingPackage;
  assert.ok(pkg);
  const repair = websiteCopyPages(pkg).servicePages[0];
  const repairQuote = repair.blocks.find((block) => block.type === "quote");
  assert.equal(repairQuote && repairQuote.type === "quote" ? repairQuote.reviewId : undefined, "review-unclassified");
  assert.notEqual(repairQuote && repairQuote.type === "quote" ? repairQuote.reviewId : undefined, "review-maya");
  assert.equal(writerMaySetAsideRecommendations(northlineWriterContext()), true);
  validateWritingMechanics({
    pkg,
    decisions: northlineWriterContext().decisions,
    evidence: northlineWriterContext().evidence,
  });
  assert.equal(mechanicalScope().includes("taste"), false);
});

test("missing Google configuration preserves the proposed plan and the writing package", async () => {
  const adapters = createFixtureAdapters({ publisher: createUnconfiguredPublisher() });
  const gated = await runFactory({ seed: northlineSeed, adapters });
  assert.equal(gated.state.stage, WORKFLOW_STAGES.AWAITING_PRESCRIPTION_APPROVAL);
  assert.ok(gated.state.prescriptionPackage);
  assert.equal(gated.state.prescriptionPublication?.status, "setup-required");
  assert.equal(gated.state.humanQaTask?.publicationError?.code, "GOOGLE_PUBLISHER_UNCONFIGURED");
  assert.equal(adapters.stats.writeCalls, 0);

  const result = await runFactory({
    seed: northlineSeed,
    adapters,
    stateStore: createMemoryStateStore(gated.state),
    prescriptionApproval: approval,
  });
  assert.equal(result.state.stage, WORKFLOW_STAGES.AWAITING_COPY_QA);
  assert.ok(result.state.writingPackage);
  assert.equal(result.state.publication?.status, "setup-required");
});

test("retrying prescription publication does not rerun research, prescription, or the writer", async () => {
  const store = createMemoryStateStore();
  const adapters = createFixtureAdapters({ publisher: createUnconfiguredPublisher() });
  const first = await runFactory({ seed: northlineSeed, adapters, stateStore: store });
  assert.equal(first.state.stage, WORKFLOW_STAGES.AWAITING_PRESCRIPTION_APPROVAL);
  const researchCalls = adapters.stats.researchCalls;
  const prescribeCalls = adapters.stats.prescribeCalls;
  const writes = adapters.stats.writeCalls;
  const packageHash = first.state.prescriptionPackage?.packageHash;
  assert.ok(packageHash);

  let publishCalls = 0;
  const retry = await retryPublication({
    stateStore: store,
    publisher: {
      async publishReviewPackage(pkg) {
        publishCalls += 1;
        return publishedReceipt(pkg);
      },
    },
  });
  assert.equal(publishCalls, 1);
  assert.equal(adapters.stats.researchCalls, researchCalls);
  assert.equal(adapters.stats.prescribeCalls, prescribeCalls);
  assert.equal(adapters.stats.writeCalls, writes);
  assert.equal(retry.state.prescriptionPackage?.packageHash, packageHash);
  assert.equal(retry.state.prescriptionPublication?.status, "published");
  assert.equal(retry.state.stage, WORKFLOW_STAGES.AWAITING_PRESCRIPTION_APPROVAL);
  assert.equal(retry.awaitingHuman, true);
});

test("retrying copy publication does not rerun the writer", async () => {
  const store = createMemoryStateStore();
  const adapters = createFixtureAdapters({ publisher: createUnconfiguredPublisher() });
  const first = await runFactory({
    seed: northlineSeed,
    adapters,
    stateStore: store,
    prescriptionApproval: approval,
  });
  const writesAfterFirst = adapters.stats.writeCalls;
  assert.equal(writesAfterFirst, 1);
  const packageHash = first.state.writingPackage?.packageHash;
  assert.ok(packageHash);

  const retry = await retryPublication({
    stateStore: store,
    publisher: {
      async publishReviewPackage(pkg) {
        return publishedReceipt(pkg);
      },
    },
  });
  assert.equal(adapters.stats.writeCalls, 1);
  assert.equal(retry.state.writingPackage?.packageHash, packageHash);
  assert.equal(retry.state.publication?.status, "published");
  assert.equal(retry.state.stage, WORKFLOW_STAGES.AWAITING_COPY_QA);
});

test("paraphrased quotation marks fail mechanical validation; contiguous excerpts pass", () => {
  assert.equal(
    isFaithfulReviewExcerpt(
      "The technician explained the repair, arrived when promised, and left the area tidy.",
      "The technician explained the repair",
    ),
    true,
  );
  assert.equal(
    isFaithfulReviewExcerpt(
      "The technician explained the repair,\narrived when promised, and left the area tidy.",
      "arrived when promised",
    ),
    true,
  );
  assert.equal(
    isFaithfulReviewExcerpt(
      "The technician explained the repair, arrived when promised, and left the area tidy.",
      "The technician did a great job and was tidy",
    ),
    false,
  );

  const context = northlineWriterContext();
  const good = northlineWritingPackage();
  validateWritingMechanics({ pkg: good, decisions: context.decisions, evidence: context.evidence });

  const paraphrasedPages = northlineWebsitePages({ useAriExcerpt: true }).map((page) => {
    if (page.pageId !== "page-repair") return page;
    return {
      ...page,
      blocks: page.blocks.map((block) =>
        block.type === "quote"
          ? { ...block, spans: [{ text: "The repair really fixed the annoying noise quickly." }] }
          : block,
      ),
    };
  });
  const bad = buildWritingPackage({
    kind: "website_copy",
    packageId: "website-copy-paraphrase",
    prospectId: northlineSeed.prospectId,
    runId: "run-prospect-northline",
    businessName: northlineSeed.business.name,
    pages: paraphrasedPages,
  });
  assert.throws(
    () => validateWritingMechanics({ pkg: bad, decisions: context.decisions, evidence: context.evidence }),
    MechanicalValidationError,
  );

  const misattributedPages = northlineWebsitePages({ useAriExcerpt: true }).map((page) => {
    if (page.pageId !== "page-repair") return page;
    return {
      ...page,
      blocks: page.blocks.map((block) =>
        block.type === "quote" ? { ...block, attribution: "Someone else" } : block,
      ),
    };
  });
  const misattributed = buildWritingPackage({
    kind: "website_copy",
    packageId: "website-copy-misattributed",
    prospectId: northlineSeed.prospectId,
    runId: "run-prospect-northline",
    businessName: northlineSeed.business.name,
    pages: misattributedPages,
  });
  assert.throws(
    () => validateWritingMechanics({ pkg: misattributed, decisions: context.decisions, evidence: context.evidence }),
    /must keep source attribution/,
  );
});

test("assignment discovery has one entry point and provider files only point at it", () => {
  const assignment = discoverAssignment();
  assert.equal(assignment.entryPoint, "ASSIGNMENT.md");
  assert.equal(assignment.writingGuides.assignment, "writing");
  assert.match(assignment.instructions.writer, /one writer run/i);
  assertProviderEntriesPointToAssignment();
});

test("runtime instructions are loaded as the active path, not historical prospect copy", () => {
  const docs = loadActiveRuntimeInstructions();
  assert.match(docs.research, /You may consider/);
  assert.match(docs.prescription, /Human gate/);
  assert.doesNotMatch(docs.authority, /Writer 1 creates exactly two/);
  assert.doesNotMatch(docs.writer, /intelligent QA repair/);
});

test("example library is the twelve-page approved-copy catalog, not a recursive markdown dump", () => {
  const examples = loadApprovedExampleLibrary();
  assert.equal(examples.status, "available");
  assert.equal(examples.pages.length, 12);
  assert.equal(examples.pages.every((page) => page.role === "primary"), true);
  assert.equal(
    examples.pages.some((page) => /README|SOURCE_MANIFEST|_not-authority|_chrome\.md/i.test(page.relativePath)),
    false,
  );
  assert.deepEqual(
    examples.pages.map((page) => page.id),
    [
      "wd-home",
      "wd-glass",
      "wd-replace",
      "wd-contact",
      "sra-home",
      "sra-replace",
      "sra-maint",
      "sra-contact",
      "gp-home",
      "gp-inspect",
      "gp-black",
      "gp-contact",
    ],
  );
  assert.equal(examples.chromePages.length, 3);
  assert.equal(examples.chromePages.every((page) => page.role === "chrome"), true);
  assert.equal(examples.chromePages.every((page) => page.relativePath.endsWith("_chrome.md")), true);
});

test("stray markdown under examples/approved-copy does not become the writer corpus", () => {
  const root = mkdtempSync(join(tmpdir(), "ff-examples-"));
  try {
    mkdirSync(join(root, "examples/approved-copy/window-dudes"), { recursive: true });
    writeFileSync(join(root, "examples/approved-copy/README.md"), "# Manifest, not a craft page\n");
    writeFileSync(
      join(root, "examples/approved-copy/window-dudes/springfield-home.md"),
      "# Springfield homepage\n\nCraft reference only.\n",
    );
    const examples = loadApprovedExampleLibrary({ repoRoot: root });
    assert.equal(examples.status, "pending-examples-lane");
    assert.equal(examples.available, false);
    assert.equal(examples.pages.length, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("canonical package parser accepts the shared website-copy shape", () => {
  const pkg = northlineWritingPackage();
  const parsed = parseWritingPackage(pkg);
  assert.equal(parsed.schemaVersion, "writing-package/v1");
  assert.equal(parsed.kind, "website_copy");
  assert.equal(parsed.pages.length, 6);
  assert.ok(parsed.pages.some((page) => page.blocks.some((block) => block.type === "quote" && block.reviewId)));
  assert.ok(
    parsed.pages.some((page) =>
      page.blocks.some((block) => block.type === "paragraph" && block.spans.some((span) => span.bold || span.href)),
    ),
  );
});

test("the only routine human gates are prescription approval and copy QA", async () => {
  const adapters = createFixtureAdapters();
  const gated = await runFactory({ seed: northlineSeed, adapters });
  assert.equal(gated.state.humanQaTask?.kind, "prescription-gate");
  assert.equal(gated.state.stage, WORKFLOW_STAGES.AWAITING_PRESCRIPTION_APPROVAL);
  const result = await runFactory({
    seed: northlineSeed,
    adapters,
    stateStore: createMemoryStateStore(gated.state),
    prescriptionApproval: approval,
  });
  assert.equal(result.state.humanQaTask?.kind, "copy-gate");
  assert.equal(result.state.stage, WORKFLOW_STAGES.AWAITING_COPY_QA);
  assert.deepEqual(
    Object.values(WORKFLOW_STAGES).filter((stage) => stage.startsWith("awaiting_")),
    ["awaiting_prescription_approval", "awaiting_copy_qa"],
  );
});
