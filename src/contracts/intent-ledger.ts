import type { ServiceComparison, ServiceComparisonStatus } from "./types.js";

export interface IntentLedgerEntry {
  id: string;
  name: string;
  status: ServiceComparisonStatus;
  foldInto?: string;
  aliases: readonly string[];
  publicRouteAllowed: boolean;
  supportingEvidenceAllowed: boolean;
  canonicalKey: string;
}

export function normalizeServiceComparisonKey(value: string): string {
  return value.toLowerCase().replace(/\([^)]*\)/gu, "").replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
}

/** One canonical ledger separates public topology intent from supporting evidence intent. */
export function buildIntentLedger(comparison: readonly ServiceComparison[]): readonly IntentLedgerEntry[] {
  return comparison.map((entry) => ({
    id: entry.id,
    name: entry.name,
    status: entry.status,
    ...(entry.foldInto ? { foldInto: entry.foldInto } : {}),
    aliases: entry.aliases || [],
    publicRouteAllowed: entry.status === "prescribed",
    supportingEvidenceAllowed: entry.status !== "prescribed" && entry.status !== "excluded",
    canonicalKey: normalizeServiceComparisonKey(entry.name),
  }));
}
