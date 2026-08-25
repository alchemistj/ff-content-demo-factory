import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { EXPECTED_VERIFIED_CORRECTION, EXPECTED_VERIFIED_CORRECTION_V2, EXPECTED_VERIFIED_CORRECTION_V3, VERIFIED_WRITER2_PROMPT_DIGEST, selectVerifiedWriter1Dispatch, validateControl as rawValidateControl } from "../../scripts/360-words-control.mjs";
import { digestWriter1QuarantineCorrectionV3Input, digestWriter1QuarantineCorrectionV3Prompt } from "../../scripts/360-words-recovery-prompt.mjs";
import { validateSealed, writer1Projection } from "../../scripts/360-words-canary.js";
import { VERIFIED_WRITER1_AGENT_ID, VERIFIED_WRITER1_PROMPT_DIGEST, VERIFIED_WRITER1_PROMPT_V2_DIGEST, validateVerifiedWriter1Control, validateVerifiedWriter1PostDispatchControl, validateVerifiedWriter1SealOnlyControl, validateVerifiedWriter1CorrectionV3Control, verifyOriginalDispatchEvidence, runVerifiedWriter1Correction, verifyPinnedSealedManifestBytes, quarantineWriter1PostDispatchOutput, persistVerifiedWriterFailureSurface, VERIFIED_WRITER1_REJECTED_OUTPUT_PATH, VERIFIED_WRITER1_REJECTION_RECEIPT_PATH, VERIFIED_WRITER1_CORRECTION_V3_ARTIFACT_PATHS, VERIFIED_WRITER1_CORRECTION_V3_ARTIFACT_ZIP_SIZE, VERIFIED_WRITER1_CORRECTION_V3_SIDECAR_PINS, VERIFIED_WRITER1_CORRECTION_V3_SOURCE, validateVerifiedWriter1CorrectionV3ArtifactListing, validateVerifiedWriter1CorrectionV3ArtifactLayout, validateVerifiedWriter1CorrectionV3SidecarMetadata, verifyVerifiedWriter1CorrectionV3PinnedBytes } from "../../scripts/360-words-verified.js";
import { digestOf } from "../../src/contracts/digests.js";
import { createHash, generateKeyPairSync } from "node:crypto";
import { assertNoLocalDownstreamGeneration, assertVerifiedDownstreamState, VERIFIED_PUBLIC_ROUTES, VERIFIED_STAGE_POLICY, VERIFIED_WRITER3_SEALED_FACTS } from "../../src/pipeline/verified-words-policy.js";
import { ARCHITECT_APPROVAL_PUBLIC_KEY_PATH, ARCHITECT_APPROVAL_PUBLIC_KEY_SHA256, loadPinnedArchitectPublicKey, validatePinnedArchitectPublicKeyBytes } from "../../scripts/architect-approval-key.mjs";
import { copyVerifiedArchitectApprovalInputs } from "../../scripts/verify-architect-approval-inputs.js";

const root = path.resolve(process.cwd());
const EXPECTED_POST_DISPATCH_ORIGINAL_INPUT_DIGEST = "sha256:f4f59e9c645391266172892e4651f0da4ccedaa2bc86e35217a0ab8699fd0c1f";
const EXPECTED_POST_DISPATCH_ORIGINAL_PROMPT_DIGEST = "sha256:e9c39355c8f0973250ebd97ad1b3b69c9e09c840796f39336abd5664c20303e3";
const EXPECTED_POST_DISPATCH_ORIGINAL_IDEMPOTENCY_KEY = `${VERIFIED_WRITER1_AGENT_ID}:writer1:correction:v2:${EXPECTED_POST_DISPATCH_ORIGINAL_INPUT_DIGEST}:${EXPECTED_POST_DISPATCH_ORIGINAL_PROMPT_DIGEST}`;
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

test("the top-level v2 verified wake shape is classified narrowly without broadening other modes", () => {
  const control = JSON.parse(readFileSync(path.join(root, ".factory-wake/360-words-control.json"), "utf8"));
  const sourceSha = "23b995f17069cc63b9770bfabd1b6da850aeea0c";
  const active: any = { ...control, wakeNonce: "W1-VERIFIED-20260825-V2-23B995", policy: { ...control.policy, mode: "writer1-correction" }, recovery: { ...EXPECTED_VERIFIED_CORRECTION_V2, sourceSha, inputDigest: "sha256:f4f59e9c645391266172892e4651f0da4ccedaa2bc86e35217a0ab8699fd0c1f", promptDigest: VERIFIED_WRITER1_PROMPT_V2_DIGEST, allowCreate: false, allowResume: true, allowFollowUp: true, maxFollowUps: 1, idempotencyKey: `${VERIFIED_WRITER1_AGENT_ID}:writer1:correction:v2:sha256:f4f59e9c645391266172892e4651f0da4ccedaa2bc86e35217a0ab8699fd0c1f:${VERIFIED_WRITER1_PROMPT_V2_DIGEST}` } };
  assert.deepEqual(rawValidateControl(active, { changedPaths: [".factory-wake/360-words-control.json"], actor: "architect", owner: "architect", commitSha: "95b83dc79c00de9f1e249b0d5fa0421a0928cd39", beforeSha: sourceSha, parentSha: sourceSha, verifiedLane: true }), { dormant: false, stage: "writer1", sourceSha });
  assert.throws(() => rawValidateControl({ ...active, policy: { ...active.policy, mode: "artifact-recovery" } }, { changedPaths: [".factory-wake/360-words-control.json"], actor: "architect", owner: "architect", commitSha: "95b83dc79c00de9f1e249b0d5fa0421a0928cd39", beforeSha: sourceSha, parentSha: sourceSha, verifiedLane: true }), /isolated verified lane/u);
  assert.throws(() => rawValidateControl({ ...active, recovery: { ...active.recovery, correctionVersion: "words-writer1-correction/v9" } }, { changedPaths: [".factory-wake/360-words-control.json"], actor: "architect", owner: "architect", commitSha: "95b83dc79c00de9f1e249b0d5fa0421a0928cd39", beforeSha: sourceSha, parentSha: sourceSha, verifiedLane: true }), /isolated verified lane/u);
  assert.throws(() => rawValidateControl({ ...active, recovery: { recoveryVersion: "words-writer1-artifact-recovery/v2", sourceSha } }, { changedPaths: [".factory-wake/360-words-control.json"], actor: "architect", owner: "architect", commitSha: "95b83dc79c00de9f1e249b0d5fa0421a0928cd39", beforeSha: sourceSha, parentSha: sourceSha, verifiedLane: true }), /isolated verified lane/u);
});

