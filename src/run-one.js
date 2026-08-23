#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { runOne } = require('./factory/control-plane');

function loadConfig(root) {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'config', 'factory.config.json'), 'utf8'));
  if (config.productionCapacity !== 1) throw new Error('productionCapacity must be exactly 1');
  if (config.cursorModel !== 'cursor-grok-4.6-high' || config.cursorFastMode !== false) {
    throw new Error('Cursor model must be cursor-grok-4.6-high with Fast off');
  }
  return config;
}

function parseArgs(argv) {
  const result = { json: false, candidate: null, owner: 'architect' };
  for (let index = 2; index < argv.length; index += 1) {
    if (argv[index] === '--json') result.json = true;
    else if (argv[index] === '--candidate') result.candidate = argv[++index];
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
  const result = runOne({ root, config: loadConfig(root), candidate, owner: args.owner });
  process.stdout.write(`${args.json ? JSON.stringify(result, null, 2) : result.code}\n`);
  return result;
}

if (require.main === module) main();

module.exports = { loadConfig, parseArgs, main };
