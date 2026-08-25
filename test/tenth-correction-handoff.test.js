'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { requiredReceipt } = require('../src/factory/orchestrator');
const { digest } = require('../src/factory/prescription-policy');
const { createDispatchPacket } = require('../src/factory/cloud-agent');
const {
  createPendingHandoff,
  validatePendingHandoff,
  retrievePhaseAHandoff,
  claimResumeAtomic,
} = require('../src/factory/handoff');
const { runCurrentHeadGate1Canary, verifyApprovedLineageRuntimePacket } = require('../src/run-gate1-canary');
const { PLACE_ID, verifySealed360Lineage, HISTORICAL_360, compareApprovedLineage } = require('../src/factory/sealed-evidence');
const { main: prepareRuntimePacket } = require('../scripts/prepare-360-gate1-canary-packet');
const { selectNewestDispatchComment } = require('../scripts/select-cursor-dispatch-comment');
const { markerFor, markerBody, assertTransition, findClaim, recoverClaim } = require('../src/factory/github-ledger');
const { claimPhaseBAtomic } = require('../src/factory/handoff');
const { collect } = require('../src/collect-cursor-terminal-result');
const { createTrustedGithubCheckpointAdapter } = require('../src/adapters/trusted-github-checkpoint');
const { validateMaterial, validateMetadata, safeArchiveEntries, REGISTRY_KEY } = require('../scripts/restore-trusted-checkpoint');
const { resolveTrustedArtifact } = require('../src/factory/trusted-artifacts');
const { annotate } = require('../scripts/annotate-trusted-checkpoint');

function completeBinding(extra = {}) {
  return {
    repository: 'alchemistj/ff-content-demo-factory',
    issueNumber: 8,
    prNumber: 1,
    branch: 'architect/greenfield-gate1',
    headSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    source: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    operation: 'discovery',
    ...extra,
  };
}

function validReceipt({ operation = 'discovery', input, binding, provider } = {}) {
  const payload = input || (operation === 'discovery'
    ? { searchStrings: ['garage door repair'], location: 'Springfield, Missouri' }
    : { placeId: PLACE_ID, candidate: { placeId: PLACE_ID } });
  const resolvedProvider = provider || (operation === 'discovery' || operation === 'finalist-enrichment' ? 'apify' : 'cursor-sdk');
  const vendorReceipt = resolvedProvider === 'apify'
    ? { runId: '32717620900', datasetId: '9516514426' }
    : { runId: '32717620900', artifactId: '9516514426', sourceSha: '81587f8422a23313fd7868751061eec7e2fb5926', sealedEvidence: true, threadUrl: 'https://cursor.com/agents/agent-1' };
  const resolvedBinding = binding || completeBinding({
    operation,
    ...(operation === 'discovery' ? {} : { placeId: PLACE_ID }),
    ...(['discovery', 'website-audit'].includes(operation) ? {} : { prospectId: 'prospect-1', runId: 'run-1' }),
  });
  return {
    provider: resolvedProvider,
    operation,
    status: 'completed',
    terminalStatus: 'succeeded',
    input: payload,
    inputDigest: digest(payload),
    result: { ok: true },
    outputDigest: digest({ ok: true }),
    startedAt: '2026-01-01T00:00:00Z',
    completedAt: '2026-01-01T00:00:01Z',
    vendorReceipt,
    binding: resolvedBinding,
  };
}

function samplePending(extra = {}) {
  const packet = createDispatchPacket({
    issueNumber: 8,
    prNumber: 1,
    branch: 'architect/greenfield-gate1',
    reviewedHeadSha: 'head-1',
    scope: 'research-only',
  });
  return createPendingHandoff({
    dispatchPacket: packet,
    inputManifest: { expectedHeadSha: 'head-1', manifestDigest: 'sha256:manifest', sourceManifestDigest: 'sha256:manifest-source' },
    runId: 'canary-run-1',
    prospectId: 'prospect-1',
    placeId: PLACE_ID,
    sourceCheckpointDigest: 'sha256:source',
    phaseARunId: 'phase-a-1',
    inputFiles: { request: 'canary/inputs/360-gate1-request.json', selection: 'canary/inputs/360-gate1-selection.json', qa: 'canary/inputs/360-gate1-qa.json' },
    ...extra,
  });
}

function canaryEnv(extra = {}) {
  return {
    FACTORY_CHECKED_OUT_SHA: 'head-1',
    FACTORY_EXPECTED_HEAD_SHA: 'head-1',
    EXPECTED_HEAD_SHA: 'head-1',
    FACTORY_HEAD_ASSERTION: 'true',
    FACTORY_ISSUE_NUMBER: '8',
    FACTORY_PR_NUMBER: '1',
    FACTORY_BRANCH: 'architect/greenfield-gate1',
    FACTORY_REPOSITORY: 'alchemistj/ff-content-demo-factory',
    ...extra,
  };
}

function mockCycleDeps() {
  let cycleCount = 0;
  return {
    loadConfig: () => ({}),
    createProductionAdapters: () => ({}),
    runFactoryCycle: async () => {
      cycleCount += 1;
      if (cycleCount === 1) return { nextAction: { code: 'architect-candidate-review-required' }, state: { activeRun: { runId: 'factory-run-1', prospectId: 'prospect-1' } } };
      if (cycleCount === 2) return { nextAction: { code: 'architect-qa-required' }, state: { activeRun: { runId: 'factory-run-1', prospectId: 'prospect-1' } } };
      return {
        nextAction: { code: 'awaiting-human-gate-1' },
        state: {
          activeRun: {
            runId: 'factory-run-1',
            prospectId: 'prospect-1',
            status: 'awaiting-human-gate-1',
            candidate: { placeId: PLACE_ID, name: '360 Garage Door and More' },
            artifacts: { gate1: { markdown: '# Gate 1' }, prescription: {} },
          },
        },
      };
    },
    cycleCount: () => cycleCount,
  };
}

