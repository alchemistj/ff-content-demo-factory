'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createSeededDiscoveryAdapter, validateSeededDiscoveryPacket } = require('../adapters/seeded-discovery');
const { digest, pageSetDigest } = require('./prescription-policy');
const { TRUSTED_ARTIFACTS } = require('./trusted-artifacts');

const PLACE_ID = 'ChIJHa32AOi84YMR38BV93YKiS8';
const WEBSITE = 'http://www.360garagedoor.com/';
const OPPORTUNITY = 'The owned site currently uses Home plus an undifferentiated services gallery, which buries distinct completed-work evidence.';
const TRUSTED = TRUSTED_ARTIFACTS['32717620900:9516514426:81587f8422a23313fd7868751061eec7e2fb5926'];
const HISTORICAL_360 = Object.freeze({
  sourceArtifactDigest: 'sha256:1525d7ad96da0b1b8213dfc38ac2068c94a87540aedbcb85f2bfe5738a4709e0',
  sourceManifestDigest: 'sha256:490c4d4844a895d97014c8a0d00a50dde2516e81af11f5a5fa31a51837b93573',
  evidenceDigest: 'sha256:0b01030ebdad4ece325a2cb390a79fd1c60ee985cfae6230f30701427486f504',
  pageSetDigest: 'sha256:3111870c0acd262a030cb4a4b6ac56b9d6a3b83567321d5953b4e875d5cf364e',
  prescriptionDigest: 'sha256:c0c9a62b04fe950c0037b237f76c97384b203e056c60b9f967e63e7f2a1b57b9',
  approvalDigest: 'sha256:558fb8984c7bc516f265fdffd8c2321e4223cc0b6b85111fd6f36e7f54320742',
  strategyDigest: 'sha256:8b1e4e983e7041302b82f9b0bc2bae4a5b3fb793a395c43e35125f7721bab94a',
  approvalFileDigest: 'sha256:e9f271facf08876bd59cfdacb04378f530048abb3d08893897736e92dfbbc64f',
  ledgerFileDigest: 'sha256:40b5b0e5833c03b55c6a6fa46b2f43e6565263aff1e008f6bc55d53cb2d61169',
  discoveryFileDigest: 'sha256:d24de9e2075727eeb8a7867d89a8f667ac3158bb4bf9bc858d854a917ce05dd6',
  handoffFileDigest: 'sha256:54bb8b31d5927d5b1ccd952499926ca2f99a8fca3c243b7215398399c6cdda7b',
  runId: '32717620900',
  sourceSha: '81587f8422a23313fd7868751061eec7e2fb5926',
  artifactId: '9516514426',
  prospectId: 'prospect-32cd5e266a718b3eee2e',
  placeId: PLACE_ID,
  selectedServiceIds: Object.freeze(['garage-door-installation', 'garage-door-repair']),
  routes: Object.freeze(['/', '/garage-door-repair', '/garage-door-installation', '/contact']),
  candidateServiceIds: Object.freeze(['garage-door-adjustment','garage-door-diagnostics','garage-door-lubrication','garage-door-maintenance','garage-door-opener','garage-door-opener-installation','garage-door-opener-replacement','garage-door-opener-remote','garage-door-replacement','garage-door-seal','garage-door-service-repair','garage-door-spring-repair','garage-door-spring-replacement','garage-door-track-and-roller-service','garage-door-wiring-repair','garage-door-installation','garage-door-repair','garage-door-keypad-installation','outdoor-pad-update','post-install-follow-up','app-setup','phone-support','garage-door'].sort()),
});

