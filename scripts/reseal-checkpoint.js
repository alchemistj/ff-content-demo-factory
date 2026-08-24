#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { resealNoVendor } = require('../src/factory/no-vendor-reseal');

function value(argv, index, flag) {
  const next = argv[index + 1];
  if (!next || next.startsWith('--')) throw new Error(`${flag} requires a path`);
  return next;
}

function parseArgs(argv) {
  const result = { checkpoint: null, state: null, artifactRoot: null, artifactArchive: null, identityKey: null, ledger: null, approval: null, output: null };
  for (let index = 2; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === '--checkpoint') result.checkpoint = value(argv, index++, flag);
    else if (flag === '--state') result.state = value(argv, index++, flag);
    else if (flag === '--artifact-root') result.artifactRoot = value(argv, index++, flag);
    else if (flag === '--artifact-archive') result.artifactArchive = value(argv, index++, flag);
    else if (flag === '--identity-key') result.identityKey = value(argv, index++, flag);
    else if (flag === '--ledger') result.ledger = value(argv, index++, flag);
    else if (flag === '--approval') result.approval = value(argv, index++, flag);
    else if (flag === '--output') result.output = value(argv, index++, flag);
    else throw new Error(`unknown option: ${flag}`);
  }
  for (const key of ['checkpoint', 'state', 'artifactRoot', 'artifactArchive', 'identityKey', 'ledger', 'approval', 'output']) if (!result[key]) throw new Error(`--${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)} is required`);
  return result;
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(path.resolve(filename), 'utf8'));
}

function main(argv = process.argv) {
  const args = parseArgs(argv);
  const result = resealNoVendor({ checkpoint: readJson(args.checkpoint), state: readJson(args.state), artifactRoot: args.artifactRoot, artifactArchivePath: args.artifactArchive, identityKey: args.identityKey, canonicalServiceLedger: readJson(args.ledger), approval: readJson(args.approval) });
  fs.mkdirSync(path.dirname(path.resolve(args.output)), { recursive: true });
  fs.writeFileSync(path.resolve(args.output), `${JSON.stringify(result.handoff, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ ok: true, output: path.resolve(args.output), resealDigest: result.handoff.resealDigest, noVendorReseal: true })}\n`);
  return result;
}

if (require.main === module) {
  try { main(); } catch (error) { process.stderr.write(`${error.stack || error.message}\n`); process.exitCode = 1; }
}

module.exports = { parseArgs, readJson, main };
