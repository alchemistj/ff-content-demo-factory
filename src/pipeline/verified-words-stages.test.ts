import assert from "node:assert/strict";
import { createHmac, generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import { canonicalize, digestOf } from "../contracts/digests.js";
import { ARCHITECT_APPROVAL_KEY_ID, ARCHITECT_APPROVAL_PUBLIC_KEY_ENV, canonicalArchitectSigningPayload } from "./architect-approval.js";
import { OFFICIAL_CURSOR_MODEL, REQUIRED_CURSOR_MODEL, type CursorWriterReceipt } from "./cursor-writer.js";
import { runVerifiedWriter2ForTest, runVerifiedWriter3ForTest, validateVerifiedWriter1Approval, validateVerifiedWriter2Output, validateVerifiedWriter3Output, validateVerifiedWriter2ReleaseState, VERIFIED_WRITER1_APPROVED_ARTIFACT } from "./verified-words-stages.js";
import { ARCHITECT_WRITER1_QA_SCHEMA, VERIFIED_WRITER3_SEALED_FACTS, validateArchitectWriter1ApprovalEnvelope, validateArchitectWriter1QaArtifact } from "./verified-words-policy.js";

const secret = "verified-stage-test-secret";
process.env.CURSOR_API_KEY = secret;
const architectKeys = generateKeyPairSync("ed25519");
process.env[ARCHITECT_APPROVAL_PUBLIC_KEY_ENV] = architectKeys.publicKey.export({ type: "spki", format: "pem" }).toString();
const sealedDigest = `sha256:${"b".repeat(64)}`;
const registryItem = { id: OFFICIAL_CURSOR_MODEL, parameters: [{ id: "fast", values: [{ value: "false" }] }, { id: "effort", values: [{ value: "high" }] }] };
const cursorParams = [{ id: "fast", value: "false" }, { id: "effort", value: "high" }];
const thread = (agentId: string) => `https://cursor.com/agents/${agentId}`;
const mac = (receipt: Record<string, unknown>) => {
  const { integrityMac: _mac, ...unsigned } = receipt;
  const derived = createHmac("sha256", "ff-content-demo-factory/cursor-writer-receipt/hmac-sha256/v1").update(secret).digest();
  return `hmac-sha256:${createHmac("sha256", derived).update(JSON.stringify(canonicalize(unsigned)), "utf8").digest("hex")}`;
};
const approvalSignature = (approval: Record<string, unknown>) => `ed25519:${sign(null, Buffer.from(canonicalArchitectSigningPayload(approval), "utf8"), architectKeys.privateKey).toString("base64")}`;
function receipt(stage: "writer1" | "writer2" | "writer3", agentId: string, output: unknown): CursorWriterReceipt {
  const createRequest = { apiVersion: "cloud-agent-api-v1", agentId, idempotencyKey: `${stage}-idempotency`, prompt: `${stage} prompt`, model: { id: OFFICIAL_CURSOR_MODEL, params: cursorParams }, cloud: { env: { type: "cloud" } } };
  const value: any = { stage, provider: "cursor-sdk", requestedModel: REQUIRED_CURSOR_MODEL, resolvedModel: OFFICIAL_CURSOR_MODEL, fast: false, jobId: `run-${stage}-verified`, agentId, threadUrl: thread(agentId), inputDigest: digestOf({ stage, input: true }), promptDigest: digestOf(`${stage} prompt`), outputDigest: digestOf(output), completedAt: "2026-08-25T03:00:00.000Z", status: "complete", output, requestDigest: digestOf(createRequest), createRequest, registryItem, registryDigest: digestOf(registryItem), modelParams: cursorParams, effort: "high", effortParameterId: "effort", effortAttestationSource: "official-registry-parameter", attestationSource: "bound-create-request", apiVersion: "cloud-agent-api-v1" };
  if (stage === "writer1") Object.assign(value, { mode: "same-thread-correction", correctionVersion: "words-writer1-correction/v1", writer2Blocked: true, nextStage: null });
  value.integrityMac = mac(value);
  return value as CursorWriterReceipt;
}
function approval(stage: "writer1" | "writer2", source: CursorWriterReceipt): Record<string, unknown> {
  const value: any = { schemaVersion: "architect-stage-approval/v1", stage, decision: "approve", approvedBy: "architect", author: { kind: "architect", keyId: ARCHITECT_APPROVAL_KEY_ID }, independentQaArtifactPath: `qa/architect/${stage}-qa.json`, independentQaArtifactDigest: `sha256:${"a".repeat(64)}`, sealedHandoffDigest: sealedDigest, receiptDigest: digestOf(source), outputDigest: source.outputDigest, issuedAt: "2026-08-25T03:01:00.000Z" };
  value.signature = approvalSignature(value); return value;
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

test("production Writer2 approval boundary rejects a generic signed QA without the audited Writer1 seal", () => {
  const source = receipt("writer1", "bc-verified-writer1", writer1Output);
  assert.throws(() => validateVerifiedWriter1Approval(approval("writer1", source), source, secret, sealedDigest), /approval seal|exact successful artifact/u);
});

test("verified Writer3 production seam requires signed Writer2 QA and immutable sealed facts", async () => {
  const writer1 = receipt("writer1", "bc-verified-writer1", writer1Output);
  const writer2 = receipt("writer2", "bc-verified-writer2", writer2Output);
  const result = await runVerifiedWriter3ForTest({ runId: "run-verified-writer3", sealedHandoffDigest: sealedDigest, writer2Receipt: writer2, writer2Approval: approval("writer2", writer2) }, executor());
  assert.notEqual(result.receipt.agentId, writer2.agentId); validateVerifiedWriter3Output(result.output); assert.deepEqual(result.output.reviewAnalysisFacts, { retrievedWrittenReviewCount: 47, reviewRetrievalDate: "2026-08-23", reviewBackedServicesWithoutPages: 2, reviewBackedServiceNames: ["Garage door repair", "Garage door installation"] });
  assert.throws(() => validateVerifiedWriter3Output({ ...writer3Output, reviewAnalysisFacts: { ...VERIFIED_WRITER3_SEALED_FACTS, retrievedWrittenReviewCount: 48 } }), /immutable|sealed/u);
  assert.equal(writer1.stage, "writer1");
});

test("Architect Writer1 QA fixtures are real-shaped, Ed25519-signed, exact-role, and source-pinned", () => {
  const sourceBinding = {
    actionRunId: VERIFIED_WRITER1_APPROVED_ARTIFACT.actionRunId,
    artifactId: VERIFIED_WRITER1_APPROVED_ARTIFACT.artifactId,
    artifactZipDigest: VERIFIED_WRITER1_APPROVED_ARTIFACT.artifactZipDigest,
    artifactZipSize: VERIFIED_WRITER1_APPROVED_ARTIFACT.artifactZipSize,
    outputPath: VERIFIED_WRITER1_APPROVED_ARTIFACT.outputPath,
    outputDigest: VERIFIED_WRITER1_APPROVED_ARTIFACT.outputFileDigest,
    outputSize: VERIFIED_WRITER1_APPROVED_ARTIFACT.outputFileSize,
    receiptPath: VERIFIED_WRITER1_APPROVED_ARTIFACT.receiptPath,
    receiptDigest: VERIFIED_WRITER1_APPROVED_ARTIFACT.receiptDigest,
    receiptSize: VERIFIED_WRITER1_APPROVED_ARTIFACT.receiptSize,
    statePath: VERIFIED_WRITER1_APPROVED_ARTIFACT.statePath,
    stateDigest: VERIFIED_WRITER1_APPROVED_ARTIFACT.stateDigest,
    stateSize: VERIFIED_WRITER1_APPROVED_ARTIFACT.stateSize,
    serviceRoutes: ["/garage-door-repair", "/garage-door-installation"],
    changedPaths: VERIFIED_WRITER1_APPROVED_ARTIFACT.changedPaths,
    beforeOutputDigest: VERIFIED_WRITER1_APPROVED_ARTIFACT.beforeOutputDigest,
    afterOutputDigest: VERIFIED_WRITER1_APPROVED_ARTIFACT.afterOutputDigest,
    frozenDigest: VERIFIED_WRITER1_APPROVED_ARTIFACT.frozenDigest,
    sealedHandoffDigest: sealedDigest,
  };
  const qa = (role: "content" | "evidence") => {
    const value: any = { schemaVersion: ARCHITECT_WRITER1_QA_SCHEMA, stage: "writer1", decision: "PASS", author: { kind: "architect", keyId: ARCHITECT_APPROVAL_KEY_ID }, role, source: sourceBinding, issuedAt: "2026-08-25T03:01:00.000Z" };
    value.signature = approvalSignature(value); return value;
  };
  assert.doesNotThrow(() => validateArchitectWriter1QaArtifact(qa("content"), "content"));
  assert.doesNotThrow(() => validateArchitectWriter1QaArtifact(qa("evidence"), "evidence"));
  assert.throws(() => validateArchitectWriter1QaArtifact({ ...qa("content"), author: { kind: "luna", keyId: ARCHITECT_APPROVAL_KEY_ID } }, "content"), /Architect/u);
  assert.throws(() => validateArchitectWriter1QaArtifact({ ...qa("evidence"), extra: true }, "evidence"), /unexpected keys/u);
  const approvalValue: any = { schemaVersion: "architect-writer1-approval/v1", stage: "writer1", decision: "APPROVE", author: { kind: "architect", keyId: ARCHITECT_APPROVAL_KEY_ID }, qaArtifacts: [{ role: "content", path: "qa/architect/writer1-content.json", size: 101, digest: `sha256:${"1".repeat(64)}`, decision: "PASS" }, { role: "evidence", path: "qa/architect/writer1-evidence.json", size: 102, digest: `sha256:${"2".repeat(64)}`, decision: "PASS" }], sealedHandoffDigest: sealedDigest, receiptDigest: digestOf(sourceBinding), outputDigest: VERIFIED_WRITER1_APPROVED_ARTIFACT.outputFileDigest, verifiedWriter1Seal: { schemaVersion: "verified-writer1-approval-seal/v1" }, issuedAt: "2026-08-25T03:01:00.000Z" };
  approvalValue.signature = approvalSignature(approvalValue);
  assert.doesNotThrow(() => validateArchitectWriter1ApprovalEnvelope(approvalValue, sealedDigest));
  assert.throws(() => validateArchitectWriter1ApprovalEnvelope({ ...approvalValue, qaArtifacts: approvalValue.qaArtifacts.map((item: any) => ({ ...item, path: "luna/qa/writer1.json" })) }, sealedDigest), /exact external path|content and evidence|QA/u);
});

test("Writer3 release requires persisted Writer2 state, while the two wake stages remain separate", () => {
  const state = { schemaVersion: "verified-writer2-state/v1", status: "awaiting-writer2-architect-qa", stage: "writer2", receiptPath: "canary/runtime/verified-writer2-receipt.json", outputPath: "canary/outputs/verified-writer2.json", messagesSent: 1, writer3Blocked: true, writer2Blocked: false, nextStage: null };
  assert.doesNotThrow(() => validateVerifiedWriter2ReleaseState(state));
  assert.throws(() => validateVerifiedWriter2ReleaseState({ ...state, writer3Blocked: false }), /blocked state/u);
  assert.throws(() => validateVerifiedWriter2ReleaseState({ ...state, nextStage: "writer3" }), /blocked state/u);
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
