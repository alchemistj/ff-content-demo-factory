'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeWebsiteAudit } = require('../src/factory/production-adapters');
const { validateClaimReferences } = require('../src/factory/prescription');
const { renderGate1 } = require('../src/factory/gate1');
const { sourceCheckpointFor, actionProofFromEnvironment } = require('../src/factory/orchestrator');
const { semanticDigests, assertSemanticCheckpoint } = require('../src/factory/checkpoint');
const { runCurrentHeadGate1Canary } = require('../src/run-gate1-canary');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('owned-domain provenance rejects missing candidate domains, file URLs, conflicts, and cross-domain evidence', () => {
  assert.throws(() => normalizeWebsiteAudit({ website: 'https://owned.example', evidence: [], images: [] }, {}), /candidate-owned website domain/);
  assert.throws(() => normalizeWebsiteAudit({ website: 'file:///tmp/site', evidence: [], images: [] }, { website: 'https://owned.example' }), /http or https|invalid/);
  assert.throws(() => normalizeWebsiteAudit({ website: 'https://owned.example', provenance: { website: 'https://other.example' }, evidence: [], images: [] }, { website: 'https://owned.example' }), /not bound|conflicts/);
  assert.throws(() => normalizeWebsiteAudit({ website: 'https://owned.example', evidence: [{ sourceUrl: 'https://other.example/proof' }], images: [] }, { website: 'https://owned.example' }), /not bound/);
  assert.throws(() => normalizeWebsiteAudit({ website: 'https://owned.example', evidence: [{ sourceUrl: 'https://owned.example/a', url: 'https://owned.example/b' }], images: [] }, { website: 'https://owned.example' }), /conflicting provenance/);
  const normalized = normalizeWebsiteAudit({ website: 'https://www.owned.example', evidence: [{ sourceUrl: 'https://owned.example/services', provenance: { sourceUrl: 'https://www.owned.example/services' } }], images: [] }, { website: 'https://owned.example' });
  assert.equal(normalized.website, 'https://www.owned.example');
});

test('production source checkpoints fail closed on missing real receipts', () => {
  const run = { runId: 'run-1', candidate: { placeId: 'place-1', name: 'Example', location: 'Town', website: 'https://owned.example' }, paidWork: { finalistEnrichment: {} }, artifacts: { reviewPacket: {}, reviewJudgments: {} } };
  assert.throws(() => sourceCheckpointFor(run, { discoveryPacket: { provenance: { run: { provider: 'apify' } } }, auditReceipts: {} }), /receipt/);
});

test('claim evidence requires direct service support and rejects untyped/cross-domain site refs', () => {
  const classified = [{ id: 'review-1', authoritative: true, sourceReview: { source: 'apify-finalist', text: 'Installed a charger.' }, judgment: { directCompletedService: true, services: ['ev-charging'] } }];
  const ledger = { prospectId: 'prospect-1', services: [{ id: 'ev-charging', reviewIds: ['review-1'], siteAuditCoverage: { crawlRefs: ['site-1'], sourceDomain: 'owned.example' } }] };
  assert.deepEqual(validateClaimReferences({ type: 'Service', service: 'ev-charging', claims: [{ text: 'supported', service: 'ev-charging', evidenceRefs: ['review-1'] }], proposedClaims: [] }, classified, ledger), []);
  assert.match(validateClaimReferences({ type: 'Service', service: 'ev-charging', claims: [{ text: 'wrong service', service: 'panel-upgrade', evidenceRefs: ['review-1'] }], proposedClaims: [] }, classified, ledger).join('; '), /does not directly support/);
  assert.match(validateClaimReferences({ type: 'Service', service: 'ev-charging', claims: [{ text: 'site', evidenceRefs: [{ id: 'site-1', type: 'site-audit', directSupport: true, sourceDomain: 'other.example' }] }], proposedClaims: [] }, classified, ledger).join('; '), /direct source\/domain support/);
  assert.match(validateClaimReferences({ type: 'Service', service: 'ev-charging', claims: [{ text: 'site', evidenceRefs: ['site-1'] }], proposedClaims: [] }, classified, ledger).join('; '), /direct source\/domain support/);
});

