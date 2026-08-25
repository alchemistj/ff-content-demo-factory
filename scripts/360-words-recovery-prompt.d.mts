export type Writer1ArtifactRecoveryPromptVersion = "v1" | "v2" | "v3" | "v5" | "v6";
export declare function buildWriter1ArtifactRecoveryPrompt(version: Writer1ArtifactRecoveryPromptVersion): string;
export declare function digestWriter1ArtifactRecoveryPrompt(version: Writer1ArtifactRecoveryPromptVersion): string;
export declare function buildWriter1GithubBaselineCorrectionPrompt(baseline: { kind: "github-file"; sourceCommit: string; path: string; blobSha: string; rawSha256: string; size: number }): string;
export declare function digestWriter1GithubBaselineCorrectionPrompt(baseline: { kind: "github-file"; sourceCommit: string; path: string; blobSha: string; rawSha256: string; size: number }): string;
