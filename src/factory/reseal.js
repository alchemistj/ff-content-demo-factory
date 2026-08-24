'use strict';

const { STANDARD_PRESCRIPTION_POLICY, canonical, digest, pageSetDigest, serviceTerm } = require('./prescription-policy');

const EXPECTED_360_CHECKPOINT = Object.freeze({
  runId: '32717620900',
  artifactId: '9516514426',
  sourceSha: '81587f8422a23313fd7868751061eec7e2fb5926',
});

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function route(page) {
  return String(page?.url || '').replace(/\/$/, '') || '/';
}

function writtenReviews(packet) {
  const reviews = (packet?.reviews || []).filter((review) => String(review.text || '').trim());
  const ids = new Set();
  for (const review of reviews) {
    if (!review.id) throw new Error('written review is missing its stable review ID');
    if (ids.has(review.id)) throw new Error(`duplicate stable review ID: ${review.id}`);
    ids.add(review.id);
  }
  if (reviews.length !== Number(packet?.writtenReviewCount)) throw new Error('written review count does not match the retrieved review inventory');
  return reviews;
}

function validateLedger(ledger) {
  if (!ledger || ledger.version !== 'canonical-service-coverage-ledger-v1') throw new Error('canonical service ledger is required for reseal');
  if (!Array.isArray(ledger.services) || !ledger.services.length) throw new Error('canonical service ledger has no services');
  const ids = new Set();
  for (const service of ledger.services) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(service.id || '') || !service.name) throw new Error('canonical service ledger contains an invalid service identity');
    if (ids.has(service.id)) throw new Error(`duplicate canonical service ledger id: ${service.id}`);
    ids.add(service.id);
    if (!Array.isArray(service.reviewIds) || service.reviewIds.some((id) => !id)) throw new Error(`canonical service ledger review mapping invalid for ${service.id}`);
    if (!Array.isArray(service.currentSitePageUrls)) throw new Error(`canonical service ledger page mapping missing for ${service.id}`);
  }
  for (const [raw, target] of Object.entries(ledger.aliases || {})) if (!raw || !target) throw new Error('canonical service ledger contains an invalid alias mapping');
  return ledger;
}

