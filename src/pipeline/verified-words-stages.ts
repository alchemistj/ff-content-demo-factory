import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  createCursorWriterExecutor,
  createJsonCursorReceiptStore,
  validateCursorWriterReceipt,
  validateCursorWriterRuntime,
  type CursorWriterExecutor,
  type CursorWriterReceipt,
} from "./cursor-writer.js";
import { digestOf } from "../contracts/digests.js";
import {
  VERIFIED_PUBLIC_ROUTES,
  VERIFIED_WRITER2_ROUTES,
  VERIFIED_WRITER3_SEALED_FACTS,
  validateArchitectWriter1ApprovalEnvelope,
  validateSignedArchitectStageApproval,
} from "./verified-words-policy.js";

type Dict = Record<string, any>;
const VERIFIED_RECEIPT_STORE = "canary/runtime/verified-cursor-receipts.json";
const WRITER2_PROMPT = "Verified Writer2 stage. After an independently signed Architect Writer1 approval, write only the Home page at /, Contact at /contact, and the shared header/footer. Use the sealed Writer1 output as input. Return complete words-writer2-output/v1 JSON only. Do not write service pages, Strategy Overview, QA, or approval artifacts.";
const WRITER3_PROMPT = "Verified Writer3 stage. After an independently signed Architect Writer2 approval, write only the internal Strategy Overview at root /. Return complete words-writer3-output/v1 JSON only. Include the immutable sealed facts exactly: retrievedWrittenReviewCount 47, reviewRetrievalDate 2026-08-23, reviewBackedServicesWithoutPages 2, reviewBackedServiceNames Garage door repair and Garage door installation. Do not write Home, Contact, service pages, header/footer, public navigation, or QA artifacts.";

export const VERIFIED_WRITER2_PROMPT_DIGEST = digestOf(WRITER2_PROMPT);
export const VERIFIED_WRITER3_PROMPT_DIGEST = digestOf(WRITER3_PROMPT);
export const VERIFIED_WRITER2_RECEIPT_STORE = VERIFIED_RECEIPT_STORE;

export const VERIFIED_WRITER1_APPROVED_ARTIFACT = Object.freeze({
  actionRunId: "32845845871",
  artifactId: 9562364448,
  artifactZipDigest: "sha256:147dad95aa6985a3991d7e12212921b18cbbd71a65d2a614f413444aaababade",
  artifactZipSize: 33290,
  outputPath: "outputs/writer1-output.json",
  outputFileDigest: "sha256:0a2d99e3cfc223a84584251272f0137f4f0aea0cd30e192ebd3b2c4103554602",
  outputFileSize: 22186,
  receiptPath: "runtime/writer1-correction-v3-receipt.json",
  receiptDigest: "sha256:39905f7e32859b7388a0fe468ea445fb8a55d2c0fd5bfeea17955fd4e931477a",
  receiptSize: 61202,
  statePath: "runtime/state.json",
  stateDigest: "sha256:2e4dd6a80c0e35708f36a6452a87e64cc9fb8925c07e5e36aa2d687ab072653a",
  stateSize: 1687,
  changedPaths: Object.freeze(["/pages/0/sections/3/body"]),
  beforeOutputDigest: "sha256:9936c7fc80e7af2bb321de519ddf58ac046bc239e3b4ac81cda6cc6bb77a5248",
  afterOutputDigest: "sha256:b6a9f00dfbc8c7e2b8b4485c374fe46691bc0b03126e24331df835de4eabfd22",
  frozenDigest: "sha256:fc501dd09483a82a7842a116d9c9c424448bb454f4ecd08bc6a5950b04c6de58",
});

export type VerifiedWriter1QaArtifact = { role: "content" | "evidence"; path: string; digest: string; decision: "PASS" };

function isSha256(value: unknown): value is string { return typeof value === "string" && /^sha256:[0-9a-f]{64}$/u.test(value); }

/**
 * Writer2 accepts only the Architect seal produced from the audited Cursor
 * artifact.  This is deliberately separate from the generic stage approval:
 * the seal binds the Action ZIP, raw output bytes, correction receipt/state,
 * frozen diff, and two independent QA decisions without embedding a new
 * copywriting decision in the runner.
 */