test("the bounded workflow dispatches the exact verified wake to the verified runner, never legacy recovery", () => {
  const control = JSON.parse(readFileSync(path.join(root, ".factory-wake/360-words-control.json"), "utf8"));
  const sourceSha = "c105239518b9859ea712b7b1dc1b55535609b9a9";
  const v2: any = { ...control, wakeNonce: "W1-VERIFIED-20260825-V2-C105239", policy: { ...control.policy, mode: "writer1-correction" }, recovery: { ...EXPECTED_VERIFIED_CORRECTION_V2, sourceSha, inputDigest: "sha256:f4f59e9c645391266172892e4651f0da4ccedaa2bc86e35217a0ab8699fd0c1f", promptDigest: VERIFIED_WRITER1_PROMPT_V2_DIGEST, allowCreate: false, allowResume: true, allowFollowUp: true, maxFollowUps: 1, idempotencyKey: `${VERIFIED_WRITER1_AGENT_ID}:writer1:correction:v2:sha256:f4f59e9c645391266172892e4651f0da4ccedaa2bc86e35217a0ab8699fd0c1f:${VERIFIED_WRITER1_PROMPT_V2_DIGEST}` } };
  assert.equal(selectVerifiedWriter1Dispatch(v2), "verified-writer1-correction-v2");
  assert.equal(selectVerifiedWriter1Dispatch({ ...v2, recovery: { ...v2.recovery, correctionVersion: "words-writer1-correction/v1" } }), "verified-writer1-correction-v1");
  for (const invalid of [
    { ...v2, recovery: undefined },
    { ...v2, recovery: { ...v2.recovery, correctionVersion: "" } },
    { ...v2, recovery: { ...v2.recovery, correctionVersion: "unknown" } },
    { ...v2, policy: { ...v2.policy, mode: "artifact-recovery" } },
    { ...v2, recovery: { ...v2.recovery, correctionVersion: "words-writer1-correction/v9" } },
    { ...v2, policy: { ...v2.policy, mode: "validation-only" }, recovery: { recoveryVersion: "words-writer1-artifact-recovery/v3" } },
    { ...v2, policy: { ...v2.policy, mode: "validation-report-only" }, recovery: { recoveryVersion: "words-writer1-artifact-recovery/v3-finalize" } },
  ]) assert.equal(selectVerifiedWriter1Dispatch(invalid), "unsupported-verified-lane");
  const workflow = readFileSync(path.join(root, ".github/workflows/architect-360-words-canary.yml"), "utf8");
  assert.match(workflow, /selectVerifiedWriter1Dispatch/u);
  assert.match(workflow, /unsupported-verified-lane/u);
  assert.match(workflow, /verified-writer1-correction-v2/u);
  assert.match(workflow, /scripts\/360-words-verified\.ts --writer1-correction-v2/u);
  assert.doesNotMatch(workflow, /scripts\/360-words-canary\.ts --artifact-recovery/u);
  assert.match(workflow, /Unsupported verified-lane Writer1 dispatch/u);
});

test("exact quarantined Writer1 correction-v3 wake is classified and bound without broadening legacy modes", () => {
  const control = JSON.parse(readFileSync(path.join(root, ".factory-wake/360-words-control.json"), "utf8"));
  const sourceSha = "e".repeat(40);
  const inputDigest = digestWriter1QuarantineCorrectionV3Input(String(EXPECTED_VERIFIED_CORRECTION_V3.sealedHandoffDigest));
  const promptDigest = digestWriter1QuarantineCorrectionV3Prompt();
  const recovery: any = { ...EXPECTED_VERIFIED_CORRECTION_V3, sourceSha, inputDigest, promptDigest, allowCreate: false, allowResume: true, allowFollowUp: true, maxFollowUps: 1, idempotencyKey: `${EXPECTED_VERIFIED_CORRECTION_V3.agentId}:writer1:correction:v3:${inputDigest}:${promptDigest}` };
  const active: any = { ...control, wakeNonce: "W1-VERIFIED-20260825-V3-QUARANTINE", policy: { ...control.policy, mode: "writer1-correction", stopAfter: "awaiting-architect-qa", approvedRoutes: ["/", "/garage-door-repair", "/garage-door-installation", "/contact"] }, recovery };
  assert.equal(selectVerifiedWriter1Dispatch(active), "verified-writer1-correction-v3");
  assert.deepEqual(rawValidateControl(active, { changedPaths: [".factory-wake/360-words-control.json"], actor: "architect", owner: "architect", commitSha: "f".repeat(40), beforeSha: sourceSha, parentSha: sourceSha, verifiedLane: true }), { dormant: false, stage: "writer1", sourceSha });
  const tampered = { ...active, recovery: { ...recovery, sourceArtifact: { ...recovery.sourceArtifact, rawDigest: "sha256:" + "0".repeat(64) } } };
  assert.equal(selectVerifiedWriter1Dispatch(tampered), "verified-writer1-correction-v3");
  assert.throws(() => rawValidateControl(tampered, { changedPaths: [".factory-wake/360-words-control.json"], actor: "architect", owner: "architect", commitSha: "f".repeat(40), beforeSha: sourceSha, parentSha: sourceSha, verifiedLane: true }), /v3 wake/u);
  assert.throws(() => rawValidateControl({ ...active, recovery: { ...recovery, promptDigest: "sha256:" + "0".repeat(64) } }, { changedPaths: [".factory-wake/360-words-control.json"], actor: "architect", owner: "architect", commitSha: "f".repeat(40), beforeSha: sourceSha, parentSha: sourceSha, verifiedLane: true }), /v3 wake/u);
  const workflow = readFileSync(path.join(root, ".github/workflows/architect-360-words-canary.yml"), "utf8");
  assert.match(workflow, /verified-writer1-correction-v3/u); assert.match(workflow, /scripts\/360-words-verified\.ts --writer1-correction-v3/u);
  assert.match(workflow, /verified-writer1-approval-seal/u); assert.match(workflow, /scripts\/360-words-verified\.ts --writer1-approval-seal/u); assert.match(workflow, /verified-writer2-write/u); assert.match(workflow, /scripts\/360-words-verified\.ts --writer2/u);
});

