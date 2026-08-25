'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeWebsiteAudit } = require('../src/factory/production-adapters');
const { validateClaimReferences } = require('../src/factory/prescription');
const { renderGate1 } = require('../src/factory/gate1');
const { sourceCheckpointFor, requiredReceipt, actionProofFromEnvironment } = require('../src/factory/orchestrator');
const { semanticDigests, assertSemanticCheckpoint, recomputeSource, recomputeEvidence, recomputePrescription } = require('../src/factory/checkpoint');
const { createDispatchPacket, canonicalThreadUrl, validateJobReceipt, validateDispatchPacket, validateBundle } = require('../src/factory/cloud-agent');
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
  assert.match(markdown, /Action proof result/);
  assert.match(markdown, /production page copy has not been written/);
});

test('restore semantic checks and exact-head proof are deterministic', () => {
  const run = { runId: 'run-1', prospectId: 'prospect-1', candidate: { placeId: 'place-1', name: 'Example', location: 'Town', website: 'https://owned.example' }, status: 'awaiting-human-gate-1', artifacts: { sourceCheckpoint: { sourceMaterial: { discoveryReceipt: { provider: 'fixture' }, auditReceipt: { provider: 'fixture' }, enrichmentReceipt: { provider: 'fixture' }, reviewReceipts: [] } }, inventory: { classified: [] }, prescription: { serviceCoverageLedger: { services: [] }, pages: [] } } };
  let source = recomputeSource(run, 'head-1');
  run.artifacts.sourceCheckpoint.sourceIdentity = { provider: 'factory-trusted-source', runId: run.runId, artifactId: 'source-run-1', sourceSha: source.sourceSha, rootIdentity: 'factory-source:run-1' };
  source = recomputeSource(run, 'head-1');
  Object.assign(run.artifacts.sourceCheckpoint, { sourceManifest: source.sourceManifest, sourceManifestDigest: source.sourceManifestDigest, sourceArtifactDigest: source.sourceArtifactDigest, sourceSha: 'head-1', headSha: 'head-1' });
  run.artifacts.prescription.evidenceDigest = recomputeEvidence(run);
  run.artifacts.prescription.pageSetDigest = require('../src/factory/prescription-policy').pageSetDigest([]);
  run.artifacts.prescription.prescriptionDigest = recomputePrescription(run);
  const state = { activeRun: run };
  const digests = semanticDigests(state, 'head-1');
  const checkpoint = { sourceSha: 'head-1', sourceIdentity: run.artifacts.sourceCheckpoint.sourceIdentity, sourceManifest: source.sourceManifest, sourceArtifactDigest: source.sourceArtifactDigest, semanticDigests: digests };
  assert.deepEqual(assertSemanticCheckpoint({ checkpoint, state, currentHeadSha: 'head-1' }), digests);
  assert.throws(() => assertSemanticCheckpoint({ checkpoint: { ...checkpoint, semanticDigests: { ...digests, evidenceDigest: 'sha256:tampered' } }, state, currentHeadSha: 'head-1' }), /semantic digest mismatch/);
  assert.deepEqual(actionProofFromEnvironment({ FACTORY_CHECKED_OUT_SHA: 'head-1', FACTORY_EXPECTED_HEAD_SHA: 'head-1', FACTORY_HEAD_ASSERTION: 'true', FACTORY_TEST_RUN_URL: 'https://actions.example/run', FACTORY_TEST_RESULT: 'success' }), { checkedOutSha: 'head-1', expectedHeadSha: 'head-1', headAssertion: true, testRunUrl: 'https://actions.example/run', testResult: 'success' });
  const wake = fs.readFileSync('.github/workflows/architect-factory-wake.yml', 'utf8');
  assert.match(wake, /consumedNonces\.includes/);
  assert.doesNotMatch(wake, /consumedWakeIds[^\n]*slice\(/);
  const canary = fs.readFileSync('.github/workflows/current-head-gate1-canary.yml', 'utf8');
  assert.match(canary, /FACTORY_ASSERTED_HEAD_SHA/);
  assert.match(canary, /FACTORY_CHECKED_OUT_SHA/);
  assert.match(canary, /FACTORY_TEST_RUN_URL/);
  assert.match(canary, /FACTORY_TEST_RESULT/);
  assert.match(fs.readFileSync('src/run-gate1-canary.js', 'utf8'), /inputManifest|bindingDigest/);
  assert.doesNotMatch(canary, /CURSOR_API_KEY/);
  assert.doesNotMatch(fs.readFileSync('src/run-gate1-canary.js', 'utf8'), /createCursorAdapter/);
  const dispatch = fs.readFileSync('.github/workflows/cursor-cloud-agent-dispatch.yml', 'utf8');
  assert.match(dispatch, /@cursor/);
  assert.match(dispatch, /gh api/);
  assert.doesNotMatch(dispatch, /CURSOR_API_KEY/);
});

test('production receipts require terminal identity, digests, and timestamps', () => {
  assert.throws(() => requiredReceipt({ provider: 'apify' }, 'discovery'), /complete terminal/);
  assert.throws(() => requiredReceipt({ provider: 'apify', operation: 'discovery', status: 'running', terminalStatus: 'succeeded', inputDigest: 'i', outputDigest: 'o', startedAt: 't', completedAt: 't', vendorReceipt: { runId: 'r', datasetId: 'd' } }, 'discovery'), /complete terminal/);
  assert.throws(() => requiredReceipt({ provider: 'apify', operation: 'discovery', status: 'completed', terminalStatus: 'succeeded', inputDigest: 'i', outputDigest: 'o', startedAt: 't', completedAt: 't', vendorReceipt: { runId: 'r' } }, 'discovery'), /run\/dataset/);
});

test('semantic restore rejects mutations to every persisted semantic component', () => {
  const run = { runId: 'run-1', prospectId: 'prospect-1', candidate: { placeId: 'place-1', name: 'Example', location: 'Town', website: 'https://owned.example' }, status: 'awaiting-human-gate-1', artifacts: { sourceCheckpoint: { sourceMaterial: { discoveryReceipt: { provider: 'fixture' }, auditReceipt: { provider: 'fixture' }, enrichmentReceipt: { provider: 'fixture' }, reviewReceipts: [] } }, inventory: { classified: [] }, prescription: { serviceCoverageLedger: { services: [] }, pages: [] } } };
  let source = recomputeSource(run, 'head-1');
  run.artifacts.sourceCheckpoint.sourceIdentity = { provider: 'factory-trusted-source', runId: run.runId, artifactId: 'source-run-1', sourceSha: source.sourceSha, rootIdentity: 'factory-source:run-1' };
  source = recomputeSource(run, 'head-1');
  Object.assign(run.artifacts.sourceCheckpoint, { sourceManifest: source.sourceManifest, sourceManifestDigest: source.sourceManifestDigest, sourceArtifactDigest: source.sourceArtifactDigest, sourceSha: 'head-1', headSha: 'head-1' });
  run.artifacts.prescription.evidenceDigest = recomputeEvidence(run);
  run.artifacts.prescription.pageSetDigest = require('../src/factory/prescription-policy').pageSetDigest([]);
  run.artifacts.prescription.prescriptionDigest = recomputePrescription(run);
  const state = { activeRun: run };
  const checkpoint = { sourceSha: 'head-1', sourceIdentity: run.artifacts.sourceCheckpoint.sourceIdentity, sourceManifest: source.sourceManifest, sourceArtifactDigest: source.sourceArtifactDigest, semanticDigests: semanticDigests(state, 'head-1') };
  for (const mutate of [
    (copy) => { copy.activeRun.artifacts.sourceCheckpoint.sourceMaterial.discoveryReceipt.provider = 'tampered'; },
    (copy) => { copy.activeRun.artifacts.inventory.classified.push({ id: 'evidence-mutation' }); },
    (copy) => { copy.activeRun.artifacts.prescription.serviceCoverageLedger.services.push({ id: 'ledger-mutation' }); },
    (copy) => { copy.activeRun.artifacts.prescription.pages.push({ type: 'Contact', url: '/contact' }); },
    (copy) => { copy.activeRun.artifacts.prescription.generatedAt = 'tampered'; },
  ]) assert.throws(() => assertSemanticCheckpoint({ checkpoint, state: JSON.parse(JSON.stringify(mutateState(state, mutate))), currentHeadSha: 'head-1' }), /mismatch|stale|tampered/);
  assert.throws(() => assertSemanticCheckpoint({ checkpoint: { ...checkpoint, sourceManifest: { ...checkpoint.sourceManifest, sourceMaterialDigest: 'sha256:invented' } }, state, currentHeadSha: 'head-1' }), /mismatch|stale|tampered/);
});

function mutateState(state, mutate) { const copy = JSON.parse(JSON.stringify(state)); mutate(copy); return copy; }

test('GitHub-native dispatch packet and Cursor receipt contract reject stale or fake links', () => {
  const packet = createDispatchPacket({ issueNumber: 8, prNumber: 1, branch: 'architect/greenfield-gate1', reviewedHeadSha: 'head-1', scope: 'research-only' });
  assert.match(packet.commentBody, /^@cursor/);
  assert.equal(packet.model.fastOff, true);
  assert.equal(canonicalThreadUrl('https://cursor.com/agents/agent-1'), 'https://cursor.com/agents/agent-1');
  assert.throws(() => canonicalThreadUrl('https://example.com/agent-1'), /canonical/);
  assert.throws(() => validateJobReceipt({ operation: 'website-audit', stage: 'website-audit', status: 'completed', terminalStatus: 'succeeded', agentId: 'a', runId: 'r', threadUrl: 'https://example.com/a', inputDigest: 'i', outputDigest: 'o', startedAt: 't', completedAt: 't', envelope: { checkedOutSha: 'head-1', inputManifestDigest: 'm', operation: 'website-audit', stage: 'website-audit' } }, { kind: 'website-audit', expectedEnvelope: { checkedOutSha: 'head-1', inputManifestDigest: 'm' } }), /canonical/);
});

test('current-head canary rejects API-key dispatch before alternate provider work', async () => {
  await assert.rejects(() => runCurrentHeadGate1Canary({ root: 'canary', requestFile: 'missing.json', selectionFile: 'missing.json', qaFile: 'missing.json', cursorBundleFile: 'missing.json', env: { CURSOR_API_KEY: 'must-not-be-used' } }), /CURSOR_API_KEY is not a supported canary credential/);
  await assert.rejects(() => runCurrentHeadGate1Canary({ root: 'canary', requestFile: 'missing.json', selectionFile: 'missing.json', qaFile: 'missing.json', cursorBundleFile: 'missing.json', env: { CURSOR_MODEL: 'unsupported-provider-model', FACTORY_CHECKED_OUT_SHA: 'head-1', EXPECTED_HEAD_SHA: 'head-1', FACTORY_HEAD_ASSERTION: 'true' } }), /Unsupported Cursor model override/);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'factory-canary-'));
  for (const name of ['request.json', 'selection.json', 'qa.json']) fs.writeFileSync(path.join(temp, name), '{}');
  fs.writeFileSync(path.join(temp, 'cursor-bundle.json'), JSON.stringify({ schemaVersion: 'cursor-cloud-agent-bundle-v1' }));
  await assert.rejects(() => runCurrentHeadGate1Canary({ root: temp, requestFile: path.join(temp, 'request.json'), selectionFile: path.join(temp, 'selection.json'), qaFile: path.join(temp, 'qa.json'), cursorBundleFile: path.join(temp, 'cursor-bundle.json'), env: { FACTORY_CHECKED_OUT_SHA: 'head-1', EXPECTED_HEAD_SHA: 'head-1', FACTORY_HEAD_ASSERTION: 'true', FACTORY_ISSUE_NUMBER: '8', FACTORY_PR_NUMBER: '1', FACTORY_BRANCH: 'architect/greenfield-gate1' } }), /Cloud Agent model\/Fast-off attestation is invalid/);
});