test('tenth correction production receipts fail closed when required context is omitted', () => {
  const receipt = validReceipt();
  assert.doesNotThrow(() => requiredReceipt(receipt, 'discovery', null, receipt.binding));
  for (const field of ['repository', 'issueNumber', 'prNumber', 'branch', 'headSha', 'operation']) {
    const expected = completeBinding();
    delete expected[field];
    assert.throws(() => requiredReceipt(receipt, 'discovery', null, expected), /omitted/);
    const received = validReceipt();
    delete received.binding[field];
    assert.throws(() => requiredReceipt(received, 'discovery', null, completeBinding()), /omitted/);
  }
  const noSourceExpected = completeBinding();
  delete noSourceExpected.source;
  assert.throws(() => requiredReceipt(receipt, 'discovery', null, noSourceExpected), /source binding is omitted/);
  const audit = validReceipt({ operation: 'website-audit' });
  const auditExpected = { ...audit.binding };
  delete auditExpected.placeId;
  assert.throws(() => requiredReceipt(audit, 'website-audit', null, auditExpected), /placeId binding is omitted/);
  const enrichment = validReceipt({ operation: 'finalist-enrichment', input: { placeId: PLACE_ID, mapsUrl: 'https://maps.example/360', limit: 50, dateWindow: null } });
  const enrichmentExpected = { ...enrichment.binding };
  delete enrichmentExpected.prospectId;
  assert.throws(() => requiredReceipt(enrichment, 'finalist-enrichment', null, enrichmentExpected), /prospectId binding is omitted/);
  delete enrichment.binding.runId;
  assert.throws(() => requiredReceipt(enrichment, 'finalist-enrichment', null, completeBinding({ operation: 'finalist-enrichment', placeId: PLACE_ID, prospectId: 'prospect-1', runId: 'run-1' })), /runId binding is omitted/);
});

test('forward correction binds approved historical lineage into phase-A handoff and production invocation', async () => {
  const approvedLineage = {
    packetDigest: 'sha256:packet',
    sourceArtifactDigest: 'sha256:source-artifact',
    sourceManifestDigest: 'sha256:manifest-source',
    evidenceDigest: 'sha256:evidence',
    pageSetDigest: 'sha256:pages',
    prescriptionDigest: 'sha256:prescription',
    approvalDigest: 'sha256:approval',
    strategyDigest: 'sha256:strategy',
    selectedServiceIds: ['service-a', 'service-b'],
    routes: ['/', '/service-a', '/service-b', '/contact'],
  };
  const pending = samplePending({ approvedLineage });
  assert.equal(pending.envelope.approvedLineage, undefined);
  assert.deepEqual(pending.envelope.historicalLineageSeed, { seedOnly: true, ...approvedLineage });
  assert.doesNotThrow(() => validatePendingHandoff(pending));
  const tampered = { ...pending, envelope: { ...pending.envelope, historicalLineageSeed: { ...pending.envelope.historicalLineageSeed, strategyDigest: 'sha256:forged' } } };
  assert.throws(() => validatePendingHandoff(tampered), /handoff digest|invented/);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'factory-approved-runtime-'));
  await assert.rejects(() => runCurrentHeadGate1Canary({
    root,
    requestFile: path.resolve('canary/inputs/360-gate1-request.json'),
    selectionFile: path.resolve('canary/inputs/360-gate1-selection.json'),
    qaFile: path.resolve('canary/inputs/360-gate1-qa.json'),
    cursorBundleFile: '',
    env: canaryEnv({ FACTORY_PHASE_A_PRODUCTION: 'true' }),
  }), /Needs Josh: production phase A requires a verified approved-lineage runtime packet/);
});

test('trusted GitHub checkpoint is a production receipt type with authentic source identity and no vendor identity', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'factory-trusted-checkpoint-'));
  for (const file of ['canary/inputs/360-four-page-reseal-approval.json', 'canary/inputs/360-four-page-reseal-ledger.json', 'canary/inputs/360-garage-door-and-more.discovery.json', 'canary/outputs/360-four-page-reseal-handoff.json']) {
    const target = path.join(root, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(file, target);
  }
  const head = 'a'.repeat(40);
  const adapter = createTrustedGithubCheckpointAdapter({ root, assertedHeadSha: head, currentArtifactId: 'github-artifact-123', currentWorkflowRunId: 'github-run-456' });
  assert.equal(adapter.source.provider, 'github-trusted-checkpoint');
  assert.equal(adapter.source.originalArtifactId, '9516514426');
  assert.equal(adapter.source.currentArtifactId, 'github-artifact-123');
  assert.equal(adapter.source.checkedOutSha, head);
  const discovered = await adapter.discoverCandidates();
  assert.equal(discovered.provenance.run.provider, 'github-trusted-checkpoint');
  assert.equal(discovered.provenance.run.vendorReceipt, undefined);
  assert.equal(discovered.provenance.run.source.originalArtifactId, '9516514426');
  const enriched = await adapter.enrichFinalist({ placeId: PLACE_ID });
  assert.equal(enriched.receipt.provider, 'github-trusted-checkpoint');
  assert.equal(enriched.receipt.source.sourceSha, HISTORICAL_360.sourceSha);
  await assert.rejects(() => adapter.enrichFinalist({ placeId: 'foreign-place' }), /cross-prospect/);
});

test('trusted checkpoint registry rejects caller identities and verifies source files/metadata/archive paths', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'factory-trusted-material-'));
  for (const file of ['canary/inputs/360-four-page-reseal-approval.json', 'canary/inputs/360-four-page-reseal-ledger.json', 'canary/inputs/360-garage-door-and-more.discovery.json', 'canary/outputs/360-four-page-reseal-handoff.json']) {
    const target = path.join(root, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(file, target);
  }
  const trusted = resolveTrustedArtifact(REGISTRY_KEY);
  assert.doesNotThrow(() => validateMaterial(root, trusted));
  assert.doesNotThrow(() => validateMetadata({ id: trusted.artifactId, name: trusted.archiveName, expired: false, workflow_run: { id: trusted.runId, head_sha: trusted.sourceSha, repository: { full_name: 'alchemistj/ff-content-demo-factory' } } }, trusted));
  assert.throws(() => validateMetadata({ id: 'forged', name: trusted.archiveName, expired: false, workflow_run: { id: trusted.runId, head_sha: trusted.sourceSha } }, trusted), /id\/name/);
  fs.appendFileSync(path.join(root, 'canary/inputs/360-four-page-reseal-ledger.json'), 'tamper');
  assert.throws(() => validateMaterial(root, trusted), /source file digest mismatch/);
  assert.throws(() => createTrustedGithubCheckpointAdapter({ root, assertedHeadSha: 'a'.repeat(40), artifactId: 'forged' }), /caller artifact\/run ids are forbidden/);
  const traversal = path.join(root, 'traversal.zip');
  const py = spawnSync('python', ['-c', "import zipfile,sys; z=zipfile.ZipFile(sys.argv[1],'w'); z.writestr('../escape.txt','bad'); z.close()", traversal], { encoding: 'utf8' });
  assert.equal(py.status, 0, py.stderr);
  assert.throws(() => safeArchiveEntries(traversal), /unsafe archive path/);
  const manifestFile = path.join(root, 'trusted-checkpoint-manifest.json');
  const manifest = { schemaVersion: 'factory-trusted-github-checkpoint-manifest-v1', registryKey: REGISTRY_KEY, repository: 'alchemistj/ff-content-demo-factory', original: { runId: trusted.runId, artifactId: trusted.artifactId, sourceSha: trusted.sourceSha, archiveName: trusted.archiveName, archiveDigest: trusted.archiveDigest }, current: { workflowRunId: null, workflowArtifactId: null, checkedOutSha: null } };
  manifest.manifestDigest = digest(manifest); fs.writeFileSync(manifestFile, JSON.stringify(manifest));
  const annotated = annotate(manifestFile, { workflowArtifactId: 'current-artifact', workflowRunId: 'current-run', checkedOutSha: 'b'.repeat(40) });
  assert.equal(annotated.original.artifactId, trusted.artifactId); assert.equal(annotated.current.workflowArtifactId, 'current-artifact'); assert.equal(annotated.current.checkedOutSha, 'b'.repeat(40));
});

