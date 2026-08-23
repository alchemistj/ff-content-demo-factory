const test = require('node:test');
const assert = require('node:assert/strict');
const { buildCandidateBench, architectSelect, isMoldExcluded } = require('../src/factory/candidates');
const { prescribe, validateCollisions } = require('../src/factory/prescription');
const { renderGate1, architectQa } = require('../src/factory/gate1');

const candidates = [
  { placeId: 'rlb', name: 'RLB Electric', category: 'Electrician', location: 'Dallas, TX', phone: '555-0100', website: 'https://rlb.example', reviewCount: 44, discoveryReviews: [{ id: 'sample-1', text: 'EV charger install', rating: 5 }] },
  { placeId: 'panel', name: 'Panel Works', category: 'Electrician', location: 'Dallas, TX', website: 'https://panel.example' },
  { placeId: 'mold', name: 'Mold First', category: 'Mold remediation', location: 'Dallas, TX', website: 'https://mold.example' },
  { placeId: 'rlb-duplicate', name: 'RLB Electric', category: 'Electrician', location: 'Dallas, TX', website: 'https://rlb.example' },
  { placeId: 'unknown', name: 'Unknown Listing', category: 'Electrician', website: '' }
];

const classification = {
  authoritativeJudgmentCount: 5, anchorCount: 4, requestedLimit: 50, dateWindow: null, retrievalCompleteness: 'complete', enrichmentStatus: 'sufficient', exactPlace: true, discoverySampleOnly: false, listingReviewCount: 44, retrievedReviewCount: 44, writtenReviewCount: 5,
  reviews: [
    { id: 'allen', authoritative: true, sourceReview: { author: 'Allen Schaefer', rating: 5, date: '2025-01-01', text: 'Installed my NEMA 15-50 EV charging outlet.' }, authoritativeJudgment: { decision: 'anchor', directCompletedService: true, serviceEvidence: [{ service: 'ev-charging', excerpt: 'Installed my NEMA 15-50 EV charging outlet.' }] } },
    { id: 'anthony', authoritative: true, sourceReview: { author: "Anthony O'Bryan", rating: 5, date: '2025-02-01', text: 'Troubleshot our circuit and outlet repair.' }, authoritativeJudgment: { decision: 'anchor', directCompletedService: true, serviceEvidence: [{ service: 'electrical-repair', excerpt: 'Troubleshot our circuit and outlet repair.' }] } },
    { id: 'jason', authoritative: true, sourceReview: { author: 'Jason Budd', rating: 5, date: '2025-03-01', text: 'Wired our new-construction 30x40 shop-house.' }, authoritativeJudgment: { decision: 'anchor', directCompletedService: true, serviceEvidence: [{ service: 'new-construction-wiring', excerpt: 'Wired our new-construction 30x40 shop-house.' }] } },
    { id: 'night', authoritative: true, sourceReview: { author: 'Night customer', rating: 5, date: '2025-04-01', text: 'They came after hours at night.' }, authoritativeJudgment: { decision: 'supporting', directCompletedService: false, availabilityEvidence: [{ kind: 'night' }], serviceEvidence: [{ service: 'electrical-repair', excerpt: 'after hours at night' }] } },
    { id: 'holiday', authoritative: true, sourceReview: { author: 'Holiday customer', rating: 5, date: '2025-05-01', text: 'Helped before sunrise on a holiday.' }, authoritativeJudgment: { decision: 'supporting', directCompletedService: false, availabilityEvidence: [{ kind: 'holiday' }, { kind: 'beforeSunrise' }], serviceEvidence: [{ service: 'electrical-repair', excerpt: 'before sunrise on a holiday' }] } }
  ]
};

const audits = new Map([
  ['rlb', { quality: 'dated', opportunity: 'service pages bury EV charging evidence', inspected: true, graphicsInspection: { status: 'inspected', findings: [{ text: 'EV charger installation', url: 'https://rlb.example/flyer.jpg' }] }, siteCopyEvidence: ['EV charging appears only in a flyer'], ownedGraphicEvidence: [{ text: 'EV charger installation', url: 'https://rlb.example/flyer.jpg' }], publicImageUrls: ['https://rlb.example/flyer.jpg'] }],
  ['panel', { quality: 'thin', opportunity: 'unclear panel service', inspected: true, graphicsInspection: { status: 'inspected', findings: [] }, siteCopyEvidence: ['generic electrician copy'], ownedGraphicEvidence: [], publicImageUrls: [] }]
]);

