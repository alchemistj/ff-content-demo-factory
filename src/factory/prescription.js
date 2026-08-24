const { STANDARD_PRESCRIPTION_POLICY, validatePagePolicy, assertNoServiceAliasCollisions, serviceIdentity, digest } = require('./prescription-policy');

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

function serviceTerm(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ''); }

function chooseRecommendation(page, classified) {
  let matches = classified.filter((review) => review.judgment?.services?.some((s) => serviceTerm(s) === serviceTerm(page.service)) || serviceTerm(review.judgment?.service) === serviceTerm(page.service));
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
  const service = serviceTerm(page.service);
  const fits = page.type === 'Home' || review.judgment?.directCompletedService && (review.judgment.services || []).some((item) => serviceTerm(item) === service) || review.judgment?.operatingPattern && (review.judgment.services || []).some((item) => serviceTerm(item) === service);
  if (!fits) throw new Error(`${page.type || page.service}: recommendedFirstReview does not fit page service`);
  const citedText = String(recommendation.excerpt || recommendation.exactText || recommendation.reviewText || '').trim();
  if (citedText && !String(review.text || '').replace(/\s+/g, ' ').toLowerCase().includes(citedText.replace(/\s+/g, ' ').toLowerCase())) {
    throw new Error(`${page.type || page.service}: recommendedFirstReview excerpt does not match its authoritative review`);
  }
  // Reviewer metadata is evidence, not model-authored copy. Resolve it from
  // the authoritative classification instead of trusting duplicated fields.
  return {
    ...recommendation,
    reviewId: review.id,
    reviewer: review.reviewer,
    rating: review.rating,
    date: review.date,
    exactText: review.text,
    excerpt: citedText || review.text,
  };
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
  assertNoServiceAliasCollisions(services || []);
  const compared = (services || []).map((service) => {
    const id = serviceTerm(service.id || service.name || service.slug || '');
    const evidence = classified.filter((r) => (r.judgment?.services || []).some((s) => serviceTerm(s) === id) || serviceTerm(r.judgment?.service) === id);
    const direct = evidence.filter((r) => r.judgment.directCompletedService);
    const page = pages.find((p) => serviceTerm(p.service || p.serviceId) === id);
    return { ...service, id: service.id || service.name || service.slug, evidenceCount: evidence.length, directCompletedEvidenceCount: direct.length, strongestEvidence: direct[0]?.id || evidence[0]?.id || null, includedPage: Boolean(page), passedOverReason: page ? null : (service.passedOverReason || (evidence.length ? 'Architect passed this service over despite evidence; retained for review.' : 'No authoritative review evidence for this service.')), supported: evidence.length > 0 };
  });
  if (compared.length !== (services || []).length) throw new Error('Every candidate service must be compared');
  return compared;
}

const REQUIRED_PAGE_FIELDS = ['url', 'primaryKeyword', 'titleDirection', 'h1Direction', 'angle', 'whyIncluded', 'overlapBoundaries', 'claims', 'traps'];

function validateProposedPages(pages, classified, services = [], options = {}) {
  if (!Array.isArray(pages) || !pages.length) throw new Error('Architect must supply explicit proposed pages');
  const errors = [];
  for (const page of pages) {
    for (const field of REQUIRED_PAGE_FIELDS) if (page[field] == null || (typeof page[field] === 'string' && !page[field].trim())) errors.push(`${page.type || 'page'}: missing ${field}`);
    if (!Object.prototype.hasOwnProperty.call(page, 'strongestEvidence')) errors.push(`${page.type || 'page'}: missing strongestEvidence (use null when not appropriate)`);
    const recommendation = recommendationFor(page, page.recommendedFirstReview, classified);
    const hasEvidence = classified.some((review) => review.judgment?.services?.some((s) => serviceTerm(s) === serviceTerm(page.service)) && (review.judgment.directCompletedService || review.judgment.operatingPattern));
    if (hasEvidence && !recommendation) errors.push(`${page.type || page.service}: missing recommendedFirstReview despite evidence`);
    if (recommendation && !recommendation.reviewId) errors.push(`${page.type || page.service}: invalid recommendedFirstReview`);
    page.recommendedFirstReview = recommendation || null;
  }
  const collision = validateCollisions(pages);
  if (!collision.valid) errors.push(...collision.errors);
  let policy = null;
  try {
    policy = validatePagePolicy({ pages, services, policy: options.policy || STANDARD_PRESCRIPTION_POLICY, override: options.override || null, runContext: options.runContext || {}, sourceBinding: options.sourceBinding || {} });
  } catch (error) {
    errors.push(error.message);
  }
  return { errors, collision, policy };
}

function prescribe({ finalist, inventory, classification, services, proposedPages, architectReview, policy, override, runContext, sourceBinding }) {
  if (!inventory && !classification) throw new Error('Cannot prescribe from discovery-sample-only reviews');
  if (classification) inventory = normalizeClassification(classification);
  if (inventory.discoverySampleOnly || !inventory.classified) throw new Error('Cannot prescribe from discovery-sample-only reviews');
  if (!inventory.authoritativeJudgmentCount) throw new Error('Cannot prescribe before authoritative review judgment');
  const pages = (proposedPages || []).map((page) => ({ ...page }));
  const valueHierarchy = compareServices(services, inventory.classified, pages);
  const pageCheck = validateProposedPages(pages, inventory.classified, valueHierarchy, { policy, override, runContext, sourceBinding });
  if (pageCheck.errors.length) throw new Error(`Prescription validation failed: ${pageCheck.errors.join('; ')}`);
  const selected = new Set((pageCheck.policy?.selectedServiceIds || []).map((id) => serviceTerm(id)));
  const normalizedHierarchy = valueHierarchy.map((entry) => ({ ...entry, includedPage: selected.has(serviceTerm(serviceIdentity(entry))), passedOverReason: selected.has(serviceTerm(serviceIdentity(entry))) ? null : (entry.passedOverReason || 'Evidence preserved; not selected for a business-page destination under the active page policy.') }));
  const prescription = { version: 'page-prescription-v1', prospect: { placeId: finalist.placeId, name: finalist.name, location: finalist.location, website: finalist.website }, pages, valueHierarchy: normalizedHierarchy, architectReview: architectReview || null, collisionValidation: pageCheck.collision, pagePolicy: pageCheck.policy.policy, expansionOverride: pageCheck.policy.override, selectedServiceIds: pageCheck.policy.selectedServiceIds, status: 'prescribed', generatedAt: new Date().toISOString() };
  prescription.prescriptionDigest = digest({ ...prescription, prescriptionDigest: undefined });
  return prescription;
}

module.exports = { normalizeClassification, serviceTerm, chooseRecommendation, validateCollisions, compareServices, validateProposedPages, prescribe };
