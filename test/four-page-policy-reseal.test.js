'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { STANDARD_PRESCRIPTION_POLICY, pageId, pageSetDigest, validatePagePolicy, digest } = require('../src/factory/prescription-policy');
const { resealCheckpoint, EXPECTED_360_CHECKPOINT, validateRejectedRouteLanguage } = require('../src/factory/reseal');

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

const TEST_COVERAGE = { inspected: true, inspectedPageUrls: ['/'], matchingPageUrls: [], hasCorrespondingPage: false, crawlRefs: ['test-crawl'], absenceEvidence: { kind: 'test-absence', crawlRefs: ['test-crawl'] } };
const TEST_SOURCE_IDENTITY = { provider: 'repository-test-fixture', runId: 'run-1', artifactId: 'artifact-1', sourceSha: 'abc', rootIdentity: 'test-artifact-root:artifact-1' };
const TEST_SOURCE_ARTIFACT_DIGEST = 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const TEST_LEDGER = { version: 'canonical-service-coverage-ledger-v1', prospectId: 'unit-prospect', placeId: 'unit-place', runId: 'run-1', sourceIdentity: TEST_SOURCE_IDENTITY, aliases: {}, services: [
  { id: 'repair', name: 'Repair', reviewIds: [], currentSitePageUrls: [], siteAuditCoverage: TEST_COVERAGE },
  { id: 'installation', name: 'Installation', reviewIds: [], currentSitePageUrls: [], siteAuditCoverage: TEST_COVERAGE },
  { id: 'opener', name: 'Opener', reviewIds: [], currentSitePageUrls: [], siteAuditCoverage: TEST_COVERAGE },
] };

function policyPages(pages) {
  return pages.map((item) => item.type === 'Service' ? { ...item, canonicalIntentId: item.service } : { ...item });
}

test('standard policy rejects three pages and five/six pages', () => {
  assert.throws(() => validatePagePolicy({ pages: standardPages(1), services: services(), serviceLedger: TEST_LEDGER }), /exactly 2 Service pages/);
  assert.throws(() => validatePagePolicy({ pages: [...standardPages(), page('Service', '/opener', 'opener')], services: services(), serviceLedger: TEST_LEDGER }), /exactly four business pages|exactly 2 Service pages/);
  assert.throws(() => validatePagePolicy({ pages: [...standardPages(), page('Service', '/opener', 'opener'), page('Service', '/extra', 'extra')], services: [...services(), { id: 'extra', directCompletedEvidenceCount: 1 }], serviceLedger: { ...TEST_LEDGER, services: [...TEST_LEDGER.services, { id: 'extra', name: 'Extra', reviewIds: [], currentSitePageUrls: [] }] } }), /exactly four business pages|exactly 2 Service pages/);
});

test('standard policy selects only the top two evidence-backed service destinations and preserves all candidates', () => {
  const result = validatePagePolicy({ pages: standardPages(), services: services(), serviceLedger: TEST_LEDGER });
  assert.deepEqual(result.selectedServiceIds, ['repair', 'installation']);
  assert.equal(result.policy.businessPageCount, 4);
  assert.equal(result.policy.servicePageCount, 2);
});

