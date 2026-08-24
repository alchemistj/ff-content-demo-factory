import assert from "node:assert/strict";
import test from "node:test";
import { garageDoor360FourPageHandoff } from "../../../fixtures/360-garage-door-four-page.js";
import { computeHandoffDigests, expansionOverrideDigest, parseApprovedProspectHandoff, validateApprovedProspectHandoff } from "../index.js";
import { contextFor } from "../../pipeline/orchestrator.js";
import { createInitialState, handoffFingerprint, validateState } from "../../pipeline/state.js";
import { renderHumanGate2 } from "../../render/human-gate-2.js";

const clone = <T>(value: T): T => structuredClone(value);
const codes = (value: unknown) => validateApprovedProspectHandoff(value).map((issue) => issue.code);

test("real 360 compatibility handoff preserves the four approved public routes", () => {
  const handoff = parseApprovedProspectHandoff(garageDoor360FourPageHandoff);
  const destinations = handoff.prospect.destinations;
  assert.equal(destinations.homepage.url, "/");
  assert.equal(destinations.contact.url, "/contact");
  assert.deepEqual(destinations.servicePages.map((page) => page.url), ["/garage-door-repair", "/garage-door-installation"]);
  assert.equal(handoff.reviewAnalysisFacts.retrievedWrittenReviewCount, 47);
  assert.equal(handoff.prospect.reviewInventory.length, 47);
  assert.ok(handoff.serviceComparison.length > 2);
});

test("stale or tampered digests fail closed", () => {
  const invalid = clone(garageDoor360FourPageHandoff);
  invalid.prospect.destinations.servicePages[0]!.keyword = "tampered";
  assert.ok(codes(invalid).includes("DIGEST_MISMATCH"));
  const stale = clone(garageDoor360FourPageHandoff);
  stale.digests = { ...computeHandoffDigests(stale), handoffDigest: "sha256:" + "f".repeat(64) };
  assert.ok(codes(stale).includes("DIGEST_MISMATCH"));
});

test("extra pages require an explicit valid expansion override", () => {
  const invalid = clone(garageDoor360FourPageHandoff);
  invalid.prospect.destinations.servicePages = [...invalid.prospect.destinations.servicePages, { ...invalid.prospect.destinations.servicePages[0]!, id: "service-360-extra", url: "/extra-service" } as any];
  assert.ok(codes(invalid).includes("SERVICE_PAGE_COUNT"));
});

test("generic service slots and alias collisions are rejected", () => {
  const generic = clone(garageDoor360FourPageHandoff);
  generic.serviceComparison[0]!.id = "service-1";
  assert.ok(codes(generic).includes("GENERIC_SERVICE_SLOT"));
  const collision = clone(garageDoor360FourPageHandoff);
  collision.serviceComparison[1]!.aliases = [collision.serviceComparison[0]!.aliases?.[0] || "repair"];
  assert.ok(codes(collision).includes("ALIAS_COLLISION"));
});

test("reserved routes and rejected page routes cannot enter navigation or service comparison", () => {
  const reserved = clone(garageDoor360FourPageHandoff);
  reserved.prospect.destinations.servicePages[0]!.url = "/contact";
  assert.ok(codes(reserved).includes("RESERVED_ROUTE"));
  const rejected = clone(garageDoor360FourPageHandoff);
  rejected.serviceComparison.find((entry) => entry.id === "garage-door-spring-repair")!.route = "/garage-door-spring-repair";
  assert.ok(codes(rejected).includes("REJECTED_PAGE_ROUTE"));
});

test("writer contexts are stage-scoped and Writer 3 receives sealed review facts", () => {
  const state = createInitialState({ handoff: garageDoor360FourPageHandoff as any, now: "2026-08-24T00:00:00Z" });
  const guides = { writer1: {}, writer2: {}, writer3: {} } as any;
  const writer1 = contextFor(state, "writer1", guides);
  const writer2 = contextFor(state, "writer2", guides);
  const writer3 = contextFor(state, "writer3", guides);
  assert.deepEqual(Object.keys(writer1.prospect.destinations), ["servicePages"]);
  assert.deepEqual(Object.keys(writer2.prospect.destinations).sort(), ["contact", "footer", "header", "homepage"]);
  assert.equal(writer1.sealedReviewAnalysisFacts, undefined);
  assert.equal(writer2.sealedReviewAnalysisFacts, undefined);
  assert.equal(writer3.sealedReviewAnalysisFacts.retrievedWrittenReviewCount, 47);
});

test("persisted state fingerprints the complete handoff", () => {
  const state = createInitialState({ handoff: garageDoor360FourPageHandoff as any });
  state.handoff.prospect.destinations.servicePages[0].keyword = "tampered";
  assert.throws(() => validateState(state), /handoff fingerprint/);
});

