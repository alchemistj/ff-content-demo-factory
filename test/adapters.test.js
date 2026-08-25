'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createApifyAdapter, ACTOR_ID, normalizePlace, normalizeReview } = require('../src/adapters/apify');
const {
  ACTUAL_MODEL_ID,
  FACTORY_MODEL_ALIAS,
  createCursorAdapter,
  createMemoryReceiptStore,
  modelSelectionFromCatalog,
  parseJsonResult,
} = require('../src/adapters/cursor');

function response(value, status = 200) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(value) };
}

test('Apify discovery sends bounded cheap Compass crawler input and preserves candidate provenance', async () => {
  const token = 'apify-secret-test';
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options: { ...options, body: options.body && JSON.parse(options.body) } });
    if (options.method === 'POST') return response({ data: { id: 'run-discovery', defaultDatasetId: 'dataset-discovery', status: 'SUCCEEDED' } });
    return response([{ placeId: 'ChIJcandidate', title: 'Example Electric', url: 'https://www.google.com/maps/place/Example', reviewsCount: 12, reviews: [{ reviewId: 'r1', name: 'A', stars: 5, text: 'Installed a panel.' }, { reviewId: 'r2', name: 'B', stars: 4, text: '' }], images: [{ imageUrl: 'https://example.test/service.jpg' }], website: 'https://example.test' }]);
  };
  const result = await createApifyAdapter({ token, fetchImpl }).discoverCandidates({ searchStrings: ['electrician'], location: 'Springfield, MO', limit: 7, reviewLimit: 5 });
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, new RegExp(`/acts/${ACTOR_ID}/runs$`));
  assert.equal(calls[0].options.body.maxCrawledPlacesPerSearch, 7);
  assert.equal(calls[0].options.body.maxReviews, 5);
  assert.equal(calls[0].options.body.reviewsOrigin, 'google');
  assert.equal('reviewsStartDate' in calls[0].options.body, false);
  assert.equal(result.candidates[0].placeId, 'ChIJcandidate');
  assert.equal(result.candidates[0].writtenReviews.length, 1);
  assert.equal(result.candidates[0].emptyTextReviews.length, 1);
  assert.equal(result.candidates[0].provenance.actor, ACTOR_ID);
  assert.doesNotMatch(JSON.stringify(result), new RegExp(token));
});

test('Apify finalist enrichment is exact-place, up to 50, no date window, and never pays twice', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options: { ...options, body: options.body && JSON.parse(options.body) } });
    if (options.method === 'POST') return response({ data: { id: 'run-finalist', defaultDatasetId: 'dataset-finalist', status: 'SUCCEEDED' } });
    return response([{ placeId: 'ChIJfinalist', url: 'https://www.google.com/maps/place/Finalist', reviewsCount: 60, reviews: [{ reviewId: 'written', text: 'Completed work', name: 'Reviewer', stars: 5 }, { reviewId: 'empty', text: '', name: 'Empty', stars: 5 }] }]);
  };
  const adapter = createApifyAdapter({ token: 'secret', fetchImpl });
  const first = await adapter.enrichFinalist({ placeId: 'ChIJfinalist', mapsUrl: 'https://www.google.com/maps/place/Finalist' });
  const second = await adapter.enrichFinalist({ placeId: 'ChIJfinalist', mapsUrl: 'https://www.google.com/maps/place/Finalist' });
  assert.equal(calls.length, 2, 'cached finalist receipt must avoid a second paid actor run');
  const input = calls[0].options.body;
  assert.deepEqual(input.placeIds, ['ChIJfinalist']);
  assert.deepEqual(input.startUrls, [{ url: 'https://www.google.com/maps/place/Finalist' }]);
  assert.equal(input.maxReviews, 50);
  assert.equal('reviewsStartDate' in input, false);
  assert.equal(first.reviews.length, 1);
  assert.equal(first.emptyTextReviews.length, 1);
  assert.deepEqual(second, first);
  assert.equal(first.provenance.exactPlaceId, 'ChIJfinalist');
  assert.equal(first.provenance.exactMapsUrl, 'https://www.google.com/maps/place/Finalist');
});

