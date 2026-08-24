'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { FINAL_STAGE, STAGES, loadState, writeState, acquireLock, enqueue, claimNext, transition } = require('./control-plane');
const { MAX_DISCOVERY_CANDIDATES, stableCandidateIdentity, buildCandidateBench, architectSelect } = require('./candidates');
const { buildClassificationArtifact } = require('../review-evidence/classify');
const { buildPrescriptionEvidence } = require('../review-evidence/prescription');
const { prescribe } = require('./prescription');
const { architectQa, renderGate1 } = require('./gate1');

const REVIEW_LIMIT = 50;
const nextAction = (code, message, extra = {}) => ({ code, owner: 'architect', message, ...extra });
const currentRun = (state) => state.runs.find((run) => ['active', 'interrupted', FINAL_STAGE].includes(run.status)) || null;
const configValue = (config, key, fallback) => Number.isFinite(config?.[key]) ? config[key] : fallback;

function requireDiscoveryRequest(request) {
  if (!request || !Array.isArray(request.searchStrings) || !request.searchStrings.length || !String(request.location || '').trim()) throw Object.assign(new Error('A fresh discovery request requires searchStrings and location'), { code: 'DISCOVERY_REQUEST_REQUIRED' });
  return { searchStrings: request.searchStrings.map(String), location: String(request.location).trim() };
}
function discoveryAdapter(adapters) {
  if (typeof adapters?.discovery?.discoverCandidates === 'function') return adapters.discovery.discoverCandidates.bind(adapters.discovery);
  if (typeof adapters?.discovery?.discover === 'function') return adapters.discovery.discover.bind(adapters.discovery);
  throw new TypeError('discovery adapter must implement discoverCandidates or discover');
}
function auditAdapter(adapters) {
  if (typeof adapters?.websiteAudit?.audit === 'function') return adapters.websiteAudit.audit.bind(adapters.websiteAudit);
  throw new TypeError('website audit adapter must implement audit');
}
function enrichmentAdapter(adapters) {
  if (typeof adapters?.enrichment?.enrichFinalist === 'function') return adapters.enrichment.enrichFinalist.bind(adapters.enrichment);
  if (typeof adapters?.enrichment?.enrichExactPlace === 'function') return adapters.enrichment.enrichExactPlace.bind(adapters.enrichment);
  throw new TypeError('enrichment adapter must implement enrichFinalist or enrichExactPlace');
}
function judgeAdapter(adapters) {
  if (typeof adapters?.reviewJudge?.judge === 'function') return adapters.reviewJudge.judge.bind(adapters.reviewJudge);
  if (typeof adapters?.reviewJudge === 'function') return adapters.reviewJudge;
  throw new TypeError('review judge adapter must implement judge');
}
function proposalAdapter(adapters) {
  if (typeof adapters?.prescriber?.propose === 'function') return adapters.prescriber.propose.bind(adapters.prescriber);
  if (typeof adapters?.prescriber?.prescribe === 'function') return adapters.prescriber.prescribe.bind(adapters.prescriber);
  if (typeof adapters?.cursorProposal?.propose === 'function') return adapters.cursorProposal.propose.bind(adapters.cursorProposal);
  throw new TypeError('proposal adapter must implement prescriber.propose/prescribe or cursorProposal.propose');
}
function gateAdapter(adapters) {
  if (typeof adapters?.gate1?.render === 'function') return adapters.gate1.render.bind(adapters.gate1);
  return renderGate1;
}
function unwrapPacket(packet) { return packet?.packet && typeof packet.packet === 'object' ? packet.packet : packet || {}; }
function normalizeCandidate(candidate, request) { return { ...candidate, location: candidate.location || candidate.address || request.location, placeId: candidate.placeId || candidate.id || null, website: candidate.website || candidate.websiteUrl || null }; }
function writeAtomic(filename, contents, filesystem = fs) {
  const temporary = `${filename}.${process.pid}.tmp`;
  filesystem.writeFileSync(temporary, contents, 'utf8');
  filesystem.renameSync(temporary, filename);
}
async function persist(state, root, now) { return writeState(root, state, now); }

