import assert from "node:assert/strict";
import test from "node:test";
import { runDeterministicQa } from "./deterministic.js";
import { runWholeSiteQa } from "./whole-site.js";
import { createHumanGate2Artifact } from "../render/human-gate-2.js";
import { INTELLIGENT_DIMENSIONS } from "./intelligent.js";
import { crossPageDriftFixture, crossPageThinkingDriftFixture, negativeProofFixture, richSiteFixture, thinGradeAFixture, topologyFixture } from "./fixtures.js";

const cleanAssessment = () => ({ independent: true as const, dimensionsReviewed: [...INTELLIGENT_DIMENSIONS], findings: [] });

test("rich fixture passes and reports review words without density gating", () => {
  const report = runDeterministicQa(richSiteFixture);
  assert.equal(report.pass, true);
  assert.equal(report.metrics.usedReviewCount, 3);
  assert.ok(report.findings.some((finding) => finding.code === "review-density-reported"));
});

test("Grade A requires lead plus two supporting reviews", () => {
  const report = runDeterministicQa(thinGradeAFixture);
  assert.equal(report.pass, false);
  assert.ok(report.findings.some((finding) => finding.code === "review-floor"));
});

test("Grade B requires lead plus one support and Grade C uses one when suitable", () => {
  const base = richSiteFixture.pages[0]!;
  const two = runDeterministicQa({ ...richSiteFixture, pages: [{ ...base, reviewGrade: "B", reviewPlacements: base.reviewPlacements.slice(0, 2) }] });
  assert.equal(two.pass, true);
  const one = runDeterministicQa({ ...richSiteFixture, pages: [{ ...base, reviewGrade: "B", reviewPlacements: base.reviewPlacements.slice(0, 1) }] });
  assert.ok(one.findings.some((finding) => finding.code === "review-floor"));
  const c = runDeterministicQa({ ...richSiteFixture, pages: [{ ...base, reviewGrade: "C", reviewPlacements: base.reviewPlacements.slice(0, 1) }] });
  assert.equal(c.pass, true);
});

test("review gates fail closed for arbitrary roles, missing attribution/claims, and fake ordering", () => {
  const base = richSiteFixture.pages[0]!;
  const adversarial = {
    ...richSiteFixture,
    pages: [{
      ...base,
      reviewGrade: "A" as const,
      text: "Only authored claim text; proof locations are omitted.",
      reviewPlacements: base.reviewPlacements.map((placement, index) => ({
        ...placement,
        proofRole: "context" as const,
        attribution: index === 0 ? undefined : placement.reviewer,
        reviewer: index === 0 ? undefined : placement.reviewer,
        claimId: index === 0 ? undefined : placement.claimId,
        wordOffset: undefined,
        order: (index + 1) * 2,
        sectionId: "one-review-block",
      })),
    }],
  };
  const report = runDeterministicQa(adversarial);
  assert.equal(report.pass, false);
  assert.ok(report.findings.some((finding) => finding.code === "review-role-floor"));
  assert.ok(report.findings.some((finding) => finding.code === "missing-review-attribution"));
  assert.ok(report.findings.some((finding) => finding.code === "missing-assigned-claim"));
  assert.ok(report.findings.some((finding) => finding.code === "review-claim-proximity-unmeasurable"));
  assert.ok(report.findings.some((finding) => finding.code === "review-sequence-unverifiable" || finding.code === "adjacent-reviews"));
});

test("Contact is exempt by default, but an assigned grade is honored", () => {
  const base = richSiteFixture.pages[0]!;
  const exempt = runDeterministicQa({ ...richSiteFixture, pages: [{ ...base, url: "/contact", pageType: "contact", reviewGrade: undefined, reviewPlacements: [] }] });
  assert.equal(exempt.pass, true);
  const graded = runDeterministicQa({ ...richSiteFixture, pages: [{ ...base, url: "/contact", pageType: "contact", reviewGrade: "B", reviewPlacements: [] }] });
  assert.ok(graded.findings.some((finding) => finding.code === "review-floor" || finding.code === "zero-review-eligible-sales-page"));
});

test("page-specific not_suitable review evidence cannot satisfy that page's floor", () => {
  const report = runDeterministicQa({
    reviews: [{ id: "r-page-b", reviewer: "A. Reader", exactText: "Clear communication throughout.", classification: "positive", pageSuitability: [{ pageId: "page-b", suitability: "not_suitable", reason: "Not service-specific" }] }],
    pages: [{ url: "/service-b", pageId: "page-b", pageType: "service", seoTitle: "B", metaDescription: "B", h1: "B", reviewGrade: "B", reviewPlacements: [] }],
  });
  assert.equal(report.pass, false);
  assert.ok(report.findings.some((finding) => finding.code === "review-floor"));
});

test("a placed review must itself be suitable for the prescribed page", () => {
  const report = runDeterministicQa({
    ...richSiteFixture,
    reviews: richSiteFixture.reviews.map((review) => review.id === "r-lead" ? { ...review, pageSuitability: [{ pageId: "roof-repair", suitability: "not_suitable", reason: "Wrong service" }] } : review),
  });
  assert.equal(report.pass, false);
  assert.ok(report.findings.some((finding) => finding.code === "unsuitable-review-placement" && finding.reviewId === "r-lead"));
});

test("negative review cannot be used as positive proof", () => {
  const report = runDeterministicQa(negativeProofFixture);
  assert.equal(report.pass, false);
  assert.ok(report.findings.some((finding) => finding.code === "negative-review-used-as-positive-proof"));
});

test("whole-site duplicate routes hard fail", () => {
  const report = runDeterministicQa(crossPageDriftFixture);
  assert.equal(report.pass, false);
  assert.ok(report.findings.some((finding) => finding.code === "duplicate-route"));
});

