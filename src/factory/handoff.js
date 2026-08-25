'use strict';

const { digest } = require('./prescription-policy');
const { canonicalThreadUrl, validateDispatchPacket, validateJobReceipt } = require('./cloud-agent');
const fs = require('node:fs');
const path = require('node:path');

function required(value, label) {
  if (value == null || String(value).trim() === '') throw new Error(`${label} is required`);
  return value;
}

function envelopeFor({ dispatchPacket, inputManifest, runId, prospectId, sourceCheckpointDigest, sourceManifestDigest, approvedLineage = null, historicalLineageSeed = approvedLineage, operation = 'gate1-cursor-research' }) {
  validateDispatchPacket(dispatchPacket);
  required(inputManifest?.manifestDigest, 'handoff input manifest digest');
  // Before vendor discovery completes, bind the pending handoff to a
  // deterministic source-checkpoint manifest descriptor. Production packets
  // replace this with the verified source manifest digest from their sealed
  // runtime input; the field is never omitted from the durable handoff.
  const resolvedSourceManifestDigest = sourceManifestDigest || inputManifest.sourceManifestDigest || digest({ sourceCheckpointDigest, inputManifestDigest: inputManifest.manifestDigest });
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
    sourceManifestDigest: required(resolvedSourceManifestDigest, 'handoff source manifest digest'),
    sourceIdentityDigest: digest({ runId, prospectId, sourceCheckpointDigest }),
    dispatchDigest: dispatchPacket.dispatchDigest,
    dispatchKey: dispatchPacket.dispatchKey,
    historicalLineageSeed: historicalLineageSeed ? {
      seedOnly: true,
      packetDigest: required(historicalLineageSeed.packetDigest, 'historical-lineage packet digest'),
      sourceArtifactDigest: required(historicalLineageSeed.sourceArtifactDigest, 'historical-lineage source artifact digest'),
      sourceManifestDigest: required(historicalLineageSeed.sourceManifestDigest || resolvedSourceManifestDigest, 'historical-lineage source manifest digest'),
      evidenceDigest: required(historicalLineageSeed.evidenceDigest, 'historical-lineage evidence digest'),
      pageSetDigest: required(historicalLineageSeed.pageSetDigest, 'historical-lineage page-set digest'),
      prescriptionDigest: required(historicalLineageSeed.prescriptionDigest, 'historical-lineage prescription digest'),
      approvalDigest: required(historicalLineageSeed.approvalDigest, 'historical-lineage approval digest'),
      strategyDigest: required(historicalLineageSeed.strategyDigest, 'historical-lineage strategy digest'),
      selectedServiceIds: [...required(historicalLineageSeed.selectedServiceIds, 'historical-lineage selected services')],
      routes: [...required(historicalLineageSeed.routes, 'historical-lineage routes')],
    } : null,
  };
}

