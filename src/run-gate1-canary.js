#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { runFactoryCycle } = require('./factory/orchestrator');
const { createProductionAdapters } = require('./factory/production-adapters');
const { loadConfig } = require('./run-one');

function readJson(filename) { return JSON.parse(fs.readFileSync(path.resolve(filename), 'utf8')); }
function required(value, name) { if (!value) throw new Error(`${name} is required`); return value; }

async function runCurrentHeadGate1Canary({ root, requestFile, selectionFile, qaFile, env = process.env }) {
  required(root, 'root'); required(requestFile, 'requestFile'); required(selectionFile, 'selectionFile'); required(qaFile, 'qaFile');
  const config = loadConfig(process.cwd());
  const adapters = createProductionAdapters({ root, config, env });
  const request = readJson(requestFile);
  const selection = readJson(selectionFile);
  const qa = readJson(qaFile);
  const stage1 = await runFactoryCycle({ root, config, adapters, discoveryRequest: request });
  if (stage1.nextAction?.code !== 'architect-candidate-review-required') throw new Error(`Fresh canary did not stop at candidate review: ${stage1.nextAction?.code || 'unknown'}`);
  const stage2 = await runFactoryCycle({ root, config, adapters, architectDecision: { selection } });
  if (stage2.nextAction?.code !== 'architect-qa-required') throw new Error(`Fresh canary did not stop at Architect QA: ${stage2.nextAction?.code || 'unknown'}`);
  const stage3 = await runFactoryCycle({ root, config, adapters, architectDecision: { qa } });
  if (stage3.nextAction?.code !== 'awaiting-human-gate-1') throw new Error(`Fresh canary did not reach Human Gate 1: ${stage3.nextAction?.code || 'unknown'}`);
  const run = stage3.state?.activeRun || stage3.run;
  if (!run || run.status !== 'awaiting-human-gate-1' || !run.artifacts?.gate1?.markdown) throw new Error('Fresh canary Gate 1 artifact is missing');
  const proof = {
    schemaVersion: 'factory-current-head-gate1-canary-v1',
    proofScope: 'fresh-current-head-gate1-canary-only',
    integratedFactoryReadiness: false,
    checkedOutSha: env.GITHUB_SHA || null,
    runId: run.runId,
    candidate: { placeId: run.candidate?.placeId || null, name: run.candidate?.name || null, location: run.candidate?.location || null },
    sourceIdentity: run.artifacts.prescription?.sourceIdentity || null,
    sourceArtifactDigest: run.artifacts.prescription?.sourceArtifactDigest || null,
    sourceManifestDigest: run.artifacts.prescription?.sourceManifestDigest || run.artifacts.sourceCheckpoint?.sourceManifestDigest || null,
    pageSetDigest: run.artifacts.prescription?.pageSetDigest || null,
    prescriptionDigest: run.artifacts.prescription?.prescriptionDigest || null,
    gate1State: run.status,
    laterStageArtifacts: Object.keys(run.artifacts).filter((key) => ['copy', 'website', 'build', 'deploy'].some((word) => key.toLowerCase().includes(word))),
    limitations: ['This proves a fresh current-head path through Human Gate 1 only.', 'It does not prove post-Gate-1 writer lanes, final copy QA, or website build readiness.'],
  };
  fs.mkdirSync(path.join(root, 'canary', 'outputs'), { recursive: true });
  fs.writeFileSync(path.join(root, 'canary', 'outputs', 'current-head-gate1-proof.json'), `${JSON.stringify(proof, null, 2)}\n`);
  fs.writeFileSync(path.join(root, 'canary', 'outputs', 'gate1.md'), run.artifacts.gate1.markdown);
  return { proof, state: stage3.state };
}

if (require.main === module) {
  const [,, root, requestFile, selectionFile, qaFile] = process.argv;
  runCurrentHeadGate1Canary({ root, requestFile, selectionFile, qaFile }).then(({ proof }) => process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`)).catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
}

module.exports = { runCurrentHeadGate1Canary };
