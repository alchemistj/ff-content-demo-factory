import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { createCursorWriterExecutor, createJsonCursorReceiptStore, type CursorDispatchNotice } from "../src/pipeline/cursor-writer.js";
import { digestOf } from "../src/contracts/digests.js";

const DORMANT_NONCE = "DORMANT";
const ROUTES = ["/", "/garage-door-repair", "/garage-door-installation", "/contact"] as const;
const WRITER1_ROUTES = ["/garage-door-repair", "/garage-door-installation"] as const;
type Dict = Record<string, any>;

function jsonFile(root: string, relative: string): string { return path.join(root, relative); }
function readJson(root: string, relative: string): Dict { return JSON.parse(readFileSync(jsonFile(root, relative), "utf8")) as Dict; }
function gitBlobSha(raw: Buffer): string { return createHash("sha1").update(Buffer.concat([Buffer.from(`blob ${raw.length}\0`), raw])).digest("hex"); }
function sha256(raw: Buffer): string { return `sha256:${createHash("sha256").update(raw).digest("hex")}`; }
function equalArray(actual: unknown, expected: readonly string[], label: string): void {
  if (!Array.isArray(actual) || actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) throw new Error(`${label} does not match the sealed route set`);
}

export function validateSealed(root = process.cwd(), handoffOverride?: { raw: Buffer; value: Dict }): { handoff: Dict; manifest: Dict; pin: Dict; ledger: Dict; approval: Dict } {
  const manifest = readJson(root, "canary/sealed/360-handoff-manifest.json");
  const pin = readJson(root, "canary/sealed/360-trusted-pin.json");
  const ledger = readJson(root, "canary/sealed/360-service-coverage-ledger.json");
  const projection = readJson(root, manifest.projectionPath);
  const approval = readJson(root, "canary/sealed/360-four-page-approval.json");
  const handoffPath = manifest.importedFrom.path === "canary/outputs/360-four-page-reseal-handoff.json"
    ? "canary/sealed/360-four-page-reseal-handoff.json"
    : manifest.importedFrom.path;
  const raw = handoffOverride?.raw || readFileSync(jsonFile(root, handoffPath));
  const handoff = handoffOverride?.value || JSON.parse(raw.toString("utf8")) as Dict;
  if (manifest.importedFrom.commit !== "4063cb7265d32f4d4739c1dc7724d5a6d3a8d381") throw new Error("sealed handoff is not pinned to the authoritative PR3 commit");
  if (manifest.importedFrom.blobSha !== gitBlobSha(raw) || manifest.importedFrom.byteLength !== raw.length) throw new Error("sealed handoff blob identity or byte length mismatch");
  if (handoff.resealDigest !== manifest.importedFrom.resealDigest) throw new Error("sealed handoff reseal digest mismatch");
  if (handoff.noVendorReseal !== true || handoff.vendorBoundaryProof?.apifyCalls !== 0 || handoff.vendorBoundaryProof?.cursorCalls !== 0) throw new Error("sealed handoff is not a no-vendor reseal");
  if (handoff.runId !== manifest.runId || handoff.source?.checkpoint?.runId !== manifest.runId || handoff.source?.artifactId !== manifest.artifactId || handoff.source?.checkpoint?.sourceSha !== manifest.sourceSha) throw new Error("sealed handoff run/source identity mismatch");
  equalArray(handoff.writerProjection?.routes, ROUTES, "sealed handoff public routes");
  equalArray(manifest.approvedRoutes, ROUTES, "manifest public routes");
  equalArray(manifest.writer1Routes, WRITER1_ROUTES, "manifest Writer1 routes");
  const services = Array.isArray(handoff.pages) ? handoff.pages.filter((page: Dict) => page?.type === "Service") : [];
  equalArray(services.map((page: Dict) => page.url), WRITER1_ROUTES, "sealed Writer1 service routes");
  if (services.length !== 2 || services.some((page: Dict) => !page.canonicalIntentId || !page.recommendedFirstReview?.reviewId)) throw new Error("sealed Writer1 input must contain exactly two evidence-backed services");
  if (projection.schemaVersion !== "words-service-coverage-projection/v1" || projection.source?.commit !== manifest.importedFrom.commit || projection.source?.blobSha !== "440f88691f31ac2039119dbbaa4036aad4bcf8b9" || projection.source?.byteLength !== 5639 || projection.source?.sha256Digest !== "sha256:40b5b0e5833c03b55c6a6fa46b2f43e6565263aff1e008f6bc55d53cb2d61169" || digestOf(projection) !== manifest.projectionDigest) throw new Error("versioned service-coverage projection identity or digest mismatch");
  const sourceServices = Array.isArray(ledger.services) ? ledger.services : [];
  const approvedServiceIds = Array.isArray(ledger.approvedServiceIds) ? ledger.approvedServiceIds : sourceServices.filter((service: Dict) => WRITER1_ROUTES.some((route) => service.id === route.slice(1))).map((service: Dict) => service.id);
  if (JSON.stringify(projection.allServiceIds) !== JSON.stringify(sourceServices.map((service: Dict) => service.id)) || JSON.stringify(projection.approvedServiceIds) !== JSON.stringify(["garage-door-repair", "garage-door-installation"]) || JSON.stringify(approvedServiceIds) !== JSON.stringify(["garage-door-repair", "garage-door-installation"])) throw new Error("service-coverage projection dropped or changed service topology");
  for (const service of sourceServices) {
    if (JSON.stringify(projection.serviceReviewIds?.[service.id]) !== JSON.stringify(service.reviewIds)) throw new Error(`service-coverage projection dropped review evidence for ${service.id}`);
    const projectedEvidence = projection.serviceEvidence?.[service.id];
    if (!projectedEvidence || JSON.stringify(projectedEvidence.currentSitePageUrls) !== JSON.stringify(service.currentSitePageUrls) || JSON.stringify(projectedEvidence.provenance) !== JSON.stringify(service.provenance) || JSON.stringify(projectedEvidence.siteAuditCoverage) !== JSON.stringify(service.siteAuditCoverage)) throw new Error(`service-coverage projection dropped site evidence for ${service.id}`);
  }
  if (JSON.stringify(projection.aliases) !== JSON.stringify(ledger.aliases) || JSON.stringify(projection.foldedInto) !== JSON.stringify({ "garage-door-spring-repair": "garage-door-repair", "garage-door-opener-installation": "home-breadth" })) throw new Error("service-coverage projection changed alias/fold intent evidence");
  for (const [label, value] of [["pin", pin], ["ledger", ledger.sourceIdentity], ["approval", approval]] as const) {
    if (value.runId !== manifest.runId || value.sourceSha !== manifest.sourceSha) throw new Error(`${label} source identity mismatch`);
  }
  if (pin.artifactId !== manifest.artifactId || pin.archiveSha256 !== "a5c948af6389b21786d9daf01106f1fd0662d7bf6bb0f21e078a4d7e2ecb1999" || ledger.sourceIdentity.artifactId !== manifest.artifactId || sha256(readFileSync(jsonFile(root, "canary/sealed/360-service-coverage-ledger.json"))) !== "sha256:40b5b0e5833c03b55c6a6fa46b2f43e6565263aff1e008f6bc55d53cb2d61169" || sha256(readFileSync(jsonFile(root, "canary/sealed/360-four-page-approval.json"))) !== "sha256:e9f271facf08876bd59cfdacb04378f530048abb3d08893897736e92dfbbc64f" || digestOf(approval) !== manifest.approvalDigest) throw new Error("trusted 360 pin or exact source artifact digest mismatch");
  equalArray(approval.approvedRoutes, ROUTES, "Josh approval routes");
  if (approval.approvedBy !== "Josh Lenz") throw new Error("sealed approval is not Josh Lenz approval");
  if (approval.approvedAt !== "2026-08-24" || approval.decision !== "standard-four-page-prescription" || typeof approval.reason !== "string" || !approval.reason.trim()) throw new Error("sealed Josh approval facts are incomplete");
  return { handoff, manifest, pin, ledger, approval };
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
export async function dispatchReceipt(root: string, notice: CursorDispatchNotice): Promise<void> {
  const receipt = { schemaVersion: "words-canary-dispatch/v1", status: "dispatched", stage: notice.stage, provider: "cursor-sdk", requestedModel: notice.requestedModel, fast: false, agentId: notice.agentId, jobId: notice.jobId, threadUrl: notice.threadUrl, inputDigest: notice.inputDigest, promptDigest: notice.promptDigest, requestDigest: notice.requestDigest, dispatchedAt: notice.dispatchedAt };
  await writeJson(jsonFile(root, "canary/runtime/dispatch-receipt.json"), receipt);
  if (process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `\n### Cursor Writer1 dispatch\n- Agent: \`${notice.agentId}\`\n- Run: \`${notice.jobId}\`\n- Direct thread: ${notice.threadUrl}\n`, "utf8");
}

export async function run(root = process.cwd()): Promise<{ status: string; stage: string; threadUrl?: string }> {
  const control = readJson(root, ".factory-wake/360-words-control.json");
  if (control.requestedBy !== "architect" || control.stage !== "writer1" || control.policy?.writer1Only !== true || control.policy?.provider !== "cursor-sdk" || control.policy?.model !== "cursor-grok-4.6-high" || control.policy?.fast !== false) throw new Error("360 canary control is not the immutable Writer1 policy");
  if (control.wakeNonce === DORMANT_NONCE) return { status: "dormant", stage: "writer1" };
  if (typeof control.wakeNonce !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{15,127}$/u.test(control.wakeNonce)) throw new Error("active 360 canary wake requires a unique nonce");
  if (control.restore !== null) throw new Error("Writer1 must start from the sealed handoff and may not restore a prior artifact");
  if (process.env.CURSOR_MODEL !== "cursor-grok-4.6-high" || !process.env.CURSOR_API_KEY || process.env.CURSOR_FAST !== "false") throw new Error("Cursor production environment must provide exact model, API key, and fast=false");
  const sealed = validateSealed(root);
  const payload = { schemaVersion: "words-writer-input/v1", stage: "writer1", source: sealed.handoff.source, prospect: sealed.handoff.prospect, approvedServices: sealed.handoff.pages.filter((page: Dict) => page.type === "Service"), sealedHandoffDigest: sealed.handoff.resealDigest, approvedRoutes: ROUTES };
  await writeJson(jsonFile(root, "canary/runtime/state.json"), { status: "writer1-dispatching", stage: "writer1", runId: sealed.handoff.runId, sealedHandoffDigest: sealed.handoff.resealDigest });
  const executor = createCursorWriterExecutor({ env: process.env, receiptStore: createJsonCursorReceiptStore(jsonFile(root, "canary/runtime/cursor-receipts.json")), onDispatch: (notice) => dispatchReceipt(root, notice) });
  const result = await executor.dispatch("writer1", payload, "Words Factory writer1 execution for approved 360 handoff", sealed.handoff.runId);
  await writeJson(jsonFile(root, "canary/runtime/writer1-receipt.json"), result.receipt);
  await writeJson(jsonFile(root, "canary/outputs/writer1-output.json"), result.output);
  await writeJson(jsonFile(root, "canary/runtime/state.json"), { status: "awaiting-architect-qa", stage: "writer1", runId: sealed.handoff.runId, sealedHandoffDigest: sealed.handoff.resealDigest, threadUrl: result.threadUrl, receipt: result.receipt });
  return { status: "awaiting-architect-qa", stage: "writer1", threadUrl: result.threadUrl };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const operation = process.argv.includes("--validate-only") ? Promise.resolve(validateSealed()) : run();
  operation.then((result) => { console.log(JSON.stringify(result)); }).catch(async (error) => { await writeJson(path.join(process.cwd(), "canary/runtime/failure.json"), { status: "failed", error: error instanceof Error ? error.message : String(error) }); process.exitCode = 1; });
}
