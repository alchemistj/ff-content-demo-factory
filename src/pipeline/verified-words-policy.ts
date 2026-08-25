import { digestOf } from "../contracts/digests.js";
import { validateCursorWriterReceipt, type CursorWriterReceipt, OFFICIAL_CURSOR_MODEL, REQUIRED_CURSOR_MODEL } from "./cursor-writer.js";
import {
  ARCHITECT_APPROVAL_KEY_ID,
  ARCHITECT_APPROVAL_SCHEMA,
  ARCHITECT_WRITER1_QA_SCHEMA,
  assertArchitectQaPath,
  assertExactKeys,
  assertSha256,
  verifyArchitectEd25519,
  type ArchitectQaRole,
} from "./architect-approval.js";

export { ARCHITECT_APPROVAL_KEY_ID, ARCHITECT_WRITER1_QA_SCHEMA } from "./architect-approval.js";

export const VERIFIED_PUBLIC_ROUTES = Object.freeze(["/", "/garage-door-repair", "/garage-door-installation", "/contact"] as const);
export const VERIFIED_WRITER1_ROUTES = Object.freeze(["/garage-door-repair", "/garage-door-installation"] as const);
export const VERIFIED_WRITER2_ROUTES = Object.freeze(["/", "/contact"] as const);
export const VERIFIED_WRITER3_INTERNAL_ROUTE = "/" as const;
export const VERIFIED_WRITER3_SEALED_FACTS = Object.freeze({
  retrievedWrittenReviewCount: 47,
  reviewRetrievalDate: "2026-08-23",
  reviewBackedServicesWithoutPages: 2,
  reviewBackedServiceNames: Object.freeze(["Garage door repair", "Garage door installation"]),
});

export const VERIFIED_STAGE_POLICY = Object.freeze({
  writer1: Object.freeze({ agentMode: "existing-agent-correction", allowedRoutes: VERIFIED_WRITER1_ROUTES, stopAfter: "awaiting-architect-qa" }),
  writer2: Object.freeze({ agentMode: "new-agent", allowedRoutes: VERIFIED_WRITER2_ROUTES, fields: Object.freeze(["homepage", "contact", "header", "footer"]) }),
  writer3: Object.freeze({ agentMode: "new-agent", allowedRoutes: Object.freeze([VERIFIED_WRITER3_INTERNAL_ROUTE]), fields: Object.freeze(["strategyOverview"]), sealedFacts: VERIFIED_WRITER3_SEALED_FACTS }),
});

export type ApprovalStage = "writer1" | "writer2" | "writer3";
export interface SignedArchitectStageApproval {
  schemaVersion: typeof ARCHITECT_APPROVAL_SCHEMA;
  stage: ApprovalStage;
  decision: "approve";
  approvedBy: "architect";
  author: { kind: "architect"; keyId: string };
  independentQaArtifactPath: string;
  independentQaArtifactDigest: string;
  sealedHandoffDigest: string;
  receiptDigest: string;
  outputDigest: string;
  issuedAt: string;
  signature: string;
  verifiedWriter1Seal?: Record<string, unknown>;
}

export interface ArchitectWriter1QaArtifact {
  schemaVersion: typeof ARCHITECT_WRITER1_QA_SCHEMA;
  stage: "writer1";
  decision: "PASS";
  author: { kind: "architect"; keyId: typeof ARCHITECT_APPROVAL_KEY_ID };
  role: ArchitectQaRole;
  source: Record<string, unknown>;
  issuedAt: string;
  signature: string;
}

export interface ArchitectWriter1Approval {
  schemaVersion: "architect-writer1-approval/v1";
  stage: "writer1";
  decision: "APPROVE";
  author: { kind: "architect"; keyId: typeof ARCHITECT_APPROVAL_KEY_ID };
  qaArtifacts: Array<{ role: ArchitectQaRole; path: string; size: number; digest: string; decision: "PASS" }>;
  sealedHandoffDigest: string;
  receiptDigest: string;
  outputDigest: string;
  verifiedWriter1Seal: Record<string, unknown>;
  issuedAt: string;
  signature: string;
}

function assertIso(value: unknown, label: string): void {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) throw new Error(`${label} must be an ISO timestamp`);
}

