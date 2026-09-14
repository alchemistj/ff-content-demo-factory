import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { APPROVED_COPY_ROOT, TRUSTED_REF, assertRepoRelativeInputPath, assertTrustedGithubRef, resolveApprovedSnapshotDir } from "./trust.js";
import { GoogleDocsError } from "./errors.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

function workflow(name: string): string {
  return readFileSync(join(repoRoot, ".github/workflows", name), "utf8");
}

test("publish workflow fails closed to main and is read-only", () => {
  const yaml = workflow("google-docs-publish.yml");
  assert.match(yaml, /if:\s*github\.ref == 'refs\/heads\/main'/);
  assert.match(yaml, /Enforce trusted ref/);
  assert.match(yaml, /ref:\s*main/);
  assert.match(yaml, /contents:\s*read/);
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
  assert.match(yaml, /git add -- "approved-copy"/);
  assert.match(yaml, /git push origin HEAD:main/);
  assert.equal(/snapshot_dir/.test(yaml), false);
  assert.equal(/git add "\$\{\{ inputs\./.test(yaml), false);
  assert.equal(/pull_request:/.test(yaml), false);
  assert.ok(yaml.indexOf("Enforce trusted ref") < yaml.indexOf("actions/checkout"));
  assert.match(yaml, /--prospect-id/);
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
