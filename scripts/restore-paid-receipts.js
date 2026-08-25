#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { digest } = require('../src/factory/prescription-policy');

function selectExactArtifact(artifacts, expected) {
  if (!expected?.name || !expected?.contentDigest) throw new Error('durable paid receipt artifact binding is incomplete');
  const matches = (artifacts || []).filter((artifact) => !artifact.expired && artifact.name === expected.name && (!expected.id || String(artifact.id) === String(expected.id)) && (!expected.digest || artifact.digest === expected.digest));
  if (matches.length !== 1) throw new Error(`exact durable paid receipt artifact is missing or ambiguous (${matches.length})`);
  return matches[0];
}

function restore({ snapshotFile, targetFile, expected }) {
  if (!snapshotFile || !targetFile) throw new Error('paid receipt restore requires snapshotFile and targetFile');
  if (!fs.existsSync(snapshotFile)) throw new Error('durable paid receipt snapshot is missing');
  const snapshot = JSON.parse(fs.readFileSync(snapshotFile, 'utf8'));
  const envelope = snapshot.schemaVersion === 'factory-paid-receipt-artifact-v1' ? snapshot : { schemaVersion: 'factory-paid-receipt-artifact-v1', binding: null, content: snapshot };
  const content = envelope.content;
  if (content?.schemaVersion !== 1 || !content.receipts || typeof content.receipts !== 'object') throw new Error('durable paid receipt snapshot schema is invalid');
  if (expected) {
    for (const field of ['handoffId', 'dispatchKey', 'outputDigest', 'phaseARunId']) {
      if (String(envelope.binding?.[field] ?? '') !== String(expected[field] ?? '')) throw new Error(`durable paid receipt ${field} binding mismatch`);
    }
    const actualDigest = digest(content);
    if (actualDigest !== expected.contentDigest) throw new Error('durable paid receipt content digest mismatch');
  }
  fs.mkdirSync(path.dirname(targetFile), { recursive: true });
  const temporary = `${targetFile}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(content, null, 2)}\n`);
  fs.renameSync(temporary, targetFile);
  return targetFile;
}

if (require.main === module) {
  try {
    const [, , snapshotFile, targetFile] = process.argv;
    process.stdout.write(`${restore({ snapshotFile, targetFile })}\n`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { restore, selectExactArtifact };
