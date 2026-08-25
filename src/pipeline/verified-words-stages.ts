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
  validateSignedArchitectStageApproval,
} from "./verified-words-policy.js";

type Dict = Record<string, any>;
const VERIFIED_RECEIPT_STORE = "canary/runtime/verified-cursor-receipts.json";
const WRITER2_PROMPT = "Verified Writer2 stage. After an independently signed Architect Writer1 approval, write only the Home page at /, Contact at /contact, and the shared header/footer. Use the sealed Writer1 output as input. Return complete words-writer2-output/v1 JSON only. Do not write service pages, Strategy Overview, QA, or approval artifacts.";
const WRITER3_PROMPT = "Verified Writer3 stage. After an independently signed Architect Writer2 approval, write only the internal Strategy Overview at root /. Return complete words-writer3-output/v1 JSON only. Include the immutable sealed facts exactly: retrievedWrittenReviewCount 47, reviewRetrievalDate 2026-08-23, reviewBackedServicesWithoutPages 2, reviewBackedServiceNames Garage door repair and Garage door installation. Do not write Home, Contact, service pages, header/footer, public navigation, or QA artifacts.";

export const VERIFIED_WRITER2_PROMPT_DIGEST = digestOf(WRITER2_PROMPT);
export const VERIFIED_WRITER3_PROMPT_DIGEST = digestOf(WRITER3_PROMPT);
export const VERIFIED_WRITER2_RECEIPT_STORE = VERIFIED_RECEIPT_STORE;

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
  return createCursorWriterExecutor({ receiptStore: createJsonCursorReceiptStore(VERIFIED_RECEIPT_STORE) });
}

export interface VerifiedWriter2ProductionInput { runId: string; sealedHandoffDigest: string; writer1Receipt: unknown; writer1Approval: unknown; }
export interface VerifiedWriter3ProductionInput { runId: string; sealedHandoffDigest: string; writer2Receipt: unknown; writer2Approval: unknown; }

async function runWriter2WithExecutor(input: VerifiedWriter2ProductionInput, executor: CursorWriterExecutor): Promise<{ output: Dict; receipt: CursorWriterReceipt; threadUrl: string }> {
  assertPriorReceipt(input.writer1Receipt, "writer1");
  assertSealedDigest(input.sealedHandoffDigest);
  validateSignedArchitectStageApproval(input.writer1Approval, "writer1", input.writer1Receipt, process.env.CURSOR_API_KEY || "", input.sealedHandoffDigest);
  const prior = input.writer1Receipt as CursorWriterReceipt;
  const payload = { schemaVersion: "verified-writer2-input/v1", stage: "writer2", sealedHandoffDigest: input.sealedHandoffDigest, writer1Output: prior.output, writer1OutputDigest: prior.outputDigest, allowedRoutes: VERIFIED_WRITER2_ROUTES, allowedFields: ["homepage", "contact", "header", "footer"], writer1ApprovalDigest: digestOf(input.writer1Approval) };
  const result = await executor.dispatch("writer2", payload, WRITER2_PROMPT, input.runId);
  validateCursorWriterReceipt(result.receipt, process.env.CURSOR_API_KEY);
  assertNewAgent(result.receipt, prior); validateVerifiedWriter2Output(result.output);
  return { output: result.output, receipt: result.receipt, threadUrl: result.threadUrl };
}

async function runWriter3WithExecutor(input: VerifiedWriter3ProductionInput, executor: CursorWriterExecutor): Promise<{ output: Dict; receipt: CursorWriterReceipt; threadUrl: string }> {
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
  assertProductionEnvironment(); return runWriter3WithExecutor(input, productionExecutor());
}

export async function runVerifiedWriter2ForTest(input: VerifiedWriter2ProductionInput, executor: CursorWriterExecutor): Promise<{ output: Dict; receipt: CursorWriterReceipt; threadUrl: string }> {
  if (!process.execArgv.some((arg) => arg.includes("--test"))) throw new Error("Verified downstream test seam is test-only");
  return runWriter2WithExecutor(input, executor);
}
export async function runVerifiedWriter3ForTest(input: VerifiedWriter3ProductionInput, executor: CursorWriterExecutor): Promise<{ output: Dict; receipt: CursorWriterReceipt; threadUrl: string }> {
  if (!process.execArgv.some((arg) => arg.includes("--test"))) throw new Error("Verified downstream test seam is test-only");
  return runWriter3WithExecutor(input, executor);
}
