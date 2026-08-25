const { STANDARD_PRESCRIPTION_POLICY, validatePagePolicy, validateSourceBinding, assertNoServiceAliasCollisions, serviceIdentity, serviceTerm, canonicalServiceId, canonicalizeServiceCandidates, digest } = require('./prescription-policy');

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

function chooseRecommendation(page, classified, serviceLedger = null) {
  const target = page.type === 'Service' ? canonicalServiceId(page.canonicalIntentId || page.service, serviceLedger) : null;
  let matches = classified.filter((review) => review.judgment?.services?.some((s) => s && canonicalServiceId(s, serviceLedger) === target) || (review.judgment?.service && canonicalServiceId(review.judgment.service, serviceLedger) === target));
  if (!matches.length && page.type === 'Home') matches = classified.filter((review) => review.judgment?.directCompletedService);
  const review = matches.find((r) => r.judgment.directCompletedService) || matches.find((r) => r.judgment.operatingPattern);
  if (!review) return null;
  return { reviewId: review.id, reviewer: review.reviewer, rating: review.rating, date: review.date, exactText: review.text, why: `Direct evidence for ${page.service || 'the business'}.` };
}

function recommendationFor(page, supplied, classified, serviceLedger = null) {
  const recommendation = supplied == null ? chooseRecommendation(page, classified, serviceLedger) : supplied;
  if (recommendation == null) return null;
  const review = classified.find((entry) => String(entry.id) === String(recommendation.reviewId));
  if (!review || review.authoritative !== true) throw new Error(`${page.type || page.service}: recommendedFirstReview is not authoritative`);
  if (!recommendation.reviewer || recommendation.rating == null || !recommendation.date || !(recommendation.excerpt || recommendation.exactText || recommendation.exactTextRef || recommendation.exactTextReference || recommendation.reviewText) || !recommendation.why) throw new Error(`${page.type || page.service}: recommendedFirstReview lacks reviewer/rating/date/excerpt/why`);
  const service = page.type === 'Service' ? canonicalServiceId(page.canonicalIntentId || page.service, serviceLedger) : null;
  const fits = page.type !== 'Service' || review.judgment?.directCompletedService && (review.judgment.services || []).some((item) => canonicalServiceId(item, serviceLedger) === service) || review.judgment?.operatingPattern && (review.judgment.services || []).some((item) => canonicalServiceId(item, serviceLedger) === service);
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

function claimText(claim) {
  return typeof claim === 'string' ? claim : String(claim?.text || claim?.claim || '');
}

function claimEvidenceRefs(claim) {
  return Array.isArray(claim?.evidenceRefs) ? claim.evidenceRefs.filter((ref) => typeof ref === 'string' || (ref && typeof ref === 'object')).map((ref) => typeof ref === 'string' ? { id: ref, type: 'review' } : { ...ref, id: String(ref.id || ref.ref || ''), type: ref.type || 'review' }).filter((ref) => ref.id) : [];
}

function canonicalClaimService(value, serviceLedger) {
  return value ? canonicalServiceId(value, serviceLedger) : null;
}

function claimSourceHost(ref) {
  const value = ref?.sourceUrl || ref?.sourceDomain || null;
  if (!value) return null;
  try { return new URL(String(value)).hostname.replace(/^www\./, '').toLowerCase(); } catch { return String(value).replace(/^www\./, '').toLowerCase(); }
}

function validateClaimReferences(page, classified, serviceLedger, context = {}) {
  const rawClaims = page.claims == null ? [] : page.claims;
  const rawProposedClaims = page.proposedClaims == null ? [] : page.proposedClaims;
  if (!Array.isArray(rawClaims) || !Array.isArray(rawProposedClaims)) return ['claims and proposedClaims must be arrays'];
  const claims = [...rawClaims, ...rawProposedClaims];
  const reviews = new Map((classified || []).map((entry) => [String(entry.id), entry]));
  const crawlEvidence = new Map();
  for (const service of serviceLedger?.services || []) {
    for (const id of service.reviewIds || []) if (!reviews.has(String(id))) reviews.set(String(id), { id: String(id), ledgerOnly: true, service: service.id });
    for (const id of service.siteAuditCoverage?.crawlRefs || []) crawlEvidence.set(String(id), { id: String(id), service: service.id, coverage: service.siteAuditCoverage, sourceDomain: service.siteAuditCoverage.sourceDomain || service.siteAuditCoverage.websiteHost || null });
  }
  const errors = [];
  for (const claim of claims) {
    const text = claimText(claim).trim();
    if (!text) { errors.push(`${page.type || page.service}: claim text is required`); continue; }
    const refs = claimEvidenceRefs(claim);
    if (!refs.length) { errors.push(`${page.type || page.service}: every claim requires resolvable evidenceRefs`); continue; }
      const requestedService = canonicalClaimService(claim.service || claim.serviceId || page.service, serviceLedger);
    if (claim.prospectId && serviceLedger?.prospectId && String(claim.prospectId) !== String(serviceLedger.prospectId)) errors.push(`${page.type || page.service}: claim prospect binding is invalid`);
    for (const ref of refs) {
      const review = reviews.get(ref.id);
      const crawl = crawlEvidence.get(ref.id);
      if (!review && !crawl) { errors.push(`${page.type || page.service}: every claim requires resolvable evidenceRefs; evidence reference ${ref.id} is not in the bound source ledger`); continue; }
      if (crawl) {
        if (ref.type !== 'site-audit' || ref.directSupport !== true || !claimSourceHost(ref) || !crawl.sourceDomain || claimSourceHost(ref) !== String(crawl.sourceDomain).replace(/^www\./, '').toLowerCase()) errors.push(`${page.type || page.service}: site evidence ${ref.id} lacks direct source/domain support`);
        if (requestedService && canonicalClaimService(crawl.service, serviceLedger) !== requestedService) errors.push(`${page.type || page.service}: evidence ${ref.id} does not support this service`);
        continue;
      }
      if (review.ledgerOnly) { errors.push(`${page.type || page.service}: review ${ref.id} has no authoritative source record`); continue; }
      if (ref.type !== 'review') errors.push(`${page.type || page.service}: review evidence ${ref.id} has an invalid evidence type`);
      const judgment = review.authoritativeJudgment || review.judgment || {};
      if (review.authoritative !== true || judgment.directCompletedService !== true) errors.push(`${page.type || page.service}: evidence ${ref.id} is not direct completed-service support`);
      const supportedServices = (judgment.serviceEvidence || judgment.services || []).map((item) => canonicalClaimService(typeof item === 'string' ? item : item.service, serviceLedger)).filter(Boolean);
      const strictServiceBinding = serviceLedger?.strictEvidenceBinding === true || claim.service || claim.serviceId || ref.service;
      if (serviceLedger?.strictEvidenceBinding === true && page.type === 'Service' && !claim.service && !claim.serviceId && !ref.service && String(page.strongestEvidence || '') !== ref.id) errors.push(`${page.type || page.service}: bare evidence reference ${ref.id} is not bound to the target page`);
      if (strictServiceBinding && requestedService && supportedServices.length && !supportedServices.includes(requestedService)) errors.push(`${page.type || page.service}: review ${ref.id} does not directly support this service`);
      if (claim.source && String(claim.source) !== String(review.sourceReview?.source || review.provenance?.source || '')) errors.push(`${page.type || page.service}: review ${ref.id} source binding is invalid`);
      const sourceDomain = claimSourceHost(ref);
      if (sourceDomain && sourceDomain !== claimSourceHost({ sourceUrl: review.sourceReview?.reviewUrl || review.sourceReview?.sourceUrl || review.provenance?.sourceUrl })) errors.push(`${page.type || page.service}: review ${ref.id} domain binding is invalid`);
    }
  }
  return errors;
}

function compareServices(services, classified, pages = [], serviceLedger = null) {
  const normalizedServices = canonicalizeServiceCandidates(services || [], serviceLedger);
  const compared = normalizedServices.map((service) => {
    const id = service.canonicalIntentId;
    const evidence = classified.filter((r) => (r.judgment?.services || []).some((s) => s && canonicalServiceId(s, serviceLedger) === id) || (r.judgment?.service && canonicalServiceId(r.judgment.service, serviceLedger) === id));
    const direct = evidence.filter((r) => r.judgment.directCompletedService);
    const page = pages.find((p) => p.type === 'Service' && (p.canonicalIntentId || canonicalServiceId(p.service || p.serviceId, serviceLedger)) === id);
    return { ...service, id: service.sourceServiceId, canonicalServiceId: id, canonicalIntentId: id, evidenceCount: evidence.length, directCompletedEvidenceCount: direct.length, strongestEvidence: direct[0]?.id || evidence[0]?.id || null, includedPage: Boolean(page), passedOverReason: page ? null : (service.passedOverReason || (evidence.length ? 'Architect passed this service over despite evidence; retained for review.' : 'No authoritative review evidence for this service.')), supported: evidence.length > 0 };
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
    errors.push(...validateClaimReferences(page, classified, options.serviceLedger || null));
    const recommendation = recommendationFor(page, page.recommendedFirstReview, classified, options.serviceLedger || null);
    const target = page.type === 'Service' ? page.canonicalIntentId || canonicalServiceId(page.service, options.serviceLedger || null) : null;
    const hasEvidence = page.type === 'Service' && classified.some((review) => review.judgment?.services?.some((s) => canonicalServiceId(s, options.serviceLedger || null) === target) && (review.judgment.directCompletedService || review.judgment.operatingPattern));
    if (hasEvidence && !recommendation) errors.push(`${page.type || page.service}: missing recommendedFirstReview despite evidence`);
    if (recommendation && !recommendation.reviewId) errors.push(`${page.type || page.service}: invalid recommendedFirstReview`);
    page.recommendedFirstReview = recommendation || null;
  }
  const collision = validateCollisions(pages);
  if (!collision.valid) errors.push(...collision.errors);
  let policy = null;
  try {
    policy = validatePagePolicy({ pages, services, serviceLedger: options.serviceLedger || null, policy: options.policy || STANDARD_PRESCRIPTION_POLICY, override: options.override || null, runContext: options.runContext || {}, sourceBinding: options.sourceBinding || {}, evidenceDigest: options.evidenceDigest || null });
    pages.splice(0, pages.length, ...policy.normalizedPages);
  } catch (error) {
    errors.push(error.message);
  }
  return { errors, collision, policy };
}

function prescribe({ finalist, inventory, classification, services, proposedPages, architectReview, policy, override, runContext, sourceBinding, serviceLedger }) {
  if (!inventory && !classification) throw new Error('Cannot prescribe from discovery-sample-only reviews');
  if (classification) inventory = normalizeClassification(classification);
  if (inventory.discoverySampleOnly || !inventory.classified) throw new Error('Cannot prescribe from discovery-sample-only reviews');
  if (!inventory.authoritativeJudgmentCount) throw new Error('Cannot prescribe before authoritative review judgment');
  const pages = (proposedPages || []).map((page) => ({ ...page }));
  const ledger = serviceLedger || sourceBinding?.serviceLedger || null;
  validateSourceBinding(sourceBinding, ledger);
  const valueHierarchy = compareServices(services, inventory.classified, pages, ledger);
  const evidenceDigest = digest({ classification: inventory.classified, valueHierarchy, serviceLedger: ledger || null });
  const pageCheck = validateProposedPages(pages, inventory.classified, valueHierarchy, { policy, override, runContext, sourceBinding, serviceLedger: ledger, evidenceDigest });
  if (pageCheck.errors.length) throw new Error(`Prescription validation failed: ${pageCheck.errors.join('; ')}`);
  const selected = new Set((pageCheck.policy?.selectedServiceIds || []));
  const normalizedHierarchy = valueHierarchy.map((entry) => ({ ...entry, includedPage: selected.has(entry.canonicalIntentId), passedOverReason: selected.has(entry.canonicalIntentId) ? null : (entry.passedOverReason || 'Evidence preserved; not selected for a business-page destination under the active page policy.') }));
  const prescription = { version: 'page-prescription-v2', prospect: { prospectId: runContext?.prospectId || finalist.prospectId || finalist.placeId, placeId: runContext?.placeId || finalist.placeId, name: finalist.name, location: finalist.location, website: finalist.website }, runId: runContext?.runId || null, pages, valueHierarchy: normalizedHierarchy, architectReview: architectReview || null, collisionValidation: pageCheck.collision, pagePolicy: pageCheck.policy.policy, policyMode: pageCheck.policy.policyMode, allowedServicePageCount: pageCheck.policy.allowedServicePageCount, expansionOverride: pageCheck.policy.override, selectedServiceIds: pageCheck.policy.selectedServiceIds, serviceCoverageLedger: ledger || null, evidenceDigest, pageSetDigest: pageCheck.policy.pageSetDigest, sourceIdentity: sourceBinding.sourceIdentity, sourceArtifactDigest: sourceBinding.sourceArtifactDigest, status: 'prescribed', generatedAt: new Date().toISOString() };
  prescription.prescriptionDigest = digest({ ...prescription, prescriptionDigest: undefined });
  return prescription;
}

module.exports = { normalizeClassification, serviceTerm, chooseRecommendation, validateCollisions, validateClaimReferences, compareServices, validateProposedPages, prescribe };