test('Apify rejects a wrong-place finalist response and counts only valid written/empty reviews for sufficiency', async () => {
  const responseFor = (value) => ({ ok: true, status: 200, text: async () => JSON.stringify(value) });
  const wrongFetch = async (url, options) => {
    if (options.method === 'POST') return responseFor({ data: { id: 'run-exact', defaultDatasetId: 'dataset-exact', status: 'SUCCEEDED' } });
    return responseFor([{ placeId: 'ChIJ-other', url: 'https://www.google.com/maps/place/Other', reviews: [] }]);
  };
  const wrongAdapter = createApifyAdapter({ token: 'secret', fetchImpl: wrongFetch });
  await assert.rejects(() => wrongAdapter.enrichFinalist({ placeId: 'ChIJexact', mapsUrl: 'https://www.google.com/maps/place/Exact' }), /identity mismatch/);
  const validFetch = async (url, options) => {
    if (options.method === 'POST') return responseFor({ data: { id: 'run-valid', defaultDatasetId: 'dataset-valid', status: 'SUCCEEDED' } });
    const written = Array.from({ length: 47 }, (_, index) => ({ name: `Written ${index}`, publishedAtDate: '2026-01-01', text: `Completed electrical work ${index}`, stars: 5 }));
    const empty = Array.from({ length: 3 }, (_, index) => ({ name: `Empty ${index}`, publishedAtDate: '2026-01-01', text: '', stars: 5 }));
    return responseFor([{ placeId: 'ChIJexact', url: 'https://www.google.com/maps/place/Exact', reviews: [...written, ...empty, { name: 'Weak', text: 'unbound' }], reviewsCount: 110 }]);
  };
  const adapter = createApifyAdapter({ token: 'secret', fetchImpl: validFetch });
  const result = await adapter.enrichFinalist({ placeId: 'ChIJexact', mapsUrl: 'https://www.google.com/maps/place/Exact' });
  assert.equal(result.reviews.length, 47);
  assert.equal(result.emptyTextReviews.length, 3);
  assert.equal(result.quarantinedReviews.length, 1);
  assert.equal(result.retrievalCompleteness, 'complete');
});

test('Apify review fallback IDs are order-independent hashes and weak records are quarantined', () => {
  const payload = { name: 'Reviewer', publishedAtDate: '2026-01-01', text: 'Completed electrical work', reviewUrl: 'https://google.test/review/1' };
  const first = normalizeReview(payload, 0, 'apify-finalist', 'ChIJstable');
  const reordered = normalizeReview(payload, 99, 'apify-finalist', 'ChIJstable');
  assert.equal(first.id, reordered.id);
  assert.match(first.id, /^google:[a-f0-9]{24}$/);
  const weak = normalizeReview({ name: 'Reviewer', text: 'Short' }, 0, 'apify-finalist', 'ChIJstable');
  assert.equal(weak.id, null);
  assert.equal(weak.quarantined, true);
  const empty = normalizeReview({ name: 'Reviewer', publishedAtDate: '2026-01-01', text: '' }, 0, 'apify-finalist', 'ChIJstable');
  assert.match(empty.id, /^google:[a-f0-9]{24}$/);
  assert.equal(empty.quarantined, undefined);
  const missingPlace = normalizePlace({ title: 'No identity', reviews: [] }, 0, 'apify-discovery', {});
  assert.equal(missingPlace.quarantined, true);
  assert.equal(missingPlace.quarantineReason, 'missing-stable-place-identity');
  assert.doesNotMatch(JSON.stringify(missingPlace), /unknown-place/);
});

test('Apify persists in-flight paid receipts and resumes the run without a duplicate POST', async () => {
  const calls = [];
  const receiptStore = new Map();
  let interruptDataset = true;
  const fetchImpl = async (url, options) => {
    calls.push({ url, method: options.method });
    if (options.method === 'POST') return response({ data: { id: 'run-interrupted', defaultDatasetId: 'dataset-interrupted', status: 'RUNNING' } });
    if (url.includes('/actor-runs/')) return response({ data: { id: 'run-interrupted', defaultDatasetId: 'dataset-interrupted', status: 'SUCCEEDED' } });
    if (interruptDataset) { interruptDataset = false; throw new Error('simulated interruption'); }
    return response([{ placeId: 'ChIJresume', url: 'https://www.google.com/maps/place/Resume', reviews: [{ reviewId: 'r1', name: 'A', text: 'Completed', stars: 5 }] }]);
  };
  const firstAdapter = createApifyAdapter({ token: 'secret', fetchImpl, receiptStore });
  await assert.rejects(() => firstAdapter.enrichFinalist({ placeId: 'ChIJresume', mapsUrl: 'https://www.google.com/maps/place/Resume' }), /simulated interruption/);
  assert.equal(receiptStore.get('apify:run:finalist:ChIJresume').status, 'running');
  const secondAdapter = createApifyAdapter({ token: 'secret', fetchImpl, receiptStore });
  const result = await secondAdapter.enrichFinalist({ placeId: 'ChIJresume', mapsUrl: 'https://www.google.com/maps/place/Resume' });
  assert.equal(result.reviews.length, 1);
  assert.equal(calls.filter((call) => call.method === 'POST').length, 1);
  assert.equal(receiptStore.get('apify:run:finalist:ChIJresume').status, 'completed');
});

