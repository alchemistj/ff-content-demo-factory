import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Agent } from "@cursor/sdk";
import type { AgentOptions, SDKAgent, Run } from "@cursor/sdk";
import { digestOf } from "../contracts/digests.js";

export const CURSOR_PROVIDER = "cursor-sdk" as const;
export const REQUIRED_CURSOR_MODEL = "cursor-grok-4.6-high" as const;
export const OFFICIAL_CURSOR_MODEL = "grok-4.6" as const;
export const CURSOR_CLOUD_API = "https://api.cursor.com" as const;
export type CursorWriterStage = "writer1" | "writer2" | "writer3";
type RecordValue = Record<string, unknown>;
const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const STAGES = new Set<CursorWriterStage>(["writer1", "writer2", "writer3"]);

export interface CursorWriterReceipt {
  stage: CursorWriterStage; provider: typeof CURSOR_PROVIDER; requestedModel: typeof REQUIRED_CURSOR_MODEL;
  resolvedModel: typeof OFFICIAL_CURSOR_MODEL; fast: false; jobId: string; agentId: string; threadUrl: string;
  inputDigest: string; promptDigest: string; outputDigest: string; completedAt: string; status: "complete"; output: unknown;
  requestDigest: string; createRequest: unknown; registryItem: unknown; registryDigest: string; modelParams: unknown;
  effort: "high"; effortParameterId?: string; effortAttestationSource: "official-response" | "official-registry-parameter" | "named-model-default";
  attestationSource: "official-response" | "bound-create-request"; apiVersion: "cloud-agent-api-v1";
  mode?: "initial" | "same-thread-retrieval";
  correctionVersion?: "words-writer1-retrieval/v1";
  prior?: CursorFollowUpBindings;
  followUpPromptDigest?: string;
}
export interface CursorWriterPendingReceipt {
  stage: CursorWriterStage; provider: typeof CURSOR_PROVIDER; requestedModel: typeof REQUIRED_CURSOR_MODEL;
  resolvedModel: typeof OFFICIAL_CURSOR_MODEL; fast: false; jobId: string; agentId: string; threadUrl: string;
  inputDigest: string; promptDigest: string; status: "running";
}
export type StoredCursorWriterReceipt = CursorWriterReceipt | CursorWriterPendingReceipt;

export interface CursorDispatchClaim {
  key: string; stage: CursorWriterStage; runId: string; inputDigest: string; promptDigest: string; ownerToken: string;
  requestedAgentId: string; claimedAt: string; leaseUntil?: string; heartbeatAt?: string;
  phase?: "claimed" | "agent-created" | "prompt-sent" | "follow-up-sent" | "waiting" | "completed";
  agentId?: string; jobId?: string;
}
export interface CursorWriterReceiptStore {
  get(key: string): StoredCursorWriterReceipt | undefined | Promise<StoredCursorWriterReceipt | undefined>;
  put(key: string, receipt: StoredCursorWriterReceipt): void | Promise<void>;
  tryClaim?(key: string, claim: CursorDispatchClaim): { acquired: boolean; claim: CursorDispatchClaim } | Promise<{ acquired: boolean; claim: CursorDispatchClaim }>;
  getClaim?(key: string): CursorDispatchClaim | undefined | Promise<CursorDispatchClaim | undefined>;
  putClaim?(key: string, claim: CursorDispatchClaim): void | Promise<void>;
}
export interface CursorWriterRuntimeConfig { provider: unknown; requestedModel: unknown; resolvedModel?: unknown; fast: unknown; }

export interface CursorModelParameter { id: string; values?: Array<{ value: string; displayName?: string }>; }
export interface CursorModelVariant { params?: Array<{ id: string; value: string }>; displayName?: string; isDefault?: boolean; }
export interface CursorModelRegistryItem { id: string; displayName?: string; description?: string; aliases?: string[]; parameters?: CursorModelParameter[]; variants?: CursorModelVariant[]; [key: string]: unknown; }
export interface CursorModelRegistry { items: CursorModelRegistryItem[]; [key: string]: unknown; }
interface CursorModelSelection { requestedAlias: typeof REQUIRED_CURSOR_MODEL; officialId: typeof OFFICIAL_CURSOR_MODEL; params: Array<{ id: string; value: string }>; registryItem: CursorModelRegistryItem; registryDigest: string; effort: "high"; effortParameterId?: string; effortAttestationSource: "official-registry-parameter" | "named-model-default"; }

