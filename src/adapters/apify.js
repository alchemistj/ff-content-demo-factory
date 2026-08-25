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
      const requestProjection = operation === 'finalist-enrichmg]µÛ[h‘éì¶»§q«^vtNoConflictingProvenance(item, sourceUrl, host, label) {
  const provenance = item?.provenance;
  const aliases = [item?.sourceUrl, item?.url, item?.src];
  if (provenance && typeof provenance === 'object' && !Array.isArray(provenance)) aliases.push(provenance.sourceUrl, provenance.url, provenance.website);
  for (const candidate of aliases) {
    if (candidate == null) continue;
    const parsed = normalizeOwnedUrl(String(candidate), host, `${label} provenance`);
    if (canonicalOwnedUrl(parsed) !== canonicalOwnedUrl(sourceUrl)) throw new Error(`${label} has conflicting provenance URL`);
  }
}

function validateOwnedEvidence(items, host, label) {
  if (!Array.isArray(items)) throw new Error(`${label} must be an array`);
  for (const item of items) {
    const sourceUrl = evidenceSourceUrl(item);
    if (!sourceUrl) throw new Error(`${label} item is missing source URL/provenance`);
    const parsed = normalizeOwnedUrl(String(sourceUrl), host, `${label} item source`);
    assertNoConflictingProvenance(item, parsed, host, label);
    if (!item.provenance && !item.source && !item.sourceRef && !item.sourceUrl && !item.url && !item.src) throw new Error(`${label} item is missing provenance`);
  }
}

function validateOwnedUrlList(items, host, label) {
  if (!Array.isArray(items)) throw new Error(`${label} must be an array`);
  for (const sourceUrl of items) {
    normalizeOwnedUrl(sourceUrl, host, `${label}`);
  }
}

function normalizeWebsiteAudit(result, candidate) {
  if (!result || typeof result.website !== 'string' || !result.website.trim()) throw new Error('Website audit must identify the inspected business-owned website');
  if (!candidate || typeof candidate.website !== 'string' || !candidate.website.trim()) throw new Error('Website audit requires a candidate-owned website domain');
  let resultHost;
  let parsedWebsite;
  try { parsedWebsite = normalizeOwnedUrl(result.website, '', 'Website audit website'); } catch (error) {
    // Normalize the inspected website before applying the host binding. The
    // empty host is intentional here: normalizeOwnedUrl still enforces the
    // scheme/host contract, while the business host is established below.
    try { parsedWebsite = new URL(result.website); } catch { throw error; }
    if (parsedWebsite.protocol !== 'http:' && parsedWebsite.protocol !== 'https:') throw error;
  }
  resultHost = parsedWebsite.hostname.replace(/^www\./, '').toLowerCase();
  if (!resultHost) throw new Error('Website audit website URL is missing a host');
  if (/google\./i.test(resultHost) || resultHost === 'google.com') throw new Error('Website audit cannot use Google as business-owned evidence');
  if (candidate.website) {
    let candidateHost;
    try {
      const candidateUrl = new URL(candidate.website);
      if (candidateUrl.protocol !== 'http:' && candidateUrl.protocol !== 'https:') throw new Error('scheme');
      candidateHost = candidateUrl.hostname.replace(/^www\./, '').toLowerCase();
    } catch { throw new Error('Website audit candidate website URL is invalid'); }
    if (candidateHost && candidateHost !== resultHost) throw new Error('Website audit result does not bind to the candidate-owned website');
  }
  if (result.provenance?.website != null) {
    const provenanceUrl = normalizeOwnedUrl(String(result.provenance.website), resultHost, 'Website audit provenance website');
    if (canonicalOwnedUrl(provenanceUrl) !== canonicalOwnedUrl(parsedWebsite)) throw new Error('Website audit provenance conflicts with inspected website');
  }
  const evidence = Array.isArray(result.evidence) ? result.evidence : [];
  const images = Array.isArray(result.images) ? result.images : [];
  validateOwnedEvidence(evidence, resultHost, 'Website audit evidence');
  validateOwnedEvidence(images, resultHost, 'Website audit image');
  if (result.siteCopyEvidence != null) validateOwnedEvidence(result.siteCopyEvidence, resultHost, 'Website site-copy evidence');
  if (result.ownedGraphicEvidence != null) validateOwnedEvidence(result.ownedGraphicEvidence, resultHost, 'Website graphic evidence');
  if (result.graphicsInspection?.findings != null) validateOwnedEvidence(result.graphicsInspection.findings, resultHost, 'Website graphics inspection');
  if (result.publicImageUrls != null) validateOwnedUrlList(result.publicImageUrls, resultHost, 'Website public image URLs');
  const siteCopyEvidence = result.siteCopyEvidence || evidence.filter((item) => /copy|service|nap|contact|website/i.test(String(item.type || item.kind || '')));
  const ownedGraphicEvidence = result.ownedGraphicEvidence || evidence.filter((item) => /graphic|flyer|image|gallery|marketing/i.test(String(item.type || item.kind || '')));
  const findings = result.graphicsInspection?.findings || result.graphicsFindings || images.map((image) => ({ url: image.url || image.src || null, kind: image.kind || 'website-image', provenance: image.provenance || null }));
  return {
    quality: result.quality || result.siteQuality || 'inspected',
    opportunity: result.opportunity || null,
    siteCopyEvidence: Array.isArray(siteCopyEvidence) ? siteCopyEvidence : [],
    ownedGraphicEvidence: Array.isArray(ownedGraphicEvidence) ? ownedGraphicEvidence : [],
    publicImageUrls: result.publicImageUrls || images.map((image) => image.url || image.src).filter(Boolean),
    graphicsInspection: { status: 'inspected', findings: Array.isArray(findings) ? findings : [] },
    inspected: true,
    website: result.website || candidate.website || null,
    provenance: result.provenance || { website: candidate.website || null, source: 'cursor-website-audit' },
    cursorEvidence: evidence,
    cursorImages: images,
  };
}

