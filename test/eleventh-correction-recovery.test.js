'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createDispatchPacket } = require('../src/factory/cloud-agent');
const { createPendingHandoff } = require('../src/factory/handoff');
const { markerFor, markerBody, findTerminalOutcome } = require('../src/factory/github-ledger');
const { digest } = require('../src/factory/prescription-policy');
const { decide } = require('../scripts/cursor-handoff-recovery');
const { apply: applyRecoveryDecision } = require('../scripts/apply-cursor-recovery-decision');
const { createArtifact, createPaidMarker } = require('../scripts/paid-operation-ledger');
const { selectNewestDispatchComment } = require('../scripts/select-cursor-dispatch-comment');
const { restore } = require('../scripts/restore-paid-receipts');
const { createCursorAdapter } = require('../src/adapters/cursor');
const { createApifyAdapter } = require('../src/adapters/apify');
const { apifyFinalistRequestProjection } = require('../src/adapters/apify');

function pendingFor(head = 'head-1', suffix = '1') {
  const dispatchPacket = createDispatchPacket({ issueNumber: 8, prNumber: 1, branch: 'architect/greenfield-gate1', reviewedHeadSha: head, scope: 'research-only' });
  return createPendingHandoff({
    dispatchPacket,
    inputManifest: { expectedHeadSha: head, manifestDigest: 'sha256:input', sourceManifestDigest: 'sha256:source-manifest' },
    runId: `factory-run-${suffix}`, prospectId: 'prospect-1', sourceCheckpointDigest: 'sha256:checkpoint', phaseARunId: `phase-a-${suffix}`,
  });
}

function resultFor(pending, output = { ok: true }) {
  return { pending, receipt: { inputDigest: 'sha256:input-result', outputDigest: digest(output) } };
}

function comment(marker, id, createdAt = '2026-01-01T00:00:00Z') {
  return { id, created_at: createdAt, user: { login: 'github-actions[bot]' }, html_url: `https://github.com/alchemistj/ff-content-demo-factory/issues/8#issuecomment-${id}`, body: markerBody(marker) };
}

test('duplicate terminal comments dedupe by immutable outcome and never restart resumed phase B', () => {
  const pending = pendingFor();
  const result = resultFor(pending);
  const outcome = { repository: pending.dispatchPacket.repository, issueNumber: 8, prNumber: 1, branch: pending.dispatchPacket.branch, checkedOutSha: pending.envelope.checkedOutSha, handoffId: pending.handoffId, dispatchKey: pending.envelope.dispatchKey, dispatchDigest: pending.envelope.dispatchDigest, runId: pending.envelope.runId, prospectId: pending.envelope.prospectId, sourceCheckpointDigest: pending.envelope.sourceCheckpointDigest, sourceManifestDigest: pending.envelope.sourceManifestDigest, inputManifestDigest: pending.envelope.inputManifestDigest, jobId: pending.phaseARunId, inputDigest: result.receipt.inputDigest, outputDigest: result.receipt.outputDigest };
  const terminal = markerFor({ kind: 'resume', ...outcome, ownerToken: digest(outcome), resultId: 'first-comment', inputDigest: outcome.inputDigest, outputDigest: outcome.outputDigest, commentId: 'first-comment', commentUrl: 'https://github.com/alchemistj/ff-content-demo-factory/issues/8#issuecomment-10', status: 'terminal' });
  const duplicate = markerFor({ kind: 'resume', ...outcome, ownerToken: digest(outcome), resultId: 'second-comment', inputDigest: outcome.inputDigest, outputDigest: outcome.outputDigest, commentId: 'second-comment', commentUrl: 'https://github.com/alchemistj/ff-content-demo-factory/issues/8#issuecomment-11', status: 'terminal' });
  const comments = [comment(terminal, 10), comment(duplicate, 11, '2026-01-01T00:00:01Z')];
  assert.equal(findTerminalOutcome(comments, outcome).status, 'terminal');
  assert.equal(decide({ pending, result, comments }).action, 'resume-phase-b');
  const phaseB = markerFor({ ...outcome, kind: 'resume', ownerToken: digest(outcome), resultId: 'third-comment', inputDigest: outcome.inputDigest, outputDigest: outcome.outputDigest, commentId: 'third-comment', commentUrl: 'https://github.com/alchemistj/ff-content-demo-factory/issues/8#issuecomment-12', status: 'phase_b_claimed' });
  assert.equal(decide({ pending, result, comments: [...comments, comment(phaseB, 12, '2026-01-01T00:00:02Z')] }).action, 'recover-phase-b');
  const resumed = markerFor({ ...outcome, kind: 'resume', ownerToken: digest(outcome), resultId: 'fourth-comment', inputDigest: outcome.inputDigest, outputDigest: outcome.outputDigest, commentId: 'fourth-comment', commentUrl: 'https://github.com/alchemistj/ff-content-demo-factory/issues/8#issuecomment-13', status: 'resumed' });
  assert.equal(decide({ pending, result, comments: [...comments, comment(resumed, 13, '2026-01-01T00:00:03Z')] }).action, 'noop');
});

