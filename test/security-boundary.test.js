'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createApifyAdapter } = require('../src/adapters/apify');
const { createCursorAdapter, researchPrompt } = require('../src/adapters/cursor');
const { runOne } = require('../src/factory/control-plane');
const { renderGate1 } = require('../src/factory/gate1');

function response(value, status = 200) { return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(value) }; }
function catalog() { return [{ id: 'grok-4.6', aliases: ['cursor-grok-4.6-high'], parameters: [{ id: 'fast', values: [{ value: 'false' }] }, { id: 'effort', values: [{ value: 'high' }] }] }]; }

test('API tokens never enter Apify or Cursor receipts', async () => {
  const apifyToken = 'apify-sensitive-token'; const apifyReceipts = new Map();
  const apify = createApifyAdapter({ token: apifyToken, receiptStore: apifyReceipts, fetchImpl: async (url, options) => options.method === 'POST' ? response({ data: { id: 'run', defaultDatasetId: 'dataset', status: 'SUCCEEDED' } }) : response([{ placeId: 'place', title: 'Seed', address: 'Dallas', reviews: [] }]) });
  await apify.discoverCandidates({ searchStrings: ['electrician'], location: 'Dallas', limit: 1 });
  assert.doesNotMatch(JSON.stringify([...apifyReceipts.values()]), new RegExp(apifyToken));

  const cursorToken = 'cursor-sensitive-token'; const cursorReceipts = new Map();
  const cursor = createCursorAdapter({ apiKey: cursorToken, receiptStore: { get: (key) => cursorReceipts.get(key), put: (key, value) => cursorReceipts.set(key, value) }, sdk: { Cursor: { models: { list: async () => catalog() } }, Agent: { create: async () => ({ id: 'agent-secret-receipt', send: async () => ({ id: 'run-secret-receipt', requestId: 'request-secret-receipt', wait: async () => ({ text: JSON.stringify({ kind: 'website-audit', website: 'https://seed.example', evidence: [], images: [] }) }) }) }) } } });
  await cursor.runResearch({ kind: 'website-audit', jobId: 'secret-receipt', input: { website: 'https://seed.example' } });
  assert.doesNotMatch(JSON.stringify([...cursorReceipts.values()]), new RegExp(cursorToken));
});

test('Cursor failure receipts redact bearer/API-key material', async () => {
  const token = 'cursor-error-secret'; const receipts = new Map();
  const cursor = createCursorAdapter({ apiKey: token, receiptStore: { get: (key) => receipts.get(key), put: (key, value) => receipts.set(key, value) }, sdk: { Cursor: { models: { list: async () => catalog() } }, Agent: { create: async () => ({ id: 'agent-error-redaction', send: async () => { throw new Error(`request failed: Bearer ${token}`); } }) } } });
  await assert.rejects(() => cursor.runResearch({ kind: 'website-audit', jobId: 'error-redaction', input: {} }), /Bearer/);
  const receipt = receipts.get('cursor:error-redaction');
  assert.doesNotMatch(receipt.error, new RegExp(token)); assert.match(receipt.error, /\[redacted\]/);
});

test('Cursor research prompts preserve read-only, no-copy/build/deploy, and no-Google-scrape boundaries', () => {
  for (const kind of ['website-audit', 'review-judgment', 'page-prescription']) {
    const prompt = researchPrompt(kind, { probe: 'security-test' });
    assert.match(prompt, /read-only research worker/i); assert.match(prompt, /Do not write, edit, create, delete/i); assert.match(prompt, /Do not open branches or pull requests, deploy, build a client, generate copy/i); assert.match(prompt, /Do not scrape Google, Google Maps, or GBP/i);
  }
});

test('operator/canary examples contain no secret values', () => {
  const operatorFiles = ['README.md', 'docs/CONTROL-PLANE.md', 'docs/ACCEPTANCE-MATRIX.md'];
  const operatorText = operatorFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  assert.doesNotMatch(operatorText, /(?:APIFY_API_TOKEN|CURSOR_API_KEY)\s*=\s*[^\s`<>{}\r\n]+/);
  assert.doesNotMatch(operatorText, /(?:sk-|xai-|ghp_|Bearer\s+)[A-Za-z0-9_-]{12,}/i);
  const envExample = fs.readFileSync('.env.example', 'utf8');
  assert.match(envExample, /^APIFY_API_TOKEN=$/m);
  assert.match(envExample, /^CURSOR_API_KEY=$/m);
});

test('candidate text cannot influence persisted Gate 1 artifact paths', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-path-boundary-')); const config = { productionCapacity: 1 };
  const maliciousName = '../../outside-gate1-should-not-exist';
  const result = runOne({ root, config, candidate: { placeId: 'safe-id', name: maliciousName, website: 'https://safe.example', location: 'Dallas' } });
  assert.equal(result.code, 'CLAIMED'); assert.equal(fs.existsSync(path.join(root, 'state', 'factory-state.json')), true);
  assert.equal(fs.existsSync(path.join(path.dirname(root), 'outside-gate1-should-not-exist')), false);
  const prescription = { pages: [{ type: 'Home', url: '/', primaryKeyword: 'electrician', titleDirection: 'Safe', h1Direction: 'Safe', whyIncluded: 'Core', strongestEvidence: 'review-1', recommendedFirstReview: null }], valueHierarchy: [{ id: 'service', includedPage: true, directCompletedEvidenceCount: 0, evidenceCount: 0 }] };
  const markdown = renderGate1({ finalist: { name: maliciousName, websiteAudit: { opportunity: 'safe opportunity' } }, prescription, whyBuilt: { text: 'The safe opportunity is clear. A review supports this direction.', refs: [{ type: 'opportunity', ref: 'safe opportunity' }, { type: 'review', ref: 'review-1' }] } });
  assert.match(markdown, /Human Gate 1/); assert.equal(fs.existsSync(path.join(root, 'outside-gate1-should-not-exist')), false);
});