function normalizeEnrichment(packet, finalist, limit) {
  const reviews = Array.isArray(packet.reviews) ? packet.reviews : [];
  const emptyTextReviews = Array.isArray(packet.emptyTextReviews) ? packet.emptyTextReviews : [];
  const quarantinedReviews = Array.isArray(packet.quarantinedReviews) ? packet.quarantinedReviews : [];
  const retrievedReviewCount = reviews.length + emptyTextReviews.length;
  const listingReviewCount = packet.listingReviewCount ?? null;
  const sufficient = listingReviewCount != null && retrievedReviewCount >= Math.min(limit, listingReviewCount);
  return {
    ...packet,
    kind: 'finalist-review-enrichment',
    placeId: finalist.placeId,
    mapsUrl: finalist.mapsUrl,
    exactPlace: true,
    discoverySampleOnly: false,
    requestedLimit: limit,
    requestedReviewLimit: limit,
    dateWindow: null,
    reviews,
    emptyTextReviews,
    quarantinedReviews,
    writtenReviewCount: reviews.filter((review) => String(review.text || '').trim()).length,
    emptyTextReviewCount: emptyTextReviews.length,
    retrievedReviewCount,
    quarantinedReviewCount: quarantinedReviews.length,
    listingReviewCount,
    retrievalCompleteness: packet.retrievalCompleteness || (sufficient ? 'complete' : 'incomplete'),
    enrichmentStatus: sufficient ? 'sufficient' : 'insufficient',
    source: packet.provenance?.provider || 'apify',
    provenance: { ...packet.provenance, exactPlaceId: finalist.placeId, exactMapsUrl: finalist.mapsUrl },
  };
}

