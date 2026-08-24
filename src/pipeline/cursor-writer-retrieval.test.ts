import assert from "node:assert/strict";
import test from "node:test";
import {
  createCursorWriterExecutorForTest,
  createMemoryCursorReceiptStore,
  OFFICIAL_CURSOR_MODEL,
  retrieveCursorWriterOutput,
  validateCursorWriterFollowUpReceipt,
  type CursorTestTransport,
  type CursorFollowUpBindings,
} from "./cursor-writer.js";

const agentId = "bc-972b63b0-6e43-4c76-805d-b95a0ba13da8";
const priorJobId = "run-a59d6e17-3ce0-4c0f-8231-597d5b15382b";
const followUpJobId = "run-follow-up-360-writer1";
const threadUrl = `https://cursor.com/agents/${agentId}`;
const env = { CURSOR_API_KEY: "test-key", CURSOR_MODEL: "cursor-grok-4.6-high", CURSOR_FAST: "false" };
const registry = { items: [{ id: OFFICIAL_CURSOR_MODEL, parameters: [{ id: "fast", values: [{ value: "false" }, { value: "true" }] }, { id: "effort", values: [{ value: "high" }] }] }] };
const fullOutput = JSON.stringify({
  schemaVersion: "words-writer1-output/v1",
  pages: [
    { url: "/garage-door-repair", seoTitle: "Repair", metaDescription: "Repair", h1: "Repair", sections: [{ heading: "Repair", body: "Repair copy" }], reviewPlacements: [{ reviewId: "review-repair", quote: "The repair was excellent.", attribution: "Chris" }] },
    { url: "/garage-door-installation", seoTitle: "Installation", metaDescription: "Installation", h1: "Installation", sections: [{ heading: "Installation", body: "Installation copy" }], reviewPlacements: [{ reviewId: "review-install", quote: "The installation was excellent.", attribution: "Marcie" }] },
  ],
});

function makeRun(id: string, output: unknown) {
  return { id, agentId, model: { id: OFFICIAL_CURSOR_MODEL }, wait: async () => ({ status: "finished", result: output, model: { id: OFFICIAL_CURSOR_MODEL } }) } as any;
}

function initialTransport(): CursorTestTransport {
  const agent = { agentId, model: { id: OFFICIAL_CURSOR_MODEL }, send: async () => makeRun(priorJobId, { result: "prior summary" }) } as any;
  return {
    listModels: async () => registry,
    create: async () => ({ agent, run: makeRun(priorJobId, { result: "prior summary" }) }),
    resume: async () => agent,
    getAgent: async () => ({ id: agentId, url: threadUrl }),
    getRun: async () => makeRun(priorJobId, { result: "prior summary" }),
  };
}

function followUpTransport(counters: { creates: number; resumes: number; sends: number }): CursorTestTransport {
  return {
    listModels: async () => registry,
    create: async () => { counters.creates += 1; throw new Error("Agent.create must never be used by Writer1 retrieval"); },
    resume: async (id) => {
      counters.resumes += 1;
      assert.equal(id, agentId);
      return { agentId, model: { id: OFFICIAL_CURSOR_MODEL }, send: async (prompt: string, options: any) => { counters.sends += 1; assert.match(prompt, /return that complete artifact verbatim/u); assert.deepEqual(options.model, { id: OFFICIAL_CURSOR_MODEL, params: [{ id: "fast", value: "false" }, { id: "effort", value: "high" }] }); return makeRun(followUpJobId, fullOutput); } } as any;
    },
    getAgent: async (id) => ({ id, url: threadUrl }),
    getRun: async () => makeRun(followUpJobId, fullOutput),
  };
}

async function priorReceipt() {
  const store = createMemoryCursorReceiptStore();
  const initial = await createCursorWriterExecutorForTest({ transport: initialTransport(), receiptStore: store, env }).dispatch("writer1", { approved: ["/garage-door-repair", "/garage-door-installation"] }, "initial Writer1", "32717620900");
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