export function validateArchitectWriter1QaArtifact(value: unknown, expectedRole?: ArchitectQaRole): asserts value is ArchitectWriter1QaArtifact {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Architect Writer1 QA must be an object");
  const qa = value as Record<string, unknown>;
  assertExactKeys(qa, ["author", "decision", "issuedAt", "role", "schemaVersion", "signature", "source", "stage"], "Architect Writer1 QA");
  if (qa.schemaVersion !== ARCHITECT_WRITER1_QA_SCHEMA || qa.stage !== "writer1" || qa.decision !== "PASS" || (qa.role !== "content" && qa.role !== "evidence") || (expectedRole !== undefined && qa.role !== expectedRole)) throw new Error("Architect Writer1 QA schema/role/decision is invalid");
  const author = qa.author as Record<string, unknown>;
  if (!author || Array.isArray(author)) throw new Error("Architect Writer1 QA author is invalid");
  assertExactKeys(author, ["kind", "keyId"], "Architect Writer1 QA author");
  if (author.kind !== "architect" || author.keyId !== ARCHITECT_APPROVAL_KEY_ID) throw new Error("Architect Writer1 QA author must be the pinned Architect key");
  if (!qa.source || typeof qa.source !== "object" || Array.isArray(qa.source)) throw new Error("Architect Writer1 QA source binding is missing");
  assertIso(qa.issuedAt, "Architect Writer1 QA issuedAt");
  verifyArchitectEd25519(qa);
}

export function validateArchitectWriter1ApprovalEnvelope(value: unknown, expectedSealedHandoffDigest?: string): asserts value is ArchitectWriter1Approval {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Architect Writer1 approval must be an object");
  const approval = value as Record<string, unknown>;
  assertExactKeys(approval, ["author", "decision", "issuedAt", "outputDigest", "qaArtifacts", "receiptDigest", "schemaVersion", "sealedHandoffDigest", "signature", "stage", "verifiedWriter1Seal"], "Architect Writer1 approval");
  if (approval.schemaVersion !== "architect-writer1-approval/v1" || approval.stage !== "writer1" || approval.decision !== "APPROVE") throw new Error("Architect Writer1 approval schema is invalid");
  const author = approval.author as Record<string, unknown>;
  if (!author || Array.isArray(author)) throw new Error("Architect Writer1 approval author is invalid");
  assertExactKeys(author, ["kind", "keyId"], "Architect Writer1 approval author");
  if (author.kind !== "architect" || author.keyId !== ARCHITECT_APPROVAL_KEY_ID) throw new Error("Architect Writer1 approval author must be the pinned Architect key");
  if (expectedSealedHandoffDigest !== undefined && approval.sealedHandoffDigest !== expectedSealedHandoffDigest) throw new Error("Architect Writer1 approval is bound to the wrong sealed handoff");
  assertSha256(approval.sealedHandoffDigest, "Architect Writer1 approval sealedHandoffDigest");
  assertSha256(approval.receiptDigest, "Architect Writer1 approval receiptDigest");
  assertSha256(approval.outputDigest, "Architect Writer1 approval outputDigest");
  assertIso(approval.issuedAt, "Architect Writer1 approval issuedAt");
  if (!approval.verifiedWriter1Seal || typeof approval.verifiedWriter1Seal !== "object" || Array.isArray(approval.verifiedWriter1Seal)) throw new Error("Architect Writer1 approval seal is missing");
  const artifacts = approval.qaArtifacts;
  if (!Array.isArray(artifacts) || artifacts.length !== 2 || new Set(artifacts.map((item) => item && typeof item === "object" ? (item as Record<string, unknown>).role : undefined)).size !== 2) throw new Error("Architect Writer1 approval requires exactly content and evidence QA artifacts");
  for (const role of ["content", "evidence"] as const) {
    const item = artifacts.find((candidate) => candidate && typeof candidate === "object" && (candidate as Record<string, unknown>).role === role) as Record<string, unknown> | undefined;
    if (!item) throw new Error(`Architect Writer1 approval is missing ${role} QA`);
    assertExactKeys(item, ["decision", "digest", "path", "role", "size"], `${role} QA pin`);
    if (item.decision !== "PASS" || !Number.isSafeInteger(item.size) || (item.size as number) <= 0) throw new Error(`${role} QA pin is invalid`);
    assertSha256(item.digest, `${role} QA digest`); assertArchitectQaPath(item.path, role);
  }
  verifyArchitectEd25519(approval);
}

