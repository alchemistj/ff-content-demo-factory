const {
  FINAL_STAGE,
  STAGES,
  loadState,
  writeState,
  acquireLock,
  enqueue,
  claimNext,
  transition,
  moldStatus,
} = require('./control-plane');

const REVIEW_LIMIT = 50;
const DISCOVERY_LIMIT = 7;

function configValue(config, key, fallback) {
  return Number.isFinite(config?.[key]) ? config[key] : fallback;
}

function nextAction(code, message, extra = {}) {
  return { code, owner: 'architect', message, ...extra };
}

function currentRun(state) {
  return state.runs.find((run) => ['active', 'interrupted', FINAL_STAGE].includes(run.status)) || null;
}

function candidateBench(discovered, audits) {
  return discovered.map((candidate, index) => {
    const audit = audits[index] || audits[candidate.placeId] || null;
    const disposition = moldStatus({ candidate, audit });
    return {
      ...candidate,
      audit,
      discoveryIndex: index,
      status: disposition === 'clear' ? 'discovered' : disposition,
      discoverySampleOnly: true,
    };
  });
}

function selectionFromDecision(decision, bench) {
  const qualified = new Set(decision?.qualifiedPlaceIds || []);
  const selectedId = decision?.selectedPlaceId;
  if (!selectedId || !qualified.has(selectedId)) {
    const error = new Error('Architect must explicitly qualify candidates and select exactly one finalist');
    error.code = 'ARCHITECT_SELECTION_REQUIRED';
    throw error;
  }
  const selected = bench.find((candidate) => candidate.placeId === selectedId);
  if (!selected || selected.status === 'excluded' || selected.status === 'quarantined') {
    const error = new Error('Selected finalist is not eligible to advance');
    error.code = 'FINALIST_NOT_ELIGIBLE';
    throw error;
  }
  return {
    selected,
    bench: bench.map((candidate) => {
      if (candidate.placeId === selectedId) return { ...candidate, status: 'finalist', architectQualified: true };
      if (qualified.has(candidate.placeId) && candidate.status === 'discovered') return { ...candidate, status: 'qualified-backlog', architectQualified: true };
      if (candidate.status === 'discovered') return { ...candidate, status: 'uncertain', architectQualified: false };
      return candidate;
    }),
  };
}

function selectionDecision(decision) {
  return decision?.selection || (
    decision && (decision.selectedPlaceId || decision.qualifiedPlaceIds)
      ? { selectedPlaceId: decision.selectedPlaceId, qualifiedPlaceIds: decision.qualifiedPlaceIds }
      : null
  );
}

function normalizeReviews(packet) {
  const reviews = Array.isArray(packet?.reviews) ? packet.reviews : [];
  const written = reviews.filter((review) => String(review.text || '').trim());
  const emptyTextReviews = reviews.filter((review) => !String(review.text || '').trim());
  return {
    ...packet,
    reviews: written,
    emptyTextReviews,
    discoverySampleOnly: false,
    requestedLimit: Math.min(REVIEW_LIMIT, packet?.requestedLimit || REVIEW_LIMIT),
    dateWindow: null,
    listingReviewCount: packet?.listingReviewCount ?? reviews.length,
    retrievalCompleteness: packet?.retrievalCompleteness || null,
  };
}

function assertAdapters(adapters) {
  const required = ['discovery', 'websiteAudit', 'enrichment', 'reviewJudge', 'prescriber', 'gate1'];
  for (const name of required) {
    if (!adapters?.[name]) throw new Error(`Missing orchestrator adapter: ${name}`);
  }
  for (const [name, adapter] of Object.entries(adapters)) {
    if (required.includes(name) && typeof adapter.run !== 'function' && typeof adapter.audit !== 'function' && typeof adapter.discover !== 'function' && typeof adapter.enrichExactPlace !== 'function' && typeof adapter.judge !== 'function' && typeof adapter.prescribe !== 'function' && typeof adapter.render !== 'function') {
      throw new Error(`Invalid orchestrator adapter: ${name}`);
    }
  }
}

async function discoverBench(state, adapters, config, now) {
  const limit = configValue(config, 'maxDiscoveryCandidates', DISCOVERY_LIMIT);
  const discovered = (await adapters.discovery.discover({ limit })).slice(0, limit);
  const audits = [];
  for (const candidate of discovered) audits.push(await adapters.websiteAudit.audit(candidate));
  state.candidateBench = candidateBench(discovered, audits);
  state.pendingSelection = {
    status: 'awaiting-architect-selection',
    createdAt: new Date(now).toISOString(),
    candidateCount: state.candidateBench.length,
  };
}

function queueSelectedAndBacklog(state, selection, now) {
  const selected = selection.selected;
  const selectedEntry = enqueue(state, { ...selected, status: undefined }, now);
  for (const candidate of selection.bench.filter((entry) => entry.status === 'qualified-backlog')) {
    enqueue(state, candidate, now);
  }
  state.candidateBench = selection.bench;
  state.pendingSelection = null;
  return selectedEntry;
}

async function classifyAll(run, state, adapters, now, persist) {
  const inventory = run.artifacts.reviewInventory;
  const classifications = run.artifacts.reviewClassifications || {};
  for (let index = 0; index < inventory.reviews.length; index += 1) {
    const review = inventory.reviews[index];
    const reviewId = String(review.id || `review-${index + 1}`);
    if (classifications[reviewId]) continue;
    classifications[reviewId] = await adapters.reviewJudge.judge({ review, finalist: run.candidate });
    run.artifacts.reviewClassifications = classifications;
    await persist(state, now);
  }
  run.artifacts.reviewClassifications = classifications;
  run.artifacts.authoritativeJudgmentCount = Object.keys(classifications).length;
  run.completedStages.push('review-intelligence');
  transition(state, run.runId, 'page-prescription', { owner: run.owner, now });
  await persist(state, now);
}

