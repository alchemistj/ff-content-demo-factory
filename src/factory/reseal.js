'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const {
  STANDARD_PRESCRIPTION_POLICY,
  canonical,
  digest,
  pageId,
  pageSetDigest,
  canonicalServiceId,
  normalizeServiceKey,
  canonicalizePageServices,
  validateCompleteCanonicalLedger,
  validatePagePolicy,
} = require('./prescription-policy');
const { artifactIdentityKey, resolveTrustedArtifact } = require('./trusted-artifacts');

const EXPECTED_360_CHECKPOINT = Object.freeze({
  runId: '32717620900',
  artifactId: '9516514426',
  sourceSha: '81587f8422a23313fd7868751061eec7e2fb5926',
  trustedArtifact: resolveTrustedArtifact(artifactIdentityKey({ runId: '32717620900', artifactId: '9516514426', sourceSha: '81587f8422a23313fd7868751061eec7e2fb5926' })),
});

function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function readJson(filename) { return JSON.parse(fs.readFileSync(filename, 'utf8')); }
function readArchiveEntry(archivePath, entry) { return execFileSync('unzip', ['-p', archivePath, entry], { maxBuffer: 32 * 1024 * 1024 }); }

function walk(root, current = root, result = []) {
  if (!fs.existsSync(current)) return result;
  const stat = fs.statSync(current);
  if (stat.isDirectory()) for (const name of fs.readdirSync(current)) walk(root, path.join(current, name), result);
  else result.push(path.relative(root, current).split(path.sep).join('/'));
  return result;
}

