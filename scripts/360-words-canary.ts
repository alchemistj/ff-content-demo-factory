import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { createCursorWriterExecutor, createJsonCursorReceiptStore, recoverCursorWriterArtifactV2, validateCursorArtifactRecoveryV2Receipt, validateCursorWriterReceipt, type CursorArtifactRecoveryFailureBinding, type CursorArtifactRecoveryPrior, type CursorDispatchNotice, type CursorFollowUpBindings, type CursorWriterReceipt } from "../src/pipeline/cursor-writer.js";
import { digestOf } from "../src/contracts/digests.js";
import { buildWriter1ArtifactRecoveryPrompt, digestWriter1ArtifactRecoveryPrompt } from "./360-words-recovery-prompt.mjs";

const DORMANT_NONCE = "DORMANT";
const ROUTES = ["/", "/garage-door-repair", "/garage-door-installation", "/contact"] as const;
const WRITER1_ROUTES = ["/garage-door-repair", "/garage-door-installation"] as const;
export const PRIOR_ACTION_RUN_ID = "32776170549";
export const PRIOR_ARTIFACT_ID = 9539302493;
export const PRIOR_CURSOR_AGENT_ID = "bc-972b63b0-6e43-4c76-805d-b95a0ba13da8";
export const PRIOR_CURSOR_RUN_ID = "run-a59d6e17-3ce0-4c0f-8231-597d5b15382b";
export const PRIOR_OUTPUT_DIGEST = "sha256:d2f2e75fbd2482e87afe18926fc6fcf1de319fe1ff9d1eb3a942ca7cfbee7e29";
export const PRIOR_CURSOR_THREAD_URL = `https://cursor.com/agents/${PRIOR_CURSOR_AGENT_ID}`;
export const ARTIFACT_RECOVERY_ACTION_RUN_ID = "32785189225";
export const ARTIFACT_RECOVERY_ARTIFACT_ID = 9541802267;
export const ARTIFACT_RECOVERY_AGENT_ID = "bc-30fc8ffa-2005-44b9-8fc7-48ddd9c3bcc8";
export const ARTIFACT_RECOVERY_PRIOR_RUN_ID = "run-b0341a7a-9f03-4dec-b76d-7350ba1e82f2";
export const ARTIFACT_RECOVERY_THREAD_URL = `https://cursor.com/agents/${ARTIFACT_RECOVERY_AGENT_ID}`;
export const ARTIFACT_RECOVERY_SOURCE_BRANCH = "architect/360-words-canary";
export const ARTIFACT_RECOVERY_SEALED_HANDOFF_DIGEST = "sha256:715f651a53055444b8381dd8a276a2046d93776c61d88a2193cc2d42a1c83ad6";
export const ARTIFACT_RECOVERY_PATH = "artifacts/writer1-output.json";
export const ARTIFACT_RECOVERY_V1_ACTION_RUN_ID = "32793130502";
export const ARTIFACT_RECOVERY_V1_ARTIFACT_ID = 9543869555;
export const ARTIFACT_RECOVERY_V1_AGENT_ID = ARTIFACT_RECOVERY_AGENT_ID;
export const ARTIFACT_RECOVERY_V1_RUN_ID = "run-1b862d23-a748-4574-909a-66aac905eb97";
export const ARTIFACT_RECOVERY_V1_THREAD_URL = ARTIFACT_RECOVERY_THREAD_URL;
export const ARTIFACT_RECOVERY_V1_SOURCE_SHA = "6cf9b42e43e5728614a9b7302a8791e527197e3d";
export const ARTIFACT_RECOVERY_V1_ARTIFACT_DIGEST = "sha256:2d1d1c0d281917025be80898ab03c94171d59d1e2920ecf540b241f666464502";
export const ARTIFACT_RECOVERY_V1_FAILURE_CODE = "CURSOR_ARTIFACT_MISSING" as const;
export const ARTIFACT_RECOVERY_V1_RECOVERY_VERSION = "words-writer1-artifact-recovery/v1" as const;
export const ARTIFACT_RECOVERY_V2_RECOVERY_VERSION = "words-writer1-artifact-recovery/v2" as const;
export const ARTIFACT_RECOVERY_V2_ABSOLUTE_ARTIFACT_PATH = "/opt/cursor/artifacts/writer1-output.json";
type Dict = Record<string, any>;

function jsonFile(root: string, relative: string): string { return path.join(root, relative); }
function readJson(root: string, relative: string): Dict { return JSON.parse(readFileSync(jsonFile(root, relative), "utf8")) as Dict; }
function gitBlobSha(raw: Buffer): string { return createHash("sha1").update(Buffer.concat([Buffer.from(`blob ${raw.length}\0`), raw])).digest("hex"); }
function sha256(raw: Buffer): string { return `sha256:${createHash("sha256").update(raw).digest("hex")}`; }
function equalArray(actual: unknown, expected: readonly string[], label: string): void {
  if (!Array.isArray(actual) || actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) throw new Error(`${label} does not match the sealed route set`);
}

