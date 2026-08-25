import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { WRITER1_FRESH_PROMPT } from "../../scripts/360-words-canary.js";

const root = process.cwd();

test("Writer1 fresh prompt revokes the hard 800-word floor and forbids padding", () => {
  assert.match(WRITER1_FRESH_PROMPT, /Word count is diagnostic only/u);
  assert.match(WRITER1_FRESH_PROMPT, /former hard floor of at least 800 words each is revoked/u);
  assert.match(WRITER1_FRESH_PROMPT, /Do not pad to reach 800/u);
  assert.doesNotMatch(WRITER1_FRESH_PROMPT, /must be at least 800|>= 800/u);
});

test("verified branch carries sealed handoff only, never inherited copy or QA claims", () => {
  for (const relative of [
    "canary/outputs/human-gate-2.md",
    "canary/outputs/writer1-output.json",
    "canary/outputs/writer1-service-pages.md",
    "canary/outputs/writer2-output.json",
    "canary/outputs/writer3-output.json",
    "canary/runtime/architect-qa-writer1.json",
    "canary/runtime/architect-qa-writer2.json",
    "canary/runtime/state.json",
    "canary/runtime/whole-site-qa.json",
    "canary/runtime/writer1-fresh-copy.json",
  ]) assert.equal(existsSync(join(root, relative)), false, `inherited artifact remains: ${relative}`);
  assert.equal(existsSync(join(root, "canary/sealed/360-four-page-reseal-handoff.json")), true);
});