function verifyArtifactContent({ artifactRoot, artifactArchivePath, checkpoint, state, identityKey }) {
  const trustedArtifact = resolveTrustedArtifact(identityKey);
  if (!artifactRoot) throw new Error('actual artifact root is required for no-vendor reseal');
  if (!artifactArchivePath) throw new Error('trusted immutable artifact archive is required');
  const root = path.resolve(artifactRoot);
  const archive = path.resolve(artifactArchivePath);
  if (!fs.existsSync(archive)) throw new Error('trusted artifact archive is missing');
  const resolvedIdentity = String(identityKey);
  if (path.basename(archive) !== trustedArtifact.archiveName) throw new Error('trusted artifact identity binding mismatch');
  const archiveSha256 = sha256(fs.readFileSync(archive));
  if (archiveSha256 !== trustedArtifact.archiveSha256) throw new Error('trusted artifact archive digest mismatch');
  const checkpointFile = path.join(root, 'canary', 'outputs', 'checkpoint.json');
  const stateFile = path.join(root, 'state', 'factory-state.json');
  const manifestFile = path.join(root, 'canary', 'outputs', 'manifest.sha256');
  if (![checkpointFile, stateFile, manifestFile].every((file) => fs.existsSync(file))) throw new Error('artifact is missing checkpoint, state, or manifest content');
  const actualCheckpoint = readJson(checkpointFile);
  const actualState = readJson(stateFile);
  if (checkpoint && digest(actualCheckpoint) !== digest(checkpoint)) throw new Error('caller checkpoint does not match artifact checkpoint content');
  if (state && digest(actualState) !== digest(state)) throw new Error('caller state does not derive from artifact state content');
  const manifestBytes = fs.readFileSync(manifestFile);
  for (const entry of ['canary/outputs/checkpoint.json', 'state/factory-state.json', 'canary/outputs/manifest.sha256']) {
    if (!Buffer.from(fs.readFileSync(path.join(root, entry))).equals(entry === 'canary/outputs/checkpoint.json' ? readArchiveEntry(archive, entry) : entry === 'state/factory-state.json' ? readArchiveEntry(archive, entry) : readArchiveEntry(archive, entry))) throw new Error(`artifact archive content mismatch: ${entry}`);
  }
  const manifestEntries = manifestBytes.toString('utf8').trim().split(/\n/).filter(Boolean).map((line) => {
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    if (!match) throw new Error('artifact manifest has invalid syntax');
    return { sha256: match[1], path: match[2].replace(/^\.\//, '') };
  }).sort((a, b) => a.path.localeCompare(b.path));
  const actualFiles = walk(root).filter((file) => file !== 'canary/outputs/manifest.sha256').sort();
  if (JSON.stringify(actualFiles) !== JSON.stringify(manifestEntries.map((entry) => entry.path))) throw new Error('artifact manifest file inventory mismatch');
  for (const entry of manifestEntries) {
    const actual = sha256(fs.readFileSync(path.join(root, entry.path)));
    if (actual !== entry.sha256) throw new Error(`artifact content digest mismatch: ${entry.path}`);
  }
  if (String(actualCheckpoint.runId) !== String(trustedArtifact.runId) || actualCheckpoint.sourceSha !== trustedArtifact.sourceSha) throw new Error('artifact content identity does not match trusted registry source');
  const checkpointDigest = digest(actualCheckpoint);
  const stateDigest = digest(actualState);
  return { artifactRoot: root, artifactArchivePath: archive, identityKey: resolvedIdentity, trustedArtifact, archiveSha256, checkpointDigest, stateDigest, manifest: manifestEntries, manifestDigest: sha256(manifestBytes), sourceArtifactDigest: digest({ provider: trustedArtifact.provider, runId: trustedArtifact.runId, artifactId: trustedArtifact.artifactId, sourceSha: trustedArtifact.sourceSha, archiveName: trustedArtifact.archiveName, archiveSha256, rootIdentity: trustedArtifact.rootIdentity, checkpointDigest, stateDigest, manifest: manifestEntries, manifestDigest: sha256(manifestBytes) }) };
}

function writtenReviews(packet) {
  const records = packet?.reviews || [];
  const reviews = records.filter((review) => String(review.text || '').trim());
  const ids = new Set();
  for (const review of reviews) {
    if (!review.id) throw new Error('written review is missing its stable review ID');
    if (ids.has(review.id)) throw new Error(`duplicate stable review ID: ${review.id}`);
    ids.add(review.id);
  }
  if (reviews.length !== Number(packet?.writtenReviewCount)) throw new Error('retrievedWrittenReviewCount does not equal written review records');
  return reviews;
}

function reviewRetrievalDate(packet) {
  const retrievedAt = packet?.provenance?.retrievedAt || packet?.retrievedAt;
  if (typeof retrievedAt !== 'string' || Number.isNaN(Date.parse(retrievedAt))) throw new Error('review retrieval provenance date is missing or invalid');
  return new Date(retrievedAt).toISOString().slice(0, 10);
}

function sitePath(value) {
  try { return new URL(String(value), 'https://bound-site.invalid').pathname.replace(/\/$/, '') || '/'; } catch { return null; }
}

function validateLedger(ledger, stableIds = new Set(), { classification = null, siteAudit = null, candidateServices = [] } = {}) {
  if (!ledger || ledger.version !== 'canonical-service-coverage-ledger-v1') throw new Error('canonical service ledger is required for reseal');
  if (!Array.isArray(ledger.services) || !ledger.services.length) throw new Error('canonical service ledger has no services');
  const ids = new Set();
  const canonicalNames = new Map();
  for (const candidate of candidateServices || []) {
    const canonicalId = canonicalServiceId(candidate.id || candidate.name, ledger, { allowImplicit: false });
    if (normalizeServiceKey(candidate.id || candidate.name) === canonicalId && candidate.name) canonicalNames.set(canonicalId, String(candidate.name));
  }
  const auditedPaths = new Set();
  const auditRefs = new Set();
  const collectAudit = (value, key = '') => {
    if (Array.isArray(value)) return value.forEach((entry) => collectAudit(entry, key));
    if (!value || typeof value !== 'object') {
      if (/sourceUrl|alsoOn|siteAuditUrls|url/i.test(key) && typeof value === 'string') {
        const parsed = sitePath(value);
        if (parsed) auditedPaths.add(parsed);
      }
      return;
    }
    if (value.id) auditRefs.add(String(value.id));
    for (const [childKey, child] of Object.entries(value)) {
      if (/sourceUrl|alsoOn|siteAuditUrls|url/i.test(childKey) && typeof child === 'string') { const parsed = sitePath(child); if (parsed) auditedPaths.add(parsed); }
      collectAudit(child, childKey);
    }
  };
  if (siteAudit) collectAudit(siteAudit);
  for (const service of ledger.services) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(service.id || '') || !service.name) throw new Error('canonical service ledger contains an invalid service identity');
    if (ids.has(service.id)) throw new Error(`duplicate canonical service ledger id: ${service.id}`);
    ids.add(service.id);
    if (!Array.isArray(service.reviewIds) || service.reviewIds.some((id) => !id)) throw new Error(`canonical service ledger review mapping invalid for ${service.id}`);
    if (stableIds.size && service.reviewIds.some((id) => !stableIds.has(id))) throw new Error(`canonical service ledger references a review outside stable retrieved inventory: ${service.id}`);
    if (!Array.isArray(service.currentSitePageUrls)) throw new Error(`canonical service ledger page mapping missing for ${service.id}`);
    if (!service.siteAuditCoverage || service.siteAuditCoverage.inspected !== true || !Array.isArray(service.siteAuditCoverage.inspectedPageUrls) || !Array.isArray(service.siteAuditCoverage.crawlRefs) || !service.siteAuditCoverage.crawlRefs.length) throw new Error(`canonical service ledger site-audit coverage is incomplete: ${service.id}`);
    if (canonicalNames.has(service.id) && normalizeServiceKey(service.name) !== normalizeServiceKey(canonicalNames.get(service.id))) throw new Error(`canonical service ledger name is not bound to candidate evidence: ${service.id}`);
    if (siteAudit) {
      for (const url of service.siteAuditCoverage.inspectedPageUrls) if (!auditedPaths.has(sitePath(url))) throw new Error(`canonical service ledger coverage URL is not in bound site audit: ${service.id}/${url}`);
      if (service.siteAuditCoverage.crawlRefs.some((ref) => !auditRefs.has(String(ref)))) throw new Error(`canonical service ledger coverage crawl reference is not in bound site audit: ${service.id}`);
      const matching = (service.siteAuditCoverage.matchingPageUrls || []).map(sitePath).sort();
      const current = service.currentSitePageUrls.map(sitePath).sort();
      if (JSON.stringify(matching) !== JSON.stringify(current)) throw new Error(`canonical service ledger page coverage does not match bound URLs: ${service.id}`);
      if (service.siteAuditCoverage.hasCorrespondingPage !== (matching.length > 0)) throw new Error(`canonical service ledger page-presence claim is inconsistent: ${service.id}`);
      if (!matching.length && (!service.siteAuditCoverage.absenceEvidence || !Array.isArray(service.siteAuditCoverage.absenceEvidence.crawlRefs) || !service.siteAuditCoverage.absenceEvidence.crawlRefs.length || service.siteAuditCoverage.absenceEvidence.crawlRefs.some((ref) => !auditRefs.has(String(ref))))) throw new Error(`canonical service ledger absence evidence is missing or unbound: ${service.id}`);
    }
    if (classification) {
      const classified = new Map((classification.reviews || []).map((review) => [review.id, review]));
      for (const reviewId of service.reviewIds) {
        const record = classified.get(reviewId);
        const evidence = record?.authoritativeJudgment?.serviceEvidence || [];
        const matches = evidence.some((item) => canonicalServiceId(item.service, ledger, { allowImplicit: false }) === service.id);
        if (!record || record.authoritative !== true || !matches) throw new Error(`canonical service ledger review assignment is not supported by authoritative classification: ${service.id}/${reviewId}`);
      }
    }
  }
  for (const [raw, target] of Object.entries(ledger.aliases || {})) {
    if (!raw || !ids.has(normalizeServiceKey(target))) throw new Error(`canonical service ledger alias is unmapped: ${raw}`);
  }
  if (siteAudit) {
    if (siteAudit.inspected !== true) throw new Error('canonical service ledger site URLs lack a bound inspected site audit');
    const auditedPaths = new Set();
    const collect = (value, key = '') => {
      if (Array.isArray(value)) return value.forEach((entry) => collect(entry, key));
      if (!value || typeof value !== 'object') {
        if (/sourceUrl|alsoOn|siteAuditUrls|url/i.test(key)) { const parsed = sitePath(value); if (parsed) auditedPaths.add(parsed); }
        return;
      }
      for (const [childKey, child] of Object.entries(value)) collect(child, childKey);
    };
    collect(siteAudit);
    for (const service of ledger.services) for (const url of service.currentSitePageUrls) {
      if (!auditedPaths.has(sitePath(url))) throw new Error(`canonical service ledger site URL is not present in bound site-audit provenance: ${service.id}/${url}`);
    }
  }
  return ledger;
}

