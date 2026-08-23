const test = require('node:test');
const assert = require('node:assert/strict');
const { buildCandidateBench, architectSelect, isMoldExcluded } = require('../src/factory/candidates');
const { prescribe, validateCollisions } = require('../src/factory/prescription');
const { renderGate1, architectQa } = require('../src/factory/gate1');

const candidates = [
  { placeId: 'rlb', name: 'RLB Electric', category: 'Electrician', location: 'Dallas, TX', website: 'https://rlb.example' },
  { placeId: 'panel', name: 'Panel Works', category: 'Electrician', location: 'Dallas, TX', website: 'https://panel.example' },
  { placeId: 'mold', name: 'Mold First', category: 'Mold remediation', location: 'Dallas, TX', website: 'https://mold.example' },
  { placeId: 'rlb-duplicate', name: 'RLB Electric', category: 'Electrician', location: 'Dallas, TX', website: 'https://rlb.example' }
];

const classification = {
  authoritativeJudgmentCount: 5, anchorCount: 4, requestedLimit: 50, dateWindow: null,
  reviews: [
    { id: 'allen', authoritative: true, sourceReview: { author: 'Allen Schaefer', rating: 5, date: '2025-01-01', text: 'Installed my NEMA 15-50 EV charging outlet.' }, authoritativeJudgment: { decision: 'anchor', directCompletedService: true, serviceEvidence: [{ service: 'ev-charging', excerpt: 'Installed my NEMA 15-50 EV charging outlet.' }] } },
    { id: 'anthony', authoritative: true, sourceReview: { author: "Anthony O'Bryan", rating: 5, date: '2025-02-01', text: 'Troubleshot our circuit and outlet repair.' }, authoritativeJudgment: { decision: 'anchor', directCompletedService: true, serviceEvidence: [{ service: 'electrical-repair', excerpt: 'Troubleshot our circuit and outlet repair.' }] } },
    { id: 'jason', authoritative: true, sourceReview: { author: 'Jason Budd', rating: 5, date: '2025-03-01', text: 'Wired our new-construction 30x40 shop-house.' }, authoritativeJudgment: { decision: 'anchor', directCompletedService: true, serviceEvidence: [{ service: 'new-construction-wiring', excerpt: 'Wired our new-construction 30x40 shop-house.' }] } },
    { id: 'night', authoritative: true, sourceReview: { author: 'Night customer', rating: 5, date: '2025-04-01', text: 'They came after hours at night.' }, authoritativeJudgment: { decision: 'supporting', directCompletedService: false, availabilityEvidence: [{ kind: 'night' }], serviceEvidence: [{ service: 'electrical-repair', excerpt: 'after hours at night' }] } },
    { id: 'holiday', authoritative: true, sourceReview: { author: 'Holiday customer', rating: 5, date: '2025-05-01', text: 'Helped before sunrise on a holiday.' }, authoritativeJudgment: { decision: 'supporting', directCompletedService: false, availabilityEvidence: [{ kind: 'holiday' }, { kind: 'beforeSunrise' }], serviceEvidence: [{ service: 'electrical-repair', excerpt: 'before sunrise on a holiday' }] } }
  ]
};

test('candidate bench is cheap, deduplicated, audited, and mold-safe', () => {
  const bench = buildCandidateBench(candidates, new Map([['rlb', { opportunity: 'weak service differentiation' }]]));
  assert.equal(bench.length, 3);
  assert.equal(bench.find((c) => c.placeId === 'mold').stage, 'rejected');
  assert.equal(isMoldExcluded(bench.find((c) => c.placeId === 'mold')), true);
  const selected = architectSelect(bench, { qualifiedPlaceIds: ['rlb', 'panel'], selectedPlaceId: 'rlb' });
  assert.equal(selected.finalist.placeId, 'rlb');
  assert.equal(selected.bench.find((c) => c.placeId === 'panel').stage, 'qualified-backlog');
});

test('prescription compares direct completed work and gives eligible pages a fitted first review', () => {
  const prescription = prescribe({ finalist: { ...candidates[0], architectQualified: true }, classification, services: [
    { name: 'ev-charging', slug: 'ev-charging' }, { name: 'electrical-repair', slug: 'electrical-repair' }, { name: 'new-construction-wiring', slug: 'new-construction-wiring' }, { name: 'panel-upgrade', slug: 'panel-upgrade' }
  ] });
  assert.equal(prescription.valueHierarchy.find((s) => s.name === 'ev-charging').directCompletedEvidenceCount, 1);
  assert.ok(prescription.pages.filter((p) => p.type === 'Service').every((p) => p.recommendedFirstReview));
  assert.equal(prescription.pages.find((p) => p.service === 'panel-upgrade'), undefined);
});

test('collision validator, canonical review guard, and compact human gate hold the line', () => {
  assert.equal(validateCollisions([{ type: 'a', url: '/x', primaryKeyword: 'x', title: 'a', h1: 'a' }, { type: 'b', url: '/x', primaryKeyword: 'y', title: 'b', h1: 'b' }]).valid, false);
  assert.throws(() => prescribe({ finalist: candidates[0], classification: { ...classification, reviews: [{ ...classification.reviews[0], authoritative: false }] }, services: [] }), /authoritative/);
  const prescription = prescribe({ finalist: { ...candidates[0], architectQualified: true }, classification, services: [{ name: 'ev-charging' }] });
  const md = renderGate1({ finalist: candidates[0], prescription });
  assert.match(md, /Human Gate 1/); assert.match(md, /Recommended First Review/); assert.match(md, /awaiting-human-gate-1/);
  assert.equal(architectQa({ finalist: { architectQualified: true, placeId: 'rlb' }, inventory: classification, prescription }).passed, true);
});
