#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { runFactoryCycle } = require('./factory/orchestrator');
const { createProductionAdapters } = require('./factory/production-adapters');
const { loadConfig } = require('./run-one');
const { digest } = require('./factory/prescription-policy');
const { validateBundle, validateJobReceipt, canonicalThreadUrl, createDispatchPacket } = require('./factory/cloud-agent');
const { createPendingHandoff, validatePendingHandoff, retrievePhaseAHandoff, claimResumeAtomic } = require('./factory/handoff');
const { createSealed360Adapters, verifySealed360Lineage } = require('./factory/sealed-evidence');
const { actionProofFromEnvironment } = require('./factory/orchestrator');

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

function verifyApprovedLineageRuntimePacket({ root, filename, assertedHeadSha, dispatch }) {
  if (!filename) throw new Error('Needs Josh: production phase A requires a verified approved-lineage runtime packet');
  const packet = readJson(filename);
  const recordedDigest = packet.packetDigest;
  const unsigned = { ...packet };
  delete unsigned.packetDigest;
  if (!recordedDigest || recordedDigest !== digest(unsigned)) throw new Error('Needs Josh: approved-lineage runtime packet digest is stale or invented');
  if (packet.runtimeGenerated !== true || packet.preparedOnly !== true || packet.syntheticReplayEligible !== false || packet.liveConnectorExecuted !== false) throw new Error('Needs Josh: approved-lineage runtime packet is not a prepared production input');
  if (packet.repository !== (dispatch.repository || 'alchemistj/ff-content-demo-factory') || Number(packet.issueNumber) !== 8 || Number(packet.prNumber) !== 1 || packet.branch !== dispatch.branch || packet.checkedOutSha !== assertedHeadSha || packet.reviewedHeadSha !== assertedHeadSha) throw new Error('Needs Josh: approved-lineage runtime packet target/head is mismatched');
  const envelope = packet.envelope || {};
  for (const [field, expected] of [['repository', packet.repository], ['issueNumber', 8], ['prNumber', 1], ['branch', packet.branch], ['checkedOutSha', assertedHeadSha], ['dispatchKey', packet.dispatchPacket?.dispatchKey], ['dispatchDigest', packet.dispatchPacket?.dispatchDigest]]) {
    if (String(envelope[field]) !== String(expected)) throw new Error(`Needs Josh: approved-lineage runtime envelope ${field} is mismatched`);
  }
  const historical = verifySealed360Lineage({ root });
  const approved = packet.approvedLineage || {};
  for (const field of ['sourceArtifactDigest', 'evidenceDigest', 'pageSetDigest', 'prescriptionDigest', 'approvalDigest', 'strategyDigest']) if (approved[field] !== historical[field]) throw new Error(`Needs Josh: approved historical ${field} changed`);
  if (JSON.stringify(approved.selectedServiceIds) !== JSON.stringify(historical.selectedServiceIds) || JSON.stringify(approved.routes) !== JSON.stringify(historical.routes)) throw new Error('Needs Josh: approved historical service/page selection changed');
  return packet;
}

