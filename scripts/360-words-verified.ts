import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  createJsonCursorReceiptStore,
  CursorPostDispatchOutputValidationError,
  recoverCursorWriterPostDispatch,
  recoverCursorWriterCorrection,
  recoverCursorWriterCorrectionV2,
  recoverCursorWriterCorrectionV3,
  validateWriter1CorrectionDiff,
  writer1CorrectionV3ExpectedBody,
  writer1CorrectionV3ExpectedBodyDigest,
  validateWriter1CorrectionBannedLanguage,
  validateCursorWriterCorrectionReceipt,
  writer1RenderedWordsDigest,
  validatePostDispatchReceiptManifest,
  POST_DISPATCH_ARTIFACT_ZIP_DIGEST,
  POST_DISPATCH_ARTIFACT_ZIP_SIZE,
  POST_DISPATCH_RECEIPT_DIGEST,
  POST_DISPATCH_RECEIPT_SIZE,
  POST_DISPATCH_ORIGINAL_INPUT_DIGEST,
  POST_DISPATCH_ORIGINAL_PROMPT_DIGEST,
  POST_DISPATCH_ORIGINAL_IDEMPOTENCY_KEY,
  POST_DISPATCH_RECEIPT_MANIFEST_SCHEMA,
  postDispatchReceiptManifestDigest,
  postDispatchReceiptManifestMac,
  type CursorWriterCorrectionPrior,
  type CursorGitHubBaselineInput,
  type CursorWriterCorrectionV3Source,
  type CursorPostDispatchReceiptManifest,
} from "../src/pipeline/cursor-writer.js";
import { digestOf } from "../src/contracts/digests.js";
import { buildWriter1ArtifactRecoveryPrompt, digestWriter1ArtifactRecoveryPrompt, buildWriter1GithubBaselineCorrectionPrompt, digestWriter1GithubBaselineCorrectionPrompt, WRITER1_QUARANTINE_CORRECTION_V3_SOURCE, WRITER1_QUARANTINE_CORRECTION_V3_VERSION, buildWriter1QuarantineCorrectionV3Prompt, digestWriter1QuarantineCorrectionV3Prompt, digestWriter1QuarantineCorrectionV3Input } from "./360-words-recovery-prompt.mjs";
import { projectVerifiedWriter1Handoff, verifyGithubWriter1Baseline, VERIFIED_WRITER1_GITHUB_BASELINE } from "./360-words-github-baseline.mjs";
import { parseAndValidateWriter1Output, validateSealed, writer1Projection } from "./360-words-canary.js";
import { runVerifiedWriter2Production, runVerifiedWriter3Production } from "../src/pipeline/verified-words-stages.js";

const DORMANT = "DORMANT";
export const VERIFIED_BRANCH = "architect/360-words-canary-verified";
export const VERIFIED_WRITER1_AGENT_ID = "bc-2486f645-c31c-4532-8145-fbe3af1d45a8";
export const VERIFIED_WRITER1_THREAD_URL = `https://cursor.com/agents/${VERIFIED_WRITER1_AGENT_ID}`;
export const VERIFIED_WRITER1_CORRECTION_VERSION = "words-writer1-correction/v1";
export const VERIFIED_WRITER1_PROMPT = buildWriter1ArtifactRecoveryPrompt("v5");
export const VERIFIED_WRITER1_PROMPT_DIGEST = digestWriter1ArtifactRecoveryPrompt("v5");
export const VERIFIED_WRITER1_CORRECTION_V2 = "words-writer1-correction/v2" as const;
export const VERIFIED_WRITER1_BASELINE = VERIFIED_WRITER1_GITHUB_BASELINE;
export const VERIFIED_WRITER1_PROMPT_V2 = buildWriter1GithubBaselineCorrectionPrompt(VERIFIED_WRITER1_BASELINE);
export const VERIFIED_WRITER1_PROMPT_V2_DIGEST = digestWriter1GithubBaselineCorrectionPrompt(VERIFIED_WRITER1_BASELINE);
export const VERIFIED_WRITER1_CORRECTION_V3 = WRITER1_QUARANTINE_CORRECTION_V3_VERSION;
export const VERIFIED_WRITER1_PROMPT_V3 = buildWriter1QuarantineCorrectionV3Prompt();
export const VERIFIED_WRITER1_PROMPT_V3_DIGEST = digestWriter1QuarantineCorrectionV3Prompt();
export const VERIFIED_WRITER1_CORRECTION_V3_SOURCE = WRITER1_QUARANTINE_CORRECTION_V3_SOURCE;
export const VERIFIED_WRITER1_CORRECTION_V3_ARTIFACT_PATHS = Object.freeze(["runtime/failure.json", "runtime/state.json", "quarantine/writer1-rejected-output.txt", "quarantine/writer1-rejection.json"] as const);
export function validateVerifiedWriter1CorrectionV3ArtifactListing(paths: readonly string[]): void {
  for (const item of paths) {
    if (item.startsWith("/") || item.includes("\\") || item.split("/").some((part) => part === "" || part === "." || part === "..")) throw new Error("verified v3 artifact contains an unsafe or traversing path");
  }
  if (JSON.stringify([...paths].sort()) !== JSON.stringify([...VERIFIED_WRITER1_CORRECTION_V3_ARTIFACT_PATHS].sort())) throw new Error("verified Writer1 correction-v3 source artifact listing is not the exact four-file manifest");
}

function exactKeys(value: Dict, expected: readonly string[], label: string): void {
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(expected)) throw new Error(`${label} has an unexpected JSON key set`);
}

function walkArtifactFiles(root: string, current: string, output: string[]): void {
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error("verified v3 source artifact contains a symlink");
    const full = path.join(current, entry.name);
    const relative = path.relative(root, full).split(path.sep).join("/");
    if (relative.startsWith("/") || relative.includes("\\") || relative.split("/").some((part) => part === "" || part === "." || part === "..")) throw new Error("verified v3 artifact contains an unsafe or traversing path");
    if (entry.isDirectory()) walkArtifactFiles(root, full, output);
    else if (entry.isFile()) output.push(relative);
    else throw new Error("verified v3 source artifact contains a non-regular filesystem entry");
  }
}

export function validateVerifiedWriter1CorrectionV3ArtifactLayout(root: string): void {
  const rootStat = lstatSync(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error("verified v3 source artifact root must be a real directory");
  const files: string[] = [];
  walkArtifactFiles(root, root, files);
  validateVerifiedWriter1CorrectionV3ArtifactListing(files);
  for (const logicalPath of VERIFIED_WRITER1_CORRECTION_V3_ARTIFACT_PATHS) {
    const stat = lstatSync(path.join(root, logicalPath));
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`verified v3 source artifact path is not a regular file: ${logicalPath}`);
  }
}

export function verifyVerifiedWriter1CorrectionV3PinnedBytes(bytes: Buffer, pin: { size: number; digest: string }): void {
  const digest = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  if (bytes.length !== pin.size || digest !== pin.digest) throw new Error("verified v3 pinned bytes do not match size or digest");
}

export function validateVerifiedWriter1CorrectionV3SidecarMetadata(input: { rejection: Dict; failure: Dict; state: Dict; rawDigest: string; rawSize: number }): void {
  exactKeys(input.rejection, VERIFIED_WRITER1_CORRECTION_V3_REJECTION_KEYS, "verified v3 rejection receipt");
  exactKeys(input.failure, VERIFIED_WRITER1_CORRECTION_V3_FAILURE_KEYS, "verified v3 failure state");
  exactKeys(input.state, VERIFIED_WRITER1_CORRECTION_V3_STATE_KEYS, "verified v3 runtime state");
  const post = VERIFIED_WRITER1_POST_DISPATCH;
  if (input.rawDigest !== VERIFIED_WRITER1_CORRECTION_V3_SOURCE.rawDigest || input.rawSize !== VERIFIED_WRITER1_CORRECTION_V3_SOURCE.size) throw new Error("verified v3 raw source pins are invalid");
  const rejection = input.rejection;
  if (rejection.schemaVersion !== "verified-writer1-rejection/v1" || rejection.status !== "rejected-unapproved" || rejection.stage !== "writer1" || rejection.actionRunId !== post.actionRunId || Number(rejection.artifactId) !== post.artifactId || rejection.agentId !== post.agentId || rejection.runId !== post.runId || rejection.threadUrl !== post.threadUrl || rejection.requestedModel !== post.requestedModel || rejection.resolvedModel !== post.resolvedModel || rejection.effort !== "high" || rejection.fast !== false || rejection.rawOutputPath !== VERIFIED_WRITER1_REJECTED_OUTPUT_PATH || rejection.rawOutputDigest !== input.rawDigest || rejection.rawOutputSize !== input.rawSize || rejection.extractedFormat !== "plain-json" || rejection.validationCode !== "WRITER1_OUTPUT_INVALID" || rejection.reason !== "post-dispatch Writer1 output contains banned mutable language at /pages/0/sections/3/body" || rejection.approvedOutputPath !== "canary/outputs/writer1-output.json" || rejection.recoveryMessagesSent !== 0 || rejection.approved !== false || rejection.writer2Blocked !== true || rejection.nextStage !== null) throw new Error("verified v3 rejection receipt identity or raw binding is invalid");
  const failure = input.failure;
  if (failure.schemaVersion !== "verified-writer-failure/v2" || failure.status !== "writer1-validation-failed-quarantined" || failure.stage !== "writer1" || failure.agentId !== post.agentId || failure.runId !== post.runId || failure.threadUrl !== post.threadUrl || failure.errorCode !== "CURSOR_POST_DISPATCH_OUTPUT_INVALID" || failure.promptDigest !== POST_DISPATCH_ORIGINAL_PROMPT_DIGEST || failure.messagesSent !== 1 || failure.recoveryMessagesSent !== 0 || failure.quarantinePath !== VERIFIED_WRITER1_REJECTED_OUTPUT_PATH || failure.rejectionReceiptPath !== VERIFIED_WRITER1_REJECTION_RECEIPT_PATH || failure.writer2Blocked !== true || failure.nextStage !== null) throw new Error("verified v3 failure state identity is invalid");
  const state = input.state;
  if (state.schemaVersion !== "verified-writer-state/v2" || state.status !== "writer1-validation-failed-quarantined" || state.stage !== "writer1" || state.actionRunId !== post.actionRunId || Number(state.artifactId) !== post.artifactId || state.agentId !== post.agentId || state.runId !== post.runId || state.threadUrl !== post.threadUrl || state.requestedModel !== post.requestedModel || state.resolvedModel !== post.resolvedModel || state.effort !== "high" || state.fast !== false || state.messagesSent !== 1 || state.quarantinePath !== VERIFIED_WRITER1_REJECTED_OUTPUT_PATH || state.rejectionReceiptPath !== VERIFIED_WRITER1_REJECTION_RECEIPT_PATH || state.rawOutputDigest !== input.rawDigest || state.recoveryMessagesSent !== 0 || state.writer2Blocked !== true || state.nextStage !== null) throw new Error("verified v3 runtime state identity or raw binding is invalid");
}

