const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const childProcess = require('node:child_process');
const { inventoryForQa, runFactoryCycle, writeAtomic } = require('../src/factory/orchestrator');
const { loadState } = require('../src/factory/control-plane');
const { parseArgs } = require('../src/run-one');

function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-integration-'));
  fs.mkdirSync(path.join(root, 'config'), { recursive: true });
  const config = { productionCapacity: 1, maxDiscoveryCandidates: 7, cursorModel: 'cursor-grok-4.6-high', cursorFastMode: false };
  fs.writeFileSync(path.join(root, 'config', 'factory.config.json'), JSON.stringify(config));
  return { root, config };
}

function adapters({ failJudge = false } = {}) {
  const calls = { discover: 0, audit: 0, enrich: 0, judge: 0, proposal: 0, gate1: 0 };
  const candidates = [
    { placeId: 'one', name: 'One Electric', category: 'Electrician', location: 'Dallas, TX', website: 'https://one.example', mapsUrl: 'https://maps.google.com/?cid=one' },
    { placeId: 'two', name: 'Two Electric', category: 'Electrician', location: 'Dallas, TX', website: 'https://two.example', mapsUrl: 'https://maps.google.com/?cid=two' },
    { placeId: 'three', name: 'Three Electric', category: 'Electrician', location: 'Dallas, TX', website: 'https://three.example', mapsUrl: 'https://maps.google.com/?cid=three' },
  ];
  const reviews = [
    { id: 'r1', author: 'Allen', rating: 5, date: '2026-01-01', source: 'apify-finalist', text: 'Installed an EV charger.' },
    { id: 'r2', author: 'Anthony', rating: 5, date: '2026-01-02', source: 'apify-finalist', text: 'Repaired a panel.' },
  ];
  const proposal = {
    services: [{ id: 'ev-charging', name: 'EV charging' }, { id: 'panel-upgrade', name: 'Panel upgrade', passedOverReason: 'No direct anchor.' }],
    pages: [
      { type: 'Home', service: 'home', url: '/', primaryKeyword: 'electrician dallas', titleDirection: 'One Electric | Dallas electrical work', h1Direction: 'Electrical work grounded in real jobs', angle: 'Lead with verified local work.', whyIncluded: 'Core entry page.', overlapBoundaries: 'Keep service specifics on service pages.', claims: [], traps: [], strongestEvidence: 'r1', recommendedFirstReview: { reviewId: 'r1', reviewer: 'Allen', rating: 5, date: '2026-01-01', exactText: reviews[0].text, why: 'Direct completed work.' } },
      { type: 'Service', service: 'ev-charging', url: '/ev-charging', primaryKeyword: 'EV charger installation Dallas', titleDirection: 'EV Charger Installation in Dallas', h1Direction: 'EV charging installed for your parking needs', angle: 'Make the direct installation proof easy to find.', whyIncluded: 'Direct completed installation evidence.', overlapBoundaries: 'Do not duplicate panel repair.', claims: [], traps: [], strongestEvidence: 'r1', recommendedFirstReview: { reviewId: 'r1', reviewer: 'Allen', rating: 5, date: '2026-01-01', exactText: reviews[0].text, why: 'Direct completed EV charging work.' } },
      { type: 'Contact', service: 'contact', url: '/contact', primaryKeyword: 'contact One Electric', titleDirection: 'Contact One Electric', h1Direction: 'Talk with One Electric', angle: 'Give ready prospects a clear next step.', whyIncluded: 'Conversion page.', overlapBoundaries: 'No service claims.', claims: [], traps: [], strongestEvidence: null, recommendedFirstReview: null },
    ],
  };
  return {
    calls, candidates, proposal,
    discovery: { discoverCandidates: async ({ searchStrings, location, limit }) => { calls.discover++; assert.deepEqual(searchStrings, ['electrician']); assert.equal(location, 'Dallas, TX'); return { kind: 'discovery-candidates', candidates: candidates.slice(0, limit), request: { searchStrings, location }, provenance: { run: { provider: 'apify', status: 'completed', runId: 'd1' } } }; } },
    websiteAudit: { audit: async ({ candidate }) => { calls.audit++; return { audit: { inspected: true, opportunity: 'buried service evidence', siteCopyEvidence: ['service page'], ownedGraphicEvidence: [{ id: 'graphic-1', text: 'EV charger' }], graphicsInspection: { status: 'inspected', findings: [{ id: 'graphic-1' }] }, publicImageUrls: [] }, receipt: { provider: 'cursor', jobId: `a-${candidate.placeId}`, status: 'completed' } }; } },
    enrichment: { enrichFinalist: async ({ placeId, limit, dateWindow }) => { calls.enrich++; assert.equal(placeId, 'one'); assert.equal(limit, 50); assert.equal(dateWindow, null); return { kind: 'finalist-review-enrichment', placeId, requestedReviewLimit: 50, dateWindow: null, listingReviewCount: 2, retrievalCompleteness: 'complete', reviews, emptyTextReviews: [], receipt: { provider: 'apify', runId: 'f1', status: 'completed' } }; } },
    reviewJudge: { judge: async ({ review }) => { calls.judge++; if (failJudge && calls.judge === 1) throw new Error('simulated interruption'); const service = review.id === 'r1' ? 'ev-charging' : 'panel-upgrade'; return { authoritative: true, decision: 'anchor', directCompletedService: true, serviceEvidence: [{ service, evidenceType: 'completed-service', excerpt: review.text }], availabilityEvidence: [], claims: [], judgmentId: `j-${review.id}`, model: 'cursor-grok-4.6-high', provenance: { reviewId: review.id, source: review.source }, judgedAt: '2026-01-03' }; } },
    prescriber: { propose: async ({ classification }) => { calls.proposal++; assert.equal(classification.authoritativeJudgmentCount, 2); return { proposal, receipt: { provider: 'cursor', status: 'completed', jobId: 'p1' } }; } },
    gate1: { render: async ({ finalist, prescription, whyBuilt }) => { calls.gate1++; return `# ${finalist.name}\n\n## Why We Built This Site\n\n${whyBuilt.text}\n\n## Page Prescription\n\n${prescription.pages.map((page) => page.url).join(', ')}`; } },
  };
}