test("the audited Action v3 wake envelope, including quarantine-file sourceArtifact, passes the production validator before transport", async () => {
  const control = JSON.parse(readFileSync(path.join(root, ".factory-wake/360-words-control.json"), "utf8"));
  const sourceSha = "2d49b0a5996e78f6beca2c8c52563da8ad10da6b";
  const inputDigest = digestWriter1QuarantineCorrectionV3Input("sha256:715f651a53055444b8381dd8a276a2046d93776c61d88a2193cc2d42a1c83ad6");
  const promptDigest = digestWriter1QuarantineCorrectionV3Prompt();
  const recovery: any = { ...EXPECTED_VERIFIED_CORRECTION_V3, sourceSha, inputDigest, promptDigest, allowCreate: false, allowResume: true, allowFollowUp: true, maxFollowUps: 1, idempotencyKey: `${EXPECTED_VERIFIED_CORRECTION_V3.agentId}:writer1:correction:v3:${inputDigest}:${promptDigest}` };
  const active: any = { ...control, wakeNonce: "W1-VERIFIED-20260825-V3-DELETE-2D49", policy: { ...control.policy, mode: "writer1-correction", stopAfter: "awaiting-architect-qa", approvedRoutes: ["/", "/garage-door-repair", "/garage-door-installation", "/contact"], recovery } };
  assert.doesNotThrow(() => validateVerifiedWriter1CorrectionV3Control(active, inputDigest));
  assert.deepEqual(rawValidateControl(active, { changedPaths: [".factory-wake/360-words-control.json"], actor: "architect", owner: "architect", commitSha: "826ffd78b56144c6ccefe5bcd52e235d79783570", beforeSha: sourceSha, parentSha: sourceSha, verifiedLane: true }), { dormant: false, stage: "writer1", sourceSha });
  const artifactRoot = await mkdtemp(path.join(tmpdir(), "ff-writer1-v3-extracted-root-"));
  try {
    for (const logicalPath of VERIFIED_WRITER1_CORRECTION_V3_ARTIFACT_PATHS) {
      const file = path.join(artifactRoot, logicalPath); await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, "production-shaped-fixture");
    }
    assert.doesNotThrow(() => validateVerifiedWriter1CorrectionV3ArtifactLayout(artifactRoot));
  } finally { await rm(artifactRoot, { recursive: true, force: true }); }
});

test("correction-v3 source artifact requires exactly the four artifact-relative paths", () => {
  const exact = [...VERIFIED_WRITER1_CORRECTION_V3_ARTIFACT_PATHS];
  assert.doesNotThrow(() => validateVerifiedWriter1CorrectionV3ArtifactListing(exact));
  for (const variant of [
    exact.filter((item) => item !== "runtime/state.json"),
    [...exact, "quarantine/decoy.txt"],
    [...exact.filter((item) => item !== "quarantine/writer1-rejected-output.txt"), "quarantine/writer1-rejected-output.json"],
    ["../runtime/failure.json", ...exact.slice(1)],
  ]) assert.throws(() => validateVerifiedWriter1CorrectionV3ArtifactListing(variant), /exact four-file manifest|unsafe or traversing path/u);
  const workflow = readFileSync(path.join(root, ".github/workflows/architect-360-words-canary.yml"), "utf8");
  assert.match(workflow, /runtime\/failure\.json[\s\S]*runtime\/state\.json[\s\S]*quarantine\/writer1-rejected-output\.txt[\s\S]*quarantine\/writer1-rejection\.json/u);
  assert.match(workflow, /validateVerifiedWriter1CorrectionV3ArtifactFiles/u);
});