test('conflicting terminal output for one immutable handoff is quarantined and cannot start phase B', () => {
  const pending = pendingFor();
  const first = resultFor(pending, { ok: 'first' });
  const second = resultFor(pending, { ok: 'different' });
  const base = { repository: pending.dispatchPacket.repository, issueNumber: 8, prNumber: 1, branch: pending.dispatchPacket.branch, checkedOutSha: pending.envelope.checkedOutSha, handoffId: pending.handoffId, dispatchKey: pending.envelope.dispatchKey, dispatchDigest: pending.envelope.dispatchDigest, runId: pending.envelope.runId, prospectId: pending.envelope.prospectId, sourceCheckpointDigest: pending.envelope.sourceCheckpointDigest, sourceManifestDigest: pending.envelope.sourceManifestDigest, inputManifestDigest: pending.envelope.inputManifestDigest, jobId: pending.phaseARunId, inputDigest: first.receipt.inputDigest };
  const marker = (result, id) => markerFor({ kind: 'resume', ...base, ownerToken: 'immutable-owner', resultId: id, outputDigest: result.receipt.outputDigest, commentId: id, commentUrl: `https://github.com/alchemistj/ff-content-demo-factory/issues/8#issuecomment-${id}`, status: 'terminal' });
  const comments = [comment(marker(first, 'first'), 31), comment(marker(second, 'second'), 32, '2026-01-01T00:00:01Z')];
  assert.equal(decide({ pending, result: second, comments }).action, 'quarantine-conflict');
});

test('dispatch selector rejects an old same-head handoff and selects the exact new handoff/source/job context', () => {
  const oldPending = pendingFor('same-head', 'old');
  const newPending = pendingFor('same-head', 'new');
  const oldPacket = { ...oldPending.dispatchPacket, dispatchKey: 'old-key', dispatchDigest: 'sha256:old' };
  const newPacket = newPending.dispatchPacket;
  const body = (packet, p) => `${packet.commentBody}\nDispatch packet digest: ${packet.dispatchDigest}\nHandoff ID: ${p.handoffId}\nPhase-A run: ${p.phaseARunId}\nInput manifest digest: ${p.envelope.inputManifestDigest}\nSource checkpoint digest: ${p.envelope.sourceCheckpointDigest}\nSource manifest digest: ${p.envelope.sourceManifestDigest}\nJob digest: ${packet.dispatchDigest}\nDispatch workflow run: 77`;
  const comments = [
    { id: 1, created_at: '2026-01-01T00:00:00Z', html_url: 'https://github.com/alchemistj/ff-content-demo-factory/pull/1#issuecomment-1', body: body(oldPacket, oldPending) },
    { id: 2, created_at: '2026-01-01T00:00:01Z', html_url: 'https://github.com/alchemistj/ff-content-demo-factory/pull/1#issuecomment-2', body: body(newPacket, newPending) },
  ];
  const selected = selectNewestDispatchComment(comments, { repository: 'alchemistj/ff-content-demo-factory', prNumber: 1, reviewedHead: 'same-head', handoffId: newPending.handoffId, phaseARunId: newPending.phaseARunId, inputManifestDigest: newPending.envelope.inputManifestDigest, sourceCheckpointDigest: newPending.envelope.sourceCheckpointDigest, sourceManifestDigest: newPending.envelope.sourceManifestDigest, dispatchKey: newPacket.dispatchKey, dispatchDigest: newPacket.dispatchDigest, jobDigest: newPacket.dispatchDigest });
  assert.equal(selected.id, 2);
});

