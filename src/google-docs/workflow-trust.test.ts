import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { APPROVED_COPY_ROOT, TRUSTED_REF, assertRepoRelativeInputPath, assertTrustedGithubRef, resolveApprovedSnapshotDir } from "./trust.js";
import { GoogleDocsError } from "./errors.js";
import {
  APPROVE_WORKFLOW_FILE,
  PUBLISH_ARTIFACT_NAME,
  PUBLISH_HANDOFF_DIR,
  PUBLISH_LIFECYCLE_FILENAME,
  PUBLISH_RECEIPT_FILENAME,
  PUBLISH_WORKFLOW_FILE,
} from "./publish-handoff.js";
import { extractGithubActionsRunBodies, runBodiesContainWorkflowInputs } from "./workflow-yaml.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

function workflow(name: string): string {
  return readFileSync(join(repoRoot, ".github/workflows", name), "utf8");
}

test("publish workflow fails closed to main and is read-only for the repo", () => {
  const yaml = workflow("google-docs-publish.yml");
  assert.match(yaml, /if:\s*github\.ref == 'refs\/heads\/main'/);
  assert.match(yaml, /Enforce trusted ref/);
  assert.match(yaml, /ref:\s*main/);
  assert.match(yaml, /contents:\s*read/);
  assert.match(yaml, /actions:\s*write/);
  assert.equal(/contents:\s*write/.test(yaml), false);
  assert.equal(/pull_request:/.test(yaml), false);
  assert.match(yaml, /persist-credentials:\s*false/);
  assert.ok(yaml.indexOf("Enforce trusted ref") < yaml.indexOf("actions/checkout"));
});

test("approve workflow fails closed to main, checks out main, and only writes approved-copy", () => {
  const yaml = workflow("google-docs-approve.yml");
  assert.match(yaml, /if:\s*github\.ref == 'refs\/heads\/main'/);
  assert.match(yaml, /Enforce trusted ref/);
  assert.match(yaml, /ref:\s*main/);
  assert.match(yaml, /actions:\s*read/);
  assert.match(yaml, /git add -- "approved-copy"/);
  assert.match(yaml, /git push origin HEAD:main/);
  assert.equal(/snapshot_dir/.test(yaml), false);
  assert.equal(/git add "\$\{\{ inputs\./.test(yaml), false);
  assert.equal(/pull_request:/.test(yaml), false);
  assert.ok(yaml.indexOf("Enforce trusted ref") < yaml.indexOf("actions/checkout"));
  assert.match(yaml, /--prospect-id "\$\{PROSPECT_ID\}"/);
});

test("secret-bearing workflows never interpolate workflow_dispatch inputs into run bodies", () => {
  const publish = workflow("google-docs-publish.yml");
  const approve = workflow("google-docs-approve.yml");
  assert.equal(runBodiesContainWorkflowInputs(publish), false);
  assert.equal(runBodiesContainWorkflowInputs(approve), false);
  assert.equal(publish.includes("${{ inputs."), true);
  assert.equal(approve.includes("${{ inputs."), true);
  assert.match(publish, /PACKAGE_PATH:\s*\$\{\{ inputs\.package_path \}\}/);
  assert.match(publish, /LIFECYCLE_PATH:\s*\$\{\{ inputs\.lifecycle_path \}\}/);
  assert.match(publish, /NEW_REVIEW_VERSION:\s*\$\{\{ inputs\.new_review_version \}\}/);
  assert.match(approve, /PACKAGE_PATH:\s*\$\{\{ inputs\.package_path \}\}/);
  assert.match(approve, /PUBLISH_RUN_ID:\s*\$\{\{ inputs\.publish_run_id \}\}/);
  assert.match(approve, /PROSPECT_ID:\s*\$\{\{ inputs\.prospect_id \}\}/);
  for (const body of [...extractGithubActionsRunBodies(publish), ...extractGithubActionsRunBodies(approve)]) {
    assert.equal(body.includes("${{ inputs."), false);
  }
});

test("publish uploads a durable artifact and approve downloads it from a trusted run id", () => {
  const publish = workflow("google-docs-publish.yml");
  const approve = workflow("google-docs-approve.yml");
  assert.match(publish, new RegExp(`name:\\s*${PUBLISH_ARTIFACT_NAME}`));
  assert.match(publish, /uses:\s*actions\/upload-artifact@v4/);
  assert.match(publish, new RegExp(`path:\\s*${PUBLISH_HANDOFF_DIR}`));
  assert.match(publish, new RegExp(`receipt-out ${PUBLISH_HANDOFF_DIR}/${PUBLISH_RECEIPT_FILENAME}`));
  assert.match(publish, new RegExp(`lifecycle-out ${PUBLISH_HANDOFF_DIR}/${PUBLISH_LIFECYCLE_FILENAME}`));
  assert.match(publish, /google-docs:write-publish-summary/);
  assert.match(publish, /GITHUB_STEP_SUMMARY|write-publish-summary/);
  assert.match(approve, /uses:\s*actions\/download-artifact@v4/);
  assert.match(approve, new RegExp(`name:\\s*${PUBLISH_ARTIFACT_NAME}`));
  assert.match(approve, /run-id:\s*\$\{\{ inputs\.publish_run_id \}\}/);
  assert.match(approve, /google-docs:assert-publish-run/);
  assert.equal(/receipt_path:/.test(approve), false);
  assert.match(approve, /publish_run_id:/);
  assert.equal(PUBLISH_WORKFLOW_FILE, ".github/workflows/google-docs-publish.yml");
  assert.equal(APPROVE_WORKFLOW_FILE, ".github/workflows/google-docs-approve.yml");
});

test("approved snapshot paths cannot escape approved-copy", () => {
  const ok = resolveApprovedSnapshotDir("oak-iron-plumbing", repoRoot);
  assert.equal(ok.relativeDir, `${APPROVED_COPY_ROOT}/oak-iron-plumbing`);
  assert.throws(() => resolveApprovedSnapshotDir("../.github"), (error: unknown) => {
    assert.ok(error instanceof GoogleDocsError);
    return true;
  });
  assert.throws(() => assertRepoRelativeInputPath("../.github/workflows", "package"), (error: unknown) => {
    assert.ok(error instanceof GoogleDocsError);
    return true;
  });
  assert.equal(TRUSTED_REF, "refs/heads/main");
});

test("Actions jobs fail closed unless GITHUB_REF is the trusted main ref", () => {
  const previousActions = process.env.GITHUB_ACTIONS;
  const previousRef = process.env.GITHUB_REF;
  process.env.GITHUB_ACTIONS = "true";
  try {
    assert.throws(() => assertTrustedGithubRef("refs/heads/feature-branch"), (error: unknown) => {
      assert.ok(error instanceof GoogleDocsError);
      assert.equal(error.code, "authorization_failed");
      return true;
    });
    assert.doesNotThrow(() => assertTrustedGithubRef(TRUSTED_REF));
  } finally {
    if (previousActions === undefined) delete process.env.GITHUB_ACTIONS;
    else process.env.GITHUB_ACTIONS = previousActions;
    if (previousRef === undefined) delete process.env.GITHUB_REF;
    else process.env.GITHUB_REF = previousRef;
  }
});