test('valid one-off expansion requires an explicit durable approval bound to the run and page set', () => {
  const pages = policyPages([...standardPages(), page('Service', '/opener', 'opener')]);
  const sourceBinding = { sourceIdentity: TEST_SOURCE_IDENTITY };
  const evidenceDigest = digest({ test: 'evidence' });
  const unsigned = { mode: 'expanded-one-off', overrideId: 'override-1', prospectId: 'unit-prospect', runId: 'run-1', policyVersion: STANDARD_PRESCRIPTION_POLICY.version, approvedPageIds: pages.map(pageId).sort(), approvedCanonicalIntentIds: ['installation', 'opener', 'repair'], approvedBy: 'Josh Lenz', approvedAt: '2026-08-24', expiresAt: '2026-12-31', reason: 'Documented one-off proposal approved for this prospect.', sourceArtifactDigest: TEST_SOURCE_ARTIFACT_DIGEST, evidenceDigest, pageSetDigest: pageSetDigest(pages) };
  const override = { ...unsigned, overrideDigest: digest(unsigned) };
  const result = validatePagePolicy({ pages, services: services(), serviceLedger: TEST_LEDGER, override, runContext: { prospectId: 'unit-prospect', placeId: 'unit-place', runId: 'run-1', now: '2026-08-24' }, sourceBinding: { ...sourceBinding, sourceArtifactDigest: TEST_SOURCE_ARTIFACT_DIGEST }, evidenceDigest });
  assert.equal(result.policyMode, 'expanded-one-off');
  assert.equal(result.allowedServicePageCount, 3);
  assert.equal(result.override.overrideDigest, override.overrideDigest);
  assert.throws(() => validatePagePolicy({ pages, services: services(), serviceLedger: TEST_LEDGER, override: { ...override, pageSetDigest: digest('tampered') }, runContext: { prospectId: 'unit-prospect', placeId: 'unit-place', runId: 'run-1', now: '2026-08-24' }, sourceBinding: { ...sourceBinding, sourceArtifactDigest: TEST_SOURCE_ARTIFACT_DIGEST }, evidenceDigest }), /page-set digest mismatch/);
  assert.throws(() => validatePagePolicy({ pages, services: services(), serviceLedger: TEST_LEDGER, override: { ...override, expiresAt: '2020-01-01' }, runContext: { prospectId: 'unit-prospect', placeId: 'unit-place', runId: 'run-1', now: '2026-08-24' }, sourceBinding: { ...sourceBinding, sourceArtifactDigest: TEST_SOURCE_ARTIFACT_DIGEST }, evidenceDigest }), /dates are invalid|stale/);
  assert.throws(() => validatePagePolicy({ pages, services: services(), serviceLedger: TEST_LEDGER, override: { ...override, runId: 'other-run' }, runContext: { prospectId: 'unit-prospect', placeId: 'unit-place', runId: 'run-1', now: '2026-08-24' }, sourceBinding: { ...sourceBinding, sourceArtifactDigest: TEST_SOURCE_ARTIFACT_DIGEST }, evidenceDigest }), /run mismatch|digest is invalid/);
  assert.throws(() => validatePagePolicy({ pages, services: services(), serviceLedger: TEST_LEDGER, override: { ...override, approvedBy: undefined }, runContext: { prospectId: 'unit-prospect', placeId: 'unit-place', runId: 'run-1', now: '2026-08-24' }, sourceBinding: { ...sourceBinding, sourceArtifactDigest: TEST_SOURCE_ARTIFACT_DIGEST }, evidenceDigest }), /missing approvedBy/);
});

