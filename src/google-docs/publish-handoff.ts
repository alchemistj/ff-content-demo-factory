import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { GoogleDocsError } from "./errors.js";
import { TRUSTED_BRANCH } from "./trust.js";
import type { PublicationReceipt } from "./lifecycle.js";

export const PUBLISH_WORKFLOW_FILE = ".github/workflows/google-docs-publish.yml";
export const APPROVE_WORKFLOW_FILE = ".github/workflows/google-docs-approve.yml";
export const PUBLISH_ARTIFACT_NAME = "google-docs-publish";
export const PUBLISH_HANDOFF_DIR = ".google-docs-handoff";
export const PUBLISH_RECEIPT_FILENAME = "google-doc-receipt.json";
export const PUBLISH_LIFECYCLE_FILENAME = "lifecycle.json";

const PUBLICATION_STATUSES = new Set(["published", "reused", "new_review_version"]);

export interface GithubActionsRunMetadata {
  readonly id: number | string;
  readonly path: string;
  readonly head_branch: string;
  readonly event: string;
  readonly status: string;
  readonly conclusion: string | null;
}

export function assertNumericPublishRunId(value: string): string {
  if (!/^[1-9][0-9]{0,31}$/.test(value)) {
    throw new GoogleDocsError(
      "invalid_writing_package",
      "publish_run_id must be a numeric GitHub Actions run id.",
    );
  }
  return value;
}

export function parseGithubActionsRunMetadata(value: unknown): GithubActionsRunMetadata {
  if (!value || typeof value !== "object") {
    throw new GoogleDocsError("authorization_failed", "Publish run metadata is not an object.");
  }
  const record = value as Record<string, unknown>;
  if (record.id === undefined || (typeof record.id !== "number" && typeof record.id !== "string")) {
    throw new GoogleDocsError("authorization_failed", "Publish run metadata is missing id.");
  }
  for (const key of ["path", "head_branch", "event", "status"] as const) {
    if (typeof record[key] !== "string") {
      throw new GoogleDocsError("authorization_failed", `Publish run metadata is missing ${key}.`);
    }
  }
  const conclusion = record.conclusion;
  if (conclusion !== null && typeof conclusion !== "string") {
    throw new GoogleDocsError("authorization_failed", "Publish run metadata has an invalid conclusion.");
  }
  return {
    id: record.id as number | string,
    path: record.path as string,
    head_branch: record.head_branch as string,
    event: record.event as string,
    status: record.status as string,
    conclusion,
  };
}

export function assertTrustedPublishRun(
  run: GithubActionsRunMetadata,
  expectedRunId?: string,
): GithubActionsRunMetadata {
  if (expectedRunId !== undefined && String(run.id) !== expectedRunId) {
    throw new GoogleDocsError(
      "authorization_failed",
      `Publish run id ${run.id} does not match requested ${expectedRunId}.`,
    );
  }
  if (run.path !== PUBLISH_WORKFLOW_FILE) {
    throw new GoogleDocsError(
      "authorization_failed",
      `Publish artifact must come from ${PUBLISH_WORKFLOW_FILE}, not ${run.path}.`,
    );
  }
  if (run.head_branch !== TRUSTED_BRANCH) {
    throw new GoogleDocsError(
      "authorization_failed",
      `Publish run must be from ${TRUSTED_BRANCH}, not ${run.head_branch}.`,
    );
  }
  if (run.event !== "workflow_dispatch") {
    throw new GoogleDocsError(
      "authorization_failed",
      `Publish run must be workflow_dispatch, not ${run.event}.`,
    );
  }
  if (run.status !== "completed" || run.conclusion !== "success") {
    throw new GoogleDocsError(
      "authorization_failed",
      `Publish run must have completed successfully. status=${run.status} conclusion=${run.conclusion}.`,
    );
  }
  return run;
}

export function isPublicationReceipt(value: unknown): value is PublicationReceipt {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    record.schemaVersion === "1.0.0" &&
    typeof record.documentId === "string" &&
    record.documentId.length > 0 &&
    typeof record.documentUrl === "string" &&
    /^https:\/\/docs\.google\.com\/document\//.test(record.documentUrl) &&
    typeof record.title === "string" &&
    typeof record.prospectId === "string" &&
    PUBLICATION_STATUSES.has(String(record.publicationStatus))
  );
}

export function readHandoffReceipt(handoffDir: string): PublicationReceipt {
  const path = join(handoffDir, PUBLISH_RECEIPT_FILENAME);
  if (!existsSync(path)) {
    throw new GoogleDocsError(
      "invalid_writing_package",
      `Publish handoff is missing ${PUBLISH_RECEIPT_FILENAME}.`,
    );
  }
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!isPublicationReceipt(parsed)) {
    throw new GoogleDocsError(
      "invalid_writing_package",
      "Publish handoff receipt is not a successful Google Doc publication. Fix Google OAuth and retry publish; do not rerun the writer.",
    );
  }
  return parsed;
}

export function formatPublishJobSummary(receipt: PublicationReceipt): string {
  return [
    "## Review this Google Doc",
    "",
    "Open this link and edit the copy in place:",
    "",
    receipt.documentUrl,
    "",
    `- Title: ${receipt.title}`,
    `- Prospect: ${receipt.prospectId}`,
    `- Status: ${receipt.publicationStatus}`,
    "",
    "Copy the numeric run id from this publish workflow URL for the later **Google Docs approve copy** job.",
    "Approval is that authenticated GitHub Action, not a phrase typed in the Doc.",
    "",
  ].join("\n");
}

export function formatPublishFailureSummary(detail: string): string {
  return [
    "## Publication did not create a review Doc",
    "",
    detail,
    "",
    "Keep the finished writing package. Configure Gmail OAuth if needed, then rerun **Google Docs publish**.",
    "Do not rerun research, prescription, or the writer.",
    "",
  ].join("\n");
}

export function formatPublishLogBanner(url: string): string {
  return [
    "========================================",
    "REVIEW DOC (click to edit):",
    url,
    "========================================",
  ].join("\n");
}