test('twelfth correction verifies the runtime approved handoff and canonical prescription projection before and after paid work', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'factory-runtime-approved-'));
  for (const file of ['canary/inputs/360-four-page-reseal-approval.json', 'canary/inputs/360-four-page-reseal-ledger.json', 'canary/inputs/360-garage-door-and-more.discovery.json', 'canary/outputs/360-four-page-reseal-handoff.json']) {
    const target = path.join(root, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(file, target);
  }
  const head = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
  const packetFile = path.join(root, 'runtime/approved.json');
  prepareRuntimePacket({ root, lineageRoot: root, currentHead: head, expectedHeadSha: head, target: packetFile, env: {} });
  assert.doesNotThrow(() => verifyApprovedLineageRuntimePacket({ root, filename: packetFile, assertedHeadSha: head, dispatch: { repository: 'alchemistj/ff-content-demo-factory', issueNumber: 8, prNumber: 1, branch: 'architect/greenfield-gate1' } }));
  const productionRequest = path.join(root, 'request.json'); const productionSelection = path.join(root, 'selection.json'); const productionQa = path.join(root, 'qa.json');
  fs.copyFileSync('canary/inputs/360-gate1-request.json', productionRequest); fs.copyFileSync('canary/inputs/360-gate1-selection.json', productionSelection); fs.copyFileSync('canary/inputs/360-gate1-qa.json', productionQa);
  const productionPhaseA = await runCurrentHeadGate1Canary({ root, requestFile: productionRequest, selectionFile: productionSelection, qaFile: productionQa, cursorBundleFile: '', env: canaryEnv({ FACTORY_CANARY_PHASE: 'dispatch', FACTORY_CHECKED_OUT_SHA: head, FACTORY_EXPECTED_HEAD_SHA: head, EXPECTED_HEAD_SHA: head, FACTORY_PHASE_A_PRODUCTION: 'true', FACTORY_APPROVED_LINEAGE_PACKET: packetFile }) });
  assert.equal(productionPhaseA.proof.awaitingCursorReceipt, true);
  assert.ok(JSON.parse(fs.readFileSync(path.join(root, 'canary/outputs/current-head-gate1-pending.json'), 'utf8')).envelope.historicalLineageSeed);
  const packet = JSON.parse(fs.readFileSync(packetFile, 'utf8'));
  const forged = JSON.parse(JSON.stringify(packet)); forged.approvedLineage.strategyDigest = 'sha256:forged'; forged.packetDigest = digest({ ...forged, packetDigest: undefined }); fs.writeFileSync(packetFile, JSON.stringify(forged));
  assert.throws(() => verifyApprovedLineageRuntimePacket({ root, filename: packetFile, assertedHeadSha: head, dispatch: { repository: 'alchemistj/ff-content-demo-factory', issueNumber: 8, prNumber: 1, branch: 'architect/greenfield-gate1' } }), /strategyDigest|historical lineage/);
  const historicalHandoff = JSON.parse(fs.readFileSync(path.join(root, 'canary/outputs/360-four-page-reseal-handoff.json'), 'utf8'));
  const historical = verifySealed360Lineage({ root, handoff: historicalHandoff });
  const historicalProjection = { ...historical, pages: historicalHandoff.pages };
  assert.equal(historicalProjection.sourceManifestDigest, digest(JSON.parse(fs.readFileSync(path.join(root, 'canary/inputs/360-four-page-reseal-ledger.json'), 'utf8'))));
  for (const field of ['sourceArtifactDigest', 'sourceManifestDigest', 'evidenceDigest', 'pageSetDigest', 'prescriptionDigest', 'approvalDigest', 'strategyDigest']) assert.throws(() => compareApprovedLineage(historical, { ...historicalProjection, [field]: 'sha256:forged' }, `mutated ${field}`), new RegExp(field));
  assert.throws(() => compareApprovedLineage(historical, { ...historicalProjection, routes: [...historical.routes.slice(0, 3), '/foreign'] }, 'mutated routes'), /services\/routes/);
});

test('current-head Gate 1 never carries stale historical approval and emits a readable Needs Josh artifact', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'factory-current-needs-josh-'));
  const head = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
  for (const file of ['canary/inputs/360-four-page-reseal-approval.json', 'canary/inputs/360-four-page-reseal-ledger.json', 'canary/inputs/360-garage-door-and-more.discovery.json', 'canary/outputs/360-four-page-reseal-handoff.json']) {
    const target = path.join(root, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(file, target);
  }
  const packetFile = path.join(root, 'runtime/approved.json');
  prepareRuntimePacket({ root, lineageRoot: root, currentHead: head, expectedHeadSha: head, target: packetFile, env: {} });
  const requestFile = path.join(root, 'request.json'); const selectionFile = path.join(root, 'selection.json'); const qaFile = path.join(root, 'qa.json');
  fs.copyFileSync('canary/inputs/360-gate1-request.json', requestFile); fs.copyFileSync('canary/inputs/360-gate1-selection.json', selectionFile); fs.copyFileSync('canary/inputs/360-gate1-qa.json', qaFile);
  const dispatchEnv = canaryEnv({ FACTORY_CANARY_PHASE: 'dispatch', FACTORY_CHECKED_OUT_SHA: head, FACTORY_EXPECTED_HEAD_SHA: head, EXPECTED_HEAD_SHA: head, FACTORY_PHASE_A_PRODUCTION: 'true', FACTORY_APPROVED_LINEAGE_PACKET: packetFile });
  await runCurrentHeadGate1Canary({ root, requestFile, selectionFile, qaFile, cursorBundleFile: '', env: dispatchEnv });
  const pendingFile = path.join(root, 'canary/outputs/current-head-gate1-pending.json');
  const pending = JSON.parse(fs.readFileSync(pendingFile, 'utf8'));
  const packet = pending.dispatchPacket;
  const bundleFile = path.join(root, 'cursor-bundle.json');
  fs.writeFileSync(bundleFile, JSON.stringify({
    schemaVersion: 'cursor-cloud-agent-bundle-v1', model: packet.model,
    dispatch: { ...packet, commentUrl: 'https://github.com/alchemistj/ff-content-demo-factory/pull/1#issuecomment-99' },
    inputManifestDigest: pending.envelope.inputManifestDigest,
    envelope: { ...pending.envelope, handoffId: pending.handoffId, historicalLineageSeed: pending.envelope.historicalLineageSeed },
    jobs: {},
  }, null, 2));
  const result = await runCurrentHeadGate1Canary({ root, requestFile, selectionFile, qaFile, cursorBundleFile: bundleFile, env: canaryEnv({ FACTORY_CANARY_PHASE: 'integrated', FACTORY_CHECKED_OUT_SHA: head, FACTORY_EXPECTED_HEAD_SHA: head, EXPECTED_HEAD_SHA: head, FACTORY_PHASE_A_PRODUCTION: 'true', FACTORY_APPROVED_LINEAGE_PACKET: packetFile, FACTORY_HANDOFF_FILE: pendingFile }), deps: mockCycleDeps() });
  assert.equal(result.proof.needsJosh.code, 'CURRENT_LINEAGE_DIFFERS_FROM_HISTORICAL_SEED');
  assert.equal(result.proof.gate1State, 'awaiting-human-gate-1');
  assert.match(fs.readFileSync(path.join(root, 'canary/outputs/gate1.md'), 'utf8'), /Needs Josh|Historical approval was not carried forward/);
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'canary/outputs/gate1.md'), 'utf8'), /approved historical lineage exactly|approvedGate1: true/);
});

