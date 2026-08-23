function sentenceCount(text) { return String(text || '').split(/[.!?]+/).map((s) => s.trim()).filter(Boolean).length; }

function validateWhyBuilt(whyBuilt, finalist, prescription) {
  if (sentenceCount(whyBuilt) < 2 || sentenceCount(whyBuilt) > 4) return false;
  const haystack = `${finalist.name || ''} ${finalist.websiteAudit?.opportunity || ''} ${finalist.websiteAudit?.siteCopyEvidence || ''} ${finalist.websiteAudit?.ownedGraphicEvidence || ''} ${prescription.valueHierarchy.map((s) => s.id || s.name).join(' ')}`.toLowerCase();
  const supplied = String(whyBuilt).toLowerCase();
  const evidenceTerms = haystack.split(/[^a-z0-9]+/).filter((term) => term.length >= 5);
  return evidenceTerms.some((term) => supplied.includes(term));
}

function renderGate1({ finalist, prescription, whyBuilt }) {
  if (!validateWhyBuilt(whyBuilt, finalist, prescription)) throw new Error('Why We Built must be 2–4 evidence-specific Architect-approved sentences');
  const lines = [`# ${finalist.name}`, '', '## Why We Built This Site', '', whyBuilt.trim(), '', '## Page Prescription', '', '| Page | Proposed URL | Primary Keyword | Proposed Title / H1 Direction | Recommended First Review |', '| --- | --- | --- | --- | --- |'];
  for (const page of prescription.pages) {
    const recommendation = page.recommendedFirstReview ? `${page.recommendedFirstReview.reviewer} — ${page.recommendedFirstReview.why}` : '—';
    lines.push(`| ${page.type || page.service} | ${page.url} | ${page.primaryKeyword} | ${page.titleDirection} / ${page.h1Direction} | ${recommendation} |`);
  }
  lines.push('', '### Why these pages won', '');
  for (const page of prescription.pages) lines.push(`- **${page.type || page.service}:** ${page.whyIncluded}`);
  lines.push('', '### Services considered', '');
  for (const service of prescription.valueHierarchy) lines.push(`- ${service.name || service.id}: ${service.directCompletedEvidenceCount} direct anchor(s), ${service.evidenceCount} total evidence review(s); ${service.includedPage ? 'included' : `passed over — ${service.passedOverReason}`}.`);
  lines.push('', '## Human Gate 1', '', 'Are these the right pages, URLs, keywords, title directions, and first-review recommendations for this prospect?', '', '## State', '', '`awaiting-human-gate-1`');
  return lines.join('\n') + '\n';
}

function architectQa({ finalist, inventory, prescription, whyBuilt, laterStageArtifacts = [] }) {
  const written = inventory?.writtenReviewCount ?? inventory?.classified?.length ?? inventory?.reviews?.length ?? 0;
  const judgmentCount = inventory?.authoritativeJudgmentCount ?? 0;
  const anchorCount = inventory?.authoritativeAnchorCount ?? inventory?.anchorCount ?? 0;
  const pages = prescription?.pages || [];
  const checks = {
    qualified: Boolean(finalist?.architectQualified && finalist?.disposition?.status === 'selected-finalist'),
    exactGbpIdentity: Boolean(finalist?.gbp?.placeId || finalist?.placeId) && Boolean(finalist?.gbp?.name || finalist?.name) && Boolean(finalist?.gbp?.location || finalist?.location),
    truthfulFullEnrichment: Boolean(inventory && inventory.discoverySampleOnly !== true && inventory.dateWindow === null && inventory.requestedLimit <= 50 && inventory.retrievalCompleteness),
    allWrittenReviewsJudged: written > 0 && judgmentCount === written,
    graphicsInspected: finalist?.websiteAudit?.inspected === true,
    directServiceEvidence: anchorCount > 0,
    comparisonComplete: Array.isArray(prescription?.valueHierarchy) && prescription.valueHierarchy.length > 0 && prescription.valueHierarchy.every((service) => Object.prototype.hasOwnProperty.call(service, 'includedPage') && Object.prototype.hasOwnProperty.call(service, 'passedOverReason')),
    collisionFree: Boolean(prescription?.collisionValidation?.valid),
    differentiatedPages: new Set(pages.map((p) => `${p.url}|${p.primaryKeyword}|${p.titleDirection}|${p.h1Direction}`)).size === pages.length,
    recommendationsFit: pages.filter((p) => p.type !== 'Contact').every((p) => Boolean(p.recommendedFirstReview) || !p.strongestEvidence),
    unsupportedClaimsAbsent: pages.every((p) => !/(one[- ]hour|same[- ]day|guaranteed|24\/7|emergency service)/i.test(JSON.stringify({ claims: p.claims || [], traps: p.traps || [] }))),
    whyBuiltEvidenceSpecific: validateWhyBuilt(whyBuilt, finalist, prescription),
    noMoldOrDuplicate: !finalist.exclusion && finalist.duplicate?.status !== 'duplicate',
    noLaterStageArtifacts: laterStageArtifacts.length === 0
  };
  return { passed: Object.values(checks).every(Boolean), checks };
}

module.exports = { sentenceCount, validateWhyBuilt, renderGate1, architectQa };
