'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {
  STANDARD_PRESCRIPTION_POLICY,
  canonical,
  digest,
  pageId,
  pageSetDigest,
  canonicalServiceId,
  canonicalizePageServices,
  validatePagePolicy,
} = require('./prescription-policy');

const EXPECTED_360_CHECKPOINT = Object.freeze({
  runId: '32717620900',
  artifactId: '9516514426',
  sourceSha: '81587f8422a23313fd7868751061eec7e2fb5926',
});

function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function readJson(filename) { return JSON.parse(fs.readFileSync(filename, 'utf8')); }

function walk(root, current = root, result = []) {
  if (!fs.existsSync(current)) return result;
  const stat = fs.statSync(current);
  if (stat.isDirectory()) for (const name of fs.readdirSync(current)) walk(root, path.join(current, name), result);
  else result.push(path.relative(root, current).split(path.sep).join('/'));
  return result;
}

function verifyArtifactContent({ artifactRoot, checkpoint, state, artifactId, expected = EXPECTED_360_CHECKPOINT }) {
  if (!artifactRoot) throw new Error('actual artifact root is required for no-vendor reseal');
  const root = path.resolve(artifactRoot);
  const checkpointFile = path.join(root, 'canary', 'outputs', 'checkpoint.json');
  const stateFile = path.join(root, 'state', 'factory-state.json');
  const manifestFile = path.join(root, 'canary', 'outputs', 'manifest.sha256');
  if (![checkpointFile, stateFile, manifestFile].every((file) => fs.existsSync(file))) throw new Error('artifact is missing checkpoint, state, or manifest content');
  const actualCheckpoint = readJson(checkpointFile);
  const actualState = readJson(stateFile);
  if (digest(actualCheckpoint) !== digest(checkpoint)) throw new Error('caller checkpoint does not match artifact checkpoint content');
  if (digest(actualState) !== digest(state)) throw new Error('caller state does not derive from artifact state content');
  const manifestEntries = fs.readFileSync(manifestFile, 'utf8').trim().split(/\n/).filter(Boolean).map((line) => {
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    if (!match) throw new Error('artifact manifest has invalid syntax');
    return { sha256: match[1], path: match[2].replace(/^\.\//, '') };
  }).sort((a, b) => a.path.localeCompare(b.path));
  const actualFiles = walk(root).filter((file) => file !== 'canary/outputs/manifest.sha256').sort();
  if (JSON.stringify(actualFiles) !== JSON.stringify(manifestEntries.map((entry) => entry.path))) throw new Error('artifact manifest file inventory mismatch');
  for (const entry of manifestEntries) {
    const actual = sha256(fs.readFileSync(path.join(root, entry.path)));
    if (actual !== entry.sha256) throw new Error(`artifact content digest mismatch: ${entry.path}`);
  }
  if (String(actualCheckpoint.runId) !== String(expected.runId) || actualCheckpoint.sourceSha !== expected.sourceSha || String(artifactId) !== String(expected.artifactId)) throw new Error('artifact content identity does not match expected source');
  const checkpointDigest = digest(actualCheckpoint);
  const stateDigest = digest(actualState);
  return { artifactRoot: root, checkpointDigest, stateDigest, manifest: manifestEntries, sourceArtifactDigest: digest({ artifactId: String(artifactId), checkpointDigest, stateDigest, manifest: manifestEntries }) };
}

function writtenReviews(packet) {
  const records = packet?.reviews || [];
  const reviews = records.filter((review) => String(review.text || '').trim());
  const ids = new Set();
  for (const review of reviews) {
    if (!review.id) throw new Error('written review is missing its stable review ID');
    if (ids.has(review.id)) throw new Error(`duplicate stable review ID: ${review.id}`);
    ids.add(review.id);
  }
  if (reviews.length !== Number(packet?.writtenReviewCount)) throw new Error('retrievedWrittenReviewCount does not equal written review records');
  return reviews;
}

function reviewRetrievalDate(packet) {
  const retrievedAt = packet?.provenance?.retrievedAt || packet?.retrievedAt;
  if (typeof retrievedAt !== 'string' || Number.isNaN(Date.parse(retrievedAt))) throw new Error('review retrieval provenance date is missing or invalid');
  return new Date(retrievedAt).toISOString().slice(0, 10);
}

function validateLedger(ledger, stableIds = new Set()) {
  if (!ledger || ledger.version !== 'canonical-service-coverage-ledger-v1') throw new Error('canonical service ledger is required for reseal');
  if (!Array.isArray(ledger.services) || !ledger.services.length) throw new Error('canonical service ledger has no services');
  const ids = new Set();
  for (const service of ledger.services) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(service.id || '') || !service.name) throw new Error('canonical service ledger contains an invalid service identity');
    if (ids.has(service.id)) throw new Error(`duplicate canonical service ledger id: ${service.id}`);
    ids.add(service.id);
    if (!Array.isArray(service.reviewIds) || service.reviewIds.some((id) => !id)) throw new Error(`canonical service ledger review mapping invalid for ${service.id}`);
    if (stableIds.size && service.reviewIds.some((id) => !stableIds.has(id))) throw new Error(`canonical service ledger references a review outside stable retrieved inventory: ${service.id}`);
    if (!Array.isArray(service.currentSitePageUrls)) throw new Error(`canonical service ledger page mapping missing for ${service.id}`);
  }
  for (const [raw, target] of Object.entries(ledger.aliases || {})) {
    if (!raw || !ids.has(target)) throw new Error(`canonical service ledger alias is unmapped: ${raw}`);
  }
  return ledger;
}

