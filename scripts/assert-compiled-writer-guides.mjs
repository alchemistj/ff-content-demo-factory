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
  "2c539a6ed359a4033ab3d62bbc66064f07a448bd745775665f88e6bed0e85617";
const EXPECTED_GUIDE_SHA256 = Object.freeze({
  general: "cd54af56ab604efd62cd12355f3bc64c309d9c9677fd4e0592e23f2a87292abe",
  service: "c2225e3e5561ec69de4f3738dbf2b75a9b8d60fecc24bfc2e5c39f9915b1cfb5",
  homepage: "0c3292f44a0e855844f5c91d89f451398a86c91acfe3acf38cc61d6bf57721ea",
  contact: "a4480f190e2744e1350fc03aa9e343c5278e7cd68c2e25386f84cc65b8d59e4d",
  headerFooter: "9f6192c2e126581a3ce1aefcf5d632c00583fe9bb8201aafe81ec3c14d8fa5f8",
  readme: "cd058eeb9601746ba13eeae1efac4e195f2ad6d97acb6b1bc36f90ed80b7a726",
});
const EXPECTED_SET_HASH = Object.freeze({
  writer1: "23c797572e419b69fccbf4b306eff7203a58ed570b101434bdee9b6944db86f7",
  writer2: "bf52fc6ae18185f8660e95c442da979fb20244d563f0062778e4a8a383cbc6ad",
  writer3: "7b8de953190d9949cd8af92f4b6b8fa7bea6428a401d88bb7f672714b8fca302",
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

const distLoaderPath = join(repoRoot, "dist/src/writer-guides/loader.js");
const naiveFromCompiledLoader = resolve(dirname(distLoaderPath), "../..");
assert.equal(naiveFromCompiledLoader, join(repoRoot, "dist"));
assert.equal(existsSync(join(naiveFromCompiledLoader, "docs/writer-guides")), false);

const discoveredRoot = guides.defaultRepoRoot();
assert.equal(discoveredRoot, repoRoot);
assert.equal(main.defaultRepoRoot(), repoRoot);
assert.equal(discoveredRoot.endsWith(`${sep}dist`), false);
assert.notEqual(discoveredRoot, join(repoRoot, "dist"));
assert.notEqual(discoveredRoot, naiveFromCompiledLoader);

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