test('tenth correction recomputes input digests and rejects cross-prospect or tampered payloads', () => {
  const input = { placeId: PLACE_ID, candidate: { placeId: PLACE_ID } };
  const receipt = validReceipt({ operation: 'website-audit', input, binding: completeBinding({ operation: 'website-audit', placeId: PLACE_ID }) });
  assert.doesNotThrow(() => requiredReceipt(receipt, 'website-audit', null, receipt.binding));
  assert.throws(
    () => requiredReceipt({ ...receipt, inputDigest: 'sha256:deadbeef' }, 'website-audit', null, receipt.binding),
    /input digest|persisted payload/,
  );
  assert.throws(
    () => requiredReceipt({ ...receipt, input: { placeId: 'ChIJotherplace000000000000000', candidate: { placeId: 'ChIJotherplace000000000000000' } } }, 'website-audit', null, receipt.binding),
    /input digest|persisted payload|candidate binding/,
  );
  const foreign = validReceipt({
    operation: 'website-audit',
    input: { placeId: 'ChIJotherplace000000000000000', candidate: { placeId: 'ChIJotherplace000000000000000' } },
    binding: completeBinding({ operation: 'website-audit', placeId: PLACE_ID }),
  });
  assert.throws(() => requiredReceipt(foreign, 'website-audit', null, foreign.binding), /candidate binding/);
});

test('tenth correction retrieves the exact phase-A artifact without manual file movement', () => {
  const pending = samplePending();
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'factory-phase-a-artifact-'));
  const retrieved = retrievePhaseAHandoff({
    phaseARunId: 'phase-a-1',
    repository: 'alchemistj/ff-content-demo-factory',
    destDir: dest,
    expected: {
      checkedOutSha: 'head-1',
      inputManifestDigest: 'sha256:manifest',
      repository: 'alchemistj/ff-content-demo-factory',
      issueNumber: 8,
      prNumber: 1,
      branch: 'architect/greenfield-gate1',
      placeId: PLACE_ID,
    },
    downloader: ({ dest: downloadDest }) => {
      fs.mkdirSync(downloadDest, { recursive: true });
      fs.writeFileSync(path.join(downloadDest, 'current-head-gate1-pending.json'), `${JSON.stringify(pending, null, 2)}\n`);
    },
  });
  assert.equal(retrieved.pending.handoffId, pending.handoffId);
  assert.equal(retrieved.pending.continuation.once, true);
  assert.equal(fs.existsSync(retrieved.pendingFile), true);
});