test("correction-v3 source artifact pins are exact and reject byte, size, field, symlink, and traversal tampering", async () => {
  const exactBytes = Buffer.from("exact-sidecar-bytes", "utf8");
  const exactPin = { size: exactBytes.length, digest: `sha256:${createHash("sha256").update(exactBytes).digest("hex")}` };
  assert.doesNotThrow(() => verifyVerifiedWriter1CorrectionV3PinnedBytes(exactBytes, exactPin));
  assert.throws(() => verifyVerifiedWriter1CorrectionV3PinnedBytes(Buffer.from("tampered-sidecar-bytes", "utf8"), exactPin), /size or digest/u);
  assert.throws(() => verifyVerifiedWriter1CorrectionV3PinnedBytes(exactBytes, { ...exactPin, size: exactPin.size + 1 }), /size or digest/u);
  assert.equal(VERIFIED_WRITER1_CORRECTION_V3_ARTIFACT_ZIP_SIZE, 6778);
  assert.equal(VERIFIED_WRITER1_CORRECTION_V3_SIDECAR_PINS.rejection.size, 1014);
  assert.equal(VERIFIED_WRITER1_CORRECTION_V3_SIDECAR_PINS.failure.size, 705);
  assert.equal(VERIFIED_WRITER1_CORRECTION_V3_SIDECAR_PINS.state.size, 824);
  const post = { actionRunId: "32825265478", artifactId: 9554789848, agentId: VERIFIED_WRITER1_AGENT_ID, runId: "run-1686013d-dec5-454c-a39e-5817448e6a96", threadUrl: `https://cursor.com/agents/${VERIFIED_WRITER1_AGENT_ID}`, requestedModel: "cursor-grok-4.6-high", resolvedModel: "grok-4.6", effort: "high", fast: false };
  const rawDigest = VERIFIED_WRITER1_CORRECTION_V3_SOURCE.rawDigest; const rawSize = VERIFIED_WRITER1_CORRECTION_V3_SOURCE.size;
  const rejection: any = { actionRunId: post.actionRunId, agentId: post.agentId, approved: false, approvedOutputPath: "canary/outputs/writer1-output.json", artifactId: post.artifactId, effort: post.effort, extractedFormat: "plain-json", fast: post.fast, nextStage: null, rawOutputDigest: rawDigest, rawOutputPath: "canary/quarantine/writer1-rejected-output.txt", rawOutputSize: rawSize, reason: "post-dispatch Writer1 output contains banned mutable language at /pages/0/sections/3/body", recoveryMessagesSent: 0, requestedModel: post.requestedModel, resolvedModel: post.resolvedModel, runId: post.runId, schemaVersion: "verified-writer1-rejection/v1", stage: "writer1", status: "rejected-unapproved", threadUrl: post.threadUrl, validationCode: "WRITER1_OUTPUT_INVALID", writer2Blocked: true };
  const failure: any = { agentId: post.agentId, errorCode: "CURSOR_POST_DISPATCH_OUTPUT_INVALID", messagesSent: 1, nextStage: null, promptDigest: EXPECTED_POST_DISPATCH_ORIGINAL_PROMPT_DIGEST, quarantinePath: "canary/quarantine/writer1-rejected-output.txt", recoveryMessagesSent: 0, rejectionReceiptPath: "canary/quarantine/writer1-rejection.json", runId: post.runId, schemaVersion: "verified-writer-failure/v2", stage: "writer1", status: "writer1-validation-failed-quarantined", threadUrl: post.threadUrl, writer2Blocked: true };
  const state: any = { actionRunId: post.actionRunId, agentId: post.agentId, artifactId: post.artifactId, effort: post.effort, fast: post.fast, messagesSent: 1, nextStage: null, quarantinePath: "canary/quarantine/writer1-rejected-output.txt", rawOutputDigest: rawDigest, recoveryMessagesSent: 0, rejectionReceiptPath: "canary/quarantine/writer1-rejection.json", requestedModel: post.requestedModel, resolvedModel: post.resolvedModel, runId: post.runId, schemaVersion: "verified-writer-state/v2", stage: "writer1", status: "writer1-validation-failed-quarantined", threadUrl: post.threadUrl, writer2Blocked: true };
  assert.doesNotThrow(() => validateVerifiedWriter1CorrectionV3SidecarMetadata({ rejection, failure, state, rawDigest, rawSize }));
  for (const mutation of [
    () => { rejection.requestedModel = "wrong-model"; },
    () => { failure.promptDigest = "sha256:" + "0".repeat(64); },
    () => { state.messagesSent = 0; },
    () => { state.extra = true; },
    () => { rejection.rawOutputSize = rawSize + 1; },
  ]) {
    const saved = { rejection: { ...rejection }, failure: { ...failure }, state: { ...state } };
    mutation();
    assert.throws(() => validateVerifiedWriter1CorrectionV3SidecarMetadata({ rejection, failure, state, rawDigest, rawSize }), /invalid|unexpected|binding|identity/u);
    for (const key of Object.keys(rejection)) delete rejection[key]; for (const key of Object.keys(failure)) delete failure[key]; for (const key of Object.keys(state)) delete state[key];
    Object.assign(rejection, saved.rejection); Object.assign(failure, saved.failure); Object.assign(state, saved.state);
  }
  const root = await mkdtemp(path.join(tmpdir(), "ff-writer1-v3-layout-"));
  try {
    for (const logicalPath of VERIFIED_WRITER1_CORRECTION_V3_ARTIFACT_PATHS) {
      const file = path.join(root, logicalPath); await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, "fixture");
    }
    assert.doesNotThrow(() => validateVerifiedWriter1CorrectionV3ArtifactLayout(root));
    await rm(path.join(root, "runtime/failure.json")); await symlink("state.json", path.join(root, "runtime/failure.json"));
    assert.throws(() => validateVerifiedWriter1CorrectionV3ArtifactLayout(root), /symlink/u);
  } finally { await rm(root, { recursive: true, force: true }); }
  const workflow = readFileSync(path.join(process.cwd(), ".github/workflows/architect-360-words-canary.yml"), "utf8");
  const verifiedSource = readFileSync(path.join(process.cwd(), "scripts/360-words-verified.ts"), "utf8");
  assert.match(workflow, /EXPECTED_ARTIFACT_ZIP_SIZE: '6778'/u);
  assert.match(verifiedSource, /2e83fcd65d4b863edef6309939f473dfcf1f605fe6daf82676afddd01d17cfd6/u);
  assert.match(verifiedSource, /1e72c616b0d31ab55907cd1a6e6dfeb080be611716c318dc72f44b2e5842c0ee/u);
  assert.match(verifiedSource, /bd00f8b779ed21d6e381a78c0a05d80f76c0b9485a7a65f97c407fee3599e945/u);
});

test("post-dispatch wake is classified as retrieval-only and cannot reach a follow-up or legacy artifact runner", () => {
  const control = JSON.parse(readFileSync(path.join(root, ".factory-wake/360-words-control.json"), "utf8"));
  const sourceSha = "b".repeat(40); const inputDigest = EXPECTED_POST_DISPATCH_ORIGINAL_INPUT_DIGEST;
  const receiptManifest = { schemaVersion: "verified-writer1-dispatch-manifest/v1", actionRunId: "32825265478", artifactId: 9554789848, artifactZipDigest: "sha256:e4315183eac7c3755a27e9a46622ea63c4d99978e5bc98e02eae9658a7504648", artifactZipSize: 2753, receiptPath: "runtime/writer1-dispatch-receipt.json", receiptDigest: "sha256:b4769f3dded171060119cc9f5b42f33dfe1d882c31d441c08c185806066598d4", receiptSize: 1536, controlBindingDigest: "sha256:" + "3".repeat(64), manifestDigest: "sha256:" + "4".repeat(64), manifestMac: "hmac-sha256:" + "5".repeat(64) };
  const sealedManifest = { schemaVersion: "verified-writer1-sealed-manifest-pin/v1", sourceActionRunId: "32825000000", sourceArtifactId: 9554000000, sourceSha: "a".repeat(40), manifestPath: "runtime/writer1-dispatch-manifest.json", manifestBytesDigest: "sha256:" + "6".repeat(64), manifestSize: 1234, manifestDigest: "sha256:" + "7".repeat(64), manifestMac: "hmac-sha256:" + "8".repeat(64) };
  const active: any = { ...control, wakeNonce: "W1-POST-DISPATCH-20260825", policy: { ...control.policy, mode: "writer1-retrieval-only" }, recovery: { recoveryVersion: "words-writer1-post-dispatch-retrieval/v1", actionRunId: "32825265478", artifactId: 9554789848, sourceBranch: "architect/360-words-canary-verified", sourceSha, agentId: VERIFIED_WRITER1_AGENT_ID, runId: "run-1686013d-dec5-454c-a39e-5817448e6a96", threadUrl: `https://cursor.com/agents/${VERIFIED_WRITER1_AGENT_ID}`, requestedModel: "cursor-grok-4.6-high", resolvedModel: "grok-4.6", effort: "high", fast: false, inputDigest, promptDigest: EXPECTED_POST_DISPATCH_ORIGINAL_PROMPT_DIGEST, idempotencyKey: EXPECTED_POST_DISPATCH_ORIGINAL_IDEMPOTENCY_KEY, allowCreate: false, allowResume: false, allowFollowUp: false, maxFollowUps: 0, receiptManifest, sealActionRunId: sealedManifest.sourceActionRunId, sealArtifactId: sealedManifest.sourceArtifactId, sealedManifest } };
  assert.equal(selectVerifiedWriter1Dispatch(active), "verified-writer1-retrieval-only");
  assert.doesNotThrow(() => rawValidateControl(active, { changedPaths: [".factory-wake/360-words-control.json"], actor: "architect", owner: "architect", commitSha: "c".repeat(40), beforeSha: sourceSha, parentSha: sourceSha, verifiedLane: true }));
  assert.doesNotThrow(() => validateVerifiedWriter1PostDispatchControl(active, inputDigest));
  assert.throws(() => rawValidateControl({ ...active, recovery: { ...active.recovery, receiptManifest: { ...receiptManifest, artifactZipDigest: "sha256:e4315183" } } }, { changedPaths: [".factory-wake/360-words-control.json"], actor: "architect", owner: "architect", commitSha: "c".repeat(40), beforeSha: sourceSha, parentSha: sourceSha, verifiedLane: true }), /sealed authenticity|pins/u);
  assert.throws(() => validateVerifiedWriter1PostDispatchControl({ ...active, recovery: { ...active.recovery, receiptManifest: { ...receiptManifest, receiptSize: 1535 } } }, inputDigest), /complete Architect-sealed|manifest pins/u);
  for (const invalid of ["", "unknown", "words-writer1-correction/v3", "words-writer1-artifact-recovery/v3", "words-writer1-artifact-recovery/v3-finalize"]) assert.equal(selectVerifiedWriter1Dispatch({ ...active, recovery: { ...active.recovery, recoveryVersion: invalid } }), "unsupported-verified-lane");
  const workflow = readFileSync(path.join(root, ".github/workflows/architect-360-words-canary.yml"), "utf8");
  assert.match(workflow, /verified-writer1-retrieval-only/u); assert.match(workflow, /--writer1-retrieval-only/u); assert.doesNotMatch(workflow, /--writer1-retrieval-only[\s\S]*--artifact-recovery/u);
  assert.equal(active.recovery.runId, "run-1686013d-dec5-454c-a39e-5817448e6a96");
});