function normalizeJudgment(result, receipt, review) {
  if (!result || result.kind !== 'review-judgment' || result.reviewId !== review.id || result.authoritative !== true) {
    throw new Error(`Cursor review judgment contract invalid for ${review.id}`);
  }
  if (!VALID_DECISIONS.has(result.decision)) throw new Error(`Invalid authoritative decision for review ${review.id}`);
  if (!Array.isArray(result.serviceEvidence) || !Array.isArray(result.availabilityEvidence)) {
    throw new Error(`Cursor review judgment evidence contract invalid for ${review.id}`);
  }
  for (const item of result.serviceEvidence) {
    if (!item || !item.service || !item.excerpt) throw new Error(`Service evidence must include service and exact excerpt for ${review.id}`);
    if (!String(review.text).includes(String(item.excerpt))) throw new Error(`Service evidence excerpt is not an exact source substring for ${review.id}`);
  }
  for (const item of result.availabilityEvidence) {
    if (item?.excerpt && !String(review.text).includes(String(item.excerpt))) throw new Error(`Availability evidence excerpt is not an exact source substring for ${review.id}`);
  }
  if (result.directCompletedService === true && result.decision !== 'anchor') throw new Error(`Direct completed service must be an anchor for ${review.id}`);
  const provenance = { ...(result.provenance || {}), source: review.source, reviewId: review.id, receiptKey: `cursor:${receipt?.jobId || review.id}`, model: { requestedAlias: receipt?.requestedAlias || null, resolvedModel: receipt?.resolvedModel || null } };
  return {
    ...result,
    judgmentId: result.judgmentId || receipt?.runId || receipt?.jobId || `cursor:${review.id}`,
    model: result.model || receipt?.resolvedModel || 'grok-4.6',
    modelReceipt: { requestedAlias: receipt?.requestedAlias || null, resolvedModel: receipt?.resolvedModel || null },
    receipt: receipt || null,
    judgedAt: result.judgedAt || receipt?.completedAt || receipt?.startedAt || null,
    provenance,
    directCompletedService: result.directCompletedService === true,
    serviceEvidence: result.serviceEvidence,
    availabilityEvidence: result.availabilityEvidence,
  };
}

function classificationForInventory(inventory) {
  if (!inventory || !Array.isArray(inventory.reviews)) throw new Error('Finalist review inventory is required');
  const judgments = inventory.classifications || {};
  const map = new Map();
  for (const review of inventory.reviews.filter((item) => String(item.text || '').trim())) {
    const judgment = judgments instanceof Map ? judgments.get(review.id) : judgments[review.id];
    if (!judgment || judgment.authoritative !== true) throw new Error(`Missing authoritative judgment for review ${review.id}`);
    map.set(review.id, judgment);
  }
  return buildClassificationArtifact({ reviews: inventory.reviews, judgments: map });
}

function candidateServicesFrom(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.candidates)) return value.candidates;
  if (Array.isArray(value?.services)) return value.services;
  return [];
}

/**
 * Compose the official vendor adapters with the factory's stage contracts.
 * Vendor receipts and normalized stage results are both durable, so an
 * orchestrator restart can reconcile paid work without starting it again.
 */
