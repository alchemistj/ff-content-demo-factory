'use strict';

const crypto = require('node:crypto');
const { createApifyAdapter } = require('../adapters/apify');
const { createCursorAdapter } = require('../adapters/cursor');
const { deriveDeterministicSignals } = require('../review-evidence/signals');
const { buildClassificationArtifact } = require('../review-evidence/classify');
const { buildPrescriptionEvidence } = require('../review-evidence/prescription');
const { prescribe: validatePrescription } = require('./prescription');
const { digest, validateCompleteCanonicalLedger, buildCanonicalLedgerFromComparison } = require('./prescription-policy');
const { renderGate1, architectQa } = require('./gate1');
const { createFileReceiptStore } = require('./receipt-store');

const VALID_DECISIONS = new Set(['anchor', 'supporting', 'negative', 'not-applicable']);

function hash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 24);
}

function required(value, name) {
  if (value == null || value === '') throw new TypeError(`${name} is required`);
  return value;
}

async function putReceipt(store, key, receipt) {
  if (!store || typeof store.put !== 'function') throw new TypeError('receiptStore must implement put');
  return store.put(key, { schemaVersion: 'factory-receipt-v1', key, ...receipt });
}

async function getReceipt(store, key) {
  return typeof store?.get === 'function' ? store.get(key) : undefined;
}

function candidateFromPlace(candidate) {
  const written = candidate.writtenReviews || candidate.reviews || [];
  const empty = candidate.emptyTextReviews || [];
  return {
    ...candidate,
    placeId: candidate.placeId || candidate.id || null,
    mapsUrl: candidate.mapsUrl || candidate.url || null,
    location: candidate.location || candidate.address || null,
    reviewCount: candidate.reviewCount ?? candidate.listingReviewCount ?? null,
    discoveryReviews: [...written, ...empty],
    discoveryReviewSample: { reviews: [...written, ...empty], sampleOnly: true, source: candidate.provenance?.source || 'apify-discovery' },
    discoveryReviewSource: candidate.provenance?.source || 'apify-discovery',
    gbpBasics: {
      placeId: candidate.placeId || candidate.id || null,
      mapsUrl: candidate.mapsUrl || null,
      name: candidate.name || null,
      location: candidate.location || candidate.address || null,
      city: candidate.city || null,
      state: candidate.state || null,
      postalCode: candidate.postalCode || null,
      phone: candidate.phone || null,
      rating: candidate.rating ?? null,
      reviewCount: candidate.reviewCount ?? candidate.listingReviewCount ?? null,
      coordinates: candidate.coordinates || null,
      openingHours: candidate.openingHours || null,
      temporarilyClosed: Boolean(candidate.temporarilyClosed),
      permanentlyClosed: Boolean(candidate.permanentlyClosed),
      images: Array.isArray(candidate.images) ? candidate.images.slice(0, 5) : [],
    },
  };
}

