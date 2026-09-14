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
  "942c567fc7011f8d7576ce84dedfc679705d323dbe2039aa77cb7e975c7ad37e";

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
      "b6b4bfa27be4bfde1a6a25e8a3547973a3c75ccf5e8e47137b3d4094dbb32206",
    );
    assert.equal(
      receipt.stageSetHashes.writer2,
      "082eb65038fbe8e68c18c14e17ff5c128bbfa24ac17ec6705c21353347a125e8",
    );
    assert.equal(
      receipt.stageSetHashes.writer3,
      "395d11721da5ebab45d57fb76f1a77580d904b863bb177310305421a99b23ed1",
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