export function validateVerifiedWriter1CorrectionV3ArtifactFiles(root: string): void {
  validateVerifiedWriter1CorrectionV3ArtifactLayout(root);
  const rawBytes = readFileSync(path.join(root, VERIFIED_WRITER1_CORRECTION_V3_SOURCE.path));
  const rawDigest = `sha256:${createHash("sha256").update(rawBytes).digest("hex")}`;
  verifyVerifiedWriter1CorrectionV3PinnedBytes(rawBytes, { size: VERIFIED_WRITER1_CORRECTION_V3_SOURCE.size, digest: VERIFIED_WRITER1_CORRECTION_V3_SOURCE.rawDigest });
  const readPinnedJson = (pin: { path: string; size: number; digest: string }): Dict => {
    const bytes = readFileSync(path.join(root, pin.path));
    verifyVerifiedWriter1CorrectionV3PinnedBytes(bytes, pin);
    try { return JSON.parse(bytes.toString("utf8")) as Dict; } catch { throw new Error(`verified v3 sidecar is not JSON: ${pin.path}`); }
  };
  const rejection = readPinnedJson(VERIFIED_WRITER1_CORRECTION_V3_SIDECAR_PINS.rejection);
  const failure = readPinnedJson(VERIFIED_WRITER1_CORRECTION_V3_SIDECAR_PINS.failure);
  const state = readPinnedJson(VERIFIED_WRITER1_CORRECTION_V3_SIDECAR_PINS.state);
  validateVerifiedWriter1CorrectionV3SidecarMetadata({ rejection, failure, state, rawDigest, rawSize: rawBytes.length });
}
export const VERIFIED_WRITER1_ROUTES = ["/garage-door-repair", "/garage-door-installation"] as const;
export const VERIFIED_WRITER1_POST_DISPATCH = Object.freeze({
  recoveryVersion: "words-writer1-post-dispatch-retrieval/v1",
  actionRunId: "32825265478",
  artifactId: 9554789848,
  agentId: VERIFIED_WRITER1_AGENT_ID,
  runId: "run-1686013d-dec5-454c-a39e-5817448e6a96",
  threadUrl: VERIFIED_WRITER1_THREAD_URL,
  requestedModel: "cursor-grok-4.6-high",
  resolvedModel: "grok-4.6",
  effort: "high",
  fast: false,
});
export const VERIFIED_WRITER1_POST_DISPATCH_SEAL_VERSION = "words-writer1-post-dispatch-seal/v1" as const;
export const VERIFIED_WRITER1_POST_DISPATCH_SEAL_MODE = "writer1-seal-only" as const;
export const VERIFIED_WRITER1_POST_DISPATCH_SEALED_MANIFEST_SCHEMA = "verified-writer1-sealed-manifest-pin/v1" as const;
export const VERIFIED_WRITER1_POST_DISPATCH_MANIFEST_PATH = "runtime/writer1-dispatch-manifest.json" as const;
export const VERIFIED_WRITER1_REJECTED_OUTPUT_PATH = "canary/quarantine/writer1-rejected-output.txt" as const;
export const VERIFIED_WRITER1_REJECTION_RECEIPT_PATH = "canary/quarantine/writer1-rejection.json" as const;
export const VERIFIED_WRITER1_CORRECTION_V3_ARTIFACT_ZIP_SIZE = 6778;
export const VERIFIED_WRITER1_CORRECTION_V3_SIDECAR_PINS = Object.freeze({
  rejection: Object.freeze({ path: "quarantine/writer1-rejection.json", size: 1014, digest: "sha256:2e83fcd65d4b863edef6309939f473dfcf1f605fe6daf82676afddd01d17cfd6" }),
  failure: Object.freeze({ path: "runtime/failure.json", size: 705, digest: "sha256:1e72c616b0d31ab55907cd1a6e6dfeb080be611716c318dc72f44b2e5842c0ee" }),
  state: Object.freeze({ path: "runtime/state.json", size: 824, digest: "sha256:bd00f8b779ed21d6e381a78c0a05d80f76c0b9485a7a65f97c407fee3599e945" }),
});
const VERIFIED_WRITER1_CORRECTION_V3_REJECTION_KEYS = Object.freeze(["actionRunId", "agentId", "approved", "approvedOutputPath", "artifactId", "effort", "extractedFormat", "fast", "nextStage", "rawOutputDigest", "rawOutputPath", "rawOutputSize", "reason", "recoveryMessagesSent", "requestedModel", "resolvedModel", "runId", "schemaVersion", "stage", "status", "threadUrl", "validationCode", "writer2Blocked"].sort());
const VERIFIED_WRITER1_CORRECTION_V3_FAILURE_KEYS = Object.freeze(["agentId", "errorCode", "messagesSent", "nextStage", "promptDigest", "quarantinePath", "recoveryMessagesSent", "rejectionReceiptPath", "runId", "schemaVersion", "stage", "status", "threadUrl", "writer2Blocked"].sort());
const VERIFIED_WRITER1_CORRECTION_V3_STATE_KEYS = Object.freeze(["actionRunId", "agentId", "artifactId", "effort", "fast", "messagesSent", "nextStage", "quarantinePath", "rawOutputDigest", "recoveryMessagesSent", "rejectionReceiptPath", "requestedModel", "resolvedModel", "runId", "schemaVersion", "stage", "status", "threadUrl", "writer2Blocked"].sort());

function originalDispatchIdempotencyKey(): string { return POST_DISPATCH_ORIGINAL_IDEMPOTENCY_KEY; }
function postDispatchBinding(value: Dict): string {
  return digestOf({
    schemaVersion: POST_DISPATCH_RECEIPT_MANIFEST_SCHEMA,
    actionRunId: VERIFIED_WRITER1_POST_DISPATCH.actionRunId,
    artifactId: VERIFIED_WRITER1_POST_DISPATCH.artifactId,
    agentId: VERIFIED_WRITER1_POST_DISPATCH.agentId,
    runId: VERIFIED_WRITER1_POST_DISPATCH.runId,
    threadUrl: VERIFIED_WRITER1_POST_DISPATCH.threadUrl,
    requestedModel: VERIFIED_WRITER1_POST_DISPATCH.requestedModel,
    resolvedModel: VERIFIED_WRITER1_POST_DISPATCH.resolvedModel,
    effort: VERIFIED_WRITER1_POST_DISPATCH.effort,
    fast: VERIFIED_WRITER1_POST_DISPATCH.fast,
    inputDigest: POST_DISPATCH_ORIGINAL_INPUT_DIGEST,
    promptDigest: POST_DISPATCH_ORIGINAL_PROMPT_DIGEST,
    idempotencyKey: POST_DISPATCH_ORIGINAL_IDEMPOTENCY_KEY,
    artifactZipDigest: POST_DISPATCH_ARTIFACT_ZIP_DIGEST,
    artifactZipSize: POST_DISPATCH_ARTIFACT_ZIP_SIZE,
    receiptPath: value.receiptPath,
    receiptDigest: POST_DISPATCH_RECEIPT_DIGEST,
    receiptSize: POST_DISPATCH_RECEIPT_SIZE,
  });
}

function assertVerifiedEnvelope(control: Dict): Dict {
  if (control.schemaVersion !== "words-canary-control/v1" || control.requestedBy !== "architect" || control.stage !== "writer1" || control.restore !== null) throw new Error("verified post-dispatch envelope is invalid");
  if (control.wakeNonce === DORMANT) throw new Error("verified post-dispatch mode is dormant");
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{15,127}$/u.test(String(control.wakeNonce))) throw new Error("verified post-dispatch mode requires an owner wake nonce");
  return verifiedControlRecovery(control) || (() => { throw new Error("verified post-dispatch mode is missing recovery pins"); })();
}

function assertOriginalDispatchPins(recovery: Dict): void {
  if (recovery.actionRunId !== VERIFIED_WRITER1_POST_DISPATCH.actionRunId || Number(recovery.artifactId) !== VERIFIED_WRITER1_POST_DISPATCH.artifactId || recovery.agentId !== VERIFIED_WRITER1_POST_DISPATCH.agentId || recovery.runId !== VERIFIED_WRITER1_POST_DISPATCH.runId || recovery.threadUrl !== VERIFIED_WRITER1_POST_DISPATCH.threadUrl || recovery.requestedModel !== VERIFIED_WRITER1_POST_DISPATCH.requestedModel || recovery.resolvedModel !== VERIFIED_WRITER1_POST_DISPATCH.resolvedModel || recovery.effort !== "high" || recovery.fast !== false || recovery.inputDigest !== POST_DISPATCH_ORIGINAL_INPUT_DIGEST || recovery.promptDigest !== POST_DISPATCH_ORIGINAL_PROMPT_DIGEST || recovery.idempotencyKey !== originalDispatchIdempotencyKey()) throw new Error("verified post-dispatch mode is not bound to the signed original dispatch");
}

