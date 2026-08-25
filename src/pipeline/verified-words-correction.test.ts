import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { digestOf } from "../contracts/digests.js";
import {
  OFFICIAL_CURSOR_MODEL,
  WRITER1_CORRECTION_AGENT_ID,
  WRITER1_CORRECTION_THREAD_URL,
  createMemoryCursorReceiptStore,
  recoverCursorWriterCorrectionForTest,
  validateCursorWriterCorrectionReceipt,
  validateWriter1CorrectionBannedLanguage,
  validateWriter1CorrectionDiff,
  writer1CorrectionChangedPaths,
  writer1CorrectionFrozenDigest,
  type CursorArtifactClient,
  type CursorTestTransport,
  type CursorWriterCorrectionPrior,
} from "./cursor-writer.js";

const env = { CURSOR_API_KEY: "verified-test-secret", CURSOR_MODEL: "cursor-grok-4.6-high", CURSOR_FAST: "false" };
const registryItem = { id: OFFICIAL_CURSOR_MODEL, parameters: [{ id: "fast", values: [{ value: "false" }] }, { id: "effort", values: [{ value: "high" }] }] };
const registry = { items: [registryItem] };
const routeLabels = [["/garage-door-repair", "repair", 7], ["/garage-door-installation", "installation", 6]] as const;

function output(clean: boolean): Record<string, unknown> {
  const pages = routeLabels.map(([route, label, count]) => {
    const sections = Array.from({ length: count }, (_, index) => ({ id: `${label}-${index}`, heading: `Frozen heading ${index}`, body: `Frozen body ${index}` }));
    const review = { reviewId: `${label}-review`, quote: `Frozen quote ${label}`, attribution: "Frozen customer", provenance: { type: "review", ref: `${label}-review`, placement: "proof", section: sections[0]!.id } };
    return { type: "service", url: route, route, prescriptionId: `Service:${route}`, primaryKeyword: `${label} keyword`, title: `${label} title`, seoTitle: `${label} SEO`, metaDescription: `${label} meta`, h1: `${label} H1`, body: clean ? `Clear ${label} service guidance.` : `${label} body. Spring replacement is the most common related failure.`, sections, claims: [{ claimId: `${label}-claim`, claim: "Frozen claim", provenance: { type: "claim", ref: `${label}-claim`, placement: "body", section: sections[0]!.id } }], bodyClaims: [{ claimId: `${label}-claim` }], quotes: [review], quotePlacements: [review], reviewPlacements: [review], reviewEvidence: [{ reviewId: `${label}-review`, provenance: { type: "evidence", ref: `${label}-review`, placement: "pointer", section: sections[0]!.id } }], reviews: [review], placements: [{ ref: `${label}-review` }], provenance: { source: "sealed" } };
  });
  if (clean) for (const page of pages) { page.body = `Clear ${page.route} service guidance.`; (page.sections as Record<string, unknown>[]).forEach((section, index) => { section.heading = `What to expect ${index + 1}`; section.body = `Practical service information ${index + 1}.`; }); }
  return { schemaVersion: "words-writer1-output/v1", pages };
}

function artifact(bytes: Buffer, agentId = WRITER1_CORRECTION_AGENT_ID, updatedAt = "2026-08-25T03:00:00.000Z"): any {
  const sourceUrl = "https://bucket.s3.us-east-1.amazonaws.com/opaque-key?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=test";
  const logicalPath = "artifacts/writer1-output.json" as const; const cursorEndpoint = `https://api.cursor.com/v1/agents/${encodeURIComponent(agentId)}/artifacts/download?path=${encodeURIComponent(logicalPath)}`;
  const url = new URL(sourceUrl); const evidence = { scheme: "https" as const, host: url.hostname, pathname: url.pathname, queryParameterNames: [...url.searchParams.keys()].sort() }; const request = { agentId, logicalPath, cursorEndpoint, method: "GET" as const, apiVersion: "cloud-agent-api-v1" as const };
  const byteDigest = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  return { path: logicalPath, size: bytes.length, sha256: byteDigest, contentSize: bytes.length, byteDigest, updatedAt, downloadRequest: request, requestShapeDigest: digestOf(request), downloadRequestDigest: digestOf({ downloadRequest: request, presignedUrlEvidence: evidence }), presignedUrlEvidence: evidence, presignedUrlEvidenceDigest: digestOf(evidence) };
}