test('tenth correction rejects stale, foreign, duplicate, and tampered phase-A handoffs', () => {
  const pending = samplePending();
  const dest = () => fs.mkdtempSync(path.join(os.tmpdir(), 'factory-phase-a-reject-'));
  const download = (value) => ({ dest: downloadDest }) => {
    fs.mkdirSync(downloadDest, { recursive: true });
    fs.writeFileSync(path.join(downloadDest, 'current-head-gate1-pending.json'), `${JSON.stringify(value, null, 2)}\n`);
  };
  const reject = (fn, pattern) => assert.throws(fn, pattern);
  reject(() => retrievePhaseAHandoff({
    phaseARunId: 'phase-a-stale',
    repository: 'alchemistj/ff-content-demo-factory',
    destDir: dest(),
    expected: { checkedOutSha: 'head-1' },
    downloader: download(pending),
  }), /phase-A run binding is stale|mismatched/);
  reject(() => retrievePhaseAHandoff({
    phaseARunId: 'phase-a-1',
    repository: 'alchemistj/ff-content-demo-factory',
    destDir: dest(),
    expected: { checkedOutSha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
    downloader: download(pending),
  }), /checkedOutSha binding is stale|mismatched/);
  reject(() => retrievePhaseAHandoff({
    phaseARunId: 'phase-a-1',
    repository: 'alchemistj/ff-content-demo-factory',
    destDir: dest(),
    expected: { branch: 'foreign-branch', checkedOutSha: 'head-1' },
    downloader: download(pending),
  }), /branch binding is stale|mismatched/);
  reject(() => retrievePhaseAHandoff({
    phaseARunId: 'phase-a-1',
    repository: 'alchemistj/ff-content-demo-factory',
    destDir: dest(),
    expected: { issueNumber: 99, checkedOutSha: 'head-1' },
    downloader: download(pending),
  }), /Issue binding is stale|mismatched/);
  reject(() => retrievePhaseAHandoff({
    phaseARunId: 'phase-a-1',
    repository: 'alchemistj/ff-content-demo-factory',
    destDir: dest(),
    expected: { prNumber: 7, checkedOutSha: 'head-1' },
    downloader: download(pending),
  }), /PR binding is stale|mismatched/);
  reject(() => retrievePhaseAHandoff({
    phaseARunId: 'phase-a-1',
    repository: 'other/repo',
    destDir: dest(),
    expected: { repository: 'other/repo', checkedOutSha: 'head-1' },
    downloader: download(pending),
  }), /repository binding is stale|mismatched/);
  reject(() => retrievePhaseAHandoff({
    phaseARunId: 'phase-a-1',
    repository: 'alchemistj/ff-content-demo-factory',
    destDir: dest(),
    expected: { placeId: 'ChIJotherplace000000000000000', checkedOutSha: 'head-1' },
    downloader: download(pending),
  }), /place\/source identity is stale|mismatched/);
  reject(() => retrievePhaseAHandoff({
    phaseARunId: 'phase-a-1',
    repository: 'alchemistj/ff-content-demo-factory',
    destDir: dest(),
    expected: { artifactDigest: 'sha256:tampered', checkedOutSha: 'head-1' },
    downloader: download(pending),
  }), /artifact digest is stale|mismatched/);
  reject(() => retrievePhaseAHandoff({
    phaseARunId: 'phase-a-1',
    repository: 'alchemistj/ff-content-demo-factory',
    destDir: dest(),
    expected: { consumedHandoffs: [pending.handoffId], checkedOutSha: 'head-1' },
    downloader: download(pending),
  }), /already been consumed/);
  const tampered = { ...pending, artifact: { ...pending.artifact, digest: 'sha256:tampered' } };
  reject(() => retrievePhaseAHandoff({
    phaseARunId: 'phase-a-1',
    repository: 'alchemistj/ff-content-demo-factory',
    destDir: dest(),
    expected: { checkedOutSha: 'head-1' },
    downloader: download(tampered),
  }), /digest is stale|invented|artifact identity/);
  assert.throws(() => validatePendingHandoff({ ...pending, continuation: { once: true, state: 'consumed' } }), /continuation state is missing or consumed|digest is stale|invented/);
});

test('tenth correction resume downloads the phase-A artifact and refuses duplicate continuation', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'factory-ninth-resume-'));
  const requestFile = path.join(temp, 'request.json');
  const selectionFile = path.join(temp, 'selection.json');
  const qaFile = path.join(temp, 'qa.json');
  for (const file of [requestFile, selectionFile, qaFile]) fs.writeFileSync(file, '{}');
  const env = canaryEnv({ FACTORY_CANARY_PHASE: 'dispatch' });
  await runCurrentHeadGate1Canary({ root: temp, requestFile, selectionFile, qaFile, cursorBundleFile: '', env });
  const pending = JSON.parse(fs.readFileSync(path.join(temp, 'canary/outputs/current-head-gate1-pending.json'), 'utf8'));
  const remote = fs.mkdtempSync(path.join(os.tmpdir(), 'factory-ninth-remote-'));
  fs.writeFileSync(path.join(remote, 'current-head-gate1-pending.json'), `${JSON.stringify(pending, null, 2)}\n`);
  const resumeRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'factory-ninth-resume-root-'));
  fs.writeFileSync(path.join(resumeRoot, 'request.json'), '{}');
  fs.writeFileSync(path.join(resumeRoot, 'selection.json'), '{}');
  fs.writeFileSync(path.join(resumeRoot, 'qa.json'), '{}');
  const packet = pending.dispatchPacket;
  const bundleFile = path.join(resumeRoot, 'cursor-bundle.json');
  fs.writeFileSync(bundleFile, JSON.stringify({
    schemaVersion: 'cursor-cloud-agent-bundle-v1',
    model: packet.model,
    dispatch: { ...packet, commentUrl: 'https://github.com/alchemistj/ff-content-demo-factory/issues/8#issuecomment-1' },
    inputManifestDigest: pending.envelope.inputManifestDigest,
    envelope: { checkedOutSha: pending.envelope.checkedOutSha, inputManifestDigest: pending.envelope.inputManifestDigest, dispatchKey: pending.envelope.dispatchKey, dispatchDigest: pending.envelope.dispatchDigest, handoffId: pending.handoffId, runId: pending.envelope.runId, prospectId: pending.envelope.prospectId, sourceCheckpointDigest: pending.envelope.sourceCheckpointDigest, sourceManifestDigest: pending.envelope.sourceManifestDigest },
  }));
  const casFile = path.join(resumeRoot, 'handoff-cas.json');
  const deps = mockCycleDeps();
  const result = await runCurrentHeadGate1Canary({
    root: resumeRoot,
    requestFile: path.join(resumeRoot, 'request.json'),
    selectionFile: path.join(resumeRoot, 'selection.json'),
    qaFile: path.join(resumeRoot, 'qa.json'),
    cursorBundleFile: bundleFile,
    env: canaryEnv({
      FACTORY_CANARY_PHASE: 'resume',
      FACTORY_PHASE_A_RUN_ID: pending.phaseARunId,
      FACTORY_HANDOFF_CAS_FILE: casFile,
      FACTORY_RESUME_RESULT_ID: 'result-1',
    }),
    deps: {
      ...deps,
      downloadPhaseAArtifact: ({ dest }) => {
        fs.mkdirSync(dest, { recursive: true });
        fs.copyFileSync(path.join(remote, 'current-head-gate1-pending.json'), path.join(dest, 'current-head-gate1-pending.json'));
      },
    },
  });
  assert.equal(result.proof.gate1State, 'awaiting-human-gate-1');
  assert.equal(result.proof.handoffId, pending.handoffId);
  assert.equal(fs.existsSync(path.join(resumeRoot, 'canary/outputs/current-head-gate1-pending.json')), true);
  assert.equal(JSON.parse(fs.readFileSync(casFile, 'utf8')).consumedHandoffs[0], pending.handoffId);
  await assert.rejects(() => runCurrentHeadGate1Canary({
    root: resumeRoot,
    requestFile: path.join(resumeRoot, 'request.json'),
    selectionFile: path.join(resumeRoot, 'selection.json'),
    qaFile: path.join(resumeRoot, 'qa.json'),
    cursorBundleFile: bundleFile,
    env: canaryEnv({
      FACTORY_CANARY_PHASE: 'resume',
      FACTORY_PHASE_A_RUN_ID: pending.phaseARunId,
      FACTORY_HANDOFF_FILE: path.join(resumeRoot, 'canary/outputs/current-head-gate1-pending.json'),
      FACTORY_HANDOFF_CAS_FILE: casFile,
      FACTORY_RESUME_RESULT_ID: 'result-1',
    }),
    deps: mockCycleDeps(),
  }), /replay/);
  assert.throws(() => claimResumeAtomic(casFile, pending.handoffId, 'result-1'), /replay/);
});

