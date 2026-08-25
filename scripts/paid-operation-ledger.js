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
  const outputDigest = result.receipt?.outputDigest || digest(result);
  const inputDigest = result.receipt?.inputDigest || digest(pending);
  const operationKey = `phase-b:${pending.handoffId}:${outputDigest}`;
  const requestDigest = digest({ pending, result });
  return { operationKey, requestDigest, inputDigest, outputDigest, provider: 'apify', operation: 'phase-b-paid-work', idempotencyKey: `factory-phase-b-${digest({ operationKey, requestDigest }).slice(0, 32)}`, context: { repository: pending.dispatchPacket.repository, issueNumber: pending.dispatchPacket.issueNumber, prNumber: pending.dispatchPacket.prNumber, branch: pending.dispatchPacket.branch, checkedOutSha: pending.envelope.checkedOutSha, handoffId: pending.handoffId, dispatchKey: pending.envelope.dispatchKey, runId: pending.envelope.runId, prospectId: pending.envelope.prospectId, phaseARunId: pending.phaseARunId, sourceCheckpointDigest: pending.envelope.sourceCheckpointDigest, sourceManifestDigest: pending.envelope.sourceManifestDigest } };
}

function createArtifact({ pending, result, stage, response = null }) {
  const base = operationContext(pending, result);
  const binding = operationArtifactBinding({ ...base, stage, responseDigest: response ? digest(response) : null });
  const content = { schemaVersion: 'factory-paid-operation-artifact-v1', stage, binding, response: response || null };
  const contentDigest = digest(content);
  return { ...content, contentDigest, artifactName: binding.artifactName, artifactId: binding.artifactId, artifactDigest: contentDigest, artifactContentDigest: contentDigest };
}

function createPaidMarker({ pending, result, previous, artifact, status }) {
  required(artifact?.artifactName, 'paid artifact name');
  required(artifact?.artifactId, 'paid artifact id');
  required(artifact?.artifactDigest, 'paid artifact digest');
  required(artifact?.artifactContentDigest, 'paid artifact content digest');
  const base = operationContext(pending, result);
  const marker = markerFor({ kind: 'resume', repository: pending.dispatchPacket.repository, issueNumber: pending.dispatchPacket.issueNumber, prNumber: pending.dispatchPacket.prNumber, branch: pending.dispatchPacket.branch, checkedOutSha: pending.envelope.checkedOutSha, handoffId: pending.handoffId, dispatchKey: pending.envelope.dispatchKey, dispatchDigest: pending.envelope.dispatchDigest, runId: pending.envelope.runId, prospectId: pending.envelope.prospectId, sourceCheckpointDigest: pending.envelope.sourceCheckpointDigest, sourceManifestDigest: pending.envelope.sourceManifestDigest, inputManifestDigest: pending.envelope.inputManifestDigest, jobId: pending.phaseARunId, ownerToken: previous?.ownerToken || base.operationKey, resultId: previous?.resultId || base.operationKey, inputDigest: result.receipt?.inputDigest || digest(result), outputDigest: result.receipt?.outputDigest || digest(result), artifactName: artifact.artifactName, artifactId: artifact.artifactId, artifactDigest: artifact.artifactDigest, artifactContentDigest: artifact.artifactContentDigest, operationKey: base.operationKey, requestDigest: base.requestDigest, operationState: status === 'paid_prepared' ? 'prepared' : 'accepted', responseDigest: artifact.binding.responseDigest, status });
  if (previous) assertTransition(previous, marker);
  return marker;
}

function writeArtifact(filename, artifact) { fs.mkdirSync(path.dirname(filename), { recursive: true }); fs.writeFileSync(filename, `${JSON.stringify(artifact, null, 2)}\n`); return artifact; }

module.exports = { operationContext, createArtifact, createPaidMarker, writeArtifact };
