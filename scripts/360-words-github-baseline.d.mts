export declare const VERIFIED_WRITER1_GITHUB_BASELINE: Readonly<{
  kind: "github-file";
  repository: "alchemistj/ff-content-demo-factory";
  sourceCommit: "efe429d4464d765b5b657cb0058f00fffb35d3d7";
  path: "canary/outputs/writer1-output.json";
  blobSha: "cc8612bc9085f63141de6ae0f1dd2b9c3e1f3e08";
  rawSha256: "sha256:f693aeb968e703efbe7f9c0a7a2d1a9d4185007e32a695386e1f5eec356964a2";
  size: 23509;
  authorship: "unverified-github-before-copy";
}>;
export declare function verifyGithubWriter1Baseline(input: { metadata: Record<string, unknown>; bytes: Buffer; sealed: Record<string, unknown>; expected?: typeof VERIFIED_WRITER1_GITHUB_BASELINE }): Record<string, unknown>;
export declare function materializeGithubWriter1Baseline(input: { apiResponse: Record<string, unknown>; sealed: Record<string, unknown>; expected?: typeof VERIFIED_WRITER1_GITHUB_BASELINE; outputRoot: string }): Record<string, unknown>;
