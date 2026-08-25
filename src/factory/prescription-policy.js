'use strict';

const crypto = require('node:crypto');

const STANDARD_PRESCRIPTION_POLICY = Object.freeze({
  version: 'business-page-policy-v1',
  mode: 'standard',
  homeRoute: '/',
  contactRoute: '/contact',
  servicePageCount: 2,
  businessPageCount: 4,
});
const AUTHORITATIVE_APPROVERS = Object.freeze(['Josh Lenz']);
const GENERIC_INTENT = /^(?:spring|opener|repair|replacement|installation|service|maintenance)$/i;

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}

function digest(value) {
  return `sha256:${crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex')}`;
}

function serviceTerm(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function normalizeServiceKey(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function serviceIdentity(service) {
  return String(service?.id || service?.name || service?.slug || '').trim();
}

function routePath(value) {
  return String(value || '').replace(/\/$/, '') || '/';
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)?$/.test(value)) return false;
  return !Number.isNaN(Date.parse(value));
}

function isExactStandardPolicy(policy) {
  return JSON.stringify(canonical(policy || {})) === JSON.stringify(canonical(STANDARD_PRESCRIPTION_POLICY));
}

function pageId(page) {
  return String(page?.id || `${page?.type || 'Page'}:${routePath(page?.url)}`).trim();
}

function pageSetDigest(pages) {
  return digest((pages || []).map((page) => ({ id: pageId(page), type: page.type, canonicalIntentId: page.canonicalIntentId || null, service: page.service || null, url: routePath(page.url), primaryKeyword: page.primaryKeyword, titleDirection: page.titleDirection, h1Direction: page.h1Direction })));
}

function validateSourceIdentity(sourceIdentity) {
  if (!sourceIdentity || typeof sourceIdentity !== 'object' || Array.isArray(sourceIdentity)) throw new Error('source identity is required');
  for (const field of ['provider', 'runId', 'artifactId', 'sourceSha', 'rootIdentity']) {
    if (sourceIdentity[field] == null || String(sourceIdentity[field]).trim() === '') throw new Error(`source identity is missing ${field}`);
  }
  return sourceIdentity;
}

function validateSourceBinding(sourceBinding = {}, serviceLedger = null) {
  if (!sourceBinding || typeof sourceBinding !== 'object') throw new Error('source binding is required');
  if (typeof sourceBinding.sourceArtifactDigest !== 'string' || !/^sha256:[a-f0-9]{8,}$/i.test(sourceBinding.sourceArtifactDigest)) throw new Error('source artifact digest is required');
  const sourceIdentity = validateSourceIdentity(sourceBinding.sourceIdentity);
  if (serviceLedger) {
    const ledgerIdentity = validateSourceIdentity(serviceLedger.sourceIdentity);
    if (JSON.stringify(canonical(ledgerIdentity)) !== JSON.stringify(canonical(sourceIdentity))) throw new Error('canonical service ledger source identity mismatch');
  }
  return sourceIdentity;
}

function ledgerMaps(ledger) {
  const entries = new Map();
  for (const entry of ledger?.services || []) {
    const key = normalizeServiceKey(entry.id);
    if (!key || entries.has(key)) throw new Error(`canonical service ledger has a canonical-id collision: ${entry.id}`);
    entries.set(key, entry);
  }
  const aliases = new Map();
  for (const [raw, target] of Object.entries(ledger?.aliases || {})) {
    const key = normalizeServiceKey(raw);
    const canonicalTarget = normalizeServiceKey(target);
    if (!key || !canonicalTarget) throw new Error('canonical service ledger contains an empty alias');
    if (aliases.has(key)) throw new Error(`canonical service ledger alias collision: ${raw}`);
    if (entries.has(key) && key !== canonicalTarget) throw new Error(`canonical service ledger alias conflicts with canonical family: ${raw}`);
    if (!entries.has(canonicalTarget)) throw new Error(`canonical service ledger alias ${raw} targets an unmapped canonical intent ${target}`);
    aliases.set(key, canonicalTarget);
  }
  return { entries, aliases };
}

function canonicalServiceId(raw, ledger, { allowImplicit = true } = {}) {
  const rawId = String(raw || '').trim();
  if (!rawId) throw new Error('service intent is empty');
  const { entries, aliases } = ledgerMaps(ledger);
  const normalized = normalizeServiceKey(rawId);
  const mapped = aliases.get(normalized) || (entries.has(normalized) ? normalized : null);
  if (mapped) {
    if (!entries.has(mapped)) throw new Error(`service ledger alias ${rawId} targets an unmapped canonical intent ${mapped}`);
    return mapped;
  }
  if (!allowImplicit || GENERIC_INTENT.test(rawId) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(rawId)) throw new Error(`unmapped generic service intent: ${rawId}`);
  return rawId;
}

