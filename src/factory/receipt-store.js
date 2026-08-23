'use strict';

const fs = require('node:fs');
const path = require('node:path');

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

module.exports = { createFileReceiptStore, readJson, writeJson };
