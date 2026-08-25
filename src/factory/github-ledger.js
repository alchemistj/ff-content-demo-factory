'use strict';

const { digest } = require('./prescription-policy');

const SCHEMA_VERSION = 'factory-cursor-github-ledger-v1';
const STATES = Object.freeze(['claimed', 'preparing', 'posted', 'in_motion', 'terminal', 'phase_b_claimed', 'paid_prepared', 'paid_accepted', 'resumed']);
const TRANSITIONS = Object.freeze({ claimed: ['preparing'], preparing: ['posted'], posted: ['in_motion'], in_motion: ['terminal'], terminal: ['phase_b_claimed', 'resumed'], phase_b_claimed: ['paid_prepared', 'resumed'], paid_prepared: ['paid_accepted'], paid_accepted: ['resumed'], resumed: [] });

function required(value, label) {
  if (value == null || String(value).trim() === '') throw new Error(`${label} is required`);
  return value;
}

function contextFields(marker) {
  return {
    repository: marker.repository,
    issueNumber: marker.issueNumber,
    prNumber: marker.prNumber,
    branch: marker.branch,
    checkedOutSha: marker.checkedOutSha,
    handoffId: marker.handoffId,
    dispatchKey: marker.dispatchKey,
    dispatchDigest: marker.dispatchDigest || null,
    runId: marker.runId || null,
    prospectId: marker.prospectId || null,
    sourceCheckpointDigest: marker.sourceCheckpointDigest || null,
    sourceManifestDigest: marker.sourceManifestDigest || null,
    inputManifestDigest: marker.inputManifestDigest || null,
    jobId: marker.jobId || null,
    artifactName: marker.artifactName || null,
    artifactId: marker.artifactId || null,
    artifactDigest: marker.artifactDigest || null,
    artifactContentDigest: marker.artifactContentDigest || null,
    operationKey: marker.operationKey || null,
    requestDigest: marker.requestDigest || null,
    responseDigest: marker.responseDigest || null,
    operationState: marker.operationState || null,
    ownerToken: marker.ownerToken || marker.dispatchKey || null,
  };
}

function markerFor({ kind, repository, issueNumber, prNumber, branch, checkedOutSha, handoffId, dispatchKey, dispatchDigest, runId, prospectId, sourceCheckpointDigest, sourceManifestDigest, inputManifestDigest, jobId, ownerToken, resultId, inputDigest, outputDigest, threadUrl, model, commentId, commentUrl, artifactName, artifactId, artifactDigest, artifactContentDigest, operationKey, requestDigest, responseDigest, operationState, status = 'preparing' }) {
  if (!STATES.includes(status)) throw new Error(`Unknown ledger marker state: ${status}`);
  const marker = {
    schemaVersion: SCHEMA_VERSION,
    kind: required(kind, 'ledger marker kind'),
    ...contextFields({ repository: required(repository, 'ledger marker repository'), issueNumber: required(issueNumber, 'ledger marker issue number'), prNumber: required(prNumber, 'ledger marker PR number'), branch: required(branch, 'ledger marker branch'), checkedOutSha: required(checkedOutSha, 'ledger marker checked-out head'), handoffId: required(handoffId, 'ledger marker handoff id'), dispatchKey: required(dispatchKey, 'ledger marker dispatch key'), dispatchDigest, runId, prospectId, sourceCheckpointDigest, sourceManifestDigest, inputManifestDigest, jobId, artifactName, artifactId, artifactDigest, artifactContentDigest, operationKey, requestDigest, responseDigest, operationState, ownerToken }),
    resultId: resultId == null ? null : String(resultId),
    inputDigest: inputDigest || null,
    outputDigest: outputDigest || null,
    threadUrl: threadUrl || null,
    model: model || null,
    commentId: commentId == null ? null : String(commentId),
    commentUrl: commentUrl || null,
    artifactName: artifactName || null,
    artifactId: artifactId == null ? null : String(artifactId),
    artifactDigest: artifactDigest || null,
    artifactContentDigest: artifactContentDigest || null,
    status,
  };
  marker.markerDigest = digest({ ...marker, markerDigest: undefined });
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
  if (!STATES.includes(marker.status)) throw new Error('Cursor ledger marker state is invalid');
  return marker;
}