function route(page) { return String(page?.url || '').replace(/\/$/, '') || '/'; }

function routeLanguage(value) {
  return /\/garage-door-(?:spring|opener)(?:-[a-z-]+)?\/?|\b(?:spring|opener)(?:[- ](?:repair|replacement|installation))?\s+(?:page|route|url|link|slug|nav|cta|destination)|\b(?:page|route|url|link|slug|nav|cta|destination)[^.!?\n]{0,80}\b(?:spring|opener)(?:[- ](?:repair|replacement|installation))?\b|(?:spring|opener)[^.!?\n]{0,80}\b(?:page|route|url|link|slug|nav|cta)\b/i.test(String(value || ''));
}

function validateRejectedRouteLanguage(value, location = 'payload') {
  const machineFields = new Set(['id', 'sourceServiceId', 'canonicalServiceId', 'canonicalIntentId', 'serviceId', 'reviewId', 'reviewIds', 'judgmentId', 'artifactId', 'runId', 'prospectId', 'placeId', 'sourceSha', 'digest', 'sourceArtifactDigest', 'evidenceDigest', 'pageSetDigest', 'approvalDigest', 'prescriptionDigest', 'resealDigest']);
  const routeFields = new Set(['url', 'route', 'pageUrl', 'nav', 'navigation', 'cta', 'ctaLabel', 'ctaDestination', 'destination', 'primaryKeyword', 'titleDirection', 'h1Direction', 'approvedPageAssignments', 'routes', 'claims', 'angle', 'whyIncluded', 'overlapBoundaries', 'passedOverReason', 'name', 'label', 'text', 'description']);
  function walk(entry, pathName, context = {}) {
    if (typeof entry === 'string') {
      if (!/\b(?:spring|opener)(?:[- ](?:repair|replacement|installation))?\b/i.test(entry)) return true;
      if (context.machineField) return true;
      const supporting = context.supportingEvidence === true;
      const allowedParent = context.allowedParentCanonicalId;
      const hasSpring = /spring/i.test(entry);
      const hasOpener = /opener/i.test(entry);
      const allowed = supporting && ((hasSpring && !hasOpener && allowedParent === 'garage-door-repair') || (hasOpener && !hasSpring && allowedParent === 'home-breadth'));
      if (!allowed || routeLanguage(entry) || (routeFields.has(context.field) && !supporting)) throw new Error(`rejected standalone spring/opener evidence at ${pathName}`);
      return true;
    }
    if (Array.isArray(entry)) return entry.every((child, index) => walk(child, `${pathName}[${index}]`, context));
    if (entry && typeof entry === 'object') {
      const parent = entry.type === 'Home' || entry.canonicalIntentId === 'home-breadth' ? 'home' : entry.canonicalIntentId === 'garage-door-repair' || entry.service === 'garage-door-repair' ? 'repair' : context.parent;
      const supportingEvidence = context.supportingEvidence === true || Object.prototype.hasOwnProperty.call(entry, 'allowedParentCanonicalId') && context.field === 'supportingEvidence';
      const allowedParentCanonicalId = entry.allowedParentCanonicalId || context.allowedParentCanonicalId;
      return Object.entries(entry).every(([key, child]) => walk(child, `${pathName}.${key}`, { parent, field: key, machineField: machineFields.has(key), supportingEvidence, allowedParentCanonicalId }));
    }
    return true;
  }
  return walk(value, location);
}

