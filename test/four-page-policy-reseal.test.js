'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { STANDARD_PRESCRIPTION_POLICY, pageSetDigest, validatePagePolicy, digest } = require('../src/factory/prescription-policy');
const { resealCheckpoint, EXPECTED_360_CHECKPOINT } = require('../src/factory/reseal');

function page(type, url, service = null) {
  return { type, service, url, primaryKeyword: `${service || type} Springfield`, titleDirection: `${service || type} Springfield`, h1Direction: `${service || type} for local customers`, angle: 'Use only evidence-backed direction.', whyIncluded: 'Explicit policy test page.', overlapBoundaries: 'No duplicate route.', claims: [], traps: [], strongestEvidence: service ? 'r1' : null, recommendedFirstReview: null };
}

function services() {
  return [
    { id: 'repair', name: 'Repair', directCompletedEvidenceCount: 9, evidenceCount: 9 },
    { id: 'installation', name: 'Installation', directCompletedEvidenceCount: 6, evidenceCount: 6 },
    { id: 'opener', name: 'Opener', directCompletedEvidenceCount: 1, evidenceCount: 1 },
  ];
}

function standardPages(serviceCount = 2) {
  return [page('Home', '/'), ...services().slice(0, serviceCount).map((item) => page('Service', `/${item.id}`, item.id)), page('Contact', '/contact', 'contact')];
}

test('standard policy rejects three pages and five/six pages', () => {
  assert.throws(() => validatePagePolicy({ pages: standardPages(1), services: services() }), /exactly 2 Service pages/);
  assert.throws(() => validatePagePolicy({ pages: [...standardPages(), page('Service', '/opener', 'opener')], services: services() }), /exactly four business pages|exactly 2 Service pages/);
  assert.throws(() => validatePagePolicy({ pages: [...standardPages(), page('Service', '/opener', 'opener'), page('Service', '/extra', 'extra')], services: [...services(), { id: 'extra', directCompletedEvidenceCount: 1 }] }), /exactly four business pages|exactly 2 Service pages/);
});

test('standard policy selects only the top two evidence-backed service destinations and preserves all candidates', () => {
  const result = validatePagePolicy({ pages: standardPages(), services: services() });
  assert.deepEqual(result.selectedServiceIds, ['repair', 'installation']);
  assert.equal(result.policy.businessPageCount, 4);
  assert.equal(result.policy.servicePageCount, 2);
});

test('valid one-off expansion requires an explicit durable approval bound to the run and page set', () => {
  const pages = [...standardPages(), page('Service', '/opener', 'opener')];
  const sourceBinding = { runId: 'run-1', artifactId: 'artifact-1', sourceSha: 'abc' };
  const override = { mode: 'expanded-one-off', overrideId: 'override-1', prospectId: 'prospect-1', runId: 'run-1', approvedBy: 'Josh Lenz', approvedAt: '2026-08-24', expiresAt: '2026-12-31', reason: 'A documented one-off proposal.', allowedServicePageCount: 3, sourceCheckpoint: sourceBinding, pageSetDigest: pageSetDigest(pages) };
  const result = validatePagePolicy({ pages, services: services(), override, runContext: { prospectId: 'prospect-1', runId: 'run-1', now: '2026-08-24' }, sourceBinding });
  assert.equal(result.policy.mode, 'expanded-one-off');
  assert.equal(result.policy.allowedServicePageCount, 3);
  assert.ok(result.override.approvalDigest);
  assert.throws(() => validatePagePolicy({ pages, services: services(), override: { ...override, pageSetDigest: digest('tampered') }, runContext: { prospectId: 'prospect-1', runId: 'run-1', now: '2026-08-24' }, sourceBinding }), /digest mismatch/);
  assert.throws(() => validatePagePolicy({ pages, services: services(), override: { ...override, expiresAt: '2020-01-01' }, runContext: { prospectId: 'prospect-1', runId: 'run-1', now: '2026-08-24' }, sourceBinding }), /stale/);
  assert.throws(() => validatePagePolicy({ pages, services: services(), override: { ...override, runId: 'other-run' }, runContext: { prospectId: 'prospect-1', runId: 'run-1', now: '2026-08-24' }, sourceBinding }), /run mismatch/);
  assert.throws(() => validatePagePolicy({ pages, services: services(), override: { ...override, approvedBy: undefined }, runContext: { prospectId: 'prospect-1', runId: 'run-1', now: '2026-08-24' }, sourceBinding }), /missing approvedBy/);
});

test('service alias collisions fail closed', () => {
  assert.throws(() => validatePagePolicy({ pages: standardPages(), services: [{ id: 'garage-door-repair', directCompletedEvidenceCount: 2 }, { id: 'garage door repair', directCompletedEvidenceCount: 2 }] }), /alias collision/);
});

