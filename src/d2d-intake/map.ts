import type { Address, BusinessIdentity, Nap, ProspectSeed } from "../handoff/types.js";
import { D2D_SOURCE_KIND } from "../workflow/state.js";
import { D2dIntakeEnvelopeError } from "./errors.js";
import {
  D2D_FACTORY_INTAKE_VERSION,
  D2D_INTAKE_REASON_CODES,
  D2D_QUALIFICATION_CLASSIFICATIONS,
  type D2dIntakeBatch,
  type D2dIntakeReasonCode,
  type D2dProspectCandidate,
  type D2dSourceRef,
  type MappedD2dProspect,
} from "./types.js";

type AnyRecord = Record<string, unknown>;

const ISO_TIMESTAMP =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export interface HeldMapping {
  readonly status: "held";
  readonly reasonCode: D2dIntakeReasonCode;
  readonly reason: string;
  readonly d2dProspectId: string;
}

export type MapD2dResult =
  | { readonly status: "mapped"; readonly mapped: MappedD2dProspect }
  | HeldMapping;

export function parseD2dIntakeBatch(input: unknown): D2dIntakeBatch {
  if (!isRecord(input)) {
    throw new D2dIntakeEnvelopeError(D2D_INTAKE_REASON_CODES.INVALID_ENVELOPE, "D2D intake payload must be an object");
  }
  if (input.version !== D2D_FACTORY_INTAKE_VERSION) {
    throw new D2dIntakeEnvelopeError(
      D2D_INTAKE_REASON_CODES.UNSUPPORTED_VERSION,
      `version must be ${D2D_FACTORY_INTAKE_VERSION}`,
    );
  }
  const campaignId = requiredId(input.campaignId, D2D_INTAKE_REASON_CODES.MISSING_CAMPAIGN_ID, "campaignId");
  const campaignRunId = requiredId(
    input.campaignRunId,
    D2D_INTAKE_REASON_CODES.MISSING_CAMPAIGN_RUN_ID,
    "campaignRunId",
  );
  const exportId = requiredId(input.exportId, D2D_INTAKE_REASON_CODES.MISSING_EXPORT_ID, "exportId");
  const exportedAt = requiredTimestamp(input.exportedAt, "exportedAt");
  if (!Array.isArray(input.prospects)) {
    throw new D2dIntakeEnvelopeError(D2D_INTAKE_REASON_CODES.INVALID_ENVELOPE, "prospects must be an array");
  }
  if (input.prospects.length === 0) {
    throw new D2dIntakeEnvelopeError(D2D_INTAKE_REASON_CODES.EMPTY_BATCH, "prospects must contain at least one candidate");
  }
  return {
    version: D2D_FACTORY_INTAKE_VERSION,
    campaignId,
    campaignRunId,
    exportId,
    exportedAt,
    prospects: input.prospects as D2dProspectCandidate[],
  };
}

