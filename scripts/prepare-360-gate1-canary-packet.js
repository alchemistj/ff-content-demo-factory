#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { createDispatchPacket } = require('../src/factory/cloud-agent');
const { digest } = require('../src/factory/prescription-policy');
const { verifySealed360Lineage } = require('../src/factory/sealed-evidence');

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

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function gitHead() {
  return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}

function main(options = {}) {
  const env = options.env || process.env;
  const root = options.root || process.cwd();
  const lineageRoot = options.lineageRoot || root;
  const currentHead = options.currentHead || gitHead();
  const expectedHeadSha = options.expectedHeadSha || env.EXPECTED_HEAD_SHA || env.FACTORY_EXPECTED_HEAD_SHA;
  const sealedReplayExecuted = options.sealedReplayExecuted === true || env.FACTORY_SEALED_REPLAY_EXECUTED === 'true';
  const liveConnectorExecuted = options.liveConnectorExecuted === true || env.FACTORY_LIVE_CONNECTOR_EXECUTED === 'true';
  if (liveConnectorExecuted) throw new Error('prepare packet refuses to claim live connector execution');
  if (!/^[a-f0-9]{40}$/.test(String(expectedHeadSha || ''))) throw new Error('Runtime packet requires a 40-character EXPECTED_HEAD_SHA; no stale default is allowed');
  if (currentHead !== expectedHeadSha) throw new Error(`Runtime packet head mismatch: checkout ${currentHead} is not asserted ${expectedHeadSha}`);
  if (options.surface === 'current-proof' && sealedReplayExecuted !== true) throw new Error('sealed replay execution is required before current-proof preparation');
  const handoff = readJson(path.resolve(lineageRoot, files[3]));
  const approval = readJson(path.resolve(lineageRoot, files[0]));
  const ledger = readJson(path.resolve(lineageRoot, files[1]));
  const lineage = verifySealed360Lineage({ root: lineageRoot, handoff });
  const inputFiles = files.map((relativePath) => {
    const absolute = path.resolve(lineageRoot, relativePath);
    if (!fs.existsSync(absolute)) throw new Error('Approved HG1 lineage file is missing: ' + relativePath);
    return { path: relativePath, byteDigest: byteDigest(absolute), bytes: fs.statSync(absolute).size };
  });
  if (approval.runId !== handoff.source.checkpoint.runId || ledger.runId !== approval.runId) throw new Error('Approved HG1 lineage run binding is inconsistent');
  const packet = createDispatchPacket({
    repository,
    issueNumber,
    prNumber,
    branch,
    reviewedHeadSha: currentHead,
    scope: sealedReplayExecuted ? '360-exact-head-sealed-replay' : '360-current-head-gate1-canary-runtime-prepared-only',
  });
  const envelope = {
    schemaVersion: 'factory-360-current-head-gate1-job-envelope-v2',
    operation: 'current-head-gate1-canary',
    stage: sealedReplayExecuted ? 'sealed-replay' : 'dispatch',
    repository,
    issueNumber,
    prNumber,
    branch,
    checkedOutSha: currentHead,
    runId: String(approval.runId),
    prospectId: handoff.prospect.prospectId,
    placeId: handoff.prospect.placeId,
    sourceIdentityDigest: digest(ledger.sourceIdentity || handoff.source),
    sourceCheckpointDigest: digest(handoff.source.checkpoint),
    sourceManifestDigest: digest(ledger),
    inputManifestDigest: digest(inputFiles),
    dispatchKey: packet.dispatchKey,
    dispatchDigest: packet.dispatchDigest,
    approvedLineage: {
      sourceArtifactDigest: lineage.sourceArtifactDigest,
      evidenceDigest: lineage.evidenceDigest,
      pageSetDigest: lineage.pageSetDigest,
      prescriptionDigest: lineage.prescriptionDigest,
      approvalDigest: lineage.approvalDigest,
      strategyDigest: lineage.strategyDigest,
      selectedServiceIds: lineage.selectedServiceIds,
      routes: lineage.routes,
      candidateServiceIds: lineage.candidateServiceIds,
    },
  };
  const output = {
    schemaVersion: 'factory-360-current-head-gate1-runtime-dispatch-packet-v2',
    runtimeGenerated: true,
    preparedOnly: !sealedReplayExecuted,
    executed: false,
    sealedReplayExecuted,
    liveConnectorExecuted: false,
    syntheticReplayEligible: false,
    notCurrentProof: !sealedReplayExecuted,
    repository,
    issueNumber,
    prNumber,
    branch,
    reviewedHeadSha: currentHead,
    checkedOutSha: currentHead,
    envelope,
    dispatchPacket: packet,
    // Carry the exact Josh-approved handoff into the runtime packet.  The
    // production verifier reloads and revalidates these bytes before any
    // vendor/Cursor work; a digest-only claim is not an authoritative input.
    approvedLineage: { ...lineage, inputFiles, approval: handoff.approval, prospect: handoff.prospect, source: handoff.source, handoff },
    limitations: sealedReplayExecuted ? [
      'Rebound at sealed-evidence exact-head execution time; this is not live connector proof.',
      'No Cursor agent, vendor, production writing, or live cursor[bot] terminal/resume path was executed.',
      'integratedFactoryReadiness remains false. The live connector terminal/resume path remains unproven.',
    ] : [
      'Generated after exact checkout from verified historical Josh-approved bytes.',
      'No live workflow, Cursor agent, vendor, or production writing was dispatched.',
      'This is a dispatch input, not integrated factory or Human Gate 1 proof.',
    ],
  };
  output.packetDigest = digest(output);
  const defaultTarget = sealedReplayExecuted
    ? path.resolve(root, 'canary/outputs/360-current-head-gate1-dispatch-packet.json')
    : path.resolve(root, env.RUNTIME_PACKET_PATH || 'canary/outputs/runtime/360-current-head-gate1-dispatch-packet.json');
  const target = options.target || defaultTarget;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(output, null, 2) + '\n');
  return { target, packetDigest: output.packetDigest, checkedOutSha: currentHead, reviewedHeadSha: currentHead, sealedReplayExecuted, liveConnectorExecuted: false, syntheticReplayEligible: false };
}

if (require.main === module) process.stdout.write(JSON.stringify(main(), null, 2) + '\n');
module.exports = { main };