function fileDigest(filename) {
  return 'sha256:' + require('node:crypto').createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function historicalStrategy(handoff) {
  return {
    pages: handoff.pages,
    writerProjection: handoff.writerProjection,
    foldedEvidence: handoff.foldedEvidence,
    candidateServices: handoff.candidateServices,
    valueHierarchy: handoff.valueHierarchy,
    serviceCoverageLedger: handoff.serviceCoverageLedger,
    reviewAnalysisFacts: handoff.reviewAnalysisFacts,
    policy: handoff.policy,
    policyMode: handoff.policyMode,
  };
}

// Keep the comparison shape in one place.  The production prescription and
// the historical handoff use different surrounding schemas, but the fields
// below are the immutable Gate 1 decision that must survive the handoff.
function canonicalApprovedLineageProjection(value = {}) {
  const pages = Array.isArray(value.pages) ? value.pages : [];
  const routes = Array.isArray(value.routes) && value.routes.length
    ? value.routes.map(String)
    : pages.map((page) => String(page.url || page.route || ''));
  const selectedServiceIds = Array.isArray(value.selectedServiceIds) && value.selectedServiceIds.length
    ? value.selectedServiceIds.map(String)
    : pages.filter((page) => page.type === 'Service').map((page) => String(page.canonicalIntentId || page.service || page.id || page.url || ''));
  const pageDigest = value.pageSetDigest || (pages.length ? pageSetDigest(pages) : null);
  const approvalProjection = value.approvalProjection || value.approval || {
    sourceArtifactDigest: value.sourceArtifactDigest || null,
    sourceManifestDigest: value.sourceManifestDigest || null,
    evidenceDigest: value.evidenceDigest || null,
    pageSetDigest: pageDigest,
    selectedServiceIds,
    routes,
  };
  const strategyProjection = value.strategyProjection || {
    pages,
    writerProjection: value.writerProjection || null,
    foldedEvidence: value.foldedEvidence || null,
    candidateServices: value.candidateServices || value.valueHierarchy || null,
    valueHierarchy: value.valueHierarchy || null,
    serviceCoverageLedger: value.serviceCoverageLedger || null,
    reviewAnalysisFacts: value.reviewAnalysisFacts || null,
    policy: value.policy || value.pagePolicy || null,
    policyMode: value.policyMode || null,
  };
  return {
    sourceArtifactDigest: value.sourceArtifactDigest || null,
    sourceManifestDigest: value.sourceManifestDigest || null,
    evidenceDigest: value.evidenceDigest || null,
    pageSetDigest: pageDigest,
    prescriptionDigest: value.prescriptionDigest || null,
    approvalDigest: value.approvalDigest || digest(approvalProjection),
    strategyDigest: value.strategyDigest || digest(strategyProjection),
    selectedServiceIds,
    routes,
  };
}

function compareApprovedLineage(approved, actual, label = 'Gate 1 output') {
  const expected = canonicalApprovedLineageProjection(approved);
  const received = canonicalApprovedLineageProjection(actual);
  for (const field of ['sourceArtifactDigest', 'sourceManifestDigest', 'evidenceDigest', 'pageSetDigest', 'prescriptionDigest', 'approvalDigest', 'strategyDigest']) {
    if (!expected[field] || received[field] !== expected[field]) throw new Error(`${label} ${field} does not exactly match approved historical lineage`);
  }
  if (JSON.stringify(received.selectedServiceIds) !== JSON.stringify(expected.selectedServiceIds) || JSON.stringify(received.routes) !== JSON.stringify(expected.routes)) throw new Error(`${label} services/routes do not exactly match approved historical lineage`);
  return true;
}

function verifySealed360Lineage({ root = process.cwd(), discovery, handoff } = {}) {
  const approvalFile = path.join(root, 'canary/inputs/360-four-page-reseal-approval.json');
  const ledgerFile = path.join(root, 'canary/inputs/360-four-page-reseal-ledger.json');
  const discoveryFile = path.join(root, 'canary/inputs/360-garage-door-and-more.discovery.json');
  const handoffFile = path.join(root, 'canary/outputs/360-four-page-reseal-handoff.json');
  const approval = readJson(approvalFile);
  const ledger = readJson(ledgerFile);
  const checks = [
    ['approval file', fileDigest(approvalFile), HISTORICAL_360.approvalFileDigest],
    ['ledger file', fileDigest(ledgerFile), HISTORICAL_360.ledgerFileDigest],
    ['discovery file', fileDigest(discoveryFile), HISTORICAL_360.discoveryFileDigest],
    ['handoff file', fileDigest(handoffFile), HISTORICAL_360.handoffFileDigest],
    ['sourceArtifactDigest', handoff.sourceArtifactDigest, HISTORICAL_360.sourceArtifactDigest],
    ['sourceManifestDigest', digest(ledger), HISTORICAL_360.sourceManifestDigest],
    ['evidenceDigest', handoff.evidenceDigest, HISTORICAL_360.evidenceDigest],
    ['pageSetDigest', handoff.pageSetDigest, HISTORICAL_360.pageSetDigest],
    ['prescriptionDigest', handoff.prescriptionDigest, HISTORICAL_360.prescriptionDigest],
    ['approvalDigest', handoff.approvalDigest, HISTORICAL_360.approvalDigest],
    ['approval source digest', handoff.approval?.sourceArtifactDigest, HISTORICAL_360.sourceArtifactDigest],
    ['approval evidence digest', handoff.approval?.evidenceDigest, HISTORICAL_360.evidenceDigest],
    ['approval page digest', handoff.approval?.pageSetDigest, HISTORICAL_360.pageSetDigest],
    ['approval approval digest', handoff.approval?.approvalDigest, HISTORICAL_360.approvalDigest],
    ['strategyDigest', digest(historicalStrategy(handoff)), HISTORICAL_360.strategyDigest],
  ];
  for (const [label, actual, expected] of checks) if (actual !== expected) throw new Error(`Sealed 360 historical ${label} mismatch; carry-forward requires Josh review`);
  if (handoff.source.checkpoint.runId !== HISTORICAL_360.runId || handoff.source.checkpoint.sourceSha !== HISTORICAL_360.sourceSha || String(handoff.source.artifactId) !== HISTORICAL_360.artifactId) throw new Error('Sealed 360 source checkpoint/artifact identity mismatch; carry-forward requires Josh review');
  if (handoff.runId !== HISTORICAL_360.runId || handoff.prospect.prospectId !== HISTORICAL_360.prospectId || handoff.prospect.placeId !== HISTORICAL_360.placeId || ledger.prospectId !== HISTORICAL_360.prospectId || ledger.placeId !== HISTORICAL_360.placeId) throw new Error('Sealed 360 prospect/place identity mismatch; carry-forward requires Josh review');
  if (JSON.stringify(handoff.selectedServiceIds) !== JSON.stringify(HISTORICAL_360.selectedServiceIds)) throw new Error('Sealed 360 selected services mismatch; carry-forward requires Josh review');
  if (JSON.stringify((handoff.pages || []).map(page => page.url)) !== JSON.stringify(HISTORICAL_360.routes)) throw new Error('Sealed 360 approved routes mismatch; carry-forward requires Josh review');
  if (JSON.stringify((handoff.candidateServices || []).map(service => service.id).sort()) !== JSON.stringify(HISTORICAL_360.candidateServiceIds)) throw new Error('Sealed 360 rejected/folded service ledger mismatch; carry-forward requires Josh review');
  if (handoff.approval?.approvedBy !== 'Josh Lenz' || handoff.approval?.runId !== HISTORICAL_360.runId || JSON.stringify(handoff.approval?.approvedRoutes) !== JSON.stringify(HISTORICAL_360.routes)) throw new Error('Sealed 360 Josh approval record mismatch; carry-forward requires Josh review');
  return { ...HISTORICAL_360, synthetic: true, provenance: { provider: 'github-actions-artifact', runId: HISTORICAL_360.runId, artifactId: HISTORICAL_360.artifactId, sourceSha: HISTORICAL_360.sourceSha, rootIdentity: TRUSTED.rootIdentity } };
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(path.resolve(filename), 'utf8'));
}