function aggregateCandidates(candidates, ledger, pages) {
  const aliases = ledger.aliases || {};
  const aggregate = new Map();
  const selectedRoutes = new Map(pages.filter((page) => page.type === 'Service').map((page) => [serviceTerm(page.service), route(page)]));
  const preserved = (candidates || []).map((candidate) => {
    const rawId = String(candidate.id || candidate.name || '');
    const mapped = aliases[rawId] || rawId;
    const homeSupport = mapped === 'home-breadth';
    const serviceRoute = homeSupport ? null : selectedRoutes.get(serviceTerm(mapped)) || null;
    const next = { ...clone(candidate), sourceServiceId: rawId, canonicalServiceId: mapped, includedPage: Boolean(serviceRoute), pageUrl: serviceRoute, destination: homeSupport ? 'home-support' : serviceRoute || null };
    if (homeSupport) {
      next.status = 'passed-over';
      next.passedOverReason = 'Preserved as review-backed Home-level breadth; it must not create or imply an opener route.';
      next.supportingEvidenceFor = '/';
    } else if (!serviceRoute) {
      next.status = 'passed-over';
      next.passedOverReason = next.passedOverReason || 'Evidence preserved but not selected for one of the two service destinations.';
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
  const aggregateList = [...aggregate.values()].map((entry) => ({ ...entry, directEvidenceReviewIds: [...entry.directEvidenceReviewIds].sort() }));
  return { preserved, aggregate: aggregateList };
}

function validateApproval(approval, pages, binding) {
  if (!approval || approval.approvedBy !== 'Josh Lenz' || approval.approvedAt !== '2026-08-24') throw new Error('reseal approval is missing or stale');
  const expected = ['/', '/garage-door-repair', '/garage-door-installation', '/contact'];
  if (JSON.stringify(approval.approvedRoutes) !== JSON.stringify(expected)) throw new Error('reseal approval routes do not match the approved four-page set');
  if (approval.runId && String(approval.runId) !== String(binding.runId)) throw new Error('reseal approval run mismatch');
  if (approval.sourceSha && approval.sourceSha !== binding.sourceSha) throw new Error('reseal approval source mismatch');
  if (approval.pageSetDigest && approval.pageSetDigest !== pageSetDigest(pages)) throw new Error('reseal approval page-set digest mismatch');
  return { ...clone(approval), pageSetDigest: pageSetDigest(pages), approvalDigest: digest(approval) };
}

function resealCheckpoint({ checkpoint, state, artifactId, canonicalServiceLedger, approval, expected = EXPECTED_360_CHECKPOINT }) {
  if (!checkpoint || String(checkpoint.runId) !== String(expected.runId) || String(artifactId) !== String(expected.artifactId) || checkpoint.sourceSha !== expected.sourceSha) throw new Error('checkpoint identity does not match the requested immutable reseal source');
  const original = clone(state);
  const run = original?.runs?.find((entry) => entry.runId === 'run-49c4e3d8b15c4008ae13');
  if (!run) throw new Error('checkpoint does not contain the 360 canary run');
  const packet = run.artifacts?.reviewPacket;
  const reviews = writtenReviews(packet);
  if (reviews.length !== 47) throw new Error('360 reseal requires the verified 47 written reviews');
  const retrievedAt = packet.retrievedAt || packet.provenance?.retrievedAt;
  if (retrievedAt?.slice(0, 10) !== '2026-08-23') throw new Error('review retrieval snapshot is not 2026-08-23');
  const ledger = validateLedger(canonicalServiceLedger);
  const oldPrescription = run.artifacts?.prescription;
  if (!oldPrescription || !Array.isArray(oldPrescription.pages) || oldPrescription.pages.length !== 6) throw new Error('old six-page prescription is not present; refusing to mutate or infer a reseal');
  const pages = oldPrescription.pages.filter((page) => ['/', '/garage-door-repair', '/garage-door-installation', '/contact'].includes(route(page))).map((page) => ({ ...clone(page), url: route(page) }));
  if (pages.length !== 4) throw new Error('the approved four-page derivative could not be formed from the old prescription');
  const approved = validateApproval(approval, pages, expected);
  const candidates = run.artifacts?.cursorProposal?.cursorComparison?.candidates || run.artifacts?.cursorProposal?.candidateServices || oldPrescription.valueHierarchy;
  const comparison = aggregateCandidates(candidates, ledger, pages);
  const selected = comparison.aggregate.filter((entry) => entry.directCompletedEvidenceCount > 0 && entry.id !== 'home-breadth').sort((a, b) => b.directCompletedEvidenceCount - a.directCompletedEvidenceCount || a.id.localeCompare(b.id)).slice(0, 2).map((entry) => entry.id);
  const selectedRoutes = pages.filter((page) => page.type === 'Service').map((page) => String(page.service));
  if (JSON.stringify(selected.sort()) !== JSON.stringify(selectedRoutes.sort())) throw new Error('approved service pages are not the top two evidence-backed canonical destinations');
  const writtenIds = new Set(reviews.map((review) => review.id));
  const evidenceIds = new Set(comparison.preserved.flatMap((candidate) => candidate.directEvidenceReviewIds || []));
  if (![...evidenceIds].every((id) => writtenIds.has(id))) throw new Error('candidate service evidence references a review outside the stable retrieved inventory');
  const serviceGap = ledger.services.filter((service) => service.reviewIds.length > 0 && service.currentSitePageUrls.length === 0);
  const reviewAnalysisFacts = {
    retrievedWrittenReviewCount: 47,
    reviewRetrievalDate: '2026-08-23',
    reviewBackedServicesWithoutPages: serviceGap.length,
    reviewBackedServiceNames: serviceGap.map((service) => service.name).sort(),
  };
  const evidenceDigest = digest({ reviews: run.artifacts.classification?.reviews || [], candidates: comparison.preserved, ledger });
  const sealed = {
    version: 'page-prescription-v2',
    source: { checkpoint: clone(checkpoint), artifactId: String(artifactId) },
    prospect: clone(oldPrescription.prospect),
    pages,
    pagePolicy: { ...STANDARD_PRESCRIPTION_POLICY },
    selectedServiceIds: selected,
    valueHierarchy: comparison.preserved,
    candidateServices: comparison.preserved,
    reviewAnalysisFacts,
    serviceCoverageLedger: clone(ledger),
    evidence: { reviewPacket: clone(packet), classification: clone(run.artifacts.classification), stableReviewIds: [...writtenIds].sort() },
    approval: approved,
    status: 'awaiting-words-factory',
  };
  sealed.sourceEvidenceDigest = evidenceDigest;
  sealed.resealDigest = digest({ source: sealed.source, evidence: sealed.evidence, pages: sealed.pages, facts: sealed.reviewAnalysisFacts, approval: sealed.approval, ledger: sealed.serviceCoverageLedger });
  const handoff = { handoffVersion: 'lane-a-review-handoff/v2', resealDigest: sealed.resealDigest, source: sealed.source, prospect: sealed.prospect, pages: sealed.pages, candidateServices: sealed.candidateServices, reviewAnalysisFacts: sealed.reviewAnalysisFacts, stableReviewIds: sealed.evidence.stableReviewIds, evidence: sealed.evidence, approval: sealed.approval, serviceCoverageLedger: sealed.serviceCoverageLedger, noVendorReseal: true };
  return { sealedPrescription: sealed, handoff, originalState: original };
}

module.exports = { EXPECTED_360_CHECKPOINT, writtenReviews, validateLedger, aggregateCandidates, validateApproval, resealCheckpoint };
