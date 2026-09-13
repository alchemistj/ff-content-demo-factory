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
  "569bf4d57648b3323ac9ed3d4a6773c5fdba84fa3bb5913e354a206babcb83bb";

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
      "49073fba8c34b5f90bbfaef484b4357acea3bf75f912ba65d5a33b80b4e8ea12",
    );
    assert.equal(
      receipt.stageSetHashes.writer2,
      "65e55d628e53492b8108ab0e2f21bf84f1fa2ed145a3892be3673276c6dc7486",
    );
    assert.equal(
      receipt.stageSetHashes.writer3,
      "6e32befedc8dc09615c9443781c0ad0c30759f72d019302a50e7ac0b03321fb9",
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
