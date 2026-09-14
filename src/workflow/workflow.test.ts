import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createMemoryStateStore } from "./state.js";
import { retryPublication, runFactory } from "./orchestrator.js";
import { WORKFLOW_STAGES } from "./state.js";
import { mechanicalScope, validateWritingMechanics, writerMaySetAsideRecommendations } from "./mechanical.js";
import { discoverAssignment, assertProviderEntriesPointToAssignment } from "./assignment.js";
import { loadActiveRuntimeInstructions } from "./runtime-docs.js";
import { loadApprovedExampleLibrary } from "../examples/catalog.js";
import {
  createFixtureAdapters,
  northlineSeed,
  northlineWriterContext,
  publishedReceipt,
} from "./northline.fixture.js";
import { createUnconfiguredPublisher } from "../publisher/index.js";
import type { GoogleDocsPublisher } from "../publisher/types.js";
import type { WritingPackage } from "../writing-package/index.js";

const approval = {
  status: "approved" as const,
  approvedAt: "2026-09-14",
  approvedBy: "fixture-human",
};

test("research-to-prescription stops at the existing human page-plan gate", async () => {
  const store = createMemoryStateStore();
  const adapters = createFixtureAdapters();
  const first = await runFactory({ seed: northlineSeed, adapters, stateStore: store });
  assert.equal(first.state.stage, WORKFLOW_STAGES.AWAITING_PRESCRIPTION_APPROVAL);
  assert.equal(first.awaitingHuman, true);
  assert.equal(first.state.writingPackage, null);
  assert.equal(first.state.humanQaTask?.kind, "prescription-gate");
  assert.equal(adapters.stats.writeCalls, 0);
  assert.ok(first.state.research);
  assert.ok(first.state.prescription);
  assert.equal(first.state.prescription.evidenceFingerprint.length, 64);
});

test("one writer completes internal phases without a human stop, then hands copy to the publisher", async () => {
  const store = createMemoryStateStore();
  const publishCalls: WritingPackage[] = [];
  const publisher: GoogleDocsPublisher = {
    async publishWritingPackage(pkg) {
      publishCalls.push(pkg);
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
  assert.equal(result.awaitingHuman, true);
  assert.deepEqual(adapters.stats.phases, ["servicePages", "siteChrome", "strategyOverview", "polish"]);
  assert.equal(adapters.stats.writeCalls, 4);
  assert.equal(result.state.events.some((event) => event.type === "qa-pass"), false);
  assert.equal(
    result.state.events.filter((event) => event.type === "writing-phase").map((event) => event.detail).join(","),
    "servicePages,siteChrome,strategyOverview,polish",
  );
  assert.equal(publishCalls.length, 1);
  assert.equal(result.state.humanQaTask?.kind, "copy-gate");
  assert.equal(result.state.humanQaTask?.googleDocUrl, "https://docs.google.com/document/d/fixture-northline");
  assert.ok(result.state.writingPackage);
  assert.equal(result.state.writingPackage.pages.strategyOverview.audience, "owner");
  assert.equal(result.state.writingPackage.pages.homepage.audience, "business");
});

test("writer may set aside a prescribed review recommendation and still pass mechanical checks", async () => {
  const adapters = createFixtureAdapters({ useAriInsteadOfMaya: true });
  const result = await runFactory({
    seed: northlineSeed,
    adapters,
    prescriptionApproval: approval,
  });
  const pkg = result.state.writingPackage;
  assert.ok(pkg);
  const repairQuote = pkg.pages.servicePages[0]?.blocks[0]?.quote;
  assert.equal(repairQuote?.reviewId, "review-unclassified");
  assert.notEqual(repairQuote?.reviewId, "review-maya");
  const context = northlineWriterContext();
  assert.equal(writerMaySetAsideRecommendations(context), true);
  validateWritingMechanics({
    pkg,
    decisions: context.decisions,
    evidence: context.evidence,
  });
  assert.deepEqual(mechanicalScope().includes("taste"), false);
});

test("missing Google configuration preserves writing and records setup separately", async () => {
  const adapters = createFixtureAdapters({ publisher: createUnconfiguredPublisher() });
  const result = await runFactory({
    seed: northlineSeed,
    adapters,
    prescriptionApproval: approval,
  });
  assert.equal(result.state.stage, WORKFLOW_STAGES.AWAITING_COPY_QA);
  assert.ok(result.state.writingPackage);
  assert.equal(result.state.publication?.status, "setup-required");
  assert.equal(result.state.humanQaTask?.googleDocUrl, undefined);
  assert.equal(result.state.humanQaTask?.publicationError?.code, "GOOGLE_PUBLISHER_UNCONFIGURED");
});

test("retrying publication does not rerun the writer", async () => {
  const store = createMemoryStateStore();
  const adapters = createFixtureAdapters({ publisher: createUnconfiguredPublisher() });
  const first = await runFactory({
    seed: northlineSeed,
    adapters,
    stateStore: store,
    prescriptionApproval: approval,
  });
  const writesAfterFirst = adapters.stats.writeCalls;
  assert.ok(first.state.writingPackage);
  const packageHash = first.state.writingPackage.packageHash;

  let publishCalls = 0;
  const retry = await retryPublication({
    stateStore: store,
    publisher: {
      async publishWritingPackage(pkg) {
        publishCalls += 1;
        return publishedReceipt(pkg);
      },
    },
  });
  assert.equal(publishCalls, 1);
  assert.equal(adapters.stats.writeCalls, writesAfterFirst);
  assert.equal(retry.state.writingPackage?.packageHash, packageHash);
  assert.equal(retry.state.publication?.status, "published");
  assert.equal(retry.state.humanQaTask?.googleDocUrl, "https://docs.google.com/document/d/fixture-northline");
  assert.equal(retry.state.stage, WORKFLOW_STAGES.AWAITING_COPY_QA);
});

test("assignment discovery has one entry point and provider files only point at it", () => {
  const assignment = discoverAssignment();
  assert.equal(assignment.entryPoint, "ASSIGNMENT.md");
  assert.equal(assignment.writingGuides.assignment, "writing");
  assert.deepEqual(assignment.writingGuides.sourceIds, [
    "general",
    "service",
    "homepage",
    "contact",
    "headerFooter",
  ]);
  assert.equal(assignment.examples.status, "pending-examples-lane");
  assert.equal(assignment.historicalProspects.every((item) => item.role === "history-not-runtime-instructions"), true);
  assert.match(assignment.instructions.authority, /independent thinking/i);
  assert.match(assignment.instructions.writer, /One selected writer model/);
  assert.match(assignment.instructions.writer, /Editorial acceptance then belongs to the human/);
  assertProviderEntriesPointToAssignment();
});

test("runtime instructions are loaded as the active path, not historical prospect copy", () => {
  const docs = loadActiveRuntimeInstructions();
  assert.match(docs.research, /You may consider/);
  assert.match(docs.prescription, /Human gate/);
  assert.doesNotMatch(docs.authority, /Writer 1 creates exactly two/);
  assert.doesNotMatch(docs.writer, /intelligent QA repair/);
});

test("example library becomes available when the examples lane directory exists", () => {
  const root = mkdtempSync(join(tmpdir(), "ff-examples-"));
  try {
    mkdirSync(join(root, "examples/approved-copy/window-dudes"), { recursive: true });
    writeFileSync(
      join(root, "examples/approved-copy/window-dudes/springfield-home.md"),
      "# Springfield homepage\n\nCraft reference only.\n",
    );
    const examples = loadApprovedExampleLibrary({ repoRoot: root });
    assert.equal(examples.status, "available");
    assert.equal(examples.pages.length, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
