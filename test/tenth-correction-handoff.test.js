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
const { runCurrentHeadGate1Canary } = require('../src/run-gate1-canary');
const { PLACE_ID, verifySealed360Lineage } = require('../src/factory/sealed-evidence');

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
    inputManifest: { expectedHeadSha: 'head-1', manifestDigest: 'sha256:manifest' },
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
    envelope: { checkedOutSha: pending.envelope.checkedOutSha, inputManifestDigest: pending.envelope.inputManifestDigest },
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

test('tenth correction sealed 360 replay is synthetic-only and cannot reach Human Gate 1', async () => {
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
  assert.equal(result.proof.sealedEvidence, true);
  assert.equal(result.proof.synthetic, true);
  assert.equal(result.proof.approvableGate1, false);
  assert.equal(result.proof.candidate, undefined);
  assert.equal(result.proof.integratedFactoryReadiness, false);
  assert.equal(result.state, null);
  const proofFile = path.join(root, 'canary/outputs/current-head-gate1-proof.json');
  assert.equal(fs.existsSync(proofFile), true);
  assert.equal(fs.existsSync(path.join(root, 'canary/outputs/gate1.md')), false);
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
  assert.doesNotMatch(canary, /CURSOR_API_KEY/);
  assert.match(resume, /gh run download/);
  assert.match(resume, /FACTORY_HANDOFF_FILE/);
  assert.match(dispatch, /FACTORY_SKIP_AUTOMATIC_DISPATCH/);
  assert.match(runner, /retrievePhaseAHandoff/);
  assert.match(runner, /FACTORY_HANDOFF_CAS_FILE/);
  assert.match(runner, /createSealed360Adapters/);
});
