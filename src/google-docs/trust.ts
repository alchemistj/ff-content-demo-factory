import { resolve, relative, isAbsolute, sep } from "node:path";
import { GoogleDocsError } from "./errors.js";

export const TRUSTED_BRANCH = "main";
export const TRUSTED_REF = "refs/heads/main";
export const APPROVED_COPY_ROOT = "approved-copy";
export const PROSPECT_ID_RE = /^[a-z][a-z0-9-]{0,63}$/;

export function assertTrustedGithubRef(ref = process.env.GITHUB_REF): void {
  if (process.env.GITHUB_ACTIONS !== "true") return;
  if (ref !== TRUSTED_REF) {
    throw new GoogleDocsError(
      "authorization_failed",
      `Secret-bearing Google Docs jobs may only run from ${TRUSTED_REF}. Received ${ref ?? "(none)"}.`,
    );
  }
}

export function approvedSnapshotRelativeDir(prospectId: string): string {
  if (!PROSPECT_ID_RE.test(prospectId)) {
    throw new GoogleDocsError("invalid_writing_package", "prospectId must be a lowercase slug for approved-copy/.");
  }
  return `${APPROVED_COPY_ROOT}/${prospectId}`;
}

export function assertRepoRelativeInputPath(inputPath: string, label: string): string {
  if (inputPath.length === 0 || isAbsolute(inputPath) || inputPath.includes("\0")) {
    throw new GoogleDocsError("invalid_writing_package", `${label} must be a relative repository path.`);
  }
  const normalized = inputPath.replace(/\\/g, "/");
  const parts = normalized.split("/");
  if (parts.some((part) => part === "..")) {
    throw new GoogleDocsError("invalid_writing_package", `${label} must not contain parent-directory segments.`);
  }
  return normalized;
}

export function resolveApprovedSnapshotDir(prospectId: string, repoRoot = process.cwd()): {
  readonly relativeDir: string;
  readonly absoluteDir: string;
} {
  const relativeDir = approvedSnapshotRelativeDir(prospectId);
  const absoluteDir = resolve(repoRoot, relativeDir);
  const rel = relative(repoRoot, absoluteDir);
  if (isAbsolute(rel) || rel.startsWith("..") || rel.split(sep)[0] !== APPROVED_COPY_ROOT) {
    throw new GoogleDocsError("invalid_writing_package", "Approved snapshot path escaped approved-copy/.");
  }
  return { relativeDir, absoluteDir };
}
