'use strict';

const { digest, pageSetDigest } = require('./prescription-policy');

function finalRun(state) {
  return state?.activeRun || state?.runs?.find((run) => run.status === 'awaiting-human-gate-1') || state?.runs?.find((run) => run.artifacts?.prescription);
}

function semanticDigests(state) {
  const run = finalRun(state);
  const checkpoint = run?.artifacts?.sourceCheckpoint || {};
  const prescription = run?.artifacts?.prescription || {};
  const sourceMaterial = checkpoint.sourceMaterial || {};
  const ledger = prescription.serviceCoverageLedger || null;
  return {
    sourceMaterialDigest: checkpoint.sourceManifest?.sourceMaterialDigest || digest(sourceMaterial),
    sourceManifestDigest: checkpoint.sourceManifestDigest || (checkpoint.sourceManifest ? digest(checkpoint.sourceManifest) : null),
    evidenceDigest: prescription.evidenceDigest || null,
    ledgerDigest: ledger ? digest(ledger) : null,
    pageSetDigest: prescription.pages ? pageSetDigest(prescription.pages) : null,
    prescriptionDigest: prescription.prescriptionDigest || null,
  };
}

function assertSemanticCheckpoint({ checkpoint, state, currentHeadSha }) {
  if (!checkpoint || typeof checkpoint !== 'object') throw new Error('Checkpoint semantic record is missing');
  if (currentHeadSha && checkpoint.sourceSha !== currentHeadSha) throw new Error('Checkpoint source SHA is not the current checked-out head');
  const expected = checkpoint.semanticDigests;
  if (!expected || typeof expected !== 'object') throw new Error('Checkpoint semantic digests are missing');
  const actual = semanticDigests(state);
  for (const key of ['sourceMaterialDigest', 'sourceManifestDigest', 'evidenceDigest', 'ledgerDigest', 'pageSetDigest', 'prescriptionDigest']) {
    if (!expected[key] || expected[key] !== actual[key]) throw new Error(`Checkpoint semantic digest mismatch: ${key}`);
  }
  return actual;
}

module.exports = { finalRun, semanticDigests, assertSemanticCheckpoint };