test("sealed Action ZIP uses its exact root logical listing and extraction paths", () => {
  const workflow = readFileSync(path.join(root, ".github/workflows/architect-360-words-canary.yml"), "utf8");
  const verifiedSource = readFileSync(path.join(root, "scripts/360-words-verified.ts"), "utf8");
  assert.match(workflow, /expected_seal_listing[\s\S]*runtime\/state\.json[\s\S]*runtime\/writer1-dispatch-manifest\.json[\s\S]*runtime\/writer1-seal-receipt\.json/u);
  assert.match(workflow, /manifest='canary\/inputs\/post-dispatch-seal-artifact\/runtime\/writer1-dispatch-manifest\.json'/u);
  assert.match(workflow, /seal_receipt='canary\/inputs\/post-dispatch-seal-artifact\/runtime\/writer1-seal-receipt\.json'/u);
  assert.match(workflow, /WRITER1_POST_DISPATCH_SEAL_ROOT: canary\/inputs\/post-dispatch-seal-artifact\n/u);
  assert.doesNotMatch(workflow, /post-dispatch-seal-artifact\/canary\/runtime\/(?:writer1-dispatch-manifest|writer1-seal-receipt)\.json/u);
  assert.match(verifiedSource, /VERIFIED_WRITER1_POST_DISPATCH_MANIFEST_PATH\s*=\s*"runtime\/writer1-dispatch-manifest\.json"/u);
  assert.match(verifiedSource, /manifestPath:\s*VERIFIED_WRITER1_POST_DISPATCH_MANIFEST_PATH/u);
  assert.match(verifiedSource, /pin\.manifestPath\s*!==\s*VERIFIED_WRITER1_POST_DISPATCH_MANIFEST_PATH/u);
  assert.doesNotMatch(verifiedSource, /manifestPath:\s*"canary\/runtime\/writer1-dispatch-manifest\.json"/u);
  assert.match(workflow, /id: secret_scan[\s\S]*if: always\(\) && steps\.control\.outputs\.dormant != 'true'/u);
  assert.match(workflow, /Upload durable canary state[\s\S]*if: always\(\) && \(steps\.control\.outputs\.dormant == 'true' \|\| steps\.secret_scan\.outcome == 'success'\)/u);
});

test("sealed manifest pin verifies exact bytes, not a semantically equivalent JSON reserialization", () => {
  const exact = Buffer.from('{"schemaVersion":"verified-writer1-dispatch-manifest/v1","value":1}\n', "utf8");
  const pin = { manifestSize: exact.byteLength, manifestBytesDigest: `sha256:${createHash("sha256").update(exact).digest("hex")}` };
  assert.doesNotThrow(() => verifyPinnedSealedManifestBytes(exact, pin));
  const equivalent = Buffer.from(JSON.stringify(JSON.parse(exact.toString("utf8"))), "utf8");
  assert.deepEqual(JSON.parse(equivalent.toString("utf8")), JSON.parse(exact.toString("utf8")));
  assert.notDeepEqual(equivalent, exact);
  assert.throws(() => verifyPinnedSealedManifestBytes(equivalent, pin), /sealed manifest bytes do not match/u);
});