test('fifth correction seals source identity and rejects unrelated production receipts', () => {
  const run = { runId: 'run-1', prospectId: 'prospect-1', candidate: { placeId: 'place-1' }, artifacts: { sourceCheckpoint: { sourceMaterial: {} }, prescription: { pages: [], serviceCoverageLedger: { services: [] } } } };
  const state = { activeRun: run };
  let source = recomputeSource(run, 'head-1');
  run.artifacts.sourceCheckpoint.sourceIdentity = { provider: 'factory-trusted-source', runId: 'run-1', artifactId: 'source-run-1', sourceSha: source.sourceSha, rootIdentity: 'factory-source:run-1' };
  source = recomputeSource(run, 'head-1');
  Object.assign(run.artifacts.sourceCheckpoint, { sourceManifest: source.sourceManifest, sourceManifestDigest: source.sourceManifestDigest, sourceArtifactDigest: source.sourceArtifactDigest, sourceSha: 'head-1', headSha: 'head-1' });
  run.artifacts.prescription.evidenceDigest = recomputeEvidence(run); run.artifacts.prescription.pageSetDigest = require('../src/factory/prescription-policy').pageSetDigest([]); run.artifacts.prescription.prescriptionDigest = recomputePrescription(run);
  const checkpoint = { sourceSha: 'head-1', sourceIdentity: run.artifacts.sourceCheckpoint.sourceIdentity, sourceManifest: source.sourceManifest, sourceArtifactDigest: source.sourceArtifactDigest, semanticDigests: semanticDigests(state, 'head-1') };
  assert.throws(() => assertSemanticCheckpoint({ checkpoint: { ...checkpoint, sourceIdentity: { ...checkpoint.sourceIdentity, provider: 'foreign' } }, state, currentHeadSha: 'head-1' }), /source identity|artifact|mismatch|stale/i);
  const valid = { provider: 'apify', operation: 'discovery', status: 'completed', terminalStatus: 'succeeded', inputDigest: 'sha256:11111111', outputDigest: 'sha256:22222222', startedAt: '2026-01-01T00:00:00Z', completedAt: '2026-01-01T00:00:01Z', input: { placeId: 'other-place' }, vendorReceipt: { runId: 'other-run', datasetId: 'other-dataset' } };
  assert.throws(() => requiredReceipt({ ...valid, operation: 'unrelated-operation' }, 'discovery', null, { placeId: 'place-1' }), /operation/);
  assert.throws(() => requiredReceipt(valid, 'discovery', null, { placeId: 'place-1' }), /candidate binding/);
});

