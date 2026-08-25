import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import test from "node:test";
import { ARTIFACT_RECOVERY_ACTION_RUN_ID, ARTIFACT_RECOVERY_AGENT_ID, ARTIFACT_RECOVERY_ARTIFACT_ID, ARTIFACT_RECOVERY_PRIOR_RUN_ID, ARTIFACT_RECOVERY_SOURCE_BRANCH, ARTIFACT_RECOVERY_THREAD_URL, ARTIFACT_RECOVERY_V1_ACTION_RUN_ID, ARTIFACT_RECOVERY_V1_AGENT_ID, ARTIFACT_RECOVERY_V1_ARTIFACT_ID, ARTIFACT_RECOVERY_V1_ARTIFACT_DIGEST, ARTIFACT_RECOVERY_V1_RUN_ID, ARTIFACT_RECOVERY_V1_SOURCE_SHA, ARTIFACT_RECOVERY_V1_THREAD_URL, WRITER1_ARTIFACT_RECOVERY_PROMPT, WRITER1_ARTIFACT_RECOVERY_V2_PROMPT, WRITER1_ARTIFACT_RECOVERY_V3_PROMPT, validatePriorArtifactRecoveryDispatch, validatePriorArtifactRecoveryFailure, validateSealed, dispatchReceipt, run, writer1HistoricalInputDigest, writer1Projection } from "../../scripts/360-words-canary.js";
import { EXPECTED_RECOVERY, EXPECTED_RECOVERY_V2, EXPECTED_RECOVERY_V3, EXPECTED_RECOVERY_V3_FINALIZE, validateControl as rawValidateControl } from "../../scripts/360-words-control.mjs";
import { buildWriter1ArtifactRecoveryPrompt, digestWriter1ArtifactRecoveryPrompt } from "../../scripts/360-words-recovery-prompt.mjs";
import { digestOf } from "../../src/contracts/digests.js";

const root = path.resolve(process.cwd());
const routes = ["/", "/garage-door-repair", "/garage-door-installation", "/contact"];
const rawHandoff = () => readFileSync(path.join(root, "canary/sealed/360-four-page-reseal-handoff.json"));
const blobSha = (raw: Buffer) => createHash("sha1").update(Buffer.concat([Buffer.from(`blob ${raw.length}\0`), raw])).digest("hex");
const v1PromptDigest = digestWriter1ArtifactRecoveryPrompt("v1");
const v2PromptDigest = digestWriter1ArtifactRecoveryPrompt("v2");
const v3PromptDigest = digestWriter1ArtifactRecoveryPrompt("v3");
const v2IdempotencyKey = (inputDigest = "sha256:" + "1".repeat(64), promptDigest = v2PromptDigest) => `run-1b862d23-a748-4574-909a-66aac905eb97:writer1:artifact-recovery:v2:${inputDigest}:${promptDigest}`;
const activeRecovery = (sourceSha: string, promptDigest = v2PromptDigest, idempotencyKey = v2IdempotencyKey()) => ({ ...EXPECTED_RECOVERY, ...EXPECTED_RECOVERY_V2, sourceSha, priorRecoveryPromptDigest: v1PromptDigest, promptDigest, idempotencyKey });
const validateControl = (control: Record<string, any>, input: Record<string, any> = {}) => {
  if (control.wakeNonce !== "DORMANT") {
    const sourceSha = control.policy?.recovery?.sourceSha;
    return rawValidateControl(control, { ...input, commitSha: "d".repeat(40), beforeSha: sourceSha, parentSha: sourceSha });
  }
  return rawValidateControl(control, input);
};

test("imports the exact PR3 handoff blob and preserves the four public routes", () => {
  const raw = rawHandoff();
  const handoff = JSON.parse(raw.toString("utf8")) as Record<string, any>;
  const sealed = validateSealed(root, { raw, value: handoff });
  assert.equal(blobSha(raw), sealed.manifest.importedFrom.blobSha);
  assert.equal(raw.length, sealed.manifest.importedFrom.byteLength);
  assert.equal(handoff.resealDigest, "sha256:715f651a53055444b8381dd8a276a2046d93776c61d88a2193cc2d42a1c83ad6");
  assert.deepEqual(handoff.writerProjection.routes, routes);
  assert.deepEqual(sealed.manifest.approvedRoutes, routes);
  assert.deepEqual(sealed.manifest.writer1Routes, routes.slice(1, 3));
  assert.deepEqual(sealed.ledger.services.map((service: Record<string, any>) => service.id), ["garage-door-repair", "garage-door-installation", "home-breadth"]);
  assert.equal(sealed.approval.approvedBy, "Josh Lenz");
});

