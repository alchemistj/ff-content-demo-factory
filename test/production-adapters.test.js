'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createProductionAdapters } = require('../src/factory/production-adapters');
const { createFileReceiptStore } = require('../src/factory/receipt-store');
const { runFactoryCycle } = require('../src/factory/orchestrator');

function setup() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ff-production-adapters-'));
}

function cursorDouble() {
  const calls = [];
  return {
    calls,
    async runResearchRecord({ kind, jobId, input }) {
      calls.push({ kind, jobId, input });
      if (kind === 'website-audit') return { receipt: { provider: 'cursor-sdk', jobId, status: 'completed', resolvedModel: 'grok-4.6' }, result: { kind, website: input.website, opportunity: 'opp-1', evidence: [{ type: 'copy', id: 'copy-1', text: 'Licensed electrical services.' }], images: [{ url: 'https://example.test/service.png', kind: 'service-graphic' }] } };
      if (kind === 'review-judgment') return { receipt: { provider: 'cursor-sdk', jobId, status: 'completed', resolvedModel: 'grok-4.6', runId: 'run-review-1' }, result: { kind, reviewId: input.review.id, authoritative: true, decision: 'anchor', directCompletedService: true, serviceEvidence: [{ service: 'ev-charging', excerpt: input.review.text }], availabilityEvidence: [], provenance: { source: input.review.source, reviewId: input.review.id } } };
      return { receipt: { provider: 'cursor-sdk', jobId, status: 'completed', resolvedModel: 'grok-4.6', runId: 'run-page-1' }, result: { kind, pages: [page()], comparison: { candidates: [{ id: 'ev-charging', name: 'EV Charging' }] } } };
    },
  };
}

function page() {
  return {
    type: 'Service', service: 'ev-charging', url: '/ev-charging', primaryKeyword: 'ev charging electrician',
    titleDirection: 'EV Charging Installation', h1Direction: 'EV Charging Installation in Town', angle: 'Evidence-led EV charging work',
    whyIncluded: 'A written review documents completed EV charging work.', overlapBoundaries: 'Do not overlap with general electrical repair.',
    claims: ['Completed EV charging installation evidence'], traps: [], strongestEvidence: 'r1',
  };
}

test('production composition maps Apify GBP basics, audits owned website, and persists normalized receipts', async () => {
  const root = setup();
  const calls = { discover: 0, enrich: 0 };
  const apify = {
    async discoverCandidates() {
      calls.discover += 1;
      return { candidates: [{ placeId: 'p1', mapsUrl: 'https://www.google.com/maps/place/One', name: 'One Electric', address: 'Austin, TX', website: 'https://one.example', rating: 4.9, listingReviewCount: 12, writtenReviews: [], emptyTextReviews: [], images: ['img-1'] }], provenance: { run: { runId: 'd1' } } };
    },
    async enrichFinalist() {
      calls.enrich += 1;
      return { listingReviewCount: 1, reviews: [{ id: 'r1', source: 'apify-finalist', author: 'A', rating: 5, date: '2026-01-01', text: 'Installed my EV charger.' }], emptyTextReviews: [], provenance: { run: { runId: 'e1' } } };
    },
  };
  const cursor = cursorDouble();
  const adapters = createProductionAdapters({ root, config: { discoverySearchStrings: ['electrician'], discoveryLocation: 'Austin, TX' }, apify, cursor });
  const discovery = await adapters.discovery.discover({ searchStrings: ['electrician'], location: 'Austin, TX', limit: 7 });
  const [candidate] = discovery.candidates;
  assert.equal(candidate.location, 'Austin, TX');
  assert.equal(candidate.gbpBasics.reviewCount, 12);
  const audit = await adapters.websiteAudit.audit(candidate);
  assert.equal(audit.audit.graphicsInspection.status, 'inspected');
  assert.equal(audit.audit.opportunity, 'opp-1');
  const receipts = createFileReceiptStore(root);
  assert.equal((await receipts.get('factory:website-audit:p1')).status, 'completed');
  assert.equal(calls.discover, 1);
  assert.equal(cursor.calls.length, 1);
});

test('production discovery refuses silent defaults and forwards the Architect request verbatim', async () => {
  const root = setup();
  const requests = [];
  const adapters = createProductionAdapters({
    root,
    apify: { async discoverCandidates(request) { requests.push(request); return { candidates: [] }; }, async enrichFinalist() { throw new Error('not used'); } },
    cursor: cursorDouble(),
  });
  await assert.rejects(() => adapters.discovery.discover({ limit: 7 }), /requires Architect/);
  await adapters.discovery.discover({ searchStrings: ['EV electrician'], location: 'Austin, TX', limit: 3 });
  assert.deepEqual(requests[0], { searchStrings: ['EV electrician'], location: 'Austin, TX', limit: 3, reviewLimit: 5 });
});

