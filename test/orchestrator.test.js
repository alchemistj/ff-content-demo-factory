const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runFactoryCycle } = require('../src/factory/orchestrator');
const { loadState } = require('../src/factory/control-plane');

function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-orchestrator-'));
  fs.mkdirSync(path.join(root, 'config'), { recursive: true });
  const config = { productionCapacity: 1, maxDiscoveryCandidates: 7, cursorModel: 'cursor-grok-4.6-high', cursorFastMode: false };
  fs.writeFileSync(path.join(root, 'config', 'factory.config.json'), JSON.stringify(config));
  return { root, config };
}

function adapters({ failJudge = false } = {}) {
  const calls = { discover: 0, audits: 0, enrich: 0, judge: 0, prescribe: 0, gate1: 0 };
  const candidates = [
    { placeId: 'one', name: 'One Electric', website: 'https://one.example' },
    { placeId: 'two', name: 'Two Electric', website: 'https://two.example' },
    { placeId: 'three', name: 'Three Electric', website: 'https://three.example' },
  ];
  return {
    calls,
    candidates,
    discovery: { discover: async ({ limit }) => { calls.discover++; return candidates.slice(0, limit); } },
    websiteAudit: { audit: async () => { calls.audits++; return { opportunity: 'clear' }; } },
    enrichment: { enrichExactPlace: async ({ finalist, limit, dateWindow, exactPlace }) => { calls.enrich++; assert.equal(finalist.placeId, 'one'); assert.equal(limit, 50); assert.equal(dateWindow, null); assert.equal(exactPlace, true); return { listingReviewCount: 2, reviews: [{ id: 'r1', text: 'Installed an EV charger.' }, { id: 'r2', text: 'Repaired a panel.' }] }; } },
    reviewJudge: { judge: async ({ review }) => { calls.judge++; if (failJudge && calls.judge === 1) throw new Error('simulated interruption'); return { authoritative: true, directCompletedService: true, service: review.id }; } },
    prescriber: { prescribe: async ({ decision }) => { calls.prescribe++; return { pages: ['/', '/service'], decision }; } },
    gate1: { render: async ({ prescription }) => { calls.gate1++; return `# Gate 1\n${JSON.stringify(prescription)}`; } },
  };
}

test('orchestrator reports Architect ownership, preserves backlog, and stops at Gate 1', async () => {
  const { root, config } = setup();
  const api = adapters();
  let result = await runFactoryCycle({ root, config, adapters: api });
  assert.equal(result.nextAction.code, 'architect-candidate-review-required');
  assert.equal(result.candidateBench.length, 3);
  assert.equal(api.calls.discover, 1);
  result = await runFactoryCycle({ root, config, adapters: api, architectDecision: { qualifiedPlaceIds: ['one', 'two'], selectedPlaceId: 'one' } });
  assert.equal(result.nextAction.code, 'architect-prescription-decision-required');
  assert.equal(api.calls.enrich, 1);
  assert.equal(loadState(root, config).queue.length, 1);
  result = await runFactoryCycle({ root, config, adapters: api, architectDecision: { prescription: { approved: true } } });
  assert.equal(result.nextAction.code, 'architect-qa-required');
  assert.equal(api.calls.prescribe, 1);
  result = await runFactoryCycle({ root, config, adapters: api, architectDecision: { qaPass: true } });
  assert.equal(result.nextAction.code, 'awaiting-human-gate-1');
  assert.equal(api.calls.enrich, 1);
  assert.equal(api.calls.judge, 2);
  result = await runFactoryCycle({ root, config, adapters: api, architectDecision: { qaPass: true } });
  assert.equal(result.nextAction.code, 'awaiting-human-gate-1');
  assert.equal(api.calls.enrich, 1);
  assert.equal(api.calls.gate1, 1);
});

test('interrupted review classification resumes without repeating paid finalist enrichment', async () => {
  const { root, config } = setup();
  const api = adapters({ failJudge: true });
  await assert.rejects(() => runFactoryCycle({ root, config, adapters: api, architectDecision: { qualifiedPlaceIds: ['one'], selectedPlaceId: 'one' } }), /simulated interruption/);
  assert.equal(api.calls.enrich, 1);
  const recovered = await runFactoryCycle({ root, config, adapters: { ...api, reviewJudge: { judge: async ({ review }) => ({ authoritative: true, directCompletedService: true, service: review.id }) } }, architectDecision: { prescription: { approved: true } } });
  assert.equal(api.calls.enrich, 1);
  assert.equal(recovered.nextAction.code, 'architect-qa-required');
  const state = loadState(root, config);
  assert.equal(state.runs[0].paidWork.finalistEnrichment.reviewsRetrieved, 2);
});
