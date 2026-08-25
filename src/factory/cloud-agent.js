'use strict';

const { digest } = require('./prescription-policy');

const CURSOR_ALIAS = 'cursor-grok-4.6-high';
const CURSOR_MODEL = 'grok-4.6';
const THREAD_RE = /^https:\/\/cursor\.com\/agents\/([^/?#]+)$/;
const TERMINAL = new Set(['completed', 'succeeded', 'success']);

function required(value, label) {
  if (value == null || String(value).trim() === '') throw new Error(`${label} is required`);
  return value;
}

function canonicalThreadUrl(value) {
  const match = String(value || '').match(THREAD_RE);
  if (!match) throw new Error('Cloud Agent receipt requires canonical https://cursor.com/agents/<id> thread URL');
  return `https://cursor.com/agents/${match[1]}`;
}

function validateModelAttestation(model) {
  if (!model || model.alias !== CURSOR_ALIAS || model.resolvedModel !== CURSOR_MODEL || model.fastOff !== true) throw new Error('Cloud Agent model/Fast-off attestation is invalid');
  return { alias: CURSOR_ALIAS, resolvedModel: CURSOR_MODEL, fastOff: true };
}

function validateDispatchPacket(packet) {
  if (!packet || packet.schemaVersion !== 'factory-cursor-dispatch-v1') throw new Error('Cloud Agent dispatch packet schema is invalid');
  required(packet.issueNumber, 'dispatch issue number');
  required(packet.prNumber, 'dispatch PR number');
  required(packet.branch, 'dispatch branch');
  required(packet.reviewedHeadSha, 'dispatch reviewed head');
  required(packet.repository, 'dispatch repository');
  if (!String(packet.commentBody || '').startsWith('@cursor')) throw new Error('Cloud Agent dispatch must be an @cursor GitHub comment');
  validateModelAttestation(packet.model);
  const lines = String(packet.commentBody).split(/\r?\n/);
  const lineValue = (name) => lines.find((line) => line.startsWith(`${name}:`))?.slice(name.length + 1).trim();
  if (lineValue('Issue') !== `#${packet.issueNumber}` || lineValue('PR') !== `#${packet.prNumber}` || lineValue('Branch') !== String(packet.branch) || lineValue('Reviewed head') !== String(packet.reviewedHeadSha)) throw new Error('Cloud Agent dispatch comment target is mismatched');
  const expected = digest({ issueNumber: packet.issueNumber, prNumber: packet.prNumber, branch: packet.branch, reviewedHeadSha: packet.reviewedHeadSha, scope: packet.scope, model: packet.model, commentBody: packet.commentBody, repository: packet.repository });
  if (packet.dispatchDigest !== expected) throw new Error('Cloud Agent dispatch digest is invented or stale');
  return packet;
}

function validateJobReceipt(receipt, { kind, expectedEnvelope }) {
  if (!receipt || typeof receipt !== 'object') throw new Error(`Cloud Agent ${kind} receipt is missing`);
  if (receipt.operation !== kind || receipt.stage !== kind) throw new Error(`Cloud Agent ${kind} operation/stage mismatch`);
  if (!TERMINAL.has(String(receipt.status || '').toLowerCase()) || receipt.terminalStatus !== 'succeeded') throw new Error(`Cloud Agent ${kind} receipt is not terminal success`);
  required(receipt.agentId, `${kind} agentId`);
  required(receipt.runId, `${kind} runId`);
  if (String(receipt.agentId) === String(receipt.runId)) throw new Error(`Cloud Agent ${kind} receipt must preserve separate agentId and runId`);
  canonicalThreadUrl(receipt.threadUrl);
  required(receipt.inputDigest, `${kind} inputDigest`);
  required(receipt.outputDigest, `${kind} outputDigest`);
  if (!/^sha256:[a-f0-9]{8,}$/i.test(String(receipt.inputDigest)) || !/^sha256:[a-f0-9]{8,}$/i.test(String(receipt.outputDigest))) throw new Error(`Cloud Agent ${kind} receipt digest format is invalid`);
  if (!receipt.startedAt || !receipt.completedAt) throw new Error(`Cloud Agent ${kind} receipt timestamps are incomplete`);
  const envelope = receipt.envelope;
  if (!envelope || envelope.checkedOutSha !== expectedEnvelope.checkedOutSha || envelope.inputManifestDigest !== expectedEnvelope.inputManifestDigest || envelope.operation !== kind || envelope.stage !== kind) throw new Error(`Cloud Agent ${kind} immutable envelope mismatch`);
  for (const field of ['runId', 'prospectId', 'sourceCheckpointDigest', 'sourceManifestDigest']) {
    if (expectedEnvelope[field] != null && String(envelope[field]) !== String(expectedEnvelope[field])) throw new Error(`Cloud Agent ${kind} envelope ${field} mismatch`);
  }
  return { ...receipt, threadUrl: canonicalThreadUrl(receipt.threadUrl) };
}

function validateBundleLegacy(bundle, { expectedHeadSha, inputManifestDigest, dispatch, repository = 'alchemistj/ff-content-demo-factory' }) {
  if (!bundle || bundle.schemaVersion !== 'cursor-cloud-agent-bundle-v1') throw new Error('Canary requires a trusted Cursor Cloud Agent bundle');
  validateModelAttestation(bundle.model);
  validateDispatchPacket(bundle.dispatch);
  if (bundle.dispatch.repository !== repository) throw new Error('Cloud Agent dispatch repository is foreign');
  if (!new RegExp(`^https://github\\.com/${repository.split('/').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\/')}/issues/${dispatch.issueNumber}#issuecomment-\\d+$`).test(String(bundle.dispatch.commentUrl || ''))) throw new Error('Cloud Agent bundle comment URL is foreign or missing');
  if (bundle.dispatch.issueNumber !== dispatch.issueNumber || bundle.dispatch.prNumber !== dispatch.prNumber || bundle.dispatch.branch !== dispatch.branch || bundle.dispatch.reviewedHeadSha !== expectedHeadSha) throw new Error('Cloud Agent dispatch target is stale or mismatched');
  if (bundle.inputManifestDigest !== inputManifestDigest) throw new Error('Cloud Agent bundle input manifest digest mismatch');
  if (!bundle.envelope || bundle.envelope.checkedOutSha !== expectedHeadSha || bundle.envelope.inputManifestDigest !== inputManifestDigest) throw new Error('Cloud Agent bundle immutable envelope is missing or mismatched');
  return bundle;
}

function validateJobReceipt(receipt, { kind, expectedEnvelope }) {
  if (!receipt || typeof receipt !== 'object') throw new Error(`Cloud Agent ${kind} receipt is missing`);
  if (receipt.operation !== kind || receipt.stage !== kind) throw new Error(`Cloud Agent ${kind} operation/stage mismatch`);
  if (!TERMINAL.has(String(receipt.status || '').toLowerCase()) || receipt.terminalStatus !== 'succeeded') throw new Error(`Cloud Agent ${kind} receipt is not terminal success`);
  required(receipt.agentId, `${kind} agentId`); required(receipt.runId, `${kind} runId`);
  if (String(receipt.agentId) === String(receipt.runId)) throw new Error(`Cloud Agent ${kind} receipt must preserve separate agentId and runId`);
  canonicalThreadUrl(receipt.threadUrl); required(receipt.inputDigest, `${kind} inputDigest`); required(receipt.outputDigest, `${kind} outputDigest`);
  if (!receipt.startedAt || !receipt.completedAt) throw new Error(`Cloud Agent ${kind} receipt timestamps are incomplete`);
  const envelope = receipt.envelope;
  if (!envelope || envelope.checkedOutSha !== expectedEnvelope.checkedOutSha || envelope.inputManifestDigest !== expectedEnvelope.inputManifestDigest || envelope.operation !== kind || envelope.stage !== kind) throw new Error(`Cloud Agent ${kind} immutable envelope mismatch`);
  for (const field of ['runId', 'prospectId', 'sourceCheckpointDigest', 'sourceManifestDigest', 'dispatchKey', 'dispatchDigest', 'handoffId']) {
    if (expectedEnvelope[field] != null && String(envelope[field] ?? '') !== String(expectedEnvelope[field])) throw new Error(`Cloud Agent ${kind} envelope ${field} mismatch`);
  }
  return { ...receipt, threadUrl: canonicalThreadUrl(receipt.threadUrl) };
}

// Current execution comments are posted on the authoritative PR thread.  Keep
// the legacy implementation above for historical fixtures, but make the
// exported validator enforce the live topology and its immutable envelope.
function validateBundle(bundle, { expectedHeadSha, inputManifestDigest, dispatch, expectedEnvelope = null, repository = 'alchemistj/ff-content-demo-factory' }) {
  if (!bundle || bundle.schemaVersion !== 'cursor-cloud-agent-bundle-v1') throw new Error('Canary requires a trusted Cursor Cloud Agent bundle');
  validateModelAttestation(bundle.model);
  validateDispatchPacket(bundle.dispatch);
  if (bundle.dispatch.repository !== repository) throw new Error('Cloud Agent dispatch repository is foreign');
  const targetPaths = [`pull/${dispatch.prNumber}`, `issues/${dispatch.issueNumber}`].filter(Boolean);
  const escapedRepository = repository.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
  if (!targetPaths.some((targetPath) => new RegExp(`^https://github\\.com/${escapedRepository}/${targetPath}#issuecomment-\\d+$`).test(String(bundle.dispatch.commentUrl || '')))) throw new Error('Cloud Agent bundle comment URL is foreign or missing');
  if (bundle.dispatch.issueNumber !== dispatch.issueNumber || bundle.dispatch.prNumber !== dispatch.prNumber || bundle.dispatch.branch !== dispatch.branch || bundle.dispatch.reviewedHeadSha !== expectedHeadSha) throw new Error('Cloud Agent dispatch target is stale or mismatched');
  if (bundle.inputManifestDigest !== inputManifestDigest) throw new Error('Cloud Agent bundle input manifest digest mismatch');
  if (!bundle.envelope || bundle.envelope.checkedOutSha !== expectedHeadSha || bundle.envelope.inputManifestDigest !== inputManifestDigest) throw new Error('Cloud Agent bundle immutable envelope is missing or mismatched');
  const expected = expectedEnvelope || {};
  for (const field of ['dispatchKey', 'dispatchDigest', 'handoffId', 'runId', 'prospectId', 'sourceCheckpointDigest', 'sourceManifestDigest']) {
    const expectedValue = expectedEnvelope ? (expected[field] ?? dispatch[field] ?? bundle.dispatch[field]) : null;
    if (expectedValue != null && String(bundle.envelope[field] ?? '') !== String(expectedValue)) throw new Error(`Cloud Agent bundle envelope ${field} is mismatched`);
  }
  if (expected.historicalLineageSeed) {
    if (JSON.stringify(bundle.envelope.historicalLineageSeed || null) !== JSON.stringify(expected.historicalLineageSeed)) throw new Error('Cloud Agent bundle approved-lineage projection is mismatched');
  }
  return bundle;
}

function createDispatchPacket({ issueNumber, prNumber, branch, reviewedHeadSha, scope, repository = 'alchemistj/ff-content-demo-factory' }) {
  const model = { alias: CURSOR_ALIAS, requestedModel: CURSOR_MODEL, resolvedModel: CURSOR_MODEL, fastOff: true, fast: false };
  const commentBody = `@cursor\nIssue: #${issueNumber}\nPR: #${prNumber}\nBranch: ${branch}\nReviewed head: ${reviewedHeadSha}\nScope: ${scope}\nModel: Grok 4.6 High (cursor-grok-4.6-high), Fast off (fast: false).\nReturn a bound terminal receipt with the canonical https://cursor.com/agents/<id> thread URL, separate agentId/runId, input/output digests, dispatchDigest, handoffId, dispatchKey, phaseARunId, runId, prospectId, and exact branch/head evidence. Do not write prospect copy.`;
  const dispatchKey = digest({ repository, issueNumber, prNumber, branch, reviewedHeadSha, scope });
  const fullCommentBody = `${commentBody}\nDispatch key: ${dispatchKey}`;
  return { schemaVersion: 'factory-cursor-dispatch-v1', repository, issueNumber, prNumber, branch, reviewedHeadSha, scope, dispatchKey, model, commentBody: fullCommentBody, dispatchDigest: digest({ issueNumber, prNumber, branch, reviewedHeadSha, scope, model, commentBody: fullCommentBody, repository }) };
}

module.exports = { CURSOR_ALIAS, CURSOR_MODEL, canonicalThreadUrl, validateModelAttestation, validateDispatchPacket, validateJobReceipt, validateBundle, createDispatchPacket };