test('composition caches completed finalist enrichment and does not make a second paid call', async () => {
  const root = setup();
  let enrichCalls = 0;
  const apify = {
    async discoverCandidates() { return { candidates: [] }; },
    async enrichFinalist() {
      enrichCalls += 1;
      return { listingReviewCount: 1, reviews: [{ id: 'r1', author: 'A', source: 'apify-finalist', rating: 5, date: '2026-01-01', text: 'Installed an EV charger.' }], emptyTextReviews: [], provenance: { run: { runId: 'e1' } } };
    },
  };
  const adapters = createProductionAdapters({ root, apify, cursor: cursorDouble() });
  const finalist = { placeId: 'p1', mapsUrl: 'https://www.google.com/maps/place/One', name: 'One Electric' };
  const first = await adapters.enrichment.enrichExactPlace({ finalist, limit: 50, dateWindow: null, exactPlace: true });
  const second = await adapters.enrichment.enrichExactPlace({ finalist, limit: 50, dateWindow: null, exactPlace: true });
  assert.equal(first.enrichmentStatus, 'sufficient');
  assert.deepEqual(second, first);
  assert.equal(enrichCalls, 1);
});

test('review judgment is authoritative, receipt-bound, and feeds validated evidence prescription', async () => {
  const root = setup();
  const cursor = cursorDouble();
  const adapters = createProductionAdapters({ root, apify: { async discoverCandidates() { return { candidates: [] }; }, async enrichFinalist() { throw new Error('not used'); } }, cursor });
  const review = { id: 'r1', source: 'apify-finalist', author: 'A', rating: 5, date: '2026-01-01', text: 'Installed my EV charger.' };
  const finalist = { placeId: 'p1', mapsUrl: 'https://www.google.com/maps/place/One', name: 'One Electric', location: 'Austin, TX', website: 'https://one.example', websiteAudit: { opportunity: 'opp-1', graphicsInspection: { status: 'inspected', findings: [] } }, architectQualified: true, disposition: { status: 'selected-finalist' } };
  const judgment = await adapters.reviewJudge.judge({ review, finalist });
  assert.equal(judgment.authoritative, true);
  assert.equal(judgment.provenance.reviewId, 'r1');
  const prescription = await adapters.prescriber.prescribe({ finalist, inventory: { exactPlace: true, discoverySampleOnly: false, dateWindow: null, requestedLimit: 50, listingReviewCount: 1, reviews: [review], classifications: { r1: judgment } }, decision: { candidateServices: [{ id: 'ev-charging', name: 'EV Charging' }], pages: [page()], whyBuilt: { text: 'The owned site shows an opportunity. A customer review documents completed EV charging work.', refs: [{ type: 'opportunity', id: 'opp-1' }, { type: 'review', id: 'r1' }] } } });
  assert.equal(prescription.status, 'prescribed');
  assert.equal(prescription.evidence.authoritativeAnchorCount, 1);
  assert.equal(prescription.valueHierarchy[0].includedPage, true);
});

test('invalid or non-authoritative Cursor judgment fails closed', async () => {
  const root = setup();
  const adapters = createProductionAdapters({ root, apify: { async discoverCandidates() { return { candidates: [] }; }, async enrichFinalist() { throw new Error('not used'); } }, cursor: { async runResearchRecord() { return { receipt: { resolvedModel: 'grok-4.6' }, result: { kind: 'review-judgment', reviewId: 'r1', authoritative: false, decision: 'anchor', serviceEvidence: [], availabilityEvidence: [] } }; } } });
  await assert.rejects(() => adapters.reviewJudge.judge({ review: { id: 'r1', source: 'apify', text: 'Installed an EV charger.' }, finalist: { placeId: 'p1' } }), /contract invalid/);
});

