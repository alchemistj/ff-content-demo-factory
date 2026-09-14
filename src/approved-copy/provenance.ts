/**
 * Source identity for Springfield approved-copy examples.
 *
 * Copy is captured from the named rendered build or reviewed Preview.
 * Repository + SHA identify the site lineage. A git clone is not required.
 */

export const GIT_SHA_RE = /^[0-9a-f]{40}$/;

export const SRA_REVIEWED_PREVIEW_ORIGIN =
  "https://sra-roofing-website-mlulb84dr-josh-lenzs-projects.vercel.app";

export const REQUIRED_CLIENT_REFS = Object.freeze({
  "window-dudes": Object.freeze({
    repository: "alchemistj/window-dudes",
    ref: "main",
    sha: "5a3019ac2f9c89e588ff03bb916aca3b4476a2e5",
    captureKind: "canonical-rendered-build" as const,
    captureOrigin: "https://www.windowdudesllc.com",
    equivalentSha: null,
  }),
  sra: Object.freeze({
    repository: "alchemistj/sra-roofing-website",
    ref: "reconcile/sra-local-recovery-2026-09-09",
    sha: "fde339ca62488e61f99d4a855aafe9bad5cab1c0",
    captureKind: "reviewed-preview" as const,
    captureOrigin: SRA_REVIEWED_PREVIEW_ORIGIN,
    equivalentSha: "f3f22a8154555cc762593c41947a5f2c6d4a2832",
  }),
  "greene-planet": Object.freeze({
    repository: "alchemistj/greene-planet-website",
    ref: "main",
    sha: "f9047501d167bd4977a61012d519ae06e9a169c8",
    captureKind: "canonical-rendered-build" as const,
    captureOrigin: "https://greene-planet-website.vercel.app",
    equivalentSha: null,
  }),
});

export type ClientBusiness = keyof typeof REQUIRED_CLIENT_REFS;

export type CaptureKind = "canonical-rendered-build" | "reviewed-preview";

export interface ExampleProvenance {
  readonly repository: string;
  readonly ref: string;
  readonly sha: string;
  readonly equivalentSha: string | null;
  readonly captureKind: CaptureKind;
  readonly captureUrl: string;
  readonly limitation: string;
}

const LIMITATIONS = Object.freeze({
  "window-dudes":
    "Canonical rendered Window Dudes build. Page HTML ff-source-sha matches alchemistj/window-dudes main. Capture is rendered HTML, not a git clone.",
  sra: "Reviewed Preview of reconcile/sra-local-recovery-2026-09-09. Preview SHA fde339ca is copy-equivalent to reviewed head f3f22a81 (only docs/sra-release-runbook-20260914.md differs). Live production was not used. Capture is rendered HTML, not a git clone.",
  "greene-planet":
    "Canonical rendered Greene Planet Vercel build, not the live Duda site. Canonical identity is alchemistj/greene-planet-website main. Rendered HTML does not embed a source SHA. Capture is rendered HTML, not a git clone.",
} as const);

export function isGitSha(value: string): boolean {
  return GIT_SHA_RE.test(value);
}

export function captureUrlFor(business: ClientBusiness, route: string): string {
  return `${REQUIRED_CLIENT_REFS[business].captureOrigin}${route}`;
}

export function limitationFor(business: ClientBusiness): string {
  return LIMITATIONS[business];
}

export function provenanceHasTruthfulIdentity(
  provenance: ExampleProvenance,
  business: ClientBusiness,
): boolean {
  const required = REQUIRED_CLIENT_REFS[business];
  if (provenance.captureKind !== required.captureKind) return false;
  if (provenance.repository !== required.repository) return false;
  if (provenance.ref !== required.ref) return false;
  if (!isGitSha(provenance.sha) || provenance.sha !== required.sha) return false;
  if (provenance.equivalentSha !== required.equivalentSha) return false;
  if (!provenance.captureUrl.startsWith(required.captureOrigin)) return false;
  if (business === "sra" && /sraroofs\.com/i.test(provenance.captureUrl)) return false;
  if (!provenance.limitation.trim()) return false;
  return true;
}

export function requiredRefForBusiness(business: ClientBusiness) {
  return REQUIRED_CLIENT_REFS[business];
}