function sanitizePageText(pages) {
  const scrub = (value, key = '', supporting = false) => {
    if (typeof value === 'string') {
      if (supporting || ['id', 'service', 'canonicalIntentId', 'canonicalServiceId', 'sourceServiceId', 'reviewId', 'reviewIds'].includes(key)) return value;
      return value
        .replace(/\bgarage[- ]door[- ]spring(?:[- ](?:repair|replacement|installation))?\b/gi, 'related garage-door repair work')
        .replace(/\bgarage[- ]door[- ]opener(?:[- ](?:repair|replacement|installation))?\b/gi, 'related accessory work')
        .replace(/\bspring(?:[- ](?:repair|replacement|installation))?\b/gi, 'related repair work')
        .replace(/\bopener(?:[- ](?:repair|replacement|installation))?\b/gi, 'related accessory work');
    }
    if (Array.isArray(value)) return value.map((entry) => scrub(entry, key, supporting));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, scrub(child, childKey, supporting || childKey === 'supportingEvidence')]));
    return value;
  };
  return pages.map((page) => {
    const next = { ...clone(page) };
    if (next.type === 'Home') {
      next.whyIncluded = 'Required entry page. The owned site currently uses Home plus an undifferentiated services gallery, which buries distinct completed-work evidence.';
      next.angle = 'Lead with the local shop and the completed garage-door work already in the review record. Keep the two approved service directions distinct.';
      next.overlapBoundaries = 'Keep problem-specific jobs and first reviews on the two approved service destinations. Do not use Home to promise weekends, holidays, same-day arrival, or 24/7 coverage.';
      next.claims = ['Written reviews document completed garage-door repairs and new-door installations; related work remains folded into approved parent directions.', 'Named technicians Will and Jenny appear across completed-job reviews for on-site work and scheduling contact.'];
      next.supportingEvidence = [{ allowedParentCanonicalId: 'home-breadth', sourceServiceId: 'garage-door-opener-installation', reviewIds: [], statement: 'Supporting evidence remains within the approved Home breadth assignment.' }];
    } else if (next.type === 'Service' && next.service === 'garage-door-repair') {
      next.angle = 'Evidence-led repair direction for failed, sagging, off-track, or inconsistent doors, including related repair work when reviewers describe it.';
      next.overlapBoundaries = 'Do not duplicate new-door installation or use this assignment for design-your-door selection. Fold related repair evidence here only when it remains within the repair intent.';
    } else if (next.type === 'Service' && next.service === 'garage-door-installation') {
      next.overlapBoundaries = 'Keep this assignment focused on door installation and replacement, not repair or accessory work. Do not turn it into a framing or carpentry claim.';
    } else if (next.type === 'Contact') {
      next.overlapBoundaries = 'No service-specific claims, pricing, or availability promises here. Do not preview service proof beyond the approved destination assignments.';
    }
    return scrub(next);
  });
}

