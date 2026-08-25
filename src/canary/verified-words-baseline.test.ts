import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import test from "node:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { digestOf } from "../../src/contracts/digests.js";
import { createMemoryCursorReceiptStore, recoverCursorWriterCorrectionV2ForTest, validateCursorWriterCorrectionReceipt, OFFICIAL_CURSOR_MODEL, REQUIRED_CURSOR_MODEL, type CursorArtifactClient, type CursorTestTransport, type CursorGitHubBaselineInput } from "../../src/pipeline/cursor-writer.js";
import { buildWriter1GithubBaselineCorrectionPrompt } from "../../scripts/360-words-recovery-prompt.mjs";
import { materializeGithubWriter1Baseline, verifyGithubWriter1Baseline, VERIFIED_WRITER1_GITHUB_BASELINE } from "../../scripts/360-words-github-baseline.mjs";

const agentId = "bc-2486f645-c31c-4532-8145-fbe3af1d45a8";
const threadUrl = `https://cursor.com/agents/${agentId}`;
const sealedHandoffDigest = `sha256:${"b".repeat(64)}`;
const registry = { items: [{ id: OFFICIAL_CURSOR_MODEL, parameters: [{ id: "fast", values: [{ value: "false" }] }, { id: "effort", values: [{ value: "high" }] }] }] };
const env = { CURSOR_API_KEY: "verified-baseline-test-secret", CURSOR_MODEL: REQUIRED_CURSOR_MODEL, CURSOR_FAST: "false" };
const sourceCommit = "efe429d4464d765b5b657cb0058f00fffb35d3d7";

function output(bodySuffix = "before"): Record<string, unknown> {
  const page = (url: string, prescriptionId: string, count: number) => ({ type: "service", url, prescriptionId, primaryKeyword: `${url.slice(1)} keyword`, title: `${url.slice(1)} title`, seoTitle: `${url.slice(1)} seo`, metaDescription: `${url.slice(1)} meta`, h1: `${url.slice(1)} heading`, body: `${url.slice(1)} body ${bodySuffix}`, sections: Array.from({ length: count }, (_, index) => ({ id: `${url.slice(1)}-${index}`, heading: `${url.slice(1)} heading ${index} ${bodySuffix}`, body: `${url.slice(1)} section ${index} ${bodySuffix}` })) });
  return { schemaVersion: "words-writer1-output/v1", pages: [page("/garage-door-repair", "Service:/garage-door-repair", 6), page("/garage-door-installation", "Service:/garage-door-installation", 5)] };
}
function bytes(value: unknown): Buffer { return Buffer.from(JSON.stringify(value), "utf8"); }
function gitBlobSha(raw: Buffer): string { return createHash("sha1").update(Buffer.concat([Buffer.from(`blob ${raw.length}\0`), raw])).digest("hex"); }
function rawSha(raw: Buffer): string { return `sha256:${createHash("sha256").update(raw).digest("hex")}`; }
function expectedFor(raw: Buffer): any { return { ...VERIFIED_WRITER1_GITHUB_BASELINE, blobSha: gitBlobSha(raw), rawSha256: rawSha(raw), size: raw.length }; }
function verifiedBaseline(before: Record<string, unknown>): CursorGitHubBaselineInput {
  const raw = bytes(before); const expected = expectedFor(raw);
  const checked = verifyGithubWriter1Baseline({ metadata: { repository: expected.repository, commit: sourceCommit, path: expected.path, blobSha: expected.blobSha, size: expected.size }, bytes: raw, sealed: { resealDigest: sealedHandoffDigest, pages: [{ type: "Home", url: "/" }, { type: "Service", url: "/garage-door-repair", id: "Service:/garage-door-repair" }, { type: "Service", url: "/garage-door-installation", id: "Service:/garage-door-installation" }, { type: "Contact", url: "/contact" }] }, expected });
  return { ...checked, outputDigest: digestOf(checked.output) } as CursorGitHubBaselineInput;
}
function artifactResult(agent: string, raw: Buffer, updatedAt: string): any {
  const logicalPath = "artifacts/writer1-output.json" as const; const endpoint = `https://api.cursor.com/v1/agents/${encodeURIComponent(agent)}/artifacts/download?path=artifacts%2Fwriter1-output.json`; const sourceUrl = "https://bucket.s3.us-east-1.amazonaws.com/opaque-key?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=test"; const parsed = new URL(sourceUrl); const evidence = { scheme: "https" as const, host: parsed.hostname, pathname: parsed.pathname, queryParameterNames: [...parsed.searchParams.keys()].sort() }; const request = { agentId: agent, logicalPath, cursorEndpoint: endpoint, method: "GET" as const, apiVersion: "cloud-agent-api-v1" as const }; return { bytes: raw, sourceUrl, agentId: agent, logicalPath, cursorEndpoint: endpoint, requestShapeDigest: digestOf(request), downloadRequestDigest: digestOf({ downloadRequest: request, presignedUrlEvidence: evidence }), presignedUrlEvidence: evidence, presignedUrlEvidenceDigest: digestOf(evidence), descriptor: { path: logicalPath, size: raw.length, sha256: rawSha(raw), updatedAt } };
}
function harness(after: Buffer, counters: { creates: number; resumes: number; sends: number; lists: number; downloads: number }): { transport: CursorTestTransport; client: CursorArtifactClient } {
  const run = { id: "run-github-baseline-v2", wait: async () => ({ status: "finished", model: { id: OFFICIAL_CURSOR_MODEL }, fast: false, effort: "high" }) } as any;
  const agent = { agentId, send: async () => { counters.sends += 1; return run; } } as any;
  const transport: CursorTestTransport = { listModels: async () => registry, create: async () => { counters.creates += 1; throw new Error("Agent.create is forbidden"); }, resume: async (id) => { counters.resumes += 1; assert.equal(id, agentId); return agent; }, getAgent: async (id) => ({ id, url: threadUrl }), getRun: async () => run };
  const client: CursorArtifactClient = { list: async () => { counters.lists += 1; return [{ path: "artifacts/writer1-output.json", size: after.length, sha256: rawSha(after), updatedAt: "2026-08-25T12:01:00.000Z" }]; }, download: async (id) => { counters.downloads += 1; return artifactResult(id, after, "2026-08-25T12:01:00.000Z"); } };
  return { transport, client };
}

