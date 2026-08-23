const MAX_DISCOVERY_CANDIDATES = 7;

function normalizedWebsite(value) {
  if (!value) return '';
  try { return new URL(value).hostname.replace(/^www\./, '').toLowerCase(); } catch { return String(value).trim().toLowerCase(); }
}

function isMoldExcluded(candidate) {
  const haystack = [candidate.name, candidate.category, candidate.description, ...(candidate.services || [])]
    .filter(Boolean).join(' ').toLowerCase();
  return /\bmold(?: remediation| removal| testing)?\b/.test(haystack);
}

function deduplicateCandidates(candidates) {
  const seen = new Set();
  return candidates.filter((candidate) => {
    // A duplicate GBP can carry a different transient place id; stable business
    // identity is the normalized name + owned website when both are present.
    const identity = `${String(candidate.name || '').trim().toLowerCase()}|${normalizedWebsite(candidate.website)}`;
    const key = identity !== '|' ? identity : (candidate.placeId || '');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildCandidateBench(rawCandidates, websiteAudits = new Map()) {
  const unique = deduplicateCandidates(rawCandidates).slice(0, MAX_DISCOVERY_CANDIDATES);
  return unique.map((candidate) => {
    const audit = websiteAudits.get(candidate.placeId) || websiteAudits.get(candidate.website) || {};
    const exclusion = isMoldExcluded(candidate) ? 'mold-services' : null;
    const hasIdentity = Boolean(candidate.placeId && candidate.name && candidate.location);
    const hasWebsite = Boolean(candidate.website);
    const opportunity = audit.opportunity || (hasWebsite ? 'site-audited' : 'website-missing');
    return {
      ...candidate,
      websiteHost: normalizedWebsite(candidate.website),
      websiteEvidence: audit,
      stage: exclusion ? 'rejected' : (!hasIdentity ? 'uncertain' : 'discovered'),
      exclusion,
      discoverySampleOnly: true,
      qualification: { identity: hasIdentity, website: hasWebsite, opportunity }
    };
  });
}

function architectSelect(bench, decision) {
  const eligible = bench.filter((c) => c.stage !== 'rejected' && !c.exclusion);
  const accepted = new Set((decision?.qualifiedPlaceIds || []).filter((id) => eligible.some((c) => c.placeId === id)));
  const selectedId = decision?.selectedPlaceId;
  if (!selectedId || !accepted.has(selectedId)) throw new Error('Architect must independently select one qualified finalist');
  const updatedBench = bench.map((c) => {
      if (c.placeId === selectedId) return { ...c, stage: 'finalist', architectQualified: true };
      if (accepted.has(c.placeId)) return { ...c, stage: 'qualified-backlog', architectQualified: true };
      if (c.stage === 'discovered') return { ...c, stage: 'uncertain', architectQualified: false };
      return c;
  });
  return { finalist: updatedBench.find((c) => c.placeId === selectedId), bench: updatedBench };
}

module.exports = { MAX_DISCOVERY_CANDIDATES, normalizedWebsite, isMoldExcluded, deduplicateCandidates, buildCandidateBench, architectSelect };