function aggregateCandidates(candidates, ledger, pages) {
  const selectedRoutes = new Map(pages.filter((page) => page.type === 'Service').map((page) => [page.canonicalIntentId, route(page)]));
  const aggregate = new Map();
  const preserved = (candidates || []).map((candidate) => {
    const rawId = String(candidate.id || candidate.name || '');
    const mapped = canonicalServiceId(rawId, ledger, { allowImplicit: false });
    const homeSupport = mapped === 'home-breadth';
    const selectedRoute = selectedRoutes.get(mapped) || null;
    const folded = !homeSupport && Boolean(selectedRoute) && mapped !== rawId;
    const next = { ...clone(candidate), sourceServiceId: rawId, canonicalServiceId: mapped, canonicalIntentId: mapped, includedPage: Boolean(selectedRoute) && !folded, pageUrl: Boolean(selectedRoute) && !folded ? selectedRoute : null, destination: homeSupport ? 'home-support' : (!folded && selectedRoute ? 'service-assignment' : null) };
    // The comparison remains evidence-complete, but stale model prose cannot
    // leak rejected spring/opener route language into the sealed handoff.
    delete next.note;
    delete next.rationale;
    delete next.whyIncluded;
    delete next.foldInto;
    if (/spring|opener/i.test(String(next.name || ''))) next.name = 'Supporting evidence family';
    if (homeSupport) {
      next.status = 'passed-over';
      next.passedOverReason = 'Supporting evidence is assigned to Home breadth only.';
      next.supportingEvidence = { allowedParentCanonicalId: 'home-breadth', sourceServiceId: rawId, reviewIds: [...(candidate.directEvidenceReviewIds || [])].sort(), statement: 'Supporting evidence remains within the approved Home breadth assignment.' };
      next.supportingEvidenceFor = '/';
    } else if (folded) {
      next.status = 'folded';
      next.foldedInto = mapped;
      next.passedOverReason = 'Supporting evidence is folded into the approved parent assignment.';
      if (/spring/i.test(rawId)) next.supportingEvidence = { allowedParentCanonicalId: 'garage-door-repair', sourceServiceId: rawId, reviewIds: [...(candidate.directEvidenceReviewIds || [])].sort(), statement: 'Supporting evidence is folded into the approved Garage Door Repair assignment.' };
    } else if (!selectedRoute) {
      next.status = 'passed-over';
      next.passedOverReason = 'Evidence preserved; not selected for an approved service destination.';
    } else {
      next.status = 'selected';
    }
    const entry = aggregate.get(mapped) || { id: mapped, name: mapped, directEvidenceReviewIds: new Set(), evidenceCount: 0, directCompletedEvidenceCount: 0 };
    entry.name = entry.name === mapped ? (candidate.name || mapped) : entry.name;
    for (const id of candidate.directEvidenceReviewIds || []) entry.directEvidenceReviewIds.add(id);
    entry.evidenceCount += Number(candidate.evidenceCount || candidate.directCompletedEvidenceCount || 0);
    entry.directCompletedEvidenceCount = entry.directEvidenceReviewIds.size;
    aggregate.set(mapped, entry);
    return next;
  });
  validateRejectedRouteLanguage(preserved, 'candidate comparison');
  return { preserved, aggregate: [...aggregate.values()].map((entry) => ({ ...entry, directEvidenceReviewIds: [...entry.directEvidenceReviewIds].sort() })) };
}