function harness(beforeBytes: Buffer, afterBytes: Buffer, counters: { creates: number; resumes: number; sends: number }): { transport: CursorTestTransport; client: CursorArtifactClient } {
  let after = false;
  const run = { id: "run-verified-correction-1", model: { id: OFFICIAL_CURSOR_MODEL }, wait: async () => ({ status: "finished", model: { id: OFFICIAL_CURSOR_MODEL }, fast: false, effort: "high", result: "summary must not be consumed" }) } as any;
  const agent = { agentId: WRITER1_CORRECTION_AGENT_ID, model: { id: OFFICIAL_CURSOR_MODEL }, send: async () => { counters.sends += 1; after = true; return run; } } as any;
  const transport: CursorTestTransport = { listModels: async () => registry, create: async () => { counters.creates += 1; throw new Error("Agent.create is forbidden for correction"); }, resume: async (id) => { counters.resumes += 1; assert.equal(id, WRITER1_CORRECTION_AGENT_ID); return agent; }, getAgent: async (id) => ({ id, url: WRITER1_CORRECTION_THREAD_URL }), getRun: async () => run };
  const client: CursorArtifactClient = { async list(_id) { const bytes = after ? afterBytes : beforeBytes; return [{ path: "artifacts/writer1-output.json", size: bytes.length, updatedAt: after ? "2026-08-25T03:01:00.000Z" : "2026-08-25T03:00:00.000Z" }]; }, async download(id, logicalPath) { assert.equal(id, WRITER1_CORRECTION_AGENT_ID); assert.equal(logicalPath, "artifacts/writer1-output.json"); const bytes = after ? afterBytes : beforeBytes; return { bytes, sourceUrl: "https://bucket.s3.us-east-1.amazonaws.com/opaque-key?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=test", agentId: id, logicalPath: "artifacts/writer1-output.json", cursorEndpoint: `https://api.cursor.com/v1/agents/${encodeURIComponent(id)}/artifacts/download?path=artifacts%2Fwriter1-output.json`, ...artifact(bytes, id, after ? "2026-08-25T03:01:00.000Z" : "2026-08-25T03:00:00.000Z"), }; } };
  void beforeBytes; void afterBytes; return { transport, client };
}

function prior(): CursorWriterCorrectionPrior { return { sourceBranch: "architect/360-words-canary-verified", sourceSha: "a".repeat(40), sealedHandoffDigest: "sha256:" + "b".repeat(64), inputDigest: digestOf({ sealed: true }), agentId: WRITER1_CORRECTION_AGENT_ID, threadUrl: WRITER1_CORRECTION_THREAD_URL }; }

test("verified correction freezes all non-mutable topology and recognizes only the bounded prose paths", () => {
  const before: any = output(false); const after: any = output(true); const changed = writer1CorrectionChangedPaths(before, after);
  assert.ok(changed.length > 0 && changed.every((value) => /^\/pages\/\d+\/(?:body|sections\/\d+\/(?:heading|body))$/u.test(value)));
  assert.equal(writer1CorrectionFrozenDigest(before), writer1CorrectionFrozenDigest(after));
  assert.equal(validateWriter1CorrectionBannedLanguage(after).length, 0);
  for (const mutation of [(value: any) => { value.pages[0].title = "changed"; }, (value: any) => { value.pages[0].quotes[0].quote = "changed"; }, (value: any) => { value.pages[1].reviewEvidence[0].provenance.ref = "changed"; }, (value: any) => { value.pages[0].sections.push({ id: "new", heading: "new", body: "new" }); }]) { const mutated = structuredClone(after); mutation(mutated); assert.ok(validateWriter1CorrectionDiff(before, mutated).length > 0); }
});

