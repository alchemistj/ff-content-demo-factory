#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createDispatchPacket } = require('./factory/cloud-agent');
const { validatePendingHandoff } = require('./factory/handoff');

function required(value, name) { if (!value) throw new Error(`${name} is required`); return value; }

function main(env = process.env) {
  const pending = env.FACTORY_PENDING_FILE ? JSON.parse(fs.readFileSync(path.resolve(env.FACTORY_PENDING_FILE), 'utf8')) : null;
  if (pending) {
    validatePendingHandoff(pending);
  }
  const packet = pending ? pending.dispatchPacket : createDispatchPacket({
    issueNumber: Number(required(env.FACTORY_ISSUE_NUMBER, 'FACTORY_ISSUE_NUMBER')),
    prNumber: Number(required(env.FACTORY_PR_NUMBER, 'FACTORY_PR_NUMBER')),
    branch: required(env.FACTORY_BRANCH, 'FACTORY_BRANCH'),
    reviewedHeadSha: required(env.FACTORY_REVIEWED_HEAD_SHA, 'FACTORY_REVIEWED_HEAD_SHA'),
    scope: required(env.FACTORY_DISPATCH_SCOPE, 'FACTORY_DISPATCH_SCOPE'),
    repository: required(env.FACTORY_REPOSITORY, 'FACTORY_REPOSITORY'),
  });
  if (!Number.isInteger(packet.issueNumber) || !Number.isInteger(packet.prNumber)) throw new Error('dispatch issue/PR numbers must be integers');
  const output = path.resolve(env.FACTORY_DISPATCH_OUTPUT || 'canary/outputs/cursor-dispatch.json');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(packet, null, 2)}\n`);
  const comment = `${packet.commentBody}\nDispatch packet digest: ${packet.dispatchDigest}`;
  fs.writeFileSync(output.replace(/\.json$/i, '.comment.md'), `${comment}\n`);
  return packet;
}

if (require.main === module) {
  try { process.stdout.write(`${JSON.stringify(main(), null, 2)}\n`); } catch (error) { console.error(error.stack || error.message); process.exitCode = 1; }
}

module.exports = { main };