test("lossless sealed bridge rejects omitted or mutated envelope bindings", () => {
  const raw = rawHandoff();
  const handoff = JSON.parse(raw.toString("utf8")) as Record<string, any>;
  const sealed = validateSealed(root, { raw, value: handoff });
  const mutatedFacts = structuredClone(sealed.bridge);
  mutatedFacts.reviewAnalysisFacts.value.retrievedWrittenReviewCount = 999;
  assert.throws(() => validateSealed(root, { raw, value: handoff }, mutatedFacts), /sealed envelope bridge/);
  const mutatedIds = structuredClone(sealed.bridge);
  mutatedIds.reviewInventory.stableReviewIds.pop();
  assert.throws(() => validateSealed(root, { raw, value: handoff }, mutatedIds), /sealed envelope bridge/);
});

test("Writer1 receives only two service projections, service evidence, and bounded folded support", () => {
  const raw = rawHandoff();
  const sealed = validateSealed(root, { raw, value: JSON.parse(raw.toString("utf8")) });
  const input = writer1Projection(sealed);
  assert.deepEqual(Object.keys(input).sort(), ["approvedRoutes", "bridgeDigest", "foldedSupport", "schemaVersion", "sealedRefs", "services", "sourceEnvelopeDigest", "stage"].sort());
  assert.equal(input.services.length, 2);
  assert.deepEqual(input.services.map((service: Record<string, any>) => service.page.url), ["/garage-door-repair", "/garage-door-installation"]);
  assert.ok(input.services.every((service: Record<string, any>) => service.reviewEvidence.length > 0));
  assert.ok(input.services.every((service: Record<string, any>) => typeof service.prescriptionId === "string" && input.sealedRefs.includes(service.prescriptionId)));
  assert.ok(input.foldedSupport.every((entry: Record<string, any>) => ["garage-door-repair", "garage-door-installation"].includes(entry.canonicalServiceId)));
  assert.equal(JSON.stringify(input).includes("reviewAnalysisFacts"), false);
  assert.equal(JSON.stringify(input).includes("reviewInventory"), false);
  assert.equal(JSON.stringify(input).includes("listingReviewCount"), false);
  assert.equal("source" in input, false);
  assert.equal("prospect" in input, false);
});

test("historical v3 input digest stays 3ce242 while the richer runtime projection has an explicit new digest", () => {
  const raw = rawHandoff();
  const input = writer1Projection(validateSealed(root, { raw, value: JSON.parse(raw.toString("utf8")) }));
  const historical = "sha256:3ce24295a62cc863e6023b57ada26b0b88019b86e397e9c8e0ee98d1a612eda6";
  assert.equal(writer1HistoricalInputDigest(input), historical);
  assert.notEqual(digestOf(input), historical);
  const spring = input.foldedSupport.find((entry: Record<string, any>) => entry.id === "garage-door-spring-replacement");
  assert.equal(spring.status, "folded");
  assert.equal(spring.reviewEvidence[1].judgment.directCompletedService, true);
});

test("dormant control exits before provider validation or dispatch", async () => {
  const control = JSON.parse(readFileSync(path.join(root, ".factory-wake/360-words-control.json"), "utf8")) as Record<string, any>;
  assert.equal(control.wakeNonce, "DORMANT");
  assert.equal(control.stage, "writer1");
  assert.equal(control.policy.fast, false);
  assert.deepEqual(control.policy.approvedRoutes, routes);
  const previous = { ...process.env };
  delete process.env.CURSOR_API_KEY;
  delete process.env.CURSOR_MODEL;
  delete process.env.CURSOR_FAST;
  try { assert.deepEqual(await run(root), { status: "dormant", stage: "writer1" }); } finally { process.env = previous; }
});