test('Apify polling is bounded and retains a resumable receipt', async () => {
  const calls = [];
  const receiptStore = new Map();
  const fetchImpl = async (url, options) => {
    calls.push({ url, method: options.method });
    if (options.method === 'POST') return response({ data: { id: 'run-slow', defaultDatasetId: 'dataset-slow', status: 'RUNNING' } });
    return response({ data: { id: 'run-slow', defaultDatasetId: 'dataset-slow', status: 'RUNNING' } });
  };
  const adapter = createApifyAdapter({ token: 'secret', fetchImpl, receiptStore, maxPollAttempts: 2 });
  await assert.rejects(() => adapter.enrichFinalist({ placeId: 'ChIJslow', mapsUrl: 'https://www.google.com/maps/place/Slow' }), /did not reach a terminal status/);
  assert.equal(calls.filter((call) => call.method === 'POST').length, 1);
  assert.equal(calls.filter((call) => call.url.includes('/actor-runs/')).length, 2);
  assert.equal(receiptStore.get('apify:run:finalist:ChIJslow').status, 'running');
});

test('Apify terminal failure is durable and cannot silently start a second paid run', async () => {
  const calls = [];
  const receiptStore = new Map();
  const fetchImpl = async (url, options) => {
    calls.push({ url, method: options.method });
    return response({ data: { id: 'run-failed', defaultDatasetId: 'dataset-failed', status: 'FAILED' } });
  };
  const adapter = createApifyAdapter({ token: 'secret', fetchImpl, receiptStore });
  const request = { placeId: 'ChIJfailed', mapsUrl: 'https://www.google.com/maps/place/Failed' };
  await assert.rejects(() => adapter.enrichFinalist(request), /Apify run FAILED/);
  assert.equal(receiptStore.get('apify:run:finalist:ChIJfailed').status, 'failed');
  await assert.rejects(() => adapter.enrichFinalist(request), /explicit Architect retry decision/);
  assert.equal(calls.filter((call) => call.method === 'POST').length, 1);
  assert.equal(calls.some((call) => call.url.includes('/datasets/')), false);
});

test('Apify ambiguous acceptance is reconciled without a second POST, otherwise fails closed', async () => {
  const calls = []; const receiptStore = new Map();
  const fetchImpl = async (url, options) => { calls.push({ url, method: options.method }); if (options.method === 'POST') return response({ data: { status: 'RUNNING' } }); return response({ data: { status: 'SUCCEEDED', id: 'unused' } }); };
  const request = { placeId: 'ChIJambiguous', mapsUrl: 'https://www.google.com/maps/place/Ambiguous' };
  const first = createApifyAdapter({ token: 'secret', fetchImpl, receiptStore });
  await assert.rejects(() => first.enrichFinalist(request), /ambiguous.*Architect review/);
  const second = createApifyAdapter({ token: 'secret', fetchImpl, receiptStore });
  await assert.rejects(() => second.enrichFinalist(request), /ambiguous.*Architect review/);
  assert.equal(calls.filter((call) => call.method === 'POST').length, 1);
  const reconciledStore = new Map([['apify:run:finalist:ChIJreconciled', { schemaVersion: 'factory-paid-operation-v1', operationKey: 'apify:run:finalist:ChIJreconciled', provider: 'apify', operation: 'finalist-enrichment', status: 'post-attempted', input: { placeIds: ['ChIJreconciled'] }, idempotencyKey: 'idempotency-reconciled', requestDigest: 'request-reconciled' }]]); let reconciledCalls = 0;
  const reconciledFetch = async (url, options) => { reconciledCalls += 1; if (options.method === 'GET' && url.includes('/actor-runs/')) return response({ data: { id: 'run-reconciled', defaultDatasetId: 'dataset-reconciled', status: 'SUCCEEDED' } }); return response([{ placeId: 'ChIJreconciled', url: 'https://www.google.com/maps/place/Reconciled', reviews: [] }]); };
  const reconciled = createApifyAdapter({ token: 'secret', fetchImpl: reconciledFetch, receiptStore: reconciledStore, reconcileAcceptance: async () => ({ runId: 'run-reconciled', datasetId: 'dataset-reconciled' }) });
  const recovered = await reconciled.enrichFinalist({ placeId: 'ChIJreconciled', mapsUrl: 'https://www.google.com/maps/place/Reconciled' });
  assert.equal(recovered.provenance.exactPlaceId, 'ChIJreconciled');
  assert.equal(reconciledCalls, 2, 'reconciliation performs only provider GETs and never a second POST');
});

