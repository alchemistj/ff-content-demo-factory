#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { runFactoryCycle } = require('./factory/orchestrator');
const { createProductionAdapters } = require('./factory/production-adapters');
const { loadConfig } = require('./run-one');
const { digest } = require('./factory/prescription-policy');
const { validateBundle, validateJobReceipt, canonicalThreadUrl } = require('./factory/cloud-agent');

function bundleDigest(bundle) { return digest({ ...bundle, inputManifestDigest: undefined }); }

function createCloudAgentBundleAdapter(bundle, expectedEnvelope) {
  const jobs = bundle.jobs || {};
  return {
    async runResearchRecord({ kind, jobId }) {
      const entry = jobs[jobId];
      if (!entry || !entry.result || entry.result.kind !== kind) throw new Error(`Cursor Cloud Agent bundle is missing exact job receipt: ${jobId}`);
      const receipt = validateJobReceipt({ ...(entry.receipt || {}), provider: 'cursor-cloud-agent', operation: kind, stage: kind, jobId }, { kind, expectedEnvelope });
      if (receipt.outputDigest !== digest(entry.result)) throw new Error(`Cursor Cloud Agent output digest mismatch for ${jobId}`);
      if (entry.input && receipt.inputDigest !== digest(entry.input)) throw new Error(`Cursor Cloud Agent input digest mismatch for ${jobId}`);
      return { result: entry.result, receipt: { ...receipt, threadUrl: canonicalThreadUrl(receipt.threadUrl) } };
    },
  };
}

function readJson(filename) { return JSON.parse(fs.readFileSync(path.resolve(filename), 'utf8')); }
function required(value, name) { if (!value) throw new Error(`${name} is required`); return value; }

