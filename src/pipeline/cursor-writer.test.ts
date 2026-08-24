import assert from "node:assert/strict";
import test from "node:test";
import { garageDoor360FourPageHandoff } from "../../fixtures/360-garage-door-four-page.js";
import { createInitialState, stageInputProjection, stagePrompt, STAGES, validateState } from "./state.js";
import {
  createCursorWriterExecutorForTest,
  type CursorTestTransport,
} from "./cursor-writer.test-seam.js";
import {
  createMemoryCursorReceiptStore,
  createJsonCursorReceiptStore,
  CursorWriterExecutionError,
  isCursorWriterExecutor,
  validateCursorWriterReceipt,
  validateCursorWriterRuntime,
  OFFICIAL_CURSOR_MODEL,
  type CursorWriterReceipt,
  type CursorDispatchClaim,
} from "./cursor-writer.js";
import { digestOf } from "../contracts/digests.js";

const env = { CURSOR_API_KEY: "test-key", CURSOR_MODEL: "cursor-grok-4.6-high", CURSOR_FAST: "false" };
const agentId = "bc-00000000-0000-4000-8000-000000000001";
const runId = "run-00000000-0000-4000-8000-000000000001";
const registry = { items: [{ id: OFFICIAL_CURSOR_MODEL, displayName: "Grok 4.6", parameters: [{ id: "fast", values: [{ value: "false" }, { value: "true" }] }, { id: "effort", values: [{ value: "low" }, { value: "medium" }, { value: "high" }] }] }] };
function transport(options: { resolvedModel?: string; url?: string | undefined; wait?: () => unknown | Promise<unknown>; delay?: number; fast?: unknown; models?: any } = { url: `https://cursor.com/agents/${agentId}` }): CursorTestTransport & { creates: number; resumes: number; gets: number; sends: number; lastCreate?: any } {
  const value = { creates: 0, resumes: 0, gets: 0, sends: 0 } as CursorTestTransport & { creates: number; resumes: number; gets: number; sends: number; lastCreate?: any };
  const agentUrl = Object.prototype.hasOwnProperty.call(options, "url") ? options.url : `https://cursor.com/agents/${agentId}`;
  const resolvedModel = options.resolvedModel || OFFICIAL_CURSOR_MODEL;
  const makeRun = () => ({ id: runId, agentId, model: { id: resolvedModel }, wait: async () => options.wait ? await options.wait() : { status: "finished", result: { stage: "fixture", ...(options.fast === undefined ? {} : { fast: options.fast }) }, model: { id: resolvedModel } } } as any);
  const makeAgent = () => ({ agentId, model: { id: resolvedModel }, send: async () => { value.sends += 1; return makeRun(); } } as any);
  value.listModels = async () => Object.prototype.hasOwnProperty.call(options, "models") ? options.models : registry;
  value.create = async (createOptions) => { value.creates += 1; value.lastCreate = createOptions; if (options.delay) await new Promise((resolve) => setTimeout(resolve, options.delay)); const agent = makeAgent(); return { agent: agent as any, run: await agent.send("fixture") }; };
  value.resume = async () => { value.resumes += 1; return makeAgent() as any; };
  value.getAgent = async (id) => { value.gets += 1; return agentUrl === undefined ? { id } as any : { id, url: agentUrl }; };
  value.getRun = async () => makeRun();
  return value;
}

test("runtime fails closed for missing/Auto/wrong model, Luna, fast true, and omitted fast", () => {
  for (const config of [
    { provider: "cursor-sdk", requestedModel: undefined, fast: false },
    { provider: "cursor-sdk", requestedModel: "Auto", fast: false },
    { provider: "cursor-sdk", requestedModel: "cursor-other", fast: false },
    { provider: "cursor-sdk", requestedModel: "cursor-grok-4.6-high", fast: true },
    { provider: "cursor-sdk", requestedModel: "cursor-grok-4.6-high", fast: undefined },
    { provider: "luna", requestedModel: "cursor-grok-4.6-high", fast: false },
  ]) assert.throws(() => validateCursorWriterRuntime(config), CursorWriterExecutionError);
});

