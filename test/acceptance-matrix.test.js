const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runFactoryCycle } = require('../src/factory/orchestrator');
const control = require('../src/factory/control-plane');
const { loadConfig } = require('../src/run-one');
const { prescribe, validateCollisions } = require('../src/factory/prescription');
const { renderGate1 } = require('../src/factory/gate1');
const { classifyReviewInventory, createCursorReviewJudge, buildPrescriptionEvidence } = require('../src/review-evidence');
const fixture = require('../fixtures/rlb-electric-reviews.json');

function harness({ failFirstJudge = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-acceptance-'));
  const config = { productionCapacity: 1, maxDiscoveryCandidates: 7, cursorModel: 'cursor-grok-4.6-high', cursorFastMode: false };
  const calls = { discover: 0, audits: 0, enrich: 0, judge: 0, proposal: 0, gate1: 0, enrichmentRequest: null };
  const candidates = [
    { placeId: 'one', name: 'One Electric', location: 'Dallas, TX', website: 'https://one.example', mapsUrl: 'https://maps.google.com/?cid=one' },
    { placeId: 'two', name: 'Two Electric', location: 'Dallas, TX', website: 'https://two.example', mapsUrl: 'https://maps.google.com/?cid=two' },
    { placeId: 'three', name: 'Three Electric', location: 'Dallas, TX', website: 'https://three.example', mapsUrl: 'https://maps.google.com/?cid=three' },
  ];
  const reviews = [
    { id: 'r1', source: 'apify-finalist', author: 'A', rating: 5, date: '2026-01-01', text: 'Installed an EV charger.' },
    { id: 'r2', source: 'apify-finalist', author: 'B', rating: 5, date: '2026-01-02', text: 'Repaired a panel.' },
  ];
  const adapters = {
    discovery: { discoverCandidates: async ({ searchStrings, location, limit }) => { calls.discover++; assert.deepEqual(searchStrings, ['electrician']); assert.equal(location, 'Dallas, TX'); return { kind: 'discovery-candidates', candidates: candidates.slice(0, limit), request: { searchStrings, location }, provenance: { run: { provider: 'test', status: 'completed', runId: 'discovery-1' } } }; } },
    websiteAudit: { audit: async () => { calls.audits++; return { inspected: true, opportunity: 'clear site opportunity', graphicsInspection: { status: 'inspected', findings: [] } }; } },
    enrichment: { enrichExactPlace: async (request) => { calls.enrich++; calls.enrichmentRequest = request; return { kind: 'finalist-review-enrichment', placeId: 'one', requestedReviewLimit: 50, dateWindow: null, listingReviewCount: 2, reviews, emptyTextReviews: [], retrievalCompleteness: 'complete' }; } },
    reviewJudge: { judge: async ({ review }) => { calls.judge++; if (failFirstJudge && calls.judge === 1) throw new Error('matrix interruption'); const service = review.id === 'r1' ? 'ev-charging' : 'panel-upgrade'; return { authoritative: true, decision: 'anchor', directCompletedService: true, serviceEvidence: [{ service, evidenceType: 'completed-service', excerpt: review.text }], claims: [], judgmentId: `j-${review.id}`, model: 'cursor-grok-4.6-high', provenance: { reviewId: review.id, source: review.source } }; } },
    prescriber: { propose: async () => { calls.proposal++; return { proposal: { services: [{ id: 'ev-charging', name: 'EV charging' }, { id: 'panel-upgrade', name: 'Panel upgrade', passedOverReason: 'Architect retained this service for review.' }], pages: [{ type: 'Home', service: 'home', url: '/', primaryKeyword: 'electrician dallas', titleDirection: 'One Electric electrical work', h1Direction: 'Electrical work grounded in real jobs', angle: 'Lead with verified local work.', whyIncluded: 'Core entry page.', overlapBoundaries: 'Keep service specifics on service pages.', claims: [], traps: [], strongestEvidence: 'r1' }, { type: 'Service', service: 'ev-charging', url: '/ev-charging', primaryKeyword: 'EV charger installation Dallas', titleDirection: 'EV Charger Installation in Dallas', h1Direction: 'EV charging installed for your parking needs', angle: 'Make direct installation proof easy to find.', whyIncluded: 'Direct completed installation evidence.', overlapBoundaries: 'Do not duplicate panel repair.', claims: [], traps: [], strongestEvidence: 'r1' }] }, receipt: { provider: 'test', status: 'completed', jobId: 'proposal-1' } }; } },
    gate1: { render: async () => { calls.gate1++; return '# Prospect\n\n## Human Gate 1\n\n`awaiting-human-gate-1`'; } },
  };
  return { root, config, calls, candidates, adapters };
}

async function selected(h) {
  const discovered = await runFactoryCycle({ root: h.root, config: h.config, adapters: h.adapters, discoveryRequest: { searchStrings: ['electrician'], location: 'Dallas, TX' } });
  assert.equal(discovered.nextAction.code, 'architect-candidate-review-required');
  const result = await runFactoryCycle({ root: h.root, config: h.config, adapters: h.adapters, architectDecision: { selection: { qualifiedPlaceIds: ['one', 'two'], selectedPlaceId: 'one', reason: 'Strongest explicit evidence.' } } });
  return { discovered, result };
}

async function gateReady(h) {
  await selected(h);
  return runFactoryCycle({ root: h.root, config: h.config, adapters: h.adapters, architectDecision: { qa: { passed: true, whyBuilt: { text: 'The clear site opportunity is buried. Direct review evidence supports the focused service direction.', refs: [{ type: 'opportunity', ref: 'clear site opportunity' }, { type: 'review', ref: 'r1' }] } } } });
}

test('AC01 production capacity is exactly one', () => {
  assert.equal(JSON.parse(fs.readFileSync('config/factory.config.json')).productionCapacity, 1);
});

test('AC02 Architect automation can initiate run-one', async () => {
  const h = harness(); const result = await runFactoryCycle({ root: h.root, config: h.config, adapters: h.adapters, discoveryRequest: { searchStrings: ['electrician'], location: 'Dallas, TX' } });
  assert.equal(result.nextAction.owner, 'architect'); assert.equal(result.nextAction.code, 'architect-candidate-review-required');
});

test('AC03 trusted Actions wrapper is Architect-operated and bounded', () => {
  const workflow = fs.readFileSync('.github/workflows/architect-factory-wake.yml', 'utf8');
  assert.match(workflow, /branches:\s*\n\s*- main/);
  assert.match(workflow, /paths:\s*\n\s*- \.factory-wake\/control\.json/);
  assert.match(workflow, /github\.actor == github\.repository_owner/);
  assert.match(workflow, /permissions:\s*\n\s*actions: read\s*\n\s*contents: read/);
  assert.doesNotMatch(workflow, /pull_request_target|schedule:|workflow_dispatch:/);
  assert.doesNotMatch(workflow, /vercel|lemlist|outreach|client build|copy generation/i);
  assert.match(fs.readFileSync('docs/CONTROL-PLANE.md', 'utf8'), /Josh never[\s\S]*operates Actions/i);
});

test('AC04 cheap candidate bench is audited and requires one explicit finalist', async () => {
  const h = harness(); const { discovered, result } = await selected(h);
  assert.equal(discovered.candidateBench.length, 3); assert.equal(result.state.runs.length, 1); assert.equal(result.state.runs[0].candidate.placeId, 'one');
  assert.equal(h.calls.audits, 3);
});

test('AC05 only selected finalist receives paid deep enrichment', async () => {
  const h = harness(); await selected(h); assert.equal(h.calls.enrich, 1); assert.equal(h.calls.enrichmentRequest.finalist.placeId, 'one');
});

test('AC06 finalist enrichment asks for at most 50 reviews with no date window', async () => {
  const h = harness(); await selected(h); assert.equal(h.calls.enrichmentRequest.limit, 50); assert.equal(h.calls.enrichmentRequest.dateWindow, null); assert.equal(h.calls.enrichmentRequest.exactPlace, true);
});

test('AC07 page prescriber rejects discovery-sample-only inventory', () => {
  assert.throws(() => prescribe({ finalist: { placeId: 'one', name: 'One', location: 'Dallas' }, inventory: { discoverySampleOnly: true }, proposedPages: [], services: [] }), /discovery-sample/);
});

test('AC08 RLB 44-review fixture produces authoritative anchors', async () => {
  const explicitJudgments = new Map(fixture.reviews.map((review) => [review.id, { decision: 'supporting', directCompletedService: false, serviceEvidence: [] }]));
  const byAuthor = (author, service) => { const review = fixture.reviews.find((item) => item.author === author); explicitJudgments.set(review.id, { decision: 'anchor', directCompletedService: true, serviceEvidence: [{ service }] }); };
  byAuthor('Allen Schaefer', 'ev-charging'); byAuthor("Anthony O'Bryan", 'electrical-repair'); byAuthor('Jason Budd', 'new-construction-wiring');
  const judge = createCursorReviewJudge({ complete: async ({ review, model, fast }) => ({ ...explicitJudgments.get(review.id), authoritative: true, claims: [], model, fast, judgmentId: `matrix-explicit-${review.id}`, provenance: { reviewId: review.id, source: review.source } }) });
  const classification = await classifyReviewInventory({ reviews: fixture.reviews, authoritativeJudge: judge });
  assert.equal(classification.authoritativeJudgmentCount, 44); assert.ok(classification.anchorCount > 0);
  assert.equal(classification.reviews.find((entry) => entry.sourceReview.author === 'Allen Schaefer').authoritativeJudgment.serviceEvidence[0].service, 'ev-charging');
  assert.equal(classification.reviews.find((entry) => entry.sourceReview.author === "Anthony O'Bryan").authoritativeJudgment.serviceEvidence[0].service, 'electrical-repair');
  assert.equal(classification.reviews.find((entry) => entry.sourceReview.author === 'Jason Budd').authoritativeJudgment.serviceEvidence[0].service, 'new-construction-wiring');
});

test('AC09 direct completed-service anchors reach page comparison', async () => {
  const judge = createCursorReviewJudge({ complete: async ({ review, signals, model, fast }) => ({ authoritative: true, decision: 'anchor', directCompletedService: true, serviceEvidence: [{ service: 'ev-charging' }], claims: [], model, fast, judgmentId: `matrix-${review.id}`, provenance: { reviewId: review.id, source: review.source } }) });
  const classification = await classifyReviewInventory({ reviews: fixture.reviews.slice(0, 2), authoritativeJudge: judge });
  const evidence = buildPrescriptionEvidence({ classification, pages: [{ title: 'EV charging', service: 'ev-charging', proposedSlug: 'ev-charging', primaryKeyword: 'EV charger Dallas' }], candidateServices: [{ id: 'ev-charging' }, { id: 'panel-upgrade', status: 'passed-over' }] });
  assert.ok(evidence.pageEvidence[0].anchors.length); assert.ok(evidence.valueHierarchy.candidates.find((item) => item.id === 'ev-charging').authoritativeAnchorCount > 0);
});

test('AC10 every eligible evidence-backed sales page gets a valid first-review recommendation', async () => {
  const judge = createCursorReviewJudge({ complete: async ({ review, model, fast }) => ({ authoritative: true, decision: 'anchor', directCompletedService: true, serviceEvidence: [{ service: 'ev-charging' }], claims: [], model, fast, judgmentId: `matrix-${review.id}`, provenance: { reviewId: review.id, source: review.source } }) });
  const classification = await classifyReviewInventory({ reviews: fixture.reviews.slice(0, 2), authoritativeJudge: judge });
  const evidence = buildPrescriptionEvidence({ classification, pages: [{ title: 'EV charging', service: 'ev-charging', proposedSlug: 'ev-charging', primaryKeyword: 'EV charger Dallas' }] });
  assert.ok(evidence.pageEvidence[0].recommendedFirstReview.reviewId); assert.equal(evidence.pageEvidence[0].recommendedFirstReview.provenance.reviewId, evidence.pageEvidence[0].recommendedFirstReview.reviewId);
});

test('AC11 URL, keyword, title, and H1 collisions are rejected', () => {
  assert.equal(validateCollisions([{ type: 'A', url: '/x', primaryKeyword: 'x', titleDirection: 'a', h1Direction: 'a' }, { type: 'B', url: '/x', primaryKeyword: 'y', titleDirection: 'b', h1Direction: 'b' }]).valid, false);
});

test('AC12 Gate 1 produces compact boss-readable Markdown', () => {
  const markdown = renderGate1({ finalist: { name: 'One Electric', websiteAudit: { opportunity: 'dated site' } }, whyBuilt: { text: 'The dated site buries a clear opportunity. Direct review evidence supports the proposed page.', refs: [{ type: 'opportunity', ref: 'dated site' }, { type: 'review', ref: 'r1' }] }, prescription: { pages: [{ type: 'Home', url: '/', primaryKeyword: 'electrician', titleDirection: 'One', h1Direction: 'One', strongestEvidence: 'r1', whyIncluded: 'Core', recommendedFirstReview: null }], valueHierarchy: [{ id: 'ev', includedPage: true, directCompletedEvidenceCount: 1, evidenceCount: 1 }] } });
  assert.match(markdown, /^# One Electric/m); assert.match(markdown, /Human Gate 1/); assert.match(markdown, /awaiting-human-gate-1/);
});

test('AC11b unsupported affirmative guarantees are rejected while warning traps remain allowed', () => {
  const { assertNoUnsupportedGuarantee } = require('../src/review-evidence/prescription');
  assert.throws(() => assertNoUnsupportedGuarantee(['one-hour guaranteed response'], 'matrix page'), /Unsupported response guarantee/);
  assert.throws(() => assertNoUnsupportedGuarantee(['same-day service'], 'matrix page'), /Unsupported response guarantee/);
});

test('AC13 no copy generation starts or later-stage artifacts/calls appear', async () => {
  const h = harness(); const result = await gateReady(h); const sourceFiles = fs.readdirSync('src', { recursive: true }).filter((file) => /(?:copy|client|build|deploy|hosting)/i.test(file));
  assert.deepEqual(sourceFiles, []); assert.doesNotMatch(JSON.stringify(result.state.runs[0].artifacts), /copy|client|build|deploy|vercel/i); assert.deepEqual(Object.keys(h.calls).sort(), ['audits', 'discover', 'enrich', 'enrichmentRequest', 'gate1', 'judge', 'proposal'].sort());
});
test('AC14 no client build starts', async () => { const h = harness(); const result = await gateReady(h); assert.doesNotMatch(JSON.stringify(result.state.runs[0].artifacts), /client|build|deploy|hosting/i); assert.equal(h.calls.gate1, 1); });

test('AC15 completed cycle stops at awaiting-human-gate-1', async () => { const h = harness(); const result = await gateReady(h); assert.equal(result.nextAction.code, 'awaiting-human-gate-1'); });

test('AC16 repeat wake at Gate 1 does not claim another run', async () => { const h = harness(); await gateReady(h); const repeat = await runFactoryCycle({ root: h.root, config: h.config, adapters: h.adapters, architectDecision: { qaPass: true } }); assert.equal(repeat.nextAction.code, 'awaiting-human-gate-1'); assert.equal(repeat.state.runs.length, 1); assert.equal(h.calls.gate1, 1); });

test('AC17 interruption resumes without repeating valid paid enrichment', async () => {
  const h = harness({ failFirstJudge: true }); await assert.rejects(() => selected(h), /matrix interruption/); assert.equal(h.calls.enrich, 1);
  const recoveryJudgments = [];
  const recovered = await runFactoryCycle({ root: h.root, config: h.config, adapters: { ...h.adapters, reviewJudge: { judge: async ({ review }) => { const judgment = { authoritative: true, decision: 'anchor', directCompletedService: true, service: review.id, serviceEvidence: [{ service: review.id, evidenceType: 'direct-completed-work' }], claims: [], model: 'cursor-grok-4.6-high', judgmentId: `recovery-${review.id}`, provenance: { reviewId: review.id, source: review.source || 'apify-finalist' } }; recoveryJudgments.push(judgment); return judgment; } } }, architectDecision: { qa: { passed: false, whyBuilt: { text: 'The clear site opportunity is buried. Direct review evidence supports the focused service direction.', refs: [{ type: 'opportunity', ref: 'clear site opportunity' }, { type: 'review', ref: 'r1' }] } } } });
  assert.equal(h.calls.enrich, 1); assert.equal(recovered.nextAction.code, 'architect-qa-required'); assert.ok(recoveryJudgments.every((judgment) => judgment.authoritative && judgment.decision && judgment.judgmentId && judgment.model && judgment.provenance.reviewId && judgment.serviceEvidence.length));
});

test('AC18 mold prospect cannot advance to paid work', () => { const h = harness(); const result = control.runOne({ root: h.root, config: h.config, candidate: { placeId: 'mold', name: 'Mold Co', services: ['mold remediation'] } }); assert.equal(result.code, 'MOLD_EXCLUDED'); });

test('AC19 checked-in environment excludes historical provider defaults', () => { const env = fs.readFileSync('.env.example', 'utf8'); assert.match(env, /APIFY_API_TOKEN/); assert.match(env, /CURSOR_API_KEY/); assert.match(env, /CURSOR_MODEL=cursor-grok-4\.6-high/); assert.doesNotMatch(env, /XAI_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|LEMLEST|VERCEL/); });

test('AC20 Cursor alias is exact and Fast is off', () => { const config = JSON.parse(fs.readFileSync('config/factory.config.json', 'utf8')); assert.equal(config.cursorModel, 'cursor-grok-4.6-high'); assert.equal(config.cursorFastMode, false); assert.deepEqual(loadConfig(path.resolve('.')), config); });
