#!/usr/bin/env node
'use strict';

const fs = require('node:fs');

function required(value, name) {
  if (value == null || String(value).trim() === '') throw new Error(`${name} is required`);
  return String(value);
}

function markerValue(body, label) {
  const line = String(body || '').split(/\r?\n/).find((entry) => entry.startsWith(`${label}:`));
  return line ? line.slice(label.length + 1).trim() : null;
}

function selectNewestDispatchComment(comments, expected = {}) {
  const digest = expected.dispatchDigest ? String(expected.dispatchDigest) : null;
  const key = expected.dispatchKey ? String(expected.dispatchKey) : null;
  const repository = expected.repository ? String(expected.repository) : null;
  const prNumber = expected.prNumber == null ? null : String(expected.prNumber);
  const branch = expected.branch ? String(expected.branch) : null;
  const reviewedHead = expected.reviewedHead || expected.reviewedHeadSha ? String(expected.reviewedHead || expected.reviewedHeadSha) : null;
  const handoffId = expected.handoffId ? String(expected.handoffId) : null;
  const phaseARunId = expected.phaseARunId || expected.phaseARun ? String(expected.phaseARunId || expected.phaseARun) : null;
  const inputDigest = expected.inputDigest || expected.inputManifestDigest ? String(expected.inputDigest || expected.inputManifestDigest) : null;
  const sourceCheckpointDigest = expected.sourceCheckpointDigest ? String(expected.sourceCheckpointDigest) : null;
  const sourceManifestDigest = expected.sourceManifestDigest ? String(expected.sourceManifestDigest) : null;
  const jobDigest = expected.jobDigest ? String(expected.jobDigest) : null;
  return (comments || []).filter((comment) => {
    const body = String(comment?.body || '');
    const url = String(comment?.html_url || '');
    if (!body.startsWith('@cursor')) return false;
    if (repository && !new RegExp(`^https://github\\.com/${repository.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}/pull/${prNumber}#issuecomment-[0-9]+$`).test(url)) return false;
    if (branch && markerValue(body, 'Branch') !== branch) return false;
    if (reviewedHead && markerValue(body, 'Reviewed head') !== reviewedHead) return false;
    if (handoffId && markerValue(body, 'Handoff ID') !== handoffId) return false;
    if (phaseARunId && markerValue(body, 'Phase-A run') !== phaseARunId) return false;
    if (inputDigest && markerValue(body, 'Input manifest digest') !== inputDigest) return false;
    if (sourceCheckpointDigest && markerValue(body, 'Source checkpoint digest') !== sourceCheckpointDigest) return false;
    if (sourceManifestDigest && markerValue(body, 'Source manifest digest') !== sourceManifestDigest) return false;
    if (jobDigest && markerValue(body, 'Job digest') !== jobDigest) return false;
    return (!digest || markerValue(body, 'Dispatch packet digest') === digest)
      && (!key || markerValue(body, 'Dispatch key') === key)
      && markerValue(body, 'Handoff ID') != null
      && markerValue(body, 'Phase-A run') != null
      && markerValue(body, 'Dispatch workflow run') != null;
  }).sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')) || Number(b.id) - Number(a.id))[0] || null;
}

function main(argv = process.argv.slice(2)) {
  const commentsFile = required(argv[0], 'comments JSON file');
  const expected = JSON.parse(argv[1] || '{}');
  const comments = JSON.parse(fs.readFileSync(commentsFile, 'utf8'));
  const selected = selectNewestDispatchComment(comments, expected);
  if (!selected) throw new Error('No newest valid context-bound @cursor dispatch comment found');
  return selected;
}

if (require.main === module) {
  try { process.stdout.write(`${JSON.stringify(main())}\n`); } catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { selectNewestDispatchComment, markerValue };