export function validateVerifiedWriter1Approval(value: unknown, receipt: unknown, cursorApiKey: string, sealedHandoffDigest: string): asserts value is Record<string, unknown> {
  validateSignedArchitectStageApproval(value, "writer1", receipt, cursorApiKey, sealedHandoffDigest);
  const approval = value as Record<string, any>;
  if (approval.schemaVersion === "architect-writer1-approval/v1") validateArchitectWriter1ApprovalEnvelope(approval, sealedHandoffDigest);
  const seal = approval.verifiedWriter1Seal;
  if (!seal || seal.schemaVersion !== "verified-writer1-approval-seal/v1" || seal.actionRunId !== VERIFIED_WRITER1_APPROVED_ARTIFACT.actionRunId || Number(seal.artifactId) !== VERIFIED_WRITER1_APPROVED_ARTIFACT.artifactId || seal.artifactZipDigest !== VERIFIED_WRITER1_APPROVED_ARTIFACT.artifactZipDigest || seal.artifactZipSize !== VERIFIED_WRITER1_APPROVED_ARTIFACT.artifactZipSize || seal.outputPath !== VERIFIED_WRITER1_APPROVED_ARTIFACT.outputPath || seal.outputFileDigest !== VERIFIED_WRITER1_APPROVED_ARTIFACT.outputFileDigest || seal.outputFileSize !== VERIFIED_WRITER1_APPROVED_ARTIFACT.outputFileSize || seal.receiptPath !== VERIFIED_WRITER1_APPROVED_ARTIFACT.receiptPath || seal.receiptDigest !== VERIFIED_WRITER1_APPROVED_ARTIFACT.receiptDigest || seal.receiptSize !== VERIFIED_WRITER1_APPROVED_ARTIFACT.receiptSize || seal.statePath !== VERIFIED_WRITER1_APPROVED_ARTIFACT.statePath || seal.stateDigest !== VERIFIED_WRITER1_APPROVED_ARTIFACT.stateDigest || seal.stateSize !== VERIFIED_WRITER1_APPROVED_ARTIFACT.stateSize || JSON.stringify(seal.changedPaths) !== JSON.stringify(VERIFIED_WRITER1_APPROVED_ARTIFACT.changedPaths) || seal.beforeOutputDigest !== VERIFIED_WRITER1_APPROVED_ARTIFACT.beforeOutputDigest || seal.afterOutputDigest !== VERIFIED_WRITER1_APPROVED_ARTIFACT.afterOutputDigest || seal.frozenDigest !== VERIFIED_WRITER1_APPROVED_ARTIFACT.frozenDigest || seal.crossV3CopyPreservation !== "not-asserted" || seal.writer2Blocked !== true || seal.nextStage !== null) throw new Error("verified Writer1 approval seal is not bound to the exact successful artifact, receipt, frozen diff, or stop state");
  if (!isSha256(seal.outputDigest) || seal.outputDigest !== (receipt as CursorWriterReceipt).outputDigest || seal.receiptDigest !== VERIFIED_WRITER1_APPROVED_ARTIFACT.receiptDigest) throw new Error("verified Writer1 approval seal is not bound to the direct Cursor receipt output");
  const qa = approval.qaArtifacts ?? seal.independentQaArtifacts;
  if (!Array.isArray(qa) || qa.length !== 2 || new Set(qa.map((item) => item?.role)).size !== 2 || qa.some((item) => !item || (item.role !== "content" && item.role !== "evidence") || item.decision !== "PASS" || item.path !== `qa/architect/writer1-${item.role}.json` || !isSha256(item.digest) || !Number.isSafeInteger(item.size) || item.size <= 0)) throw new Error("verified Writer1 approval requires two independently pinned PASS Architect QA artifacts");
}

