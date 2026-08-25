import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  createCursorArtifactClient,
  createCursorWriterExecutorForTest,
  createMemoryCursorReceiptStore,
  OFFICIAL_CURSOR_MODEL,
  recoverCursorWriterArtifact,
  recoverCursorWriterArtifactForTest,
  recoverCursorWriterArtifactV2ForTest,
  recoverCursorWriterArtifactV3ForTest,
  finalizeCursorWriterArtifactV3ForTest,
  inspectCursorWriterArtifactV3,
  inspectCursorWriterArtifactV3ForTest,
  retrieveCursorWriterOutput,
  validateCursorArtifactRecoveryReceipt,
  validateCursorArtifactRecoveryV2Receipt,
  validateCursorArtifactRecoveryV3Receipt,
  validateCursorArtifactRecoveryV3FinalizeReceipt,
  writer1CopyProjectionDigest,
  writer1OutputDigests,
  writer1RenderedWordsDigest,
  writer1StableIdentityDigest,
  writer1ProvenanceMetadataDigest,
  validateCursorWriterFollowUpReceipt,
  type CursorArtifactRecoveryInput,
  type CursorArtifactClient,
  type CursorArtifactRecoveryPrior,
  type CursorArtifactRecoveryFailureBinding,
  type CursorArtifactRecoveryV2FailureBinding,
  type CursorArtifactRecoveryV3FailureBinding,
  type CursorTestTransport,
  type CursorFollowUpBindings,
} from "./cursor-writer.js";
import { digestOf } from "../contracts/digests.js";
import { digestWriter1ArtifactRecoveryPrompt } from "../../scripts/360-words-recovery-prompt.mjs";

type PublicRecoveryInputHasNoEnv = "env" extends keyof CursorArtifactRecoveryInput ? never : true;
const publicRecoveryInputHasNoEnv: PublicRecoveryInputHasNoEnv = true;
void publicRecoveryInputHasNoEnv;

const agentId = "bc-972b63b0-6e43-4c76-805d-b95a0ba13da8";
const priorJobId = "run-a59d6e17-3ce0-4c0f-8231-597d5b15382b";
const followUpJobId = "run-follow-up-360-writer1";
const threadUrl = `https://cursor.com/agents/${agentId}`;
const env = { CURSOR_API_KEY: "test-key", CURSOR_MODEL: "cursor-grok-4.6-high", CURSOR_FAST: "false" };
const registry = { items: [{ id: OFFICIAL_CURSOR_MODEL, parameters: [{ id: "fast", values: [{ value: "false" }, { value: "true" }] }, { id: "effort", values: [{ value: "high" }] }] }] };
const fullOutput = JSON.stringify({
  schemaVersion: "words-writer1-output/v1",
  pages: [
    { type: "service", url: "/garage-door-repair", seoTitle: "Repair", metaDescription: "Repair", h1: "Repair", sections: [{ heading: "Repair", body: "Repair copy" }], reviewPlacements: [{ reviewId: "review-repair", quote: "The repair was excellent.", attribution: "Chris" }] },
    { type: "service", url: "/garage-door-installation", seoTitle: "Installation", metaDescription: "Installation", h1: "Installation", sections: [{ heading: "Installation", body: "Installation copy" }], reviewPlacements: [{ reviewId: "review-install", quote: "The installation was excellent.", attribution: "Marcie" }] },
  ],
});

function makeRun(id: string, output: unknown) {
  return { id, agentId, model: { id: OFFICIAL_CURSOR_MODEL }, wait: async () => ({ status: "finished", result: output, model: { id: OFFICIAL_CURSOR_MODEL } }) } as any;
}

function initialTransport(counters: { creates: number } = { creates: 0 }): CursorTestTransport {
  const agent = { agentId, model: { id: OFFICIAL_CURSOR_MODEL }, send: async () => makeRun(priorJobId, { result: "prior summary" }) } as any;
  return {
    listModels: async () => registry,
    create: async () => { counters.creates += 1; return { agent, run: makeRun(priorJobId, { result: "prior summary" }) }; },
    resume: async () => agent,
    getAgent: async () => ({ id: agentId, url: threadUrl }),
    getRun: async () => makeRun(priorJobId, { result: "prior summary" }),
  };
}

function followUpTransport(counters: { creates: number; resumes: number; sends: number }, output: unknown = fullOutput): CursorTestTransport {
  return {
    listModels: async () => registry,
    create: async () => { counters.creates += 1; throw new Error("Agent.create must never be used by Writer1 retrieval"); },
    resume: async (id) => {
      counters.resumes += 1;
      assert.equal(id, agentId);
      return { agentId, model: { id: OFFICIAL_CURSOR_MODEL }, send: async (prompt: string, options: any) => { counters.sends += 1; assert.match(prompt, /return that complete artifact verbatim/u); assert.deepEqual(options.model, { id: OFFICIAL_CURSOR_MODEL, params: [{ id: "fast", value: "false" }, { id: "effort", value: "high" }] }); return makeRun(followUpJobId, output); } } as any;
    },
    getAgent: async (id) => ({ id, url: threadUrl }),
    getRun: async () => makeRun(followUpJobId, output),
  };
}

async function priorReceipt() {
  const store = createMemoryCursorReceiptStore();
  const initialCounters = { creates: 0 };
  const initial = await createCursorWriterExecutorForTest({ transport: initialTransport(initialCounters), receiptStore: store, env }).dispatch("writer1", { approved: ["/garage-door-repair", "/garage-door-installation"] }, "initial Writer1", "32717620900");
  assert.equal(initialCounters.creates, 1, "the separate initial dispatch path must retain Agent.create");
  const prior: CursorFollowUpBindings = { priorActionRunId: "32776170549", priorArtifactId: 9539302493, priorRunId: "32717620900", priorJobId, priorAgentId: agentId, priorThreadUrl: threadUrl, priorOutputDigest: initial.receipt.outputDigest, priorInputDigest: initial.receipt.inputDigest, priorPromptDigest: initial.receipt.promptDigest, priorRequestDigest: initial.receipt.requestDigest };
  return { store, receipt: initial.receipt, prior };
}

test("Writer1 retrieval reattaches the same agent, sends once, binds the new run, and is idempotent", async () => {
  const { store, receipt, prior } = await priorReceipt();
  const counters = { creates: 0, resumes: 0, sends: 0 };
  const transport = followUpTransport(counters);
  const prompt = "Versioned retrieval: return that complete artifact verbatim.";
  const first = await retrieveCursorWriterOutput({ env, receiptStore: store, priorReceipt: receipt, prior, prompt, runId: prior.priorRunId, transport });
  assert.equal(counters.creates, 0);
  assert.equal(counters.resumes, 1);
  assert.equal(counters.sends, 1);
  assert.equal(first.receipt.agentId, agentId);
  assert.equal(first.receipt.threadUrl, threadUrl);
  assert.equal(first.receipt.jobId, followUpJobId);
  assert.equal(first.receipt.mode, "same-thread-retrieval");
  validateCursorWriterFollowUpReceipt(first.receipt, prior, first.receipt.followUpPromptDigest!);
  const second = await retrieveCursorWriterOutput({ env, receiptStore: store, priorReceipt: receipt, prior, prompt, runId: prior.priorRunId, transport });
  assert.equal(counters.resumes, 1);
  assert.equal(counters.sends, 1);
  assert.deepEqual(second.receipt, first.receipt);
});

