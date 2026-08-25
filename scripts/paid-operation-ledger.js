#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { digest } = require('../src/factory/prescription-policy');
const { operationArtifactBinding } = require('../src/factory/receipt-store');
const { markerFor, markerBody, assertTransition } = require('../src/factory/github-ledger');

function read(file) { return JSON.parse(fs.readFileSync(path.resolve(file), 'utf8')); }
function required(value, name) { if (value == null || String(value).trim() === '') throw new Error(`${name} is required`); return value; }

function operationContext(pending, result) {
  const projection = pending.apifyOperationProjection || pending.envelope?.apifyOperationProjection || null;
  const outputDigest = result.receipt?.outputDigest || digest(result);
  const inputDigest = result.receipt?.inputDigest || digest(pending);
  const operationKey = projection?.operationKey || `phase-b:${pending.handoffId}:${outputDigest}`;
  const requestDigest = projection?.requestDigest || digest({ pending, result });
  const idempotencyKey = projection?.idempotencyKey || `factory-phase-b-${digest({ operationKey, requestDigest }).slice(0, 32)}`;
  return { operationKey, requestDigest, inputDigest: projection?.inputDigest || inputDigest, outputDigest, idempotencyKey, requestProjection: projection, provider: 'apify', operation: projection?.operation || 'phase-b-paid-work', context: { repository: pending.dispatchPacket.repository, issueNumber: pending.dispatchPacket.issueNumber, prNumber: pending.dispatchPacket.prNumber, branch: pending.dispatchPacket.branch, checkedOutSha: pending.envelope.checkedOutSha, handoffId: pending.handoffId, dispatchKey: pending.envelope.dispatchKey, runId: pending.envelope.runId, prospectId: pending.envelope.prospectId, phaseARunId: pending.phaseARunId, sourceCheckpointDigest: pending.envelope.sourceCheckpointDigest, sourceManifestDigest: pending.envelope.sourceManifestDigest } };
}

function createArtifact({ pending, result, stage, response = null }) {
  const base = operationContext(pending, result);
  const binding = operationArtifactBinding({ ...base, stage, requestProjection: base.requestProjection, responseDigest: response ? digest(response) : null });
  const content = { schemaVersion: 'factory-paid-operation-artifact-v1', stage, operationKey: base.operationKey, provider: base.provider, operation: base.operation, inputDigest: base.inputDigest, requestDigest: base.requestDigest, idempotencyKey: base.idempotencyKey, requestProjection: base.requestProjection, responseDigest: response ? digest(response) : null, context: base.context, response: response || null };
  const contentDigest = digest(content);
  return { ...content, contentDigest, artifactName: binding.artifactName, artifactId: binding.artifactId, artifactDigest: contentDigest, artifactContentDigest: contentDigest, artifactOrigin: binding.artifactOrigin };
}

function createPaidMarker({ pending, result, previous, artifact, status }) {
  required(artifact?.artifactName, 'paid artifact name');
  required(artifact?.artifactId, 'paid artifact id');
  required(artifact?.artifactDigest, 'paid artifact digest');
  required(artifact?.artifactContentDigest, 'paid artifact content digest');
  const base = operationContext(pending, result);
  const outputDigest = base.outputDigest;
  const marker = markerFor({ kind: 'resume', repository: pending.dispatchPacket.repository, issueNumber: pending.dispatchPacket.issueNumber, prNumber: pending.dispatchPacket.prNumber, branch: pending.dispatchPacket.branch, checkedOutSha: pending.envelope.checkedOutSha, handoffId: pending.handoffId, dispatchKey: pending.envelope.dispatchKey, dispatchDigest: pending.envelope.dispatchDigest, runId: pending.envelope.runId, prospectId: pending.envelope.prospectId, sourceCheckpointDigest: pending.envelope.sourceCheckpointDigest, sourceManifestDigest: pending.envelope.sourceManifestDigest, inputManifestDigest: pending.envelope.inputManifestDigest, jobId: pending.phaseARunId, ownerToken: previous?.ownerToken || base.operationKey, resultId: previous?.resultId || base.operationKey, inputDigest: base.inputDigest, outputDigest, artifactName: artifact.artifactName, artifactId: artifact.artifactId, artifactDigest: artifact.artifactDigest, artifactContentDigest: artifact.artifactContentDigest, operationKey: base.operationKey, requestDigest: base.requestDigest, operationState: status === 'paid_prepared' ? 'prepared' : 'accepted', providerRunId: artifact.response?.runId || artifact.runId || null, datasetId: artifact.response?.datasetId || artifact.datasetId || null, responseDigest: artifact.responseDigest || null, status });
  if (previous) assertTransition(previous, marker);
  return marker;
}

function writeArtifact(filename, artifact) { fs.mkdirSync(path.dirname(filename), { recursive: true }); fs.writeFileSync(filename, `${JSON.stringify(artifact, null, 2)}\n`); return artifact; }

module.exports = { operationContext, createArtifact, createPaidMarker, writeArtifact };