function resealFixture() {
  const ids = Array.from({ length: 47 }, (_, index) => `stable-review-${String(index + 1).padStart(2, '0')}`);
  const oldPages = [page('Home', '/'), page('Service', '/garage-door-repair', 'garage-door-repair'), page('Service', '/garage-door-installation', 'garage-door-installation'), page('Contact', '/contact', 'contact'), page('Service', '/spring-repair', 'garage-door-spring-repair'), page('Service', '/opener-installation', 'garage-door-opener-installation')];
  const candidateServices = [
    { id: 'garage-door-repair', name: 'Garage door repair', directCompletedEvidenceCount: 5, directEvidenceReviewIds: ids.slice(0, 5) },
    { id: 'garage-door-installation', name: 'Garage door installation', directCompletedEvidenceCount: 4, directEvidenceReviewIds: ids.slice(5, 9) },
    { id: 'garage-door-spring-repair', name: 'Garage door spring repair', directCompletedEvidenceCount: 3, directEvidenceReviewIds: ids.slice(9, 12) },
    { id: 'garage-door-opener-installation', name: 'Garage door opener installation', directCompletedEvidenceCount: 2, directEvidenceReviewIds: ids.slice(12, 14) },
  ];
  const reviews = ids.map((id) => ({ id, author: `Reviewer ${id}`, rating: 5, date: '2026-08-23T12:00:00.000Z', text: `Written evidence ${id}` }));
  const packet = { reviews, writtenReviewCount: 47, retrievedAt: '2026-08-23T23:50:28.914Z' };
  const state = { runs: [{ runId: 'run-49c4e3d8b15c4008ae13', prospectId: 'prospect-360', artifacts: { reviewPacket: packet, classification: { reviews: reviews.map((review) => ({ id: review.id, sourceReview: review, authoritative: true })) }, prescription: { pages: oldPages, prospect: { name: '360 Garage Door and More', placeId: 'place-360' } }, cursorProposal: { cursorComparison: { candidates: candidateServices } } } }] };
  const ledger = { version: 'canonical-service-coverage-ledger-v1', aliases: { 'garage-door-spring-repair': 'garage-door-repair', 'garage-door-opener-installation': 'home-breadth' }, services: [
    { id: 'garage-door-repair', name: 'Garage door repair', reviewIds: [...new Set([...candidateServices[0].directEvidenceReviewIds, ...candidateServices[2].directEvidenceReviewIds])], currentSitePageUrls: [] },
    { id: 'garage-door-installation', name: 'Garage door installation', reviewIds: candidateServices[1].directEvidenceReviewIds, currentSitePageUrls: [] },
    { id: 'home-breadth', name: 'Home-level breadth', reviewIds: candidateServices[3].directEvidenceReviewIds, currentSitePageUrls: [] },
  ] };
  const checkpoint = { ...EXPECTED_360_CHECKPOINT };
  const approval = { approvedBy: 'Josh Lenz', approvedAt: '2026-08-24', approvedRoutes: ['/', '/garage-door-repair', '/garage-door-installation', '/contact'] };
  return { ids, state, checkpoint, ledger, approval, oldPages };
}

test('exact 360 four-page derivative preserves evidence, folds spring repair, and keeps opener evidence Home-only', () => {
  const fixture = resealFixture();
  const before = JSON.stringify(fixture.state);
  let vendorCalls = 0;
  const result = resealCheckpoint({ checkpoint: fixture.checkpoint, artifactId: '9516514426', state: fixture.state, canonicalServiceLedger: fixture.ledger, approval: fixture.approval, vendorAdapters: { call: () => { vendorCalls += 1; } } });
  assert.equal(vendorCalls, 0);
  assert.deepEqual(result.handoff.pages.map((p) => p.url), ['/', '/garage-door-repair', '/garage-door-installation', '/contact']);
  assert.equal(result.handoff.reviewAnalysisFacts.retrievedWrittenReviewCount, 47);
  assert.equal(result.handoff.reviewAnalysisFacts.reviewRetrievalDate, '2026-08-23');
  assert.equal(result.handoff.stableReviewIds.length, 47);
  assert.equal(result.handoff.candidateServices.find((s) => s.sourceServiceId === 'garage-door-spring-repair').canonicalServiceId, 'garage-door-repair');
  const opener = result.handoff.candidateServices.find((s) => s.sourceServiceId === 'garage-door-opener-installation');
  assert.equal(opener.destination, 'home-support');
  assert.equal(opener.pageUrl, null);
  assert.deepEqual(fixture.state, JSON.parse(before));
});

test('reseal rejects tampered source and stale/mismatched approval without vendor work', () => {
  const fixture = resealFixture();
  assert.throws(() => resealCheckpoint({ checkpoint: { ...fixture.checkpoint, sourceSha: 'tampered' }, artifactId: '9516514426', state: fixture.state, canonicalServiceLedger: fixture.ledger, approval: fixture.approval }), /identity/);
  assert.throws(() => resealCheckpoint({ checkpoint: fixture.checkpoint, artifactId: '9516514426', state: fixture.state, canonicalServiceLedger: fixture.ledger, approval: { ...fixture.approval, approvedBy: 'Someone Else' } }), /approval/);
});

test('checked-in 360 sealed handoff is the real four-page derivative', () => {
  const filename = path.join(__dirname, '..', 'canary', 'outputs', '360-four-page-reseal-handoff.json');
  assert.equal(fs.existsSync(filename), true);
  const handoff = JSON.parse(fs.readFileSync(filename, 'utf8'));
  assert.deepEqual(handoff.pages.map((page) => page.url), ['/', '/garage-door-repair', '/garage-door-installation', '/contact']);
  assert.equal(handoff.source.checkpoint.runId, '32717620900');
  assert.equal(handoff.source.artifactId, '9516514426');
  assert.equal(handoff.source.checkpoint.sourceSha, EXPECTED_360_CHECKPOINT.sourceSha);
  assert.equal(handoff.reviewAnalysisFacts.retrievedWrittenReviewCount, 47);
  assert.equal(handoff.reviewAnalysisFacts.reviewRetrievalDate, '2026-08-23');
  assert.equal(handoff.stableReviewIds.length, 47);
  assert.equal(handoff.noVendorReseal, true);
});