async function discoverAndAudit({ state, root, adapters, request, config, now }) {
  const discovery = await discoveryAdapter(adapters)({ ...request, limit: configValue(config, 'maxDiscoveryCandidates', MAX_DISCOVERY_CANDIDATES) });
  const packet = unwrapPacket(discovery);
  const rawCandidates = (packet.candidates || packet.places || packet.items || []).slice(0, MAX_DISCOVERY_CANDIDATES).map((candidate) => normalizeCandidate(candidate, request));
  const audits = new Map();
  const auditReceipts = {};
  for (const candidate of rawCandidates) {
    const result = await auditAdapter(adapters)({ candidate, request });
    const audit = result?.audit || result;
    const identity = stableCandidateIdentity(candidate);
    audits.set(identity, audit);
    if (result?.receipt || result?.cursorReceipt) auditReceipts[identity] = result.receipt || result.cursorReceipt;
  }
  state.discoveryRequest = request;
  state.discoveryPacket = { kind: packet.kind || 'discovery-candidates', candidates: rawCandidates, request: packet.request || request, provenance: packet.provenance || null, receipt: packet.receipt || packet.provenance?.run || null, retrievedAt: new Date(now).toISOString() };
  state.auditReceipts = auditReceipts;
  state.candidateBench = buildCandidateBench(rawCandidates, audits, { durableIdentities: state.durableIdentities || [] });
  state.pendingSelection = { status: 'awaiting-architect-selection', createdAt: new Date(now).toISOString() };
}

function applySelection(state, decision, now) {
  const selected = architectSelect(state.candidateBench || [], decision);
  state.candidateBench = selected.bench;
  state.durableIdentities = [...(state.durableIdentities || []), ...selected.bench.filter((candidate) => candidate.stage === 'qualified-backlog').map((candidate) => ({ name: candidate.name, website: candidate.website, location: candidate.location }))];
  const selectedEntry = enqueue(state, selected.finalist, now);
  if (!selectedEntry || selectedEntry.disposition !== 'clear' || selectedEntry.item?.status !== 'queued') {
    throw Object.assign(new Error('Selected finalist was blocked before queue claim'), { code: 'SELECTED_FINALIST_BLOCKED', disposition: selectedEntry?.disposition || 'unknown' });
  }
  for (const candidate of selected.bench.filter((entry) => entry.stage === 'qualified-backlog')) enqueue(state, candidate, now);
  state.pendingSelection = null;
}

function inventoryForQa(classification, packet, finalist) {
  const reviews = packet.reviews || [];
  const empty = packet.emptyTextReviews || [];
  const requestedLimit = packet.requestedLimit ?? packet.requestedReviewLimit ?? null;
  const dateWindow = Object.prototype.hasOwnProperty.call(packet, 'dateWindow') ? packet.dateWindow : undefined;
  const packetPlaceId = packet.placeId || packet.provenance?.exactPlaceId || packet.provenance?.placeId || null;
  const exactPlace = Boolean(finalist?.placeId && packetPlaceId && String(finalist.placeId) === String(packetPlaceId));
  const discoverySampleOnly = packet.discoverySampleOnly === true || packet.sampleOnly === true;
  const listingReviewCount = packet.listingReviewCount;
  const retrievedReviewCount = reviews.length + empty.length;
  const enoughForListing = Number.isFinite(listingReviewCount) && (listingReviewCount < 25 ? retrievedReviewCount >= listingReviewCount : retrievedReviewCount >= Math.min(REVIEW_LIMIT, listingReviewCount));
  const sufficient = exactPlace && requestedLimit === REVIEW_LIMIT && dateWindow === null && !discoverySampleOnly && enoughForListing;
  return { ...classification, exactPlace, exactPlaceId: packetPlaceId, discoverySampleOnly, dateWindow, requestedLimit, listingReviewCount: listingReviewCount ?? null, retrievedReviewCount, writtenReviewCount: classification.writtenReviewCount, emptyReviewCount: classification.emptyReviewCount, enrichmentStatus: sufficient ? 'sufficient' : 'incomplete', availabilityPattern: null };
}
function proposalPayload(proposal) { return { proposal: proposal?.proposal || proposal?.prescription || proposal, receipt: proposal?.receipt || proposal?.cursorReceipt || null }; }
function correctedProposal(proposal, corrections) {
  if (!corrections || typeof corrections !== 'object') return proposal;
  return {
    ...proposal,
    ...(Array.isArray(corrections.pages) ? { pages: corrections.pages } : {}),
    ...(Array.isArray(corrections.proposedPages) ? { proposedPages: corrections.proposedPages } : {}),
    ...(Array.isArray(corrections.services) ? { services: corrections.services } : {}),
    ...(Array.isArray(corrections.candidateServices) ? { candidateServices: corrections.candidateServices } : {}),
  };
}
function qaDecision(decision) { return decision?.qa || (decision && (Object.prototype.hasOwnProperty.call(decision, 'qaPass') || decision.whyBuilt) ? { passed: decision.qaPass === true, whyBuilt: decision.whyBuilt, corrections: decision.corrections } : null); }

