#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { runCurrentHeadGate1Canary } = require('../src/run-gate1-canary');

function gitHead() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || 'git rev-parse HEAD failed');
  return result.stdout.trim();
}

function refuseSecrets(env) {
  if (env.CURSOR_API_KEY) throw new Error('Sealed exact-head proof refuses CURSOR_API_KEY');
  if (env.APIFY_API_TOKEN) throw new Error('Sealed exact-head proof refuses APIFY_API_TOKEN');
}

function resetProofWorkspace(root) {
  for (const relative of ['state', 'canary/state']) {
    fs.rmSync(path.join(root, relative), { recursive: true, force: true });
  }
  for (const relative of [
    'canary/outputs/gate1.md',
    'canary/outputs/current-head-gate1-proof.json',
    'canary/outputs/exact-head-proof.json',
    'canary/outputs/source-evidence-receipt-ledger.json',
    'canary/outputs/four-page-prescription.json',
    'canary/outputs/exact-head-sealed-360-proof-package.json',
    'canary/outputs/360-current-head-gate1-dispatch-packet.json',
    'canary/outputs/current-head-gate1-pending.json',
  ]) {
    fs.rmSync(path.join(root, relative), { force: true });
  }
}

function resolveInput(root, relative) {
  const candidates = [path.resolve(root, relative), path.resolve(process.cwd(), relative)];
  const found = candidates.find((filename) => fs.existsSync(filename));
  if (!found) throw new Error(`Approved 360 input is missing: ${relative}`);
  return found;
}

async function runExactHeadSealed360Proof({ root = process.cwd(), env = process.env, deps = null } = {}) {
  if (deps) throw new Error('exact-head sealed 360 proof refuses injected/mock cycle dependencies');
  refuseSecrets(env);
  resetProofWorkspace(root);
  const expectedHeadSha = env.EXPECTED_HEAD_SHA || env.FACTORY_EXPECTED_HEAD_SHA || gitHead();
  const checkedOutSha = gitHead();
  if (!/^[a-f0-9]{40}$/.test(expectedHeadSha) || checkedOutSha !== expectedHeadSha) {
    throw new Error(`exact-head sealed 360 proof checked-out SHA mismatch: ${checkedOutSha} != ${expectedHeadSha}`);
  }
  const boundEnv = {
    ...env,
    FACTORY_CHECKED_OUT_SHA: checkedOutSha,
    FACTORY_ASSERTED_HEAD_SHA: checkedOutSha,
    FACTORY_EXPECTED_HEAD_SHA: expectedHeadSha,
    EXPECTED_HEAD_SHA: expectedHeadSha,
    FACTORY_HEAD_ASSERTION: 'true',
    FACTORY_CANARY_PHASE: 'integrated',
    FACTORY_SEALED_EVIDENCE: 'true',
    FACTORY_ISSUE_NUMBER: env.FACTORY_ISSUE_NUMBER || '8',
    FACTORY_PR_NUMBER: env.FACTORY_PR_NUMBER || '1',
    FACTORY_BRANCH: env.FACTORY_BRANCH || 'architect/greenfield-gate1',
    FACTORY_REPOSITORY: env.FACTORY_REPOSITORY || env.GITHUB_REPOSITORY || 'alchemistj/ff-content-demo-factory',
    FACTORY_TEST_RESULT: env.FACTORY_TEST_RESULT || 'sealed-360-exact-head-replay',
    FACTORY_TEST_RUN_URL: env.FACTORY_TEST_RUN_URL || env.FACTORY_ACTION_RUN_URL || (env.GITHUB_SERVER_URL && env.GITHUB_REPOSITORY && env.GITHUB_RUN_ID ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}` : null),
    FACTORY_ACTION_RUN_URL: env.FACTORY_ACTION_RUN_URL || env.FACTORY_TEST_RUN_URL || (env.GITHUB_SERVER_URL && env.GITHUB_REPOSITORY && env.GITHUB_RUN_ID ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}` : null),
  };
  const result = await runCurrentHeadGate1Canary({
    root,
    requestFile: resolveInput(root, 'canary/inputs/360-gate1-request.json'),
    selectionFile: resolveInput(root, 'canary/inputs/360-gate1-selection.json'),
    qaFile: resolveInput(root, 'canary/inputs/360-gate1-qa.json'),
    cursorBundleFile: '',
    env: boundEnv,
  });
  if (result.proof.synthetic !== true || result.proof.approvableGate1 !== false || result.proof.gate1State !== 'synthetic-sealed-evidence-only') {
    throw new Error('sealed replay must remain synthetic-only and non-approvable');
  }
  if (fs.existsSync(path.join(root, 'canary/outputs/gate1.md')) || fs.existsSync(path.join(root, 'canary/state/factory-state.json'))) {
    throw new Error('sealed replay manufactured a Gate 1-shaped artifact');
  }
  return { result, assembled: null, validated: null, expectedHeadSha, checkedOutSha };
}

if (require.main === module) {
  runExactHeadSealed360Proof().then(({ result, checkedOutSha }) => {
    process.stdout.write(`${JSON.stringify({
      gate1State: result.proof.gate1State,
      checkedOutSha,
      synthetic: result.proof.synthetic,
      approvableGate1: result.proof.approvableGate1,
      integratedFactoryReadiness: result.proof.integratedFactoryReadiness,
      liveConnectorProven: result.proof.liveConnectorProven,
      markdownPath: null,
    }, null, 2)}\n`);
  }).catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}

module.exports = { runExactHeadSealed360Proof, refuseSecrets };
