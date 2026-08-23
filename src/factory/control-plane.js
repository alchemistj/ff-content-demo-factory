const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const FINAL_STAGE = 'awaiting-human-gate-1';
const STAGES = Object.freeze([
  'candidate-qualification',
  'finalist-enrichment',
  'review-intelligence',
  'page-prescription',
  'architect-qa',
  FINAL_STAGE,
]);
const OCCUPYING_STATUSES = new Set(['active', 'interrupted', FINAL_STAGE]);

function iso(now = Date.now()) { return new Date(now).toISOString(); }
function digest(value) { return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 20); }
function paths(root) {
  return {
    state: path.join(root, 'state', 'factory-state.json'),
    lock: path.join(root, 'state', 'run-one.lock'),
  };
}

function emptyState(config, now) {
  return { schemaVersion: 1, productionCapacity: config.productionCapacity, queue: [], runs: [], activeRun: null, updatedAt: iso(now) };
}

function loadState(root, config, now) {
  const filename = paths(root).state;
  if (!fs.existsSync(filename)) return emptyState(config, now);
  const state = JSON.parse(fs.readFileSync(filename, 'utf8'));
  if (state.schemaVersion !== 1) throw Object.assign(new Error('Unsupported factory state schema'), { code: 'STATE_SCHEMA' });
  if (state.productionCapacity !== config.productionCapacity) throw Object.assign(new Error('State/config capacity mismatch'), { code: 'CAPACITY_MISMATCH' });
  // The first prototype used activeRun only. Keep it readable while new runs use queue+runs.
  return { queue: [], runs: [], activeRun: null, ...state };
}

