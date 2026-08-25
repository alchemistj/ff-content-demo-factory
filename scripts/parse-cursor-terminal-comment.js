#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const { extractJson } = require('../src/collect-cursor-terminal-result');

function required(value, label) {
  if (value == null || String(value).trim() === '') throw new Error(`${label} is required`);
  return String(value);
}

function main(argv = process.argv.slice(2)) {
  const [commentFile, authorLogin, commentId, commentUrl] = argv;
  if (required(authorLogin, 'terminal author') !== 'cursor[bot]') throw new Error('terminal comment is not from cursor[bot]');
  const raw = extractJson(fs.readFileSync(required(commentFile, 'terminal comment file'), 'utf8'));
  required(raw.handoffId, 'terminal handoffId');
  required(raw.dispatchKey, 'terminal dispatchKey');
  required(raw.dispatchDigest, 'terminal dispatchDigest');
  required(raw.receipt?.inputDigest, 'terminal receipt inputDigest');
  required(raw.receipt?.envelope?.inputManifestDigest, 'terminal receipt input manifest digest');
  required(raw.receipt?.envelope?.checkedOutSha, 'terminal receipt checked-out head');
  return {
    handoffId: String(raw.handoffId),
    dispatchKey: String(raw.dispatchKey),
    dispatchDigest: String(raw.dispatchDigest),
    phaseARunId: String(required(raw.phaseARunId, 'terminal phase-A run id')),
    inputDigest: String(raw.receipt.inputDigest),
    inputManifestDigest: String(raw.receipt.envelope.inputManifestDigest),
    sourceCheckpointDigest: String(required(raw.receipt.envelope.sourceCheckpointDigest, 'terminal source checkpoint digest')),
    sourceManifestDigest: String(required(raw.receipt.envelope.sourceManifestDigest, 'terminal source manifest digest')),
    checkedOutSha: String(raw.receipt.envelope.checkedOutSha),
    commentId: String(required(commentId, 'terminal comment id')),
    commentUrl: required(commentUrl, 'terminal comment URL'),
  };
}

if (require.main === module) {
  try { process.stdout.write(`${JSON.stringify(main())}\n`); } catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { main };
