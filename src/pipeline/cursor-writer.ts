import { digestOf } from "../contracts/digests.js";

export const CURSOR_PROVIDER = "cursor-sdk" as const;
export const REQUIRED_CURSOR_MODEL = "cursor-grok-4.6-high" as const;

export type CursorWriterStage = "writer1" | "writer2" | "writer3";

export interface CursorWriterReceipt {
  stage: CursorWriterStage;
  provider: typeof CURSOR_PROVIDER;
  requestedModel: typeof REQUIRED_CURSOR_MODEL;
  resolvedModel: typeof REQUIRED_CURSOR_MODEL;
  fast: false;
  jobId: string;
  agentId: string;
  threadUrl: string;
  inputDigest: string;
  promptDigest: string;
  outputDigest: string;
  completedAt: string;
  status: "complete";
  output?: unknown;
}
export interface CursorWriterPendingReceipt {
  stage: CursorWriterStage;
  provider: typeof CURSOR_PROVIDER;
  requestedModel: typeof REQUIRED_CURSOR_MODEL;
  resolvedModel: typeof REQUIRED_CURSOR_MODEL;
  fast: false;
  jobId: string;
  agentId: string;
  threadUrl: string;
  inputDigest: string;
  promptDigest: string;
  status: "running";
}
export type StoredCursorWriterReceipt = CursorWriterReceipt | CursorWriterPendingReceipt;

export interface CursorWriterReceiptStore {
  get(key: string): StoredCursorWriterReceipt | undefined | Promise<StoredCursorWriterReceipt | undefined>;
  put(key: string, receipt: StoredCursorWriterReceipt): void | Promise<void>;
}

export interface CursorSdkAgent {
  id?: string;
  agentId?: string;
  jobId?: string;
  threadUrl?: string;
  url?: string;
  wait?: () => unknown | Promise<unknown>;
  run?: () => unknown | Promise<unknown>;
  output?: unknown;
  resolvedModel?: unknown;
}

export interface CursorSdkContract {
  Agent: {
    create(input: Record<string, unknown>): CursorSdkAgent | Promise<CursorSdkAgent>;
    get?(id: string): CursorSdkAgent | Promise<CursorSdkAgent>;
  };
}

export interface CursorWriterRuntimeConfig {
  provider: unknown;
  requestedModel: unknown;
  resolvedModel?: unknown;
  fast: unknown;
}

export class CursorWriterExecutionError extends Error {
  readonly code: string;
  readonly details?: unknown;
  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "CursorWriterExecutionError";
    this.code = code;
    this.details = details;
  }
}

export function validateCursorWriterRuntime(config: CursorWriterRuntimeConfig): void {
  if (config.provider !== CURSOR_PROVIDER) throw new CursorWriterExecutionError("CURSOR_PROVIDER_REQUIRED", "Writer stages must execute through the Cursor SDK provider");
  if (config.requestedModel !== REQUIRED_CURSOR_MODEL) throw new CursorWriterExecutionError("CURSOR_MODEL_REQUIRED", `CURSOR_MODEL must be exactly ${REQUIRED_CURSOR_MODEL}`);
  if (config.fast !== false) throw new CursorWriterExecutionError("CURSOR_FAST_MUST_BE_FALSE", "Cursor fast mode must be explicitly false");
  if (config.resolvedModel !== undefined && config.resolvedModel !== REQUIRED_CURSOR_MODEL) throw new CursorWriterExecutionError("CURSOR_RESOLVED_MODEL_MISMATCH", `Cursor resolved model must be exactly ${REQUIRED_CURSOR_MODEL}`);
}

