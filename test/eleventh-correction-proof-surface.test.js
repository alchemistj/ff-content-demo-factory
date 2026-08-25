'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { digest } = require('../src/factory/prescription-policy');
const {
  assembleExactHeadProofPackage,
  validateExactHeadProofPackage,
  assertReadableGate1Markdown,
  assertNotStaleCurrentPacket,
  CURRENT_PACKET_RELATIVE,
  SEALED_PROOF_SCOPE,
  appendSealedReplayTruth,
} = require('../src/factory/exact-head-proof-package');
const { refuseSecrets, runExactHeadSealed360Proof } = require('../scripts/run-exact-head-sealed-360-proof');
const { main: preparePacket } = require('../scripts/prepare-360-gate1-canary-packet');
const { PLACE_ID } = require('../src/factory/sealed-evidence');

const HEAD = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'factory-eleventh-proof-'));
}

function write(root, relative, value) {
  const filename = path.join(root, relative);
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`);
  return filename;
}

function validMarkdown() {
  return appendSealedReplayTruth([
    '# 360 Garage Door and More',
    '',
    '## Page Prescription',
    '',
    '| Page | Proposed URL | Primary Keyword | Proposed Title / H1 Direction | Recommended First Review |',
    '| --- | --- | --- | --- | --- |',
    '| Home | / | garage door company Springfield MO | 360 Garage Door and More / Springfield garage door work | Cameron — completed jobs |',
    '| Service | /garage-door-repair | garage door repair Springfield MO | Garage Door Repair in Springfield, MO / sagging doors | Chris — repair |',
    '| Service | /garage-door-installation | garage door installation Springfield MO | Garage Door Installation in Springfield, MO / new doors | Marcie — install |',
    '| Contact | /contact | contact 360 | Contact 360 Garage Door and More / Talk with 360 | — |',
    '',
    '### QA decision record',
    '',
    '| Check | Result |',
    '| --- | --- |',
    '| pagePolicy | PASS |',
    '',
    '## Evidence & Lineage',
    '',
    '| Field | Bound value |',
    '| --- | --- |',
    '| Source artifact digest | sha256:source |',
    '',
    '### Honest limitations',
    '',
    '- This artifact is a page prescription and Gate 1 record; production page copy has not been written.',
    '',
    '## Human Gate 1',
    '',
    'Are these the right pages?',
    '',
    '## State',
    '',
    '`awaiting-human-gate-1`',
    '',
  ].join('\n'));
}

function fourPages() {
  return {
    pages: [
      { type: 'Home', service: 'home', url: '/' },
      { type: 'Service', service: 'garage-door-repair', url: '/garage-door-repair' },
      { type: 'Service', service: 'garage-door-installation', url: '/garage-door-installation' },
      { type: 'Contact', service: 'contact', url: '/contact' },
    ],
  };
}

function validProof(extra = {}) {
  return {
    schemaVersion: 'factory-current-head-gate1-canary-v1',
    proofScope: SEALED_PROOF_SCOPE,
    integratedFactoryReadiness: false,
    liveConnectorProven: false,
    sealedEvidence: true,
    expectedHeadSha: HEAD,
    checkedOutSha: HEAD,
    headAssertion: true,
    gate1State: 'awaiting-human-gate-1',
    prospectId: 'prospect-32cd5e266a718b3eee2e',
    candidate: { placeId: PLACE_ID, name: '360 Garage Door and More' },
    sourceIdentity: { provider: 'factory-trusted-source', runId: 'run-1' },
    sourceArtifactDigest: 'sha256:source',
    sourceManifestDigest: 'sha256:manifest',
    inputManifest: { manifestDigest: 'sha256:input' },
    limitations: [
      'This proves a sealed-evidence exact-head replay through Human Gate 1 only.',
      'It does not prove the live GitHub cursor[bot] terminal-bundle to automatic phase-B connector path.',
    ],
    ...extra,
  };
}

function validState() {
  return {
    schemaVersion: 1,
    activeRun: {
      status: 'awaiting-human-gate-1',
      prospectId: 'prospect-32cd5e266a718b3eee2e',
      candidate: { placeId: PLACE_ID, name: '360 Garage Door and More' },
      artifacts: { prescription: fourPages(), sourceCheckpoint: { sourceMaterial: { discoveryReceipt: { operation: 'discovery' } } } },
    },
  };
}

function vendorReceipts() {
  return {
    schemaVersion: 1,
    receipts: {
      'factory:discovery': { operation: 'discovery' },
      'factory:website-audit': { operation: 'website-audit' },
      'factory:enrichment': { operation: 'finalist-enrichment' },
      'factory:page-prescription': { operation: 'page-prescription' },
      'factory:gate-1': { operation: 'gate-1' },
    },
  };
}

function envFor(rootHead = HEAD) {
  return {
    EXPECTED_HEAD_SHA: rootHead,
    FACTORY_EXPECTED_HEAD_SHA: rootHead,
    FACTORY_CHECKED_OUT_SHA: rootHead,
    FACTORY_HEAD_ASSERTION: 'true',
    FACTORY_ISSUE_NUMBER: '8',
    FACTORY_PR_NUMBER: '1',
    FACTORY_BRANCH: 'architect/greenfield-gate1',
    FACTORY_REPOSITORY: 'alchemistj/ff-content-demo-factory',
    GITHUB_RUN_ID: 'local-test',
    FACTORY_ACTION_RUN_URL: 'https://github.com/alchemistj/ff-content-demo-factory/actions/runs/local-test',
  };
}

function seedPackage(root, { proof = validProof(), state = validState(), markdown = validMarkdown() } = {}) {
  write(root, 'canary/outputs/gate1.md', markdown);
  write(root, 'canary/outputs/current-head-gate1-proof.json', proof);
  write(root, 'state/factory-state.json', state);
  write(root, 'state/vendor-receipts.json', vendorReceipts());
  return assembleExactHeadProofPackage({ root, env: envFor(), proof, state });
}

test('eleventh correction fails closed when the proof artifact is missing, empty, or stale-head-bound', () => {
  const root = tempRoot();
  assert.throws(() => validateExactHeadProofPackage({ root, expectedHeadSha: HEAD }), /missing/);
  seedPackage(root);
  fs.writeFileSync(path.join(root, 'canary/outputs/gate1.md'), '');
  assert.throws(() => validateExactHeadProofPackage({ root, expectedHeadSha: HEAD }), /empty/);
  seedPackage(root);
  const stale = JSON.parse(fs.readFileSync(path.join(root, 'canary/outputs/current-head-gate1-proof.json'), 'utf8'));
  stale.checkedOutSha = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  stale.expectedHeadSha = stale.checkedOutSha;
  write(root, 'canary/outputs/current-head-gate1-proof.json', stale);
  assert.throws(() => validateExactHeadProofPackage({ root, expectedHeadSha: HEAD }), /stale-head-bound/);
});

test('eleventh correction rejects synthetic-only proof and live-connector mislabels', () => {
  const root = tempRoot();
  seedPackage(root, { proof: validProof({ sealedEvidence: false, proofScope: 'unit-test-mock' }) });
  assert.throws(() => validateExactHeadProofPackage({ root, expectedHeadSha: HEAD }), /synthetic-only|sealedEvidence|proofScope/);
  const live = tempRoot();
  seedPackage(live, { proof: validProof({ integratedFactoryReadiness: true, liveConnectorProven: true, proofScope: 'live-cursor-connector-ready' }) });
  assert.throws(() => validateExactHeadProofPackage({ root: live, expectedHeadSha: HEAD }), /live connector|integratedFactoryReadiness|proofScope/);
});

test('eleventh correction rejects a stale prepared-only packet on the current-proof surface', () => {
  const root = tempRoot();
  seedPackage(root);
  write(root, CURRENT_PACKET_RELATIVE, {
    preparedOnly: true,
    executed: false,
    reviewedHeadSha: '36f24c1ed15b871d52f1ec0b6fd797ae5e2461e6',
    envelope: { checkedOutSha: '36f24c1ed15b871d52f1ec0b6fd797ae5e2461e6' },
  });
  assert.throws(() => assertNotStaleCurrentPacket(root, HEAD), /stale-head-bound|prepared-only|current proof/);
  assert.throws(() => validateExactHeadProofPackage({ root, expectedHeadSha: HEAD }), /stale-head-bound|prepared-only|current proof/);
});

test('eleventh correction Gate 1 markdown requires named pages, internal Strategy, and sealed-replay truth', () => {
  assert.doesNotThrow(() => assertReadableGate1Markdown(validMarkdown()));
  assert.throws(() => assertReadableGate1Markdown('# Gate 1\n'), /does not name Home|empty|Human Gate 1/);
  const leaked = validMarkdown().replace('| Contact | /contact |', '| Strategy | /strategy |\n| Contact | /contact |');
  assert.throws(() => assertReadableGate1Markdown(leaked), /Strategy/);
  const copy = `${validMarkdown()}\n## Hero\nCall now for a free quote\n`;
  assert.throws(() => assertReadableGate1Markdown(copy), /production page copy/);
});

