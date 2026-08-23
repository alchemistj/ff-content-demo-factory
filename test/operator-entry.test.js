'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createApifyAdapter } = require('../src/adapters/apify');
const { FINAL_STAGE, STAGES, runOne } = require('../src/factory/control-plane');
const { runFactoryCycle } = require('../src/factory/orchestrator');

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ff-operator-entry-'));
}

function config() {
  return { productionCapacity: 1, maxDiscoveryCandidates: 7 };
}

test('a bare Architect wake is idle and cannot invent a trade or location', () => {
  const root = tempRoot();
  const result = runOne({ root, config: config() });
  assert.equal(result.code, 'IDLE');
  assert.equal(result.state.queue.length, 0);
  assert.equal(result.state.runs.length, 0);
  assert.equal('candidateBench' in result.state, false);
  assert.equal(fs.existsSync(path.join(root, 'state', 'vendor-receipts.json')), false);
});

test('paid discovery requires explicit search strings and location before any vendor call', async () => {
  const calls = [];
  const adapter = createApifyAdapter({
    token: 'operator-entry-test-token',
    fetchImpl: async (...args) => {
      calls.push(args);
      throw new Error('vendor call should not be reached by this test');
    },
  });

  await assert.rejects(() => adapter.discoverCandidates({ limit: 7 }), /searchStrings is required/);
  await assert.rejects(() => adapter.discoverCandidates({ searchStrings: ['electrician'], limit: 7 }), /location is required/);
  assert.equal(calls.length, 0);
});

test('missing adapter composition returns an Architect-owned request action before paid work', async () => {
  const result = await runFactoryCycle({ root: tempRoot(), config: config(), adapters: null });
  assert.equal(result.nextAction.code, 'architect-discovery-request-required');
  assert.equal(result.nextAction.owner, 'architect');
});

test('Gate 1 is the terminal operator stop and exposes no later-stage transition', async () => {
  assert.deepEqual(STAGES, [
    'candidate-qualification',
    'finalist-enrichment',
    'review-intelligence',
    'page-prescription',
    'architect-qa',
    FINAL_STAGE,
  ]);
  const calls = [];
  const candidate = { placeId: 'operator-place', name: 'Operator Test', location: 'Explicit Test City', website: 'https://operator.example', mapsUrl: 'https://maps.google.com/?cid=operator' };
  const reviews = [{ id: 'review-1', source: 'apify-finalist', text: 'Completed service.', author: 'A', rating: 5, date: '2026-01-01' }];
  const adapters = {
    discovery: { discoverCandidates: async ({ searchStrings, location }) => { calls.push('discovery'); assert.deepEqual(searchStrings, ['operator test']); assert.equal(location, 'Explicit Test City'); return { candidates: [candidate], request: { searchStrings, location }, provenance: { run: { provider: 'test', status: 'completed' } } }; } },
    websiteAudit: { audit: async () => { calls.push('website-audit'); return { inspected: true, opportunity: 'explicit site opportunity', graphicsInspection: { status: 'inspected', findings: [] } }; } },
    enrichment: { enrichExactPlace: async () => { calls.push('enrichment'); return { placeId: 'operator-place', requestedReviewLimit: 50, dateWindow: null, listingReviewCount: 1, reviews, emptyTextReviews: [], retrievalCompleteness: 'complete' }; } },
    reviewJudge: { judge: async () => { calls.push('review-judgment'); return { authoritative: true, decision: 'anchor', directCompletedService: true, judgmentId: 'judgment-1', model: 'test', provenance: { reviewId: 'review-1', source: 'apify-finalist' }, serviceEvidence: [{ service: 'operator-service', evidenceType: 'completed-service', excerpt: 'Completed service.' }] }; } },
    prescriber: { propose: async () => { calls.push('prescription'); return { proposal: { services: [{ id: 'operator-service', name: 'Operator service' }], pages: [{ type: 'Service', service: 'operator-service', url: '/operator-service', primaryKeyword: 'operator service', titleDirection: 'Operator service', h1Direction: 'Operator service for local work', angle: 'Lead with the completed service.', whyIncluded: 'Direct review evidence.', overlapBoundaries: 'No overlap.', claims: [], traps: [], strongestEvidence: 'review-1' }] } }; } },
    gate1: { render: async () => { calls.push('gate-1'); return '# Operator Test\n\n## Human Gate 1\n\n`awaiting-human-gate-1`'; } },
  };
  const result = await runFactoryCycle({
    root: tempRoot(),
    config: config(),
    adapters,
    architectDecision: {
      selection: { qualifiedPlaceIds: ['operator-place'], selectedPlaceId: 'operator-place', reason: 'Explicit test selection.' },
      qa: { passed: true, whyBuilt: { text: 'The explicit site opportunity is clear. A direct review supports the operator service page.', refs: [{ type: 'opportunity', ref: 'explicit site opportunity' }, { type: 'review', ref: 'review-1' }] } },
    },
    discoveryRequest: { searchStrings: ['operator test'], location: 'Explicit Test City' },
  });

  assert.equal(result.nextAction.code, FINAL_STAGE);
  assert.equal(result.run.status, FINAL_STAGE);
  assert.match(result.nextAction.message, /no later stage may start/i);
  assert.match(result.run.artifacts.gate1.markdown, /Human Gate 1/);
  assert.deepEqual(calls, ['discovery', 'website-audit', 'enrichment', 'review-judgment', 'prescription', 'gate-1']);
  assert.equal(Object.keys(adapters).some((name) => /copy|build|deploy|outreach|gate-2/i.test(name)), false);
});