/**
 * Advance one production-shaped cycle through Gate 1.
 *
 * Adapter contract:
 * - discovery.discover({limit}) -> candidate[]
 * - websiteAudit.audit(candidate) -> audit evidence
 * - enrichment.enrichExactPlace({finalist, limit: 50, dateWindow: null, exactPlace: true}) -> review packet
 * - reviewJudge.judge({review, finalist}) -> authoritative judgment
 * - prescriber.prescribe({finalist, inventory, decision}) -> prescription artifact
 * - gate1.render({finalist, prescription, inventory}) -> human-readable artifact
 *
 * Architect decisions are deliberately separate: `selection`, `prescription`,
 * and `qaPass` are never inferred from adapter/Cursor output.
 */
async function runFactoryCycle({ root, config, adapters, architectDecision = {}, owner = 'architect', now = new Date() }) {
  assertAdapters(adapters);
  const release = acquireLock(root, owner, now);
  let state;
  const persist = async (state, timestamp) => writeState(root, state, timestamp);
  try {
    state = loadState(root, config, now);
    let run = currentRun(state);
    if (run?.status === FINAL_STAGE) {
      return { ok: true, state, run, nextAction: nextAction('awaiting-human-gate-1', 'Josh must review the Gate 1 prescription; production is stopped.') };
    }

    if (state.pendingSelection) {
      if (!selectionDecision(architectDecision)) {
        writeState(root, state, now);
        return { ok: true, state, candidateBench: state.candidateBench, nextAction: nextAction('architect-candidate-review-required', 'Architect must qualify the bench and select exactly one finalist.', { candidateBench: state.candidateBench }) };
      }
      const selection = selectionFromDecision(selectionDecision(architectDecision), state.candidateBench || []);
      queueSelectedAndBacklog(state, selection, now);
      run = claimNext(state, owner, now);
      writeState(root, state, now);
    }

    if (!run) {
      run = claimNext(state, owner, now);
      if (run) writeState(root, state, now);
    }

    if (!run) {
      if (!state.candidateBench && !state.pendingSelection) {
        await discoverBench(state, adapters, config, now);
        writeState(root, state, now);
      }
      if (!selectionDecision(architectDecision)) {
        return { ok: true, state, candidateBench: state.candidateBench, nextAction: nextAction('architect-candidate-review-required', 'Architect must qualify the bench and select exactly one finalist.', { candidateBench: state.candidateBench }) };
      }
      const selection = selectionFromDecision(selectionDecision(architectDecision), state.candidateBench || []);
      queueSelectedAndBacklog(state, selection, now);
      run = claimNext(state, owner, now);
      writeState(root, state, now);
    }

    if (run.stage === STAGES[0]) {
      transition(state, run.runId, 'finalist-enrichment', { owner, now });
      await persist(state, now);
    }
    if (!run.paidWork.finalistEnrichment) {
      const packet = await adapters.enrichment.enrichExactPlace({ finalist: run.candidate, limit: REVIEW_LIMIT, dateWindow: null, exactPlace: true });
      run.artifacts.reviewInventory = normalizeReviews(packet);
      run.paidWork.finalistEnrichment = { completedAt: new Date(now).toISOString(), reviewsRetrieved: run.artifacts.reviewInventory.reviews.length };
      transition(state, run.runId, 'review-intelligence', { owner, now, artifact: run.artifacts.reviewInventory, paid: true });
      await persist(state, now);
    }
    if (!run.artifacts.reviewClassifications || Object.keys(run.artifacts.reviewClassifications).length < run.artifacts.reviewInventory.reviews.length) {
      await classifyAll(run, state, adapters, now, persist);
    }
    if (!run.artifacts.prescription) {
      if (!architectDecision.prescription) {
        writeState(root, state, now);
        return { ok: true, state, run, nextAction: nextAction('architect-prescription-decision-required', 'Architect must explicitly authorize the prescriber decision before prescription work starts.') };
      }
      run.artifacts.prescription = await adapters.prescriber.prescribe({ finalist: run.candidate, inventory: { ...run.artifacts.reviewInventory, classifications: run.artifacts.reviewClassifications }, decision: architectDecision.prescription });
      transition(state, run.runId, 'architect-qa', { owner, now, artifact: run.artifacts.prescription });
      await persist(state, now);
    }
    if (architectDecision.qaPass !== true) {
      writeState(root, state, now);
      return { ok: true, state, run, nextAction: nextAction('architect-qa-required', 'Architect must independently pass or correct the prescription before Gate 1.') };
    }
    run.artifacts.gate1 = await adapters.gate1.render({ finalist: run.candidate, inventory: run.artifacts.reviewInventory, classifications: run.artifacts.reviewClassifications, prescription: run.artifacts.prescription });
    transition(state, run.runId, FINAL_STAGE, { owner, now, artifact: run.artifacts.gate1 });
    writeState(root, state, now);
    return { ok: true, state, run, nextAction: nextAction(FINAL_STAGE, 'Gate 1 is ready for Josh; no later stage may start.') };
  } catch (error) {
    state = state || loadState(root, config, now);
    const interrupted = currentRun(state);
    if (interrupted && interrupted.status !== FINAL_STAGE) {
      interrupted.status = 'interrupted';
      interrupted.interruption = { message: error.message, at: new Date(now).toISOString() };
      writeState(root, state, now);
    }
    throw error;
  } finally {
    release();
  }
}

module.exports = { DISCOVERY_LIMIT, REVIEW_LIMIT, candidateBench, normalizeReviews, selectionFromDecision, runFactoryCycle };