test('eleventh correction committed tree does not present a stale current-head packet as proof', () => {
  assert.equal(spawnSync('git', ['ls-files', 'canary/outputs/360-current-head-gate1-dispatch-packet.json'], { encoding: 'utf8' }).stdout.trim(), '');
  assert.equal(fs.existsSync('canary/historical/360-current-head-gate1-dispatch-packet.36f24c1.json'), true);
  const historical = JSON.parse(fs.readFileSync('canary/historical/360-current-head-gate1-dispatch-packet.36f24c1.json', 'utf8'));
  assert.equal(historical.notCurrentProof, true);
  assert.equal(historical.preparedOnly, true);
  assert.equal(historical.reviewedHeadSha, '36f24c1ed15b871d52f1ec0b6fd797ae5e2461e6');
  assert.throws(
    () => preparePacket({ surface: 'current-proof', expectedHeadSha: '36f24c1ed15b871d52f1ec0b6fd797ae5e2461e6', currentHead: HEAD, sealedReplayExecuted: true }),
    /exact checked-out head/,
  );
  assert.throws(
    () => preparePacket({ surface: 'current-proof', expectedHeadSha: HEAD, currentHead: HEAD, sealedReplayExecuted: false }),
    /sealed replay execution/,
  );
});

test('eleventh correction workflow is repository-native, not Josh-operated workflow_dispatch, and uploads fail-closed proof', () => {
  const workflow = fs.readFileSync('.github/workflows/exact-head-sealed-360-proof.yml', 'utf8');
  const script = fs.readFileSync('scripts/run-exact-head-sealed-360-proof.js', 'utf8');
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /push:/);
  assert.match(workflow, /architect\/greenfield-gate1/);
  assert.doesNotMatch(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /github\.actor == github\.repository_owner/);
  assert.doesNotMatch(workflow, /secrets\.CURSOR_API_KEY/);
  assert.doesNotMatch(workflow, /secrets\.APIFY_API_TOKEN/);
  assert.match(workflow, /src\/run-gate1-canary\.js|run-exact-head-sealed-360-proof/);
  assert.match(workflow, /node --test/);
  assert.doesNotMatch(workflow, /canary\/outputs\/gate1\.md/);
  assert.match(workflow, /current-head-gate1-proof\.json/);
  assert.match(workflow, /if-no-files-found: error/);
  assert.match(workflow, /test -z "\$\{CURSOR_API_KEY:-\}"/);
  assert.match(script, /runCurrentHeadGate1Canary/);
  assert.match(script, /FACTORY_SEALED_EVIDENCE/);
  assert.doesNotMatch(script, /mockCycleDeps/);
  assert.match(script, /refuses injected\/mock cycle dependencies/);
  assert.throws(() => refuseSecrets({ CURSOR_API_KEY: 'nope' }), /CURSOR_API_KEY/);
  assert.throws(() => refuseSecrets({ APIFY_API_TOKEN: 'nope' }), /APIFY_API_TOKEN/);
  assert.doesNotMatch(fs.readFileSync('.github/workflows/cursor-cloud-agent-dispatch.yml', 'utf8'), /Exact-head sealed 360 Gate 1 proof/);
});