test('tenth correction sealed 360 canary remains synthetic-only without vendor calls or manual movement', async () => {
  const head = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
  assert.match(head, /^[a-f0-9]{40}$/);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'factory-ninth-sealed-360-'));
  const result = await runCurrentHeadGate1Canary({
    root,
    requestFile: path.resolve('canary/inputs/360-gate1-request.json'),
    selectionFile: path.resolve('canary/inputs/360-gate1-selection.json'),
    qaFile: path.resolve('canary/inputs/360-gate1-qa.json'),
    cursorBundleFile: '',
    env: canaryEnv({
      FACTORY_CANARY_PHASE: 'integrated',
      FACTORY_SEALED_EVIDENCE: 'true',
      FACTORY_CHECKED_OUT_SHA: head,
      FACTORY_EXPECTED_HEAD_SHA: head,
      EXPECTED_HEAD_SHA: head,
      FACTORY_TEST_RUN_URL: 'https://github.com/alchemistj/ff-content-demo-factory/actions/runs/local-sealed-360',
      FACTORY_TEST_RESULT: 'local-sealed-evidence',
    }),
  });
  assert.equal(result.proof.gate1State, 'synthetic-sealed-evidence-only');
  assert.equal(result.proof.synthetic, true);
  assert.equal(result.proof.approvableGate1, false);
  assert.equal(result.proof.sealedEvidence, true);
  assert.equal(result.proof.integratedFactoryReadiness, false);
  assert.equal(result.proof.liveConnectorProven, false);
  const proofFile = path.join(root, 'canary/outputs/current-head-synthetic-replay-proof.json');
  const gateFile = path.join(root, 'canary/outputs/gate1.md');
  assert.equal(fs.existsSync(proofFile), true);
  assert.equal(fs.existsSync(gateFile), false);
  assert.equal(result.state, null);
});

test('eleventh correction rejects every mutation of the fixed historical sealed lineage', () => {
  for (const [label, relative, mutate] of [
    ['approval', 'canary/inputs/360-four-page-reseal-approval.json', (v) => { v.approvedBy = 'not Josh'; }],
    ['ledger', 'canary/inputs/360-four-page-reseal-ledger.json', (v) => { v.prospectId = 'foreign-prospect'; }],
    ['discovery', 'canary/inputs/360-garage-door-and-more.discovery.json', (v) => { v.request = { changed: true }; }],
    ['handoff strategy/service/routes', 'canary/outputs/360-four-page-reseal-handoff.json', (v) => { v.selectedServiceIds[0] = 'foreign-service'; v.pages[0].url = '/foreign'; v.writerProjection.routes[0] = '/foreign'; }],
  ]) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'factory-eleventh-lineage-'));
    for (const file of ['canary/inputs/360-four-page-reseal-approval.json', 'canary/inputs/360-four-page-reseal-ledger.json', 'canary/inputs/360-garage-door-and-more.discovery.json', 'canary/outputs/360-four-page-reseal-handoff.json']) {
      const target = path.join(root, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(file, target);
    }
    const target = path.join(root, relative); const value = JSON.parse(fs.readFileSync(target, 'utf8')); mutate(value); fs.writeFileSync(target, JSON.stringify(value, null, 2) + '\n');
    assert.throws(() => verifySealed360Lineage({ root, handoff: JSON.parse(fs.readFileSync(path.join(root, 'canary/outputs/360-four-page-reseal-handoff.json'), 'utf8')) }), /carry-forward requires Josh review/, label);
  }
});

test('tenth correction workflow contracts automatic retrieval, sealed integrated phase, and no API key', () => {
  const canary = fs.readFileSync('.github/workflows/current-head-gate1-canary.yml', 'utf8');
  const resume = fs.readFileSync('.github/workflows/cursor-cloud-agent-resume.yml', 'utf8');
  const dispatch = fs.readFileSync('.github/workflows/cursor-cloud-agent-dispatch.yml', 'utf8');
  const runner = fs.readFileSync('src/run-gate1-canary.js', 'utf8');
  assert.match(canary, /integrated/);
  assert.match(canary, /sealed_evidence/);
  assert.match(canary, /phase_a_run_id/);
  assert.match(canary, /FACTORY_SEALED_EVIDENCE/);
  assert.match(canary, /FACTORY_PHASE_A_RUN_ID/);
  assert.match(canary, /test -s canary\/outputs\/gate1\.md/);
  assert.match(canary, /Prove Gate 1 artifacts exist[\s\S]{0,250}sealed_evidence != true/);
  assert.match(canary, /FACTORY_APPROVED_LINEAGE_PACKET/);
  assert.doesNotMatch(canary, /CURSOR_API_KEY/);
  assert.match(resume, /gh run download/);
  assert.match(resume, /FACTORY_HANDOFF_FILE/);
  assert.match(dispatch, /FACTORY_SKIP_AUTOMATIC_DISPATCH/);
  assert.match(runner, /retrievePhaseAHandoff/);
  assert.match(runner, /FACTORY_HANDOFF_CAS_FILE/);
  assert.match(runner, /createSealed360Adapters/);
});

test('forward correction workflow events share Issue 8 / PR 1 context and retry states', () => {
  const dispatchWorkflow = fs.readFileSync('.github/workflows/cursor-cloud-agent-dispatch.yml', 'utf8');
  const resumeWorkflow = fs.readFileSync('.github/workflows/cursor-cloud-agent-resume.yml', 'utf8');
  const sealed = fs.readFileSync('src/factory/sealed-evidence.js', 'utf8');
  const handoff = fs.readFileSync('src/factory/handoff.js', 'utf8');
  assert.match(dispatchWorkflow, /github\.event_name == 'workflow_dispatch'/);
  assert.match(dispatchWorkflow, /issue_number.*=.*'8'|inputs\.issue_number.*'8'/s);
  assert.match(dispatchWorkflow, /pr_number.*=.*'1'|inputs\.pr_number.*'1'/s);
  assert.match(dispatchWorkflow, /pending\.envelope/);
  assert.match(dispatchWorkflow, /FACTORY_SKIP_AUTOMATIC_DISPATCH != 'true' && env\.FACTORY_LEDGER_ALREADY_CLAIMED != 'true'/);
  assert.match(resumeWorkflow, /dispatch_issue='8'/);
  assert.match(resumeWorkflow, /FACTORY_ISSUE_NUMBER: \$\{\{ env\.FACTORY_DISPATCH_ISSUE_NUMBER \}\}/);
  assert.match(resumeWorkflow, /FACTORY_PR_NUMBER: \$\{\{ github\.event\.issue\.number \}\}/);
  assert.match(resumeWorkflow, /prior\.status === 'resumed'/);
  assert.match(resumeWorkflow, /phase_b_claimed/);
  assert.doesNotMatch(resumeWorkflow, /claimPhaseBAtomic/);
  assert.match(resumeWorkflow, /FACTORY_STRICT_TERMINAL_BINDING: 'true'/);
  assert.match(resumeWorkflow, /FACTORY_IN_MOTION_RECOVERY/);
  assert.match(resumeWorkflow, /FACTORY_PHASE_B_RECOVERY/);
  assert.match(resumeWorkflow, /parse-cursor-terminal-comment\.js/);
  assert.match(dispatchWorkflow, /phase_a_run_id/);
  assert.match(dispatchWorkflow, /Input manifest digest/);
  assert.doesNotMatch(dispatchWorkflow, /PR_NUMBER: \$\{\{ inputs\.pr_number \}\}\n\s+PR_NUMBER:/);
  assert.match(handoff, /issues\/\$\{issueNumber\}\|pull\/\$\{prNumber\}/);
  assert.match(sealed, /provider: 'repository-sealed-evidence'/);
  assert.match(sealed, /syntheticReplay: true/);
});