test("production rejects arbitrary structural SDK injection", () => {
  assert.throws(() => createCursorWriterExecutorForTest({ transport: {} as CursorTestTransport, receiptStore: createMemoryCursorReceiptStore(), env }), CursorWriterExecutionError);
  assert.equal(isCursorWriterExecutor({ provider: "cursor-sdk", dispatch: async () => ({}) }), false);
});

test("official cloud agent URL is required, authentic, and bound to the returned agent ID", async () => {
  for (const url of [undefined, "https://cursor.com/agents/other", "https://cursor.com/agents", "https://cursor.com/agent/bc-x", "https://example.test/agents/bc-x"]) {
    const executor = createCursorWriterExecutorForTest({ transport: transport({ url }), receiptStore: createMemoryCursorReceiptStore(), env });
    await assert.rejects(() => executor.dispatch("writer1", { url }, "prompt", "run-url"), /thread URL/);
  }
  const store = createMemoryCursorReceiptStore(); const executor = createCursorWriterExecutorForTest({ transport: transport(), receiptStore: store, env });
  const result = await executor.dispatch("writer1", { valid: true }, "prompt", "run-valid");
  assert.equal(result.threadUrl, `https://cursor.com/agents/${agentId}`); validateCursorWriterReceipt(result.receipt);
});

test("cloud dispatch seam carries the exact model and explicit fast=false into the create request", async () => {
  const sdk = transport(); const executor = createCursorWriterExecutorForTest({ transport: sdk, receiptStore: createMemoryCursorReceiptStore(), env });
  await executor.dispatch("writer1", { request: true }, "prompt", "run-request");
  assert.deepEqual(sdk.lastCreate.model, { id: "grok-4.6", params: [{ id: "fast", value: "false" }, { id: "effort", value: "high" }] });
  assert.deepEqual(sdk.lastCreate.cloud, { env: { type: "cloud" } });
});

test("resolved model must be official run attestation, not requested-model fallback", async () => {
  const executor = createCursorWriterExecutorForTest({ transport: transport({ resolvedModel: "cursor-grok-4.5" }), receiptStore: createMemoryCursorReceiptStore(), env });
  await assert.rejects(() => executor.dispatch("writer1", { fixture: true }, "prompt", "run-model"), /resolved model/);
});

test("the one allowlisted alias resolves only through the official registry", async () => {
  for (const models of [undefined, { items: [{ id: "grok-4.5" }] }, { items: [{ id: "grok-4.6", parameters: [{ id: "fast", values: [{ value: "true" }] }] }] }, { items: [{ id: "grok-4.6", parameters: [{ id: "fast", values: [{ value: "false" }] }, { id: "effort", values: [{ value: "low" }] }] }] }]) {
    const executor = createCursorWriterExecutorForTest({ transport: transport({ models }), receiptStore: createMemoryCursorReceiptStore(), env });
    await assert.rejects(() => executor.dispatch("writer1", { models }, "prompt", "run-registry"), /registry|fast|effort/iu);
  }
  const noEffort = { items: [{ id: "grok-4.6", parameters: [{ id: "fast", values: [{ value: "false" }] }] }] };
  const result = await createCursorWriterExecutorForTest({ transport: transport({ models: noEffort }), receiptStore: createMemoryCursorReceiptStore(), env }).dispatch("writer1", { default: true }, "prompt", "run-registry-default");
  assert.equal(result.receipt.effortAttestationSource, "named-model-default"); assert.deepEqual(result.receipt.modelParams, [{ id: "fast", value: "false" }]);
});

test("official effort attestation cannot downgrade high", async () => {
  const sdk = transport({ wait: async () => ({ status: "finished", result: { effort: "medium" }, model: { id: OFFICIAL_CURSOR_MODEL } }) });
  const executor = createCursorWriterExecutorForTest({ transport: sdk, receiptStore: createMemoryCursorReceiptStore(), env });
  await assert.rejects(() => executor.dispatch("writer1", { effort: true }, "prompt", "run-effort-mismatch"), /effort/iu);
});

