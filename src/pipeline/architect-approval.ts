import { createPublicKey, verify, type KeyObject } from "node:crypto";
import { canonicalize } from "../contracts/digests.js";

/**
 * The public verification key is an Actions configuration value, not a
 * secret.  The matching private key is held by the external Architect and is
 * never present in this repository or in Actions.
 */
export const ARCHITECT_APPROVAL_KEY_ID = "architect-ed25519-v1" as const;
export const ARCHITECT_APPROVAL_PUBLIC_KEY_ENV = "ARCHITECT_APPROVAL_PUBLIC_KEY_PEM" as const;
export const ARCHITECT_APPROVAL_SCHEMA = "architect-stage-approval/v1" as const;
export const ARCHITECT_WRITER1_QA_SCHEMA = "architect-writer1-qa/v1" as const;

export type ArchitectQaRole = "content" | "evidence";

export function canonicalArchitectSigningPayload(value: Record<string, unknown>): string {
  const { signature: _signature, ...unsigned } = value;
  return JSON.stringify(canonicalize(unsigned));
}

function pinnedPublicKey(): KeyObject {
  const pem = process.env[ARCHITECT_APPROVAL_PUBLIC_KEY_ENV];
  if (!pem || pem.includes("PRIVATE KEY")) throw new Error("Architect Ed25519 public key is not configured");
  try { return createPublicKey(pem); } catch { throw new Error("Architect Ed25519 public key is invalid"); }
}

export function verifyArchitectEd25519(value: unknown, expectedKeyId = ARCHITECT_APPROVAL_KEY_ID): void {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Architect-signed document must be an object");
  const record = value as Record<string, unknown>;
  const author = record.author;
  if (!author || typeof author !== "object" || Array.isArray(author) || (author as Record<string, unknown>).kind !== "architect" || (author as Record<string, unknown>).keyId !== expectedKeyId) throw new Error("Architect Ed25519 author/keyId is invalid");
  if (typeof record.signature !== "string" || !/^ed25519:[A-Za-z0-9+/]+=*$/u.test(record.signature)) throw new Error("Architect Ed25519 signature is missing or malformed");
  const signature = Buffer.from(record.signature.slice("ed25519:".length), "base64");
  if (signature.length !== 64 || !verify(null, Buffer.from(canonicalArchitectSigningPayload(record), "utf8"), pinnedPublicKey(), signature)) throw new Error("Architect Ed25519 signature does not verify");
}

export function assertExactKeys(value: Record<string, unknown>, expected: readonly string[], label: string): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) throw new Error(`${label} has unexpected keys`);
}

export function assertSha256(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !/^sha256:[0-9a-f]{64}$/u.test(value)) throw new Error(`${label} must be a sha256 digest`);
}

export function assertArchitectQaPath(value: unknown, role: ArchitectQaRole): asserts value is string {
  const expected = `qa/architect/writer1-${role}.json`;
  if (value !== expected) throw new Error(`Architect Writer1 ${role} QA must use the exact external path ${expected}`);
}