test("malformed or incomplete follow-up output fails before a completed correction receipt is persisted", async () => {
  const { store, receipt, prior } = await priorReceipt();
  const transport = followUpTransport({ creates: 0, resumes: 0, sends: 0 });
  await assert.rejects(() => retrieveCursorWriterOutput({ env, receiptStore: store, priorReceipt: receipt, prior, prompt: "Versioned retrieval: return that complete artifact verbatim.", runId: prior.priorRunId, transport, validateOutput: () => { throw new Error("missing full copy JSON"); } }), /missing full copy JSON/u);
  assert.equal(store.records.size, 1); // the old receipt remains; no completed follow-up receipt was added.
  assert.equal([...store.records.values()].some((value: any) => value.mode === "same-thread-retrieval"), false);
});

test("sentinel fails with explicit recovery code and never persists a completed correction receipt", async () => {
  const { store, receipt, prior } = await priorReceipt();
  const counters = { creates: 0, resumes: 0, sends: 0 };
  const transport = followUpTransport(counters, "OUTPUT_NOT_RECOVERABLE");
  await assert.rejects(() => retrieveCursorWriterOutput({ env, receiptStore: store, priorReceipt: receipt, prior, prompt: "Versioned retrieval: return that complete artifact verbatim or OUTPUT_NOT_RECOVERABLE.", runId: prior.priorRunId, transport, validateOutput: (output) => {
    if (output === "OUTPUT_NOT_RECOVERABLE") { const error = Object.assign(new Error("Writer1 output is not recoverable"), { code: "OUTPUT_NOT_RECOVERABLE" }); throw error; }
  } }), (error: unknown) => (error as { code?: string }).code === "OUTPUT_NOT_RECOVERABLE");
  assert.equal(counters.creates, 0);
  assert.equal(counters.sends, 1);
  assert.equal([...store.records.values()].some((value: any) => value.mode === "same-thread-retrieval"), false);
});

const artifactAgentId = "bc-30fc8ffa-2005-44b9-8fc7-48ddd9c3bcc8";
const artifactPriorRunId = "run-b0341a7a-9f03-4dec-b76d-7350ba1e82f2";
const artifactThreadUrl = `https://cursor.com/agents/${artifactAgentId}`;
const artifactRegistry = { items: [{ id: OFFICIAL_CURSOR_MODEL, parameters: [{ id: "fast", values: [{ value: "false" }, { value: "true" }] }, { id: "effort", values: [{ value: "high" }] }] }] };
const artifactPrior: CursorArtifactRecoveryPrior = {
  actionRunId: "32785189225", artifactId: 9541802267, runId: artifactPriorRunId, agentId: artifactAgentId, threadUrl: artifactThreadUrl,
  inputDigest: "sha256:" + "1".repeat(64), promptDigest: "sha256:" + "2".repeat(64), requestDigest: "sha256:" + "3".repeat(64),
  requestedModel: "cursor-grok-4.6-high", resolvedModel: OFFICIAL_CURSOR_MODEL, modelParams: [{ id: "fast", value: "false" }, { id: "effort", value: "high" }], registryDigest: digestOf(artifactRegistry.items[0]), effort: "high", effortAttestationSource: "official-registry-parameter", fast: false,
  sourceBranch: "architect/360-words-canary", sourceSha: "c89f82dae009d5bef3cc327543e1664985c85b76", sealedHandoffDigest: "sha256:" + "5".repeat(64),
};
const previousRecovery: CursorArtifactRecoveryFailureBinding = {
  recoveryVersion: "words-writer1-artifact-recovery/v1", actionRunId: "32793130502", artifactId: 9543869555, sourceBranch: "architect/360-words-canary", sourceSha: "6cf9b42e43e5728614a9b7302a8791e527197e3d", artifactDigest: "sha256:2d1d1c0d281917025be80898ab03c94171d59d1e2920ecf540b241f666464502", runId: "run-1b862d23-a748-4574-909a-66aac905eb97", agentId: artifactAgentId, threadUrl: artifactThreadUrl, promptDigest: digestWriter1ArtifactRecoveryPrompt("v1"), failureCode: "CURSOR_ARTIFACT_MISSING",
};
const previousRecoveryV2: CursorArtifactRecoveryV2FailureBinding = {
  recoveryVersion: "words-writer1-artifact-recovery/v2", actionRunId: "32795481394", artifactId: 9544693335, artifactDigest: "sha256:469f3b04eb502316404d98023df34c38e57e8cc6bf51d6dbfdbda12be3834e2f", sourceBranch: "architect/360-words-canary", sourceSha: "29311637f3f4adc04f3dd9ca7bfc54f05df47c88", agentId: artifactAgentId, runId: "run-04370412-4486-4ecf-8045-e7f23554071b", threadUrl: artifactThreadUrl, promptDigest: "sha256:76a6571a8b6bfaf233bf48534aaf3b161ffeea4e77010023a3e127de29b69ace", failureCode: "WRITER1_OUTPUT_INVALID", inputDigest: artifactPrior.inputDigest,
};
const artifactBytes = Buffer.from('{"schemaVersion":"words-writer1-output/v1","pages":[]}\n', "utf8");
function artifactDownloadResult(id: string, artifactPath: string, bytes: Buffer, sourceUrl: string): any {
  const cursorEndpoint = `https://api.cursor.com/v1/agents/${encodeURIComponent(id)}/artifacts/download?path=${encodeURIComponent(artifactPath)}`;
  const url = new URL(sourceUrl); const evidence = { scheme: "https" as const, host: url.hostname.toLowerCase(), ...(url.port ? { port: Number(url.port) } : {}), pathname: url.pathname, queryParameterNames: [...url.searchParams.keys()].sort() };
  const request = { agentId: id, logicalPath: artifactPath as "artifacts/writer1-output.json", cursorEndpoint, method: "GET" as const, apiVersion: "cloud-agent-api-v1" as const };
  return { bytes, sourceUrl, agentId: id, logicalPath: request.logicalPath, cursorEndpoint, requestShapeDigest: digestOf(request), downloadRequestDigest: digestOf({ downloadRequest: request, presignedUrlEvidence: evidence }), presignedUrlEvidence: evidence, presignedUrlEvidenceDigest: digestOf(evidence) };
}

function artifactClientFor(state: { available: boolean; bytes?: Buffer; lists: number; downloads: number }): CursorArtifactClient {
  return {
    async list() { state.lists += 1; return state.available ? [{ path: "artifacts/writer1-output.json", size: (state.bytes || artifactBytes).length }] : []; },
    async download(id, artifactPath) {
      state.downloads += 1; const bytes = state.bytes || artifactBytes; const sourceUrl = "https://bucket.s3.us-east-1.amazonaws.com/opaque-key?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=test";
      return artifactDownloadResult(id, artifactPath, bytes, sourceUrl);
    },
  };
}

function artifactTransport(counters: { creates: number; resumes: number; sends: number }, state: { available: boolean; bytes?: Buffer }): CursorTestTransport {
  const run = (id: string) => ({ id, agentId: artifactAgentId, model: { id: OFFICIAL_CURSOR_MODEL }, wait: async () => ({ status: "finished", result: "completion summary only", model: { id: OFFICIAL_CURSOR_MODEL } }) } as any);
  const agent = { agentId: artifactAgentId, model: { id: OFFICIAL_CURSOR_MODEL }, send: async () => { counters.sends += 1; state.available = true; return run("run-recovery-1"); } } as any;
  return {
    listModels: async () => artifactRegistry,
    create: async () => { counters.creates += 1; throw new Error("Agent.create must never be used by artifact recovery"); },
    resume: async (id) => { counters.resumes += 1; assert.equal(id, artifactAgentId); return agent; },
    getAgent: async (id) => ({ id, url: artifactThreadUrl }),
    getRun: async (_id, jobId) => run(jobId),
  };
}

