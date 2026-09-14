#!/usr/bin/env node
/**
 * Read-only clone of the three Springfield source repositories at the
 * pinned refs in src/approved-copy/provenance.ts.
 *
 * Does not modify those remotes. Intended for a runtime whose GitHub token
 * can read alchemistj/window-dudes, greene-planet-website, and
 * sra-roofing-website.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const REFS = [
  {
    name: "window-dudes",
    repository: "alchemistj/window-dudes",
    ref: "main",
    sha: "5a3019ac2f9c89e588ff03bb916aca3b4476a2e5",
  },
  {
    name: "greene-planet",
    repository: "alchemistj/greene-planet-website",
    ref: "main",
    sha: "f9047501d167bd4977a61012d519ae06e9a169c8",
  },
  {
    name: "sra",
    repository: "alchemistj/sra-roofing-website",
    ref: "reconcile/sra-local-recovery-2026-09-09",
    sha: "f3f22a8154555cc762593c41947a5f2c6d4a2832",
  },
];

const destRoot = process.argv[2] || "/tmp/ff-sources";
mkdirSync(destRoot, { recursive: true });

let failed = false;
for (const repo of REFS) {
  const dest = join(destRoot, repo.name);
  rmSync(dest, { recursive: true, force: true });
  const clone = spawnSync(
    "git",
    ["clone", "--no-tags", `https://github.com/${repo.repository}.git`, dest],
    { encoding: "utf8" },
  );
  if (clone.status !== 0) {
    failed = true;
    process.stderr.write(
      `clone failed for ${repo.repository}:\n${clone.stderr || clone.stdout}\n`,
    );
    continue;
  }
  const checkout = spawnSync("git", ["checkout", "--detach", repo.sha], {
    cwd: dest,
    encoding: "utf8",
  });
  if (checkout.status !== 0) {
    failed = true;
    process.stderr.write(
      `checkout ${repo.sha} failed for ${repo.repository}:\n${checkout.stderr || checkout.stdout}\n`,
    );
    continue;
  }
  const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: dest, encoding: "utf8" });
  process.stdout.write(`${repo.repository} ${head.stdout.trim()} (${repo.ref})\n`);
}

process.exit(failed ? 1 : 0);