function validateApproval(approval, pages, binding) {
  const expectedRoutes = ['/', '/garage-door-repair', '/garage-door-installation', '/contact'];
  if (!approval || approval.approvedBy !== 'Josh Lenz' || approval.approvedAt !== '2026-08-24' || !String(approval.reason || '').trim()) throw new Error('reseal approval is missing, stale, or reasonless');
  if (JSON.stringify(approval.approvedRoutes) !== JSON.stringify(expectedRoutes)) throw new Error('reseal approval routes do not match the approved four-page set');
  if (approval.runId && String(approval.runId) !== String(binding.runId)) throw new Error('reseal approval run mismatch');
  if (approval.sourceSha && approval.sourceSha !== binding.sourceSha) throw new Error('reseal approval source mismatch');
  return clone(approval);
}

function writerProjection({ pages, preserved, stableIds }) {
  const assignments = pages.map((page) => ({ pageId: pageId(page), type: page.type, route: route(page), canonicalIntentId: page.canonicalIntentId || null }));
  const foldedEvidence = {
    garageDoorRepair: { reviewIds: [...new Set(preserved.filter((item) => item.foldedInto === 'garage-door-repair').flatMap((item) => item.directEvidenceReviewIds || []))].filter((id) => stableIds.has(id)).sort() },
    home: { reviewIds: [...new Set(preserved.filter((item) => item.supportingEvidenceFor === '/').flatMap((item) => item.directEvidenceReviewIds || []))].filter((id) => stableIds.has(id)).sort() },
  };
  const projection = { routes: assignments.map((assignment) => assignment.route), approvedPageAssignments: assignments, foldedEvidence };
  validateRejectedRouteLanguage(projection, 'writerProjection');
  if (projection.routes.some((value) => /spring|opener/i.test(value))) throw new Error('writer projection exposes a rejected route');
  return projection;
}

function handoffPrescriptionDigest(handoff) {
  return digest({ ...handoff, prescriptionDigest: undefined, resealDigest: undefined });
}

function validateWriterHandoff(handoff, { artifactRoot, artifactArchivePath, identityKey } = {}) {
  if (!handoff || handoff.noVendorReseal !== true || handoff.handoffVersion !== 'lane-a-review-handoff/v4') throw new Error('writer handoff is missing the trusted reseal contract');
  const artifactProof = verifyArtifactContent({ artifactRoot, artifactArchivePath, checkpoint: handoff.source?.checkpoint, identityKey });
  if (handoff.sourceArtifactDigest !== artifactProof.sourceArtifactDigest) throw new Error('writer handoff source artifact digest is stale or tampered');
  if (handoff.trustedArtifact?.archiveSha256 !== artifactProof.archiveSha256 || handoff.trustedArtifact?.rootIdentity !== artifactProof.trustedArtifact.rootIdentity) throw new Error('writer handoff trusted artifact binding is stale or tampered');
  const identity = { prospectId: handoff.prospect?.prospectId || handoff.prospect?.placeId, placeId: handoff.prospect?.placeId, runId: handoff.runId, sourceIdentity: artifactProof.trustedArtifact };
  validateCompleteCanonicalLedger(handoff.serviceCoverageLedger, { services: handoff.candidateServices, pages: handoff.pages, identity });
  const policy = validatePagePolicy({ pages: handoff.pages, services: handoff.candidateServices, serviceLedger: handoff.serviceCoverageLedger, policy: handoff.policy, override: handoff.expansionOverride || null, runContext: { ...identity }, sourceBinding: { sourceArtifactDigest: handoff.sourceArtifactDigest, sourceIdentity: artifactProof.trustedArtifact }, evidenceDigest: handoff.evidenceDigest });
  if (handoff.policyMode !== policy.policyMode || JSON.stringify([...handoff.selectedServiceIds].sort()) !== JSON.stringify([...policy.selectedServiceIds].sort())) throw new Error('writer handoff page policy projection is stale');
  if (handoff.pageSetDigest !== pageSetDigest(handoff.pages)) throw new Error('writer handoff page-set digest is stale or tampered');
  const evidenceDigest = digest({ evidence: handoff.reviewInventory, candidates: handoff.candidateServices, ledger: clone(handoff.serviceCoverageLedger) });
  if (handoff.evidenceDigest !== evidenceDigest) throw new Error('writer handoff evidence digest is stale or tampered');
  if (!handoff.approval || handoff.approvalDigest !== digest({ ...handoff.approval, approvalDigest: undefined }) || handoff.approval.sourceArtifactDigest !== handoff.sourceArtifactDigest) throw new Error('writer handoff approval digest is stale or tampered');
  if (handoff.prescriptionDigest !== handoffPrescriptionDigest(handoff)) throw new Error('writer handoff prescription digest is stale or tampered');
  if (handoff.resealDigest !== digest({ ...handoff, resealDigest: undefined })) throw new Error('writer handoff reseal digest is stale or tampered');
  if (handoff.sourceArtifactDigest === handoff.resealDigest) throw new Error('writer handoff cannot self-authenticate its source');
  validateRejectedRouteLanguage({ pages: handoff.pages, candidateServices: handoff.candidateServices, valueHierarchy: handoff.valueHierarchy, writerProjection: handoff.writerProjection }, 'writer handoff projection');
  return { artifactProof, policy, vendorCalls: 0 };
}

