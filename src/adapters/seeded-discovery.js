'use strict';

const MAX_CANDIDATES = 7;
const FORBIDDEN_CONCLUSIONS = new Set([
  'viable', 'qualification', 'architectQualified', 'pagePrescription',
  'valueHierarchy', 'reviewClassification', 'recommendedFirstReview',
]);

function readJsonPacket(packet) {
  if (!packet || typeof packet !== 'object' || Array.isArray(packet)) throw new TypeError('seeded discovery packet must be an object');
  return packet;
}

function findForbidden(value, path = '$') {
  if (!value || typeof value !== 'object') return null;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_CONCLUSIONS.has(key)) return `${path}.${key}`;
    const nested = findForbidden(child, `${path}.${key}`);
    if (nested) return nested;
  }
  return null;
}

function validateRawCandidate(candidate, index) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) throw new TypeError(`candidate ${index} must be an object`);
  const placeId = candidate.placeId || candidate.googlePlaceId || candidate.cid;
  const mapsUrl = candidate.mapsUrl || candidate.googleMapsUrl || candidate.url;
  const name = candidate.name || candidate.title;
  const location = candidate.location || candidate.address || candidate.city;
  if (!placeId && !mapsUrl) throw new Error(`candidate ${index} is missing raw stable place identity`);
  if (!name) throw new Error(`candidate ${index} is missing raw business name`);
  if (!location) throw new Error(`candidate ${index} is missing raw location/address`);
  if (candidate.reviews != null && !Array.isArray(candidate.reviews)) throw new TypeError(`candidate ${index} reviews must be an array`);
  return {
    ...candidate,
    placeId: placeId ? String(placeId) : null,
    mapsUrl: mapsUrl || null,
    name: String(name),
    location: String(location),
  };
}

function normalizeRequest(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) return null;
  const searchStrings = request.searchStrings || request.searchStringsArray;
  const location = request.location || request.locationQuery;
  return {
    ...request,
    ...(Array.isArray(searchStrings) ? { searchStrings } : {}),
    ...(location ? { location: String(location) } : {}),
  };
}

function markSample(candidate) {
  const reviews = Array.isArray(candidate.reviews) ? candidate.reviews : (Array.isArray(candidate.discoveryReviews) ? candidate.discoveryReviews : []);
  return {
    ...candidate,
    discoveryReviews: reviews,
    discoveryReviewSample: {
      reviews,
      sampleOnly: true,
      source: 'seeded-apify-discovery',
    },
    discoverySampleOnly: true,
  };
}

/**
 * Validate and normalize a previously captured raw Apify discovery result.
 * This is deliberately not an Apify client and performs no network/paid work.
 */
function validateSeededDiscoveryPacket(input) {
  const packet = readJsonPacket(input);
  if (packet.kind !== 'seeded-apify-discovery-result') throw new Error('seeded discovery packet kind must be seeded-apify-discovery-result');
  const forbidden = findForbidden(packet);
  if (forbidden) throw new Error(`seeded discovery packet contains inherited conclusion field at ${forbidden}`);
  if (!Array.isArray(packet.candidates)) throw new TypeError('seeded discovery packet candidates must be an array');
  if (packet.candidates.length > MAX_CANDIDATES) throw new RangeError(`seeded discovery packet cannot exceed ${MAX_CANDIDATES} candidates`);
  const candidates = packet.candidates.map(validateRawCandidate);
  return {
    ...packet,
    schemaVersion: packet.schemaVersion || '1.0.0',
    candidates: candidates.map(markSample),
    request: normalizeRequest(packet.request || packet.discoveryRequest),
    receipt: packet.receipt || { provider: 'apify', mode: 'seeded-discovery', paidCall: false, source: packet.provenance || null },
    provenance: { ...(packet.provenance || {}), provider: packet.provenance?.provider || 'apify', mode: 'seeded-discovery', paidCall: false },
  };
}

function createSeededDiscoveryAdapter({ packet, packetPath = null } = {}) {
  if (!packet && !packetPath) throw new TypeError('packet or packetPath is required');
  let loaded;
  return {
    async discover({ limit = MAX_CANDIDATES } = {}) {
      if (!loaded) {
        const source = packet || require('node:fs').readFileSync(packetPath, 'utf8');
        loaded = validateSeededDiscoveryPacket(typeof source === 'string' ? JSON.parse(source) : source);
      }
      return loaded.candidates.slice(0, Math.min(MAX_CANDIDATES, limit));
    },
    async discoverCandidates({ limit = MAX_CANDIDATES } = {}) {
      await this.discover({ limit });
      return { ...loaded, candidates: loaded.candidates.slice(0, Math.min(MAX_CANDIDATES, limit)) };
    },
    async discoverPacket() {
      await this.discover({ limit: MAX_CANDIDATES });
      return loaded;
    },
  };
}

module.exports = { MAX_CANDIDATES, FORBIDDEN_CONCLUSIONS, normalizeRequest, validateSeededDiscoveryPacket, createSeededDiscoveryAdapter };