function assertNoServiceAliasCollisions(services) {
  const seen = new Map();
  for (const service of services || []) {
    const id = serviceIdentity(service);
    if (!id) throw new Error('candidate service is missing a stable id');
    const key = serviceTerm(id);
    if (!key) throw new Error(`candidate service ${id} has an empty canonical id`);
    const normalized = normalizeServiceKey(id);
    if (!normalized) throw new Error(`candidate service ${id} has an empty normalized id`);
    if (seen.has(normalized) && seen.get(normalized) !== id) throw new Error(`service alias collision: ${seen.get(normalized)} and ${id}`);
    seen.set(normalized, id);
  }
  return true;
}

function canonicalizeServiceCandidates(services, ledger = null) {
  if (!Array.isArray(services) || !services.length) throw new Error('candidate service comparison is required');
  if (!ledger) assertNoServiceAliasCollisions(services);
  return services.map((service) => {
    const rawId = serviceIdentity(service);
    const canonicalIntentId = canonicalServiceId(rawId, ledger);
    if (service.canonicalIntentId && service.canonicalIntentId !== canonicalIntentId) throw new Error(`candidate service ${rawId} has a mismatched canonical intent`);
    if (service.canonicalServiceId && service.canonicalServiceId !== canonicalIntentId) throw new Error(`candidate service ${rawId} has a mismatched canonical service`);
    if (ledger && !ledgerMaps(ledger).entries.has(canonicalIntentId)) throw new Error(`candidate service ${rawId} is not mapped in the prospect service ledger`);
    return { ...service, sourceServiceId: rawId, canonicalServiceId: canonicalIntentId, canonicalIntentId };
  });
}

function validateCompleteCanonicalLedger(ledger, { services = [], pages = [], identity = {} } = {}) {
  if (!ledger || ledger.version !== 'canonical-service-coverage-ledger-v1') throw new Error('complete canonical service ledger is required in production');
  if (!ledger.prospectId && !ledger.placeId) throw new Error('canonical service ledger is missing prospect identity');
  if (identity.prospectId != null && String(ledger.prospectId) !== String(identity.prospectId)) throw new Error('canonical service ledger prospect identity mismatch');
  if (identity.placeId != null && String(ledger.placeId) !== String(identity.placeId)) throw new Error('canonical service ledger place identity mismatch');
  if (identity.runId != null && String(ledger.runId) !== String(identity.runId)) throw new Error('canonical service ledger run identity mismatch');
  if (identity.sourceIdentity) {
    validateSourceIdentity(identity.sourceIdentity);
    if (JSON.stringify(canonical(ledger.sourceIdentity || {})) !== JSON.stringify(canonical(identity.sourceIdentity))) throw new Error('canonical service ledger source identity mismatch');
  }
  if (!Array.isArray(ledger.services) || !ledger.services.length) throw new Error('canonical service ledger is incomplete');
  const { entries } = ledgerMaps(ledger);
  for (const service of ledger.services) {
    if (normalizeServiceKey(service.id) !== service.id || !service.name || !Array.isArray(service.reviewIds) || !Array.isArray(service.currentSitePageUrls) || (identity.requireSiteAuditCoverage && !service.siteAuditCoverage)) throw new Error(`canonical service ledger entry is incomplete: ${service.id || '<missing>'}`);
  }
  for (const candidate of services || []) canonicalServiceId(serviceIdentity(candidate), ledger, { allowImplicit: false });
  for (const page of pages || []) if (page.type === 'Service') canonicalServiceId(page.service, ledger, { allowImplicit: false });
  if (!entries.size) throw new Error('canonical service ledger has no canonical families');
  return ledger;
}

function canonicalizePageServices(pages, ledger = null) {
  const seen = new Map();
  return (pages || []).map((page) => {
    if (page.type !== 'Service') return { ...page };
    const canonicalIntentId = canonicalServiceId(page.service, ledger);
    if (page.canonicalIntentId && page.canonicalIntentId !== canonicalIntentId) throw new Error(`page ${pageId(page)} has a mismatched canonical intent`);
    if (canonicalIntentId === 'home-breadth') throw new Error('Home-level supporting evidence cannot become a Service route');
    if (seen.has(canonicalIntentId)) throw new Error(`multiple service pages resolve to canonical family ${canonicalIntentId}`);
    seen.set(canonicalIntentId, pageId(page));
    return { ...page, canonicalIntentId, id: pageId(page) };
  });
}

