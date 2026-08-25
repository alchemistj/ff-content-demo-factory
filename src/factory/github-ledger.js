'use strict';

const { digest } = require('./prescription-policy');

const SCHEMA_VERSION = 'factory-cursor-github-ledger-v1';

function required(value, label) {
  if (value == null || String(value).trim() === '') throw new Error(`${label} is required`);
  return value;
}

function markerFor({ kind, repository, issueNumber, prNumber, branch, checkedOutSha, handoffId, dispatchKey, resultId, inputDigest, outputDigest, threadUrl, model, status = 'consumed' }) {
  const marker = {
    schemaVersion: SCHEMA_VERSION,
    kind: required(kind, 'ledger marker kind'),
    repository: required(repository, 'ledger marker repository'),
    issueNumber: required(issueNumber, 'ledger marker issue number'),
    prNumber: required(prNumber, 'ledger marker PR number'),
    branch: required(branch, 'ledger marker branch'),
    checkedOutSha: required(checkedOutSha, 'ledger marker checked-out head'),
    handoffId: required(handoffId, 'ledger marker handoff id'),
    dispatchKey: required(dispatchKey, 'ledger marker dispatch key'),
    resultId: resultId == null ? null : String(resultId),
    inputDigest: inputDigest || null,
    outputDigest: outputDigest || null,
    threadUrl: threadUrl || null,
    model: model || null,
    status,
  };
  marker.markerDigest = digest(marker);
  return marker;
}

function markerBody(marker) {
  if (!marker || marker.schemaVersion !== SCHEMA_VERSION || marker.markerDigest !== digest({ ...marker, markerDigest: undefined })) throw new Error('Ledger marker is stale or invented');
  return `FACTORY_CURSOR_LEDGER_V1\n${JSON.stringify(marker)}`;
}

function parseMarker(body) {
  const text = String(body || '');
  if (!text.startsWith('FACTORY_CURSOR_LEDGER_V1\n')) return null;
  let marker;
  try { marker = JSON.parse(text.slice('FACTORY_CURSOR_LEDGER_V1\n'.length)); } catch { throw new Error('Cursor ledger marker JSON is malformed'); }
  if (marker.schemaVersion !== SCHEMA_VERSION || marker.markerDigest !== digest({ ...marker, markerDigest: undefined })) throw new Error('Cursor ledger marker digest is stale or invented');
  return marker;
}

function authoritativeMarkers(comments, expected) {
  const repository = required(expected.repository, 'ledger expected repository');
  const issueNumber = String(required(expected.issueNumber, 'ledger expected issue'));
  return (comments || []).flatMap((comment) => {
    if (comment?.user?.login && comment.user.login !== expected.ownerLogin && !['github-actions[bot]', 'cursor[bot]'].includes(comment.user.login)) return [];
    const url = String(comment?.html_url || comment?.url || '');
    if (!new RegExp(`^https://github\\.com/${repository.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}/issues/${issueNumber}#issuecomment-[0-9]+$`).test(url)) return [];
    const marker = parseMarker(comment.body);
    return marker ? [{ ...marker, commentId: String(comment.id), commentUrl: url }] : [];
  }).filter((marker) => marker.repository === repository && String(marker.issueNumber) === issueNumber);
}

function findClaim(comments, expected) {
  return authoritativeMarkers(comments, expected).find((marker) => marker.kind === expected.kind && marker.handoffId === expected.handoffId && marker.dispatchKey === expected.dispatchKey && (expected.resultId == null || marker.resultId === String(expected.resultId))) || null;
}

module.exports = { SCHEMA_VERSION, markerFor, markerBody, parseMarker, authoritativeMarkers, findClaim };
