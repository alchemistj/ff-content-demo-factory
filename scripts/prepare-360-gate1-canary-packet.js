#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createDispatchPacket } = require('../src/factory/cloud-agent');
const { digest } = require('../src/factory/prescription-policy');

const repository = 'alchemistj/ff-content-demo-factory';
const issueNumber = 8;
const prNumber = 1;
const branch = 'architect/greenfield-gate1';
const reviewedHeadSha = process.env.EXPECTED_HEAD_SHA || '36f24c1ed15b871d52f1ec0b6fd797ae5e2461e6';
const files = [
  'canary/inputs/360-four-page-reseal-approval.json',
  'canary/inputs/360-four-page-reseal-ledger.json',
  'canary/inputs/360-garage-door-and-more.discovery.json',
  'canary/outputs/360-four-page-reseal-handoff.json',
];

function byteDigest(file) {
  return 'sha256:' + crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function main() {
  const inputFiles = files.map((relativePath) => {
    const absolute = path.resolve(relativePath);
    if (!fs.existsSync(absolute)) throw new Error('Approved HG1 lineage file is missing: ' + relativePath);
    return { path: relativePath, byteDigest: byteDigest(absolute), bytes: fs.statSync(absolute).size };
  });
  const handoff = JSON.parse(fs.readFileSync(files[3], 'utf8'));
  const approval = JSON.parse(fs.readFileSync(files[0], 'utf8'));
  const ledger = JSON.parse(fs.readFileSync(files[1], 'utf8'));
  if (approval.runId !== handoff.source.checkpoint.runId || ledger.runId !== approval.runId) throw new Error('Approved HG1 lineage run binding is inconsistent');
  if (ledger.prospectId !== handoff.prospect.prospectId || ledger.placeId !== handoff.prospect.placeId) throw new Error('Approved HG1 lineage prospect binding is inconsistent');
  const packet = createDispatchPacket({ repository, issueNumber, prNumber, branch, reviewedHeadSha, scope: '360-current-head-gate1-canary-prepared-only' });
  const sourceIdentity = ledger.sourceIdentity || handoff.source;
  const envelope = {
    schemaVersion: 'factory-360-current-head-gate1-job-envelope-v1',
    operation: 'current-head-gate1-canary',
    stage: 'dispatch',
    repository,
    issueNumber,
    prNumber,
    branch,
    checkedOutSha: reviewedHeadSha,
    runId: String(approval.runId),
    prospectId: handoff.prospect.prospectId,
    placeId: handoff.prospect.placeId,
    sourceIdentityDigest: digest(sourceIdentity),
    sourceCheckpointDigest: digest(handoff.source.checkpoint),
    sourceManifestDigest: digest(ledger),
    inputManifestDigest: digest(inputFiles),
    dispatchKey: packet.dispatchKey,
    dispatchDigest: packet.dispatchDigest,
  };
  const output = {
    schemaVersion: 'factory-360-current-head-gate1-dispatch-packet-v1',
    preparedOnly: true,
    executed: false,
    repository,
    issueNumber,
    prNumber,
    branch,
    reviewedHeadSha,
    lineage: {
      approvedRunId: String(approval.runId),
      prospectId: handoff.prospect.prospectId,
      sourceSha: handoff.source.checkpoint.sourceSha,
      sourceArtifactId: handoff.source.artifactId,
      inputFiles,
    },
    inputManifestDigest: envelope.inputManifestDigest,
    envelope,
    dispatchPacket: packet,
    limitations: [
      'Prepared from byte-identical approved Human Gate 1 lineage only; no workflow was dispatched.',
      'No Cursor agent, vendor, production writing, or live canary execution occurred.',
      'This packet is not proof of integrated factory readiness or post-Gate-1 writer quality.',
    ],
  };
  output.packetDigest = digest(output);
  const target = path.resolve('canary/outputs/360-current-head-gate1-dispatch-packet.json');
  fs.writeFileSync(target, JSON.stringify(output, null, 2) + '\n');
  return { target, packetDigest: output.packetDigest, reviewedHeadSha };
}

if (require.main === module) process.stdout.write(JSON.stringify(main(), null, 2) + '\n');
module.exports = { main };
