import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  EXAMPLE_CATALOG,
  EXAMPLE_IDS,
  EXPECTED_COMPLETE_EXAMPLE_IDS,
  loadApprovedCopyCatalog,
  loadExampleById,
  provenanceLooksLikeGitSource,
  textClaimsNonGitAuthority,
} from "./index.js";
import { loadCanonicalGuideCatalog, loadWriterStageGuides, defaultRepoRoot } from "../writer-guides/index.js";

const FORBIDDEN_PROSE = [
  "className=",
  "export default",
  "import {",
  "\"@type\"",
  "SELECT ",
];

const MANIFEST_PATH = "examples/approved-copy/SOURCE_MANIFEST.md";

function manifestText(repoRoot = defaultRepoRoot()): string {
  return readFileSync(join(repoRoot, MANIFEST_PATH), "utf8");
}

test("approved-copy catalog has twelve Springfield slots with pinned git refs", () => {
  assert.equal(EXAMPLE_IDS.length, 12);
  assert.equal(EXPECTED_COMPLETE_EXAMPLE_IDS.length, 11);
  assert.equal(EXAMPLE_CATALOG["wd-repair"].status, "corpus-gap");
  assert.equal(EXAMPLE_CATALOG["gp-home"].route, "/");
  assert.equal(EXAMPLE_CATALOG["sra-home"].route, "/springfield/");
  assert.equal(EXAMPLE_CATALOG["sra-replace"].route, "/springfield/roof-replacement/");
  assert.equal(EXAMPLE_CATALOG["sra-maint"].route, "/springfield/roof-maintenance/");
  assert.equal(EXAMPLE_CATALOG["sra-contact"].route, "/springfield/contact/");
  assert.equal(EXAMPLE_CATALOG["gp-inspect"].route, "/springfield/mold-inspection-testing/");
  assert.equal(EXAMPLE_CATALOG["gp-black"].route, "/springfield/black-mold-remediation/");
  assert.equal(EXAMPLE_CATALOG["gp-contact"].route, "/springfield/contact/");
  assert.equal(EXAMPLE_CATALOG["wd-replace"].route, "/springfield/replacement-window-installation/");
  assert.equal(EXAMPLE_CATALOG["wd-contact"].route, "/contact/");
  assert.equal(EXAMPLE_CATALOG["wd-home"].requiredSha, "5a3019ac2f9c89e588ff03bb916aca3b4476a2e5");
  assert.equal(EXAMPLE_CATALOG["sra-contact"].requiredSha, "f3f22a8154555cc762593c41947a5f2c6d4a2832");
  assert.equal(EXAMPLE_CATALOG["gp-home"].requiredSha, "f9047501d167bd4977a61012d519ae06e9a169c8");
  assert.equal(EXAMPLE_CATALOG["sra-contact"].requiredRef, "reconcile/sra-local-recovery-2026-09-09");
});

test("an example marked complete/approved cannot use SHA-unavailable, source-unavailable, or Vercel as copy authority", () => {
  const catalog = loadApprovedCopyCatalog();
  const manifest = manifestText();
  for (const example of catalog.examples) {
    if (example.status !== "complete") continue;
    assert.ok(example.provenance, `${example.id} complete without provenance`);
    assert.equal(
      provenanceLooksLikeGitSource(example.provenance),
      true,
      `${example.id} complete provenance is not git-repository source`,
    );
    assert.equal(example.provenance.sha, example.requiredSha);
    assert.equal(example.provenance.repository, example.requiredRepository);
    assert.equal(example.provenance.ref, example.requiredRef);
    assert.equal(textClaimsNonGitAuthority(example.markdown), false, `${example.id} markdown claims non-git authority`);
    assert.match(manifest, new RegExp(example.requiredSha));
    for (const file of example.provenance.sourceFiles) {
      assert.ok(manifest.includes(file), `${example.id} SOURCE_MANIFEST missing ${file}`);
      assert.equal(/\bvercel\b/i.test(file), false, `${example.id} source file looks like Vercel: ${file}`);
    }
    const shaUnavailable = new RegExp(`${example.id}[\\s\\S]{0,800}SHA unavailable`, "i");
    assert.equal(shaUnavailable.test(manifest), false, `${example.id} manifest still says SHA unavailable`);
  }
});

test("the Springfield set has eleven git-complete examples; Window Dudes window repair is the one corpus gap", () => {
  assert.equal(EXAMPLE_CATALOG["wd-repair"].status, "corpus-gap");
  for (const id of EXPECTED_COMPLETE_EXAMPLE_IDS) {
    const entry = EXAMPLE_CATALOG[id];
    assert.equal(entry.status, "complete", `${id} must be git-complete; Vercel/HTML snapshots are not approved`);
    assert.ok(entry.provenance && provenanceLooksLikeGitSource(entry.provenance), `${id} missing git provenance`);
  }
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
    }
  }
});

test("Window Dudes window-repair slot is a corpus gap, not a homepage duplicate", () => {
  const repair = loadExampleById("wd-repair");
  const home = loadExampleById("wd-home");
  assert.equal(repair.status, "corpus-gap");
  assert.notEqual(repair.markdown, home.markdown);
  assert.match(repair.markdown, /corpus gap/i);
  assert.equal(repair.markdown.includes("# Window Repair"), false);
  assert.match(repair.markdown, /5a3019ac2f9c89e588ff03bb916aca3b4476a2e5/);
  assert.equal(/silently substitute the homepage/i.test(repair.markdown), true);
});

test("SRA Springfield contact names repository source files, not a production 404", () => {
  const contact = loadExampleById("sra-contact");
  assert.equal(contact.route, "/springfield/contact/");
  assert.match(contact.markdown, /src\/content\/springfieldContact\.ts/);
  assert.match(contact.markdown, /src\/content\/contact\.ts/);
  assert.match(contact.markdown, /src\/pages\/SpringfieldContactPage\.tsx/);
  assert.match(contact.markdown, /reconcile\/sra-local-recovery-2026-09-09/);
  assert.match(contact.markdown, /f3f22a8154555cc762593c41947a5f2c6d4a2832/);
  assert.equal(/production 404/i.test(contact.markdown), false);
});

test("Greene Planet homepage is root, not /springfield/", () => {
  assert.equal(EXAMPLE_CATALOG["gp-home"].route, "/");
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