test("artifact recovery uses an existing materialized file directly and never creates or follows up", async () => {
  const store = createMemoryCursorReceiptStore(); const state = { available: true, lists: 0, downloads: 0 }; const counters = { creates: 0, resumes: 0, sends: 0 };
  const result = await recoverCursorWriterArtifactForTest({ env, receiptStore: store, prior: artifactPrior, prompt: "artifact recovery prompt", transport: artifactTransport(counters, state), artifactClient: artifactClientFor(state), validateOutput: (raw) => JSON.parse(raw) });
  assert.equal(counters.creates, 0); assert.equal(counters.resumes, 0); assert.equal(counters.sends, 0); assert.equal(state.lists, 1); assert.equal(state.downloads, 1); assert.equal(result.receipt.artifact.path, "artifacts/writer1-output.json");
});

test("artifact recovery sends one same-thread follow-up, ignores summary output, and retries by downloading without a second send", async () => {
  const store = createMemoryCursorReceiptStore(); const state = { available: false, lists: 0, downloads: 0 }; const counters = { creates: 0, resumes: 0, sends: 0 }; const transport = artifactTransport(counters, state); const client = artifactClientFor(state);
  const first = await recoverCursorWriterArtifactForTest({ env, receiptStore: store, prior: artifactPrior, prompt: "artifact recovery prompt", transport, artifactClient: client, validateOutput: (raw) => JSON.parse(raw) });
  assert.equal(counters.creates, 0); assert.equal(counters.resumes, 1); assert.equal(counters.sends, 1); assert.equal(first.receipt.recoveryRunId, "run-recovery-1");
  const second = await recoverCursorWriterArtifactForTest({ env, receiptStore: store, prior: artifactPrior, prompt: "artifact recovery prompt", transport, artifactClient: client, validateOutput: (raw) => JSON.parse(raw) });
  assert.equal(counters.resumes, 1); assert.equal(counters.sends, 1); assert.equal(state.downloads, 2); assert.deepEqual(second.receipt.artifact, first.receipt.artifact);
});

test("v2 materialization uses a distinct key/receipt, reattaches the same agent, and never sends a second follow-up", async () => {
  const store = createMemoryCursorReceiptStore(); const state = { available: false, lists: 0, downloads: 0 }; const counters = { creates: 0, resumes: 0, sends: 0 }; const transport = artifactTransport(counters, state); const prompt = "v2 materialize at /opt/cursor/artifacts/writer1-output.json; API path artifacts/writer1-output.json";
  const first = await recoverCursorWriterArtifactV2ForTest({ env, receiptStore: store, prior: artifactPrior, previousRecovery, recoveryVersion: "words-writer1-artifact-recovery/v2", prompt, transport, artifactClient: artifactClientFor(state), validateOutput: (raw) => JSON.parse(raw), artifactBackoffMs: [0, 0] });
  assert.equal(counters.creates, 0); assert.equal(counters.resumes, 1); assert.equal(counters.sends, 1); assert.equal(first.receipt.recoveryVersion, "words-writer1-artifact-recovery/v2");
  assert.equal([...store.records.keys()].some((key) => key.includes(":artifact-recovery:v1:")), false);
  assert.equal([...store.records.keys()].some((key) => key.includes(":artifact-recovery:v2:")), true);
  validateCursorArtifactRecoveryV2Receipt(first.receipt, artifactPrior, previousRecovery, digestOf(prompt), env.CURSOR_API_KEY);
  const second = await recoverCursorWriterArtifactV2ForTest({ env, receiptStore: store, prior: artifactPrior, previousRecovery, recoveryVersion: "words-writer1-artifact-recovery/v2", prompt, transport, artifactClient: artifactClientFor(state), validateOutput: (raw) => JSON.parse(raw), artifactBackoffMs: [0, 0] });
  assert.equal(counters.sends, 1); assert.equal(counters.resumes, 1); assert.deepEqual(second.receipt, first.receipt);
});

test("v2 recovery relists through bounded uploader eventual consistency without resending", async () => {
  const store = createMemoryCursorReceiptStore(); const counters = { creates: 0, resumes: 0, sends: 0 }; let lists = 0; let downloads = 0;
  const client: CursorArtifactClient = { async list() { lists += 1; return lists >= 3 ? [{ path: "artifacts/writer1-output.json", size: artifactBytes.length }] : []; }, async download(id, artifactPath) { downloads += 1; return artifactDownloadResult(id, artifactPath, artifactBytes, "https://bucket.s3.us-east-1.amazonaws.com/opaque-key?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=test"); } };
  const transport = artifactTransport(counters, { available: false });
  const result = await recoverCursorWriterArtifactV2ForTest({ env, receiptStore: store, prior: artifactPrior, previousRecovery, recoveryVersion: "words-writer1-artifact-recovery/v2", prompt: "v2 absolute materialization", transport, artifactClient: client, validateOutput: (raw) => JSON.parse(raw), artifactBackoffMs: [0, 0, 0] });
  assert.equal(result.receipt.recoveryVersion, "words-writer1-artifact-recovery/v2"); assert.equal(counters.sends, 1); assert.equal(lists, 3); assert.equal(downloads, 1);
});

test("v2 requires the verified failed v1 binding before any same-thread send", async () => {
  const counters = { creates: 0, resumes: 0, sends: 0 }; await assert.rejects(() => recoverCursorWriterArtifactV2ForTest({ env, receiptStore: createMemoryCursorReceiptStore(), prior: artifactPrior, recoveryVersion: "words-writer1-artifact-recovery/v2", prompt: "v2", transport: artifactTransport(counters, { available: false }), artifactClient: artifactClientFor({ available: false, lists: 0, downloads: 0 }), validateOutput: (raw: string) => JSON.parse(raw), artifactBackoffMs: [0] } as any), /failed v1 recovery binding/u); assert.deepEqual(counters, { creates: 0, resumes: 0, sends: 0 });
});

test("v2 finds an already-valid listed artifact before claiming or sending", async () => {
  const store = createMemoryCursorReceiptStore(); const state = { available: true, lists: 0, downloads: 0 }; const counters = { creates: 0, resumes: 0, sends: 0 };
  const result = await recoverCursorWriterArtifactV2ForTest({ env, receiptStore: store, prior: artifactPrior, previousRecovery, recoveryVersion: "words-writer1-artifact-recovery/v2", prompt: "v2 absolute materialization", transport: artifactTransport(counters, state), artifactClient: artifactClientFor(state), validateOutput: (raw) => JSON.parse(raw), artifactBackoffMs: [0] });
  assert.equal(result.receipt.recoveryVersion, "words-writer1-artifact-recovery/v2"); assert.deepEqual(counters, { creates: 0, resumes: 0, sends: 0 }); assert.equal(state.lists, 1);
});

function v3Output(provenance = false, mutation?: "word" | "quote" | "review" | "claim"): Record<string, any> {
  const placement = (kind: string) => ({ ...(kind === "review" ? { reviewId: mutation === "review" ? "changed-review" : "review-1", quote: mutation === "quote" ? "changed quote" : "original quote", attribution: "Customer" } : kind === "claim" ? { claim: mutation === "claim" ? "changed claim" : "original claim" } : { evidenceId: "evidence-1", text: "original evidence" }), ...(provenance ? { provenance: { type: kind, ref: kind === "review" ? "review-1" : kind === "claim" ? "claim-1" : "evidence-1", placement: "body", section: "intro" } } : {}) });
  const page = (url: string, prescriptionId: string) => ({ url, type: "service", prescriptionId, primaryKeyword: mutation === "word" ? "changed keyword" : "original keyword", title: mutation === "word" ? "Changed title" : "Original title", seoTitle: "Original SEO title", metaDescription: "Original meta description", h1: "Original H1", body: "Original body copy", sections: [{ id: "intro", heading: "Introduction", body: "Original section body" }], reviewPlacements: [placement("review")], reviewEvidence: [placement("evidence")], quotePlacements: [placement("evidence")], claims: [placement("claim")] });
  return { schemaVersion: "words-writer1-output/v1", pages: [page("/garage-door-repair", "prescription-repair"), page("/garage-door-installation", "prescription-installation")] };
}

