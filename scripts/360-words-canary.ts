import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { createJsonCursorReceiptStore, retrieveCursorWriterOutput, validateCursorWriterReceipt, validateCursorWriterFollowUpReceipt, type CursorDispatchNotice, type CursorFollowUpBindings, type CursorWriterReceipt } from "../src/pipeline/cursor-writer.js";
import { digestOf } from "../src/contracts/digests.js";

const DORMANT_NONCE = "DORMANT";
const ROUTES = ["/", "/garage-door-repair", "/garage-door-installation", "/contact"] as const;
const WRITER1_ROUTES = ["/garage-door-repair", "/garage-door-installation"] as const;
export const PRIOR_ACTION_RUN_ID = "32776170549";
export const PRIOR_ARTIFACT_ID = 9539302493;
export const PRIOR_CURSOR_AGENT_ID = "bc-972b63b0-6e43-4c76-805d-b95a0ba13da8";
export const PRIOR_CURSOR_RUN_ID = "run-a59d6e17-3ce0-4c0f-8231-597d5b15382b";
export const PRIOR_OUTPUT_DIGEST = "sha256:d2f2e75fbd2482e87afe18926fc6fcf1de319fe1ff9d1eb3a942ca7cfbee7e29";
export const PRIOR_CURSOR_THREAD_URL = `https://cursor.com/agents/${PRIOR_CURSOR_AGENT_ID}`;
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
    if (page.type !== undefined && String(page.type).toLowerCase() !== "service") invalidWriter1Output("Writer1 output contains a non-service page");
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

export async function runCorrection(root = process.cwd()): Promise<{ status: string; stage: string; threadUrl?: string; followUpRunId?: string }> {
  const control = readJson(root, ".factory-wake/360-words-control.json");
  if (control.requestedBy !== "architect" || control.stage !== "writer1" || control.policy?.writer1Only !== true || control.policy?.provider !== "cursor-sdk" || control.policy?.model !== "cursor-grok-4.6-high" || control.policy?.fast !== false) throw new Error("360 canary control is not the immutable Writer1 policy");
  if (control.wakeNonce === DORMANT_NONCE) return { status: "dormant", stage: "writer1" };
  if (typeof control.wakeNonce !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{15,127}$/u.test(control.wakeNonce)) throw new Error("active 360 canary wake requires a unique nonce");
  if (control.restore !== null) throw new Error("Writer1 retrieval must not restore or mutate the sealed handoff");
  if (process.env.CURSOR_MODEL !== "cursor-grok-4.6-high" || !process.env.CURSOR_API_KEY || process.env.CURSOR_FAST !== "false") throw new Error("Cursor production environment must provide exact model, API key, and fast=false");
  const priorRoot = process.env.WRITER1_PRIOR_ARTIFACT_ROOT;
  if (!priorRoot) throw new Error("exact prior Writer1 GitHub artifact must be downloaded before retrieval");
  const prior = validatePriorWriter1Artifact(priorRoot);
  const sealed = validateSealed(root);
  const payload = writer1Projection(sealed);
  let followUpNotice: CursorDispatchNotice | undefined;
  await writeJson(jsonFile(root, "canary/runtime/prior-artifact-verification.json"), { status: "verified", actionRunId: PRIOR_ACTION_RUN_ID, artifactId: PRIOR_ARTIFACT_ID, prior: prior.bindings });
  await writeJson(jsonFile(root, "canary/runtime/state.json"), { status: "writer1-retrieval-dispatching", stage: "writer1", runId: sealed.handoff.runId, sealedHandoffDigest: sealed.handoff.resealDigest, prior: prior.bindings });
  const result = await retrieveCursorWriterOutput({
    env: process.env,
    receiptStore: createJsonCursorReceiptStore(jsonFile(root, "canary/runtime/cursor-receipts.json")),
    priorReceipt: prior.receipt,
    prior: prior.bindings,
    prompt: WRITER1_RETRIEVAL_PROMPT,
    runId: sealed.handoff.runId,
    onFollowUp: (notice) => { followUpNotice = notice; },
    validateOutput: (output) => parseAndValidateWriter1Output(output, payload),
  });
  const parsed = parseAndValidateWriter1Output(result.output, payload);
  validateCursorWriterFollowUpReceipt(result.receipt, prior.bindings, digestOf(WRITER1_RETRIEVAL_PROMPT));
  if (!followUpNotice) throw new Error("Writer1 follow-up completed without a dispatch notice");
  await dispatchReceipt(root, followUpNotice);
  await writeJson(jsonFile(root, "canary/runtime/writer1-correction-receipt.json"), result.receipt);
  await writeJson(jsonFile(root, "canary/runtime/writer1-validation.json"), { status: "valid", schemaVersion: parsed.schemaVersion, routes: parsed.pages.map((page: Dict) => page.url), outputDigest: result.receipt.outputDigest, sameThread: result.threadUrl === prior.bindings.priorThreadUrl, prior: prior.bindings, followUpRunId: result.receipt.jobId });
  await writeJson(jsonFile(root, "canary/outputs/writer1-output.json"), parsed);
  await writeJson(jsonFile(root, "canary/runtime/state.json"), { status: "awaiting-architect-qa", stage: "writer1", runId: sealed.handoff.runId, sealedHandoffDigest: sealed.handoff.resealDigest, threadUrl: result.threadUrl, followUpRunId: result.receipt.jobId, prior: prior.bindings, receipt: result.receipt, nextStage: null });
  return { status: "awaiting-architect-qa", stage: "writer1", threadUrl: result.threadUrl, followUpRunId: result.receipt.jobId };
}

export const run = runCorrection;

if (import.meta.url === `file://${process.argv[1]}`) {
  const operation = process.argv.includes("--validate-only") ? Promise.resolve(validateSealed()) : runCorrection();
  operation.then((result) => { console.log(JSON.stringify(result)); }).catch(async (error) => {
    const code = isRecord(error) && typeof error.code === "string" ? error.code : "WRITER1_CORRECTION_FAILED";
    const message = error instanceof Error ? error.message : String(error);
    const recovery = code === "OUTPUT_NOT_RECOVERABLE";
    await writeJson(path.join(process.cwd(), "canary/runtime/failure.json"), { status: "failed", stage: "writer1", errorCode: code, error: message, ...(recovery ? { recovery: "manual-architect-recovery-required" } : {}) });
    if (recovery) await writeJson(path.join(process.cwd(), "canary/runtime/state.json"), { status: "writer1-output-not-recoverable", stage: "writer1", errorCode: code, recoveryRequired: true, nextStage: null });
    process.exitCode = 1;
  });
}
