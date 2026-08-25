import assert from "node:assert/strict";
import test from "node:test";
import { parseAndValidateFreshWriter1Output, parseAndValidateWriter1Output, Writer1OutputRecoveryError } from "../../scripts/360-words-canary.js";

const projection = {
  services: [
    { page: { url: "/garage-door-repair" }, prescriptionId: "prescription-repair", comparison: { canonicalServiceId: "garage-door-repair" }, reviewEvidence: [{ review: { id: "review-repair", text: "The repair was excellent." }, judgment: { authoritative: true } }] },
    { page: { url: "/garage-door-installation" }, prescriptionId: "prescription-install", comparison: { canonicalServiceId: "garage-door-installation" }, reviewEvidence: [{ review: { id: "review-install", text: "The installation was excellent." }, judgment: { authoritative: true } }] },
  ],
  sealedRefs: ["prescription-repair", "prescription-install", "review-repair", "review-install"],
};
const valid = JSON.stringify({
  schemaVersion: "words-writer1-output/v1",
  pages: [
    { type: "service", url: "/garage-door-repair", prescriptionId: "prescription-repair", primaryKeyword: "garage door repair", title: "Repair", seoTitle: "Repair", metaDescription: "Repair", h1: "Repair", body: "Repair body", sections: [{ id: "repair-section", heading: "Repair", body: "Repair copy" }], reviewPlacements: [{ reviewId: "review-repair", quote: "The repair was excellent.", attribution: "Chris", provenance: { type: "review", ref: "review-repair", placement: "repair testimonial", section: "repair-section" } }] },
    { type: "service", url: "/garage-door-installation", prescriptionId: "prescription-install", primaryKeyword: "garage door installation", title: "Installation", seoTitle: "Installation", metaDescription: "Installation", h1: "Installation", body: "Installation body", sections: [{ id: "installation-section", heading: "Installation", body: "Installation copy" }], reviewPlacements: [{ reviewId: "review-install", quote: "The installation was excellent.", attribution: "Marcie", provenance: { type: "review", ref: "review-install", placement: "installation testimonial", section: "installation-section" } }] },
  ],
});

const springReplacementReviewId = "Ci9DQUlRQUNvZENodHljRjlvT2taQlh6VlZabU5OWjFKc2JISklTa1pXUlVwVGVuYxAB";
const foldedProjection = {
  ...projection,
  sealedRefs: [...projection.sealedRefs, springReplacementReviewId],
  foldedSupport: [{
    status: "folded",
    canonicalServiceId: "garage-door-repair",
    directEvidenceReviewIds: [springReplacementReviewId],
    supportingEvidence: { allowedParentCanonicalId: "garage-door-repair", reviewIds: [springReplacementReviewId] },
    reviewEvidence: [{ review: { id: springReplacementReviewId, text: "The spring replacement was excellent." }, judgment: { authoritative: true } }],
  }],
};
const withSpringReplacementReview = (route = "/garage-door-repair") => {
  const parsed = JSON.parse(valid) as Record<string, any>;
  const page = parsed.pages.find((candidate: Record<string, any>) => candidate.url === route);
  page.reviewPlacements[0] = { reviewId: springReplacementReviewId, quote: "The spring replacement was excellent.", attribution: "Chris", provenance: { type: "review", ref: springReplacementReviewId, placement: "spring testimonial", section: page.sections[0].id } };
  return JSON.stringify(parsed);
};

test("Writer1 output validator accepts complete bound JSON only", () => {
  const parsed = parseAndValidateWriter1Output(valid, projection);
  assert.equal(parsed.schemaVersion, "words-writer1-output/v1");
  assert.deepEqual(parsed.pages.map((page: any) => page.url), ["/garage-door-repair", "/garage-door-installation"]);
});

