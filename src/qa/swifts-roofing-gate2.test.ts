import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { runDeterministicQa } from "./deterministic.js";
import { runWholeSiteQa } from "./whole-site.js";
import { createHumanGate2Artifact } from "../render/human-gate-2.js";
import { INTELLIGENT_DIMENSIONS } from "./intelligent.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const WORDS_PATH = join(ROOT, "canary/outputs/swifts-website-words.json");
const MD_PATH = join(ROOT, "canary/outputs/human-gate-2.md");
const WORD_BEARING = new Set(["reviewer", "excerpt", "quote", "text", "exactText", "reviewText", "body", "content", "attribution", "author"]);

function pointerKeys(value: unknown, path = "site"): string[] {
  const found: string[] = [];
  const scan = (item: unknown, here: string) => {
    if (Array.isArray(item)) {
      item.forEach((child, index) => scan(child, `${here}[${index}]`));
      return;
    }
    if (!item || typeof item !== "object") return;
    const record = item as Record<string, unknown>;
    if (here.includes("reviewEvidence")) {
      for (const key of Object.keys(record)) if (WORD_BEARING.has(key)) found.push(`${here}.${key}`);
    }
    for (const [key, child] of Object.entries(record)) {
      if (key === "reviews") continue;
      scan(child, `${here}.${key}`);
    }
  };
  scan(value, path);
  return found;
}

test("Swifts Roofing Gate 2 words package meets the four-page contract", async () => {
  const site = JSON.parse(readFileSync(WORDS_PATH, "utf8")) as Record<string, unknown>;
  const markdown = readFileSync(MD_PATH, "utf8");
  const wordCounts = site.wordCounts as Record<string, number>;
  const wordCountPolicy = site.wordCountPolicy as Record<string, unknown>;
  assert.equal(typeof wordCounts["/roof-replacement"], "number", "replacement advisory word count must be recorded");
  assert.equal(typeof wordCounts["/roof-repair"], "number", "repair advisory word count must be recorded");
  assert.equal(wordCountPolicy?.role, "advisory");
  assert.equal(wordCountPolicy?.hardFloor, null);
  assert.equal(wordCountPolicy?.lengthAloneNeverPasses, true);
  assert.deepEqual(pointerKeys(site), []);

  const deterministic = runDeterministicQa(site);
  assert.equal(deterministic.pass, true, deterministic.findings.filter((finding) => finding.severity === "hard-fail").map((finding) => finding.code).join(", "));

  const wholeSite = await runWholeSiteQa(site, {
    assessor: () => ({
      independent: true as const,
      dimensionsReviewed: [...INTELLIGENT_DIMENSIONS],
      findings: [],
    }),
    rejectedServiceNames: ["Hail damage repair", "Insurance claim service", "Emergency roof repair"],
  });
  assert.equal(wholeSite.pass, true, wholeSite.findings.filter((finding) => finding.severity === "hard-fail").map((finding) => finding.code).join(", "));

  const artifact = createHumanGate2Artifact(site);
  assert.equal(artifact.state, "awaiting-human-gate-2");
  assert.match(markdown, /# Roofing Company in Springfield, MO/);
  assert.match(markdown, /# Roof Replacement in Springfield, MO/);
  assert.match(markdown, /# Roof Repair in Springfield, MO/);
  assert.match(markdown, /# Contact Swifts Roofing in Springfield, MO/);
  assert.match(markdown, /State: awaiting-human-gate-2/);
  assert.match(markdown, /Do you approve these website words for the coded demo\?/);
  assert.match(markdown, /Word count alone must never pass a page/);
  assert.match(markdown, /advisory only/i);
  assert.doesNotMatch(markdown, /required ≥800|required >=800|≥800-word floor|at least 800 words/i);
  assert.doesNotMatch(markdown, /Service-page word floor/);
  assert.doesNotMatch(JSON.stringify(site), /required ≥800|required >=800|≥800-word floor/);
  assert.match(markdown, /awaiting Josh's look/);
  assert.match(markdown, /Architect QA Writer 1: \*\*awaiting Josh's look\*\*/);
  assert.match(markdown, /Architect QA Writer 2: \*\*awaiting Josh's look\*\*/);
  assert.doesNotMatch(markdown, /Architect QA Writer 1: \*\*(pass|accepted)/i);
  assert.doesNotMatch(markdown, /Architect QA Writer 2: \*\*(pass|accepted)/i);
  assert.doesNotMatch(markdown, /\/roof-inspection|\/emergency-tarping/);
  const publicStart = markdown.indexOf("## /");
  const strategyStart = markdown.indexOf("## Strategy Overview");
  assert.ok(publicStart >= 0 && strategyStart > publicStart, "public pages and Strategy Overview must be present");
  const publicPages = markdown.slice(publicStart, strategyStart);
  for (const phrase of [
    "mint extra",
    "named repair record",
    "allowed to use",
    "earned its own URL",
    "second URL",
    "extra public service",
    "upgraded into replacement",
    "left off the public map",
    "the copy stays that way on purpose",
    "this demo does not",
    "extra destinations to look busier",
    "this page is allowed",
    "night-dispatch",
    "same-day promise",
    "response-time guarantee",
    "cleanup guarantee",
    "before-sunrise",
    "hours promise",
    "completion guarantee",
    "company price promise",
    "speed promise",
    "lowest-price",
    "callback guarantee",
    "dispatch offer",
    "we are not promising",
    "emergency-availability",
    "not a night-dispatch",
    "not a cleanup guarantee",
    "swift to the rescue",
  ]) {
    assert.ok(!publicPages.toLowerCase().includes(phrase.toLowerCase()), `public pages must not contain factory phrasing: ${phrase}`);
  }
  const homeAt = markdown.indexOf("## /");
  const replacementAt = markdown.indexOf("## /roof-replacement");
  const repairAt = markdown.indexOf("## /roof-repair");
  const contactAt = markdown.indexOf("## /contact");
  const strategyAt = markdown.indexOf("## Strategy Overview");
  assert.ok(homeAt < replacementAt && replacementAt < repairAt && repairAt < contactAt && contactAt < strategyAt);
  assert.match(artifact.markdown, /Neal Richardson Sr/);
  assert.match(artifact.markdown, /Jonathan Hoffman/);
  assert.match(artifact.markdown, /C Jackson/);
});