const request = { searchStrings: ['electrician'], location: 'Dallas, TX' };
const selection = { qualifiedPlaceIds: ['one', 'two'], selectedPlaceId: 'one' };
const whyBuilt = { text: 'One Electric has a clear local opportunity in buried service evidence. The direct EV charging review and inspected owned graphic support a focused page direction.', refs: [{ type: 'opportunity', ref: 'buried service evidence' }, { type: 'review', ref: 'r1' }, { type: 'graphic', ref: 'graphic-1' }] };

test('fresh request persists discovery receipt, uses candidate contracts, preserves backlog, and stops at explicit QA', async () => {
  const { root, config } = setup();
  const api = adapters();
  let result = await runFactoryCycle({ root, config, adapters: api, discoveryRequest: request });
  assert.equal(result.nextAction.code, 'architect-candidate-review-required');
  assert.equal(result.candidateBench.length, 3);
  let state = loadState(root, config);
  assert.deepEqual(state.discoveryRequest, request);
  assert.equal(state.discoveryPacket.provenance.run.runId, 'd1');
  assert.equal(state.auditReceipts.one.jobId, 'a-one');
  assert.equal(api.calls.audit, 3);

  result = await runFactoryCycle({ root, config, adapters: api, architectDecision: { selection } });
  assert.equal(result.nextAction.code, 'architect-qa-required');
  assert.equal(api.calls.enrich, 1);
  assert.equal(api.calls.proposal, 1);
  state = loadState(root, config);
  assert.equal(state.queue.length, 1);
  assert.equal(state.activeRun.stage, 'architect-qa');

  result = await runFactoryCycle({ root, config, adapters: api, architectDecision: { qa: { passed: true, whyBuilt } } });
  assert.equal(result.nextAction.code, 'awaiting-human-gate-1');
  assert.equal(api.calls.enrich, 1);
  assert.equal(api.calls.proposal, 1);
  assert.equal(api.calls.gate1, 1);
  state = loadState(root, config);
  assert.equal(state.activeRun.status, 'awaiting-human-gate-1');
  assert.match(state.activeRun.artifacts.gate1.markdown, /Page Prescription/);
  assert.equal(fs.existsSync(path.join(root, state.activeRun.artifacts.gate1.path)), true);
});