function catalog() {
  return [{
    id: ACTUAL_MODEL_ID,
    displayName: 'Grok 4.6',
    aliases: [FACTORY_MODEL_ALIAS],
    parameters: [
      { id: 'fast', values: [{ value: 'false' }, { value: 'true' }] },
      { id: 'effort', values: [{ value: 'low' }, { value: 'medium' }, { value: 'high' }] },
    ],
  }];
}

test('Cursor resolves the real Grok 4.6 High catalog proof, runs read-only JSON jobs, and persists resumable receipts', async () => {
  const token = 'cursor-secret-test';
  const createCalls = [];
  const sendCalls = [];
  const sdk = {
    Cursor: { models: { list: async ({ apiKey }) => { assert.equal(apiKey, token); return catalog(); } } },
    Agent: { create: async (options) => {
      createCalls.push(options);
      return {
        agentId: 'agent-1',
        send: async (prompt) => {
          sendCalls.push(prompt);
          return { runId: 'run-1', wait: async () => ({ text: '```json\n{"kind":"website-audit","website":"https://business.test","evidence":[],"images":[]}\n```' }) };
        },
        dispose: async () => {},
      };
    } },
  };
  const receiptStore = createMemoryReceiptStore();
  const adapter = createCursorAdapter({ apiKey: token, sdk, receiptStore, workspace: '/tmp/research-only' });
  const first = await adapter.runResearch({ kind: 'website-audit', jobId: 'audit-1', input: { website: 'https://business.test' } });
  const second = await adapter.runResearch({ kind: 'website-audit', jobId: 'audit-1', input: { website: 'https://business.test' } });
  const record = await adapter.runResearchRecord({ kind: 'website-audit', jobId: 'audit-1', input: { website: 'https://business.test' } });
  assert.deepEqual(second, first);
  assert.deepEqual(record.result, first);
  assert.equal(record.receipt.status, 'completed');
  assert.equal(createCalls.length, 1, 'resume must not start a second Cursor run');
  assert.deepEqual(createCalls[0].cloud, { repos: [] });
  assert.deepEqual(createCalls[0].model, { id: ACTUAL_MODEL_ID, params: [{ id: 'fast', value: 'false' }, { id: 'effort', value: 'high' }] });
  assert.equal(createCalls[0].apiKey, token);
  assert.match(sendCalls[0], /read-only research worker/);
  assert.match(sendCalls[0], /Do not scrape Google/);
  assert.match(sendCalls[0], /Do not write, edit, create, delete/);
  assert.match(sendCalls[0], /marketing graphics\/flyers/);
  const receipts = JSON.stringify(receiptStore.values());
  assert.doesNotMatch(receipts, new RegExp(token));
  assert.match(receipts, /cursor-sdk/);
  assert.match(receipts, /grok-4\.6/);
  assert.match(receipts, /fast/);
});

test('Cursor runs all allowed JSON research kinds and fails closed on malformed output/catalog proof', async () => {
  const sdk = {
    Cursor: { models: { list: async () => catalog() } },
    Agent: { create: async () => ({ agentId: 'agent-test', send: async (prompt) => ({ runId: 'run-test', wait: async () => ({ output: prompt.includes('review-judgment') ? '{"kind":"review-judgment","reviewId":"r1","decision":"supporting","authoritative":true}' : '{"kind":"page-prescription","pages":[],"comparison":{},"sourceCheckpoint":{"sourceIdentity":{"provider":"test","runId":"r","artifactId":"a","sourceSha":"s","rootIdentity":"root"},"sourceArtifactDigest":"sha256:aaaaaaaa"}}' }) }), dispose: async () => {} }) },
  };
  const adapter = createCursorAdapter({ apiKey: 'secret', sdk });
  await adapter.runResearch({ kind: 'review-judgment', jobId: 'review-1', input: { reviewId: 'r1' } });
  await adapter.runResearch({ kind: 'page-prescription', jobId: 'page-1', input: { candidateCount: 3 } });
  assert.throws(() => parseJsonResult('commentary {"kind":"website-audit"}'), /invalid JSON/i);
  assert.throws(() => modelSelectionFromCatalog([{ id: 'grok-4.6', aliases: [FACTORY_MODEL_ALIAS], parameters: [] }]), /catalog proof/i);
  assert.throws(() => modelSelectionFromCatalog([{ id: 'grok-4.6', aliases: ['wrong-alias'], parameters: [{ id: 'fast', values: [{ value: 'true' }] }, { id: 'effort', values: [{ value: 'high' }] }] }]), /catalog proof/i);
});

