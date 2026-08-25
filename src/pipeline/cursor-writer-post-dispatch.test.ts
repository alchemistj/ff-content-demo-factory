import assert from "node:assert/strict";
import test from "node:test";
import {
  createMemoryCursorReceiptStore,
  extractSingleWriter1Json,
  OFFICIAL_CURSOR_MODEL,
  recoverCursorWriterPostDispatchForTest,
  validateCursorWriterReceipt,
  type CursorPostDispatchRecoveryPrior,
  type CursorTestTransport,
} from "./cursor-writer.js";
import { digestOf } from "../contracts/digests.js";

const agentId = "bc-2486f645-c31c-4532-8145-fbe3af1d45a8";
const runId = "run-1686013d-dec5-454c-a39e-5817448e6a96";
const threadUrl = `https://cursor.com/agents/${agentId}`;
const env = { CURSOR_API_KEY: "post-dispatch-test-secret", CURSOR_MODEL: "cursor-grok-4.6-high", CURSOR_FAST: "false" };
const output = JSON.stringify({ schemaVersion: "words-writer1-output/v1", pages: [{ type: "service", url: "/garage-door-repair" }, { type: "service", url: "/garage-door-installation" }] });

function prior(): CursorPostDispatchRecoveryPrior {
  const inputDigest = digestOf({ sealed: "sealed-360", baseline: "baseline" });
  const promptDigest = digestOf("the exact original v2 prompt bytes");
  return {
    actionRunId: "32825265478", artifactId: 9554789848, runId, agentId, threadUrl,
    requestedModel: "cursor-grok-4.6-high", resolvedModel: OFFICIAL_CURSOR_MODEL,
    modelParams: [{ id: "fast", value: "false" }, { id: "effort", value: "high" }], effort: "high", fast: false,
    inputDigest, promptDigest, requestDigest: digestOf({ original: true }),
    idempotencyKey: `${agentId}:writer1:correction:v2:${inputDigest}:${promptDigest}`, messagesSent: 1,
  };
}

function transport(raw: string, counters: { getRun: number; creates: number; resumes: number; sends: number; waits: number }): CursorTestTransport {
  const forbidden = (name: string) => async () => { counters[name as keyof typeof counters] += 1; throw new Error(`${name} must not be called by post-dispatch recovery`); };
  return {
    listModels: forbidden("creates") as any,
    create: forbidden("creates") as any,
    resume: forbidden("resumes") as any,
    getAgent: forbidden("sends") as any,
    getRun: async (requestedAgent, requestedRun) => {
      counters.getRun += 1; assert.equal(requestedAgent, agentId); assert.equal(requestedRun, runId);
      return { id: runId, agentId, status: "finished", result: raw, wait: async () => { counters.waits += 1; throw new Error("wait must not be called"); } } as any;
    },
  };
}

test("post-dispatch recovery retrieves exactly one completed result with zero Cursor messages and is idempotent", async () => {
  const counters = { getRun: 0, creates: 0, resumes: 0, sends: 0, waits: 0 };
  const store = createMemoryCursorReceiptStore();
  const first = await recoverCursorWriterPostDispatchForTest({ env, receiptStore: store, prior: prior(), transport: transport(output, counters), validateOutput: (json) => JSON.parse(json) });
  validateCursorWriterReceipt(first.receipt, env.CURSOR_API_KEY);
  assert.equal(first.receipt.extraction, "plain-json"); assert.equal(first.receipt.recoveryMessagesSent, 0); assert.equal(first.receipt.originalDispatch.messagesSent, 1);
  assert.deepEqual(counters, { getRun: 1, creates: 0, resumes: 0, sends: 0, waits: 0 });
  const second = await recoverCursorWriterPostDispatchForTest({ env, receiptStore: store, prior: prior(), transport: transport(output, counters), validateOutput: (json) => JSON.parse(json) });
  assert.deepEqual(second.receipt, first.receipt); assert.equal(counters.getRun, 1);
});

test("one complete fenced JSON object is accepted, but prose and multiple candidates fail closed", async () => {
  const fence = String.fromCharCode(96).repeat(3);
  assert.equal(extractSingleWriter1Json(`\n${fence}json\n${output}\n${fence}\n`).format, "fenced-json");
  for (const raw of ["summary only", "before\n" + output, output + "\nafter", `${output}\n${fence}\n${output}\n${fence}`, "not-json", "OUTPUT_NOT_RECOVERABLE"]) {
    assert.throws(() => extractSingleWriter1Json(raw));
    const counters = { getRun: 0, creates: 0, resumes: 0, sends: 0, waits: 0 };
    await assert.rejects(() => recoverCursorWriterPostDispatchForTest({ env, receiptStore: createMemoryCursorReceiptStore(), prior: prior(), transport: transport(raw, counters), validateOutput: (json) => JSON.parse(json) }));
    assert.deepEqual(counters, { getRun: 1, creates: 0, resumes: 0, sends: 0, waits: 0 });
  }
});

test("post-dispatch recovery rejects altered prior identity and never reaches run retrieval", async () => {
  const counters = { getRun: 0, creates: 0, resumes: 0, sends: 0, waits: 0 };
  const altered = { ...prior(), runId: "run-other" };
  await assert.rejects(() => recoverCursorWriterPostDispatchForTest({ env, receiptStore: createMemoryCursorReceiptStore(), prior: altered, transport: transport(output, counters), validateOutput: (json) => JSON.parse(json) }), /exact failed Writer1 dispatch/u);
  assert.equal(counters.getRun, 0);
});
