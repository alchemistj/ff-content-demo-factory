'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { validateSeededDiscoveryPacket } = require('./seeded-discovery');
const { verifySealed360Lineage } = require('../factory/sealed-evidence');
const { digest } = require('../factory/prescription-policy');

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
function createTrustedGithubCheckpointAdapter({ root = process.cwd(), assertedHeadSha, artifactId = null, workflowRunId = null } = {}) {
  if (!assertedHeadSha) throw new Error('trusted GitHub checkpoint requires asserted checked-out SHA');
  const discoveryFile = 'canary/inputs/360-garage-door-and-more.discovery.json';
  const handoffFile = 'canary/outputs/360-four-page-reseal-handoff.json';
  const discovery = validateSeededDiscoveryPacket(read(root, discoveryFile));
  const handoff = read(root, handoffFile);
  const lineage = verifySealed360Lineage({ root, handoff });
  const source = { provider: 'github-trusted-checkpoint', provenanceType: 'github-actions-artifact', artifactId: String(artifactId || lineage.artifactId), workflowRunId: String(workflowRunId || lineage.runId), checkedOutSha: assertedHeadSha, sourceSha: lineage.sourceSha, sourceArtifactDigest: lineage.sourceArtifactDigest, discoveryFileDigest: byteDigest(path.join(root, discoveryFile)), handoffFileDigest: byteDigest(path.join(root, handoffFile)), packetDigest: digest({ discoveryFileDigest: byteDigest(path.join(root, discoveryFile)), handoffFileDigest: byteDigest(path.join(root, handoffFile)), sourceArtifactDigest: lineage.sourceArtifactDigest, assertedHeadSha }) };
  const judgments = Object.fromEntries((handoff.reviewInventory?.classification?.reviews || []).map((entry) => [entry.id, entry.authoritativeJudgment]));
  const receipt = (operation, input, result, extra = {}) => ({ provider: 'github-trusted-checkpoint', operation, status: 'completed', terminalStatus: 'succeeded', startedAt: new Date(0).toISOString(), completedAt: new Date(0).toISOString(), input, result, inputDigest: digest(input), outputDigest: digest(result), source, ...extra });
  async function discoverCandidates() { return { ...discovery, provenance: { provider: 'github-trusted-checkpoint', mode: 'trusted-checkpoint-restore', run: receipt('discovery', discovery.request || discovery.discoveryRequest, discovery.candidates, { artifactId: source.artifactId }) } }; }
  async function enrichFinalist({ placeId }) { if (String(placeId) !== String(handoff.prospect.placeId)) throw new Error('trusted checkpoint refuses cross-prospect enrichment'); const result = { ...handoff.reviewInventory.reviewPacket, kind: 'finalist-review-enrichment', placeId: handoff.prospect.placeId, mapsUrl: handoff.prospect.mapsUrl || null, discoverySampleOnly: false, requestedLimit: 50, requestedReviewLimit: 50, dateWindow: null }; return { ...result, receipt: receipt('finalist-enrichment', { placeId: handoff.prospect.placeId }, result, { artifactId: source.artifactId }) }; }
  async function runResearchRecord({ kind, jobId, input }) { let result; if (kind === 'website-audit') { const homeWhy = handoff.pages.find((page) => page.type === 'Home')?.whyIncluded || ''; result = { kind, website: handoff.prospect.website, opportunity: homeWhy.replace(/^Required entry page\.\s*/i, ''), evidence: [], images: [], siteCopyEvidence: [], ownedGraphicEvidence: [], publicImageUrls: [], graphicsInspection: { status: 'restored-checkpoint', findings: [] }, inspected: true }; } else if (kind === 'review-judgment') { const reviewId = input?.review?.id; result = { ...(judgments[reviewId] || {}), kind, reviewId, authoritative: true }; } else if (kind === 'page-prescription') result = { kind, pages: bindClaims(handoff.pages), candidateServices: handoff.candidateServices, serviceCoverageLedger: { ...handoff.serviceCoverageLedger, runId: input?.finalist?.runId || input?.runId || handoff.serviceCoverageLedger?.runId }, sourceCheckpoint: input?.decision?.sourceCheckpoint }; else throw new Error(`trusted checkpoint does not restore ${kind}`); return { result, receipt: receipt(kind, input, result, { jobId, artifactId: source.artifactId }) }; }
  return { source, apify: { discoverCandidates, enrichFinalist }, cursor: { runResearchRecord }, discoverCandidates, enrichFinalist, runResearchRecord };
}

module.exports = { createTrustedGithubCheckpointAdapter };
