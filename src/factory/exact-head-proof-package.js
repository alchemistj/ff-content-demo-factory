'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { digest } = require('./prescription-policy');
const { PLACE_ID } = require('./sealed-evidence');
const { TRUSTED_ARTIFACTS } = require('./trusted-artifacts');

const PACKAGE_SCHEMA = 'factory-exact-head-sealed-360-proof-package-v1';
const SEALED_PROOF_SCOPE = 'sealed-360-exact-head-replay-only';
const TRUSTED_360 = TRUSTED_ARTIFACTS['32717620900:9516514426:81587f8422a23313fd7868751061eec7e2fb5926'];
const REQUIRED_PAGE_NAMES = ['Home', 'Garage Door Repair', 'Garage Door Installation', 'Contact'];
const REQUIRED_RELATIVE_FILES = Object.freeze([
  'canary/outputs/gate1.md',
  'canary/outputs/current-head-gate1-proof.json',
  'canary/outputs/exact-head-proof.json',
  'canary/state/factory-state.json',
  'canary/outputs/source-evidence-receipt-ledger.json',
  'canary/outputs/four-page-prescription.json',
  'canary/outputs/exact-head-sealed-360-proof-package.json',
]);
const CURRENT_PACKET_RELATIVE = 'canary/outputs/360-current-head-gate1-dispatch-packet.json';
const SEALED_REPLAY_TRUTH = [
  '### Sealed replay truth',
  '',
  '- This Gate 1 artifact was produced by sealed-evidence replay of approved 360 repository inputs at the exact checked-out head.',
  '- No live Apify call, no additional Cursor research or writer job, and no GitHub `cursor[bot]` terminal-bundle → automatic phase-B path was executed.',
  '- `integratedFactoryReadiness` remains false. The live connector terminal/resume path remains unproven.',
  '- Production page copy has not been written. Strategy, rejected services, and evidence remain internal artifacts, not public pages.',
].join('\n');

function required(value, name) {
  if (value == null || value === '') throw new Error(`${name} is required`);
  return value;
}

function byteDigest(contents) {
  return `sha256:${crypto.createHash('sha256').update(contents).digest('hex')}`;
}

function readIfExists(filename) {
  return fs.existsSync(filename) ? fs.readFileSync(filename) : null;
}

function readJsonIfExists(filename) {
  const bytes = readIfExists(filename);
  return bytes ? JSON.parse(bytes.toString('utf8')) : null;
}

