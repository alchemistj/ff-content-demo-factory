import assert from "node:assert/strict";
import test from "node:test";
import { garageDoor360FourPageHandoff } from "../../fixtures/360-garage-door-four-page.js";
import { createInitialState, STAGES, validateState } from "./state.js";
import {
  createCursorWriterExecutor,
  createMemoryCursorReceiptStore,
  CursorWriterExecutionError,
  isCursorWriterExecutor,
  validateCursorWriterReceipt,
  validateCursorWriterRuntime,
  type CursorSdkContract,
} from "./cursor-writer.js";

function sdk(options: { resolvedModel?: string; wait?: () => unknown | Promise<unknown>; get?: () => unknown | Promise<unknown> } = {}): CursorSdkContract & { creates: number; gets: number } {
  const value = { creates: 0, gets: 0 } as CursorSdkContract & { creates: number; gets: number };
  const makeAgent = () => ({ id: "agent-360", jobId: "job-360", threadUrl: "https://cursor.com/agent/agent-360", resolvedModel: options.resolvedModel || "cursor-grok-4.6-high", wait: options.wait || (async () => ({ output: { stage: "fixture" }, resolvedModel: options.resolvedModel || "cursor-grok-4.6-high" })) });
  value.Agent = {
    create: async () => { value.creates += 1; return makeAgent(); },
    get: async () => { value.gets += 1; return options.get ? await options.get() as any : makeAgent(); },
  };
  return value;
}

test("Cursor runtime fails closed for missing, Auto, wrong, and fast-on configurations", () => {
  for (const config of [
    { provider: "cursor-sdk", requestedModel: undefined, fast: false },
    { provider: "cursor-sdk", requestedModel: "Auto", fast: false },
    { provider: "cursor-sdk", requestedModel: "cursor-other", fast: false },
    { provider: "cursor-sdk", requestedModel: "cursor-grok-4.6-high", fast: true },
    { provider: "cursor-sdk", requestedModel: "cursor-grok-4.6-high", fast: undefined },
  ]) assert.throws(() => validateCursorWriterRuntime(config), CursorWriterExecutionError);
  assert.throws(() => validateCursorWriterRuntime({ provider: "luna", requestedModel: "cursor-grok-4.6-high", fast: false }), /Cursor SDK/);
});

test("wrong resolved model fails after Cursor dispatch and leaves no valid completion receipt", async () => {
  const store = createMemoryCursorReceiptStore();
  const executor = createCursorWriterExecutor({ sdk: sdk({ resolvedModel: "cursor-grok-4.5" }), env: { CURSOR_MODEL: "cursor-grok-4.6-high", CURSOR_FAST: "false" }, receiptStore: store });
  await assert.rejects(() => executor.dispatch("writer1", { fixture: true }, "approved writer fixture"), /resolved model/);
  assert.equal(store.records.size, 0);
});

test("arbitrary injected production adapters are rejected", () => {
  assert.equal(isCursorWriterExecutor({ provider: "cursor-sdk", dispatch: async () => ({}) }), false);
});

test("three writer receipts are Cursor-only, complete, digest-bound, and expose direct thread URLs", async () => {
  const store = createMemoryCursorReceiptStore();
  const executor = createCursorWriterExecutor({ sdk: sdk(), env: { CURSOR_MODEL: "cursor-grok-4.6-high", CURSOR_FAST: "false" }, receiptStore: store });
  for (const stage of ["writer1", "writer2", "writer3"] as const) {
    const result = await executor.dispatch(stage, { stage, approved: true }, `prompt for ${stage}`);
    validateCursorWriterReceipt(result.receipt);
    assert.equal(result.receipt.provider, "cursor-sdk");
    assert.equal(result.receipt.requestedModel, "cursor-grok-4.6-high");
    assert.equal(result.receipt.resolvedModel, "cursor-grok-4.6-high");
    assert.equal(result.receipt.fast, false);
    assert.match(result.threadUrl, /^https:\/\/cursor\.com\/agent\//);
  }
  assert.equal(store.records.size, 3);
});

test("missing or mutated completion receipts cannot validate production state", () => {
  const state = createInitialState({ handoff: garageDoor360FourPageHandoff as any });
  state.executionMode = "cursor-production";
  state.stages[STAGES.WRITER_1] = { status: "complete" };
  assert.throws(() => validateState(state), /Cursor receipt/);
});

test("interrupted Cursor work reattaches by persisted agent ID without creating duplicate copy work", async () => {
  const store = createMemoryCursorReceiptStore();
  const firstSdk = sdk({ wait: async () => { throw new Error("interrupted"); } });
  const first = createCursorWriterExecutor({ sdk: firstSdk, env: { CURSOR_MODEL: "cursor-grok-4.6-high", CURSOR_FAST: "false" }, receiptStore: store });
  await assert.rejects(() => first.dispatch("writer2", { stable: "input" }, "stable prompt"), /interrupted/);
  assert.equal(firstSdk.creates, 1);
  const secondSdk = sdk();
  const second = createCursorWriterExecutor({ sdk: secondSdk, env: { CURSOR_MODEL: "cursor-grok-4.6-high", CURSOR_FAST: "false" }, receiptStore: store });
  const resumed = await second.dispatch("writer2", { stable: "input" }, "stable prompt");
  assert.equal(secondSdk.creates, 0);
  assert.equal(secondSdk.gets, 1);
  assert.equal(resumed.receipt.status, "complete");
});

test("the real 360 handoff uses the production Cursor adapter seam without dispatching live work", async () => {
  const store = createMemoryCursorReceiptStore();
  const executor = createCursorWriterExecutor({ sdk: sdk(), env: { CURSOR_MODEL: "cursor-grok-4.6-high", CURSOR_FAST: "false" }, receiptStore: store });
  const result = await executor.dispatch("writer1", { sourceCheckpoint: garageDoor360FourPageHandoff.sourceCheckpoint, approvedServices: garageDoor360FourPageHandoff.prospect.destinations.servicePages.map((page) => page.url) }, "360 approved services fixture dispatch");
  assert.equal(result.receipt.stage, "writer1");
  assert.equal(result.receipt.provider, "cursor-sdk");
  assert.equal(result.receipt.agentId, "agent-360");
});
