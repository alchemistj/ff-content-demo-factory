import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { GoogleDocsError } from "./errors.js";
import {
  assertNumericPublishRunId,
  assertTrustedPublishRun,
  formatPublishJobSummary,
  formatPublishLogBanner,
  isPublicationReceipt,
  parseGithubActionsRunMetadata,
  PUBLISH_WORKFLOW_FILE,
  readHandoffReceipt,
} from "./publish-handoff.js";
import { extractGithubActionsRunBodies, runBodiesContainWorkflowInputs } from "./workflow-yaml.js";
import type { PublicationReceipt } from "./lifecycle.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const cli = join(repoRoot, "src/google-docs/cli.ts");

const receipt: PublicationReceipt = {
  schemaVersion: "1.0.0",
  kind: "website_copy",
  publicationStatus: "published",
  documentId: "doc123",
  documentUrl: "https://docs.google.com/document/d/doc123/edit",
  title: "Acme — Website Copy — Human Review",
  prospectId: "acme",
  runId: "run-1",
  packageId: "pkg-1",
  packageContentHash: "a".repeat(64),
  publishedAt: "2026-09-14T00:00:00.000Z",
  permission: { type: "anyone", role: "writer", allowFileDiscovery: false },
  pageIdentities: [],
  reviewVersion: 1,
};

const trustedRun = {
  id: 34897339361,
  path: PUBLISH_WORKFLOW_FILE,
  head_branch: "main",
  event: "workflow_dispatch",
  status: "completed",
  conclusion: "success",
};

test("run-body scanner flags inputs interpolated into shell and ignores env/with", () => {
  const bad = `
on:
  workflow_dispatch:
    inputs:
      package_path:
        required: true
jobs:
  publish:
    steps:
      - name: Unsafe
        run: |
          npm run google-docs:publish -- --package "\${{ inputs.package_path }}"
`;
  assert.equal(runBodiesContainWorkflowInputs(bad), true);
  assert.ok(extractGithubActionsRunBodies(bad).some((body) => body.includes("${{ inputs.package_path }}")));

  const folded = `
      - name: Folded
        run: >
          npm run google-docs:approve --
          --package "\${{ inputs.package_path }}"
`;
  assert.equal(runBodiesContainWorkflowInputs(folded), true);

  const safe = `
jobs:
  publish:
    env:
      PACKAGE_PATH: \${{ inputs.package_path }}
    steps:
      - name: Safe
        run: |
          npm run google-docs:publish -- --package "$PACKAGE_PATH"
      - uses: actions/download-artifact@v4
        with:
          run-id: \${{ inputs.publish_run_id }}
`;
  assert.equal(runBodiesContainWorkflowInputs(safe), false);
});

test("numeric publish run ids reject quote-breaking payloads", () => {
  assert.equal(assertNumericPublishRunId("34897339361"), "34897339361");
  assert.throws(() => assertNumericPublishRunId("34897339361; rm -rf /"), (error: unknown) => {
    assert.ok(error instanceof GoogleDocsError);
    return true;
  });
  assert.throws(() => assertNumericPublishRunId("$(whoami)"), (error: unknown) => error instanceof GoogleDocsError);
  assert.throws(() => assertNumericPublishRunId(""), (error: unknown) => error instanceof GoogleDocsError);
});

test("only a successful main workflow_dispatch of the publish workflow is trusted", () => {
  assert.deepEqual(assertTrustedPublishRun(parseGithubActionsRunMetadata(trustedRun), "34897339361"), trustedRun);
  assert.throws(
    () => assertTrustedPublishRun({ ...trustedRun, path: ".github/workflows/ci.yml" }),
    (error: unknown) => error instanceof GoogleDocsError,
  );
  assert.throws(
    () => assertTrustedPublishRun({ ...trustedRun, head_branch: "feature" }),
    (error: unknown) => error instanceof GoogleDocsError,
  );
  assert.throws(
    () => assertTrustedPublishRun({ ...trustedRun, event: "pull_request" }),
    (error: unknown) => error instanceof GoogleDocsError,
  );
  assert.throws(
    () => assertTrustedPublishRun({ ...trustedRun, conclusion: "failure" }),
    (error: unknown) => error instanceof GoogleDocsError,
  );
  assert.throws(
    () => assertTrustedPublishRun(trustedRun, "1"),
    (error: unknown) => error instanceof GoogleDocsError,
  );
});

test("handoff receipt must be a real Google Doc publication, not a failure payload", () => {
  assert.equal(isPublicationReceipt(receipt), true);
  assert.equal(isPublicationReceipt({ ok: false, failure: { status: "publication_failed" } }), false);
  assert.equal(
    isPublicationReceipt({ ...receipt, documentUrl: "https://evil.example/docs.google.com/document/x" }),
    false,
  );
  const dir = mkdtempSync(join(tmpdir(), "ff-handoff-"));
  writeFileSync(join(dir, "google-doc-receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
  assert.equal(readHandoffReceipt(dir).documentUrl, receipt.documentUrl);
  const failedDir = mkdtempSync(join(tmpdir(), "ff-handoff-fail-"));
  writeFileSync(join(failedDir, "google-doc-receipt.json"), `${JSON.stringify({ ok: false }, null, 2)}\n`);
  assert.throws(() => readHandoffReceipt(failedDir), (error: unknown) => error instanceof GoogleDocsError);
  const summary = formatPublishJobSummary(receipt);
  assert.match(summary, /https:\/\/docs\.google\.com\/document\/d\/doc123\/edit/);
  assert.match(formatPublishLogBanner(receipt.documentUrl), /REVIEW DOC/);
});

test("CLI write-publish-summary and assert-publish-run work without interpolating inputs", () => {
  const env = { ...process.env };
  delete env.GITHUB_ACTIONS;
  delete env.GITHUB_REF;
  const dir = mkdtempSync(join(tmpdir(), "ff-cli-handoff-"));
  writeFileSync(join(dir, "google-doc-receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
  const summaryPath = join(dir, "step-summary.md");
  env.GITHUB_STEP_SUMMARY = summaryPath;
  const summary = spawnSync(process.execPath, ["--import", "tsx", cli, "write-publish-summary", "--handoff-dir", dir], {
    cwd: repoRoot,
    env,
    encoding: "utf8",
  });
  assert.equal(summary.status, 0, summary.stderr);
  assert.match(summary.stdout, /https:\/\/docs\.google\.com\/document\/d\/doc123\/edit/);
  assert.match(readFileSync(summaryPath, "utf8"), /Review this Google Doc/);

  const runPath = join(dir, "publish-run.json");
  writeFileSync(runPath, `${JSON.stringify(trustedRun, null, 2)}\n`);
  const asserted = spawnSync(
    process.execPath,
    ["--import", "tsx", cli, "assert-publish-run", "--run-json", runPath, "--run-id", "34897339361"],
    { cwd: repoRoot, env, encoding: "utf8" },
  );
  assert.equal(asserted.status, 0, asserted.stderr);
  assert.match(asserted.stdout, /google-docs-publish\.yml/);

  const rejected = spawnSync(
    process.execPath,
    ["--import", "tsx", cli, "assert-publish-run", "--run-json", runPath, "--run-id", "1; rm -rf /"],
    { cwd: repoRoot, env, encoding: "utf8" },
  );
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /numeric GitHub Actions run id/);
});
