import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ProspectSeed } from "../handoff/types.js";
import {
  northlinePrescription,
  northlineResearchRecord,
  type FixtureWriterStats,
} from "../workflow/northline.fixture.js";
import { evidenceFingerprint } from "../workflow/state.js";
import type { FactoryAdapters, PrescriptionAdapter, ResearchAdapter, WriterAdapter } from "../workflow/types.js";
import type { GoogleDocsPublisher } from "../publisher/types.js";
import type { WritingPackage } from "../writing-package/types.js";
import { createFactoryQualifier, type QualificationAdapter } from "../factory/qualify.js";
import { composeRawSourceNotes, factoryProspectId } from "./map.js";
import { normalizeRawBusiness } from "./normalize.js";
import {
  D2D_FACTORY_INTAKE_VERSION,
  type D2dCampaignContext,
  type D2dIntakeBatch,
  type D2dRawBusiness,
} from "./types.js";

export const INTAKE_NOW = new Date("2026-09-15T18:00:00.000Z");

const FIXTURE_DIR = dirname(fileURLToPath(import.meta.url));

export interface D2dGoldenContractFixture {
  readonly notes?: string;
  readonly request: Record<string, unknown>;
  readonly expectedReceipt: {
    readonly version: string;
    readonly campaignId: string;
    readonly campaignRunId: string;
    readonly exportId: string;
    readonly receipts: ReadonlyArray<Record<string, unknown>>;
  };
}

export function loadD2dFactoryIntakeV1Golden(): D2dGoldenContractFixture {
  return JSON.parse(readFileSync(join(FIXTURE_DIR, "fixtures/d2d-factory-intake-v1.json"), "utf8")) as D2dGoldenContractFixture;
}

export const NORTHLINE_EXPORT_ID = "export-2026-09-15-northline";
export const NORTHLINE_CORRELATION_ID = "src-northline::export-2026-09-15-northline::d2d-factory-intake/v1";
export const SPARSE_CORRELATION_ID = "src-sparse::export-2026-09-15-northline::d2d-factory-intake/v1";

export const NORTHLINE_CAMPAIGN: D2dCampaignContext = {
  location: "Lake County",
  radiusMiles: 5,
  radiusMeters: 8047,
  center: { lat: 41.9, lng: -87.8 },
  search: { query: "garage door", searchStrings: ["garage door repair"] },
};

export const NORTHLINE_RAW: D2dRawBusiness = {
  d2dProspectId: "d2d-prospect-northline",
  sourceBusinessId: "src-northline",
  campaignBusinessId: "campaign-biz-northline",
  d2dBusinessId: "src-northline",
  correlationId: "src-northline::export-2026-09-15-northline::d2d-factory-intake/v1",
  name: "Northline Garage Doors",
  category: "garage door service",
  categories: ["garage door service"],
  address: {
    street: "18 Harbor Avenue",
    city: "Mason",
    region: "IL",
    postalCode: "60000",
    country: "US",
  },
  location: "Lake County",
  phone: "+1-555-010-1000",
  website: "https://northline.example/",
  rating: 4.8,
  reviewCount: 42,
  placeId: "ChIJ-northline",
  mapsUrl: "https://maps.example/northline",
  googleUrl: "https://maps.google.com/?cid=northline",
  coordinates: { lat: 41.901, lng: -87.812 },
  apify: {
    provider: "apify",
    actor: "compass~crawler-google-places",
    runId: "apify-run-northline",
    datasetId: "ds-northline",
    itemId: "item-northline",
  },
};

export const SEEDABLE_HVAC_RAW: D2dRawBusiness = {
  d2dProspectId: "d2d-prospect-harbor-hvac",
  sourceBusinessId: "src-harbor-hvac",
  campaignBusinessId: "campaign-biz-harbor-hvac",
  d2dBusinessId: "src-harbor-hvac",
  correlationId: "src-harbor-hvac::export-2026-09-15-northline::d2d-factory-intake/v1",
  name: "Harbor Climate HVAC",
  category: "hvac contractor",
  categories: ["hvac contractor", "heating and cooling"],
  address: {
    street: "40 Industrial Park",
    city: "Mason",
    region: "IL",
    postalCode: "60000",
    country: "US",
  },
  location: "Lake County",
  phone: "+1-555-010-2000",
  website: "https://harbor-hvac.example/",
  rating: 4.9,
  reviewCount: 180,
  placeId: "ChIJ-harbor-hvac",
  mapsUrl: "https://maps.example/harbor-hvac",
  coordinates: { lat: 41.902, lng: -87.81 },
  apify: {
    provider: "apify",
    actor: "compass~crawler-google-places",
    runId: "apify-run-northline",
    datasetId: "ds-northline",
    itemId: "item-harbor-hvac",
  },
};

export const EXPECTED_NORTHLINE_SOURCE_NOTES = composeRawSourceNotes(
  normalizeRawBusiness(NORTHLINE_RAW).status === "normalized"
    ? (normalizeRawBusiness(NORTHLINE_RAW) as { status: "normalized"; record: import("./types.js").NormalizedRawBusiness })
        .record
    : ({} as import("./types.js").NormalizedRawBusiness),
  {
    campaignId: "campaign-lake-county",
    campaignRunId: "campaign-run-2026-09-15",
    exportId: "export-2026-09-15-northline",
    exportedAt: "2026-09-15T17:00:00.000Z",
    campaign: NORTHLINE_CAMPAIGN,
  },
);