function writeState(root, state, now) {
  const filename = paths(root).state;
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  state.updatedAt = iso(now);
  state.activeRun = state.runs.find((run) => OCCUPYING_STATUSES.has(run.status)) || null;
  const temporary = `${filename}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  fs.renameSync(temporary, filename);
  return state;
}

function acquireLock(root, owner, now) {
  const filename = paths(root).lock;
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  let fd;
  try { fd = fs.openSync(filename, 'wx'); }
  catch {
    // A killed process can leave the small lock file behind. Reclaim only when
    // its recorded PID is demonstrably gone; an unknown/unreadable owner stays
    // locked fail-closed.
    try {
      const metadata = JSON.parse(fs.readFileSync(filename, 'utf8'));
      if (metadata.pid && metadata.pid !== process.pid) {
        try { process.kill(metadata.pid, 0); }
        catch (error) {
          if (error.code === 'ESRCH') {
            fs.unlinkSync(filename);
            return acquireLock(root, owner, now);
          }
        }
      }
    } catch {}
    throw Object.assign(new Error('Another Architect run-one invocation owns the lock'), { code: 'RUN_LOCKED' });
  }
  fs.writeFileSync(fd, `${JSON.stringify({ owner, pid: process.pid, acquiredAt: iso(now) })}\n`);
  return () => { try { fs.closeSync(fd); } finally { try { fs.unlinkSync(filename); } catch {} } };
}

function candidateKey(candidate) {
  const identity = {
    placeId: candidate?.placeId || candidate?.googlePlaceId || null,
    website: candidate?.website || null,
    phone: candidate?.phone || null,
    name: candidate?.name || candidate?.businessName || null,
    location: candidate?.location || candidate?.city || null,
  };
  if (!Object.values(identity).some(Boolean)) throw Object.assign(new Error('Candidate has no stable identity'), { code: 'INVALID_CANDIDATE' });
  return `prospect-${digest(identity)}`;
}

function moldStatus(candidate) {
  // Only business identity/offering evidence participates. Website audit prose
  // and review text can mention mold incidentally without changing disposition.
  const evidence = {
    name: candidate?.name || candidate?.businessName,
    category: candidate?.category,
    description: candidate?.description,
    services: candidate?.services,
    offerings: candidate?.offerings,
    businessServices: candidate?.businessServices,
  };
  const text = JSON.stringify(evidence || {}).toLowerCase();
  if (!/\bmold\b|\bmould\b/.test(text)) return 'clear';
  if (/mold\s*(inspection|testing|assessment|remediation|removal|cleanup|abatement|treatment)|mould\s*(inspection|testing|assessment|remediation|removal|cleanup|abatement|treatment)/.test(text)) return 'excluded';
  return 'quarantined';
}

function enqueue(state, candidate, now) {
  const prospectId = candidateKey(candidate);
  const disposition = moldStatus(candidate);
  const existing = state.queue.find((item) => item.prospectId === prospectId) || state.runs.find((run) => run.prospectId === prospectId);
  if (existing) return { item: existing, inserted: false, disposition: existing.disposition || disposition };
  const item = { prospectId, candidate, disposition, status: disposition === 'clear' ? 'queued' : disposition, queuedAt: iso(now) };
  state.queue.push(item);
  return { item, inserted: true, disposition };
}

function claimNext(state, owner, now) {
  if (state.runs.filter((run) => OCCUPYING_STATUSES.has(run.status)).length >= state.productionCapacity) return null;
  const item = state.queue.find((candidate) => candidate.status === 'queued');
  if (!item) return null;
  const run = {
    runId: `run-${digest({ prospectId: item.prospectId, queuedAt: item.queuedAt })}`,
    prospectId: item.prospectId,
    candidate: item.candidate,
    status: 'active',
    stage: STAGES[0],
    owner,
    lease: { owner, acquiredAt: iso(now) },
    completedStages: [],
    paidWork: {},
    artifacts: {},
    startedAt: iso(now),
    updatedAt: iso(now),
  };
  item.status = 'claimed';
  state.queue = state.queue.filter((entry) => entry !== item);
  state.runs.push(run);
  return run;
}

function transition(state, runId, next, options = {}) {
  const run = state.runs.find((entry) => entry.runId === runId);
  if (!run) throw Object.assign(new Error(`Unknown run ${runId}`), { code: 'RUN_NOT_FOUND' });
  if (!STAGES.includes(next)) throw Object.assign(new Error(`Unknown stage ${next}`), { code: 'UNKNOWN_STAGE' });
  if (run.owner && run.owner !== (options.owner || 'architect') && run.status === 'active') throw Object.assign(new Error('Run is owned by another worker'), { code: 'RUN_OWNED' });
  const currentIndex = STAGES.indexOf(run.stage);
  const nextIndex = STAGES.indexOf(next);
  if (nextIndex < currentIndex) throw Object.assign(new Error('Stage transition would regress'), { code: 'STAGE_REGRESSION' });
  if (nextIndex === currentIndex) return { run, idempotent: true };
  run.stage = next;
  run.status = next === FINAL_STAGE ? FINAL_STAGE : 'active';
  run.owner = options.owner || run.owner || 'architect';
  run.lease = { owner: run.owner, acquiredAt: iso(options.now) };
  if (options.artifact !== undefined) run.artifacts[next] = options.artifact;
  if (!run.completedStages.includes(next)) run.completedStages.push(next);
  if (options.paid) run.paidWork[next] = { completedAt: iso(options.now), receipt: options.artifact || null };
  run.updatedAt = iso(options.now);
  return { run, idempotent: false };
}

function markInterrupted(state, runId, options = {}) {
  const run = state.runs.find((entry) => entry.runId === runId);
  if (!run) throw Object.assign(new Error(`Unknown run ${runId}`), { code: 'RUN_NOT_FOUND' });
  if (run.status === FINAL_STAGE) return run;
  run.status = 'interrupted';
  run.interruption = { reason: options.reason || 'interrupted', at: iso(options.now) };
  run.updatedAt = iso(options.now);
  return run;
}

function runOne({ root, config, candidate = null, owner = 'architect', now = new Date() }) {
  if (config?.productionCapacity !== 1) throw Object.assign(new Error('productionCapacity must be exactly 1 for this MVP'), { code: 'INVALID_CAPACITY' });
  const release = acquireLock(root, owner, now);
  try {
    const state = loadState(root, config, now);
    if (candidate) {
      const queued = enqueue(state, candidate, now);
      if (queued.disposition !== 'clear') {
        writeState(root, state, now);
        return { ok: false, code: queued.disposition === 'excluded' ? 'MOLD_EXCLUDED' : 'MOLD_QUARANTINED', prospectId: queued.item.prospectId, state };
      }
    }
    const occupying = state.runs.find((run) => OCCUPYING_STATUSES.has(run.status));
    if (occupying) {
      occupying.owner = owner;
      occupying.lease = { owner, acquiredAt: iso(now) };
      writeState(root, state, now);
      return { ok: occupying.status === FINAL_STAGE, code: occupying.status === FINAL_STAGE ? 'AWAITING_HUMAN_GATE_1' : 'CAPACITY_FULL', run: occupying, state };
    }
    const run = claimNext(state, owner, now);
    writeState(root, state, now);
    return run ? { ok: true, code: 'CLAIMED', run, state } : { ok: true, code: 'IDLE', state };
  } finally { release(); }
}

module.exports = { FINAL_STAGE, STAGES, paths, emptyState, loadState, writeState, acquireLock, candidateKey, moldStatus, enqueue, claimNext, transition, markInterrupted, runOne };