function sealedVendor(operation) {
  return {
    sealedEvidence: true,
    synthetic: true,
    syntheticReplay: true,
    provenanceType: 'github-actions-artifact',
    // Never impersonate a production provider in a repository replay.  These
    // values are intentionally rejected by production receipt validation.
    provider: 'repository-sealed-evidence',
    receiptKind: 'synthetic-replay',
    runId: TRUSTED.runId,
    artifactId: TRUSTED.artifactId,
    githubArtifactId: TRUSTED.artifactId,
    sourceSha: TRUSTED.sourceSha,
    archiveName: TRUSTED.archiveName,
    rootIdentity: TRUSTED.rootIdentity,
  };
}

function bindClaims(pages) {
  return pages.map((page) => {
    const service = page.type === 'Service' ? page.service : undefined;
    return {
      ...page,
      service,
      claims: (page.claims || []).map((claim) => {
        if (claim && typeof claim === 'object' && Array.isArray(claim.evidenceRefs) && claim.evidenceRefs.length) {
          return page.type === 'Service' ? { ...claim, service: claim.service || service } : { ...claim, service: undefined };
        }
        const text = typeof claim === 'string' ? claim : String(claim?.text || claim?.claim || '');
        if (!text) return page.type === 'Contact' ? { text: '', evidenceRefs: [] } : { text: 'Evidence-backed page direction', evidenceRefs: page.strongestEvidence ? [page.strongestEvidence] : [], service };
        return page.strongestEvidence
          ? { text, evidenceRefs: [page.strongestEvidence], service }
          : { text, evidenceRefs: [] };
      }).filter((claim) => (claim.evidenceRefs && claim.evidenceRefs.length) || page.type === 'Contact'),
    };
  });
}

