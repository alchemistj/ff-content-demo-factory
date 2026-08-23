#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { runOne } = require('./factory/control-plane');
const { runFactoryCycle } = require('./factory/orchestrator');
const { createProductionAdapters } = require('./factory/production-adapters');
const { createSeededDiscoveryAdapter, validateSeededDiscoveryPacket } = require('./adapters/seeded-discovery');

function loadConfig(root) {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'config', 'factory.config.json'), 'utf8'));
  if (config.productionCapacity !== 1) throw new Error('productionCapacity must be exactly 1');
  if (config.cursorModel !== 'cursor-grok-4.6-high' || config.cursorFastMode !== false) {
    throw new Error('Cursor model must be cursor-grok-4.6-high with Fast off');
  }
  return config;
}

function parseArgs(argv) {
  const result = { json: false, production: false, candidate: null, decision: null, request: null, adapters: null, seedDiscovery: null, owner: 'architect' };
  const valueAfter = (index, flag) => {
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${flag} requires a file or value`);
    return value;
  };
  for (let index = 2; index < argv.length; index += 1) {
    if (argv[index] === '--json') result.json = true;
    else if (argv[index] === '--production') result.production = true;
    else if (argv[index] === '--candidate') result.candidate = valueAfter(index++, '--candidate');
    else if (argv[index] === '--decision') result.decision = valueAfter(index++, '--decision');
    else if (argv[index] === '--request') result.request = valueAfter(index++, '--request');
    else if (argv[index] === '--adapters') result.adapters = valueAfter(index++, '--adapters');
    else if (argv[index] === '--seed-discovery') result.seedDiscovery = valueAfter(index++, '--seed-discovery');
    else if (argv[index] === '--owner') result.owner = valueAfter(index++, '--owner');
    else throw new Error(`Unknown option: ${argv[index]}`);
  }
  if (result.production && result.adapters) throw new Error('--production and --adapters are mutually exclusive');
  if (result.seedDiscovery && !result.production) throw new Error('--seed-discovery requires --production');
  if ((result.production || result.adapters) && result.candidate) throw new Error('--candidate is queue-only and cannot be combined with a factory cycle');
  if (!result.production && !result.adapters && (result.request || result.seedDiscovery)) throw new Error('--request and --seed-discovery require --production or --adapters');
  return result;
}

function readJson(root, filename) {
  return JSON.parse(fs.readFileSync(path.resolve(root, filename), 'utf8'));
}

function composeProductionRun({ root, config, args, request, adapterFactory = createProductionAdapters }) {
  const adapters = adapterFactory({ root, config, env: process.env });
  if (!args.seedDiscovery) return { adapters, request };
  const packetPath = path.resolve(root, args.seedDiscovery);
  const packet = validateSeededDiscoveryPacket(readJson(root, packetPath));
  return {
    adapters: { ...adapters, discovery: createSeededDiscoveryAdapter({ packet }) },
    request: request || packet.request,
  };
}

function resultCode(result) {
  return result?.nextAction?.code || result?.code || (result?.ok ? 'OK' : 'UNKNOWN');
}

function safeError(error, env = process.env) {
  let value = String(error?.stack || error?.message || error);
  for (const secret of [env.APIFY_API_TOKEN, env.CURSOR_API_KEY].filter(Boolean)) value = value.split(secret).join('[redacted]');
  return value.replace(/Bearer\s+\S+/gi, 'Bearer [redacted]').replace(/(api[_ -]?key|token)\s*[:=]\s*\S+/gi, '$1=[redacted]');
}

function main(argv = process.argv, dependencies = {}) {
  const args = parseArgs(argv);
  const root = process.cwd();
  const candidate = args.candidate
    ? readJson(root, args.candidate)
    : null;
  const config = loadConfig(root);
  const decision = args.decision ? readJson(root, args.decision) : {};
  let request = args.request ? readJson(root, args.request) : null;
  const loadedAdapters = args.adapters ? require(path.resolve(root, args.adapters)) : null;
  let adapters = loadedAdapters?.adapters || loadedAdapters?.default || loadedAdapters;
  if (args.production) {
    const composed = composeProductionRun({ root, config, args, request, adapterFactory: dependencies.createProductionAdapters || createProductionAdapters });
    adapters = composed.adapters;
    request = composed.request;
  }
  const result = args.production || args.adapters
    ? runFactoryCycle({ root, config, discoveryRequest: request, architectDecision: decision, owner: args.owner, adapters })
    : runOne({ root, config, candidate, owner: args.owner });
  if (result && typeof result.then === 'function') {
    return result.then((resolved) => {
      process.stdout.write(`${args.json ? JSON.stringify(resolved, null, 2) : resultCode(resolved)}\n`);
      return resolved;
    });
  }
  process.stdout.write(`${args.json ? JSON.stringify(result, null, 2) : resultCode(result)}\n`);
  return result;
}

if (require.main === module) Promise.resolve().then(() => main()).catch((error) => { console.error(safeError(error)); process.exitCode = 1; });

module.exports = { loadConfig, parseArgs, readJson, composeProductionRun, resultCode, safeError, main };
