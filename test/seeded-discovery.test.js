'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createSeededDiscoveryAdapter, validateSeededDiscoveryPacket } = require('../src/adapters/seeded-discovery');

function packet(overrides = {}) {
  return {
    kind: 'seeded-apify-discovery-result',
    schemaVersion: '1.0.0',
    candidates: [{
      placeId: 'seed-place-1', title: 'Seed Electric', address: 'Dallas, TX', category: 'Electrician', website: 'https://seed.example',
      reviews: [{ id: 'sample-review-1', text: 'Installed a charger', rating: 5 }],
    }],
    request: { searchStringsArray: ['electrician'], locationQuery: 'Dallas, TX', maxCrawledPlacesPerSearch: 1 },
    provenance: { provider: 'apify', actor: 'compass~crawler-google-places', source: 'captured-fixture' },
    receipt: { provider: 'apify', mode: 'captured', paidCall: true, runId: 'captured-run' },
    ...overrides,
  };
}

test('seeded discovery accepts raw fields, preserves receipt, and marks reviews sample-only', async () => {
  const normalized = validateSeededDiscoveryPacket(packet());
  assert.equal(normalized.kind, 'seeded-apify-discovery-result');
  assert.equal(normalized.receipt.runId, 'captured-run');
  assert.equal(normalized.candidates[0].discoverySampleOnly, true);
  assert.equal(normalized.candidates[0].discoveryReviewSample.sampleOnly, true);
  assert.equal(normalized.provenance.mode, 'seeded-discovery');
  assert.equal(normalized.provenance.paidCall, false, 'replaying a packet makes no paid call');
  const adapter = createSeededDiscoveryAdapter({ packet: packet() });
  assert.equal((await adapter.discover({ limit: 1 }))[0].placeId, 'seed-place-1');
  assert.equal((await adapter.discoverPacket()).receipt.runId, 'captured-run');
});

test('seeded discovery preserves discoveryReviews spelling and exposes packet-returning discoverCandidates', async () => {
  const rawCandidate = { placeId: 'seed-place-2', title: 'Seed Two', address: 'Austin, TX', discoveryReviews: [{ id: 'sample-2', text: 'Rewired a shop.' }] };
  const normalized = validateSeededDiscoveryPacket(packet({ request: undefined, discoveryRequest: { locationQuery: 'Austin, TX' }, candidates: [rawCandidate] }));
  assert.equal(normalized.request.locationQuery, 'Austin, TX');
  assert.equal(normalized.candidates[0].discoveryReviewSample.reviews.length, 1);
  const adapter = createSeededDiscoveryAdapter({ packet: packet({ request: undefined, discoveryRequest: { locationQuery: 'Austin, TX' }, candidates: [rawCandidate] }) });
  const result = await adapter.discoverCandidates({ limit: 1 });
  assert.equal(result.kind, 'seeded-apify-discovery-result');
  assert.equal(result.candidates[0].discoveryReviews[0].id, 'sample-2');
  assert.equal(result.request.locationQuery, 'Austin, TX');
});

test('seeded discovery persists raw Apify aliases as canonical candidate and request fields', async () => {
  const packet = validateSeededDiscoveryPacket({
    kind: 'seeded-apify-discovery-result',
    request: { searchStringsArray: ['garage door repair'], locationQuery: 'Springfield, Missouri', limit: 7 },
    candidates: [{ googlePlaceId: 'alias-place', title: 'Alias Garage Door', address: 'Springfield, Missouri' }],
  });
  assert.equal(packet.candidates[0].placeId, 'alias-place');
  assert.equal(packet.candidates[0].name, 'Alias Garage Door');
  assert.equal(packet.candidates[0].location, 'Springfield, Missouri');
  assert.deepEqual(packet.request.searchStrings, ['garage door repair']);
  assert.equal(packet.request.location, 'Springfield, Missouri');
});

test('seeded discovery rejects inherited conclusion fields at packet or candidate depth', () => {
  for (const field of ['viable', 'qualification', 'architectQualified', 'pagePrescription', 'valueHierarchy', 'reviewClassification', 'recommendedFirstReview']) {
    assert.throws(() => validateSeededDiscoveryPacket(packet({ [field]: true })), new RegExp(`inherited conclusion field.*${field}`));
    assert.throws(() => validateSeededDiscoveryPacket(packet({ candidates: [{ ...packet().candidates[0], [field]: true }] })), new RegExp(`inherited conclusion field.*${field}`));
  }
});

test('seeded discovery rejects malformed or over-capacity raw packets', () => {
  assert.throws(() => validateSeededDiscoveryPacket(packet({ candidates: [{ title: 'No stable ID', address: 'Dallas' }] })), /stable place identity/);
  assert.throws(() => validateSeededDiscoveryPacket(packet({ candidates: [{ placeId: 'id-only', title: 'No location' }] })), /location\/address/);
  assert.throws(() => validateSeededDiscoveryPacket(packet({ candidates: Array.from({ length: 8 }, (_, index) => ({ placeId: `id-${index}`, title: `Name ${index}`, address: 'Dallas' })) })), /cannot exceed 7/);
  assert.throws(() => validateSeededDiscoveryPacket({ kind: 'apify-discovery-result', candidates: [] }), /kind/);
});