export function validateVerifiedWriter1SealOnlyControl(control: Dict): void {
  const recovery = assertVerifiedEnvelope(control);
  if (control.policy?.mode !== VERIFIED_WRITER1_POST_DISPATCH_SEAL_MODE || control.policy.writer1Only !== true || control.policy.provider !== "cursor-sdk" || control.policy.model !== "cursor-grok-4.6-high" || control.policy.fast !== false || control.policy.stopAfter !== "manifest-sealed" || JSON.stringify(control.policy.approvedRoutes) !== JSON.stringify(["/", ...VERIFIED_WRITER1_ROUTES, "/contact"])) throw new Error("seal-only control does not select the bounded zero-message policy");
  if (recovery.recoveryVersion !== VERIFIED_WRITER1_POST_DISPATCH_SEAL_VERSION || recovery.sourceBranch !== VERIFIED_BRANCH || !/^[0-9a-f]{40}$/u.test(String(recovery.sourceSha)) || recovery.allowCreate !== false || recovery.allowResume !== false || recovery.allowFollowUp !== false || recovery.maxFollowUps !== 0 || recovery.send !== undefined || recovery.resume !== undefined || recovery.create !== undefined) throw new Error("seal-only control is missing the fail-closed source or zero-message pins");
  assertOriginalDispatchPins(recovery);
  const pins = recovery.receiptPins;
  if (!pins || pins.artifactZipDigest !== POST_DISPATCH_ARTIFACT_ZIP_DIGEST || pins.artifactZipSize !== POST_DISPATCH_ARTIFACT_ZIP_SIZE || pins.receiptPath !== "runtime/writer1-dispatch-receipt.json" || pins.receiptDigest !== POST_DISPATCH_RECEIPT_DIGEST || pins.receiptSize !== POST_DISPATCH_RECEIPT_SIZE) throw new Error("seal-only control is missing the exact Action artifact and receipt pins");
}

function validateSealedManifestPins(recovery: Dict): void {
  const pin = recovery.sealedManifest;
  if (!pin || pin.schemaVersion !== VERIFIED_WRITER1_POST_DISPATCH_SEALED_MANIFEST_SCHEMA || pin.sourceActionRunId !== recovery.sealActionRunId || Number(pin.sourceArtifactId) !== Number(recovery.sealArtifactId) || pin.manifestPath !== VERIFIED_WRITER1_POST_DISPATCH_MANIFEST_PATH || !isDigest(pin.manifestBytesDigest) || !Number.isSafeInteger(pin.manifestSize) || pin.manifestSize < 1 || !isDigest(pin.manifestDigest) || !/^hmac-sha256:[0-9a-f]{64}$/u.test(String(pin.manifestMac)) || typeof pin.sourceSha !== "string" || !/^[0-9a-f]{40}$/u.test(pin.sourceSha)) throw new Error("retrieval-only control is missing exact sealed manifest bytes, digest, MAC, or source pins");
}

/** The mode-A pin is over the exact downloaded file bytes, never a JSON reserialization. */
export function verifyPinnedSealedManifestBytes(bytes: Uint8Array, pin: Dict): void {
  const byteDigest = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  if (bytes.byteLength !== pin.manifestSize || byteDigest !== pin.manifestBytesDigest) throw new Error("sealed manifest bytes do not match the Architect-pinned mode-A artifact");
}

function readSealedManifest(root: string, recovery: Dict, cursorApiKey: string): CursorPostDispatchReceiptManifest {
  validateSealedManifestPins(recovery);
  const pin = recovery.sealedManifest;
  const file = path.join(process.env.WRITER1_POST_DISPATCH_SEAL_ROOT || root, pin.manifestPath);
  const bytes = readFileSync(file);
  verifyPinnedSealedManifestBytes(bytes, pin);
  let manifest: Dict; try { manifest = JSON.parse(bytes.toString("utf8")) as Dict; } catch { throw new Error("sealed mode-A manifest is not JSON"); }
  if (manifest.manifestDigest !== pin.manifestDigest || manifest.manifestMac !== pin.manifestMac) throw new Error("sealed manifest digest or MAC pin mismatch");
  if (postDispatchReceiptManifestDigest(manifest as CursorPostDispatchReceiptManifest) !== manifest.manifestDigest || postDispatchReceiptManifestMac(manifest as CursorPostDispatchReceiptManifest, cursorApiKey) !== manifest.manifestMac || manifest.controlBindingDigest !== postDispatchBinding(manifest)) throw new Error("sealed mode-A manifest authenticity or original-dispatch binding failed");
  return manifest as CursorPostDispatchReceiptManifest;
}

