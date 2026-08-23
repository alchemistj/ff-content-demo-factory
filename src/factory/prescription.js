function slugify(text) { return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

function chooseRecommendation(page, classified) {
  let matches = classified.filter((review) => review.judgment?.services?.some((s) => s.toLowerCase() === page.service.toLowerCase()) || (review.judgment?.service || '').toLowerCase() === page.service.toLowerCase());
  // Home is a cross-service page: its recommendation is the strongest direct
  // customer account, not an arbitrary generic review.
  if (!matches.length && page.type === 'Home') matches = classified.filter((review) => review.judgment?.directCompletedService);
  const review = matches.find((r) => r.judgment.directCompletedService) || matches.find((r) => r.judgment.operatingPattern);
  if (!review) return null;
  return { reviewId: review.id, reviewer: review.reviewer, rating: review.rating, date: review.date, exactText: review.text, why: `Direct evidence for ${page.service}.` };
}

// The page prescriber consumes only this small authoritative classification
// contract; the model/evidence adapter that produces it is intentionally out
// of scope here.
function normalizeClassification(classification) {
  if (!classification || !Array.isArray(classification.reviews)) throw new Error('authoritative review classification is required');
  if (classification.reviews.some((entry) => entry.authoritative !== true)) throw new Error('Prescription requires authoritative judgment for every written review');
  const classified = classification.reviews.map((entry) => {
    const evidence = entry.authoritativeJudgment?.serviceEvidence || [];
    const services = evidence.map((item) => item.service).filter(Boolean);
    return { id: entry.id, reviewer: entry.sourceReview?.author, rating: entry.sourceReview?.rating, date: entry.sourceReview?.date, text: entry.sourceReview?.text || '', judgment: { directCompletedService: entry.authoritativeJudgment?.directCompletedService === true, operatingPattern: Boolean(entry.authoritativeJudgment?.availabilityEvidence?.length), services, service: services[0] } };
  });
  return { classified, authoritativeJudgmentCount: classification.authoritativeJudgmentCount || classified.length, authoritativeAnchorCount: classification.anchorCount ?? classified.filter((entry) => entry.judgment.directCompletedService).length };
}

function validateCollisions(pages) {
  const errors = [];
  const fields = ['url', 'primaryKeyword', 'title', 'h1'];
  for (const field of fields) {
    const seen = new Map();
    for (const page of pages) {
      const value = String(page[field] || '').trim().toLowerCase();
      if (!value) { errors.push(`${page.type}: missing ${field}`); continue; }
      if (seen.has(value)) errors.push(`${field} collision: ${page.type} and ${seen.get(value)}`);
      seen.set(value, page.type);
    }
  }
  return { valid: errors.length === 0, errors };
}

function compareServices(services, classified) {
  return services.map((service) => {
    const evidence = classified.filter((r) => (r.judgment?.services || []).map(String).map((s) => s.toLowerCase()).includes(String(service.name).toLowerCase()) || String(r.judgment?.service || '').toLowerCase() === String(service.name).toLowerCase());
    const direct = evidence.filter((r) => r.judgment.directCompletedService);
    return { ...service, evidenceCount: evidence.length, directCompletedEvidenceCount: direct.length, strongestEvidence: direct[0]?.id || evidence[0]?.id || null, supported: evidence.length > 0 };
  });
}

function prescribe({ finalist, inventory, classification, services, architectReview }) {
  if (!inventory && !classification) throw new Error('Cannot prescribe from discovery-sample-only reviews');
  if (classification) inventory = normalizeClassification(classification);
  if (inventory.discoverySampleOnly || !inventory.classified) throw new Error('Cannot prescribe from discovery-sample-only reviews');
  if (!inventory.authoritativeJudgmentCount) throw new Error('Cannot prescribe before authoritative review judgment');
  const compared = compareServices(services, inventory.classified);
  const eligible = compared.filter((s) => s.supported && !s.excluded);
  const pages = [{ type: 'Home', service: 'home', url: '/', primaryKeyword: `${finalist.category || finalist.name} ${finalist.location || ''}`.trim(), title: `${finalist.name} | ${finalist.location || ''}`.trim(), h1: `${finalist.name} for dependable local service` }];
  for (const service of eligible) {
    const slug = slugify(service.slug || service.name);
    pages.push({ type: 'Service', service: service.name, url: `/${slug}`, primaryKeyword: service.keyword || `${service.name} ${finalist.location || ''}`.trim(), title: `${service.name} in ${finalist.location || 'your area'}`, h1: `${service.name} that fits the job` });
  }
  pages.push({ type: 'Contact', service: 'contact', url: '/contact', primaryKeyword: `contact ${finalist.name}`, title: `Contact ${finalist.name}`, h1: `Talk with ${finalist.name}` });
  const collision = validateCollisions(pages);
  if (!collision.valid) throw new Error(`Prescription collision validation failed: ${collision.errors.join('; ')}`);
  const prescribedPages = pages.map((page) => ({ ...page, recommendedFirstReview: page.type === 'Contact' ? null : chooseRecommendation(page, inventory.classified), whyIncluded: page.type === 'Service' ? `Won service comparison with ${compared.find((s) => s.name === page.service)?.directCompletedEvidenceCount || 0} direct completed-service anchor(s).` : 'Required core site page.' }));
  return {
    version: 'page-prescription-v1', prospect: { placeId: finalist.placeId, name: finalist.name, location: finalist.location, website: finalist.website },
    pages: prescribedPages, valueHierarchy: compared.sort((a, b) => b.directCompletedEvidenceCount - a.directCompletedEvidenceCount),
    architectReview: architectReview || null, collisionValidation: collision,
    status: 'prescribed', generatedAt: new Date().toISOString()
  };
}

module.exports = { slugify, chooseRecommendation, validateCollisions, compareServices, normalizeClassification, prescribe };
