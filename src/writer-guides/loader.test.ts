import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { chdir } from "node:process";
import test from "node:test";
import {
  GUIDE_CATALOG,
  GUIDE_IDS,
  STAGE_GUIDE_IDS,
  WRITER_GUIDES_DIR,
  catalogEntry,
  defaultRepoRoot,
  loadCanonicalGuideCatalog,
  loadGuideById,
  loadGuidesByIds,
  loadWriterStageGuides,
  loadWritingAssignmentGuides,
  manifestHash,
  sha256Hex,
  stageGuideIds,
} from "./index.js";

const REPO_ROOT = defaultRepoRoot();

function withTempCatalog(mutate?: (root: string) => void): string {
  const root = mkdtempSync(join(tmpdir(), "ff-writer-guides-"));
  cpSync(join(REPO_ROOT, WRITER_GUIDES_DIR), join(root, WRITER_GUIDES_DIR), { recursive: true });
  mutate?.(root);
  return root;
}

test("catalog paths are exactly the six committed repo files", () => {
  assert.deepEqual(
    Object.fromEntries(GUIDE_IDS.map((id) => [id, GUIDE_CATALOG[id].relativePath])),
    {
      general: "docs/writer-guides/FLUID_FRAME_DEMO_WRITING_GUIDE.md",
      service: "docs/writer-guides/SERVICE_PAGE_GUIDE.md",
      homepage: "docs/writer-guides/HOMEPAGE_GUIDE.md",
      contact: "docs/writer-guides/CONTACT_PAGE_GUIDE.md",
      headerFooter: "docs/writer-guides/HEADER_FOOTER_GUIDE.md",
      readme: "docs/writer-guides/README.md",
    },
  );
});

test("stage manifests match Writer 1/2/3 and exclude the README discovery file", () => {
  assert.deepEqual(STAGE_GUIDE_IDS.writer1, ["general", "service"]);
  assert.deepEqual(STAGE_GUIDE_IDS.writer2, ["general", "homepage", "contact", "headerFooter"]);
  assert.deepEqual(STAGE_GUIDE_IDS.writer3, ["general"]);
  for (const stage of ["writer1", "writer2", "writer3"] as const) {
    assert.equal(stageGuideIds(stage).includes("readme"), false);
  }
});

test("unknown guide ids and stages fail closed", () => {
  assert.throws(() => catalogEntry("strategy"), /Unknown writer guide id: strategy/);
  assert.throws(() => catalogEntry("ff2-writing-guide"), /Unknown writer guide id/);
  assert.throws(() => stageGuideIds("writer4"), /Unknown writer stage: writer4/);
  assert.throws(() => loadGuideById("strategy"), /Unknown writer guide id: strategy/);
  assert.throws(() => loadWriterStageGuides("qa"), /Unknown writer stage: qa/);
  assert.throws(() => loadGuidesByIds(["general", "unknown"]), /Unknown writer guide id: unknown/);
});

test("loadCanonicalGuideCatalog reads exact on-disk Markdown and hashes deterministically", () => {
  const first = loadCanonicalGuideCatalog();
  const second = loadCanonicalGuideCatalog();
  assert.equal(first.guides.length, 6);
  assert.equal(first.manifestHash, second.manifestHash);
  assert.equal(first.manifestHash, "e1d7bc635cf8b7a29d08259d6ff57c4680b10fb25e76f4dd8ac15836ee6828ae");
  assert.deepEqual(
    Object.fromEntries(first.guides.map((guide) => [guide.id, guide.sha256])),
    {
      general: "80d0fcb85e1d8315ebbcfb8c91bd245d7bae37c4b796fdebfa41907c82c4e936",
      service: "92acecf52fd02adb971e3c88094a26f2e2646f9394771cb0f00e43a6b909d7d9",
      homepage: "417debb94ee2b7db33015dca0e3fdc28496d0957af8c76dd6e7d20772a7f2f0e",
      contact: "5613e7bb37ae021966da52a59cb0e264bfcec652776debee7bccf277cb3d336d",
      headerFooter: "69f38eb9523805ee5956d6f22f5c53644b4823fe7caac8d2652a37d054bc71ea",
      readme: "a667ba03bf628b19a089676f19988a3ad74be13a4300ee7ad341d67fa203ccf1",
    },
  );
  assert.match(first.manifestHash, /^[0-9a-f]{64}$/);
  for (const guide of first.guides) {
    assert.ok(guide.markdown.trim().length > 0, `${guide.id} empty`);
    assert.equal(guide.sha256, sha256Hex(guide.bytes));
    assert.equal(guide.markdown, guide.bytes.toString("utf8"));
    assert.equal(guide.relativePath, GUIDE_CATALOG[guide.id].relativePath);
    assert.equal(guide.absolutePath, join(REPO_ROOT, guide.relativePath));
    assert.equal(guide.markdown, readFileSync(guide.absolutePath, "utf8"));
    assert.ok(guide.headings.length > 0, `${guide.id} should expose derived headings`);
    assert.equal(guide.headings[0]?.level, 1);
  }
  assert.equal(manifestHash(first.members), first.manifestHash);
  assert.equal(manifestHash([...first.members].reverse()), first.manifestHash);
});