async function runCurrentHeadGate1Canary({ root, requestFile, selectionFile, qaFile, cursorBundleFile, env = process.env }) {
  required(root, 'root'); required(requestFile, 'requestFile'); required(selectionFile, 'selectionFile'); required(qaFile, 'qaFile'); required(cursorBundleFile, 'cursorBundleFile');
  if (env.CURSOR_API_KEY) throw new Error('CURSOR_API_KEY is not a supported canary credential; use the GitHub-to-Cursor Cloud Agent bundle');
  if (env.CURSOR_MODEL && env.CURSOR_MODEL !== 'cursor-grok-4.6-high') throw new Error(`Unsupported Cursor model override: ${env.CURSOR_MODEL}`);
  const assertedHeadSha = env.FACTORY_CHECKED_OUT_SHA || env.FACTORY_ASSERTED_HEAD_SHA || env.EXPECTED_HEAD_SHA || null;
  if (!assertedHeadSha || (env.EXPECTED_HEAD_SHA && env.EXPECTED_HEAD_SHA !== assertedHeadSha) || env.FACTORY_HEAD_ASSERTION !== 'true') throw new Error('Canary requires an asserted checked-out head SHA');
  const request = readJson(requestFile);
  const selection = readJson(selectionFile);
  const qa = readJson(qaFile);
  const cursorBundle = readJson(cursorBundleFile);
  const dispatch = { issueNumber: Number(env.FACTORY_ISSUE_NUMBER), prNumber: Number(env.FACTORY_PR_NUMBER), branch: env.FACTORY_BRANCH || env.GITHUB_REF_NAME, reviewedHeadSha: assertedHeadSha };
  if (!Number.isInteger(dispatch.issueNumber) || !Number.isInteger(dispatch.prNumber) || !dispatch.branch) throw new Error('Canary requires immutable Issue/PR/branch dispatch binding');
  const inputManifest = { schemaVersion: 'factory-canary-input-manifest-v1', expectedHeadSha: assertedHeadSha, dispatch, files: { request: digest(request), selection: digest(selection), qa: digest(qa), cursorBundle: bundleDigest(cursorBundle) } };
  inputManifest.manifestDigest = digest(inputManifest);
  validateBundle(cursorBundle, { expectedHeadSha: assertedHeadSha, inputManifestDigest: inputManifest.manifestDigest, dispatch });
  const expectedEnvelope = { checkedOutSha: assertedHeadSha, inputManifestDigest: inputManifest.manifestDigest, runId: null, prospectId: null, sourceCheckpointDigest: null, sourceManifestDigest: null };
  const config = loadConfig(process.cwd());
  const adapters = createProductionAdapters({ root, config, env, cursor: createCloudAgentBundleAdapter(cursorBundle, expectedEnvelope), productionCloudAgent: true });
  const stage1 = await runFactoryCycle({ root, config, adapters, discoveryRequest: request });
  if (stage1.nextAction?.code !== 'architect-candidate-review-required') throw new Error(`Fresh canary did not stop at candidate review: ${stage1.nextAction?.code || 'unknown'}`);
  const stage2 = await runFactoryCycle({ root, config, adapters, architectDecision: { selection } });
  if (stage2.nextAction?.code !== 'architect-qa-required') throw new Error(`Fresh canary did not stop at Architect QA: ${stage2.nextAction?.code || 'unknown'}`);
  const selectedRun = stage2.state?.activeRun || stage2.run;
  expectedEnvelope.runId = selectedRun?.runId || null;
  expectedEnvelope.prospectId = selectedRun?.prospectId || selectedRun?.candidate?.placeId || null;
  expectedEnvelope.sourceCheckpointDigest = selectedRun?.artifacts?.sourceCheckpoint ? digest(selectedRun.artifacts.sourceCheckpoint) : null;
  expectedEnvelope.sourceManifestDigest = selectedRun?.artifacts?.sourceCheckpoint?.sourceManifestDigest || null;
  const stage3 = await runFactoryCycle({ root, config, adapters, architectDecision: { qa } });
  if (stage3.nextAction?.code !== 'awaiting-human-gate-1') throw new Error(`Fresh canary did not reach Human Gate 1: ${stage3.nextAction?.code || 'unknown'}`);
  const run = stage3.state?.activeRun || stage3.run;
  if (!run || run.status !== 'awaiting-human-gate-1' || !run.artifacts?.gate1?.markdown) throw new Error('Fresh canary Gate 1 artifact is missing');
  const finalEnvelope = { ...expectedEnvelope, runId: run.runId, prospectId: run.prospectId || run.candidate?.placeId || null, sourceCheckpointDigest: run.artifacts.sourceCheckpoint ? digest(run.artifacts.sourceCheckpoint) : null, sourceManifestDigest: run.artifacts.sourceCheckpoint?.sourceManifestDigest || null };
  for (const [jobId, entry] of Object.entries(cursorBundle.jobs || {})) validateJobReceipt({ ...(entry.receipt || {}), provider: 'cursor-cloud-agent', jobId }, { kind: entry.receipt?.operation || entry.result?.kind || 'unknown', expectedEnvelope: finalEnvelope });
  if (cursorBundle.envelope.runId !== finalEnvelope.runId || cursorBundle.envelope.prospectId !== finalEnvelope.prospectId || cursorBundle.envelope.sourceCheckpointDigest !== finalEnvelope.sourceCheckpointDigest || cursorBundle.envelope.sourceManifestDigest !== finalEnvelope.sourceManifestDigest) throw new Error('Cloud Agent bundle final run/source binding mismatch');
  const proof = {
    schemaVersion: 'factory-current-head-gate1-canary-v1',
    proofScope: 'fresh-current-head-gate1-canary-only',
    integratedFactoryReadiness: false,
    expectedHeadSha: assertedHeadSha,
    checkedOutSha: assertedHeadSha,
    headAssertion: true,
    inputManifest,
    dispatch,
    runId: run.runId,
    prospectId: run.prospectId || null,
    candidate: { placeId: run.candidate?.placeId || null, name: run.candidate?.name || null, location: run.candidate?.location || null },
    sourceIdentity: run.artifacts.prescription?.sourceIdentity || null,
    sourceArtifactDigest: run.artifacts.prescription?.sourceArtifactDigest || null,
    sourceManifestDigest: run.artifacts.prescription?.sourceManifestDigest || run.artifacts.sourceCheckpoint?.sourceManifestDigest || null,
    pageSetDigest: run.artifacts.prescription?.pageSetDigest || null,
    prescriptionDigest: run.artifacts.prescription?.prescriptionDigest || null,
    bindingDigest: digest({ headSha: assertedHeadSha, runId: run.runId, prospectId: run.prospectId || null, sourceIdentity: run.artifacts.prescription?.sourceIdentity || null, sourceManifestDigest: run.artifacts.prescription?.sourceManifestDigest || null }),
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
  const [,, root, requestFile, selectionFile, qaFile, cursorBundleFile] = process.argv;
  runCurrentHeadGate1Canary({ root, requestFile, selectionFile, qaFile, cursorBundleFile }).then(({ proof }) => process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`)).catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
}

module.exports = { runCurrentHeadGate1Canary };
