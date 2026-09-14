/**
 * Git provenance for Springfield approved-copy examples.
 *
 * Copy authority is the named repository ref. HTTP/Preview may be used only
 * as composition verification, never as the sole source of approved copy.
 */

export const GIT_SHA_RE = /^[0-9a-f]{40}$/;

export const REQUIRED_CLIENT_REFS = Object.freeze({
  "window-dudes": Object.freeze({
    repository: "alchemistj/window-dudes",
    ref: "main",
    sha: "5a3019ac2f9c89e588ff03bb916aca3b4476a2e5",
  }),
  sra: Object.freeze({
    repository: "alchemistj/sra-roofing-website",
    ref: "reconcile/sra-local-recovery-2026-09-09",
    sha: "f3f22a8154555cc762593c41947a5f2c6d4a2832",
  }),
  "greene-planet": Object.freeze({
    repository: "alchemistj/greene-planet-website",
    ref: "main",
    sha: "f9047501d167bd4977a61012d519ae06e9a169c8",
  }),
} as const);

export type ClientBusiness = keyof typeof REQUIRED_CLIENT_REFS;

export type CopyAuthority = "git-repository";

export interface ExampleProvenance {
  readonly repository: string;
  readonly ref: string;
  readonly sha: string;
  readonly sourceFiles: readonly string[];
  readonly copyAuthority: CopyAuthority;
}

const FORBIDDEN_AUTHORITY = [
  /sha unavailable/i,
  /source-unavailable/i,
  /source not available/i,
  /\bvercel\b/i,
  /production deployment/i,
  /prerendered/i,
];

export function isGitSha(value: string): boolean {
  return GIT_SHA_RE.test(value);
}

export function provenanceLooksLikeGitSource(provenance: ExampleProvenance): boolean {
  if (provenance.copyAuthority !== "git-repository") return false;
  if (!isGitSha(provenance.sha)) return false;
  if (!provenance.repository.includes("/")) return false;
  if (!provenance.ref.trim()) return false;
  if (provenance.sourceFiles.length === 0) return false;
  for (const file of provenance.sourceFiles) {
    if (!file || file.includes("://") || /\bvercel\b/i.test(file)) return false;
  }
  return true;
}

export function textClaimsNonGitAuthority(text: string): boolean {
  return FORBIDDEN_AUTHORITY.some((pattern) => pattern.test(text));
}

export function requiredRefForBusiness(business: ClientBusiness) {
  return REQUIRED_CLIENT_REFS[business];
}