function assertContext(value, expected) {
  for (const field of ['repository', 'issueNumber', 'prNumber', 'branch', 'checkedOutSha', 'handoffId', 'dispatchKey', 'dispatchDigest', 'runId', 'prospectId', 'sourceCheckpointDigest', 'sourceManifestDigest', 'inputManifestDigest', 'jobId', 'artifactName', 'artifactId', 'artifactDigest', 'artifactContentDigest', 'operationKey', 'requestDigest', 'responseDigest', 'operationState', 'ownerToken']) {
    if (expected[field] != null && String(value?.[field] ?? '') !== String(expected[field])) throw new Error(`Ledger ${field} binding mismatch`);
  }
  return true;
}

function assertTransition(previous, next) {
  if (!previous) {
    if (!['claimed', 'preparing'].includes(next.status)) throw new Error('Ledger must begin in claimed or preparing state');
    return next;
  }
  if (!TRANSITIONS[previous.status]?.includes(next.status)) throw new Error(`Invalid ledger transition ${previous.status} -> ${next.status}`);
  const transitionContext = contextFields(previous);
  // Paid-operation/artifact identity is intentionally introduced at the
  // phase_b_claimed -> paid_prepared transition and may advance again at
  // paid_accepted. It is verified by the marker digest and exact artifact
  // restore, but is not an immutable handoff context field.
  for (const field of ['artifactName', 'artifactId', 'artifactDigest', 'artifactContentDigest', 'operationKey', 'requestDigest', 'responseDigest', 'operationState']) delete transitionContext[field];
  assertContext(next, transitionContext);
  if (previous.ownerToken && next.ownerToken !== previous.ownerToken) throw new Error('Ledger claim owner token mismatch');
  if (next.status === 'posted' && (!next.commentId || !next.commentUrl)) throw new Error('posted ledger state requires authoritative @cursor comment identity');
  return next;
}

function claimOwnerMatches(marker, ownerToken) {
  return !marker || !marker.ownerToken || String(marker.ownerToken) === String(ownerToken);
}

// Durable recovery decision used by both workflow entry points. A runner may
// disappear after any marker POST; the Issue ledger, not a local file, tells a
// retry whether to continue, reconcile, or safely no-op.
function recoverClaim(comments, expected, ownerToken) {
  const current = findClaim(comments, expected);
  if (!current) return { action: 'prepare', status: null, claim: null };
  if (!claimOwnerMatches(current, ownerToken)) return { action: 'noop', status: current.status, claim: current, ownerMismatch: true };
  const actions = { preparing: 'post', posted: 'in_motion', in_motion: 'terminal', terminal: 'phase_b_claimed', phase_b_claimed: 'resumed', paid_prepared: 'paid-accepted', paid_accepted: 'resumed', resumed: 'noop' };
  return { action: actions[current.status] || 'noop', status: current.status, claim: current };
}

function issueCommentUrl(url, repository, issueNumber) {
  try {
    const parsed = new URL(String(url));
    return parsed.protocol === 'https:' && parsed.hostname === 'github.com' && parsed.pathname === `/${repository}/issues/${issueNumber}` && /^#issuecomment-[0-9]+$/.test(parsed.hash);
  } catch { return false; }
}

function authoritativeMarkers(comments, expected) {
  const repository = required(expected.repository, 'ledger expected repository');
  const issueNumber = String(required(expected.issueNumber, 'ledger expected issue'));
  return (comments || []).flatMap((comment) => {
    if (comment?.user?.login && comment.user.login !== expected.ownerLogin && !['github-actions[bot]', 'cursor[bot]'].includes(comment.user.login)) return [];
    const url = String(comment?.html_url || comment?.url || '');
    if (!issueCommentUrl(url, repository, issueNumber)) return [];
    let marker;
    try { marker = parseMarker(comment.body); } catch { return []; }
    return marker ? [{ ...marker, commentId: String(comment.id), commentUrl: url, _createdAt: comment.created_at || '' }] : [];
  }).filter((marker) => marker.repository === repository && String(marker.issueNumber) === issueNumber && (!expected.prNumber || String(marker.prNumber) === String(expected.prNumber)))
    .sort((a, b) => String(b._createdAt).localeCompare(String(a._createdAt)) || Number(b.commentId) - Number(a.commentId));
}