test('candidate artifacts preserve GBP basics, sample typing, website/graphics evidence, duplicate status, and dispositions', () => {
  const bench = buildCandidateBench(candidates, audits, { durableIdentities: [{ name: 'Unknown Listing', category: 'Electrician', website: '', location: '' }] });
  assert.equal(bench.length, 5);
  const rlb = bench.find((c) => c.placeId === 'rlb');
  assert.equal(rlb.gbp.reviewCount, 44); assert.equal(rlb.discoveryReviewSample.sampleOnly, true); assert.equal(rlb.websiteAudit.inspected, true); assert.equal(rlb.websiteAudit.ownedGraphicEvidence.length, 1); assert.equal(rlb.websiteAudit.publicImageUrls.length, 1);
  assert.equal(bench.find((c) => c.placeId === 'rlb-duplicate').duplicate.status, 'duplicate');
  assert.equal(bench.find((c) => c.placeId === 'unknown').duplicate.status, 'duplicate');
  assert.equal(bench.find((c) => c.placeId === 'unknown').disposition.status, 'uncertain');
  assert.equal(bench.find((c) => c.placeId === 'mold').disposition.status, 'rejected'); assert.equal(isMoldExcluded(bench.find((c) => c.placeId === 'mold')), true);
  const selected = architectSelect(bench, { qualifiedPlaceIds: ['rlb', 'panel'], selectedPlaceId: 'rlb', reason: 'Strongest graphics plus direct review proof.' });
  assert.equal(selected.finalist.disposition.status, 'selected-finalist'); assert.equal(selected.bench.find((c) => c.placeId === 'panel').disposition.status, 'qualified');
});

test('only the selected finalist reaches the injected deep-enrichment adapter', async () => {
  const bench = buildCandidateBench(candidates.slice(0, 3), audits);
  const selected = architectSelect(bench, { qualifiedPlaceIds: ['rlb', 'panel'], selectedPlaceId: 'rlb' });
  const calls = [];
  const exactPlaceAdapter = async (request) => { calls.push(request); return { reviews: classification.reviews, listingReviewCount: 44 }; };
  const packet = await exactPlaceAdapter({ placeId: selected.finalist.placeId, limit: 50, dateWindow: null });
  assert.equal(calls.length, 1); assert.equal(calls[0].placeId, 'rlb'); assert.equal(calls[0].limit, 50); assert.equal(calls[0].dateWindow, null); assert.equal(packet.listingReviewCount, 44);
});

const proposedPages = [
  { type: 'Home', service: 'home', url: '/', primaryKeyword: 'electrician dallas', titleDirection: 'RLB Electric | Dallas electrical work', h1Direction: 'Electrical work grounded in real customer jobs', angle: 'Lead with proof-backed local electrical work.', whyIncluded: 'Required entry page and strongest overall opportunity.', strongestEvidence: 'allen', overlapBoundaries: 'Keep service specifics on service pages.', claims: [], traps: [], recommendedFirstReview: { reviewId: 'allen', reviewer: 'Allen Schaefer', rating: 5, date: '2025-01-01', exactText: 'Installed my NEMA 15-50 EV charging outlet.', why: 'Direct EV installation account.' } },
  { type: 'Service', service: 'ev-charging', url: '/ev-charging', primaryKeyword: 'EV charger installation Dallas', titleDirection: 'EV Charger Installation in Dallas', h1Direction: 'EV charging installed for the way you park', angle: 'Turn buried EV proof into a clear considered-purchase page.', whyIncluded: 'Owned flyer and direct NEMA 15-50 installation review.', strongestEvidence: 'allen', overlapBoundaries: 'Do not duplicate general repair troubleshooting.', claims: [], traps: [], recommendedFirstReview: { reviewId: 'allen', reviewer: 'Allen Schaefer', rating: 5, date: '2025-01-01', exactText: 'Installed my NEMA 15-50 EV charging outlet.', why: 'Direct completed EV charging installation.' } },
  { type: 'Contact', service: 'contact', url: '/contact', primaryKeyword: 'contact RLB Electric', titleDirection: 'Contact RLB Electric', h1Direction: 'Talk with RLB Electric', angle: 'Give ready prospects a clear next step.', whyIncluded: 'Required conversion page.', strongestEvidence: null, overlapBoundaries: 'No service claims here.', claims: [], traps: [], recommendedFirstReview: null }
];

