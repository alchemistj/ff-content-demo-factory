import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { digestWriter1ArtifactRecoveryPrompt, buildWriter1ArtifactRecoveryPrompt, digestWriter1GithubBaselineCorrectionPrompt } from "./360-words-recovery-prompt.mjs";
import { VERIFIED_WRITER1_GITHUB_BASELINE } from "./360-words-github-baseline.mjs";

export const CONTROL_PATH = ".factory-wake/360-words-control.json";
export const DORMANT_NONCE = "DORMANT";

// The recovery tuple is immutable protocol state.  The source SHA is deliberately
// excluded: it is the exact 40-hex source pin supplied by the Architect control
// file and is emitted only after the control boundary has been validated.
export const EXPECTED_RECOVERY = Object.freeze({
  priorActionRunId: "32785189225",
  priorArtifactId: 9541802267,
  priorAgentId: "bc-30fc8ffa-2005-44b9-8fc7-48ddd9c3bcc8",
  priorRunId: "run-b0341a7a-9f03-4dec-b76d-7350ba1e82f2",
  priorThreadUrl: "https://cursor.com/agents/bc-30fc8ffa-2005-44b9-8fc7-48ddd9c3bcc8",
  artifactPath: "artifacts/writer1-output.json",
  sourceBranch: "architect/360-words-canary",
  sealedHandoffDigest: "sha256:715f651a53055444b8381dd8a276a2046d93776c61d88a2193cc2d42a1c83ad6",
});
export const EXPECTED_RECOVERY_V2 = Object.freeze({
  recoveryVersion: "words-writer1-artifact-recovery/v2",
  priorRecoveryActionRunId: "32793130502",
  priorRecoveryArtifactId: 9543869555,
  priorRecoveryAgentId: "bc-30fc8ffa-2005-44b9-8fc7-48ddd9c3bcc8",
  priorRecoveryRunId: "run-1b862d23-a748-4574-909a-66aac905eb97",
  priorRecoveryThreadUrl: "https://cursor.com/agents/bc-30fc8ffa-2005-44b9-8fc7-48ddd9c3bcc8",
  priorRecoverySourceSha: "6cf9b42e43e5728614a9b7302a8791e527197e3d",
  priorRecoveryArtifactDigest: "sha256:2d1d1c0d281917025be80898ab03c94171d59d1e2920ecf540b241f666464502",
  priorRecoveryFailureCode: "CURSOR_ARTIFACT_MISSING",
  absoluteArtifactPath: "/opt/cursor/artifacts/writer1-output.json",
  apiArtifactPath: "artifacts/writer1-output.json",
});
export const EXPECTED_RECOVERY_V3 = Object.freeze({
  recoveryVersion: "words-writer1-artifact-recovery/v3",
  priorRecoveryV2ActionRunId: "32795481394",
  priorRecoveryV2ArtifactId: 9544693335,
  priorRecoveryV2ArtifactDigest: "sha256:469f3b04eb502316404d98023df34c38e57e8cc6bf51d6dbfdbda12be3834e2f",
  priorRecoveryV2SourceSha: "29311637f3f4adc04f3dd9ca7bfc54f05df47c88",
  priorRecoveryV2AgentId: "bc-30fc8ffa-2005-44b9-8fc7-48ddd9c3bcc8",
  priorRecoveryV2RunId: "run-04370412-4486-4ecf-8045-e7f23554071b",
  priorRecoveryV2ThreadUrl: "https://cursor.com/agents/bc-30fc8ffa-2005-44b9-8fc7-48ddd9c3bcc8",
  priorRecoveryV2FailureCode: "WRITER1_OUTPUT_INVALID",
  priorRecoveryV2InputDigest: "sha256:3ce24295a62cc863e6023b57ada26b0b88019b86e397e9c8e0ee98d1a612eda6",
  absoluteArtifactPath: "/opt/cursor/artifacts/writer1-output.json",
  apiArtifactPath: "artifacts/writer1-output.json",
});
export const EXPECTED_RECOVERY_V3_FINALIZE = Object.freeze({
  recoveryVersion: "words-writer1-artifact-recovery/v3-finalize",
  priorRecoveryV3ActionRunId: "32797811881",
  priorRecoveryV3ArtifactId: 9545486318,
  priorRecoveryV3ArtifactDigest: "sha256:23eac7a38caf588f383e424bd7bf39e5246f5634c7c06866d8e94250e6fe710e",
  priorRecoveryV3SourceSha: "6d5f9e0f65af98185b6827b445cbfeff74e88ce7",
  priorRecoveryV3AgentId: "bc-30fc8ffa-2005-44b9-8fc7-48ddd9c3bcc8",
  priorRecoveryV3RunId: "run-47a109e2-4fd4-48df-a727-8a92a76cc472",
  priorRecoveryV3ThreadUrl: "https://cursor.com/agents/bc-30fc8ffa-2005-44b9-8fc7-48ddd9c3bcc8",
  priorRecoveryV3PromptDigest: "sha256:b2ef742380aeb7b3b7ea020479ece673130341a16273fe67b2a3ffd2936a6f6d",
  priorRecoveryV3FailureCode: "WRITER1_OUTPUT_INVALID",
  priorRecoveryV3InputDigest: "sha256:3ce24295a62cc863e6023b57ada26b0b88019b86e397e9c8e0ee98d1a612eda6",
  priorBeforeArtifactByteDigest: "sha256:58338da9ffc6d8bd8b5ebc0fa9a1af71b4eceee0b86cd126d9c9243842c80178",
  currentArtifactByteDigest: "sha256:ec36da69992dd318e913671763a96e4b838ab747b36e512702f91176155e5eac",
  currentArtifactUpdatedAt: "2026-08-25T01:33:20.000Z",
  frozenCopyProjectionDigest: "sha256:c1e33b69b4021623b917060efce36d8b91973deaf7db724c2183635741973d1b",
  absoluteArtifactPath: "/opt/cursor/artifacts/writer1-output.json",
  apiArtifactPath: "artifacts/writer1-output.json",
});
export const EXPECTED_POST_DISPATCH_RETRIEVAL = Object.freeze({
  recoveryVersion: "words-writer1-post-dispatch-retrieval/v1",
  actionRunId: "32825265478",
  artifactId: 9554789848,
  agentId: "bc-2486f645-c31c-4532-8145-fbe3af1d45a8",
  runId: "run-1686013d-dec5-454c-a39e-5817448e6a96",
  threadUrl: "https://cursor.com/agents/bc-2486f645-c31c-4532-8145-fbe3af1d45a8",
  requestedModel: "cursor-grok-4.6-high",
  resolvedModel: "grok-4.6",
  effort: "high",
  fast: false,
});
export const EXPECTED_POST_DISPATCH_MANIFEST = Object.freeze({ artifactZipDigest: "sha256:e4315183eac7c3755a27e9a46622ea63c4d99978e5bc98e02eae9658a7504648", artifactZipSize: 2753, receiptPath: "runtime/writer1-dispatch-receipt.json", receiptDigest: "sha256:b4769f3dded171060119cc9f5b42f33dfe1d882c31d441c08c185806066598d4", receiptSize: 1536 });
export const EXPECTED_POST_DISPATCH_ORIGINAL_INPUT_DIGEST = "sha256:f4f59e9c645391266172892e4651f0da4ccedaa2bc86e35217a0ab8699fd0c1f";
export const EXPECTED_POST_DISPATCH_ORIGINAL_PROMPT_DIGEST = "sha256:e9c39355c8f0973250ebd97ad1b3b69c9e09c840796f39336abd5664c20303e3";
export const EXPECTED_POST_DISPATCH_ORIGINAL_IDEMPOTENCY_KEY = `bc-2486f645-c31c-4532-8145-fbe3af1d45a8:writer1:correction:v2:${EXPECTED_POST_DISPATCH_ORIGINAL_INPUT_DIGEST}:${EXPECTED_POST_DISPATCH_ORIGINAL_PROMPT_DIGEST}`;
export const EXPECTED_POST_DISPATCH_SEAL = Object.freeze({ recoveryVersion: "words-writer1-post-dispatch-seal/v1", actionRunId: "32825265478", artifactId: 9554789848, agentId: "bc-2486f645-c31c-4532-8145-fbe3af1d45a8", runId: "run-1686013d-dec5-454c-a39e-5817448e6a96", threadUrl: "https://cursor.com/agents/bc-2486f645-c31c-4532-8145-fbe3af1d45a8", requestedModel: "cursor-grok-4.6-high", resolvedModel: "grok-4.6", effort: "high", fast: false });
const POST_DISPATCH_MANIFEST_KEYS = ["actionRunId", "artifactId", "artifactZipDigest", "artifactZipSize", "controlBindingDigest", "manifestDigest", "manifestMac", "receiptDigest", "receiptPath", "receiptSize", "schemaVersion"];
function validPostDispatchManifestPins(value) {
  if (!value || typeof value !== "object" || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...POST_DISPATCH_MANIFEST_KEYS].sort())) return false;
  return value.schemaVersion === "verified-writer1-dispatch-manifest/v1" && value.actionRunId === EXPECTED_POST_DISPATCH_RETRIEVAL.actionRunId && Number(value.artifactId) === EXPECTED_POST_DISPATCH_RETRIEVAL.artifactId && value.artifactZipDigest === EXPECTED_POST_DISPATCH_MANIFEST.artifactZipDigest && value.artifactZipSize === EXPECTED_POST_DISPATCH_MANIFEST.artifactZipSize && value.receiptPath === EXPECTED_POST_DISPATCH_MANIFEST.receiptPath && value.receiptDigest === EXPECTED_POST_DISPATCH_MANIFEST.receiptDigest && value.receiptSize === EXPECTED_POST_DISPATCH_MANIFEST.receiptSize && [value.controlBindingDigest, value.manifestDigest].every((item) => typeof item === "string" && /^sha256:[0-9a-f]{64}$/u.test(item)) && typeof value.manifestMac === "string" && /^hmac-sha256:[0-9a-f]{64}$/u.test(value.manifestMac);
}
function validReceiptPins(value) {
  return value && typeof value === "object" && JSON.stringify(Object.keys(value).sort()) === JSON.stringify(["artifactZipDigest", "artifactZipSize", "receiptDigest", "receiptPath", "receiptSize"].sort()) && value.artifactZipDigest === EXPECTED_POST_DISPATCH_MANIFEST.artifactZipDigest && value.artifactZipSize === EXPECTED_POST_DISPATCH_MANIFEST.artifactZipSize && value.receiptPath === EXPECTED_POST_DISPATCH_MANIFEST.receiptPath && value.receiptDigest === EXPECTED_POST_DISPATCH_MANIFEST.receiptDigest && value.receiptSize === EXPECTED_POST_DISPATCH_MANIFEST.receiptSize;
}
function validSealedManifestPins(value, recovery) {
  return value && typeof value === "object" && value.schemaVersion === "verified-writer1-sealed-manifest-pin/v1" && value.sourceActionRunId === recovery.sealActionRunId && Number(value.sourceArtifactId) === Number(recovery.sealArtifactId) && value.manifestPath === "runtime/writer1-dispatch-manifest.json" && typeof value.sourceSha === "string" && /^[0-9a-f]{40}$/u.test(value.sourceSha) && typeof value.manifestBytesDigest === "string" && /^sha256:[0-9a-f]{64}$/u.test(value.manifestBytesDigest) && Number.isSafeInteger(value.manifestSize) && value.manifestSize > 0 && typeof value.manifestDigest === "string" && /^sha256:[0-9a-f]{64}$/u.test(value.manifestDigest) && typeof value.manifestMac === "string" && /^hmac-sha256:[0-9a-f]{64}$/u.test(value.manifestMac);
}
export const EXPECTED_VERIFIED_CORRECTION = Object.freeze({
  correctionVersion: "words-writer1-correction/v1",
  sourceBranch: "architect/360-words-canary-verified",
  agentId: "bc-2486f645-c31c-4532-8145-fbe3af1d45a8",
  threadUrl: "https://cursor.com/agents/bc-2486f645-c31c-4532-8145-fbe3af1d45a8",
  inputDigest: "sha256:aefca24b7fb0f2260cb32beabe81797c9d64cbb5dec4baee7e3252119e1c483b",
  sealedHandoffDigest: "sha256:715f651a53055444b8381dd8a276a2046d93776c61d88a2193cc2d42a1c83ad6",
});
export const EXPECTED_VERIFIED_CORRECTION_V2 = Object.freeze({
  correctionVersion: "words-writer1-correction/v2",
  sourceBranch: "architect/360-words-canary-verified",
  agentId: "bc-2486f645-c31c-4532-8145-fbe3af1d45a8",
  threadUrl: "https://cursor.com/agents/bc-2486f645-c31c-4532-8145-fbe3af1d45a8",
  sealedHandoffDigest: "sha256:715f651a53055444b8381dd8a276a2046d93776c61d88a2193cc2d42a1c83ad6",
  baseline: { kind: VERIFIED_WRITER1_GITHUB_BASELINE.kind, repository: VERIFIED_WRITER1_GITHUB_BASELINE.repository, sourceCommit: VERIFIED_WRITER1_GITHUB_BASELINE.sourceCommit, path: VERIFIED_WRITER1_GITHUB_BASELINE.path, blobSha: VERIFIED_WRITER1_GITHUB_BASELINE.blobSha, rawSha256: VERIFIED_WRITER1_GITHUB_BASELINE.rawSha256, size: VERIFIED_WRITER1_GITHUB_BASELINE.size, authorship: VERIFIED_WRITER1_GITHUB_BASELINE.authorship },
});

