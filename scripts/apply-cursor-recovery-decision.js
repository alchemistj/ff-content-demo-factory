#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { markerFor, markerBody, assertTransition, findClaim } = require('../src/factory/github-ledger');

function read(file) { return JSON.parse(fs.readFileSync(path.resolve(file), 'utf8')); }
function write(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); }

// The JSON emitted by cursor-handoff-recovery.js is the sole authority for
// recovery action.  Workflows may post the files this function emits, but may
// not independently re-derive terminal/phase-B decisions in shell snippets.
function apply({ pending, result, comments, decision, directory }) {
  fs.mkdirSync(directory, { recursive: true });
  const state = { schemaVersion: 'factory-recovery-decision-v1', action: decision.action, status: decision.status || null, ownerToken: decision.ownerToken || null, outcomeKey: decision.outcomeKey || null };
  write(path.join(directory, 'recovery-state.json'), state);
  if (decision.action === 'quarantine-conflict') {
    write(path.join(directory, 'conflict-quarantined.json'), { ...state, conflict: decision.conflict });
    throw new Error('conflicting terminal result quarantined; phase B is forbidden');
  }
  if (['noop', 'recover-phase-b'].includes(decision.action)) {
    if (decision.action === 'noop') fs.writeFileSync(path.join(directory, 'resume-already-claimed'), 'true');
    if (decision.action !== 'noop') fs.writeFileSync(path.join(directory, 'terminal-already-recorded'), 'true');
    return state;
  }
  const base = {
    repository: pending.dispatchPacket.repository, issueNumber: pending.dispatchPacket.issueNumber, prNumber: pending.dispatchPacket.prNumber,
    branch: pending.dispatchPacket.branch, checkedOutSha: pending.envelope.checkedOutSha, handoffId: pending.handoffId,
    dispatchKey: pending.envelope.dispatchKey, dispatchDigest: pending.envelope.dispatchDigest, runId: pending.envelope.runId,
    prospectId: pending.prospectId || pending.envelope.prospectId, sourceCheckpointDigest: pending.envelope.sourceCheckpointDigest,
    sourceManifestDigest: pending.envelope.sourceManifestDigest, inputManifestDigest: pending.envelope.inputManifestDigest,
    jobId: pending.phaseARunId, kind: 'resume', ownerToken: decision.ownerToken, resultId: decision.ownerToken,
    inputDigest: result.receipt.inputDigest, outputDigest: result.receipt.outputDigest,
    threadUrl: result.receipt.threadUrl, model: result.bundle?.model, commentId: result.commentId, commentUrl: result.commentUrl,
  };
  if (decision.action === 'record-terminal') {
    const posted = findClaim(comments, { ...base, kind: 'dispatch', ownerToken: pending.envelope.dispatchKey, resultId: pending.envelope.dispatchDigest, status: 'posted' });
    if (!posted?.commentId || !posted.commentUrl) throw new Error('authoritative dispatch marker missing before in_motion');
    const inMotion = markerFor({ ...base, status: 'in_motion' });
    assertTransition({ ...posted, ...base, status: 'posted', ownerToken: base.ownerToken, kind: 'resume' }, inMotion);
    const terminal = markerFor({ ...base, status: 'terminal' });
    assertTransition(inMotion, terminal);
    const phaseB = markerFor({ ...base, status: 'phase_b_claimed' });
    assertTransition(terminal, phaseB);
    fs.writeFileSync(path.join(directory, 'cursor-in-motion-ledger-marker.md'), markerBody(inMotion));
    fs.writeFileSync(path.join(directory, 'cursor-resume-ledger-marker.md'), markerBody(terminal));
    fs.writeFileSync(path.join(directory, 'cursor-phase-b-claim.md'), markerBody(phaseB));
    state.next = 'post-in-motion-terminal-and-phase-b';
  } else if (decision.action === 'recover-terminal') {
    const inMotion = decision.existing;
    if (!inMotion || inMotion.status !== 'in_motion') throw new Error('in_motion recovery marker is missing');
    const terminal = markerFor({ ...base, status: 'terminal' });
    assertTransition(inMotion, terminal);
    const phaseB = markerFor({ ...base, status: 'phase_b_claimed' });
    assertTransition(terminal, phaseB);
    fs.writeFileSync(path.join(directory, 'cursor-resume-ledger-marker.md'), markerBody(terminal));
    fs.writeFileSync(path.join(directory, 'cursor-phase-b-claim.md'), markerBody(phaseB));
    state.next = 'post-terminal-and-phase-b';
  } else if (decision.action === 'resume-phase-b') {
    const terminal = decision.existing;
    if (!terminal || terminal.status !== 'terminal') throw new Error('terminal ledger state is missing before phase-B claim');
    const phaseB = markerFor({ ...base, status: 'phase_b_claimed' });
    assertTransition(terminal, phaseB);
    fs.writeFileSync(path.join(directory, 'cursor-phase-b-claim.md'), markerBody(phaseB));
    state.next = 'post-phase-b';
  }
  write(path.join(directory, 'recovery-state.json'), state);
  return state;
}

function main(argv = process.argv.slice(2)) {
  const [pendingFile, resultFile, commentsFile, decisionFile, directory = 'canary/phase-a'] = argv;
  if (!pendingFile || !resultFile || !commentsFile || !decisionFile) throw new Error('pending, result, comments, decision, and output directory are required');
  return apply({ pending: read(pendingFile), result: read(resultFile), comments: read(commentsFile), decision: read(decisionFile), directory });
}

if (require.main === module) {
  try { process.stdout.write(`${JSON.stringify(main())}\n`); } catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { apply, main };