test("complete writing assignment loads all craft guides and keeps Writer 1/2/3 as internal phases", () => {
  const assignment = loadWritingAssignmentGuides();
  const writer1 = loadWriterStageGuides("writer1");
  const writer2 = loadWriterStageGuides("writer2");
  const writer3 = loadWriterStageGuides("writer3");
  assert.equal(assignment.assignment, "writing");
  assert.deepEqual(assignment.sourceIds, ["general", "service", "homepage", "contact", "headerFooter"]);
  assert.equal(assignment.guides.length, 5);
  assert.equal(assignment.phases.servicePages.setHash, writer1.setHash);
  assert.equal(assignment.phases.siteChrome.setHash, writer2.setHash);
  assert.equal(assignment.phases.strategyOverview.setHash, writer3.setHash);
  assert.equal(assignment.guides.some((guide) => guide.id === "readme"), false);
});

test("Writer 1/2/3 sets load from repo files with no provider and preserve raw Markdown", () => {
  const writer1 = loadWriterStageGuides("writer1");
  const writer2 = loadWriterStageGuides("writer2");
  const writer3 = loadWriterStageGuides("writer3");
  const catalog = loadCanonicalGuideCatalog();

  assert.deepEqual(writer1.sourceIds, ["general", "service"]);
  assert.deepEqual(writer2.sourceIds, ["general", "homepage", "contact", "headerFooter"]);
  assert.deepEqual(writer3.sourceIds, ["general"]);

  assert.equal(writer1.guides[0]?.markdown, catalog.guides.find((guide) => guide.id === "general")?.markdown);
  assert.equal(writer1.guides[1]?.markdown, catalog.guides.find((guide) => guide.id === "service")?.markdown);
  assert.equal(writer1.guides[0]?.markdown, readFileSync(join(REPO_ROOT, GUIDE_CATALOG.general.relativePath), "utf8"));
  assert.match(writer3.guides[0]?.markdown ?? "", /Fluid Frame Demo Writing Guide/);
  assert.match(writer1.guides[1]?.markdown ?? "", /Service Page Guide/);
  assert.match(writer2.guides[1]?.markdown ?? "", /Homepage Guide/);
  assert.match(writer2.guides[2]?.markdown ?? "", /Contact Page Guide/);
  assert.match(writer2.guides[3]?.markdown ?? "", /Header & Footer Guide/);

  assert.equal(writer1.catalogManifestHash, catalog.manifestHash);
  assert.equal(writer2.catalogManifestHash, catalog.manifestHash);
  assert.equal(writer3.catalogManifestHash, catalog.manifestHash);
  assert.equal(writer1.setHash, "7a35ce860e1f8ce2f009b7218c499525ba7b029999739cf3c0a5b6d34e8000d3");
  assert.equal(writer2.setHash, "6f4e1be8af2a7387a60b29302868fb9e1296a006e46cb3a1b0305c75c6912f78");
  assert.equal(writer3.setHash, "861164c966f05dfdb9a5d00977b47d7a4e928d08d5ac02e63872e73f511f9040");
  assert.notEqual(writer1.setHash, writer2.setHash);
  assert.notEqual(writer1.setHash, writer3.setHash);
  assert.notEqual(writer2.setHash, writer3.setHash);
  assert.equal(loadWriterStageGuides("writer1").setHash, writer1.setHash);
});

