import fs from "node:fs";
import { execFileSync } from "node:child_process";

export const CONTROL_PATH = ".factory-wake/360-words-control.json";
export const DORMANT_NONCE = "DORMANT";

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
  return { dormant: false, stage: "writer1" };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const control = JSON.parse(fs.readFileSync(CONTROL_PATH, "utf8"));
  const changedPaths = execFileSync("git", ["diff-tree", "--no-commit-id", "--name-only", "-r", `${process.env.GITHUB_SHA}^`, process.env.GITHUB_SHA], { encoding: "utf8" }).trim().split(/\n/u).filter(Boolean);
  const result = validateControl(control, { changedPaths, actor: process.env.GITHUB_ACTOR, owner: process.env.GITHUB_REPOSITORY_OWNER });
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `dormant=${result.dormant}\nstage=${result.stage}\n`);
}
