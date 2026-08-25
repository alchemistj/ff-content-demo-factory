'use strict';

const { digest } = require('./prescription-policy');
const { canonicalThreadUrl, validateDispatchPacket, validateJobReceipt } = require('./cloud-agent');

function required(value, label) {
  if (value == null || String(value).trim() === '') throw new Error(`${label} is required`);
  return value;
}

function envelopeFor({ dispatchPacket, inputManifest, runId, prospectId, sourceCheckpointDigest, operation = 'gate1-cursor-research' }) {
  validateDispatchPacket(dispatchPacket);
  required(inputManifest?.manifestDigest, 'handoff input manifest digest');
  return {
    schemaVersion: 'factory-cursor-job-envelope-v1',
    jobId: required(dispatchPacket.dispatchKey, 'handoff job id'),
    operation,
    checkedOutSha: required(inputManifest.expectedHeadSha, 'handoff checked-out head'),
    inputManifestDigest: inputManifest.manifestDigest,
    runId: required(runId, 'handoff run id'),
    prospectId: required(prospectId, 'handoff prospect id'),
    sourceCheckpointDigest: required(sourceCheckpointDigest, 'handoff source checkpoint digest'),
    sourceArtifactDigest: sourceCheckpointDigest,
    sourceIdentityDigest: digest({ runId, prospectId, sourceCheckpointDigest }),
    dispatchDigest: dispatchPacket.dispatchDigest,
    dispatchKey: dispatchPacket.dispatchKey,
  };
}

function createPendingHandoff({ dispatchPacket, inputManifest, runId, prospectId, sourceCheckpointDigest, phaseARunId }) {
  const envelope = envelopeFor({ dispatchPacket, inputManifest, runId, prospectId, sourceCheckpointDigest });
  const pending = {
    schemaVersion: 'factory-cursor-handoff-v1',
    phase: 'awaiting-cursor-receipt',
    immutable: true,
    phaseARunId: required(phaseARunId, 'phase-A workflow run id'),
    envelope,
    dispatchPacket,
    artifact: { name: `current-head-gate1-canary-${phaseARunId}`, digest: digest({ envelope, dispatchPacket }) },
  };
  const unsigned = { ...pending, handoffId: undefined, handoffDigest: undefined };
  const handoffId = digest(unsigned);
  return { ...pending, handoffId, handoffDigest: digest({ ...unsigned, handoffId }) };
}

function validatePendingHandoff(pending, expected = {}) {
  if (!pending || pending.schemaVersion !== 'factory-cursor-handoff-v1' || pending.phase !== 'awaiting-cursor-receipt' || pending.immutable !== true) throw new Error('Durable Cursor handoff is missing or not immutable');
  const unsigned = { ...pending, handoffId: undefined, handoffDigest: undefined };
  if (pending.handoffId !== digest(unsigned) || pending.handoffDigest !== digest({ ...unsigned, handoffId: pending.handoffId })) throw new Error('Durable Cursor handoff digest is stale or invented');
  validateDispatchPacket(pending.dispatchPacket);
  const envelope = pending.envelope;
  for (const field of ['jobId', 'checkedOutSha', 'inputManifestDigest', 'runId', 'prospectId', 'sourceCheckpointDigest', 'sourceArtifactDigest', 'sourceIdentityDigest', 'dispatchDigest', 'dispatchKey']) required(envelope?.[field], `handoff envelope ${field}`);
  if (pending.dispatchPacket.dispatchDigest !== envelope.dispatchDigest || pending.dispatchPacket.dispatchKey !== envelope.dispatchKey) throw new Error('Durable Cursor handoff dispatch binding is mismatched');
  for (const field of ['checkedOutSha', 'inputManifestDigest', 'runId', 'prospectId', 'sourceCheckpointDigest', 'jobId']) if (expected[field] != null && String(envelope[field]) !== String(expected[field])) throw new Error(`Durable Cursor handoff ${field} binding is stale or mismatched`);
  return pending;
}

function validateTerminalCursorResult(result, expected) {
  validatePendingHandoff(result.pending, expected);
  if (result.schemaVersion !== 'factory-cursor-terminal-result-v1' || result.authorLogin !== 'cursor[bot]') throw new Error('Cursor terminal result is not an authenticated cursor[bot] receipt');
  required(result.commentId, 'Cursor terminal result comment id');
  if (!String(result.commentUrl || '').startsWith('https://github.com/')) throw new Error('Cursor terminal result comment URL is not GitHub-native');
  if (result.handoffId !== result.pending.handoffId || result.dispatchKey !== result.pending.envelope.dispatchKey) throw new Error('Cursor terminal result handoff binding is mismatched');
  const receipt = result.receipt;
  const kind = receipt?.operation;
  if (!kind) throw new Error('Cursor terminal result receipt operation is missing');
  validateJobReceipt(receipt, { kind, expectedEnvelope: { ...result.pending.envelope, operation: kind, stage: kind } });
  canonicalThreadUrl(receipt.threadUrl);
  return result;
}

function claimResume(ledger, handoffId, resultId) {
  const current = ledger && typeof ledger === 'object' ? ledger : { schemaVersion: 'factory-cursor-resume-ledger-v1', consumedHandoffs: [], consumedResults: [] };
  if (!Array.isArray(current.consumedHandoffs) || !Array.isArray(current.consumedResults)) throw new Error('Cursor resume ledger is malformed');
  if (current.consumedHandoffs.includes(handoffId) || current.consumedResults.includes(String(resultId))) throw new Error('Cursor resume replay detected');
  current.consumedHandoffs.push(handoffId); current.consumedResults.push(String(resultId)); current.lastHandoffId = handoffId; current.lastResultId = String(resultId);
  return current;
}

module.exports = { envelopeFor, createPendingHandoff, validatePendingHandoff, validateTerminalCursorResult, claimResume };
