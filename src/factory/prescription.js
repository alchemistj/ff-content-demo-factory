function normalizeClassification(classification) {
  if (!classification || !Array.isArray(classification.reviews)) throw new Error('authoritative review classification is required');
  if (classification.reviews.some((entry) => entry.authoritative !== true)) throw new Error('Prescription requires authoritative judgment for every written review');
  const classified = classification.reviews.map((entry) => {
    const evidence = entry.authoritativeJudgment?.serviceEvidence || [];
    const services = evidence.map((item) => String(item.service || '')).filter(Boolean);
    return { id: entry.id, authoritative: true, reviewer: entry.sourceReview?.author, rating: entry.sourceReview?.rating, date: entry.sourceReview?.date, text: entry.sourceReview?.text || '', judgment: { directCompletedService: entry.authoritativeJudgment?.directCompletedService === true, operatingPattern: Boolean(entry.authoritativeJudgment?.availabilityEvidence?.length), services, service: services[0] } };
  });
  return { classified, authoritativeJudgmentCount: classification.authoritativeJudgmentCount || classified.length, authoritativeAnchorCount: classification.anchorCount ?? classified.filter((entry) => entry.judgment.directCompletedService).length };
}

function chooseRecommendation(page, classified) {
  let matches = classified.filter((review) => review.judgment?.services?.some((s) => String(s).toLowerCase() === String(page.service || '').toLowerCase()) || String(review.judgment?.service || '').toLowerCase() === String(page.service || '').toLowerCase());
  if (!matches.length && page.type === 'Home') matches = classified.filter((review) => review.judgment?.directCompletedService);
  const review = matches.find((r) => r.judgment.directCompletedService) || matches.find((r) => r.judgment.operatingPattern);
  if (!review) return null;
  return { reviewId: review.id, reviewer: review.reviewer, rating: review.rating, date: review.date, exactText: review.text, why: `Direct evidence for ${page.service || 'the business'}.` };
}

function recommendationFor(page, supplied, classified) {
  const recommendation = supplied == null ? chooseRecommendation(page, classified) : supplied;
  if (recommendation == null) return null;
  const review = classified.find((entry) => String(entry.id) === String(recommendation.reviewId));
  if (!review || review.authoritative !== true) throw new Error(`${page.type || page.service}: recommendedFirstReview is not authoritative`);
  if (!recommendation.reviewer || recommendation.rating == null || !recommendation.date || !(recommendation.excerpt || recommendation.exactText || recommendation.exactTextRef || recommendation.exactTextReference || recommendation.reviewText) || !recommendation.why) throw new Error(`${page.type || page.service}: recommendedFirstReview lacks reviewer/rating/date/excerpt/why`);
  const service = String(page.service || '').toLowerCase();
  const fits = page.type === 'Home' || review.judgment?.directCompletedService && (review.judgment.services || []).some((item) => String(item).toLowerCase() === service) || review.judgment?.operatingPattern && (review.judgment.services || []).some((item) => String(item).toLowerCase() === service);
  if (!fits) throw new Error(`${page.type || page.service}: recommendedFirstReview does not fit page service`);
  return { ...recommendation, reviewId: review.id };
}

function validateCollisions(pages) {
  const errors = [];
  const fields = [['url', 'url'], ['primaryKeyword', 'primaryKeyword'], ['titleDirection', 'title'], ['h1Direction', 'h1']];
  for (const [field, label] of fields) {
    const seen = new Map();
    for (const page of pages) {
      const value = String(page[field] || page[label] || '').trim().toLowerCase();
      if (!value) { errors.push(`${page.type || page.service}: missing ${label}`); continue; }
      if (seen.has(value)) errors.push(`${label} collision: ${page.type || page.service} and ${seen.get(value)}`);
      seen.set(value, page.type || page.service);
    }
  }
  return { valid: errors.length === 0, errors };
}