test('Cursor paid operation persists intent before create and resumes after a crash without a second paid send', async () => {
  const map = new Map(); let createCount = 0; let resumeCount = 0; let waitCount = 0;
  const catalog = [{ id: 'grok-4.6', parameters: [{ id: 'fast', values: [{ value: 'false' }] }, { id: 'effort', values: [{ value: 'high' }] }] }];
  const valid = { kind: 'review-judgment', reviewId: 'review-1', decision: 'supporting', authoritative: true };
  const run = (throws) => ({ id: 'run-1', wait: async () => { waitCount += 1; if (throws && waitCount === 1) throw new Error('runner lost after paid response'); return { status: 'finished', text: JSON.stringify(valid) }; } });
  const sdk = { Cursor: { models: { list: async () => catalog } }, Agent: {
    create: async () => { createCount += 1; assert.equal(map.get('intent:cursor:job-1').status, 'intent'); return { agentId: 'agent-1', send: async () => run(true), dispose: async () => {} }; },
    resume: async () => { resumeCount += 1; return { dispose: async () => {} }; },
    getRun: async () => run(false),
  } };
  const adapter = createCursorAdapter({ apiKey: 'test-key', sdk, receiptStore: { get: (k) => map.get(k), put: (k, v) => map.set(k, v) }, clock: () => '2026-01-01T00:00:00Z' });
  await assert.rejects(() => adapter.runResearch({ kind: 'review-judgment', jobId: 'job-1', input: { reviewId: 'review-1' } }), /runner lost/);
  assert.equal(map.get('cursor:job-1').status, 'running');
  const result = await adapter.runResearch({ kind: 'review-judgment', jobId: 'job-1', input: { reviewId: 'review-1' } });
  assert.equal(result.reviewId, 'review-1');
  assert.equal(createCount, 1);
  assert.equal(resumeCount, 1);
  assert.equal(map.get('cursor:job-1').status, 'completed');
  assert.equal(map.get('cursor:job-1').outputDigest, digest(result));
});

test('phase-B recovery restores the durable vendor receipt snapshot', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'factory-receipt-restore-'));
  const snapshot = path.join(root, 'snapshot', 'vendor-receipts.json');
  const target = path.join(root, 'state', 'vendor-receipts.json');
  fs.mkdirSync(path.dirname(snapshot), { recursive: true });
  fs.writeFileSync(snapshot, JSON.stringify({ schemaVersion: 1, receipts: { 'apify:run:one': { operationKey: 'apify:run:one', status: 'completed', runId: 'run-1', datasetId: 'dataset-1', outputDigest: 'sha256:result' } } }));
  restore({ snapshotFile: snapshot, targetFile: target });
  assert.equal(JSON.parse(fs.readFileSync(target)).receipts['apify:run:one'].datasetId, 'dataset-1');
  assert.throws(() => restore({ snapshotFile: `${snapshot}.missing`, targetFile: path.join(root, 'state', 'bad.json') }), /snapshot is missing/);
});

test('phase-B exact artifact selector rejects newest/wrong artifacts', () => {
  const { selectExactArtifact } = require('../scripts/restore-paid-receipts');
  const expected = { name: 'factory-paid-receipts-exact', id: '42', digest: 'sha256:zip', contentDigest: 'sha256:content' };
  assert.equal(selectExactArtifact([{ id: 42, name: expected.name, digest: expected.digest, expired: false }], expected).id, 42);
  assert.throws(() => selectExactArtifact([{ id: 41, name: expected.name, digest: expected.digest, expired: false }], expected), /missing or ambiguous/);
  assert.throws(() => selectExactArtifact([{ id: 42, name: 'factory-paid-receipts-other', digest: expected.digest, expired: false }], expected), /missing or ambiguous/);
});