function v3Harness(before: Buffer, next: Buffer, counters: { creates: number; resumes: number; sends: number }, available = true): { state: { bytes: Buffer; nextBytes: Buffer; available: boolean; updatedAt: string; lists: number; downloads: number }; client: CursorArtifactClient; transport: CursorTestTransport } {
  const state = { bytes: before, nextBytes: next, available, updatedAt: "2026-08-24T01:00:00.000Z", lists: 0, downloads: 0 };
  const client: CursorArtifactClient = {
    async list() { state.lists += 1; return state.available ? [{ path: "artifacts/writer1-output.json", size: state.bytes.length, updatedAt: state.updatedAt }] : []; },
    async download(id, artifactPath) { state.downloads += 1; return artifactDownloadResult(id, artifactPath, state.bytes, "https://bucket.s3.us-east-1.amazonaws.com/opaque-key?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=test"); },
  };
  const run = (id: string) => ({ id, agentId: artifactAgentId, model: { id: OFFICIAL_CURSOR_MODEL }, wait: async () => ({ status: "finished", result: "summary only", model: { id: OFFICIAL_CURSOR_MODEL } }) } as any);
  const agent = { agentId: artifactAgentId, model: { id: OFFICIAL_CURSOR_MODEL }, send: async () => { counters.sends += 1; const changed = !state.bytes.equals(state.nextBytes); state.bytes = state.nextBytes; if (changed) state.updatedAt = "2026-08-24T01:01:00.000Z"; state.available = true; return run("run-v3-follow-up"); } } as any;
  const transport: CursorTestTransport = { listModels: async () => artifactRegistry, create: async () => { counters.creates += 1; throw new Error("Agent.create must never be used by v3 recovery"); }, resume: async (id) => { counters.resumes += 1; assert.equal(id, artifactAgentId); return agent; }, getAgent: async (id) => ({ id, url: artifactThreadUrl }), getRun: async (_id, jobId) => run(jobId) };
  return { state, client, transport };
}

function validateV3Output(raw: string): Record<string, any> {
  const value = JSON.parse(raw) as Record<string, any>;
  if (!Array.isArray(value.pages) || value.pages.length !== 2 || value.pages.some((page: any) => ![...(page.reviewPlacements || []), ...(page.reviewEvidence || []), ...(page.quotePlacements || []), ...(page.claims || [])].every((item: any) => item.provenance))) throw new Error("strict v3 output validation failed");
  return value;
}

test("final receipt digests separate rendered words, stable identity, and provenance metadata", () => {
  const base = v3Output(true);
  const baseline = writer1OutputDigests(base);
  const wordMutations: Array<(value: any) => void> = [
    (value) => { value.pages[0].primaryKeyword = "changed"; },
    (value) => { value.pages[0].title = "changed"; },
    (value) => { value.pages[0].seoTitle = "changed"; },
    (value) => { value.pages[0].metaDescription = "changed"; },
    (value) => { value.pages[0].h1 = "changed"; },
    (value) => { value.pages[0].body = "changed"; },
    (value) => { value.pages[0].sections[0].heading = "changed"; },
    (value) => { value.pages[0].sections[0].body = "changed"; },
    (value) => { value.pages[0].reviewPlacements[0].quote = "changed"; },
    (value) => { value.pages[0].reviewPlacements[0].attribution = "changed"; },
    (value) => { value.pages[0].reviewEvidence[0].text = "changed"; },
    (value) => { value.pages[0].quotePlacements[0].exactText = "changed"; },
    (value) => { value.pages[0].claims[0].claim = "changed"; },
  ];
  for (const mutate of wordMutations) {
    const value = structuredClone(base); mutate(value);
    const next = writer1OutputDigests(value);
    assert.notEqual(next.renderedWordsDigest, baseline.renderedWordsDigest);
    assert.equal(next.stableIdentityDigest, baseline.stableIdentityDigest);
    assert.equal(next.provenanceMetadataDigest, baseline.provenanceMetadataDigest);
  }
  const identityMutations: Array<(value: any) => void> = [
    (value) => { value.pages[0].url = "/changed"; },
    (value) => { value.pages[0].type = "other"; },
    (value) => { value.pages[0].prescriptionId = "changed"; },
    (value) => { value.pages[0].sections[0].id = "changed"; },
    (value) => { value.pages[0].reviewPlacements[0].reviewId = "changed"; },
    (value) => { value.pages[0].reviewEvidence[0].evidenceId = "changed"; },
    (value) => { value.pages[0].claims[0].claimId = "changed"; },
  ];
  for (const mutate of identityMutations) {
    const value = structuredClone(base); mutate(value);
    const next = writer1OutputDigests(value);
    assert.equal(next.renderedWordsDigest, baseline.renderedWordsDigest);
    assert.notEqual(next.stableIdentityDigest, baseline.stableIdentityDigest);
    assert.equal(next.provenanceMetadataDigest, baseline.provenanceMetadataDigest);
  }
  for (const mutate of [
    (value: any) => { value.pages[0].reviewPlacements[0].provenance.type = "evidence"; },
    (value: any) => { value.pages[0].reviewPlacements[0].provenance.ref = "changed"; },
    (value: any) => { value.pages[0].reviewPlacements[0].provenance.placement = "changed"; },
    (value: any) => { value.pages[0].reviewPlacements[0].provenance.section = "changed"; },
  ]) {
    const value = structuredClone(base); mutate(value);
    const next = writer1OutputDigests(value);
    assert.equal(next.renderedWordsDigest, baseline.renderedWordsDigest);
    assert.equal(next.stableIdentityDigest, baseline.stableIdentityDigest);
    assert.notEqual(next.provenanceMetadataDigest, baseline.provenanceMetadataDigest);
  }
  assert.equal(writer1RenderedWordsDigest(base), baseline.renderedWordsDigest);
  assert.equal(writer1StableIdentityDigest(base), baseline.stableIdentityDigest);
  assert.equal(writer1ProvenanceMetadataDigest(base), baseline.provenanceMetadataDigest);
});

function artifactBindingFor(bytes: Buffer, updatedAt: string): any {
  const sourceUrl = "https://bucket.s3.us-east-1.amazonaws.com/opaque-key?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=test";
  const download = artifactDownloadResult(artifactAgentId, "artifacts/writer1-output.json", bytes, sourceUrl);
  const sha256 = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  return { path: "artifacts/writer1-output.json", size: bytes.length, sha256, contentSize: bytes.length, byteDigest: sha256, updatedAt, downloadRequest: { agentId: artifactAgentId, logicalPath: "artifacts/writer1-output.json", cursorEndpoint: `https://api.cursor.com/v1/agents/${encodeURIComponent(artifactAgentId)}/artifacts/download?path=artifacts%2Fwriter1-output.json`, method: "GET", apiVersion: "cloud-agent-api-v1" }, requestShapeDigest: download.requestShapeDigest, downloadRequestDigest: download.downloadRequestDigest, presignedUrlEvidence: download.presignedUrlEvidence, presignedUrlEvidenceDigest: download.presignedUrlEvidenceDigest };
}

async function recoverV3(before: Buffer, next: Buffer, counters: { creates: number; resumes: number; sends: number }, available = true, store = createMemoryCursorReceiptStore()) {
  const harness = v3Harness(before, next, counters, available);
  const result = await recoverCursorWriterArtifactV3ForTest({ env, receiptStore: store, prior: artifactPrior, previousRecoveryV2, recoveryVersion: "words-writer1-artifact-recovery/v3", prompt: "canonical v3 metadata-only recovery", transport: harness.transport, artifactClient: harness.client, validateBeforeOutput: (raw) => JSON.parse(raw), validateOutput: validateV3Output, artifactBackoffMs: [0] });
  return { result, harness, store };
}

