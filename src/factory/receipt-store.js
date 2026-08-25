'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { digest } = require('./prescription-policy');

function operationKey(provider, operation, input) {
  return `${provider}:${operation}:${digest(input)}`;
}

function receiptArtifactBinding({ handoffId, dispatchKey, outputDigest, phaseARunId, outcome = 'phase-b' } = {}) {
  for (const [name, value] of Object.entries({ handoffId, dispatchKey, outputDigest, phaseARunId })) {
    if (!value) throw new Error(`receipt artifact binding ${name} is required`);
  }
  const key = digest({ handoffId: String(handoffId), dispatchKey: String(dispatchKey), outputDigest: String(outputDigest), phaseARunId: String(phaseARunId) });
  return { outcome: String(outcome), handoffId: String(handoffId), dispatchKey: String(dispatchKey), outputDigest: String(outputDigest), phaseARunId: String(phaseARunId), name: `factory-paid-receipts-${key.slice(0, 32)}` };
}

function operationArtifactBinding({ operationKey, provider, operation, inputDigest, requestDigest, idempotencyKey, requestProjection = null, context = {}, responseDigest = null, stage = 'pre-post', artifactIdentity = null } = {}) {
  for (const [name, value] of Object.entries({ operationKey, provider, operation, inputDigest, requestDigest, idempotencyKey })) {
    if (!value) throw new Error(`operation artifact binding ${name} is required`);
  }
  const content = { schemaVersion: 'factory-paid-operation-artifact-v1', stage, operationKey: String(operationKey), provider: String(provider), operation: String(operation), inputDigest: String(inputDigest), requestDigest: String(requestDigest), idempotencyKey: String(idempotencyKey), requestProjection: requestProjection || null, context, ...(responseDigest ? { responseDigest: String(responseDigest) } : {}) };
  const contentDigest = digest(content);
  const suffix = contentDigest.slice(0, 32);
  const identity = artifactIdentity || {};
  return {
    ...content,
    artifactName: identity.artifactName || `factory-paid-operation-${stage}-${suffix}`,
    artifactId: identity.artifactId || `operation-artifact:${suffix}`,
    artifactDigest: identity.artifactDigest || contentDigest,
    artifactContentDigest: identity.artifactContentDigest || contentDigest,
    artifactOrigin: identity.artifactOrigin || 'test-fixture',
  };
}

// Verify the bytes of a prepared/accepted operation artifact, rather than
// trusting the identity fields that an untrusted caller can rewrite.  The
// workflow artifact and the adapter use this same projection, so a mutation
// of the request, operation, context, or digest is fail-closed before POST.
function verifyOperationArtifact(artifact, { stage = null, provider = null, operation = null, operationKey = null, requestDigest = null, idempotencyKey = null, context = null } = {}) {
  if (!artifact || typeof artifact !== 'object') throw new Error('paid operation artifact is missing');
  const requiredFields = ['schemaVersion', 'stage', 'operationKey', 'provider', 'operation', 'inputDigest', 'requestDigest', 'idempotencyKey', 'requestProjection', 'context', 'artifactName', 'artifactId', 'artifactDigest', 'artifactContentDigest', 'artifactOrigin'];
  for (const field of requiredFields) if (artifact[field] == null || artifact[field] === '') throw new Error(`paid operation artifact ${field} is missing`);
  if (artifact.schemaVersion !== 'factory-paid-operation-artifact-v1') throw new Error('paid operation artifact schema is unsupported');
  if (stage && artifact.stage !== stage) throw new Error('paid operation artifact stage is mismatched');
  if (provider && artifact.provider !== provider) throw new Error('paid operation artifact provider is mismatched');
  if (operation && artifact.operation !== operation) throw new Error('paid operation artifact operation is mismatched');
  if (operationKey && artifact.operationKey !== operationKey) throw new Error('paid operation artifact operation key is mismatched');
  if (requestDigest && artifact.requestDigest !== requestDigest) throw new Error('paid operation artifact request digest is mismatched');
  if (idempotencyKey && artifact.idempotencyKey !== idempotencyKey) throw new Error('paid operation artifact idempotency key is mismatched');
  if (context && JSON.stringify(artifact.context) !== JSON.stringify(context)) throw new Error('paid operation artifact context is mismatched');
  const content = {
    schemaVersion: artifact.schemaVersion,
    stage: artifact.stage,
    operationKey: artifact.operationKey,
    provider: artifact.provider,
    operation: artifact.operation,
    inputDigest: artifact.inputDigest,
    requestDigest: artifact.requestDigest,
    idempotencyKey: artifact.idempotencyKey,
    requestProjection: artifact.requestProjection,
    ...(Object.prototype.hasOwnProperty.call(artifact, 'responseDigest') ? { responseDigest: artifact.responseDigest } : {}),
    context: artifact.context,
    ...(Object.prototype.hasOwnProperty.call(artifact, 'response') ? { response: artifact.response } : {}),
  };
  const contentDigest = digest(content);
  if (artifact.artifactContentDigest !== contentDigest || artifact.artifactDigest !== contentDigest) throw new Error('paid operation artifact content digest is invalid');
  return artifact;
}