function route(page) { return String(page?.url || '').replace(/\/$/, '') || '/'; }

function routeLanguage(value) {
  return /\/garage-door-(?:spring|opener)(?:-[a-z-]+)?\/?|\b(?:spring|opener)(?:[- ](?:repair|replacement|installation))?\s+(?:page|route|url|link|slug|nav|cta|destination)|\b(?:page|route|url|link|slug|nav|cta|destination)[^.!?\n]{0,80}\b(?:spring|opener)(?:[- ](?:repair|replacement|installation))?\b|(?:spring|opener)[^.!?\n]{0,80}\b(?:page|route|url|link|slug|nav|cta)\b/i.test(String(value || ''));
}

function validateRejectedRouteLanguage(value, location = 'payload') {
  if (typeof value === 'string') {
    if (routeLanguage(value)) throw new Error(`rejected spring/opener route language at ${location}`);
    return true;
  }
  if (Array.isArray(value)) return value.every((entry, index) => validateRejectedRouteLanguage(entry, `${location}[${index}]`));
  if (value && typeof value === 'object') return Object.entries(value).every(([key, entry]) => validateRejectedRouteLanguage(entry, `${location}.${key}`));
  return true;
}

function sanitizePageText(pages) {
  return pages.map((page) => {
    const next = { ...clone(page) };
    if (next.type === 'Home') {
      next.whyIncluded = 'Required entry page. The owned site currently uses Home plus an undifferentiated services gallery, which buries distinct completed-work evidence.';
      next.angle = 'Lead with the local shop and the completed garage-door work already in the review record. Keep the two approved service directions distinct.';
      next.overlapBoundaries = 'Keep problem-specific jobs and first reviews on the two approved service destinations. Do not use Home to promise weekends, holidays, same-day arrival, or 24/7 coverage.';
    } else if (next.type === 'Service' && next.service === 'garage-door-repair') {
      next.angle = 'Evidence-led repair direction for failed, sagging, off-track, or inconsistent doors, including related repair work when reviewers describe it.';
      next.overlapBoundaries = 'Do not duplicate new-door installation or use this assignment for design-your-door selection. Fold related repair evidence here only when it remains within the repair intent.';
    } else if (next.type === 'Service' && next.service === 'garage-door-installation') {
      next.overlapBoundaries = 'Keep this assignment focused on door installation and replacement, not repair or accessory work. Do not turn it into a framing or carpentry claim.';
    } else if (next.type === 'Contact') {
      next.overlapBoundaries = 'No service-specific claims, pricing, or availability promises here. Do not preview service proof beyond the approved destination assignments.';
    }
    return next;
  });
}