export class CursorWriterExecutionError extends Error {
  readonly code: string; readonly details?: unknown;
  constructor(code: string, message: string, details?: unknown) { super(message); this.name = "CursorWriterExecutionError"; this.code = code; this.details = details; }
}
function asRecord(value: unknown): RecordValue | null { return value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : null; }
const MODEL_ALIAS_MAP: Readonly<Record<string, typeof OFFICIAL_CURSOR_MODEL>> = { [REQUIRED_CURSOR_MODEL]: OFFICIAL_CURSOR_MODEL };
function modelParameter(item: CursorModelRegistryItem, predicate: (id: string) => boolean): CursorModelParameter | undefined {
  return Array.isArray(item.parameters) ? item.parameters.find((parameter) => asRecord(parameter) && typeof parameter.id === "string" && predicate(parameter.id)) : undefined;
}
function parameterSupports(parameter: CursorModelParameter | undefined, value: string): boolean {
  return !!parameter && Array.isArray(parameter.values) && parameter.values.some((entry) => asRecord(entry) && entry.value === value);
}
function variantSupports(item: CursorModelRegistryItem, id: string, value: string): boolean {
  return Array.isArray(item.variants) && item.variants.some((variant) => Array.isArray(variant.params) && variant.params.some((entry) => entry.id === id && entry.value === value));
}
function effortParameterId(item: CursorModelRegistryItem): string | undefined {
  const parameter = modelParameter(item, (id) => /(?:effort|reasoning)/iu.test(id));
  if (parameter) return parameter.id;
  const variantEntry = Array.isArray(item.variants) ? item.variants.flatMap((variant) => variant.params || []).find((entry) => /(?:effort|reasoning)/iu.test(entry.id)) : undefined;
  return variantEntry?.id;
}
export function resolveCursorModelSelection(registry: unknown, requestedAlias: unknown): CursorModelSelection {
  if (requestedAlias !== REQUIRED_CURSOR_MODEL || MODEL_ALIAS_MAP[String(requestedAlias)] !== OFFICIAL_CURSOR_MODEL) throw new CursorWriterExecutionError("CURSOR_MODEL_REQUIRED", `Only ${REQUIRED_CURSOR_MODEL} is allowlisted as a Cursor model alias`);
  const value = asRecord(registry); const items = value && Array.isArray(value.items) ? value.items : undefined;
  if (!items) throw new CursorWriterExecutionError("CURSOR_MODEL_REGISTRY_INVALID", "Cursor model registry response has no items array");
  const item = items.find((entry): entry is CursorModelRegistryItem => { const record = asRecord(entry); return !!record && record.id === OFFICIAL_CURSOR_MODEL; });
  if (!item) throw new CursorWriterExecutionError("CURSOR_MODEL_REGISTRY_MISSING", `Cursor model registry did not return ${OFFICIAL_CURSOR_MODEL}`);
  const fast = modelParameter(item, (id) => id === "fast");
  if (!parameterSupports(fast, "false") && !variantSupports(item, "fast", "false")) throw new CursorWriterExecutionError("CURSOR_FAST_UNAVAILABLE", `${OFFICIAL_CURSOR_MODEL} does not support fast=false in the official model registry`);
  const effortId = effortParameterId(item);
  const params: Array<{ id: string; value: string }> = [{ id: "fast", value: "false" }];
  let effortAttestationSource: CursorModelSelection["effortAttestationSource"] = "named-model-default";
  if (effortId) {
    const effort = modelParameter(item, (id) => id === effortId);
    if (effort && !parameterSupports(effort, "high") && !variantSupports(item, effortId, "high")) throw new CursorWriterExecutionError("CURSOR_EFFORT_UNAVAILABLE", `${OFFICIAL_CURSOR_MODEL} exposes ${effortId} but does not support high`);
    if (!effort && !variantSupports(item, effortId, "high")) throw new CursorWriterExecutionError("CURSOR_EFFORT_UNAVAILABLE", `${OFFICIAL_CURSOR_MODEL} exposes ${effortId} but does not support high`);
    params.push({ id: effortId, value: "high" }); effortAttestationSource = "official-registry-parameter";
  }
  return { requestedAlias: REQUIRED_CURSOR_MODEL, officialId: OFFICIAL_CURSOR_MODEL, params, registryItem: item, registryDigest: digestOf(item), effort: "high", ...(effortId ? { effortParameterId: effortId } : {}), effortAttestationSource };
}
export function validateCursorWriterRuntime(config: CursorWriterRuntimeConfig): void {
  if (config.provider !== CURSOR_PROVIDER) throw new CursorWriterExecutionError("CURSOR_PROVIDER_REQUIRED", "Writer stages must execute through the Cursor SDK provider");
  if (config.requestedModel !== REQUIRED_CURSOR_MODEL) throw new CursorWriterExecutionError("CURSOR_MODEL_REQUIRED", `CURSOR_MODEL must be exactly ${REQUIRED_CURSOR_MODEL}`);
  if (config.fast !== false) throw new CursorWriterExecutionError("CURSOR_FAST_MUST_BE_FALSE", "Cursor fast mode must be explicitly false or off");
  if (config.resolvedModel !== undefined && config.resolvedModel !== OFFICIAL_CURSOR_MODEL) throw new CursorWriterExecutionError("CURSOR_RESOLVED_MODEL_MISMATCH", `Cursor resolved model must be exactly ${OFFICIAL_CURSOR_MODEL}`);
}
function assertDigest(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || !DIGEST.test(value)) throw new CursorWriterExecutionError("CURSOR_RECEIPT_INVALID", `Receipt ${field} must be a sha256 digest`);
}
function assertThreadUrl(value: unknown, agentId: string): asserts value is string {
  if (typeof value !== "string" || !value.trim()) throw new CursorWriterExecutionError("CURSOR_THREAD_URL_INVALID", "Cursor Cloud did not return a direct thread URL");
  let url: URL; try { url = new URL(value); } catch { throw new CursorWriterExecutionError("CURSOR_THREAD_URL_INVALID", "Cursor thread URL is not a valid URL"); }
  if (url.protocol !== "https:" || url.hostname !== "cursor.com" || url.search || url.hash || url.pathname !== `/agents/${agentId}`) throw new CursorWriterExecutionError("CURSOR_THREAD_URL_INVALID", "Cursor thread URL is not the authenticated Cloud Agent URL bound to the returned agent ID", { value, agentId });
}
export function validateCursorWriterReceipt(receipt: unknown): asserts receipt is CursorWriterReceipt {
  const value = asRecord(receipt); if (!value) throw new CursorWriterExecutionError("CURSOR_RECEIPT_INVALID", "Writer completion requires a Cursor receipt object");
  validateCursorWriterRuntime({ provider: value.provider, requestedModel: value.requestedModel, resolvedModel: value.resolvedModel, fast: value.fast });
  if (!STAGES.has(value.stage as CursorWriterStage)) throw new CursorWriterExecutionError("CURSOR_RECEIPT_INVALID", "Receipt stage is invalid");
  if (value.status !== "complete") throw new CursorWriterExecutionError("CURSOR_RECEIPT_INVALID", "Only completed Cursor receipts may complete a writer stage");
  for (const field of ["jobId", "agentId", "threadUrl", "inputDigest", "promptDigest", "outputDigest", "completedAt", "output"]) if (!(field in value) || value[field] === undefined || (typeof value[field] === "string" && !value[field].trim())) throw new CursorWriterExecutionError("CURSOR_RECEIPT_INVALID", `Receipt is missing ${field}`);
  const agentId = String(value.agentId); assertThreadUrl(value.threadUrl, agentId);
  if (!agentId.startsWith("bc-")) throw new CursorWriterExecutionError("CURSOR_AGENT_ID_INVALID", "Writer receipt must be bound to a Cursor Cloud Agent ID");
  if (!String(value.jobId).startsWith("run-")) throw new CursorWriterExecutionError("CURSOR_JOB_ID_INVALID", "Writer receipt must be bound to a Cursor Cloud run ID");
  assertDigest(value.inputDigest, "inputDigest"); assertDigest(value.promptDigest, "promptDigest"); assertDigest(value.outputDigest, "outputDigest");
  assertDigest(value.requestDigest, "requestDigest");
  if (value.apiVersion !== "cloud-agent-api-v1" || (value.attestationSource !== "official-response" && value.attestationSource !== "bound-create-request")) throw new CursorWriterExecutionError("CURSOR_RECEIPT_INVALID", "Receipt fast attestation binding is invalid");
  const selection = resolveCursorModelSelection({ items: [value.registryItem] }, value.requestedModel);
  if (value.resolvedModel !== selection.officialId || value.registryDigest !== selection.registryDigest || digestOf(value.registryItem) !== value.registryDigest || value.effort !== "high") throw new CursorWriterExecutionError("CURSOR_RECEIPT_MODEL_BINDING_INVALID", "Cursor receipt model registry binding is invalid");
  if (JSON.stringify(value.modelParams) !== JSON.stringify(selection.params)) throw new CursorWriterExecutionError("CURSOR_RECEIPT_MODEL_PARAMS_INVALID", "Cursor receipt model params do not match the verified registry selection");
  if (value.effortParameterId !== selection.effortParameterId || value.effortAttestationSource !== selection.effortAttestationSource && value.effortAttestationSource !== "official-response") throw new CursorWriterExecutionError("CURSOR_RECEIPT_EFFORT_INVALID", "Cursor receipt high-effort attestation is invalid");
  if (!asRecord(value.createRequest) || digestOf(value.createRequest) !== value.requestDigest) throw new CursorWriterExecutionError("CURSOR_RECEIPT_REQUEST_TAMPERED", "Cursor receipt create request no longer matches its request digest");
  assertFastBound(asRecord(value.createRequest) as AgentOptions, []);
  if (typeof value.completedAt !== "string" || Number.isNaN(Date.parse(value.completedAt)) || new Date(value.completedAt).toISOString() !== value.completedAt) throw new CursorWriterExecutionError("CURSOR_RECEIPT_INVALID", "Receipt completedAt must be a canonical ISO timestamp");
  if (digestOf(value.output) !== value.outputDigest) throw new CursorWriterExecutionError("CURSOR_RECEIPT_OUTPUT_TAMPERED", "Cursor receipt output no longer matches its output digest");
}
function validatePendingReceipt(receipt: unknown): asserts receipt is CursorWriterPendingReceipt {
  const value = asRecord(receipt); if (!value) throw new CursorWriterExecutionError("CURSOR_RECEIPT_INVALID", "Pending Cursor receipt is invalid");
  validateCursorWriterRuntime({ provider: value.provider, requestedModel: value.requestedModel, resolvedModel: value.resolvedModel, fast: value.fast });
  if (value.status !== "running" || !STAGES.has(value.stage as CursorWriterStage)) throw new CursorWriterExecutionError("CURSOR_RECEIPT_INVALID", "Pending Cursor receipt status/stage is invalid");
  for (const field of ["jobId", "agentId", "threadUrl", "inputDigest", "promptDigest"]) if (typeof value[field] !== "string" || !String(value[field]).trim()) throw new CursorWriterExecutionError("CURSOR_RECEIPT_INVALID", `Pending receipt is missing ${field}`);
  assertThreadUrl(value.threadUrl, String(value.agentId)); assertDigest(value.inputDigest, "inputDigest"); assertDigest(value.promptDigest, "promptDigest");
}