export function mapD2dProspectToSeed(
  candidate: unknown,
  envelope: Pick<D2dIntakeBatch, "campaignId" | "campaignRunId" | "exportId" | "exportedAt" | "version">,
): MapD2dResult {
  if (!isRecord(candidate)) {
    return held("", D2D_INTAKE_REASON_CODES.MALFORMED_PROSPECT, "Prospect entry must be an object");
  }
  const d2dProspectId = optionalTrimmed(candidate.d2dProspectId);
  if (!d2dProspectId) {
    return held("", D2D_INTAKE_REASON_CODES.MISSING_D2D_PROSPECT_ID, "d2dProspectId is required");
  }

  const qualification = isRecord(candidate.qualification) ? candidate.qualification : null;
  if (!qualification) {
    return held(d2dProspectId, D2D_INTAKE_REASON_CODES.MISSING_QUALIFICATION, "qualification is required");
  }
  const classification = optionalTrimmed(qualification.classification);
  const qualificationReason = optionalTrimmed(qualification.reason);
  if (!classification || !qualificationReason) {
    return held(d2dProspectId, D2D_INTAKE_REASON_CODES.MISSING_QUALIFICATION, "qualification.classification and reason are required");
  }
  if (classification !== D2D_QUALIFICATION_CLASSIFICATIONS.QUALIFIED) {
    return held(
      d2dProspectId,
      D2D_INTAKE_REASON_CODES.NOT_QUALIFIED,
      `Upstream classification is ${classification}; only qualified prospects may start a factory run`,
    );
  }
  if (!Array.isArray(qualification.evidenceRefs)) {
    return held(d2dProspectId, D2D_INTAKE_REASON_CODES.MISSING_QUALIFICATION, "qualification.evidenceRefs must be an array");
  }

  const provenance = isRecord(candidate.provenance) ? candidate.provenance : null;
  if (!provenance || !Array.isArray(provenance.sourceRefs) || provenance.sourceRefs.length === 0) {
    return held(
      d2dProspectId,
      D2D_INTAKE_REASON_CODES.MISSING_PROVENANCE,
      "provenance.sourceRefs must include at least one evidence reference",
    );
  }
  const sourceRefs: D2dSourceRef[] = [];
  for (const raw of provenance.sourceRefs) {
    if (!isRecord(raw)) {
      return held(d2dProspectId, D2D_INTAKE_REASON_CODES.MISSING_PROVENANCE, "provenance.sourceRefs entries must be objects");
    }
    const kind = optionalTrimmed(raw.kind);
    const refId = optionalTrimmed(raw.refId);
    if (!kind || !refId) {
      return held(d2dProspectId, D2D_INTAKE_REASON_CODES.MISSING_PROVENANCE, "provenance.sourceRefs require kind and refId");
    }
    const url = optionalTrimmed(raw.url);
    const label = optionalTrimmed(raw.label);
    sourceRefs.push({
      kind,
      refId,
      ...(url ? { url } : {}),
      ...(label ? { label } : {}),
    });
  }

  if (candidate.createdAt !== undefined && !isIsoTimestamp(candidate.createdAt)) {
    return held(d2dProspectId, D2D_INTAKE_REASON_CODES.INVALID_TIMESTAMP, "createdAt must be an ISO-8601 timestamp");
  }

  const businessRaw = isRecord(candidate.business) ? candidate.business : {};
  const name = optionalTrimmed(businessRaw.name);
  const trade = optionalTrimmed(businessRaw.trade);
  const serviceArea = optionalTrimmed(businessRaw.serviceArea);
  if (!name) return held(d2dProspectId, D2D_INTAKE_REASON_CODES.MISSING_BUSINESS_NAME, "business.name is required; it was not invented");
  if (!trade) return held(d2dProspectId, D2D_INTAKE_REASON_CODES.MISSING_TRADE, "business.trade is required; it was not invented");
  if (!serviceArea) {
    return held(
      d2dProspectId,
      D2D_INTAKE_REASON_CODES.MISSING_SERVICE_AREA,
      "business.serviceArea is required; it was not invented",
    );
  }
  const legalName = optionalTrimmed(businessRaw.legalName);
  const business: BusinessIdentity = {
    name,
    trade,
    serviceArea,
    ...(legalName ? { legalName } : {}),
  };

  const napRaw = isRecord(candidate.nap) ? candidate.nap : {};
  const napName = optionalTrimmed(napRaw.name);
  if (!napName) return held(d2dProspectId, D2D_INTAKE_REASON_CODES.MISSING_NAP_NAME, "nap.name is required; it was not invented");
  const addressRaw = isRecord(napRaw.address) ? napRaw.address : {};
  const street = optionalTrimmed(addressRaw.street);
  const city = optionalTrimmed(addressRaw.city);
  const region = optionalTrimmed(addressRaw.region);
  const postalCode = optionalTrimmed(addressRaw.postalCode);
  const country = optionalTrimmed(addressRaw.country);
  if (!street) return held(d2dProspectId, D2D_INTAKE_REASON_CODES.MISSING_ADDRESS_STREET, "nap.address.street is required; it was not invented");
  if (!city) return held(d2dProspectId, D2D_INTAKE_REASON_CODES.MISSING_ADDRESS_CITY, "nap.address.city is required; it was not invented");
  if (!region) return held(d2dProspectId, D2D_INTAKE_REASON_CODES.MISSING_ADDRESS_REGION, "nap.address.region is required; it was not invented");
  if (!postalCode) {
    return held(
      d2dProspectId,
      D2D_INTAKE_REASON_CODES.MISSING_ADDRESS_POSTAL_CODE,
      "nap.address.postalCode is required; it was not invented",
    );
  }
  if (!country) {
    return held(d2dProspectId, D2D_INTAKE_REASON_CODES.MISSING_ADDRESS_COUNTRY, "nap.address.country is required; it was not invented");
  }
  const phone = optionalTrimmed(napRaw.phone);
  if (!phone) return held(d2dProspectId, D2D_INTAKE_REASON_CODES.MISSING_PHONE, "nap.phone is required; it was not invented");
  const website = optionalTrimmed(napRaw.website);
  if (!website) return held(d2dProspectId, D2D_INTAKE_REASON_CODES.MISSING_WEBSITE, "nap.website is required; it was not invented");
  if (!isHttpUrl(website)) {
    return held(d2dProspectId, D2D_INTAKE_REASON_CODES.INVALID_WEBSITE, "nap.website must be an absolute http(s) URL; it was not invented");
  }

  const address: Address = { street, city, region, postalCode, country };
  const nap: Nap = { name: napName, address, phone, website };
  const upstreamNotes = optionalTrimmed(provenance.sourceNotes);
  const sourceNotes = composeD2dSourceNotes({
    version: envelope.version,
    d2dProspectId,
    campaignId: envelope.campaignId,
    campaignRunId: envelope.campaignRunId,
    exportId: envelope.exportId,
    exportedAt: envelope.exportedAt,
    qualificationClassification: classification,
    qualificationReason,
    sourceRefs,
    ...(upstreamNotes ? { upstreamNotes } : {}),
  });

  const seed: ProspectSeed = {
    prospectId: d2dProspectId,
    business,
    nap,
    sourceNotes,
  };

  return {
    status: "mapped",
    mapped: {
      seed,
      business,
      nap,
      correlation: {
        kind: D2D_SOURCE_KIND,
        d2dProspectId,
        campaignId: envelope.campaignId,
        campaignRunId: envelope.campaignRunId,
        exportId: envelope.exportId,
        exportedAt: envelope.exportedAt,
        qualificationClassification: classification,
        qualificationReason,
      },
    },
  };
}

