import type { ProposedPrescription, ResearchRecord } from "../handoff/types.js";
import { buildWritingPackage } from "./validate.js";
import type { ContentBlock, WritingPackage, WritingPackagePage } from "./types.js";

function heading(level: 1 | 2 | 3, text: string): ContentBlock {
  return { type: "heading", level, text };
}

function paragraph(text: string): ContentBlock {
  return { type: "paragraph", spans: [{ text }] };
}

function bullets(items: readonly string[]): ContentBlock {
  return {
    type: "list",
    ordered: false,
    items: items.map((text) => ({ spans: [{ text }] })),
  };
}

/**
 * Human-review package for the existing prescription gate.
 * Decisions to approve, evidence for context, and advisory recommendations
 * are separate pages so approval of the plan does not look like approval of suggestions.
 */
export function buildPrescriptionReviewPackage(input: {
  readonly research: ResearchRecord;
  readonly prescription: ProposedPrescription;
  readonly runId: string;
}): WritingPackage {
  const { research, prescription, runId } = input;
  const plan = prescription.proposedPagePlan;
  const decisions: WritingPackagePage = {
    pageId: "prescription-decisions",
    role: "prescription",
    audience: "owner",
    readingOrder: 1,
    title: "Proposed page plan — for approval",
    blocks: [
      heading(1, "Proposed page plan — for approval"),
      paragraph(
        "These are the decisions to approve or send back: page jobs, routes, target intents, business scope, and reserved human decisions. Approving this plan does not lock the advisory recommendations on later pages.",
      ),
      heading(2, "Business scope"),
      paragraph(plan.businessScope),
      heading(2, "Page jobs and routes"),
      bullets(
        plan.pageJobs.map(
          (job) => `${job.pageId} (${job.pageType}) ${job.route} — ${job.job} / ${job.targetIntent}`,
        ),
      ),
      heading(2, "Reserved human decisions"),
      plan.reservedHumanDecisions.length
        ? bullets(plan.reservedHumanDecisions)
        : paragraph("None reserved beyond this page plan."),
      heading(2, "Prescriber rationale"),
      paragraph(prescription.rationale),
    ],
  };

  const evidence: WritingPackagePage = {
    pageId: "prescription-evidence",
    role: "prescription",
    audience: "owner",
    readingOrder: 2,
    title: "Evidence for context — not for approval",
    blocks: [
      heading(1, "Evidence for context — not for approval"),
      paragraph(
        "Original source material for the reviewer. This page is context. It is not a list of copy decisions.",
      ),
      heading(2, "Confirmed facts"),
      bullets(
        research.evidence.facts
          .filter((fact) => fact.status === "confirmed")
          .map((fact) => `${fact.id}: ${fact.statement}`),
      ),
      heading(2, "Inferences (not confirmed facts)"),
      research.evidence.facts.some((fact) => fact.status === "inference")
        ? bullets(
            research.evidence.facts
              .filter((fact) => fact.status === "inference")
              .map((fact) => `${fact.id}: ${fact.statement}`),
          )
        : paragraph("None recorded."),
      heading(2, "Reviews in the inventory"),
      bullets(
        research.evidence.reviews.map(
          (review) => `${review.id} — ${review.reviewer}${review.classification ? ` (${review.classification})` : " (unclassified)"}`,
        ),
      ),
    ],
  };

  const recommendations: WritingPackagePage = {
    pageId: "prescription-recommendations",
    role: "prescription",
    audience: "owner",
    readingOrder: 3,
    title: "Recommendations to consider — advisory, not approvals",
    blocks: [
      heading(1, "Recommendations to consider — advisory, not approvals"),
      paragraph(
        "These ideas may be adopted, improved, combined, or set aside. They are not part of the page-plan approval.",
      ),
      heading(2, "From research"),
      bullets(research.recommendations.items.map((item) => `${item.text} (${item.reason})`)),
      heading(2, "From prescription"),
      bullets(prescription.recommendations.items.map((item) => `${item.text} (${item.reason})`)),
    ],
  };

  return buildWritingPackage({
    kind: "prescription",
    packageId: `prescription-${research.prospectId}`,
    prospectId: research.prospectId,
    runId,
    businessName: research.evidence.business.name,
    pages: [decisions, evidence, recommendations],
  });
}
