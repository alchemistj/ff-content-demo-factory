import fs from "node:fs";
import { execFileSync } from "node:child_process";

export const CONTROL_PATH = ".factory-wake/360-words-control.json";
export const DORMANT_NONCE = "DORMANT";

// The recovery tuple is immutable protocol state.  The source SHA is deliberately
// excluded: it is the exact 40-hex source pin supplied by the Architect control
// file and is emitted only after the control boundary has been validated.
export const EXPECTED_RECOVERY = Object.freeze({
  priorActionRunId: "32785189225",
  priorArtifactId: 9541802267,
  priorAgentId: "bc-30fc8ffa-2005-44b9-8fc7-48ddd9c3bcc8",
  priorRunId: "run-b0341a7a-9f03-4dec-b76d-7350ba1e82f2",
  priorThreadUrl: "https://cursor.com/agents/bc-30fc8ffa-2005-44b9-8fc7-48ddd9c3bcc8",
  artifactPath: "artifacts/writer1-output.json",
  sourceBranch: "architect/360-words-canary",
  sealedHandoffDigest: "sha256:715f651a53055444b8381dd8a276a2046d93776c61d88a2193cc2d42a1c83ad6",
});
export const EXPECTED_RECOVERY_V2 = Object.freeze({
  recoveryVersion: "words-writer1-artifact-recovery/v2",
  priorRecoveryActionRunId: "32793130502",
  priorRecoveryArtifactId: 9543869555,
  priorRecoveryAgentId: "bc-30fc8ffa-2005-44b9-8fc7-48ddd9c3bcc8",
  priorRecoveryRunId: "run-1b862d23-a748-4574-909a-66aac905eb97",
  priorRecoveryThreadUrl: "https://cursor.com/agents/bc-30fc8ffa-2005-44b9-8fc7-48ddd9c3bcc8",
  priorRecoverySourceSha: "6cf9b42e43e5728614a9b7302a8791e527197e3d",
  priorRecoveryArtifactDigest: "sha256:2d1d1c0d281917025be80898ab03c94171d59d1e2920ecf540b241f666464502",
  priorRecoveryFailureCode: "CURSOR_ARTIFACT_MISSING",
  priorRecoveryPromptDigest: "sha256:1b9726fb288041c08ff2a58f2857ac209b0d4ff4fa7dc1ae8c52bd0a4ab6ded6",
  absoluteArtifactPath: "/opt/cursor/artifacts/writer1-output.json",
  apiArtifactPath: "artifacts/writer1-output.json",
  promptDigest: "sha256:76a6571a8b6bfaf233bf48534aaf3b161ffeea4e77010023a3e127de29b69ace",
});

export function validateControl(control, input = {}) {
  if (!control || typeof control !== "object") throw new Error("canary control must be an object");
  if (control.schemaVersion !== "words-canary-control/v1") throw new Error("unsupported canary control schema");
  if (control.requestedBy !== "architect" || control.stage !== "writer1") throw new Error("only Architect Writer1 control is permitted");
  if (control.policy?.writer1Only !== true || control.policy?.provider !== "cursor-sdk" || control.policy?.model !== "cursor-grok-4.6-high" || control.policy?.fast !== false) throw new Error("immutable Writer1 policy mismatch");
  if (control.restore !== null) throw new Error("Writer1 may not restore a previous artifact");
  if (control.wakeNonce === DORMANT_NONCE) return { dormant: true, stage: "writer1" };
  if (control.policy?.mode !== "artifact-recovery") throw new Error("active Writer1 wake must explicitly select artifact-recovery mode");
  if (typeof control.wakeNonce !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{15,127}$/u.test(control.wakeNonce)) throw new Error("invalid wake nonce");
  const changedPaths = Array.isArray(input.changedPaths) ? input.changedPaths : [];
  if (changedPaths.length !== 1 || changedPaths[0] !== CONTROL_PATH) throw new Error("active wake must change only the control file");
  if (String(input.actor || "").toLowerCase() !== String(input.owner || "").toLowerCase()) throw new Error("active wake requires the repository owner Architect actor");
  const recovery = control.policy?.recovery;
  if (!recovery || Object.entries(EXPECTED_RECOVERY).some(([key, value]) => recovery[key] !== value)) throw new Error("active artifact-recovery wake is missing the exact prior/run/source tuple");
  if (typeof recovery.sourceSha !== "string" || !/^[0-9a-f]{40}$/u.test(recovery.sourceSha)) throw new Error("active artifact-recovery wake requires an exact 40-hex sourceSha");
  if (Object.entries(EXPECTED_RECOVERY_V2).some(([key, value]) => recovery[key] !== value) || typeof recovery.idempotencyKey !== "string" || !/^[^:\s]+:writer1:artifact-recovery:v2:sha256:[0-9a-f]{64}:sha256:[0-9a-f]{64}$/u.test(recovery.idempotencyKey)) throw new Error("active artifact-recovery v2 wake is missing the exact failed-v1, absolute-path, prompt, or idempotency pins");
  return { dormant: false, stage: "writer1", sourceSha: recovery.sourceSha };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const control = JSON.parse(fs.readFileSync(CONTROL_PATH, "utf8"));
  const changedPaths = execFileSync("git", ["diff-tree", "--no-commit-id", "--name-only", "-r", `${process.env.GITHUB_SHA}^`, process.env.GITHUB_SHA], { encoding: "utf8" }).trim().split(/\n/u).filter(Boolean);
  const result = validateControl(control, { changedPaths, actor: process.env.GITHUB_ACTOR, owner: process.env.GITHUB_REPOSITORY_OWNER });
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `dormant=${result.dormant}\nstage=${result.stage}\n${result.sourceSha ? `source_sha=${result.sourceSha}\n` : ""}`);
}
