const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const childProcess = require('node:child_process');
const cp = require('../src/factory/control-plane');

function sandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-factory-'));
  fs.mkdirSync(path.join(root, 'config'), { recursive: true });
  fs.writeFileSync(path.join(root, 'config', 'factory.config.json'), '{}');
  return root;
}
function candidate(name) { return { placeId: name.toLowerCase(), name, website: `https://${name.toLowerCase()}.example` }; }
const config = () => ({ productionCapacity: 1 });

test('capacity one and queue-first claim leave overflow queued', () => {
  const root = sandbox();
  const state = cp.emptyState(config(), new Date('2026-08-23T12:00:00Z'));
  cp.enqueue(state, candidate('First'), new Date('2026-08-23T12:00:00Z'));
  cp.enqueue(state, candidate('Second'), new Date('2026-08-23T12:00:00Z'));
  cp.writeState(root, state, new Date('2026-08-23T12:00:00Z'));
  const first = cp.runOne({ root, config: config(), now: new Date('2026-08-23T12:01:00Z') });
  assert.equal(first.code, 'CLAIMED');
  assert.equal(first.state.productionCapacity, 1);
  assert.equal(first.state.queue.length, 1);
  const second = cp.runOne({ root, config: config(), candidate: candidate('Third'), now: new Date('2026-08-23T12:02:00Z') });
  assert.equal(second.code, 'CAPACITY_FULL');
  assert.equal(second.state.queue.length, 2);
});

test('Architect wake does not need Actions and repeats at Gate 1 without claiming another run', () => {
  const root = sandbox();
  const first = cp.runOne({ root, config: config(), candidate: candidate('Gate Prospect'), now: new Date('2026-08-23T12:00:00Z') });
  const state = first.state;
  const run = state.runs[0];
  cp.transition(state, run.runId, cp.FINAL_STAGE, { owner: 'architect', now: new Date('2026-08-23T12:01:00Z'), artifact: { markdown: '# Gate 1' } });
  cp.writeState(root, state, new Date('2026-08-23T12:01:00Z'));
  const repeat = cp.runOne({ root, config: config(), candidate: candidate('Another Prospect'), now: new Date('2026-08-23T12:02:00Z') });
  assert.equal(repeat.code, 'AWAITING_HUMAN_GATE_1');
  assert.equal(repeat.state.runs.length, 1);
  assert.equal(repeat.state.queue.length, 1);
  assert.equal(fs.existsSync(path.join(root, '.github', 'workflows')), false);
});

test('interruption preserves stage and paid receipt for resume', () => {
  const root = sandbox();
  const first = cp.runOne({ root, config: config(), candidate: candidate('Recoverable'), now: new Date('2026-08-23T12:00:00Z') });
  const state = first.state;
  const run = state.runs[0];
  cp.transition(state, run.runId, 'finalist-enrichment', { owner: 'architect', now: new Date('2026-08-23T12:01:00Z'), paid: true, artifact: { reviewsRetrieved: 44 } });
  cp.markInterrupted(state, run.runId, { owner: 'architect', reason: 'process stopped', now: new Date('2026-08-23T12:02:00Z') });
  cp.writeState(root, state, new Date('2026-08-23T12:02:00Z'));
  const resumed = cp.runOne({ root, config: config(), now: new Date('2026-08-23T12:03:00Z') });
  assert.equal(resumed.code, 'CAPACITY_FULL');
  assert.equal(resumed.run.stage, 'finalist-enrichment');
  assert.equal(resumed.run.paidWork['finalist-enrichment'].receipt.reviewsRetrieved, 44);
  assert.equal(cp.transition(resumed.state, resumed.run.runId, 'finalist-enrichment', { owner: 'architect', now: new Date('2026-08-23T12:04:00Z') }).idempotent, true);
});

test('only current environment and Cursor policy are checked in', () => {
  const example = fs.readFileSync(path.join(__dirname, '..', '.env.example'), 'utf8');
  assert.equal(example.match(/^\w+=.*$/gm).length, 3);
  assert.match(example, /^CURSOR_MODEL=cursor-grok-4\.6-high$/m);
  const checkedIn = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'factory.config.json'), 'utf8'));
  assert.equal(checkedIn.productionCapacity, 1);
  assert.equal(checkedIn.cursorModel, 'cursor-grok-4.6-high');
  assert.equal(checkedIn.cursorFastMode, false);
});

test('mold offerings are blocked before paid work', () => {
  const root = sandbox();
  const result = cp.runOne({ root, config: config(), candidate: { ...candidate('Mold Co'), services: ['mold remediation'] } });
  assert.equal(result.code, 'MOLD_EXCLUDED');
  assert.equal(result.state.queue[0].status, 'excluded');
});

test('stale process lock is reclaimed conservatively, while a live owner stays locked', () => {
  const root = sandbox();
  const lock = cp.paths(root).lock;
  fs.mkdirSync(path.dirname(lock), { recursive: true });
  fs.writeFileSync(lock, JSON.stringify({ owner: 'dead-worker', pid: 99999999, acquiredAt: '2026-08-23T12:00:00.000Z' }));
  assert.equal(cp.runOne({ root, config: config() }).code, 'IDLE');
  fs.writeFileSync(lock, JSON.stringify({ owner: 'live-worker', pid: process.pid, acquiredAt: new Date().toISOString() }));
  assert.throws(() => cp.runOne({ root, config: config() }), /owns the lock/);
  fs.unlinkSync(lock);
});

test('clean checkout has no Actions workflow and its committed run-one entrypoint executes', () => {
  const root = path.join(__dirname, '..');
  assert.equal(fs.existsSync(path.join(root, '.github', 'workflows')), false);
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(packageJson.scripts['run-one'], 'node src/run-one.js');
  const result = childProcess.spawnSync(process.execPath, [path.join(root, 'src', 'run-one.js'), '--json'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /"code":\s*"IDLE"/);
  fs.rmSync(path.join(root, 'state'), { recursive: true, force: true });
});