test('Gate 1 appendix exposes QA, receipt, exact-head, and checkpoint lineage without copy', () => {
  const markdown = renderGate1({
    finalist: { name: 'Example', websiteAudit: { opportunity: 'clear opportunity' } },
    whyBuilt: { text: 'The opportunity is clear. A review supports this direction.', refs: [{ type: 'opportunity', ref: 'clear opportunity' }, { type: 'review', ref: 'review-1' }] },
    prescription: { runId: 'run-1', sourceIdentity: { provider: 'factory-trusted-source', runId: 'run-1', artifactId: 'source-run-1', sourceSha: 'sha', rootIdentity: 'root' }, sourceArtifactDigest: 'sha256:aaaaaaaa', sourceManifestDigest: 'sha256:bbbbbbbb', sourceManifest: { sourceMaterialDigest: 'sha256:cccccccc' }, evidenceDigest: 'sha256:dddddddd', pageSetDigest: 'sha256:eeeeeeee', prescriptionDigest: 'sha256:ffffffff', pages: [{ type: 'Home', url: '/', primaryKeyword: 'example', titleDirection: 'Example', h1Direction: 'Example', whyIncluded: 'Core page', strongestEvidence: 'review-1', claims: [], traps: [], recommendedFirstReview: null }], valueHierarchy: [{ id: 'ev', includedPage: true, directCompletedEvidenceCount: 1, evidenceCount: 1 }] },
    qa: { passed: true, checks: { evidence: true } },
    receipts: { cursor: { provider: 'cursor-sdk', runId: 'run-cursor', threadUrl: 'https://cursor.example/thread/1' } },
    actionProof: { checkedOutSha: 'head-1', expectedHeadSha: 'head-1', headAssertion: true, testRunUrl: 'https://github.example/run/1' },
    sourceCheckpoint: { sourceIdentity: { provider: 'factory-trusted-source', runId: 'run-1', artifactId: 'source-run-1', sourceSha: 'sha', rootIdentity: 'root' }, sourceArtifactDigest: 'sha256:aaaaaaaa', sourceManifestDigest: 'sha256:bbbbbbbb' },
  });
  assert.match(markdown, /QA decision record/);
  assert.match(markdown, /cursor\.example\/thread\/1/);
  assert.match(markdown, /Exact-head test evidence/);
  assert.match(markdown, /Source manifest digest/);
  assert.match(markdown, /production page copy has not been written/);
});

test('restore semantic checks and exact-head proof are deterministic', () => {
  const state = { activeRun: { status: 'awaiting-human-gate-1', artifacts: { sourceCheckpoint: { sourceManifest: { sourceMaterialDigest: 'sha256:source' }, sourceManifestDigest: 'sha256:manifest', sourceMaterial: {} }, prescription: { evidenceDigest: 'sha256:evidence', serviceCoverageLedger: { services: [] }, pages: [], prescriptionDigest: 'sha256:prescription' } } } };
  const digests = semanticDigests(state);
  const checkpoint = { sourceSha: 'head-1', semanticDigests: digests };
  assert.deepEqual(assertSemanticCheckpoint({ checkpoint, state, currentHeadSha: 'head-1' }), digests);
  assert.throws(() => assertSemanticCheckpoint({ checkpoint: { ...checkpoint, semanticDigests: { ...digests, evidenceDigest: 'sha256:tampered' } }, state, currentHeadSha: 'head-1' }), /semantic digest mismatch/);
  assert.deepEqual(actionProofFromEnvironment({ FACTORY_CHECKED_OUT_SHA: 'head-1', FACTORY_EXPECTED_HEAD_SHA: 'head-1', FACTORY_HEAD_ASSERTION: 'true', FACTORY_TEST_RUN_URL: 'https://actions.example/run' }), { checkedOutSha: 'head-1', expectedHeadSha: 'head-1', headAssertion: true, testRunUrl: 'https://actions.example/run' });
  const wake = fs.readFileSync('.github/workflows/architect-factory-wake.yml', 'utf8');
  assert.match(wake, /consumedNonces\.includes/);
  assert.doesNotMatch(wake, /consumedWakeIds[^\n]*slice\(/);
  const canary = fs.readFileSync('.github/workflows/current-head-gate1-canary.yml', 'utf8');
  assert.match(canary, /FACTORY_ASSERTED_HEAD_SHA/);
  assert.match(fs.readFileSync('src/run-gate1-canary.js', 'utf8'), /inputManifest|bindingDigest/);
  assert.doesNotMatch(canary, /CURSOR_API_KEY/);
  assert.doesNotMatch(fs.readFileSync('src/run-gate1-canary.js', 'utf8'), /createCursorAdapter/);
});

test('current-head canary rejects API-key dispatch before alternate provider work', async () => {
  await assert.rejects(() => runCurrentHeadGate1Canary({ root: 'canary', requestFile: 'missing.json', selectionFile: 'missing.json', qaFile: 'missing.json', cursorBundleFile: 'missing.json', env: { CURSOR_API_KEY: 'must-not-be-used' } }), /CURSOR_API_KEY is not a supported canary credential/);
  await assert.rejects(() => runCurrentHeadGate1Canary({ root: 'canary', requestFile: 'missing.json', selectionFile: 'missing.json', qaFile: 'missing.json', cursorBundleFile: 'missing.json', env: { CURSOR_MODEL: 'unsupported-provider-model' } }), /Unsupported Cursor model override/);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'factory-canary-'));
  for (const name of ['request.json', 'selection.json', 'qa.json']) fs.writeFileSync(path.join(temp, name), '{}');
  fs.writeFileSync(path.join(temp, 'cursor-bundle.json'), JSON.stringify({ schemaVersion: 'cursor-cloud-agent-bundle-v1' }));
  await assert.rejects(() => runCurrentHeadGate1Canary({ root: temp, requestFile: path.join(temp, 'request.json'), selectionFile: path.join(temp, 'selection.json'), qaFile: path.join(temp, 'qa.json'), cursorBundleFile: path.join(temp, 'cursor-bundle.json'), env: {} }), /Cursor Cloud Agent bundle model attestation is invalid/);
});