test('service alias collisions fail closed', () => {
  assert.throws(() => validatePagePolicy({ pages: standardPages(), services: [{ id: 'garage-door-repair', directCompletedEvidenceCount: 2 }, { id: 'garage door repair', directCompletedEvidenceCount: 2 }], serviceLedger: { ...TEST_LEDGER, services: [{ id: 'garage-door-repair', name: 'Garage door repair', reviewIds: [], currentSitePageUrls: [] }, { id: 'garage-door-installation', name: 'Garage door installation', reviewIds: [], currentSitePageUrls: [] }] } }), /unmapped|canonical/);
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
  const serviceForReview = new Map(candidateServices.flatMap((service) => service.directEvidenceReviewIds.map((id) => [id, service.id])));
  const classification = { reviews: reviews.map((review) => ({ id: review.id, sourceReview: review, authoritative: true, authoritativeJudgment: { serviceEvidence: serviceForReview.has(review.id) ? [{ service: serviceForReview.get(review.id) }] : [] } })) };
  const websiteAudit = { inspected: true, siteCopyEvidence: [{ id: 'full-service-line', sourceUrl: 'https://360.example/', alsoOn: ['https://360.example/services/', 'https://360.example/contact/'] }] };
  const state = { runs: [{ runId: 'run-49c4e3d8b15c4008ae13', prospectId: 'prospect-360', candidate: { placeId: 'place-360', websiteAudit }, artifacts: { reviewPacket: packet, classification, prescription: { pages: oldPages, prospect: { name: '360 Garage Door and More', placeId: 'place-360' } }, cursorProposal: { cursorComparison: { candidates: candidateServices } } } }] };
  const coverage = (matchingPageUrls, hasCorrespondingPage) => ({ inspected: true, inspectedPageUrls: ['https://360.example/', 'https://360.example/services/', 'https://360.example/contact/'], matchingPageUrls, hasCorrespondingPage, crawlRefs: ['full-service-line'], ...(hasCorrespondingPage ? {} : { absenceEvidence: { kind: 'no-corresponding-service-page', crawlRefs: ['full-service-line'] } }) });
  const ledger = { version: 'canonical-service-coverage-ledger-v1', prospectId: 'prospect-360', placeId: 'place-360', runId: '32717620900', sourceIdentity: { provider: 'repository-test-fixture', runId: '32717620900', artifactId: '9516514426', sourceSha: 'test-source-sha-360', archiveName: 'ff-reseal-test.zip', archiveSha256: 'PENDING', rootIdentity: 'test-artifact-root:9516514426' }, aliases: { 'garage-door-spring-repair': 'garage-door-repair', 'garage-door-opener-installation': 'home-breadth' }, services: [
    { id: 'garage-door-repair', name: 'Garage door repair', reviewIds: [...new Set([...candidateServices[0].directEvidenceReviewIds, ...candidateServices[2].directEvidenceReviewIds])], currentSitePageUrls: [], siteAuditCoverage: coverage([], false) },
    { id: 'garage-door-installation', name: 'Garage door installation', reviewIds: candidateServices[1].directEvidenceReviewIds, currentSitePageUrls: [], siteAuditCoverage: coverage([], false) },
    { id: 'home-breadth', name: 'Home-level breadth', reviewIds: candidateServices[3].directEvidenceReviewIds, currentSitePageUrls: ['/'], siteAuditCoverage: coverage(['/'], true) },
  ] };
  const checkpoint = { ...EXPECTED_360_CHECKPOINT, sourceSha: 'test-source-sha-360' };
  const approval = { approvedBy: 'Josh Lenz', approvedAt: '2026-08-24', approvedRoutes: ['/', '/garage-door-repair', '/garage-door-installation', '/contact'], reason: 'Josh approved standard four-page prescription.' };
  const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-reseal-artifact-'));
  fs.mkdirSync(path.join(artifactRoot, 'canary', 'outputs'), { recursive: true });
  fs.mkdirSync(path.join(artifactRoot, 'state'), { recursive: true });
  fs.writeFileSync(path.join(artifactRoot, 'canary', 'outputs', 'checkpoint.json'), `${JSON.stringify(checkpoint)}\n`);
  fs.writeFileSync(path.join(artifactRoot, 'state', 'factory-state.json'), `${JSON.stringify(state)}\n`);
  const files = ['canary/outputs/checkpoint.json', 'state/factory-state.json'].map((file) => `${crypto.createHash('sha256').update(fs.readFileSync(path.join(artifactRoot, file))).digest('hex')}  ${file}`);
  fs.writeFileSync(path.join(artifactRoot, 'canary', 'outputs', 'manifest.sha256'), `${files.sort().join('\n')}\n`);
  for (const file of ['canary/outputs/checkpoint.json', 'state/factory-state.json', 'canary/outputs/manifest.sha256']) fs.utimesSync(path.join(artifactRoot, file), new Date(0), new Date(0));
  const archivePath = path.join(os.tmpdir(), 'ff-reseal-test.zip');
  try { fs.unlinkSync(archivePath); } catch {}
  execFileSync('zip', ['-X', '-q', '-r', archivePath, 'canary/outputs/checkpoint.json', 'state/factory-state.json', 'canary/outputs/manifest.sha256'], { cwd: artifactRoot });
  const archiveSha256 = crypto.createHash('sha256').update(fs.readFileSync(archivePath)).digest('hex');
  return { ids, state, checkpoint, ledger: { ...ledger, sourceIdentity: { ...ledger.sourceIdentity, archiveSha256 } }, approval, oldPages, artifactRoot, archivePath, identityKey: '32717620900:9516514426:test-source-sha-360', archiveSha256 };
}

test('exact 360 four-page derivative preserves evidence, folds spring repair, and keeps opener evidence Home-only', () => {
  const fixture = resealFixture();
  const before = JSON.stringify(fixture.state);
  const result = resealCheckpoint({ checkpoint: fixture.checkpoint, artifactRoot: fixture.artifactRoot, artifactArchivePath: fixture.archivePath, identityKey: fixture.identityKey, state: fixture.state, canonicalServiceLedger: fixture.ledger, approval: fixture.approval });
  assert.deepEqual(result.vendorBoundaryProof, { boundary: 'no-vendor-reseal-core', apifyCalls: 0, cursorCalls: 0 });
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
  const base = { artifactRoot: fixture.artifactRoot, artifactArchivePath: fixture.archivePath, identityKey: fixture.identityKey, state: fixture.state, canonicalServiceLedger: fixture.ledger, approval: fixture.approval };
  assert.throws(() => resealCheckpoint({ ...base, checkpoint: { ...fixture.checkpoint, sourceSha: 'tampered' } }), /checkpoint/);
  assert.throws(() => resealCheckpoint({ ...base, checkpoint: fixture.checkpoint, approval: { ...fixture.approval, approvedBy: 'Someone Else' } }), /approval/);
  const tamperedState = JSON.parse(fs.readFileSync(path.join(fixture.artifactRoot, 'state', 'factory-state.json'), 'utf8'));
  tamperedState.tampered = true;
  fs.writeFileSync(path.join(fixture.artifactRoot, 'state', 'factory-state.json'), `${JSON.stringify(tamperedState)}\n`);
  assert.throws(() => resealCheckpoint({ ...base, checkpoint: fixture.checkpoint, state: fixture.state }), /caller state|artifact (?:archive )?content digest|archive content mismatch/);
  assert.throws(() => resealCheckpoint({ ...base, checkpoint: fixture.checkpoint, state: tamperedState }), /artifact (?:archive )?content digest|archive content mismatch/);
  assert.throws(() => resealCheckpoint({ ...base, vendorAdapters: { apify: {} } }), /adapter injection/);
});

test('canonical ledger rejects unmapped generic intents and duplicate canonical page families', () => {
  const ledger = { version: 'canonical-service-coverage-ledger-v1', prospectId: 'unit-prospect', placeId: 'unit-place', aliases: { spring: 'repair', 'spring-replacement': 'repair' }, services: [{ id: 'repair', name: 'Repair', reviewIds: [], currentSitePageUrls: [], siteAuditCoverage: TEST_COVERAGE }, { id: 'installation', name: 'Installation', reviewIds: [], currentSitePageUrls: [], siteAuditCoverage: TEST_COVERAGE }] };
  assert.throws(() => validatePagePolicy({ pages: standardPages(), services: [{ id: 'unknown-intent', directCompletedEvidenceCount: 3 }, { id: 'installation', directCompletedEvidenceCount: 2 }], serviceLedger: ledger }), /mapped/);
  assert.throws(() => validatePagePolicy({ pages: [page('Home', '/'), page('Service', '/repair-a', 'spring'), page('Service', '/repair-b', 'spring-replacement'), page('Contact', '/contact', 'contact')], services: [{ id: 'spring', directCompletedEvidenceCount: 3 }, { id: 'spring-replacement', directCompletedEvidenceCount: 2 }], serviceLedger: ledger }), /canonical family/);
  assert.throws(() => validatePagePolicy({ pages: standardPages(), services: [{ id: 'unknown-intent', canonicalIntentId: 'repair', directCompletedEvidenceCount: 3 }, { id: 'installation', directCompletedEvidenceCount: 2 }], serviceLedger: ledger }), /mapped|mismatched/);
});

test('rejected-route-language validator blocks spring/opener page and link language', () => {
  assert.throws(() => validateRejectedRouteLanguage({ whyIncluded: 'Create an opener page and link to its route.' }), /rejected/);
  assert.doesNotThrow(() => validateRejectedRouteLanguage({ whyIncluded: 'Supporting evidence is assigned to Home breadth only.' }));
});

test('checked-in 360 sealed handoff is the real four-page derivative', () => {
  const filename = path.join(__dirname, '..', 'canary', 'outputs', '360-four-page-reseal-handoff.json');
  assert.equal(fs.existsSync(filename), true);
  const handoff = JSON.parse(fs.readFileSync(filename, 'utf8'));
  assert.doesNotThrow(() => validateRejectedRouteLanguage({ pages: handoff.pages, candidateServices: handoff.candidateServices, valueHierarchy: handoff.valueHierarchy, writerProjection: handoff.writerProjection }, 'checked-in handoff'));
  assert.deepEqual(handoff.pages.map((page) => page.url), ['/', '/garage-door-repair', '/garage-door-installation', '/contact']);
  assert.equal(handoff.source.checkpoint.runId, '32717620900');
  assert.equal(handoff.source.artifactId, '9516514426');
  assert.equal(handoff.source.checkpoint.sourceSha, EXPECTED_360_CHECKPOINT.sourceSha);
  assert.equal(handoff.reviewAnalysisFacts.retrievedWrittenReviewCount, 47);
  assert.equal(handoff.reviewAnalysisFacts.reviewRetrievalDate, '2026-08-23');
  assert.equal(handoff.stableReviewIds.length, 47);
  assert.equal(handoff.noVendorReseal, true);
});
