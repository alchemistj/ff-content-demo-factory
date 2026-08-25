#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { digest } = require('../src/factory/prescription-policy');
const { resolveTrustedArtifact, artifactIdentityKey } = require('../src/factory/trusted-artifacts');
const { verifySealed360Lineage } = require('../src/factory/sealed-evidence');

const REGISTRY_KEY = '32717620900:9516514426:81587f8422a23313fd7868751061eec7e2fb5926';
const REQUIRED_FILES = [
  'canary/inputs/360-four-page-reseal-approval.json',
  'canary/inputs/360-four-page-reseal-ledger.json',
  'canary/inputs/360-garage-door-and-more.discovery.json',
  'canary/outputs/360-four-page-reseal-handoff.json',
];

function byteDigest(file) { return `sha256:${crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}`; }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function fail(message) { throw new Error(`trusted checkpoint restore: ${message}`); }

function validateMetadata(metadata, trusted) {
  if (!metadata || typeof metadata !== 'object') fail('GitHub artifact metadata is missing');
  if (String(metadata.id) !== trusted.artifactId || String(metadata.name) !== trusted.archiveName) fail('registered artifact id/name mismatch');
  if (metadata.expired === true) fail('registered GitHub artifact is expired');
  const run = metadata.workflow_run || {};
  if (String(run.id) !== trusted.runId || String(run.head_sha) !== trusted.sourceSha) fail('registered workflow run/source SHA mismatch');
  if (run.repository?.full_name && run.repository.full_name !== 'alchemistj/ff-content-demo-factory') fail('workflow artifact belongs to a foreign repository');
}

function safeArchiveEntries(zipFile) {
  let listing;
  try { listing = execFileSync('unzip', ['-Z1', zipFile], { encoding: 'utf8' }); } catch (error) { fail(`cannot list archive: ${error.message}`); }
  const entries = listing.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean);
  for (const entry of entries) {
    if (entry.startsWith('/') || /^[A-Za-z]:/.test(entry) || entry.includes('\\') || entry.split('/').includes('..')) fail(`unsafe archive path: ${entry}`);
  }
  return entries;
}

function validateMaterial(root, trusted) {
  for (const file of REQUIRED_FILES) {
    const absolute = path.join(root, file);
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) fail(`required source file is missing: ${file}`);
  }
  const expectedFiles = {
    'canary/inputs/360-four-page-reseal-approval.json': trusted.approvalFileDigest,
    'canary/inputs/360-four-page-reseal-ledger.json': trusted.ledgerFileDigest,
    'canary/inputs/360-garage-door-and-more.discovery.json': trusted.discoveryFileDigest,
    'canary/outputs/360-four-page-reseal-handoff.json': trusted.handoffFileDigest,
  };
  for (const [file, expected] of Object.entries(expectedFiles)) if (byteDigest(path.join(root, file)) !== expected) fail(`source file digest mismatch: ${file}`);
  const handoff = readJson(path.join(root, REQUIRED_FILES[3]));
  const lineage = verifySealed360Lineage({ root, handoff });
  for (const field of ['sourceArtifactDigest', 'sourceManifestDigest', 'evidenceDigest', 'pageSetDigest', 'prescriptionDigest', 'approvalDigest', 'strategyDigest']) if (lineage[field] !== trusted[field]) fail(`internal lineage digest mismatch: ${field}`);
  const ledger = readJson(path.join(root, REQUIRED_FILES[1]));
  if (ledger.sourceIdentity?.runId !== trusted.runId || String(ledger.sourceIdentity?.artifactId) !== trusted.artifactId || ledger.sourceIdentity?.sourceSha !== trusted.sourceSha || ledger.sourceIdentity?.archiveSha256 !== trusted.archiveSha256) fail('source identity does not match registry');
  return { lineage, files: Object.entries(expectedFiles).map(([file, expected]) => ({ path: file, digest: expected })) };
}

function restore({ zipFile, destination, metadataFile, currentRunId = null, currentHeadSha = null } = {}) {
  if (!zipFile || !destination || !metadataFile) fail('zip, destination, and metadata file are required');
  const trusted = resolveTrustedArtifact(REGISTRY_KEY);
  if (artifactIdentityKey(trusted) !== REGISTRY_KEY) fail('registry key is not immutable');
  const metadata = readJson(metadataFile);
  validateMetadata(metadata, trusted);
  const archiveSha = crypto.createHash('sha256').update(fs.readFileSync(zipFile)).digest('hex');
  if (archiveSha !== trusted.archiveSha256) fail('archive SHA-256 does not match registry');
  const entries = safeArchiveEntries(zipFile);
  for (const file of REQUIRED_FILES) if (!entries.includes(file)) fail(`archive does not contain required path: ${file}`);
  fs.mkdirSync(destination, { recursive: true });
  try { execFileSync('unzip', ['-q', zipFile, '-d', destination], { stdio: 'pipe' }); } catch (error) { fail(`archive extraction failed: ${error.message}`); }
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => { const absolute = path.join(dir, entry.name); if (entry.isSymbolicLink()) fail(`symbolic link in archive: ${path.relative(dir, absolute)}`); return entry.isDirectory() ? walk(absolute) : [absolute]; });
  walk(destination);
  const verified = validateMaterial(destination, trusted);
  const manifest = { schemaVersion: 'factory-trusted-github-checkpoint-manifest-v1', registryKey: REGISTRY_KEY, repository: 'alchemistj/ff-content-demo-factory', original: { runId: trusted.runId, artifactId: trusted.artifactId, sourceSha: trusted.sourceSha, archiveName: trusted.archiveName, archiveDigest: trusted.archiveDigest }, extracted: verified.files, internal: { sourceArtifactDigest: trusted.sourceArtifactDigest, sourceManifestDigest: trusted.sourceManifestDigest, evidenceDigest: trusted.evidenceDigest, pageSetDigest: trusted.pageSetDigest, prescriptionDigest: trusted.prescriptionDigest, approvalDigest: trusted.approvalDigest, strategyDigest: trusted.strategyDigest }, current: { workflowRunId: currentRunId || null, workflowArtifactId: null, checkedOutSha: currentHeadSha || null } };
  manifest.manifestDigest = digest(manifest);
  fs.writeFileSync(path.join(destination, 'trusted-checkpoint-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

if (require.main === module) {
  const [, , zipFile, destination, metadataFile] = process.argv;
  process.stdout.write(`${JSON.stringify(restore({ zipFile, destination, metadataFile, currentRunId: process.env.GITHUB_RUN_ID, currentHeadSha: process.env.FACTORY_CHECKED_OUT_SHA }), null, 2)}\n`);
}

module.exports = { REGISTRY_KEY, REQUIRED_FILES, restore, validateMaterial, validateMetadata, safeArchiveEntries };
