export type HandoffIssueCode =
  | "INVALID_OBJECT"
  | "MISSING_REQUIRED_FIELD"
  | "INVALID_VALUE"
  | "MALFORMED_ID"
  | "DUPLICATE_ID"
  | "SOURCE_REF_NOT_FOUND"
  | "ADVISORY_LANGUAGE_REQUIRED"
  | "LOCKED_DECISION_LEAK"
  | "ONE_PROSPECT_ONLY"
  | "INVALID_URL"
  | "INVALID_DATE";

export interface HandoffIssue {
  readonly code: HandoffIssueCode;
  readonly path: string;
  readonly message: string;
}

export class HandoffValidationError extends Error {
  readonly issues: readonly HandoffIssue[];

  constructor(issues: readonly HandoffIssue[]) {
    super(
      `Handoff validation failed (${issues.length} issue${issues.length === 1 ? "" : "s"}): ${issues
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join("; ")}`,
    );
    this.name = "HandoffValidationError";
    this.issues = issues;
  }
}
