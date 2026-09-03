'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const seed = require('../canary/inputs/360-garage-door-and-more.discovery.json');
const { buildCandidateBench } = require('../src/factory/candidates');

test('360 canary starts from one raw discovery-equivalent record with no inherited conclusions', () => {
  assert.equal(seed.kind, 'seeded-apify-discovery-result');
  assert.equal(seed.candidates.length, 1);
  const candidate = seed.candidates[0];
  assert.equal(candidate.name, '360 Garage Door and More');
  assert.equal(candidate.placeId, 'ChIJHa32AOi84YMR38BV93YKiS8');
  assert.equal(candidate.location, '2035 W Mt Vernon St, Springfield, MO 65802');
  assert.equal(candidate.reviewCount, 110);
  assert.equal(candidate.discoveryReviews.length, 5);
  assert.equal(candidate.images.length, 5);
  for (const forbidden of ['viable', 'qualification', 'architectQualified', 'pagePrescription', 'valueHierarchy', 'reviewClassification', 'recommendedFirstReview']) {
    assert.equal(Object.prototype.hasOwnProperty.call(candidate, forbidden), false, `seed must not inherit ${forbidden}`);
  }
});

test('new Stage 1 treats the 360 seed as unqualified discovery evidence until its own audit and Architect decision', () => {
  const candidate = seed.candidates[0];
  const bench = buildCandidateBench(seed.candidates, new Map());
  assert.equal(bench.length, 1);
  assert.equal(bench[0].placeId, candidate.placeId);
  assert.equal(bench[0].discoveryReviewSample.sampleOnly, true);
  assert.equal(bench[0].architectQualified, undefined);
  assert.equal(bench[0].disposition.status, 'discovered');
});