function findClaim(comments, expected) {
  return authoritativeMarkers(comments, expected).find((marker) => {
    if (expected.kind != null && marker.kind !== expected.kind) return false;
    if (expected.handoffId != null && marker.handoffId !== String(expected.handoffId)) return false;
    if (expected.dispatchKey != null && marker.dispatchKey !== String(expected.dispatchKey)) return false;
    if (expected.resultId != null && marker.resultId !== String(expected.resultId)) return false;
    if (expected.status != null && marker.status !== expected.status) return false;
    try { assertContext(marker, expected); } catch { return false; }
    return true;
  }) || null;
}

// A terminal Cursor reply is a result, not a comment identity.  Retries can
// produce a new comment id for the same immutable handoff/result, so resume
// recovery must key on the bound outcome digests and never on resultId alone.
function terminalOutcomeKey(value) {
  if (!value) return null;
  const inputDigest = value.inputDigest || value.receipt?.inputDigest;
  const outputDigest = value.outputDigest || value.receipt?.outputDigest;
  if (!value.handoffId || !value.dispatchKey || !inputDigest || !outputDigest) return null;
  return digest({ handoffId: String(value.handoffId), dispatchKey: String(value.dispatchKey), inputDigest: String(inputDigest), outputDigest: String(outputDigest) });
}

function terminalIdentityMatches(marker, expected) {
  for (const field of ['repository', 'issueNumber', 'prNumber', 'branch', 'checkedOutSha', 'handoffId', 'dispatchKey', 'dispatchDigest', 'runId', 'prospectId', 'sourceCheckpointDigest', 'sourceManifestDigest', 'inputManifestDigest', 'jobId']) {
    if (expected[field] != null && String(marker?.[field] ?? '') !== String(expected[field])) return false;
  }
  return marker?.kind === 'resume' && ['terminal', 'phase_b_claimed', 'paid_prepared', 'paid_accepted', 'resumed'].includes(marker.status);
}

function findTerminalOutcome(comments, expected) {
  const expectedKey = expected.terminalOutcomeKey || terminalOutcomeKey(expected);
  if (!expectedKey) return null;
  return authoritativeMarkers(comments, expected).find((marker) => {
    if (!terminalIdentityMatches(marker, expected)) return false;
    return terminalOutcomeKey(marker) === expectedKey;
  }) || null;
}

// A second terminal result with the same immutable handoff but a different
// output is a conflict, not a retry.  It must never be allowed to consume the
// phase-B claim or overwrite the first durable outcome.
function findTerminalConflict(comments, expected) {
  const expectedKey = expected.terminalOutcomeKey || terminalOutcomeKey(expected);
  if (!expectedKey) return null;
  return authoritativeMarkers(comments, expected).find((marker) => terminalIdentityMatches(marker, expected) && terminalOutcomeKey(marker) !== expectedKey) || null;
}

function reconcileDispatchComment(comments, expected) {
  const repository = required(expected.repository, 'dispatch repository');
  const issueNumber = String(required(expected.issueNumber, 'dispatch issue'));
  return (comments || []).filter((comment) => {
    const body = String(comment?.body || '');
    const url = String(comment?.html_url || '');
    return issueCommentUrl(url, repository, issueNumber) && body.startsWith('@cursor') && body.includes(`Dispatch key: ${expected.dispatchKey}`) && (!expected.dispatchDigest || body.includes(`Dispatch packet digest: ${expected.dispatchDigest}`)) && (!expected.prNumber || body.includes(`PR: #${expected.prNumber}`));
  }).sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')) || Number(b.id) - Number(a.id))[0] || null;
}

function requireGitHubToken(env = process.env) {
  const token = env.GH_TOKEN || env.GITHUB_TOKEN;
  if (!token || String(token).trim() === '') throw new Error('GH_TOKEN or GITHUB_TOKEN is required for GitHub ledger operations');
  return token;
}

module.exports = { SCHEMA_VERSION, STATES, markerFor, markerBody, parseMarker, assertTransition, assertContext, authoritativeMarkers, findClaim, terminalOutcomeKey, findTerminalOutcome, findTerminalConflict, reconcileDispatchComment, claimOwnerMatches, recoverClaim, requireGitHubToken };