function createPendingHandoff({ dispatchPacket, inputManifest, runId, prospectId, sourceCheckpointDigest, sourceManifestDigest, phaseARunId, inputFiles, placeId = null, approvedLineage = null, historicalLineageSeed = approvedLineage }) {
  const envelope = envelopeFor({ dispatchPacket, inputManifest, runId, prospectId, sourceCheckpointDigest, sourceManifestDigest, approvedLineage, historicalLineageSeed });
  const pending = {
    schemaVersion: 'factory-cursor-handoff-v1',
    phase: 'awaiting-cursor-receipt',
    immutable: true,
    phaseARunId: required(phaseARunId, 'phase-A workflow run id'),
    envelope,
    dispatchPacket,
    identity: { prospectId: required(prospectId, 'handoff prospect id'), placeId: placeId || null, sourceCheckpointDigest: required(sourceCheckpointDigest, 'handoff source checkpoint digest') },
    continuation: { once: true, state: 'awaiting-terminal-result' },
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
  for (const field of ['sourceManifestDigest']) required(envelope?.[field], `handoff envelope ${field}`);
  if (envelope.historicalLineageSeed) {
    if (envelope.historicalLineageSeed.seedOnly !== true) throw new Error('Durable Cursor handoff historical lineage must remain seed-only');
    for (const field of ['packetDigest', 'sourceArtifactDigest', 'sourceManifestDigest', 'evidenceDigest', 'pageSetDigest', 'prescriptionDigest', 'approvalDigest', 'strategyDigest']) required(envelope.historicalLineageSeed[field], `handoff historical-lineage ${field}`);
    if (!Array.isArray(envelope.historicalLineageSeed.selectedServiceIds) || !Array.isArray(envelope.historicalLineageSeed.routes)) throw new Error('Durable Cursor handoff historical-lineage services/routes are malformed');
  }
  if (pending.dispatchPacket.dispatchDigest !== envelope.dispatchDigest || pending.dispatchPacket.dispatchKey !== envelope.dispatchKey) throw new Error('Durable Cursor handoff dispatch binding is mismatched');
  if (!pending.continuation || pending.continuation.once !== true || pending.continuation.state !== 'awaiting-terminal-result') throw new Error('Durable Cursor handoff one-time continuation state is missing or consumed');
  if (!pending.identity || pending.identity.prospectId !== envelope.prospectId || pending.identity.sourceCheckpointDigest !== envelope.sourceCheckpointDigest) throw new Error('Durable Cursor handoff prospect/source identity is mismatched');
  for (const field of ['checkedOutSha', 'inputManifestDigest', 'runId', 'prospectId', 'sourceCheckpointDigest', 'jobId']) if (expected[field] != null && String(envelope[field]) !== String(expected[field])) throw new Error(`Durable Cursor handoff ${field} binding is stale or mismatched`);
  if (expected.repository != null && String(pending.dispatchPacket.repository) !== String(expected.repository)) throw new Error('Durable Cursor handoff repository binding is stale or mismatched');
  if (expected.issueNumber != null && String(pending.dispatchPacket.issueNumber) !== String(expected.issueNumber)) throw new Error('Durable Cursor handoff Issue binding is stale or mismatched');
  if (expected.prNumber != null && String(pending.dispatchPacket.prNumber) !== String(expected.prNumber)) throw new Error('Durable Cursor handoff PR binding is stale or mismatched');
  if (expected.branch != null && String(pending.dispatchPacket.branch) !== String(expected.branch)) throw new Error('Durable Cursor handoff branch binding is stale or mismatched');
  if (expected.phaseARunId != null && String(pending.phaseARunId) !== String(expected.phaseARunId)) throw new Error('Durable Cursor handoff phase-A run binding is stale or mismatched');
  if (expected.handoffDigest != null && pending.handoffDigest !== expected.handoffDigest) throw new Error('Durable Cursor handoff digest is stale or mismatched');
  if (expected.artifactDigest != null && pending.artifact.digest !== expected.artifactDigest) throw new Error('Durable Cursor handoff artifact digest is stale or mismatched');
  if (expected.placeId != null && pending.identity.placeId != null && String(pending.identity.placeId) !== String(expected.placeId)) throw new Error('Durable Cursor handoff place/source identity is stale or mismatched');
  if (Array.isArray(expected.consumedHandoffs) && expected.consumedHandoffs.includes(pending.handoffId)) throw new Error('Durable Cursor handoff has already been consumed');
  return pending;
}

function validateTerminalCursorResult(result, expected) {
  validatePendingHandoff(result.pending, expected);
  if (result.schemaVersion !== 'factory-cursor-terminal-result-v1' || result.authorLogin !== 'cursor[bot]') throw new Error('Cursor terminal result is not an authenticated cursor[bot] receipt');
  required(result.commentId, 'Cursor terminal result comment id');
  const repository = result.pending.dispatchPacket.repository;
  const issueNumber = String(result.pending.dispatchPacket.issueNumber);
  const prNumber = String(result.pending.dispatchPacket.prNumber);
  const escapedRepository = String(repository).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (issueNumber !== '8' || prNumber !== '1') throw new Error('Cursor terminal result Issue/PR target is not the authoritative Issue 8 / PR 1 pair');
  const commentPattern = new RegExp(`^https://github\\.com/${escapedRepository}/(?:issues/${issueNumber}|pull/${prNumber})#issuecomment-([0-9]+)$`);
  const commentMatch = commentPattern.exec(String(result.commentUrl || ''));
  if (!commentMatch || String(result.commentId) !== commentMatch[1]) throw new Error('Cursor terminal result comment URL is not bound to the authoritative repository, issue, and comment id');
  if (result.authorType != null && result.authorType !== 'Bot') throw new Error('Cursor terminal result bot identity is not authenticated');
  const strictDispatchBinding = expected?.strictDispatchBinding === true;
  if (result.handoffId !== result.pending.handoffId || result.dispatchKey !== result.pending.envelope.dispatchKey || (strictDispatchBinding && result.dispatchDigest !== result.pending.envelope.dispatchDigest) || (result.dispatchDigest != null && result.dispatchDigest !== result.pending.envelope.dispatchDigest)) throw new Error('Cursor terminal result handoff/dispatch binding is mismatched');
  const receipt = result.receipt;
  const kind = receipt?.operation;
  if (!kind) throw new Error('Cursor terminal result receipt operation is missing');
  validateJobReceipt(receipt, { kind, expectedEnvelope: { ...result.pending.envelope, operation: kind, stage: kind, ...(strictDispatchBinding ? { handoffId: result.pending.handoffId, dispatchKey: result.pending.envelope.dispatchKey, dispatchDigest: result.pending.envelope.dispatchDigest } : {}) } });
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

function claimPhaseBAtomic(file, { handoffId, resultId } = {}) {
  required(handoffId, 'phase-B handoff id');
  required(resultId, 'phase-B result id');
  return claimResumeAtomic(file, `phase-b:${handoffId}`, `phase-b:${resultId}`);
}

function downloadPhaseAArtifact({ phaseARunId, repository, artifactName, dest, env = process.env, spawnSyncImpl }) {
  required(phaseARunId, 'phase-A workflow run id');
  required(repository, 'phase-A repository');
  required(artifactName, 'phase-A artifact name');
  required(dest, 'phase-A download directory');
  fs.mkdirSync(dest, { recursive: true });
  const spawnSync = spawnSyncImpl || require('node:child_process').spawnSync;
  const downloaded = spawnSync('gh', ['run', 'download', String(phaseARunId), '--name', artifactName, '--dir', dest, '--repo', repository], { encoding: 'utf8', env });
  if (downloaded.status !== 0) throw new Error(`Phase-A artifact download failed: ${(downloaded.stderr || downloaded.stdout || 'unknown error').trim()}`);
  return dest;
}

function retrievePhaseAHandoff({ phaseARunId, repository, destDir, artifactName, expected = {}, downloader, env = process.env }) {
  const name = artifactName || `current-head-gate1-canary-${required(phaseARunId, 'phase-A workflow run id')}`;
  const dest = required(destDir, 'phase-A download directory');
  const download = downloader || ((args) => downloadPhaseAArtifact({ ...args, env }));
  download({ phaseARunId: required(phaseARunId, 'phase-A workflow run id'), repository: required(repository, 'phase-A repository'), artifactName: name, dest });
  const pendingFile = path.join(dest, 'current-head-gate1-pending.json');
  if (!fs.existsSync(pendingFile)) throw new Error('Phase-A pending handoff artifact is missing');
  const pending = JSON.parse(fs.readFileSync(pendingFile, 'utf8'));
  validatePendingHandoff(pending, { ...expected, phaseARunId });
  if (pending.artifact.name !== name) throw new Error('Phase-A artifact name is mismatched');
  return { pending, pendingFile };
}

module.exports = { envelopeFor, createPendingHandoff, validatePendingHandoff, validateTerminalCursorResult, claimResume, claimResumeAtomic, claimPhaseBAtomic, downloadPhaseAArtifact, retrievePhaseAHandoff };