function compareServices(services, classified, pages = []) {
  const compared = (services || []).map((service) => {
    const id = String(service.id || service.name || service.slug || '').toLowerCase();
    const evidence = classified.filter((r) => (r.judgment?.services || []).map((s) => String(s).toLowerCase()).includes(id) || String(r.judgment?.service || '').toLowerCase() === id);
    const direct = evidence.filter((r) => r.judgment.directCompletedService);
    const page = pages.find((p) => String(p.service || p.serviceId || '').toLowerCase() === id);
    return { ...service, id: service.id || service.name || service.slug, evidenceCount: evidence.length, directCompletedEvidenceCount: direct.length, strongestEvidence: direct[0]?.id || evidence[0]?.id || null, includedPage: Boolean(page), passedOverReason: page ? null : (service.passedOverReason || (evidence.length ? 'Architect passed this service over despite evidence; retained for review.' : 'No authoritative review evidence for this service.')), supported: evidence.length > 0 };
  });
  if (compared.length !== (services || []).length) throw new Error('Every candidate service must be compared');
  return compared;
}

const REQUIRED_PAGE_FIELDS = ['url', 'primaryKeyword', 'titleDirection', 'h1Direction', 'angle', 'whyIncluded', 'overlapBoundaries', 'claims', 'traps'];

function validateProposedPages(pages, classified) {
  if (!Array.isArray(pages) || !pages.length) throw new Error('Architect must supply explicit proposed pages');
  const errors = [];
  for (const page of pages) {
    for (const field of REQUIRED_PAGE_FIELDS) if (page[field] == null || (typeof page[field] === 'string' && !page[field].trim())) errors.push(`${page.type || 'page'}: missing ${field}`);
    if (!Object.prototype.hasOwnProperty.call(page, 'strongestEvidence')) errors.push(`${page.type || 'page'}: missing strongestEvidence (use null when not appropriate)`);
    const recommendation = recommendationFor(page, page.recommendedFirstReview, classified);
    const hasEvidence = classified.some((review) => review.judgment?.services?.some((s) => String(s).toLowerCase() === String(page.service || '').toLowerCase()) && (review.judgment.directCompletedService || review.judgment.operatingPattern));
    if (hasEvidence && !recommendation) errors.push(`${page.type || page.service}: missing recommendedFirstReview despite evidence`);
    if (recommendation && !recommendation.reviewId) errors.push(`${page.type || page.service}: invalid recommendedFirstReview`);
    page.recommendedFirstReview = recommendation || null;
  }
  const collision = validateCollisions(pages);
  if (!collision.valid) errors.push(...collision.errors);
  return { errors, collision };
}

function prescribe({ finalist, inventory, classification, services, proposedPages, architectReview }) {
  if (!inventory && !classification) throw new Error('Cannot prescribe from discovery-sample-only reviews');
  if (classification) inventory = normalizeClassification(classification);
  if (inventory.discoverySampleOnly || !inventory.classified) throw new Error('Cannot prescribe from discovery-sample-only reviews');
  if (!inventory.authoritativeJudgmentCount) throw new Error('Cannot prescribe before authoritative review judgment');
  const pages = (proposedPages || []).map((page) => ({ ...page }));
  const pageCheck = validateProposedPages(pages, inventory.classified);
  if (pageCheck.errors.length) throw new Error(`Prescription validation failed: ${pageCheck.errors.join('; ')}`);
  const valueHierarchy = compareServices(services, inventory.classified, pages);
  return { version: 'page-prescription-v1', prospect: { placeId: finalist.placeId, name: finalist.name, location: finalist.location, website: finalist.website }, pages, valueHierarchy, architectReview: architectReview || null, collisionValidation: pageCheck.collision, status: 'prescribed', generatedAt: new Date().toISOString() };
}

module.exports = { normalizeClassification, chooseRecommendation, validateCollisions, compareServices, validateProposedPages, prescribe };