function sha256Hex(raw: Buffer): string { return createHash("sha256").update(raw).digest("hex"); }
function normalized(value: string): string { return value.replace(/[“”"']/gu, "").replace(/\s+/gu, " ").trim().toLowerCase(); }
function stringValue(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }
function isRecord(value: unknown): value is Dict { return !!value && typeof value === "object" && !Array.isArray(value); }

export class Writer1OutputRecoveryError extends Error {
  readonly code: "OUTPUT_NOT_RECOVERABLE" | "WRITER1_OUTPUT_INVALID";
  constructor(code: "OUTPUT_NOT_RECOVERABLE" | "WRITER1_OUTPUT_INVALID", message: string) {
    super(message);
    this.name = "Writer1OutputRecoveryError";
    this.code = code;
  }
}

function invalidWriter1Output(message: string): never { throw new Writer1OutputRecoveryError("WRITER1_OUTPUT_INVALID", message); }

export function validatePriorWriter1Artifact(root: string, expected = { actionRunId: PRIOR_ACTION_RUN_ID, artifactId: PRIOR_ARTIFACT_ID, agentId: PRIOR_CURSOR_AGENT_ID, jobId: PRIOR_CURSOR_RUN_ID, outputDigest: PRIOR_OUTPUT_DIGEST, threadUrl: PRIOR_CURSOR_THREAD_URL }): { receipt: CursorWriterReceipt; bindings: CursorFollowUpBindings } {
  const receipt = JSON.parse(readFileSync(path.join(root, "runtime/writer1-receipt.json"), "utf8")) as CursorWriterReceipt;
  const dispatch = JSON.parse(readFileSync(path.join(root, "runtime/dispatch-receipt.json"), "utf8")) as Dict;
  const outputRaw = readFileSync(path.join(root, "outputs/writer1-output.json"));
  validateCursorWriterReceipt(receipt);
  if (receipt.agentId !== expected.agentId || receipt.jobId !== expected.jobId || receipt.threadUrl !== expected.threadUrl || receipt.outputDigest !== expected.outputDigest || receipt.provider !== "cursor-sdk" || receipt.requestedModel !== "cursor-grok-4.6-high" || receipt.fast !== false) throw new Error("prior Writer1 receipt identity/model binding mismatch");
  if (JSON.parse(outputRaw.toString("utf8")) !== receipt.output) throw new Error("prior Writer1 output does not match its receipt");
  if (dispatch.agentId !== expected.agentId || dispatch.jobId !== expected.jobId || dispatch.threadUrl !== expected.threadUrl || dispatch.outputDigest !== undefined && dispatch.outputDigest !== expected.outputDigest || dispatch.provider !== "cursor-sdk" || dispatch.requestedModel !== "cursor-grok-4.6-high" || dispatch.fast !== false) throw new Error("prior Writer1 dispatch receipt identity/model binding mismatch");
  if (dispatch.requestDigest !== receipt.requestDigest || dispatch.inputDigest !== receipt.inputDigest || dispatch.promptDigest !== receipt.promptDigest) throw new Error("prior Writer1 dispatch and completion bindings differ");
  const manifest = readFileSync(path.join(root, "runtime/manifest.sha256"), "utf8").trim().split(/\n/u).filter(Boolean);
  for (const line of manifest) {
    const match = /^(?<sha>[0-9a-f]{64})\s{2}(?<file>.+)$/u.exec(line); const groups = match?.groups; if (!groups?.file || !groups.sha) throw new Error("prior artifact manifest is malformed");
    const relative = groups.file.replace(/^canary\//u, ""); const file = path.join(root, relative); if (!existsSync(file)) throw new Error(`prior artifact manifest file is missing: ${groups.file}`);
    if (sha256Hex(readFileSync(file)) !== groups.sha) throw new Error(`prior artifact manifest hash mismatch: ${groups.file}`);
  }
  if (expected.artifactId !== PRIOR_ARTIFACT_ID || expected.actionRunId !== PRIOR_ACTION_RUN_ID) throw new Error("prior GitHub artifact/action identity is not the approved canary artifact");
  const bindings: CursorFollowUpBindings = { priorActionRunId: expected.actionRunId, priorArtifactId: expected.artifactId, priorRunId: "32717620900", priorJobId: receipt.jobId, priorAgentId: receipt.agentId, priorThreadUrl: receipt.threadUrl, priorOutputDigest: receipt.outputDigest, priorInputDigest: receipt.inputDigest, priorPromptDigest: receipt.promptDigest, priorRequestDigest: receipt.requestDigest };
  return { receipt, bindings };
}

export function validatePriorArtifactRecoveryDispatch(root: string, expected: { actionRunId: string; artifactId: number; agentId: string; jobId: string; threadUrl: string; sourceBranch: string; sourceSha: string }): CursorArtifactRecoveryPrior {
  const dispatch = readJson(root, "runtime/dispatch-receipt.json");
  const source = readJson(root, "runtime/source-verification.json");
  const manifestPath = path.join(root, "runtime/manifest.sha256");
  if (existsSync(manifestPath)) for (const line of readFileSync(manifestPath, "utf8").trim().split(/\n/u).filter(Boolean)) {
    const match = /^(?<sha>[0-9a-f]{64})\s{2}(?<file>.+)$/u.exec(line); const groups = match?.groups; if (!groups?.sha || !groups.file) throw new Error("prior Writer1 dispatch artifact manifest is malformed");
    const relative = groups.file.replace(/^canary\//u, ""); if (path.isAbsolute(relative) || relative.startsWith("..")) throw new Error("prior Writer1 dispatch artifact manifest path escapes its root");
    const file = path.join(root, relative); if (!existsSync(file) || sha256Hex(readFileSync(file)) !== groups.sha) throw new Error(`prior Writer1 dispatch artifact manifest hash mismatch: ${groups.file}`);
  }
  const requiredDigest = (value: unknown, label: string): string => { if (typeof value !== "string" || !/^sha256:[0-9a-f]{64}$/u.test(value)) throw new Error(`prior Writer1 dispatch ${label} is not a sha256 digest`); return value; };
  if (source.actionRunId !== expected.actionRunId || Number(source.artifactId) !== expected.artifactId || source.headBranch !== expected.sourceBranch || source.headSha !== expected.sourceSha) throw new Error("prior Writer1 dispatch source/action pin mismatch");
  if (dispatch.schemaVersion !== "words-canary-dispatch/v2" || dispatch.status !== "dispatched" || dispatch.stage !== "writer1" || dispatch.provider !== "cursor-sdk" || dispatch.requestedModel !== "cursor-grok-4.6-high" || dispatch.officialModel !== "grok-4.6" || dispatch.fast !== false || dispatch.effort !== "high") throw new Error("prior Writer1 dispatch receipt model/stage binding mismatch");
  if (dispatch.agentId !== expected.agentId || dispatch.jobId !== expected.jobId || dispatch.threadUrl !== expected.threadUrl) throw new Error("prior Writer1 dispatch receipt agent/thread/run mismatch");
  if (JSON.stringify(dispatch.modelParams) !== JSON.stringify([{ id: "fast", value: "false" }, { id: "effort", value: "high" }])) throw new Error("prior Writer1 dispatch model parameters are not grok-4.6 high with fast=false");
  const effortSource = dispatch.effortAttestationSource;
  if (effortSource !== "official-response" && effortSource !== "official-registry-parameter" && effortSource !== "named-model-default") throw new Error("prior Writer1 dispatch effort attestation is invalid");
  const inputDigest = requiredDigest(dispatch.inputDigest, "inputDigest"); const promptDigest = requiredDigest(dispatch.promptDigest, "promptDigest"); const requestDigest = requiredDigest(dispatch.requestDigest, "requestDigest");
  const registryDigest = requiredDigest(dispatch.registryDigest, "registryDigest");
  if (source.sealedHandoffDigest !== undefined && (typeof source.sealedHandoffDigest !== "string" || !/^sha256:[0-9a-f]{64}$/u.test(source.sealedHandoffDigest))) throw new Error("prior Writer1 dispatch sealed handoff pin is invalid");
  return { actionRunId: expected.actionRunId, artifactId: expected.artifactId, runId: expected.jobId, agentId: expected.agentId, threadUrl: expected.threadUrl, inputDigest, promptDigest, requestDigest, requestedModel: "cursor-grok-4.6-high", resolvedModel: "grok-4.6", modelParams: dispatch.modelParams, registryDigest, effort: "high", effortAttestationSource: effortSource, fast: false, sourceBranch: expected.sourceBranch, sourceSha: expected.sourceSha, sealedHandoffDigest: String(source.sealedHandoffDigest || "") };
}

function routeBearingKey(key: string): boolean { return /(?:url|path|route|href|destination|nav|navigation|cta|callstoaction|header|footer|links?)/iu.test(key); }
function scanForbiddenPublicReferences(value: unknown, keyPath = ""): void {
  if (Array.isArray(value)) { value.forEach((child, index) => scanForbiddenPublicReferences(child, `${keyPath}[${index}]`)); return; }
  if (!isRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${keyPath}.${key}`;
    if (routeBearingKey(key) && typeof child === "string") {
      const lower = child.toLowerCase();
      if (/(?:spring|opener)/u.test(lower)) throw new Error(`Writer1 output exposes a prohibited spring/opener standalone route, navigation item, or CTA at ${childPath}`);
      if (/(?:^|\/)(?:strategy(?:-overview)?|home)(?:\/|$)/u.test(lower)) throw new Error(`Writer1 output exposes a Home/Strategy route at ${childPath}`);
    }
    scanForbiddenPublicReferences(child, childPath);
  }
}

export function parseAndValidateWriter1Output(raw: unknown, projection: Dict): Dict {
  if (typeof raw !== "string" || !raw.trim()) invalidWriter1Output("Writer1 follow-up output must be a non-empty JSON string");
  if (raw.trim() === "OUTPUT_NOT_RECOVERABLE") throw new Writer1OutputRecoveryError("OUTPUT_NOT_RECOVERABLE", "Writer1 could not recover the existing words-writer1-output/v1 artifact");
  let parsed: unknown; try { parsed = JSON.parse(raw); } catch { invalidWriter1Output("Writer1 follow-up output is not valid JSON"); }
  if (!isRecord(parsed) || parsed.schemaVersion !== "words-writer1-output/v1" || !Array.isArray(parsed.pages)) invalidWriter1Output("Writer1 output must be words-writer1-output/v1 with a pages array");
  if (parsed.pages.length !== 2) invalidWriter1Output("Writer1 output must contain exactly two service pages");
  const evidenceByRoute = new Map<string, Dict[]>((projection.services || []).map((service: Dict) => [service.page.url, service.reviewEvidence || []]));
  const serviceByRoute = new Map<string, Dict>((projection.services || []).map((service: Dict) => [service.page.url, service]));
  const sealedRefs = new Set<string>((projection.sealedRefs || []).filter((ref: unknown): ref is string => stringValue(ref)));
  const seen = new Set<string>();
  for (const page of parsed.pages) {
    if (!isRecord(page) || !stringValue(page.url) || !WRITER1_ROUTES.includes(page.url as typeof WRITER1_ROUTES[number]) || seen.has(page.url)) invalidWriter1Output("Writer1 output contains a missing, duplicate, or unapproved page route");
    seen.add(page.url);
    if (page.type !== "service") invalidWriter1Output("Writer1 output page.type must be exactly service");
    for (const field of ["prescriptionId", "primaryKeyword", "title", "seoTitle", "metaDescription", "h1", "body"] as const) if (!stringValue(page[field])) invalidWriter1Output(`Writer1 output is missing full copy field ${field}`);
    const service = serviceByRoute.get(page.url);
    if (!service || page.prescriptionId !== service.prescriptionId || !sealedRefs.has(page.prescriptionId)) invalidWriter1Output(`Writer1 page prescriptionId is not bound to the sealed prescription for ${page.url}`);
    if (!Array.isArray(page.sections) || page.sections.length === 0 || page.sections.some((section: unknown) => !isRecord(section) || !stringValue(section.heading) || !stringValue(section.body))) invalidWriter1Output("Writer1 output is missing complete section copy");
    const sections = new Set(page.sections.map((section: Dict) => String(section.id ?? section.heading)));
    const placementGroups = [page.reviewPlacements, page.reviewEvidence, page.quotePlacements, page.claims].filter((value): value is unknown[] => Array.isArray(value));
    const placements = placementGroups.flat();
    if (placements.length === 0) invalidWriter1Output(`Writer1 output is missing review/quote/claim bindings for ${page.url}`);
    const allowed = evidenceByRoute.get(page.url) || [];
    for (const placement of placements) {
      if (!isRecord(placement)) invalidWriter1Output("Writer1 placement binding is malformed");
      if (!isRecord(placement.provenance)) invalidWriter1Output("Writer1 placement is missing typed provenance");
      const provenance = placement.provenance;
      if (!["review", "evidence", "claim"].includes(provenance.type)) invalidWriter1Output("Writer1 placement provenance type is invalid");
      const stableRef = provenance.ref ?? provenance.stableRef;
      if (!stringValue(stableRef) || !sealedRefs.has(stableRef)) invalidWriter1Output("Writer1 placement provenance does not resolve to sealed Writer1 input");
      if (!stringValue(provenance.placement) || !stringValue(provenance.section) || !sections.has(provenance.section)) invalidWriter1Output("Writer1 placement provenance requires a valid placement and section");
      const reviewId = placement.reviewId ?? placement.sourceReviewId ?? placement.evidenceId ?? placement.refId;
      const quote = placement.quote ?? placement.excerpt ?? placement.exactText;
      if (provenance.type === "review") {
        if (!stringValue(reviewId) || !stringValue(quote)) invalidWriter1Output("Writer1 review binding requires review ID and quote");
        if (String(stableRef) !== String(reviewId)) invalidWriter1Output("Writer1 review provenance ref must equal its stable review reference");
        const source = allowed.find((entry) => String(entry.review?.id ?? entry.review?.reviewId) === String(reviewId));
        if (!source) invalidWriter1Output(`Writer1 review binding references an unapproved review: ${reviewId}`);
        const sourceText = String(source.review?.text ?? source.review?.exactText ?? source.review?.reviewText ?? "");
        if (!sourceText || !normalized(sourceText).includes(normalized(String(quote)))) invalidWriter1Output(`Writer1 quote is not bound to the source review: ${reviewId}`);
        if (!stringValue(placement.attribution ?? placement.reviewer ?? placement.author)) invalidWriter1Output(`Writer1 review binding is missing attribution: ${reviewId}`);
      } else if (!stringValue(placement.claim ?? placement.statement ?? placement.text ?? placement.body)) invalidWriter1Output("Writer1 evidence/claim placement is missing its claim text");
    }
  }
  if (seen.size !== 2 || JSON.stringify([...seen]) !== JSON.stringify(WRITER1_ROUTES)) invalidWriter1Output("Writer1 output route order/topology is not exactly Repair then Installation");
  for (const key of ["home", "homepage", "contact", "strategy", "strategyOverview", "strategyOverviewPage"]) if (key in parsed) invalidWriter1Output(`Writer1 output must not contain ${key}`);
  scanForbiddenPublicReferences(parsed);
  return parsed;
}

export function parseAndValidateFreshWriter1Output(raw: unknown, projection: Dict): Dict {
  if (raw === "OUTPUT_NOT_RECOVERABLE") throw new Writer1OutputRecoveryError("OUTPUT_NOT_RECOVERABLE", "Fresh Writer1 output is not recoverable");
  if (!isRecord(raw)) invalidWriter1Output("Fresh Writer1 output must be a JSON object, not a summary or string");
  return parseAndValidateWriter1Output(JSON.stringify(raw), projection);
}

export function validateSealed(root = process.cwd(), handoffOverride?: { raw: Buffer; value: Dict }, bridgeOverride?: Dict): { handoff: Dict; manifest: Dict; pin: Dict; ledger: Dict; approval: Dict; bridge: Dict } {
  const manifest = readJson(root, "canary/sealed/360-handoff-manifest.json");
  const pin = readJson(root, "canary/sealed/360-trusted-pin.json");
  const ledger = readJson(root, "canary/sealed/360-service-coverage-ledger.json");
  const projection = readJson(root, manifest.projectionPath);
  const bridge = bridgeOverride || readJson(root, manifest.bridgePath);
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
  const requiredBridgeKeys = ["schemaVersion", "source", "routes", "pageAssignments", "selectedServiceIds", "policy", "approval", "approvalBindings", "reviewAnalysisFacts", "reviewInventory", "candidateServices", "foldedEvidence", "serviceCoverageLedger", "trustedArtifact", "sourcePin", "reseal"];
  if (bridge.schemaVersion !== "words-sealed-envelope-bridge/v1" || requiredBridgeKeys.some((key) => !(key in bridge))) throw new Error("sealed envelope bridge is incomplete or unsupported");
  if (bridge.source?.commit !== manifest.importedFrom.commit || bridge.source?.blobSha !== manifest.importedFrom.blobSha || bridge.source?.byteLength !== manifest.importedFrom.byteLength || bridge.source?.resealDigest !== manifest.importedFrom.resealDigest || bridge.source?.envelopeDigest !== digestOf(handoff) || JSON.stringify(bridge.source?.topLevelKeys) !== JSON.stringify(Object.keys(handoff).sort()) || digestOf(bridge) !== manifest.bridgeDigest) throw new Error("sealed envelope bridge source identity or complete-envelope digest mismatch");
  const assertSection = (label: string, source: unknown, section: Dict): void => { if (!section || section.digest !== digestOf(source) || digestOf(section.value) !== section.digest) throw new Error(`sealed envelope bridge ${label} was omitted or mutated`); };
  assertSection("page assignments", handoff.writerProjection?.approvedPageAssignments, bridge.pageAssignments);
  assertSection("selected services", handoff.selectedServiceIds, bridge.selectedServiceIds);
  assertSection("policy", handoff.policy, bridge.policy);
  assertSection("approval", handoff.approval, bridge.approval);
  assertSection("review-analysis facts", handoff.reviewAnalysisFacts, bridge.reviewAnalysisFacts);
  assertSection("candidate services", handoff.candidateServices, bridge.candidateServices);
  assertSection("folded evidence", handoff.foldedEvidence, bridge.foldedEvidence);
  assertSection("canonical service coverage ledger", handoff.serviceCoverageLedger, bridge.serviceCoverageLedger);
  assertSection("trusted artifact", handoff.trustedArtifact, bridge.trustedArtifact);
  if (JSON.stringify(bridge.routes) !== JSON.stringify(handoff.writerProjection?.routes) || JSON.stringify(bridge.approvalBindings) !== JSON.stringify({ sourceArtifactDigest: handoff.sourceArtifactDigest, evidenceDigest: handoff.evidenceDigest, pageSetDigest: handoff.pageSetDigest, prescriptionDigest: handoff.prescriptionDigest, approvalDigest: handoff.approvalDigest }) || JSON.stringify(bridge.sourcePin) !== JSON.stringify({ artifactRootIdentity: handoff.artifactRootIdentity, archiveSha256: handoff.archiveSha256 }) || JSON.stringify(bridge.reseal) !== JSON.stringify({ sourceArtifactDigest: handoff.sourceArtifactDigest, evidenceDigest: handoff.evidenceDigest, pageSetDigest: handoff.pageSetDigest, prescriptionDigest: handoff.prescriptionDigest, approvalDigest: handoff.approvalDigest, resealDigest: handoff.resealDigest })) throw new Error("sealed approval, route, source-pin, or reseal binding was dropped");
  if (JSON.stringify(bridge.reviewInventory?.stableReviewIds) !== JSON.stringify(handoff.stableReviewIds) || JSON.stringify(bridge.reviewInventory?.inventoryStableReviewIds) !== JSON.stringify(handoff.reviewInventory?.stableReviewIds) || bridge.reviewInventory?.digest !== digestOf(handoff.reviewInventory)) throw new Error("complete review inventory or stable review IDs were dropped");
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
  return { handoff, manifest, pin, ledger, approval, bridge };
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
function reviewEvidence(handoff: Dict, ids: unknown): Dict[] {
  const packet = new Map<string, Dict>((handoff.reviewInventory?.reviewPacket?.reviews || []).map((review: Dict) => [review.id, review]));
  const judgments = new Map<string, Dict>((handoff.reviewInventory?.classification?.reviews || []).map((review: Dict) => [review.id, review]));
  return (Array.isArray(ids) ? ids : []).map((id) => String(id)).map((id) => {
    const review = packet.get(id); const judgment = judgments.get(id);
    if (!review || !judgment) throw new Error(`sealed Writer1 evidence references unknown review ${id}`);
    return { review, judgment: { id, decision: judgment.authoritativeJudgment?.decision, authoritative: judgment.authoritativeJudgment?.authoritative, grade: judgment.grade } };
  });
}
export function writer1Projection(sealed: { handoff: Dict; manifest: Dict; ledger: Dict; bridge: Dict }): Dict {
  const handoff = sealed.handoff;
  const pages = new Map<string, Dict>((handoff.pages || []).filter((page: Dict) => page.type === "Service").map((page: Dict) => [page.canonicalIntentId, page]));
  const selected = new Map<string, Dict>((handoff.candidateServices || []).filter((entry: Dict) => entry.status === "selected" && WRITER1_ROUTES.includes(`/${entry.id}` as typeof WRITER1_ROUTES[number])).map((entry: Dict) => [entry.canonicalIntentId, entry]));
  const ledgerServices = new Map<string, Dict>((sealed.ledger.services || []).map((service: Dict) => [service.id, service]));
  const services = WRITER1_ROUTES.map((route) => {
    const intent = route.slice(1); const page = pages.get(intent); const comparison = selected.get(intent); const ledger = ledgerServices.get(intent);
    if (!page || !comparison || !ledger) throw new Error(`sealed Writer1 projection is missing approved service ${intent}`);
    const prescriptionId = String(page.id ?? page.canonicalIntentId);
    return { page, prescriptionId, comparison: { id: comparison.id, name: comparison.name, directCompletedEvidenceCount: comparison.directCompletedEvidenceCount, directEvidenceReviewIds: comparison.directEvidenceReviewIds, canonicalServiceId: comparison.canonicalServiceId, canonicalIntentId: comparison.canonicalIntentId, destination: comparison.destination }, ledger: { id: ledger.id, name: ledger.name, reviewIds: ledger.reviewIds, currentSitePageUrls: ledger.currentSitePageUrls, provenance: ledger.provenance, siteAuditCoverage: ledger.siteAuditCoverage }, reviewEvidence: reviewEvidence(handoff, comparison.directEvidenceReviewIds) };
  });
  const foldedSupport = (handoff.candidateServices || []).filter((entry: Dict) => entry.status === "folded" && WRITER1_ROUTES.some((route) => route.slice(1) === entry.canonicalServiceId)).map((entry: Dict) => ({ id: entry.id, canonicalServiceId: entry.canonicalServiceId, foldedInto: entry.foldedInto, directCompletedEvidenceCount: entry.directCompletedEvidenceCount, directEvidenceReviewIds: entry.directEvidenceReviewIds, supportingEvidence: entry.supportingEvidence, reviewEvidence: reviewEvidence(handoff, entry.directEvidenceReviewIds) }));
  const sealedRefs = [...new Set([
    ...services.flatMap((service: Dict) => [service.prescriptionId, service.page.id, service.page.canonicalIntentId, service.comparison.id, service.comparison.canonicalServiceId, service.comparison.canonicalIntentId, ...(service.comparison.directEvidenceReviewIds || []), ...(service.ledger.reviewIds || []), ...(service.ledger.siteAuditCoverage?.crawlRefs || []), ...(service.ledger.provenance?.siteAuditUrls || []), ...service.reviewEvidence.map((entry: Dict) => entry.review.id), ...service.reviewEvidence.map((entry: Dict) => entry.judgment.id)]),
    ...foldedSupport.flatMap((entry: Dict) => [entry.id, entry.canonicalServiceId, ...(entry.directEvidenceReviewIds || []), ...(entry.supportingEvidence?.reviewIds || []), ...entry.reviewEvidence.map((review: Dict) => review.review.id)]),
  ].filter((ref): ref is string => stringValue(ref)))];
  return { schemaVersion: "words-writer1-input/v2", stage: "writer1", approvedRoutes: WRITER1_ROUTES, services, foldedSupport, sealedRefs, sourceEnvelopeDigest: sealed.bridge.source.envelopeDigest, bridgeDigest: sealed.manifest.bridgeDigest };
}
export async function dispatchReceipt(root: string, notice: CursorDispatchNotice): Promise<void> {
  const receipt = { schemaVersion: "words-canary-dispatch/v2", status: "dispatched", stage: notice.stage, provider: "cursor-sdk", requestedModel: notice.requestedModel, officialModel: notice.officialModel, modelParams: notice.modelParams, registryDigest: notice.registryDigest, effort: notice.effort, effortAttestationSource: notice.effortAttestationSource, fast: false, agentId: notice.agentId, jobId: notice.jobId, threadUrl: notice.threadUrl, inputDigest: notice.inputDigest, promptDigest: notice.promptDigest, requestDigest: notice.requestDigest, dispatchedAt: notice.dispatchedAt };
  await writeJson(jsonFile(root, "canary/runtime/dispatch-receipt.json"), receipt);
  if (process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `\n### Cursor Writer1 dispatch\n- Agent: \`${notice.agentId}\`\n- Run: \`${notice.jobId}\`\n- Direct thread: ${notice.threadUrl}\n`, "utf8");
}

export const WRITER1_RETRIEVAL_PROMPT = `Versioned Writer1 retrieval correction. Do not write, rewrite, summarize, recompute, or regenerate any website copy. Reattach to this same Cursor agent thread and read the existing words-writer1-output/v1 that you already produced in your current agent context/workspace.

Your entire response must be exactly one of these two choices and nothing else: (1) the complete existing words-writer1-output/v1 JSON artifact verbatim, with no prose wrapper, Markdown fences, or commentary; or (2) the exact literal sentinel OUTPUT_NOT_RECOVERABLE. Never return a summary, explanation, partial JSON, regenerated copy, or any other text. If the complete existing JSON is unavailable, return the sentinel.

For the JSON choice, schemaVersion must be exactly "words-writer1-output/v1" and pages must be exactly these two service pages in this order: /garage-door-repair, /garage-door-installation. Each page must preserve the existing complete copy and include prescriptionId bound exactly to the sealed Writer1 page prescription, primaryKeyword, title, seoTitle, metaDescription, h1, body, and non-empty sections with heading/body. Every review, quote, and claim placement must carry typed provenance {type: "review"|"evidence"|"claim", ref: <stable sealed Writer1 review/evidence ref>, placement: <placement>, section: <section>} and every ref must resolve to the sealed Writer1 input. Return no Home, Contact, or Strategy page. Spring-repair and opener-installation evidence may remain folded inside approved service copy, but there must be no standalone spring/opener route, navigation item, or CTA. This is retrieval of the existing output only; do not change any words.`;

export const WRITER1_FRESH_PROMPT = `Fresh Writer1 execution for the sealed 360 prescription. Write only the two prescribed service pages and return the complete result as a JSON object, never a summary string, prose wrapper, Markdown fence, or JSON-encoded string. Do not create Home, Contact, Strategy, spring-repair, or opener-installation pages or routes. Do not run Writer2.

The root object must have schemaVersion exactly "words-writer1-output/v1" and pages exactly in this order: /garage-door-repair and /garage-door-installation. Each page must have type exactly "service", the exact sealed prescriptionId for its route, primaryKeyword, title, seoTitle, metaDescription, h1, body, and non-empty sections with heading/body. Every review, quote, and claim placement must include typed provenance {type: "review"|"evidence"|"claim", ref: <stable sealed Writer1 evidence/review ref>, placement: <placement>, section: <section>}; every provenance ref must resolve to the sealed Writer1 input. Use only the sealed prescription and evidence supplied below. If a complete valid object cannot be returned, return no partial result.

SEALED WRITER1 INPUT:
`;

export const WRITER1_ARTIFACT_RECOVERY_PROMPT = buildWriter1ArtifactRecoveryPrompt("v1");
export const WRITER1_ARTIFACT_RECOVERY_V2_PROMPT = buildWriter1ArtifactRecoveryPrompt("v2");

export function validatePriorArtifactRecoveryFailure(root: string, expected = { actionRunId: ARTIFACT_RECOVERY_V1_ACTION_RUN_ID, artifactId: ARTIFACT_RECOVERY_V1_ARTIFACT_ID, agentId: ARTIFACT_RECOVERY_V1_AGENT_ID, runId: ARTIFACT_RECOVERY_V1_RUN_ID, threadUrl: ARTIFACT_RECOVERY_V1_THREAD_URL, sourceBranch: ARTIFACT_RECOVERY_SOURCE_BRANCH, sourceSha: ARTIFACT_RECOVERY_V1_SOURCE_SHA, artifactDigest: ARTIFACT_RECOVERY_V1_ARTIFACT_DIGEST }): CursorArtifactRecoveryFailureBinding {
  const dispatch = readJson(root, "runtime/dispatch-receipt.json");
  const failure = readJson(root, "runtime/failure.json");
  const state = readJson(root, "runtime/state.json");
  const artifactVerification = readJson(root, "runtime/artifact-verification.json");
  const promptDigest = digestOf(buildWriter1ArtifactRecoveryPrompt("v1"));
  if (promptDigest !== digestWriter1ArtifactRecoveryPrompt("v1")) throw new Error("versioned v1 recovery prompt builder/digest mismatch");
  if (artifactVerification.actionRunId !== expected.actionRunId || Number(artifactVerification.artifactId) !== expected.artifactId || artifactVerification.headBranch !== expected.sourceBranch || artifactVerification.headSha !== expected.sourceSha || artifactVerification.artifactDigest !== expected.artifactDigest) throw new Error("prior v1 recovery artifact metadata is not verified");
  if (dispatch.schemaVersion !== "words-canary-dispatch/v2" || dispatch.status !== "dispatched" || dispatch.stage !== "writer1" || dispatch.provider !== "cursor-sdk" || dispatch.requestedModel !== "cursor-grok-4.6-high" || dispatch.officialModel !== "grok-4.6" || dispatch.fast !== false || dispatch.agentId !== expected.agentId || dispatch.jobId !== expected.runId || dispatch.threadUrl !== expected.threadUrl || dispatch.promptDigest !== promptDigest) throw new Error("prior v1 recovery dispatch identity, model, thread, run, or prompt binding is invalid");
  if (failure.status !== "failed" || failure.stage !== "writer1" || failure.errorCode !== ARTIFACT_RECOVERY_V1_FAILURE_CODE || failure.writer2Blocked !== true) throw new Error("prior v1 recovery did not fail closed on the missing artifact");
  if (state.stage !== "writer1" || state.writer2Blocked !== true || state.nextStage !== null || state.errorCode !== ARTIFACT_RECOVERY_V1_FAILURE_CODE) throw new Error("prior v1 recovery state is not the verified missing-artifact failure");
  if (existsSync(path.join(root, "runtime/writer1-recovery-receipt.json")) || existsSync(path.join(root, "outputs/writer1-output.json"))) throw new Error("prior v1 recovery unexpectedly contains a completed receipt or output");
  return { recoveryVersion: ARTIFACT_RECOVERY_V1_RECOVERY_VERSION, actionRunId: expected.actionRunId, artifactId: expected.artifactId, sourceBranch: expected.sourceBranch, sourceSha: expected.sourceSha, artifactDigest: expected.artifactDigest, runId: expected.runId, agentId: expected.agentId, threadUrl: expected.threadUrl, promptDigest, failureCode: ARTIFACT_RECOVERY_V1_FAILURE_CODE };
}

export async function runArtifactRecovery(root = process.cwd()): Promise<{ status: string; stage: string; threadUrl?: string; recoveryRunId?: string }> {
  const control = readJson(root, ".factory-wake/360-words-control.json");
  if (control.requestedBy !== "architect" || control.stage !== "writer1" || control.policy?.writer1Only !== true || control.policy?.provider !== "cursor-sdk" || control.policy?.model !== "cursor-grok-4.6-high" || control.policy?.fast !== false) throw new Error("360 canary control is not the immutable Writer1 policy");
  if (control.wakeNonce === DORMANT_NONCE) return { status: "dormant", stage: "writer1" };
  if (control.policy?.mode !== "artifact-recovery") throw new Error("active 360 canary wake must explicitly select artifact-recovery mode");
  const recoveryPins = control.policy?.recovery;
  const v1PromptDigest = digestOf(buildWriter1ArtifactRecoveryPrompt("v1"));
  const v2Prompt = buildWriter1ArtifactRecoveryPrompt("v2");
  const v2PromptDigest = digestOf(v2Prompt);
  if (v1PromptDigest !== digestWriter1ArtifactRecoveryPrompt("v1") || v2PromptDigest !== digestWriter1ArtifactRecoveryPrompt("v2")) throw new Error("artifact recovery prompt builder/digest mismatch");
  if (recoveryPins?.recoveryVersion !== ARTIFACT_RECOVERY_V2_RECOVERY_VERSION || recoveryPins?.priorActionRunId !== ARTIFACT_RECOVERY_ACTION_RUN_ID || Number(recoveryPins?.priorArtifactId) !== ARTIFACT_RECOVERY_ARTIFACT_ID || recoveryPins?.priorAgentId !== ARTIFACT_RECOVERY_AGENT_ID || recoveryPins?.priorRunId !== ARTIFACT_RECOVERY_PRIOR_RUN_ID || recoveryPins?.priorThreadUrl !== ARTIFACT_RECOVERY_THREAD_URL || recoveryPins?.artifactPath !== ARTIFACT_RECOVERY_PATH || recoveryPins?.sourceBranch !== ARTIFACT_RECOVERY_SOURCE_BRANCH || recoveryPins?.sealedHandoffDigest !== ARTIFACT_RECOVERY_SEALED_HANDOFF_DIGEST || typeof recoveryPins?.sourceSha !== "string" || !/^[0-9a-f]{40}$/u.test(recoveryPins.sourceSha) || recoveryPins?.priorRecoveryActionRunId !== ARTIFACT_RECOVERY_V1_ACTION_RUN_ID || Number(recoveryPins?.priorRecoveryArtifactId) !== ARTIFACT_RECOVERY_V1_ARTIFACT_ID || recoveryPins?.priorRecoveryAgentId !== ARTIFACT_RECOVERY_V1_AGENT_ID || recoveryPins?.priorRecoveryRunId !== ARTIFACT_RECOVERY_V1_RUN_ID || recoveryPins?.priorRecoveryThreadUrl !== ARTIFACT_RECOVERY_V1_THREAD_URL || recoveryPins?.priorRecoverySourceSha !== ARTIFACT_RECOVERY_V1_SOURCE_SHA || recoveryPins?.priorRecoveryArtifactDigest !== ARTIFACT_RECOVERY_V1_ARTIFACT_DIGEST || recoveryPins?.priorRecoveryFailureCode !== ARTIFACT_RECOVERY_V1_FAILURE_CODE || recoveryPins?.priorRecoveryPromptDigest !== v1PromptDigest || recoveryPins?.absoluteArtifactPath !== ARTIFACT_RECOVERY_V2_ABSOLUTE_ARTIFACT_PATH || recoveryPins?.apiArtifactPath !== ARTIFACT_RECOVERY_PATH || recoveryPins?.promptDigest !== v2PromptDigest || typeof recoveryPins?.idempotencyKey !== "string" || !recoveryPins.idempotencyKey.includes(":writer1:artifact-recovery:v2:")) throw new Error("active artifact-recovery v2 wake is missing the exact prior/run/source/prompt pins");
  if (typeof control.wakeNonce !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{15,127}$/u.test(control.wakeNonce)) throw new Error("active 360 canary wake requires a unique nonce");
  if (control.restore !== null) throw new Error("Writer1 artifact recovery must not restore or mutate the sealed handoff");
  if (process.env.CURSOR_MODEL !== "cursor-grok-4.6-high" || !process.env.CURSOR_API_KEY || process.env.CURSOR_FAST !== "false") throw new Error("Cursor production environment must provide exact model, API key, and fast=false");
  const priorRoot = process.env.WRITER1_PRIOR_DISPATCH_ROOT;
  if (!priorRoot) throw new Error("exact prior Writer1 dispatch artifact must be downloaded before artifact recovery");
  const priorRecoveryRoot = process.env.WRITER1_PRIOR_RECOVERY_ROOT;
  if (!priorRecoveryRoot) throw new Error("the failed v1 Writer1 recovery artifact must be restored before v2 artifact materialization");
  const sealed = validateSealed(root);
  const payload = writer1Projection(sealed);
  const prior = validatePriorArtifactRecoveryDispatch(priorRoot, { actionRunId: ARTIFACT_RECOVERY_ACTION_RUN_ID, artifactId: ARTIFACT_RECOVERY_ARTIFACT_ID, agentId: ARTIFACT_RECOVERY_AGENT_ID, jobId: ARTIFACT_RECOVERY_PRIOR_RUN_ID, threadUrl: ARTIFACT_RECOVERY_THREAD_URL, sourceBranch: ARTIFACT_RECOVERY_SOURCE_BRANCH, sourceSha: recoveryPins.sourceSha });
  if (prior.inputDigest !== digestOf(payload) || (prior.sealedHandoffDigest && prior.sealedHandoffDigest !== sealed.handoff.resealDigest)) throw new Error("prior Writer1 dispatch is not bound to the current sealed 360 handoff");
  const previousRecovery = validatePriorArtifactRecoveryFailure(priorRecoveryRoot);
  if (previousRecovery.agentId !== prior.agentId || previousRecovery.threadUrl !== prior.threadUrl || previousRecovery.promptDigest !== v1PromptDigest || recoveryPins.idempotencyKey !== `${previousRecovery.runId}:writer1:artifact-recovery:v2:${prior.inputDigest}:${v2PromptDigest}`) throw new Error("v2 recovery idempotency or previous v1 recovery binding is invalid");
  await writeJson(jsonFile(root, "canary/runtime/prior-dispatch-verification.json"), { status: "verified", prior });
  await writeJson(jsonFile(root, "canary/runtime/prior-recovery-verification.json"), { status: "verified", previousRecovery });
  await writeJson(jsonFile(root, "canary/runtime/state.json"), { status: "writer1-artifact-recovery-v2-dispatching", stage: "writer1", recoveryVersion: ARTIFACT_RECOVERY_V2_RECOVERY_VERSION, runId: sealed.handoff.runId, sealedHandoffDigest: sealed.handoff.resealDigest, priorRunId: prior.runId, priorRecoveryRunId: previousRecovery.runId, priorAgentId: prior.agentId, priorThreadUrl: prior.threadUrl, nextStage: null, writer2Blocked: true });
  const result = await recoverCursorWriterArtifactV2({ receiptStore: createJsonCursorReceiptStore(jsonFile(root, "canary/runtime/cursor-receipts.json")), prior, previousRecovery, recoveryVersion: ARTIFACT_RECOVERY_V2_RECOVERY_VERSION, prompt: v2Prompt, onFollowUp: (notice) => dispatchReceipt(root, notice), validateOutput: (output) => parseAndValidateWriter1Output(output, payload) });
  const parsed = result.output as Dict;
  validateCursorArtifactRecoveryV2Receipt(result.receipt, prior, previousRecovery, v2PromptDigest, process.env.CURSOR_API_KEY);
  await writeJson(jsonFile(root, "canary/runtime/writer1-recovery-receipt.json"), result.receipt);
  await writeJson(jsonFile(root, "canary/runtime/writer1-validation.json"), { status: "valid", schemaVersion: parsed.schemaVersion, routes: parsed.pages.map((page: Dict) => page.url), outputDigest: result.receipt.outputDigest, artifact: result.receipt.artifact, recoveryRunId: result.receipt.recoveryRunId, agentId: result.receipt.agentId, threadUrl: result.threadUrl, nextStage: null, writer2Blocked: true });
  await writeJson(jsonFile(root, "canary/outputs/writer1-output.json"), parsed);
  await writeJson(jsonFile(root, "canary/runtime/state.json"), { status: "awaiting-architect-qa", stage: "writer1", runId: sealed.handoff.runId, sealedHandoffDigest: sealed.handoff.resealDigest, threadUrl: result.threadUrl, agentId: result.receipt.agentId, recoveryRunId: result.receipt.recoveryRunId, receipt: result.receipt, artifact: result.receipt.artifact, nextStage: null, writer2Blocked: true });
  return { status: "awaiting-architect-qa", stage: "writer1", threadUrl: result.threadUrl, recoveryRunId: result.receipt.recoveryRunId };
}

export async function runFreshWriter1(root = process.cwd()): Promise<{ status: string; stage: string; threadUrl?: string; followUpRunId?: string }> {
  const control = readJson(root, ".factory-wake/360-words-control.json");
  if (control.requestedBy !== "architect" || control.stage !== "writer1" || control.policy?.writer1Only !== true || control.policy?.provider !== "cursor-sdk" || control.policy?.model !== "cursor-grok-4.6-high" || control.policy?.fast !== false) throw new Error("360 canary control is not the immutable Writer1 policy");
  if (control.wakeNonce === DORMANT_NONCE) return { status: "dormant", stage: "writer1" };
  if (typeof control.wakeNonce !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{15,127}$/u.test(control.wakeNonce)) throw new Error("active 360 canary wake requires a unique nonce");
  if (control.restore !== null) throw new Error("Fresh Writer1 must not restore or mutate the sealed handoff");
  if (process.env.CURSOR_MODEL !== "cursor-grok-4.6-high" || !process.env.CURSOR_API_KEY || process.env.CURSOR_FAST !== "false") throw new Error("Cursor production environment must provide exact model, API key, and fast=false");
  const sealed = validateSealed(root);
  const payload = writer1Projection(sealed);
  const prompt = `${WRITER1_FRESH_PROMPT}${JSON.stringify(payload)}`;
  await writeJson(jsonFile(root, "canary/runtime/state.json"), { status: "writer1-dispatching", stage: "writer1", runId: sealed.handoff.runId, sealedHandoffDigest: sealed.handoff.resealDigest, nextStage: null, writer2Blocked: true });
  const result = await createCursorWriterExecutor({
    env: process.env,
    receiptStore: createJsonCursorReceiptStore(jsonFile(root, "canary/runtime/cursor-receipts.json")),
    onDispatch: (notice) => dispatchReceipt(root, notice),
    validateOutput: (output) => parseAndValidateFreshWriter1Output(output, payload),
  }).dispatch("writer1", payload, prompt, sealed.handoff.runId);
  const parsed = parseAndValidateFreshWriter1Output(result.output, payload);
  await writeJson(jsonFile(root, "canary/runtime/writer1-receipt.json"), result.receipt);
  await writeJson(jsonFile(root, "canary/runtime/writer1-validation.json"), { status: "valid", schemaVersion: parsed.schemaVersion, routes: parsed.pages.map((page: Dict) => page.url), outputDigest: result.receipt.outputDigest, agentId: result.receipt.agentId, threadUrl: result.threadUrl, runId: result.receipt.jobId, nextStage: null, writer2Blocked: true });
  await writeJson(jsonFile(root, "canary/outputs/writer1-output.json"), parsed);
  await writeJson(jsonFile(root, "canary/runtime/state.json"), { status: "awaiting-architect-qa", stage: "writer1", runId: sealed.handoff.runId, sealedHandoffDigest: sealed.handoff.resealDigest, threadUrl: result.threadUrl, agentId: result.receipt.agentId, followUpRunId: result.receipt.jobId, receipt: result.receipt, nextStage: null, writer2Blocked: true });
  return { status: "awaiting-architect-qa", stage: "writer1", threadUrl: result.threadUrl, followUpRunId: result.receipt.jobId };
}

export const runCorrection = runFreshWriter1;
export const run = runFreshWriter1;

if (import.meta.url === `file://${process.argv[1]}`) {
  const operation = process.argv.includes("--validate-only") ? Promise.resolve(validateSealed()) : process.argv.includes("--artifact-recovery") ? runArtifactRecovery() : runCorrection();
  operation.then((result) => { console.log(JSON.stringify(result)); }).catch(async (error) => {
    const code = isRecord(error) && typeof error.code === "string" ? error.code : "WRITER1_CORRECTION_FAILED";
    const message = error instanceof Error ? error.message : String(error);
    const recovery = code === "OUTPUT_NOT_RECOVERABLE";
    await writeJson(path.join(process.cwd(), "canary/runtime/failure.json"), { status: "failed", stage: "writer1", errorCode: code, error: message, writer2Blocked: true, ...(recovery ? { recovery: "manual-architect-recovery-required" } : {}) });
    await writeJson(path.join(process.cwd(), "canary/runtime/state.json"), { status: recovery ? "writer1-output-not-recoverable" : "writer1-failed", stage: "writer1", errorCode: code, recoveryRequired: true, writer2Blocked: true, nextStage: null });
    process.exitCode = 1;
  });
}