test('prescription consumes explicit Architect pages, compares every service including zero-anchor pass-over, and refuses samples', () => {
  assert.throws(() => prescribe({ finalist: candidates[0], inventory: { discoverySampleOnly: true }, services: [], proposedPages: [] }), /discovery-sample/);
  const prescription = prescribe({ finalist: { ...candidates[0], architectQualified: true }, classification, services: [
    { id: 'ev-charging', name: 'EV charging' }, { id: 'electrical-repair', name: 'Electrical repair' }, { id: 'panel-upgrade', name: 'Panel upgrade', passedOverReason: 'No authoritative direct anchor.' }
  ], proposedPages });
  assert.equal(prescription.pages.length, 3); assert.equal(prescription.valueHierarchy.length, 3); assert.equal(prescription.valueHierarchy.find((s) => s.id === 'ev-charging').directCompletedEvidenceCount, 1);
  assert.match(prescription.valueHierarchy.find((s) => s.id === 'panel-upgrade').passedOverReason, /No authoritative/);
  assert.equal(prescription.pages.find((p) => p.type === 'Contact').recommendedFirstReview, null);
});

test('collision validation, Gate 1 evidence specificity, and expanded Architect QA enforce the boundary', () => {
  assert.equal(validateCollisions([{ type: 'a', url: '/x', primaryKeyword: 'x', titleDirection: 'a', h1Direction: 'a' }, { type: 'b', url: '/x', primaryKeyword: 'y', titleDirection: 'b', h1Direction: 'b' }]).valid, false);
  const finalist = { ...candidates[0], architectQualified: true, disposition: { status: 'selected-finalist' }, websiteAudit: audits.get('rlb'), duplicate: { status: 'unique' } };
  const prescription = prescribe({ finalist, classification, services: [{ id: 'ev-charging', name: 'EV charging' }, { id: 'electrical-repair', name: 'Electrical repair' }, { id: 'panel-upgrade', name: 'Panel upgrade', passedOverReason: 'No authoritative direct anchor.' }], proposedPages });
  const whyBuilt = { text: 'RLB Electric has direct EV charging installation proof while its dated site buries that opportunity. The NEMA 15-50 customer account and owned EV graphic support a focused considered-purchase page. The demo makes that evidence easier for Dallas prospects to find.', refs: [{ type: 'opportunity', ref: 'service pages bury EV charging evidence' }, { type: 'review', ref: 'allen' }, { type: 'graphic', ref: 'https://rlb.example/flyer.jpg' }] };
  const md = renderGate1({ finalist, prescription, whyBuilt });
  assert.match(md, /NEMA 15-50/); assert.match(md, /awaiting-human-gate-1/);
  const qa = architectQa({ finalist, inventory: classification, prescription, whyBuilt });
  assert.equal(qa.passed, true);
  const trapOnly = { ...prescription, pages: [{ ...prescription.pages[0], traps: ['Do not promise same-day service.'] }] };
  assert.equal(architectQa({ finalist, inventory: classification, prescription: trapOnly, whyBuilt }).checks.unsupportedClaimsAbsent, true);
  assert.throws(() => prescribe({ finalist, classification, services: [{ id: 'ev-charging', name: 'EV charging' }], proposedPages: [{ ...proposedPages[1], recommendedFirstReview: { reviewId: 'holiday', reviewer: 'Holiday customer', rating: 5, date: '2025-05-01', exactText: 'Helped before sunrise on a holiday.', why: 'A review.' } }] }), /does not fit|missing/);
  assert.equal(architectQa({ finalist, inventory: classification, prescription, whyBuilt: { text: 'This is a generic site story. It has a page.', refs: [{ type: 'opportunity', ref: 'missing' }, { type: 'review', ref: 'missing' }] } }).checks.whyBuiltEvidenceSpecific, false);
  assert.equal(architectQa({ finalist, inventory: { ...classification, enrichmentStatus: 'incomplete', retrievedReviewCount: 5 }, prescription, whyBuilt }).checks.truthfulFullEnrichment, false);
  assert.equal(architectQa({ finalist: { ...finalist, websiteAudit: { ...finalist.websiteAudit, graphicsInspection: { status: 'not-inspected', findings: [] } } }, inventory: classification, prescription, whyBuilt }).checks.graphicsInspected, false);
  const unsupported = { ...prescription, pages: [{ ...prescription.pages[0], claims: ['one-hour guaranteed service'] }] };
  assert.equal(architectQa({ finalist, inventory: classification, prescription: unsupported, whyBuilt }).checks.unsupportedClaimsAbsent, false);
  assert.equal(architectQa({ finalist: { ...finalist, duplicate: { status: 'duplicate' } }, inventory: classification, prescription, whyBuilt }).checks.noMoldOrDuplicate, false);
  assert.equal(architectQa({ finalist, inventory: classification, prescription, whyBuilt, laterStageArtifacts: ['copy'] }).checks.noLaterStageArtifacts, false);
});
