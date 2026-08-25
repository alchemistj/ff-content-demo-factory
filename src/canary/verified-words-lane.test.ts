import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import test from "node:test";
import { EXPECTED_VERIFIED_CORRECTION, validateControl as rawValidateControl } from "../../scripts/360-words-control.mjs";
import { validateSealed, writer1Projection } from "../../scripts/360-words-canary.js";
import { VERIFIED_WRITER1_AGENT_ID, VERIFIED_WRITER1_PROMPT_DIGEST, validateVerifiedWriter1Control, runVerifiedWriter1Correction } from "../../scripts/360-words-verified.js";
import { digestOf } from "../../src/contracts/digests.js";
import { assertNoLocalDownstreamGeneration, assertVerifiedDownstreamState, VERIFIED_PUBLIC_ROUTES, VERIFIED_STAGE_POLICY, VERIFIED_WRITER3_SEALED_FACTS } from "../../src/pipeline/verified-words-policy.js";

const root = path.resolve(process.cwd());
const validateControl = (control: Record<string, any>, input: Record<string, any> = {}) => rawValidateControl(control, control.wakeNonce === "DORMANT" ? input : { ...input, commitSha: "d".repeat(40), beforeSha: control.policy?.recovery?.sourceSha, parentSha: control.policy?.recovery?.sourceSha });

test("verified branch starts dormant and never treats the committed downstream surface as approval", async () => {
  const control = JSON.parse(readFileSync(path.join(root, ".factory-wake/360-words-control.json"), "utf8"));
  assert.equal(control.wakeNonce, "DORMANT"); assert.deepEqual(control.policy.approvedRoutes, VERIFIED_PUBLIC_ROUTES);
  assert.deepEqual(await runVerifiedWriter1Correction(root), { status: "dormant", stage: "writer1" });
  assert.equal(existsSync(path.join(root, "canary/runtime/state.json")), false);
  assert.doesNotThrow(() => assertVerifiedDownstreamState({ status: "dormant", stage: "writer1", writer2Blocked: true, nextStage: null }));
  assert.throws(() => assertVerifiedDownstreamState({ status: "awaiting-human-gate-2", stage: "awaiting-human-gate-2", writer2Blocked: false, nextStage: null }), /manufactured downstream|Writer2 blocked/u);
});

test("DORMANT control is the minimal safe envelope and contains no wake placeholders", () => {
  const control = JSON.parse(readFileSync(path.join(root, ".factory-wake/360-words-control.json"), "utf8"));
  assert.equal(control.wakeNonce, "DORMANT");
  assert.equal(Object.hasOwn(control.policy, "mode"), false);
  assert.equal(Object.hasOwn(control.policy, "recovery"), false);
  assert.doesNotMatch(JSON.stringify(control), /PENDING|PLACEHOLDER|TODO/iu);
});

test("verified control binds the new isolated branch, exact fresh agent, v5 prompt, one same-thread correction, and no create", () => {
  const control = JSON.parse(readFileSync(path.join(root, ".factory-wake/360-words-control.json"), "utf8"));
  const inputDigest = digestOf(writer1Projection(validateSealed(root)));
  const sourceSha = "c".repeat(40); const active: any = { ...control, wakeNonce: "W1-VERIFIED-20260825-ONE" };
  const idempotencyKey = `${VERIFIED_WRITER1_AGENT_ID}:writer1:correction:v1:${inputDigest}:${VERIFIED_WRITER1_PROMPT_DIGEST}`;
  active.policy = { ...control.policy, mode: "writer1-correction", recovery: { ...EXPECTED_VERIFIED_CORRECTION, inputDigest, sourceSha, promptDigest: VERIFIED_WRITER1_PROMPT_DIGEST, allowCreate: false, allowResume: true, allowFollowUp: true, maxFollowUps: 1, idempotencyKey } };
  assert.deepEqual(validateControl(active, { changedPaths: [".factory-wake/360-words-control.json"], actor: "architect", owner: "architect" }), { dormant: false, stage: "writer1", sourceSha });
  validateVerifiedWriter1Control(active, inputDigest);
  assert.throws(() => validateControl({ ...active, policy: { ...active.policy, recovery: { ...active.policy.recovery, allowCreate: true } } }, { changedPaths: [".factory-wake/360-words-control.json"], actor: "architect", owner: "architect" }), /correction|pins/u);
});

