import {
  APPROVED_PLAN_VERSION,
  PROPOSED_PRESCRIPTION_VERSION,
  RESEARCH_RECORD_VERSION,
  WRITER_CONTEXT_VERSION,
  type ApprovedDecisions,
  type EvidencePacket,
  type ProposedPrescription,
  type ProspectSeed,
  type RecommendationSet,
  type ResearchRecord,
  type WriterContext,
} from "../handoff/types.js";
import { evidenceFingerprint } from "./state.js";
import { writerContextFromApprovedPlan } from "../handoff/validate.js";
import { buildWritingPackage, type ContentBlock, type WritingPackage, type WritingPackagePage } from "../writing-package/index.js";
import type {
  FactoryAdapters,
  PrescriptionAdapter,
  ResearchAdapter,
  WriterAdapter,
} from "./types.js";
import type { PublicationReceipt } from "../publisher/types.js";

export const FIXTURE_DATE = "2026-09-14";

export const northlineSeed: ProspectSeed = {
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
  sourceNotes: "Synthetic technical fixture. Not a live prospect.",
};

function pagePlan(): ApprovedDecisions {
  return {
    businessScope: "Residential garage door repair and replacement in Lake County.",
    reservedHumanDecisions: ["Do not add a third service route without a new human approval."],
    pageJobs: [
      {
        pageId: "page-home",
        pageType: "homepage",
        route: "/home",
        job: "Orient a homeowner and send them to repair or replacement.",
        targetIntent: "local garage door service",
      },
      {
        pageId: "page-repair",
        pageType: "service",
        route: "/garage-door-repair",
        job: "Help a homeowner decide whether to request a repair visit.",
        targetIntent: "garage door repair",
      },
      {
        pageId: "page-replacement",
        pageType: "service",
        route: "/garage-door-replacement",
        job: "Help a homeowner compare replacement as a distinct job.",
        targetIntent: "garage door replacement",
      },
      {
        pageId: "page-contact",
        pageType: "contact",
        route: "/contact",
        job: "Give a ready visitor a clear way to call or request service.",
        targetIntent: "contact garage door service",
      },
      {
        pageId: "header-footer",
        pageType: "chrome",
        route: "/home",
        job: "Keep shared business chrome aligned with the approved routes.",
        targetIntent: "site navigation",
      },
      {
        pageId: "page-strategy",
        pageType: "strategy",
        route: "/",
        job: "Explain the finished site to the business owner.",
        targetIntent: "owner-facing strategy overview",
      },
    ],
    routeMap: [
      { pageId: "page-home", route: "/home", pageType: "homepage" },
      { pageId: "page-repair", route: "/garage-door-repair", pageType: "service" },
      { pageId: "page-replacement", route: "/garage-door-replacement", pageType: "service" },
      { pageId: "page-contact", route: "/contact", pageType: "contact" },
      { pageId: "header-footer", route: "/home", pageType: "chrome" },
      { pageId: "page-strategy", route: "/", pageType: "strategy" },
    ],
  };
}

export function northlineEvidence(): EvidencePacket {
  return {
    prospectId: northlineSeed.prospectId,
    business: northlineSeed.business,
    nap: northlineSeed.nap,
    facts: [
      {
        id: "fact-services",
        statement: "The company site names garage door repair and replacement as separate customer jobs.",
        status: "confirmed",
        sourceRefs: [{ kind: "site_evidence", refId: "site-services" }],
        capturedAt: FIXTURE_DATE,
      },
      {
        id: "fact-hours-inference",
        statement: "Same-week arrival might be typical, but hours were not published on the captured pages.",
        status: "inference",
        sourceRefs: [{ kind: "site_evidence", refId: "site-services" }],
        capturedAt: FIXTURE_DATE,
      },
    ],
    siteEvidence: [
      {
        id: "site-services",
        url: "https://northline.example/services",
        pageType: "service-listing",
        observation: "The page lists repair and replacement as separate needs.",
        capturedAt: FIXTURE_DATE,
        source: "synthetic company site fixture",
      },
      {
        id: "site-contact",
        url: "https://northline.example/contact",
        pageType: "contact",
        observation: "The page publishes the business phone number.",
        capturedAt: FIXTURE_DATE,
        source: "synthetic company site fixture",
      },
    ],
    imageRefs: [
      {
        id: "image-truck",
        url: "https://northline.example/images/truck.jpg",
        altText: "Service van in a driveway",
        source: "synthetic company site fixture",
        evidenceUse: "context image only; do not infer credentials from it",
      },
    ],
    reviews: [
      {
        id: "review-maya",
        reviewer: "Maya R.",
        exactText: "The technician explained the repair, arrived when promised, and left the area tidy.",
        rating: 5,
        date: "2026-07-01",
        provenance: {
          sourceType: "customer_review",
          sourceUrl: "https://reviews.example/northline/maya",
          capturedAt: FIXTURE_DATE,
          sourceLabel: "synthetic review fixture",
        },
        classification: "positive",
      },
      {
        id: "review-jon",
        reviewer: "Jon P.",
        exactText: "They replaced the worn opener and walked me through the new controls.",
        rating: 5,
        date: "2026-06-18",
        provenance: {
          sourceType: "customer_review",
          sourceUrl: "https://reviews.example/northline/jon",
          capturedAt: FIXTURE_DATE,
          sourceLabel: "synthetic review fixture",
        },
        classification: "positive",
      },
      {
        id: "review-unclassified",
        reviewer: "Ari K.",
        exactText: "The repair solved the noise, although the appointment window ran late.",
        provenance: {
          sourceType: "customer_review",
          sourceUrl: "https://reviews.example/northline/ari",
          capturedAt: FIXTURE_DATE,
          sourceLabel: "synthetic review fixture",
        },
      },
    ],
  };
}

