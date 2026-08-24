import { createHash } from "node:crypto";
import type { ApprovedProspectHandoff, DestinationPlan, HandoffDigests, PageExpansionOverride } from "./types.js";

export function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(([, child]) => child !== undefined)
      .sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonicalize(child)]),
  );
  return value;
}
export function digestOf(value: unknown): string {
  return `sha256:${createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex")}`;
}
export function approvedPageSetPayload(destinations: DestinationPlan, expansionOverride?: PageExpansionOverride): unknown {
  return { homepage: destinations.homepage, servicePages: destinations.servicePages, contact: destinations.contact, expansionOverride };
}
export function expansionOverrideDigest(override: PageExpansionOverride): string {
  const { digest: _digest, ...unsigned } = override; return digestOf(unsigned);
}
export function computeHandoffDigests(input: ApprovedProspectHandoff | Record<string, any>): HandoffDigests {
  const sourceCheckpointDigest = digestOf(input.sourceCheckpoint);
  const prescriptionDigest = digestOf(input.prospect.destinations);
  const evidenceDigest = digestOf({
    confirmedFacts: input.prospect.confirmedFacts, siteEvidence: input.prospect.siteEvidence,
    imageRefs: input.prospect.imageRefs, reviewInventory: input.prospect.reviewInventory,
    serviceComparison: input.serviceComparison, reviewAnalysisFacts: input.reviewAnalysisFacts,
  });
  const approvedPageSetDigest = digestOf(approvedPageSetPayload(input.prospect.destinations, input.expansionOverride));
  const approvalDigest = digestOf(input.approval);
  const unsigned = { ...input, digests: { sourceCheckpointDigest, prescriptionDigest, evidenceDigest, approvedPageSetDigest, approvalDigest } };
  return { sourceCheckpointDigest, prescriptionDigest, evidenceDigest, approvedPageSetDigest, approvalDigest, handoffDigest: digestOf(unsigned) };
}