test("dormant setup commits ignore extra paths, while active wakes require a single authorized control-file path", () => {
  const control = JSON.parse(readFileSync(path.join(root, ".factory-wake/360-words-control.json"), "utf8")) as Record<string, any>;
  assert.deepEqual(validateControl(control, { changedPaths: ["README.md", "package.json", ".factory-wake/360-words-control.json"], actor: "untrusted", owner: "architect" }), { dormant: true, stage: "writer1" });
  const active: Record<string, any> = { ...control, wakeNonce: "W1-360-20260824-8K4M7Q2N" };
  active.policy = { ...active.policy, mode: "artifact-recovery", recovery: activeRecovery("9c5c6a0c19f52860ad22961090baa1387bb29507") };
  assert.throws(() => validateControl(active, { changedPaths: [".factory-wake/360-words-control.json", "README.md"], actor: "architect", owner: "architect" }), /only the control file/);
  assert.throws(() => validateControl(active, { changedPaths: [".factory-wake/360-words-control.json"], actor: "other", owner: "architect" }), /repository owner/);
});

test("validated control sourceSha is the only active workflow source pin", () => {
  const control = JSON.parse(readFileSync(path.join(root, ".factory-wake/360-words-control.json"), "utf8")) as Record<string, any>;
  const sourceSha = "9c5c6a0c19f52860ad22961090baa1387bb29507";
  const active = { ...control, wakeNonce: "W1-360-20260824-SOURCEPIN" } as Record<string, any>;
  active.policy = { ...active.policy, mode: "artifact-recovery", recovery: activeRecovery(sourceSha) };
  const result = validateControl(active, { changedPaths: [".factory-wake/360-words-control.json"], actor: "architect", owner: "architect" });
  assert.deepEqual(result, { dormant: false, stage: "writer1", sourceSha });
  assert.throws(() => validateControl({ ...active, policy: { ...active.policy, recovery: { ...active.policy.recovery, sourceSha: "9c5c6a0" } } }, { changedPaths: [".factory-wake/360-words-control.json"], actor: "architect", owner: "architect" }), /40-hex sourceSha/);
  assert.throws(() => validateControl({ ...active, policy: { ...active.policy, recovery: { ...active.policy.recovery, sourceSha: "z".repeat(40) } } }, { changedPaths: [".factory-wake/360-words-control.json"], actor: "architect", owner: "architect" }), /40-hex sourceSha/);
  assert.throws(() => validateControl({ ...active, policy: { ...active.policy, recovery: { ...active.policy.recovery, recoveryVersion: "words-writer1-artifact-recovery/v1" } } }, { changedPaths: [".factory-wake/360-words-control.json"], actor: "architect", owner: "architect" }), /v2/);
});

test("canonical prompt bytes derive the digest and idempotency key, and stale pins fail before send", () => {
  const prompt = buildWriter1ArtifactRecoveryPrompt("v2");
  const changedPrompt = `${prompt} `;
  const changedDigest = `sha256:${createHash("sha256").update(JSON.stringify(changedPrompt)).digest("hex")}`;
  assert.notEqual(changedDigest, v2PromptDigest);
  assert.notEqual(v2IdempotencyKey("sha256:" + "1".repeat(64), changedDigest), v2IdempotencyKey());
  const control = JSON.parse(readFileSync(path.join(root, ".factory-wake/360-words-control.json"), "utf8")) as Record<string, any>;
  const active = { ...control, wakeNonce: "W1-360-20260824-PROMPTPIN" } as Record<string, any>;
  active.policy = { ...active.policy, mode: "artifact-recovery", recovery: activeRecovery("9c5c6a0c19f52860ad22961090baa1387bb29507", changedDigest, v2IdempotencyKey("sha256:" + "1".repeat(64), changedDigest)) };
  assert.throws(() => validateControl(active, { changedPaths: [".factory-wake/360-words-control.json"], actor: "architect", owner: "architect" }), /canonical-prompt|prompt/u);
  assert.equal(v2PromptDigest, digestWriter1ArtifactRecoveryPrompt("v2"));
});

