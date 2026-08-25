'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { validateSeededDiscoveryPacket } = require('./seeded-discovery');
const { verifySealed360Lineage } = require('../factory/sealed-evidence');
const { digest } = require('../factory/prescription-policy');
const { resolveTrustedArtifact } = require('../factory/trusted-artifacts');
const { REGISTRY_KEY } = require('../../scripts/restore-trusted-checkpoint');

function byteDigest(file) { return `sha256:${crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}`; }
function read(root, file) { return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')); }
function bindClaims(pages) {
  return (pages || []).map((page) => ({
    ...page,
    service: page.type === 'Service' ? page.service : undefined,
    claims: (page.claims || []).map((claim) => {
      if (claim && typeof claim === 'object' && Array.isArray(claim.evidenceRefs)) return claim;
      const text = typeof claim === 'string' ? claim : String(claim?.text || claim?.claim || '');
      return {
        text,
        evidenceRefs: page.strongestEvidence ? [page.strongestEvidence] : [],
        ...(page.type === 'Service' ? { service: page.service } : {}),
      };
    }).filter((claim) => claim.evidenceRefs.length || page.type === 'Contact'),
  }));
}

/**
 * Production-only restore adapter.  It represents an immutable GitHub Actions
 * artifact/source checkpoint, never an Apify or Cursor execution.  It is kept
 * separate from the sealed replay adapter so the live entrypoint can attest
 * source provenance and force a new Josh decision at the current head.
 */
function createTrustedGithubCheckpointAdapter(options = {}) {
  if (Object.prototype.hasOwnProperty.call(options, 'artifactId') || Object.prototype.hasOwnProperty.call(options, 'workflowRunId')) throw new Error('trusted checkpoint identity is registry-controlled; caller artifact/run ids are forbidden');
  const { root = process.cwd(), trustedRoot = root, assertedHeadSha, currentArtifactId = null, currentWorkflowRunId = null, requireManifest = false } = options;
  if (!assertedHeadSha) throw new Error('trusted GitHub checkpoint requires asserted checked-out SHA');
  const trusted = resolveTrustedArtifact(REGISTRY_KEY);
  const manifestFile = path.join(trustedRoot, 'trusted-checkpoint-manifest.json');
  if (requireManifest && !fs.existsSync(manifestFile)) throw new Error('trusted GitHub checkpoint requires the verified extracted manifest');
  if (fs.existsSync(manifestFile)) {
    const manifest = read(trustedRoot, 'trusted-checkpoint-manifest.json');
    const unsigned = { ...manifest }; delete unsigned.manifestDigest;
    if (manifest.registryKey !== REGISTRY_KEY || manifest.manifestDigest !== digest(unsigned) || manifest.repository !== 'alchemistj/ff-content-demo-factory') throw new Error('trusted checkpoint manifest identity/digest is invalid');
    if (manifest.original?.runId !== trusted.runId || manifest.original?.artifactId !== trusted.artifactId || manifest.original?.sourceSha !== trusted.sourceSha || manifest.original?.archiveDigest !== trusted.archiveDigest) throw new Error('trusted checkpoint manifest original identity is invalid');
    for (const field of ['sourceArtifactDigest', 'sourceManifestDigest', 'evidenceDigest', 'pageSetDigest', 'prescriptionDigest', 'approvalDigest', 'strategyDigest']) if (manifest.internal?.[field] !== trusted[field]) throw new Error(`trusted checkpoint manifest internal digest is invalid: ${field}`);
    if (currentArtifactId && String(manifest.current?.workflowArtifactId) !== String(currentArtifactId)) throw new Error('trusted checkpoint manifest current artifact identity is invalid');
    if (currentWorkflowRunId && String(manifest.current?.workflowRunId) !== String(currentWorkflowRunId)) throw new Error('trusted checkpoint manifest current workflow identity is invalid');
    if (manifest.current?.checkedOutSha && String(manifest.current.checkedOutSha) !== String(assertedHeadSha)) throw new Error('trusted checkpoint manifest current head is invalid');
  }
  const discoveryFile = 'canary/inputs/360-garage-door-and-more.discovery.json';
  const handoffFile = 'canary/outputs/360-four-page-reseal-handoff.json';
  const discovery = validateSeededDiscoveryPacket(read(trustedRoot, discoveryFile));
  const handoff = read(trustedRoot, handoffFile);
  const lineage = verifySealed360Lineage({ root: trustedRoot, handoff });
  if (byteDigest(path.join(trustedRoot, 'canary/inputs/360-four-page-reseal-approval.json')) !== trusted.approvalFileDigest || byteDigest(path.join(trustedRoot, 'canary/inputs/360-four-page-reseal-ledger.json')) !== trusted.ledgerFileDigest || byteDigest(path.join(trustedRoot, discoveryFile)) !== trusted.discoveryFileDigest || byteDigest(path.join(trustedRoot, handoffFile)) !== trusted.handoffFileDigest) throw new Error('trusted checkpoint registry source-file digest mismatch');
  for (const field of ['sourceArtifactDigest', 'sourceManifestDigest', 'evidenceDigest', 'pageSetDigest', 'prescriptionDigest', 'approvalDigest', 'strategyDigest']) if (lineage[field] !== trusted[field]) throw new Error(`trusted checkpoint registry lineage mismatch: ${field}`);
  const source = { provider: 'github-trusted-checkpoint', provenanceType: 'github-actions-artifact', repository: 'alchemistj/ff-content-demo-factory', originalRunId: trusted.runId, originalArtifactId: trusted.artifactId, originalSourceSha: trusted.sourceSha, archiveName: trusted.archiveName, archiveDigest: trusted.archiveDigest, currentWorkflowRunId: currentWorkflowRunId ? String(currentWorkflowRunId) : null, currentArtifactId: currentArtifactId ? String(currentArtifactId) : null, checkedOutSha: assertedHeadSha, sourceSha: lineage.sourceSha, sourceArtifactDigest: lineage.sourceArtifactDigest, sourceManifestDigest: lineage.sourceManifestDigest, evidenceDigest: lineage.evidenceDigest, pageSetDigest: lineage.pageSetDigest, prescriptionDigest: lineage.prescriptionDigest, approvalDigest: lineage.approvalDigest, strategyDigest: lineage.strategyDigest, discoveryFileDigest: byteDigest(path.join(trustedRoot, discoveryFile)), handoffFileDigest: byteDigest(path.join(trustedRoot, handoffFile)), packetDigest: digest({ originalRunId: trusted.runId, originalArtifactId: trusted.artifactId, originalSourceSha: trusted.sourceSha, discoveryFileDigest: byteDigest(path.join(trustedRoot, discoveryFile)), handoffFileDigest: byteDigest(path.join(trustedRoot, handoffFile)), sourceArtifactDigest: lineage.sourceArtifactDigest, assertedHeadSha, currentWorkflowRunId: currentWorkflowRunId || null, currentArtifactId: currentArtifactId || null }) };
  const judgments = Object.fromEntries((handoff.reviewInventory?.classification?.reviews || []).map((entry) => [entry.id, entry.authoritativeJudgment]));
  const receipt = (operation, input, result, extra = {}) => ({ provider: 'github-trusted-checkpoint', operation, status: 'completed', terminalStatus: 'succeeded', startedAt: new Date(0).toISOString(), completedAt: new Date(0).toISOString(), input, result, inputDigest: digest(input), outputDigest: digest(result), source, ...extra });
  async function discoverCandidates() { return { ...discovery, provenance: { provider: 'github-trusted-checkpoint', mode: 'trusted-checkpoint-restore', run: receipt('discovery', discovery.request || discovery.discoveryRequest, discovery.candidates, { artifactId: source.artifactId }) } }; }
  async function enrichFinalist({ placeId }) { if (String(placeId) !== String(handoff.prospect.placeId)) throw new Error('trusted checkpoint refuses cross-prospect enrichment'); const result = { ...handoff.reviewInventory.reviewPacket, kind: 'finalist-review-enrichment', placeId: handoff.prospect.placeId, mapsUrl: handoff.prospect.mapsUrl || null, discoverySampleOnly: false, requestedLimit: 50, requestedReviewLimit: 50, dateWindow: null }; return { ...result, receipt: receipt('finalist-enrichment', { placeId: handoff.prospect.placeId }, result, { artifactId: source.artifactId }) }; }
  async function runResearchRecord({ kind, jobId, input }) { let result; if (kind === 'website-audit') { const homeWhy = handoff.pages.find((page) => page.type === 'Home')?.whyIncluded || ''; result = { kind, website: handoff.prospect.website, opportunity: homeWhy.replace(/^Required entry page\.\s*/i, ''), evidence: [], images: [], siteCopyEvidence: [], ownedGraphicEvidence: [], publicImageUrls: [], graphicsInspection: { status: 'restored-checkpoint', findings: [] }, inspected: true }; } else if (kind === 'review-judgment') { const reviewId = input?.review?.id; result = { ...(judgments[reviewId] || {}), kind, reviewId, authoritative: true }; } else if (kind === 'page-prescription') result = { kind, pages: bindClaims(handoff.pages), candidateServices: handoff.candidateServices, serviceCoverageLedger: { ...handoff.serviceCoverageLedger, runId: input?.finalist?.runId || input?.runId || handoff.serviceCoverageLedger?.runId }, sourceCheckpoint: input?.decision?.sourceCheckpoint }; else throw new Error(`trusted checkpoint does not restore ${kind}`); return { result, receipt: receipt(kind, input, result, { jobId, artifactId: source.artifactId }) }; }
  return { source, apify: { discoverCandidates, enrichFinalist }, cursor: { runResearchRecord }, discoverCandidates, enrichFinalist, runResearchRecord };
}

module.exports = { createTrustedGithubCheckpointAdapter };