test("v3 accepts provenance-only repair, binds before/after digests, and never sends twice", async () => {
  const before = Buffer.from(JSON.stringify(v3Output(false)), "utf8");
  const after = Buffer.from(JSON.stringify(v3Output(true)), "utf8");
  const counters = { creates: 0, resumes: 0, sends: 0 };
  const first = await recoverV3(before, after, counters);
  const receipt = first.result.receipt as any;
  assert.equal(counters.sends, 1); assert.equal(counters.creates, 0); assert.equal(receipt.recoveryVersion, "words-writer1-artifact-recovery/v3");
  assert.notEqual(receipt.beforeArtifact.sha256, receipt.afterArtifact.sha256); assert.equal(receipt.artifact.sha256, receipt.afterArtifact.sha256); assert.equal(receipt.copyProjectionDigest, writer1CopyProjectionDigest(JSON.parse(after.toString("utf8"))));
  validateCursorArtifactRecoveryV3Receipt(receipt, artifactPrior, previousRecoveryV2, digestOf("canonical v3 metadata-only recovery"), env.CURSOR_API_KEY);
  const second = await recoverCursorWriterArtifactV3ForTest({ env, receiptStore: first.store, prior: artifactPrior, previousRecoveryV2, recoveryVersion: "words-writer1-artifact-recovery/v3", prompt: "canonical v3 metadata-only recovery", transport: first.harness.transport, artifactClient: first.harness.client, validateBeforeOutput: (raw) => JSON.parse(raw), validateOutput: validateV3Output, artifactBackoffMs: [0] });
  assert.equal(counters.sends, 1); assert.equal(counters.resumes, 1); assert.deepEqual(second.receipt, first.result.receipt);
});

test("v3 rejects any word, quote, review, or claim change and persists no completed receipt", async () => {
  for (const mutation of ["word", "quote", "review", "claim"] as const) {
    const before = Buffer.from(JSON.stringify(v3Output(false)), "utf8");
    const after = Buffer.from(JSON.stringify(v3Output(true, mutation)), "utf8");
    const counters = { creates: 0, resumes: 0, sends: 0 }; const store = createMemoryCursorReceiptStore();
    await assert.rejects(() => recoverV3(before, after, counters, true, store), /copy projection changed/u, mutation);
    assert.equal(counters.sends, 1, mutation); assert.equal([...store.records.values()].some((value: any) => value.recoveryVersion === "words-writer1-artifact-recovery/v3"), false, mutation);
  }
});

test("v3 rejects a stale artifact and a missing prior invalid artifact before follow-up", async () => {
  const stale = Buffer.from(JSON.stringify(v3Output(true)), "utf8"); const staleCounters = { creates: 0, resumes: 0, sends: 0 };
  await assert.rejects(() => recoverV3(stale, stale, staleCounters), /stale/u); assert.deepEqual(staleCounters, { creates: 0, resumes: 1, sends: 1 });
  const missingCounters = { creates: 0, resumes: 0, sends: 0 };
  await assert.rejects(() => recoverV3(stale, Buffer.from(JSON.stringify(v3Output(true)), "utf8"), missingCounters, false), /existing invalid artifact/u); assert.deepEqual(missingCounters, { creates: 0, resumes: 0, sends: 0 });
});

test("v3 crash recovery reattaches the same follow-up and never resends", async () => {
  const before = Buffer.from(JSON.stringify(v3Output(false)), "utf8"); const wrong = Buffer.from(JSON.stringify(v3Output(true, "word")), "utf8"); const corrected = Buffer.from(JSON.stringify(v3Output(true)), "utf8");
  const counters = { creates: 0, resumes: 0, sends: 0 }; const store = createMemoryCursorReceiptStore(); const harness = v3Harness(before, wrong, counters);
  await assert.rejects(() => recoverCursorWriterArtifactV3ForTest({ env, receiptStore: store, prior: artifactPrior, previousRecoveryV2, recoveryVersion: "words-writer1-artifact-recovery/v3", prompt: "canonical v3 metadata-only recovery", transport: harness.transport, artifactClient: harness.client, validateBeforeOutput: (raw) => JSON.parse(raw), validateOutput: validateV3Output, artifactBackoffMs: [0] }), /copy projection changed/u);
  const claim = store.claims.values().next().value as any; claim.leaseUntil = new Date(0).toISOString(); store.claims.set(claim.key, claim); harness.state.nextBytes = corrected; harness.state.bytes = corrected; harness.state.updatedAt = "2026-08-24T01:02:00.000Z";
  const recovered = await recoverCursorWriterArtifactV3ForTest({ env, receiptStore: store, prior: artifactPrior, previousRecoveryV2, recoveryVersion: "words-writer1-artifact-recovery/v3", prompt: "canonical v3 metadata-only recovery", transport: harness.transport, artifactClient: harness.client, validateBeforeOutput: (raw) => JSON.parse(raw), validateOutput: validateV3Output, artifactBackoffMs: [0] });
  assert.equal(counters.sends, 1); assert.equal(counters.resumes, 2); assert.equal(recovered.receipt.recoveryVersion, "words-writer1-artifact-recovery/v3");
});

test("v3-finalize validates the existing artifact with zero Cursor messages", async () => {
  const before = Buffer.from(JSON.stringify(v3Output(false)), "utf8");
  const after = Buffer.from(JSON.stringify(v3Output(true)), "utf8");
  const beforeArtifact = artifactBindingFor(before, "2026-08-25T00:56:02.000Z");
  const previousRecoveryV3: CursorArtifactRecoveryV3FailureBinding = {
    recoveryVersion: "words-writer1-artifact-recovery/v3", actionRunId: "32797811881", artifactId: 9545486318, artifactDigest: "sha256:23eac7a38caf588f383e424bd7bf39e5246f5634c7c06866d8e94250e6fe710e", sourceBranch: "architect/360-words-canary", sourceSha: "6d5f9e0f65af98185b6827b445cbfeff74e88ce7", agentId: artifactAgentId, runId: "run-47a109e2-4fd4-48df-a727-8a92a76cc472", threadUrl: artifactThreadUrl, promptDigest: digestWriter1ArtifactRecoveryPrompt("v3"), failureCode: "WRITER1_OUTPUT_INVALID", inputDigest: artifactPrior.inputDigest, beforeArtifact, copyProjectionDigest: writer1CopyProjectionDigest(JSON.parse(before.toString("utf8"))),
  };
  const state = { lists: 0, downloads: 0 };
  const client: CursorArtifactClient = {
    async list() { state.lists += 1; return [{ path: "artifacts/writer1-output.json", size: after.length, updatedAt: "2026-08-25T01:30:42.000Z" }]; },
    async download(id, artifactPath) { state.downloads += 1; return artifactDownloadResult(id, artifactPath, after, "https://bucket.s3.us-east-1.amazonaws.com/opaque-key?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=test"); },
  };
  const prior = { ...artifactPrior, actionRunId: "32797811881", artifactId: 9545486318, runId: "run-47a109e2-4fd4-48df-a727-8a92a76cc472", sourceSha: "6d5f9e0f65af98185b6827b445cbfeff74e88ce7", promptDigest: digestWriter1ArtifactRecoveryPrompt("v3") };
  const expectedCurrentArtifact = artifactBindingFor(after, "2026-08-25T01:30:42.000Z");
  const result = await finalizeCursorWriterArtifactV3ForTest({ env, receiptStore: createMemoryCursorReceiptStore(), prior, previousRecoveryV3, recoveryVersion: "words-writer1-artifact-recovery/v3-finalize", promptDigest: digestWriter1ArtifactRecoveryPrompt("v3"), expectedCurrentArtifactByteDigest: expectedCurrentArtifact.byteDigest, expectedCurrentArtifactUpdatedAt: expectedCurrentArtifact.updatedAt, artifactClient: client, validateOutput: (output) => validateV3Output(String(output)) });
  assert.deepEqual(state, { lists: 1, downloads: 1 });
  assert.equal(result.receipt.jobId, prior.runId);
  assert.equal(result.receipt.recoveryRunId, prior.runId);
  assert.equal(result.receipt.mode, "validation-only-artifact-recovery");
  assert.equal((result.receipt as any).crossV3CopyPreservation, "not-asserted");
  validateCursorArtifactRecoveryV3FinalizeReceipt(result.receipt, prior, previousRecoveryV3, digestWriter1ArtifactRecoveryPrompt("v3"), env.CURSOR_API_KEY, expectedCurrentArtifact.byteDigest, expectedCurrentArtifact.updatedAt);
});