test('interrupted classification resumes without repeating finalist enrichment', async () => {
  const { root, config } = setup();
  const failing = adapters({ failJudge: true });
  await assert.rejects(() => runFactoryCycle({ root, config, adapters: failing, discoveryRequest: request, architectDecision: { selection } }), /simulated interruption/);
  assert.equal(failing.calls.enrich, 1);
  const recovered = adapters();
  const result = await runFactoryCycle({ root, config, adapters: recovered, architectDecision: { qa: { passed: false, whyBuilt } } });
  assert.equal(result.nextAction.code, 'architect-qa-required');
  assert.equal(recovered.calls.enrich, 0);
  assert.equal(recovered.calls.proposal, 1);
});

test('Architect corrections are validated and cannot infer a pass from Cursor', async () => {
  const { root, config } = setup();
  const api = adapters();
  await runFactoryCycle({ root, config, adapters: api, discoveryRequest: request, architectDecision: { selection } });
  let result = await runFactoryCycle({ root, config, adapters: api, architectDecision: { qa: { passed: false, whyBuilt } } });
  assert.equal(result.nextAction.code, 'architect-qa-required');
  result = await runFactoryCycle({ root, config, adapters: api, architectDecision: { qa: { passed: true, whyBuilt } } });
  assert.equal(result.nextAction.code, 'awaiting-human-gate-1');
});

test('Architect correction reaches the pre-validation proposal boundary without repeating paid work', async () => {
  const { root, config } = setup();
  const api = adapters();
  const invalidPages = api.proposal.pages.map((page) => ({ ...page }));
  invalidPages[1] = {
    ...invalidPages[1],
    recommendedFirstReview: {
      reviewId: 'r2', reviewer: 'Anthony', rating: 5, date: '2026-01-02',
      exactText: 'Repaired a panel.', why: 'Wrong service on purpose.',
    },
  };
  api.prescriber.propose = async ({ classification, decision }) => {
    api.calls.proposal++;
    assert.equal(classification.authoritativeJudgmentCount, 2);
    return {
      proposal: {
        ...api.proposal,
        pages: decision.pages || invalidPages,
        architectReview: decision.architectReview || null,
      },
      receipt: { provider: 'cursor', status: 'completed', jobId: 'p1' },
    };
  };

  await runFactoryCycle({ root, config, adapters: api, discoveryRequest: request });
  const result = await runFactoryCycle({
    root,
    config,
    adapters: api,
    architectDecision: {
      selection,
      qa: { passed: true, whyBuilt, corrections: { pages: api.proposal.pages } },
    },
  });

  assert.equal(result.nextAction.code, 'awaiting-human-gate-1');
  assert.equal(api.calls.enrich, 1);
  assert.equal(api.calls.proposal, 1);
  assert.equal(api.calls.gate1, 1);
  assert.equal(result.run.artifacts.prescription.pages[1].recommendedFirstReview.reviewId, 'r1');
});

test('enrichment truth checks reject wrong place, sample/limit five, and partial five of 110', () => {
  const classification = { writtenReviewCount: 5, emptyReviewCount: 0, authoritativeJudgmentCount: 5 };
  const finalist = { placeId: 'expected' };
  const base = { placeId: 'expected', requestedLimit: 50, dateWindow: null, listingReviewCount: 5, reviews: [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }], emptyTextReviews: [] };
  assert.equal(inventoryForQa(classification, { ...base, placeId: 'wrong' }, finalist).enrichmentStatus, 'incomplete');
  assert.equal(inventoryForQa(classification, { ...base, requestedLimit: 5, discoverySampleOnly: true }, finalist).enrichmentStatus, 'incomplete');
  assert.equal(inventoryForQa(classification, { ...base, listingReviewCount: 110 }, finalist).enrichmentStatus, 'incomplete');
  assert.equal(inventoryForQa(classification, { ...base, reviews: Array.from({ length: 47 }, (_, index) => ({ id: `w${index}` })), emptyTextReviews: [{ id: 'e1' }, { id: 'e2' }, { id: 'e3' }], listingReviewCount: 110 }, finalist).enrichmentStatus, 'sufficient');
  const { dateWindow, ...omittedDateWindow } = base;
  assert.equal(inventoryForQa(classification, omittedDateWindow, finalist).enrichmentStatus, 'incomplete');
});

