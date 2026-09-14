import assert from "node:assert/strict";
import test from "node:test";
import {
  HandoffValidationError,
  parseProposedPrescription,
  parseResearchRecord,
  parseWriterContext,
  unclassifiedReviewsRemainAvailable,
  writerContextFromApprovedPlan,
} from "./index.js";
import { APPROVED_PLAN_VERSION } from "./types.js";
import {
  northlinePrescription,
  northlineResearchRecord,
  northlineWriterContext,
} from "../workflow/northline.fixture.js";

test("research record keeps confirmed vs inference and the full review inventory", () => {
  const record = parseResearchRecord(northlineResearchRecord());
  assert.equal(record.evidence.facts.filter((fact) => fact.status === "confirmed").length, 1);
  assert.equal(record.evidence.facts.filter((fact) => fact.status === "inference").length, 1);
  assert.equal(record.evidence.reviews.length, 3);
  assert.equal(
    unclassifiedReviewsRemainAvailable(record.evidence).some((review) => !review.classification),
    true,
  );
  assert.equal(record.recommendations.items.every((item) => item.stance === "advisory"), true);
});

test("research recommendations fail closed without may-language", () => {
  const bad = structuredClone(northlineResearchRecord());
  const first = bad.recommendations.items[0];
  assert.ok(first);
  (first as { text: string }).text = "The writer must use Maya R. as the lead review.";
  assert.throws(() => parseResearchRecord(bad), HandoffValidationError);
});

test("prescription page plan cannot absorb recommended-first-review as a locked decision", () => {
  const proposed = structuredClone(northlinePrescription());
  (proposed.proposedPagePlan as { recommendedFirstReview?: string }).recommendedFirstReview = "review-maya";
  assert.throws(() => parseProposedPrescription(proposed, northlineResearchRecord().evidence), /must not absorb editorial recommendations/);
});

test("writer context still carries original evidence and both advisory recommendation sets after approval", () => {
  const context = parseWriterContext(northlineWriterContext());
  assert.equal(context.evidence.reviews.some((review) => review.id === "review-unclassified"), true);
  assert.equal(context.researchRecommendations.items.length, 2);
  assert.equal(context.prescriptionRecommendations.items.length, 3);
  assert.equal(context.decisions.pageJobs.filter((job) => job.pageType === "service").length, 2);
  const fromPlan = writerContextFromApprovedPlan({
    version: APPROVED_PLAN_VERSION,
    prospectId: context.prospectId,
    approval: { status: "approved", approvedAt: "2026-09-14", approvedBy: "human" },
    decisions: context.decisions,
    researchRecommendations: context.researchRecommendations,
    prescriptionRecommendations: context.prescriptionRecommendations,
    evidence: context.evidence,
  });
  assert.equal(fromPlan.prescriptionRecommendations.items[0]?.stance, "advisory");
});

test("source references on recommendations must resolve in the evidence packet", () => {
  const record = northlineResearchRecord();
  const first = record.recommendations.items[0];
  assert.ok(first);
  const broken = {
    ...record,
    recommendations: {
      ...record.recommendations,
      items: [
        {
          ...first,
          sourceRefs: [{ kind: "review" as const, refId: "review-missing" }],
        },
        ...record.recommendations.items.slice(1),
      ],
    },
  };
  assert.throws(() => parseResearchRecord(broken), /source ID review-missing is not in this evidence packet/);
});