test('forward correction executes mocked GitHub event/retry state machine exactly once', () => {
  const context = { repository: 'alchemistj/ff-content-demo-factory', issueNumber: 8, prNumber: 1, branch: 'architect/greenfield-gate1', checkedOutSha: 'head-1', handoffId: 'handoff-1', dispatchKey: 'dispatch-1', dispatchDigest: 'sha256:dispatch', runId: 'run-1', prospectId: 'prospect-1', sourceCheckpointDigest: 'sha256:source', sourceManifestDigest: 'sha256:manifest', inputManifestDigest: 'sha256:input', jobId: 'phase-a-1', resultId: 'sha256:dispatch' };
  const comments = [];
  let previous = null;
  for (const status of ['preparing', 'posted', 'in_motion', 'terminal', 'resumed']) {
    const marker = markerFor({ kind: 'dispatch', ...context, status, commentId: status === 'posted' ? '101' : status === 'preparing' ? '100' : String(100 + status.length), commentUrl: `https://github.com/alchemistj/ff-content-demo-factory/issues/8#issuecomment-${100 + status.length}` });
    if (status === 'posted') assertTransition(previous, marker);
    else if (previous) assertTransition(previous, marker);
    else assertTransition(null, marker);
    comments.push({ id: marker.commentId, html_url: marker.commentUrl, created_at: `2026-01-01T00:00:0${comments.length}Z`, user: { login: 'github-actions[bot]' }, body: markerBody(marker) });
    previous = marker;
  }
  assert.equal(findClaim(comments, { ...context, kind: 'dispatch' }).status, 'resumed');
  assert.equal(findClaim(comments, { ...context, kind: 'dispatch', status: 'posted' }).status, 'posted');
  const executionComments = [
    { id: 1, html_url: 'https://github.com/alchemistj/ff-content-demo-factory/pull/1#issuecomment-1', created_at: '2026-01-01T00:00:00Z', body: '@cursor\nBranch: architect/greenfield-gate1\nReviewed head: head-1\nDispatch key: dispatch-1\nDispatch packet digest: sha256:dispatch\nHandoff ID: handoff-1\nPhase-A run: phase-a-1\nDispatch workflow run: 1' },
    { id: 2, html_url: 'https://github.com/alchemistj/ff-content-demo-factory/pull/1#issuecomment-2', created_at: '2026-01-01T00:01:00Z', body: '@cursor\nBranch: architect/greenfield-gate1\nReviewed head: head-1\nDispatch key: dispatch-1\nDispatch packet digest: sha256:dispatch\nHandoff ID: handoff-1\nPhase-A run: phase-a-1\nDispatch workflow run: 2\nmultiline detail' },
  ];
  assert.equal(selectNewestDispatchComment(executionComments, { repository: context.repository, prNumber: 1, dispatchKey: context.dispatchKey, dispatchDigest: context.dispatchDigest }).id, 2);
  executionComments.push({ id: 3, html_url: 'https://github.com/alchemistj/ff-content-demo-factory/pull/1#issuecomment-3', created_at: '2026-01-01T00:02:00Z', body: '@cursor\nBranch: other\nReviewed head: foreign-head\nDispatch key: dispatch-1\nDispatch packet digest: sha256:dispatch\nHandoff ID: handoff-foreign\nPhase-A run: phase-a-foreign\nDispatch workflow run: 3' });
  assert.equal(selectNewestDispatchComment(executionComments, { repository: context.repository, prNumber: 1, branch: context.branch, reviewedHead: context.checkedOutSha, dispatchKey: context.dispatchKey, dispatchDigest: context.dispatchDigest }).id, 2, 'a current-head selector must skip an unrelated newer dispatch');
  const casFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'factory-phase-b-cas-')), 'phase-b.json');
  assert.doesNotThrow(() => claimPhaseBAtomic(casFile, { handoffId: context.handoffId, resultId: 'terminal-1' }));
  assert.throws(() => claimPhaseBAtomic(casFile, { handoffId: context.handoffId, resultId: 'terminal-1' }), /replay/);
});

test('twelfth correction runs split dispatch and resume event harness against durable artifact/comment/ledger APIs', () => {
  const context = { repository: 'alchemistj/ff-content-demo-factory', issueNumber: 8, prNumber: 1, branch: 'architect/greenfield-gate1', checkedOutSha: 'head-12', handoffId: 'handoff-12', dispatchKey: 'dispatch-12', dispatchDigest: 'sha256:dispatch12', runId: 'run-12', prospectId: 'prospect-12', sourceCheckpointDigest: 'sha256:source12', sourceManifestDigest: 'sha256:manifest12', inputManifestDigest: 'sha256:input12', jobId: 'phase-a-12', resultId: 'terminal-12' };
  const github = { issue8: [], pr1: [], artifacts: new Map([['phase-a-12', { pending: context }]]), nextId: 1, post(target, body) { const id = String(this.nextId++); const comment = { id, html_url: `https://github.com/${context.repository}/${target === 'pr1' ? 'pull/1' : 'issues/8'}#issuecomment-${id}`, created_at: `2026-01-01T00:00:${id.padStart(2, '0')}Z`, user: { login: target === 'pr1' ? 'cursor[bot]' : 'github-actions[bot]' }, body }; this[target].push(comment); return comment; }, comments(target) { return [...this[target]]; } };
  const ledgerPost = (status, extra = {}, previous = null) => {
    const marker = markerFor({ kind: 'resume', ...context, ...extra, status });
    if (previous) assertTransition(previous, marker);
    github.post('issue8', markerBody(marker));
    return marker;
  };
  // Dispatch workflow: artifact handoff is uploaded, PR execution comment is
  // posted once, and the Issue 8 ledger records preparing -> posted.
  assert.equal(github.artifacts.get('phase-a-12').pending.handoffId, context.handoffId);
  github.post('pr1', `@cursor\nPR: #1\nDispatch key: ${context.dispatchKey}\nDispatch packet digest: ${context.dispatchDigest}\nHandoff ID: ${context.handoffId}\nPhase-A run: phase-a-12\nDispatch workflow run: dispatch-workflow-12`);
  const preparing = markerFor({ kind: 'dispatch', ...context, status: 'preparing' }); github.post('issue8', markerBody(preparing));
  const posted = markerFor({ kind: 'dispatch', ...context, status: 'posted', commentId: '1', commentUrl: github.pr1[0].html_url }); assertTransition(preparing, posted); github.post('issue8', markerBody(posted));
  assert.equal(selectNewestDispatchComment(github.comments('pr1'), { repository: context.repository, prNumber: 1, dispatchKey: context.dispatchKey, dispatchDigest: context.dispatchDigest }).id, '1');
  // Resume workflow: a cursor terminal event is ingested, then the durable
  // Issue ledger advances through terminal -> phase_b_claimed -> resumed.
  const terminal = ledgerPost('in_motion', { kind: 'resume', commentId: '12', commentUrl: 'https://github.com/alchemistj/ff-content-demo-factory/pull/1#issuecomment-12' }, posted);
  const terminalState = ledgerPost('terminal', { kind: 'resume', commentId: '12', commentUrl: terminal.commentUrl }, terminal);
  const phaseBClaim = ledgerPost('phase_b_claimed', { kind: 'resume', commentId: '12', commentUrl: terminal.commentUrl }, terminalState);
  let phaseBExecutions = 0;
  if (!findClaim(github.comments('issue8'), { ...context, kind: 'resume', status: 'resumed' })) { phaseBExecutions += 1; ledgerPost('resumed', { kind: 'resume', commentId: '12', commentUrl: terminal.commentUrl }, phaseBClaim); }
  // A retry after runner loss sees the durable resumed marker and does not
  // execute phase B again; no local CAS file participates in this path.
  if (!findClaim(github.comments('issue8'), { ...context, kind: 'resume', status: 'resumed' })) phaseBExecutions += 1;
  assert.equal(phaseBExecutions, 1);
  assert.equal(findClaim(github.comments('issue8'), { ...context, kind: 'resume' }).status, 'resumed');
});