export function validateCursorWriterReceipt(receipt: unknown): asserts receipt is CursorWriterReceipt {
  if (!receipt || typeof receipt !== "object") throw new CursorWriterExecutionError("CURSOR_RECEIPT_INVALID", "Writer completion requires a Cursor receipt");
  const value = receipt as Record<string, unknown>;
  validateCursorWriterRuntime({ provider: value.provider, requestedModel: value.requestedModel, resolvedModel: value.resolvedModel, fast: value.fast });
  if (!["writer1", "writer2", "writer3"].includes(String(value.stage))) throw new CursorWriterExecutionError("CURSOR_RECEIPT_INVALID", "Receipt stage is invalid");
  for (const key of ["jobId", "agentId", "threadUrl", "inputDigest", "promptDigest", "outputDigest", "completedAt"]) {
    if (typeof value[key] !== "string" || !String(value[key]).trim()) throw new CursorWriterExecutionError("CURSOR_RECEIPT_INVALID", `Receipt is missing ${key}`);
  }
  if (value.status !== "complete") throw new CursorWriterExecutionError("CURSOR_RECEIPT_INVALID", "Only completed Cursor receipts may complete a writer stage");
  if (!/^https:\/\/(?:www\.)?cursor\.com\/(?:agent|agents)\//u.test(String(value.threadUrl))) throw new CursorWriterExecutionError("CURSOR_THREAD_URL_INVALID", "Receipt must carry a direct Cursor agent-thread URL");
  if (value.output !== undefined && digestOf(value.output) !== value.outputDigest) throw new CursorWriterExecutionError("CURSOR_RECEIPT_OUTPUT_TAMPERED", "Cursor receipt output no longer matches its output digest");
}
function validatePendingReceipt(receipt: unknown): asserts receipt is CursorWriterPendingReceipt {
  if (!receipt || typeof receipt !== "object") throw new CursorWriterExecutionError("CURSOR_RECEIPT_INVALID", "Pending Cursor receipt is invalid");
  const value = receipt as Record<string, unknown>;
  validateCursorWriterRuntime({ provider: value.provider, requestedModel: value.requestedModel, resolvedModel: value.resolvedModel, fast: value.fast });
  if (value.status !== "running" || !["writer1", "writer2", "writer3"].includes(String(value.stage))) throw new CursorWriterExecutionError("CURSOR_RECEIPT_INVALID", "Pending Cursor receipt is invalid");
  for (const key of ["jobId", "agentId", "threadUrl", "inputDigest", "promptDigest"]) if (typeof value[key] !== "string" || !String(value[key]).trim()) throw new CursorWriterExecutionError("CURSOR_RECEIPT_INVALID", `Pending receipt is missing ${key}`);
  if (!/^https:\/\/(?:www\.)?cursor\.com\/(?:agent|agents)\//u.test(String(value.threadUrl))) throw new CursorWriterExecutionError("CURSOR_THREAD_URL_INVALID", "Pending receipt must carry a direct Cursor agent-thread URL");
}

const EXECUTOR_BRAND = Symbol("ff.cursor.writer.executor");
export interface CursorWriterExecutor {
  readonly provider: typeof CURSOR_PROVIDER;
  dispatch(stage: CursorWriterStage, input: unknown, prompt: string): Promise<{ output: unknown; receipt: CursorWriterReceipt; threadUrl: string }>;
  readonly [EXECUTOR_BRAND]: true;
}

function resultOf(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  return record.output ?? record.result ?? record.copy ?? value;
}

function agentIdOf(agent: CursorSdkAgent): string {
  const value = agent.agentId || agent.id || agent.jobId;
  if (!value || typeof value !== "string") throw new CursorWriterExecutionError("CURSOR_ID_REQUIRED", "Cursor agent/job ID is required");
  return value;
}

function threadUrlOf(agent: CursorSdkAgent, id: string): string {
  const value = agent.threadUrl || agent.url || `https://cursor.com/agent/${id}`;
  if (typeof value !== "string" || !/^https:\/\/(?:www\.)?cursor\.com\/(?:agent|agents)\//u.test(value)) throw new CursorWriterExecutionError("CURSOR_THREAD_URL_INVALID", "Cursor dispatch did not expose a direct agent-thread URL");
  return value;
}

async function finishAgent(agent: CursorSdkAgent): Promise<{ output: unknown; resolvedModel: unknown }> {
  const completed = agent.wait ? await agent.wait() : agent.run ? await agent.run() : agent.output;
  const record = completed && typeof completed === "object" ? completed as Record<string, unknown> : {};
  return { output: resultOf(completed ?? agent.output), resolvedModel: record.resolvedModel ?? agent.resolvedModel };
}

export function createCursorWriterExecutor(input: {
  sdk: CursorSdkContract;
  env?: Record<string, string | undefined>;
  receiptStore: CursorWriterReceiptStore;
  now?: () => Date;
}): CursorWriterExecutor {
  if (!input || !input.sdk || !input.sdk.Agent || typeof input.sdk.Agent.create !== "function") throw new CursorWriterExecutionError("CURSOR_SDK_REQUIRED", "A verified Cursor SDK Agent.create contract is required");
  const env = input.env || process.env;
  const requestedModel = env.CURSOR_MODEL;
  const fast = env.CURSOR_FAST === "false" || env.CURSOR_FAST === "off" ? false : env.CURSOR_FAST;
  validateCursorWriterRuntime({ provider: CURSOR_PROVIDER, requestedModel, fast });
  const now = input.now || (() => new Date());
  const dispatch = async (stage: CursorWriterStage, payload: unknown, prompt: string) => {
    if (typeof prompt !== "string" || !prompt.trim()) throw new CursorWriterExecutionError("CURSOR_PROMPT_REQUIRED", "Writer dispatch requires a non-empty prompt");
    const inputDigest = digestOf(payload);
    const key = `${stage}:${inputDigest}`;
    const existing = await input.receiptStore.get(key);
    let agent: CursorSdkAgent;
    if (existing) {
      if (existing.stage !== stage || existing.inputDigest !== inputDigest || existing.promptDigest !== digestOf(prompt)) throw new CursorWriterExecutionError("CURSOR_RECEIPT_BINDING_MISMATCH", "Existing Cursor receipt is bound to different writer input");
      if (existing.status === "complete") { validateCursorWriterReceipt(existing); return { output: existing.output, receipt: existing, threadUrl: existing.threadUrl }; }
      validatePendingReceipt(existing);
      if (!input.sdk.Agent.get) throw new CursorWriterExecutionError("CURSOR_REATTACH_REQUIRED", "Interrupted Cursor work requires Agent.get reattachment by persisted agent ID");
      agent = await input.sdk.Agent.get(existing.agentId || existing.jobId);
    } else {
      agent = await input.sdk.Agent.create({ provider: CURSOR_PROVIDER, model: REQUIRED_CURSOR_MODEL, fast: false, stage, prompt, inputDigest });
    }
    const id = agentIdOf(agent);
    const threadUrl = threadUrlOf(agent, id);
    const existingResolved = (agent as any).resolvedModel;
    validateCursorWriterRuntime({ provider: CURSOR_PROVIDER, requestedModel, resolvedModel: existingResolved, fast: false });
    if (!existing) {
      await input.receiptStore.put(key, { stage, provider: CURSOR_PROVIDER, requestedModel: REQUIRED_CURSOR_MODEL, resolvedModel: REQUIRED_CURSOR_MODEL, fast: false, jobId: String(agent.jobId || id), agentId: id, threadUrl, inputDigest, promptDigest: digestOf(prompt), status: "running" });
    }
    const result = await finishAgent(agent);
    const resolvedModel = result.resolvedModel || existingResolved;
    validateCursorWriterRuntime({ provider: CURSOR_PROVIDER, requestedModel, resolvedModel, fast: false });
    if (resolvedModel !== REQUIRED_CURSOR_MODEL) throw new CursorWriterExecutionError("CURSOR_RESOLVED_MODEL_MISSING", "Cursor did not provide the required resolved model attestation");
    const output = result.output;
    const receipt: CursorWriterReceipt = {
      stage, provider: CURSOR_PROVIDER, requestedModel: REQUIRED_CURSOR_MODEL, resolvedModel: REQUIRED_CURSOR_MODEL, fast: false,
      jobId: String(agent.jobId || id), agentId: id, threadUrl, inputDigest, promptDigest: digestOf(prompt), outputDigest: digestOf(output), completedAt: now().toISOString(), status: "complete", output,
    };
    validateCursorWriterReceipt(receipt);
    await input.receiptStore.put(key, receipt);
    return { output, receipt, threadUrl };
  };
  const executor = { provider: CURSOR_PROVIDER, dispatch, [EXECUTOR_BRAND]: true as const };
  return executor;
}

export function isCursorWriterExecutor(value: unknown): value is CursorWriterExecutor {
  return !!value && typeof value === "object" && (value as any)[EXECUTOR_BRAND] === true && (value as any).provider === CURSOR_PROVIDER && typeof (value as any).dispatch === "function";
}

export function createMemoryCursorReceiptStore(): CursorWriterReceiptStore & { records: Map<string, StoredCursorWriterReceipt> } {
  const records = new Map<string, StoredCursorWriterReceipt>();
  return { records, get: (key) => records.get(key), put: (key, receipt) => { records.set(key, receipt); } };
}