export const EXPECTED_NORTHLINE_SEED: ProspectSeed = {
  prospectId: factoryProspectId(
    (normalizeRawBusiness(NORTHLINE_RAW) as { status: "normalized"; record: import("./types.js").NormalizedRawBusiness })
      .record,
  ),
  business: {
    name: "Northline Garage Doors",
    trade: "garage door service",
    serviceArea: "Lake County",
  },
  nap: {
    name: "Northline Garage Doors",
    address: {
      street: "18 Harbor Avenue",
      city: "Mason",
      region: "IL",
      postalCode: "60000",
      country: "US",
    },
    phone: "+1-555-010-1000",
    website: "https://northline.example/",
  },
  sourceNotes: EXPECTED_NORTHLINE_SOURCE_NOTES,
};

export function northlineBatch(overrides?: {
  readonly exportId?: string;
  readonly businesses?: readonly unknown[];
}): D2dIntakeBatch {
  return {
    version: D2D_FACTORY_INTAKE_VERSION,
    campaignId: "campaign-lake-county",
    campaignRunId: "campaign-run-2026-09-15",
    exportId: overrides?.exportId ?? "export-2026-09-15-northline",
    exportedAt: "2026-09-15T17:00:00.000Z",
    campaign: NORTHLINE_CAMPAIGN,
    provenance: {
      provider: "apify",
      actor: "compass~crawler-google-places",
      runId: "apify-run-northline",
      datasetId: "ds-northline",
    },
    businesses: overrides?.businesses ?? [NORTHLINE_RAW],
  };
}

export function rawWith(overrides: Partial<D2dRawBusiness> & Record<string, unknown>): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...NORTHLINE_RAW, ...overrides };
  if (Object.prototype.hasOwnProperty.call(overrides, "sourceBusinessId") && !Object.prototype.hasOwnProperty.call(overrides, "d2dBusinessId")) {
    merged.d2dBusinessId = overrides.sourceBusinessId;
  }
  if (
    Object.prototype.hasOwnProperty.call(overrides, "sourceBusinessId") &&
    !Object.prototype.hasOwnProperty.call(overrides, "correlationId")
  ) {
    const sourceBusinessId = overrides.sourceBusinessId;
    merged.correlationId =
      typeof sourceBusinessId === "string" && sourceBusinessId
        ? `${sourceBusinessId}::${NORTHLINE_EXPORT_ID}::${D2D_FACTORY_INTAKE_VERSION}`
        : "";
  }
  return merged;
}

export interface IntakeAdapterStats extends FixtureWriterStats {
  publishKinds: string[];
  qualifyCalls: number;
}

export function countingQualifier(inner: QualificationAdapter = createFactoryQualifier()): QualificationAdapter & {
  calls: number;
} {
  const wrapped = {
    provider: inner.provider,
    model: inner.model,
    calls: 0,
    async qualify(assignment: Parameters<QualificationAdapter["qualify"]>[0]) {
      wrapped.calls += 1;
      return inner.qualify(assignment);
    },
  };
  return wrapped;
}

export function createIntakeAdapters(options?: {
  readonly prescribeErrorOnce?: { throws: number };
  readonly publisher?: GoogleDocsPublisher;
}): FactoryAdapters & { stats: IntakeAdapterStats } {
  const stats: IntakeAdapterStats = {
    writeCalls: 0,
    researchCalls: 0,
    prescribeCalls: 0,
    writerRunIds: [],
    publishKinds: [],
    qualifyCalls: 0,
  };
  let remainingPrescribeFailures = options?.prescribeErrorOnce?.throws ?? 0;
  const researcher: ResearchAdapter = {
    provider: "test",
    model: "fixture-researcher",
    async research(assignment) {
      stats.researchCalls += 1;
      const base = northlineResearchRecord();
      return {
        ...base,
        prospectId: assignment.seed.prospectId,
        evidence: {
          ...base.evidence,
          prospectId: assignment.seed.prospectId,
          business: assignment.seed.business,
          nap: assignment.seed.nap,
        },
      };
    },
  };
  const prescriber: PrescriptionAdapter = {
    provider: "test",
    model: "fixture-prescriber",
    async prescribe(assignment) {
      stats.prescribeCalls += 1;
      if (remainingPrescribeFailures > 0) {
        remainingPrescribeFailures -= 1;
        throw new Error("transient prescription downstream failure");
      }
      const base = northlinePrescription();
      return {
        ...base,
        prospectId: assignment.research.prospectId,
        evidenceFingerprint: evidenceFingerprint(assignment.research.evidence),
      };
    },
  };
  const writer: WriterAdapter = {
    provider: "test",
    model: "fixture-writer",
    async writeCompletePackage(assignment) {
      stats.writeCalls += 1;
      stats.writerRunIds.push(assignment.writerRunId);
      throw new Error("writer must not run before Human Gate 1");
    },
  };
  const publisher: GoogleDocsPublisher = options?.publisher ?? {
    async publishReviewPackage(pkg: WritingPackage) {
      stats.publishKinds.push(pkg.kind);
      return {
        status: "setup-required",
        kind: pkg.kind,
        prospectId: pkg.prospectId,
        runId: pkg.runId,
        packageIdentity: { packageId: pkg.packageId, packageHash: pkg.packageHash },
        error: { code: "GOOGLE_PUBLISHER_UNCONFIGURED", message: "test unconfigured" },
      };
    },
  };
  return { researcher, prescriber, writer, publisher, stats };
}