test("v3 control binds the exact failed v2 history and canonical prompt", () => {
  const control = JSON.parse(readFileSync(path.join(root, ".factory-wake/360-words-control.json"), "utf8")) as Record<string, any>;
  const active = { ...control, wakeNonce: "W1-360-20260824-V3METADATA" } as Record<string, any>;
  const inputDigest = "sha256:3ce24295a62cc863e6023b57ada26b0b88019b86e397e9c8e0ee98d1a612eda6";
  active.policy = { ...active.policy, mode: "artifact-recovery", recovery: { ...EXPECTED_RECOVERY, ...EXPECTED_RECOVERY_V3, sourceSha: "9c5c6a0c19f52860ad22961090baa1387bb29507", priorRecoveryV2PromptDigest: v2PromptDigest, promptDigest: v3PromptDigest, idempotencyKey: `run-04370412-4486-4ecf-8045-e7f23554071b:writer1:artifact-recovery:v3:${inputDigest}:${v3PromptDigest}` } };
  assert.deepEqual(validateControl(active, { changedPaths: [".factory-wake/360-words-control.json"], actor: "architect", owner: "architect" }), { dormant: false, stage: "writer1", sourceSha: "9c5c6a0c19f52860ad22961090baa1387bb29507" });
  assert.equal(WRITER1_ARTIFACT_RECOVERY_V3_PROMPT, buildWriter1ArtifactRecoveryPrompt("v3"));
  assert.equal(v3PromptDigest, digestWriter1ArtifactRecoveryPrompt("v3"));
  assert.throws(() => validateControl({ ...active, policy: { ...active.policy, recovery: { ...active.policy.recovery, promptDigest: v2PromptDigest } } }, { changedPaths: [".factory-wake/360-words-control.json"], actor: "architect", owner: "architect" }), /v3|prompt/u);
});

test("v3-finalize control is validation-only, exact-history pinned, and cannot allow a message", () => {
  const control = JSON.parse(readFileSync(path.join(root, ".factory-wake/360-words-control.json"), "utf8")) as Record<string, any>;
  const active = { ...control, wakeNonce: "W1-360-20260825-V3FINALIZE" } as Record<string, any>;
  const inputDigest = EXPECTED_RECOVERY_V3_FINALIZE.priorRecoveryV3InputDigest as string;
  active.policy = { ...active.policy, mode: "validation-only", recovery: { ...EXPECTED_RECOVERY, ...EXPECTED_RECOVERY_V3_FINALIZE, sourceSha: "9c5c6a0c19f52860ad22961090baa1387bb29507", priorRecoveryV3PromptDigest: v3PromptDigest, promptDigest: v3PromptDigest, idempotencyKey: `run-47a109e2-4fd4-48df-a727-8a92a76cc472:writer1:artifact-recovery:v3-finalize:${inputDigest}:${v3PromptDigest}` } };
  assert.deepEqual(validateControl(active, { changedPaths: [".factory-wake/360-words-control.json"], actor: "architect", owner: "architect" }), { dormant: false, stage: "writer1", sourceSha: "9c5c6a0c19f52860ad22961090baa1387bb29507" });
  for (const field of ["allowFollowUp", "allowResume", "allowCreate", "send"]) assert.throws(() => validateControl({ ...active, policy: { ...active.policy, recovery: { ...active.policy.recovery, [field]: true } } }, { changedPaths: [".factory-wake/360-words-control.json"], actor: "architect", owner: "architect" }), /no-message|validation-only|pins/u);
  assert.throws(() => validateControl({ ...active, policy: { ...active.policy, allowFollowUp: true } }, { changedPaths: [".factory-wake/360-words-control.json"], actor: "architect", owner: "architect" }), /no-message|validation-only|pins/u);
});

test("validation-report-only accepts only the exact v3-finalize pins and remains no-message", () => {
  const control = JSON.parse(readFileSync(path.join(root, ".factory-wake/360-words-control.json"), "utf8")) as Record<string, any>;
  const active = { ...control, wakeNonce: "W1-360-20260825-VALIDATIONREPORT" } as Record<string, any>;
  const inputDigest = EXPECTED_RECOVERY_V3_FINALIZE.priorRecoveryV3InputDigest as string;
  active.policy = { ...active.policy, mode: "validation-report-only", recovery: { ...EXPECTED_RECOVERY, ...EXPECTED_RECOVERY_V3_FINALIZE, sourceSha: "9c5c6a0c19f52860ad22961090baa1387bb29507", priorRecoveryV3PromptDigest: v3PromptDigest, promptDigest: v3PromptDigest, idempotencyKey: `run-47a109e2-4fd4-48df-a727-8a92a76cc472:writer1:artifact-recovery:v3-finalize:${inputDigest}:${v3PromptDigest}` } };
  assert.deepEqual(validateControl(active, { changedPaths: [".factory-wake/360-words-control.json"], actor: "architect", owner: "architect" }), { dormant: false, stage: "writer1", sourceSha: "9c5c6a0c19f52860ad22961090baa1387bb29507" });
  assert.throws(() => validateControl({ ...active, policy: { ...active.policy, recovery: { ...active.policy.recovery, priorRecoveryV3RunId: "run-forged" } } }, { changedPaths: [".factory-wake/360-words-control.json"], actor: "architect", owner: "architect" }), /exact|history|pins/u);
  assert.throws(() => validateControl({ ...active, policy: { ...active.policy, recovery: { ...active.policy.recovery, send: true } } }, { changedPaths: [".factory-wake/360-words-control.json"], actor: "architect", owner: "architect" }), /no-message|pins/u);
});