function aggregateCandidates(candidates, ledger, pages) {
  const selectedRoutes = new Map(pages.filter((page) => page.type === 'Service').map((page) => [page.canonicalIntentId, route(page)]));
  const aggregate = new Map();
  const preserved = (candidates || []).map((candidate) => {
    const rawId = String(candidate.id || candidate.name || '');
    const mapped = canonicalServiceId(rawId, ledger, { allowImplicit: false });
    const homeSupport = mapped === 'home-breadth';
    const selectedRoute = selectedRoutes.get(mapped) || null;
    const folded = !homeSupport && Boolean(selectedRoute) && mapped !== rawId;
    const next = { ...clone(candidate), sourceServiceId: rawId, canonicalServiceId: mapped, canonicalIntentId: mapped, includedPage: Boolean(selectedRoute) && !folded, pageUrl: Boolean(selectedRoute) && !folded ? selectedRoute : null, destination: homeSupport ? 'home-support' : (!folded && selectedRoute ? 'service-assignment' : null) };
    // The comparison remains evidence-complete, but stale model prose cannot
    // leak rejected spring/opener route language into the sealed handoff.
    delete next.note;
    delete next.rationale;
    delete next.whyIncluded;
    delete next.foldInto;
    if (homeSupport) {
      next.status = 'passed-over';
      next.passedOverReason = 'Supporting opener-work evidence is assigned to Home breadth only.';
      next.supportingEvidenceFor = '/';
    } else if (folded) {
      next.status = 'folded';
      next.foldedInto = mapped;
      next.passedOverReason = 'Supporting spring-work evidence is folded into the Garage Door Repair assignment.';
    } else if (!selectedRoute) {
      next.status = 'passed-over';
      next.passedOverReason = 'Evidence preserved; not selected for an approved service destination.';
    } else {
      next.status = 'selected';
    }
    const entry = aggregate.get(mapped) || { id: mapped, name: mapped, directEvidenceReviewIds: new Set(), evidenceCount: 0, directCompletedEvidenceCount: 0 };
    entry.name = entry.name === mapped ? (candidate.name || mapped) : entry.name;
    for (const id of candidate.directEvidenceReviewIds || []) entry.directEvidenceReviewIds.add(id);
    entry.evidenceCount += Number(candidate.evidenceCount || candidate.directCompletedEvidenceCount || 0);
    entry.directCompletedEvidenceCount = entry.directEvidenceReviewIds.size;
    aggregate.set(mapped, entry);
    return next;
  });
  validateRejectedRouteLanguage(preserved, 'candidate comparison');
  return { preserved, aggregate: [...aggregate.values()].map((entry) => ({ ...entry, directEvidenceReviewIds: [...entry.directEvidenceReviewIds].sort() })) };
}

function validateApproval(approval, pages, binding) {
  const expectedRoutes = ['/', '/garage-door-repair', '/garage-door-installation', '/contact'];
  if (!approval || approval.approvedBy !== 'Josh Lenz' || approval.approvedAt !== '2026-08-24') throw new Error('reseal approval is missing or stale');
  if (JSON.stringify(approval.approvedRoutes) !== JSON.stringify(expectedRoutes)) throw new Error('reseal approval routes do not match the approved four-page set');
  if (approval.runId && String(approval.runId) !== String(binding.runId)) throw new Error('reseal approval run mismatch');
  if (approval.sourceSha && approval.sourceSha !== binding.sourceSha) throw new Error('reseal approval source mismatch');
  return clone(approval);
}