test('recovery guard is executable from the actual workflow script and workflow invokes it', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'factory-recovery-script-'));
  const pending = pendingFor(); const result = resultFor(pending);
  const files = { pending: path.join(root, 'pending.json'), result: path.join(root, 'result.json'), comments: path.join(root, 'comments.json') };
  fs.writeFileSync(files.pending, JSON.stringify(pending)); fs.writeFileSync(files.result, JSON.stringify(result)); fs.writeFileSync(files.comments, '[]');
  const output = require('node:child_process').spawnSync(process.execPath, ['scripts/cursor-handoff-recovery.js', files.pending, files.result, files.comments], { encoding: 'utf8' });
  assert.equal(output.status, 0); assert.equal(JSON.parse(output.stdout).action, 'record-terminal');
  const workflow = fs.readFileSync('.github/workflows/cursor-cloud-agent-resume.yml', 'utf8');
  assert.match(workflow, /node scripts\/cursor-handoff-recovery\.js/);
  assert.match(workflow, /node scripts\/apply-cursor-recovery-decision\.js/);
  assert.match(workflow, /vendor-receipts\.json/);
});

test('recovery decision conflict is persisted as quarantine and never advances phase B', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'factory-recovery-conflict-'));
  const pending = pendingFor(); const result = resultFor(pending);
  const directory = path.join(root, 'phase-a');
  assert.throws(() => applyRecoveryDecision({ pending, result, comments: [], decision: { action: 'quarantine-conflict', status: 'conflict', ownerToken: 'owner', conflict: { outputDigest: 'other' } }, directory }), /quarantined/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(directory, 'recovery-state.json'))).action, 'quarantine-conflict');
  assert.equal(fs.existsSync(path.join(directory, 'conflict-quarantined.json')), true);
  assert.equal(fs.existsSync(path.join(directory, 'cursor-phase-b-claim.md')), false);
});

test('canonical recovery application marks every no-op decision as applied', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'factory-recovery-applied-'));
  const pending = pendingFor(); const result = resultFor(pending); const directory = path.join(root, 'phase-a');
  const state = applyRecoveryDecision({ pending, result, comments: [], decision: { action: 'noop', status: 'resumed', ownerToken: 'owner', outcomeKey: 'outcome' }, directory });
  assert.equal(state.applied, true);
  assert.equal(state.canonical, true);
  assert.equal(JSON.parse(fs.readFileSync(path.join(directory, 'recovery-state.json'))).applied, true);
});

test('paid operation ledger advances phase-B owner claim through prepared and accepted artifacts', () => {
  const pending = pendingFor(); const result = resultFor(pending); const artifact = createArtifact({ pending, result, stage: 'pre-post' });
  const phaseB = markerFor({ repository: pending.dispatchPacket.repository, issueNumber: 8, prNumber: 1, branch: pending.dispatchPacket.branch, checkedOutSha: pending.envelope.checkedOutSha, handoffId: pending.handoffId, dispatchKey: pending.envelope.dispatchKey, dispatchDigest: pending.envelope.dispatchDigest, runId: pending.envelope.runId, prospectId: pending.envelope.prospectId, sourceCheckpointDigest: pending.envelope.sourceCheckpointDigest, sourceManifestDigest: pending.envelope.sourceManifestDigest, inputManifestDigest: pending.envelope.inputManifestDigest, jobId: pending.phaseARunId, kind: 'resume', ownerToken: 'owner', resultId: 'owner', inputDigest: result.receipt.inputDigest, outputDigest: result.receipt.outputDigest, operationState: 'not-started', status: 'phase_b_claimed' });
  const prepared = createPaidMarker({ pending, result, previous: phaseB, artifact, status: 'paid_prepared' });
  const acceptedArtifact = { ...createArtifact({ pending, result, stage: 'accepted', response: { runId: 'run-1', datasetId: 'dataset-1', outputDigest: result.receipt.outputDigest } }), artifactId: 'github-artifact-1', artifactDigest: 'sha256:zip-1' };
  const accepted = createPaidMarker({ pending, result, previous: prepared, artifact: acceptedArtifact, status: 'paid_accepted' });
  assert.equal(prepared.status, 'paid_prepared'); assert.equal(accepted.status, 'paid_accepted');
  assert.ok(prepared.artifactName && prepared.artifactId && prepared.artifactDigest && prepared.artifactContentDigest);
  assert.ok(accepted.responseDigest);
});