test("Writer1 output validator rejects prose, missing copy, unbound quotes, and prohibited public topology", () => {
  for (const raw of [
    "Writer1 is done",
    JSON.stringify({ schemaVersion: "words-writer1-output/v1", pages: [] }),
    valid.replace('"type":"service",', ""),
    valid.replace('"metaDescription":"Repair"', '"metaDescription":""'),
    valid.replace('"primaryKeyword":"garage door repair"', '"primaryKeyword":""'),
    valid.replace('"provenance":{"type":"review"', '"provenance":{"type":""'),
    valid.replace('"provenance":{"type":"review"', '"provenance":{}'),
    valid.replace('"prescriptionId":"prescription-repair"', '"prescriptionId":"wrong-prescription"'),
    valid.replace('"provenance":{"type":"review"', '"provenance":null'),
    valid.replace('"reviewId":"review-repair"', '"reviewId":"unknown"'),
    valid.replace('"url":"/garage-door-installation"', '"url":"/garage-door-spring-repair"'),
    valid.replace('"reviewId":"review-install"', '"reviewId":"review-install","cta":"Garage door opener installation"'),
    JSON.stringify({ schemaVersion: "words-writer1-output/v1", pages: JSON.parse(valid).pages, contact: {} }),
  ]) assert.throws(() => parseAndValidateWriter1Output(raw, projection), /Writer1|JSON|copy|binding|topology|route|Contact/u);
});

test("Writer1 retrieval sentinel is explicit and never accepted as completed JSON", () => {
  assert.throws(() => parseAndValidateWriter1Output("OUTPUT_NOT_RECOVERABLE", projection), (error: unknown) => error instanceof Writer1OutputRecoveryError && error.code === "OUTPUT_NOT_RECOVERABLE");
});

test("Writer1 output rejects a service page with missing type", () => {
  const missingType = JSON.stringify({ ...JSON.parse(valid), pages: JSON.parse(valid).pages.map((page: Record<string, unknown>, index: number) => index === 0 ? Object.fromEntries(Object.entries(page).filter(([key]) => key !== "type")) : page) });
  assert.throws(() => parseAndValidateWriter1Output(missingType, projection), /page\.type.*exactly service/u);
});

test("fresh Writer1 rejects summaries, absent copy, route leakage, and missing provenance before completion", () => {
  assert.throws(() => parseAndValidateFreshWriter1Output("Writer1 is done", projection), /JSON object.*summary|string/u);
  const absentCopy = structuredClone(JSON.parse(valid)); delete absentCopy.pages[0].body;
  assert.throws(() => parseAndValidateFreshWriter1Output(absentCopy, projection), /full copy field body/u);
  const leakedRoute = structuredClone(JSON.parse(valid)); leakedRoute.pages[0].cta = { href: "/strategy-overview" };
  assert.throws(() => parseAndValidateFreshWriter1Output(leakedRoute, projection), /Home|Contact|route|topology/u);
  const missingProvenance = structuredClone(JSON.parse(valid)); delete missingProvenance.pages[0].reviewPlacements[0].provenance;
  assert.throws(() => parseAndValidateFreshWriter1Output(missingProvenance, projection), /provenance/u);
  assert.doesNotThrow(() => parseAndValidateFreshWriter1Output(JSON.parse(valid), projection));
});

test("folded spring-replacement evidence is authorized only on the repair page", () => {
  assert.doesNotThrow(() => parseAndValidateWriter1Output(withSpringReplacementReview(), foldedProjection));
  assert.throws(() => parseAndValidateWriter1Output(withSpringReplacementReview("/garage-door-installation"), foldedProjection), /unapproved/u);
  assert.throws(() => parseAndValidateWriter1Output(withSpringReplacementReview(), { ...foldedProjection, foldedSupport: [{ ...foldedProjection.foldedSupport[0], canonicalServiceId: "garage-door-installation" }] }), /unapproved/u);
  assert.throws(() => parseAndValidateWriter1Output(withSpringReplacementReview(), { ...foldedProjection, foldedSupport: [{ ...foldedProjection.foldedSupport[0], supportingEvidence: { allowedParentCanonicalId: "garage-door-installation", reviewIds: [springReplacementReviewId] } }] }), /unapproved/u);
  assert.throws(() => parseAndValidateWriter1Output(withSpringReplacementReview(), { ...foldedProjection, foldedSupport: [{ ...foldedProjection.foldedSupport[0], supportingEvidence: { allowedParentCanonicalId: "garage-door-repair", reviewIds: ["sealed-but-not-approved"] } }] }), /unapproved/u);
});

test("sealed but non-authoritative direct reviews remain rejected", () => {
  const nonAuthoritative = structuredClone(projection) as Record<string, any>;
  nonAuthoritative.services[0].reviewEvidence[0].judgment.authoritative = false;
  assert.throws(() => parseAndValidateWriter1Output(valid, nonAuthoritative), /non-authoritative/u);
});