test('fifth correction verifies dispatch digest, authoritative target, and foreign comment rejection', () => {
  const packet = createDispatchPacket({ issueNumber: 8, prNumber: 1, branch: 'architect/greenfield-gate1', reviewedHeadSha: 'head-1', scope: 'research-only' });
  assert.doesNotThrow(() => validateDispatchPacket(packet));
  assert.throws(() => validateDispatchPacket({ ...packet, dispatchDigest: 'sha256:invented' }), /digest/);
  assert.throws(() => validateDispatchPacket({ ...packet, commentBody: packet.commentBody.replace('Issue: #8', 'Issue: #99') }), /target|digest/);
  const bundle = { schemaVersion: 'cursor-cloud-agent-bundle-v1', model: packet.model, dispatch: { ...packet, commentUrl: 'https://github.com/foreign/repo/issues/8#issuecomment-1' }, inputManifestDigest: 'sha256:manifest', envelope: { checkedOutSha: 'head-1', inputManifestDigest: 'sha256:manifest' } };
  assert.throws(() => validateBundle(bundle, { expectedHeadSha: 'head-1', inputManifestDigest: 'sha256:manifest', dispatch: { issueNumber: 8, prNumber: 1, branch: packet.branch }, repository: 'alchemistj/ff-content-demo-factory' }), /foreign|missing/);
  const dispatchWorkflow = fs.readFileSync('.github/workflows/cursor-cloud-agent-dispatch.yml', 'utf8');
  assert.match(dispatchWorkflow, /concurrency:/); assert.match(dispatchWorkflow, /dispatchDigest/); assert.match(dispatchWorkflow, /--paginate/);
});

