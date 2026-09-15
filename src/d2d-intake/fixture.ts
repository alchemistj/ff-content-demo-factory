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
import {
  D2D_FACTORY_INTAKE_VERSION,
  type D2dIntakeBatch,
  type D2dProspectCandidate,
} from "./types.js";

export const INTAKE_NOW = new Date("2026-09-15T18:00:00.000Z");

export const EXPECTED_NORTHLINE_SOURCE_NOTES =
  "D2D intake d2d-factory-intake/v1. d2dProspectId=prospect-northline; campaignId=campaign-lake-county; campaignRunId=campaign-run-2026-09-15; exportId=export-2026-09-15-northline; exportedAt=2026-09-15T17:00:00.000Z; qualification=qualified: Complete NAP and service-area evidence from the Google Business listing.; sourceRefs=google_business:place-northline(Google Business Profile)<https://maps.example/northline>. upstreamNotes=Qualified by D2D geographic campaign; not a raw scrape dump.";

export const NORTHLINE_D2D_CANDIDATE: D2dProspectCandidate = {
  d2dProspectId: "prospect-northline",
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
  qualification: {
    classification: "qualified",
    reason: "Complete NAP and service-area evidence from the Google Business listing.",
    evidenceRefs: [
      { kind: "google_business", refId: "place-northline", url: "https://maps.example/northline" },
    ],
  },
  provenance: {
    sourceRefs: [
      {
        kind: "google_business",
        refId: "place-northline",
        url: "https://maps.example/northline",
        label: "Google Business Profile",
      },
    ],
    sourceNotes: "Qualified by D2D geographic campaign; not a raw scrape dump.",
  },
  createdAt: "2026-09-15T16:30:00.000Z",
};

export const EXPECTED_NORTHLINE_SEED: ProspectSeed = {
  prospectId: "prospect-northline",
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
  readonly prospects?: readonly D2dProspectCandidate[];
}): D2dIntakeBatch {
  return {
    version: D2D_FACTORY_INTAKE_VERSION,
    campaignId: "campaign-lake-county",
    campaignRunId: "campaign-run-2026-09-15",
    exportId: overrides?.exportId ?? "export-2026-09-15-northline",
    exportedAt: "2026-09-15T17:00:00.000Z",
    prospects: overrides?.prospects ?? [NORTHLINE_D2D_CANDIDATE],
  };
}

export function candidateWith(
  overrides: Partial<D2dProspectCandidate> & {
    readonly d2dProspectId?: string;
    readonly business?: D2dProspectCandidate["business"];
    readonly nap?: D2dProspectCandidate["nap"];
  },
): D2dProspectCandidate {
  return {
    ...NORTHLINE_D2D_CANDIDATE,
    ...overrides,
    business: { ...NORTHLINE_D2D_CANDIDATE.business, ...overrides.business },
    nap: {
      ...NORTHLINE_D2D_CANDIDATE.nap,
      ...overrides.nap,
      address: {
        ...NORTHLINE_D2D_CANDIDATE.nap.address!,
        ...overrides.nap?.address,
      },
    },
  };
}

export interface IntakeAdapterStats extends FixtureWriterStats {
  publishKinds: string[];
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
