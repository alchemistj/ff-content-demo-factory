import { createHash } from "node:crypto";

// This module is the single source of truth for the bytes sent to Cursor during
// the two versioned artifact-recovery paths.  Control validation imports the
// same builder used by the runtime; no prompt digest is maintained separately.
const PROMPTS = Object.freeze({
  v1: "Versioned Writer1 artifact recovery for the existing same-thread agent. Do not write, rewrite, summarize, recompute, or regenerate any website copy. Read the already-written complete words-writer1-output/v1 from the current agent workspace. Materialize that exact existing JSON under artifacts/writer1-output.json. The artifact file must contain the complete JSON object, not a summary, Markdown, or prose wrapper. If the complete existing JSON is genuinely unavailable, materialize the exact literal OUTPUT_NOT_RECOVERABLE at artifacts/writer1-output.json. Do not create Home, Contact, Strategy, spring-repair, or opener-installation pages or routes. Do not run Writer2. The existing sealed Writer1 output must remain unchanged; this is retrieval and materialization only.",
  v2: "Versioned Writer1 artifact materialization recovery v2 for the existing same-thread agent. Do not write, rewrite, summarize, recompute, or generate website copy. Preserve the existing completed two-page words-writer1-output/v1 JSON exactly if it exists anywhere in the repository or agent workspace. Move or copy that exact complete JSON, without a prose wrapper or Markdown, to the absolute agent workspace path /opt/cursor/artifacts/writer1-output.json. The Cursor API artifact listing and download path remains the logical relative path artifacts/writer1-output.json; do not substitute a repository-relative path for the absolute workspace target. If the existing complete two-page JSON is unavailable but the already-written two-page draft exists in the repository or workspace, materialize that existing draft at the absolute path without changing its words. Do not summarize, rewrite, recompute, or create new pages. The artifact must be the complete words-writer1-output/v1 object with exactly /garage-door-repair and /garage-door-installation, or the exact literal OUTPUT_NOT_RECOVERABLE. If unrecoverable, materialize that exact sentinel at /opt/cursor/artifacts/writer1-output.json. Do not create Home, Contact, Strategy, spring-repair, or opener-installation routes, navigation items, or CTAs. Do not run Writer2. This is a versioned same-thread materialization correction only.",
});

export function buildWriter1ArtifactRecoveryPrompt(version) {
  if (version !== "v1" && version !== "v2") throw new Error(`unsupported Writer1 artifact recovery prompt version: ${version}`);
  return PROMPTS[version];
}

export function digestWriter1ArtifactRecoveryPrompt(version) {
  const prompt = buildWriter1ArtifactRecoveryPrompt(version);
  return `sha256:${createHash("sha256").update(JSON.stringify(prompt)).digest("hex")}`;
}
