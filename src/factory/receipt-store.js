'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { digest } = require('./prescription-policy');

function operationKey(provider, operation, input) {
  return `${provider}:${operation}:${digest(input)}`;
}

async function persistOperationIntent(store, key, { provider, operation, input, context = {}, startedAt = new Date().toISOString() } = {}) {
  const put = typeof store?.put === 'function' ? store.put.bind(store) : typeof store?.set === 'function' ? async (name, value) => store.set(name, value) : null;
  if (!put) throw new TypeError('receiptStore must implement put');
  if (!provider || !operation || input == null) throw new Error('paid operation intent requires provider, operation, and input');
  const intent = {
    schemaVersion: 'factory-paid-operation-v1',
    operationKey: key || operationKey(provider, operation, input),
    provider, operation, status: 'intent', startedAt,
    input, inputDigest: digest(input), context,
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

module.exports = { createFileReceiptStore, readJson, writeJson, operationKey, persistOperationIntent, persistOperationState };