function normalizeWebsiteAudit(result, candidate) {
  if (!result || typeof result.website !== 'string' || !result.website.trim()) throw new Error('Website audit must identify the inspected business-owned website');
  let resultHost;
  try { resultHost = new URL(result.website).hostname.replace(/^www\./, '').toLowerCase(); } catch { throw new Error('Website audit website URL is invalid'); }
  if (/google\./i.test(resultHost) || resultHost === 'google.com') throw new Error('Website audit cannot use Google as business-owned evidence');
  if (candidate.website) {
    let candidateHost;
    try { candidateHost = new URL(candidate.website).hostname.replace(/^www\./, '').toLowerCase(); } catch { candidateHost = null; }
    if (candidateHost && candidateHost !== resultHost) throw new Error('Website audit result does not bind to the candidate-owned website');
  }
  const evidence = Array.isArray(result.evidence) ? result.evidence : [];
  const images = Array.isArray(result.images) ? result.images : [];
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
} = {}) {
  required(root, 'root');
  const receipts = receiptStore || createFileReceiptStore(root);
  const apifyAdapter = apify || createApifyAdapter({
    token: env.APIFY_API_TOKEN,
    fetchImpl,
    clock,
    receiptStore: receipts,
    pollIntervalMs: config.apifyPollIntervalMs ?? 2000,
    maxPollAttempts: config.apifyMaxPollAttempts ?? 1800,
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
      const receipt = await putReceipt(receipts, `factory:discovery:${hash(request)}`, { provider: 'apify', operation: 'discovery', status: 'completed', completedAt: clock(), vendorReceipt: result.provenance?.run || null, result: { count: candidates.length }, request });
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
      await putReceipt(receipts, `factory:${jobId}`, { provider: 'cursor-sdk', operation: 'website-audit', status: 'completed', completedAt: clock(), vendorReceipt: record.receipt, result: audit });
      return { audit, receipt: record.receipt };
    },
  };

  const enrichment = {
    async enrichExactPlace({ finalist, limit = 50, dateWindow = null, exactPlace = true }) {
      if (!exactPlace || dateWindow !== null || limit !== 50) throw new Error('Finalist enrichment requires exact place, 50 reviews, and no date window');
      const placeId = finalist?.placeId || finalist?.gbp?.placeId;
      const mapsUrl = finalist?.mapsUrl || finalist?.gbp?.mapsUrl;
      required(placeId, 'finalist.placeId');
      required(mapsUrl, 'finalist.mapsUrl');
      const key = `factory:enrichment:${placeId}`;
      const prior = await getReceipt(receipts, key);
      if (prior?.status === 'completed' && prior.result) return prior.result;
      const packet = normalizeEnrichment(await apifyAdapter.enrichFinalist({ placeId, mapsUrl, limit }), { ...finalist, placeId, mapsUrl }, limit);
      await putReceipt(receipts, key, { provider: 'apify', operation: 'finalist-enrichment', status: 'completed', completedAt: clock(), vendorReceipt: packet.provenance?.run || null, result: packet });
      return packet;
    },
  };

  const reviewJudge = {
    async judge({ review, finalist }) {
      required(review?.id, 'review.id');
      const jobId = `review-judgment:${finalist?.placeId || 'place'}:${review.id}`;
      const record = await cursorAdapter.runResearchRecord({
        kind: 'review-judgment', jobId,
        input: { finalist: { placeId: finalist?.placeId, name: finalist?.name }, review, deterministicSignals: deriveDeterministicSignals(review) },
      });
      const judgment = normalizeJudgment(record.result, record.receipt, review);
      await putReceipt(receipts, `factory:${jobId}`, { provider: 'cursor-sdk', operation: 'review-judgment', status: 'completed', completedAt: clock(), vendorReceipt: record.receipt, result: judgment });
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
      const services = decision.candidateServices || candidateServicesFrom(modelResult.comparison);
      const boundIdentity = { prospectId: finalist?.prospectId || finalist?.placeId, placeId: finalist?.placeId, runId: finalist?.runId || decision.runId };
      const pages = decision.pages || decision.proposedPages || modelResult.pages;
      if (!Array.isArray(pages) || !pages.length) throw new Error('Page prescription requires explicit validated pages');
      if (!Array.isArray(services) || !services.length) throw new Error('Page prescription requires a complete candidate service comparison');
      let serviceLedger = decision.serviceCoverageLedger || decision.serviceLedger || modelResult.serviceCoverageLedger;
      if (!serviceLedger || serviceLedger.version !== 'canonical-service-coverage-ledger-v1') {
        serviceLedger = buildCanonicalLedgerFromComparison({ candidates: services, pages, identity: boundIdentity });
      }
      serviceLedger = {
        ...serviceLedger,
        version: 'canonical-service-coverage-ledger-v1',
        prospectId: boundIdentity.prospectId,
        placeId: boundIdentity.placeId,
        runId: boundIdentity.runId,
      };
      validateCompleteCanonicalLedger(serviceLedger, { services, pages, identity: boundIdentity });
      const validated = validatePrescription({ finalist, classification, services, proposedPages: pages, architectReview: decision.architectReview || decision, policy: decision.pagePolicy || modelResult.pagePolicy, override: decision.expansionOverride || modelResult.expansionOverride, serviceLedger, runContext: { ...boundIdentity }, sourceBinding: decision.sourceCheckpoint || decision.sourceBinding });
      const evidence = buildPrescriptionEvidence({ classification, pages: validated.pages, candidateServices: services });
      const output = {
        ...validated,
        candidateServices: services,
        whyBuilt: decision.whyBuilt || modelResult.whyBuilt || null,
        evidence,
        availabilityPattern: evidence.availabilityPattern,
        authoritativeAnchorCount: evidence.authoritativeAnchorCount,
        cursorComparison: modelResult.comparison,
        cursorReceipt: record.receipt,
      };
      output.prescriptionDigest = digest({ ...output, prescriptionDigest: undefined });
      const receipt = await putReceipt(receipts, `factory:${jobId}`, { provider: 'cursor-sdk', operation: 'page-prescription', status: 'completed', completedAt: clock(), vendorReceipt: record.receipt, result: output });
      return { proposal: output, receipt };
    },
    async prescribe(input) {
      const result = await prescriber.propose(input);
      return result.proposal;
    },
  };

  const gate1 = {
    async render({ finalist, inventory, classifications, prescription, whyBuilt }) {
      const classified = classifications || {};
      const enrichedInventory = {
        ...inventory,
        classifications: classified,
        writtenReviewCount: inventory.writtenReviewCount ?? inventory.reviews?.length ?? 0,
        authoritativeJudgmentCount: Object.keys(classified).length,
        authoritativeAnchorCount: Object.values(classified).filter((item) => item?.decision === 'anchor' && item?.directCompletedService === true).length,
        availabilityPattern: prescription.availabilityPattern || prescription.evidence?.availabilityPattern || inventory.availabilityPattern || null,
      };
      const resolvedWhyBuilt = whyBuilt || prescription.whyBuilt;
      const qa = architectQa({ finalist, inventory: enrichedInventory, prescription, whyBuilt: resolvedWhyBuilt });
      if (!qa.passed) throw new Error(`Gate 1 QA failed: ${Object.entries(qa.checks).filter(([, passed]) => !passed).map(([name]) => name).join(', ')}`);
      const markdown = renderGate1({ finalist, prescription, whyBuilt: resolvedWhyBuilt });
      const result = { markdown, qa, state: 'awaiting-human-gate-1', receiptKeys: [`factory:page-prescription:${finalist.placeId}`] };
      await putReceipt(receipts, `factory:gate-1:${finalist.placeId}`, { provider: 'factory', operation: 'gate-1', status: 'completed', completedAt: clock(), result });
      return result;
    },
  };

  return { discovery, websiteAudit, enrichment, reviewJudge, prescriber, gate1, receiptStore: receipts, apify: apifyAdapter, cursor: cursorAdapter };
}

module.exports = {
  createProductionAdapters,
  createFactoryAdapters: createProductionAdapters,
  normalizeEnrichment,
  normalizeWebsiteAudit,
  normalizeJudgment,
  classificationForInventory,
};