test("rejected retrieval output is quarantined verbatim, unapproved, blocked, and secret-scanned", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "ff-writer1-quarantine-"));
  const secret = "should-not-enter-receipt";
  const json = JSON.stringify({ schemaVersion: "words-writer1-output/v1", pages: [{ type: "service", url: "/garage-door-repair", body: "Rejected mutable output" }, { type: "service", url: "/garage-door-installation" }] });
  const fence = String.fromCharCode(96).repeat(3);
  const raw = ` \n${fence}json\n${json}\n${fence}\n  `;
  try {
    const result = await quarantineWriter1PostDispatchOutput(root, { rawResult: raw, parsedJson: json, format: "fenced-json", reason: "banned mutable language at /pages/0/sections/3/body", validationCode: "WRITER1_OUTPUT_INVALID" });
    assert.equal(result.outputPath, VERIFIED_WRITER1_REJECTED_OUTPUT_PATH);
    assert.equal(result.receiptPath, VERIFIED_WRITER1_REJECTION_RECEIPT_PATH);
    assert.equal(await readFile(path.join(root, result.outputPath), "utf8"), raw);
    const receipt = JSON.parse(await readFile(path.join(root, result.receiptPath), "utf8"));
    assert.equal(receipt.status, "rejected-unapproved");
    assert.equal(receipt.approved, false);
    assert.equal(receipt.recoveryMessagesSent, 0);
    assert.equal(receipt.writer2Blocked, true);
    assert.equal(receipt.nextStage, null);
    assert.equal(receipt.rawOutputPath, "canary/quarantine/writer1-rejected-output.txt");
    assert.equal(receipt.rawOutputSize, Buffer.byteLength(raw, "utf8"));
    assert.match(receipt.rawOutputDigest, /^sha256:[0-9a-f]{64}$/u);
    assert.equal(receipt.approvedOutputPath, "canary/outputs/writer1-output.json");
    assert.equal(existsSync(path.join(root, "canary/outputs/writer1-output.json")), false);
    assert.doesNotMatch(JSON.stringify(receipt), new RegExp(secret, "u"));
    const workflow = readFileSync(path.join(path.resolve(process.cwd()), ".github/workflows/architect-360-words-canary.yml"), "utf8");
    assert.match(workflow, /visit\('canary\/quarantine'\)/u);
    assert.match(workflow, /canary\/quarantine\/writer1-rejected-output\.txt/u);
    assert.match(workflow, /canary\/quarantine\/writer1-rejection\.json/u);
    const verifiedSource = readFileSync(path.join(path.resolve(process.cwd()), "scripts/360-words-verified.ts"), "utf8");
    assert.match(verifiedSource, /status:\s*"writer1-validation-failed-quarantined"/u);
    assert.match(verifiedSource, /status: input\.quarantined \? "writer1-validation-failed-quarantined" : "failed"/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the complete quarantined failure path preserves its final state and raw digest", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "ff-writer1-quarantine-final-state-"));
  const json = JSON.stringify({ schemaVersion: "words-writer1-output/v1", pages: [{ type: "service", url: "/garage-door-repair" }, { type: "service", url: "/garage-door-installation" }] });
  const fence = String.fromCharCode(96).repeat(3);
  const raw = `\n${fence}json\n${json}\n${fence}\n`;
  try {
    const quarantine = await quarantineWriter1PostDispatchOutput(root, { rawResult: raw, parsedJson: json, format: "fenced-json", reason: "banned mutable language", validationCode: "WRITER1_OUTPUT_INVALID" });
    await persistVerifiedWriterFailureSurface(root, { errorCode: "WRITER1_OUTPUT_INVALID", retrievalOnly: true, quarantined: true, messagesSent: 1, quarantine });
    const state = JSON.parse(await readFile(path.join(root, "canary/runtime/state.json"), "utf8"));
    assert.equal(state.status, "writer1-validation-failed-quarantined");
    assert.equal(state.quarantinePath, quarantine.outputPath);
    assert.equal(state.rejectionReceiptPath, quarantine.receiptPath);
    assert.equal(state.rawOutputDigest, quarantine.rawDigest);
    assert.equal(state.writer2Blocked, true);
    assert.equal(state.nextStage, null);
    assert.equal(state.recoveryMessagesSent, 0);
    assert.equal(JSON.parse(await readFile(path.join(root, "canary/runtime/failure.json"), "utf8")).status, "writer1-validation-failed-quarantined");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("two-step seal-only mode is classified separately and has no Cursor retrieval path", () => {
  const control = JSON.parse(readFileSync(path.join(root, ".factory-wake/360-words-control.json"), "utf8"));
  const sourceSha = "a".repeat(40);
  const active: any = { ...control, wakeNonce: "W1-SEAL-ONLY-20260825", policy: { ...control.policy, mode: "writer1-seal-only", stopAfter: "manifest-sealed" }, recovery: {
    recoveryVersion: "words-writer1-post-dispatch-seal/v1", sourceBranch: "architect/360-words-canary-verified", sourceSha,
    actionRunId: "32825265478", artifactId: 9554789848, agentId: VERIFIED_WRITER1_AGENT_ID, runId: "run-1686013d-dec5-454c-a39e-5817448e6a96", threadUrl: `https://cursor.com/agents/${VERIFIED_WRITER1_AGENT_ID}`,
    requestedModel: "cursor-grok-4.6-high", resolvedModel: "grok-4.6", effort: "high", fast: false,
    inputDigest: EXPECTED_POST_DISPATCH_ORIGINAL_INPUT_DIGEST, promptDigest: EXPECTED_POST_DISPATCH_ORIGINAL_PROMPT_DIGEST, idempotencyKey: EXPECTED_POST_DISPATCH_ORIGINAL_IDEMPOTENCY_KEY,
    allowCreate: false, allowResume: false, allowFollowUp: false, maxFollowUps: 0,
    receiptPins: { artifactZipDigest: "sha256:e4315183eac7c3755a27e9a46622ea63c4d99978e5bc98e02eae9658a7504648", artifactZipSize: 2753, receiptPath: "runtime/writer1-dispatch-receipt.json", receiptDigest: "sha256:b4769f3dded171060119cc9f5b42f33dfe1d882c31d441c08c185806066598d4", receiptSize: 1536 },
  } };
  assert.equal(selectVerifiedWriter1Dispatch(active), "verified-writer1-seal-only");
  validateVerifiedWriter1SealOnlyControl(active);
  const source = readFileSync(path.join(root, "scripts/360-words-verified.ts"), "utf8");
  const sealBody = source.slice(source.indexOf("runVerifiedWriter1PostDispatchSealOnly"), source.indexOf("runVerifiedWriter1PostDispatchRecovery"));
  assert.doesNotMatch(sealBody, /recoverCursorWriterPostDispatch|Agent\.getRun|Agent\.create|\.resume\(|\.send\(|\.wait\(/u);
  for (const bad of ["writer1-retrieval-only", "artifact-recovery", "validation-only", "words-writer1-post-dispatch-seal/v2"]) assert.equal(selectVerifiedWriter1Dispatch({ ...active, policy: { ...active.policy, mode: bad }, recovery: { ...active.recovery, recoveryVersion: bad } }), "unsupported-verified-lane");
});

test("the real 1536-byte dispatch receipt binds through its durable sidecars without inventing missing fields", () => {
  const fixtureRoot = path.join(root, "fixtures/verified-writer1-post-dispatch");
  const evidence = verifyOriginalDispatchEvidence(fixtureRoot);
  assert.equal(evidence.dispatchFile.bytes.byteLength, 1536);
  assert.equal(evidence.dispatchFile.logicalPath, "runtime/writer1-dispatch-receipt.json");
  assert.equal(evidence.dispatchFile.dispatch.inputDigest, EXPECTED_POST_DISPATCH_ORIGINAL_INPUT_DIGEST);
  assert.equal(evidence.dispatchFile.dispatch.promptDigest, EXPECTED_POST_DISPATCH_ORIGINAL_PROMPT_DIGEST);
  assert.equal(Object.hasOwn(evidence.dispatchFile.dispatch, "idempotencyKey"), false);
  assert.equal(Object.hasOwn(evidence.dispatchFile.dispatch, "messagesSent"), false);
  assert.equal(evidence.idempotencySource, "runtime/cursor-receipts.json:claims[originalIdempotencyKey]");
  assert.equal(evidence.messagesSentSource, "runtime/state.json:messagesSent");
  assert.equal(evidence.messagesSent, 1);
});

test("verified policy requires new downstream agents and signed direct receipts, with immutable Writer3 facts", () => {
  assert.deepEqual(VERIFIED_PUBLIC_ROUTES, ["/", "/garage-door-repair", "/garage-door-installation", "/contact"]);
  assert.equal(VERIFIED_STAGE_POLICY.writer2.agentMode, "new-agent"); assert.deepEqual(VERIFIED_STAGE_POLICY.writer2.allowedRoutes, ["/", "/contact"]);
  assert.equal(VERIFIED_STAGE_POLICY.writer3.agentMode, "new-agent"); assert.deepEqual(VERIFIED_STAGE_POLICY.writer3.allowedRoutes, ["/"]);
  assert.deepEqual(VERIFIED_WRITER3_SEALED_FACTS, { retrievedWrittenReviewCount: 47, reviewRetrievalDate: "2026-08-23", reviewBackedServicesWithoutPages: 2, reviewBackedServiceNames: ["Garage door repair", "Garage door installation"] });
  assert.throws(() => assertVerifiedDownstreamState({ status: "awaiting-human-gate-2", stage: "awaiting-human-gate-2", writer2Blocked: false, writer3Released: true, nextStage: null }), /manufactured downstream/u);
});

test("two-wake Writer1 approval seal and Writer2 wake are separate, bounded, and classified fail-closed", () => {
  const control = JSON.parse(readFileSync(path.join(root, ".factory-wake/360-words-control.json"), "utf8"));
  const sourceSha = "b".repeat(40);
  const seal: any = { ...control, wakeNonce: "W1-APPROVAL-SEAL-20260825", policy: { ...control.policy, mode: "writer1-approval-seal", stopAfter: "writer1-approval-sealed" }, recovery: { recoveryVersion: "verified-writer1-approval-seal/v1", sourceBranch: "architect/360-words-canary-verified", sourceSha, actionRunId: "32845845871", artifactId: 9562364448, artifactZipDigest: "sha256:147dad95aa6985a3991d7e12212921b18cbbd71a65d2a614f413444aaababade", artifactZipSize: 33290, allowCreate: false, allowResume: false, allowFollowUp: false, maxFollowUps: 0, independentQaArtifacts: [{ role: "content", path: "qa/architect/writer1-content.json", size: 100, digest: "sha256:" + "1".repeat(64), decision: "PASS" }, { role: "evidence", path: "qa/architect/writer1-evidence.json", size: 100, digest: "sha256:" + "2".repeat(64), decision: "PASS" }], approval: { path: "qa/architect/writer1-approval.json", size: 100, digest: "sha256:" + "3".repeat(64) } } };
  assert.equal(selectVerifiedWriter1Dispatch(seal), "verified-writer1-approval-seal");
  assert.deepEqual(rawValidateControl(seal, { changedPaths: [".factory-wake/360-words-control.json"], actor: "architect", owner: "architect", commitSha: "c".repeat(40), beforeSha: sourceSha, parentSha: sourceSha, verifiedLane: true }), { dormant: false, stage: "writer1", sourceSha });
  const writer2: any = { ...control, stage: "writer2", wakeNonce: "W2-NEW-AGENT-20260825", policy: { ...control.policy, writer1Only: undefined, writer2Only: true, mode: "writer2-write", stopAfter: "awaiting-architect-qa", approvedRoutes: ["/", "/garage-door-repair", "/garage-door-installation", "/contact"] }, recovery: { recoveryVersion: "verified-writer2-write/v1", sourceBranch: "architect/360-words-canary-verified", sourceSha, runId: "run-verified-writer2-wake", requestedModel: "cursor-grok-4.6-high", resolvedModel: "grok-4.6", effort: "high", fast: false, inputDigest: "sha256:" + "3".repeat(64), promptDigest: VERIFIED_WRITER2_PROMPT_DIGEST, idempotencyKey: "run-verified-writer2-wake:writer2:sha256:" + "3".repeat(64) + ":" + VERIFIED_WRITER2_PROMPT_DIGEST, allowCreate: true, allowResume: false, allowFollowUp: false, maxFollowUps: 0, seal: { approvalPath: "canary/runtime/architect-writer1-approval.json", receiptPath: "canary/runtime/writer1-approved-receipt.json", outputPath: "canary/outputs/writer1-output.json", artifactZipDigest: "sha256:147dad95aa6985a3991d7e12212921b18cbbd71a65d2a614f413444aaababade", artifactZipSize: 33290, approvalDigest: "sha256:" + "5".repeat(64), approvalSize: 100, writer1OutputDigest: "sha256:" + "6".repeat(64), writer1ReceiptOutputDigest: "sha256:" + "6".repeat(64) } } };
  assert.equal(selectVerifiedWriter1Dispatch(writer2), "verified-writer2-write");
  assert.deepEqual(rawValidateControl(writer2, { changedPaths: [".factory-wake/360-words-control.json"], actor: "architect", owner: "architect", commitSha: "c".repeat(40), beforeSha: sourceSha, parentSha: sourceSha, verifiedLane: true }), { dormant: false, stage: "writer2", sourceSha });
  for (const badMode of ["writer1-approval-seal", "artifact-recovery", "writer1-retrieval-only"]) {
    const bad = structuredClone(writer2); bad.policy.mode = badMode; if (badMode !== "writer2-write") bad.recovery.recoveryVersion = "unknown";
    assert.equal(selectVerifiedWriter1Dispatch(bad), "unsupported-verified-lane");
  }
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
  const stages = readFileSync(path.join(root, "src/pipeline/verified-words-stages.ts"), "utf8");
  assert.match(stages, /verified-writer2-dispatch\.json/u); assert.match(stages, /threadUrl: notice\.threadUrl/u);
});

test("Architect approvals are externally Ed25519-verified and never signed with Cursor secrets", () => {
  const policy = readFileSync(path.join(root, "src/pipeline/verified-words-policy.ts"), "utf8");
  const signer = readFileSync(path.join(root, "src/pipeline/architect-approval.ts"), "utf8");
  const runner = readFileSync(path.join(root, "scripts/360-words-verified.ts"), "utf8");
  assert.doesNotMatch(policy, /createHmac|timingSafeEqual|hmac-sha256.*architect/iu);
  assert.doesNotMatch(runner, /signArchitectStageApproval|createPrivateKey|privateKey/iu);
  assert.match(signer, /verify\(null/u); assert.match(signer, /ARCHITECT_APPROVAL_PUBLIC_KEY_ENV/u);
  assert.doesNotMatch(`${policy}\n${signer}\n${runner}`, /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/iu);
});

test("Actions loads the exact committed public key and rejects missing, altered, wrong, private, and symlinked keys", async () => {
  const keyPath = path.join(root, ARCHITECT_APPROVAL_PUBLIC_KEY_PATH);
  const keyBytes = readFileSync(keyPath);
  assert.equal(createHash("sha256").update(keyBytes).digest("hex"), ARCHITECT_APPROVAL_PUBLIC_KEY_SHA256);
  assert.doesNotMatch(keyBytes.toString("utf8"), /PRIVATE KEY/iu);
  assert.equal(loadPinnedArchitectPublicKey(root), keyBytes.toString("utf8"));
  assert.throws(() => validatePinnedArchitectPublicKeyBytes(Buffer.from(`${keyBytes}altered`)), /digest/u);
  const wrongKey = generateKeyPairSync("ed25519").publicKey.export({ type: "spki", format: "pem" });
  assert.throws(() => validatePinnedArchitectPublicKeyBytes(Buffer.from(wrongKey)), /digest/u);
  assert.throws(() => validatePinnedArchitectPublicKeyBytes(Buffer.from("-----BEGIN PRIVATE KEY-----\nnot-a-key\n-----END PRIVATE KEY-----\n")), /private-key/u);
  const missingRoot = await mkdtemp(path.join(tmpdir(), "ff-architect-public-key-missing-"));
  const alteredRoot = await mkdtemp(path.join(tmpdir(), "ff-architect-public-key-altered-"));
  const symlinkRoot = await mkdtemp(path.join(tmpdir(), "ff-architect-public-key-symlink-"));
  try {
    assert.throws(() => loadPinnedArchitectPublicKey(missingRoot), /missing/u);
    await mkdir(path.join(alteredRoot, path.dirname(ARCHITECT_APPROVAL_PUBLIC_KEY_PATH)), { recursive: true });
    await writeFile(path.join(alteredRoot, ARCHITECT_APPROVAL_PUBLIC_KEY_PATH), Buffer.from(`${keyBytes}altered`));
    assert.throws(() => loadPinnedArchitectPublicKey(alteredRoot), /digest/u);
    await mkdir(path.join(symlinkRoot, path.dirname(ARCHITECT_APPROVAL_PUBLIC_KEY_PATH)), { recursive: true });
    await symlink(keyPath, path.join(symlinkRoot, ARCHITECT_APPROVAL_PUBLIC_KEY_PATH));
    assert.throws(() => loadPinnedArchitectPublicKey(symlinkRoot), /symlink/u);
  } finally {
    await Promise.all([rm(missingRoot, { recursive: true, force: true }), rm(alteredRoot, { recursive: true, force: true }), rm(symlinkRoot, { recursive: true, force: true })]);
  }
  const workflow = readFileSync(path.join(root, ".github/workflows/architect-360-words-canary.yml"), "utf8");
  assert.match(workflow, /qa\/architect\/architect-ed25519-v1-public\.pem/u);
  assert.match(workflow, /sha256sum.*b0c4c57d7f905c215b6f8555d8abca81f7ea034319bc665dc920b50546b6e0f9/u);
  assert.doesNotMatch(workflow, /vars\.ARCHITECT_APPROVAL_PUBLIC_KEY_PEM/u);
  assert.match(workflow, /ARCHITECT_APPROVAL_PUBLIC_KEY_PEM=.*cat.*public_key_path/u);
  assert.match(workflow, /! grep -q 'PRIVATE KEY'/u);
});

test("approval seal assembles old artifact output with checked-in signed QA bytes without a fallback path", async () => {
  const sourceRoot = await mkdtemp(path.join(tmpdir(), "ff-approval-source-root-"));
  const artifactRoot = await mkdtemp(path.join(tmpdir(), "ff-approval-old-artifact-root-"));
  try {
    const qa = { content: Buffer.from("signed-content-qa\n"), evidence: Buffer.from("signed-evidence-qa\n"), approval: Buffer.from("signed-writer1-approval\n") };
    const pin = (role: keyof typeof qa, filePath: string, decision?: string) => ({ role, path: filePath, size: qa[role].length, digest: `sha256:${createHash("sha256").update(qa[role]).digest("hex")}`, ...(decision ? { decision } : {}) });
    const control: any = { policy: { recovery: { independentQaArtifacts: [pin("content", "qa/architect/writer1-content.json", "PASS"), pin("evidence", "qa/architect/writer1-evidence.json", "PASS")], approval: pin("approval", "qa/architect/writer1-approval.json") } } };
    await mkdir(path.join(sourceRoot, "qa/architect"), { recursive: true });
    await mkdir(path.join(artifactRoot, "outputs"), { recursive: true });
    await writeFile(path.join(artifactRoot, "outputs/writer1-output.json"), "immutable old artifact output");
    await writeFile(path.join(sourceRoot, "qa/architect/writer1-content.json"), qa.content);
    await writeFile(path.join(sourceRoot, "qa/architect/writer1-evidence.json"), qa.evidence);
    await writeFile(path.join(sourceRoot, "qa/architect/writer1-approval.json"), qa.approval);
    assert.equal(existsSync(path.join(artifactRoot, "qa/architect/writer1-content.json")), false);
    copyVerifiedArchitectApprovalInputs(sourceRoot, artifactRoot, control);
    for (const [name, bytes] of Object.entries(qa)) assert.deepEqual(readFileSync(path.join(artifactRoot, name === "approval" ? "qa/architect/writer1-approval.json" : `qa/architect/writer1-${name}.json`)), bytes);
    assert.deepEqual(readFileSync(path.join(artifactRoot, "outputs/writer1-output.json")), Buffer.from("immutable old artifact output"));
    const tampered = structuredClone(control); tampered.policy.recovery.independentQaArtifacts[0].digest = `sha256:${"0".repeat(64)}`;
    assert.throws(() => copyVerifiedArchitectApprovalInputs(sourceRoot, artifactRoot, tampered), /pin/u);
    const workflow = readFileSync(path.join(root, ".github/workflows/architect-360-words-canary.yml"), "utf8");
    assert.match(workflow, /verify-architect-approval-inputs\.ts/u);
    assert.doesNotMatch(workflow, /writer1-(?:content|evidence|approval)\.json'\s*$/mu);
  } finally {
    await Promise.all([rm(sourceRoot, { recursive: true, force: true }), rm(artifactRoot, { recursive: true, force: true })]);
  }
});