function createProductionAdapters({
  root,
  config = {},
  env = process.env,
  fetchImpl,
  cursorSdk,
  clock = () => new Date().toISOString(),
  receiptStore,
  apify,
  cursor,
  productionCloudAgent = false,
} = {}) {
  required(root, 'root');
  const productionRuntime = productionCloudAgent || (!cursor && !apify && !receiptStore);
  const receipts = receiptStore || createFileReceiptStore(root);
  let preparedProjection = null;
  if (env.FACTORY_PAID_PREPARED_ARTIFACT_FILE && fs.existsSync(env.FACTORY_PAID_PREPARED_ARTIFACT_FILE)) {
    try { preparedProjection = JSON.parse(fs.readFileSync(env.FACTORY_PAID_PREPARED_ARTIFACT_FILE, 'utf8')).requestProjection || null; } catch { preparedProjection = null; }
  }
  const apifyAdapter = apify || createApifyAdapter({
    token: env.APIFY_API_TOKEN,
    fetchImpl,
    clock,
    receiptStore: receipts,
    pollIntervalMs: config.apifyPollIntervalMs ?? 2000,
    maxPollAttempts: config.apifyMaxPollAttempts ?? 1800,
    production: productionRuntime && env.FACTORY_PHASE_B_PRODUCTION === 'true',
    operationArtifacts: {
      'pre-post': {
        artifactName: env.FACTORY_PAID_PREPARED_ARTIFACT_NAME,
        artifactId: env.FACTORY_PAID_PREPARED_ARTIFACT_ID,
        artifactDigest: env.FACTORY_PAID_PREPARED_ARTIFACT_DIGEST,
        artifactContentDigest: env.FACTORY_PAID_PREPARED_ARTIFACT_CONTENT_DIGEST,
        artifactOrigin: 'github-actions',
        requestProjection: preparedProjection,
      },
    },
    operationArtifactWriter: env.FACTORY_ACCEPTED_OPERATION_ARTIFACT_PATH ? async (artifact, response) => {
      const filename = env.FACTORY_ACCEPTED_OPERATION_ARTIFACT_PATH;
      fs.mkdirSync(require('node:path').dirname(filename), { recursive: true });
      fs.writeFileSync(filename, `${JSON.stringify({ ...artifact, response }, null, 2)}\n`);
      if (env.FACTORY_STOP_AFTER_ACCEPTANCE === 'true') {
        const boundaryFile = env.FACTORY_ACCEPTANCE_BOUNDARY_FILE || 'canary/phase-b/accepted-boundary';
        fs.writeFileSync(boundaryFile, `${artifact.operationKey}\n`);
        const boundary = new Error('PAID_OPERATION_ACCEPTANCE_BOUNDARY');
        boundary.code = 'PAID_OPERATION_ACCEPTANCE_BOUNDARY';
        throw boundary;
      }
    } : null,
  });
  const cursorAdapter = cursor || createCursorAdapter({ apiKey: env.CURSOR_API_KEY, sdk: cursorSdk, modelAlias: env.CURSOR_MODEL || config.cursorModel, clock, receiptStore: receipts, workspace: root });
  const discovery = {
    requiresRequest: true,
    async discover({ searchStrings, location, limit, reviewLimit = config.discoveryReviewLimit || 5 } = {}) {
      if (!Array.isArray(searchStrings) || !searchStrings.length || !location || !Number.isFinite(limit)) {
        throw new Error('Production discovery requires Architect searchStrings, location, and limit');
      }
      const result = await apifyAdapter.discoverCandidates({ searchStrings, location, limit: Math.min(7, limit), reviewLimit: Math.min(10, reviewLimit) });
      const candidates = (result.candidates || []).map(candidateFromPlace);
      const request = { searchStrings, location, limit: Math.min(7, limit), reviewLimit: Math.min(10, reviewLimit) };
      const packet = { ...result, candidates, request };
      const receipt = await putReceipt(receipts, `factory:discovery:${hash(request)}`, { provider: 'apify', operation: 'discovery', status: 'completed', completedAt: clock(), vendorReceipt: result.provenance?.run || null, input: request, request, result: { count: candidates.length, candidateDigest: digest(candidates) }, binding: { operation: 'discovery' } }, env);
      return { ...packet, receipt };
    },
  };

  const websiteAudit = {
    async audit(input) {
      const candidate = input?.candidate || input;
      const request = input?.request || null;
      if (!candidate?.placeId && !candidate?.mapsUrl) {
        return {
          quality: 'quarantined', opportunity: null, siteCopyEvidence: [], ownedGraphicEvidence: [], publicImageUrls: [],
          graphicsInspection: { status: 'not-inspected', findings: [] }, inspected: false,
          quarantined: true, quarantineReason: 'missing-stable-place-identity', provenance: { source: 'apify-discovery' },
        };
      }
      required(candidate?.placeId || candidate?.mapsUrl, 'candidate stable place identity');
      const jobId = `website-audit:${candidate.placeId || hash(candidate.mapsUrl)}`;
      const record = await cursorAdapter.runResearchRecord({
        kind: 'website-audit', jobId,
        input: { candidate: { placeId: candidate.placeId, name: candidate.name, website: candidate.website, location: candidate.location }, website: candidate.website || null, request },
      });
      const audit = normalizeWebsiteAudit(record.result, candidate);
      const receipt = await putReceipt(receipts, `factory:${jobId}`, { provider: 'cursor-sdk', operation: 'website-audit', status: 'completed', completedAt: clock(), vendorReceipt: record.receipt, input: { candidate: { placeId: candidate.placeId, name: candidate.name, website: candidate.website, location: candidate.location }, request }, binding: { placeId: candidate.placeId }, result: audit }, env);
      return { audit, receipt };
    },
  };

  const enrichment = {
    async enrichExactPlace({ finalist, limit = 50, dateWindow = null, exactPlace = true, runId = null, prospectId = null }) {
      if (!exactPlace || dateWindow !== null || limit !== 50) throw new Error('Finalist enrichment requires exact place, 50 reviews, and no date window');
      const placeId = finalist?.placeId || finalist?.gbp?.placeId;
      const mapsUrl = finalist?.mapsUrl || finalist?.gbp?.mapsUrl;
      required(placeId, 'finalist.placeId');
      required(mapsUrl, 'finalist.mapsUrl');
      const key = `factory:enrichment:${placeId}`;
      const prior = await getReceipt(receipts, key);
      if (prior?.status === 'completed' && prior.result) return prior.result;
      const packet = normalizeEnrichment(await apifyAdapter.enrichFinalist({ placeId, mapsUrl, limit }), { ...finalist, placeId, mapsUrl }, limit);
      const input = { placeId, mapsUrl, limit, dateWindow: null };
      const receipt = await putReceipt(receipts, key, { provider: 'apify', operation: 'finalist-enrichment', status: 'completed', completedAt: clock(), vendorReceipt: packet.provenance?.run || null, input, request: input, binding: { placeId, prospectId: prospectId || finalist?.prospectId || placeId, runId: runId || finalist?.runId || null }, result: packet }, env);
      Object.defineProperty(packet, 'receipt', { value: receipt, enumerable: false, configurable: true });
      return packet;
    },
  };

  const reviewJudge = {
    async judge({ review, finalist, runId = null, prospectId = null }) {
      required(review?.id, 'review.id');
      const jobId = `review-judgment:${finalist?.placeId || 'place'}:${review.id}`;
      const record = await cursorAdapter.runResearchRecord({
        kind: 'review-judgment', jobId,
        input: { finalist: { placeId: finalist?.placeId, name: finalist?.name }, review, deterministicSignals: deriveDeterministicSignals(review) },
      });
      const judgment = normalizeJudgment(record.result, record.receipt, review);
      const receiptResult = { ...judgment };
      delete receiptResult.receipt;
      const input = { placeId: finalist?.placeId, reviewId: review.id, reviewDigest: digest(review) };
      const receipt = await putReceipt(receipts, `factory:${jobId}`, { provider: 'cursor-sdk', operation: 'review-judgment', status: 'completed', completedAt: clock(), vendorReceipt: record.receipt, input, binding: { placeId: finalist?.placeId, prospectId: prospectId || finalist?.prospectId || finalist?.placeId, runId: runId || finalist?.runId || null, reviewId: review.id }, result: receiptResult }, env);
      judgment.receipt = receipt;
      return judgment;
    },
  };

  const prescriber = {
    async propose({ finalist, classification, inventory, discoveryPacket, decision = {} }) {
      classification = classification?.reviews ? classification : classificationForInventory(inventory);
      const jobId = `page-prescription:${finalist?.placeId || 'place'}`;
      const record = await cursorAdapter.runResearchRecord({
        kind: 'page-prescription', jobId,
        input: { finalist: { placeId: finalist?.placeId, prospectId: finalist?.prospectId, runId: finalist?.runId, name: finalist?.name, website: finalist?.website }, inventory: classification, discoveryPacket, decision },
      });
      const modelResult = record.result;
      const pages = decision.pages || decision.proposedPages || modelResult.pages;
      const services = decision.candidateServices || candidateServicesFrom(modelResult.comparison);
      if (!Array.isArray(pages) || !pages.length) throw new Error('Page prescription requires explicit validated pages');
      if (!Array.isArray(services) || !services.length) throw new Error('Page prescription requires a complete candidate service comparison');
      const serviceLedger = decision.serviceCoverageLedger || decision.serviceLedger || modelResult.serviceCoverageLedger;
      const sourceBinding = decision.sourceCheckpoint || decision.sourceBinding || modelResult.sourceCheckpoint || modelResult.sourceBinding;
      if (!sourceBinding) throw new Error('Page prescription requires a trusted source checkpoint binding');
      const boundServiceLedger = { ...(serviceLedger && serviceLedger.sourceIdentity ? serviceLedger : { ...serviceLedger, sourceIdentity: sourceBinding.sourceIdentity }), strictEvidenceBinding: productionRuntime };
      const boundIdentity = { prospectId: finalist?.prospectId || finalist?.placeId, placeId: finalist?.placeId, runId: finalist?.runId || decision.runId };
      validateCompleteCanonicalLedger(boundServiceLedger, { services, pages, identity: { ...boundIdentity, sourceIdentity: sourceBinding.sourceIdentity } });
      const validated = validatePrescription({ finalist, classification, services, proposedPages: pages, architectReview: decision.architectReview || decision, policy: decision.pagePolicy || modelResult.pagePolicy, override: decision.expansionOverride || modelResult.expansionOverride, serviceLedger: boundServiceLedger, runContext: { ...boundIdentity }, sourceBinding });
      const evidence = buildPrescriptionEvidence({ classification, pages: validated.pages, candidateServices: services });
      const output = {
        ...validated,
        sourceCheckpoint: sourceBinding,
        candidateServices: services,
        whyBuilt: decision.whyBuilt || modelResult.whyBuilt || null,
        evidence,
        availabilityPattern: evidence.availabilityPattern,
        authoritativeAnchorCount: evidence.authoritativeAnchorCount,
        cursorComparison: modelResult.comparison,
        cursorReceipt: record.receipt,
      };
      output.prescriptionDigest = digest({ ...output, prescriptionDigest: undefined });
      const receipt = await putReceipt(receipts, `factory:${jobId}`, { provider: 'cursor-sdk', operation: 'page-prescription', status: 'completed', completedAt: clock(), vendorReceipt: record.receipt, input: { placeId: finalist?.placeId, prospectId: finalist?.prospectId, runId: finalist?.runId || decision.runId, classificationDigest: digest(classification), sourceManifestDigest: sourceBinding.sourceManifestDigest || null }, result: output }, env);
      return { proposal: output, receipt };
    },
    async prescribe(input) {
      const result = await prescriber.propose(input);
      return result.proposal;
    },
  };

  const gate1 = {
    async render({ finalist, inventory, classifications, prescription, whyBuilt, qa: suppliedQa = null, sourceCheckpoint = null, receipts: receiptBundle = {}, actionProof = null, lineage = null }) {
      const classified = classifications || {};
      const enrichedInventory = {
        ...inventory,
        classifications: classified,
        classified: inventory.classified || (inventory.reviews ? inventory.reviews.map((review) => ({ id: review.id, authoritative: true, sourceReview: review, judgment: classified[review.id] || {} })) : []),
        writtenReviewCount: inventory.writtenReviewCount ?? inventory.reviews?.length ?? 0,
        authoritativeJudgmentCount: Object.keys(classified).length,
        authoritativeAnchorCount: Object.values(classified).filter((item) => item?.decision === 'anchor' && item?.directCompletedService === true).length,
        availabilityPattern: prescription.availabilityPattern || prescription.evidence?.availabilityPattern || inventory.availabilityPattern || null,
      };
      const resolvedWhyBuilt = whyBuilt || prescription.whyBuilt;
      const qa = suppliedQa || architectQa({ finalist, inventory: enrichedInventory, prescription, whyBuilt: resolvedWhyBuilt });
      if (!qa.passed) throw new Error(`Gate 1 QA failed: ${Object.entries(qa.checks).filter(([, passed]) => !passed).map(([name]) => name).join(', ')}`);
      const markdown = renderGate1({ finalist, prescription, whyBuilt: resolvedWhyBuilt, qa, sourceCheckpoint: sourceCheckpoint || prescription.sourceCheckpoint || null, receipts: receiptBundle, actionProof, lineage: lineage || { prospectId: prescription.prospect?.prospectId, placeId: prescription.prospect?.placeId, runId: prescription.runId } });
      const result = { markdown, qa, state: 'awaiting-human-gate-1', receiptKeys: [`factory:page-prescription:${finalist.placeId}`] };
      await putReceipt(receipts, `factory:gate-1:${finalist.placeId}`, { provider: 'factory', operation: 'gate-1', status: 'completed', completedAt: clock(), input: { placeId: finalist.placeId, prospectId: prescription?.prospect?.prospectId || finalist.placeId }, result }, env);
      return result;
    },
  };

  return { production: productionRuntime, testOnly: !productionRuntime, discovery, websiteAudit, enrichment, reviewJudge, prescriber, gate1, receiptStore: receipts, apify: apifyAdapter, cursor: cursorAdapter };
}

module.exports = {
  createProductionAdapters,
  createFactoryAdapters: createProductionAdapters,
  normalizeEnrichment,
  normalizeWebsiteAudit,
  normalizeJudgment,
  classificationForInventory,
  receiptContextFromEnv,
};
