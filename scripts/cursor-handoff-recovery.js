#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { findClaim, findTerminalOutcome, findTerminalConflict, terminalOutcomeKey } = require('../src/factory/github-ledger');

function readJson(file) { return JSON.parse(fs.readFileSync(path.resolve(file), 'utf8')); }

function decide({ pending, result, comments }) {
  const envelope = pending.envelope;
  const outcome = {
    repository: pending.dispatchPacket.repository,
    issueNumber: pending.dispatchPacket.issueNumber,
    prNumber: pending.dispatchPacket.prNumber,
    branch: pending.dispatchPacket.branch,
    checkedOutSha: envelope.checkedOutSha,
    kind: 'resume',
    handoffId: pending.handoffId,
    dispatchKey: envelope.dispatchKey,
    dispatchDigest: envelope.dispatchDigest,
    runId: envelope.runId,
    prospectId: envelope.prospectId,
    sourceCheckpointDigest: envelope.sourceCheckpointDigest,
    sourceManifestDigest: envelope.sourceManifestDigest,
    inputManifestDigest: envelope.inputManifestDigest,
    jobId: pending.phaseARunId,
    inputDigest: result.receipt?.inputDigest,
    outputDigest: result.receipt?.outputDigest,
  };
  const ownerToken = terminalOutcomeKey(outcome);
  const immutable = { ...outcome, ownerToken, resultId: ownerToken };
  const conflict = findTerminalConflict(comments, outcome);
  if (conflict) return { action: 'quarantine-conflict', status: 'conflict', ownerToken, outcomeKey: ownerToken, conflict, expected: immutable };
  const existing = findTerminalOutcome(comments, outcome);
  if (existing?.status === 'resumed') return { action: 'noop', status: 'resumed', ownerToken, outcomeKey: ownerToken, existing };
  if (existing?.status === 'phase_b_claimed') return { action: 'recover-phase-b', status: 'phase_b_claimed', ownerToken, outcomeKey: ownerToken, existing };
  if (existing?.status === 'terminal') return { action: 'resume-phase-b', status: 'terminal', ownerToken, outcomeKey: ownerToken, existing };
  const current = findClaim(comments, immutable);
  if (current?.status === 'resumed') return { action: 'noop', status: 'resumed', ownerToken, outcomeKey: ownerToken, existing: current };
  if (current?.status === 'phase_b_claimed') return { action: 'recover-phase-b', status: 'phase_b_claimed', ownerToken, outcomeKey: ownerToken, existing: current };
  if (current?.status === 'terminal') return { action: 'resume-phase-b', status: 'terminal', ownerToken, outcomeKey: ownerToken, existing: current };
  if (current?.status === 'in_motion') return { action: 'recover-terminal', status: 'in_motion', ownerToken, outcomeKey: ownerToken, existing: current };
  return { action: 'record-terminal', status: null, ownerToken, outcomeKey: ownerToken, expected: immutable };
}

function main(argv = process.argv.slice(2)) {
  const [pendingFile, resultFile, commentsFile] = argv;
  if (!pendingFile || !resultFile || !commentsFile) throw new Error('pending, terminal result, and ledger comments files are required');
  return decide({ pending: readJson(pendingFile), result: readJson(resultFile), comments: readJson(commentsFile) });
}

if (require.main === module) {
  try { process.stdout.write(`${JSON.stringify(main())}\n`); } catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { decide, main };