test('paid artifact outer schema is the adapter projection and canonical digest is stable', () => {
  const pending = { ...pendingFor(), apifyOperationProjection: apifyFinalistRequestProjection({ placeId: 'ChIJschema', mapsUrl: 'https://www.google.com/maps/place/Schema' }) };
  const result = resultFor(pending); const artifact = createArtifact({ pending, result, stage: 'pre-post' }); const again = createArtifact({ pending, result, stage: 'pre-post' });
  for (const field of ['artifactName', 'artifactId', 'artifactDigest', 'artifactContentDigest', 'operationKey', 'requestDigest', 'idempotencyKey', 'requestProjection']) assert.ok(artifact[field] != null, field);
  assert.equal(artifact.operationKey, pending.apifyOperationProjection.operationKey);
  assert.equal(artifact.requestDigest, pending.apifyOperationProjection.requestDigest);
  assert.deepEqual(artifact.requestProjection, pending.apifyOperationProjection);
  assert.equal(artifact.artifactContentDigest, again.artifactContentDigest);
});

test('paid operation crash matrix resumes on a distinct runner filesystem with one POST', async () => {
  const runnerA = fs.mkdtempSync(path.join(os.tmpdir(), 'factory-paid-runner-a-'));
  const runnerB = fs.mkdtempSync(path.join(os.tmpdir(), 'factory-paid-runner-b-'));
  const github = { ledger: new Map(), artifacts: new Map(), comments: [] };
  const localStore = (root) => {
    const local = new Map();
    return { local, async get(key) { return github.ledger.get(key); }, async put(key, value) { local.set(key, value); github.ledger.set(key, value); return value; } };
  };
  let posts = 0; let interrupted = true;
  const fetchImpl = async (url, options) => {
    if (options.method === 'POST') { posts += 1; return { ok: true, status: 200, text: async () => JSON.stringify({ data: { id: 'run-crash', defaultDatasetId: 'dataset-crash', status: 'RUNNING' } }) }; }
    if (url.includes('/actor-runs/')) {
      if (interrupted) { interrupted = false; throw new Error('runner crashed after accepted response'); }
      return { ok: true, status: 200, text: async () => JSON.stringify({ data: { id: 'run-crash', defaultDatasetId: 'dataset-crash', status: 'SUCCEEDED' } }) };
    }
    return { ok: true, status: 200, text: async () => JSON.stringify([{ placeId: 'ChIJcrash', url: 'https://www.google.com/maps/place/Crash', reviews: [] }]) };
  };
  const storeA = localStore(runnerA); const storeB = localStore(runnerB);
  const first = createApifyAdapter({ token: 'secret', fetchImpl, receiptStore: storeA, pollIntervalMs: 0 });
  await assert.rejects(() => first.enrichFinalist({ placeId: 'ChIJcrash', mapsUrl: 'https://www.google.com/maps/place/Crash' }), /runner crashed/);
  assert.equal(posts, 1);
  assert.ok(storeA.local.size > 0 && storeB.local.size === 0, 'runner-local stores must remain distinct');
  assert.ok(fs.existsSync(runnerA) && fs.existsSync(runnerB));
  const second = createApifyAdapter({ token: 'secret', fetchImpl, receiptStore: storeB, pollIntervalMs: 0 });
  await second.enrichFinalist({ placeId: 'ChIJcrash', mapsUrl: 'https://www.google.com/maps/place/Crash' });
  assert.equal(posts, 1, 'fresh runner must resume durable accepted state without a second paid POST');
  assert.ok(github.ledger.size > 0 && github.artifacts instanceof Map && Array.isArray(github.comments));
  const pending = pendingFor(); const result = resultFor(pending); const scriptRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'factory-paid-entrypoint-'));
  fs.writeFileSync(path.join(scriptRoot, 'pending.json'), JSON.stringify(pending)); fs.writeFileSync(path.join(scriptRoot, 'result.json'), JSON.stringify(result)); fs.writeFileSync(path.join(scriptRoot, 'comments.json'), '[]');
  const recovery = spawnSync(process.execPath, ['scripts/cursor-handoff-recovery.js', path.join(scriptRoot, 'pending.json'), path.join(scriptRoot, 'result.json'), path.join(scriptRoot, 'comments.json')], { cwd: process.cwd(), encoding: 'utf8' });
  assert.equal(recovery.status, 0, recovery.stderr);
  const workflow = fs.readFileSync('.github/workflows/cursor-cloud-agent-resume.yml', 'utf8');
  assert.match(workflow, /Upload accepted-response operation artifact before remaining phase-B work/);
  assert.match(workflow, /node src\/run-gate1-canary\.js/);
});