function resealCheckpoint({ checkpoint, state, artifactRoot, artifactArchivePath, identityKey, canonicalServiceLedger, approval, vendorAdapters }) {
  if (vendorAdapters !== undefined) throw new Error('no-vendor reseal does not accept adapter injection');
  const artifactProof = verifyArtifactContent({ artifactRoot, artifactArchivePath, checkpoint, state, identityKey });
  const trustedArtifact = artifactProof.trustedArtifact;
  const original = clone(state);
  const run = original?.runs?.find((entry) => entry.runId === trustedArtifact.runId || entry.runId === 'run-49c4e3d8b15c4008ae13');
  if (!run) throw new Error('checkpoint does not contain the 360 canary run');
  const packet = run.artifacts?.reviewPacket;
  const reviews = writtenReviews(packet);
  const writtenIds = new Set(reviews.map((review) => review.id));
  const retrievedWrittenReviewCount = reviews.length;
  const reviewRetrievalDate = reviewRetrievalDateFromPacket(packet);
  if (retrievedWrittenReviewCount !== 47 || reviewRetrievalDate !== '2026-08-23') throw new Error('360 reseal source facts do not match the verified 47-review 2026-08-23 snapshot');
  const ledger = validateLedger(canonicalServiceLedger, writtenIds, { classification: run.artifacts.classification, siteAudit: run.candidate?.websiteAudit, candidateServices: candidatesForLedger(run) });
  validateCompleteCanonicalLedger(ledger, { services: candidatesForLedger(run), pages: run.artifacts.prescription?.pages || [], identity: { prospectId: run.prospectId, placeId: run.candidate?.placeId, runId: trustedArtifact.runId, sourceIdentity: trustedArtifact, requireSiteAuditCoverage: true } });
  const oldPrescription = run.artifacts?.prescription;
  if (!oldPrescription || !Array.isArray(oldPrescription.pages) || oldPrescription.pages.length !== 6) throw new Error('old six-page prescription is not present; refusing to mutate or infer a reseal');
  const rawPages = oldPrescription.pages.filter((page) => ['/', '/garage-door-repair', '/garage-door-installation', '/contact'].includes(route(page))).map((page) => ({ ...clone(page), url: route(page) }));
  const pages = sanitizePageText(canonicalizePageServices(rawPages, ledger));
  if (pages.length !== 4) throw new Error('the approved four-page derivative could not be formed from the old prescription');
  const approved = validateApproval(approval, pages, trustedArtifact);
  const candidates = run.artifacts?.cursorProposal?.cursorComparison?.candidates || run.artifacts?.cursorProposal?.candidateServices || oldPrescription.valueHierarchy;
  const comparison = aggregateCandidates(candidates, ledger, pages);
  const selected = comparison.aggregate.filter((entry) => entry.directCompletedEvidenceCount > 0 && entry.id !== 'home-breadth').sort((a, b) => b.directCompletedEvidenceCount - a.directCompletedEvidenceCount || a.id.localeCompare(b.id)).slice(0, 2).map((entry) => entry.id).sort();
  const selectedRoutes = pages.filter((page) => page.type === 'Service').map((page) => page.canonicalIntentId).sort();
  if (JSON.stringify(selected) !== JSON.stringify(selectedRoutes)) throw new Error('approved service pages are not the top two evidence-backed canonical destinations');
  const evidenceIds = new Set(comparison.preserved.flatMap((candidate) => candidate.directEvidenceReviewIds || []));
  if (![...evidenceIds].every((id) => writtenIds.has(id))) throw new Error('candidate service evidence references a review outside the stable retrieved inventory');
  const serviceGap = ledger.services.filter((service) => service.reviewIds.length > 0 && service.siteAuditCoverage.hasCorrespondingPage === false);
  const reviewAnalysisFacts = { retrievedWrittenReviewCount, reviewRetrievalDate, reviewBackedServicesWithoutPages: serviceGap.length, reviewBackedServiceNames: serviceGap.map((service) => service.name).sort() };
  const evidence = { reviewPacket: clone(packet), classification: clone(run.artifacts.classification), stableReviewIds: [...writtenIds].sort() };
  const evidenceDigest = digest({ evidence, candidates: comparison.preserved, ledger: clone(ledger) });
  const pageDigest = pageSetDigest(pages);
  const approvalCore = { ...approved, policyVersion: STANDARD_PRESCRIPTION_POLICY.version, approvedPageIds: pages.map(pageId).sort(), approvedCanonicalIntentIds: selected, sourceArtifactDigest: artifactProof.sourceArtifactDigest, evidenceDigest, pageSetDigest: pageDigest };
  const approvalDigest = digest(approvalCore);
  const sealed = {
    version: 'page-prescription-v3',
    source: { checkpoint: clone(checkpoint), artifactId: String(trustedArtifact.artifactId) },
    prospect: { ...clone(oldPrescription.prospect), prospectId: run.prospectId, placeId: run.candidate?.placeId || oldPrescription.prospect?.placeId },
    pages,
    pagePolicy: { ...STANDARD_PRESCRIPTION_POLICY },
    policyMode: 'standard',
    selectedServiceIds: selected,
    valueHierarchy: comparison.preserved,
    candidateServices: comparison.preserved,
    reviewAnalysisFacts,
    serviceCoverageLedger: clone(ledger),
    evidence,
    approval: { ...approvalCore, approvalDigest },
    sourceArtifactDigest: artifactProof.sourceArtifactDigest,
    evidenceDigest,
    pageSetDigest: pageDigest,
    approvalDigest,
    status: 'awaiting-words-factory',
  };
  sealed.prescriptionDigest = digest({ ...sealed, prescriptionDigest: undefined, resealDigest: undefined });
  sealed.writerProjection = writerProjection({ pages, preserved: comparison.preserved, stableIds: writtenIds });
  validateRejectedRouteLanguage(sealed.pages, 'sealed.pages');
  const handoff = {
    handoffVersion: 'lane-a-review-handoff/v4',
    source: sealed.source,
    prospect: sealed.prospect,
    pages: sealed.pages,
    writerProjection: sealed.writerProjection,
    foldedEvidence: sealed.writerProjection.foldedEvidence,
    candidateServices: sealed.candidateServices,
    reviewInventory: sealed.evidence,
    reviewAnalysisFacts: sealed.reviewAnalysisFacts,
    stableReviewIds: sealed.evidence.stableReviewIds,
    policy: sealed.pagePolicy,
    sourceArtifactDigest: sealed.sourceArtifactDigest,
    evidenceDigest: sealed.evidenceDigest,
    pageSetDigest: sealed.pageSetDigest,
    prescriptionDigest: sealed.prescriptionDigest,
    approvalDigest: sealed.approvalDigest,
    approval: sealed.approval,
    trustedArtifact: clone(trustedArtifact),
    artifactRootIdentity: trustedArtifact.rootIdentity,
    archiveSha256: artifactProof.archiveSha256,
    policyMode: sealed.policyMode,
    selectedServiceIds: sealed.selectedServiceIds,
    valueHierarchy: sealed.valueHierarchy,
    serviceCoverageLedger: sealed.serviceCoverageLedger,
    expansionOverride: null,
    runId: trustedArtifact.runId,
    vendorBoundaryProof: { boundary: 'no-vendor-reseal-core', apifyCalls: 0, cursorCalls: 0 },
    noVendorReseal: true,
  };
  handoff.prescriptionDigest = handoffPrescriptionDigest(handoff);
  sealed.prescriptionDigest = handoff.prescriptionDigest;
  sealed.resealDigest = digest({ ...handoff, resealDigest: undefined });
  handoff.resealDigest = sealed.resealDigest;
  validateWriterHandoff(handoff, { artifactRoot, artifactArchivePath, identityKey });
  return { sealedPrescription: sealed, handoff, originalState: original, artifactProof, vendorBoundaryProof: handoff.vendorBoundaryProof };
}

function reviewRetrievalDateFromPacket(packet) { return reviewRetrievalDate(packet); }

function candidatesForLedger(run) { return run.artifacts?.cursorProposal?.cursorComparison?.candidates || run.artifacts?.cursorProposal?.candidateServices || run.artifacts?.prescription?.valueHierarchy || []; }

module.exports = { EXPECTED_360_CHECKPOINT, verifyArtifactContent, writtenReviews, reviewRetrievalDate, validateLedger, validateRejectedRouteLanguage, aggregateCandidates, writerProjection, validateWriterHandoff, validateApproval, resealCheckpoint };
