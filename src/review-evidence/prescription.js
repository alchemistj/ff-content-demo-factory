'use strict';

const GUARANTEE_PATTERN = /one[- ]hour|within an hour|same[- ]day|guaranteed response|response[- ]time sla/i;

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function pageTerms(page) {
  return new Set(normalize([page.title, page.primaryKeyword, page.proposedSlug, page.service].join(' ')).split(/\s+/).filter(Boolean));
}

function serviceMatches(page, evidence) {
  const pageTermsSet = pageTerms(page);
  const service = normalize(evidence.service);
  if (!service) return false;
  if (pageTermsSet.has(service) || service.split(/\s+/).some((term) => pageTermsSet.has(term))) return true;
  const aliases = {
    'ev-charging': ['ev', 'electric', 'charging', 'nema'],
    'electrical-repair': ['electrical', 'repair', 'circuit', 'outlet', 'breaker'],
    'panel-upgrade': ['panel', 'upgrade'],
    'new-construction-wiring': ['new', 'construction', 'wiring', 'shop', 'house'],
  };
  return (aliases[evidence.service] || []).some((term) => pageTermsSet.has(term));
}

function assertNoUnsupportedGuarantee(value, context) {
  const text = Array.isArray(value) ? value.join(' ') : String(value || '');
  if (GUARANTEE_PATTERN.test(text)) throw new Error(`Unsupported response guarantee in ${context}`);
}

function chooseRecommendedReview(anchors, page) {
  const match = anchors.find((entry) => entry.authoritativeJudgment.serviceEvidence.some((evidence) => serviceMatches(page, evidence)));
  if (!match) return null;
  const evidence = match.authoritativeJudgment.serviceEvidence.find((item) => serviceMatches(page, item));
  return {
    reviewId: match.id,
    reviewer: match.sourceReview.author,
    rating: match.sourceReview.rating,
    date: match.sourceReview.date,
    excerpt: evidence.excerpt || match.sourceReview.text.slice(0, 220),
    why: `Direct completed-service evidence for ${evidence.service}; recommended for this page, not a locked placement.`,
    provenance: match.provenance,
  };
}

/**
 * Translate persisted authoritative classifications into page evidence and a
 * comparable value hierarchy. Candidate services remain visible even when
 * they have no anchor, preventing classifier starvation from hiding options.
 */
function buildPrescriptionEvidence({ classification, pages, candidateServices = [] }) {
  if (!classification || !Array.isArray(classification.reviews)) throw new TypeError('classification.reviews is required');
  if (classification.reviews.some((entry) => entry.authoritative !== true)) {
    throw new Error('Prescription requires authoritative judgment for every written review');
  }
  const anchors = classification.reviews.filter((entry) => entry.grade === 'anchor' && entry.authoritativeJudgment.directCompletedService === true);
  const negatives = classification.reviews.filter((entry) => entry.grade === 'negative');

  const availability = new Map();
  for (const entry of classification.reviews) {
    for (const item of entry.authoritativeJudgment.availabilityEvidence || []) {
      if (!['night', 'holiday', 'beforeSunrise'].includes(item.kind)) continue;
      if (!availability.has(item.kind)) availability.set(item.kind, []);
      availability.get(item.kind).push({ reviewId: entry.id, excerpt: item.excerpt || null, provenance: entry.provenance });
    }
  }
  const availabilityKinds = ['night', 'holiday', 'beforeSunrise'].filter((kind) => availability.has(kind));
  const availabilityPattern = availabilityKinds.length === 3 ? {
    kind: 'observed-availability-pattern',
    supportedBy: availabilityKinds.flatMap((kind) => availability.get(kind)),
    safeDirection: 'Reviews document repeated emergency/after-hours availability across night, holiday, and before-sunrise contexts. This supports an evidence-bounded 24/7/emergency availability pattern, not an unconditional response SLA or one-hour/same-day guarantee.',
    claims: ['Observed reviews support an evidence-bounded 24/7/emergency availability pattern across night, holiday, and before-sunrise contexts.'],
    traps: ['Do not convert the observed pattern into an unconditional response SLA or a one-hour or same-day guarantee.'],
  } : null;

  const pageEvidence = (pages || []).map((page) => {
    const pageAnchors = anchors.filter((entry) => (entry.authoritativeJudgment.serviceEvidence || []).some((evidence) => serviceMatches(page, evidence)));
    const recommendedFirstReview = chooseRecommendedReview(pageAnchors, page);
    const claims = [...(page.claims || []), ...(page.proposedClaims || [])];
    assertNoUnsupportedGuarantee(claims, `page ${page.proposedSlug || page.title}`);
    return {
      page: page.title,
      proposedSlug: page.proposedSlug || null,
      primaryKeyword: page.primaryKeyword || null,
      anchors: pageAnchors.map((entry) => ({
        reviewId: entry.id,
        reviewer: entry.sourceReview.author,
        serviceEvidence: entry.authoritativeJudgment.serviceEvidence,
        provenance: entry.provenance,
      })),
      recommendedFirstReview,
      negativeReviewTraps: negatives.map((entry) => ({
        reviewId: entry.id,
        reviewer: entry.sourceReview.author,
        rating: entry.sourceReview.rating,
        note: 'Retained as negative evidence; do not hide or rebut in page copy.',
        provenance: entry.provenance,
      })),
    };
  });

  const hierarchyCandidates = candidateServices.map((candidate, index) => {
    const candidatePage = pages?.find((page) => page.service === candidate.id || page.proposedSlug === candidate.proposedSlug) || candidate;
    const evidence = anchors.filter((entry) => (entry.authoritativeJudgment.serviceEvidence || []).some((item) => item.service === candidate.id || serviceMatches(candidatePage, item)));
    return {
      id: candidate.id || candidate.proposedSlug || `candidate-${index + 1}`,
      label: candidate.label || candidate.title || candidate.id,
      status: candidate.status || 'considered',
      authoritativeAnchorCount: evidence.length,
      directEvidenceReviewIds: evidence.map((entry) => entry.id),
      provenance: candidate.provenance || null,
    };
  });

  return {
    schemaVersion: '1.0.0',
    evidenceMethod: 'persisted-authoritative-review-classification-v1',
    authoritativeAnchorCount: anchors.length,
    pageEvidence,
    valueHierarchy: {
      candidates: hierarchyCandidates,
      compared: hierarchyCandidates.length > 1,
      evidenceSource: 'authoritative-review-classification',
    },
    availabilityPattern,
    negativeReviewCount: negatives.length,
    provenance: {
      reviewClassificationMethod: classification.classificationMethod,
      authoritativeJudgmentCount: classification.authoritativeJudgmentCount,
    },
  };
}

module.exports = { buildPrescriptionEvidence, assertNoUnsupportedGuarantee };