function reboundLedger(ledger, sourceIdentity, runContext) {
  return {
    ...ledger,
    prospectId: runContext.prospectId || ledger.prospectId,
    placeId: runContext.placeId || ledger.placeId,
    runId: runContext.runId || ledger.runId,
    sourceIdentity,
  };
}

function loadSealed360({ root = process.cwd() } = {}) {
  const discovery = validateSeededDiscoveryPacket(readJson(path.join(root, 'canary/inputs/360-garage-door-and-more.discovery.json')));
  const handoff = readJson(path.join(root, 'canary/outputs/360-four-page-reseal-handoff.json'));
  const packet = handoff.reviewInventory?.reviewPacket;
  const classification = handoff.reviewInventory?.classification;
  if (!packet || !classification || handoff.prospect?.placeId !== PLACE_ID) throw new Error('Sealed 360 evidence is missing review inventory');
  const lineage = verifySealed360Lineage({ root, discovery, handoff });
  const judgments = Object.fromEntries((classification.reviews || []).map((entry) => [entry.id, entry.authoritativeJudgment]));
  return { discovery, handoff, packet, classification, judgments, lineage };
}

function createSealedApifyAdapter(sealed) {
  return {
    async discoverCandidates() {
      return {
        ...sealed.discovery,
        provenance: { ...sealed.discovery.provenance, run: { ...sealedVendor('discovery'), status: 'completed' } },
      };
    },
    async enrichFinalist({ placeId }) {
      if (String(placeId) !== PLACE_ID) throw new Error('Sealed 360 enrichment refuses a cross-prospect place');
      return {
        ...sealed.packet,
        provenance: { ...(sealed.packet.provenance || {}), provider: 'apify', exactPlaceId: PLACE_ID, run: { ...sealedVendor('finalist-enrichment'), status: 'completed' } },
      };
    },
  };
}

