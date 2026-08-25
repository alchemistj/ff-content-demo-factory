import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { parseAndValidateWriter1Output, validateSealed, writer1Projection } from "../../scripts/360-words-canary.js";
import { WRITER1_FRESH_PROMPT } from "../../scripts/360-words-canary.js";

const root = process.cwd();
const read = (relative: string) => readFileSync(join(root, relative), "utf8");
const readJson = (relative: string) => JSON.parse(read(relative)) as Record<string, any>;

const HARD_800 = /(?:>=\s*800|at least 800 words each|exceed(?:s|ed|ing)? 800 visible)/iu;
const AUDIT = /this page is built from|authoritative reviews document|not a same-day service guarantee|not an sla\b/iu;

function pageBlock(markdown: string, heading: string): string {
  const start = markdown.indexOf(heading);
  assert.ok(start >= 0, `missing ${heading}`);
  const next = markdown.indexOf("\n## ", start + heading.length);
  return next === -1 ? markdown.slice(start) : markdown.slice(start, next);
}

function displayedQuotes(block: string): string[] {
  return [...block.matchAll(/^> (?!—)(.+)$/gmu)].flatMap((match) => {
    const quote = match[1];
    return quote ? [quote.replace(/\s+/gu, " ").trim().toLowerCase()] : [];
  });
}

test("Writer1 fresh prompt revokes the hard 800-word floor and forbids padding", () => {
  assert.match(WRITER1_FRESH_PROMPT, /Word count is diagnostic only/u);
  assert.match(WRITER1_FRESH_PROMPT, /former hard floor of at least 800 words each is revoked/u);
  assert.match(WRITER1_FRESH_PROMPT, /Do not pad to reach 800/u);
  assert.doesNotMatch(WRITER1_FRESH_PROMPT, /must be at least 800|>= 800/u);
});

test("current 360 words package does not treat 800 as a pass criterion", () => {
  if (!existsSync(join(root, "canary/outputs/human-gate-2.md"))) return;
  const md = read("canary/outputs/human-gate-2.md");
  const qa1 = readJson("canary/runtime/architect-qa-writer1.json");
  const strategy = readJson("canary/outputs/writer3-output.json");
  assert.equal(qa1.wordCountIsDiagnosticOnly, true);
  assert.match(String(qa1.formerHardFloorRevoked), /800/u);
  assert.ok(qa1.findings.some((finding: string) => /diagnostic only/iu.test(finding)));
  assert.ok(qa1.findings.some((finding: string) => /former hard 800-word floor is revoked/iu.test(finding)));
  assert.doesNotMatch(JSON.stringify(qa1.findings), />= 800/u);
  assert.match(md, /Word count is not the acceptance reason/u);
  assert.match(strategy.strategyOverview.body, /former hard 800-word floor is revoked/u);
  assert.doesNotMatch(strategy.strategyOverview.body, /both service pages exceed 800/u);
  assert.doesNotMatch(md, HARD_800);
});

test("rewritten service pages display each quote once and omit audit-memo public copy", () => {
  if (!existsSync(join(root, "canary/outputs/human-gate-2.md"))) return;
  const md = read("canary/outputs/human-gate-2.md");
  const repair = pageBlock(md, "## Garage Door Repair (`/garage-door-repair`)");
  const install = pageBlock(md, "## Garage Door Installation (`/garage-door-installation`)");
  const home = pageBlock(md, "## Home (`/`)");
  const contact = pageBlock(md, "## Contact (`/contact`)");
  for (const [name, block] of [["repair", repair], ["installation", install]] as const) {
    const quotes = displayedQuotes(block);
    assert.ok(quotes.length >= 4, `${name} should keep strongest quotes`);
    const dupes = quotes.filter((quote, index) => quotes.indexOf(quote) !== index);
    assert.deepEqual(dupes, [], `${name} repeated a quotation`);
  }
  const publicCopy = [home, repair, install, contact].join("\n");
  assert.doesNotMatch(publicCopy, AUDIT);
  assert.doesNotMatch(repair, /this page is built from written reviews/iu);
  assert.doesNotMatch(md, /\*\*2,?827\*\*/u);
  assert.doesNotMatch(md, /\*\*1,?637\*\*/u);
  assert.match(md, /Rejected padded lineage \(not restored\)/u);
  assert.match(md, /sha256:165d310ae1e30225b6278cc0fbde7d2cab23a60f186157c59734257519c01f89/u);
  assert.doesNotMatch(publicCopy, /If a part is not on the truck, Jenny schedules/u);
  assert.doesNotMatch(publicCopy, /Callers come back because/u);
  assert.doesNotMatch(publicCopy, /the person who diagnosed the door is the person who repaired/u);
  assert.doesNotMatch(publicCopy, /when the slab is done/iu);
  assert.doesNotMatch(publicCopy, /Facebook group/iu);
  assert.doesNotMatch(publicCopy, /use the garage that evening/iu);
  assert.doesNotMatch(publicCopy, /both openings are finished in the same visit or staged/iu);
  assert.doesNotMatch(publicCopy, /from a shop with named people on the jobs/iu);
  assert.match(home, /# Springfield garage door work backed by completed jobs/u);
});

test("claim-correction package is waiting-for-architect and does not self-accept", () => {
  if (!existsSync(join(root, "canary/outputs/human-gate-2.md"))) return;
  const md = read("canary/outputs/human-gate-2.md");
  const qa1 = readJson("canary/runtime/architect-qa-writer1.json");
  const qa2 = readJson("canary/runtime/architect-qa-writer2.json");
  const whole = readJson("canary/runtime/whole-site-qa.json");
  const state = readJson("canary/runtime/state.json");
  const strategy = readJson("canary/outputs/writer3-output.json");
  assert.equal(qa1.decision, "waiting-for-architect");
  assert.equal(qa1.writer2Released, false);
  assert.equal(qa2.decision, "waiting-for-architect");
  assert.equal(whole.pass, false);
  assert.equal(state.status, "waiting-for-architect");
  assert.notEqual(state.writer2Blocked, false);
  assert.match(md, /Architect QA Writer 1: \*\*waiting-for-architect\*\*/u);
  assert.doesNotMatch(md, /Architect QA Writer 1: \*\*accept\*\*/u);
  assert.doesNotMatch(md, /^State: awaiting-human-gate-2$/mu);
  assert.match(String(strategy.strategyOverview.body), /waiting-for-architect/u);
  assert.doesNotMatch(String(strategy.strategyOverview.body), /Architect QA accepted/u);
});

test("corrected Writer1 JSON still validates against the sealed 360 projection", () => {
  if (!existsSync(join(root, "canary/outputs/writer1-output.json"))) return;
  const output = read("canary/outputs/writer1-output.json");
  const parsed = parseAndValidateWriter1Output(output, writer1Projection(validateSealed(root)));
  assert.deepEqual(parsed.pages.map((page: { url: string }) => page.url), ["/garage-door-repair", "/garage-door-installation"]);
  for (const page of parsed.pages) {
    for (const item of page.reviewEvidence || []) {
      assert.equal("excerpt" in item, false);
      assert.equal("reviewer" in item, false);
      assert.equal("quote" in item, false);
    }
  }
});