export function composeD2dSourceNotes(input: {
  readonly version: string;
  readonly d2dProspectId: string;
  readonly campaignId: string;
  readonly campaignRunId: string;
  readonly exportId: string;
  readonly exportedAt: string;
  readonly qualificationClassification: string;
  readonly qualificationReason: string;
  readonly sourceRefs: readonly D2dSourceRef[];
  readonly upstreamNotes?: string;
}): string {
  const refs = input.sourceRefs
    .map((ref) => {
      const url = ref.url ? `<${ref.url}>` : "";
      const label = ref.label ? `(${ref.label})` : "";
      return `${ref.kind}:${ref.refId}${label}${url}`;
    })
    .join(", ");
  const parts = [
    `D2D intake ${input.version}.`,
    `d2dProspectId=${input.d2dProspectId};`,
    `campaignId=${input.campaignId};`,
    `campaignRunId=${input.campaignRunId};`,
    `exportId=${input.exportId};`,
    `exportedAt=${input.exportedAt};`,
    `qualification=${input.qualificationClassification}: ${input.qualificationReason};`,
    `sourceRefs=${refs}.`,
  ];
  if (input.upstreamNotes) {
    parts.push(`upstreamNotes=${input.upstreamNotes}`);
  }
  return parts.join(" ");
}

function held(d2dProspectId: string, reasonCode: D2dIntakeReasonCode, reason: string): HeldMapping {
  return { status: "held", d2dProspectId, reasonCode, reason };
}

function requiredId(value: unknown, code: D2dIntakeReasonCode, field: string): string {
  const trimmed = optionalTrimmed(value);
  if (!trimmed) {
    throw new D2dIntakeEnvelopeError(code, `${field} is required`);
  }
  return trimmed;
}

function requiredTimestamp(value: unknown, field: string): string {
  if (!isIsoTimestamp(value)) {
    throw new D2dIntakeEnvelopeError(D2D_INTAKE_REASON_CODES.INVALID_TIMESTAMP, `${field} must be an ISO-8601 timestamp`);
  }
  return value as string;
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_TIMESTAMP.test(value)) return false;
  return Number.isFinite(Date.parse(value));
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function optionalTrimmed(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