test('thirteenth correction recovers durable crashes by owner and executes real selector/terminal scripts', () => {
  const pending = samplePending();
  const context = { repository: 'alchemistj/ff-content-demo-factory', issueNumber: 8, prNumber: 1, branch: pending.dispatchPacket.branch, checkedOutSha: pending.envelope.checkedOutSha, handoffId: pending.handoffId, dispatchKey: pending.envelope.dispatchKey, dispatchDigest: pending.envelope.dispatchDigest, runId: pending.envelope.runId, prospectId: pending.envelope.prospectId, sourceCheckpointDigest: pending.envelope.sourceCheckpointDigest, sourceManifestDigest: pending.envelope.sourceManifestDigest, inputManifestDigest: pending.envelope.inputManifestDigest, jobId: pending.phaseARunId };
  const owner = 'terminal-comment-77';
  const comments = ['preparing', 'posted', 'in_motion', 'terminal', 'phase_b_claimed'].map((status, index) => {
    const marker = markerFor({ kind: 'resume', ...context, ownerToken: owner, resultId: '77', status, commentId: String(index + 1), commentUrl: `https://github.com/${context.repository}/issues/8#issuecomment-${index + 1}` });
    return { id: marker.commentId, html_url: marker.commentUrl, created_at: `2026-01-01T00:00:0${index}Z`, user: { login: 'github-actions[bot]' }, body: markerBody(marker) };
  });
  assert.equal(recoverClaim(comments, { ...context, kind: 'resume' }, owner).action, 'resumed');
  assert.equal(recoverClaim(comments, { ...context, kind: 'resume' }, 'foreign-owner').action, 'noop');
  assert.throws(() => assertTransition(JSON.parse(comments[2].body.slice('FACTORY_CURSOR_LEDGER_V1\n'.length)), markerFor({ ...context, kind: 'resume', ownerToken: 'foreign-owner', resultId: '77', status: 'terminal' })), /owner.?[Tt]oken/);
  const dispatchBody = `@cursor\nBranch: ${context.branch}\nReviewed head: ${context.checkedOutSha}\nDispatch key: ${context.dispatchKey}\nDispatch packet digest: ${context.dispatchDigest}\nHandoff ID: ${context.handoffId}\nPhase-A run: ${context.jobId}\nInput manifest digest: ${context.inputManifestDigest}\nDispatch workflow run: dispatch-77`;
  const dispatchComments = [{ id: 77, html_url: `https://github.com/${context.repository}/pull/1#issuecomment-77`, created_at: '2026-01-01T00:00:00Z', body: dispatchBody }, { id: 78, html_url: `https://github.com/${context.repository}/pull/1#issuecomment-78`, created_at: '2026-01-01T00:01:00Z', body: dispatchBody.replace(`Handoff ID: ${context.handoffId}`, 'Handoff ID: foreign').replace(`Input manifest digest: ${context.inputManifestDigest}`, 'Input manifest digest: foreign') }];
  assert.equal(selectNewestDispatchComment(dispatchComments, { repository: context.repository, prNumber: 1, branch: context.branch, reviewedHead: context.checkedOutSha, handoffId: context.handoffId, dispatchKey: context.dispatchKey, dispatchDigest: context.dispatchDigest, phaseARunId: context.jobId, inputManifestDigest: context.inputManifestDigest }).id, 77);

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'factory-real-event-harness-'));
  const pendingFile = path.join(temp, 'pending.json'); const commentFile = path.join(temp, 'terminal.md'); const outputFile = path.join(temp, 'result.json');
  fs.writeFileSync(pendingFile, JSON.stringify(pending, null, 2));
  const receipt = { operation: 'website-audit', stage: 'website-audit', status: 'completed', terminalStatus: 'succeeded', agentId: 'agent-77', runId: 'cursor-run-77', threadUrl: 'https://cursor.com/agents/agent-77', inputDigest: 'sha256:11111111', outputDigest: 'sha256:22222222', startedAt: '2026-01-01T00:00:00Z', completedAt: '2026-01-01T00:00:01Z', envelope: { ...pending.envelope, handoffId: pending.handoffId, operation: 'website-audit', stage: 'website-audit' } };
  const raw = { handoffId: pending.handoffId, dispatchKey: pending.envelope.dispatchKey, dispatchDigest: pending.envelope.dispatchDigest, phaseARunId: pending.phaseARunId, receipt, bundle: { schemaVersion: 'cursor-cloud-agent-bundle-v1', model: pending.dispatchPacket.model, dispatch: { ...pending.dispatchPacket, commentUrl: 'https://github.com/alchemistj/ff-content-demo-factory/pull/1#issuecomment-77' }, inputManifestDigest: pending.envelope.inputManifestDigest, envelope: { ...pending.envelope, handoffId: pending.handoffId } } };
  const fence = String.fromCharCode(96).repeat(3);
  fs.writeFileSync(commentFile, `noise before\n${fence}json\n${JSON.stringify(raw)}\n${fence}\nnoise after\n`);
  const collected = collect({ pendingFile, commentFile, outputFile, authorLogin: 'cursor[bot]', commentId: '77', commentUrl: 'https://github.com/alchemistj/ff-content-demo-factory/pull/1#issuecomment-77' });
  assert.equal(collected.phaseARunId, pending.phaseARunId);
  assert.equal(JSON.parse(fs.readFileSync(outputFile, 'utf8')).handoffId, pending.handoffId);
});
