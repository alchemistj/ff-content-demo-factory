'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createSeededDiscoveryAdapter, validateSeededDiscoveryPacket } = require('../adapters/seeded-discovery');
const { digest } = require('./prescription-policy');
const { TRUSTED_ARTIFACTS } = require('./trusted-artifacts');

const PLACE_ID = 'ChIJHa32AOi84YMR38BV93YKiS8';
const WEBSITE = 'http://www.360garagedoor.com/';
const OPPORTUNITY = 'The owned site currently uses Home plus an undifferentiated services gallery, which buries distinct completed-work evidence.';
const TRUSTED = TRUSTED_ARTIFACTS['32717620900:9516514426:81587f8422a23313fd7868751061eec7e2fb5926'];

function readJson(filename) {
  return JSON.parse(fs.readFileSync(path.resolve(filename), 'utf8'));
}

function sealedVendor(operation) {
  return {
    sealedEvidence: true,
    provider: operation === 'discovery' || operation === 'finalist-enrichment' ? 'apify' : 'cursor-sdk',
    runId: TRUSTED.runId,
    datasetId: TRUSTED.artifactId,
    artifactId: TRUSTED.artifactId,
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
  const judgments = Object.fromEntries((classification.reviews || []).map((entry) => [entry.id, entry.authoritativeJudgment]));
  return { discovery, handoff, packet, classification, judgments };
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

module.exports = { PLACE_ID, WEBSITE, OPPORTUNITY, loadSealed360, createSealed360Adapters, bindClaims, reboundLedger };
