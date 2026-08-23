'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const fixture = require('../fixtures/rlb-electric-reviews.json');
const {
  classifyReviewInventory,
  createCursorReviewJudge,
  buildPrescriptionEvidence,
  persistClassification,
} = require('../src/review-evidence');

function deterministicCursorComplete(calls) {
  return async ({ model, fast, review, signals }) => {
    calls.push(review.id);
    const direct = signals.hasConcreteReferent && signals.serviceSignals.length > 0;
    const decision = signals.negativeSignal ? 'negative' : direct ? 'anchor' : 'supporting';
    const serviceEvidence = direct ? signals.serviceSignals.map((service) => ({
      service,
      evidenceType: 'direct-completed-work',
      excerpt: review.text.slice(0, 220),
    })) : [];
    const availabilityEvidence = Object.entries(signals.availability)
      .filter(([, present]) => present)
      .map(([kind]) => ({ kind, excerpt: review.text.slice(0, 160) }));
    return {
      authoritative: true,
      decision,
      directCompletedService: direct,
      serviceEvidence,
      availabilityEvidence,
      claims: [],
      model,
      fast,
      judgmentId: `test-judgment-${review.id}`,
      judgedAt: '2026-08-23T00:00:00.000Z',
      provenance: { reviewId: review.id, source: review.source },
    };
  };
}

async function classifyFixture() {
  const calls = [];
  const judge = createCursorReviewJudge({
    complete: deterministicCursorComplete(calls),
  });
  const classification = await classifyReviewInventory({
    reviews: fixture.reviews,
    authoritativeJudge: judge,
  });
  return { classification, calls };
}

test('RLB fixture is the real 44-review inventory and every written review is judged', async () => {
  assert.equal(fixture.reviews.length, 44);
  assert.equal(fixture.provenance.source, 'apify-finalist');
  const { classification, calls } = await classifyFixture();
  assert.equal(calls.length, 44, 'authoritative evaluator must run once per written review');
  assert.equal(classification.authoritativeJudgmentCount, 44);
  assert.ok(classification.anchorCount > 0);
  assert.ok(classification.negativeCount > 0, 'negative review must remain in the evidence layer');
  assert.ok(classification.reviews.every((entry) => entry.authoritative === true));
});

test('RLB direct completed-service evidence survives judgment and reaches page comparison', async () => {
  const { classification } = await classifyFixture();
  const find = (author) => classification.reviews.find((entry) => entry.sourceReview.author === author);
  const allen = find('Allen Schaefer');
  const anthony = find("Anthony O'Bryan");
  const jason = find('Jason Budd');
  assert.equal(allen.authoritativeJudgment.directCompletedService, true);
  assert.ok(allen.authoritativeJudgment.serviceEvidence.some((item) => item.service === 'ev-charging'));
  assert.equal(anthony.authoritativeJudgment.directCompletedService, true);
  assert.ok(anthony.authoritativeJudgment.serviceEvidence.some((item) => item.service === 'electrical-repair'));
  assert.equal(jason.authoritativeJudgment.directCompletedService, true);
  assert.ok(jason.authoritativeJudgment.serviceEvidence.some((item) => item.service === 'new-construction-wiring'));

  const evidence = buildPrescriptionEvidence({
    classification,
    pages: [
      { title: 'EV Charger Installation', service: 'ev-charging', proposedSlug: 'ev-charger-installation', primaryKeyword: 'EV charger installation Springfield MO' },
      { title: 'Electrical Repair', service: 'electrical-repair', proposedSlug: 'electrical-repair-springfield', primaryKeyword: 'electrical repair Springfield MO' },
      { title: 'New Construction Wiring', service: 'new-construction-wiring', proposedSlug: 'new-construction-wiring', primaryKeyword: 'new construction wiring Springfield MO' },
    ],
    candidateServices: [
      { id: 'ev-charging', label: 'EV charger installation' },
      { id: 'electrical-repair', label: 'Electrical repair' },
      { id: 'new-construction-wiring', label: 'New construction wiring' },
      { id: 'panel-upgrade', label: 'Panel upgrade', status: 'passed-over' },
    ],
  });
  assert.ok(evidence.authoritativeAnchorCount > 0);
  assert.ok(evidence.pageEvidence.every((page) => page.recommendedFirstReview), 'every eligible page with evidence gets a recommendation');
  assert.ok(evidence.valueHierarchy.candidates.find((candidate) => candidate.id === 'ev-charging').authoritativeAnchorCount > 0);
  assert.ok(evidence.valueHierarchy.candidates.find((candidate) => candidate.id === 'electrical-repair').authoritativeAnchorCount > 0);
  assert.ok(evidence.valueHierarchy.candidates.find((candidate) => candidate.id === 'new-construction-wiring').authoritativeAnchorCount > 0);
  assert.equal(evidence.valueHierarchy.compared, true);
});

test('combined after-hours contexts form a bounded availability pattern, never a response guarantee', async () => {
  const { classification } = await classifyFixture();
  const evidence = buildPrescriptionEvidence({
    classification,
    pages: [{ title: 'Electrical Repair', service: 'electrical-repair', proposedSlug: 'electrical-repair-springfield', primaryKeyword: 'electrical repair Springfield MO' }],
  });
  assert.ok(evidence.availabilityPattern);
  assert.deepEqual(new Set(evidence.availabilityPattern.supportedBy.map((item) => item.provenance.reviewId)).size > 1, true);
  assert.match(evidence.availabilityPattern.safeDirection, /evidence-bounded 24\/7\/emergency availability pattern/i);
  assert.match(evidence.availabilityPattern.claims.join(' '), /24\/7\/emergency availability pattern/i);
  assert.match(evidence.availabilityPattern.traps.join(' '), /unconditional response SLA/i);
  assert.match(evidence.availabilityPattern.traps.join(' '), /one[- ]hour|same[- ]day/i);
});

test('classification can be persisted as a durable, provenance-bound artifact', async () => {
  const { classification } = await classifyFixture();
  const outputPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'review-evidence-')), 'classification.json');
  persistClassification(classification, outputPath);
  const persisted = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  assert.equal(persisted.authoritativeJudgmentCount, 44);
  assert.equal(persisted.reviews.find((entry) => entry.sourceReview.author === 'Allen Schaefer').provenance.source, 'apify-finalist');
});