test("alias mismatch is rejected before any Cursor create", async () => {
  const sdk = transport(); const badEnv = { ...env, CURSOR_MODEL: "grok-4.6" };
  const executor = createCursorWriterExecutorForTest({ transport: sdk, receiptStore: createMemoryCursorReceiptStore(), env: badEnv });
  await assert.rejects(() => executor.dispatch("writer1", {}, "prompt", "run-alias"), /model/iu); assert.equal(sdk.creates, 0);
});

test("official fast=true fails; absent fast is accepted only through the bound request", async () => {
  const bad = createCursorWriterExecutorForTest({ transport: transport({ fast: true }), receiptStore: createMemoryCursorReceiptStore(), env });
  await assert.rejects(() => bad.dispatch("writer1", { fast: true }, "prompt", "run-fast-true"), /fast/);
  const good = createCursorWriterExecutorForTest({ transport: transport(), receiptStore: createMemoryCursorReceiptStore(), env });
  const result = await good.dispatch("writer1", { fast: false }, "prompt", "run-fast-absent");
  assert.equal(result.receipt.attestationSource, "bound-create-request"); assert.equal(result.receipt.apiVersion, "cloud-agent-api-v1");
});

test("all three writer receipts carry every required field and output binding", async () => {
  const store = createMemoryCursorReceiptStore(); const executor = createCursorWriterExecutorForTest({ transport: transport(), receiptStore: store, env });
  for (const stage of ["writer1", "writer2", "writer3"] as const) {
    const result = await executor.dispatch(stage, { stage }, `prompt for ${stage}`, "run-360"); validateCursorWriterReceipt(result.receipt);
    assert.equal(result.receipt.provider, "cursor-sdk"); assert.equal(result.receipt.fast, false); assert.equal(result.receipt.jobId, runId); assert.equal(result.receipt.agentId, agentId);
  }
  const base = [...store.records.values()][0] as CursorWriterReceipt;
  for (const field of ["stage", "provider", "requestedModel", "resolvedModel", "fast", "jobId", "agentId", "threadUrl", "inputDigest", "promptDigest", "outputDigest", "completedAt", "status", "output", "requestDigest", "createRequest", "registryItem", "registryDigest", "modelParams", "effort", "effortParameterId", "effortAttestationSource", "attestationSource", "apiVersion"] as const) {
    const mutated = { ...base, [field]: field === "fast" ? true : field === "output" ? { forged: true } : field === "completedAt" ? "not-a-date" : "mutated" };
    assert.throws(() => validateCursorWriterReceipt(mutated), /Cursor|Receipt|receipt/);
  }
});

test("concurrent identical dispatches create at most one cloud job", async () => {
  const store = createMemoryCursorReceiptStore(); const sdk = transport({ delay: 20 }); const executor = createCursorWriterExecutorForTest({ transport: sdk, receiptStore: store, env });
  const first = executor.dispatch("writer2", { same: true }, "same prompt", "run-concurrent");
  const second = assert.rejects(() => executor.dispatch("writer2", { same: true }, "same prompt", "run-concurrent"), (error: unknown) => error instanceof CursorWriterExecutionError && error.code === "CURSOR_DISPATCH_IN_PROGRESS");
  const result = await first; await second;
  assert.equal(sdk.creates, 1); assert.equal(sdk.sends, 1); // create owns the single prompt send at the official transport seam.
  assert.equal(result.receipt.outputDigest, result.receipt.outputDigest);
});

test("durable JSON receipt store persists the atomic claim before dispatch", async () => {
  const store = createJsonCursorReceiptStore(`/tmp/ff-words-receipts-${process.pid}-${Date.now()}.json`);
  const claim: CursorDispatchClaim = { key: "claim-key", stage: "writer1", runId: "run-1", inputDigest: "sha256:" + "1".repeat(64), promptDigest: "sha256:" + "2".repeat(64), ownerToken: "owner", requestedAgentId: agentId, claimedAt: new Date().toISOString() };
  assert.equal((await store.tryClaim!(claim.key, claim)).acquired, true);
  assert.equal((await store.tryClaim!(claim.key, { ...claim, ownerToken: "other" })).acquired, false);
  assert.equal((await store.getClaim!(claim.key))?.ownerToken, "owner");
});