function record(value: unknown): Dict | null { return value && typeof value === "object" && !Array.isArray(value) ? value as Dict : null; }
function nonEmpty(value: unknown): boolean { return typeof value === "string" && value.trim().length > 0; }
function routeOf(value: unknown): string { const item = record(value); return String(item?.url || item?.route || item?.path || ""); }
function isApprovedWriter2Link(value: string): boolean {
  return VERIFIED_PUBLIC_ROUTES.includes(value as any) || /^(?:tel|mailto):[^\s]+$/iu.test(value);
}
function scanRecursive(value: unknown, pathValue: string, forbiddenKey: (key: string) => boolean, allowedKeys: ReadonlySet<string>, rejectNonPublicRoute = false): string[] {
  const errors: string[] = [];
  if (Array.isArray(value)) value.forEach((child, index) => errors.push(...scanRecursive(child, `${pathValue}/${index}`, forbiddenKey, allowedKeys, rejectNonPublicRoute)));
  else if (record(value)) for (const [key, child] of Object.entries(value as Dict)) {
    if (forbiddenKey(key)) errors.push(`${pathValue}/${key}`);
    else if (!allowedKeys.has(key)) errors.push(`${pathValue}/${key}`);
    if (rejectNonPublicRoute && ["url", "route", "path", "href"].includes(key) && typeof child === "string" && !isApprovedWriter2Link(child)) errors.push(`${pathValue}/${key}`);
    errors.push(...scanRecursive(child, `${pathValue}/${key}`, forbiddenKey, allowedKeys, rejectNonPublicRoute));
  }
  return errors;
}
const WRITER2_ALLOWED_KEYS = new Set(["schemaVersion", "homepage", "contact", "header", "footer", "url", "route", "path", "href", "body", "content", "sections", "heading", "id", "label", "text", "title", "seoTitle", "metaDescription", "h1", "navigation", "links", "items", "actions", "buttons", "cta", "brand", "logo", "phone", "email", "address", "name", "value", "target", "external", "ariaLabel", "type", "contentBlocks", "blocks", "children", "icon", "className"]);
const WRITER2_REVIEW_ANALYSIS_KEY = /^(?:reviewanalysisfacts?|reviewanalysisdata|reviewfacts?|reviewinventory|reviewevidence|reviewplacements?|quoteplacements?|evidenceledger|reviewintelligence|sealedreviewfacts?|strategy(?:overview|data)?|prescription|analysis|servicepages?|pages?|writer3|humangate2|qa|approval|receipt)$/iu;
const WRITER3_ALLOWED_KEYS = new Set(["internal", "body", "content", "text", "sections", "heading", "id", "label", "value", "notes", "references", "audience", "tone", "angle", "objective", "priorities", "constraints", "outline", "bullets", "items", "name", "type", "title", "summary", "context", "sources", "schemaVersion"]);
const WRITER3_PUBLIC_SCOPE_KEY = /^(?:url|route|path|href|publicroutes?|publicpages?|page(?:s|metadata|type|id|route)?|prescriptionid|primarykeyword|seotitle|metadescription|h1|header|footer|navigation|nav|contact|homepage|home|service(?:page|pages)?|cta)$/iu;

export function validateVerifiedWriter2Output(value: unknown): asserts value is Dict {
  const root = record(value); if (!root || root.schemaVersion !== "words-writer2-output/v1") throw new Error("Verified Writer2 output schema is invalid");
  const keys = Object.keys(root).sort(); if (JSON.stringify(keys) !== JSON.stringify(["contact", "footer", "header", "homepage", "schemaVersion"])) throw new Error("Verified Writer2 output must contain only Home, Contact, header, and footer");
  if (!record(root.homepage) || routeOf(root.homepage) !== "/" || !record(root.contact) || routeOf(root.contact) !== "/contact" || !record(root.header) || !record(root.footer)) throw new Error("Verified Writer2 output has an invalid Home, Contact, header, or footer scope");
  if (![root.homepage, root.contact].every((page) => nonEmpty(page.body || page.content) || (Array.isArray(page.sections) && page.sections.length > 0))) throw new Error("Verified Writer2 Home and Contact must contain copy");
  const forbidden = scanRecursive(root, "", (key) => WRITER2_REVIEW_ANALYSIS_KEY.test(key), WRITER2_ALLOWED_KEYS, true); if (forbidden.length) throw new Error(`Verified Writer2 output leaks review-analysis scope, an unapproved route, or an unallowlisted key at ${forbidden[0]}`);
}

export function validateVerifiedWriter3Output(value: unknown): asserts value is Dict {
  const root = record(value); if (!root || root.schemaVersion !== "words-writer3-output/v1") throw new Error("Verified Writer3 output schema is invalid");
  const keys = Object.keys(root).sort(); if (JSON.stringify(keys) !== JSON.stringify(["reviewAnalysisFacts", "schemaVersion", "strategyOverview"])) throw new Error("Verified Writer3 output must contain only Strategy Overview and sealed facts");
  const strategy = record(root.strategyOverview); if (!strategy || strategy.internal !== true || !nonEmpty(strategy.body || strategy.content || strategy.text)) throw new Error("Verified Writer3 Strategy Overview must be internal and contain copy");
  if (JSON.stringify(root.reviewAnalysisFacts) !== JSON.stringify(VERIFIED_WRITER3_SEALED_FACTS)) throw new Error("Verified Writer3 review facts are not the exact sealed immutable values");
  const publicLeak = scanRecursive(strategy, "/strategyOverview", (key) => WRITER3_PUBLIC_SCOPE_KEY.test(key), WRITER3_ALLOWED_KEYS, true); if (publicLeak.length) throw new Error(`Verified Writer3 output leaks public scope or an unallowlisted key at ${publicLeak[0]}`);
}