test("v3-finalize fails closed on stale or changed copy and cannot message", async () => {
  const before = Buffer.from(JSON.stringify(v3Output(true)), "utf8");
  const changed = Buffer.from(JSON.stringify(v3Output(true, "word")), "utf8");
  const expectedCurrentArtifact = artifactBindingFor(before, "2026-08-25T01:30:42.000Z");
  const makePrevious = (bytes: Buffer): CursorArtifactRecoveryV3FailureBinding => ({ recoveryVersion: "words-writer1-artifact-recovery/v3", actionRunId: "32797811881", artifactId: 9545486318, artifactDigest: "sha256:23eac7a38caf588f383e424bd7bf39e5246f5634c7c06866d8e94250e6fe710e", sourceBranch: "architect/360-words-canary", sourceSha: "6d5f9e0f65af98185b6827b445cbfeff74e88ce7", agentId: artifactAgentId, runId: "run-47a109e2-4fd4-48df-a727-8a92a76cc472", threadUrl: artifactThreadUrl, promptDigest: digestWriter1ArtifactRecoveryPrompt("v3"), failureCode: "WRITER1_OUTPUT_INVALID", inputDigest: artifactPrior.inputDigest, beforeArtifact: artifactBindingFor(bytes, "2026-08-25T00:56:02.000Z"), copyProjectionDigest: writer1CopyProjectionDigest(JSON.parse(bytes.toString("utf8"))) });
  for (const [label, current, expected] of [["stale", before, before], ["copy changed", changed, before]] as const) {
    const state = { lists: 0, downloads: 0 }; const client: CursorArtifactClient = { async list() { state.lists += 1; return [{ path: "artifacts/writer1-output.json", size: current.length, updatedAt: "2026-08-25T00:56:02.000Z" }]; }, async download(id, artifactPath) { state.downloads += 1; return artifactDownloadResult(id, artifactPath, current, "https://bucket.s3.us-east-1.amazonaws.com/opaque-key?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=test"); } };
    const store = createMemoryCursorReceiptStore(); const prior = { ...artifactPrior, actionRunId: "32797811881", artifactId: 9545486318, runId: "run-47a109e2-4fd4-48df-a727-8a92a76cc472", sourceSha: "6d5f9e0f65af98185b6827b445cbfeff74e88ce7", promptDigest: digestWriter1ArtifactRecoveryPrompt("v3") };
    await assert.rejects(() => finalizeCursorWriterArtifactV3ForTest({ env, receiptStore: store, prior, previousRecoveryV3: makePrevious(expected), recoveryVersion: "words-writer1-artifact-recovery/v3-finalize", promptDigest: digestWriter1ArtifactRecoveryPrompt("v3"), expectedCurrentArtifactByteDigest: expectedCurrentArtifact.byteDigest, expectedCurrentArtifactUpdatedAt: expectedCurrentArtifact.updatedAt, artifactClient: client, validateOutput: (output) => validateV3Output(String(output)) }), label === "stale" ? /stale|current artifact binding/u : /current artifact binding/u);
    assert.deepEqual(state, { lists: 1, downloads: 1 }, label);
    assert.equal([...store.records.values()].some((value: any) => value.recoveryVersion === "words-writer1-artifact-recovery/v3-finalize"), false, label);
  }
});

test("validation-report inspection lists/downloads only, preserves artifact metadata, and sends zero Cursor messages", async () => {
  const before = Buffer.from('{"summary":"not the deliverable"}', "utf8");
  const current = Buffer.from('{"schemaVersion":"words-writer1-output/v1","pages":[]}', "utf8");
  const beforeArtifact = artifactBindingFor(before, "2026-08-25T00:56:02.000Z");
  const previousRecoveryV3: CursorArtifactRecoveryV3FailureBinding = { recoveryVersion: "words-writer1-artifact-recovery/v3", actionRunId: "32797811881", artifactId: 9545486318, artifactDigest: "sha256:23eac7a38caf588f383e424bd7bf39e5246f5634c7c06866d8e94250e6fe710e", sourceBranch: "architect/360-words-canary", sourceSha: "6d5f9e0f65af98185b6827b445cbfeff74e88ce7", agentId: artifactAgentId, runId: "run-47a109e2-4fd4-48df-a727-8a92a76cc472", threadUrl: artifactThreadUrl, promptDigest: digestWriter1ArtifactRecoveryPrompt("v3"), failureCode: "WRITER1_OUTPUT_INVALID", inputDigest: artifactPrior.inputDigest, beforeArtifact, copyProjectionDigest: writer1CopyProjectionDigest(JSON.parse(before.toString("utf8"))) };
  const state = { lists: 0, downloads: 0 };
  const client: CursorArtifactClient = { async list() { state.lists += 1; return [{ path: "artifacts/writer1-output.json", size: current.length, updatedAt: "2026-08-25T01:30:42.000Z" }]; }, async download(id, artifactPath) { state.downloads += 1; return artifactDownloadResult(id, artifactPath, current, "https://bucket.s3.us-east-1.amazonaws.com/opaque-key?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=test"); } };
  const prior = { ...artifactPrior, promptDigest: digestWriter1ArtifactRecoveryPrompt("v3") };
  const inspection = await inspectCursorWriterArtifactV3ForTest({ env, prior, previousRecoveryV3, promptDigest: digestWriter1ArtifactRecoveryPrompt("v3"), artifactClient: client, artifactBackoffMs: [0] });
  assert.deepEqual(state, { lists: 1, downloads: 1 });
  assert.equal(inspection.artifact.path, "artifacts/writer1-output.json");
  assert.equal(inspection.artifact.size, current.length);
  assert.equal(inspection.stale, false);
  assert.equal(inspection.copyProjectionMatches, false);
  assert.equal(inspection.parsed && (inspection.parsed as any).pages.length, 0);
  await assert.rejects(() => inspectCursorWriterArtifactV3({ ...({ prior, previousRecoveryV3, promptDigest: digestWriter1ArtifactRecoveryPrompt("v3") } as any), artifactClient: client }), /substitution|caller-selected/u);
});