test('review evidence cannot promote a fabricated excerpt or direct non-anchor', async () => {
  const root = setup();
  const adapters = createProductionAdapters({ root, apify: { async discoverCandidates() { return { candidates: [] }; }, async enrichFinalist() { throw new Error('not used'); } }, cursor: { async runResearchRecord() { return { receipt: { resolvedModel: 'grok-4.6', requestedAlias: 'cursor-grok-4.6-high' }, result: { kind: 'review-judgment', reviewId: 'r1', authoritative: true, decision: 'supporting', directCompletedService: true, serviceEvidence: [{ service: 'ev-charging', excerpt: 'fabricated' }], availabilityEvidence: [] } }; } } });
  await assert.rejects(() => adapters.reviewJudge.judge({ review: { id: 'r1', source: 'apify', text: 'Installed an EV charger.' }, finalist: { placeId: 'p1' } }), /exact source substring|anchor/);
});

test('production Gate 1 preserves an evidence-derived availability pattern', async () => {
  const root = setup();
  const adapters = createProductionAdapters({ root, apify: { async discoverCandidates() { return { candidates: [] }; }, async enrichFinalist() { throw new Error('not used'); } }, cursor: cursorDouble() });
  const finalist = { placeId: 'p1', name: 'One Electric', location: 'Austin, TX', architectQualified: true, disposition: { status: 'selected-finalist' }, duplicate: { status: 'unique' }, websiteAudit: { opportunity: 'opp-1', graphicsInspection: { status: 'inspected', findings: [] } } };
  const review = { id: 'r1', source: 'apify-finalist', author: 'A', rating: 5, date: '2026-01-01', text: 'Installed my EV charger.' };
  const classifications = { r1: { authoritative: true, decision: 'anchor', directCompletedService: true } };
  const prescription = { pages: [{ ...page(), claims: ['24/7 emergency service'], recommendedFirstReview: { reviewId: 'r1', reviewer: 'A', why: 'Direct completed work.' } }], valueHierarchy: [{ id: 'ev-charging', includedPage: true, passedOverReason: null }], collisionValidation: { valid: true }, evidence: { availabilityPattern: { label: '24/7 emergency pattern', reviewIds: ['r1'] } } };
  const inventory = { exactPlace: true, discoverySampleOnly: false, dateWindow: null, requestedLimit: 50, enrichmentStatus: 'sufficient', listingReviewCount: 1, retrievedReviewCount: 1, writtenReviewCount: 1, reviews: [review] };
  const whyBuilt = { text: 'The owned site shows an opportunity. A customer review documents completed EV charging work.', refs: [{ type: 'opportunity', id: 'opp-1' }, { type: 'review', id: 'r1' }] };
  const result = await adapters.gate1.render({ finalist, inventory, classifications, prescription, whyBuilt });
  assert.equal(result.qa.checks.unsupportedClaimsAbsent, true);
});

test('composed adapters drive the orchestrator through explicit Architect decisions to Gate 1', async () => {
  const root = setup();
  const apify = {
    async discoverCandidates() { return { candidates: [{ placeId: 'p1', mapsUrl: 'https://www.google.com/maps/place/One', name: 'One Electric', address: 'Austin, TX', website: 'https://one.example', listingReviewCount: 1, writtenReviews: [], emptyTextReviews: [] }] }; },
    async enrichFinalist() { return { listingReviewCount: 1, reviews: [{ id: 'r1', source: 'apify-finalist', author: 'A', rating: 5, date: '2026-01-01', text: 'Installed my EV charger.' }], emptyTextReviews: [], provenance: { run: { runId: 'e1' } } }; },
  };
  const adapters = createProductionAdapters({ root, config: { productionCapacity: 1, maxDiscoveryCandidates: 7 }, apify, cursor: cursorDouble() });
  const config = { productionCapacity: 1, maxDiscoveryCandidates: 7 };
  const discoveryRequest = { searchStrings: ['electrician'], location: 'Austin, TX', limit: 7 };
  let result = await runFactoryCycle({ root, config, adapters, discoveryRequest });
  assert.equal(result.nextAction.code, 'architect-candidate-review-required');
  result = await runFactoryCycle({ root, config, adapters, architectDecision: { qualifiedPlaceIds: ['p1'], selectedPlaceId: 'p1' } });
  assert.equal(result.nextAction.code, 'architect-qa-required');
  const whyBuilt = { text: 'The owned site shows an opportunity. A customer review documents completed EV charging work.', refs: [{ type: 'opportunity', id: 'opp-1' }, { type: 'review', id: 'r1' }] };
  result = await runFactoryCycle({ root, config, adapters, architectDecision: { qaPass: true, whyBuilt } });
  assert.equal(result.nextAction.code, 'awaiting-human-gate-1', JSON.stringify(result.nextAction.checks || result.run?.artifacts?.qa?.checks));
  assert.match(result.run.artifacts.gate1.markdown, /Human Gate 1/);
});
