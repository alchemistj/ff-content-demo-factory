import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { defaultRepoRoot } from "./index.js";

const REPO_ROOT = defaultRepoRoot();
const SCRIPT = resolve(REPO_ROOT, "scripts/assert-compiled-writer-guides.mjs");
const EXPECTED_MANIFEST =
  "e1d7bc635cf8b7a29d08259d6ff57c4680b10fb25e76f4dd8ac15836ee6828ae";

test("compiled dist export loads Writer 1/2/3 from repo-root Markdown", () => {
  const childEnv = { ...process.env };
  delete childEnv.NODE_OPTIONS;

  const build = spawnSync("npm", ["run", "build"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: childEnv,
  });
  assert.equal(build.status, 0, `npm run build failed\n${build.stdout}\n${build.stderr}`);

  const elsewhere = mkdtempSync(join(tmpdir(), "ff-compiled-cwd-"));
  try {
    const result = spawnSync(process.execPath, [SCRIPT], {
      cwd: elsewhere,
      encoding: "utf8",
      env: childEnv,
    });
    assert.equal(
      result.status,
      0,
      `compiled-package acceptance failed (cwd=${elsewhere})\n${result.stdout}\n${result.stderr}`,
    );
    const receipt = JSON.parse(result.stdout) as {
      ok: boolean;
      cwd: string;
      repoRoot: string;
      distDocsPresent: boolean;
      catalogManifestHash: string;
      stageSetHashes: { writer1: string; writer2: string; writer3: string };
      absolutePaths: string[];
    };
    assert.equal(receipt.ok, true);
    assert.equal(receipt.cwd, elsewhere);
    assert.equal(receipt.repoRoot, REPO_ROOT);
    assert.equal(receipt.distDocsPresent, false);
    assert.equal(receipt.catalogManifestHash, EXPECTED_MANIFEST);
    assert.equal(
      receipt.stageSetHashes.writer1,
      "7a35ce860e1f8ce2f009b7218c499525ba7b029999739cf3c0a5b6d34e8000d3",
    );
    assert.equal(
      receipt.stageSetHashes.writer2,
      "6f4e1be8af2a7387a60b29302868fb9e1296a006e46cb3a1b0305c75c6912f78",
    );
    assert.equal(
      receipt.stageSetHashes.writer3,
      "861164c966f05dfdb9a5d00977b47d7a4e928d08d5ac02e63872e73f511f9040",
    );
    for (const absolutePath of receipt.absolutePaths) {
      assert.equal(absolutePath.startsWith(join(REPO_ROOT, "docs/writer-guides") + "/"), true);
      assert.equal(absolutePath.includes("/dist/docs/"), false);
      assert.equal(readFileSync(absolutePath, "utf8").trim().length > 0, true);
    }
  } finally {
    rmSync(elsewhere, { recursive: true, force: true });
  }
});
