function sentenceCount(text) { return String(text || '').split(/[.!?]+/).map((s) => s.trim()).filter(Boolean).length; }

function validateWhyBuilt(whyBuilt, finalist, prescription) {
  if (!whyBuilt || typeof whyBuilt !== 'object' || sentenceCount(whyBuilt.text) < 2 || sentenceCount(whyBuilt.text) > 4 || !Array.isArray(whyBuilt.refs) || whyBuilt.refs.length < 2) return false;
  const opportunityRefs = new Set([finalist.websiteAudit?.opportunity, ...(finalist.websiteAudit?.siteCopyEvidence || [])].filter(Boolean).map(String));
  const graphicRefs = new Set((finalist.websiteAudit?.ownedGraphicEvidence || []).flatMap((item) => [item.id, item.url, item.text]).filter(Boolean).map(String));
  const reviewRefs = new Set(prescription.pages.flatMap((page) => [page.strongestEvidence, page.recommendedFirstReview?.reviewId]).filter(Boolean).map(String));
  const serviceRefs = new Set(prescription.valueHierarchy.map((service) => String(service.id || service.name)).filter(Boolean));
  const resolved = whyBuilt.refs.filter((ref) => {
    const value = String(ref.id || ref.ref || '');
    return (ref.type === 'opportunity' && opportunityRefs.has(value)) || (ref.type === 'graphic' && graphicRefs.has(value)) || (ref.type === 'review' && reviewRefs.has(value)) || (ref.type === 'service' && serviceRefs.has(value));
  });
  return resolved.some((ref) => ref.type === 'opportunity') && resolved.some((ref) => ['graphic', 'review', 'service'].includes(ref.type));
}

function renderGate1({ finalist, prescription, whyBuilt }) {
  if (!validateWhyBuilt(whyBuilt, finalist, prescription)) throw new Error('Why We Built must be 2–4 sentences with resolvable opportunity and evidence refs');
  const lines = [`# ${finalist.name}`, '', '## Why We Built This Site', '', whyBuilt.text.trim(), '', '## Page Prescription', '', '| Page | Proposed URL | Primary Keyword | Proposed Title / H1 Direction | Recommended First Review |', '| --- | --- | --- | --- | --- |'];
  for (const page of prescription.pages) {
    const recommendation = page.recommendedFirstReview ? `${page.recommendedFirstReview.reviewer} — ${page.recommendedFirstReview.why}` : '—';
    lines.push(`| ${page.type || page.service} | ${page.url} | ${page.primaryKeyword} | ${page.titleDirection} / ${page.h1Direction} | ${recommendation} |`);
  }
  lines.push('', '### Why these pages won', '');
  for (const page of prescription.pages) lines.push(`- **${page.type || page.service}:** ${page.whyIncluded}`);
  lines.push('', '### Services considered', '');
  for (const service of prescription.valueHierarchy) {
    const passedOverReason = String(service.passedOverReason || '').trim().replace(/[.]+$/, '');
    const disposition = service.includedPage ? 'included' : `passed over — ${passedOverReason}`;
    lines.push(`- ${service.name || service.id}: ${service.directCompletedEvidenceCount} direct anchor(s), ${service.evidenceCount} total evidence review(s); ${disposition}.`);
  }
  lines.push('', '## Human Gate 1', '', 'Are these the right pages, URLs, keywords, title directions, and first-review recommendations for this prospect?', '', '## State', '', '`awaiting-human-gate-1`');
  return lines.join('\n') + '\n';
}

function architectQa({ finalist, inventory, prescription, whyBuilt, laterStageArtifacts = [] }) {
  const written = inventory?.writtenReviewCount ?? inventory?.classified?.length ?? inventory?.reviews?.length ?? 0;
  const judgmentCount = inventory?.authoritativeJudgmentCount ?? 0;
  const anchorCount = inventory?.authoritativeAnchorCount ?? inventory?.anchorCount ?? 0;
  const pages = prescription?.pages || [];
  const listingCount = inventory?.listingReviewCount ?? inventory?.gbpReviewCount ?? 0;
  const retrievedCount = inventory?.retrievedReviewCount ?? ((inventory?.writtenReviewCount || 0) + (inventory?.emptyTextReviewCount || inventory?.emptyReviewCount || 0));
  const enrichmentSufficient = Boolean(inventory && inventory.exactPlace === true && inventory.discoverySampleOnly !== true && inventory.dateWindow === null && inventory.requestedLimit === 50 && inventory.enrichmentStatus === 'sufficient' && (listingCount < 25 ? retrievedCount >= listingCount : (inventory.writtenReviewCount >= 25 || retrievedCount >= Math.min(50, listingCount))));
  const checks = {
    qualified: Boolean(finalist?.architectQualified && finalist?.disposition?.status === 'selected-finalist'),
    exactGbpIdentity: Boolean(finalist?.gbp?.placeId || finalist?.placeId) && Boolean(finalist?.gbp?.name || finalist?.name) && Boolean(finalist?.gbp?.location || finalist?.location),
    truthfulFullEnrichment: enrichmentSufficient,
    allWrittenReviewsJudged: written > 0 && judgmentCount === written,
    graphicsInspected: finalist?.websiteAudit?.graphicsInspection?.status === 'inspected' && Array.isArray(finalist?.websiteAudit?.graphicsInspection?.findings),
    directServiceEvidence: anchorCount > 0,
    comparisonComplete: Array.isArray(prescription?.valueHierarchy) && prescription.valueHierarchy.length > 0 && prescription.valueHierarchy.every((service) => Object.prototype.hasOwnProperty.call(service, 'includedPage') && Object.prototype.hasOwnProperty.call(service, 'passedOverReason')),
    collisionFree: Boolean(prescription?.collisionValidation?.valid),
    differentiatedPages: new Set(pages.map((p) => `${p.url}|${p.primaryKeyword}|${p.titleDirection}|${p.h1Direction}`)).size === pages.length,
    recommendationsFit: pages.filter((p) => p.type !== 'Contact').every((p) => Boolean(p.recommendedFirstReview) || !p.strongestEvidence),
    unsupportedClaimsAbsent: pages.every((p) => {
      const claims = JSON.stringify(p.claims || []);
      if (/(one[- ]hour|same[- ]day|guaranteed|response[- ]time\s*sla)/i.test(claims)) return false;
      if (/(24\/7|emergency service)/i.test(claims) && !inventory?.availabilityPattern) return false;
      return true;
    }),
    whyBuiltEvidenceSpecific: validateWhyBuilt(whyBuilt, finalist, prescription),
    noMoldOrDuplicate: !finalist.exclusion && finalist.duplicate?.status !== 'duplicate',
    noLaterStageArtifacts: laterStageArtifacts.length === 0
  };
  return { passed: Object.values(checks).every(Boolean), checks };
}

module.exports = { sentenceCount, validateWhyBuilt, renderGate1, architectQa };
