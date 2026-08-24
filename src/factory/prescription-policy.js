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

function serviceIdentity(service) {
  return String(service?.id || service?.name || service?.slug || '').trim();
}

function assertNoServiceAliasCollisions(services) {
  const seen = new Map();
  for (const service of services || []) {
    const id = serviceIdentity(service);
    if (!id) throw new Error('candidate service is missing a stable id');
    const key = serviceTerm(id);
    if (!key) throw new Error(`candidate service ${id} has an empty canonical id`);
    if (seen.has(key) && seen.get(key) !== id) throw new Error(`service alias collision: ${seen.get(key)} and ${id}`);
    seen.set(key, id);
  }
  return true;
}

function evidenceScore(service) {
  const direct = Number(service.directCompletedEvidenceCount ?? service.directEvidenceCount ?? 0);
  const evidence = Number(service.evidenceCount ?? service.authoritativeEvidenceCount ?? 0);
  return { direct: Number.isFinite(direct) ? direct : 0, evidence: Number.isFinite(evidence) ? evidence : 0 };
}

function rankCandidateServices(services) {
  assertNoServiceAliasCollisions(services);
  return (services || []).map((service, index) => {
    const score = evidenceScore(service);
    return { service, index, id: serviceIdentity(service), ...score };
  }).sort((left, right) => right.direct - left.direct || right.evidence - left.evidence || left.id.localeCompare(right.id));
}

function selectTopServiceDestinations(services, count = STANDARD_PRESCRIPTION_POLICY.servicePageCount) {
  const ranked = rankCandidateServices(services);
  const eligible = ranked.filter((entry) => entry.direct > 0);
  if (eligible.length < count) throw new Error(`only ${eligible.length} evidence-backed service candidates available; ${count} required`);
  return ranked.slice(0, count).map((entry) => entry.id);
}

function routePath(value) {
  return String(value || '').replace(/\/$/, '') || '/';
}

function pageSetDigest(pages) {
  return digest((pages || []).map((page) => ({
    type: page.type,
    service: page.service || null,
    url: routePath(page.url),
    primaryKeyword: page.primaryKeyword,
    titleDirection: page.titleDirection,
    h1Direction: page.h1Direction,
  })));
}

function validateExpansionOverride(override, { pages, runContext = {}, sourceBinding = {} } = {}) {
  if (!override) return { mode: 'standard', override: null };
  const required = ['overrideId', 'prospectId', 'runId', 'approvedBy', 'approvedAt', 'expiresAt', 'reason', 'allowedServicePageCount', 'sourceCheckpoint', 'pageSetDigest'];
  for (const field of required) if (override[field] == null || override[field] === '') throw new Error(`expansion override missing ${field}`);
  if (override.mode !== 'expanded-one-off') throw new Error('expansion override mode must be expanded-one-off');
  if (String(override.prospectId) !== String(runContext.prospectId)) throw new Error('expansion override prospect mismatch');
  if (String(override.runId) !== String(runContext.runId)) throw new Error('expansion override run mismatch');
  if (new Date(override.expiresAt).getTime() < new Date(runContext.now || Date.now()).getTime()) throw new Error('expansion override is stale');
  if (Number(override.allowedServicePageCount) !== pages.filter((page) => page.type === 'Service').length) throw new Error('expansion override service count mismatch');
  if (Number(override.allowedServicePageCount) <= STANDARD_PRESCRIPTION_POLICY.servicePageCount) throw new Error('expansion override must expand the standard service count');
  if (String(override.pageSetDigest) !== pageSetDigest(pages)) throw new Error('expansion override page-set approval digest mismatch');
  const source = override.sourceCheckpoint;
  if (String(source.runId) !== String(sourceBinding.runId) || String(source.artifactId) !== String(sourceBinding.artifactId) || String(source.sourceSha) !== String(sourceBinding.sourceSha)) throw new Error('expansion override source checkpoint mismatch');
  return { mode: 'expanded-one-off', override: { ...override, approvalDigest: digest(override) } };
}

function validatePagePolicy({ pages, services, policy = STANDARD_PRESCRIPTION_POLICY, override = null, runContext = {}, sourceBinding = {} } = {}) {
  if (!Array.isArray(pages)) throw new Error('prescription pages must be an array');
  if (pages.some((page) => page.type === 'Strategy Overview' || page.type === 'Strategy')) throw new Error('Strategy Overview is not a business page and must not be in prescription.pages');
  const home = pages.filter((page) => page.type === 'Home' && routePath(page.url) === '/');
  const contact = pages.filter((page) => page.type === 'Contact' && routePath(page.url) === '/contact');
  if (home.length !== 1) throw new Error('prescription requires exactly one Home at /');
  if (contact.length !== 1) throw new Error('prescription requires exactly one Contact at /contact');
  if (pages.some((page) => page.type === 'Home' && routePath(page.url) !== '/') || pages.some((page) => page.type === 'Contact' && routePath(page.url) !== '/contact')) throw new Error('Home and Contact routes are fixed by policy');
  const servicesOnPages = pages.filter((page) => page.type === 'Service');
  const overrideResult = validateExpansionOverride(override, { pages, runContext, sourceBinding });
  const expectedServiceCount = overrideResult.mode === 'standard' ? policy.servicePageCount : Number(override.allowedServicePageCount);
  if (servicesOnPages.length !== expectedServiceCount) throw new Error(`prescription requires exactly ${expectedServiceCount} Service pages`);
  if (servicesOnPages.some((page) => !page.service || !String(page.service).trim())) throw new Error('every Service page requires a genuine service');
  if (overrideResult.mode === 'standard' && pages.length !== policy.businessPageCount) throw new Error('standard prescription must contain exactly four business pages');
  const selected = selectTopServiceDestinations(services, expectedServiceCount);
  const selectedTerms = new Set(selected.map(serviceTerm));
  for (const page of servicesOnPages) if (!selectedTerms.has(serviceTerm(page.service))) throw new Error(`service page ${page.service} is not one of the top evidence-backed destinations`);
  return { policy: { ...policy, mode: overrideResult.mode, allowedServicePageCount: expectedServiceCount }, override: overrideResult.override, selectedServiceIds: selected, pageSetDigest: pageSetDigest(pages) };
}

module.exports = { STANDARD_PRESCRIPTION_POLICY, canonical, digest, serviceTerm, serviceIdentity, assertNoServiceAliasCollisions, rankCandidateServices, selectTopServiceDestinations, pageSetDigest, validateExpansionOverride, validatePagePolicy };
