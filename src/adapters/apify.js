'use strict';

const crypto = require('node:crypto');
const { persistOperationIntent, persistOperationState, operationArtifactBinding, persistOperationCheckpoint } = require('../factory/receipt-store');

const ACTOR_ID = 'compass~crawler-google-places';
const APIFY_BASE_URL = 'https://api.apify.com/v2';

function required(value, name) {
  if (!value) throw new TypeError(`${name} is required`);
  return value;
}

function safeUrl(pathname) {
  return `${APIFY_BASE_URL}${pathname}`;
}

function stableHash(value) {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 24);
}

function requestDigestForInput(input) {
  const comparable = { ...input };
  delete comparable.factoryOperationId;
  delete comparable.factoryRequestDigest;
  return crypto.createHash('sha256').update(JSON.stringify(comparable)).digest('hex');
}

// This projection is the single contract shared by the Apify adapter, the
// durable paid-operation artifact, and the workflow marker. It is deliberately
// the exact finalist request sent to Compass; a generic phase-B digest is not
// a substitute for this identity.
function apifyFinalistRequestProjection({ placeId, mapsUrl, limit = 50 }) {
  required(placeId, 'placeId');
  required(mapsUrl, 'mapsUrl');
  if (limit < 1 || limit > 50) throw new RangeError('finalist review limit must be between 1 and 50');
  const jobKey = `finalist:${placeId}`;
  const operationKey = `apify:run:${jobKey}`;
  const baseInput = { placeIds: [placeId], startUrls: [{ url: mapsUrl }], maxCrawledPlacesPerSearch: 1, maxReviews: limit, scrapePlaceDetailPage: true, reviewsOrigin: 'google' };
  const requestDigest = requestDigestForInput(baseInput);
  const input = { ...baseInput, factoryOperationId: operationKey, factoryRequestDigest: requestDigest };
  const idempotencyKey = `factory-apify-${stableHash(`${jobKey}:${requestDigest}`)}`;
  return { schemaVersion: 'factory-apify-request-projection-v2', adapterKey: operationKey, provider: 'apify', actorId: ACTOR_ID, operation: 'finalist-enrichment', jobKey, operationId: operationKey, operationKey, input, options: { maxRetries: 0, maxReviews: limit, exactPlace: true, dateWindow: null }, expectedOutput: { placeId: String(placeId), type: 'finalist-review-enrichment', reviewLimit: limit }, inputDigest: requestDigest, requestDigest, idempotencyKey };
}

function apifyDiscoveryRequestProjection({ searchStrings, location, limit = 7, reviewLimit = 5 }) {
  const baseInput = { searchStringsArray: searchStrings, locationQuery: required(location, 'location'), maxCrawledPlacesPerSearch: limit, maxReviews: Math.max(0, Math.min(10, reviewLimit)), maxImages: 5, scrapePlaceDetailPage: true, reviewsOrigin: 'google' };
  const requestDigest = requestDigestForInput(baseInput);
  const jobKey = `discovery:${stableHash(JSON.stringify(baseInput))}`;
  const operationKey = `apify:run:${jobKey}`;
  const input = { ...baseInput, factoryOperationId: operationKey, factoryRequestDigest: requestDigest };
  return { schemaVersion: 'factory-apify-request-projection-v2', adapterKey: operationKey, provider: 'apify', actorId: ACTOR_ID, operation: 'discovery', jobKey, operationId: operationKey, operationKey, input, options: { maxRetries: 0, limit, reviewLimit }, expectedOutput: { type: 'discovery-candidates', candidateLimit: limit }, inputDigest: requestDigest, requestDigest, idempotencyKey: `factory-apify-${stableHash(`${operationKey}:${requestDigest}`)}` };
}

function canonicalMapsUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(String(value));
    if (!/^(?:www\.)?(?:google\.[^/]+|goo\.gl)$/i.test(url.hostname)) return null;
    if (!/\/maps\/(?:place|search|reviews)/i.test(url.pathname) && !url.searchParams.has('cid')) return null;
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function finalistIdentityMatches(item, requested) {
  const payload = readPayload(item);
  const returnedPlaceId = payload.placeId || payload.googlePlaceId || payload.cid || null;
  const returnedUrl = canonicalMapsUrl(payload.url || payload.googleMapsUrl || payload.googleUrl || null);
  const requestedUrl = canonicalMapsUrl(requested.mapsUrl);
  if (returnedPlaceId) return String(returnedPlaceId) === String(requested.placeId) && (!requestedUrl || !returnedUrl || returnedUrl === requestedUrl);
  return Boolean(requestedUrl && returnedUrl && requestedUrl === returnedUrl);
}

function stableReviewId(payload, source, placeIdentity) {
  if (payload.reviewId) return { id: String(payload.reviewId), quarantineReason: null };
  const author = String(payload.name || payload.author || payload.reviewerName || '').trim().toLowerCase();
  const date = String(payload.publishedAtDate || payload.publishedAt || payload.date || '').trim().toLowerCase();
  const text = String(payload.text ?? payload.reviewText ?? payload.review ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
  const sourceUrl = String(payload.reviewUrl || payload.url || '').trim().toLowerCase();
  // Empty-text records may still be retained when author/date or source URL
  // provide a stable identity; otherwise quarantine instead of using order.
  if (!placeIdentity || !author || (!date && !sourceUrl)) {
    return { id: null, quarantineReason: 'insufficient-stable-review-identity' };
  }
  return { id: `google:${stableHash([source, placeIdentity, author, date, text, sourceUrl].join('|'))}`, quarantineReason: null };
}

function readPayload(item) {
  if (item && typeof item.json === 'object') return item.json;
  if (item && typeof item.data === 'object' && !Array.isArray(item.data)) return item.data;
  return item || {};
}

function normalizeReview(review, index, source, placeId) {
  const payload = readPayload(review);
  const text = payload.text ?? payload.reviewText ?? payload.review ?? '';
  const identity = stableReviewId(payload, source, placeId);
  return {
    id: identity.id,
    platform: 'google',
    source,
    author: payload.name || payload.author || payload.reviewerName || 'Unknown reviewer',
    rating: payload.stars ?? payload.rating ?? null,
    date: payload.publishedAtDate || payload.publishedAt || payload.date || null,
    text: String(text || ''),
    reviewUrl: payload.reviewUrl || payload.url || null,
    provenance: { actor: ACTOR_ID, placeId, source },
    ...(identity.quarantineReason ? { quarantined: true, quarantineReason: identity.quarantineReason } : {}),
  };
}

function normalizePlace(item, index, source, requested) {
  const place = readPayload(item);
  const suppliedPlaceId = place.placeId || place.googlePlaceId || place.cid || requested.placeId || null;
  const mapsUrl = place.url || place.googleMapsUrl || place.googleUrl || requested.mapsUrl || null;
  const canonicalUrl = canonicalMapsUrl(mapsUrl);
  const placeIdentity = suppliedPlaceId ? String(suppliedPlaceId) : canonicalUrl;
  if (!placeIdentity) {
    return {
      quarantined: true,
      quarantineReason: 'missing-stable-place-identity',
      raw: place,
      provenance: { actor: ACTOR_ID, source },
    };
  }
  const placeId = suppliedPlaceId ? String(suppliedPlaceId) : null;
  const allReviews = Array.isArray(place.reviews) ? place.reviews : [];
  const reviews = allReviews.map((review, reviewIndex) => normalizeReview(review, reviewIndex, source, placeIdentity));
  const quarantinedReviews = reviews.filter((review) => review.quarantined);
  const usableReviews = reviews.filter((review) => !review.quarantined);
  const address = place.address || place.addresses || null;
  const location = typeof place.location === 'string' ? place.location : address;
  return {
    id: placeId,
    placeId,
    mapsUrl: canonicalUrl || mapsUrl,
    name: place.title || place.name || null,
    category: place.categoryName || place.category || null,
    address,
    location,
    city: place.city || place.addressLocality || null,
    state: place.state || place.addressRegion || null,
    postalCode: place.postalCode || place.zipCode || null,
    phone: place.phone || place.phoneNumber || null,
    website: place.website || place.websiteUrl || null,
    rating: place.totalScore ?? place.rating ?? null,
    listingReviewCount: place.reviewsCount ?? place.reviewCount ?? place.reviewsCountNumber ?? null,
    reviewCount: place.reviewsCount ?? place.reviewCount ?? place.reviewsCountNumber ?? null,
    coordinates: place.location?.lat != null || place.location?.lng != null
      ? { lat: place.location.lat ?? null, lng: place.location.lng ?? null }
      : (place.latitude != null || place.longitude != null ? { lat: place.latitude ?? null, lng: place.longitude ?? null } : null),
    openingHours: place.openingHours || place.hours || null,
    temporarilyClosed: Boolean(place.temporarilyClosed || place.isTemporarilyClosed),
    permanentlyClosed: Boolean(place.permanentlyClosed || place.isPermanentlyClosed),
    reviews: usableReviews,
    writtenReviews: usableReviews.filter((review) => review.text.trim()),
    emptyTextReviews: usableReviews.filter((review) => !review.text.trim()),
    quarantinedReviews,
    images: Array.isArray(place.images) ? place.images : [],
    provenance: {
      actor: ACTOR_ID,
      source,
      exactPlaceId: requested.placeId || null,
      exactMapsUrl: requested.mapsUrl || null,
      canonicalIdentity: placeIdentity,
    },
  };
}

function normalizeError(error) {
  return error instanceof Error ? error.message.replace(/Bearer\s+\S+/gi, 'Bearer [redacted]') : String(error);
}

function createApifyAdapter({ token, fetchImpl = globalThis.fetch, clock = () => new Date().toISOString(), pollIntervalMs = 0, maxPollAttempts = 100, receiptStore = new Map(), reconcileAcceptance = null, operationArtifacts = {}, production = false, operationArtifactWriter = null }) {
  required(token, 'APIFY_API_TOKEN');
  required(fetchImpl, 'fetchImpl');
  const enrichmentReceipts = new Map();

  async function receiptGet(key) {
    if (typeof receiptStore.get === 'function') return receiptStore.get(key);
    return undefined;
  }

  async function receiptPut(key, value) {
    if (typeof receiptStore.put === 'function') return receiptStore.put(key, value);
    if (typeof receiptStore.set === 'function') return receiptStore.set(key, value);
    throw new TypeError('receiptStore must implement get/put or Map get/set');
  }

  async function request(method, pathname, body, headers = {}) {
    const response = await fetchImpl(safeUrl(pathname), {
      method,
      headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json', ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    let parsed;
    try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { text }; }
    if (!response.ok) throw new Error(`Apify request failed (${response.status})`);
    return parsed;
  }

  async function reconcileProviderReadOnly({ operationKey, requestDigest, input }) {
    const listed = await request('GET', `/acts/${ACTOR_ID}/runs?limit=20&desc=true`);
    const candidates = Array.isArray(listed?.data) ? listed.data : Array.isArray(listed?.runs) ? listed.runs : Array.isArray(listed) ? listed : [];
    const matches = [];
    for (const candidate of candidates.slice(0, 20)) {
      const runId = candidate?.id || candidate?.runId;
      if (!runId) continue;
      let candidateInput;
      try { const fetched = await request('GET', `/actor-runs/${encodeURIComponent(runId)}/input`); candidateInput = fetched?.data || fetched; } catch { continue; }
      const candidateOperationId = candidate.operationId || candidate.meta?.operationId || candidateInput?.factoryOperationId;
      const candidateRequestDigest = candidate.requestDigest || candidateInput?.factoryRequestDigest || (candidateInput ? requestDigestForInput(candidateInput) : null);
      if (candidateOperationId === operationKey && candidateRequestDigest === requestDigest && JSON.stringify(candidateInput) === JSON.stringify(input)) matches.push({ ...candidate, runId, datasetId: candidate.defaultDatasetId || candidate.datasetId });
    }
    return matches.length === 1 ? matches[0] : null;
  }

  async function waitForRun(runId, initial) {
    let run = initial;
    for (let attempt = 0; !['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(run.status); attempt += 1) {
      if (attempt >= maxPollAttempts) throw new Error('Apify run did not reach a terminal status');
      if (attempt > 0 && pollIntervalMs > 0) await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      run = await request('GET', `/actor-runs/${encodeURIComponent(runId)}`);
      run = run.data || run;
    }
    if (run.status !== 'SUCCEEDED') {
      const error = new Error(`Apify run ${run.status || 'unknown'}`);
      error.apifyStatus = run.status || 'unknown';
      throw error;
    }
    return run;
  }

  async function runActor(input, { jobKey = `input:${stableHash(JSON.stringify(input))}`, operationProjection = null } = {}) {
    const receiptKey = `apify:run:${jobKey}`;
    const operation = String(jobKey).startsWith('discovery:') ? 'discovery' : 'finalist-enrichment';
    const operationKey = receiptKey;
    const prior = await receiptGet(receiptKey);
    if (prior?.status === 'completed' && Array.isArray(prior.items)) return { items: prior.items, receipt: prior };
    if (prior?.status === 'running') return resumeActor(prior, input, jobKey);
    if (prior?.status === 'failed') throw new Error(`Apify run ${prior.apifyStatus || 'failed'} requires an explicit Architect retry decision`);
    if (prior?.status === 'needs-architect-review' || prior?.status === 'post-attempted' || prior?.status === 'intent' || prior?.status === 'accepted-unuploaded') {
      if (production && prior.status !== 'accepted-unuploaded' && prior.artifactOrigin !== 'github-actions') throw new Error('Production paid operation cannot reconcile a local-only or invented vendor receipt');
      const requestProjection = operation === 'finalist-enrichment'
        ? apifyFinalistRequestProjection({ placeId: input.placeIds?.[0], mapsUrl: input.startUrls?.[0]?.url, limit: input.maxReviews })
        : apifyDiscoveryRequestProjection({ searchStrings: input.searchStringsArray, location: input.locationQuery, limit: input.maxCrawledPlacesPerSearch, reviewLimit: input.maxReviews });
      const reconciled = await (reconcileAcceptance || reconcileProviderReadOnly)({ actorId: ACTOR_ID, operation, jobKey, operationKey, input, idempotencyKey: prior.idempotencyKey, requestDigest: prior.requestDigest, prior });
      const runId = reconciled?.runId || reconciled?.id;
      const datasetId = reconciled?.datasetId || reconciled?.defaultDatasetId;
      if (!runId || !datasetId) {
        if (prior.status !== 'needs-architect-review') await persistOperationState(receiptStore, operationKey, { ...prior, status: 'needs-architect-review', reviewReason: 'ambiguous Apify acceptance cannot be reconciled', reviewedAt: clock() });
        throw new Error('Apify acceptance is ambiguous; Architect review is required before any retry');
      }
      const acceptedResponse = { runId, datasetId, run: reconciled };
      const acceptedArtifact = operationArtifactBinding({ operationKey, provider: 'apify', operation, inputDigest: prior.inputDigest || crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex'), requestDigest: prior.requestDigest || crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex'), idempotencyKey: prior.idempotencyKey || `factory-apify-${stableHash(`${jobKey}:${JSON.stringify(input)}`)}`, requestProjection, context: prior.context || { actor: ACTOR_ID, jobKey }, responseDigest: crypto.createHash('sha256').update(JSON.stringify(acceptedResponse)).digest('hex'), stage: 'accepted' });
      await persistOperationCheckpoint(receiptStore, operationKey, acceptedArtifact);
      await persistOperationState(receiptStore, operationKey, { ...prior, ...acceptedArtifact, runId, datasetId, status: 'accepted-unuploaded', reconciledAt: clock() });
      if (typeof operationArtifactWriter === 'function') await operationArtifactWriter(acceptedArtifact, acceptedResponse);
      await persistOperationState(receiptStore, operationKey, { ...prior, ...acceptedArtifact, runId, datasetId, status: 'running', reconciledAt: clock() });
      return resumeActor({ ...prior, runId, datasetId, status: 'running' }, input, jobKey);
    }
    const requestDigest = requestDigestForInput(input);
    const projection = operationProjection || { schemaVersion: 'factory-apify-request-projection-v2', adapterKey: receiptKey, provider: 'apify', actorId: ACTOR_ID, operation, jobKey, operationId: receiptKey, operationKey: receiptKey, input, options: { maxRetries: 0 }, inputDigest: requestDigest, requestDigest, idempotencyKey: `factory-apify-${stableHash(`${jobKey}:${requestDigest}`)}`, expectedOutput: { type: operation } };
    if (JSON.stringify(projection.input) !== JSON.stringify(input) || projection.requestDigest !== requestDigest || projection.operationKey !== receiptKey || projection.operationId !== receiptKey || projection.actorId !== ACTOR_ID) throw new Error('Apify request projection does not match the exact adapter request');
    const idempotencyKey = projection.idempotencyKey;
    const preparedIdentity = operationArtifacts['pre-post'] || operationArtifacts.prePost || null;
    if (production && (!preparedIdentity || preparedIdentity.artifactOrigin !== 'github-actions' || !preparedIdentity.artifactId || !preparedIdentity.artifactDigest || preparedIdentity.operationKey !== receiptKey || preparedIdentity.requestDigest !== requestDigest || preparedIdentity.idempotencyKey !== idempotencyKey || JSON.stringify(preparedIdentity.requestProjection?.input || null) !== JSON.stringify(input))) {
      throw new Error('Production paid operation requires the verified GitHub pre-POST artifact identity before Apify POST');
    }
    await persistOperationIntent(receiptStore, operationKey, { provider: 'apify', operation, input, context: { actor: ACTOR_ID, jobKey }, metadata: { idempotencyKey, requestDigest }, startedAt: clock() });
    const checkpoint = operationArtifactBinding({ operationKey, provider: 'apify', operation, inputDigest: requestDigest, requestDigest, idempotencyKey, requestProjection: projection, context: { actor: ACTOR_ID, jobKey }, stage: 'pre-post', artifactIdentity: preparedIdentity });
    await persistOperationCheckpoint(receiptStore, operationKey, checkpoint);
    // Seal the outbound attempt before POST.  A runner crash after this point
    // must reconcile provider state, never issue a second paid POST.
    await persistOperationState(receiptStore, operationKey, { schemaVersion: 'factory-paid-operation-v1', operationKey, provider: 'apify', operation, actor: ACTOR_ID, jobKey, input, inputDigest: requestDigest, idempotencyKey, requestDigest, ...checkpoint, status: 'post-attempted', postAttemptedAt: clock() });
    // Apify Actor Run POST is not idempotent. This is the single and only
    // paid POST attempt; durable paid_prepared state and the bounded,
    // read-only reconciliation path below provide recovery without retrying
    // the POST or asserting provider idempotency.
    const started = await request('POST', `/acts/${ACTOR_ID}/runs`, input);
    const run = started.data || started;
    let runId = run.id || run.runId;
    let datasetId = run.defaultDatasetId || run.datasetId;
    if (!runId || !datasetId) {
      const reconciled = await (reconcileAcceptance || reconcileProviderReadOnly)({ actorId: ACTOR_ID, operation, jobKey, operationKey, input, idempotencyKey, requestDigest, started });
      const reconciledRunId = reconciled?.runId || reconciled?.id;
      const reconciledDatasetId = reconciled?.datasetId || reconciled?.defaultDatasetId;
      if (!reconciledRunId || !reconciledDatasetId) {
        await persistOperationState(receiptStore, operationKey, { schemaVersion: 'factory-paid-operation-v1', operationKey, provider: 'apify', operation, actor: ACTOR_ID, jobKey, input, inputDigest: requestDigest, idempotencyKey, requestDigest, status: 'needs-architect-review', reviewReason: 'ambiguous Apify acceptance cannot be reconciled', reviewedAt: clock() });
        throw new Error('Apify acceptance is ambiguous; Architect review is required before any retry');
      }
      runId = reconciledRunId;
      datasetId = reconciledDatasetId;
    }
    const acceptedResponse = { runId, datasetId, run };
    const acceptedArtifact = operationArtifactBinding({ operationKey, provider: 'apify', operation, inputDigest: requestDigest, requestDigest, idempotencyKey, requestProjection: projection, context: { actor: ACTOR_ID, jobKey }, responseDigest: crypto.createHash('sha256').update(JSON.stringify(acceptedResponse)).digest('hex'), stage: 'accepted' });
    await persistOperationCheckpoint(receiptStore, operationKey, acceptedArtifact);
    await persistOperationState(receiptStore, operationKey, {
      schemaVersion: 'factory-paid-operation-v1', operationKey, provider: 'apify', operation, actor: ACTOR_ID, jobKey, runId, datasetId,
      status: 'accepted-unuploaded', startedAt: clock(), input, inputDigest: requestDigest, idempotencyKey, requestDigest, ...checkpoint, ...acceptedArtifact,
    });
    if (typeof operationArtifactWriter === 'function') await operationArtifactWriter(acceptedArtifact, acceptedResponse);
    await persistOperationState(receiptStore, operationKey, {
      schemaVersion: 'factory-paid-operation-v1', operationKey, provider: 'apify', operation, actor: ACTOR_ID, jobKey, runId, datasetId,
      status: 'running', startedAt: clock(), input, inputDigest: requestDigest, idempotencyKey, requestDigest, ...checkpoint, ...acceptedArtifact,
    });
    let terminal;
    try {
      terminal = await waitForRun(runId, run);
    } catch (error) {
      if (error.apifyStatus) await persistOperationState(receiptStore, operationKey, {
        schemaVersion: 'factory-paid-operation-v1', operationKey, provider: 'apify', operation, actor: ACTOR_ID, jobKey, runId, datasetId,
        status: 'failed', apifyStatus: error.apifyStatus, failedAt: clock(), input, inputDigest: crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex'),
      });
      throw error;
    }
    const items = await request('GET', `/datasets/${encodeURIComponent(datasetId)}/items?format=json`);
    const receipt = {
      schemaVersion: 'factory-paid-operation-v1', operationKey, provider: 'apify', operation, actor: ACTOR_ID, jobKey, runId, datasetId,
      status: 'completed', terminalStatus: 'succeeded', apifyStatus: terminal.status, completedAt: clock(),
      itemCount: Array.isArray(items) ? items.length : 0,
      input, inputDigest: crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex'), items: Array.isArray(items) ? items : [], result: Array.isArray(items) ? items : [],
    };
    await persistOperationState(receiptStore, operationKey, { ...receipt, outputDigest: crypto.createHash('sha256').update(JSON.stringify(receipt.result)).digest('hex') });
    return { items: Array.isArray(items) ? items : [], receipt };
  }

  async function resumeActor(receipt, input, jobKey) {
    let terminal;
    try {
      terminal = await waitForRun(receipt.runId, { id: receipt.runId, defaultDatasetId: receipt.datasetId, status: receipt.status });
    } catch (error) {
      if (error.apifyStatus) await persistOperationState(receiptStore, `apify:run:${jobKey}`, {
        ...receipt, operationKey: `apify:run:${jobKey}`, jobKey, input, status: 'failed', apifyStatus: error.apifyStatus, failedAt: clock(),
      });
      throw error;
    }
    const items = await request('GET', `/datasets/${encodeURIComponent(receipt.datasetId)}/items?format=json`);
    const completed = {
      ...receipt, operationKey: `apify:run:${jobKey}`, jobKey, input, status: 'completed', terminalStatus: 'succeeded', apifyStatus: terminal.status, completedAt: clock(),
      itemCount: Array.isArray(items) ? items.length : 0, items: Array.isArray(items) ? items : [], result: Array.isArray(items) ? items : [],
      inputDigest: receipt.inputDigest || crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex'),
      outputDigest: crypto.createHash('sha256').update(JSON.stringify(Array.isArray(items) ? items : [])).digest('hex'),
    };
    await persistOperationState(receiptStore, `apify:run:${jobKey}`, completed);
    return { items: completed.items, receipt: completed };
  }

  async function discoverCandidates({ searchStrings, location, limit = 7, reviewLimit = 5 }) {
    if (!Array.isArray(searchStrings) || !searchStrings.length) throw new TypeError('searchStrings is required');
    if (limit < 1 || limit > 7) throw new RangeError('discovery limit must be between 1 and 7');
    const projection = apifyDiscoveryRequestProjection({ searchStrings, location, limit, reviewLimit });
    const input = projection.input;
    const result = await runActor(input, { jobKey: projection.jobKey, operationProjection: projection });
    const candidates = result.items.slice(0, limit).map((item, index) => normalizePlace(item, index, 'apify-discovery', {}));
    return {
      kind: 'discovery-candidates', candidates,
      request: { actor: ACTOR_ID, input: { ...input } },
      provenance: { provider: 'apify', actor: ACTOR_ID, run: result.receipt },
    };
  }

  async function enrichFinalist({ placeId, mapsUrl, limit = 50 }) {
    required(placeId, 'placeId');
    required(mapsUrl, 'mapsUrl');
    if (limit < 1 || limit > 50) throw new RangeError('finalist review limit must be between 1 and 50');
    const cacheKey = `finalist:${placeId}`;
    const cached = enrichmentReceipts.get(cacheKey) || await receiptGet(`apify:${cacheKey}`);
    if (cached) return cached;
    const projection = apifyFinalistRequestProjection({ placeId, mapsUrl, limit });
    const input = projection.input;
    const runKey = `finalist:${placeId}`;
    let result = await receiptGet(`apify:run:${runKey}`);
    result = result?.status === 'running'
      ? await resumeActor(result, input, runKey)
      : result?.status === 'completed' && Array.isArray(result.items)
        ? { items: result.items, receipt: result }
        : await runActor(input, { jobKey: runKey, operationProjection: projection });
    const returnedItem = result.items[0];
    if (!returnedItem || !finalistIdentityMatches(returnedItem, { placeId, mapsUrl })) {
      const error = new Error('Apify finalist response place identity mismatch');
      error.code = 'WRONG_PLACE';
      throw error;
    }
    const place = normalizePlace(returnedItem, 0, 'apify-finalist', { placeId, mapsUrl });
    if (place.quarantined) throw new Error('Apify finalist response lacked stable place identity');
    const output = {
      kind: 'finalist-review-enrichment', placeId, mapsUrl,
      requestedReviewLimit: limit,
      listingReviewCount: place.listingReviewCount,
      reviews: place.writtenReviews,
      emptyTextReviews: place.emptyTextReviews,
      quarantinedReviews: place.quarantinedReviews,
      dateWindow: null,
      retrievalCompleteness: place.listingReviewCount == null ? 'unknown' : (place.writtenReviews.length + place.emptyTextReviews.length) >= Math.min(limit, place.listingReviewCount) ? 'complete' : 'incomplete',
      provenance: { provider: 'apify', actor: ACTOR_ID, run: result.receipt, exactPlaceId: placeId, exactMapsUrl: mapsUrl, retrievedAt: clock() },
    };
    enrichmentReceipts.set(cacheKey, output);
    await receiptPut(`apify:${cacheKey}`, output);
    return output;
  }

  return { discoverCandidates, enrichFinalist, runActor };
}

module.exports = { ACTOR_ID, createApifyAdapter, apifyFinalistRequestProjection, apifyDiscoveryRequestProjection, normalizePlace, normalizeReview };