function writerProjection({ pages, preserved, stableIds }) {
  const assignments = pages.map((page) => ({ pageId: pageId(page), type: page.type, route: route(page), canonicalIntentId: page.canonicalIntentId || null }));
  const foldedEvidence = {
    garageDoorRepair: { reviewIds: [...new Set(preserved.filter((item) => item.foldedInto === 'garage-door-repair').flatMap((item) => item.directEvidenceReviewIds || []))].filter((id) => stableIds.has(id)).sort() },
    home: { reviewIds: [...new Set(preserved.filter((item) => item.supportingEvidenceFor === '/').flatMap((item) => item.directEvidenceReviewIds || []))].filter((id) => stableIds.has(id)).sort() },
  };
  const projection = { routes: assignments.map((assignment) => assignment.route), approvedPageAssignments: assignments, foldedEvidence };
  validateRejectedRouteLanguage(projection, 'writerProjection');
  if (projection.routes.some((value) => /spring|opener/i.test(value))) throw new Error('writer projection exposes a rejected route');
  return projection;
}

function resealCheckpoint({ checkpoint, state, artifactRoot, artifactId, canonicalServiceLedger, approval, expected = EXPECTED_360_CHECKPOINT }) {
  const artifactProof = verifyArtifactContent({ artifactRoot, checkpoint, state, artifactId, expected });
  const original = clone(state);
  const run = original?.runs?.find((entry) => entry.runId === 'run-49c4e3d8b15c4008ae13');
  if (!run) throw new Error('checkpoint does not contain the 360 canary run');
  const packet = run.artifacts?.reviewPacket;
  const reviews = writtenReviews(packet);
  const writtenIds = new Set(reviews.map((review) => review.id));
  const retrievedWrittenReviewCount = reviews.length;
  const reviewRetrievalDate = reviewRetrievalDateFromPacket(packet);
  if (retrievedWrittenReviewCount !== 47 || reviewRetrievalDate !== '2026-08-23') throw new Error('360 reseal source facts do not match the verified 47-review 2026-08-23 snapshot');
  const ledger = validateLedger(canonicalServiceLedger, writtenIds);
  const oldPrescription = run.artifacts?.prescription;
  if (!oldPrescription || !Array.isArray(oldPrescription.pages) || oldPrescription.pages.length !== 6) throw new Error('old six-page prescription is not present; refusing to mutate or infer a reseal');
  const rawPages = oldPrescription.pages.filter((page) => ['/', '/garage-door-repair', '/garage-door-installation', '/contact'].includes(route(page))).map((page) => ({ ...clone(page), url: route(page) }));
  const pages = sanitizePageText(canonicalizePageServices(rawPages, ledger));
  if (pages.length !== 4) throw new Error('the approved four-page derivative could not be formed from the old prescription');
  const approved = validateApproval(approval, pages, expected);
  const candidates = run.artifacts?.cursorProposal?.cursorComparison?.candidates || run.artifacts?.cursorProposal?.candidateServices || oldPrescription.valueHierarchy;
  const comparison = aggregateCandidates(candidates, ledger, pages);
  const selected = comparison.aggregate.filter((entry) => entry.directCompletedEvidenceCount > 0 && entry.id !== 'home-breadth').sort((a, b) => b.directCompletedEvidenceCount - a.directCompletedEvidenceCount || a.id.localeCompare(b.id)).slice(0, 2).map((entry) => entry.id).sort();
  const selectedRoutes = pages.filter((page) => page.type === 'Service').map((page) => page.canonicalIntentId).sort();
  if (JSON.stringify(selected) !== JSON.stringify(selectedRoutes)) throw new Error('approved service pages are not the top two evidence-backed canonical destinations');
  const evidenceIds = new Set(comparison.preserved.flatMap((candidate) => candidate.directEvidenceReviewIds || []));
  if (![...evidenceIds].every((id) => writtenIds.has(id))) throw new Error('candidate service evidence references a review outside the stable retrieved inventory');
  const serviceGap = ledger.services.filter((service) => service.reviewIds.length > 0 && service.currentSitePageUrls.length === 0);
  const reviewAnalysisFacts = { retrievedWrittenReviewCount, reviewRetrievalDate, reviewBackedServicesWithoutPages: serviceGap.length, reviewBackedServiceNames: serviceGap.map((service) => service.name).sort() };
  const evidence = { reviewPacket: clone(packet), classification: clone(run.artifacts.classification), stableReviewIds: [...writtenIds].sort() };
  const evidenceDigest = digest({ evidence, candidates: comparison.preserved, ledger: clone(ledger) });
  const pageDigest = pageSetDigest(pages);
  const approvalCore = { ...approved, policyVersion: STANDARD_PRESCRIPTION_POLICY.version, approvedPageIds: pages.map(pageId).sort(), approvedCanonicalIntentIds: selected, sourceArtifactDigest: artifactProof.sourceArtifactDigest, evidenceDigest, pageSetDigest: pageDigest };
  const approvalDigest = digest(approvalCore);
  const sealed = {
    version: 'page-prescription-v3',
    source: { checkpoint: clone(checkpoint), artifactId: String(artifactId) },
    prospect: clone(oldPrescription.prospect),
    pages,
    pagePolicy: { ...STANDARD_PRESCRIPTION_POLICY },
    policyMode: 'standard',
    selectedServiceIds: selected,
    valueHierarchy: comparison.preserved,
    candidateServices: comparison.preserved,
    reviewAnalysisFacts,
    serviceCoverageLedger: clone(ledger),
    evidence,
    approval: { ...approvalCore, approvalDigest },
    sourceArtifactDigest: artifactProof.sourceArtifactDigest,
    evidenceDigest,
    pageSetDigest: pageDigest,
    approvalDigest,
    status: 'awaiting-words-factory',
  };
  sealed.prescriptionDigest = digest({ ...sealed, prescriptionDigest: undefined, resealDigest: undefined });
  sealed.writerProjection = writerProjection({ pages, preserved: comparison.preserved, stableIds: writtenIds });
  validateRejectedRouteLanguage(sealed.pages, 'sealed.pages');
  const handoff = {
    handoffVersion: 'lane-a-review-handoff/v3',
    source: sealed.source,
    prospect: sealed.prospect,
    pages: sealed.pages,
    writerProjection: sealed.writerProjection,
    foldedEvidence: sealed.writerProjection.foldedEvidence,
    candidateServices: sealed.candidateServices,
    reviewInventory: sealed.evidence,
    reviewAnalysisFacts: sealed.reviewAnalysisFacts,
    stableReviewIds: sealed.evidence.stableReviewIds,
    policy: sealed.pagePolicy,
    sourceArtifactDigest: sealed.sourceArtifactDigest,
    evidenceDigest: sealed.evidenceDigest,
    pageSetDigest: sealed.pageSetDigest,
    prescriptionDigest: sealed.prescriptionDigest,
    approvalDigest: sealed.approvalDigest,
    approval: sealed.approval,
    noVendorReseal: true,
  };
  sealed.resealDigest = digest({ ...handoff, resealDigest: undefined });
  handoff.resealDigest = sealed.resealDigest;
  return { sealedPrescription: sealed, handoff, originalState: original, artifactProof };
}

function reviewRetrievalDateFromPacket(packet) { return reviewRetrievalDate(packet); }

module.exports = { EXPECTED_360_CHECKPOINT, verifyArtifactContent, writtenReviews, reviewRetrievalDate, validateLedger, validateRejectedRouteLanguage, aggregateCandidates, writerProjection, validateApproval, resealCheckpoint };