function assertProductionEnvironment(): void {
  if (!process.env.CURSOR_API_KEY || process.env.CURSOR_MODEL !== "cursor-grok-4.6-high" || process.env.CURSOR_FAST !== "false") throw new Error("Verified downstream production requires Cursor Grok 4.6 high with fast=false");
  validateCursorWriterRuntime({ provider: "cursor-sdk", requestedModel: process.env.CURSOR_MODEL, fast: false });
}
function assertPriorReceipt(receipt: unknown, stage: "writer1" | "writer2"): asserts receipt is CursorWriterReceipt {
  validateCursorWriterReceipt(receipt, process.env.CURSOR_API_KEY);
  const value = receipt as CursorWriterReceipt;
  if (value.stage !== stage || !value.threadUrl || !value.agentId || !value.outputDigest) throw new Error(`Verified ${stage} receipt is incomplete`);
  if (stage === "writer1" && ((value.mode !== "same-thread-correction" && !(value.mode === "same-thread-retrieval" && (value as any).correctionVersion === "words-writer1-post-dispatch-retrieval/v1")) || (value as any).writer2Blocked !== true)) throw new Error("Verified Writer2 requires a stopped, independently reviewable Writer1 receipt");
}
function assertSealedDigest(value: unknown): asserts value is string { if (typeof value !== "string" || !/^sha256:[0-9a-f]{64}$/u.test(value)) throw new Error("Verified downstream stage requires an exact sealed handoff digest"); }
function assertNewAgent(receipt: CursorWriterReceipt, prior: CursorWriterReceipt): void {
  if (receipt.agentId === prior.agentId || receipt.threadUrl === prior.threadUrl) throw new Error("Verified downstream stage must use a new Cursor agent/thread");
}
function productionExecutor(): CursorWriterExecutor {
  return createCursorWriterExecutor({
    receiptStore: createJsonCursorReceiptStore(VERIFIED_RECEIPT_STORE),
    onDispatch: async (notice) => {
      if (notice.stage !== "writer2") return;
      const file = path.resolve("canary/runtime/verified-writer2-dispatch.json");
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, `${JSON.stringify({ schemaVersion: "verified-writer2-dispatch/v1", stage: notice.stage, agentId: notice.agentId, runId: notice.jobId, threadUrl: notice.threadUrl, requestedModel: notice.requestedModel, resolvedModel: notice.officialModel, effort: notice.effort, fast: notice.fast, inputDigest: notice.inputDigest, promptDigest: notice.promptDigest, requestDigest: notice.requestDigest, dispatchedAt: notice.dispatchedAt, writer3Blocked: true, nextStage: null }, null, 2)}\n`, "utf8");
    },
  });
}

export interface VerifiedWriter2ProductionInput { runId: string; sealedHandoffDigest: string; writer1Receipt: unknown; writer1Approval: unknown; }
export interface VerifiedWriter3ProductionInput { runId: string; sealedHandoffDigest: string; writer2Receipt: unknown; writer2Approval: unknown; writer2State?: unknown; }

export function validateVerifiedWriter2ReleaseState(value: unknown): asserts value is Dict {
  const state = record(value);
  if (!state || state.schemaVersion !== "verified-writer2-state/v1" || state.status !== "awaiting-writer2-architect-qa" || state.stage !== "writer2" || state.writer3Blocked !== true || state.nextStage !== null || state.writer2Blocked !== false || state.messagesSent !== 1 || state.receiptPath !== "canary/runtime/verified-writer2-receipt.json" || state.outputPath !== "canary/outputs/verified-writer2.json") throw new Error("Writer3 release requires the persisted Writer2 blocked state and receipt/output paths");
}

async function runWriter2WithExecutor(input: VerifiedWriter2ProductionInput, executor: CursorWriterExecutor, requireVerifiedSeal = true): Promise<{ output: Dict; receipt: CursorWriterReceipt; threadUrl: string }> {
  assertPriorReceipt(input.writer1Receipt, "writer1");
  assertSealedDigest(input.sealedHandoffDigest);
  if (requireVerifiedSeal) validateVerifiedWriter1Approval(input.writer1Approval, input.writer1Receipt, process.env.CURSOR_API_KEY || "", input.sealedHandoffDigest);
  else validateSignedArchitectStageApproval(input.writer1Approval, "writer1", input.writer1Receipt, process.env.CURSOR_API_KEY || "", input.sealedHandoffDigest);
  const prior = input.writer1Receipt as CursorWriterReceipt;
  const payload = verifiedWriter2Payload(input.sealedHandoffDigest, prior, input.writer1Approval);
  const result = await executor.dispatch("writer2", payload, WRITER2_PROMPT, input.runId);
  validateCursorWriterReceipt(result.receipt, process.env.CURSOR_API_KEY);
  assertNewAgent(result.receipt, prior); validateVerifiedWriter2Output(result.output);
  return { output: result.output, receipt: result.receipt, threadUrl: result.threadUrl };
}