test("GitHub baseline verifier binds exact repository, commit, path, blob, raw bytes, size, schema, routes, sections, and sealed prescriptions", () => {
  const raw = bytes(output()); const expected = expectedFor(raw); const sealed = { resealDigest: sealedHandoffDigest, pages: [{ type: "Service", url: "/garage-door-repair", id: "Service:/garage-door-repair" }, { type: "Service", url: "/garage-door-installation", id: "Service:/garage-door-installation" }] };
  assert.doesNotThrow(() => verifyGithubWriter1Baseline({ metadata: { repository: expected.repository, commit: sourceCommit, path: expected.path, blobSha: expected.blobSha, size: expected.size }, bytes: raw, sealed, expected }));
  for (const mutation of [
    { metadata: { repository: "evil/repo" } },
    { metadata: { commit: "0".repeat(40) } },
    { metadata: { path: "canary/outputs/other.json" } },
    { metadata: { blobSha: "0".repeat(40) } },
    { metadata: { size: expected.size + 1 } },
    { bytes: Buffer.concat([raw, Buffer.from("x")]) },
    { expected: { ...expected, rawSha256: `sha256:${"0".repeat(64)}` } },
  ]) assert.throws(() => verifyGithubWriter1Baseline({ metadata: { repository: expected.repository, commit: sourceCommit, path: expected.path, blobSha: expected.blobSha, size: expected.size, ...mutation.metadata }, bytes: mutation.bytes || raw, sealed, expected: mutation.expected || expected }), /GITHUB_WRITER1_BASELINE_INVALID/u);
});

test("downloader-equivalent GitHub fixture emits the metadata schema consumed by the verified baseline reader", async () => {
  const raw = bytes(output()); const expected = expectedFor(raw); const sealed = { resealDigest: sealedHandoffDigest, pages: [{ type: "Service", url: "/garage-door-repair", id: "Service:/garage-door-repair" }, { type: "Service", url: "/garage-door-installation", id: "Service:/garage-door-installation" }] };
  const outputRoot = await mkdtemp(join(tmpdir(), "ff-github-baseline-"));
  try {
    const apiResponse = { type: "file", path: expected.path, sha: expected.blobSha, size: expected.size, encoding: "base64", content: raw.toString("base64") };
    materializeGithubWriter1Baseline({ apiResponse, sealed, expected, outputRoot });
    const metadata = JSON.parse(await readFile(join(outputRoot, "metadata.json"), "utf8"));
    const persistedBytes = await readFile(join(outputRoot, "writer1-output.json"));
    assert.equal(metadata.commit, sourceCommit);
    assert.equal("sourceCommit" in metadata, false);
    assert.doesNotThrow(() => verifyGithubWriter1Baseline({ metadata, bytes: persistedBytes, sealed, expected }));
  } finally {
    await rm(outputRoot, { recursive: true, force: true });
  }
});