function collapseForRanking(services) {
  const groups = new Map();
  for (const service of services) {
    const id = service.canonicalIntentId || service.canonicalServiceId || serviceIdentity(service);
    const existing = groups.get(id) || { ...service, id, canonicalIntentId: id, directEvidenceReviewIds: new Set(), directCompletedEvidenceCount: 0, evidenceCount: 0 };
    for (const reviewId of service.directEvidenceReviewIds || []) existing.directEvidenceReviewIds.add(reviewId);
    existing.directCompletedEvidenceCount = Math.max(existing.directCompletedEvidenceCount, Number(service.directCompletedEvidenceCount || 0), existing.directEvidenceReviewIds.size);
    existing.evidenceCount += Number(service.evidenceCount || 0);
    groups.set(id, existing);
  }
  return [...groups.values()].map((entry) => ({ ...entry, directEvidenceReviewIds: [...entry.directEvidenceReviewIds] }));
}

function evidenceScore(service) {
  const direct = Number(service.directCompletedEvidenceCount ?? service.directEvidenceCount ?? 0);
  const evidence = Number(service.evidenceCount ?? service.authoritativeEvidenceCount ?? 0);
  return { direct: Number.isFinite(direct) ? direct : 0, evidence: Number.isFinite(evidence) ? evidence : 0 };
}

function rankCandidateServices(services, ledger = null) {
  const normalized = canonicalizeServiceCandidates(services, ledger);
  return collapseForRanking(normalized).map((service, index) => ({ service, index, id: service.canonicalIntentId, ...evidenceScore(service) })).sort((left, right) => right.direct - left.direct || right.evidence - left.evidence || left.id.localeCompare(right.id));
}

function selectTopServiceDestinations(services, count = STANDARD_PRESCRIPTION_POLICY.servicePageCount, ledger = null) {
  const ranked = rankCandidateServices(services, ledger);
  // Home-level breadth is a canonical evidence family, but never a service
  // destination. It must be preserved in comparison and may support Home;
  // it cannot displace a genuine service family in the page ranking.
  const eligible = ranked.filter((entry) => entry.direct > 0 && entry.id !== 'home-breadth');
  if (eligible.length < count) throw new Error(`only ${eligible.length} evidence-backed service candidates available; ${count} required`);
  return eligible.slice(0, count).map((entry) => entry.id);
}

function approvalPayload(override) {
  const { overrideDigest, ...unsigned } = override || {};
  return unsigned;
}

function validateExpansionOverride(override, { pages, policy, runContext = {}, sourceBinding = {}, evidenceDigest = null } = {}) {
  if (!override) return { mode: 'standard', override: null };
  if (!isExactStandardPolicy(policy)) throw new Error('standard prescription policy object was altered');
  const required = ['overrideId', 'prospectId', 'runId', 'policyVersion', 'approvedPageIds', 'approvedCanonicalIntentIds', 'approvedBy', 'approvedAt', 'reason', 'sourceArtifactDigest', 'evidenceDigest', 'overrideDigest'];
  for (const field of required) if (override[field] == null || override[field] === '' || (Array.isArray(override[field]) && !override[field].length)) throw new Error(`expansion override missing ${field}`);
  if (override.mode !== 'expanded-one-off' || override.policyVersion !== STANDARD_PRESCRIPTION_POLICY.version) throw new Error('expansion override policy version is invalid');
  if (!AUTHORITATIVE_APPROVERS.includes(override.approvedBy)) throw new Error('expansion override approver is not authoritative');
  if (!validDate(override.approvedAt) || (override.expiresAt != null && (!validDate(override.expiresAt) || Date.parse(override.expiresAt) < Date.parse(override.approvedAt)))) throw new Error('expansion override approval dates are invalid');
  if (override.expiresAt && Date.parse(override.expiresAt) < Date.parse(runContext.now || new Date().toISOString())) throw new Error('expansion override is stale');
  if (String(override.prospectId) !== String(runContext.prospectId) || String(override.runId) !== String(runContext.runId)) throw new Error('expansion override prospect/run mismatch');
  if (!sourceBinding || !sourceBinding.sourceArtifactDigest || sourceBinding.sourceArtifactDigest !== override.sourceArtifactDigest) throw new Error('expansion override source artifact binding is empty or mismatched');
  if (evidenceDigest && override.evidenceDigest !== evidenceDigest) throw new Error('expansion override evidence digest mismatch');
  const actualPageIds = pages.map(pageId).sort();
  const actualIntentIds = pages.filter((page) => page.type === 'Service').map((page) => page.canonicalIntentId).sort();
  if (JSON.stringify([...override.approvedPageIds].sort()) !== JSON.stringify(actualPageIds)) throw new Error('expansion override approved page IDs mismatch');
  if (JSON.stringify([...override.approvedCanonicalIntentIds].sort()) !== JSON.stringify(actualIntentIds)) throw new Error('expansion override approved canonical intent IDs mismatch');
  if (String(override.pageSetDigest || '') !== pageSetDigest(pages)) throw new Error('expansion override page-set digest mismatch');
  if (digest(approvalPayload(override)) !== override.overrideDigest) throw new Error('expansion override digest is invalid or tampered');
  const serviceCount = pages.filter((page) => page.type === 'Service').length;
  if (serviceCount <= STANDARD_PRESCRIPTION_POLICY.servicePageCount) throw new Error('expansion override must expand the standard service count');
  return { mode: 'expanded-one-off', override: { ...override } };
}