function writeJson(filename, value) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`);
}

function appendSealedReplayTruth(markdown) {
  const text = String(markdown || '').trimEnd();
  if (!text) throw new Error('Gate 1 markdown is empty');
  if (/### Sealed replay truth/.test(text)) return `${text}\n`;
  return `${text}\n\n${SEALED_REPLAY_TRUTH}\n`;
}

function assertReadableGate1Markdown(markdown) {
  const text = String(markdown || '');
  if (!text.trim()) throw new Error('Gate 1 markdown is empty');
  for (const name of REQUIRED_PAGE_NAMES) {
    if (!text.includes(name)) throw new Error(`Gate 1 markdown does not name ${name}`);
  }
  if (!text.includes('| / |') && !text.includes('| `/` |') && !/\|\s*\/\s*\|/.test(text)) {
    throw new Error('Gate 1 markdown is missing the Home route');
  }
  if (!text.includes('/garage-door-repair')) throw new Error('Gate 1 markdown is missing the Repair route');
  if (!text.includes('/garage-door-installation')) throw new Error('Gate 1 markdown is missing the Installation route');
  if (!text.includes('/contact')) throw new Error('Gate 1 markdown is missing the Contact route');
  if (/^\|\s*Strategy\s*\|/m.test(text) || /\|\s*\/strategy\s*\|/i.test(text)) {
    throw new Error('Gate 1 markdown leaked Strategy as a public page');
  }
  if (!/QA decision/i.test(text)) throw new Error('Gate 1 markdown is missing QA decisions');
  if (!/Evidence/i.test(text)) throw new Error('Gate 1 markdown is missing evidence pointers');
  if (!/Honest limitations/i.test(text)) throw new Error('Gate 1 markdown is missing limitations');
  if (!/Human Gate 1/.test(text)) throw new Error('Gate 1 markdown is missing the Human Gate 1 section');
  if (!/`awaiting-human-gate-1`/.test(text)) throw new Error('Gate 1 markdown is missing awaiting-human-gate-1 state');
  if (!/sealed replay|sealed-evidence|sealed evidence/i.test(text)) throw new Error('Gate 1 markdown does not state sealed replay truthfully');
  if (!/live connector|cursor\[bot\]|automatic phase-B/i.test(text)) {
    throw new Error('Gate 1 markdown does not state that the live connector path remains unproven');
  }
  if (!/production page copy has not been written/i.test(text)) {
    throw new Error('Gate 1 markdown does not state that production page copy has not been written');
  }
  if (/^## (Hero|Call to action|Get a free quote)/im.test(text) || /button class=|href="tel:/i.test(text)) {
    throw new Error('Gate 1 markdown contains production page copy');
  }
  return true;
}

function assertSealedProofNotLive(proof) {
  if (!proof || typeof proof !== 'object') throw new Error('current-head Gate 1 proof is missing');
  if (proof.integratedFactoryReadiness !== false) throw new Error('sealed replay must preserve integratedFactoryReadiness: false');
  if (proof.liveConnectorProven === true) throw new Error('sealed replay is mislabeled as live connector readiness');
  if (proof.sealedEvidence !== true) throw new Error('exact-head sealed 360 proof is synthetic-only or missing sealedEvidence');
  if (proof.proofScope !== SEALED_PROOF_SCOPE) throw new Error('proofScope must remain sealed-360-exact-head-replay-only');
  if (proof.gate1State !== 'awaiting-human-gate-1') throw new Error('proof is not in awaiting-human-gate-1');
  const joined = `${proof.proofScope || ''} ${(proof.limitations || []).join(' ')}`.toLowerCase();
  if (/live cursor\[bot\] path proven|live connector proven|integrated factory ready/.test(joined)) {
    throw new Error('sealed replay is mislabeled as live connector readiness');
  }
  if (!/live connector|cursor\[bot\]|phase-b/.test(joined)) {
    throw new Error('proof limitations must state the live connector terminal/resume path remains unproven');
  }
}

function assertFourPagePrescription(prescription) {
  if (!prescription || !Array.isArray(prescription.pages) || prescription.pages.length !== 4) {
    throw new Error('four-page prescription is missing');
  }
  const urls = prescription.pages.map((page) => page.url);
  if (urls[0] !== '/' || urls[1] !== '/garage-door-repair' || urls[2] !== '/garage-door-installation' || urls[3] !== '/contact') {
    throw new Error('four-page prescription topology is not Home, Repair, Installation, Contact');
  }
  if (prescription.pages.some((page) => /strategy/i.test(`${page.type || ''} ${page.service || ''} ${page.url || ''}`))) {
    throw new Error('four-page prescription leaked Strategy as a public page');
  }
}

function assertNotStaleCurrentPacket(root, expectedHeadSha) {
  const filename = path.join(root, CURRENT_PACKET_RELATIVE);
  if (!fs.existsSync(filename)) return null;
  const bytes = fs.readFileSync(filename);
  if (!bytes.length) throw new Error('current-head dispatch packet is empty');
  const packet = JSON.parse(bytes.toString('utf8'));
  if (packet.notCurrentProof === true) throw new Error('historical packet remains on the current-proof surface');
  const boundHead = packet.reviewedHeadSha || packet.envelope?.checkedOutSha || packet.dispatchPacket?.reviewedHeadSha;
  if (!boundHead || boundHead !== expectedHeadSha) throw new Error('current-head dispatch packet is stale-head-bound');
  if (packet.preparedOnly === true && packet.sealedReplayExecuted !== true) {
    throw new Error('prepared-only packet cannot be presented as current proof');
  }
  if (packet.liveConnectorExecuted === true || packet.executed === true) {
    throw new Error('sealed replay packet is mislabeled as live connector execution');
  }
  return packet;
}

function extractPrescription(state) {
  const run = state?.activeRun || (state?.runs || []).find((entry) => entry?.status === 'awaiting-human-gate-1') || null;
  return run?.artifacts?.prescription || null;
}

function extractReceiptLedger(root, state, proof) {
  const vendorFile = path.join(root, 'state', 'vendor-receipts.json');
  const vendor = readJsonIfExists(vendorFile) || { schemaVersion: 1, receipts: {} };
  const run = state?.activeRun || null;
  const checkpoint = run?.artifacts?.sourceCheckpoint || {};
  const ledger = {
    schemaVersion: 'factory-source-evidence-receipt-ledger-v1',
    sealedEvidence: true,
    liveConnectorProven: false,
    gate1State: run?.status || proof?.gate1State || null,
    prospectId: proof?.prospectId || run?.prospectId || null,
    placeId: proof?.candidate?.placeId || run?.candidate?.placeId || null,
    sourceIdentity: proof?.sourceIdentity || checkpoint.sourceIdentity || null,
    sourceArtifactDigest: proof?.sourceArtifactDigest || checkpoint.sourceArtifactDigest || null,
    sourceManifestDigest: proof?.sourceManifestDigest || checkpoint.sourceManifestDigest || null,
    historicalTrustedSource: {
      runId: TRUSTED_360.runId,
      artifactId: TRUSTED_360.artifactId,
      sourceSha: TRUSTED_360.sourceSha,
    },
    vendorReceiptCount: Object.keys(vendor.receipts || {}).length,
    receipts: vendor.receipts || {},
    checkpointReceipts: checkpoint.sourceMaterial || null,
  };
  if (!ledger.vendorReceiptCount && !ledger.checkpointReceipts) throw new Error('source/evidence receipt ledger is empty');
  const operations = new Set(Object.values(ledger.receipts).map((receipt) => receipt?.operation).filter(Boolean));
  for (const operation of ['discovery', 'website-audit', 'finalist-enrichment', 'page-prescription', 'gate-1']) {
    if (!operations.has(operation) && !ledger.checkpointReceipts) throw new Error(`source/evidence receipt ledger is missing ${operation}`);
  }
  return ledger;
}

function sealedProofLimitations() {
  return [
    'This proves a sealed-evidence exact-head replay through Human Gate 1 only.',
    'It does not prove the live GitHub cursor[bot] terminal-bundle to automatic phase-B connector path.',
    'integratedFactoryReadiness remains false. The live connector terminal/resume path remains unproven.',
    'It does not prove post-Gate-1 writer lanes, final copy QA, or website build readiness.',
  ];
}

function copyFactoryState(root, state = null) {
  const dest = path.join(root, 'canary', 'state', 'factory-state.json');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (state) {
    writeJson(dest, state);
    return JSON.parse(fs.readFileSync(dest, 'utf8'));
  }
  const source = path.join(root, 'state', 'factory-state.json');
  if (!fs.existsSync(source) || !fs.statSync(source).size) throw new Error('factory-state.json is missing after sealed replay');
  fs.copyFileSync(source, dest);
  return JSON.parse(fs.readFileSync(dest, 'utf8'));
}

function assembleExactHeadProofPackage({ root, env = process.env, proof, state = null } = {}) {
  required(root, 'proof package root');
  required(proof, 'current-head Gate 1 proof');
  const expectedHeadSha = env.EXPECTED_HEAD_SHA || env.FACTORY_EXPECTED_HEAD_SHA || env.FACTORY_CHECKED_OUT_SHA;
  const checkedOutSha = env.FACTORY_CHECKED_OUT_SHA || expectedHeadSha;
  if (!expectedHeadSha || checkedOutSha !== expectedHeadSha) throw new Error('proof package requires an asserted exact head');
  if (proof.checkedOutSha !== checkedOutSha || proof.expectedHeadSha !== expectedHeadSha) throw new Error('Gate 1 proof is stale-head-bound');
  const markdownPath = path.join(root, 'canary', 'outputs', 'gate1.md');
  if (!fs.existsSync(markdownPath) || !fs.statSync(markdownPath).size) throw new Error('canary/outputs/gate1.md is missing');
  const truthfulMarkdown = appendSealedReplayTruth(fs.readFileSync(markdownPath, 'utf8'));
  fs.writeFileSync(markdownPath, truthfulMarkdown);
  const copiedState = copyFactoryState(root, state);
  const prescription = extractPrescription(copiedState);
  assertFourPagePrescription(prescription);
  writeJson(path.join(root, 'canary', 'outputs', 'four-page-prescription.json'), prescription);
  const ledger = extractReceiptLedger(root, copiedState, proof);
  writeJson(path.join(root, 'canary', 'outputs', 'source-evidence-receipt-ledger.json'), ledger);
  const exactHeadProof = {
    schemaVersion: 'factory-exact-head-proof-v1',
    checkedOutSha,
    expectedHeadSha,
    headAssertion: true,
    repository: env.FACTORY_REPOSITORY || 'alchemistj/ff-content-demo-factory',
    issueNumber: Number(env.FACTORY_ISSUE_NUMBER),
    prNumber: Number(env.FACTORY_PR_NUMBER),
    branch: env.FACTORY_BRANCH || null,
    workflowRunId: env.GITHUB_RUN_ID || null,
    workflowRunUrl: env.FACTORY_ACTION_RUN_URL || env.FACTORY_TEST_RUN_URL || null,
    proofKind: SEALED_PROOF_SCOPE,
    liveConnectorProven: false,
    integratedFactoryReadiness: false,
  };
  writeJson(path.join(root, 'canary', 'outputs', 'exact-head-proof.json'), exactHeadProof);
  const files = REQUIRED_RELATIVE_FILES.filter((relative) => relative !== 'canary/outputs/exact-head-sealed-360-proof-package.json').map((relative) => {
    const filename = path.join(root, relative);
    if (!fs.existsSync(filename) || !fs.statSync(filename).size) throw new Error(`${relative} is missing or empty`);
    const bytes = fs.readFileSync(filename);
    return { path: relative, bytes: bytes.length, digest: byteDigest(bytes) };
  });
  const artifactName = `exact-head-sealed-360-gate1-proof-${env.GITHUB_RUN_ID || 'local'}`;
  const pkg = {
    schemaVersion: PACKAGE_SCHEMA,
    proofKind: SEALED_PROOF_SCOPE,
    liveConnectorProven: false,
    integratedFactoryReadiness: false,
    sealedEvidence: true,
    sealedReplayExecuted: true,
    liveConnectorExecuted: false,
    artifactName,
    repository: exactHeadProof.repository,
    issueNumber: exactHeadProof.issueNumber,
    prNumber: exactHeadProof.prNumber,
    branch: exactHeadProof.branch,
    expectedHeadSha,
    checkedOutSha,
    workflowRunId: exactHeadProof.workflowRunId,
    workflowRunUrl: exactHeadProof.workflowRunUrl,
    prospectId: proof.prospectId,
    placeId: proof.candidate?.placeId || PLACE_ID,
    prospectName: proof.candidate?.name || null,
    sourceArtifact: {
      historicalRunId: TRUSTED_360.runId,
      historicalArtifactId: TRUSTED_360.artifactId,
      historicalSourceSha: TRUSTED_360.sourceSha,
      sourceIdentity: proof.sourceIdentity || null,
      sourceArtifactDigest: proof.sourceArtifactDigest || null,
      sourceManifestDigest: proof.sourceManifestDigest || null,
    },
    inputManifestDigest: proof.inputManifest?.manifestDigest || null,
    gate1State: proof.gate1State,
    files,
    limitations: sealedProofLimitations(),
  };
  pkg.packageDigest = digest(pkg);
  writeJson(path.join(root, 'canary', 'outputs', 'exact-head-sealed-360-proof-package.json'), pkg);
  return { package: pkg, markdown: truthfulMarkdown, prescription, ledger, exactHeadProof };
}

function validateExactHeadProofPackage({ root, expectedHeadSha, env = process.env } = {}) {
  required(root, 'proof package root');
  const expected = expectedHeadSha || env.EXPECTED_HEAD_SHA || env.FACTORY_EXPECTED_HEAD_SHA;
  required(expected, 'expectedHeadSha');
  for (const relative of REQUIRED_RELATIVE_FILES) {
    const filename = path.join(root, relative);
    if (!fs.existsSync(filename)) throw new Error(`proof artifact is missing: ${relative}`);
    if (!fs.statSync(filename).size) throw new Error(`proof artifact is empty: ${relative}`);
  }
  const proof = readJsonIfExists(path.join(root, 'canary', 'outputs', 'current-head-gate1-proof.json'));
  const exactHead = readJsonIfExists(path.join(root, 'canary', 'outputs', 'exact-head-proof.json'));
  const pkg = readJsonIfExists(path.join(root, 'canary', 'outputs', 'exact-head-sealed-360-proof-package.json'));
  const state = readJsonIfExists(path.join(root, 'canary', 'state', 'factory-state.json'));
  const prescription = readJsonIfExists(path.join(root, 'canary', 'outputs', 'four-page-prescription.json'));
  const ledger = readJsonIfExists(path.join(root, 'canary', 'outputs', 'source-evidence-receipt-ledger.json'));
  const markdown = fs.readFileSync(path.join(root, 'canary', 'outputs', 'gate1.md'), 'utf8');
  if (exactHead.checkedOutSha !== expected || exactHead.expectedHeadSha !== expected || exactHead.headAssertion !== true) {
    throw new Error('exact-head proof is stale-head-bound');
  }
  if (proof.checkedOutSha !== expected || proof.expectedHeadSha !== expected) throw new Error('Gate 1 proof is stale-head-bound');
  if (pkg.checkedOutSha !== expected || pkg.expectedHeadSha !== expected) throw new Error('proof package is stale-head-bound');
  assertSealedProofNotLive(proof);
  if (pkg.liveConnectorProven === true || pkg.integratedFactoryReadiness !== false || pkg.proofKind !== SEALED_PROOF_SCOPE) {
    throw new Error('proof package is mislabeled as live connector readiness');
  }
  if (state?.activeRun?.status !== 'awaiting-human-gate-1') throw new Error('factory state is not awaiting-human-gate-1');
  assertFourPagePrescription(prescription);
  if (!ledger || ledger.sealedEvidence !== true) throw new Error('source/evidence receipt ledger is synthetic-only');
  if (!Object.keys(ledger.receipts || {}).length && !ledger.checkpointReceipts) throw new Error('source/evidence receipt ledger is empty');
  assertReadableGate1Markdown(markdown);
  assertNotStaleCurrentPacket(root, expected);
  if (pkg.schemaVersion !== PACKAGE_SCHEMA) throw new Error('proof package schema is missing or unsupported');
  const recorded = { ...pkg };
  delete recorded.packageDigest;
  if (pkg.packageDigest !== digest(recorded)) throw new Error('proof package digest is stale or invented');
  return { proof, package: pkg, markdown, prescription, ledger, exactHead, state };
}

module.exports = {
  PACKAGE_SCHEMA,
  SEALED_PROOF_SCOPE,
  REQUIRED_RELATIVE_FILES,
  CURRENT_PACKET_RELATIVE,
  SEALED_REPLAY_TRUTH,
  appendSealedReplayTruth,
  assertReadableGate1Markdown,
  assertSealedProofNotLive,
  assertFourPagePrescription,
  assertNotStaleCurrentPacket,
  assembleExactHeadProofPackage,
  validateExactHeadProofPackage,
  sealedProofLimitations,
  copyFactoryState,
  extractReceiptLedger,
  byteDigest,
};