test("workflow is limited to the Architect control push and one dormant-safe Writer1 wake", () => {
  const workflow = readFileSync(path.join(root, ".github/workflows/architect-360-words-canary.yml"), "utf8");
  const controlScript = readFileSync(path.join(root, "scripts/360-words-control.mjs"), "utf8");
  assert.match(workflow, /branches:\s*\n\s*- architect\/360-words-canary-verified/);
  assert.match(workflow, /paths:\s*\n\s*- \.factory-wake\/360-words-control\.json/);
  assert.match(controlScript, /repository owner Architect actor/);
  assert.match(workflow, /CURSOR_API_KEY: \$\{\{ secrets\.CURSOR_API_KEY \}\}/);
  assert.match(workflow, /CURSOR_MODEL: \$\{\{ secrets\.CURSOR_MODEL \}\}/);
  assert.match(workflow, /CURSOR_FAST: 'false'/);
  assert.match(workflow, /scripts\/360-words-control\.mjs/);
  assert.match(workflow, /Download and verify exact prior Writer1 dispatch artifact/);
  assert.match(workflow, /Recover Writer1 artifact on the same Cursor thread and stop at Architect QA|Run bounded Writer1 path and stop at Architect QA/);
  assert.match(workflow, /scripts\/360-words-canary\.ts --artifact-recovery/);
  assert.match(workflow, /32785189225/);
  assert.match(workflow, /9541802267/);
  assert.match(workflow, /WRITER1_PRIOR_DISPATCH_ROOT/);
  assert.match(workflow, /WRITER1_PRIOR_RECOVERY_ROOT/);
  assert.match(workflow, /WRITER1_PRIOR_RECOVERY_V2_ROOT/);
  assert.match(workflow, /32795481394/);
  assert.match(workflow, /9544693335/);
  assert.match(workflow, /29311637f3f4adc04f3dd9ca7bfc54f05df47c88/);
  assert.match(workflow, /sha256:469f3b04eb502316404d98023df34c38e57e8cc6bf51d6dbfdbda12be3834e2f/);
  assert.match(workflow, /32797811881/);
  assert.match(workflow, /9545486318/);
  assert.match(workflow, /6d5f9e0f65af98185b6827b445cbfeff74e88ce7/);
  assert.match(workflow, /sha256:23eac7a38caf588f383e424bd7bf39e5246f5634c7c06866d8e94250e6fe710e/);
  assert.match(workflow, /WRITER1_LATEST_V3_FINALIZE_ROOT/);
  assert.match(workflow, /words-writer1-artifact-recovery\/v3-finalize/);
  assert.match(workflow, /words-writer1-artifact-recovery\/v3/);
  assert.match(workflow, /32793130502/);
  assert.match(workflow, /9543869555/);
  assert.match(workflow, /6cf9b42e43e5728614a9b7302a8791e527197e3d/);
  assert.match(workflow, /sha256sum canary\/inputs\/prior-v1-recovery\.zip/);
  assert.match(workflow, /EXPECTED_SOURCE_SHA: \$\{\{ steps\.control\.outputs\.source_sha \}\}/);
  assert.match(workflow, /EXPECTED_SOURCE_SHA: \$\{\{ steps\.control\.outputs\.source_sha \}\}/);
  assert.doesNotMatch(workflow, /EXPECTED_SOURCE_SHA:\s*['"]c89f82dae009d5bef3cc327543e1664985c85b76['"]/u);
  assert.doesNotMatch(workflow, /c89f82dae009d5bef3cc327543e1664985c85b76/u);
  assert.ok(workflow.indexOf("steps.control.outputs.source_sha") > workflow.indexOf("Validate Architect control file and changed-path boundary"));
  assert.doesNotMatch(workflow, /Create fresh Writer1 agent|--fresh/u);
  assert.match(workflow, /stop at Architect QA/);
  assert.match(workflow, /actions\/upload-artifact@/);
  assert.doesNotMatch(workflow.toLowerCase(), /apify|research|luna/);
  assert.doesNotMatch(workflow, /^\s*(workflow_run|repository_dispatch|workflow_dispatch|workflow_call):|actions:\s*write/mu);
  assert.doesNotMatch(workflow, /vercel|deploy|outreach|lemlist/iu);
  assert.ok(workflow.indexOf("scripts/360-words-control.mjs") < workflow.indexOf("Install locked dependencies"));
  assert.ok(workflow.indexOf("scripts/360-words-control.mjs") < workflow.indexOf("CURSOR_API_KEY: ${{ secrets.CURSOR_API_KEY }}"));
});

test("authenticated dispatch notice emits the direct server URL to a small receipt and summary", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "ff-360-words-receipt-"));
  const summary = path.join(temp, "summary.md");
  const previous = process.env.GITHUB_STEP_SUMMARY;
  process.env.GITHUB_STEP_SUMMARY = summary;
  try {
    const url = "https://cursor.com/agents/bc-360-server-returned";
    await dispatchReceipt(temp, { stage: "writer1", provider: "cursor-sdk", requestedModel: "cursor-grok-4.6-high", officialModel: "grok-4.6", modelParams: [{ id: "fast", value: "false" }], registryDigest: "sha256:" + "3".repeat(64), effort: "high", effortAttestationSource: "named-model-default", fast: false, agentId: "bc-360-server-returned", jobId: "run-360-server-returned", threadUrl: url, inputDigest: "sha256:" + "1".repeat(64), promptDigest: "sha256:" + "2".repeat(64), requestDigest: "sha256:" + "3".repeat(64), dispatchedAt: "2026-08-24T00:00:00.000Z" });
    const receipt = JSON.parse(await fs.readFile(path.join(temp, "canary/runtime/dispatch-receipt.json"), "utf8")) as Record<string, any>;
    assert.equal(receipt.threadUrl, url);
    assert.equal(receipt.provider, "cursor-sdk");
    assert.equal(receipt.fast, false);
    assert.match(await fs.readFile(summary, "utf8"), /https:\/\/cursor\.com\/agents\/bc-360-server-returned/);
  } finally {
    if (previous === undefined) delete process.env.GITHUB_STEP_SUMMARY; else process.env.GITHUB_STEP_SUMMARY = previous;
  }
});