async function classifyResumably({ run, state, adapters, root, now }) {
  const packet = run.artifacts.reviewPacket;
  const judgments = run.artifacts.reviewJudgments || {};
  const judge = judgeAdapter(adapters);
  for (const review of packet.reviews || []) {
    if (judgments[review.id]) continue;
    judgments[review.id] = await judge({ review, finalist: run.candidate });
    run.artifacts.reviewJudgments = judgments;
    await persist(state, root, now);
  }
  const classification = buildClassificationArtifact({ reviews: [...(packet.reviews || []), ...(packet.emptyTextReviews || [])], judgments });
  run.artifacts.classification = classification;
  run.artifacts.inventory = inventoryForQa(classification, packet, run.candidate);
  run.completedStages = [...new Set([...(run.completedStages || []), 'review-intelligence'])];
  transition(state, run.runId, 'page-prescription', { owner: run.owner, now });
  await persist(state, root, now);
}

function buildValidatedPrescription({ run, classification, proposal }) {
  const pages = proposal.pages || proposal.proposedPages;
  const services = proposal.services || proposal.candidateServices || (Array.isArray(proposal.valueHierarchy) ? proposal.valueHierarchy : proposal.valueHierarchy?.candidates) || [];
  if (!Array.isArray(pages) || !pages.length) throw new Error('Cursor proposal must include explicit pages');
  if (!Array.isArray(services)) throw new Error('Cursor proposal must include candidate services');
  const evidence = buildPrescriptionEvidence({ classification, pages, candidateServices: services });
  const prescription = prescribe({ finalist: run.candidate, classification, services, proposedPages: pages });
  prescription.evidence = evidence;
  return prescription;
}

