import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { canonicalize, digestOf } from "../contracts/digests.js";
import { OFFICIAL_CURSOR_MODEL, REQUIRED_CURSOR_MODEL, type CursorWriterReceipt } from "./cursor-writer.js";
import { runVerifiedWriter2ForTest, runVerifiedWriter3ForTest, validateVerifiedWriter2Output, validateVerifiedWriter3Output } from "./verified-words-stages.js";
import { VERIFIED_WRITER3_SEALED_FACTS } from "./verified-words-policy.js";

const secret = "verified-stage-test-secret";
process.env.CURSOR_API_KEY = secret;
const sealedDigest = `sha256:${"b".repeat(64)}`;
const registryItem = { id: OFFICIAL_CURSOR_MODEL, parameters: [{ id: "fast", values: [{ value: "false" }] }, { id: "effort", values: [{ value: "high" }] }] };
const cursorParams = [{ id: "fast", value: "false" }, { id: "effort", value: "high" }];
const thread = (agentId: string) => `https://cursor.com/agents/${agentId}`;
const mac = (receipt: Record<string, unknown>) => {
  const { integrityMac: _mac, ...unsigned } = receipt;
  const derived = createHmac("sha256", "ff-content-demo-factory/cursor-writer-receipt/hmac-sha256/v1").update(secret).digest();
  return `hmac-sha256:${createHmac("sha256", derived).update(JSON.stringify(canonicalize(unsigned)), "utf8").digest("hex")}`;
};
const approvalMac = (approval: Record<string, unknown>) => {
  const { signature: _signature, ...unsigned } = approval;
  const derived = createHmac("sha256", "ff-content-demo-factory/architect-stage-approval/hmac-sha256/v1").update(secret).digest();
  return `hmac-sha256:${createHmac("sha256", derived).update(JSON.stringify(canonicalize(unsigned)), "utf8").digest("hex")}`;
};
function receipt(stage: "writer1" | "writer2" | "writer3", agentId: string, output: unknown): CursorWriterReceipt {
  const createRequest = { apiVersion: "cloud-agent-api-v1", agentId, idempotencyKey: `${stage}-idempotency`, prompt: `${stage} prompt`, model: { id: OFFICIAL_CURSOR_MODEL, params: cursorParams }, cloud: { env: { type: "cloud" } } };
  const value: any = { stage, provider: "cursor-sdk", requestedModel: REQUIRED_CURSOR_MODEL, resolvedModel: OFFICIAL_CURSOR_MODEL, fast: false, jobId: `run-${stage}-verified`, agentId, threadUrl: thread(agentId), inputDigest: digestOf({ stage, input: true }), promptDigest: digestOf(`${stage} prompt`), outputDigest: digestOf(output), completedAt: "2026-08-25T03:00:00.000Z", status: "complete", output, requestDigest: digestOf(createRequest), createRequest, registryItem, registryDigest: digestOf(registryItem), modelParams: cursorParams, effort: "high", effortParameterId: "effort", effortAttestationSource: "official-registry-parameter", attestationSource: "bound-create-request", apiVersion: "cloud-agent-api-v1" };
  if (stage === "writer1") Object.assign(value, { mode: "same-thread-correction", correctionVersion: "words-writer1-correction/v1", writer2Blocked: true, nextStage: null });
  value.integrityMac = mac(value);
  return value as CursorWriterReceipt;
}
function approval(stage: "writer1" | "writer2", source: CursorWriterReceipt): Record<string, unknown> {
  const value: any = { schemaVersion: "architect-stage-approval/v1", stage, decision: "approve", approvedBy: "architect", independentQaArtifactPath: `qa/architect/${stage}-qa.json`, independentQaArtifactDigest: `sha256:${"a".repeat(64)}`, sealedHandoffDigest: sealedDigest, receiptDigest: digestOf(source), outputDigest: source.outputDigest, issuedAt: "2026-08-25T03:01:00.000Z" };
  value.signature = approvalMac(value); return value;
}
const writer1Output = { schemaVersion: "words-writer1-output/v1", pages: [{ type: "service", url: "/garage-door-repair" }, { type: "service", url: "/garage-door-installation" }] };
const writer2Output = { schemaVersion: "words-writer2-output/v1", homepage: { url: "/", body: "Home copy" }, contact: { url: "/contact", body: "Contact copy" }, header: { navigation: [{ href: "/garage-door-repair" }, { href: "/garage-door-installation" }] }, footer: { links: [{ href: "/contact" }] } };
const writer3Output = { schemaVersion: "words-writer3-output/v1", strategyOverview: { internal: true, body: "Internal strategy" }, reviewAnalysisFacts: VERIFIED_WRITER3_SEALED_FACTS };
function executor(): any {
  return { provider: "cursor-sdk", dispatch: async (stage: "writer2" | "writer3") => { const output = stage === "writer2" ? writer2Output : writer3Output; const next = receipt(stage, stage === "writer2" ? "bc-verified-writer2" : "bc-verified-writer3", output); return { output, receipt: next, threadUrl: next.threadUrl }; } };
}