test("artifact recovery verifies the prior dispatch receipt and branch/source pins before Cursor access", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "ff-360-prior-dispatch-"));
  await fs.mkdir(path.join(temp, "runtime"));
  const digest = (value: string) => `sha256:${value.repeat(64)}`;
  const sourceSha = "9c5c6a0c19f52860ad22961090baa1387bb29507";
  const expected = { actionRunId: ARTIFACT_RECOVERY_ACTION_RUN_ID, artifactId: ARTIFACT_RECOVERY_ARTIFACT_ID, agentId: ARTIFACT_RECOVERY_AGENT_ID, jobId: ARTIFACT_RECOVERY_PRIOR_RUN_ID, threadUrl: ARTIFACT_RECOVERY_THREAD_URL, sourceBranch: ARTIFACT_RECOVERY_SOURCE_BRANCH, sourceSha };
  await fs.writeFile(path.join(temp, "runtime/source-verification.json"), JSON.stringify({ actionRunId: expected.actionRunId, artifactId: expected.artifactId, headBranch: expected.sourceBranch, headSha: expected.sourceSha, sealedHandoffDigest: digest("5") }));
  await fs.writeFile(path.join(temp, "runtime/dispatch-receipt.json"), JSON.stringify({ schemaVersion: "words-canary-dispatch/v2", status: "dispatched", stage: "writer1", provider: "cursor-sdk", requestedModel: "cursor-grok-4.6-high", officialModel: "grok-4.6", modelParams: [{ id: "fast", value: "false" }, { id: "effort", value: "high" }], registryDigest: digest("4"), effort: "high", effortAttestationSource: "official-registry-parameter", fast: false, agentId: ARTIFACT_RECOVERY_AGENT_ID, jobId: ARTIFACT_RECOVERY_PRIOR_RUN_ID, threadUrl: ARTIFACT_RECOVERY_THREAD_URL, inputDigest: digest("1"), promptDigest: digest("2"), requestDigest: digest("3") }));
  const prior = validatePriorArtifactRecoveryDispatch(temp, expected);
  assert.equal(prior.agentId, ARTIFACT_RECOVERY_AGENT_ID); assert.equal(prior.runId, ARTIFACT_RECOVERY_PRIOR_RUN_ID); assert.equal(prior.sourceSha, sourceSha);
  await assert.rejects(async () => validatePriorArtifactRecoveryDispatch(temp, { ...expected, sourceSha: "wrong" }), /source\/action pin/u);
});