test("Human Gate 2 renderer reads as website words and ends in exact approval question", () => {
  const artifact = createHumanGate2Artifact({
    pages: [{ url: "/", seoTitle: "Home", metaDescription: "A home page", h1: "Welcome", heroSubhead: "A clear next step", sections: [{ heading: "What we do", body: "Specific work." }] }],
    header: { brand: "Example", navigation: [{ label: "Home", href: "/" }] },
    footer: { text: "Call us." },
    strategyOverview: { body: "The architecture routes broad intent into focused pages." },
  });
  assert.equal(artifact.state, "awaiting-human-gate-2");
  assert.match(artifact.markdown, /SEO title: Home/);
  assert.match(artifact.markdown, /## Strategy Overview/);
  assert.match(artifact.markdown, /Do you approve these website words for the coded demo\?$/);
  assert.doesNotMatch(artifact.markdown, /^---$/m);
});

test("Human Gate 2 places sidecar reviews at their authored section instead of a review dump", () => {
  const artifact = createHumanGate2Artifact({
    pages: [{ url: "/service", seoTitle: "Service", metaDescription: "Service", h1: "Service", sections: [{ id: "argument", heading: "The argument", body: "Claim before proof." }], reviewPlacements: [{ sectionId: "argument", quote: "The work was excellent.", attribution: "— Alex" }] }],
  });
  assert.ok(artifact.markdown.indexOf("Claim before proof.") < artifact.markdown.indexOf("The work was excellent."));
  assert.doesNotMatch(artifact.markdown, /Placed customer proof/);
});

test("orphaned review placements fail QA and remain visible in the review artifact", () => {
  const base = richSiteFixture.pages[0]!;
  const orphaned = { ...base, reviewPlacements: base.reviewPlacements.map((placement, index) => index === 0 ? { ...placement, sectionId: "missing-section" } : placement) };
  const report = runDeterministicQa({ ...richSiteFixture, pages: [orphaned] });
  assert.ok(report.findings.some((finding) => finding.code === "orphan-review-placement"));
  const artifact = createHumanGate2Artifact({ pages: [orphaned] });
  assert.match(artifact.markdown, /The team repaired our roof quickly/);
});

test("whole-site topology requires the final page/header/footer structure", async () => {
  const report = await runWholeSiteQa(topologyFixture, { assessor: cleanAssessment });
  assert.equal(report.pass, true);
  const broken = await runWholeSiteQa({ ...topologyFixture, pages: topologyFixture.pages.filter((page) => page.pageType !== "service") }, { assessor: cleanAssessment });
  assert.ok(broken.findings.some((finding) => finding.code === "required-service-page-count"));
});

test("whole-site assessor receives a deeply immutable snapshot", async () => {
  const report = await runWholeSiteQa(topologyFixture, { assessor: (snapshot: any) => {
    assert.throws(() => snapshot.header.navigation.push({ label: "Injected", href: "/injected" }), TypeError);
    return cleanAssessment();
  } });
  assert.equal(report.pass, true);
});

test("whole-site QA requires an independent assessor and a routed Strategy Overview", async () => {
  const missingAssessor = await runWholeSiteQa(topologyFixture);
  assert.ok(missingAssessor.findings.some((finding) => finding.code === "independent-assessment-required"));
  const invalidAssessor = await runWholeSiteQa(topologyFixture, { assessor: () => ({ independent: false, dimensionsReviewed: [], findings: [] } as never) });
  assert.ok(invalidAssessor.findings.some((finding) => finding.code === "invalid-independent-assessment"));
  const incompleteAssessor = await runWholeSiteQa(topologyFixture, { assessor: () => ({ independent: true, dimensionsReviewed: ["specificity"], findings: [] }) });
  assert.ok(incompleteAssessor.findings.some((finding) => finding.code === "incomplete-independent-assessment"));
  const missingRoute = await runWholeSiteQa({ ...topologyFixture, strategyOverview: {} }, { assessor: cleanAssessment });
  assert.ok(missingRoute.findings.some((finding) => finding.code === "strategy-route-missing"));
});

test("header/footer internal links resolve to final business routes and actions are typed", async () => {
  const report = await runWholeSiteQa({
    ...topologyFixture,
    businessWebsite: "https://example.test/home",
    header: { navigation: [{ label: "Home", href: "https://example.test/home" }, { label: "Missing", href: "https://example.test/missing" }, { label: "Call", href: "tel:555" }] },
    footer: { links: [{ label: "Contact", href: "/contact" }, { label: "Email", href: "mailto:test@example.com", kind: "email" }] },
  }, { assessor: cleanAssessment });
  assert.ok(report.findings.some((finding) => finding.code === "unresolvable-internal-link"));
  assert.ok(report.findings.some((finding) => finding.code === "untyped-link-action"));
});

test("cross-page drift is represented as independent structured thinking findings", async () => {
  const report = await runWholeSiteQa(crossPageThinkingDriftFixture, {
    assessor: () => ({ independent: true, dimensionsReviewed: [...INTELLIGENT_DIMENSIONS], findings: [
      { dimension: "cross-page-distinctness", severity: "hard-fail", summary: "Homepage duplicates a service page.", rationale: "The homepage repeats the service argument instead of routing broad intent." },
      { dimension: "strategy-truthfulness", severity: "hard-fail", summary: "Strategy names a nonexistent route.", rationale: "The route is absent from final topology." },
    ] }),
  });
  assert.equal(report.pass, false);
  assert.ok(report.findings.some((finding) => finding.code === "intelligent-cross-page-distinctness"));
  assert.ok(report.findings.some((finding) => finding.code === "intelligent-strategy-truthfulness"));
});
