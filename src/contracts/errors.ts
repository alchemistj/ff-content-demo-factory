export type ContractErrorCode =
  | "ONE_PROSPECT_ONLY" | "INVALID_OBJECT" | "MISSING_REQUIRED_FIELD" | "INVALID_VALUE" | "MALFORMED_ID"
  | "DUPLICATE_ID" | "INVALID_URL" | "INVALID_DATE" | "UNSUPPORTED_REVIEW_GRADE"
  | "RECOMMENDED_REVIEW_NOT_FOUND" | "RECOMMENDED_REVIEW_INCONSISTENT" | "EVIDENCE_REF_NOT_FOUND"
  | "EVIDENCE_KIND_MISMATCH" | "NEGATIVE_AS_POSITIVE" | "SUMMARY_FORBIDDEN" | "SERVICE_PAGE_COUNT"
  | "ROUTING_BOUNDARY" | "RESERVED_ROUTE" | "PUBLIC_STRATEGY_ROUTE" | "REJECTED_PAGE_ROUTE"
  | "GENERIC_SERVICE_SLOT" | "ALIAS_COLLISION" | "PAGE_SUITABILITY_INCONSISTENT"
  | "SOURCE_CHECKPOINT_INVALID" | "DIGEST_MISMATCH" | "REVIEW_ANALYSIS_MISMATCH" | "APPROVAL_REQUIRED";

export interface ContractIssue { code: ContractErrorCode; path: string; message: string; }
export class ContractValidationError extends Error {
  override readonly name = "ContractValidationError";
  readonly issues: readonly ContractIssue[];
  constructor(issues: readonly ContractIssue[]) {
    super(issues.map((issue) => `${issue.code} at ${issue.path}: ${issue.message}`).join("\n")); this.issues = issues;
  }
}
