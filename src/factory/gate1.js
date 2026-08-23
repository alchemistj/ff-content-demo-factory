function renderGate1({ finalist, prescription, migrationNotes = [] }) {
  const lines = [`# ${finalist.name}`, '', '## Why We Built This Site', '', `${finalist.name} is worth demonstrating because its verified evidence supports a focused local-service story. The proposed site emphasizes the strongest customer-proven services while keeping claims bounded by the evidence.`, '', '## Page Prescription', '', '| Page | Proposed URL | Primary Keyword | Proposed Title / H1 Direction | Recommended First Review |', '| --- | --- | --- | --- | --- |'];
  for (const page of prescription.pages) {
    const recommendation = page.recommendedFirstReview ? `${page.recommendedFirstReview.reviewer} — ${page.recommendedFirstReview.why}` : '—';
    lines.push(`| ${page.type} | ${page.url} | ${page.primaryKeyword} | ${page.title} / ${page.h1} | ${recommendation} |`);
  }
  lines.push('', '### Why these pages won', '');
  for (const page of prescription.pages.filter((p) => p.whyIncluded)) lines.push(`- **${page.type}:** ${page.whyIncluded}`);
  lines.push('', '### Services considered', '');
  for (const service of prescription.valueHierarchy) lines.push(`- ${service.name}: ${service.directCompletedEvidenceCount} direct completed-service anchor(s), ${service.evidenceCount} total evidence review(s).`);
  lines.push('', '## Human Gate 1', '', 'Are these the right pages, URLs, keywords, title directions, and first-review recommendations for this prospect?', '', '## State', '', '`awaiting-human-gate-1`');
  if (migrationNotes.length) lines.push('', '## Migration notes', '', ...migrationNotes.map((note) => `- ${note}`));
  return lines.join('\n') + '\n';
}

function architectQa({ finalist, inventory, prescription }) {
  const anchorCount = inventory?.authoritativeAnchorCount ?? inventory?.anchorCount ?? 0;
  const judgmentCount = inventory?.authoritativeJudgmentCount ?? 0;
  const checks = {
    qualified: Boolean(finalist && finalist.architectQualified),
    exactGbpIdentity: Boolean(finalist?.placeId),
    truthfulReviewRetrieval: Boolean(inventory && inventory.dateWindow === null && inventory.requestedLimit <= 50),
    authoritativeClassification: Boolean(judgmentCount > 0),
    directServiceEvidence: Boolean(anchorCount > 0),
    pagesCompared: Boolean(prescription?.valueHierarchy?.length),
    collisionFree: Boolean(prescription?.collisionValidation?.valid),
    recommendationsFit: prescription?.pages?.filter((p) => p.type !== 'Contact').every((p) => {
      if (p.type === 'Home') return Boolean(p.recommendedFirstReview) || !anchorCount;
      const service = prescription.valueHierarchy.find((s) => s.name === p.service);
      return service?.evidenceCount ? Boolean(p.recommendedFirstReview) : !p.recommendedFirstReview;
    }) ?? false,
    noMoldExclusion: !finalist?.exclusion,
    noCopyOrBuild: true
  };
  return { passed: Object.values(checks).every(Boolean), checks };
}

module.exports = { renderGate1, architectQa };
