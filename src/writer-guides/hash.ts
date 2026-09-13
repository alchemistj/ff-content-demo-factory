import { createHash } from "node:crypto";
import type { GuideId } from "./catalog.js";

export function sha256Hex(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export interface ManifestMember {
  readonly id: GuideId;
  readonly relativePath: string;
  readonly sha256: string;
}

/**
 * Canonical newline-terminated records, sorted by guide id:
 *   id<TAB>relativePath<TAB>sha256
 */
export function canonicalizeManifest(members: readonly ManifestMember[]): string {
  return [...members]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((member) => `${member.id}\t${member.relativePath}\t${member.sha256}`)
    .join("\n")
    .concat("\n");
}

export function manifestHash(members: readonly ManifestMember[]): string {
  return sha256Hex(canonicalizeManifest(members));
}

export function stageSetHash(stage: string, members: readonly ManifestMember[]): string {
  return sha256Hex(`${stage}\n${canonicalizeManifest(members)}`);
}
