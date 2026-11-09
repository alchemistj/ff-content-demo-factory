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
  "fcb3b58b88eeb384ddabb45f94f148ba37fcfa5353f9a4588c0b980a63f4df75";

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
      "f04d468847edb6ca5307ae5a642eca942a0268e1e3cf59cc1977a0811a603c6f",
    );
    assert.equal(
      receipt.stageSetHashes.writer2,
      "71e9115c70bc852c85e8bf25970155d501a9a79b5463af784a60a2262a4d3fae",
    );
    assert.equal(
      receipt.stageSetHashes.writer3,
      "5bbc190a9cdbecb5ebc25852f7b27f575a73c0d17d012186fb78c7a4b8c0d773",
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
