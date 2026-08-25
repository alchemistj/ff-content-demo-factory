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
  if (!String(packet.commentBody || '').startsWith('@cursor')) throw new Error('Cloud Agent dispatch must be an @cursor GitHub comment');
  validateModelAttestation(packet.model);
  return packet;
}

function validateJobReceipt(receipt, { kind, expectedEnvelope }) {
  if (!receipt || typeof receipt !== 'object') throw new Error(`Cloud Agent ${kind} receipt is missing`);
  if (receipt.operation !== kind || receipt.stage !== kind) throw new Error(`Cloud Agent ${kind} operation/stage mismatch`);
  if (!TERMINAL.has(String(receipt.status || '').toLowerCase()) || receipt.terminalStatus !== 'succeeded') throw new Error(`Cloud Agent ${kind} receipt is not terminal success`);
  required(receipt.agentId, `${kind} agentId`);
  required(receipt.runId, `${kind} runId`);
  canonicalThreadUrl(receipt.threadUrl);
  required(receipt.inputDigest, `${kind} inputDigest`);
  required(receipt.outputDigest, `${kind} outputDigest`);
  if (!receipt.startedAt || !receipt.completedAt) throw new Error(`Cloud Agent ${kind} receipt timestamps are incomplete`);
  const envelope = receipt.envelope;
  if (!envelope || envelope.checkedOutSha !== expectedEnvelope.checkedOutSha || envelope.inputManifestDigest !== expectedEnvelope.inputManifestDigest || envelope.operation !== kind || envelope.stage !== kind) throw new Error(`Cloud Agent ${kind} immutable envelope mismatch`);
  for (const field of ['runId', 'prospectId', 'sourceCheckpointDigest', 'sourceManifestDigest']) {
    if (expectedEnvelope[field] != null && String(envelope[field]) !== String(expectedEnvelope[field])) throw new Error(`Cloud Agent ${kind} envelope ${field} mismatch`);
  }
  return { ...receipt, threadUrl: canonicalThreadUrl(receipt.threadUrl) };
}

function validateBundle(bundle, { expectedHeadSha, inputManifestDigest, dispatch }) {
  if (!bundle || bundle.schemaVersion !== 'cursor-cloud-agent-bundle-v1') throw new Error('Canary requires a trusted Cursor Cloud Agent bundle');
  validateModelAttestation(bundle.model);
  validateDispatchPacket(bundle.dispatch);
  if (!/^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+#issuecomment-\d+$/.test(String(bundle.dispatch.commentUrl || ''))) throw new Error('Cloud Agent bundle is missing the GitHub @cursor dispatch comment receipt');
  if (bundle.dispatch.issueNumber !== dispatch.issueNumber || bundle.dispatch.prNumber !== dispatch.prNumber || bundle.dispatch.branch !== dispatch.branch || bundle.dispatch.reviewedHeadSha !== expectedHeadSha) throw new Error('Cloud Agent dispatch target is stale or mismatched');
  if (bundle.inputManifestDigest !== inputManifestDigest) throw new Error('Cloud Agent bundle input manifest digest mismatch');
  if (!bundle.envelope || bundle.envelope.checkedOutSha !== expectedHeadSha || bundle.envelope.inputManifestDigest !== inputManifestDigest) throw new Error('Cloud Agent bundle immutable envelope is missing or mismatched');
  return bundle;
}

function createDispatchPacket({ issueNumber, prNumber, branch, reviewedHeadSha, scope }) {
  const model = { alias: CURSOR_ALIAS, requestedModel: CURSOR_MODEL, resolvedModel: CURSOR_MODEL, fastOff: true, fast: false };
  const commentBody = `@cursor\nIssue: #${issueNumber}\nPR: #${prNumber}\nBranch: ${branch}\nReviewed head: ${reviewedHeadSha}\nScope: ${scope}\nModel: Grok 4.6 High (cursor-grok-4.6-high), Fast off (fast: false).\nReturn a bound terminal receipt with the canonical https://cursor.com/agents/<id> thread URL, separate agentId/runId, input/output digests, and exact branch/head evidence. Do not write prospect copy.`;
  return { schemaVersion: 'factory-cursor-dispatch-v1', issueNumber, prNumber, branch, reviewedHeadSha, scope, model, commentBody, dispatchDigest: digest({ issueNumber, prNumber, branch, reviewedHeadSha, scope, model, commentBody }) };
}

module.exports = { CURSOR_ALIAS, CURSOR_MODEL, canonicalThreadUrl, validateModelAttestation, validateDispatchPacket, validateJobReceipt, validateBundle, createDispatchPacket };