async function runFactoryCycle({ root, config, adapters, discoveryRequest = null, architectDecision = {}, owner = 'architect', now = new Date() }) {
  if (config?.productionCapacity !== 1) throw Object.assign(new Error('productionCapacity must be exactly 1'), { code: 'INVALID_CAPACITY' });
  const release = acquireLock(root, owner, now);
  let state;
  try {
    state = loadState(root, config, now);
    let run = currentRun(state);
    if (run?.status === FINAL_STAGE) return { ok: true, state, run, nextAction: nextAction(FINAL_STAGE, 'Gate 1 is ready; no later stage may start.') };
    if (!run && state.pendingSelection) {
      if (!architectDecision.selection && !(architectDecision.selectedPlaceId || architectDecision.qualifiedPlaceIds)) { await persist(state, root, now); return { ok: true, state, candidateBench: state.candidateBench, nextAction: nextAction('architect-candidate-review-required', 'Architect must qualify the candidate bench and select one finalist.', { candidateBench: state.candidateBench }) }; }
      applySelection(state, architectDecision.selection || { selectedPlaceId: architectDecision.selectedPlaceId, qualifiedPlaceIds: architectDecision.qualifiedPlaceIds, reason: architectDecision.reason }, now);
      run = claimNext(state, owner, now); await persist(state, root, now);
    }
    if (!run) { run = claimNext(state, owner, now); if (run) await persist(state, root, now); }
    if (!run) {
      if (!discoveryRequest) return { ok: true, state, nextAction: nextAction('architect-discovery-request-required', 'Architect must provide searchStrings and location for a fresh discovery request.') };
      const request = requireDiscoveryRequest(discoveryRequest);
      await discoverAndAudit({ state, root, adapters, request, config, now }); await persist(state, root, now);
      if (!architectDecision.selection && !(architectDecision.selectedPlaceId || architectDecision.qualifiedPlaceIds)) return { ok: true, state, candidateBench: state.candidateBench, nextAction: nextAction('architect-candidate-review-required', 'Architect must qualify the candidate bench and select one finalist.', { candidateBench: state.candidateBench }) };
      applySelection(state, architectDecision.selection || { selectedPlaceId: architectDecision.selectedPlaceId, qualifiedPlaceIds: architectDecision.qualifiedPlaceIds, reason: architectDecision.reason }, now);
      run = claimNext(state, owner, now); await persist(state, root, now);
    }
    if (run.stage === STAGES[0]) { transition(state, run.runId, 'finalist-enrichment', { owner, now }); await persist(state, root, now); }
    if (!run.paidWork.finalistEnrichment) {
      const packet = unwrapPacket(await enrichmentAdapter(adapters)({ finalist: run.candidate, placeId: run.candidate.placeId, mapsUrl: run.candidate.mapsUrl || run.candidate.googleMapsUrl || run.candidate.url, limit: REVIEW_LIMIT, dateWindow: null, exactPlace: true }));
      const hasPacketDateWindow = Object.prototype.hasOwnProperty.call(packet, 'dateWindow');
      const hasProvenanceDateWindow = Object.prototype.hasOwnProperty.call(packet.provenance || {}, 'dateWindow');
      const packetDateWindow = hasPacketDateWindow
        ? packet.dateWindow
        : (hasProvenanceDateWindow ? packet.provenance.dateWindow : undefined);
      run.artifacts.reviewPacket = {
        ...packet,
        placeId: packet.placeId || packet.provenance?.exactPlaceId || null,
        // Keep adapter-reported request metadata intact; missing limit remains
        // unknown and therefore cannot satisfy the full-enrichment QA check.
        requestedLimit: packet.requestedLimit ?? packet.requestedReviewLimit ?? null,
        discoverySampleOnly: packet.discoverySampleOnly === true || packet.sampleOnly === true,
        reviews: packet.reviews || [],
        emptyTextReviews: packet.emptyTextReviews || [],
      };
      if (hasPacketDateWindow || hasProvenanceDateWindow) run.artifacts.reviewPacket.dateWindow = packetDateWindow;
      run.paidWork.finalistEnrichment = { completedAt: new Date(now).toISOString(), receipt: packet.receipt || packet.provenance?.run || null, reviewsRetrieved: run.artifacts.reviewPacket.reviews.length };
      transition(state, run.runId, 'review-intelligence', { owner, now, artifact: run.artifacts.reviewPacket, paid: true }); await persist(state, root, now);
    }
    if (!run.artifacts.classification || Object.keys(run.artifacts.reviewJudgments || {}).length < run.artifacts.reviewPacket.reviews.length) await classifyResumably({ run, state, adapters, root, now });
    const qa = qaDecision(architectDecision);
    if (!run.artifacts.prescription) {
      // Production proposals validate before they return. Forward an explicit
      // Architect correction at that boundary so a valid evidence-bound
      // correction can repair a rejected Cursor proposal without starting a
      // second paid research job.
      const proposalDecision = qa ? {
        ...(qa.corrections || {}),
        ...(qa.whyBuilt ? { whyBuilt: qa.whyBuilt } : {}),
        architectReview: qa,
      } : {};
      const proposalResult = await proposalAdapter(adapters)({ finalist: run.candidate, classification: run.artifacts.classification, inventory: run.artifacts.inventory, discoveryPacket: state.discoveryPacket, decision: proposalDecision });
      const proposal = proposalPayload(proposalResult); run.artifacts.cursorProposal = proposal.proposal; run.artifacts.cursorProposalReceipt = proposal.receipt; run.artifacts.prescription = buildValidatedPrescription({ run, classification: run.artifacts.classification, proposal: proposal.proposal });
      run.artifacts.inventory.availabilityPattern = run.artifacts.prescription.evidence?.availabilityPattern || null;
      transition(state, run.runId, 'architect-qa', { owner, now, artifact: run.artifacts.prescription }); await persist(state, root, now);
    }
    if (!qa) { await persist(state, root, now); return { ok: true, state, run, nextAction: nextAction('architect-qa-required', 'Architect must independently review the Cursor proposal, provide Why We Built evidence, and pass or correct it.') }; }
    let correctedPrescription = run.artifacts.prescription;
    if (qa.corrections) {
      try {
        correctedPrescription = buildValidatedPrescription({ run, classification: run.artifacts.classification, proposal: correctedProposal(run.artifacts.cursorProposal, qa.corrections) });
        run.artifacts.inventory.availabilityPattern = correctedPrescription.evidence?.availabilityPattern || null;
      } catch (error) {
        run.artifacts.qa = { decision: qa, passed: false, correctionError: error.message };
        await persist(state, root, now);
        return { ok: true, state, run, nextAction: nextAction('architect-qa-required', 'Architect correction failed prescription validation; no corrected artifact was accepted.', { correctionError: error.message }) };
      }
    }
    const whyBuilt = qa.whyBuilt || qa.corrections?.whyBuilt;
    const qaResult = architectQa({ finalist: run.candidate, inventory: run.artifacts.inventory, prescription: correctedPrescription, whyBuilt, laterStageArtifacts: [] });
    run.artifacts.qa = { decision: qa, checks: qaResult.checks, passed: qaResult.passed };
    if (qa.passed !== true || !qaResult.passed) { await persist(state, root, now); return { ok: true, state, run, nextAction: nextAction('architect-qa-required', 'Architect QA is not complete; correct the reported checks before Gate 1.', { checks: qaResult.checks }) }; }
    run.artifacts.prescription = correctedPrescription;
    const gateResult = await gateAdapter(adapters)({ finalist: run.candidate, prescription: correctedPrescription, inventory: run.artifacts.inventory, classifications: run.artifacts.reviewJudgments, whyBuilt });
    const markdown = typeof gateResult === 'string' ? gateResult : gateResult?.markdown;
    if (typeof markdown !== 'string' || !markdown.trim()) throw Object.assign(new Error('Gate 1 renderer must return markdown text'), { code: 'INVALID_GATE1_ARTIFACT' });
    const relativeArtifactPath = path.join('state', 'gate1', `${run.runId}.md`);
    const artifactPath = path.join(root, relativeArtifactPath); fs.mkdirSync(path.dirname(artifactPath), { recursive: true }); writeAtomic(artifactPath, markdown);
    run.artifacts.gate1 = { path: relativeArtifactPath, markdown }; transition(state, run.runId, FINAL_STAGE, { owner, now, artifact: run.artifacts.gate1 }); await persist(state, root, now);
    return { ok: true, state, run, nextAction: nextAction(FINAL_STAGE, 'Gate 1 is ready; no later stage may start.') };
  } catch (error) {
    state = state || loadState(root, config, now); const interrupted = currentRun(state);
    if (interrupted && interrupted.status !== FINAL_STAGE) { interrupted.status = 'interrupted'; interrupted.interruption = { message: error.message, at: new Date(now).toISOString() }; await persist(state, root, now); }
    throw error;
  } finally { release(); }
}

module.exports = { REVIEW_LIMIT, requireDiscoveryRequest, inventoryForQa, writeAtomic, runFactoryCycle };
