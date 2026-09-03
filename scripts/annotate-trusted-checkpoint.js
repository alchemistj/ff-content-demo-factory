#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const { digest } = require('../src/factory/prescription-policy');
const { resolveTrustedArtifact } = require('../src/factory/trusted-artifacts');
const { REGISTRY_KEY } = require('./restore-trusted-checkpoint');

function annotate(filename, { workflowArtifactId, workflowRunId, checkedOutSha } = {}) {
  if (!filename || !workflowArtifactId || !workflowRunId || !checkedOutSha) throw new Error('trusted checkpoint bridge annotation requires current artifact/run/head');
  const manifest = JSON.parse(fs.readFileSync(filename, 'utf8'));
  const trusted = resolveTrustedArtifact(REGISTRY_KEY);
  if (manifest.registryKey !== REGISTRY_KEY || manifest.original?.artifactId !== trusted.artifactId || manifest.original?.runId !== trusted.runId || manifest.original?.sourceSha !== trusted.sourceSha) throw new Error('trusted checkpoint bridge registry identity is invalid');
  const unsigned = { ...manifest };
  delete unsigned.manifestDigest;
  unsigned.current = { workflowRunId: String(workflowRunId), workflowArtifactId: String(workflowArtifactId), checkedOutSha: String(checkedOutSha) };
  unsigned.manifestDigest = digest(unsigned);
  fs.writeFileSync(filename, `${JSON.stringify(unsigned, null, 2)}\n`);
  return unsigned;
}

if (require.main === module) {
  const [, , filename, workflowArtifactId, workflowRunId, checkedOutSha] = process.argv;
  process.stdout.write(`${JSON.stringify(annotate(filename, { workflowArtifactId, workflowRunId, checkedOutSha }), null, 2)}\n`);
}

module.exports = { annotate };
