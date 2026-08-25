'use strict';

const { digest, pageSetDigest } = require('./prescription-policy');
const { stableCandidateIdentity } = require('./candidates');

function finalRun(state) {
  return state?.activeRun || state?.runs?.find((run) => run.status === 'awaiting-human-gate-1') || state?.runs?.find((run) => run.artifacts?.prescription);
}

function sourceMaterialFor(run) {
  return run?.artifacts?.sourceCheckpoint?.sourceMaterial || {};
}

function receiptDigests(sourceMaterial) {
  const safeDigest = (value) => digest(value === undefined ? null : value);
  return {
    discovery: safeDigest(sourceMaterial.discoveryReceipt),
    websiteAudit: safeDigest(sourceMaterial.auditReceipt),
    finalistEnrichment: safeDigest(sourceMaterial.enrichmentReceipt),
    reviewJudgments: safeDigest(sourceMaterial.reviewReceipts || []),
  };
}

function recomputeSource(run, currentHeadSha = null) {
  const checkpoint = run?.artifacts?.sourceCheckpoint || {};
  const sourceMaterial = sourceMaterialFor(run);
  const sourceMaterialDigest = digest(sourceMaterial);
  const sourceSha = sourceMaterialDigest.slice('sha256:'.length);
  const candidateIdentity = stableCandidateIdentity(run?.candidate || {});
  if (sourceMaterial.candidateIdentity && sourceMaterial.candidateIdentity !== candidateIdentity) throw new Error('Checkpoint candidate identity is stale or tampered');
  const binding = {
    headSha: currentHeadSha || checkpoint.headSha || checkpoint.sourceManifest?.binding?.headSha || null,
    runId: run?.runId || null,
    prospectId: run?.prospectId || null,
    placeId: run?.candidate?.placeId || null,
    sourceSha,
  };
  const safeDigest = (value) => digest(value === undefined ? null : value);
  const sourceManifest = {
    schemaVersion: 'factory-source-manifest-v1',
    candidateIdentity,
    runId: run?.runId || null,
    sourceSha,
    requiredReceipts: ['discovery', 'website-audit', 'finalist-enrichment', 'review-judgment'],
    receiptDigests: receiptDigests(sourceMaterial),
    sourceMaterialDigest,
    binding,
    receiptBindings: Object.entries({
      discovery: sourceMaterial.discoveryReceipt,
      websiteAudit: sourceMaterial.auditReceipt,
      finalistEnrichment: sourceMaterial.enrichmentReceipt,
      reviewJudgments: sourceMaterial.reviewReceipts || [],
    }).map(([label, receipt]) => ({ label, digest: safeDigest(receipt), binding })),
  };
  const sourceIdentity = checkpoint.sourceIdentity || {};
  const sourceArtifactDigest = digest({ sourceIdentity, sourceMaterial });
  return { sourceMaterial, sourceMaterialDigest, sourceSha, sourceManifest, sourceManifestDigest: digest(sourceManifest), sourceArtifactDigest, binding };
}

function recomputeEvidence(run) {
  const prescription = run?.artifacts?.prescription || {};
  const inventory = run?.artifacts?.inventory || {};
  const classified = inventory.classified || run?.artifacts?.classification?.classified || [];
  return digest({ classification: classified, valueHierarchy: prescription.valueHierarchy || [], serviceLedger: prescription.serviceCoverageLedger || null });
}

function recomputePrescription(run) {
  const prescription = run?.artifacts?.prescription || {};
  return digest({ ...prescription, prescriptionDigest: undefined });
}

function semanticDigests(state, currentHeadSha = null) {
  const run = finalRun(state);
  const source = recomputeSource(run, currentHeadSha);
  const prescription = run?.artifacts?.prescription || {};
  const ledger = prescription.serviceCoverageLedger || null;
  return {
    sourceMaterialDigest: source.sourceMaterialDigest,
    sourceManifestDigest: source.sourceManifestDigest,
    evidenceDigest: recomputeEvidence(run),
    ledgerDigest: digest(ledger),
    pageSetDigest: pageSetDigest(prescription.pages || []),
    prescriptionDigest: recomputePrescription(run),
  };
}

function assertSemanticCheckpoint({ checkpoint, state, currentHeadSha }) {
  if (!checkpoint || typeof checkpoint !== 'object') throw new Error('Checkpoint semantic record is missing');
  if (currentHeadSha && checkpoint.sourceSha !== currentHeadSha) throw new Error('Checkpoint source SHA is not the current checked-out head');
  const run = finalRun(state);
  if (!run) throw new Error('Checkpoint final run is missing');
  const actualSource = recomputeSource(run, currentHeadSha);
  const actual = semanticDigests(state, currentHeadSha);
  const expected = checkpoint.semanticDigests;
  if (!expected || typeof expected !== 'object') throw new Error('Checkpoint semantic digests are missing');
  for (const key of ['sourceMaterialDigest', 'sourceManifestDigest', 'evidenceDigest', 'ledgerDigest', 'pageSetDigest', 'prescriptionDigest']) {
    if (!expected[key] || expected[key] !== actual[key]) throw new Error(`Checkpoint semantic digest mismatch: ${key}`);
  }
  const recordedManifest = checkpoint.sourceManifest || run.artifacts.sourceCheckpoint?.sourceManifest;
  if (!recordedManifest || digest(recordedManifest) !== actualSource.sourceManifestDigest) throw new Error('Checkpoint source manifest digest is invented or stale');
  if (recordedManifest.sourceMaterialDigest !== actualSource.sourceMaterialDigest) throw new Error('Checkpoint source material digest is invented or stale');
  const prescription = run.artifacts.prescription || {};
  if (prescription.evidenceDigest !== actual.evidenceDigest) throw new Error('Checkpoint evidence digest is invented or stale');
  if (prescription.pageSetDigest !== actual.pageSetDigest) throw new Error('Checkpoint page-set digest is invented or stale');
  if (prescription.prescriptionDigest !== actual.prescriptionDigest) throw new Error('Checkpoint prescription digest is invented or stale');
  if (checkpoint.sourceArtifactDigest && checkpoint.sourceArtifactDigest !== actualSource.sourceArtifactDigest) throw new Error('Checkpoint source artifact digest is invented or stale');
  if (currentHeadSha && recordedManifest.binding?.headSha !== currentHeadSha) throw new Error('Checkpoint source manifest head binding is stale');
  return actual;
}

module.exports = { finalRun, recomputeSource, recomputeEvidence, recomputePrescription, semanticDigests, assertSemanticCheckpoint };