test("active wake sourceSha is the exact dormant parent/event.before, not an arbitrary hex pin", () => {
  const control = JSON.parse(readFileSync(path.join(root, ".factory-wake/360-words-control.json"), "utf8"));
  const active: any = { ...control, wakeNonce: "W1-VERIFIED-LINEAGE-01" };
  const sourceSha = "c".repeat(40);
  active.policy = { ...control.policy, mode: "writer1-correction", recovery: { ...EXPECTED_VERIFIED_CORRECTION, sourceSha, promptDigest: VERIFIED_WRITER1_PROMPT_DIGEST, idempotencyKey: `${VERIFIED_WRITER1_AGENT_ID}:writer1:correction:v1:${EXPECTED_VERIFIED_CORRECTION.inputDigest}:${VERIFIED_WRITER1_PROMPT_DIGEST}`, allowCreate: false, allowResume: true, allowFollowUp: true, maxFollowUps: 1 } };
  const event = { changedPaths: [".factory-wake/360-words-control.json"], actor: "architect", owner: "architect", commitSha: "d".repeat(40), beforeSha: sourceSha, parentSha: sourceSha };
  assert.deepEqual(rawValidateControl(active, event), { dormant: false, stage: "writer1", sourceSha });
  assert.throws(() => rawValidateControl({ ...active, policy: { ...active.policy, mode: "artifact-recovery", recovery: { ...active.policy.recovery, correctionVersion: undefined, recoveryVersion: "words-writer1-artifact-recovery/v2" } } }, { ...event, verifiedLane: true }), /isolated verified lane/u);
  assert.throws(() => rawValidateControl(active, { ...event, beforeSha: "e".repeat(40), parentSha: "e".repeat(40) }), /parent\/event\.before/u);
  assert.throws(() => rawValidateControl(active, { ...event, parentSha: "e".repeat(40) }), /parent\/event\.before/u);
  assert.throws(() => rawValidateControl(active, { changedPaths: event.changedPaths, actor: event.actor, owner: event.owner }), /commit, event\.before, and parent/u);
});

test("verified policy requires new downstream agents and signed direct receipts, with immutable Writer3 facts", () => {
  assert.deepEqual(VERIFIED_PUBLIC_ROUTES, ["/", "/garage-door-repair", "/garage-door-installation", "/contact"]);
  assert.equal(VERIFIED_STAGE_POLICY.writer2.agentMode, "new-agent"); assert.deepEqual(VERIFIED_STAGE_POLICY.writer2.allowedRoutes, ["/", "/contact"]);
  assert.equal(VERIFIED_STAGE_POLICY.writer3.agentMode, "new-agent"); assert.deepEqual(VERIFIED_STAGE_POLICY.writer3.allowedRoutes, ["/"]);
  assert.deepEqual(VERIFIED_WRITER3_SEALED_FACTS, { retrievedWrittenReviewCount: 47, reviewRetrievalDate: "2026-08-23", reviewBackedServicesWithoutPages: 2, reviewBackedServiceNames: ["Garage door repair", "Garage door installation"] });
  assert.throws(() => assertVerifiedDownstreamState({ status: "awaiting-human-gate-2", stage: "awaiting-human-gate-2", writer2Blocked: false, writer3Released: true, nextStage: null }), /manufactured downstream/u);
});

test("verified runner has no local copy, Writer2, Writer3, or QA generation path", () => {
  const verifiedRunner = readFileSync(path.join(root, "scripts/360-words-verified.ts"), "utf8");
  assert.doesNotMatch(verifiedRunner, /write-360-writer1-copy|render-360-human-gate-2|writer2-output\.json|writer3-output\.json|human-gate-2\.md/iu);
  assert.match(verifiedRunner, /runVerifiedWriter2Production/u); assert.match(verifiedRunner, /runVerifiedWriter3Production/u); assert.doesNotMatch(verifiedRunner, /runOneProspect|runPipeline/u);
  assertNoLocalDownstreamGeneration(verifiedRunner);
  assert.equal(existsSync(path.join(root, "scripts/render-360-human-gate-2.py")), false);
  assert.equal(existsSync(path.join(root, "scripts/write-360-writer1-copy.ts")), false);
  const workflow = readFileSync(path.join(root, ".github/workflows/architect-360-words-canary.yml"), "utf8");
  assert.match(workflow, /architect\/360-words-canary-verified/u); assert.match(workflow, /scripts\/360-words-verified\.ts --writer1-correction/u); assert.match(workflow, /VERIFIED_LANE: 'true'/u); assert.match(workflow, /CURSOR_FAST: 'false'/u); assert.match(workflow, /GITHUB_EVENT_BEFORE/u); assert.match(workflow, /canary\/outputs\/writer1-output\.json/u); assert.doesNotMatch(workflow, /path:\s*\|\s*\n\s*canary\/runtime\s*$/mu); assert.doesNotMatch(workflow, /write-360-writer1-copy|render-360-human-gate-2/u);
});