export function northlineResearchRecommendations(): RecommendationSet {
  return {
    stage: "research",
    items: [
      {
        id: "rec-research-repair-proof",
        kind: "review_use",
        stance: "advisory",
        text: "You may consider emphasizing Maya R.'s visit account on the repair page.",
        reason: "It names explanation, arrival, and tidy work from a source-backed review.",
        sourceRefs: [{ kind: "review", refId: "review-maya" }],
        pageId: "page-repair",
        reviewId: "review-maya",
      },
      {
        id: "rec-research-split",
        kind: "observation",
        stance: "advisory",
        text: "One useful direction could be to keep repair and replacement as separate customer jobs.",
        reason: "Site evidence lists them separately.",
        sourceRefs: [{ kind: "site_evidence", refId: "site-services" }],
      },
    ],
  };
}

export function northlinePrescriptionRecommendations(): RecommendationSet {
  return {
    stage: "prescription",
    items: [
      {
        id: "rec-prescription-lead",
        kind: "review_use",
        stance: "advisory",
        text: "This review may support a lead proof on repair, but the writer may choose another source-backed account.",
        reason: "Maya R. is a clear repair visit; it is not a locked first-review decision.",
        sourceRefs: [{ kind: "review", refId: "review-maya" }],
        pageId: "page-repair",
        reviewId: "review-maya",
      },
      {
        id: "rec-prescription-unclassified",
        kind: "review_use",
        stance: "advisory",
        text: "You may consider Ari K.'s mixed repair note if a bounded noise-repair story would help; it remains available even without a finished classification.",
        reason: "Unfinished classification is not a reason to withhold the source text.",
        sourceRefs: [{ kind: "review", refId: "review-unclassified" }],
        reviewId: "review-unclassified",
      },
      {
        id: "rec-prescription-angle",
        kind: "angle",
        stance: "advisory",
        text: "You may consider opening replacement around controls and the worn opener rather than a generic new-door pitch.",
        reason: "Jon P. names that completed work.",
        sourceRefs: [{ kind: "review", refId: "review-jon" }],
        pageId: "page-replacement",
        reviewId: "review-jon",
      },
    ],
  };
}

export function northlineResearchRecord(): ResearchRecord {
  return {
    version: RESEARCH_RECORD_VERSION,
    prospectId: northlineSeed.prospectId,
    evidence: northlineEvidence(),
    recommendations: northlineResearchRecommendations(),
    researcher: { provider: "test", model: "fixture-researcher" },
    completedAt: FIXTURE_DATE,
  };
}

export function northlinePrescription(): ProposedPrescription {
  const research = northlineResearchRecord();
  return {
    version: PROPOSED_PRESCRIPTION_VERSION,
    prospectId: northlineSeed.prospectId,
    proposedPagePlan: pagePlan(),
    recommendations: northlinePrescriptionRecommendations(),
    rationale:
      "Two service jobs match the captured site: repair versus replacement. Contact stays lean. Strategy Overview remains owner-facing.",
    evidenceFingerprint: evidenceFingerprint(research.evidence),
    prescriber: { provider: "test", model: "fixture-prescriber" },
    completedAt: FIXTURE_DATE,
  };
}

