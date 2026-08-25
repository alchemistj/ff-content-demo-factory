import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Agent } from "@cursor/sdk";
import type { AgentOptions, SDKAgent, Run } from "@cursor/sdk";
import { canonicalize, digestOf } from "../contracts/digests.js";

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
  mode?: "initial" | "same-thread-retrieval" | "same-thread-artifact-recovery" | "validation-only-artifact-recovery";
  correctionVersion?: "words-writer1-retrieval/v1";
  prior?: CursorFollowUpBindings;
  followUpPromptDigest?: string;
  artifact?: CursorArtifactBinding;
  recoveryVersion?: "words-writer1-artifact-recovery/v1" | "words-writer1-artifact-recovery/v2" | "words-writer1-artifact-recovery/v3" | "words-writer1-artifact-recovery/v3-finalize";
  recoveryRunId?: string;
  recoveryPrior?: CursorArtifactRecoveryPrior;
  integrityMac?: string;
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
  phase?: "claimed" | "agent-created" | "prompt-sent" | "follow-up-sending" | "follow-up-sent" | "waiting" | "completed";
  agentId?: string; jobId?: string;
  recoveryBeforeArtifact?: CursorArtifactBinding;
  copyProjectionDigest?: string;
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
const RECEIPT_MAC_DOMAIN = "ff-content-demo-factory/cursor-writer-receipt/hmac-sha256/v1";
function unsignedReceiptJson(receipt: unknown): string {
  const value = asRecord(receipt); if (!value) throw new CursorWriterExecutionError("CURSOR_RECEIPT_INVALID", "Receipt must be an object before MAC validation");
  const { integrityMac: _integrityMac, ...unsigned } = value;
  return JSON.stringify(canonicalize(unsigned));
}
function receiptIntegrityMac(receipt: unknown, cursorApiKey: string): string {
  const derivedKey = createHmac("sha256", RECEIPT_MAC_DOMAIN).update(cursorApiKey, "utf8").digest();
  return `hmac-sha256:${createHmac("sha256", derivedKey).update(unsignedReceiptJson(receipt), "utf8").digest("hex")}`;
}
function withReceiptIntegrityMac<T extends object>(receipt: T, cursorApiKey: string): T & { integrityMac: string } {
  return { ...(receipt as Record<string, unknown>), integrityMac: receiptIntegrityMac(receipt, cursorApiKey) } as T & { integrityMac: string };
}
function validateReceiptIntegrityMac(receipt: unknown, cursorApiKey?: string): void {
  const value = asRecord(receipt); if (!value) return;
  if (value.integrityMac !== undefined && (typeof value.integrityMac !== "string" || !/^hmac-sha256:[0-9a-f]{64}$/u.test(value.integrityMac))) throw new CursorWriterExecutionError("CURSOR_RECEIPT_MAC_INVALID", "Cursor receipt integrity MAC has an invalid format");
  if (!cursorApiKey) return; // Legacy prior artifacts may predate receipt MACs; all new runtime/resume writes supply the secret.
  if (typeof value.integrityMac !== "string") throw new CursorWriterExecutionError("CURSOR_RECEIPT_MAC_MISSING", "Cursor receipt is missing its secret-bound integrity MAC");
  const expected = receiptIntegrityMac(receipt, cursorApiKey); const actualBytes = Buffer.from(value.integrityMac.slice("hmac-sha256:".length), "hex"); const expectedBytes = Buffer.from(expected.slice("hmac-sha256:".length), "hex");
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) throw new CursorWriterExecutionError("CURSOR_RECEIPT_MAC_MISMATCH", "Cursor receipt integrity MAC does not match the configured Cursor secret");
}
function assertThreadUrl(value: unknown, agentId: string): asserts value is string {
  if (typeof value !== "string" || !value.trim()) throw new CursorWriterExecutionError("CURSOR_THREAD_URL_INVALID", "Cursor Cloud did not return a direct thread URL");
  let url: URL; try { url = new URL(value); } catch { throw new CursorWriterExecutionError("CURSOR_THREAD_URL_INVALID", "Cursor thread URL is not a valid URL"); }
  if (url.protocol !== "https:" || url.hostname !== "cursor.com" || url.search || url.hash || url.pathname !== `/agents/${agentId}`) throw new CursorWriterExecutionError("CURSOR_THREAD_URL_INVALID", "Cursor thread URL is not the authenticated Cloud Agent URL bound to the returned agent ID", { value, agentId });
}
export function validateCursorWriterReceipt(receipt: unknown, cursorApiKey?: string): asserts receipt is CursorWriterReceipt {
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
  validateReceiptIntegrityMac(value, cursorApiKey);
}
function validateValidationOnlyCursorReceipt(receipt: unknown, prior: CursorArtifactRecoveryPrior, cursorApiKey?: string): asserts receipt is CursorArtifactRecoveryV3FinalizeReceipt {
  const value = asRecord(receipt); if (!value) throw new CursorWriterExecutionError("CURSOR_RECEIPT_INVALID", "Validation-only Cursor receipt must be an object");
  validateCursorWriterRuntime({ provider: value.provider, requestedModel: value.requestedModel, resolvedModel: value.resolvedModel, fast: value.fast });
  if (value.stage !== "writer1" || value.status !== "complete" || value.mode !== "validation-only-artifact-recovery" || value.recoveryVersion !== "words-writer1-artifact-recovery/v3-finalize") throw new CursorWriterExecutionError("CURSOR_RECEIPT_INVALID", "Validation-only Cursor receipt stage or mode is invalid");
  for (const field of ["jobId", "agentId", "threadUrl", "inputDigest", "promptDigest", "outputDigest", "completedAt", "output"]) if (!(field in value) || value[field] === undefined) throw new CursorWriterExecutionError("CURSOR_RECEIPT_INVALID", `Validation-only Cursor receipt is missing ${field}`);
  assertThreadUrl(value.threadUrl, String(value.agentId));
  if (value.agentId !== prior.agentId || value.jobId !== prior.runId || value.requestedModel !== prior.requestedModel || value.resolvedModel !== prior.resolvedModel || value.fast !== false || value.effort !== "high" || value.registryDigest !== prior.registryDigest || JSON.stringify(value.modelParams) !== JSON.stringify(prior.modelParams) || value.requestDigest !== prior.requestDigest || value.inputDigest !== prior.inputDigest) throw new CursorWriterExecutionError("CURSOR_RECEIPT_MODEL_BINDING_INVALID", "Validation-only Cursor receipt lost the verified latest v3 model, run, or sealed input binding");
  assertDigest(value.inputDigest, "inputDigest"); assertDigest(value.promptDigest, "promptDigest"); assertDigest(value.outputDigest, "outputDigest"); assertDigest(value.requestDigest, "requestDigest");
  if (value.apiVersion !== API_VERSION || value.attestationSource !== "official-response" || typeof value.completedAt !== "string" || Number.isNaN(Date.parse(value.completedAt)) || new Date(value.completedAt).toISOString() !== value.completedAt || digestOf(value.output) !== value.outputDigest) throw new CursorWriterExecutionError("CURSOR_RECEIPT_INVALID", "Validation-only Cursor receipt attestation or output binding is invalid");
  validateReceiptIntegrityMac(value, cursorApiKey);
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
  artifactClient?: CursorArtifactClient;
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
/** Conservative upper bound for the complete two-page Writer1 artifact. */
export const MAX_WRITER1_ARTIFACT_BYTES = 1024 * 1024;
export interface CursorArtifactDownloadRequest { agentId: string; logicalPath: "artifacts/writer1-output.json"; cursorEndpoint: string; method: "GET"; apiVersion: "cloud-agent-api-v1"; }
export interface CursorPresignedUrlEvidence { scheme: "https"; host: string; port?: number; pathname: string; queryParameterNames: string[]; }
export interface CursorArtifactBinding {
  path: "artifacts/writer1-output.json"; size: number; sha256: string; contentSize: number; byteDigest: string; updatedAt?: string;
  downloadRequest: CursorArtifactDownloadRequest; requestShapeDigest: string; downloadRequestDigest: string;
  presignedUrlEvidence: CursorPresignedUrlEvidence; presignedUrlEvidenceDigest: string;
}
export interface CursorArtifactRecoveryPrior {
  actionRunId: string; artifactId: number; runId: string; agentId: string; threadUrl: string;
  inputDigest: string; promptDigest: string; requestDigest: string;
  requestedModel: typeof REQUIRED_CURSOR_MODEL; resolvedModel: typeof OFFICIAL_CURSOR_MODEL;
  modelParams: Array<{ id: string; value: string }>; registryDigest: string; effort: "high";
  effortAttestationSource: CursorWriterReceipt["effortAttestationSource"]; fast: false;
  sourceBranch: string; sourceSha: string; sealedHandoffDigest: string;
}
export interface CursorArtifactRecoveryReceipt extends CursorWriterReceipt {
  mode: "same-thread-artifact-recovery" | "validation-only-artifact-recovery";
  recoveryVersion: "words-writer1-artifact-recovery/v1" | "words-writer1-artifact-recovery/v2" | "words-writer1-artifact-recovery/v3" | "words-writer1-artifact-recovery/v3-finalize";
  artifact: CursorArtifactBinding;
  recoveryRunId: string;
  recoveryPrior: CursorArtifactRecoveryPrior;
  previousRecovery?: CursorArtifactRecoveryFailureBinding;
}
export interface CursorArtifactRecoveryFailureBinding {
  recoveryVersion: "words-writer1-artifact-recovery/v1";
  actionRunId: string;
  artifactId: number;
  sourceBranch: string;
  sourceSha: string;
  artifactDigest: string;
  runId: string;
  agentId: string;
  threadUrl: string;
  promptDigest: string;
  failureCode: "CURSOR_ARTIFACT_MISSING";
}
export interface CursorArtifactRecoveryV2Receipt extends CursorArtifactRecoveryReceipt {
  recoveryVersion: "words-writer1-artifact-recovery/v2";
  previousRecovery: CursorArtifactRecoveryFailureBinding;
}
export interface CursorArtifactRecoveryV2FailureBinding {
  recoveryVersion: "words-writer1-artifact-recovery/v2";
  actionRunId: string; artifactId: number; artifactDigest: string; sourceBranch: string; sourceSha: string;
  agentId: string; runId: string; threadUrl: string; promptDigest: string; failureCode: "WRITER1_OUTPUT_INVALID"; inputDigest: string;
}
export interface CursorArtifactRecoveryV3Receipt extends CursorArtifactRecoveryReceipt {
  recoveryVersion: "words-writer1-artifact-recovery/v3";
  previousRecoveryV2: CursorArtifactRecoveryV2FailureBinding;
  beforeArtifact: CursorArtifactBinding;
  afterArtifact: CursorArtifactBinding;
  copyProjectionDigest: string;
  metadataChangeDigest: string;
}
export interface CursorArtifactRecoveryV3FailureBinding {
  recoveryVersion: "words-writer1-artifact-recovery/v3";
  actionRunId: string; artifactId: number; artifactDigest: string; sourceBranch: string; sourceSha: string;
  agentId: string; runId: string; threadUrl: string; promptDigest: string; failureCode: "WRITER1_OUTPUT_INVALID"; inputDigest: string;
  beforeArtifact: CursorArtifactBinding; copyProjectionDigest: string;
}
export interface CursorArtifactRecoveryV3FinalizeReceipt extends CursorArtifactRecoveryReceipt {
  mode: "validation-only-artifact-recovery";
  recoveryVersion: "words-writer1-artifact-recovery/v3-finalize";
  previousRecoveryV3: CursorArtifactRecoveryV3FailureBinding;
  beforeArtifact: CursorArtifactBinding;
  afterArtifact: CursorArtifactBinding;
  renderedWordsDigest: string;
  stableIdentityDigest: string;
  provenanceMetadataDigest: string;
  crossV3CopyPreservation: "not-asserted";
}
export interface CursorArtifactDescriptor { path: string; size: number; sha256?: string; updatedAt?: string; }
export interface CursorArtifactClient {
  list(agentId: string, apiKey: string): Promise<CursorArtifactDescriptor[]>;
  download(agentId: string, artifactPath: string, apiKey: string): Promise<{ bytes: Buffer; sourceUrl: string; agentId: string; logicalPath: "artifacts/writer1-output.json"; cursorEndpoint: string; requestShapeDigest: string; downloadRequestDigest: string; presignedUrlEvidence: CursorPresignedUrlEvidence; presignedUrlEvidenceDigest: string }>;
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
function cursorAuthHeaders(apiKey: string): HeadersInit { return { Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`, Accept: "application/json" }; }
function approvedCursorArtifactUrl(value: string): URL {
  let url: URL; try { url = new URL(value); } catch { throw new CursorWriterExecutionError("CURSOR_ARTIFACT_REDIRECT_INVALID", "Cursor artifact download did not return a valid URL"); }
  const host = url.hostname.toLowerCase();
  const approvedHost = host === "s3.amazonaws.com" || host.endsWith(".s3.amazonaws.com") || /^s3[.-][a-z0-9-]+\.amazonaws\.com$/u.test(host) || /\.s3[.-][a-z0-9-]+\.amazonaws\.com$/u.test(host);
  const privateHost = host === "localhost" || host === "127.0.0.1" || host === "::1" || /^10\./u.test(host) || /^192\.168\./u.test(host) || /^172\.(?:1[6-9]|2\d|3[0-1])\./u.test(host);
  if (url.protocol !== "https:" || url.username || url.password || privateHost || !approvedHost || !url.pathname || url.pathname === "/" || url.pathname.includes("..") || url.pathname.length > 2048 || !url.search || !url.searchParams.has("X-Amz-Signature") || !url.searchParams.has("X-Amz-Algorithm")) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_REDIRECT_INVALID", "Cursor artifact download returned an invalid or unsigned S3 presigned URL");
  return url;
}
function artifactDownloadEndpoint(agentId: string, artifactPath: string): string {
  return `${CURSOR_CLOUD_API}/v1/agents/${encodeURIComponent(agentId)}/artifacts/download?path=${encodeURIComponent(artifactPath)}`;
}
function artifactRequestShape(agentId: string, artifactPath: "artifacts/writer1-output.json", cursorEndpoint: string): CursorArtifactDownloadRequest {
  return { agentId, logicalPath: artifactPath, cursorEndpoint, method: "GET", apiVersion: "cloud-agent-api-v1" };
}
function presignedUrlEvidence(url: URL): CursorPresignedUrlEvidence {
  const port = url.port ? Number(url.port) : undefined;
  return { scheme: "https", host: url.hostname.toLowerCase(), ...(port === undefined ? {} : { port }), pathname: url.pathname, queryParameterNames: [...url.searchParams.keys()].sort() };
}
function artifactDownloadDigest(request: CursorArtifactDownloadRequest, evidence: CursorPresignedUrlEvidence): string {
  return digestOf({ downloadRequest: request, presignedUrlEvidence: evidence });
}
async function readBoundedResponse(response: Response): Promise<Buffer> {
  const lengthHeader = response.headers.get("content-length");
  if (lengthHeader !== null) {
    if (!/^(?:0|[1-9]\d*)$/u.test(lengthHeader.trim()) || Number(lengthHeader) > MAX_WRITER1_ARTIFACT_BYTES) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_TOO_LARGE", `Cursor Writer1 artifact exceeds the ${MAX_WRITER1_ARTIFACT_BYTES}-byte cap`);
  }
  if (!response.body) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_DOWNLOAD_FAILED", "Cursor artifact download returned no response body");
  const reader = response.body.getReader(); const chunks: Buffer[] = []; let total = 0;
  try {
    while (true) {
      const next = await reader.read(); if (next.done) break;
      const chunk = Buffer.from(next.value); total += chunk.length;
      if (total > MAX_WRITER1_ARTIFACT_BYTES) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_TOO_LARGE", `Cursor Writer1 artifact exceeds the ${MAX_WRITER1_ARTIFACT_BYTES}-byte cap`);
      chunks.push(chunk);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks, total);
}
function normalizeArtifactDescriptors(payload: unknown): CursorArtifactDescriptor[] {
  const record = asRecord(payload); const raw = Array.isArray(payload) ? payload : record && Array.isArray(record.items) ? record.items : record && Array.isArray(record.artifacts) ? record.artifacts : undefined;
  if (!raw) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_LIST_INVALID", "Cursor artifact listing did not contain an items array");
  return raw.map((entry) => {
    const value = asRecord(entry); const size = value && typeof value.size === "number" ? value.size : value && typeof value.sizeBytes === "number" ? value.sizeBytes : undefined;
    if (!value || typeof value.path !== "string" || !value.path.trim() || typeof size !== "number" || !Number.isSafeInteger(size) || size < 1) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_LIST_INVALID", "Cursor artifact listing contains an invalid path or size");
    if (size > MAX_WRITER1_ARTIFACT_BYTES) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_TOO_LARGE", `Cursor Writer1 artifact exceeds the ${MAX_WRITER1_ARTIFACT_BYTES}-byte cap`);
    const descriptor: CursorArtifactDescriptor = { path: value.path, size };
    if (typeof value.sha256 === "string") descriptor.sha256 = value.sha256;
    const updatedAt = typeof value.updatedAt === "string" ? value.updatedAt : typeof value.updated_at === "string" ? value.updated_at : undefined;
    if (updatedAt && updatedAt.trim()) descriptor.updatedAt = updatedAt;
    return descriptor;
  });
}
export function createCursorArtifactClient(fetchImpl: typeof fetch = fetch): CursorArtifactClient {
  return {
    async list(agentId, apiKey) {
      const response = await fetchImpl(`${CURSOR_CLOUD_API}/v1/agents/${encodeURIComponent(agentId)}/artifacts`, { headers: cursorAuthHeaders(apiKey), redirect: "error" });
      if (!response.ok) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_LIST_FAILED", `Cursor artifact listing failed with ${response.status}`);
      return normalizeArtifactDescriptors(await response.json());
    },
    async download(agentId, artifactPath, apiKey) {
      if (artifactPath !== "artifacts/writer1-output.json") throw new CursorWriterExecutionError("CURSOR_ARTIFACT_PATH_INVALID", "Only artifacts/writer1-output.json may be recovered for Writer1");
      const endpoint = artifactDownloadEndpoint(agentId, artifactPath);
      const descriptorResponse = await fetchImpl(endpoint, { headers: cursorAuthHeaders(apiKey), redirect: "error" });
      if (!descriptorResponse.ok) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_REDIRECT_INVALID", `Cursor artifact URL request failed with ${descriptorResponse.status}`);
      const payload = asRecord(await descriptorResponse.json()); const location = payload && typeof payload.url === "string" ? payload.url : null;
      if (!location) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_REDIRECT_INVALID", "Cursor artifact URL request did not return a presigned URL");
      // Cursor returns an opaque S3 object URL. The client cannot prove that
      // the opaque S3 key mirrors the logical artifact path, so it never
      // invents that equality. Trust is bound to the authenticated Cursor
      // request, the exact URL Cursor returned, and the downloaded bytes.
      const approvedUrl = approvedCursorArtifactUrl(location);
      const sourceUrl = location;
      const urlEvidence = presignedUrlEvidence(approvedUrl);
      const downloadedResponse = await fetchImpl(sourceUrl, { redirect: "error" });
      if (!downloadedResponse.ok) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_DOWNLOAD_FAILED", `Cursor presigned artifact download failed with ${downloadedResponse.status}`);
      const bytes = await readBoundedResponse(downloadedResponse);
      const request = artifactRequestShape(agentId, artifactPath, endpoint);
      return { bytes, sourceUrl, agentId, logicalPath: artifactPath, cursorEndpoint: endpoint, requestShapeDigest: digestOf(request), downloadRequestDigest: artifactDownloadDigest(request, urlEvidence), presignedUrlEvidence: urlEvidence, presignedUrlEvidenceDigest: digestOf(urlEvidence) };
    },
  };
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
    artifactClient: createCursorArtifactClient(),
  };
}
function deterministicAgentId(key: string): string { const hex = createHash("sha256").update(key).digest("hex").slice(0, 32); return `bc-${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`; }
function resolvedModelOf(agent: SDKAgent, run: Run, result: unknown): unknown { const resultRecord = asRecord(result); const runModel = asRecord(run.model); const agentModel = asRecord(agent.model); return runModel?.id ?? (resultRecord && asRecord(resultRecord.model)?.id) ?? agentModel?.id; }
function outputOf(result: unknown): unknown { const value = asRecord(result); return value?.result ?? value?.output ?? result; }

export function validateCursorWriterFollowUpReceipt(receipt: unknown, prior: CursorFollowUpBindings, promptDigest: string, cursorApiKey?: string): asserts receipt is CursorFollowUpReceipt {
  validateCursorWriterReceipt(receipt, cursorApiKey);
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
  validateCursorWriterReceipt(input.priorReceipt, env.CURSOR_API_KEY);
  if (input.prior.priorJobId !== input.priorReceipt.jobId || input.prior.priorAgentId !== input.priorReceipt.agentId || input.prior.priorThreadUrl !== input.priorReceipt.threadUrl || input.prior.priorOutputDigest !== input.priorReceipt.outputDigest || input.prior.priorInputDigest !== input.priorReceipt.inputDigest || input.prior.priorPromptDigest !== input.priorReceipt.promptDigest || input.prior.priorRequestDigest !== input.priorReceipt.requestDigest) throw new CursorWriterExecutionError("CURSOR_PRIOR_BINDING_INVALID", "Prior Cursor receipt does not match the supplied artifact bindings");
  const transport = input.transport || await officialCloudTransport();
  const selection = resolveCursorModelSelection(await transport.listModels(env.CURSOR_API_KEY), requestedModel);
  const inputDigest = input.priorReceipt.inputDigest;
  const promptDigest = digestOf(input.prompt);
  const key = `${input.runId}:writer1:retrieval:v1:${input.prior.priorJobId}:${inputDigest}:${promptDigest}`;
  const existing = await input.receiptStore.get(key);
  if (existing) {
    validateCursorWriterFollowUpReceipt(existing, input.prior, promptDigest, env.CURSOR_API_KEY);
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
    if (settled) { validateCursorWriterFollowUpReceipt(settled, input.prior, promptDigest, env.CURSOR_API_KEY); const finishedClaim = await input.receiptStore.getClaim(key); if (!finishedClaim) throw new CursorWriterExecutionError("CURSOR_FOLLOW_UP_CLAIM_MISSING", "Completed Cursor follow-up has no durable correction claim"); return { output: settled.output, receipt: settled, threadUrl: settled.threadUrl, claim: finishedClaim }; }
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
  const receipt: CursorFollowUpReceipt = withReceiptIntegrityMac({ stage: "writer1", provider: CURSOR_PROVIDER, requestedModel: REQUIRED_CURSOR_MODEL, resolvedModel: OFFICIAL_CURSOR_MODEL, fast: false, jobId, agentId, threadUrl: record.url, inputDigest, promptDigest, outputDigest: digestOf(output), completedAt: now().toISOString(), status: "complete", output, requestDigest, createRequest: followUpRequest, registryItem: selection.registryItem, registryDigest: selection.registryDigest, modelParams: selection.params, effort: "high", ...(selection.effortParameterId ? { effortParameterId: selection.effortParameterId } : {}), effortAttestationSource, attestationSource, apiVersion: API_VERSION, mode: "same-thread-retrieval", correctionVersion: "words-writer1-retrieval/v1", prior: input.prior, followUpPromptDigest: promptDigest } as CursorFollowUpReceipt, env.CURSOR_API_KEY);
  validateCursorWriterFollowUpReceipt(receipt, input.prior, promptDigest, env.CURSOR_API_KEY);
  await input.receiptStore.put(key, receipt);
  activeClaim = { ...activeClaim, phase: "completed", heartbeatAt: now().toISOString(), leaseUntil: new Date(now().getTime() + 30_000).toISOString() };
  await input.receiptStore.putClaim(key, activeClaim);
  return { output, receipt, threadUrl: record.url, claim: activeClaim };
}

function artifactSha256(bytes: Buffer): string { return `sha256:${createHash("sha256").update(bytes).digest("hex")}`; }
/** Metadata-only recovery freezes every non-provenance field, including route, review, quote, claim, and copy values. */
export function writer1CopyProjection(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(writer1CopyProjection);
  const record = asRecord(value);
  if (!record) return value;
  return Object.fromEntries(Object.entries(record).filter(([key]) => key !== "provenance").map(([key, child]) => [key, writer1CopyProjection(child)]));
}
export function writer1CopyProjectionDigest(value: unknown): string { return digestOf(writer1CopyProjection(value)); }

type Writer1DigestDomain = "renderedWords" | "stableIdentity" | "provenanceMetadata";
export const WRITER1_WORD_KEYS = new Set(["primaryKeyword", "title", "seoTitle", "metaDescription", "h1", "body", "heading", "quote", "excerpt", "exactText", "attribution", "reviewer", "author", "claim", "statement", "text"]);
export const WRITER1_IDENTITY_KEYS = new Set(["url", "route", "type", "prescriptionId", "pageId", "serviceId", "canonicalServiceId", "canonicalIntentId", "sourceServiceId", "reviewId", "sourceReviewId", "evidenceId", "refId", "claimId", "stableId", "stableRef", "id"]);
export const WRITER1_PROVENANCE_KEYS = new Set(["type", "ref", "stableRef", "placement", "section", "pointer", "pointerLedger", "placementMetadata", "ledger", "status", "foldedInto", "allowedParentCanonicalId", "directEvidenceReviewIds", "reviewIds", "supportingReviewIds"]);
export const WRITER1_PROVENANCE_OBJECT_KEYS = new Set(["provenance", "pointer", "pointerLedger", "placementMetadata", "ledger"]);

function writer1DigestProjection(value: unknown, domain: Writer1DigestDomain, inProvenance = false): unknown {
  if (Array.isArray(value)) {
    const projected = value.map((child) => writer1DigestProjection(child, domain, inProvenance));
    return projected.some((child) => child !== undefined) ? projected : undefined;
  }
  const record = asRecord(value);
  if (!record) return undefined;
  const projected: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(record)) {
    const childInProvenance = inProvenance || WRITER1_PROVENANCE_OBJECT_KEYS.has(key);
    const selected = domain === "renderedWords"
      ? WRITER1_WORD_KEYS.has(key)
      : domain === "stableIdentity"
        ? WRITER1_IDENTITY_KEYS.has(key) && !(inProvenance && (key === "ref" || key === "stableRef" || key === "type"))
        : WRITER1_PROVENANCE_KEYS.has(key) && (inProvenance || WRITER1_PROVENANCE_OBJECT_KEYS.has(key));
    if (selected) {
      const childProjection = Array.isArray(child)
        ? child.map((item) => {
          const itemProjection = writer1DigestProjection(item, domain, childInProvenance);
          return itemProjection === undefined && (typeof item === "string" || typeof item === "number" || typeof item === "boolean" || item === null) ? item : itemProjection;
        })
        : writer1DigestProjection(child, domain, childInProvenance);
      projected[key] = childProjection === undefined && (typeof child === "string" || typeof child === "number" || typeof child === "boolean" || child === null) ? child : childProjection;
      continue;
    }
    const nested = writer1DigestProjection(child, domain, childInProvenance);
    if (nested !== undefined && (typeof nested === "object" || Array.isArray(nested))) projected[key] = nested;
  }
  return Object.keys(projected).length > 0 ? projected : undefined;
}

export function writer1RenderedWordsProjection(value: unknown): unknown { return writer1DigestProjection(value, "renderedWords") ?? null; }
export function writer1StableIdentityProjection(value: unknown): unknown { return writer1DigestProjection(value, "stableIdentity") ?? null; }
export function writer1ProvenanceMetadataProjection(value: unknown): unknown { return writer1DigestProjection(value, "provenanceMetadata") ?? null; }
export function writer1RenderedWordsDigest(value: unknown): string { return digestOf(writer1RenderedWordsProjection(value)); }
export function writer1StableIdentityDigest(value: unknown): string { return digestOf(writer1StableIdentityProjection(value)); }
export function writer1ProvenanceMetadataDigest(value: unknown): string { return digestOf(writer1ProvenanceMetadataProjection(value)); }
export function writer1OutputDigests(value: unknown): { renderedWordsDigest: string; stableIdentityDigest: string; provenanceMetadataDigest: string } {
  return { renderedWordsDigest: writer1RenderedWordsDigest(value), stableIdentityDigest: writer1StableIdentityDigest(value), provenanceMetadataDigest: writer1ProvenanceMetadataDigest(value) };
}
export function writer1MetadataChangeDigest(beforeArtifactDigest: string, afterArtifactDigest: string, copyProjectionDigest: string): string {
  return digestOf({ beforeArtifactDigest, afterArtifactDigest, copyProjectionDigest });
}
async function readWriter1Artifact(input: { client: CursorArtifactClient; agentId: string; apiKey: string; validateOutput?: (raw: string) => unknown }): Promise<{ output: unknown; raw: string; bytes: Buffer; artifact: CursorArtifactBinding }> {
  const descriptors = await input.client.list(input.agentId, input.apiKey);
  const matches = descriptors.filter((descriptor) => descriptor.path === "artifacts/writer1-output.json");
  if (matches.length > 1) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_RACE", "Cursor returned multiple artifacts at artifacts/writer1-output.json");
  if (matches.length === 0) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_MISSING", "Cursor agent has no artifacts/writer1-output.json artifact");
  const descriptor = matches[0]; if (!descriptor) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_MISSING", "Cursor agent has no artifacts/writer1-output.json artifact");
  if (descriptor.size > MAX_WRITER1_ARTIFACT_BYTES) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_TOO_LARGE", `Cursor Writer1 artifact exceeds the ${MAX_WRITER1_ARTIFACT_BYTES}-byte cap`);
  const downloaded = await input.client.download(input.agentId, descriptor.path, input.apiKey);
  const downloadedUrl = approvedCursorArtifactUrl(downloaded.sourceUrl);
  const expectedUrlEvidence = presignedUrlEvidence(downloadedUrl);
  const expectedPath = descriptor.path as "artifacts/writer1-output.json";
  const expectedEndpoint = artifactDownloadEndpoint(input.agentId, expectedPath);
  const expectedRequest = artifactRequestShape(input.agentId, expectedPath, expectedEndpoint);
  if (downloaded.agentId !== input.agentId || downloaded.logicalPath !== descriptor.path || downloaded.cursorEndpoint !== expectedEndpoint) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_REQUEST_BINDING_INVALID", "Cursor artifact download did not bind to the listed agent, logical path, and Cursor endpoint");
  if (downloaded.requestShapeDigest !== digestOf(expectedRequest) || JSON.stringify(downloaded.presignedUrlEvidence) !== JSON.stringify(expectedUrlEvidence) || downloaded.presignedUrlEvidenceDigest !== digestOf(expectedUrlEvidence) || downloaded.downloadRequestDigest !== artifactDownloadDigest(expectedRequest, expectedUrlEvidence)) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_REQUEST_BINDING_INVALID", "Cursor artifact download request or sanitized presigned URL evidence digest is invalid");
  if (downloaded.bytes.length > MAX_WRITER1_ARTIFACT_BYTES) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_TOO_LARGE", `Cursor Writer1 artifact exceeds the ${MAX_WRITER1_ARTIFACT_BYTES}-byte cap`);
  if (downloaded.bytes.length !== descriptor.size) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_SIZE_MISMATCH", "Cursor artifact size changed between listing and download");
  const sha256 = artifactSha256(downloaded.bytes);
  if (descriptor.sha256 && descriptor.sha256 !== sha256) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_DIGEST_MISMATCH", "Cursor artifact listing digest does not match downloaded bytes");
  const raw = downloaded.bytes.toString("utf8");
  const output = input.validateOutput ? input.validateOutput(raw) : raw;
  return { output, raw, bytes: downloaded.bytes, artifact: { path: "artifacts/writer1-output.json", size: downloaded.bytes.length, sha256, contentSize: downloaded.bytes.length, byteDigest: sha256, ...(descriptor.updatedAt ? { updatedAt: descriptor.updatedAt } : {}), downloadRequest: expectedRequest, requestShapeDigest: downloaded.requestShapeDigest, downloadRequestDigest: downloaded.downloadRequestDigest, presignedUrlEvidence: downloaded.presignedUrlEvidence, presignedUrlEvidenceDigest: downloaded.presignedUrlEvidenceDigest } };
}

export interface CursorArtifactValidationReportInspection {
  raw: string;
  rawBytes: Buffer;
  artifact: CursorArtifactBinding;
  parsed?: unknown;
  parseError?: string;
  copyProjectionDigest?: string;
  renderedWordsDigest?: string;
  stableIdentityDigest?: string;
  provenanceMetadataDigest?: string;
  copyProjectionMatches: boolean;
  stale: boolean;
}

export type CursorArtifactValidationReportInput = {
  prior: CursorArtifactRecoveryPrior;
  previousRecoveryV3: CursorArtifactRecoveryV3FailureBinding;
  promptDigest: string;
};

type CursorArtifactValidationReportInternalInput = CursorArtifactValidationReportInput & {
  env?: Record<string, string | undefined>;
  artifactClient?: CursorArtifactClient;
  sleep?: (milliseconds: number) => Promise<void>;
  artifactBackoffMs?: readonly number[];
};

async function inspectCursorWriterArtifactV3Internal(input: CursorArtifactValidationReportInternalInput): Promise<CursorArtifactValidationReportInspection> {
  const env = input.env || process.env;
  if (!env.CURSOR_API_KEY) throw new CursorWriterExecutionError("CURSOR_API_KEY_REQUIRED", "Validation report requires CURSOR_API_KEY");
  if (input.promptDigest !== input.previousRecoveryV3.promptDigest) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_REPORT_PROMPT_MISMATCH", "Validation report prompt digest is not bound to the exact v3-finalize history");
  const artifactClient = input.artifactClient || createCursorArtifactClient();
  const recovered = await readWriter1ArtifactWithBackoff({
    client: artifactClient,
    agentId: input.prior.agentId,
    apiKey: env.CURSOR_API_KEY,
    validateOutput: (raw) => raw,
    ...(input.sleep ? { sleep: input.sleep } : {}),
    ...(input.artifactBackoffMs ? { backoffMs: input.artifactBackoffMs } : {}),
  });
  const raw = typeof recovered.output === "string" ? recovered.output : String(recovered.output);
  let parsed: unknown;
  let parseError: string | undefined;
  try { parsed = JSON.parse(raw); } catch { parseError = "OUTPUT_INVALID_JSON"; }
  const copyProjectionDigest = parsed === undefined ? undefined : writer1CopyProjectionDigest(parsed);
  const outputDigests = parsed === undefined ? undefined : writer1OutputDigests(parsed);
  const before = input.previousRecoveryV3.beforeArtifact;
  return {
    raw,
    rawBytes: recovered.bytes,
    artifact: recovered.artifact,
    ...(parsed === undefined ? {} : { parsed }),
    ...(parseError ? { parseError } : {}),
    ...(copyProjectionDigest ? { copyProjectionDigest } : {}),
    ...(outputDigests ? outputDigests : {}),
    copyProjectionMatches: copyProjectionDigest === input.previousRecoveryV3.copyProjectionDigest,
    stale: recovered.artifact.sha256 === before.sha256 && recovered.artifact.updatedAt === before.updatedAt,
  };
}

/** Production validation reports are read-only: process.env and the fixed Cursor artifact client are sealed here. */
export async function inspectCursorWriterArtifactV3(input: CursorArtifactValidationReportInput): Promise<CursorArtifactValidationReportInspection> {
  const candidate = input as unknown as Record<string, unknown>;
  if ("env" in candidate || "artifactClient" in candidate || "transport" in candidate) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_CLIENT_SUBSTITUTION_FORBIDDEN", "Production validation reports do not accept caller-selected environment, transport, or artifact client");
  return inspectCursorWriterArtifactV3Internal({ ...input, env: process.env, artifactClient: createCursorArtifactClient() });
}

/** Test-only/internal seam. No production control input can select this injected client. */
export async function inspectCursorWriterArtifactV3ForTest(input: CursorArtifactValidationReportInternalInput): Promise<CursorArtifactValidationReportInspection> {
  if (process.env.NODE_ENV !== "test" && !process.execArgv.some((arg) => arg.includes("--test"))) throw new CursorWriterExecutionError("CURSOR_TEST_SEAM_FORBIDDEN", "Injected validation-report clients are available only from the Node test boundary");
  return inspectCursorWriterArtifactV3Internal(input);
}

const ARTIFACT_RECOVERY_EVENTUAL_CONSISTENCY_BACKOFF_MS = [1_000, 5_000, 15_000, 30_000, 60_000, 120_000] as const;
async function readWriter1ArtifactWithBackoff(input: { client: CursorArtifactClient; agentId: string; apiKey: string; validateOutput?: (raw: string) => unknown; sleep?: (milliseconds: number) => Promise<void>; backoffMs?: readonly number[] }): Promise<{ output: unknown; raw: string; bytes: Buffer; artifact: CursorArtifactBinding }> {
  const sleep = input.sleep || ((milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  const backoffMs = input.backoffMs || ARTIFACT_RECOVERY_EVENTUAL_CONSISTENCY_BACKOFF_MS;
  for (let attempt = 0; ; attempt += 1) {
    try { return await readWriter1Artifact(input); } catch (error) {
      if (!(error instanceof CursorWriterExecutionError) || error.code !== "CURSOR_ARTIFACT_MISSING" || attempt >= backoffMs.length) throw error;
      await sleep(backoffMs[attempt] || 0);
    }
  }
}

function artifactBindingIsValid(binding: CursorArtifactBinding | undefined, agentId: string): boolean {
  if (!binding || binding.path !== "artifacts/writer1-output.json" || !Number.isSafeInteger(binding.size) || binding.size < 1 || binding.size > MAX_WRITER1_ARTIFACT_BYTES || binding.contentSize !== binding.size || !DIGEST.test(binding.sha256) || binding.byteDigest !== binding.sha256) return false;
  const evidence = binding.presignedUrlEvidence;
  const host = typeof evidence?.host === "string" && (evidence.host === "s3.amazonaws.com" || evidence.host.endsWith(".s3.amazonaws.com") || /^s3[.-][a-z0-9-]+\.amazonaws\.com$/u.test(evidence.host) || /\.s3[.-][a-z0-9-]+\.amazonaws\.com$/u.test(evidence.host));
  const saneUrl = !!evidence && evidence.scheme === "https" && host && typeof evidence.pathname === "string" && evidence.pathname.length > 1 && evidence.pathname.length <= 2048 && !evidence.pathname.includes("..") && Array.isArray(evidence.queryParameterNames) && evidence.queryParameterNames.length > 0 && evidence.queryParameterNames.every((name: unknown) => typeof name === "string" && /^[A-Za-z0-9_.-]{1,128}$/u.test(name)) && JSON.stringify(evidence.queryParameterNames) === JSON.stringify([...evidence.queryParameterNames].sort());
  const expected = artifactRequestShape(agentId, binding.path, artifactDownloadEndpoint(agentId, binding.path));
  return !!saneUrl && JSON.stringify(binding.downloadRequest) === JSON.stringify(expected) && binding.requestShapeDigest === digestOf(binding.downloadRequest) && binding.downloadRequestDigest === artifactDownloadDigest(binding.downloadRequest, evidence) && binding.presignedUrlEvidenceDigest === digestOf(evidence);
}

function validateCursorArtifactRecoveryReceiptVersion(receipt: unknown, prior: CursorArtifactRecoveryPrior, promptDigest: string, cursorApiKey: string | undefined, expectedVersion: "words-writer1-artifact-recovery/v1" | "words-writer1-artifact-recovery/v2" | "words-writer1-artifact-recovery/v3" | "words-writer1-artifact-recovery/v3-finalize", previousRecovery?: CursorArtifactRecoveryFailureBinding, previousRecoveryV2?: CursorArtifactRecoveryV2FailureBinding, previousRecoveryV3?: CursorArtifactRecoveryV3FailureBinding, expectedCurrentArtifactByteDigest?: string, expectedCurrentArtifactUpdatedAt?: string): asserts receipt is CursorArtifactRecoveryReceipt {
  if (expectedVersion === "words-writer1-artifact-recovery/v3-finalize") validateValidationOnlyCursorReceipt(receipt, prior, cursorApiKey); else validateCursorWriterReceipt(receipt, cursorApiKey);
  const value = receipt as CursorArtifactRecoveryReceipt;
  const expectedMode = expectedVersion === "words-writer1-artifact-recovery/v3-finalize" ? "validation-only-artifact-recovery" : "same-thread-artifact-recovery";
  if (value.mode !== expectedMode || value.recoveryVersion !== expectedVersion) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_RECEIPT_INVALID", "Cursor receipt is not the expected Writer1 artifact-recovery version");
  const evidence = value.artifact?.presignedUrlEvidence;
  const approvedEvidenceHost = typeof evidence?.host === "string" && (evidence.host === "s3.amazonaws.com" || evidence.host.endsWith(".s3.amazonaws.com") || /^s3[.-][a-z0-9-]+\.amazonaws\.com$/u.test(evidence.host) || /\.s3[.-][a-z0-9-]+\.amazonaws\.com$/u.test(evidence.host));
  const saneEvidence = !!evidence && evidence.scheme === "https" && approvedEvidenceHost && typeof evidence.pathname === "string" && evidence.pathname.length > 1 && evidence.pathname.length <= 2048 && !evidence.pathname.includes("..") && Array.isArray(evidence.queryParameterNames) && evidence.queryParameterNames.length > 0 && evidence.queryParameterNames.every((name: unknown) => typeof name === "string" && /^[A-Za-z0-9_.-]{1,128}$/u.test(name)) && JSON.stringify(evidence.queryParameterNames) === JSON.stringify([...evidence.queryParameterNames].sort());
  const expectedRequest = value.artifact?.path === "artifacts/writer1-output.json" ? artifactRequestShape(prior.agentId, "artifacts/writer1-output.json", artifactDownloadEndpoint(prior.agentId, "artifacts/writer1-output.json")) : undefined;
  if (!value.artifact || value.artifact.path !== "artifacts/writer1-output.json" || !Number.isSafeInteger(value.artifact.size) || value.artifact.size < 1 || value.artifact.size > MAX_WRITER1_ARTIFACT_BYTES || value.artifact.contentSize !== value.artifact.size || typeof value.artifact.sha256 !== "string" || !DIGEST.test(value.artifact.sha256) || value.artifact.byteDigest !== value.artifact.sha256 || !value.artifact.downloadRequest || JSON.stringify(value.artifact.downloadRequest) !== JSON.stringify(expectedRequest) || value.artifact.requestShapeDigest !== digestOf(value.artifact.downloadRequest) || !saneEvidence || value.artifact.presignedUrlEvidenceDigest !== digestOf(evidence) || typeof value.artifact.downloadRequestDigest !== "string" || value.artifact.downloadRequestDigest !== artifactDownloadDigest(value.artifact.downloadRequest, evidence)) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_RECEIPT_INVALID", "Cursor artifact receipt path, size, byte, sanitized URL evidence, or request binding is invalid");
  if (!value.recoveryPrior || JSON.stringify(value.recoveryPrior) !== JSON.stringify(prior)) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_RECEIPT_BINDING_INVALID", "Cursor artifact receipt lost the prior dispatch/source bindings");
  if ((expectedVersion !== "words-writer1-artifact-recovery/v3-finalize" && value.followUpPromptDigest !== promptDigest) || value.promptDigest !== promptDigest || value.inputDigest !== prior.inputDigest || value.agentId !== prior.agentId || value.threadUrl !== prior.threadUrl || value.recoveryRunId !== value.jobId) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_RECEIPT_BINDING_INVALID", "Cursor artifact receipt is not bound to the requested Writer1 recovery");
  if (value.jobId !== prior.runId && !String(value.jobId).startsWith("run-")) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_RECEIPT_BINDING_INVALID", "Cursor artifact receipt recovery run ID is invalid");
  if (expectedVersion === "words-writer1-artifact-recovery/v2" && (!previousRecovery || JSON.stringify(value.previousRecovery) !== JSON.stringify(previousRecovery))) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_RECEIPT_BINDING_INVALID", "Cursor v2 artifact receipt lost the failed v1 recovery binding");
  if (expectedVersion === "words-writer1-artifact-recovery/v3" || expectedVersion === "words-writer1-artifact-recovery/v3-finalize") {
    const v3 = value as CursorArtifactRecoveryV3Receipt;
    const before = v3.beforeArtifact;
    if (expectedVersion === "words-writer1-artifact-recovery/v3" && (!previousRecoveryV2 || JSON.stringify(v3.previousRecoveryV2) !== JSON.stringify(previousRecoveryV2))) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_RECEIPT_BINDING_INVALID", "Cursor v3 artifact receipt lost the exact failed-v2 binding");
    if (!before || !v3.afterArtifact || JSON.stringify(v3.afterArtifact) !== JSON.stringify(v3.artifact)) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_RECEIPT_BINDING_INVALID", "Cursor v3 artifact receipt lost the before/after artifact binding");
    if (!artifactBindingIsValid(before, prior.agentId) || !artifactBindingIsValid(v3.afterArtifact, prior.agentId)) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_RECEIPT_INVALID", "Cursor v3 before/after artifact binding is invalid");
    if (v3.afterArtifact.sha256 === before.sha256 && v3.afterArtifact.updatedAt === before.updatedAt) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_RECEIPT_STALE", "Cursor v3 accepted the unchanged invalid artifact");
    if (expectedVersion === "words-writer1-artifact-recovery/v3") {
      if (typeof v3.copyProjectionDigest !== "string" || v3.copyProjectionDigest !== writer1CopyProjectionDigest(v3.output)) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_COPY_PROJECTION_MISMATCH", "Cursor v3 completed receipt copy projection digest is not recomputable");
      if (v3.metadataChangeDigest !== writer1MetadataChangeDigest(before.sha256, v3.afterArtifact.sha256, v3.copyProjectionDigest)) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_METADATA_CHANGE_INVALID", "Cursor v3 metadata-change digest is not recomputable");
    }
    if (expectedVersion === "words-writer1-artifact-recovery/v3-finalize") {
      const finalize = value as CursorArtifactRecoveryV3FinalizeReceipt;
      if (!previousRecoveryV3 || JSON.stringify(finalize.previousRecoveryV3) !== JSON.stringify(previousRecoveryV3) || JSON.stringify(before) !== JSON.stringify(previousRecoveryV3.beforeArtifact) || finalize.jobId !== prior.runId || finalize.recoveryRunId !== prior.runId || finalize.crossV3CopyPreservation !== "not-asserted" || typeof finalize.renderedWordsDigest !== "string" || finalize.renderedWordsDigest !== writer1RenderedWordsDigest(finalize.output) || typeof finalize.stableIdentityDigest !== "string" || finalize.stableIdentityDigest !== writer1StableIdentityDigest(finalize.output) || typeof finalize.provenanceMetadataDigest !== "string" || finalize.provenanceMetadataDigest !== writer1ProvenanceMetadataDigest(finalize.output) || !expectedCurrentArtifactByteDigest || finalize.afterArtifact.byteDigest !== expectedCurrentArtifactByteDigest || !expectedCurrentArtifactUpdatedAt || finalize.afterArtifact.updatedAt !== expectedCurrentArtifactUpdatedAt || finalize.afterArtifact.byteDigest === before.byteDigest) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_RECEIPT_BINDING_INVALID", "Cursor v3-finalize receipt lost the current artifact, three digest, or explicit cross-v3 preservation binding");
    }
  }
}

export function validateCursorArtifactRecoveryReceipt(receipt: unknown, prior: CursorArtifactRecoveryPrior, promptDigest: string, cursorApiKey?: string): asserts receipt is CursorArtifactRecoveryReceipt {
  validateCursorArtifactRecoveryReceiptVersion(receipt, prior, promptDigest, cursorApiKey, "words-writer1-artifact-recovery/v1");
}
export function validateCursorArtifactRecoveryV2Receipt(receipt: unknown, prior: CursorArtifactRecoveryPrior, previousRecovery: CursorArtifactRecoveryFailureBinding, promptDigest: string, cursorApiKey?: string): asserts receipt is CursorArtifactRecoveryV2Receipt {
  validateCursorArtifactRecoveryReceiptVersion(receipt, prior, promptDigest, cursorApiKey, "words-writer1-artifact-recovery/v2", previousRecovery);
}
export function validateCursorArtifactRecoveryV3Receipt(receipt: unknown, prior: CursorArtifactRecoveryPrior, previousRecoveryV2: CursorArtifactRecoveryV2FailureBinding, promptDigest: string, cursorApiKey?: string): asserts receipt is CursorArtifactRecoveryV3Receipt {
  validateCursorArtifactRecoveryReceiptVersion(receipt, prior, promptDigest, cursorApiKey, "words-writer1-artifact-recovery/v3", undefined, previousRecoveryV2);
}
export function validateCursorArtifactRecoveryV3FinalizeReceipt(receipt: unknown, prior: CursorArtifactRecoveryPrior, previousRecoveryV3: CursorArtifactRecoveryV3FailureBinding, promptDigest: string, cursorApiKey: string | undefined, expectedCurrentArtifactByteDigest: string, expectedCurrentArtifactUpdatedAt: string): asserts receipt is CursorArtifactRecoveryV3FinalizeReceipt {
  validateCursorArtifactRecoveryReceiptVersion(receipt, prior, promptDigest, cursorApiKey, "words-writer1-artifact-recovery/v3-finalize", undefined, undefined, previousRecoveryV3, expectedCurrentArtifactByteDigest, expectedCurrentArtifactUpdatedAt);
}

type CursorArtifactRecoveryInternalInput = {
  env?: Record<string, string | undefined>;
  receiptStore: CursorWriterReceiptStore;
  prior: CursorArtifactRecoveryPrior;
  recoveryVersion?: "words-writer1-artifact-recovery/v1" | "words-writer1-artifact-recovery/v2" | "words-writer1-artifact-recovery/v3";
  previousRecovery?: CursorArtifactRecoveryFailureBinding;
  previousRecoveryV2?: CursorArtifactRecoveryV2FailureBinding;
  prompt: string;
  now?: () => Date;
  sleep?: (milliseconds: number) => Promise<void>;
  artifactBackoffMs?: readonly number[];
  transport?: CloudTransport;
  artifactClient?: CursorArtifactClient;
  onFollowUp?: (notice: CursorDispatchNotice) => void | Promise<void>;
  validateOutput: (raw: string) => unknown;
  validateBeforeOutput?: (raw: string) => unknown;
};
type CursorArtifactRecoveryResult = { output: unknown; receipt: CursorArtifactRecoveryReceipt; threadUrl: string; claim: CursorDispatchClaim };

async function recoverCursorWriterArtifactInternal(input: CursorArtifactRecoveryInternalInput): Promise<CursorArtifactRecoveryResult> {
  const env = input.env || process.env;
  const recoveryVersion = input.recoveryVersion || "words-writer1-artifact-recovery/v1";
  if (recoveryVersion === "words-writer1-artifact-recovery/v2" && !input.previousRecovery) throw new CursorWriterExecutionError("CURSOR_PRIOR_RECOVERY_BINDING_REQUIRED", "Writer1 artifact recovery v2 requires the verified failed v1 recovery binding");
  if (recoveryVersion === "words-writer1-artifact-recovery/v3" && !input.previousRecoveryV2) throw new CursorWriterExecutionError("CURSOR_PRIOR_RECOVERY_V2_BINDING_REQUIRED", "Writer1 artifact recovery v3 requires the verified failed v2 recovery binding");
  const now = input.now || (() => new Date());
  const requestedModel = env.CURSOR_MODEL;
  const fastRaw = env.CURSOR_FAST;
  const fast = fastRaw === "false" || fastRaw === "off" ? false : fastRaw;
  validateCursorWriterRuntime({ provider: CURSOR_PROVIDER, requestedModel, fast });
  if (!env.CURSOR_API_KEY) throw new CursorWriterExecutionError("CURSOR_API_KEY_REQUIRED", "Cloud Cursor artifact recovery requires CURSOR_API_KEY");
  if (typeof input.prompt !== "string" || !input.prompt.trim()) throw new CursorWriterExecutionError("CURSOR_PROMPT_REQUIRED", "Writer artifact recovery requires a non-empty prompt");
  if (input.prior.agentId !== "bc-30fc8ffa-2005-44b9-8fc7-48ddd9c3bcc8" || input.prior.runId !== "run-b0341a7a-9f03-4dec-b76d-7350ba1e82f2" || input.prior.threadUrl !== `https://cursor.com/agents/${input.prior.agentId}`) throw new CursorWriterExecutionError("CURSOR_PRIOR_BINDING_INVALID", "Writer artifact recovery prior agent/thread/run binding is not the approved canary");
  const transport = input.transport || await officialCloudTransport();
  const artifactClient = input.artifactClient || transport.artifactClient || createCursorArtifactClient();
  const selection = resolveCursorModelSelection(await transport.listModels(env.CURSOR_API_KEY), requestedModel);
  if (selection.officialId !== input.prior.resolvedModel || selection.registryDigest !== input.prior.registryDigest || JSON.stringify(selection.params) !== JSON.stringify(input.prior.modelParams) || input.prior.requestedModel !== REQUIRED_CURSOR_MODEL || input.prior.effort !== "high" || input.prior.fast !== false) throw new CursorWriterExecutionError("CURSOR_PRIOR_MODEL_BINDING_INVALID", "Prior dispatch model, effort, fast, or registry binding does not match the current official Cursor registry");
  const inputDigest = input.prior.inputDigest;
  const promptDigest = digestOf(input.prompt);
  const isV2 = recoveryVersion === "words-writer1-artifact-recovery/v2";
  const isV3 = recoveryVersion === "words-writer1-artifact-recovery/v3";
  if (isV3 && (input.previousRecoveryV2!.agentId !== input.prior.agentId || input.previousRecoveryV2!.threadUrl !== input.prior.threadUrl || input.previousRecoveryV2!.inputDigest !== inputDigest)) throw new CursorWriterExecutionError("CURSOR_PRIOR_RECOVERY_V2_BINDING_INVALID", "Writer1 v3 recovery is not bound to the exact failed v2 agent, thread, or sealed input");
  const recoveryKeyBase = isV2 ? input.previousRecovery!.runId : isV3 ? input.previousRecoveryV2!.runId : input.prior.runId;
  const recoveryTag = isV3 ? "v3" : isV2 ? "v2" : "v1";
  const key = `${recoveryKeyBase}:writer1:artifact-recovery:${recoveryTag}:${inputDigest}:${promptDigest}`;
  const options = modelOptions(env.CURSOR_API_KEY, selection);
  const recoveryRequest = createRequest(options, input.prompt, key, input.prior.agentId);
  const requestDigest = digestOf(recoveryRequest);
  const validateCompletedReceipt = (receipt: unknown): void => {
    if (isV3) validateCursorArtifactRecoveryV3Receipt(receipt, input.prior, input.previousRecoveryV2!, promptDigest, env.CURSOR_API_KEY);
    else if (isV2) validateCursorArtifactRecoveryV2Receipt(receipt, input.prior, input.previousRecovery!, promptDigest, env.CURSOR_API_KEY);
    else validateCursorArtifactRecoveryReceipt(receipt, input.prior, promptDigest, env.CURSOR_API_KEY);
  };
  const existing = await input.receiptStore.get(key);
  if (existing) {
    validateCompletedReceipt(existing);
    const recovered = await readWriter1Artifact({ client: artifactClient, agentId: input.prior.agentId, apiKey: env.CURSOR_API_KEY, validateOutput: input.validateOutput });
    const completed = existing as CursorArtifactRecoveryReceipt;
    if (JSON.stringify(recovered.artifact) !== JSON.stringify(isV3 ? (completed as CursorArtifactRecoveryV3Receipt).afterArtifact : completed.artifact)) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_RACE", "Cursor artifact or download binding changed after the completed recovery receipt");
    if (isV3 && writer1CopyProjectionDigest(recovered.output) !== (completed as CursorArtifactRecoveryV3Receipt).copyProjectionDigest) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_COPY_PROJECTION_MISMATCH", "Cursor v3 artifact changed after the completed receipt");
    const claim = await input.receiptStore.getClaim?.(key); if (!claim) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_CLAIM_MISSING", "Completed Cursor artifact recovery has no durable claim");
    return { output: recovered.output, receipt: { ...completed, output: recovered.output }, threadUrl: completed.threadUrl, claim };
  }
  if (!input.receiptStore.tryClaim || !input.receiptStore.getClaim || !input.receiptStore.putClaim) throw new CursorWriterExecutionError("CURSOR_DISPATCH_CLAIM_REQUIRED", "Cursor artifact recovery requires an atomic durable claim store");

  let preexisting: { output: unknown; artifact: CursorArtifactBinding } | undefined;
  try { preexisting = await readWriter1Artifact({ client: artifactClient, agentId: input.prior.agentId, apiKey: env.CURSOR_API_KEY, validateOutput: isV3 ? (input.validateBeforeOutput || ((raw) => JSON.parse(raw))) : input.validateOutput }); } catch (error) {
    if (isV3) {
      if (error instanceof CursorWriterExecutionError && error.code === "CURSOR_ARTIFACT_MISSING") throw new CursorWriterExecutionError("CURSOR_V3_PRIOR_ARTIFACT_MISSING", "Writer1 v3 cannot repair metadata without downloading the existing invalid artifact");
      throw error;
    }
    // Only a genuinely absent descriptor permits the single same-thread
    // follow-up. A present but invalid artifact is evidence of a broken or
    // stale delivery and must fail closed before claiming or sending.
    if (!(error instanceof CursorWriterExecutionError) || error.code !== "CURSOR_ARTIFACT_MISSING") throw error;
  }
  const priorClaim = await input.receiptStore.getClaim?.(key);
  const initialClaim: CursorDispatchClaim = { key, stage: "writer1", runId: input.prior.runId, inputDigest, promptDigest, ownerToken: `${process.pid}:${now().getTime()}:${Math.random()}`, requestedAgentId: input.prior.agentId, claimedAt: now().toISOString(), heartbeatAt: now().toISOString(), leaseUntil: new Date(now().getTime() + 30_000).toISOString(), phase: "claimed", ...(isV3 && (priorClaim?.recoveryBeforeArtifact || preexisting) ? { recoveryBeforeArtifact: priorClaim?.recoveryBeforeArtifact || preexisting!.artifact, copyProjectionDigest: priorClaim?.copyProjectionDigest || writer1CopyProjectionDigest(preexisting!.output) } : {}) };
  let claimed = await input.receiptStore.tryClaim(key, initialClaim);
  let activeClaim = claimed.claim;
  if (!claimed.acquired) {
    const settled = await input.receiptStore.get(key);
    if (settled) { validateCompletedReceipt(settled); const recovered = await readWriter1Artifact({ client: artifactClient, agentId: input.prior.agentId, apiKey: env.CURSOR_API_KEY, validateOutput: input.validateOutput }); const finishedClaim = await input.receiptStore.getClaim(key); if (!finishedClaim) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_CLAIM_MISSING", "Completed Cursor artifact recovery has no durable claim"); return { output: recovered.output, receipt: { ...settled, output: recovered.output } as CursorArtifactRecoveryReceipt, threadUrl: settled.threadUrl, claim: finishedClaim }; }
    throw new CursorWriterExecutionError("CURSOR_DISPATCH_IN_PROGRESS", "Another worker owns the live Cursor artifact recovery claim; caller must reconcile before retrying", { key, phase: activeClaim.phase || "claimed" });
  }
  if (preexisting && !isV3) {
    const noSendJobId = isV2 ? input.previousRecovery!.runId : input.prior.runId;
    const receipt: CursorArtifactRecoveryReceipt = withReceiptIntegrityMac({ stage: "writer1", provider: CURSOR_PROVIDER, requestedModel: REQUIRED_CURSOR_MODEL, resolvedModel: OFFICIAL_CURSOR_MODEL, fast: false, jobId: noSendJobId, agentId: input.prior.agentId, threadUrl: input.prior.threadUrl, inputDigest, promptDigest, outputDigest: digestOf(preexisting.output), completedAt: now().toISOString(), status: "complete", output: preexisting.output, requestDigest, createRequest: recoveryRequest, registryItem: selection.registryItem, registryDigest: selection.registryDigest, modelParams: selection.params, effort: "high", ...(selection.effortParameterId ? { effortParameterId: selection.effortParameterId } : {}), effortAttestationSource: input.prior.effortAttestationSource, attestationSource: "bound-create-request", apiVersion: API_VERSION, mode: "same-thread-artifact-recovery", recoveryVersion, artifact: preexisting.artifact, recoveryRunId: noSendJobId, recoveryPrior: input.prior, ...(input.previousRecovery ? { previousRecovery: input.previousRecovery } : {}), followUpPromptDigest: promptDigest } as CursorArtifactRecoveryReceipt, env.CURSOR_API_KEY);
    validateCompletedReceipt(receipt); await input.receiptStore.put(key, receipt); activeClaim = { ...activeClaim, agentId: input.prior.agentId, jobId: noSendJobId, phase: "completed", heartbeatAt: now().toISOString(), leaseUntil: new Date(now().getTime() + 30_000).toISOString() }; await input.receiptStore.putClaim(key, activeClaim); return { output: receipt.output, receipt, threadUrl: receipt.threadUrl, claim: activeClaim };
  }
  const beforeArtifact = isV3 ? activeClaim.recoveryBeforeArtifact || preexisting?.artifact : undefined;
  const beforeCopyProjectionDigest = isV3 ? activeClaim.copyProjectionDigest || (preexisting ? writer1CopyProjectionDigest(preexisting.output) : undefined) : undefined;
  if (isV3 && (!beforeArtifact || !beforeCopyProjectionDigest)) throw new CursorWriterExecutionError("CURSOR_V3_BEFORE_BINDING_MISSING", "Writer1 v3 cannot continue without the persisted pre-repair artifact and copy projection binding");
  let agent: SDKAgent; let run: Run; let jobId: string;
  if (activeClaim.phase === "follow-up-sending" || (activeClaim.agentId && !activeClaim.jobId)) throw new CursorWriterExecutionError("CURSOR_FOLLOW_UP_RUN_ID_MISSING", "Cursor artifact recovery will not risk a duplicate follow-up without its persisted run ID");
  if (activeClaim.agentId && activeClaim.jobId) {
    if (activeClaim.agentId !== input.prior.agentId) throw new CursorWriterExecutionError("CURSOR_FOLLOW_UP_AGENT_MISMATCH", "A recovery claim is bound to a different Cursor agent");
    agent = await transport.resume(input.prior.agentId, options);
    if (!transport.getRun) throw new CursorWriterExecutionError("CURSOR_RUN_REATTACH_REQUIRED", "Interrupted Cursor artifact recovery cannot reattach without the official durable run lookup");
    run = await transport.getRun(input.prior.agentId, activeClaim.jobId, env.CURSOR_API_KEY);
    jobId = activeClaim.jobId;
  } else {
    activeClaim = { ...activeClaim, phase: "follow-up-sending", heartbeatAt: now().toISOString(), leaseUntil: new Date(now().getTime() + 30_000).toISOString() }; await input.receiptStore.putClaim(key, activeClaim);
    agent = await transport.resume(input.prior.agentId, options);
    if (!options.model) throw new CursorWriterExecutionError("CURSOR_MODEL_REQUIRED", "Cursor artifact recovery requires the exact verified model selection");
    run = await agent.send(input.prompt, { model: options.model, idempotencyKey: key });
    jobId = String(run.id);
    activeClaim = { ...activeClaim, agentId: input.prior.agentId, jobId, phase: "follow-up-sent", heartbeatAt: now().toISOString(), leaseUntil: new Date(now().getTime() + 30_000).toISOString() }; await input.receiptStore.putClaim(key, activeClaim);
    if (input.onFollowUp) await input.onFollowUp({ stage: "writer1", provider: CURSOR_PROVIDER, requestedModel: REQUIRED_CURSOR_MODEL, officialModel: selection.officialId, modelParams: selection.params, registryDigest: selection.registryDigest, effort: selection.effort, effortAttestationSource: selection.effortAttestationSource, fast: false, agentId: input.prior.agentId, jobId, threadUrl: input.prior.threadUrl, inputDigest, promptDigest, requestDigest, dispatchedAt: now().toISOString() });
  }
  const agentId = String(agent.agentId); if (agentId !== input.prior.agentId || jobId === "" || (jobId === input.prior.runId && activeClaim.phase !== "completed")) throw new CursorWriterExecutionError("CURSOR_FOLLOW_UP_BINDING_INVALID", "Cursor artifact recovery returned the wrong agent or prior run ID");
  const record = await transport.getAgent(agentId, env.CURSOR_API_KEY); if (record.id !== input.prior.agentId || record.url !== input.prior.threadUrl) throw new CursorWriterExecutionError("CURSOR_FOLLOW_UP_THREAD_MISMATCH", "Cursor artifact recovery changed the existing agent thread"); assertThreadUrl(record.url, agentId);
  activeClaim = { ...activeClaim, agentId, jobId, phase: "waiting", heartbeatAt: now().toISOString(), leaseUntil: new Date(now().getTime() + 30_000).toISOString() }; await input.receiptStore.putClaim(key, activeClaim);
  const result = await run.wait();
  const resolvedModel = resolvedModelOf(agent, run, result); validateCursorWriterRuntime({ provider: CURSOR_PROVIDER, requestedModel, resolvedModel, fast: false }); if (resolvedModel !== OFFICIAL_CURSOR_MODEL) throw new CursorWriterExecutionError("CURSOR_RESOLVED_MODEL_MISSING", "Cursor artifact recovery did not attest the required resolved model");
  const recovered = recoveryVersion === "words-writer1-artifact-recovery/v2" || isV3
    ? await readWriter1ArtifactWithBackoff({ client: artifactClient, agentId, apiKey: env.CURSOR_API_KEY, validateOutput: input.validateOutput, ...(input.sleep ? { sleep: input.sleep } : {}), ...(input.artifactBackoffMs ? { backoffMs: input.artifactBackoffMs } : {}) })
    : await readWriter1Artifact({ client: artifactClient, agentId, apiKey: env.CURSOR_API_KEY, validateOutput: input.validateOutput });
  const copyProjectionDigest = isV3 ? writer1CopyProjectionDigest(recovered.output) : undefined;
  if (isV3 && (recovered.artifact.sha256 === beforeArtifact!.sha256 && recovered.artifact.updatedAt === beforeArtifact!.updatedAt || copyProjectionDigest !== beforeCopyProjectionDigest)) throw new CursorWriterExecutionError(copyProjectionDigest !== beforeCopyProjectionDigest ? "CURSOR_V3_COPY_PROJECTION_CHANGED" : "CURSOR_V3_ARTIFACT_STALE", copyProjectionDigest !== beforeCopyProjectionDigest ? "Writer1 v3 copy projection changed; metadata-only repair cannot change words or evidence" : "Writer1 v3 artifact is stale and was not updated");
  const attestationSource = assertFastBound(options, [agent, run, result]); const effortAttestationSource = assertEffortBound(selection, [agent, run, result]);
  const receipt: CursorArtifactRecoveryReceipt = withReceiptIntegrityMac({ stage: "writer1", provider: CURSOR_PROVIDER, requestedModel: REQUIRED_CURSOR_MODEL, resolvedModel: OFFICIAL_CURSOR_MODEL, fast: false, jobId, agentId, threadUrl: record.url, inputDigest, promptDigest, outputDigest: digestOf(recovered.output), completedAt: now().toISOString(), status: "complete", output: recovered.output, requestDigest, createRequest: recoveryRequest, registryItem: selection.registryItem, registryDigest: selection.registryDigest, modelParams: selection.params, effort: "high", ...(selection.effortParameterId ? { effortParameterId: selection.effortParameterId } : {}), effortAttestationSource, attestationSource, apiVersion: API_VERSION, mode: "same-thread-artifact-recovery", recoveryVersion, artifact: recovered.artifact, recoveryRunId: jobId, recoveryPrior: input.prior, ...(input.previousRecovery ? { previousRecovery: input.previousRecovery } : {}), ...(isV3 ? { previousRecoveryV2: input.previousRecoveryV2, beforeArtifact: beforeArtifact!, afterArtifact: recovered.artifact, copyProjectionDigest: copyProjectionDigest!, metadataChangeDigest: writer1MetadataChangeDigest(beforeArtifact!.sha256, recovered.artifact.sha256, copyProjectionDigest!) } : {}), followUpPromptDigest: promptDigest } as CursorArtifactRecoveryReceipt, env.CURSOR_API_KEY);
  validateCompletedReceipt(receipt); await input.receiptStore.put(key, receipt); activeClaim = { ...activeClaim, phase: "completed", heartbeatAt: now().toISOString(), leaseUntil: new Date(now().getTime() + 30_000).toISOString() }; await input.receiptStore.putClaim(key, activeClaim); return { output: receipt.output, receipt, threadUrl: record.url, claim: activeClaim };
}

export type CursorArtifactRecoveryInput = Omit<CursorArtifactRecoveryInternalInput, "transport" | "artifactClient" | "env">;

/** Production recovery owns both network seams; control input cannot replace them. */
export async function recoverCursorWriterArtifact(input: CursorArtifactRecoveryInput): Promise<CursorArtifactRecoveryResult> {
  const candidate = input as unknown as Record<string, unknown>;
  if ("env" in candidate) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_ENV_SUBSTITUTION_FORBIDDEN", "Production artifact recovery reads process.env and does not accept caller-supplied environment");
  if ("transport" in candidate || "artifactClient" in candidate) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_CLIENT_SUBSTITUTION_FORBIDDEN", "Production artifact recovery does not accept caller-supplied Cursor transports or artifact clients");
  const transport = await officialCloudTransport();
  return recoverCursorWriterArtifactInternal({ ...input, env: process.env, transport, artifactClient: createCursorArtifactClient() });
}

export type CursorArtifactRecoveryV2Input = Omit<CursorArtifactRecoveryInput, "recoveryVersion" | "previousRecovery"> & {
  recoveryVersion: "words-writer1-artifact-recovery/v2";
  previousRecovery: CursorArtifactRecoveryFailureBinding;
};

/** Production v2 recovery always uses the fixed Cursor SDK transport and process.env. */
export async function recoverCursorWriterArtifactV2(input: CursorArtifactRecoveryV2Input): Promise<CursorArtifactRecoveryResult> {
  const candidate = input as unknown as Record<string, unknown>;
  if ("env" in candidate) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_ENV_SUBSTITUTION_FORBIDDEN", "Production artifact recovery reads process.env and does not accept caller-supplied environment");
  if ("transport" in candidate || "artifactClient" in candidate) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_CLIENT_SUBSTITUTION_FORBIDDEN", "Production artifact recovery does not accept caller-supplied Cursor transports or artifact clients");
  const transport = await officialCloudTransport();
  return recoverCursorWriterArtifactInternal({ ...input, env: process.env, transport, artifactClient: createCursorArtifactClient() });
}

export type CursorArtifactRecoveryV3Input = Omit<CursorArtifactRecoveryInput, "recoveryVersion" | "previousRecovery" | "previousRecoveryV2" | "validateBeforeOutput"> & {
  recoveryVersion: "words-writer1-artifact-recovery/v3";
  previousRecoveryV2: CursorArtifactRecoveryV2FailureBinding;
};

/** Production v3 recovery uses only the fixed Cursor SDK transport and process.env. */
export async function recoverCursorWriterArtifactV3(input: CursorArtifactRecoveryV3Input): Promise<CursorArtifactRecoveryResult> {
  const candidate = input as unknown as Record<string, unknown>;
  if ("env" in candidate) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_ENV_SUBSTITUTION_FORBIDDEN", "Production artifact recovery reads process.env and does not accept caller-supplied environment");
  if ("transport" in candidate || "artifactClient" in candidate) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_CLIENT_SUBSTITUTION_FORBIDDEN", "Production artifact recovery does not accept caller-supplied Cursor transports or artifact clients");
  const transport = await officialCloudTransport();
  return recoverCursorWriterArtifactInternal({ ...input, env: process.env, transport, artifactClient: createCursorArtifactClient(), validateBeforeOutput: (raw) => JSON.parse(raw) });
}

/** Test-only/internal seam. Production scripts cannot select this path by control input or environment. */
export async function recoverCursorWriterArtifactForTest(input: CursorArtifactRecoveryInternalInput): Promise<CursorArtifactRecoveryResult> {
  if (process.env.NODE_ENV !== "test" && !process.execArgv.some((arg) => arg.includes("--test"))) throw new CursorWriterExecutionError("CURSOR_TEST_SEAM_FORBIDDEN", "Injected artifact recovery transports are available only from the Node test boundary");
  return recoverCursorWriterArtifactInternal(input);
}

export async function recoverCursorWriterArtifactV2ForTest(input: CursorArtifactRecoveryInternalInput & { recoveryVersion: "words-writer1-artifact-recovery/v2"; previousRecovery: CursorArtifactRecoveryFailureBinding }): Promise<CursorArtifactRecoveryResult> {
  if (process.env.NODE_ENV !== "test" && !process.execArgv.some((arg) => arg.includes("--test"))) throw new CursorWriterExecutionError("CURSOR_TEST_SEAM_FORBIDDEN", "Injected artifact recovery transports are available only from the Node test boundary");
  return recoverCursorWriterArtifactInternal(input);
}

export async function recoverCursorWriterArtifactV3ForTest(input: CursorArtifactRecoveryInternalInput & { recoveryVersion: "words-writer1-artifact-recovery/v3"; previousRecoveryV2: CursorArtifactRecoveryV2FailureBinding; validateBeforeOutput?: (raw: string) => unknown }): Promise<CursorArtifactRecoveryResult> {
  if (process.env.NODE_ENV !== "test" && !process.execArgv.some((arg) => arg.includes("--test"))) throw new CursorWriterExecutionError("CURSOR_TEST_SEAM_FORBIDDEN", "Injected artifact recovery transports are available only from the Node test boundary");
  return recoverCursorWriterArtifactInternal(input);
}

export type CursorArtifactRecoveryV3FinalizeInput = Omit<CursorArtifactRecoveryInput, "recoveryVersion" | "previousRecovery" | "previousRecoveryV2" | "prompt" | "validateOutput" | "validateBeforeOutput"> & {
  recoveryVersion: "words-writer1-artifact-recovery/v3-finalize";
  previousRecoveryV3: CursorArtifactRecoveryV3FailureBinding;
  promptDigest: string;
  expectedCurrentArtifactByteDigest: string;
  expectedCurrentArtifactUpdatedAt: string;
  validateOutput?: (output: unknown) => void;
};

type CursorArtifactRecoveryV3FinalizeInternalInput = CursorArtifactRecoveryV3FinalizeInput & {
  env?: Record<string, string | undefined>;
  artifactClient?: CursorArtifactClient;
};

async function finalizeCursorWriterArtifactV3Internal(input: CursorArtifactRecoveryV3FinalizeInternalInput): Promise<CursorArtifactRecoveryResult> {
  const env = input.env || process.env;
  if (!env.CURSOR_API_KEY) throw new CursorWriterExecutionError("CURSOR_API_KEY_REQUIRED", "Validation-only Cursor artifact finalization requires CURSOR_API_KEY");
  if (input.recoveryVersion !== "words-writer1-artifact-recovery/v3-finalize") throw new CursorWriterExecutionError("CURSOR_ARTIFACT_FINALIZE_VERSION_INVALID", "Cursor v3-finalize requires its exact recovery version");
  const promptDigest = input.promptDigest;
  if (!DIGEST.test(promptDigest)) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_FINALIZE_PROMPT_INVALID", "Cursor v3-finalize requires a bound prompt digest");
  const key = `${input.prior.runId}:writer1:artifact-recovery:v3-finalize:${input.prior.inputDigest}:${promptDigest}`;
  const artifactClient = input.artifactClient || createCursorArtifactClient();
  const validateOutput = input.validateOutput;
  if (!validateOutput) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_VALIDATOR_REQUIRED", "Validation-only Cursor artifact finalization requires the strict Writer1 validator");
  const existing = await input.receiptStore.get(key);
  if (existing) {
    validateCursorArtifactRecoveryV3FinalizeReceipt(existing, input.prior, input.previousRecoveryV3, promptDigest, env.CURSOR_API_KEY, input.expectedCurrentArtifactByteDigest, input.expectedCurrentArtifactUpdatedAt);
    const recovered = await readWriter1Artifact({ client: artifactClient, agentId: input.prior.agentId, apiKey: env.CURSOR_API_KEY, validateOutput });
    const completed = existing as CursorArtifactRecoveryV3FinalizeReceipt;
    const recoveredDigests = writer1OutputDigests(recovered.output);
    if (JSON.stringify(recovered.artifact) !== JSON.stringify(completed.afterArtifact) || recoveredDigests.renderedWordsDigest !== completed.renderedWordsDigest || recoveredDigests.stableIdentityDigest !== completed.stableIdentityDigest || recoveredDigests.provenanceMetadataDigest !== completed.provenanceMetadataDigest) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_RACE", "Cursor v3-finalize artifact or digest projection changed after the completed receipt");
    const claim = await input.receiptStore.getClaim?.(key); if (!claim) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_CLAIM_MISSING", "Completed Cursor v3-finalize has no durable claim");
    return { output: recovered.output, receipt: { ...completed, output: recovered.output }, threadUrl: completed.threadUrl, claim };
  }
  if (!input.receiptStore.tryClaim || !input.receiptStore.getClaim || !input.receiptStore.putClaim) throw new CursorWriterExecutionError("CURSOR_DISPATCH_CLAIM_REQUIRED", "Cursor v3-finalize requires an atomic durable claim store");
  const now = input.now || (() => new Date());
  const claim: CursorDispatchClaim = { key, stage: "writer1", runId: input.prior.runId, inputDigest: input.prior.inputDigest, promptDigest, ownerToken: `${process.pid}:${now().getTime()}:${Math.random()}`, requestedAgentId: input.prior.agentId, claimedAt: now().toISOString(), heartbeatAt: now().toISOString(), leaseUntil: new Date(now().getTime() + 30_000).toISOString(), phase: "claimed" };
  const claimed = await input.receiptStore.tryClaim(key, claim);
  if (!claimed.acquired) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_FINALIZE_IN_PROGRESS", "Another validation-only Cursor artifact finalization owns the durable claim");
  // This path intentionally has no CloudTransport. It can only list/download
  // through the authenticated Cursor artifact client; Agent.create, resume,
  // send, and run.wait are structurally unreachable.
  const recovered = await readWriter1Artifact({ client: artifactClient, agentId: input.prior.agentId, apiKey: env.CURSOR_API_KEY, validateOutput });
  const before = input.previousRecoveryV3.beforeArtifact;
  if (recovered.artifact.sha256 === before.sha256 && recovered.artifact.updatedAt === before.updatedAt) throw new CursorWriterExecutionError("CURSOR_V3_ARTIFACT_STALE", "Cursor v3-finalize found the stale unchanged pre-repair artifact");
  if (recovered.artifact.byteDigest !== input.expectedCurrentArtifactByteDigest || recovered.artifact.updatedAt !== input.expectedCurrentArtifactUpdatedAt) throw new CursorWriterExecutionError("CURSOR_V3_CURRENT_ARTIFACT_BINDING_INVALID", "Cursor v3-finalize did not receive the exact diagnostic current artifact binding");
  if (recovered.artifact.byteDigest === before.byteDigest || (before.updatedAt && recovered.artifact.updatedAt && Date.parse(recovered.artifact.updatedAt) <= Date.parse(before.updatedAt))) throw new CursorWriterExecutionError("CURSOR_V3_ARTIFACT_STALE", "Cursor v3-finalize current artifact is not newer than the pinned v3-before artifact");
  const outputDigests = writer1OutputDigests(recovered.output);
  const receipt = withReceiptIntegrityMac({ stage: "writer1", provider: CURSOR_PROVIDER, requestedModel: REQUIRED_CURSOR_MODEL, resolvedModel: OFFICIAL_CURSOR_MODEL, fast: false, jobId: input.prior.runId, agentId: input.prior.agentId, threadUrl: input.prior.threadUrl, inputDigest: input.prior.inputDigest, promptDigest, outputDigest: digestOf(recovered.output), completedAt: now().toISOString(), status: "complete", output: recovered.output, requestDigest: input.prior.requestDigest, createRequest: { apiVersion: API_VERSION, mode: "validation-only-artifact-recovery", agentId: input.prior.agentId, runId: input.prior.runId }, registryItem: { id: OFFICIAL_CURSOR_MODEL, validationOnly: true }, registryDigest: input.prior.registryDigest, modelParams: input.prior.modelParams, effort: "high", effortAttestationSource: input.prior.effortAttestationSource, attestationSource: "official-response", apiVersion: API_VERSION, mode: "validation-only-artifact-recovery", recoveryVersion: "words-writer1-artifact-recovery/v3-finalize", artifact: recovered.artifact, recoveryRunId: input.prior.runId, recoveryPrior: input.prior, previousRecoveryV3: input.previousRecoveryV3, beforeArtifact: before, afterArtifact: recovered.artifact, ...outputDigests, crossV3CopyPreservation: "not-asserted" } as unknown as CursorArtifactRecoveryV3FinalizeReceipt, env.CURSOR_API_KEY);
  validateCursorArtifactRecoveryV3FinalizeReceipt(receipt, input.prior, input.previousRecoveryV3, promptDigest, env.CURSOR_API_KEY, input.expectedCurrentArtifactByteDigest, input.expectedCurrentArtifactUpdatedAt);
  const completedClaim = { ...claimed.claim, agentId: input.prior.agentId, jobId: input.prior.runId, phase: "completed" as const, heartbeatAt: now().toISOString(), leaseUntil: new Date(now().getTime() + 30_000).toISOString() };
  await input.receiptStore.put(key, receipt);
  await input.receiptStore.putClaim(key, completedClaim);
  return { output: recovered.output, receipt, threadUrl: input.prior.threadUrl, claim: completedClaim };
}

/** Production v3-finalize owns process.env and the fixed Cursor artifact client. */
export async function finalizeCursorWriterArtifactV3(input: CursorArtifactRecoveryV3FinalizeInput): Promise<CursorArtifactRecoveryResult> {
  const candidate = input as unknown as Record<string, unknown>;
  if ("env" in candidate || "transport" in candidate || "artifactClient" in candidate) throw new CursorWriterExecutionError("CURSOR_ARTIFACT_CLIENT_SUBSTITUTION_FORBIDDEN", "Production v3-finalize does not accept caller-selected environment, transport, or artifact client");
  return finalizeCursorWriterArtifactV3Internal({ ...input, env: process.env, artifactClient: createCursorArtifactClient() });
}

export async function finalizeCursorWriterArtifactV3ForTest(input: CursorArtifactRecoveryV3FinalizeInternalInput): Promise<CursorArtifactRecoveryResult> {
  if (process.env.NODE_ENV !== "test" && !process.execArgv.some((arg) => arg.includes("--test"))) throw new CursorWriterExecutionError("CURSOR_TEST_SEAM_FORBIDDEN", "Injected v3-finalize seams are available only from the Node test boundary");
  return finalizeCursorWriterArtifactV3Internal(input);
}

async function dispatchWithTransport(input: { transport: CloudTransport; env: Record<string, string | undefined>; receiptStore: CursorWriterReceiptStore; now: () => Date; onDispatch?: (notice: CursorDispatchNotice) => void | Promise<void>; validateOutput?: (output: unknown) => void }, stage: CursorWriterStage, payload: unknown, prompt: string, runId: string): Promise<{ output: unknown; receipt: CursorWriterReceipt; threadUrl: string; claim?: CursorDispatchClaim }> {
  const requestedModel = input.env.CURSOR_MODEL; const fastRaw = input.env.CURSOR_FAST; const fast = fastRaw === "false" || fastRaw === "off" ? false : fastRaw; validateCursorWriterRuntime({ provider: CURSOR_PROVIDER, requestedModel, fast });
  if (!input.env.CURSOR_API_KEY) throw new CursorWriterExecutionError("CURSOR_API_KEY_REQUIRED", "Cloud Cursor production requires CURSOR_API_KEY");
  if (typeof prompt !== "string" || !prompt.trim()) throw new CursorWriterExecutionError("CURSOR_PROMPT_REQUIRED", "Writer dispatch requires a non-empty prompt");
  const selection = resolveCursorModelSelection(await input.transport.listModels(input.env.CURSOR_API_KEY), requestedModel);
  const inputDigest = digestOf(payload); const promptDigest = digestOf(prompt); const key = `${runId}:${stage}:${inputDigest}:${promptDigest}`; const requestedAgentId = deterministicAgentId(key);
  const existing = await input.receiptStore.get(key);
  if (existing) { if (existing.stage !== stage || existing.inputDigest !== inputDigest || existing.promptDigest !== promptDigest) throw new CursorWriterExecutionError("CURSOR_RECEIPT_BINDING_MISMATCH", "Existing Cursor receipt is bound to different writer input"); if (existing.status === "complete") { validateCursorWriterReceipt(existing, input.env.CURSOR_API_KEY); if (input.validateOutput) input.validateOutput(existing.output); return { output: existing.output, receipt: existing, threadUrl: existing.threadUrl }; } validatePendingReceipt(existing); }
  if (!input.receiptStore.tryClaim || !input.receiptStore.getClaim || !input.receiptStore.putClaim) throw new CursorWriterExecutionError("CURSOR_DISPATCH_CLAIM_REQUIRED", "Production Cursor dispatch requires an atomic durable claim store");
  const claim: CursorDispatchClaim = { key, stage, runId, inputDigest, promptDigest, ownerToken: `${process.pid}:${input.now().getTime()}:${Math.random()}`, requestedAgentId, claimedAt: input.now().toISOString(), heartbeatAt: input.now().toISOString(), leaseUntil: new Date(input.now().getTime() + 30_000).toISOString(), phase: "claimed" }; const claimed = await input.receiptStore.tryClaim(key, claim); let activeClaim = claimed.claim;
  if (!claimed.acquired) {
    const settled = await input.receiptStore.get(key);
    if (settled?.status === "complete") { validateCursorWriterReceipt(settled, input.env.CURSOR_API_KEY); if (input.validateOutput) input.validateOutput(settled.output); const finishedClaim = await input.receiptStore.getClaim(key); return { output: settled.output, receipt: settled, threadUrl: settled.threadUrl, ...(finishedClaim ? { claim: finishedClaim } : {}) }; }
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
  const output = outputOf(result); if (input.validateOutput) input.validateOutput(output); const attestationSource = assertFastBound(options, [agent, run, result]); const effortAttestationSource = assertEffortBound(selection, [agent, run, result]); const receipt: CursorWriterReceipt = withReceiptIntegrityMac({ stage, provider: CURSOR_PROVIDER, requestedModel: REQUIRED_CURSOR_MODEL, resolvedModel: OFFICIAL_CURSOR_MODEL, fast: false, jobId, agentId, threadUrl: record.url, inputDigest, promptDigest, outputDigest: digestOf(output), completedAt: input.now().toISOString(), status: "complete", output, requestDigest, createRequest: request, registryItem: selection.registryItem, registryDigest: selection.registryDigest, modelParams: selection.params, effort: "high", ...(selection.effortParameterId ? { effortParameterId: selection.effortParameterId } : {}), effortAttestationSource, attestationSource, apiVersion: API_VERSION } as CursorWriterReceipt, input.env.CURSOR_API_KEY || ""); validateCursorWriterReceipt(receipt, input.env.CURSOR_API_KEY); await input.receiptStore.put(key, receipt); activeClaim = { ...activeClaim, phase: "completed", heartbeatAt: input.now().toISOString(), leaseUntil: new Date(input.now().getTime() + 30_000).toISOString() }; await input.receiptStore.putClaim(key, activeClaim); return { output, receipt, threadUrl: record.url, claim: activeClaim };
}
export function createCursorWriterExecutor(input: { env?: Record<string, string | undefined>; receiptStore: CursorWriterReceiptStore; now?: () => Date; onDispatch?: (notice: CursorDispatchNotice) => void | Promise<void>; validateOutput?: (output: unknown) => void }): CursorWriterExecutor {
  if (!input || !input.receiptStore) throw new CursorWriterExecutionError("CURSOR_RECEIPT_STORE_REQUIRED", "A durable Cursor receipt/claim store is required"); const env = input.env || process.env; const now = input.now || (() => new Date()); const transportPromise = officialCloudTransport();
  const dispatch = (stage: CursorWriterStage, payload: unknown, prompt: string, runId = "unknown-run") => transportPromise.then((transport) => dispatchWithTransport({ transport, env, receiptStore: input.receiptStore, now, ...(input.onDispatch ? { onDispatch: input.onDispatch } : {}), ...(input.validateOutput ? { validateOutput: input.validateOutput } : {}) }, stage, payload, prompt, runId)); return { provider: CURSOR_PROVIDER, dispatch, [EXECUTOR_BRAND]: true as const };
}
/** Explicit test-only network seam. It is intentionally not exported from pipeline/index.ts. */
export function createCursorWriterExecutorForTest(input: { transport: CursorTestTransport; env?: Record<string, string | undefined>; receiptStore: CursorWriterReceiptStore; now?: () => Date; validateOutput?: (output: unknown) => void }): CursorWriterExecutor {
  if (process.env.NODE_ENV !== "test" && !process.execArgv.some((arg) => arg.includes("--test"))) throw new CursorWriterExecutionError("CURSOR_TEST_SEAM_FORBIDDEN", "The injected Cursor transport is available only from the Node test boundary");
  if (!input?.transport || typeof input.transport.listModels !== "function" || typeof input.transport.create !== "function" || typeof input.transport.resume !== "function" || typeof input.transport.getAgent !== "function" || !input.receiptStore) throw new CursorWriterExecutionError("CURSOR_TEST_SEAM_INVALID", "The test-only Cursor model registry transport and claim store are required");
  const env = input.env || process.env; const now = input.now || (() => new Date());
  return { provider: CURSOR_PROVIDER, dispatch: (stage, payload, prompt, runId = "test-run") => dispatchWithTransport({ transport: input.transport, env, receiptStore: input.receiptStore, now, ...(input.validateOutput ? { validateOutput: input.validateOutput } : {}) }, stage, payload, prompt, runId), [EXECUTOR_BRAND]: true as const };
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