async function persistOperationCheckpoint(store, key, binding) {
  const put = typeof store?.put === 'function' ? store.put.bind(store) : typeof store?.set === 'function' ? async (name, value) => store.set(name, value) : null;
  if (!put) throw new TypeError('receiptStore must implement put');
  if (!binding?.artifactName || !binding.artifactId || !binding.artifactDigest || !binding.artifactContentDigest) throw new Error('paid operation checkpoint artifact identity is incomplete');
  if (!['github-actions', 'test-fixture'].includes(binding.artifactOrigin)) throw new Error('paid operation checkpoint artifact origin is invalid');
  const checkpoint = { schemaVersion: 'factory-paid-operation-checkpoint-v1', ...binding, checkpointKey: key, persistedAt: new Date().toISOString() };
  await put(`checkpoint:${key}`, checkpoint);
  return checkpoint;
}

async function persistOperationIntent(store, key, { provider, operation, input, context = {}, metadata = {}, startedAt = new Date().toISOString() } = {}) {
  const put = typeof store?.put === 'function' ? store.put.bind(store) : typeof store?.set === 'function' ? async (name, value) => store.set(name, value) : null;
  if (!put) throw new TypeError('receiptStore must implement put');
  if (!provider || !operation || input == null) throw new Error('paid operation intent requires provider, operation, and input');
  const intent = {
    schemaVersion: 'factory-paid-operation-v1',
    operationKey: key || operationKey(provider, operation, input),
    provider, operation, status: 'intent', startedAt,
    input, inputDigest: digest(input), context, ...metadata,
  };
  await put(`intent:${intent.operationKey}`, intent);
  await put(intent.operationKey, intent);
  return intent;
}

async function persistOperationState(store, key, state) {
  const put = typeof store?.put === 'function' ? store.put.bind(store) : typeof store?.set === 'function' ? async (name, value) => store.set(name, value) : null;
  if (!put) throw new TypeError('receiptStore must implement put');
  if (!state || state.operationKey !== key) throw new Error('paid operation state key is mismatched');
  const next = { schemaVersion: 'factory-paid-operation-v1', ...state, inputDigest: state.inputDigest || digest(state.input), outputDigest: state.outputDigest || (state.result != null ? digest(state.result) : null) };
  // Keep the immutable pre-call intent record intact; the operation key holds
  // the advancing vendor/run/output state used for recovery.
  await put(key, next);
  return next;
}

function readJson(filename) {
  if (!fs.existsSync(filename)) return { schemaVersion: 1, receipts: {} };
  const value = JSON.parse(fs.readFileSync(filename, 'utf8'));
  if (value.schemaVersion !== 1 || !value.receipts || typeof value.receipts !== 'object') {
    throw new Error('Unsupported vendor receipt store schema');
  }
  return value;
}

function writeJson(filename, value) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(temporary, filename);
}

function createFileReceiptStore(root) {
  if (!root) throw new TypeError('root is required');
  const filename = path.join(root, 'state', 'vendor-receipts.json');
  return {
    filename,
    async get(key) {
      return readJson(filename).receipts[key];
    },
    async put(key, receipt) {
      const state = readJson(filename);
      state.receipts[key] = receipt;
      state.updatedAt = new Date().toISOString();
      writeJson(filename, state);
      return receipt;
    },
    async values() {
      return Object.values(readJson(filename).receipts);
    },
  };
}

module.exports = { createFileReceiptStore, readJson, writeJson, operationKey, receiptArtifactBinding, operationArtifactBinding, verifyOperationArtifact, persistOperationCheckpoint, persistOperationIntent, persistOperationState };