export function northlineWriterContext(): WriterContext {
  return writerContextFromApprovedPlan({
    version: APPROVED_PLAN_VERSION,
    prospectId: northlineSeed.prospectId,
    approval: { status: "approved", approvedAt: FIXTURE_DATE, approvedBy: "fixture-human" },
    decisions: pagePlan(),
    researchRecommendations: northlineResearchRecommendations(),
    prescriptionRecommendations: northlinePrescriptionRecommendations(),
    evidence: northlineEvidence(),
  });
}

function heading(level: 1 | 2 | 3, text: string): ContentBlock {
  return { type: "heading", level, text };
}

function paragraph(text: string): ContentBlock {
  return { type: "paragraph", spans: [{ text }] };
}

function quote(text: string, attribution: string, reviewId: string): ContentBlock {
  return { type: "quote", spans: [{ text }], attribution, reviewId };
}

function page(
  input: Omit<WritingPackagePage, "blocks"> & { readonly blocks: readonly ContentBlock[] },
): WritingPackagePage {
  return input;
}

export function northlineWebsitePages(options?: {
  readonly useAriExcerpt?: boolean;
}): readonly WritingPackagePage[] {
  const repairQuote = options?.useAriExcerpt
    ? quote("The repair solved the noise", "Ari K.", "review-unclassified")
    : quote(
        "The technician explained the repair, arrived when promised, and left the area tidy.",
        "Maya R.",
        "review-maya",
      );

  return [
    page({
      pageId: "page-home",
      role: "homepage",
      audience: "business",
      route: "/home",
      readingOrder: 1,
      title: "Garage door help for the next practical step",
      seoTitle: "Garage door repair and replacement in Mason | Northline",
      metaDescription:
        "Northline Garage Doors helps Mason homeowners repair a door that still has life or replace one that is worn through.",
      blocks: [
        heading(1, "Garage door help for the next practical step"),
        heading(2, "Repair or replacement"),
        paragraph("Northline Garage Doors serves Lake County homeowners who need a door repaired or replaced."),
        { type: "paragraph", spans: [{ text: "Call " }, { text: "+1-555-010-1000", bold: true }, { text: "." }] },
      ],
    }),
    page({
      pageId: "page-repair",
      role: "service",
      audience: "business",
      route: "/garage-door-repair",
      readingOrder: 2,
      title: "Garage door repair when the door stops working",
      seoTitle: "Garage door repair in Mason | Northline Garage Doors",
      metaDescription:
        "When a Mason garage door stops working, Northline explains the problem and repairs it when the door still has useful life.",
      blocks: [
        heading(1, "Garage door repair when the door stops working"),
        heading(2, "What a repair visit is for"),
        paragraph("When the door still has life in it, a repair visit can explain the problem and get it moving again."),
        repairQuote,
      ],
    }),
    page({
      pageId: "page-replacement",
      role: "service",
      audience: "business",
      route: "/garage-door-replacement",
      readingOrder: 3,
      title: "Replacement when the opener and door are worn through",
      seoTitle: "Garage door replacement in Mason | Northline Garage Doors",
      metaDescription:
        "Northline replaces worn garage doors and openers in Mason when repair will not restore reliable daily use.",
      blocks: [
        heading(1, "Replacement when the opener and door are worn through"),
        heading(2, "A worn opener is a different job"),
        paragraph("Replacement is the path when repair will not restore reliable daily use."),
        quote(
          "They replaced the worn opener and walked me through the new controls.",
          "Jon P.",
          "review-jon",
        ),
      ],
    }),
    page({
      pageId: "page-contact",
      role: "contact",
      audience: "business",
      route: "/contact",
      readingOrder: 4,
      title: "Call Northline Garage Doors",
      seoTitle: "Call Northline Garage Doors in Mason",
      metaDescription: "Call Northline Garage Doors at +1-555-010-1000. Shop at 18 Harbor Avenue, Mason, IL 60000.",
      blocks: [
        heading(1, "Call Northline Garage Doors"),
        paragraph("Call +1-555-010-1000. 18 Harbor Avenue, Mason, IL 60000."),
      ],
    }),
    page({
      pageId: "header-footer",
      role: "header_footer",
      audience: "business",
      readingOrder: 5,
      title: "Header and footer",
      blocks: [
        heading(1, "Header and footer"),
        heading(2, "Header"),
        {
          type: "list",
          ordered: false,
          items: [
            { spans: [{ text: "Home", href: "/home" }] },
            { spans: [{ text: "Repair", href: "/garage-door-repair" }] },
            { spans: [{ text: "Replacement", href: "/garage-door-replacement" }] },
            { spans: [{ text: "Contact", href: "/contact" }] },
          ],
        },
        heading(2, "Footer"),
        paragraph("Northline Garage Doors · +1-555-010-1000 · 18 Harbor Avenue, Mason, IL 60000"),
      ],
    }),
    page({
      pageId: "page-strategy",
      role: "strategy_overview",
      audience: "owner",
      route: "/",
      readingOrder: 6,
      title: "Why this site uses two service jobs",
      blocks: [
        heading(1, "Why this site uses two service jobs"),
        heading(2, "What we built"),
        paragraph(
          "The public site keeps repair and replacement on separate routes because the captured company pages and customer accounts describe two jobs. This page is for the owner, not for customers.",
        ),
      ],
    }),
  ];
}