type Dict = Record<string, any>;
function jsonFile(root: string, relative: string): string { return path.join(root, relative); }
function readJson(root: string, relative: string): Dict { return JSON.parse(readFileSync(jsonFile(root, relative), "utf8")) as Dict; }
function writeJson(file: string, value: unknown): Promise<void> { return fs.mkdir(path.dirname(file), { recursive: true }).then(() => fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8")); }
function isDigest(value: unknown): value is string { return typeof value === "string" && /^sha256:[0-9a-f]{64}$/u.test(value); }
function sha256Text(value: string): string { return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`; }
function verifiedControlRecovery(control: Dict): Dict | undefined {
  if (control.policy?.recovery !== undefined && control.recovery !== undefined) throw new Error("verified control may not provide ambiguous policy and top-level recovery objects");
  return control.policy?.recovery ?? control.recovery;
}

export function validateVerifiedWriter1Control(control: Dict, inputDigest: string): void {
  if (control.schemaVersion !== "words-canary-control/v1" || control.requestedBy !== "architect" || control.stage !== "writer1" || control.restore !== null) throw new Error("verified control envelope is invalid");
  if (control.wakeNonce === DORMANT) return;
  const policy = control.policy; const recovery = verifiedControlRecovery(control);
  if (policy?.mode !== "writer1-correction" || policy.writer1Only !== true || policy.provider !== "cursor-sdk" || policy.model !== "cursor-grok-4.6-high" || policy.fast !== false || policy.stopAfter !== "awaiting-architect-qa") throw new Error("verified control does not select the bounded Writer1 correction policy");
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{15,127}$/u.test(control.wakeNonce)) throw new Error("verified control requires an owner wake nonce");
  if (recovery?.correctionVersion !== VERIFIED_WRITER1_CORRECTION_VERSION || recovery?.sourceBranch !== VERIFIED_BRANCH || recovery?.agentId !== VERIFIED_WRITER1_AGENT_ID || recovery?.threadUrl !== VERIFIED_WRITER1_THREAD_URL || recovery?.inputDigest !== inputDigest || recovery?.promptDigest !== VERIFIED_WRITER1_PROMPT_DIGEST || !/^[0-9a-f]{40}$/u.test(recovery?.sourceSha || "") || recovery?.allowCreate !== false || recovery?.allowResume !== true || recovery?.allowFollowUp !== true || recovery?.maxFollowUps !== 1 || recovery?.idempotencyKey !== `${VERIFIED_WRITER1_AGENT_ID}:writer1:correction:v1:${inputDigest}:${VERIFIED_WRITER1_PROMPT_DIGEST}` || recovery?.send !== undefined || policy.allowCreate !== undefined || policy.allowResume !== undefined || policy.allowFollowUp !== undefined || policy.send !== undefined) throw new Error("verified Writer1 correction pins are invalid");
  if (JSON.stringify(policy.approvedRoutes) !== JSON.stringify(["/", "/garage-door-repair", "/garage-door-installation", "/contact"])) throw new Error("verified public route set is invalid");
}

function baselineMetadata(value: CursorGitHubBaselineInput): Dict {
  return { kind: value.kind, repository: value.repository, sourceCommit: value.sourceCommit, path: value.path, blobSha: value.blobSha, rawSha256: value.rawSha256, size: value.size, contentSize: value.contentSize, byteDigest: value.byteDigest, sealedHandoffDigest: value.sealedHandoffDigest, authorship: value.authorship };
}

export async function quarantineWriter1PostDispatchOutput(root: string, input: { rawResult: string; parsedJson: string; format: "plain-json" | "fenced-json"; reason: string; validationCode: string }): Promise<{ outputPath: string; receiptPath: string; rawDigest: string }> {
  const outputPath = VERIFIED_WRITER1_REJECTED_OUTPUT_PATH;
  const receiptPath = VERIFIED_WRITER1_REJECTION_RECEIPT_PATH;
  const outputFile = jsonFile(root, outputPath);
  const receiptFile = jsonFile(root, receiptPath);
  JSON.parse(input.parsedJson);
  const rawDigest = sha256Text(input.rawResult);
  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  await fs.writeFile(outputFile, input.rawResult, "utf8");
  await writeJson(receiptFile, {
    schemaVersion: "verified-writer1-rejection/v1",
    status: "rejected-unapproved",
    stage: "writer1",
    rawOutputPath: outputPath,
    rawOutputDigest: rawDigest,
    rawOutputSize: Buffer.byteLength(input.rawResult, "utf8"),
    extractedFormat: input.format,
    validationCode: input.validationCode,
    reason: input.reason,
    actionRunId: VERIFIED_WRITER1_POST_DISPATCH.actionRunId,
    artifactId: VERIFIED_WRITER1_POST_DISPATCH.artifactId,
    agentId: VERIFIED_WRITER1_POST_DISPATCH.agentId,
    runId: VERIFIED_WRITER1_POST_DISPATCH.runId,
    threadUrl: VERIFIED_WRITER1_POST_DISPATCH.threadUrl,
    requestedModel: VERIFIED_WRITER1_POST_DISPATCH.requestedModel,
    resolvedModel: VERIFIED_WRITER1_POST_DISPATCH.resolvedModel,
    effort: VERIFIED_WRITER1_POST_DISPATCH.effort,
    fast: VERIFIED_WRITER1_POST_DISPATCH.fast,
    recoveryMessagesSent: 0,
    approved: false,
    approvedOutputPath: "canary/outputs/writer1-output.json",
    writer2Blocked: true,
    nextStage: null,
  });
  return { outputPath, receiptPath, rawDigest };
}

export async function persistVerifiedWriterFailureSurface(root: string, input: { errorCode: string; retrievalOnly: boolean; quarantined: boolean; messagesSent: number; dispatch?: Dict | undefined; quarantine?: { outputPath: string; receiptPath: string; rawDigest: string } | undefined }): Promise<void> {
  if (input.quarantined) {
    if (!input.quarantine) throw new Error("quarantine details are required for a quarantined failure");
    await writeJson(path.join(root, "canary/runtime/state.json"), { schemaVersion: "verified-writer-state/v2", status: "writer1-validation-failed-quarantined", stage: "writer1", actionRunId: VERIFIED_WRITER1_POST_DISPATCH.actionRunId, artifactId: VERIFIED_WRITER1_POST_DISPATCH.artifactId, agentId: VERIFIED_WRITER1_POST_DISPATCH.agentId, runId: VERIFIED_WRITER1_POST_DISPATCH.runId, threadUrl: VERIFIED_WRITER1_POST_DISPATCH.threadUrl, requestedModel: VERIFIED_WRITER1_POST_DISPATCH.requestedModel, resolvedModel: VERIFIED_WRITER1_POST_DISPATCH.resolvedModel, effort: "high", fast: false, quarantinePath: input.quarantine.outputPath, rejectionReceiptPath: input.quarantine.receiptPath, rawOutputDigest: input.quarantine.rawDigest, recoveryMessagesSent: 0, messagesSent: input.messagesSent, writer2Blocked: true, nextStage: null });
  }
  await writeJson(path.join(root, "canary/runtime/failure.json"), { schemaVersion: "verified-writer-failure/v2", status: input.quarantined ? "writer1-validation-failed-quarantined" : "failed", stage: "writer1", errorCode: input.errorCode, writer2Blocked: true, nextStage: null, messagesSent: input.messagesSent, ...(input.retrievalOnly ? { recoveryMessagesSent: 0 } : {}), ...(input.quarantined ? { quarantinePath: VERIFIED_WRITER1_REJECTED_OUTPUT_PATH, rejectionReceiptPath: VERIFIED_WRITER1_REJECTION_RECEIPT_PATH } : {}), ...(input.dispatch ? { agentId: input.dispatch.agentId, threadUrl: input.dispatch.threadUrl, runId: input.dispatch.runId, promptDigest: input.dispatch.promptDigest } : {}) });
  if (!input.quarantined) await writeJson(path.join(root, "canary/runtime/state.json"), { status: "writer1-failed", stage: "writer1", errorCode: input.errorCode, writer2Blocked: true, nextStage: null, messagesSent: input.messagesSent, ...(input.retrievalOnly ? { recoveryMessagesSent: 0 } : {}), ...(input.dispatch ? { agentId: input.dispatch.agentId, threadUrl: input.dispatch.threadUrl, runId: input.dispatch.runId } : {}) });
}
function baselineControlMetadata(value: CursorGitHubBaselineInput): Dict {
  return { kind: value.kind, repository: value.repository, sourceCommit: value.sourceCommit, path: value.path, blobSha: value.blobSha, rawSha256: value.rawSha256, size: value.size, authorship: value.authorship };
}
function verifiedBaseline(root: string, sealed: Dict, projection: Dict): CursorGitHubBaselineInput {
  const metadata = readJson(root, "canary/inputs/github-writer1-baseline/metadata.json");
  const bytes = readFileSync(jsonFile(root, "canary/inputs/github-writer1-baseline/writer1-output.json"));
  const verified = verifyGithubWriter1Baseline({ metadata, bytes, sealed: projectVerifiedWriter1Handoff(sealed), expected: VERIFIED_WRITER1_BASELINE });
  const output = parseAndValidateWriter1Output(verified.raw, projection);
  return { ...verified, output, outputDigest: digestOf(output) } as CursorGitHubBaselineInput;
}
export function validateVerifiedWriter1CorrectionV2Control(control: Dict, inputDigest: string, baseline: CursorGitHubBaselineInput): void {
  if (control.schemaVersion !== "words-canary-control/v1" || control.requestedBy !== "architect" || control.stage !== "writer1" || control.restore !== null) throw new Error("verified v2 control envelope is invalid");
  if (control.wakeNonce === DORMANT) return;
  const policy = control.policy; const recovery = verifiedControlRecovery(control);
  const expectedBaseline = baselineControlMetadata(baseline);
  if (policy?.mode !== "writer1-correction" || policy.writer1Only !== true || policy.provider !== "cursor-sdk" || policy.model !== "cursor-grok-4.6-high" || policy.fast !== false || policy.stopAfter !== "awaiting-architect-qa") throw new Error("verified v2 control does not select the bounded Writer1 correction policy");
  if (recovery?.correctionVersion !== VERIFIED_WRITER1_CORRECTION_V2 || recovery?.sourceBranch !== VERIFIED_BRANCH || recovery?.agentId !== VERIFIED_WRITER1_AGENT_ID || recovery?.threadUrl !== VERIFIED_WRITER1_THREAD_URL || recovery?.inputDigest !== inputDigest || recovery?.promptDigest !== VERIFIED_WRITER1_PROMPT_V2_DIGEST || JSON.stringify(recovery?.baseline) !== JSON.stringify(expectedBaseline) || recovery?.allowCreate !== false || recovery?.allowResume !== true || recovery?.allowFollowUp !== true || recovery?.maxFollowUps !== 1 || recovery?.idempotencyKey !== `${VERIFIED_WRITER1_AGENT_ID}:writer1:correction:v2:${inputDigest}:${VERIFIED_WRITER1_PROMPT_V2_DIGEST}`) throw new Error("verified Writer1 correction v2 pins are invalid");
}

export function validateVerifiedWriter1CorrectionV3Control(control: Dict, inputDigest: string): void {
  if (control.schemaVersion !== "words-canary-control/v1" || control.requestedBy !== "architect" || control.stage !== "writer1" || control.restore !== null) throw new Error("verified v3 control envelope is invalid");
  if (control.wakeNonce === DORMANT) return;
  const policy = control.policy; const recovery = verifiedControlRecovery(control);
  if (policy?.mode !== "writer1-correction" || policy.writer1Only !== true || policy.provider !== "cursor-sdk" || policy.model !== "cursor-grok-4.6-high" || policy.fast !== false || policy.stopAfter !== "awaiting-architect-qa" || JSON.stringify(policy.approvedRoutes) !== JSON.stringify(["/", ...VERIFIED_WRITER1_ROUTES, "/contact"])) throw new Error("verified v3 control does not select the bounded Writer1 correction policy");
  const source = recovery?.sourceArtifact;
  if (recovery?.correctionVersion !== VERIFIED_WRITER1_CORRECTION_V3 || recovery?.sourceBranch !== VERIFIED_BRANCH || recovery?.agentId !== VERIFIED_WRITER1_AGENT_ID || recovery?.threadUrl !== VERIFIED_WRITER1_THREAD_URL || recovery?.inputDigest !== inputDigest || recovery?.promptDigest !== VERIFIED_WRITER1_PROMPT_V3_DIGEST || JSON.stringify(source) !== JSON.stringify(VERIFIED_WRITER1_CORRECTION_V3_SOURCE) || recovery?.targetPath !== "/pages/0/sections/3/body" || recovery?.allowCreate !== false || recovery?.allowResume !== true || recovery?.allowFollowUp !== true || recovery?.maxFollowUps !== 1 || recovery?.idempotencyKey !== `${VERIFIED_WRITER1_AGENT_ID}:writer1:correction:v3:${inputDigest}:${VERIFIED_WRITER1_PROMPT_V3_DIGEST}` || recovery?.send !== undefined || policy.allowCreate !== undefined || policy.allowResume !== undefined || policy.allowFollowUp !== undefined || policy.send !== undefined) throw new Error("verified Writer1 correction v3 pins are invalid");
}

function readVerifiedWriter1CorrectionV3Source(root: string, projection: Dict): CursorWriterCorrectionV3Source {
  const sourceRoot = process.env.WRITER1_CORRECTION_V3_SOURCE_ROOT || path.join(root, "canary/inputs/writer1-correction-v3-artifact");
  const file = path.join(sourceRoot, VERIFIED_WRITER1_CORRECTION_V3_SOURCE.path);
  const bytes = readFileSync(file);
  const rawDigest = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  if (bytes.length !== VERIFIED_WRITER1_CORRECTION_V3_SOURCE.size || rawDigest !== VERIFIED_WRITER1_CORRECTION_V3_SOURCE.rawDigest) throw new Error("verified v3 quarantined source bytes do not match the immutable pins");
  const raw = bytes.toString("utf8");
  const output = parseAndValidateWriter1Output(raw, projection);
  return { kind: "quarantine-file", ...VERIFIED_WRITER1_CORRECTION_V3_SOURCE, contentSize: bytes.length, byteDigest: rawDigest, raw, bytes, output, outputDigest: digestOf(output) };
}

/** A post-dispatch wake is a read-only reconciliation mode, never a follow-up. */
export function validateVerifiedWriter1PostDispatchControl(control: Dict, inputDigest: string): void {
  void inputDigest; // The original dispatch digest is immutable and checked below.
  if (control.schemaVersion !== "words-canary-control/v1" || control.requestedBy !== "architect" || control.stage !== "writer1" || control.restore !== null) throw new Error("post-dispatch control envelope is invalid");
  if (control.wakeNonce === DORMANT) return;
  const policy = control.policy; const recovery = verifiedControlRecovery(control);
  const idempotencyKey = originalDispatchIdempotencyKey();
  if (policy?.mode !== "writer1-retrieval-only" || policy.writer1Only !== true || policy.provider !== "cursor-sdk" || policy.model !== "cursor-grok-4.6-high" || policy.fast !== false || policy.stopAfter !== "awaiting-architect-qa" || JSON.stringify(policy.approvedRoutes) !== JSON.stringify(["/", ...VERIFIED_WRITER1_ROUTES, "/contact"])) throw new Error("post-dispatch control does not select the bounded read-only Writer1 policy");
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{15,127}$/u.test(control.wakeNonce)) throw new Error("post-dispatch control requires an owner wake nonce");
  const manifest = recovery?.receiptManifest;
  if (!manifest || manifest.schemaVersion !== "verified-writer1-dispatch-manifest/v1" || manifest.actionRunId !== VERIFIED_WRITER1_POST_DISPATCH.actionRunId || Number(manifest.artifactId) !== VERIFIED_WRITER1_POST_DISPATCH.artifactId || manifest.artifactZipDigest !== POST_DISPATCH_ARTIFACT_ZIP_DIGEST || manifest.artifactZipSize !== POST_DISPATCH_ARTIFACT_ZIP_SIZE || manifest.receiptPath !== "runtime/writer1-dispatch-receipt.json" || manifest.receiptDigest !== POST_DISPATCH_RECEIPT_DIGEST || manifest.receiptSize !== POST_DISPATCH_RECEIPT_SIZE || !isDigest(manifest.controlBindingDigest) || !isDigest(manifest.manifestDigest) || !/^hmac-sha256:[0-9a-f]{64}$/u.test(String(manifest.manifestMac)) || Object.keys(manifest).sort().join(",") !== ["actionRunId", "artifactId", "artifactZipDigest", "artifactZipSize", "controlBindingDigest", "manifestDigest", "manifestMac", "receiptDigest", "receiptPath", "receiptSize", "schemaVersion"].sort().join(",")) throw new Error("post-dispatch control is missing the complete Architect-sealed receipt manifest pins");
  if (!recovery || recovery.recoveryVersion !== VERIFIED_WRITER1_POST_DISPATCH.recoveryVersion || recovery.sourceBranch !== VERIFIED_BRANCH || recovery.actionRunId !== VERIFIED_WRITER1_POST_DISPATCH.actionRunId || Number(recovery.artifactId) !== VERIFIED_WRITER1_POST_DISPATCH.artifactId || recovery.agentId !== VERIFIED_WRITER1_POST_DISPATCH.agentId || recovery.runId !== VERIFIED_WRITER1_POST_DISPATCH.runId || recovery.threadUrl !== VERIFIED_WRITER1_POST_DISPATCH.threadUrl || recovery.requestedModel !== VERIFIED_WRITER1_POST_DISPATCH.requestedModel || recovery.resolvedModel !== VERIFIED_WRITER1_POST_DISPATCH.resolvedModel || recovery.effort !== "high" || recovery.fast !== false || recovery.inputDigest !== POST_DISPATCH_ORIGINAL_INPUT_DIGEST || recovery.promptDigest !== POST_DISPATCH_ORIGINAL_PROMPT_DIGEST || recovery.idempotencyKey !== idempotencyKey || recovery.allowCreate !== false || recovery.allowResume !== false || recovery.allowFollowUp !== false || recovery.maxFollowUps !== 0 || recovery.send !== undefined || recovery.resume !== undefined || recovery.create !== undefined || policy.allowCreate !== undefined || policy.allowResume !== undefined || policy.allowFollowUp !== undefined || policy.send !== undefined) throw new Error("post-dispatch control is missing exact zero-message run and signed original idempotency pins");
  validateSealedManifestPins(recovery);
}

function readPriorDispatch(root: string): { dispatch: Dict; bytes: Buffer; file: string; logicalPath: string } {
  const base = root;
  const candidates = [
    path.join(base, "runtime/writer1-dispatch-receipt.json"),
    path.join(base, "canary/runtime/writer1-dispatch-receipt.json"),
    path.join(base, "runtime/dispatch-receipt.json"),
  ].filter(Boolean);
  for (const file of candidates) { try { const bytes = readFileSync(file); const logicalPath = file.endsWith("/dispatch-receipt.json") ? "runtime/dispatch-receipt.json" : "runtime/writer1-dispatch-receipt.json"; return { dispatch: JSON.parse(bytes.toString("utf8")) as Dict, bytes, file, logicalPath }; } catch { /* try the uploader's next stable layout */ } }
  throw new Error("prior post-dispatch Action artifact did not contain a dispatch receipt");
}

/**
 * The original dispatch receipt predates the durable idempotency/message fields.
 * Preserve that fact: input/prompt/model identity comes from the receipt; the
 * exact idempotency claim and sent-count are verified from the two sidecars the
 * Action uploaded, never synthesized into the receipt.
 */
export function verifyOriginalDispatchEvidence(root: string): Dict {
  const dispatchFile = readPriorDispatch(root);
  const dispatch = dispatchFile.dispatch;
  if ((dispatch.schemaVersion !== "verified-writer-dispatch/v2" && dispatch.schemaVersion !== "words-canary-dispatch/v2") || dispatch.stage !== "writer1" || dispatch.provider !== "cursor-sdk" || dispatch.agentId !== VERIFIED_WRITER1_AGENT_ID || dispatch.runId !== VERIFIED_WRITER1_POST_DISPATCH.runId || dispatch.threadUrl !== VERIFIED_WRITER1_THREAD_URL || dispatch.requestedModel !== VERIFIED_WRITER1_POST_DISPATCH.requestedModel || dispatch.resolvedModel !== VERIFIED_WRITER1_POST_DISPATCH.resolvedModel || dispatch.effort !== "high" || dispatch.fast !== false || dispatch.inputDigest !== POST_DISPATCH_ORIGINAL_INPUT_DIGEST || dispatch.promptDigest !== POST_DISPATCH_ORIGINAL_PROMPT_DIGEST || typeof dispatch.requestDigest !== "string" || !isDigest(dispatch.requestDigest)) throw new Error("downloaded dispatch receipt is not bound to the exact signed original dispatch");
  if (dispatch.idempotencyKey !== undefined && dispatch.idempotencyKey !== originalDispatchIdempotencyKey()) throw new Error("dispatch receipt contains a conflicting idempotency key");
  if (dispatch.messagesSent !== undefined && dispatch.messagesSent !== 1) throw new Error("dispatch receipt contains a conflicting sent count");
  const claimsPath = path.join(root, "runtime/cursor-receipts.json");
  const statePath = path.join(root, "runtime/state.json");
  let claimsFile: Dict; let state: Dict;
  try { claimsFile = JSON.parse(readFileSync(claimsPath, "utf8")) as Dict; state = JSON.parse(readFileSync(statePath, "utf8")) as Dict; } catch { throw new Error("original dispatch idempotency and sent-count sidecars are required"); }
  const claim = claimsFile.claims?.[originalDispatchIdempotencyKey()];
  if (!claim || claim.key !== originalDispatchIdempotencyKey() || claim.stage !== "writer1" || claim.inputDigest !== POST_DISPATCH_ORIGINAL_INPUT_DIGEST || claim.promptDigest !== POST_DISPATCH_ORIGINAL_PROMPT_DIGEST || claim.requestedAgentId !== VERIFIED_WRITER1_AGENT_ID || claim.agentId !== VERIFIED_WRITER1_AGENT_ID || claim.jobId !== VERIFIED_WRITER1_POST_DISPATCH.runId || claim.phase !== "waiting") throw new Error("cursor-receipts claim is not the exact original dispatch idempotency evidence");
  if (state.status !== "writer1-failed" || state.stage !== "writer1" || state.messagesSent !== 1 || state.writer2Blocked !== true || state.nextStage !== null || state.agentId !== VERIFIED_WRITER1_AGENT_ID || state.threadUrl !== VERIFIED_WRITER1_THREAD_URL || state.runId !== VERIFIED_WRITER1_POST_DISPATCH.runId) throw new Error("state sidecar is not the exact original sent-count evidence");
  return { dispatchFile, claim, state, idempotencyKey: originalDispatchIdempotencyKey(), messagesSent: 1, idempotencySource: "runtime/cursor-receipts.json:claims[originalIdempotencyKey]", messagesSentSource: "runtime/state.json:messagesSent" };
}

function postDispatchPrior(root: string, recoveryControl: Dict, artifactZipPath: string, cursorApiKey: string): Dict {
  const dispatchFile = readPriorDispatch(root);
  verifyOriginalDispatchEvidence(root);
  const dispatch = dispatchFile.dispatch;
  const recovery = VERIFIED_WRITER1_POST_DISPATCH;
  const expectedKey = originalDispatchIdempotencyKey();
  if ((dispatch.schemaVersion !== "verified-writer-dispatch/v2" && dispatch.schemaVersion !== "words-canary-dispatch/v2") || dispatch.stage !== "writer1" || dispatch.provider !== "cursor-sdk" || dispatch.agentId !== recovery.agentId || dispatch.runId !== recovery.runId || dispatch.threadUrl !== recovery.threadUrl || dispatch.requestedModel !== recovery.requestedModel || dispatch.resolvedModel !== recovery.resolvedModel || dispatch.effort !== "high" || dispatch.fast !== false || dispatch.inputDigest !== POST_DISPATCH_ORIGINAL_INPUT_DIGEST || dispatch.promptDigest !== POST_DISPATCH_ORIGINAL_PROMPT_DIGEST || typeof dispatch.requestDigest !== "string" || !isDigest(dispatch.requestDigest)) throw new Error("prior post-dispatch receipt identity or signed original model binding mismatch");
  if (dispatch.idempotencyKey !== undefined && dispatch.idempotencyKey !== expectedKey) throw new Error("prior post-dispatch receipt idempotency binding mismatch");
  const manifest = recoveryControl.receiptManifest as CursorPostDispatchReceiptManifest;
  if (!manifest) throw new Error("post-dispatch wake is missing the Architect-sealed receipt manifest");
  let artifactZip: Buffer;
  try { artifactZip = readFileSync(artifactZipPath); } catch { throw new Error("post-dispatch Action ZIP is required for receipt authenticity verification"); }
  if (manifest.receiptPath !== dispatchFile.logicalPath) throw new Error("post-dispatch receipt manifest path does not bind the exact downloaded receipt file");
  validatePostDispatchReceiptManifest(manifest, recoveryControl.receiptManifest, artifactZip, dispatchFile.bytes, cursorApiKey);
  return { actionRunId: recovery.actionRunId, artifactId: recovery.artifactId, runId: recovery.runId, agentId: recovery.agentId, threadUrl: recovery.threadUrl, requestedModel: recovery.requestedModel, resolvedModel: recovery.resolvedModel, modelParams: [{ id: "fast", value: "false" }, { id: "effort", value: "high" }], effort: "high", fast: false, inputDigest: POST_DISPATCH_ORIGINAL_INPUT_DIGEST, promptDigest: POST_DISPATCH_ORIGINAL_PROMPT_DIGEST, requestDigest: dispatch.requestDigest, idempotencyKey: expectedKey, messagesSent: 1, dispatchManifest: manifest };
}

/**
 * Mode A is intentionally a different function from retrieval. It authenticates
 * the immutable GitHub artifact/receipt and emits a manifest only. There is no
 * Cursor transport, Agent.getRun, Agent.create, resume, send, or wait reachable
 * from this function.
 */
export async function runVerifiedWriter1PostDispatchSealOnly(root = process.cwd()): Promise<{ status: string; stage: string; manifestPath?: string }> {
  const control = readJson(root, ".factory-wake/360-words-control.json");
  if (control.wakeNonce === DORMANT) return { status: "dormant", stage: "writer1" };
  validateVerifiedWriter1SealOnlyControl(control);
  const recovery = verifiedControlRecovery(control)!;
  const artifactZipPath = process.env.WRITER1_POST_DISPATCH_ZIP || path.join(root, "canary/inputs/post-dispatch.zip");
  const artifactRoot = process.env.WRITER1_POST_DISPATCH_ROOT || root;
  const cursorApiKey = process.env.CURSOR_API_KEY || "";
  if (!cursorApiKey) throw new Error("seal-only mode requires CURSOR_API_KEY to MAC the manifest");
  const dispatchFile = readPriorDispatch(artifactRoot);
  const dispatch = dispatchFile.dispatch;
  assertOriginalDispatchPins(recovery);
  const originalEvidence = verifyOriginalDispatchEvidence(artifactRoot);
  const artifactZip = readFileSync(artifactZipPath);
  const pins = recovery.receiptPins;
  const manifest: CursorPostDispatchReceiptManifest = {
    schemaVersion: POST_DISPATCH_RECEIPT_MANIFEST_SCHEMA,
    actionRunId: VERIFIED_WRITER1_POST_DISPATCH.actionRunId,
    artifactId: VERIFIED_WRITER1_POST_DISPATCH.artifactId,
    artifactZipDigest: pins.artifactZipDigest,
    artifactZipSize: pins.artifactZipSize,
    receiptPath: dispatchFile.logicalPath as CursorPostDispatchReceiptManifest["receiptPath"],
    receiptDigest: pins.receiptDigest,
    receiptSize: pins.receiptSize,
    controlBindingDigest: postDispatchBinding({ receiptPath: dispatchFile.logicalPath }),
    manifestDigest: "",
    manifestMac: "",
  };
  manifest.manifestDigest = postDispatchReceiptManifestDigest(manifest);
  manifest.manifestMac = postDispatchReceiptManifestMac(manifest, cursorApiKey);
  validatePostDispatchReceiptManifest(manifest, manifest, artifactZip, dispatchFile.bytes, cursorApiKey);
  await writeJson(jsonFile(root, "canary/runtime/writer1-dispatch-manifest.json"), manifest);
  await writeJson(jsonFile(root, "canary/runtime/writer1-seal-receipt.json"), {
    schemaVersion: "verified-writer1-seal-receipt/v1", status: "manifest-sealed", stage: "writer1", actionRunId: VERIFIED_WRITER1_POST_DISPATCH.actionRunId,
    artifactId: VERIFIED_WRITER1_POST_DISPATCH.artifactId, agentId: VERIFIED_WRITER1_POST_DISPATCH.agentId, runId: VERIFIED_WRITER1_POST_DISPATCH.runId,
    threadUrl: VERIFIED_WRITER1_POST_DISPATCH.threadUrl, requestedModel: VERIFIED_WRITER1_POST_DISPATCH.requestedModel, resolvedModel: VERIFIED_WRITER1_POST_DISPATCH.resolvedModel,
    effort: "high", fast: false, originalInputDigest: POST_DISPATCH_ORIGINAL_INPUT_DIGEST, originalPromptDigest: POST_DISPATCH_ORIGINAL_PROMPT_DIGEST,
    originalIdempotencyKey: originalDispatchIdempotencyKey(), originalRequestDigest: dispatch.requestDigest, messagesSent: 1, recoveryMessagesSent: 0,
    manifestPath: VERIFIED_WRITER1_POST_DISPATCH_MANIFEST_PATH, manifestDigest: manifest.manifestDigest, manifestMac: manifest.manifestMac, originalIdempotencySource: originalEvidence.idempotencySource, originalMessagesSentSource: originalEvidence.messagesSentSource, writer2Blocked: true, nextStage: null,
  });
  return { status: "manifest-sealed", stage: "writer1", manifestPath: VERIFIED_WRITER1_POST_DISPATCH_MANIFEST_PATH };
}

export async function runVerifiedWriter1PostDispatchRecovery(root = process.cwd()): Promise<{ status: string; stage: string; runId: string; threadUrl: string }> {
  const control = readJson(root, ".factory-wake/360-words-control.json");
  if (control.wakeNonce === DORMANT) return { status: "dormant", stage: "writer1", runId: VERIFIED_WRITER1_POST_DISPATCH.runId, threadUrl: VERIFIED_WRITER1_POST_DISPATCH.threadUrl };
  const sealed = validateSealed(root); const projection = writer1Projection(sealed); const baseline = verifiedBaseline(root, sealed, projection);
  const recoveryContextDigest = digestOf({ sealedHandoffDigest: sealed.handoff.resealDigest, writer1Projection: projection, githubBaseline: baselineMetadata(baseline) });
  validateVerifiedWriter1PostDispatchControl(control, recoveryContextDigest);
  const recoveryControl = verifiedControlRecovery(control);
  if (!recoveryControl) throw new Error("post-dispatch wake is missing recovery pins");
  const sealedManifest = readSealedManifest(root, recoveryControl, process.env.CURSOR_API_KEY || "");
  const prior = postDispatchPrior(process.env.WRITER1_POST_DISPATCH_ROOT || root, { ...recoveryControl, receiptManifest: sealedManifest }, process.env.WRITER1_POST_DISPATCH_ZIP || path.join(root, "canary/inputs/post-dispatch.zip"), process.env.CURSOR_API_KEY || "");
  await writeJson(jsonFile(root, "canary/runtime/state.json"), { status: "writer1-post-dispatch-retrieval", stage: "writer1", runId: prior.runId, agentId: prior.agentId, threadUrl: prior.threadUrl, requestedModel: prior.requestedModel, resolvedModel: prior.resolvedModel, effort: "high", fast: false, messagesSent: 1, recoveryMessagesSent: 0, writer2Blocked: true, nextStage: null });
  const result = await recoverCursorWriterPostDispatch({
    receiptStore: createJsonCursorReceiptStore(jsonFile(root, "canary/runtime/cursor-receipts.json")),
    prior: prior as any,
    validateOutput: (json) => {
      const output = parseAndValidateWriter1Output(json, projection);
      const diff = validateWriter1CorrectionDiff(baseline.output, output);
      if (diff.length) throw new Error(`post-dispatch Writer1 output changed frozen fields: ${diff.join(", ")}`);
      const banned = validateWriter1CorrectionBannedLanguage(output);
      if (banned.length) throw new Error(`post-dispatch Writer1 output contains banned mutable language at ${banned[0]?.path || "/"}`);
      return output;
    },
  });
  await writeJson(jsonFile(root, "canary/runtime/writer1-recovery-receipt.json"), result.receipt);
  await writeJson(jsonFile(root, "canary/runtime/writer1-validation.json"), { schemaVersion: "verified-writer1-validation/post-dispatch-retrieval/v1", status: "valid-awaiting-architect-qa", stage: "writer1", outputDigest: result.receipt.outputDigest, sourceBranch: VERIFIED_BRANCH, actionRunId: prior.actionRunId, artifactId: prior.artifactId, agentId: prior.agentId, runId: prior.runId, threadUrl: prior.threadUrl, requestedModel: prior.requestedModel, resolvedModel: prior.resolvedModel, effort: prior.effort, fast: false, originalMessagesSent: 1, recoveryMessagesSent: 0, nextStage: null, writer2Blocked: true });
  await writeJson(jsonFile(root, "canary/outputs/writer1-output.json"), result.output);
  await writeJson(jsonFile(root, "canary/runtime/state.json"), { status: "awaiting-architect-qa", stage: "writer1", runId: prior.runId, agentId: prior.agentId, threadUrl: prior.threadUrl, recoveryReceiptPath: "canary/runtime/writer1-recovery-receipt.json", originalMessagesSent: 1, recoveryMessagesSent: 0, messagesSent: 1, nextStage: null, writer2Blocked: true });
  return { status: "awaiting-architect-qa", stage: "writer1", runId: result.receipt.jobId, threadUrl: result.threadUrl };
}

export async function runVerifiedWriter1CorrectionV2(root = process.cwd()): Promise<{ status: string; stage: string; threadUrl?: string; correctionRunId?: string }> {
  const control = readJson(root, ".factory-wake/360-words-control.json");
  if (control.wakeNonce === DORMANT) return { status: "dormant", stage: "writer1" };
  const sealed = validateSealed(root); const projection = writer1Projection(sealed);
  const baseline = verifiedBaseline(root, sealed, projection);
  const inputDigest = digestOf({ sealedHandoffDigest: sealed.handoff.resealDigest, writer1Projection: projection, githubBaseline: baselineMetadata(baseline) });
  validateVerifiedWriter1CorrectionV2Control(control, inputDigest, baseline);
  if (process.env.CURSOR_MODEL !== "cursor-grok-4.6-high" || !process.env.CURSOR_API_KEY || process.env.CURSOR_FAST !== "false") throw new Error("verified production environment requires cursor-grok-4.6-high, CURSOR_API_KEY, and fast=false");
  const recovery = verifiedControlRecovery(control);
  if (!recovery) throw new Error("verified v2 correction recovery is missing");
  const prior: CursorWriterCorrectionPrior = { sourceBranch: VERIFIED_BRANCH, sourceSha: recovery.sourceSha, sealedHandoffDigest: sealed.handoff.resealDigest, inputDigest, agentId: VERIFIED_WRITER1_AGENT_ID, threadUrl: VERIFIED_WRITER1_THREAD_URL };
  await writeJson(jsonFile(root, "canary/runtime/state.json"), { status: "writer1-correction-v2-dispatching", stage: "writer1", correctionVersion: VERIFIED_WRITER1_CORRECTION_V2, runId: sealed.handoff.runId, sourceBranch: VERIFIED_BRANCH, sourceSha: prior.sourceSha, sealedHandoffDigest: prior.sealedHandoffDigest, githubBaseline: baselineMetadata(baseline), agentId: prior.agentId, threadUrl: prior.threadUrl, nextStage: null, writer2Blocked: true, messagesSent: 0 });
  const result = await recoverCursorWriterCorrectionV2({
    receiptStore: createJsonCursorReceiptStore(jsonFile(root, "canary/runtime/cursor-receipts.json")), prior, prompt: VERIFIED_WRITER1_PROMPT_V2, correctionVersion: VERIFIED_WRITER1_CORRECTION_V2, baseline,
    onDispatch: async (notice) => { await writeJson(jsonFile(root, "canary/runtime/writer1-dispatch-receipt.json"), { schemaVersion: "verified-writer-dispatch/v2", stage: notice.stage, provider: notice.provider, agentId: notice.agentId, runId: notice.jobId, threadUrl: notice.threadUrl, requestedModel: notice.requestedModel, resolvedModel: notice.officialModel, modelParams: notice.modelParams, effort: notice.effort, fast: notice.fast, inputDigest: notice.inputDigest, promptDigest: notice.promptDigest, requestDigest: notice.requestDigest, dispatchedAt: notice.dispatchedAt, githubBaseline: baselineMetadata(baseline) }); },
    validateBeforeOutput: (raw) => parseAndValidateWriter1Output(raw, projection),
    validateOutput: (output) => parseAndValidateWriter1Output(String(output), projection),
  });
  validateCursorWriterCorrectionReceipt(result.receipt, prior, VERIFIED_WRITER1_PROMPT_V2_DIGEST, process.env.CURSOR_API_KEY, { ...baselineMetadata(baseline), outputDigest: baseline.outputDigest } as any);
  const output = parseAndValidateWriter1Output(String(result.output), projection);
  await writeJson(jsonFile(root, "canary/runtime/writer1-recovery-receipt.json"), result.receipt);
  await writeJson(jsonFile(root, "canary/runtime/writer1-validation.json"), { schemaVersion: "verified-writer1-validation/v2", status: "valid-awaiting-architect-qa", stage: "writer1", outputDigest: result.receipt.outputDigest, sourceBranch: VERIFIED_BRANCH, sourceSha: prior.sourceSha, sealedHandoffDigest: prior.sealedHandoffDigest, githubBaseline: baselineMetadata(baseline), baselineAuthorship: "unverified-github-before-copy", agentId: result.receipt.agentId, runId: result.receipt.jobId, threadUrl: result.threadUrl, requestedModel: result.receipt.requestedModel, resolvedModel: result.receipt.resolvedModel, effort: result.receipt.effort, fast: result.receipt.fast, beforeArtifact: result.receipt.beforeArtifact, afterArtifact: result.receipt.afterArtifact, frozenDigest: result.receipt.frozenDigest, nextStage: null, writer2Blocked: true, messagesSent: 1 });
  await writeJson(jsonFile(root, "canary/outputs/writer1-output.json"), output);
  await writeJson(jsonFile(root, "canary/runtime/state.json"), { status: "awaiting-architect-qa", stage: "writer1", correctionVersion: VERIFIED_WRITER1_CORRECTION_V2, runId: sealed.handoff.runId, sourceBranch: VERIFIED_BRANCH, sourceSha: prior.sourceSha, sealedHandoffDigest: prior.sealedHandoffDigest, githubBaseline: baselineMetadata(baseline), agentId: result.receipt.agentId, threadUrl: result.threadUrl, correctionRunId: result.receipt.jobId, receiptPath: "canary/runtime/writer1-recovery-receipt.json", nextStage: null, writer2Blocked: true, messagesSent: 1 });
  return { status: "awaiting-architect-qa", stage: "writer1", threadUrl: result.threadUrl, correctionRunId: result.receipt.jobId };
}

export async function runVerifiedWriter1CorrectionV3(root = process.cwd()): Promise<{ status: string; stage: string; threadUrl?: string; correctionRunId?: string }> {
  const control = readJson(root, ".factory-wake/360-words-control.json");
  if (control.wakeNonce === DORMANT) return { status: "dormant", stage: "writer1" };
  const sealed = validateSealed(root); const projection = writer1Projection(sealed);
  const inputDigest = digestWriter1QuarantineCorrectionV3Input(sealed.handoff.resealDigest);
  validateVerifiedWriter1CorrectionV3Control(control, inputDigest);
  if (process.env.CURSOR_MODEL !== "cursor-grok-4.6-high" || !process.env.CURSOR_API_KEY || process.env.CURSOR_FAST !== "false") throw new Error("verified production environment requires cursor-grok-4.6-high, CURSOR_API_KEY, and fast=false");
  const recovery = verifiedControlRecovery(control); if (!recovery) throw new Error("verified v3 correction recovery is missing");
  const source = readVerifiedWriter1CorrectionV3Source(root, projection);
  const prior: CursorWriterCorrectionPrior = { sourceBranch: VERIFIED_BRANCH, sourceSha: recovery.sourceSha, sealedHandoffDigest: sealed.handoff.resealDigest, inputDigest, agentId: VERIFIED_WRITER1_AGENT_ID, threadUrl: VERIFIED_WRITER1_THREAD_URL };
  await writeJson(jsonFile(root, "canary/runtime/state.json"), { status: "writer1-correction-v3-dispatching", stage: "writer1", correctionVersion: VERIFIED_WRITER1_CORRECTION_V3, runId: sealed.handoff.runId, sourceBranch: VERIFIED_BRANCH, sourceSha: prior.sourceSha, sealedHandoffDigest: prior.sealedHandoffDigest, sourceArtifact: { ...source, raw: undefined, bytes: undefined, output: undefined }, agentId: prior.agentId, threadUrl: prior.threadUrl, targetPath: "/pages/0/sections/3/body", nextStage: null, writer2Blocked: true, messagesSent: 0 });
  const result = await recoverCursorWriterCorrectionV3({
    receiptStore: createJsonCursorReceiptStore(jsonFile(root, "canary/runtime/cursor-receipts.json")), prior, prompt: VERIFIED_WRITER1_PROMPT_V3, correctionVersion: VERIFIED_WRITER1_CORRECTION_V3, sourceArtifact: source, expectedChangedPaths: ["/pages/0/sections/3/body"],
    onDispatch: async (notice) => { await writeJson(jsonFile(root, "canary/runtime/writer1-dispatch-receipt.json"), { schemaVersion: "verified-writer-dispatch/v3", stage: notice.stage, provider: notice.provider, agentId: notice.agentId, runId: notice.jobId, threadUrl: notice.threadUrl, requestedModel: notice.requestedModel, resolvedModel: notice.officialModel, modelParams: notice.modelParams, effort: notice.effort, fast: notice.fast, inputDigest: notice.inputDigest, promptDigest: notice.promptDigest, requestDigest: notice.requestDigest, dispatchedAt: notice.dispatchedAt, sourceArtifact: { ...source, raw: undefined, bytes: undefined, output: undefined } }); },
    validateBeforeOutput: (raw) => parseAndValidateWriter1Output(raw, projection),
    validateOutput: (output) => {
      const parsed = parseAndValidateWriter1Output(JSON.stringify(output), projection);
      if (validateWriter1CorrectionDiff(source.output, parsed).some((item) => item !== "/pages/0/sections/3/body")) throw new Error("verified v3 correction changed a frozen path");
      const expectedBody = writer1CorrectionV3ExpectedBody(source.output); const pages = (parsed as Dict).pages; const page = Array.isArray(pages) ? pages[0] as Dict : undefined; const sections = page && Array.isArray(page.sections) ? page.sections : undefined; const body = sections && sections[3] && typeof sections[3].body === "string" ? sections[3].body : undefined;
      if (body !== expectedBody) throw new Error("verified v3 correction is not the exact deletion-derived body");
      return parsed;
    },
  });
  validateCursorWriterCorrectionReceipt(result.receipt, prior, VERIFIED_WRITER1_PROMPT_V3_DIGEST, process.env.CURSOR_API_KEY, undefined, result.receipt.correctionV3Source, ["/pages/0/sections/3/body"]);
  const output = parseAndValidateWriter1Output(JSON.stringify(result.output), projection);
  await writeJson(jsonFile(root, "canary/runtime/writer1-correction-v3-receipt.json"), result.receipt);
  await writeJson(jsonFile(root, "canary/runtime/writer1-validation.json"), { schemaVersion: "verified-writer1-validation/v3", status: "valid-awaiting-architect-qa", stage: "writer1", correctionVersion: VERIFIED_WRITER1_CORRECTION_V3, outputDigest: result.receipt.outputDigest, expectedBodyDigest: writer1CorrectionV3ExpectedBodyDigest(result.receipt.beforeOutput), sourceBranch: VERIFIED_BRANCH, sourceSha: prior.sourceSha, sealedHandoffDigest: prior.sealedHandoffDigest, sourceArtifact: result.receipt.correctionV3Source, beforeOutputDigest: result.receipt.beforeOutputDigest, afterOutputDigest: result.receipt.afterOutputDigest, frozenDigest: result.receipt.frozenDigest, changedPaths: result.receipt.changedPaths, agentId: result.receipt.agentId, runId: result.receipt.jobId, threadUrl: result.threadUrl, requestedModel: result.receipt.requestedModel, resolvedModel: result.receipt.resolvedModel, effort: result.receipt.effort, fast: result.receipt.fast, nextStage: null, writer2Blocked: true, messagesSent: 1 });
  await writeJson(jsonFile(root, "canary/outputs/writer1-output.json"), output);
  await writeJson(jsonFile(root, "canary/runtime/state.json"), { status: "awaiting-architect-qa", stage: "writer1", correctionVersion: VERIFIED_WRITER1_CORRECTION_V3, runId: sealed.handoff.runId, sourceBranch: VERIFIED_BRANCH, sourceSha: prior.sourceSha, sealedHandoffDigest: prior.sealedHandoffDigest, sourceArtifact: result.receipt.correctionV3Source, agentId: result.receipt.agentId, threadUrl: result.threadUrl, correctionRunId: result.receipt.jobId, receiptPath: "canary/runtime/writer1-correction-v3-receipt.json", targetPath: "/pages/0/sections/3/body", changedPaths: result.receipt.changedPaths, nextStage: null, writer2Blocked: true, messagesSent: 1 });
  return { status: "awaiting-architect-qa", stage: "writer1", threadUrl: result.threadUrl, correctionRunId: result.receipt.jobId };
}

export async function runVerifiedWriter1Correction(root = process.cwd()): Promise<{ status: string; stage: string; threadUrl?: string; correctionRunId?: string }> {
  const control = readJson(root, ".factory-wake/360-words-control.json");
  if (control.wakeNonce !== DORMANT && verifiedControlRecovery(control)?.correctionVersion === VERIFIED_WRITER1_CORRECTION_V3) return runVerifiedWriter1CorrectionV3(root);
  if (control.wakeNonce !== DORMANT && verifiedControlRecovery(control)?.correctionVersion === VERIFIED_WRITER1_CORRECTION_V2) return runVerifiedWriter1CorrectionV2(root);
  const sealed = validateSealed(root); const projection = writer1Projection(sealed); const inputDigest = digestOf(projection);
  validateVerifiedWriter1Control(control, inputDigest);
  if (control.wakeNonce === DORMANT) return { status: "dormant", stage: "writer1" };
  if (process.env.CURSOR_MODEL !== "cursor-grok-4.6-high" || !process.env.CURSOR_API_KEY || process.env.CURSOR_FAST !== "false") throw new Error("verified production environment requires cursor-grok-4.6-high, CURSOR_API_KEY, and fast=false");
  const recovery = verifiedControlRecovery(control);
  if (!recovery) throw new Error("verified correction recovery is missing");
  const prior: CursorWriterCorrectionPrior = { sourceBranch: VERIFIED_BRANCH, sourceSha: recovery.sourceSha, sealedHandoffDigest: sealed.handoff.resealDigest, inputDigest, agentId: VERIFIED_WRITER1_AGENT_ID, threadUrl: VERIFIED_WRITER1_THREAD_URL };
  await writeJson(jsonFile(root, "canary/runtime/state.json"), { status: "writer1-correction-dispatching", stage: "writer1", correctionVersion: VERIFIED_WRITER1_CORRECTION_VERSION, runId: sealed.handoff.runId, sourceBranch: VERIFIED_BRANCH, sourceSha: prior.sourceSha, sealedHandoffDigest: prior.sealedHandoffDigest, agentId: prior.agentId, threadUrl: prior.threadUrl, nextStage: null, writer2Blocked: true, messagesSent: 0 });
  const result = await recoverCursorWriterCorrection({
    receiptStore: createJsonCursorReceiptStore(jsonFile(root, "canary/runtime/cursor-receipts.json")),
    prior,
    prompt: VERIFIED_WRITER1_PROMPT,
    onDispatch: async (notice) => {
      await writeJson(jsonFile(root, "canary/runtime/writer1-dispatch-receipt.json"), { schemaVersion: "verified-writer-dispatch/v1", stage: notice.stage, provider: notice.provider, agentId: notice.agentId, runId: notice.jobId, threadUrl: notice.threadUrl, requestedModel: notice.requestedModel, resolvedModel: notice.officialModel, modelParams: notice.modelParams, effort: notice.effort, fast: notice.fast, inputDigest: notice.inputDigest, promptDigest: notice.promptDigest, requestDigest: notice.requestDigest, dispatchedAt: notice.dispatchedAt });
    },
    validateBeforeOutput: (raw) => parseAndValidateWriter1Output(raw, projection),
    validateOutput: (output) => parseAndValidateWriter1Output(output, projection),
  });
  validateCursorWriterCorrectionReceipt(result.receipt, prior, VERIFIED_WRITER1_PROMPT_DIGEST, process.env.CURSOR_API_KEY);
  const output = parseAndValidateWriter1Output(result.output, projection);
  await writeJson(jsonFile(root, "canary/runtime/writer1-recovery-receipt.json"), result.receipt);
  await writeJson(jsonFile(root, "canary/runtime/writer1-validation.json"), { schemaVersion: "verified-writer1-validation/v1", status: "valid-awaiting-architect-qa", stage: "writer1", outputDigest: result.receipt.outputDigest, renderedWordsDigest: writer1RenderedWordsDigest(output), sourceBranch: VERIFIED_BRANCH, sourceSha: prior.sourceSha, sealedHandoffDigest: prior.sealedHandoffDigest, agentId: result.receipt.agentId, runId: result.receipt.jobId, threadUrl: result.threadUrl, requestedModel: result.receipt.requestedModel, resolvedModel: result.receipt.resolvedModel, effort: result.receipt.effort, fast: result.receipt.fast, beforeArtifact: result.receipt.beforeArtifact, afterArtifact: result.receipt.afterArtifact, frozenDigest: result.receipt.frozenDigest, nextStage: null, writer2Blocked: true, messagesSent: 1 });
  await writeJson(jsonFile(root, "canary/outputs/writer1-output.json"), output);
  await writeJson(jsonFile(root, "canary/runtime/state.json"), { status: "awaiting-architect-qa", stage: "writer1", correctionVersion: VERIFIED_WRITER1_CORRECTION_VERSION, runId: sealed.handoff.runId, sourceBranch: VERIFIED_BRANCH, sourceSha: prior.sourceSha, sealedHandoffDigest: prior.sealedHandoffDigest, agentId: result.receipt.agentId, threadUrl: result.threadUrl, correctionRunId: result.receipt.jobId, receiptPath: "canary/runtime/writer1-recovery-receipt.json", nextStage: null, writer2Blocked: true, messagesSent: 1 });
  return { status: "awaiting-architect-qa", stage: "writer1", threadUrl: result.threadUrl, correctionRunId: result.receipt.jobId };
}

/** Later-stage production entry point. It consumes only a signed external Writer1 QA approval and Cursor's Writer1 receipt. */
export async function runVerifiedWriter2(root = process.cwd()): Promise<{ status: string; stage: string; threadUrl: string; runId: string }> {
  const sealed = readJson(root, "canary/sealed/360-four-page-reseal-handoff.json");
  const receipt = readJson(root, "canary/runtime/writer1-recovery-receipt.json");
  const approval = readJson(root, "canary/runtime/architect-writer1-approval.json");
  const result = await runVerifiedWriter2Production({ runId: `${sealed.handoff.runId}:writer2`, sealedHandoffDigest: String(sealed.resealDigest), writer1Receipt: receipt, writer1Approval: approval });
  await writeJson(jsonFile(root, "canary/runtime/verified-writer2-receipt.json"), result.receipt);
  await writeJson(jsonFile(root, "canary/outputs/verified-writer2.json"), result.output);
  return { status: "awaiting-writer2-qa", stage: "writer2", threadUrl: result.threadUrl, runId: result.receipt.jobId };
}

/** Later-stage production entry point. It consumes only a signed external Writer2 QA approval and Cursor's Writer2 receipt. */
export async function runVerifiedWriter3(root = process.cwd()): Promise<{ status: string; stage: string; threadUrl: string; runId: string }> {
  const sealed = readJson(root, "canary/sealed/360-four-page-reseal-handoff.json");
  const receipt = readJson(root, "canary/runtime/verified-writer2-receipt.json");
  const approval = readJson(root, "canary/runtime/architect-writer2-approval.json");
  const result = await runVerifiedWriter3Production({ runId: `${sealed.handoff.runId}:writer3`, sealedHandoffDigest: String(sealed.resealDigest), writer2Receipt: receipt, writer2Approval: approval });
  await writeJson(jsonFile(root, "canary/runtime/verified-writer3-receipt.json"), result.receipt);
  await writeJson(jsonFile(root, "canary/outputs/verified-writer3.json"), result.output);
  return { status: "awaiting-writer3-qa", stage: "writer3", threadUrl: result.threadUrl, runId: result.receipt.jobId };
}

export function assertVerifiedReceiptMetadata(receipt: Dict): void {
  if (receipt.agentId !== VERIFIED_WRITER1_AGENT_ID || receipt.threadUrl !== VERIFIED_WRITER1_THREAD_URL || receipt.requestedModel !== "cursor-grok-4.6-high" || receipt.resolvedModel !== "grok-4.6" || receipt.effort !== "high" || receipt.fast !== false || !isDigest(receipt.inputDigest) || !isDigest(receipt.promptDigest) || !isDigest(receipt.outputDigest) || !receipt.integrityMac) throw new Error("verified stage requires direct Cursor receipt metadata and HMAC");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const operation = process.argv.includes("--writer2") ? runVerifiedWriter2() : process.argv.includes("--writer3") ? runVerifiedWriter3() : process.argv.includes("--writer1-seal-only") ? runVerifiedWriter1PostDispatchSealOnly() : process.argv.includes("--writer1-retrieval-only") ? runVerifiedWriter1PostDispatchRecovery() : process.argv.includes("--writer1-correction-v3") ? runVerifiedWriter1CorrectionV3() : process.argv.includes("--writer1-correction-v2") ? runVerifiedWriter1CorrectionV2() : runVerifiedWriter1Correction();
  operation.then((result) => console.log(JSON.stringify(result))).catch(async (error) => {
    const code = error && typeof error === "object" && typeof (error as Dict).code === "string" ? (error as Dict).code : "VERIFIED_WRITER1_CORRECTION_FAILED";
    let dispatch: Dict | undefined;
    try { dispatch = readJson(process.cwd(), "canary/runtime/writer1-dispatch-receipt.json"); } catch { dispatch = undefined; }
    const retrievalOnly = process.argv.includes("--writer1-retrieval-only");
    const priorRoot = process.env.WRITER1_POST_DISPATCH_ROOT;
    if (!dispatch && retrievalOnly && priorRoot) { try { dispatch = readPriorDispatch(priorRoot).dispatch; } catch { dispatch = undefined; } }
    const messagesSent = dispatch?.runId ? 1 : 0;
    const quarantined = retrievalOnly && error instanceof CursorPostDispatchOutputValidationError;
    let quarantine: { outputPath: string; receiptPath: string; rawDigest: string } | undefined;
    if (quarantined && error instanceof CursorPostDispatchOutputValidationError) {
      quarantine = await quarantineWriter1PostDispatchOutput(process.cwd(), { rawResult: error.rawResult, parsedJson: error.outputJson, format: error.format, reason: error.validationReason, validationCode: error.validationCode });
    }
    await persistVerifiedWriterFailureSurface(process.cwd(), { errorCode: code, retrievalOnly, quarantined, messagesSent, dispatch, quarantine });
    console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1;
  });
}
