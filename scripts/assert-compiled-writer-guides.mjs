#!/usr/bin/env node
/**
 * Fresh-process compiled-package acceptance for the integrated Content Factory.
 *
 * Imports the advertised `dist` package exports (not tsx/source), loads
 * writing-assignment guides with HTTP/HTTPS/fetch disabled, and proves the
 * default loader reads repo-root `docs/writer-guides/` rather than `dist/docs/`.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const EXPECTED_MANIFEST =
  "0a360d43f873a47d94788472694e8e30ceb5ab8c5e33d3e12bb6725ecf7db1b1";
const EXPECTED_GUIDE_SHA256 = Object.freeze({
  general: "136744acf8591b7d5fae6343f0da4502ea6890f954fc7a25dedf797496e4bbe9",
  service: "972bd08d862ee8df655b2c495de31286ce6dd8f9962a068c8ec8588fc08b3bd7",
  homepage: "407e55b87719e9476ace07d61d3143421a2be3465b509fab5d86dd6115d5176b",
  contact: "07b8e35e68e68fadb93f5e194fef5c6580b5eac0a97ab1749b5603fb38aa2a02",
  headerFooter: "fdb9d43b593bbcf6a0b1de4d7f1d88e87b701e51231e96ac6fed4e879706c22c",
  readme: "34d572bd5602d6a03e8d207439f0c4a49cd3218c6568341d8d23f529af355383",
});
const EXPECTED_SET_HASH = Object.freeze({
  writer1: "fc99fd77d3931c4a3f413337844c5b309f9d3f2215ffedfb10a4db18323ef4de",
  writer2: "c1dd23c52627da14036c70bea588e026c0c4ce457c694b78070fd4e062b33ef0",
  writer3: "4898d43999afce020c7fb476d6cfd0efcfd5e5750b793e22bc90ebaed6f04e0e",
});

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
assert.equal(pkg.name, "ff-content-demo-factory");
assert.equal(pkg.exports?.["."], "./dist/src/index.js");
assert.equal(pkg.exports?.["./writer-guides"], "./dist/src/writer-guides/index.js");
assert.equal(pkg.exports?.["./approved-copy"], "./dist/src/approved-copy/index.js");
assert.equal(pkg.exports?.["./google-docs"], "./dist/src/google-docs/index.js");
assert.equal(pkg.exports?.["./writing-package"], "./dist/src/writing-package/index.js");
assert.equal(pkg.exports?.["./workflow"], "./dist/src/workflow/index.js");

const mainExportPath = join(repoRoot, pkg.exports["."]);
const guidesExportPath = join(repoRoot, pkg.exports["./writer-guides"]);
const approvedCopyExportPath = join(repoRoot, pkg.exports["./approved-copy"]);
const googleDocsExportPath = join(repoRoot, pkg.exports["./google-docs"]);
const writingPackageExportPath = join(repoRoot, pkg.exports["./writing-package"]);
assert.equal(existsSync(mainExportPath), true, `missing compiled main export: ${mainExportPath}`);
assert.equal(existsSync(guidesExportPath), true, `missing compiled writer-guides export: ${guidesExportPath}`);
assert.equal(existsSync(approvedCopyExportPath), true, `missing compiled approved-copy export: ${approvedCopyExportPath}`);
assert.equal(existsSync(googleDocsExportPath), true, `missing compiled google-docs export: ${googleDocsExportPath}`);
assert.equal(existsSync(writingPackageExportPath), true, `missing compiled writing-package export: ${writingPackageExportPath}`);
assert.equal(existsSync(join(repoRoot, "dist/docs/writer-guides")), false);

const block = () => {
  throw new Error("network is disabled for compiled writer-guide loading");
};
http.request = block;
https.request = block;
globalThis.fetch = block;

const main = await import(pathToFileURL(mainExportPath).href);
const guides = await import(pathToFileURL(guidesExportPath).href);
const approvedCopy = await import(pathToFileURL(approvedCopyExportPath).href);
const writingPackage = await import(pathToFileURL(writingPackageExportPath).href);
const googleDocs = await import(pathToFileURL(googleDocsExportPath).href);

assert.equal(typeof main.loadWriterStageGuides, "function");
assert.equal(typeof main.loadCanonicalGuideCatalog, "function");
assert.equal(typeof main.loadWritingAssignmentGuides, "function");
assert.equal(typeof main.loadApprovedCopyCatalog, "function");
assert.equal(typeof main.discoverAssignment, "function");
assert.equal(typeof main.runFactory, "function");
assert.equal(typeof main.retryPublication, "function");
assert.equal(typeof main.createGoogleDocsPublisher, "function");
assert.equal(typeof main.defaultRepoRoot, "function");
assert.equal(typeof guides.loadWriterStageGuides, "function");
assert.equal(typeof guides.defaultRepoRoot, "function");
assert.equal(typeof approvedCopy.loadApprovedCopyCatalog, "function");
assert.equal(approvedCopy.EXAMPLE_IDS.length, 12);
assert.equal(writingPackage.WRITING_PACKAGE_SCHEMA_VERSION, "writing-package/v1");
assert.equal(typeof writingPackage.parseWritingPackage, "function");
assert.equal(typeof writingPackage.buildWritingPackage, "function");
assert.equal(typeof writingPackage.hashWritingPackage, "function");
assert.equal(typeof googleDocs.createGoogleDocsPublisher, "function");
assert.equal(typeof googleDocs.parseWritingPackage, "function");

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
const writing = main.loadWritingAssignmentGuides();
const examples = approvedCopy.loadApprovedCopyCatalog();

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
assert.equal(writing.assignment, "writing");
assert.deepEqual(writing.sourceIds, ["general", "service", "homepage", "contact", "headerFooter"]);
assert.equal(writing.phases.servicePages.setHash, writer1.setHash);
assert.equal(writing.phases.siteChrome.setHash, writer2.setHash);
assert.equal(writing.phases.strategyOverview.setHash, writer3.setHash);
assert.equal(examples.examples.length, 12);
assert.equal(
  examples.examples.some((example) => example.relativePath.endsWith("README.md")),
  false,
);
assert.equal(
  examples.examples.some((example) => example.relativePath.includes("_chrome.md")),
  false,
);

const receipt = {
  ok: true,
  cwd: process.cwd(),
  repoRoot: discoveredRoot,
  compiledMainExport: pkg.exports["."],
  compiledWriterGuidesExport: pkg.exports["./writer-guides"],
  compiledApprovedCopyExport: pkg.exports["./approved-copy"],
  compiledWritingPackageExport: pkg.exports["./writing-package"],
  compiledGoogleDocsExport: pkg.exports["./google-docs"],
  distDocsPresent: existsSync(join(repoRoot, "dist/docs/writer-guides")),
  catalogManifestHash: catalog.manifestHash,
  guideSha256: byId,
  stageSetHashes: {
    writer1: writer1.setHash,
    writer2: writer2.setHash,
    writer3: writer3.setHash,
  },
  exampleIds: examples.examples.map((example) => example.id),
  absolutePaths: catalog.guides.map((guide) => guide.absolutePath),
};

process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
