import { createHmac, timingSafeEqual } from "node:crypto";
import { canonicalize, digestOf } from "../contracts/digests.js";
import { validateCursorWriterReceipt, type CursorWriterReceipt, OFFICIAL_CURSOR_MODEL, REQUIRED_CURSOR_MODEL } from "./cursor-writer.js";

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

type ApprovalStage = "writer1" | "writer2";
export interface SignedArchitectStageApproval {
  schemaVersion: "architect-stage-approval/v1";
  stage: ApprovalStage;
  decision: "approve";
  approvedBy: "architect";
  independentQaArtifactPath: string;
  independentQaArtifactDigest: string;
  receiptDigest: string;
  outputDigest: string;
  issuedAt: string;
  signature: string;
}
const APPROVAL_DOMAIN = "ff-content-demo-factory/architect-stage-approval/hmac-sha256/v1";
function unsignedApproval(value: SignedArchitectStageApproval): string {
  const { signature: _signature, ...unsigned } = value;
  return JSON.stringify(canonicalize(unsigned));
}
function approvalSignature(value: SignedArchitectStageApproval, key: string): string {
  const derived = createHmac("sha256", APPROVAL_DOMAIN).update(key, "utf8").digest();
  return `hmac-sha256:${createHmac("sha256", derived).update(unsignedApproval(value), "utf8").digest("hex")}`;
}
export function validateSignedArchitectStageApproval(value: unknown, stage: ApprovalStage, receipt: unknown, cursorApiKey: string): asserts value is SignedArchitectStageApproval {
  if (!cursorApiKey) throw new Error("Architect stage approval verification requires the configured signing key");
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Architect stage approval must be an object");
  const approval = value as SignedArchitectStageApproval;
  if (approval.schemaVersion !== "architect-stage-approval/v1" || approval.stage !== stage || approval.decision !== "approve" || approval.approvedBy !== "architect" || !approval.independentQaArtifactPath || !/^sha256:[0-9a-f]{64}$/u.test(approval.independentQaArtifactDigest) || !/^sha256:[0-9a-f]{64}$/u.test(approval.receiptDigest) || !/^sha256:[0-9a-f]{64}$/u.test(approval.outputDigest) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(approval.issuedAt)) throw new Error("Architect stage approval is incomplete");
  validateCursorWriterReceipt(receipt, cursorApiKey);
  const signedReceipt = receipt as CursorWriterReceipt;
  if (approval.receiptDigest !== digestOf(signedReceipt) || approval.outputDigest !== signedReceipt.outputDigest || signedReceipt.stage !== stage || signedReceipt.requestedModel !== REQUIRED_CURSOR_MODEL || signedReceipt.resolvedModel !== OFFICIAL_CURSOR_MODEL || signedReceipt.effort !== "high" || signedReceipt.fast !== false) throw new Error("Architect stage approval is not bound to the direct Cursor receipt");
  const expected = approvalSignature(approval, cursorApiKey); const actual = approval.signature;
  if (!/^hmac-sha256:[0-9a-f]{64}$/u.test(actual)) throw new Error("Architect stage approval signature is invalid");
  const a = Buffer.from(actual.slice(12), "hex"); const b = Buffer.from(expected.slice(12), "hex"); if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("Architect stage approval signature does not verify");
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