test("verified Writer2 production seam requires signed Writer1 QA and creates a distinct direct receipt", async () => {
  const source = receipt("writer1", "bc-verified-writer1", writer1Output);
  const result = await runVerifiedWriter2ForTest({ runId: "run-verified-writer2", sealedHandoffDigest: sealedDigest, writer1Receipt: source, writer1Approval: approval("writer1", source) }, executor());
  assert.equal(result.receipt.stage, "writer2"); assert.notEqual(result.receipt.agentId, source.agentId); assert.notEqual(result.threadUrl, source.threadUrl); assert.equal(result.receipt.requestedModel, REQUIRED_CURSOR_MODEL); assert.equal(result.receipt.resolvedModel, OFFICIAL_CURSOR_MODEL); assert.equal(result.receipt.effort, "high"); assert.equal(result.receipt.fast, false); validateVerifiedWriter2Output(result.output);
  await assert.rejects(() => runVerifiedWriter2ForTest({ runId: "run-forged", sealedHandoffDigest: sealedDigest, writer1Receipt: source, writer1Approval: { ...approval("writer1", source), outputDigest: `sha256:${"f".repeat(64)}` } }, executor()), /signature|approval/u);
});

test("verified Writer3 production seam requires signed Writer2 QA and immutable sealed facts", async () => {
  const writer1 = receipt("writer1", "bc-verified-writer1", writer1Output);
  const writer2 = receipt("writer2", "bc-verified-writer2", writer2Output);
  const result = await runVerifiedWriter3ForTest({ runId: "run-verified-writer3", sealedHandoffDigest: sealedDigest, writer2Receipt: writer2, writer2Approval: approval("writer2", writer2) }, executor());
  assert.notEqual(result.receipt.agentId, writer2.agentId); validateVerifiedWriter3Output(result.output); assert.deepEqual(result.output.reviewAnalysisFacts, { retrievedWrittenReviewCount: 47, reviewRetrievalDate: "2026-08-23", reviewBackedServicesWithoutPages: 2, reviewBackedServiceNames: ["Garage door repair", "Garage door installation"] });
  assert.throws(() => validateVerifiedWriter3Output({ ...writer3Output, reviewAnalysisFacts: { ...VERIFIED_WRITER3_SEALED_FACTS, retrievedWrittenReviewCount: 48 } }), /immutable|sealed/u);
  assert.equal(writer1.stage, "writer1");
});

test("verified downstream validators reject local scope expansion and public Strategy routes", () => {
  assert.throws(() => validateVerifiedWriter2Output({ ...writer2Output, strategyOverview: { body: "forged" } }), /only Home|forbidden scope/u);
  assert.throws(() => validateVerifiedWriter2Output({ ...writer2Output, homepage: { url: "/garage-door-spring-repair", body: "forged" } }), /scope|forbidden/u);
  assert.throws(() => validateVerifiedWriter3Output({ ...writer3Output, strategyOverview: { ...writer3Output.strategyOverview, route: "/contact" } }), /public route|scope/u);
});