test("defaultRepoRoot is the factory repo root, not dist", () => {
  const root = defaultRepoRoot();
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { name?: string };
  assert.equal(pkg.name, "ff-content-demo-factory");
  assert.equal(root.endsWith(`${sep}dist`), false);
  assert.notEqual(root, join(root, "dist"));
  assert.equal(existsSync(join(root, "docs/writer-guides/FLUID_FRAME_DEMO_WRITING_GUIDE.md")), true);
  assert.equal(existsSync(join(root, "docs/writer-guides/README.md")), true);
  const loaderSource = readFileSync(join(root, "src/writer-guides/loader.ts"), "utf8");
  assert.equal(loaderSource.includes('new URL("../..", import.meta.url)'), false);
  assert.match(loaderSource, /REPO_ROOT_MAX_ASCENT/);
});

test("default repo root still resolves when cwd is elsewhere", () => {
  const previous = process.cwd();
  const elsewhere = mkdtempSync(join(tmpdir(), "ff-cwd-"));
  try {
    chdir(elsewhere);
    const loaded = loadWriterStageGuides("writer3");
    assert.equal(loaded.repoRoot, REPO_ROOT);
    assert.match(loaded.guides[0]?.markdown ?? "", /Fluid Frame Demo Writing Guide/);
  } finally {
    chdir(previous);
    rmSync(elsewhere, { recursive: true, force: true });
  }
});

test("missing, empty, and whitespace-only guides fail closed", () => {
  const missing = withTempCatalog((root) => {
    rmSync(join(root, "docs/writer-guides/SERVICE_PAGE_GUIDE.md"));
  });
  const empty = withTempCatalog((root) => {
    writeFileSync(join(root, "docs/writer-guides/HOMEPAGE_GUIDE.md"), "");
  });
  const whitespace = withTempCatalog((root) => {
    writeFileSync(join(root, "docs/writer-guides/CONTACT_PAGE_GUIDE.md"), " \n\t\n");
  });
  const absentDir = mkdtempSync(join(tmpdir(), "ff-writer-guides-none-"));

  try {
    assert.throws(
      () => loadCanonicalGuideCatalog({ repoRoot: missing }),
      /Canonical writer guide is missing: service/,
    );
    assert.throws(
      () => loadWriterStageGuides("writer2", { repoRoot: missing }),
      /Canonical writer guide is missing: service/,
    );
    assert.throws(
      () => loadWriterStageGuides("writer2", { repoRoot: empty }),
      /Canonical writer guide is empty: homepage/,
    );
    assert.throws(
      () => loadWriterStageGuides("writer1", { repoRoot: whitespace }),
      /Canonical writer guide is empty: contact/,
    );
    assert.throws(
      () => loadCanonicalGuideCatalog({ repoRoot: absentDir }),
      /Canonical writer guide is missing: general/,
    );
  } finally {
    rmSync(missing, { recursive: true, force: true });
    rmSync(empty, { recursive: true, force: true });
    rmSync(whitespace, { recursive: true, force: true });
    rmSync(absentDir, { recursive: true, force: true });
  }
});

test("tampered guide bytes change hashes and do not match the canonical catalog", () => {
  const canonical = loadCanonicalGuideCatalog();
  const tampered = withTempCatalog((root) => {
    writeFileSync(
      join(root, "docs/writer-guides/FLUID_FRAME_DEMO_WRITING_GUIDE.md"),
      `${canonical.guides[0]?.markdown ?? ""}\n\n# Tampered\n`,
    );
  });
  try {
    const loaded = loadCanonicalGuideCatalog({ repoRoot: tampered });
    const general = loaded.guides.find((guide) => guide.id === "general");
    assert.ok(general);
    assert.notEqual(general.sha256, canonical.guides.find((guide) => guide.id === "general")?.sha256);
    assert.notEqual(loaded.manifestHash, canonical.manifestHash);
    assert.match(general.markdown, /# Tampered/);
  } finally {
    rmSync(tampered, { recursive: true, force: true });
  }
});

test("path traversal and non-file catalog entries fail closed", () => {
  assert.throws(() => catalogEntry("../secrets"), /Unknown writer guide id/);
  const asDir = withTempCatalog((root) => {
    rmSync(join(root, "docs/writer-guides/README.md"));
    mkdirSync(join(root, "docs/writer-guides/README.md"));
  });
  try {
    assert.throws(
      () => loadCanonicalGuideCatalog({ repoRoot: asDir }),
      /Canonical writer guide is not a file: readme/,
    );
  } finally {
    rmSync(asDir, { recursive: true, force: true });
  }
});
