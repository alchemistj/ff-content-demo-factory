#!/usr/bin/env node
/**
 * Fresh-process compiled-package acceptance for Issue #23 / PR #24.
 *
 * Imports the advertised `dist` package exports (not tsx/source), loads
 * Writer 1/2/3 with HTTP/HTTPS/fetch disabled, and proves the default
 * loader reads repo-root `docs/writer-guides/` rather than `dist/docs/`.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const EXPECTED_MANIFEST =
  "569bf4d57648b3323ac9ed3d4a6773c5fdba84fa3bb5913e354a206babcb83bb";
const EXPECTED_GUIDE_SHA256 = Object.freeze({
  general: "46aa8d8ac384abaf6b01d4737997c227d757f4298432437d00454ffa99f354f2",
  service: "b013b5b962411c67a565e2d681c2fd71ae95d3447fb5cbd190d8d67e148e1bc7",
  homepage: "3e1b492b80e6f101613d924fad366805ced4918e7892438e827e0946016017cc",
  contact: "4cdaf7f6c7724aa6b052aad21f898817f0b5ef059750023a92a967cd59ddf574",
  headerFooter: "6df297ba5cc076382950de2df7161494c64c76db6af644fba717284640bfa8df",
  readme: "671712749521c34233f126cc78c8917e86576692c6effab9007f5b49e9cd2764",
});
const EXPECTED_SET_HASH = Object.freeze({
  writer1: "49073fba8c34b5f90bbfaef484b4357acea3bf75f912ba65d5a33b80b4e8ea12",
  writer2: "65e55d628e53492b8108ab0e2f21bf84f1fa2ed145a3892be3673276c6dc7486",
  writer3: "6e32befedc8dc09615c9443781c0ad0c30759f72d019302a50e7ac0b03321fb9",
});

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
assert.equal(pkg.name, "ff-content-demo-factory");
assert.equal(pkg.exports?.["."], "./dist/src/index.js");
assert.equal(pkg.exports?.["./writer-guides"], "./dist/src/writer-guides/index.js");

const mainExportPath = join(repoRoot, pkg.exports["."]);
const guidesExportPath = join(repoRoot, pkg.exports["./writer-guides"]);
assert.equal(existsSync(mainExportPath), true, `missing compiled main export: ${mainExportPath}`);
assert.equal(existsSync(guidesExportPath), true, `missing compiled writer-guides export: ${guidesExportPath}`);
assert.equal(existsSync(join(repoRoot, "dist/docs/writer-guides")), false);

const block = () => {
  throw new Error("network is disabled for compiled writer-guide loading");
};
http.request = block;
https.request = block;
globalThis.fetch = block;

const main = await import(pathToFileURL(mainExportPath).href);
const guides = await import(pathToFileURL(guidesExportPath).href);

assert.equal(typeof main.loadWriterStageGuides, "function");
assert.equal(typeof main.loadCanonicalGuideCatalog, "function");
assert.equal(typeof main.defaultRepoRoot, "function");
assert.equal(typeof guides.loadWriterStageGuides, "function");
assert.equal(typeof guides.defaultRepoRoot, "function");

const discoveredRoot = guides.defaultRepoRoot();
assert.equal(discoveredRoot, repoRoot);
assert.equal(main.defaultRepoRoot(), repoRoot);
assert.equal(discoveredRoot.endsWith(`${sep}dist`), false);
assert.notEqual(discoveredRoot, join(repoRoot, "dist"));

const catalog = guides.loadCanonicalGuideCatalog();
assert.equal(catalog.repoRoot, repoRoot);
assert.equal(catalog.guides.length, 6);
assert.equal(catalog.manifestHash, EXPECTED_MANIFEST);

const byId = Object.fromEntries(catalog.guides.map((guide) => [guide.id, guide.sha256]));
assert.deepEqual(byId, EXPECTED_GUIDE_SHA256);

for (const guide of catalog.guides) {
  const canonicalPath = join(repoRoot, guide.relativePath);
  assert.equal(guide.absolutePath, canonicalPath);
  assert.equal(guide.absolutePath.includes(`${sep}dist${sep}docs${sep}`), false);
  assert.equal(guide.markdown, readFileSync(canonicalPath, "utf8"));
  assert.ok(guide.markdown.trim().length > 0, `${guide.id} empty`);
}

const writer1 = main.loadWriterStageGuides("writer1");
const writer2 = guides.loadWriterStageGuides("writer2");
const writer3 = main.loadWriterStageGuides("writer3");

assert.deepEqual(writer1.sourceIds, ["general", "service"]);
assert.deepEqual(writer2.sourceIds, ["general", "homepage", "contact", "headerFooter"]);
assert.deepEqual(writer3.sourceIds, ["general"]);
assert.equal(writer1.setHash, EXPECTED_SET_HASH.writer1);
assert.equal(writer2.setHash, EXPECTED_SET_HASH.writer2);
assert.equal(writer3.setHash, EXPECTED_SET_HASH.writer3);
assert.equal(writer1.catalogManifestHash, EXPECTED_MANIFEST);
assert.equal(writer2.catalogManifestHash, EXPECTED_MANIFEST);
assert.equal(writer3.catalogManifestHash, EXPECTED_MANIFEST);
assert.equal(writer1.repoRoot, repoRoot);
assert.equal(writer2.repoRoot, repoRoot);
assert.equal(writer3.repoRoot, repoRoot);
assert.equal(writer1.guides[0]?.absolutePath, join(repoRoot, "docs/writer-guides/FLUID_FRAME_DEMO_WRITING_GUIDE.md"));
assert.equal(writer1.guides[1]?.absolutePath, join(repoRoot, "docs/writer-guides/SERVICE_PAGE_GUIDE.md"));
assert.match(writer1.guides[1]?.markdown ?? "", /Service Page Guide/);
assert.match(writer2.guides[1]?.markdown ?? "", /Homepage Guide/);
assert.match(writer2.guides[2]?.markdown ?? "", /Contact Page Guide/);
assert.match(writer2.guides[3]?.markdown ?? "", /Header & Footer Guide/);
assert.match(writer3.guides[0]?.markdown ?? "", /Fluid Frame Demo Writing Guide/);

const receipt = {
  ok: true,
  cwd: process.cwd(),
  repoRoot: discoveredRoot,
  compiledMainExport: pkg.exports["."],
  compiledWriterGuidesExport: pkg.exports["./writer-guides"],
  distDocsPresent: existsSync(join(repoRoot, "dist/docs/writer-guides")),
  catalogManifestHash: catalog.manifestHash,
  guideSha256: byId,
  stageSetHashes: {
    writer1: writer1.setHash,
    writer2: writer2.setHash,
    writer3: writer3.setHash,
  },
  absolutePaths: catalog.guides.map((guide) => guide.absolutePath),
};

process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
