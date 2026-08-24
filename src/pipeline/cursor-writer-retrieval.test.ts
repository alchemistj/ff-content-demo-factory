import assert from "node:assert/strict";
import test from "node:test";
import {
  createCursorArtifactClient,
  createCursorWriterExecutorForTest,
  createMemoryCursorReceiptStore,
  OFFICIAL_CURSOR_MODEL,
  recoverCursorWriterArtifact,
  retrieveCursorWriterOutput,
  validateCursorArtifactRecoveryReceipt,
  validateCursorWriterFollowUpReceipt,
  type CursorArtifactClient,
  type CursorArtifactRecoveryPrior,
  type CursorTestTransport,
  type CursorFollowUpBindings,
} from "./cursor-writer.js";
import { digestOf } from "../contracts/digests.js";

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
const artifactBytes = Buffer.from('{"schemaVersion":"words-writer1-output/v1","pages":[]}\n', "utf8");

function artifactClientFor(state: { available: boolean; bytes?: Buffer; lists: number; downloads: number }): CursorArtifactClient {
  return {
    async list() { state.lists += 1; return state.available ? [{ path: "artifacts/writer1-output.json", size: (state.bytes || artifactBytes).length }] : []; },
    async download(id, artifactPath) {
      state.downloads += 1; const bytes = state.bytes || artifactBytes; const sourceUrl = "https://bucket.s3.us-east-1.amazonaws.com/opaque-key?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=test";
      const cursorEndpoint = `https://api.cursor.com/v1/agents/${encodeURIComponent(id)}/artifacts/download?path=${encodeURIComponent(artifactPath)}`; const request = { agentId: id, logicalPath: artifactPath as "artifacts/writer1-output.json", cursorEndpoint };
      return { bytes, sourceUrl, agentId: id, logicalPath: request.logicalPath, cursorEndpoint, requestShapeDigest: digestOf(request), downloadRequestDigest: digestOf({ ...request, presignedUrl: sourceUrl }), presignedUrlDigest: digestOf(sourceUrl) };
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
  const result = await recoverCursorWriterArtifact({ env, receiptStore: store, prior: artifactPrior, prompt: "artifact recovery prompt", transport: artifactTransport(counters, state), artifactClient: artifactClientFor(state), validateOutput: (raw) => JSON.parse(raw) });
  assert.equal(counters.creates, 0); assert.equal(counters.resumes, 0); assert.equal(counters.sends, 0); assert.equal(state.lists, 1); assert.equal(state.downloads, 1); assert.equal(result.receipt.artifact.path, "artifacts/writer1-output.json");
});

test("artifact recovery sends one same-thread follow-up, ignores summary output, and retries by downloading without a second send", async () => {
  const store = createMemoryCursorReceiptStore(); const state = { available: false, lists: 0, downloads: 0 }; const counters = { creates: 0, resumes: 0, sends: 0 }; const transport = artifactTransport(counters, state); const client = artifactClientFor(state);
  const first = await recoverCursorWriterArtifact({ env, receiptStore: store, prior: artifactPrior, prompt: "artifact recovery prompt", transport, artifactClient: client, validateOutput: (raw) => JSON.parse(raw) });
  assert.equal(counters.creates, 0); assert.equal(counters.resumes, 1); assert.equal(counters.sends, 1); assert.equal(first.receipt.recoveryRunId, "run-recovery-1");
  const second = await recoverCursorWriterArtifact({ env, receiptStore: store, prior: artifactPrior, prompt: "artifact recovery prompt", transport, artifactClient: client, validateOutput: (raw) => JSON.parse(raw) });
  assert.equal(counters.resumes, 1); assert.equal(counters.sends, 1); assert.equal(state.downloads, 2); assert.deepEqual(second.receipt.artifact, first.receipt.artifact);
});

test("artifact recovery rejects a summary artifact without a completed receipt, then reattaches the persisted run", async () => {
  const store = createMemoryCursorReceiptStore(); const state = { available: false, lists: 0, downloads: 0, bytes: Buffer.from("summary only", "utf8") }; const counters = { creates: 0, resumes: 0, sends: 0 }; const transport = artifactTransport(counters, state); const client = artifactClientFor(state);
  await assert.rejects(() => recoverCursorWriterArtifact({ env, receiptStore: store, prior: artifactPrior, prompt: "artifact recovery prompt", transport, artifactClient: client, validateOutput: () => { throw new Error("summary artifact is not complete Writer1 JSON"); } }), /summary artifact/);
  assert.equal(counters.sends, 1); assert.equal([...store.records.values()].some((value: any) => value.mode === "same-thread-artifact-recovery"), false);
  const claim = store.claims.values().next().value as any; claim.leaseUntil = new Date(0).toISOString(); store.claims.set(claim.key, claim); state.bytes = artifactBytes;
  const recovered = await recoverCursorWriterArtifact({ env, receiptStore: store, prior: artifactPrior, prompt: "artifact recovery prompt", transport, artifactClient: client, validateOutput: (raw) => JSON.parse(raw) });
  assert.equal(counters.sends, 1); assert.equal(counters.resumes, 1); assert.equal(recovered.receipt.mode, "same-thread-artifact-recovery");
});

test("artifact download rejects non-S3 redirects and duplicate artifact paths fail closed", async () => {
  let calls = 0;
  const client = createCursorArtifactClient(async () => { calls += 1; if (calls === 1) return new Response(JSON.stringify({ items: [{ path: "artifacts/writer1-output.json", sizeBytes: 7 }] }), { status: 200 }); return new Response(JSON.stringify({ url: "https://evil.example/download?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=x" }), { status: 200 }); });
  assert.deepEqual(await client.list(artifactAgentId, "key"), [{ path: "artifacts/writer1-output.json", size: 7 }]);
  await assert.rejects(() => client.download(artifactAgentId, "artifacts/writer1-output.json", "key"), /invalid|approved S3/u);
  const store = createMemoryCursorReceiptStore(); const counters = { creates: 0, resumes: 0, sends: 0 }; const duplicateClient: CursorArtifactClient = { list: async () => [{ path: "artifacts/writer1-output.json", size: artifactBytes.length }, { path: "artifacts/writer1-output.json", size: artifactBytes.length }], download: async (id, artifactPath) => { const sourceUrl = "https://bucket.s3.us-east-1.amazonaws.com/a?X-Amz-Algorithm=x&X-Amz-Signature=x"; const cursorEndpoint = `https://api.cursor.com/v1/agents/${encodeURIComponent(id)}/artifacts/download?path=${encodeURIComponent(artifactPath)}`; const request = { agentId: id, logicalPath: artifactPath as "artifacts/writer1-output.json", cursorEndpoint }; return { bytes: artifactBytes, sourceUrl, agentId: id, logicalPath: request.logicalPath, cursorEndpoint, requestShapeDigest: digestOf(request), downloadRequestDigest: digestOf({ ...request, presignedUrl: sourceUrl }), presignedUrlDigest: digestOf(sourceUrl) }; } };
  await assert.rejects(() => recoverCursorWriterArtifact({ env, receiptStore: store, prior: artifactPrior, prompt: "artifact recovery prompt", transport: artifactTransport(counters, { available: false }), artifactClient: duplicateClient, validateOutput: (raw) => JSON.parse(raw) }), /multiple artifacts|race/u); assert.equal(counters.sends, 0);
});

test("a present but invalid pre-existing artifact fails closed without a follow-up", async () => {
  const invalids = [
    ["sentinel", "OUTPUT_NOT_RECOVERABLE"], ["summary", "completion summary only"], ["malformed JSON", "{"],
    ["missing schema", JSON.stringify({ pages: [] })], ["missing copy", JSON.stringify({ schemaVersion: "words-writer1-output/v1", pages: [{ url: "/garage-door-repair" }, { url: "/garage-door-installation" }] })],
    ["missing pages", JSON.stringify({ schemaVersion: "words-writer1-output/v1" })], ["missing provenance", JSON.stringify({ schemaVersion: "words-writer1-output/v1", pages: [{ url: "/garage-door-repair" }, { url: "/garage-door-installation" }] })], ["stale identity", JSON.stringify({ schemaVersion: "words-writer1-output/v1", pages: [{ url: "/other" }, { url: "/garage-door-installation" }] })],
  ] as const;
  for (const [label, raw] of invalids) {
    const store = createMemoryCursorReceiptStore(); const state = { available: true, lists: 0, downloads: 0, bytes: Buffer.from(raw) }; const counters = { creates: 0, resumes: 0, sends: 0 };
    await assert.rejects(() => recoverCursorWriterArtifact({ env, receiptStore: store, prior: artifactPrior, prompt: "artifact recovery prompt", transport: artifactTransport(counters, state), artifactClient: artifactClientFor(state), validateOutput: () => { throw new Error(`${label} artifact is invalid`); } }), new RegExp(`${label} artifact is invalid`, "u"));
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
  const client: CursorArtifactClient = { list: async () => [{ path: "artifacts/writer1-output.json", size: bytes.length + 1 }], download: async (id, artifactPath) => { const cursorEndpoint = `https://api.cursor.com/v1/agents/${encodeURIComponent(id)}/artifacts/download?path=${encodeURIComponent(artifactPath)}`; const request = { agentId: id, logicalPath: artifactPath as "artifacts/writer1-output.json", cursorEndpoint }; return { bytes, sourceUrl, agentId: id, logicalPath: request.logicalPath, cursorEndpoint, requestShapeDigest: digestOf(request), downloadRequestDigest: digestOf({ ...request, presignedUrl: sourceUrl }), presignedUrlDigest: digestOf(sourceUrl) }; } };
  await assert.rejects(() => recoverCursorWriterArtifact({ env, receiptStore: store, prior: artifactPrior, prompt: "artifact recovery prompt", transport: artifactTransport(counters, { available: true, bytes }), artifactClient: client, validateOutput: (raw) => JSON.parse(raw) }), /size changed/u);
  assert.equal(counters.sends, 0); assert.equal([...store.records.values()].some((value: any) => value.mode === "same-thread-artifact-recovery"), false);
});

test("Cursor response is the only presigned URL authority and its binding is receipt-auditable", async () => {
  const cursorUrl = "https://bucket.s3.us-east-1.amazonaws.com/opaque-key?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=server"; const calls: string[] = [];
  const client = createCursorArtifactClient(async (url, init) => { calls.push(String(url)); if (calls.length === 1) return new Response(JSON.stringify({ items: [{ path: "artifacts/writer1-output.json", sizeBytes: artifactBytes.length }] }), { status: 200 }); if (calls.length === 2) return new Response(JSON.stringify({ url: cursorUrl }), { status: 200 }); assert.equal(String(url), cursorUrl); assert.equal((init as RequestInit).redirect, "error"); return new Response(artifactBytes, { status: 200 }); });
  await client.list(artifactAgentId, "key"); const downloaded = await client.download(artifactAgentId, "artifacts/writer1-output.json", "key");
  assert.equal(calls[1], `https://api.cursor.com/v1/agents/${encodeURIComponent(artifactAgentId)}/artifacts/download?path=artifacts%2Fwriter1-output.json`); assert.equal(calls[2], cursorUrl); assert.equal(downloaded.sourceUrl, cursorUrl);
});

test("altered opaque URL or request/path binding cannot validate a completed receipt", async () => {
  const store = createMemoryCursorReceiptStore(); const counters = { creates: 0, resumes: 0, sends: 0 }; const state = { available: true, lists: 0, downloads: 0 }; let sourceUrl = "https://bucket.s3.us-east-1.amazonaws.com/opaque-a?X-Amz-Algorithm=x&X-Amz-Signature=x"; const client: CursorArtifactClient = { list: async () => [{ path: "artifacts/writer1-output.json", size: artifactBytes.length }], download: async (id, artifactPath) => { const cursorEndpoint = `https://api.cursor.com/v1/agents/${encodeURIComponent(id)}/artifacts/download?path=${encodeURIComponent(artifactPath)}`; const request = { agentId: id, logicalPath: artifactPath as "artifacts/writer1-output.json", cursorEndpoint }; return { bytes: artifactBytes, sourceUrl, agentId: id, logicalPath: request.logicalPath, cursorEndpoint, requestShapeDigest: digestOf(request), downloadRequestDigest: digestOf({ ...request, presignedUrl: sourceUrl }), presignedUrlDigest: digestOf(sourceUrl) }; } };
  const first = await recoverCursorWriterArtifact({ env, receiptStore: store, prior: artifactPrior, prompt: "artifact recovery prompt", transport: artifactTransport(counters, state), artifactClient: client, validateOutput: (raw) => JSON.parse(raw) });
  sourceUrl = "https://bucket.s3.us-east-1.amazonaws.com/opaque-b?X-Amz-Algorithm=x&X-Amz-Signature=x";
  await assert.rejects(() => recoverCursorWriterArtifact({ env, receiptStore: store, prior: artifactPrior, prompt: "artifact recovery prompt", transport: artifactTransport(counters, state), artifactClient: client, validateOutput: (raw) => JSON.parse(raw) }), /changed after/u);
  assert.equal(first.receipt.artifact.presignedUrlDigest, digestOf("https://bucket.s3.us-east-1.amazonaws.com/opaque-a?X-Amz-Algorithm=x&X-Amz-Signature=x"));
  const tampered = structuredClone(first.receipt) as any; tampered.artifact.requestShapeDigest = digestOf({ agentId: artifactAgentId, logicalPath: "artifacts/other.json", cursorEndpoint: "https://api.cursor.com/other" });
  assert.throws(() => validateCursorArtifactRecoveryReceipt(tampered, artifactPrior, digestOf("artifact recovery prompt")), /request binding|invalid/u);
});
