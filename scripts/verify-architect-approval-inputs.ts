import { createHash } from "node:crypto";
import { lstatSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as path from "node:path";

type Dict = Record<string, unknown>;

const QA_ROLES = ["content", "evidence"] as const;
const APPROVAL_PATH = "qa/architect/writer1-approval.json";

function fail(message: string): never {
  throw new Error(`verified Architect approval input is invalid: ${message}`);
}

function safeRelativePath(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.startsWith("/") || value.includes("\\") || value.split("/").some((part) => part === "" || part === "." || part === "..")) fail(`${label} is unsafe`);
}

function regularFile(root: string, relative: string, label: string): string {
  safeRelativePath(relative, label);
  const file = path.resolve(root, relative);
  const rootPath = path.resolve(root) + path.sep;
  if (!file.startsWith(rootPath)) fail(`${label} escapes its root`);
  let stat;
  try { stat = lstatSync(file); } catch { fail(`${label} is missing`); }
  if (!stat.isFile() || stat.isSymbolicLink()) fail(`${label} must be a regular non-symlink file`);
  return file;
}

function pinnedBytes(root: string, pin: Dict, label: string): Buffer {
  const relative = pin.path;
  const size = pin.size;
  const digest = pin.digest;
  if (typeof size !== "number" || !Number.isSafeInteger(size) || size <= 0 || typeof digest !== "string" || !/^sha256:[0-9a-f]{64}$/u.test(digest)) fail(`${label} pin is malformed`);
  safeRelativePath(relative, label);
  const bytes = readFileSync(regularFile(root, relative, label));
  const actual = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  if (bytes.length !== size || actual !== digest) fail(`${label} bytes do not match its control pin`);
  return bytes;
}

function copyPinnedBytes(bytes: Buffer, artifactRoot: string, relative: string, label: string): void {
  const destination = path.resolve(artifactRoot, relative);
  const rootPath = path.resolve(artifactRoot) + path.sep;
  if (!destination.startsWith(rootPath)) fail(`${label} destination escapes its artifact root`);
  try {
    const existing = lstatSync(destination);
    if (existing.isSymbolicLink() || !existing.isFile()) fail(`${label} destination is not a regular file`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, bytes);
  const copied = readFileSync(destination);
  if (copied.length !== bytes.length || !copied.equals(bytes)) fail(`${label} copy is not byte-identical`);
}

export function copyVerifiedArchitectApprovalInputs(sourceRoot: string, artifactRoot: string, control: Dict): void {
  const policy = control.policy;
  const recovery = policy && typeof policy === "object" && !Array.isArray(policy) ? (policy as Dict).recovery : undefined;
  if (!recovery || typeof recovery !== "object" || Array.isArray(recovery)) fail("approval recovery is missing");
  const qa = (recovery as Dict).independentQaArtifacts;
  if (!Array.isArray(qa) || qa.length !== QA_ROLES.length) fail("exactly two QA pins are required");
  const roles = new Set<string>();
  for (const role of QA_ROLES) {
    const pin = qa.find((item) => item && typeof item === "object" && !Array.isArray(item) && (item as Dict).role === role);
    if (!pin || typeof pin !== "object" || Array.isArray(pin)) fail(`${role} QA pin is missing`);
    const item = pin as Dict;
    const expectedPath = `qa/architect/writer1-${role}.json`;
    if (item.path !== expectedPath || item.decision !== "PASS" || roles.has(role)) fail(`${role} QA pin is not exact`);
    roles.add(role);
    copyPinnedBytes(pinnedBytes(sourceRoot, item, `${role} QA`), artifactRoot, expectedPath, `${role} QA`);
  }
  if (roles.size !== QA_ROLES.length) fail("QA roles are not unique");
  const approval = (recovery as Dict).approval;
  if (!approval || typeof approval !== "object" || Array.isArray(approval)) fail("approval pin is missing");
  const approvalPin = approval as Dict;
  if (approvalPin.path !== APPROVAL_PATH) fail("approval path is not exact");
  copyPinnedBytes(pinnedBytes(sourceRoot, approvalPin, "Writer1 approval"), artifactRoot, APPROVAL_PATH, "Writer1 approval");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sourceRoot = process.env.APPROVAL_SOURCE_ROOT || process.cwd();
  const artifactRoot = process.env.APPROVAL_ARTIFACT_ROOT;
  const controlPath = process.env.CONTROL_PATH || ".factory-wake/360-words-control.json";
  if (!artifactRoot) fail("APPROVAL_ARTIFACT_ROOT is required");
  const control = JSON.parse(readFileSync(path.resolve(sourceRoot, controlPath), "utf8")) as Dict;
  copyVerifiedArchitectApprovalInputs(sourceRoot, artifactRoot, control);
}
