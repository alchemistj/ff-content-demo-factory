'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const { parseArgs, composeProductionRun, safeError } = require('../src/run-one');

test('production entry is explicit and rejects ambiguous operator combinations', () => {
  assert.deepEqual(parseArgs(['node', 'run-one', '--production', '--request', 'request.json', '--json']), {
    json: true,
    production: true,
    candidate: null,
    decision: null,
    request: 'request.json',
    adapters: null,
    seedDiscovery: null,
    owner: 'architect',
  });
  assert.throws(() => parseArgs(['node', 'run-one', '--production', '--adapters', 'custom.js']), /mutually exclusive/);
  assert.throws(() => parseArgs(['node', 'run-one', '--seed-discovery', 'seed.json']), /requires --production/);
  assert.throws(() => parseArgs(['node', 'run-one', '--request', 'request.json']), /require --production or --adapters/);
  assert.throws(() => parseArgs(['node', 'run-one', '--mystery']), /Unknown option/);
});

test('seeded canary replaces discovery only and derives its explicit captured request', async () => {
  const baseAdapters = { websiteAudit: {}, enrichment: {}, reviewJudge: {}, prescriber: {}, gate1: {}, discovery: { paid: true } };
  const result = composeProductionRun({
    root: path.join(__dirname, '..'),
    config: { productionCapacity: 1 },
    args: { seedDiscovery: 'canary/inputs/360-garage-door-and-more.discovery.json' },
    request: null,
    adapterFactory: () => baseAdapters,
  });
  assert.deepEqual(result.request.searchStrings, ['garage door repair']);
  assert.equal(result.request.location, 'Springfield, Missouri');
  assert.notEqual(result.adapters.discovery, baseAdapters.discovery);
  assert.equal(result.adapters.enrichment, baseAdapters.enrichment);
  const packet = await result.adapters.discovery.discoverCandidates({ limit: 7 });
  assert.equal(packet.candidates.length, 1);
  assert.equal(packet.candidates[0].discoverySampleOnly, true);
  assert.equal(packet.provenance.paidCall, false);
});

test('operator errors redact configured secrets and bearer material', () => {
  const output = safeError(new Error('Bearer visible-token api_key=visible-key'), {
    APIFY_API_TOKEN: 'visible-token',
    CURSOR_API_KEY: 'visible-key',
  });
  assert.doesNotMatch(output, /visible-token|visible-key/);
  assert.match(output, /\[redacted\]/);
});