function createSealedCursorAdapter(sealed) {
  return {
    async runResearchRecord({ kind, jobId, input }) {
      if (kind === 'website-audit') {
        if (input?.candidate?.placeId && String(input.candidate.placeId) !== PLACE_ID) throw new Error('Sealed 360 website audit refuses a cross-prospect place');
        const result = {
          kind,
          website: WEBSITE,
          opportunity: OPPORTUNITY,
          evidence: [
            { type: 'copy', text: OPPORTUNITY, sourceUrl: `${WEBSITE}` },
            { type: 'copy', text: 'undifferentiated services gallery', sourceUrl: `${WEBSITE}services/` },
            { type: 'copy', text: 'contact', sourceUrl: `${WEBSITE}contact/` },
          ],
          images: [{ url: `${WEBSITE}`, kind: 'owned-home', provenance: { sourceUrl: `${WEBSITE}` } }],
          siteCopyEvidence: [{ type: 'copy', text: OPPORTUNITY, sourceUrl: `${WEBSITE}` }],
          ownedGraphicEvidence: [{ type: 'graphic', text: 'owned home graphic', sourceUrl: `${WEBSITE}`, url: `${WEBSITE}` }],
        };
        return { result, receipt: { ...sealedVendor('website-audit'), jobId, status: 'completed', resolvedModel: 'grok-4.6' } };
      }
      if (kind === 'review-judgment') {
        const review = input?.review;
        if (!review?.id) throw new Error('Sealed 360 review judgment requires a review id');
        const judgment = sealed.judgments[review.id];
        if (!judgment) throw new Error(`Sealed 360 review judgment is missing for ${review.id}`);
        return { result: { ...judgment, kind: 'review-judgment', reviewId: review.id, authoritative: true }, receipt: { ...sealedVendor('review-judgment'), jobId, status: 'completed', resolvedModel: 'grok-4.6', requestedAlias: 'cursor-grok-4.6-high' } };
      }
      if (kind === 'page-prescription') {
        const sourceCheckpoint = input?.decision?.sourceCheckpoint;
        if (!sourceCheckpoint) throw new Error('Sealed 360 page prescription requires a source checkpoint');
        if (String(input?.finalist?.placeId) !== PLACE_ID) throw new Error('Sealed 360 page prescription refuses a cross-prospect place');
        const runContext = { prospectId: input.finalist?.prospectId || PLACE_ID, placeId: PLACE_ID, runId: input.finalist?.runId || sourceCheckpoint.sourceIdentity?.runId };
        const pages = bindClaims(sealed.handoff.pages);
        const ledger = reboundLedger(sealed.handoff.serviceCoverageLedger, sourceCheckpoint.sourceIdentity, runContext);
        const result = {
          kind,
          pages,
          comparison: { candidates: sealed.handoff.candidateServices },
          serviceCoverageLedger: ledger,
          sourceCheckpoint,
          candidateServices: sealed.handoff.candidateServices,
        };
        return { result, receipt: { ...sealedVendor('page-prescription'), jobId, status: 'completed', resolvedModel: 'grok-4.6' } };
      }
      throw new Error(`Sealed 360 adapter does not implement ${kind}`);
    },
  };
}

function createSealed360Adapters({ root = process.cwd() } = {}) {
  const sealed = loadSealed360({ root });
  return {
    sealed,
    apify: createSealedApifyAdapter(sealed),
    cursor: createSealedCursorAdapter(sealed),
    selection: {
      selectedPlaceId: PLACE_ID,
      qualifiedPlaceIds: [PLACE_ID],
      reason: 'Josh-approved 360 Garage Door and More four-page Gate 1 prospect from sealed repository evidence.',
    },
    qa: {
      passed: true,
      whyBuilt: {
        text: `${OPPORTUNITY} Authoritative reviews document completed garage-door repairs and new-door installations that keep the two approved service directions distinct.`,
        refs: [
          { type: 'opportunity', ref: OPPORTUNITY },
          { type: 'review', ref: 'Ci9DQUlRQUNvZENodHljRjlvT2xWdlZGQk9hMjFOUlhaVk5rczFVR2RKTlVKWlVGRRAB' },
        ],
      },
    },
    request: sealed.discovery.request || sealed.discovery.discoveryRequest,
    digest: digest({ placeId: PLACE_ID, sourceSha: TRUSTED.sourceSha, artifactId: TRUSTED.artifactId }),
  };
}

module.exports = { PLACE_ID, WEBSITE, OPPORTUNITY, HISTORICAL_360, loadSealed360, verifySealed360Lineage, canonicalApprovedLineageProjection, compareApprovedLineage, createSealed360Adapters, bindClaims, reboundLedger };
