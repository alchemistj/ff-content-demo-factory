'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeWebsiteAudit } = require('../src/factory/production-adapters');
const { validateClaimReferences } = require('../src/factory/prescription');
const { renderGate1 } = require('../src/factory/gate1');

test('owned-domain provenance rejects missing candidate domains, file URLs, conflicts, and cross-domain evidence', () => {
  assert.throws(() => normalizeWebsiteAudit({ website: 'https://owned.example', evidence: [], images: [] }, {}), /candidate-owned website domain/);
  assert.throws(() => normalizeWebsiteAudit({ website: 'file:///tmp/site', evidence: [], images: [] }, { website: 'https://owned.example' }), /http or https|invalid/);
  assert.throws(() => normalizeWebsiteAudit({ website: 'https://owned.example', provenance: { website: 'https://other.example' }, evidence: [], images: [] }, { website: 'https://owned.example' }), /not bound|conflicts/);
  assert.throws(() => normalizeWebsiteAudit({ website: 'https://owned.example', evidence: [{ sourceUrl: 'https://other.example/proof' }], images: [] }, { website: 'https://owned.example' }), /not bound/);
  const normalized = normalizeWebsiteAudit({ website: 'https://www.owned.example', evidence: [{ sourceUrl: 'https://owned.example/services', provenance: { sourceUrl: 'https://owned.example/services' } }], images: [] }, { website: 'https://owned.example' });
  assert.equal(normalized.website, 'https://www.owned.example');
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
