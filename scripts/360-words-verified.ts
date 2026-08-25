import { readFileSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  createJsonCursorReceiptStore,
  recoverCursorWriterCorrection,
  recoverCursorWriterCorrectionV2,
  validateCursorWriterCorrectionReceipt,
  writer1RenderedWordsDigest,
  type CursorWriterCorrectionPrior,
  type CursorGitHubBaselineInput,
} from "../src/pipeline/cursor-writer.js";
import { digestOf } from "../src/contracts/digests.js";
import { buildWriter1ArtifactRecoveryPrompt, digestWriter1ArtifactRecoveryPrompt, buildWriter1GithubBaselineCorrectionPrompt, digestWriter1GithubBaselineCorrectionPrompt } from "./360-words-recovery-prompt.mjs";
import { verifyGithubWriter1Baseline, VERIFIED_WRITER1_GITHUB_BASELINE } from "./360-words-github-baseline.mjs";
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
export const VERIFIED_WRITER1_ROUTES = ["/garage-door-repair", "/garage-door-installation"] as const;

type Dict = Record<string, any>;
function jsonFile(root: string, relative: string): string { return path.join(root, relative); }
function readJson(root: string, relative: string): Dict { return JSON.parse(readFileSync(jsonFile(root, relative), "utf8")) as Dict; }
function writeJson(file: string, value: unknown): Promise<void> { return fs.mkdir(path.dirname(file), { recursive: true }).then(() => fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8")); }
function isDigest(value: unknown): value is string { return typeof value === "string" && /^sha256:[0-9a-f]{64}$/u.test(value); }

export function validateVerifiedWriter1Control(control: Dict, inputDigest: string): void {
  if (control.schemaVersion !== "words-canary-control/v1" || control.requestedBy !== "architect" || control.stage !== "writer1" || control.restore !== null) throw new Error("verified control envelope is invalid");
  if (control.wakeNonce === DORMANT) return;
  const policy = control.policy; const recovery = policy?.recovery;
  if (policy?.mode !== "writer1-correction" || policy.writer1Only !== true || policy.provider !== "cursor-sdk" || policy.model !== "cursor-grok-4.6-high" || policy.fast !== false || policy.stopAfter !== "awaiting-architect-qa") throw new Error("verified control does not select the bounded Writer1 correction policy");
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{15,127}$/u.test(control.wakeNonce)) throw new Error("verified control requires an owner wake nonce");
  if (recovery?.correctionVersion !== VERIFIED_WRITER1_CORRECTION_VERSION || recovery?.sourceBranch !== VERIFIED_BRANCH || recovery?.agentId !== VERIFIED_WRITER1_AGENT_ID || recovery?.threadUrl !== VERIFIED_WRITER1_THREAD_URL || recovery?.inputDigest !== inputDigest || recovery?.promptDigest !== VERIFIED_WRITER1_PROMPT_DIGEST || recovery?.sourceSha !== control.policy.recovery.sourceSha || !/^[0-9a-f]{40}$/u.test(recovery?.sourceSha || "") || recovery?.allowCreate !== false || recovery?.allowResume !== true || recovery?.allowFollowUp !== true || recovery?.maxFollowUps !== 1 || recovery?.idempotencyKey !== `${VERIFIED_WRITER1_AGENT_ID}:writer1:correction:v1:${inputDigest}:${VERIFIED_WRITER1_PROMPT_DIGEST}` || recovery?.send !== undefined || policy.allowCreate !== undefined || policy.allowResume !== undefined || policy.allowFollowUp !== undefined || policy.send !== undefined) throw new Error("verified Writer1 correction pins are invalid");
  if (JSON.stringify(policy.approvedRoutes) !== JSON.stringify(["/", "/garage-door-repair", "/garage-door-installation", "/contact"])) throw new Error("verified public route set is invalid");
}

function baselineMetadata(value: CursorGitHubBaselineInput): Dict {
  return { kind: value.kind, repository: value.repository, sourceCommit: value.sourceCommit, path: value.path, blobSha: value.blobSha, rawSha256: value.rawSha256, size: value.size, contentSize: value.contentSize, byteDigest: value.byteDigest, sealedHandoffDigest: value.sealedHandoffDigest, authorship: value.authorship };
}
function baselineControlMetadata(value: CursorGitHubBaselineInput): Dict {
  return { kind: value.kind, repository: value.repository, sourceCommit: value.sourceCommit, path: value.path, blobSha: value.blobSha, rawSha256: value.rawSha256, size: value.size, authorship: value.authorship };
}
function verifiedBaseline(root: string, sealed: Dict, projection: Dict): CursorGitHubBaselineInput {
  const metadata = readJson(root, "canary/inputs/github-writer1-baseline/metadata.json");
  const bytes = readFileSync(jsonFile(root, "canary/inputs/github-writer1-baseline/writer1-output.json"));
  const verified = verifyGithubWriter1Baseline({ metadata, bytes, sealed, expected: VERIFIED_WRITER1_BASELINE });
  const output = parseAndValidateWriter1Output(verified.raw, projection);
  return { ...verified, output, outputDigest: digestOf(output) } as CursorGitHubBaselineInput;
}
export function validateVerifiedWriter1CorrectionV2Control(control: Dict, inputDigest: string, baseline: CursorGitHubBaselineInput): void {
  if (control.schemaVersion !== "words-canary-control/v1" || control.requestedBy !== "architect" || control.stage !== "writer1" || control.restore !== null) throw new Error("verified v2 control envelope is invalid");
  if (control.wakeNonce === DORMANT) return;
  const policy = control.policy; const recovery = policy?.recovery;
  const expectedBaseline = baselineControlMetadata(baseline);
  if (policy?.mode !== "writer1-correction" || policy.writer1Only !== true || policy.provider !== "cursor-sdk" || policy.model !== "cursor-grok-4.6-high" || policy.fast !== false || policy.stopAfter !== "awaiting-architect-qa") throw new Error("verified v2 control does not select the bounded Writer1 correction policy");
  if (recovery?.correctionVersion !== VERIFIED_WRITER1_CORRECTION_V2 || recovery?.sourceBranch !== VERIFIED_BRANCH || recovery?.agentId !== VERIFIED_WRITER1_AGENT_ID || recovery?.threadUrl !== VERIFIED_WRITER1_THREAD_URL || recovery?.inputDigest !== inputDigest || recovery?.promptDigest !== VERIFIED_WRITER1_PROMPT_V2_DIGEST || JSON.stringify(recovery?.baseline) !== JSON.stringify(expectedBaseline) || recovery?.allowCreate !== false || recovery?.allowResume !== true || recovery?.allowFollowUp !== true || recovery?.maxFollowUps !== 1 || recovery?.idempotencyKey !== `${VERIFIED_WRITER1_AGENT_ID}:writer1:correction:v2:${inputDigest}:${VERIFIED_WRITER1_PROMPT_V2_DIGEST}`) throw new Error("verified Writer1 correction v2 pins are invalid");
}

export async function runVerifiedWriter1CorrectionV2(root = process.cwd()): Promise<{ status: string; stage: string; threadUrl?: string; correctionRunId?: string }> {
  const control = readJson(root, ".factory-wake/360-words-control.json");
  if (control.wakeNonce === DORMANT) return { status: "dormant", stage: "writer1" };
  const sealed = validateSealed(root); const projection = writer1Projection(sealed);
  const baseline = verifiedBaseline(root, sealed, projection);
  const inputDigest = digestOf({ sealedHandoffDigest: sealed.handoff.resealDigest, writer1Projection: projection, githubBaseline: baselineMetadata(baseline) });
  validateVerifiedWriter1CorrectionV2Control(control, inputDigest, baseline);
  if (process.env.CURSOR_MODEL !== "cursor-grok-4.6-high" || !process.env.CURSOR_API_KEY || process.env.CURSOR_FAST !== "false") throw new Error("verified production environment requires cursor-grok-4.6-high, CURSOR_API_KEY, and fast=false");
  const prior: CursorWriterCorrectionPrior = { sourceBranch: VERIFIED_BRANCH, sourceSha: control.policy.recovery.sourceSha, sealedHandoffDigest: sealed.handoff.resealDigest, inputDigest, agentId: VERIFIED_WRITER1_AGENT_ID, threadUrl: VERIFIED_WRITER1_THREAD_URL };
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

export async function runVerifiedWriter1Correction(root = process.cwd()): Promise<{ status: string; stage: string; threadUrl?: string; correctionRunId?: string }> {
  const control = readJson(root, ".factory-wake/360-words-control.json");
  if (control.wakeNonce !== DORMANT && control.policy?.recovery?.correctionVersion === VERIFIED_WRITER1_CORRECTION_V2) return runVerifiedWriter1CorrectionV2(root);
  const sealed = validateSealed(root); const projection = writer1Projection(sealed); const inputDigest = digestOf(projection);
  validateVerifiedWriter1Control(control, inputDigest);
  if (control.wakeNonce === DORMANT) return { status: "dormant", stage: "writer1" };
  if (process.env.CURSOR_MODEL !== "cursor-grok-4.6-high" || !process.env.CURSOR_API_KEY || process.env.CURSOR_FAST !== "false") throw new Error("verified production environment requires cursor-grok-4.6-high, CURSOR_API_KEY, and fast=false");
  const prior: CursorWriterCorrectionPrior = { sourceBranch: VERIFIED_BRANCH, sourceSha: control.policy.recovery.sourceSha, sealedHandoffDigest: sealed.handoff.resealDigest, inputDigest, agentId: VERIFIED_WRITER1_AGENT_ID, threadUrl: VERIFIED_WRITER1_THREAD_URL };
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
  const operation = process.argv.includes("--writer2") ? runVerifiedWriter2() : process.argv.includes("--writer3") ? runVerifiedWriter3() : process.argv.includes("--writer1-correction-v2") ? runVerifiedWriter1CorrectionV2() : runVerifiedWriter1Correction();
  operation.then((result) => console.log(JSON.stringify(result))).catch(async (error) => {
    const code = error && typeof error === "object" && typeof (error as Dict).code === "string" ? (error as Dict).code : "VERIFIED_WRITER1_CORRECTION_FAILED";
    let dispatch: Dict | undefined;
    try { dispatch = readJson(process.cwd(), "canary/runtime/writer1-dispatch-receipt.json"); } catch { dispatch = undefined; }
    const messagesSent = dispatch?.runId ? 1 : 0;
    await writeJson(path.join(process.cwd(), "canary/runtime/failure.json"), { schemaVersion: "verified-writer-failure/v2", status: "failed", stage: "writer1", errorCode: code, writer2Blocked: true, nextStage: null, messagesSent, ...(dispatch ? { agentId: dispatch.agentId, threadUrl: dispatch.threadUrl, runId: dispatch.runId, promptDigest: dispatch.promptDigest } : {}) });
    await writeJson(path.join(process.cwd(), "canary/runtime/state.json"), { status: "writer1-failed", stage: "writer1", errorCode: code, writer2Blocked: true, nextStage: null, messagesSent, ...(dispatch ? { agentId: dispatch.agentId, threadUrl: dispatch.threadUrl, runId: dispatch.runId } : {}) });
    console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1;
  });
}