export function northlineWritingPackage(runId = "run-prospect-northline"): WritingPackage {
  return buildWritingPackage({
    kind: "website_copy",
    packageId: "website-copy-prospect-northline",
    prospectId: northlineSeed.prospectId,
    runId,
    businessName: northlineSeed.business.name,
    pages: northlineWebsitePages({ useAriExcerpt: true }),
  });
}

export interface FixtureWriterStats {
  writeCalls: number;
  researchCalls: number;
  prescribeCalls: number;
  writerRunIds: string[];
}

export function createFixtureAdapters(options?: {
  readonly publisher?: FactoryAdapters["publisher"];
  readonly writerStats?: FixtureWriterStats;
  readonly useAriExcerpt?: boolean;
}): FactoryAdapters & { stats: FixtureWriterStats } {
  const stats = options?.writerStats ?? { writeCalls: 0, researchCalls: 0, prescribeCalls: 0, writerRunIds: [] };
  const researcher: ResearchAdapter = {
    provider: "test",
    model: "fixture-researcher",
    async research() {
      stats.researchCalls += 1;
      return northlineResearchRecord();
    },
  };
  const prescriber: PrescriptionAdapter = {
    provider: "test",
    model: "fixture-prescriber",
    async prescribe() {
      stats.prescribeCalls += 1;
      return northlinePrescription();
    },
  };
  const writer: WriterAdapter = {
    provider: "test",
    model: "fixture-writer",
    async writeCompletePackage(assignment) {
      stats.writeCalls += 1;
      stats.writerRunIds.push(assignment.writerRunId);
      if (!assignment.writerRunId) {
        throw new Error("writer assignment must include a durable writerRunId");
      }
      if (assignment.internalOrder.length !== 3) {
        throw new Error("writer assignment must include the recommended internal order");
      }
      if (assignment.context.evidence.reviews.length < 3) {
        throw new Error("writer assignment must include the original review inventory");
      }
      if (
        !assignment.context.researchRecommendations.items.every((item) => item.stance === "advisory") ||
        !assignment.context.prescriptionRecommendations.items.every((item) => item.stance === "advisory")
      ) {
        throw new Error("writer assignment recommendations must remain advisory");
      }
      return buildWritingPackage({
        kind: "website_copy",
        packageId: `website-copy-${assignment.context.prospectId}`,
        prospectId: assignment.context.prospectId,
        runId: assignment.runId,
        businessName: assignment.context.evidence.business.name,
        pages: northlineWebsitePages({ useAriExcerpt: options?.useAriExcerpt ?? true }),
      });
    },
  };
  return options?.publisher
    ? { researcher, prescriber, writer, publisher: options.publisher, stats }
    : { researcher, prescriber, writer, stats };
}

export function publishedReceipt(pkg: WritingPackage): PublicationReceipt {
  const receipt: PublicationReceipt = {
    status: "published",
    kind: pkg.kind,
    prospectId: pkg.prospectId,
    runId: pkg.runId,
    packageIdentity: { packageId: pkg.packageId, packageHash: pkg.packageHash },
    url:
      pkg.kind === "prescription"
        ? "https://docs.google.com/document/d/fixture-northline-prescription"
        : "https://docs.google.com/document/d/fixture-northline",
    documentId: pkg.kind === "prescription" ? "fixture-northline-prescription" : "fixture-northline",
  };
  return receipt;
}

export { WRITER_CONTEXT_VERSION, pagePlan };