test("Human Gate 2 rejects review-analysis leakage into public routes", () => {
  const site = { pages: [{ url: "/", pageType: "homepage", h1: "Home", reviewAnalysisFacts: { retrievedWrittenReviewCount: 47 } }], header: {}, footer: {}, strategyOverview: { pageType: "strategy-overview", body: "internal" } };
  assert.throws(() => renderHumanGate2({ websiteWords: site, reviewAnalysisFacts: garageDoor360FourPageHandoff.reviewAnalysisFacts }), /leaked/);
});


test("Contact may omit a first-review recommendation", () => {
  const contact = clone(garageDoor360FourPageHandoff);
  delete (contact.prospect.destinations.contact as { recommendedFirstReview?: string }).recommendedFirstReview;
  delete (contact.prospect.destinations.contact as { recommendedFirstReviewReason?: string }).recommendedFirstReviewReason;
  contact.digests = computeHandoffDigests(contact);
  assert.deepEqual(validateApprovedProspectHandoff(contact), []);
});

test("approval digest and source manifest identity are independently sealed", () => {
  const approval = clone(garageDoor360FourPageHandoff);
  approval.approval.approvedBy = "Different approver";
  assert.ok(codes(approval).includes("DIGEST_MISMATCH"));
  const manifest = clone(garageDoor360FourPageHandoff);
  manifest.sourceCheckpoint.manifest[0]!.digest = "sha256:" + "f".repeat(64);
  assert.ok(codes(manifest).includes("SOURCE_CHECKPOINT_INVALID"));
  const resealed = clone(garageDoor360FourPageHandoff);
  resealed.sourceCheckpoint.sourceSha = "different-source";
  resealed.sourceCheckpoint.archiveDigest = computeHandoffDigests(resealed).sourceCheckpointDigest;
  resealed.digests = computeHandoffDigests(resealed);
  assert.ok(codes(resealed).includes("SOURCE_CHECKPOINT_INVALID"));
});

test("self-resealed handoff state fails the immutable entry seals", () => {
  const state = createInitialState({ handoff: garageDoor360FourPageHandoff as any });
  state.handoff.prospect.destinations.servicePages[0].keyword = "self-resealed";
  state.handoff.digests = computeHandoffDigests(state.handoff as any) as any;
  state.handoffFingerprint = handoffFingerprint(state.handoff);
  assert.throws(() => validateState(state), /binding|revalidated/);
});

test("Strategy Overview public metadata and rejected public CTA claims fail closed", () => {
  const strategy = clone(garageDoor360FourPageHandoff);
  (strategy.prospect.destinations.strategy as any).route = "/strategy-overview";
  assert.ok(codes(strategy).includes("PUBLIC_STRATEGY_ROUTE"));
  const cta = clone(garageDoor360FourPageHandoff);
  (cta.prospect.destinations.homepage as any).ctas = [{ label: "Garage door spring repair", href: "/garage-door-repair" }];
  cta.digests = computeHandoffDigests(cta);
  assert.ok(codes(cta).includes("REJECTED_PAGE_ROUTE"));
  const prose = clone(garageDoor360FourPageHandoff);
  (prose.prospect.destinations.homepage as any).metaDescription = "We also offer standalone garage door spring repair pages.";
  prose.digests = computeHandoffDigests(prose);
  assert.ok(codes(prose).includes("REJECTED_PAGE_ROUTE"));
});

test("forged evidence counts and copied expansion approvals fail closed", () => {
  const evidence = clone(garageDoor360FourPageHandoff);
  evidence.serviceComparison[0]!.directEvidenceCount = 999;
  evidence.digests = computeHandoffDigests(evidence);
  assert.ok(codes(evidence).includes("REVIEW_ANALYSIS_MISMATCH"));
  const copied = clone(garageDoor360FourPageHandoff) as any;
  copied.expansionOverride = {
    status: "approved", approvedBy: "Josh Lenz", approvedAt: "2026-08-24", reason: "copied approval",
    prospectId: "another-prospect", placeId: "ChIJHa32AOi84YMR38BV93YKiS8", runId: copied.sourceCheckpoint.runId,
    sourceCheckpointDigest: copied.digests.sourceCheckpointDigest, evidenceDigest: copied.digests.evidenceDigest,
    approvedPageIds: copied.prospect.destinations.servicePages.map((page: any) => page.id),
    canonicalIntents: copied.prospect.destinations.servicePages.map((page: any) => page.id), additionalRoutes: ["/extra"], digest: "",
  };
  copied.expansionOverride.digest = expansionOverrideDigest(copied.expansionOverride);
  copied.digests = computeHandoffDigests(copied);
  assert.ok(codes(copied).includes("APPROVAL_REQUIRED"));
});

test("malformed nested handoffs produce ContractValidationError issues, never dereference errors", () => {
  assert.ok(codes({ version: "lane-a-review-handoff/v1", prospect: null }).includes("INVALID_OBJECT"));
  assert.ok(codes({ version: "lane-a-review-handoff/v1", approval: "bad", prospect: {} }).includes("INVALID_OBJECT"));
});