test("artifact recovery rejects a summary artifact without a completed receipt, then reattaches the persisted run", async () => {
  const store = createMemoryCursorReceiptStore(); const state = { available: false, lists: 0, downloads: 0, bytes: Buffer.from("summary only", "utf8") }; const counters = { creates: 0, resumes: 0, sends: 0 }; const transport = artifactTransport(counters, state); const client = artifactClientFor(state);
  await assert.rejects(() => recoverCursorWriterArtifactForTest({ env, receiptStore: store, prior: artifactPrior, prompt: "artifact recovery prompt", transport, artifactClient: client, validateOutput: () => { throw new Error("summary artifact is not complete Writer1 JSON"); } }), /summary artifact/);
  assert.equal(counters.sends, 1); assert.equal([...store.records.values()].some((value: any) => value.mode === "same-thread-artifact-recovery"), false);
  const claim = store.claims.values().next().value as any; claim.leaseUntil = new Date(0).toISOString(); store.claims.set(claim.key, claim); state.bytes = artifactBytes;
  const recovered = await recoverCursorWriterArtifactForTest({ env, receiptStore: store, prior: artifactPrior, prompt: "artifact recovery prompt", transport, artifactClient: client, validateOutput: (raw) => JSON.parse(raw) });
  assert.equal(counters.sends, 1); assert.equal(counters.resumes, 1); assert.equal(recovered.receipt.mode, "same-thread-artifact-recovery");
});

test("artifact download rejects non-S3 redirects and duplicate artifact paths fail closed", async () => {
  let calls = 0;
  const client = createCursorArtifactClient(async () => { calls += 1; if (calls === 1) return new Response(JSON.stringify({ items: [{ path: "artifacts/writer1-output.json", sizeBytes: 7 }] }), { status: 200 }); return new Response(JSON.stringify({ url: "https://evil.example/download?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=x" }), { status: 200 }); });
  assert.deepEqual(await client.list(artifactAgentId, "key"), [{ path: "artifacts/writer1-output.json", size: 7 }]);
  await assert.rejects(() => client.download(artifactAgentId, "artifacts/writer1-output.json", "key"), /invalid|approved S3/u);
  const store = createMemoryCursorReceiptStore(); const counters = { creates: 0, resumes: 0, sends: 0 }; const duplicateClient: CursorArtifactClient = { list: async () => [{ path: "artifacts/writer1-output.json", size: artifactBytes.length }, { path: "artifacts/writer1-output.json", size: artifactBytes.length }], download: async (id, artifactPath) => artifactDownloadResult(id, artifactPath, artifactBytes, "https://bucket.s3.us-east-1.amazonaws.com/a?X-Amz-Algorithm=x&X-Amz-Signature=x") };
  await assert.rejects(() => recoverCursorWriterArtifactForTest({ env, receiptStore: store, prior: artifactPrior, prompt: "artifact recovery prompt", transport: artifactTransport(counters, { available: false }), artifactClient: duplicateClient, validateOutput: (raw) => JSON.parse(raw) }), /multiple artifacts|race/u); assert.equal(counters.sends, 0);
});

test("a present but invalid pre-existing artifact fails closed without a follow-up", async () => {
  const invalids = [
    ["sentinel", "OUTPUT_NOT_RECOVERABLE"], ["summary", "completion summary only"], ["malformed JSON", "{"],
    ["missing schema", JSON.stringify({ pages: [] })], ["missing copy", JSON.stringify({ schemaVersion: "words-writer1-output/v1", pages: [{ url: "/garage-door-repair" }, { url: "/garage-door-installation" }] })],
    ["missing pages", JSON.stringify({ schemaVersion: "words-writer1-output/v1" })], ["missing provenance", JSON.stringify({ schemaVersion: "words-writer1-output/v1", pages: [{ url: "/garage-door-repair" }, { url: "/garage-door-installation" }] })], ["stale identity", JSON.stringify({ schemaVersion: "words-writer1-output/v1", pages: [{ url: "/other" }, { url: "/garage-door-installation" }] })],
  ] as const;
  for (const [label, raw] of invalids) {
    const store = createMemoryCursorReceiptStore(); const state = { available: true, lists: 0, downloads: 0, bytes: Buffer.from(raw) }; const counters = { creates: 0, resumes: 0, sends: 0 };
    await assert.rejects(() => recoverCursorWriterArtifactForTest({ env, receiptStore: store, prior: artifactPrior, prompt: "artifact recovery prompt", transport: artifactTransport(counters, state), artifactClient: artifactClientFor(state), validateOutput: () => { throw new Error(`${label} artifact is invalid`); } }), new RegExp(`${label} artifact is invalid`, "u"));
    assert.equal(counters.resumes, 0, label); assert.equal(counters.sends, 0, label); assert.equal([...store.records.values()].some((value: any) => value.mode === "same-thread-artifact-recovery"), false, label);
  }
});

test("artifact descriptors and downloaded streams are bounded at one MiB", async () => {
  const max = 1024 * 1024;
  const oversizedDescriptor = createCursorArtifactClient(async () => new Response(JSON.stringify({ items: [{ path: "artifacts/writer1-output.json", sizeBytes: max + 1 }] }), { status: 200 }));
  await assert.rejects(() => oversizedDescriptor.list(artifactAgentId, "key"), /exceeds/u);

  const streamBytes = new Uint8Array(max + 1);
  let calls = 0;
  const oversizedStream = createCursorArtifactClient(async (url) => {
    calls += 1;
    if (calls === 1) return new Response(JSON.stringify({ items: [{ path: "artifacts/writer1-output.json", sizeBytes: max }] }), { status: 200 });
    if (calls === 2) return new Response(JSON.stringify({ url: "https://bucket.s3.us-east-1.amazonaws.com/opaque?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=x" }), { status: 200 });
    assert.match(String(url), /^https:\/\/bucket\.s3\.us-east-1\.amazonaws\.com/u);
    return new Response(new ReadableStream({ start(controller) { controller.enqueue(streamBytes.slice(0, max)); controller.enqueue(streamBytes.slice(max)); controller.close(); } }), { status: 200 });
  });
  await oversizedStream.list(artifactAgentId, "key");
  await assert.rejects(() => oversizedStream.download(artifactAgentId, "artifacts/writer1-output.json", "key"), /exceeds/u);

  calls = 0;
  const oversizedHeader = createCursorArtifactClient(async () => {
    calls += 1;
    if (calls === 1) return new Response(JSON.stringify({ url: "https://bucket.s3.us-east-1.amazonaws.com/opaque?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=x" }), { status: 200 });
    return new Response(Buffer.from("small"), { status: 200, headers: { "content-length": String(max + 1) } });
  });
  await assert.rejects(() => oversizedHeader.download(artifactAgentId, "artifacts/writer1-output.json", "key"), /exceeds/u);
});

test("descriptor/download size mismatch fails before completion", async () => {
  const store = createMemoryCursorReceiptStore(); const counters = { creates: 0, resumes: 0, sends: 0 }; const bytes = Buffer.from('{"ok":true}', "utf8"); const sourceUrl = "https://bucket.s3.us-east-1.amazonaws.com/opaque?X-Amz-Algorithm=x&X-Amz-Signature=x";
  const client: CursorArtifactClient = { list: async () => [{ path: "artifacts/writer1-output.json", size: bytes.length + 1 }], download: async (id, artifactPath) => artifactDownloadResult(id, artifactPath, bytes, sourceUrl) };
  await assert.rejects(() => recoverCursorWriterArtifactForTest({ env, receiptStore: store, prior: artifactPrior, prompt: "artifact recovery prompt", transport: artifactTransport(counters, { available: true, bytes }), artifactClient: client, validateOutput: (raw) => JSON.parse(raw) }), /size changed/u);
  assert.equal(counters.sends, 0); assert.equal([...store.records.values()].some((value: any) => value.mode === "same-thread-artifact-recovery"), false);
});