test('fifth correction exposes executable phase-A durable handoff without Cursor API credentials', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'factory-phase-a-'));
  for (const [name, value] of [['request.json', '{}'], ['selection.json', '{}'], ['qa.json', '{}']]) fs.writeFileSync(path.join(temp, name), value);
  const result = await runCurrentHeadGate1Canary({ root: temp, requestFile: path.join(temp, 'request.json'), selectionFile: path.join(temp, 'selection.json'), qaFile: path.join(temp, 'qa.json'), cursorBundleFile: '', env: { FACTORY_CANARY_PHASE: 'dispatch', FACTORY_CHECKED_OUT_SHA: 'head-1', EXPECTED_HEAD_SHA: 'head-1', FACTORY_HEAD_ASSERTION: 'true', FACTORY_ISSUE_NUMBER: '8', FACTORY_PR_NUMBER: '1', FACTORY_BRANCH: 'architect/greenfield-gate1' } });
  assert.equal(result.proof.awaitingCursorReceipt, true);
  const pending = JSON.parse(fs.readFileSync(path.join(temp, 'canary/outputs/current-head-gate1-pending.json'), 'utf8'));
  assert.equal(pending.immutable, true); assert.equal(pending.expectedHeadSha, 'head-1');
  const canary = fs.readFileSync('src/run-gate1-canary.js', 'utf8');
  assert.match(canary, /FACTORY_CANARY_PHASE/); assert.match(canary, /sealedDigest/); assert.match(canary, /boundReceipts/); assert.doesNotMatch(canary, /CURSOR_API_KEY.*required/);
});

test('fifth correction independently verifies authoritative PR metadata before paid canary work', () => {
  const workflow = fs.readFileSync('.github/workflows/current-head-gate1-canary.yml', 'utf8');
  assert.match(workflow, /gh pr view/); assert.match(workflow, /headRefOid/); assert.match(workflow, /headRefName/); assert.match(workflow, /gh issue view/); assert.match(workflow, /phase:/);
  const wake = fs.readFileSync('.github/workflows/architect-factory-wake.yml', 'utf8');
  assert.match(wake, /sourceIdentity:/); assert.match(wake, /sourceArtifactDigest:/); assert.doesNotMatch(wake, /test -n "\$CURSOR_API_KEY"/);
});
