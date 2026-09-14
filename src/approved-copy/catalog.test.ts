import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  EXAMPLE_CATALOG,
  EXAMPLE_IDS,
  EXPECTED_COMPLETE_EXAMPLE_IDS,
  REQUIRED_CLIENT_REFS,
  SRA_REVIEWED_PREVIEW_ORIGIN,
  captureUrlFor,
  loadApprovedCopyCatalog,
  loadExampleById,
  provenanceHasTruthfulIdentity,
} from "./index.js";
import { loadCanonicalGuideCatalog, loadWriterStageGuides, defaultRepoRoot } from "../writer-guides/index.js";

const FORBIDDEN_PROSE = [
  "className=",
  "export default",
  "import {",
  "\"@type\"",
  "SELECT ",
];

const PLACEHOLDER_MARKERS = [
  "pending-git",
  "This slot is not an approved example",
  "source not available",
  "SHA unavailable",
];

const MANIFEST_PATH = "examples/approved-copy/SOURCE_MANIFEST.md";

function manifestText(repoRoot = defaultRepoRoot()): string {
  return readFileSync(join(repoRoot, MANIFEST_PATH), "utf8");
}

test("approved-copy catalog is the exact twelve-page Springfield set", () => {
  assert.deepEqual([...EXAMPLE_IDS], [
    "wd-home",
    "wd-glass",
    "wd-replace",
    "wd-contact",
    "sra-home",
    "sra-replace",
    "sra-maint",
    "sra-contact",
    "gp-home",
    "gp-inspect",
    "gp-black",
    "gp-contact",
  ]);
  assert.equal((EXAMPLE_IDS as readonly string[]).includes("wd-repair"), false);
  assert.equal(EXPECTED_COMPLETE_EXAMPLE_IDS.length, 12);
  assert.equal(EXAMPLE_CATALOG["wd-home"].route, "/");
  assert.equal(EXAMPLE_CATALOG["wd-glass"].route, "/springfield/glass-repair/");
  assert.equal(EXAMPLE_CATALOG["wd-replace"].route, "/springfield/replacement-window-installation/");
  assert.equal(EXAMPLE_CATALOG["wd-contact"].route, "/contact/");
  assert.equal(EXAMPLE_CATALOG["gp-home"].route, "/");
  assert.equal(EXAMPLE_CATALOG["sra-home"].route, "/springfield/");
  assert.equal(EXAMPLE_CATALOG["sra-replace"].route, "/springfield/roof-replacement/");
  assert.equal(EXAMPLE_CATALOG["sra-maint"].route, "/springfield/roof-maintenance/");
  assert.equal(EXAMPLE_CATALOG["sra-contact"].route, "/springfield/contact/");
  assert.equal(EXAMPLE_CATALOG["gp-inspect"].route, "/springfield/mold-inspection-testing/");
  assert.equal(EXAMPLE_CATALOG["gp-black"].route, "/springfield/black-mold-remediation/");
  assert.equal(EXAMPLE_CATALOG["gp-contact"].route, "/springfield/contact/");
});

test("every approved example has truthful source identity", () => {
  const catalog = loadApprovedCopyCatalog();
  const manifest = manifestText();
  const routesByBusiness = new Map<string, string[]>();
  for (const example of catalog.examples) {
    assert.equal(example.status, "complete", `${example.id} is not complete`);
    assert.ok(example.provenance, `${example.id} missing provenance`);
    assert.equal(
      provenanceHasTruthfulIdentity(example.provenance, example.business),
      true,
      `${example.id} provenance is incomplete or untruthful`,
    );
    assert.equal(example.provenance.sha, example.requiredSha);
    assert.equal(example.provenance.repository, example.requiredRepository);
    assert.equal(example.provenance.ref, example.requiredRef);
    assert.equal(example.provenance.captureUrl, captureUrlFor(example.business, example.route));
    assert.equal(/SHA unavailable/i.test(manifest), false);
    assert.match(manifest, new RegExp(example.requiredSha));
    assert.ok(manifest.includes(example.provenance.captureUrl), `${example.id} missing capture URL in SOURCE_MANIFEST`);
    const seen = routesByBusiness.get(example.business) ?? [];
    assert.equal(seen.includes(example.route), false, `${example.id} duplicates route ${example.route}`);
    seen.push(example.route);
    routesByBusiness.set(example.business, seen);
  }
  assert.equal(EXAMPLE_CATALOG["wd-home"].provenance.captureKind, "canonical-rendered-build");
  assert.equal(EXAMPLE_CATALOG["gp-home"].provenance.captureKind, "canonical-rendered-build");
  assert.equal(EXAMPLE_CATALOG["sra-home"].provenance.captureKind, "reviewed-preview");
  assert.equal(EXAMPLE_CATALOG["sra-home"].requiredRef, "reconcile/sra-local-recovery-2026-09-09");
  assert.equal(EXAMPLE_CATALOG["sra-home"].requiredSha, "fde339ca62488e61f99d4a855aafe9bad5cab1c0");
  assert.equal(
    EXAMPLE_CATALOG["sra-home"].provenance.equivalentSha,
    "f3f22a8154555cc762593c41947a5f2c6d4a2832",
  );
  assert.equal(EXAMPLE_CATALOG["wd-home"].requiredSha, "5a3019ac2f9c89e588ff03bb916aca3b4476a2e5");
  assert.equal(EXAMPLE_CATALOG["gp-home"].requiredSha, "f9047501d167bd4977a61012d519ae06e9a169c8");
  for (const id of ["sra-home", "sra-replace", "sra-maint", "sra-contact"] as const) {
    assert.ok(EXAMPLE_CATALOG[id].provenance.captureUrl.startsWith(SRA_REVIEWED_PREVIEW_ORIGIN));
    assert.equal(/sraroofs\.com/i.test(EXAMPLE_CATALOG[id].provenance.captureUrl), false);
    assert.match(manifest, /reviewed Preview/i);
    assert.match(manifest, /reconcile\/sra-local-recovery-2026-09-09/);
  }
});