const EXECUTOR_BRAND = Symbol("ff.cursor.writer.executor");
export interface CursorDispatchNotice { stage: CursorWriterStage; provider: typeof CURSOR_PROVIDER; requestedModel: typeof REQUIRED_CURSOR_MODEL; officialModel: typeof OFFICIAL_CURSOR_MODEL; modelParams: Array<{ id: string; value: string }>; registryDigest: string; effort: "high"; effortAttestationSource: CursorWriterReceipt["effortAttestationSource"]; fast: false; agentId: string; jobId: string; threadUrl: string; inputDigest: string; promptDigest: string; requestDigest: string; dispatchedAt: string; }
export interface CursorWriterExecutor {
  readonly provider: typeof CURSOR_PROVIDER;
  dispatch(stage: CursorWriterStage, input: unknown, prompt: string, runId?: string): Promise<{ output: unknown; receipt: CursorWriterReceipt; threadUrl: string; claim?: CursorDispatchClaim }>;
  readonly [EXECUTOR_BRAND]: true;
}
export interface CloudAgentRecord { id: string; url: string; latestRunId?: string; model?: { id?: string }; }
export interface CursorTestTransport {
  listModels(apiKey: string): Promise<CursorModelRegistry>;
  create(options: AgentOptions, prompt: string, idempotencyKey: string): Promise<{ agent: SDKAgent; run: Run }>;
  resume(agentId: string, options: AgentOptions): Promise<SDKAgent>;
  getAgent(agentId: string, apiKey: string): Promise<CloudAgentRecord>;
  getRun?(agentId: string, jobId: string, apiKey: string): Promise<Run>;
}
type CloudTransport = CursorTestTransport;

export interface CursorFollowUpBindings {
  priorActionRunId: string;
  priorArtifactId: number;
  priorRunId: string;
  priorJobId: string;
  priorAgentId: string;
  priorThreadUrl: string;
  priorOutputDigest: string;
  priorInputDigest: string;
  priorPromptDigest: string;
  priorRequestDigest: string;
}

