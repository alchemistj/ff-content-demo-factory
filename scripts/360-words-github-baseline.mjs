import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const VERIFIED_WRITER1_GITHUB_BASELINE = Object.freeze({
  kind: "github-file",
  repository: "alchemistj/ff-content-demo-factory",
  sourceCommit: "efe429d4464d765b5b657cb0058f00fffb35d3d7",
  path: "canary/outputs/writer1-output.json",
  blobSha: "cc8612bc9085f63141de6ae0f1dd2b9c3e1f3e08",
  rawSha256: "sha256:f693aeb968e703efbe7f9c0a7a2d1a9d4185007e32a695386e1f5eec356964a2",
  size: 23509,
  authorship: "unverified-github-before-copy",
});

const ROUTES = ["/garage-door-repair", "/garage-door-installation"];
const COPY_FIELDS = ["prescriptionId", "primaryKeyword", "title", "seoTitle", "metaDescription", "h1", "body"];
const sha256 = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const gitBlobSha = (bytes) => createHash("sha1").update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest("hex");
const fail = (message) => { throw new Error(`GITHUB_WRITER1_BASELINE_INVALID: ${message}`); };

function exactShape(parsed, sealed) {
  if (!parsed || parsed.schemaVersion !== "words-writer1-output/v1" || !Array.isArray(parsed.pages) || parsed.pages.length !== 2) fail("schema must be words-writer1-output/v1 with exactly two pages");
  for (const [index, route] of ROUTES.entries()) {
    const page = parsed.pages[index];
    if (!page || page.type !== "service" || page.url !== route) fail(`page ${index} must be service route ${route}`);
    for (const field of COPY_FIELDS) if (typeof page[field] !== "string" || !page[field].trim()) fail(`${route} is missing ${field}`);
    if (!Array.isArray(page.sections) || page.sections.length !== (index === 0 ? 6 : 5)) fail(`${route} must have its sealed section count`);
    if (page.sections.some((section) => !section || typeof section.id !== "string" || !section.id.trim() || typeof section.heading !== "string" || !section.heading.trim() || typeof section.body !== "string" || !section.body.trim())) fail(`${route} has an invalid section`);
    const sealedPage = sealed?.pages?.find((candidate) => candidate?.url === route);
    const expectedPrescription = sealedPage?.id || sealedPage?.canonicalIntentId;
    if (!expectedPrescription || page.prescriptionId !== expectedPrescription) fail(`${route} prescriptionId is not bound to the sealed handoff`);
  }
  if (parsed.pages.some((page) => page.url === "/" || page.url === "/contact" || page.url.includes("spring") || page.url.includes("opener"))) fail("baseline contains a prohibited public route");
}

export function verifyGithubWriter1Baseline({ metadata, bytes, sealed, expected = VERIFIED_WRITER1_GITHUB_BASELINE }) {
  if (!metadata || metadata.repository !== expected.repository || metadata.commit !== expected.sourceCommit || metadata.path !== expected.path || metadata.blobSha !== expected.blobSha || metadata.size !== expected.size) fail("repository, commit, path, blob SHA, or size does not match the sealed baseline");
  if (!Buffer.isBuffer(bytes) || bytes.length !== expected.size) fail("downloaded bytes have the wrong size");
  if (gitBlobSha(bytes) !== expected.blobSha) fail("Git blob SHA does not match downloaded bytes");
  if (sha256(bytes) !== expected.rawSha256) fail("raw SHA-256 does not match downloaded bytes");
  let parsed;
  try { parsed = JSON.parse(bytes.toString("utf8")); } catch { fail("baseline is not JSON"); }
  exactShape(parsed, sealed);
  const sealedHandoffDigest = sealed?.resealDigest;
  if (typeof sealedHandoffDigest !== "string" || !/^sha256:[0-9a-f]{64}$/u.test(sealedHandoffDigest)) fail("sealed handoff digest is missing");
  return { kind: "github-file", repository: expected.repository, sourceCommit: expected.sourceCommit, path: expected.path, blobSha: expected.blobSha, rawSha256: expected.rawSha256, size: expected.size, contentSize: expected.size, byteDigest: expected.rawSha256, output: parsed, raw: bytes.toString("utf8"), bytes, sealedHandoffDigest, authorship: "unverified-github-before-copy" };
}

