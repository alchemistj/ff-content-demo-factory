const MAX_DISCOVERY_CANDIDATES = 7;

function normalizedWebsite(value) {
  if (!value) return '';
  try { return new URL(value).hostname.replace(/^www\./, '').toLowerCase(); } catch { return String(value).trim().toLowerCase(); }
}

function isMoldExcluded(candidate) {
  const haystack = [candidate.name, candidate.category, candidate.description, ...(candidate.services || [])]
    .filter(Boolean).join(' ').toLowerCase();
  return /\bmold(?: remediation| removal| testing| inspection| cleanup| abatement)?\b/.test(haystack);
}

function identityKey(candidate) {
  return `${String(candidate.name || '').trim().toLowerCase()}|${normalizedWebsite(candidate.website)}|${String(candidate.location || '').trim().toLowerCase()}`;
}

/** Preserve every discovered row while marking same-bench duplicates. */
function deduplicateCandidates(candidates, durableIdentities = []) {
  const seen = new Map();
  const prior = new Set(durableIdentities.map((item) => typeof item === 'string' ? item : identityKey(item)));
  return candidates.map((candidate) => {
    const key = identityKey(candidate);
    const duplicateOf = seen.get(key) || (prior.has(key) ? 'durable-prior-identity' : null);
    if (!seen.has(key)) seen.set(key, candidate.placeId || key);
    return { ...candidate, duplicateStatus: duplicateOf ? 'duplicate' : 'unique', duplicateOf };
  });
}

function auditShape(audit = {}) {
  return {
    quality: audit.quality || audit.siteQuality || 'unknown',
    opportunity: audit.opportunity || null,
    siteCopyEvidence: audit.siteCopyEvidence || audit.copyEvidence || [],
    ownedGraphicEvidence: audit.ownedGraphicEvidence || audit.graphicEvidence || [],
    publicImageUrls: audit.publicImageUrls || audit.imageUrls || [],
    inspected: audit.inspected === true
  };
}

function buildCandidateBench(rawCandidates, websiteAudits = new Map(), options = {}) {
  const marked = deduplicateCandidates(rawCandidates.slice(0, MAX_DISCOVERY_CANDIDATES), options.durableIdentities || []);
  return marked.map((candidate) => {
    const audit = auditShape(websiteAudits.get(candidate.placeId) || websiteAudits.get(candidate.website) || {});
    const mold = isMoldExcluded(candidate);
    const hasIdentity = Boolean(candidate.placeId && candidate.name && candidate.location);
    const exclusion = mold ? { code: 'mold-services', reason: 'Mold service category is excluded from this factory.' } : null;
    const disposition = exclusion ? 'rejected' : (!hasIdentity ? 'uncertain' : 'discovered');
    return {
      ...candidate,
      gbp: { placeId: candidate.placeId || null, name: candidate.name || null, category: candidate.category || null, location: candidate.location || null, phone: candidate.phone || null, reviewCount: candidate.reviewCount ?? candidate.listingReviewCount ?? null, website: candidate.website || null },
      discoveryReviewSample: { reviews: candidate.discoveryReviews || candidate.reviewSample || [], sampleOnly: true, source: candidate.discoveryReviewSource || 'discovery', retrievedAt: candidate.discoveryReviewRetrievedAt || null },
      websiteAudit: audit,
      websiteEvidence: audit,
      exclusion,
      duplicate: { status: candidate.duplicateStatus, matchedIdentity: candidate.duplicateOf },
      disposition: { status: disposition, reason: exclusion?.reason || (hasIdentity ? 'Awaiting independent Architect qualification.' : 'GBP identity is incomplete.') },
      stage: disposition,
      discoverySampleOnly: true,
      qualification: { identity: hasIdentity, website: Boolean(candidate.website), opportunity: audit.opportunity, graphicsInspected: audit.inspected }
    };
  });
}

function architectSelect(bench, decision) {
  const eligible = bench.filter((c) => c.stage !== 'rejected' && !c.exclusion && c.duplicate.status !== 'duplicate');
  const accepted = new Set((decision?.qualifiedPlaceIds || []).filter((id) => eligible.some((c) => c.placeId === id)));
  const selectedId = decision?.selectedPlaceId;
  if (!selectedId || !accepted.has(selectedId)) throw new Error('Architect must independently select one qualified finalist');
  const updatedBench = bench.map((c) => {
    if (c.placeId === selectedId) return { ...c, stage: 'selected-finalist', architectQualified: true, disposition: { status: 'selected-finalist', reason: decision.reason || 'Architect selected this finalist.' } };
    if (accepted.has(c.placeId)) return { ...c, stage: 'qualified-backlog', architectQualified: true, disposition: { status: 'qualified', reason: decision.backlogReason || 'Qualified, retained for later capacity.' } };
    if (c.stage === 'discovered') return { ...c, stage: 'uncertain', architectQualified: false, disposition: { status: 'uncertain', reason: 'Architect did not advance this candidate in the current capacity-one run.' } };
    return c;
  });
  return { finalist: updatedBench.find((c) => c.placeId === selectedId), bench: updatedBench };
}

module.exports = { MAX_DISCOVERY_CANDIDATES, normalizedWebsite, isMoldExcluded, identityKey, deduplicateCandidates, buildCandidateBench, architectSelect };
