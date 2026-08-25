#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { digest } = require('../src/factory/prescription-policy');

function responseDigest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function restoreAcceptedOperation({ snapshotFile, targetFile, expected = {} } = {}) {
  if (!snapshotFile || !targetFile) throw new Error('accepted operation restore requires snapshotFile and targetFile');
  if (!fs.existsSync(snapshotFile)) throw new Error('accepted operation snapshot is missing');
  const artifact = JSON.parse(fs.readFileSync(snapshotFile, 'utf8'));
  if (artifact.schemaVersion !== 'factory-paid-operation-artifact-v1' || artifact.stage !== 'accepted') throw new Error('accepted operation artifact schema is invalid');
  for (const field of ['artifactName', 'artifactId', 'artifactDigest', 'artifactContentDigest', 'operationKey', 'requestDigest', 'idempotencyKey', 'requestProjection', 'responseDigest', 'response']) {
    if (artifact[field] == null) throw new Error(`accepted operation artifact field is missing: ${field}`);
  }
  if (expected.operationKey && artifact.operationKey !== expected.operationKey) throw new Error('accepted operation operationKey binding mismatch');
  if (expected.requestDigest && artifact.requestDigest !== expected.requestDigest) throw new Error('accepted operation requestDigest binding mismatch');
  const core = {};
  for (const [key, value] of Object.entries(artifact)) {
    if (!['artifactName', 'artifactId', 'artifactDigest', 'artifactContentDigest', 'artifactOrigin', 'response'].includes(key)) core[key] = value;
  }
  if (digest(core) !== artifact.artifactContentDigest) throw new Error('accepted operation content digest mismatch');
  if (responseDigest(artifact.response) !== artifact.responseDigest) throw new Error('accepted operation response digest mismatch');
  const runId = artifact.response.runId;
  const datasetId = artifact.response.datasetId;
  if (!runId || !datasetId) throw new Error('accepted operation provider run identity is missing');
  if (expected.providerRunId && String(expected.providerRunId) !== String(runId)) throw new Error('accepted operation provider run binding mismatch');
  if (expected.datasetId && String(expected.datasetId) !== String(datasetId)) throw new Error('accepted operation dataset binding mismatch');
  const projection = artifact.requestProjection;
  const state = {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    receipts: {
      [artifact.operationKey]: {
        schemaVersion: 'factory-paid-operation-v1', status: 'running', provider: artifact.provider,
        operation: artifact.operation, operationKey: artifact.operationKey, runId, datasetId,
        input: projection.input, inputDigest: artifact.inputDigest, requestDigest: artifact.requestDigest,
        idempotencyKey: artifact.idempotencyKey, requestProjection: projection,
        artifactName: artifact.artifactName, artifactId: artifact.artifactId,
        artifactDigest: artifact.artifactDigest, artifactContentDigest: artifact.artifactContentDigest,
        artifactOrigin: 'github-actions', acceptedResponseDigest: artifact.responseDigest,
      },
    },
  };
  fs.mkdirSync(path.dirname(targetFile), { recursive: true });
  const temporary = `${targetFile}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`);
  fs.renameSync(temporary, targetFile);
  return targetFile;
}

if (require.main === module) {
  try { restoreAcceptedOperation({ snapshotFile: process.argv[2], targetFile: process.argv[3] }); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { restoreAcceptedOperation };
