#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { createDispatchPacket } = require('../src/factory/cloud-agent');
const { digest } = require('../src/factory/prescription-policy');

const repository = 'alchemistj/ff-content-demo-factory';
const issueNumber = 8;
const prNumber = 1;
const branch = 'architect/greenfield-gate1';
const files = [
  'canary/inputs/360-four-page-reseal-approval.json',
  'canary/inputs/360-four-page-reseal-ledger.json',
  'canary/inputs/360-garage-door-and-more.discovery.json',
  'canary/outputs/360-four-page-reseal-handoff.json',
];

function byteDigest(file) {
  return 'sha256:' + crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function gitHead() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || 'git rev-parse HEAD failed');
  return result.stdout.trim();
}

function main(options = {}) {
  const env = options.env || process.env;
  const root = options.root || process.cwd();
  const lineageRoot = options.lineageRoot || root;
  const currentHead = options.currentHead || gitHead();
  const reviewedHeadSha = options.expectedHeadSha || env.EXPECTED_HEAD_SHA || env.FACTORY_EXPECTED_HEAD_SHA || currentHead;
  const surface = options.surface || env.FACTORY_PACKET_SURFACE || 'historical';
  const sealedReplayExecuted = options.sealedReplayExecuted === true || env.FACTORY_SEALED_REPLAY_EXECUTED === 'true';
  const liveConnectorExecuted = options.liveConnectorExecuted === true || env.FACTORY_LIVE_CONNECTOR_EXECUTED === 'true';
  if (liveConnectorExecuted) throw new Error('prepare packet refuses to claim live connector execution');
  if (surface === 'current-proof') {
    if (!reviewedHeadSha || reviewedHeadSha !== currentHead) throw new Error('current-proof packet must bind the exact checked-out head');
    if (!sealedReplayExecuted) throw new Error('current-proof packet requires sealed replay execution at this head');
  }
  const inputFiles = files.map((relativePath) => {
    const absolute = path.resolve(lineageRoot, relativePath);
    if (!fs.existsSync(absolute)) throw new Error('Approved HG1 lineage file is missing: ' + relativePath);
    return { path: relativePath, byteDigest: byteDigest(absolute), bytes: fs.statSync(absolute).size };
  });
  const handoff = JSON.parse(fs.readFileSync(path.resolve(lineageRoot, files[3]), 'utf8'));
  const approval = JSON.parse(fs.readFileSync(path.resolve(lineageRoot, files[0]), 'utf8'));
  const ledger = JSON.parse(fs.readFileSync(path.resolve(lineageRoot, files[1]), 'utf8'));
  if (approval.runId !== handoff.source.checkpoint.runId || ledger.runId !== approval.runId) throw new Error('Approved HG1 lineage run binding is inconsistent');
  if (ledger.prospectId !== handoff.prospect.prospectId || ledger.placeId !== handoff.prospect.placeId) throw new Error('Approved HG1 lineage prospect binding is inconsistent');
  const packet = createDispatchPacket({
    repository,
    issueNumber,
    prNumber,
    branch,
    reviewedHeadSha,
    scope: surface === 'current-proof' ? '360-exact-head-sealed-replay' : '360-current-head-gate1-canary-historical-only',
  });
  const sourceIdentity = ledger.sourceIdentity || handoff.source;
  const envelope = {
    schemaVersion: 'factory-360-current-head-gate1-job-envelope-v1',
    operation: 'current-head-gate1-canary',
    stage: surface === 'current-proof' ? 'sealed-replay' : 'historical-prepared',
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
    preparedOnly: surface !== 'current-proof',
    executed: false,
    sealedReplayExecuted: surface === 'current-proof' ? true : false,
    liveConnectorExecuted: false,
    notCurrentProof: surface !== 'current-proof',
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
    limitations: surface === 'current-proof' ? [
      'Rebound at sealed-evidence exact-head execution time; this is not live connector proof.',
      'No Cursor agent, vendor, production writing, or live cursor[bot] terminal/resume path was executed.',
      'integratedFactoryReadiness remains false. The live connector terminal/resume path remains unproven.',
    ] : [
      'Historical prepared packet only; not current-head proof.',
      'No Cursor agent, vendor, production writing, or live canary execution occurred.',
      'This packet is not proof of integrated factory readiness or post-Gate-1 writer quality.',
    ],
  };
  output.packetDigest = digest(output);
  const target = options.target || (surface === 'current-proof'
    ? path.resolve(root, 'canary/outputs/360-current-head-gate1-dispatch-packet.json')
    : path.resolve(root, 'canary/historical/360-current-head-gate1-dispatch-packet.json'));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(output, null, 2) + '\n');
  return { target, packetDigest: output.packetDigest, reviewedHeadSha, surface, notCurrentProof: output.notCurrentProof };
}

if (require.main === module) process.stdout.write(JSON.stringify(main(), null, 2) + '\n');
module.exports = { main };