export function validateSignedArchitectStageApproval(value: unknown, stage: ApprovalStage, receipt: unknown, cursorApiKey: string | undefined, expectedSealedHandoffDigest?: string): asserts value is SignedArchitectStageApproval {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Architect stage approval must be an object");
  const approval = value as Record<string, unknown>;
  if (approval.schemaVersion === "architect-writer1-approval/v1") {
    if (stage !== "writer1") throw new Error("Writer1 approval cannot authorize another stage");
    validateArchitectWriter1ApprovalEnvelope(approval, expectedSealedHandoffDigest);
  } else {
    const expectedKeys = ["approvedBy", "author", "decision", "independentQaArtifactDigest", "independentQaArtifactPath", "issuedAt", "outputDigest", "receiptDigest", "schemaVersion", "sealedHandoffDigest", "signature", "stage", ...(stage === "writer1" && approval.verifiedWriter1Seal !== undefined ? ["verifiedWriter1Seal"] : [])];
    assertExactKeys(approval, expectedKeys, "Architect stage approval");
    if (approval.schemaVersion !== ARCHITECT_APPROVAL_SCHEMA || approval.stage !== stage || approval.decision !== "approve" || approval.approvedBy !== "architect") throw new Error("Architect stage approval schema is invalid");
    const author = approval.author as Record<string, unknown>;
    if (!author || Array.isArray(author) || author.kind !== "architect" || author.keyId !== ARCHITECT_APPROVAL_KEY_ID) throw new Error("Architect stage approval author is invalid");
    if (typeof approval.independentQaArtifactPath !== "string" || !approval.independentQaArtifactPath.startsWith("qa/architect/")) throw new Error("Architect stage approval must reference external Architect QA");
    assertSha256(approval.independentQaArtifactDigest, "Architect stage approval QA digest"); assertSha256(approval.sealedHandoffDigest, "Architect stage approval sealedHandoffDigest");
    if (expectedSealedHandoffDigest !== undefined && approval.sealedHandoffDigest !== expectedSealedHandoffDigest) throw new Error("Architect stage approval is bound to the wrong sealed handoff");
    assertSha256(approval.receiptDigest, "Architect stage approval receiptDigest"); assertSha256(approval.outputDigest, "Architect stage approval outputDigest"); assertIso(approval.issuedAt, "Architect stage approval issuedAt");
  }
  if (cursorApiKey) {
    validateCursorWriterReceipt(receipt, cursorApiKey);
    const signedReceipt = receipt as CursorWriterReceipt;
    if (approval.receiptDigest !== digestOf(signedReceipt) || approval.outputDigest !== signedReceipt.outputDigest || signedReceipt.stage !== stage || signedReceipt.requestedModel !== REQUIRED_CURSOR_MODEL || signedReceipt.resolvedModel !== OFFICIAL_CURSOR_MODEL || signedReceipt.effort !== "high" || signedReceipt.fast !== false) throw new Error("Architect stage approval is not bound to the direct Cursor receipt");
  }
  verifyArchitectEd25519(approval);
}

export function assertVerifiedDownstreamState(state: unknown): void {
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new Error("Verified downstream state is missing");
  const value = state as Record<string, unknown>;
  if (value.status === "awaiting-human-gate-2" || value.writer2Blocked === false || value.writer3Released === true || value.normalizedOutputApprovedForWriter2 === true) throw new Error("Locally manufactured downstream or QA state cannot authorize the verified lane");
  if (value.stage !== "writer1" || value.nextStage !== null || value.writer2Blocked !== true) throw new Error("Verified lane must remain stopped at Writer1 with Writer2 blocked");
}

export function assertNoLocalDownstreamGeneration(sourceText: string): void {
  if (/write-360-writer1-copy|render-360-human-gate-2|writer2-output\.json|writer3-output\.json|human-gate-2\.md/iu.test(sourceText)) throw new Error("Verified runner must not manufacture Writer1, Writer2, Writer3, or QA artifacts locally");
}
