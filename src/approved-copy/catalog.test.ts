import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  EXAMPLE_CATALOG,
  EXAMPLE_IDS,
  loadApprovedCopyCatalog,
  loadExampleById,
} from "./index.js";
import { loadCanonicalGuideCatalog, loadWriterStageGuides, defaultRepoRoot } from "../writer-guides/index.js";

const FORBIDDEN_PROSE = [
  "className=",
  "export default",
  "import {",
  "\"@type\"",
  "SELECT ",
];

test("approved-copy catalog has twelve Springfield examples with expected routes", () => {
  assert.equal(EXAMPLE_IDS.length, 12);
  assert.equal(EXAMPLE_CATALOG["gp-home"].route, "/");
  assert.equal(EXAMPLE_CATALOG["gp-home"].status, "complete");
  assert.equal(EXAMPLE_CATALOG["wd-repair"].route, "/");
  assert.equal(EXAMPLE_CATALOG["wd-home"].route, "/");
  assert.equal(EXAMPLE_CATALOG["sra-home"].route, "/springfield/");
  assert.equal(EXAMPLE_CATALOG["sra-replace"].route, "/springfield/roof-replacement/");
  assert.equal(EXAMPLE_CATALOG["sra-maint"].route, "/springfield/roof-maintenance/");
  assert.equal(EXAMPLE_CATALOG["sra-contact"].route, "/springfield/contact/");
  assert.equal(EXAMPLE_CATALOG["sra-contact"].status, "source-unavailable");
  assert.equal(EXAMPLE_CATALOG["gp-inspect"].route, "/springfield/mold-inspection-testing/");
  assert.equal(EXAMPLE_CATALOG["gp-black"].route, "/springfield/black-mold-remediation/");
  assert.equal(EXAMPLE_CATALOG["gp-contact"].route, "/springfield/contact/");
});

test("complete examples are readable customer-facing Markdown with headings and CTAs", () => {
  const catalog = loadApprovedCopyCatalog();
  assert.equal(catalog.examples.length, 12);
  for (const example of catalog.examples) {
    assert.equal(example.markdown, readFileSync(example.absolutePath, "utf8"));
    assert.ok(example.markdown.trim().length > 0, `${example.id} empty`);
    if (example.status === "complete") {
      assert.match(example.markdown, /^# /m, `${example.id} missing H1`);
      assert.match(example.markdown, /\[.+\]\(.+\)/, `${example.id} missing a link/CTA`);
      for (const needle of FORBIDDEN_PROSE) {
        assert.equal(example.markdown.includes(needle), false, `${example.id} contains ${needle}`);
      }
      assert.equal(example.markdown.includes("```tsx"), false, `${example.id} contains tsx fence`);
    } else {
      assert.match(example.markdown, /source not available/i);
      assert.match(example.markdown, /reconcile\/sra-local-recovery-2026-09-09/);
      assert.match(example.markdown, /\/springfield\/contact\//);
    }
  }
});

test("Window Dudes window-repair example is the homepage route, not a fabricated path", () => {
  const repair = loadExampleById("wd-repair");
  const home = loadExampleById("wd-home");
  assert.equal(repair.route, "/");
  assert.equal(home.route, "/");
  assert.equal(repair.markdown, home.markdown);
});

test("Greene Planet homepage is root, not /springfield/", () => {
  const home = loadExampleById("gp-home");
  assert.equal(home.route, "/");
  assert.match(home.markdown, /Mold Remediation & Removal in Springfield, MO/);
  assert.equal(home.markdown.includes("# Springfield\n"), false);
});

test("SRA examples stay on Springfield routes and do not use statewide home/contact copy", () => {
  const home = loadExampleById("sra-home");
  assert.match(home.markdown, /The Roofing Company Springfield Calls/);
  assert.equal(home.route.startsWith("/springfield/"), true);
  const contact = loadExampleById("sra-contact");
  assert.equal(contact.status, "source-unavailable");
  assert.equal(contact.markdown.includes("Option 1: Call"), false);
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