function validatePagePolicy({ pages, services, serviceLedger = null, policy = STANDARD_PRESCRIPTION_POLICY, override = null, runContext = {}, sourceBinding = {}, evidenceDigest = null } = {}) {
  if (!Array.isArray(pages)) throw new Error('prescription pages must be an array');
  if (!serviceLedger) throw new Error('canonical service ledger is required at the page-policy boundary');
  if (sourceBinding && (sourceBinding.sourceIdentity || sourceBinding.sourceArtifactDigest)) validateSourceBinding(sourceBinding, serviceLedger);
  if (!isExactStandardPolicy(policy)) throw new Error('standard prescription policy object was altered');
  if (pages.some((page) => page.type === 'Strategy Overview' || page.type === 'Strategy')) throw new Error('Strategy Overview is not a business page and must not be in prescription.pages');
  validateCompleteCanonicalLedger(serviceLedger, { services, pages, identity: { prospectId: runContext.prospectId, placeId: runContext.placeId, runId: runContext.runId, sourceIdentity: sourceBinding.sourceIdentity } });
  const normalizedPages = canonicalizePageServices(pages, serviceLedger);
  const home = normalizedPages.filter((page) => page.type === 'Home' && routePath(page.url) === '/');
  const contact = normalizedPages.filter((page) => page.type === 'Contact' && routePath(page.url) === '/contact');
  if (home.length !== 1) throw new Error('prescription requires exactly one Home at /');
  if (contact.length !== 1) throw new Error('prescription requires exactly one Contact at /contact');
  if (normalizedPages.some((page) => page.type === 'Home' && routePath(page.url) !== '/') || normalizedPages.some((page) => page.type === 'Contact' && routePath(page.url) !== '/contact')) throw new Error('Home and Contact routes are fixed by policy');
  const normalizedServices = canonicalizeServiceCandidates(services, serviceLedger);
  const overrideResult = validateExpansionOverride(override, { pages: normalizedPages, policy, runContext, sourceBinding: { ...sourceBinding, serviceLedger }, evidenceDigest });
  const expectedServiceCount = overrideResult.mode === 'standard' ? STANDARD_PRESCRIPTION_POLICY.servicePageCount : normalizedPages.filter((page) => page.type === 'Service').length;
  const servicesOnPages = normalizedPages.filter((page) => page.type === 'Service');
  if (servicesOnPages.length !== expectedServiceCount) throw new Error(`prescription requires exactly ${expectedServiceCount} Service pages`);
  if (servicesOnPages.some((page) => !page.canonicalIntentId)) throw new Error('every Service page requires a canonical intent');
  if (overrideResult.mode === 'standard' && normalizedPages.length !== STANDARD_PRESCRIPTION_POLICY.businessPageCount) throw new Error('standard prescription must contain exactly four business pages');
  const selected = selectTopServiceDestinations(normalizedServices, expectedServiceCount, serviceLedger);
  const selectedSet = new Set(selected);
  for (const page of servicesOnPages) if (!selectedSet.has(page.canonicalIntentId)) throw new Error(`service page ${page.service} is not one of the top evidence-backed canonical destinations`);
  return { policy: { ...STANDARD_PRESCRIPTION_POLICY }, policyMode: overrideResult.mode, allowedServicePageCount: expectedServiceCount, override: overrideResult.override, selectedServiceIds: selected, normalizedPages, normalizedServices, pageSetDigest: pageSetDigest(normalizedPages) };
}

module.exports = { STANDARD_PRESCRIPTION_POLICY, AUTHORITATIVE_APPROVERS, canonical, digest, validDate, isExactStandardPolicy, serviceTerm, normalizeServiceKey, serviceIdentity, pageId, pageSetDigest, validateSourceIdentity, validateSourceBinding, ledgerMaps, canonicalServiceId, canonicalizeServiceCandidates, canonicalizePageServices, assertNoServiceAliasCollisions, validateCompleteCanonicalLedger, rankCandidateServices, selectTopServiceDestinations, validateExpansionOverride, validatePagePolicy };