export function selectVerifiedWriter1Dispatch(control) {
  if (control?.policy?.recovery !== undefined && control?.recovery !== undefined) throw new Error("active wake may not provide ambiguous policy and top-level recovery objects");
  const recovery = control?.policy?.recovery ?? control?.recovery;
  if (control?.policy?.mode === "writer1-correction" && recovery?.correctionVersion === "words-writer1-correction/v2") return "verified-writer1-correction-v2";
  if (control?.policy?.mode === "writer1-correction" && recovery?.correctionVersion === "words-writer1-correction/v1") return "verified-writer1-correction-v1";
  if (control?.policy?.mode === "writer1-seal-only" && recovery?.recoveryVersion === EXPECTED_POST_DISPATCH_SEAL.recoveryVersion) return "verified-writer1-seal-only";
  if (control?.policy?.mode === "writer1-retrieval-only" && recovery?.recoveryVersion === EXPECTED_POST_DISPATCH_RETRIEVAL.recoveryVersion) return "verified-writer1-retrieval-only";
  return "unsupported-verified-lane";
}

export function validateControl(control, input = {}) {
  if (!control || typeof control !== "object") throw new Error("canary control must be an object");
  if (control.schemaVersion !== "words-canary-control/v1") throw new Error("unsupported canary control schema");
  if (control.requestedBy !== "architect" || control.stage !== "writer1") throw new Error("only Architect Writer1 control is permitted");
  if (control.policy?.writer1Only !== true || control.policy?.provider !== "cursor-sdk" || control.policy?.model !== "cursor-grok-4.6-high" || control.policy?.fast !== false) throw new Error("immutable Writer1 policy mismatch");
  if (control.restore !== null) throw new Error("Writer1 may not restore a previous artifact");
  if (control.wakeNonce === DORMANT_NONCE) return { dormant: true, stage: "writer1" };
  if (control.policy?.mode !== "artifact-recovery" && control.policy?.mode !== "validation-only" && control.policy?.mode !== "validation-report-only" && control.policy?.mode !== "writer1-correction" && control.policy?.mode !== "writer1-retrieval-only" && control.policy?.mode !== "writer1-seal-only") throw new Error("active Writer1 wake must explicitly select artifact-recovery, validation-only, validation-report-only, writer1-correction, writer1-retrieval-only, or writer1-seal-only mode");
  if (typeof control.wakeNonce !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{15,127}$/u.test(control.wakeNonce)) throw new Error("invalid wake nonce");
  const changedPaths = Array.isArray(input.changedPaths) ? input.changedPaths : [];
  if (changedPaths.length !== 1 || changedPaths[0] !== CONTROL_PATH) throw new Error("active wake must change only the control file");
  if (String(input.actor || "").toLowerCase() !== String(input.owner || "").toLowerCase()) throw new Error("active wake requires the repository owner Architect actor");
  if (control.policy?.recovery !== undefined && control.recovery !== undefined) throw new Error("active wake may not provide ambiguous policy and top-level recovery objects");
  const recovery = control.policy?.recovery ?? control.recovery;
  const isVerifiedCorrection = control.policy?.mode === "writer1-correction" && (recovery?.correctionVersion === "words-writer1-correction/v1" || recovery?.correctionVersion === "words-writer1-correction/v2");
  const isVerifiedSeal = control.policy?.mode === "writer1-seal-only" && recovery?.recoveryVersion === EXPECTED_POST_DISPATCH_SEAL.recoveryVersion;
  const isVerifiedRetrieval = control.policy?.mode === "writer1-retrieval-only" && recovery?.recoveryVersion === EXPECTED_POST_DISPATCH_RETRIEVAL.recoveryVersion;
  const isVerifiedLane = isVerifiedCorrection || isVerifiedSeal || isVerifiedRetrieval;
  if (input.verifiedLane === true && !isVerifiedLane) throw new Error("isolated verified lane permits only its bounded Writer1 correction or post-dispatch retrieval path");
  if (!recovery || (!isVerifiedLane && Object.entries(EXPECTED_RECOVERY).some(([key, value]) => recovery[key] !== value))) throw new Error("active artifact-recovery wake is missing the exact prior/run/source tuple");
  if (typeof recovery.sourceSha !== "string" || !/^[0-9a-f]{40}$/u.test(recovery.sourceSha)) throw new Error("active artifact-recovery wake requires an exact 40-hex sourceSha");
  const commitSha = input.commitSha;
  const beforeSha = input.beforeSha;
  const parentSha = input.parentSha;
  if (![commitSha, beforeSha, parentSha].every((value) => typeof value === "string" && /^[0-9a-f]{40}$/u.test(value))) throw new Error("active wake requires verified commit, event.before, and parent SHAs before secrets/vendor access");
  if (beforeSha !== recovery.sourceSha || parentSha !== beforeSha || commitSha === beforeSha) throw new Error("active wake sourceSha must equal the exact dormant implementation parent/event.before");
  const v1PromptDigest = digestWriter1ArtifactRecoveryPrompt("v1");
  const v2PromptDigest = digestWriter1ArtifactRecoveryPrompt("v2");
  const v3PromptDigest = digestWriter1ArtifactRecoveryPrompt("v3");
  const v5PromptDigest = digestWriter1ArtifactRecoveryPrompt("v5");
  const v6PromptDigest = digestWriter1GithubBaselineCorrectionPrompt(VERIFIED_WRITER1_GITHUB_BASELINE);
  if (recovery.recoveryVersion === EXPECTED_POST_DISPATCH_SEAL.recoveryVersion) {
    if (control.policy?.mode !== "writer1-seal-only" || Object.entries(EXPECTED_POST_DISPATCH_SEAL).some(([key, value]) => recovery[key] !== value) || recovery.inputDigest !== EXPECTED_POST_DISPATCH_ORIGINAL_INPUT_DIGEST || recovery.promptDigest !== EXPECTED_POST_DISPATCH_ORIGINAL_PROMPT_DIGEST || recovery.idempotencyKey !== EXPECTED_POST_DISPATCH_ORIGINAL_IDEMPOTENCY_KEY || !validReceiptPins(recovery.receiptPins) || recovery.allowCreate !== false || recovery.allowResume !== false || recovery.allowFollowUp !== false || recovery.maxFollowUps !== 0 || recovery.send !== undefined || recovery.resume !== undefined || recovery.create !== undefined || control.policy.allowCreate !== undefined || control.policy.allowResume !== undefined || control.policy.allowFollowUp !== undefined || control.policy.send !== undefined) throw new Error("active seal-only wake is missing the exact signed dispatch, Action artifact, or zero-message pins");
  } else if (recovery.recoveryVersion === EXPECTED_POST_DISPATCH_RETRIEVAL.recoveryVersion) {
    if (control.policy?.mode !== "writer1-retrieval-only" || Object.entries(EXPECTED_POST_DISPATCH_RETRIEVAL).some(([key, value]) => recovery[key] !== value) || !validPostDispatchManifestPins(recovery.receiptManifest) || !validSealedManifestPins(recovery.sealedManifest, recovery) || recovery.inputDigest !== EXPECTED_POST_DISPATCH_ORIGINAL_INPUT_DIGEST || recovery.promptDigest !== EXPECTED_POST_DISPATCH_ORIGINAL_PROMPT_DIGEST || recovery.idempotencyKey !== EXPECTED_POST_DISPATCH_ORIGINAL_IDEMPOTENCY_KEY || recovery.allowCreate !== false || recovery.allowResume !== false || recovery.allowFollowUp !== false || recovery.maxFollowUps !== 0 || recovery.send !== undefined || recovery.resume !== undefined || recovery.create !== undefined || control.policy.allowCreate !== undefined || control.policy.allowResume !== undefined || control.policy.allowFollowUp !== undefined || control.policy.send !== undefined) throw new Error("active post-dispatch wake is missing the exact signed original receipt, sealed manifest, or zero-message pins");
  } else if (recovery.correctionVersion === "words-writer1-correction/v1") {
    if (control.policy?.mode !== "writer1-correction" || Object.entries(EXPECTED_VERIFIED_CORRECTION).some(([key, value]) => recovery[key] !== value) || recovery.promptDigest !== v5PromptDigest || typeof recovery.sourceSha !== "string" || !/^[0-9a-f]{40}$/u.test(recovery.sourceSha) || recovery.allowCreate !== false || recovery.allowResume !== true || recovery.allowFollowUp !== true || recovery.maxFollowUps !== 1 || recovery.idempotencyKey !== `${EXPECTED_VERIFIED_CORRECTION.agentId}:writer1:correction:v1:${EXPECTED_VERIFIED_CORRECTION.inputDigest}:${v5PromptDigest}` || recovery.send !== undefined || control.policy.allowCreate !== undefined || control.policy.allowResume !== undefined || control.policy.allowFollowUp !== undefined || control.policy.send !== undefined) throw new Error("active Writer1 correction wake is missing exact source, same-thread, canonical-prompt, or idempotency pins");
  } else if (recovery.correctionVersion === "words-writer1-correction/v2") {
    if (control.policy?.mode !== "writer1-correction" || Object.entries(EXPECTED_VERIFIED_CORRECTION_V2).some(([key, value]) => JSON.stringify(recovery[key]) !== JSON.stringify(value)) || typeof recovery.inputDigest !== "string" || !/^sha256:[0-9a-f]{64}$/u.test(recovery.inputDigest) || recovery.promptDigest !== v6PromptDigest || typeof recovery.idempotencyKey !== "string" || !/^bc-2486f645-c31c-4532-8145-fbe3af1d45a8:writer1:correction:v2:sha256:[0-9a-f]{64}:sha256:[0-9a-f]{64}$/u.test(recovery.idempotencyKey) || !recovery.idempotencyKey.endsWith(`:${v6PromptDigest}`) || recovery.allowCreate !== false || recovery.allowResume !== true || recovery.allowFollowUp !== true || recovery.maxFollowUps !== 1 || recovery.send !== undefined || control.policy.allowCreate !== undefined || control.policy.allowResume !== undefined || control.policy.allowFollowUp !== undefined || control.policy.send !== undefined) throw new Error("active Writer1 correction v2 wake is missing exact GitHub baseline, canonical-prompt, source, or idempotency pins");
  } else if (recovery.recoveryVersion === "words-writer1-artifact-recovery/v3") {
    if (Object.entries(EXPECTED_RECOVERY_V3).some(([key, value]) => recovery[key] !== value) || recovery.priorRecoveryV2PromptDigest !== v2PromptDigest || typeof recovery.promptDigest !== "string" || recovery.promptDigest !== v3PromptDigest || typeof recovery.idempotencyKey !== "string" || !/^[^:\s]+:writer1:artifact-recovery:v3:sha256:[0-9a-f]{64}:sha256:[0-9a-f]{64}$/u.test(recovery.idempotencyKey) || !recovery.idempotencyKey.endsWith(`:${v3PromptDigest}`)) throw new Error("active artifact-recovery v3 wake is missing the exact v2 failure, absolute-path, canonical-prompt, or idempotency pins");
  } else if (recovery.recoveryVersion === "words-writer1-artifact-recovery/v3-finalize") {
    if ((control.policy?.mode !== "validation-only" && control.policy?.mode !== "validation-report-only") || Object.entries(EXPECTED_RECOVERY_V3_FINALIZE).some(([key, value]) => recovery[key] !== value) || recovery.promptDigest !== v3PromptDigest || recovery.priorRecoveryV3PromptDigest !== v3PromptDigest || typeof recovery.idempotencyKey !== "string" || !/^[^:\s]+:writer1:artifact-recovery:v3-finalize:sha256:[0-9a-f]{64}:sha256:[0-9a-f]{64}$/u.test(recovery.idempotencyKey) || !recovery.idempotencyKey.endsWith(`:${v3PromptDigest}`) || recovery.allowFollowUp !== undefined || recovery.allowResume !== undefined || recovery.allowCreate !== undefined || recovery.send !== undefined || control.policy.allowFollowUp !== undefined || control.policy.allowResume !== undefined || control.policy.allowCreate !== undefined || control.policy.send !== undefined) throw new Error("active v3-finalize wake is missing exact history, frozen-copy, no-message, canonical-prompt, or idempotency pins");
  } else if (Object.entries(EXPECTED_RECOVERY_V2).some(([key, value]) => recovery[key] !== value) || recovery.priorRecoveryPromptDigest !== v1PromptDigest || recovery.promptDigest !== v2PromptDigest || typeof recovery.idempotencyKey !== "string" || !/^[^:\s]+:writer1:artifact-recovery:v2:sha256:[0-9a-f]{64}:sha256:[0-9a-f]{64}$/u.test(recovery.idempotencyKey) || !recovery.idempotencyKey.endsWith(`:${v2PromptDigest}`)) throw new Error("active artifact-recovery v2 wake is missing the exact failed-v1, absolute-path, canonical-prompt, or idempotency pins");
  return { dormant: false, stage: "writer1", sourceSha: recovery.sourceSha };
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const control = JSON.parse(fs.readFileSync(CONTROL_PATH, "utf8"));
  const changedPaths = execFileSync("git", ["diff-tree", "--no-commit-id", "--name-only", "-r", `${process.env.GITHUB_SHA}^`, process.env.GITHUB_SHA], { encoding: "utf8" }).trim().split(/\n/u).filter(Boolean);
  const commitSha = process.env.GITHUB_COMMIT_SHA || process.env.GITHUB_SHA;
  const beforeSha = process.env.GITHUB_EVENT_BEFORE;
  const parentSha = execFileSync("git", ["rev-parse", `${commitSha}^`], { encoding: "utf8" }).trim();
  const result = validateControl(control, { changedPaths, actor: process.env.GITHUB_ACTOR, owner: process.env.GITHUB_REPOSITORY_OWNER, commitSha, beforeSha, parentSha, verifiedLane: process.env.VERIFIED_LANE === "true" });
  const recovery = control.policy?.recovery ?? control.recovery ?? {};
  const recoveryVersion = recovery.recoveryVersion || recovery.correctionVersion || "";
  const correctionVersion = recovery.correctionVersion || "";
  const baseline = recovery.baseline || {};
  const manifest = recovery.receiptManifest || recovery.receiptPins || {};
  const sealed = recovery.sealedManifest || {};
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `dormant=${result.dormant}\nstage=${result.stage}\nrecovery_version=${recoveryVersion || correctionVersion}\ndispatch_mode=${selectVerifiedWriter1Dispatch(control)}\n${result.sourceSha ? `source_sha=${result.sourceSha}\n` : ""}${baseline.repository ? `baseline_repository=${baseline.repository}\nbaseline_commit=${baseline.sourceCommit}\nbaseline_path=${baseline.path}\nbaseline_blob_sha=${baseline.blobSha}\nbaseline_raw_sha256=${baseline.rawSha256}\nbaseline_size=${baseline.size}\n` : ""}${manifest.artifactZipDigest ? `receipt_manifest_artifact_zip_digest=${manifest.artifactZipDigest}\nreceipt_manifest_artifact_zip_size=${manifest.artifactZipSize}\nreceipt_manifest_receipt_path=${manifest.receiptPath}\nreceipt_manifest_receipt_digest=${manifest.receiptDigest}\nreceipt_manifest_receipt_size=${manifest.receiptSize}\n${manifest.controlBindingDigest ? `receipt_manifest_control_binding_digest=${manifest.controlBindingDigest}\nreceipt_manifest_digest=${manifest.manifestDigest}\nreceipt_manifest_mac=${manifest.manifestMac}\n` : ""}` : ""}${sealed.sourceActionRunId ? `seal_action_run_id=${sealed.sourceActionRunId}\nseal_artifact_id=${sealed.sourceArtifactId}\nseal_source_sha=${sealed.sourceSha}\nseal_manifest_path=${sealed.manifestPath}\nseal_manifest_bytes_digest=${sealed.manifestBytesDigest}\nseal_manifest_size=${sealed.manifestSize}\nseal_manifest_digest=${sealed.manifestDigest}\nseal_manifest_mac=${sealed.manifestMac}\n` : ""}`);
}