test('eleventh correction real sealed 360 path remains synthetic-only and never assembles Gate 1', async () => {
  const head = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
  assert.match(head, /^[a-f0-9]{40}$/);
  const root = tempRoot();
  const env = {
    EXPECTED_HEAD_SHA: head,
    FACTORY_EXPECTED_HEAD_SHA: head,
    FACTORY_CHECKED_OUT_SHA: head,
    FACTORY_HEAD_ASSERTION: 'true',
    FACTORY_ISSUE_NUMBER: '8',
    FACTORY_PR_NUMBER: '1',
    FACTORY_BRANCH: 'architect/greenfield-gate1',
    FACTORY_REPOSITORY: 'alchemistj/ff-content-demo-factory',
    FACTORY_TEST_RESULT: 'sealed-360-exact-head-replay',
    FACTORY_TEST_RUN_URL: 'https://github.com/alchemistj/ff-content-demo-factory/actions/runs/local-eleventh',
    FACTORY_ACTION_RUN_URL: 'https://github.com/alchemistj/ff-content-demo-factory/actions/runs/local-eleventh',
    GITHUB_RUN_ID: 'local-eleventh',
  };
  await assert.rejects(() => runExactHeadSealed360Proof({ root, env, deps: { runFactoryCycle: async () => ({}) } }), /injected\\/mock/);
  const { result, validated } = await runExactHeadSealed360Proof({ root, env });
  assert.equal(result.proof.gate1State, 'synthetic-sealed-evidence-only');
  assert.equal(result.proof.synthetic, true);
  assert.equal(result.proof.approvableGate1, false);
  assert.equal(result.proof.integratedFactoryReadiness, false);
  assert.equal(validated, null);
  assert.equal(fs.existsSync(path.join(root, 'canary/outputs/current-head-gate1-proof.json')), true);
  assert.equal(fs.existsSync(path.join(root, 'canary/outputs/gate1.md')), false);
});