test("v2 correction uses GitHub baseline when Cursor has no prior artifact, sends once, binds untrusted before-copy separately from new model receipt, and retries without a second send", async () => {
  const before = output(); const after = output("after"); const baseline = verifiedBaseline(before); const prompt = buildWriter1GithubBaselineCorrectionPrompt(VERIFIED_WRITER1_GITHUB_BASELINE); const counters = { creates: 0, resumes: 0, sends: 0, lists: 0, downloads: 0 }; const { transport, client } = harness(bytes(after), counters); const store = createMemoryCursorReceiptStore(); const prior = { sourceBranch: "architect/360-words-canary-verified", sourceSha: "a".repeat(40), sealedHandoffDigest, inputDigest: digestOf({ v2: true }), agentId, threadUrl };
  const first = await recoverCursorWriterCorrectionV2ForTest({ env, receiptStore: store, prior, prompt, baseline, transport, artifactClient: client, artifactBackoffMs: [0], validateBeforeOutput: (raw) => JSON.parse(raw), validateOutput: (value) => { assert.equal((value as any).pages.length, 2); } });
  assert.deepEqual(counters, { creates: 0, resumes: 1, sends: 1, lists: 1, downloads: 1 }); assert.equal(first.receipt.correctionVersion, "words-writer1-correction/v2"); assert.equal((first.receipt as any).githubBaseline.authorship, "unverified-github-before-copy"); assert.equal(first.receipt.requestedModel, REQUIRED_CURSOR_MODEL); assert.equal(first.receipt.resolvedModel, OFFICIAL_CURSOR_MODEL); assert.equal(first.receipt.effort, "high"); assert.equal(first.receipt.fast, false); assert.equal(first.receipt.writer2Blocked, true); assert.equal((first.receipt.beforeArtifact as any).kind, "github-file"); assert.equal(first.receipt.beforeArtifact.byteDigest, baseline.rawSha256); validateCursorWriterCorrectionReceipt(first.receipt, prior, digestOf(prompt), env.CURSOR_API_KEY, first.receipt.githubBaseline as any);
  const second = await recoverCursorWriterCorrectionV2ForTest({ env, receiptStore: store, prior, prompt, baseline, transport, artifactClient: client, artifactBackoffMs: [0], validateBeforeOutput: (raw) => JSON.parse(raw), validateOutput: () => undefined }); assert.deepEqual(counters, { creates: 0, resumes: 1, sends: 1, lists: 2, downloads: 2 }); assert.deepEqual(second.receipt, first.receipt);
});

test("v2 baseline tamper fails before transport/vendor and cannot convert the actual missing-artifact case into a sent-message claim", async () => {
  const baseline = verifiedBaseline(output()); const prior = { sourceBranch: "architect/360-words-canary-verified", sourceSha: "a".repeat(40), sealedHandoffDigest, inputDigest: digestOf({ v2: true }), agentId, threadUrl }; const counters = { creates: 0, resumes: 0, sends: 0, lists: 0, downloads: 0 }; const blocked: CursorTestTransport = { listModels: async () => { throw new Error("vendor must not be reached"); }, create: async () => { counters.creates += 1; throw new Error("create forbidden"); }, resume: async () => { counters.resumes += 1; throw new Error("resume forbidden"); }, getAgent: async () => ({ id: agentId, url: threadUrl }) }; const tampered = { ...baseline, rawSha256: `sha256:${"0".repeat(64)}` } as any;
  await assert.rejects(() => recoverCursorWriterCorrectionV2ForTest({ env, receiptStore: createMemoryCursorReceiptStore(), prior, prompt: buildWriter1GithubBaselineCorrectionPrompt(VERIFIED_WRITER1_GITHUB_BASELINE), baseline: tampered, transport: blocked, artifactClient: { list: async () => [], download: async () => { throw new Error("download forbidden"); } }, validateOutput: () => undefined }), /baseline/u); assert.deepEqual(counters, { creates: 0, resumes: 0, sends: 0, lists: 0, downloads: 0 });
});
