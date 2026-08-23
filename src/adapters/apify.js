'use strict';

const crypto = require('node:crypto');

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

function createApifyAdapter({ token, fetchImpl = globalThis.fetch, clock = () => new Date().toISOString(), pollIntervalMs = 0, maxPollAttempts = 100, receiptStore = new Map() }) {
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

  async function request(method, pathname, body) {
    const response = await fetchImpl(safeUrl(pathname), {
      method,
      headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    let parsed;
    try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { text }; }
    if (!response.ok) throw new Error(`Apify request failed (${response.status})`);
    return parsed;
  }

  async function waitForRun(runId, initial) {
    let run = initial;
    for (let attempt = 0; !['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(run.status); attempt += 1) {
      if (attempt >= maxPollAttempts) throw new Error('Apify run did not reach a terminal status');
      if (attempt > 0 && pollIntervalMs > 0) await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      run = await request('GET', `/actor-runs/${encodeURIComponent(runId)}`);
      run = run.data || run;
    }
    if (run.status !== 'SUCCEEDED') throw new Error(`Apify run ${run.status || 'unknown'}`);
    return run;
  }

  async function runActor(input, { jobKey = `input:${stableHash(JSON.stringify(input))}` } = {}) {
    const receiptKey = `apify:run:${jobKey}`;
    const prior = await receiptGet(receiptKey);
    if (prior?.status === 'completed' && Array.isArray(prior.items)) return { items: prior.items, receipt: prior };
    if (prior?.status === 'running') return resumeActor(prior, input, jobKey);
    const started = await request('POST', `/acts/${ACTOR_ID}/runs`, input);
    const run = started.data || started;
    const runId = run.id || run.runId;
    const datasetId = run.defaultDatasetId || run.datasetId;
    if (!runId || !datasetId) throw new Error('Apify run receipt missing id or dataset');
    await receiptPut(receiptKey, {
      provider: 'apify', actor: ACTOR_ID, jobKey, runId, datasetId,
      status: 'running', startedAt: clock(), input,
    });
    const terminal = ['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(run.status) ? run : await waitForRun(runId, run);
    const items = await request('GET', `/datasets/${encodeURIComponent(datasetId)}/items?format=json`);
    const receipt = {
      provider: 'apify', actor: ACTOR_ID, jobKey, runId, datasetId,
      status: 'completed', apifyStatus: terminal.status, completedAt: clock(),
      itemCount: Array.isArray(items) ? items.length : 0,
      input, items: Array.isArray(items) ? items : [],
    };
    await receiptPut(receiptKey, receipt);
    return { items: Array.isArray(items) ? items : [], receipt };
  }

  async function resumeActor(receipt, input, jobKey) {
    const terminal = await waitForRun(receipt.runId, { id: receipt.runId, defaultDatasetId: receipt.datasetId, status: receipt.status });
    const items = await request('GET', `/datasets/${encodeURIComponent(receipt.datasetId)}/items?format=json`);
    const completed = {
      ...receipt, jobKey, input, status: 'completed', apifyStatus: terminal.status, completedAt: clock(),
      itemCount: Array.isArray(items) ? items.length : 0, items: Array.isArray(items) ? items : [],
    };
    await receiptPut(`apify:run:${jobKey}`, completed);
    return { items: completed.items, receipt: completed };
  }

  async function discoverCandidates({ searchStrings, location, limit = 7, reviewLimit = 5 }) {
    if (!Array.isArray(searchStrings) || !searchStrings.length) throw new TypeError('searchStrings is required');
    if (limit < 1 || limit > 7) throw new RangeError('discovery limit must be between 1 and 7');
    const input = {
      searchStringsArray: searchStrings,
      locationQuery: required(location, 'location'),
      maxCrawledPlacesPerSearch: limit,
      maxReviews: Math.max(0, Math.min(10, reviewLimit)),
      maxImages: 5,
      scrapePlaceDetailPage: true,
      reviewsOrigin: 'google',
      // Intentionally no reviewsStartDate: discovery is not date-windowed.
    };
    const result = await runActor(input, { jobKey: `discovery:${stableHash(JSON.stringify(input))}` });
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
    const input = {
      placeIds: [placeId],
      startUrls: [{ url: mapsUrl }],
      maxCrawledPlacesPerSearch: 1,
      maxReviews: limit,
      scrapePlaceDetailPage: true,
      reviewsOrigin: 'google',
      // No reviewsStartDate: finalist enrichment retrieves the full available history.
    };
    const runKey = `finalist:${placeId}`;
    let result = await receiptGet(`apify:run:${runKey}`);
    result = result?.status === 'running'
      ? await resumeActor(result, input, runKey)
      : result?.status === 'completed' && Array.isArray(result.items)
        ? { items: result.items, receipt: result }
        : await runActor(input, { jobKey: runKey });
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

module.exports = { ACTOR_ID, createApifyAdapter, normalizePlace, normalizeReview };