async function runCurrentHeadGate1Canary({ root, requestFile, selectionFile, qaFile, cursorBundleFile, env = process.env, deps = {} }) {
  required(root, 'root'); required(requestFile, 'requestFile'); required(selectionFile, 'selectionFile'); required(qaFile, 'qaFile');
  if (env.CURSOR_API_KEY) throw new Error('CURSOR_API_KEY is not a supported canary credential; use the GitHub-to-Cursor Cloud Agent bundle');
  if (env.CURSOR_MODEL && env.CURSOR_MODEL !== 'cursor-grok-4.6-high') throw new Error(`Unsupported Cursor model override: ${env.CURSOR_MODEL}`);
  const assertedHeadSha = env.FACTORY_CHECKED_OUT_SHA || env.FACTORY_ASSERTED_HEAD_SHA || env.EXPECTED_HEAD_SHA || null;
  if (!assertedHeadSha || (env.EXPECTED_HEAD_SHA && env.EXPECTED_HEAD_SHA !== assertedHeadSha) || env.FACTORY_HEAD_ASSERTION !== 'true') throw new Error('Canary requires an asserted checked-out head SHA');
  const request = readJson(requestFile);
  const selection = readJson(selectionFile);
  const qa = readJson(qaFile);
  const phase = env.FACTORY_CANARY_PHASE || 'resume';
  if (!['dispatch', 'resume', 'integrated'].includes(phase)) throw new Error(`Unsupported canary phase: ${phase}`);
  const sealedEvidence = env.FACTORY_SEALED_EVIDENCE === 'true' || env.FACTORY_SEALED_EVIDENCE === true;
  const sealedAdapters = sealedEvidence ? createSealed360Adapters({ root: process.cwd() }) : null;
  const cursorBundle = cursorBundleFile && fs.existsSync(path.resolve(cursorBundleFile)) ? readJson(cursorBundleFile) : null;
  const dispatch = { issueNumber: Number(env.FACTORY_ISSUE_NUMBER), prNumber: Number(env.FACTORY_PR_NUMBER), branch: env.FACTORY_BRANCH || env.GITHUB_REF_NAME, reviewedHeadSha: assertedHeadSha };
  if (!Number.isInteger(dispatch.issueNumber) || !Number.isInteger(dispatch.prNumber) || !dispatch.branch) throw new Error('Canary requires immutable Issue/PR/branch dispatch binding');
  const approvedRuntimePacket = env.FACTORY_PHASE_A_PRODUCTION === 'true'
    ? verifyApprovedLineageRuntimePacket({ root, filename: env.FACTORY_APPROVED_LINEAGE_PACKET, assertedHeadSha, dispatch: { ...dispatch, repository: env.FACTORY_REPOSITORY || 'alchemistj/ff-content-demo-factory' } })
    : null;
  const inputManifest = { schemaVersion: 'factory-canary-input-manifest-v1', expectedHeadSha: assertedHeadSha, dispatch, files: { request: digest(request), selection: digest(selection), qa: digest(qa) } };
  inputManifest.manifestDigest = digest(inputManifest);
  const outputDir = path.join(root, 'canary', 'outputs');
  fs.mkdirSync(outputDir, { recursive: true });
  // The sealed replay is a repository fixture used to exercise lineage and
  // exact-head controls.  It is deliberately not a Gate 1 run: no state,
  // prescription, markdown, vendor receipt, or approvable artifact may be
  // manufactured from synthetic evidence.
  if (sealedEvidence) {
    const proof = {
      schemaVersion: 'factory-current-head-synthetic-replay-proof-v1',
      proofScope: 'synthetic-sealed-evidence-test-only',
      phase,
      synthetic: true,
      sealedEvidence: true,
      approvableGate1: false,
      integratedFactoryReadiness: false,
      liveConnectorProven: false,
      expectedHeadSha: assertedHeadSha,
      checkedOutSha: assertedHeadSha,
      headAssertion: true,
      dispatch,
      inputManifest,
      historicalLineage: sealedAdapters?.sealed?.lineage || null,
      gate1State: 'synthetic-sealed-evidence-only',
      limitations: [
        'Synthetic repository replay only; this is not a Human Gate 1 approval artifact.',
        'No Apify token, Cursor credential, Cursor thread, terminal receipt, or production vendor call was used.',
        'Real phase A must pause for an authentic cursor[bot] terminal receipt before any Gate 1 path.',
      ],
    };
    fs.writeFileSync(path.join(outputDir, 'current-head-synthetic-replay-proof.json'), `${JSON.stringify(proof, null, 2)}\n`);
    return { proof, state: null };
  }
  const sealPending = () => {
    const dispatchPacket = createDispatchPacket({ ...dispatch, scope: env.FACTORY_DISPATCH_SCOPE || 'fresh-current-head-gate1', repository: env.FACTORY_REPOSITORY || 'alchemistj/ff-content-demo-factory' });
    const prospectId = selection.selectedPlaceId || request.prospectId || request.placeId || request.prospect?.prospectId || `canary-${digest(request).slice(7, 23)}`;
    const pending = createPendingHandoff({ dispatchPacket, inputManifest, runId: env.FACTORY_CANARY_RUN_ID || `canary-${digest(inputManifest).slice(7, 23)}`, prospectId, placeId: selection.selectedPlaceId || request.placeId || null, sourceCheckpointDigest: digest({ request, selection, qa }), phaseARunId: env.GITHUB_RUN_ID || env.FACTORY_PHASE_A_RUN_ID || `local-${digest(inputManifest).slice(7, 23)}`, inputFiles: { request: requestFile, selection: selectionFile, qa: qaFile }, approvedLineage: approvedRuntimePacket ? { packetDigest: approvedRuntimePacket.packetDigest, ...approvedRuntimePacket.approvedLineage } : null });
    fs.writeFileSync(path.join(outputDir, 'current-head-gate1-pending.json'), `${JSON.stringify(pending, null, 2)}\n`);
    return pending;
  };
  if (phase === 'dispatch') {
    sealPending();
    return { proof: { schemaVersion: 'factory-current-head-gate1-canary-v1', proofScope: 'fresh-current-head-dispatch-phase-only', phase, expectedHeadSha: assertedHeadSha, checkedOutSha: assertedHeadSha, headAssertion: true, dispatch, inputManifest, awaitingCursorReceipt: true, integratedFactoryReadiness: false, liveConnectorProven: false, limitations: ['Phase A seals the exact head and inputs and awaits the connector-native Cursor receipt.', 'No paid vendor or production writing is performed in phase A.'] }, state: null };
  }
  let pendingFile = env.FACTORY_HANDOFF_FILE || path.join(outputDir, 'current-head-gate1-pending.json');
  if (phase === 'integrated' || (sealedEvidence && !fs.existsSync(pendingFile))) sealPending();
  if (!sealedEvidence) required(cursorBundle, 'cursorBundle');
  if (cursorBundle) validateBundle(cursorBundle, { expectedHeadSha: assertedHeadSha, inputManifestDigest: inputManifest.manifestDigest, dispatch, repository: env.FACTORY_REPOSITORY || 'alchemistj/ff-content-demo-factory' });
  const expectedHandoff = {
    checkedOutSha: assertedHeadSha,
    inputManifestDigest: inputManifest.manifestDigest,
    repository: env.FACTORY_REPOSITORY || 'alchemistj/ff-content-demo-factory',
    issueNumber: dispatch.issueNumber,
    prNumber: dispatch.prNumber,
    branch: dispatch.branch,
    placeId: selection.selectedPlaceId || request.placeId || undefined,
  };
  if (env.FACTORY_PHASE_A_RUN_ID) expectedHandoff.phaseARunId = env.FACTORY_PHASE_A_RUN_ID;
  if (!fs.existsSync(pendingFile) && env.FACTORY_PHASE_A_RUN_ID) {
    const dest = path.join(root, 'canary', 'handoff', String(env.FACTORY_PHASE_A_RUN_ID));
    const retrieved = (deps.retrievePhaseAHandoff || retrievePhaseAHandoff)({
      phaseARunId: env.FACTORY_PHASE_A_RUN_ID,
      repository: env.FACTORY_REPOSITORY || env.GITHUB_REPOSITORY || 'alchemistj/ff-content-demo-factory',
      destDir: dest,
      expected: expectedHandoff,
      downloader: deps.downloadPhaseAArtifact,
      env,
    });
    pendingFile = retrieved.pendingFile;
    fs.mkdirSync(outputDir, { recursive: true });
    fs.copyFileSync(pendingFile, path.join(outputDir, 'current-head-gate1-pending.json'));
  }
  if (!fs.existsSync(pendingFile)) throw new Error('Canary resume requires the durable phase-A pending handoff');
  const pending = readJson(pendingFile);
  validatePendingHandoff(pending, expectedHandoff);
  if (pending.envelope.checkedOutSha !== assertedHeadSha || pending.envelope.inputManifestDigest !== inputManifest.manifestDigest) throw new Error('Canary pending handoff does not bind the current head/input manifest');
  if (env.FACTORY_HANDOFF_CAS_FILE) claimResumeAtomic(env.FACTORY_HANDOFF_CAS_FILE, pending.handoffId, env.FACTORY_RESUME_RESULT_ID || pending.handoffDigest);
  const expectedEnvelope = { ...pending.envelope, checkedOutSha: assertedHeadSha, inputManifestDigest: inputManifest.manifestDigest };
  const config = (deps.loadConfig || loadConfig)(process.cwd());
  const adapters = (deps.createProductionAdapters || createProductionAdapters)({
    root,
    config,
    env,
    cursor: sealedAdapters?.cursor || createCloudAgentBundleAdapter(required(cursorBundle, 'cursorBundle'), expectedEnvelope),
    apify: sealedAdapters?.apify,
    productionCloudAgent: true,
  });
  adapters.actionProof = actionProofFromEnvironment(env);
  const cycle = deps.runFactoryCycle || runFactoryCycle;
  const stage1 = await cycle({ root, config, adapters, discoveryRequest: request, env });
  if (stage1.nextAction?.code !== 'architect-candidate-review-required') throw new Error(`Fresh canary did not stop at candidate review: ${stage1.nextAction?.code || 'unknown'}`);
  const stage2 = await cycle({ root, config, adapters, architectDecision: { selection }, env });
  if (stage2.nextAction?.code !== 'architect-qa-required') throw new Error(`Fresh canary did not stop at Architect QA: ${stage2.nextAction?.code || 'unknown'}`);
  const selectedRun = stage2.state?.activeRun || stage2.run;
  const factoryRunId = selectedRun?.runId || null;
  const factorySourceCheckpointDigest = selectedRun?.artifacts?.sourceCheckpoint ? digest(selectedRun.artifacts.sourceCheckpoint) : null;
  const stage3 = await cycle({ root, config, adapters, architectDecision: { qa }, env });
  if (stage3.nextAction?.code !== 'awaiting-human-gate-1') throw new Error(`Fresh canary did not reach Human Gate 1: ${stage3.nextAction?.code || 'unknown'}`);
  const run = stage3.state?.activeRun || stage3.run;
  if (!run || run.status !== 'awaiting-human-gate-1' || !run.artifacts?.gate1?.markdown) throw new Error('Fresh canary Gate 1 artifact is missing');
  const approved = pending.envelope.approvedLineage;
  if (approved) {
    const prescription = run.artifacts.prescription || {};
    const actual = { sourceArtifactDigest: prescription.sourceArtifactDigest, evidenceDigest: prescription.evidenceDigest, pageSetDigest: prescription.pageSetDigest, prescriptionDigest: prescription.prescriptionDigest, approvalDigest: prescription.approvalDigest, strategyDigest: prescription.strategyDigest };
    for (const field of Object.keys(actual)) if (actual[field] !== approved[field]) throw new Error(`Gate 1 output ${field} does not exactly match approved historical lineage`);
    if (JSON.stringify(prescription.selectedServiceIds || []) !== JSON.stringify(approved.selectedServiceIds) || JSON.stringify((prescription.pages || []).map((page) => page.url)) !== JSON.stringify(approved.routes)) throw new Error('Gate 1 output services/routes do not exactly match approved historical lineage');
  }
  const finalEnvelope = { ...expectedEnvelope, factoryRunId: run.runId, factorySourceCheckpointDigest: run.artifacts.sourceCheckpoint ? digest(run.artifacts.sourceCheckpoint) : null };
  const boundReceipts = Object.entries(cursorBundle?.jobs || {}).map(([jobId, entry]) => {
    const kind = entry.receipt?.operation || entry.result?.kind || 'unknown';
    const receipt = validateJobReceipt({ ...(entry.receipt || {}), provider: 'cursor-cloud-agent', jobId }, { kind, expectedEnvelope });
    for (const field of ['runId', 'prospectId', 'sourceCheckpointDigest', 'sourceManifestDigest']) if (receipt.envelope?.[field] != null && String(receipt.envelope[field]) !== String(finalEnvelope[field])) throw new Error(`Cloud Agent ${kind} final ${field} binding mismatch`);
    return { jobId, receipt, finalBinding: { handoffId: pending.handoffId, jobId: expectedEnvelope.jobId, factoryRunId, factorySourceCheckpointDigest }, boundDigest: digest({ jobId, receipt, finalBinding: { handoffId: pending.handoffId, jobId: expectedEnvelope.jobId, factoryRunId, factorySourceCheckpointDigest } }) };
  });
  const proof = {
    schemaVersion: 'factory-current-head-gate1-canary-v1',
    proofScope: 'fresh-current-head-gate1-canary-only',
    integratedFactoryReadiness: false,
    liveConnectorProven: false,
    expectedHeadSha: assertedHeadSha,
    checkedOutSha: assertedHeadSha,
    headAssertion: true,
    inputManifest,
    dispatch,
    handoffId: pending.handoffId,
    handoffDigest: pending.handoffDigest,
    sealedEvidence,
    historicalLineage: sealedAdapters?.sealed?.lineage || null,
    runId: run.runId,
    prospectId: run.prospectId || null,
    candidate: { placeId: run.candidate?.placeId || null, name: run.candidate?.name || null, location: run.candidate?.location || null },
    sourceIdentity: run.artifacts.prescription?.sourceIdentity || null,
    sourceArtifactDigest: run.artifacts.prescription?.sourceArtifactDigest || null,
    sourceManifestDigest: run.artifacts.prescription?.sourceManifestDigest || run.artifacts.sourceCheckpoint?.sourceManifestDigest || null,
    pageSetDigest: run.artifacts.prescription?.pageSetDigest || null,
    prescriptionDigest: run.artifacts.prescription?.prescriptionDigest || null,
    bindingDigest: digest({ headSha: assertedHeadSha, runId: run.runId, prospectId: run.prospectId || null, sourceIdentity: run.artifacts.prescription?.sourceIdentity || null, sourceManifestDigest: run.artifacts.prescription?.sourceManifestDigest || null }),
    cursorReceiptBindings: boundReceipts,
    gate1State: run.status,
    laterStageArtifacts: Object.keys(run.artifacts).filter((key) => ['copy', 'website', 'build', 'deploy'].some((word) => key.toLowerCase().includes(word))),
    limitations: ['This proves a fresh current-head path through Human Gate 1 only.', 'It does not prove post-Gate-1 writer lanes, final copy QA, or website build readiness.', 'The live GitHub cursor[bot] terminal-bundle to automatic phase-B connector path remains unproven unless a trusted terminal receipt is bound.'],
  };
  fs.mkdirSync(path.join(root, 'canary', 'outputs'), { recursive: true });
  const markdown = run.artifacts.gate1.markdown;
  run.artifacts.gate1.markdown = markdown;
  fs.writeFileSync(path.join(root, 'canary', 'outputs', 'current-head-gate1-proof.json'), `${JSON.stringify(proof, null, 2)}\n`);
  fs.writeFileSync(path.join(root, 'canary', 'outputs', 'gate1.md'), markdown);
  return { proof, state: stage3.state };
}

if (require.main === module) {
  const [,, root, requestFile, selectionFile, qaFile, cursorBundleFile] = process.argv;
  runCurrentHeadGate1Canary({ root, requestFile, selectionFile, qaFile, cursorBundleFile }).then(({ proof }) => process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`)).catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
}

module.exports = { runCurrentHeadGate1Canary };
