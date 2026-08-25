'use strict';

const { digest } = require('./prescription-policy');
const { canonicalThreadUrl, validateDispatchPacket, validateJobReceipt } = require('./cloud-agent');
const fs = require('node:fs');
const path = require('node:path');

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

function createPendingHandoff({ dispatchPacket, inputManifest, runId, prospectId, sourceCheckpointDigest, phaseARunId, inputFiles }) {
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
  if (inputFiles) pending.inputFiles = { request: required(inputFiles.request, 'handoff request input'), selection: required(inputFiles.selection, 'handoff selection input'), qa: required(inputFiles.qa, 'handoff QA input') };
  const unsigned = { ...pending, handoffId: undefined, handoffDigest: undefined };
  const handoffId = digest(unsigned);
  return { ...pending, handoffId, handoffDigest: digest({ ...unsigned, handoffId }) };
}

function validatePendingHandoff(pending, expected = {}) {
  if (!pending || pending.schemaVersion !== 'factory-cursor-handoff-v1' || pending.phase !== 'awaiting-cursor-receipt' || pending.immutable !== true) throw new Error('Durable Cursor handoff is missing or not immutable');
  const unsigned = { ...pending, handoffId: undefined, handoffDigest: undefined };
  if (pending.handoffId !== digest(unsigned) || pending.handoffDigest !== digest({ ...unsigned, handoffId: pending.handoffId })) throw new Error('Durable Cursor handoff digest is stale or invented');
  validateDispatchPacket(pending.dispatchPacket);
  if (!pending.artifact || pending.artifact.name !== `current-head-gate1-canary-${pending.phaseARunId}` || pending.artifact.digest !== digest({ envelope: pending.envelope, dispatchPacket: pending.dispatchPacket })) throw new Error('Durable Cursor handoff artifact identity or digest is stale');
  if (pending.inputFiles) for (const field of ['request', 'selection', 'qa']) required(pending.inputFiles[field], `handoff ${field} input`);
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
  const repository = result.pending.dispatchPacket.repository;
  const issueNumber = String(result.pending.dispatchPacket.issueNumber);
  const escapedRepository = String(repository).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const commentPattern = new RegExp(`^https://github\\.com/${escapedRepository}/issues/${issueNumber}#issuecomment-([0-9]+)$`);
  const commentMatch = commentPattern.exec(String(result.commentUrl || ''));
  if (!commentMatch || String(result.commentId) !== commentMatch[1]) throw new Error('Cursor terminal result comment URL is not bound to the authoritative repository, issue, and comment id');
  if (result.authorType != null && result.authorType !== 'Bot') throw new Error('Cursor terminal result bot identity is not authenticated');
  if (result.handoffId !== result.pending.handoffId || result.dispatchKey !== result.pending.envelope.dispatchKey) throw new Error('Cursor terminal result handoff binding is mismatched');
  const receipt = result.receipt;
  const kind = receipt?.operation;
  if (!kind) throw new Error('Cursor terminal result receipt operation is missing');
  validateJobReceipt(receipt, { kind, expectedEnvelope: { ...result.pending.envelope, operation: kind, stage: kind } });
  canonicalThreadUrl(receipt.threadUrl);
  return result;
}

function claimResume(ledger, handoffId, resultId) {
  const current = ledger && typeof ledger === 'object' ? ledger : { schemaVersion: 'factory-cursor-cas-ledger-v1', consumedHandoffs: [], consumedResults: [] };
  if (current.schemaVersion !== 'factory-cursor-cas-ledger-v1') throw new Error('Cursor handoff CAS ledger schema is not authoritative');
  if (!Array.isArray(current.consumedHandoffs) || !Array.isArray(current.consumedResults)) throw new Error('Cursor resume ledger is malformed');
  if (current.consumedHandoffs.includes(handoffId) || current.consumedResults.includes(String(resultId))) throw new Error('Cursor resume replay detected');
  current.consumedHandoffs.push(handoffId); current.consumedResults.push(String(resultId)); current.lastHandoffId = handoffId; current.lastResultId = String(resultId);
  return current;
}

function claimResumeAtomic(file, handoffId, resultId) {
  required(file, 'Cursor handoff CAS file');
  const directory = path.dirname(file);
  fs.mkdirSync(directory, { recursive: true });
  const lockFile = `${file}.lock`;
  let lockFd;
  try {
    lockFd = fs.openSync(lockFile, 'wx');
  } catch (error) {
    throw new Error(`Cursor handoff CAS lock is already held: ${error.message}`);
  }
  try {
    let ledger;
    try {
      ledger = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw new Error(`Cursor handoff CAS ledger is unreadable: ${error.message}`);
    }
    const next = claimResume(ledger, handoffId, resultId);
    const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify(next, null, 2)}\n`, { flag: 'wx' });
    fs.renameSync(temporary, file);
    return next;
  } finally {
    if (lockFd !== undefined) fs.closeSync(lockFd);
    try { fs.unlinkSync(lockFile); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}

module.exports = { envelopeFor, createPendingHandoff, validatePendingHandoff, validateTerminalCursorResult, claimResume, claimResumeAtomic };