test("verified correction bans unsupported claims and internal language only in mutable prose; frozen quotes are exempt", () => {
  for (const phrase of [
    "Spring replacement is the most common related failure.",
    "Spring replacement is the most frequent failure.",
    "Spring replacement is a common related failure.",
    "Jenny coordinates a return visit.",
    "Jenny schedules follow-up visits.",
    "The same technician finds the problem and repairs it.",
    "This is not a separate add-on.",
    "There is no extra charge or separate fee.",
    "We reviewed 47 Google reviews.",
    "This section reflects the reviews.",
    "This page is based on evidence.",
    "The receipt digest is sealed.",
    "Authoritative written reviews support this.",
  ]) { const value: any = output(true); value.pages[0].body = phrase; assert.ok(validateWriter1CorrectionBannedLanguage(value).length > 0, phrase); }
  const quote: any = output(true); quote.pages[0].quotes[0].quote = "The receipt digest is sealed."; assert.equal(validateWriter1CorrectionBannedLanguage(quote).length, 0);
});

test("verified correction resumes the exact fresh agent, sends once, retrieves Cursor artifact, HMAC-binds direct receipt, and blocks Writer2", async () => {
  const before = output(false); const after = output(true); const beforeBytes = Buffer.from(JSON.stringify(before)); const afterBytes = Buffer.from(JSON.stringify(after)); const counters = { creates: 0, resumes: 0, sends: 0 }; const testHarness = harness(beforeBytes, afterBytes, counters); const store = createMemoryCursorReceiptStore(); const prompt = "verified correction prompt"; const p = prior();
  const first = await recoverCursorWriterCorrectionForTest({ env, receiptStore: store, prior: p, prompt, transport: testHarness.transport, artifactClient: testHarness.client, artifactBackoffMs: [0], validateBeforeOutput: (raw) => JSON.parse(raw), validateOutput: (value) => { assert.equal((value as any).pages.length, 2); } });
  assert.deepEqual(counters, { creates: 0, resumes: 1, sends: 1 }); assert.equal(first.receipt.agentId, WRITER1_CORRECTION_AGENT_ID); assert.equal(first.receipt.threadUrl, WRITER1_CORRECTION_THREAD_URL); assert.equal(first.receipt.writer2Blocked, true); assert.equal(first.receipt.nextStage, null); assert.ok(first.receipt.integrityMac); validateCursorWriterCorrectionReceipt(first.receipt, p, digestOf(prompt), env.CURSOR_API_KEY);
  const second = await recoverCursorWriterCorrectionForTest({ env, receiptStore: store, prior: p, prompt, transport: testHarness.transport, artifactClient: testHarness.client, artifactBackoffMs: [0], validateBeforeOutput: (raw) => JSON.parse(raw), validateOutput: () => undefined }); assert.deepEqual(counters, { creates: 0, resumes: 1, sends: 1 }); assert.deepEqual(second.receipt, first.receipt);
});

test("missing fresh Cursor artifact fails before any correction message", async () => {
  const counters = { creates: 0, resumes: 0, sends: 0 }; const empty: CursorArtifactClient = { list: async () => [], download: async () => { throw new Error("download must not run"); } }; const transport: CursorTestTransport = { listModels: async () => registry, create: async () => { counters.creates += 1; throw new Error("create forbidden"); }, resume: async () => { counters.resumes += 1; throw new Error("resume forbidden"); }, getAgent: async () => ({ id: WRITER1_CORRECTION_AGENT_ID, url: WRITER1_CORRECTION_THREAD_URL }) }; const p = prior(); await assert.rejects(() => recoverCursorWriterCorrectionForTest({ env, receiptStore: createMemoryCursorReceiptStore(), prior: p, prompt: "prompt", transport, artifactClient: empty, validateBeforeOutput: (raw) => JSON.parse(raw), validateOutput: () => undefined }), (error: any) => error?.code === "CURSOR_ARTIFACT_MISSING"); assert.deepEqual(counters, { creates: 0, resumes: 0, sends: 0 });
});