export interface CursorFollowUpReceipt extends CursorWriterReceipt {
  mode: "same-thread-retrieval";
  correctionVersion: "words-writer1-retrieval/v1";
  prior: CursorFollowUpBindings;
  followUpPromptDigest: string;
}
const API_VERSION = "cloud-agent-api-v1" as const;
function modelOptions(apiKey: string, selection: CursorModelSelection): AgentOptions { return { apiKey, model: { id: selection.officialId, params: selection.params }, cloud: { env: { type: "cloud" } } }; }
function createRequest(options: AgentOptions, prompt: string, idempotencyKey: string, agentId: string): RecordValue {
  return { apiVersion: API_VERSION, agentId, idempotencyKey, prompt, model: options.model, cloud: options.cloud };
}
function fastAttestation(value: unknown): boolean | undefined {
  const record = asRecord(value); if (!record) return undefined;
  let found: boolean | undefined;
  for (const [key, child] of Object.entries(record)) {
    if (/^fast(?:mode)?$/iu.test(key)) {
      if (typeof child !== "boolean") throw new CursorWriterExecutionError("CURSOR_FAST_ATTESTATION_INVALID", "Cursor official fast attestation must be boolean false");
      if (child !== false) throw new CursorWriterExecutionError("CURSOR_FAST_ATTESTATION_MISMATCH", "Cursor official response reported fast=true");
      found = false;
    }
    const nested = fastAttestation(child); if (nested !== undefined) found = nested;
  }
  return found;
}
function assertFastBound(options: AgentOptions, officialValues: unknown[]): "official-response" | "bound-create-request" {
  const requestFast = asRecord(options.model)?.params;
  const params = Array.isArray(requestFast) ? requestFast.filter(asRecord) : [];
  const fast = params.find((param) => param.id === "fast");
  if (!fast || fast.value !== "false") throw new CursorWriterExecutionError("CURSOR_FAST_REQUEST_INVALID", "The bound Cursor create request must explicitly set model.params fast=false");
  let present = false;
  for (const value of officialValues) if (fastAttestation(value) !== undefined) present = true;
  return present ? "official-response" : "bound-create-request";
}
function assertEffortBound(selection: CursorModelSelection, officialValues: unknown[]): CursorWriterReceipt["effortAttestationSource"] {
  let present = false;
  const visit = (value: unknown): void => {
    const record = asRecord(value); if (!record) { if (Array.isArray(value)) value.forEach(visit); return; }
    for (const [key, child] of Object.entries(record)) {
      if (/(?:effort|reasoning)/iu.test(key)) {
        if (typeof child === "string") { if (child.toLowerCase() !== "high") throw new CursorWriterExecutionError("CURSOR_EFFORT_ATTESTATION_MISMATCH", "Cursor official response reported an effort other than high"); present = true; }
        else if (Array.isArray(child)) child.forEach(visit); else visit(child);
      } else visit(child);
    }
  };
  officialValues.forEach(visit);
  if (present) return "official-response";
  return selection.effortAttestationSource;
}
async function officialCloudTransport(): Promise<CloudTransport> {
  return {
    async listModels(apiKey) {
      const response = await fetch(`${CURSOR_CLOUD_API}/v1/models`, { headers: { Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`, Accept: "application/json" } });
      if (!response.ok) throw new CursorWriterExecutionError("CURSOR_MODEL_REGISTRY_FAILED", `Cursor model registry request failed with ${response.status}`);
      const payload = asRecord(await response.json()); if (!payload || !Array.isArray(payload.items)) throw new CursorWriterExecutionError("CURSOR_MODEL_REGISTRY_INVALID", "Cursor model registry response is invalid");
      return payload as unknown as CursorModelRegistry;
    },
    async create(options, prompt, idempotencyKey) { const agent = await Agent.create({ ...options, idempotencyKey }); if (!options.model) throw new CursorWriterExecutionError("CURSOR_MODEL_REQUIRED", "Cloud send requires the exact model selection"); const run = await agent.send(prompt, { model: options.model, idempotencyKey }); return { agent, run }; },
    async resume(agentId, options) { return Agent.resume(agentId, options); },
    async getAgent(agentId, apiKey) {
      const response = await fetch(`${CURSOR_CLOUD_API}/v1/agents/${encodeURIComponent(agentId)}`, { headers: { Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`, Accept: "application/json" } });
      if (!response.ok) throw new CursorWriterExecutionError("CURSOR_AGENT_RECORD_FAILED", `Cursor Cloud agent record request failed with ${response.status}`);
      const payload = asRecord(await response.json()); const agent = payload && asRecord(payload.agent) ? asRecord(payload.agent) : payload;
      if (!agent || typeof agent.id !== "string" || typeof agent.url !== "string") throw new CursorWriterExecutionError("CURSOR_AGENT_RECORD_INVALID", "Cursor Cloud agent record did not include id and url");
      const result: CloudAgentRecord = { id: agent.id, url: agent.url };
      if (typeof agent.latestRunId === "string") result.latestRunId = agent.latestRunId;
      const model = asRecord(agent.model); if (model && typeof model.id === "string") result.model = { id: model.id };
      return result;
    },
    async getRun(agentId, jobId, apiKey) {
      const response = await fetch(`${CURSOR_CLOUD_API}/v1/agents/${encodeURIComponent(agentId)}/runs/${encodeURIComponent(jobId)}`, { headers: { Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`, Accept: "application/json" } });
      if (!response.ok) throw new CursorWriterExecutionError("CURSOR_RUN_RECORD_FAILED", `Cursor Cloud run request failed with ${response.status}`);
      const payload = asRecord(await response.json());
      if (!payload) throw new CursorWriterExecutionError("CURSOR_RUN_RECORD_INVALID", "Cursor Cloud run record is not an object");
      const result = { ...payload, wait: async () => payload } as unknown as Run;
      return result;
    },
  };
}
function deterministicAgentId(key: string): string { const hex = createHash("sha256").update(key).digest("hex").slice(0, 32); return `bc-${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`; }
function resolvedModelOf(agent: SDKAgent, run: Run, result: unknown): unknown { const resultRecord = asRecord(result); const runModel = asRecord(run.model); const agentModel = asRecord(agent.model); return runModel?.id ?? (resultRecord && asRecord(resultRecord.model)?.id) ?? agentModel?.id; }
function outputOf(result: unknown): unknown { const value = asRecord(result); return value?.result ?? value?.output ?? result; }

export function validateCursorWriterFollowUpReceipt(receipt: unknown, prior: CursorFollowUpBindings, promptDigest: string): asserts receipt is CursorFollowUpReceipt {
  validateCursorWriterReceipt(receipt);
  const value = receipt as CursorWriterReceipt;
  if (value.mode !== "same-thread-retrieval" || value.correctionVersion !== "words-writer1-retrieval/v1") throw new CursorWriterExecutionError("CURSOR_FOLLOW_UP_RECEIPT_INVALID", "Cursor receipt is not the versioned Writer1 same-thread retrieval mode");
  if (!value.prior || JSON.stringify(value.prior) !== JSON.stringify(prior)) throw new CursorWriterExecutionError("CURSOR_FOLLOW_UP_BINDING_INVALID", "Cursor follow-up receipt lost the prior artifact/receipt binding");
  if (value.followUpPromptDigest !== promptDigest) throw new CursorWriterExecutionError("CURSOR_FOLLOW_UP_BINDING_INVALID", "Cursor follow-up receipt prompt digest does not match the correction prompt");
  if (value.agentId !== prior.priorAgentId || value.threadUrl !== prior.priorThreadUrl || value.jobId === prior.priorJobId) throw new CursorWriterExecutionError("CURSOR_FOLLOW_UP_BINDING_INVALID", "Cursor follow-up must use the same agent URL and a new run ID");
}

export async function retrieveCursorWriterOutput(input: {
  env?: Record<string, string | undefined>;
  receiptStore: CursorWriterReceiptStore;
  priorReceipt: CursorWriterReceipt;
  prior: CursorFollowUpBindings;
  prompt: string;
  runId: string;
  now?: () => Date;
  transport?: CloudTransport;
  onFollowUp?: (notice: CursorDispatchNotice) => void | Promise<void>;
  validateOutput?: (output: unknown) => void;
}): Promise<{ output: unknown; receipt: CursorFollowUpReceipt; threadUrl: string; claim: CursorDispatchClaim }> {
  const env = input.env || process.env;
  const now = input.now || (() => new Date());
  const requestedModel = env.CURSOR_MODEL;
  const fastRaw = env.CURSOR_FAST;
  const fast = fastRaw === "false" || fastRaw === "off" ? false : fastRaw;
  validateCursorWriterRuntime({ provider: CURSOR_PROVIDER, requestedModel, fast });
  if (!env.CURSOR_API_KEY) throw new CursorWriterExecutionError("CURSOR_API_KEY_REQUIRED", "Cloud Cursor production requires CURSOR_API_KEY");
  if (typeof input.prompt !== "string" || !input.prompt.trim()) throw new CursorWriterExecutionError("CURSOR_PROMPT_REQUIRED", "Writer retrieval requires a non-empty correction prompt");
  validateCursorWriterReceipt(input.priorReceipt);
  if (input.prior.priorJobId !== input.priorReceipt.jobId || input.prior.priorAgentId !== input.priorReceipt.agentId || input.prior.priorThreadUrl !== input.priorReceipt.threadUrl || input.prior.priorOutputDigest !== input.priorReceipt.outputDigest || input.prior.priorInputDigest !== input.priorReceipt.inputDigest || input.prior.priorPromptDigest !== input.priorReceipt.promptDigest || input.prior.priorRequestDigest !== input.priorReceipt.requestDigest) throw new CursorWriterExecutionError("CURSOR_PRIOR_BINDING_INVALID", "Prior Cursor receipt does not match the supplied artifact bindings");
  const transport = input.transport || await officialCloudTransport();
  const selection = resolveCursorModelSelection(await transport.listModels(env.CURSOR_API_KEY), requestedModel);
  const inputDigest = input.priorReceipt.inputDigest;
  const promptDigest = digestOf(input.prompt);
  const key = `${input.runId}:writer1:retrieval:v1:${input.prior.priorJobId}:${inputDigest}:${promptDigest}`;
  const existing = await input.receiptStore.get(key);
  if (existing) {
    validateCursorWriterFollowUpReceipt(existing, input.prior, promptDigest);
    const claim = await input.receiptStore.getClaim?.(key);
    if (!claim) throw new CursorWriterExecutionError("CURSOR_FOLLOW_UP_CLAIM_MISSING", "Completed Cursor follow-up has no durable correction claim");
    return { output: existing.output, receipt: existing, threadUrl: existing.threadUrl, claim };
  }
  if (!input.receiptStore.tryClaim || !input.receiptStore.getClaim || !input.receiptStore.putClaim) throw new CursorWriterExecutionError("CURSOR_DISPATCH_CLAIM_REQUIRED", "Cursor follow-up requires an atomic durable claim store");
  const initialClaim: CursorDispatchClaim = { key, stage: "writer1", runId: input.runId, inputDigest, promptDigest, ownerToken: `${process.pid}:${now().getTime()}:${Math.random()}`, requestedAgentId: input.prior.priorAgentId, claimedAt: now().toISOString(), heartbeatAt: now().toISOString(), leaseUntil: new Date(now().getTime() + 30_000).toISOString(), phase: "claimed" };
  const claimed = await input.receiptStore.tryClaim(key, initialClaim);
  let activeClaim = claimed.claim;
  if (!claimed.acquired) {
    const settled = await input.receiptStore.get(key);
    if (settled) { validateCursorWriterFollowUpReceipt(settled, input.prior, promptDigest); const finishedClaim = await input.receiptStore.getClaim(key); if (!finishedClaim) throw new CursorWriterExecutionError("CURSOR_FOLLOW_UP_CLAIM_MISSING", "Completed Cursor follow-up has no durable correction claim"); return { output: settled.output, receipt: settled, threadUrl: settled.threadUrl, claim: finishedClaim }; }
    throw new CursorWriterExecutionError("CURSOR_DISPATCH_IN_PROGRESS", "Another worker owns the live Cursor follow-up claim; caller must reconcile before retrying", { key, phase: activeClaim.phase || "claimed" });
  }
  const options = modelOptions(env.CURSOR_API_KEY, selection);
  const followUpRequest = { ...createRequest(options, input.prompt, key, input.prior.priorAgentId), mode: "same-thread-retrieval", correctionVersion: "words-writer1-retrieval/v1", priorJobId: input.prior.priorJobId, priorOutputDigest: input.prior.priorOutputDigest };
  const requestDigest = digestOf(followUpRequest);
  let agent: SDKAgent;
  let run: Run;
  if (activeClaim.agentId && activeClaim.jobId) {
    if (activeClaim.agentId !== input.prior.priorAgentId) throw new CursorWriterExecutionError("CURSOR_FOLLOW_UP_AGENT_MISMATCH", "A correction claim is bound to a different Cursor agent");
    agent = await transport.resume(input.prior.priorAgentId, options);
    if (!transport.getRun) throw new CursorWriterExecutionError("CURSOR_RUN_REATTACH_REQUIRED", "Interrupted Cursor follow-up cannot resend without the official durable run lookup");
    run = await transport.getRun(input.prior.priorAgentId, activeClaim.jobId, env.CURSOR_API_KEY);
  } else {
    // This is deliberately the only production entry for this mode: reattach
    // the existing Cloud Agent and send exactly one follow-up. Agent.create is
    // intentionally unreachable from the retrieval path.
    agent = await transport.resume(input.prior.priorAgentId, options);
    if (!options.model) throw new CursorWriterExecutionError("CURSOR_MODEL_REQUIRED", "Cursor follow-up requires the exact verified model selection");
    run = await agent.send(input.prompt, { model: options.model, idempotencyKey: key });
    activeClaim = { ...activeClaim, agentId: input.prior.priorAgentId, jobId: String(run.id), phase: "follow-up-sent", heartbeatAt: now().toISOString(), leaseUntil: new Date(now().getTime() + 30_000).toISOString() };
    await input.receiptStore.putClaim(key, activeClaim);
    if (input.onFollowUp) await input.onFollowUp({ stage: "writer1", provider: CURSOR_PROVIDER, requestedModel: REQUIRED_CURSOR_MODEL, officialModel: selection.officialId, modelParams: selection.params, registryDigest: selection.registryDigest, effort: selection.effort, effortAttestationSource: selection.effortAttestationSource, fast: false, agentId: input.prior.priorAgentId, jobId: String(run.id), threadUrl: input.prior.priorThreadUrl, inputDigest, promptDigest, requestDigest, dispatchedAt: now().toISOString() });
  }
  const agentId = String(agent.agentId); const jobId = String(run.id);
  if (agentId !== input.prior.priorAgentId || jobId === input.prior.priorJobId) throw new CursorWriterExecutionError("CURSOR_FOLLOW_UP_BINDING_INVALID", "Cursor follow-up returned the wrong agent or reused the prior run ID");
  const record = await transport.getAgent(agentId, env.CURSOR_API_KEY);
  if (record.id !== input.prior.priorAgentId || record.url !== input.prior.priorThreadUrl) throw new CursorWriterExecutionError("CURSOR_FOLLOW_UP_THREAD_MISMATCH", "Cursor follow-up changed the existing agent thread");
  assertThreadUrl(record.url, agentId);
  activeClaim = { ...activeClaim, agentId, jobId, phase: "waiting", heartbeatAt: now().toISOString(), leaseUntil: new Date(now().getTime() + 30_000).toISOString() };
  await input.receiptStore.putClaim(key, activeClaim);
  const result = await run.wait();
  const resolvedModel = resolvedModelOf(agent, run, result);
  validateCursorWriterRuntime({ provider: CURSOR_PROVIDER, requestedModel, resolvedModel, fast: false });
  if (resolvedModel !== OFFICIAL_CURSOR_MODEL) throw new CursorWriterExecutionError("CURSOR_RESOLVED_MODEL_MISSING", "Cursor follow-up did not attest the required resolved model");
  const output = outputOf(result);
  if (input.validateOutput) input.validateOutput(output);
  const attestationSource = assertFastBound(options, [agent, run, result]);
  const effortAttestationSource = assertEffortBound(selection, [agent, run, result]);
  const receipt: CursorFollowUpReceipt = { stage: "writer1", provider: CURSOR_PROVIDER, requestedModel: REQUIRED_CURSOR_MODEL, resolvedModel: OFFICIAL_CURSOR_MODEL, fast: false, jobId, agentId, threadUrl: record.url, inputDigest, promptDigest, outputDigest: digestOf(output), completedAt: now().toISOString(), status: "complete", output, requestDigest, createRequest: followUpRequest, registryItem: selection.registryItem, registryDigest: selection.registryDigest, modelParams: selection.params, effort: "high", ...(selection.effortParameterId ? { effortParameterId: selection.effortParameterId } : {}), effortAttestationSource, attestationSource, apiVersion: API_VERSION, mode: "same-thread-retrieval", correctionVersion: "words-writer1-retrieval/v1", prior: input.prior, followUpPromptDigest: promptDigest };
  validateCursorWriterFollowUpReceipt(receipt, input.prior, promptDigest);
  await input.receiptStore.put(key, receipt);
  activeClaim = { ...activeClaim, phase: "completed", heartbeatAt: now().toISOString(), leaseUntil: new Date(now().getTime() + 30_000).toISOString() };
  await input.receiptStore.putClaim(key, activeClaim);
  return { output, receipt, threadUrl: record.url, claim: activeClaim };
}

async function dispatchWithTransport(input: { transport: CloudTransport; env: Record<string, string | undefined>; receiptStore: CursorWriterReceiptStore; now: () => Date; onDispatch?: (notice: CursorDispatchNotice) => void | Promise<void> }, stage: CursorWriterStage, payload: unknown, prompt: string, runId: string): Promise<{ output: unknown; receipt: CursorWriterReceipt; threadUrl: string; claim?: CursorDispatchClaim }> {
  const requestedModel = input.env.CURSOR_MODEL; const fastRaw = input.env.CURSOR_FAST; const fast = fastRaw === "false" || fastRaw === "off" ? false : fastRaw; validateCursorWriterRuntime({ provider: CURSOR_PROVIDER, requestedModel, fast });
  if (!input.env.CURSOR_API_KEY) throw new CursorWriterExecutionError("CURSOR_API_KEY_REQUIRED", "Cloud Cursor production requires CURSOR_API_KEY");
  if (typeof prompt !== "string" || !prompt.trim()) throw new CursorWriterExecutionError("CURSOR_PROMPT_REQUIRED", "Writer dispatch requires a non-empty prompt");
  const selection = resolveCursorModelSelection(await input.transport.listModels(input.env.CURSOR_API_KEY), requestedModel);
  const inputDigest = digestOf(payload); const promptDigest = digestOf(prompt); const key = `${runId}:${stage}:${inputDigest}:${promptDigest}`; const requestedAgentId = deterministicAgentId(key);
  const existing = await input.receiptStore.get(key);
  if (existing) { if (existing.stage !== stage || existing.inputDigest !== inputDigest || existing.promptDigest !== promptDigest) throw new CursorWriterExecutionError("CURSOR_RECEIPT_BINDING_MISMATCH", "Existing Cursor receipt is bound to different writer input"); if (existing.status === "complete") { validateCursorWriterReceipt(existing); return { output: existing.output, receipt: existing, threadUrl: existing.threadUrl }; } validatePendingReceipt(existing); }
  if (!input.receiptStore.tryClaim || !input.receiptStore.getClaim || !input.receiptStore.putClaim) throw new CursorWriterExecutionError("CURSOR_DISPATCH_CLAIM_REQUIRED", "Production Cursor dispatch requires an atomic durable claim store");
  const claim: CursorDispatchClaim = { key, stage, runId, inputDigest, promptDigest, ownerToken: `${process.pid}:${input.now().getTime()}:${Math.random()}`, requestedAgentId, claimedAt: input.now().toISOString(), heartbeatAt: input.now().toISOString(), leaseUntil: new Date(input.now().getTime() + 30_000).toISOString(), phase: "claimed" }; const claimed = await input.receiptStore.tryClaim(key, claim); let activeClaim = claimed.claim;
  if (!claimed.acquired) {
    const settled = await input.receiptStore.get(key);
    if (settled?.status === "complete") { validateCursorWriterReceipt(settled); const finishedClaim = await input.receiptStore.getClaim(key); return { output: settled.output, receipt: settled, threadUrl: settled.threadUrl, ...(finishedClaim ? { claim: finishedClaim } : {}) }; }
    throw new CursorWriterExecutionError("CURSOR_DISPATCH_IN_PROGRESS", "Another worker owns a live Cursor dispatch lease; caller must poll or reconcile before resuming", { status: "in-progress", stage, key, ownerToken: activeClaim.ownerToken, phase: activeClaim.phase || "claimed" });
  }
  let agent: SDKAgent; let run: Run;
  const options = modelOptions(input.env.CURSOR_API_KEY, selection); const request = createRequest(options, prompt, key, requestedAgentId); const requestDigest = digestOf(request);
  if (activeClaim.agentId && activeClaim.jobId) {
    agent = await input.transport.resume(activeClaim.agentId, options);
    if (!input.transport.getRun) throw new CursorWriterExecutionError("CURSOR_RUN_REATTACH_REQUIRED", "Interrupted Cursor work cannot resend a prompt without the official durable run lookup");
    run = await input.transport.getRun(activeClaim.agentId, activeClaim.jobId, input.env.CURSOR_API_KEY);
  } else {
    const created = await input.transport.create({ ...options, agentId: requestedAgentId }, prompt, key); agent = created.agent; run = created.run;
    const agentId = String(agent.agentId); const jobId = String(run.id); activeClaim = { ...activeClaim, agentId, jobId, phase: "prompt-sent", heartbeatAt: input.now().toISOString(), leaseUntil: new Date(input.now().getTime() + 30_000).toISOString() }; await input.receiptStore.putClaim(key, activeClaim);
  }
  const agentId = String(agent.agentId); const jobId = String(run.id); if (activeClaim.agentId && agentId !== activeClaim.agentId) throw new CursorWriterExecutionError("CURSOR_CLAIM_BINDING_MISMATCH", "Cursor returned an agent ID different from the durable dispatch claim");
  const record = await input.transport.getAgent(agentId, input.env.CURSOR_API_KEY); if (record.id !== agentId) throw new CursorWriterExecutionError("CURSOR_AGENT_RECORD_INVALID", "Cursor Cloud agent record ID does not match SDK agent ID"); assertThreadUrl(record.url, agentId);
  if (input.onDispatch) await input.onDispatch({ stage, provider: CURSOR_PROVIDER, requestedModel: REQUIRED_CURSOR_MODEL, officialModel: selection.officialId, modelParams: selection.params, registryDigest: selection.registryDigest, effort: selection.effort, effortAttestationSource: selection.effortAttestationSource, fast: false, agentId, jobId, threadUrl: record.url, inputDigest, promptDigest, requestDigest, dispatchedAt: input.now().toISOString() });
  activeClaim = { ...activeClaim, phase: "waiting", heartbeatAt: input.now().toISOString(), leaseUntil: new Date(input.now().getTime() + 30_000).toISOString() }; await input.receiptStore.putClaim(key, activeClaim);
  const result = await run.wait(); const resolvedModel = resolvedModelOf(agent, run, result); validateCursorWriterRuntime({ provider: CURSOR_PROVIDER, requestedModel, resolvedModel, fast: false }); if (resolvedModel !== OFFICIAL_CURSOR_MODEL) throw new CursorWriterExecutionError("CURSOR_RESOLVED_MODEL_MISSING", "Cursor Cloud did not attest the required resolved model");
  const output = outputOf(result); const attestationSource = assertFastBound(options, [agent, run, result]); const effortAttestationSource = assertEffortBound(selection, [agent, run, result]); const receipt: CursorWriterReceipt = { stage, provider: CURSOR_PROVIDER, requestedModel: REQUIRED_CURSOR_MODEL, resolvedModel: OFFICIAL_CURSOR_MODEL, fast: false, jobId, agentId, threadUrl: record.url, inputDigest, promptDigest, outputDigest: digestOf(output), completedAt: input.now().toISOString(), status: "complete", output, requestDigest, createRequest: request, registryItem: selection.registryItem, registryDigest: selection.registryDigest, modelParams: selection.params, effort: "high", ...(selection.effortParameterId ? { effortParameterId: selection.effortParameterId } : {}), effortAttestationSource, attestationSource, apiVersion: API_VERSION }; validateCursorWriterReceipt(receipt); await input.receiptStore.put(key, receipt); activeClaim = { ...activeClaim, phase: "completed", heartbeatAt: input.now().toISOString(), leaseUntil: new Date(input.now().getTime() + 30_000).toISOString() }; await input.receiptStore.putClaim(key, activeClaim); return { output, receipt, threadUrl: record.url, claim: activeClaim };
}
export function createCursorWriterExecutor(input: { env?: Record<string, string | undefined>; receiptStore: CursorWriterReceiptStore; now?: () => Date; onDispatch?: (notice: CursorDispatchNotice) => void | Promise<void> }): CursorWriterExecutor {
  if (!input || !input.receiptStore) throw new CursorWriterExecutionError("CURSOR_RECEIPT_STORE_REQUIRED", "A durable Cursor receipt/claim store is required"); const env = input.env || process.env; const now = input.now || (() => new Date()); const transportPromise = officialCloudTransport();
  const dispatch = (stage: CursorWriterStage, payload: unknown, prompt: string, runId = "unknown-run") => transportPromise.then((transport) => dispatchWithTransport({ transport, env, receiptStore: input.receiptStore, now, ...(input.onDispatch ? { onDispatch: input.onDispatch } : {}) }, stage, payload, prompt, runId)); return { provider: CURSOR_PROVIDER, dispatch, [EXECUTOR_BRAND]: true as const };
}
/** Explicit test-only network seam. It is intentionally not exported from pipeline/index.ts. */
export function createCursorWriterExecutorForTest(input: { transport: CursorTestTransport; env?: Record<string, string | undefined>; receiptStore: CursorWriterReceiptStore; now?: () => Date }): CursorWriterExecutor {
  if (process.env.NODE_ENV !== "test" && !process.execArgv.some((arg) => arg.includes("--test"))) throw new CursorWriterExecutionError("CURSOR_TEST_SEAM_FORBIDDEN", "The injected Cursor transport is available only from the Node test boundary");
  if (!input?.transport || typeof input.transport.listModels !== "function" || typeof input.transport.create !== "function" || typeof input.transport.resume !== "function" || typeof input.transport.getAgent !== "function" || !input.receiptStore) throw new CursorWriterExecutionError("CURSOR_TEST_SEAM_INVALID", "The test-only Cursor model registry transport and claim store are required");
  const env = input.env || process.env; const now = input.now || (() => new Date());
  return { provider: CURSOR_PROVIDER, dispatch: (stage, payload, prompt, runId = "test-run") => dispatchWithTransport({ transport: input.transport, env, receiptStore: input.receiptStore, now }, stage, payload, prompt, runId), [EXECUTOR_BRAND]: true as const };
}
export function isCursorWriterExecutor(value: unknown): value is CursorWriterExecutor { return !!value && typeof value === "object" && (value as Record<symbol, unknown>)[EXECUTOR_BRAND] === true && (value as Record<string, unknown>).provider === CURSOR_PROVIDER && typeof (value as Record<string, unknown>).dispatch === "function"; }
export function createMemoryCursorReceiptStore(): CursorWriterReceiptStore & { records: Map<string, StoredCursorWriterReceipt>; claims: Map<string, CursorDispatchClaim> } {
  const records = new Map<string, StoredCursorWriterReceipt>(); const claims = new Map<string, CursorDispatchClaim>(); return { records, claims, get: (key) => records.get(key), put: (key, receipt) => { records.set(key, receipt); }, tryClaim: (key, claim) => { const current = claims.get(key); if (current && (!current.leaseUntil || Date.parse(current.leaseUntil) > Date.now()) && current.phase !== "completed") return { acquired: false, claim: current }; const resumed = current && current.agentId && current.jobId ? { ...claim, agentId: current.agentId, jobId: current.jobId, phase: current.phase || "prompt-sent" as const } : claim; claims.set(key, resumed); return { acquired: true, claim: resumed }; }, getClaim: (key) => claims.get(key), putClaim: (key, claim) => { claims.set(key, claim); } };
}

interface CursorReceiptFile { receipts: Record<string, StoredCursorWriterReceipt>; claims: Record<string, CursorDispatchClaim>; }
async function readReceiptFile(filePath: string): Promise<CursorReceiptFile> {
  try { return JSON.parse(await fs.readFile(filePath, "utf8")) as CursorReceiptFile; }
  catch (error) { if (error instanceof Error && "code" in error && error.code === "ENOENT") return { receipts: {}, claims: {} }; throw error; }
}
async function writeReceiptFile(filePath: string, value: CursorReceiptFile): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, "utf8"); await fs.rename(temp, filePath);
}
async function withReceiptFileLock<T>(filePath: string, action: () => Promise<T>): Promise<T> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const lockPath = `${filePath}.lock`; let handle: Awaited<ReturnType<typeof fs.open>> | undefined;
  for (let attempt = 0; attempt < 300; attempt += 1) {
    try { handle = await fs.open(lockPath, "wx"); break; }
    catch (error) { if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error; await new Promise((resolve) => setTimeout(resolve, 10)); }
  }
  if (!handle) throw new CursorWriterExecutionError("CURSOR_DISPATCH_LOCK_TIMEOUT", "Timed out acquiring the durable Cursor dispatch lock");
  try { return await action(); } finally { await handle.close(); await fs.unlink(lockPath).catch(() => undefined); }
}
export function createJsonCursorReceiptStore(filePath: string): CursorWriterReceiptStore {
  if (!filePath || typeof filePath !== "string") throw new TypeError("A Cursor receipt file path is required");
  const target = path.resolve(filePath);
  return {
    async get(key) { return (await readReceiptFile(target)).receipts[key]; },
    async put(key, receipt) { await withReceiptFileLock(target, async () => { const value = await readReceiptFile(target); value.receipts[key] = receipt; await writeReceiptFile(target, value); }); },
    async tryClaim(key, claim) { return withReceiptFileLock(target, async () => { const value = await readReceiptFile(target); const existing = value.claims[key]; if (existing && (!existing.leaseUntil || Date.parse(existing.leaseUntil) > Date.now()) && existing.phase !== "completed") return { acquired: false, claim: existing }; const resumed = existing?.agentId && existing.jobId ? { ...claim, agentId: existing.agentId, jobId: existing.jobId, phase: existing.phase || "prompt-sent" as const } : claim; value.claims[key] = resumed; await writeReceiptFile(target, value); return { acquired: true, claim: resumed }; }); },
    async getClaim(key) { return (await readReceiptFile(target)).claims[key]; },
    async putClaim(key, claim) { await withReceiptFileLock(target, async () => { const value = await readReceiptFile(target); value.claims[key] = claim; await writeReceiptFile(target, value); }); },
  };
}
