import fs from "node:fs";
import path from "node:path";
import { createHash, createPublicKey } from "node:crypto";

export const ARCHITECT_APPROVAL_PUBLIC_KEY_PATH = "qa/architect/architect-ed25519-v1-public.pem";
export const ARCHITECT_APPROVAL_PUBLIC_KEY_SHA256 = "b0c4c57d7f905c215b6f8555d8abca81f7ea034319bc665dc920b50546b6e0f9";

function reject(message) {
  throw new Error(`Pinned Architect public key is invalid: ${message}`);
}

export function validatePinnedArchitectPublicKeyBytes(bytes) {
  if (!Buffer.isBuffer(bytes)) reject("bytes are required");
  const pem = bytes.toString("utf8");
  if (pem.includes("PRIVATE KEY")) reject("private-key material is forbidden");
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== ARCHITECT_APPROVAL_PUBLIC_KEY_SHA256) reject("digest does not match the committed key");
  let key;
  try { key = createPublicKey(pem); } catch { reject("PEM is not a public key"); }
  if (key.asymmetricKeyType !== "ed25519") reject("key type is not Ed25519");
  return pem;
}

export function loadPinnedArchitectPublicKey(root = process.cwd()) {
  const file = path.resolve(root, ARCHITECT_APPROVAL_PUBLIC_KEY_PATH);
  let stat;
  try { stat = fs.lstatSync(file); } catch { reject("file is missing"); }
  if (!stat.isFile() || stat.isSymbolicLink()) reject("file must be a regular non-symlink file");
  return validatePinnedArchitectPublicKeyBytes(fs.readFileSync(file));
}

if (import.meta.url === `file://${process.argv[1]}`) process.stdout.write(loadPinnedArchitectPublicKey());