test("complete examples are customer-facing Markdown, not placeholders", () => {
  const catalog = loadApprovedCopyCatalog();
  assert.equal(catalog.examples.length, 12);
  for (const example of catalog.examples) {
    assert.equal(example.markdown, readFileSync(example.absolutePath, "utf8"));
    assert.ok(example.markdown.trim().length > 0, `${example.id} empty`);
    assert.match(example.markdown, /^# /m, `${example.id} missing H1`);
    assert.match(example.markdown, /\[.+\]\(.+\)/, `${example.id} missing a link/CTA`);
    for (const needle of FORBIDDEN_PROSE) {
      assert.equal(example.markdown.includes(needle), false, `${example.id} contains ${needle}`);
    }
    for (const marker of PLACEHOLDER_MARKERS) {
      assert.equal(example.markdown.includes(marker), false, `${example.id} still has placeholder ${marker}`);
    }
    assert.equal(example.markdown.includes("```tsx"), false, `${example.id} contains tsx fence`);
  }
});

test("Window Dudes glass repair is a distinct service page, not a homepage duplicate", () => {
  const glass = loadExampleById("wd-glass");
  const home = loadExampleById("wd-home");
  assert.equal(glass.route, "/springfield/glass-repair/");
  assert.equal(home.route, "/");
  assert.notEqual(glass.markdown, home.markdown);
  assert.match(glass.markdown, /^# Glass Repair in Springfield, MO$/m);
  assert.match(home.markdown, /^# Window Repair & Installation Services in Springfield, MO$/m);
});

test("SRA examples are Springfield preview routes, not statewide production", () => {
  const home = loadExampleById("sra-home");
  const contact = loadExampleById("sra-contact");
  assert.match(home.markdown, /The Roofing Company Springfield Calls/);
  assert.equal(home.route.startsWith("/springfield/"), true);
  assert.equal(contact.route, "/springfield/contact/");
  assert.match(contact.markdown, /^# Contact SRA Roofing in Springfield, MO$/m);
  assert.equal(contact.markdown.includes("www.sraroofs.com"), false);
  assert.match(REQUIRED_CLIENT_REFS.sra.ref, /reconcile\/sra-local-recovery-2026-09-09/);
});

test("Greene Planet homepage is root, not /springfield/", () => {
  const home = loadExampleById("gp-home");
  assert.equal(home.route, "/");
  assert.match(home.markdown, /Mold Remediation & Removal in Springfield, MO/);
  assert.equal(home.markdown.includes("# Springfield\n"), false);
});

test("writer-guide assignment path still loads Writer 1/2/3 independently of examples", () => {
  const writer1 = loadWriterStageGuides("writer1");
  const writer2 = loadWriterStageGuides("writer2");
  const writer3 = loadWriterStageGuides("writer3");
  const guides = loadCanonicalGuideCatalog();
  assert.equal(guides.guides.length, 6);
  assert.deepEqual(writer1.sourceIds, ["general", "service"]);
  assert.deepEqual(writer2.sourceIds, ["general", "homepage", "contact", "headerFooter"]);
  assert.deepEqual(writer3.sourceIds, ["general"]);
  assert.equal(writer1.repoRoot, defaultRepoRoot());
  assert.match(writer1.guides[0]?.markdown ?? "", /What the writer should accomplish/);
  const index = readFileSync(join(defaultRepoRoot(), "docs/writer-guides/README.md"), "utf8");
  assert.match(index, /examples\/approved-copy/);
});