export function verifiedWriter2Payload(sealedHandoffDigest: string, writer1Receipt: CursorWriterReceipt, writer1Approval: unknown): Dict {
  return { schemaVersion: "verified-writer2-input/v1", stage: "writer2", sealedHandoffDigest, writer1Output: writer1Receipt.output, writer1OutputDigest: writer1Receipt.outputDigest, allowedRoutes: VERIFIED_WRITER2_ROUTES, allowedFields: ["homepage", "contact", "header", "footer"], writer1ApprovalDigest: digestOf(writer1Approval) };
}
export function verifiedWriter2InputDigest(sealedHandoffDigest: string, writer1Receipt: CursorWriterReceipt, writer1Approval: unknown): string {
  return digestOf(verifiedWriter2Payload(sealedHandoffDigest, writer1Receipt, writer1Approval));
}

async function runWriter3WithExecutor(input: VerifiedWriter3ProductionInput, executor: CursorWriterExecutor): Promise<{ output: Dict; receipt: CursorWriterReceipt; threadUrl: string }> {
  if (input.writer2State !== undefined) validateVerifiedWriter2ReleaseState(input.writer2State);
  assertPriorReceipt(input.writer2Receipt, "writer2");
  assertSealedDigest(input.sealedHandoffDigest);
  validateSignedArchitectStageApproval(input.writer2Approval, "writer2", input.writer2Receipt, process.env.CURSOR_API_KEY || "", input.sealedHandoffDigest);
  const prior = input.writer2Receipt as CursorWriterReceipt;
  const payload = { schemaVersion: "verified-writer3-input/v1", stage: "writer3", sealedHandoffDigest: input.sealedHandoffDigest, writer2Output: prior.output, writer2OutputDigest: prior.outputDigest, internalRoute: "/", sealedReviewFacts: VERIFIED_WRITER3_SEALED_FACTS, writer2ApprovalDigest: digestOf(input.writer2Approval) };
  const result = await executor.dispatch("writer3", payload, WRITER3_PROMPT, input.runId);
  validateCursorWriterReceipt(result.receipt, process.env.CURSOR_API_KEY);
  assertNewAgent(result.receipt, prior); validateVerifiedWriter3Output(result.output);
  return { output: result.output, receipt: result.receipt, threadUrl: result.threadUrl };
}

/** Production-only verified Writer2 path. It obtains secrets and the official SDK executor internally. */
export async function runVerifiedWriter2Production(input: VerifiedWriter2ProductionInput): Promise<{ output: Dict; receipt: CursorWriterReceipt; threadUrl: string }> {
  assertProductionEnvironment(); return runWriter2WithExecutor(input, productionExecutor());
}
/** Production-only verified Writer3 path. It obtains secrets and the official SDK executor internally. */
export async function runVerifiedWriter3Production(input: VerifiedWriter3ProductionInput): Promise<{ output: Dict; receipt: CursorWriterReceipt; threadUrl: string }> {
  validateVerifiedWriter2ReleaseState(input.writer2State);
  assertProductionEnvironment(); return runWriter3WithExecutor(input, productionExecutor());
}

export async function runVerifiedWriter2ForTest(input: VerifiedWriter2ProductionInput, executor: CursorWriterExecutor): Promise<{ output: Dict; receipt: CursorWriterReceipt; threadUrl: string }> {
  if (!process.execArgv.some((arg) => arg.includes("--test"))) throw new Error("Verified downstream test seam is test-only");
  return runWriter2WithExecutor(input, executor, false);
}
export async function runVerifiedWriter3ForTest(input: VerifiedWriter3ProductionInput, executor: CursorWriterExecutor): Promise<{ output: Dict; receipt: CursorWriterReceipt; threadUrl: string }> {
  if (!process.execArgv.some((arg) => arg.includes("--test"))) throw new Error("Verified downstream test seam is test-only");
  return runWriter3WithExecutor(input, executor);
}
