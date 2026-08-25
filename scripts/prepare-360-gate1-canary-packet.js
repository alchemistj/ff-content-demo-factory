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
const files = ['canary/inputs/360-four-page-reseal-approval.json','canary/inputs/360-four-page-reseal-ledger.json','canary/inputs/360-garage-door-and-more.discovery.json','canary/outputs/360-four-page-reseal-handoff.json'];
function byteDigest(file) { return 'sha256:' + crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function main(options = {}) {
  const expectedHeadSha = options.expectedHeadSha || process.env.EXPECTED_HEAD_SHA || process.env.FACTORY_EXPECTED_HEAD_SHA;
  const currentHead = options.currentHead || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (!/^[a-f0-9]{40}$/.test(String(expectedHeadSha || '')) || currentHead !== expectedHeadSha) throw new Error('Runtime packet requires the exact checked-out head; no stale default is allowed');
  if (options.surface === 'current-proof' && options.sealedReplayExecuted !== true) throw new Error('sealed replay execution is required before current-proof preparation');
  const checkedOutSha = currentHead;
  const handoff = readJson(files[3]);
  const approval = readJson(files[0]);
  const ledger = readJson(files[1]);
  const lineage = verifySealed360Lineage({ root: process.cwd(), handoff });
  const inputFiles = files.map((relativePath) => { const absolute = path.resolve(relativePath); if (!fs.existsSync(absolute)) throw new Error('Approved HG1 lineage file is missing: ' + relativePath); return { path: relativePath, byteDigest: byteDigest(absolute), bytes: fs.statSync(absolute).size }; });
  if (approval.runId !== handoff.source.checkpoint.runId || ledger.runId !== approval.runId) throw new Error('Approved HG1 lineage run binding is inconsistent');
  const packet = createDispatchPacket({ repository, issueNumber, prNumber, branch, reviewedHeadSha: checkedOutSha, scope: '360-current-head-gate1-canary-runtime-prepared-only' });
  const envelope = { schemaVersion: 'factory-360-current-head-gate1-job-envelope-v2', operation: 'current-head-gate1-canary', stage: 'dispatch', repository, issueNumber, prNumber, branch, checkedOutSha, runId: String(approval.runId), prospectId: handoff.prospect.prospectId, placeId: handoff.prospect.placeId, sourceIdentityDigest: digest(ledger.sourceIdentity || handoff.source), sourceCheckpointDigest: digest(handoff.source.checkpoint), sourceManifestDigest: digest(ledger), inputManifestDigest: digest(inputFiles), dispatchKey: packet.dispatchKey, dispatchDigest: packet.dispatchDigest, approvedLineage: { sourceArtifactDigest: lineage.sourceArtifactDigest, evidenceDigest: lineage.evidenceDigest, pageSetDigest: lineage.pageSetDigest, prescriptionDigest: lineage.prescriptionDigest, approvalDigest: lineage.approvalDigest, strategyDigest: lineage.strategyDigest, selectedServiceIds: lineage.selectedServiceIds, routes: lineage.routes, candidateServiceIds: lineage.candidateServiceIds } };
  const output = { schemaVersion: 'factory-360-current-head-gate1-runtime-dispatch-packet-v2', runtimeGenerated: true, preparedOnly: true, executed: false, syntheticReplayEligible: false, repository, issueNumber, prNumber, branch, checkedOutSha, envelope, dispatchPacket: packet, approvedLineage: { ...lineage, inputFiles, approval: handoff.approval, prospect: handoff.prospect, source: handoff.source }, limitations: ['Generated after exact checkout from verified historical Josh-approved bytes.','No live workflow, Cursor agent, vendor, or production writing was dispatched.','This is a dispatch input, not integrated factory or Human Gate 1 proof.'] };
  output.packetDigest = digest(output);
  const target = path.resolve(process.env.RUNTIME_PACKET_PATH || 'canary/outputs/runtime/360-current-head-gate1-dispatch-packet.json');
  fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, JSON.stringify(output, null, 2) + '\n');
  return { target, packetDigest: output.packetDigest, checkedOutSha, syntheticReplayEligible: false };
}
if (require.main === module) process.stdout.write(JSON.stringify(main(), null, 2) + '\n');
module.exports = { main };
