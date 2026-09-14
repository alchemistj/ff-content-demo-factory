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
  "fe2ed31e4148922270a8a05b684526968299e08c76d025a8fe2ba9ca62b4bf25";

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
      "0ec0ffd88c8f1d362155e786cabd48e7ecf2e211282e0bd86ecd037f84ddd4c2",
    );
    assert.equal(
      receipt.stageSetHashes.writer2,
      "bf52fc6ae18185f8660e95c442da979fb20244d563f0062778e4a8a383cbc6ad",
    );
    assert.equal(
      receipt.stageSetHashes.writer3,
      "7b8de953190d9949cd8af92f4b6b8fa7bea6428a401d88bb7f672714b8fca302",
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