/**
 * Materialize the same files consumed by the verified runner from a GitHub
 * Contents API response. The persisted metadata uses `commit`, matching the
 * verifier's external file contract; `sourceCommit` remains the internal
 * normalized receipt field.
 */
export function materializeGithubWriter1Baseline({ apiResponse, sealed, expected = VERIFIED_WRITER1_GITHUB_BASELINE, outputRoot }) {
  const repository = expected.repository;
  const commit = expected.sourceCommit;
  const filePath = expected.path;
  if (!apiResponse || apiResponse.type !== "file" || apiResponse.path !== filePath || apiResponse.sha !== expected.blobSha || apiResponse.size !== expected.size || apiResponse.encoding !== "base64" || typeof apiResponse.content !== "string") fail("GitHub API metadata is not bound to the exact baseline file");
  const bytes = Buffer.from(apiResponse.content.replace(/\\s+/gu, ""), "base64");
  const verified = verifyGithubWriter1Baseline({ metadata: { repository, commit, path: filePath, blobSha: apiResponse.sha, size: apiResponse.size }, bytes, sealed, expected });
  if (typeof outputRoot !== "string" || !outputRoot) fail("baseline output root is required");
  fs.mkdirSync(outputRoot, { recursive: true });
  fs.writeFileSync(path.join(outputRoot, "writer1-output.json"), bytes);
  fs.writeFileSync(path.join(outputRoot, "metadata.json"), `${JSON.stringify({ kind: verified.kind, repository: verified.repository, commit, path: verified.path, blobSha: verified.blobSha, rawSha256: verified.rawSha256, size: verified.size, contentSize: verified.contentSize, byteDigest: verified.byteDigest, sealedHandoffDigest: verified.sealedHandoffDigest, authorship: verified.authorship }, null, 2)}\n`);
  return verified;
}

async function downloadBaseline() {
  const env = process.env;
  const expected = { ...VERIFIED_WRITER1_GITHUB_BASELINE, ...(env.BASELINE_BLOB_SHA ? { blobSha: env.BASELINE_BLOB_SHA } : {}), ...(env.BASELINE_RAW_SHA256 ? { rawSha256: env.BASELINE_RAW_SHA256.startsWith("sha256:") ? env.BASELINE_RAW_SHA256 : `sha256:${env.BASELINE_RAW_SHA256}` } : {}), ...(env.BASELINE_SIZE ? { size: Number(env.BASELINE_SIZE) } : {}) };
  const repository = env.BASELINE_REPOSITORY || expected.repository; const commit = env.BASELINE_COMMIT || expected.sourceCommit; const filePath = env.BASELINE_PATH || expected.path;
  const token = env.GITHUB_TOKEN || env.GH_TOKEN; if (!token) fail("GITHUB_TOKEN is required");
  const response = await fetch(`https://api.github.com/repos/${repository}/contents/${filePath}?ref=${commit}`, { headers: { accept: "application/vnd.github+json", authorization: `Bearer ${token}`, "x-github-api-version": "2022-11-28", "user-agent": "ff-content-demo-factory" } });
  if (!response.ok) fail(`GitHub API returned ${response.status}`);
  const json = await response.json();
  if (json.type !== "file" || json.path !== filePath || json.sha !== expected.blobSha || json.size !== expected.size || json.encoding !== "base64" || typeof json.content !== "string") fail("GitHub API metadata is not bound to the exact baseline file");
  const bytes = Buffer.from(json.content.replace(/\s+/gu, ""), "base64");
  const sealedPath = env.SEALED_HANDOFF_PATH || "canary/sealed/360-four-page-reseal-handoff.json";
  const sealed = JSON.parse(fs.readFileSync(sealedPath, "utf8"));
  const outputRoot = env.BASELINE_OUTPUT_ROOT || "canary/inputs/github-writer1-baseline";
  materializeGithubWriter1Baseline({ apiResponse: json, sealed, expected, outputRoot });
}

if (import.meta.url === `file://${process.argv[1]}`) downloadBaseline().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