test('Cursor accepts documented catalog envelopes and params definitions without requiring local alias advertisement', () => {
  const envelope = {
    models: [{
      id: ACTUAL_MODEL_ID,
      displayName: 'Grok 4.6',
      params: [
        { id: 'fast', values: [{ value: 'false' }, { value: 'true' }] },
        { id: 'effort', values: [{ value: 'high' }] },
      ],
    }],
  };
  const selection = modelSelectionFromCatalog(envelope);
  assert.deepEqual(selection.params, [{ id: 'fast', value: 'false' }, { id: 'effort', value: 'high' }]);
  assert.equal(selection.id, ACTUAL_MODEL_ID);
  assert.throws(() => modelSelectionFromCatalog({ models: [
    { id: ACTUAL_MODEL_ID, params: [{ id: 'fast', values: [{ value: 'false' }] }, { id: 'effort', values: [{ value: 'high' }] }] },
    { id: FACTORY_MODEL_ALIAS, params: [] },
  ] }), /contradictory/i);
});

test('Cursor resumes an in-flight agent/run receipt without create or send', async () => {
  const receiptStore = createMemoryReceiptStore();
  await receiptStore.put('cursor:resume-1', {
    provider: 'cursor-sdk', jobId: 'resume-1', kind: 'website-audit', status: 'running',
    agentId: 'agent-resume', runId: 'run-resume', resolvedModel: ACTUAL_MODEL_ID,
  });
  let creates = 0;
  let sends = 0;
  let disposed = 0;
  const sdk = {
    Cursor: { models: { list: async () => { throw new Error('catalog must not be needed for reattachment'); } } },
    Agent: {
      create: async () => { creates += 1; throw new Error('must not create on resume'); },
      resume: async (agentId) => ({ agentId, [Symbol.asyncDispose]: async () => { disposed += 1; } }),
      getRun: async (runId, options) => {
        assert.equal(runId, 'run-resume');
        assert.deepEqual(options, { runtime: 'cloud', agentId: 'agent-resume' });
        return { wait: async () => ({ status: 'finished', text: '{"kind":"website-audit","website":"https://business.test","evidence":[],"images":[]}' }) };
      },
    },
  };
  const adapter = createCursorAdapter({ apiKey: 'secret', sdk, receiptStore });
  const result = await adapter.runResearch({ kind: 'website-audit', jobId: 'resume-1', input: { website: 'https://business.test' } });
  assert.equal(result.kind, 'website-audit');
  assert.equal(creates, 0);
  assert.equal(sends, 0);
  assert.equal(disposed, 1);
  assert.equal((await receiptStore.get('cursor:resume-1')).status, 'completed');
});

test('Cursor reattaches an agent with no run id and sends exactly once', async () => {
  const receiptStore = createMemoryReceiptStore();
  await receiptStore.put('cursor:send-once', { provider: 'cursor-sdk', jobId: 'send-once', kind: 'website-audit', status: 'running', agentId: 'agent-send', requestedAlias: FACTORY_MODEL_ALIAS, resolvedModel: ACTUAL_MODEL_ID });
  let creates = 0;
  let sends = 0;
  let resumeOptions;
  const sdk = {
    Cursor: { models: { list: async () => { throw new Error('catalog must not be needed for agent reattachment'); } } },
    Agent: {
      create: async () => { creates += 1; throw new Error('must not create after agent receipt'); },
      resume: async (agentId, options) => { assert.equal(agentId, 'agent-send'); resumeOptions = options; return { agentId, [Symbol.asyncDispose]: async () => {} , send: async () => { sends += 1; return { id: 'run-send', requestId: 'request-send', wait: async () => ({ status: 'finished', text: '{"kind":"website-audit","website":"https://business.test","evidence":[],"images":[]}' }) }; } }; },
      getRun: async () => { throw new Error('must send when runId is absent'); },
    },
  };
  const adapter = createCursorAdapter({ apiKey: 'secret', sdk, receiptStore });
  await adapter.runResearch({ kind: 'website-audit', jobId: 'send-once', input: { website: 'https://business.test' } });
  assert.deepEqual(resumeOptions, { apiKey: 'secret' });
  assert.equal(creates, 0);
  assert.equal(sends, 1);
  const receipt = await receiptStore.get('cursor:send-once');
  assert.equal(receipt.runId, 'run-send');
  assert.equal(receipt.requestId, 'request-send');
});
