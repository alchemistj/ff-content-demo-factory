#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { validateTerminalCursorResult } = require('./factory/handoff');
const { validateBundle } = require('./factory/cloud-agent');

function readJson(file) { return JSON.parse(fs.readFileSync(path.resolve(file), 'utf8')); }
function extractJson(body) {
  const match = String(body || '').match(/```json\s*([\s\S]*?)\s*```/i);
  if (!match) throw new Error('Cursor terminal comment is missing a JSON result block');
  return JSON.parse(match[1]);
}

function collect({ pendingFile, commentFile, outputFile, authorLogin, commentId, commentUrl }) {
  const pending = readJson(pendingFile);
  const raw = extractJson(fs.readFileSync(path.resolve(commentFile), 'utf8'));
  const result = {
    schemaVersion: 'factory-cursor-terminal-result-v1', authorLogin, commentId: String(commentId), commentUrl,
    pending, handoffId: raw.handoffId, dispatchKey: raw.dispatchKey, receipt: raw.receipt, bundle: raw.bundle,
  };
  validateTerminalCursorResult(result, { checkedOutSha: pending.envelope.checkedOutSha, inputManifestDigest: pending.envelope.inputManifestDigest, runId: pending.envelope.runId, prospectId: pending.envelope.prospectId, sourceCheckpointDigest: pending.envelope.sourceCheckpointDigest, jobId: pending.envelope.jobId });
  validateBundle(result.bundle, { expectedHeadSha: pending.envelope.checkedOutSha, inputManifestDigest: pending.envelope.inputManifestDigest, dispatch: pending.dispatchPacket, repository: pending.dispatchPacket.repository });
  fs.mkdirSync(path.dirname(path.resolve(outputFile)), { recursive: true });
  fs.writeFileSync(path.resolve(outputFile), `${JSON.stringify(result, null, 2)}\n`);
  return result;
}

if (require.main === module) {
  try {
    const [,, pendingFile, commentFile, outputFile, authorLogin, commentId, commentUrl] = process.argv;
    process.stdout.write(`${JSON.stringify(collect({ pendingFile, commentFile, outputFile, authorLogin, commentId, commentUrl }), null, 2)}\n`);
  } catch (error) { console.error(error.stack || error.message); process.exitCode = 1; }
}

module.exports = { collect, extractJson };
