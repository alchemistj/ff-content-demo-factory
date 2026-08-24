/**
 * Source identities pinned outside any mutable handoff or persisted state.
 * Updating a handoff and recomputing its own digests cannot create authority.
 */
export interface TrustedSourceIdentity {
  runId: string;
  artifactId: string;
  sourceSha: string;
  manifestDigest: string;
  archiveDigest: string;
}

export const TRUSTED_SOURCE_IDENTITIES: Readonly<Record<string, TrustedSourceIdentity>> = Object.freeze({
  "9516514426": Object.freeze({
    runId: "32717620900",
    artifactId: "9516514426",
    sourceSha: "81587f8422a23313fd7868751061eec7e2fb5926",
    manifestDigest: "sha256:662201c83fb7ca1d21d82cd748383e606a488f891e738a135c099701092c2599",
    archiveDigest: "sha256:c2ca753b617e629376bb7870a4ff43e1aa5b726d412f4591d45133fd6d7bae30",
  }),
});