test("interrupted work reattaches by persisted claim/agent identity without duplicate create", async () => {
  const store = createMemoryCursorReceiptStore(); const firstTransport = transport({ wait: async () => { throw new Error("interrupted"); } });
  const first = createCursorWriterExecutorForTest({ transport: firstTransport, receiptStore: store, env }); await assert.rejects(() => first.dispatch("writer2", { stable: true }, "stable prompt", "run-resume")); assert.equal(firstTransport.creates, 1);
  const interruptedClaim = store.claims.values().next().value as CursorDispatchClaim; interruptedClaim.leaseUntil = new Date(0).toISOString(); store.claims.set(interruptedClaim.key, interruptedClaim);
  const secondTransport = transport(); const second = createCursorWriterExecutorForTest({ transport: secondTransport, receiptStore: store, env });
  const result = await second.dispatch("writer2", { stable: true }, "stable prompt", "run-resume"); assert.equal(secondTransport.creates, 0); assert.equal(secondTransport.resumes, 1); assert.equal(secondTransport.sends, 0); assert.equal(result.receipt.status, "complete");
});

test("missing or minimal forged production receipts fail state validation", () => {
  const state = createInitialState({ handoff: garageDoor360FourPageHandoff as any }); state.executionMode = "cursor-production"; state.stages[STAGES.WRITER_1] = { status: "complete" }; assert.throws(() => validateState(state), /Cursor receipt/);
});

test("production state recomputes stage projection and binds receipt to the completed claim", async () => {
  const state = createInitialState({ handoff: garageDoor360FourPageHandoff as any }); state.executionMode = "cursor-production";
  const executor = createCursorWriterExecutorForTest({ transport: transport(), receiptStore: createMemoryCursorReceiptStore(), env });
  const dispatched = await executor.dispatch("writer1", { bound: true }, stagePrompt("writer1"), state.runId);
  const receipt = dispatched.receipt; const claim = dispatched.claim!;
  state.writerReceipts.writer1 = receipt as any; state.writerClaims.writer1 = claim as any;
  state.writerBindings.writer1 = { stage: "writer1", stageProjectionDigest: digestOf(stageInputProjection(state, "writer1")), receiptDigest: digestOf(receipt), inputDigest: receipt.inputDigest, promptDigest: receipt.promptDigest, outputDigest: receipt.outputDigest, agentId: receipt.agentId, jobId: receipt.jobId, threadUrl: receipt.threadUrl, claimKey: claim.key, ownerToken: claim.ownerToken };
  state.stages[STAGES.WRITER_1] = { status: "complete" };
  assert.doesNotThrow(() => validateState(state));
  const forged = structuredClone(state); forged.writerBindings.writer1!.stageProjectionDigest = digestOf({ forged: true });
  assert.throws(() => validateState(forged), /projection binding/);
  const outputTampered = structuredClone(state); outputTampered.writerReceipts.writer1!.output = { forged: true };
  assert.throws(() => validateState(outputTampered), /output|tampered/iu);
});

test("the real 360 fixture is accepted by the production adapter seam without live dispatch", async () => {
  const executor = createCursorWriterExecutorForTest({ transport: transport(), receiptStore: createMemoryCursorReceiptStore(), env });
  const result = await executor.dispatch("writer1", { sourceCheckpoint: garageDoor360FourPageHandoff.sourceCheckpoint, approvedServices: garageDoor360FourPageHandoff.prospect.destinations.servicePages.map((page) => page.url) }, "360 approved services fixture dispatch", garageDoor360FourPageHandoff.sourceCheckpoint.runId);
  assert.equal(result.receipt.agentId, agentId); assert.equal(result.receipt.threadUrl, `https://cursor.com/agents/${agentId}`);
});