test("Cursor response is the only presigned URL authority and its binding is receipt-auditable", async () => {
  const cursorUrl = "https://bucket.s3.us-east-1.amazonaws.com/opaque-key?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=server"; const calls: string[] = [];
  const client = createCursorArtifactClient(async (url, init) => { calls.push(String(url)); if (calls.length === 1) return new Response(JSON.stringify({ items: [{ path: "artifacts/writer1-output.json", sizeBytes: artifactBytes.length }] }), { status: 200 }); if (calls.length === 2) return new Response(JSON.stringify({ url: cursorUrl }), { status: 200 }); assert.equal(String(url), cursorUrl); assert.equal((init as RequestInit).redirect, "error"); return new Response(artifactBytes, { status: 200 }); });
  await client.list(artifactAgentId, "key"); const downloaded = await client.download(artifactAgentId, "artifacts/writer1-output.json", "key");
  assert.equal(calls[1], `https://api.cursor.com/v1/agents/${encodeURIComponent(artifactAgentId)}/artifacts/download?path=artifacts%2Fwriter1-output.json`); assert.equal(calls[2], cursorUrl); assert.equal(downloaded.sourceUrl, cursorUrl);
});

test("altered opaque URL or request/path binding cannot validate a completed receipt", async () => {
  const store = createMemoryCursorReceiptStore(); const counters = { creates: 0, resumes: 0, sends: 0 }; const state = { available: true, lists: 0, downloads: 0 }; let sourceUrl = "https://bucket.s3.us-east-1.amazonaws.com/opaque-a?X-Amz-Algorithm=x&X-Amz-Signature=x"; const client: CursorArtifactClient = { list: async () => [{ path: "artifacts/writer1-output.json", size: artifactBytes.length }], download: async (id, artifactPath) => artifactDownloadResult(id, artifactPath, artifactBytes, sourceUrl) };
  const first = await recoverCursorWriterArtifactForTest({ env, receiptStore: store, prior: artifactPrior, prompt: "artifact recovery prompt", transport: artifactTransport(counters, state), artifactClient: client, validateOutput: (raw) => JSON.parse(raw) });
  sourceUrl = "https://bucket.s3.us-east-1.amazonaws.com/opaque-b?X-Amz-Algorithm=x&X-Amz-Signature=x";
  await assert.rejects(() => recoverCursorWriterArtifactForTest({ env, receiptStore: store, prior: artifactPrior, prompt: "artifact recovery prompt", transport: artifactTransport(counters, state), artifactClient: client, validateOutput: (raw) => JSON.parse(raw) }), /changed after/u);
  assert.equal(first.receipt.artifact.presignedUrlEvidenceDigest, digestOf(first.receipt.artifact.presignedUrlEvidence));
  const tampered = structuredClone(first.receipt) as any; tampered.artifact.requestShapeDigest = digestOf({ agentId: artifactAgentId, logicalPath: "artifacts/other.json", cursorEndpoint: "https://api.cursor.com/other" });
  assert.throws(() => validateCursorArtifactRecoveryReceipt(tampered, artifactPrior, digestOf("artifact recovery prompt")), /request binding|invalid/u);
});

test("recovery receipt stores recomputable non-secret request and URL evidence only", async () => {
  const store = createMemoryCursorReceiptStore(); const counters = { creates: 0, resumes: 0, sends: 0 }; const state = { available: true, lists: 0, downloads: 0 }; const result = await recoverCursorWriterArtifactForTest({ env, receiptStore: store, prior: artifactPrior, prompt: "artifact recovery prompt", transport: artifactTransport(counters, state), artifactClient: artifactClientFor(state), validateOutput: (raw) => JSON.parse(raw) });
  const artifact = result.receipt.artifact; assert.deepEqual(artifact.downloadRequest, { agentId: artifactAgentId, logicalPath: "artifacts/writer1-output.json", cursorEndpoint: `https://api.cursor.com/v1/agents/${encodeURIComponent(artifactAgentId)}/artifacts/download?path=artifacts%2Fwriter1-output.json`, method: "GET", apiVersion: "cloud-agent-api-v1" });
  assert.equal(artifact.downloadRequestDigest, digestOf({ downloadRequest: artifact.downloadRequest, presignedUrlEvidence: artifact.presignedUrlEvidence }));
  assert.equal(artifact.presignedUrlEvidenceDigest, digestOf(artifact.presignedUrlEvidence));
  assert.deepEqual(artifact.presignedUrlEvidence.queryParameterNames, ["X-Amz-Algorithm", "X-Amz-Signature"]);
  assert.doesNotMatch(JSON.stringify(result.receipt), /X-Amz-Signature=x/u);
});

test("configured-secret HMAC rejects forged recovery receipt fields and wrong secrets", async () => {
  const store = createMemoryCursorReceiptStore(); const counters = { creates: 0, resumes: 0, sends: 0 }; const state = { available: true, lists: 0, downloads: 0 }; const result = await recoverCursorWriterArtifactForTest({ env, receiptStore: store, prior: artifactPrior, prompt: "artifact recovery prompt", transport: artifactTransport(counters, state), artifactClient: artifactClientFor(state), validateOutput: (raw) => JSON.parse(raw) });
  const mutations: Array<[string, (receipt: any) => void]> = [
    ["request digest", (receipt) => { receipt.artifact.downloadRequestDigest = "sha256:" + "a".repeat(64); }],
    ["URL evidence", (receipt) => { receipt.artifact.presignedUrlEvidence.pathname = "/altered"; }],
    ["URL evidence digest", (receipt) => { receipt.artifact.presignedUrlEvidenceDigest = "sha256:" + "b".repeat(64); }],
    ["path", (receipt) => { receipt.artifact.path = "artifacts/other.json"; }], ["size", (receipt) => { receipt.artifact.size += 1; }],
    ["byte digest", (receipt) => { receipt.artifact.byteDigest = "sha256:" + "c".repeat(64); }], ["output", (receipt) => { receipt.output = { forged: true }; }],
    ["agent", (receipt) => { receipt.agentId = "bc-forged"; }], ["run", (receipt) => { receipt.jobId = "run-forged"; receipt.recoveryRunId = "run-forged"; }],
    ["thread", (receipt) => { receipt.threadUrl = "https://cursor.com/agents/bc-forged"; }], ["model", (receipt) => { receipt.resolvedModel = "forged"; }],
    ["sealed pin", (receipt) => { receipt.recoveryPrior.sealedHandoffDigest = "sha256:" + "d".repeat(64); }],
  ];
  for (const [label, mutate] of mutations) { const forged = structuredClone(result.receipt) as any; mutate(forged); assert.throws(() => validateCursorArtifactRecoveryReceipt(forged, artifactPrior, digestOf("artifact recovery prompt"), env.CURSOR_API_KEY), /MAC|binding|invalid|tampered|mismatch|output|thread|model/u, label); }
  assert.throws(() => validateCursorArtifactRecoveryReceipt(result.receipt, artifactPrior, digestOf("artifact recovery prompt"), "wrong-secret"), /MAC/u);
});

test("production recovery rejects caller-supplied artifact and transport seams before any vendor access", async () => {
  const counters = { creates: 0, resumes: 0, sends: 0, lists: 0 }; const state = { available: false, lists: 0, downloads: 0 };
  const fakeArtifactClient = { list: async () => { counters.lists += 1; return []; }, download: async () => { throw new Error("must not download"); } };
  await assert.rejects(() => recoverCursorWriterArtifact({ env: { CURSOR_MODEL: "caller-selected-model", CURSOR_FAST: "true", CURSOR_API_KEY: "caller-selected-secret" }, receiptStore: createMemoryCursorReceiptStore(), prior: artifactPrior, prompt: "artifact recovery prompt", validateOutput: () => undefined, artifactClient: fakeArtifactClient, transport: artifactTransport(counters, state) } as any), (error: unknown) => (error as { code?: string }).code === "CURSOR_ARTIFACT_ENV_SUBSTITUTION_FORBIDDEN");
  assert.deepEqual(counters, { creates: 0, resumes: 0, sends: 0, lists: 0 });
});