test("v2 materialization binds the failed v1 run and uses the absolute agent path", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "ff-360-v1-failure-"));
  await fs.mkdir(path.join(temp, "runtime"));
  await fs.writeFile(path.join(temp, "runtime/dispatch-receipt.json"), JSON.stringify({ schemaVersion: "words-canary-dispatch/v2", status: "dispatched", stage: "writer1", provider: "cursor-sdk", requestedModel: "cursor-grok-4.6-high", officialModel: "grok-4.6", fast: false, agentId: ARTIFACT_RECOVERY_V1_AGENT_ID, jobId: ARTIFACT_RECOVERY_V1_RUN_ID, threadUrl: ARTIFACT_RECOVERY_V1_THREAD_URL, promptDigest: v1PromptDigest }));
  await fs.writeFile(path.join(temp, "runtime/artifact-verification.json"), JSON.stringify({ actionRunId: ARTIFACT_RECOVERY_V1_ACTION_RUN_ID, artifactId: ARTIFACT_RECOVERY_V1_ARTIFACT_ID, headBranch: "architect/360-words-canary", headSha: ARTIFACT_RECOVERY_V1_SOURCE_SHA, artifactDigest: ARTIFACT_RECOVERY_V1_ARTIFACT_DIGEST }));
  await fs.writeFile(path.join(temp, "runtime/failure.json"), JSON.stringify({ status: "failed", stage: "writer1", errorCode: "CURSOR_ARTIFACT_MISSING", writer2Blocked: true }));
  await fs.writeFile(path.join(temp, "runtime/state.json"), JSON.stringify({ status: "writer1-failed", stage: "writer1", errorCode: "CURSOR_ARTIFACT_MISSING", nextStage: null, writer2Blocked: true }));
  const previous = validatePriorArtifactRecoveryFailure(temp);
  assert.deepEqual(previous, { recoveryVersion: "words-writer1-artifact-recovery/v1", actionRunId: ARTIFACT_RECOVERY_V1_ACTION_RUN_ID, artifactId: ARTIFACT_RECOVERY_V1_ARTIFACT_ID, sourceBranch: "architect/360-words-canary", sourceSha: ARTIFACT_RECOVERY_V1_SOURCE_SHA, artifactDigest: ARTIFACT_RECOVERY_V1_ARTIFACT_DIGEST, runId: ARTIFACT_RECOVERY_V1_RUN_ID, agentId: ARTIFACT_RECOVERY_V1_AGENT_ID, threadUrl: ARTIFACT_RECOVERY_V1_THREAD_URL, promptDigest: v1PromptDigest, failureCode: "CURSOR_ARTIFACT_MISSING" });
  assert.match(WRITER1_ARTIFACT_RECOVERY_V2_PROMPT, /\/opt\/cursor\/artifacts\/writer1-output\.json/u);
  assert.match(WRITER1_ARTIFACT_RECOVERY_V2_PROMPT, /artifacts\/writer1-output\.json/u);
  assert.doesNotMatch(WRITER1_ARTIFACT_RECOVERY_V2_PROMPT, /materialize that exact existing JSON under artifacts\//u);
  assert.match(WRITER1_ARTIFACT_RECOVERY_PROMPT, /artifacts\/writer1-output\.json/u);
});