test('invalid Architect page correction is rejected through prescription validation', async () => {
  const { root, config } = setup();
  const api = adapters();
  await runFactoryCycle({ root, config, adapters: api, discoveryRequest: request, architectDecision: { selection } });
  const current = loadState(root, config).activeRun.artifacts.cursorProposal.pages;
  const duplicatePages = [current[0], { ...current[1], url: current[0].url }];
  const result = await runFactoryCycle({ root, config, adapters: api, architectDecision: { qa: { passed: true, whyBuilt, corrections: { pages: duplicatePages } } } });
  assert.equal(result.nextAction.code, 'architect-qa-required');
  assert.match(result.nextAction.correctionError, /collision|Prescription validation/);
  assert.equal(loadState(root, config).activeRun.status, 'active');
});

test('run-one CLI forwards a JSON discovery request to the adapter-composed cycle', () => {
  const { root } = setup();
  const requestFile = path.join(root, 'request.json');
  const adaptersFile = path.join(root, 'adapters.js');
  fs.writeFileSync(requestFile, JSON.stringify(request));
  fs.writeFileSync(adaptersFile, `module.exports = {
    discovery: { discoverCandidates: async ({ searchStrings, location }) => ({
      candidates: [{ placeId: 'cli-one', name: 'CLI Electric', category: 'Electrician', location, website: 'https://cli.example' }],
      request: { searchStrings, location },
      provenance: { run: { provider: 'test', runId: 'cli-discovery' } }
    }) },
    websiteAudit: { audit: async () => ({ inspected: true, opportunity: 'cli opportunity', graphicsInspection: { status: 'inspected', findings: [] } }) }
  };\n`);

  assert.deepEqual(parseArgs(['node', 'run-one', '--json', '--request', 'request.json', '--adapters', 'adapters.js']), {
    json: true,
    production: false,
    candidate: null,
    decision: null,
    request: 'request.json',
    adapters: 'adapters.js',
    seedDiscovery: null,
    owner: 'architect',
  });
  const result = childProcess.spawnSync(process.execPath, [path.join(__dirname, '..', 'src', 'run-one.js'), '--json', '--request', 'request.json', '--adapters', 'adapters.js'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.nextAction.code, 'architect-candidate-review-required');
  assert.deepEqual(output.state.discoveryRequest, request);
});

test('discovery and audit joins use maps URLs when place IDs are absent', async () => {
  const { root, config } = setup();
  const candidates = [
    { name: 'Maps One', category: 'Electrician', location: 'Dallas, TX', mapsUrl: 'https://maps.example/one', website: 'https://one.example' },
    { name: 'Maps Two', category: 'Electrician', location: 'Dallas, TX', mapsUrl: 'https://maps.example/two', website: 'https://two.example' },
  ];
  const result = await runFactoryCycle({
    root,
    config,
    discoveryRequest: request,
    adapters: {
      discovery: { discoverCandidates: async () => ({ candidates }) },
      websiteAudit: { audit: async ({ candidate }) => ({ audit: { inspected: true, opportunity: candidate.mapsUrl, graphicsInspection: { status: 'inspected', findings: [] } }, receipt: { jobId: `audit-${candidate.mapsUrl.split('/').pop()}` } }) },
    },
  });
  assert.equal(result.nextAction.code, 'architect-candidate-review-required');
  assert.deepEqual(result.candidateBench.map((entry) => entry.websiteAudit.opportunity), candidates.map((candidate) => candidate.mapsUrl));
  assert.deepEqual(Object.keys(result.state.auditReceipts).sort(), ['https://maps.example/one', 'https://maps.example/two']);
});

test('Gate 1 writer writes a temporary artifact before an atomic rename', () => {
  const calls = [];
  writeAtomic('/state/gate1/run-1.md', '# Gate 1\n', {
    writeFileSync: (filename, contents, encoding) => calls.push(['write', filename, contents, encoding]),
    renameSync: (temporary, filename) => calls.push(['rename', temporary, filename]),
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[0][0], 'write');
  assert.match(calls[0][1], /run-1\.md\.\d+\.tmp$/);
  assert.equal(calls[0][2], '# Gate 1\n');
  assert.equal(calls[1][0], 'rename');
  assert.equal(calls[1][1], calls[0][1]);
  assert.equal(calls[1][2], '/state/gate1/run-1.md');
});
