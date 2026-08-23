#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { runOne } = require('./factory/control-plane');
const { runFactoryCycle } = require('./factory/orchestrator');

function loadConfig(root) {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'config', 'factory.config.json'), 'utf8'));
  if (config.productionCapacity !== 1) throw new Error('productionCapacity must be exactly 1');
  if (config.cursorModel !== 'cursor-grok-4.6-high' || config.cursorFastMode !== false) {
    throw new Error('Cursor model must be cursor-grok-4.6-high with Fast off');
  }
  return config;
}

function parseArgs(argv) {
  const result = { json: false, candidate: null, decision: null, adapters: null, owner: 'architect' };
  for (let index = 2; index < argv.length; index += 1) {
    if (argv[index] === '--json') result.json = true;
    else if (argv[index] === '--candidate') result.candidate = argv[++index];
    else if (argv[index] === '--decision') result.decision = argv[++index];
    else if (argv[index] === '--adapters') result.adapters = argv[++index];
    else if (argv[index] === '--owner') result.owner = argv[++index];
  }
  return result;
}

function main(argv = process.argv) {
  const args = parseArgs(argv);
  const root = process.cwd();
  const candidate = args.candidate
    ? JSON.parse(fs.readFileSync(path.resolve(root, args.candidate), 'utf8'))
    : null;
  const config = loadConfig(root);
  const decision = args.decision ? JSON.parse(fs.readFileSync(path.resolve(root, args.decision), 'utf8')) : {};
  const result = args.adapters
    ? runFactoryCycle({ root, config, architectDecision: decision, owner: args.owner, adapters: require(path.resolve(root, args.adapters)) })
    : runOne({ root, config, candidate, owner: args.owner });
  if (result && typeof result.then === 'function') {
    return result.then((resolved) => {
      process.stdout.write(`${args.json ? JSON.stringify(resolved, null, 2) : resolved.code}\n`);
      return resolved;
    });
  }
  process.stdout.write(`${args.json ? JSON.stringify(result, null, 2) : result.code}\n`);
  return result;
}

if (require.main === module) Promise.resolve(main()).catch((error) => { console.error(error.stack || error); process.exitCode = 1; });

module.exports = { loadConfig, parseArgs, main };