test("verified Writer2 recursively rejects nested review-analysis and strategy data while allowing ordinary nested public chrome", () => {
  const nestedReviewAnalysis = structuredClone(writer2Output) as any;
  nestedReviewAnalysis.homepage.sections = [{ blocks: [{ reviewAnalysisFacts: { retrievedWrittenReviewCount: 47 } }] }];
  assert.throws(() => validateVerifiedWriter2Output(nestedReviewAnalysis), /review-analysis/u);
  const nestedStrategy = structuredClone(writer2Output) as any;
  nestedStrategy.contact.contentBlocks = [{ metadata: { strategy: { body: "forged" } } }];
  assert.throws(() => validateVerifiedWriter2Output(nestedStrategy), /review-analysis/u);
  const nestedLedger = structuredClone(writer2Output) as any;
  nestedLedger.header.navigation = [{ href: "/garage-door-repair", data: [{ evidenceLedger: { ref: "sealed" } }] }];
  assert.throws(() => validateVerifiedWriter2Output(nestedLedger), /review-analysis/u);
  const nestedArray = structuredClone(writer2Output) as any;
  nestedArray.footer.links = [{ href: "/contact", metadata: [{ reviewAnalysisData: true }] }];
  assert.throws(() => validateVerifiedWriter2Output(nestedArray), /review-analysis/u);
  const clean = structuredClone(writer2Output) as any;
  clean.homepage.sections = [{ heading: "Welcome", body: "Clear service information.", blocks: [{ label: "Areas", body: "Local service." }] }];
  clean.contact.contentBlocks = [{ label: "Call", body: "Contact information." }];
  clean.header.navigation = [{ href: "/garage-door-repair", label: "Repair" }, { href: "/contact", label: "Contact" }];
  clean.footer.links = [{ href: "/", label: "Home" }];
  assert.doesNotThrow(() => validateVerifiedWriter2Output(clean));
});

test("verified Writer2 recursively enforces the exact four public routes for links and allows only safe contact protocols", () => {
  for (const link of ["/garage-door-opener-installation", "/strategy", "/future-page", "https://example.test/other", "javascript:alert(1)"]) {
    const value = structuredClone(writer2Output) as any;
    value.header.navigation = [{ href: "/", children: [{ route: link }] }];
    assert.throws(() => validateVerifiedWriter2Output(value), /unapproved route|forbidden scope/u, link);
  }
  const clean = structuredClone(writer2Output) as any;
  clean.header.navigation = [
    { href: "/", label: "Home" },
    { href: "/garage-door-repair", label: "Repair" },
    { href: "/garage-door-installation", label: "Installation" },
    { href: "/contact", label: "Contact" },
    { href: "tel:+15551234567", label: "Call" },
    { href: "mailto:hello@example.test", label: "Email" },
  ];
  clean.footer.links = [{ href: "/contact" }, { href: "tel:+15551234567" }];
  assert.doesNotThrow(() => validateVerifiedWriter2Output(clean));
});

test("verified Writer3 recursively rejects nested public page metadata while allowing clean internal strategy structures", () => {
  for (const mutation of [
    (value: any) => { value.strategyOverview.sections = [{ metadata: { homepage: { route: "/" } } }]; },
    (value: any) => { value.strategyOverview.references = [{ navigation: [{ href: "/contact" }] }]; },
    (value: any) => { value.strategyOverview.context = [{ footer: { links: [] } }]; },
    (value: any) => { value.strategyOverview.sources = [{ servicePage: { url: "/garage-door-repair" } }]; },
    (value: any) => { value.strategyOverview.details = [{ contact: { body: "public" } }]; },
    (value: any) => { value.strategyOverview.details = [{ pageType: "homepage" }]; },
  ]) {
    const value = structuredClone(writer3Output) as any;
    mutation(value);
    assert.throws(() => validateVerifiedWriter3Output(value), /public scope/u);
  }
  const clean = structuredClone(writer3Output) as any;
  clean.strategyOverview.sections = [{ heading: "Plan", body: "Internal planning notes." }];
  clean.strategyOverview.notes = [{ label: "Audience", value: "Owners" }, { label: "Tone", value: "Clear" }];
  assert.doesNotThrow(() => validateVerifiedWriter3Output(clean));
});
