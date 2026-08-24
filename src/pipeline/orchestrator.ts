import { loadCanonicalGuides, type GuideProvider, type LoadedGuides } from '../guides/loader.js';
import { assertApprovedProspectHandoff, type ApprovedProspectHandoff } from '../contracts/index.js';
import { createHumanGate2Artifact } from '../render/human-gate-2.js';
import { runDeterministicQa } from '../qa/deterministic.js';
import { runWholeSiteQa } from '../qa/whole-site.js';
import { validateIntelligentAssessment, type IntelligentDimension } from '../qa/intelligent.js';
import { isCursorWriterExecutor, type CursorWriterExecutor, type CursorWriterReceipt } from './cursor-writer.js';
import { STAGES, createInitialState, createMemoryStateStore, handoffFingerprint, readState, reviewFingerprint, type JsonObject, type PipelineState, type StateStore, validateState, writeState } from './state.js';

type Dict = Record<string, any>;
export type PipelineAdapter = ((payload: Dict) => unknown | Promise<unknown>) | { id?: string; write?: PipelineAdapter; run?: PipelineAdapter; repair?: PipelineAdapter };
type Adapter = PipelineAdapter;
export type WriterAdapters = Dict;
export type QaAdapters = Dict;
export interface PipelineInput { handoff?: ApprovedProspectHandoff; prospectId?: string; prospect?: JsonObject; prescription?: JsonObject | null; evidence?: JsonObject | null; reviewInventory?: any; stateStore?: StateStore; writers?: WriterAdapters; qa?: QaAdapters; qaAdapters?: QaAdapters; wholeSiteAssessor?: Adapter; wholeSiteQa?: Adapter; wholeSiteRepair?: Adapter; guideProvider?: GuideProvider; guidesProvider?: GuideProvider; now?: Date | string | number; clock?: () => Date; maxRepairs?: number; production?: boolean; cursorWriter?: CursorWriterExecutor }
export interface PipelineResult { state: PipelineState; complete: boolean }

export class PipelineError extends Error {
  readonly code: string;
  readonly details?: unknown;
  constructor(code: string, message: string, details?: unknown) { super(message); this.name = 'PipelineError'; this.code = code; this.details = details; }
}

function idOf(entry: any, fallback?: string): string | undefined { if (typeof entry === 'string') return entry; if (!entry || typeof entry !== 'object') return fallback; return entry.id || entry.slug || entry.path || entry.url || fallback; }
function entries(value: any): Dict[] { if (Array.isArray(value)) return value; if (value && typeof value === 'object') return Object.entries(value).map(([key, item]) => ({ key, ...(item && typeof item === 'object' ? item : { value: item }) })); return []; }

export function prescribedServices(prescription: any, expansionOverride?: any): Dict[] {
  const destinations = prescription?.destinations;
  const raw = prescription?.prescribedServicePages || prescription?.servicePages || prescription?.services || destinations?.servicePages || (Array.isArray(prescription?.pages) ? prescription.pages.filter((page: Dict) => page.kind === 'service' || page.type === 'service') : null);
  const values = entries(raw);
  if (values.length < 2 || (values.length !== 2 && !expansionOverride)) throw new PipelineError('SERVICE_PAGE_PRESCRIPTION_REQUIRED', 'Writer 1 requires exactly two prescribed service pages unless a valid expansion override is present');
  return values.map((item, index) => ({ ...item, pageId: String(idOf(item, item.key || `service-${index + 1}`)) }));
}
function mapPages(value: any): Dict { if (Array.isArray(value)) return Object.fromEntries(value.map((page, index) => [String(idOf(page, `page-${index + 1}`)), page])); return value && typeof value === 'object' ? { ...value } : {}; }
function extractPages(result: any, keys: string[]): Dict { for (const key of keys) if (result && typeof result === 'object' && result[key] !== undefined) return key === 'strategyOverview' ? { strategyOverview: result[key] } : mapPages(result[key]); return mapPages(result); }
function aliases(entry: any): string[] { const id = idOf(entry); if (!id) return []; const values = [String(id)]; if (entry && typeof entry === 'object' && entry.slug) values.push(String(entry.slug)); if (entry && typeof entry === 'object' && entry.path) values.push(String(entry.path), String(entry.path).replace(/^\//, '')); return [...new Set(values)]; }

export function normalizeExpectedPages(result: any, expectedInput: (string | Dict)[], keys: string[], label: string): Dict {
  const map = extractPages(result, keys); const expected = expectedInput.map((item) => typeof item === 'string' ? { pageId: item } : item); const used = new Set<string>(); const normalized: Dict = {};
  for (const item of expected) { const id = String(item.pageId || idOf(item)); const found = Object.keys(map).find((key) => !used.has(key) && aliases({ ...item, id }).includes(String(key))); if (!found) throw new PipelineError('WRITER_PAGE_SET_MISMATCH', `${label} did not return prescribed page: ${id}`); used.add(found); normalized[id] = map[found]; }
  const extras = Object.keys(map).filter((key) => !used.has(key)); if (extras.length) throw new PipelineError('WRITER_PAGE_SET_MISMATCH', `${label} returned unauthorized page(s): ${extras.join(', ')}`); return normalized;
}
function leadId(page: any): string | null {
  const placement = Array.isArray(page?.reviewPlacements) ? page.reviewPlacements.find((item: any) => item.proofRole === 'lead') : null;
  return page?.leadReviewId || page?.recommendedFirstReviewId || page?.reviewUsage?.leadReviewId || page?.reviewUsage?.lead?.id || page?.leadReview?.id || page?.leadReview?.reviewId || placement?.reviewId || null;
}
function leadReason(page: any): string | null { return page?.leadReviewChangeReason || page?.reviewUsage?.leadReviewChangeReason || page?.reviewUsage?.lead?.changeReason || page?.leadReview?.rationale || page?.leadReview?.changeReason || null; }
function preferredLead(service: any): string | null { return service?.recommendedFirstReview || service?.recommendedFirstReviewId || service?.recommendedLeadReviewId || service?.recommendedFirstReview?.id || service?.recommendedFirstReview?.reviewId || service?.leadReviewId || null; }

export function enforceReviewChoices(stage: string, pages: Dict, services: Dict[], state: PipelineState): void {
  const decisions: Dict[] = [];
  for (const service of services) { const pageId = String(service.pageId); const preferred = preferredLead(service); const selected = leadId(pages[pageId]); if (!preferred || !selected || String(preferred) === String(selected)) { if (preferred || selected) decisions.push({ stage, pageId, preferredReviewId: preferred, selectedReviewId: selected || preferred, changed: false }); continue; } const rationale = leadReason(pages[pageId]); if (!rationale || !String(rationale).trim()) throw new PipelineError('LEAD_REVIEW_CHANGE_REASON_REQUIRED', `Writer changed the preferred lead review for ${pageId} without recording a rationale`); decisions.push({ stage, pageId, preferredReviewId: String(preferred), selectedReviewId: String(selected), changed: true, rationale: String(rationale).trim() }); }
  state.reviewDecisions = [...state.reviewDecisions.filter((item) => item.stage !== stage), ...decisions];
}
function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}
function immutablePayload(payload: Dict): Dict { return deepFreeze(structuredClone(payload)); }
async function invoke(adapter: Adapter, payload: Dict): Promise<any> { if (typeof adapter === 'function') return adapter(immutablePayload(payload)); if (adapter?.write) return invoke(adapter.write, payload); if (adapter?.run) return invoke(adapter.run, payload); if (adapter?.repair) return invoke(adapter.repair, payload); throw new TypeError('Adapter must be a function or expose write/run/repair'); }
function adapterId(adapter: Adapter | undefined): string | null { return adapter && typeof adapter === 'object' && typeof adapter.id === 'string' && adapter.id.trim() ? adapter.id.trim() : null; }
function requireAdapter(container: Dict | undefined, names: string[], label: string): Adapter { for (const name of names) if (container?.[name]) return container[name] as Adapter; throw new PipelineError('PIPELINE_ADAPTER_REQUIRED', `Missing injectable adapter: ${label}`); }
async function executeWriter(input: PipelineInput, production: boolean, stage: 'writer1' | 'writer2' | 'writer3', payload: Dict, adapter?: Adapter): Promise<{ output: any; receipt?: CursorWriterReceipt; threadUrl?: string }> {
  if (production) {
    if (!isCursorWriterExecutor(input.cursorWriter)) throw new PipelineError('CURSOR_WRITER_REQUIRED', `Production ${stage} requires the verified Cursor SDK writer executor`);
    try {
      const dispatched = await input.cursorWriter.dispatch(stage, payload, `Words Factory ${stage} execution for approved handoff`, input.handoff?.sourceCheckpoint.runId || 'unknown-run');
      return { output: dispatched.output, receipt: dispatched.receipt, threadUrl: dispatched.threadUrl };
    } catch (error) {
      throw new PipelineError('CURSOR_WRITER_FAILED', `Cursor ${stage} did not complete with a valid receipt`, error);
    }
  }
  if (!adapter) throw new PipelineError('PIPELINE_ADAPTER_REQUIRED', `Missing injectable adapter: ${stage}`);
  return { output: await invoke(adapter, payload) };
}
function canonicalRoute(value: unknown, fallback = ''): string {
  const raw = String(value || fallback);
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    return parsed.pathname || '/';
  } catch {
    return raw.startsWith('/') ? raw : `/${raw.replace(/^\/+/, '')}`;
  }
}
function pageRoute(page: any, fallback: string): string { return canonicalRoute(page?.url || page?.path || page?.route, fallback); }
function normalizedPageType(value: unknown): string { return String(value || '').toLowerCase().replace(/[ _-]+/gu, ''); }
function assertPageIdentity(page: any, prescription: any, pageType: string, label: string): void {
  const expectedId = String(prescription?.id || '');
  const expectedRoute = canonicalRoute(prescription?.url);
  const actualRoute = pageRoute(page, '');
  const actualUrl = page?.url || page?.path || page?.route;
  let wrongOrigin = false;
  try {
    if (typeof actualUrl === 'string' && /^https?:/u.test(actualUrl) && typeof prescription?.url === 'string') wrongOrigin = new URL(actualUrl).origin !== new URL(prescription.url).origin;
  } catch { wrongOrigin = true; }
  const actualIds = [page?.pageId, page?.prescriptionId].filter((value) => value !== undefined).map(String);
  if (!page || typeof page !== 'object' || !actualRoute || actualRoute !== expectedRoute || wrongOrigin || actualIds.length === 0 || actualIds.some((id) => id !== expectedId) || normalizedPageType(page.pageType) !== normalizedPageType(pageType) || String(page.primaryKeyword || page.keyword || '') !== String(prescription?.keyword || '')) {
    throw new PipelineError('WRITER_PAGE_IDENTITY_MISMATCH', `${label} must preserve its approved route, prescription ID, page type, and primary keyword`, { expected: { id: expectedId, route: expectedRoute, pageType, primaryKeyword: prescription?.keyword }, received: page });
  }
}
function assertStrategyIdentity(page: any): void {
  if (!page || typeof page !== 'object') throw new PipelineError('WRITER_PAGE_IDENTITY_MISMATCH', 'Strategy Overview must be an internal deliverable object');
  if (page.pageType && normalizedPageType(page.pageType) !== 'strategyoverview') throw new PipelineError('WRITER_PAGE_IDENTITY_MISMATCH', 'Strategy Overview must identify itself as an internal strategy-overview deliverable');
  if (['url', 'path', 'route'].some((key) => Object.prototype.hasOwnProperty.call(page, key))) throw new PipelineError('WRITER_PAGE_IDENTITY_MISMATCH', 'Strategy Overview cannot carry any public URL, path, or route field');
  const content = [page.body, page.text, page.content].find((value) => typeof value === 'string' && value.trim());
  if (!content && !(Array.isArray(page.sections) && page.sections.length)) throw new PipelineError('WRITER_PAGE_IDENTITY_MISMATCH', 'Strategy Overview must contain readable content');
}
function authoredLinks(value: any): string[] {
  const links: string[] = [];
  const scan = (item: any): void => {
    if (Array.isArray(item)) { item.forEach(scan); return; }
    if (!item || typeof item !== 'object') return;
    if (typeof item.href === 'string') links.push(canonicalRoute(item.href));
    else if (typeof item.url === 'string') links.push(canonicalRoute(item.url));
    Object.entries(item).forEach(([key, child]) => { if (!['href', 'url'].includes(key)) scan(child); });
  };
  scan(value);
  return links;
}
function assertApprovedChrome(output: Dict, destinations: any): void {
  for (const area of ['header', 'footer'] as const) {
    const actual = new Set(authoredLinks(output[area]));
    const missing = (destinations?.[area] || []).map((item: any) => canonicalRoute(item.url)).filter((route: string) => !actual.has(route));
    if (missing.length) throw new PipelineError('WRITER_PAGE_SET_MISMATCH', `Writer 2 ${area} omitted approved destination(s): ${missing.join(', ')}`);
  }
}
function prescribedPage(page: any, prescription: any, pageType: string): Dict {
  const reviewGrade = prescription?.reviewGrade;
  return {
    ...(page || {}),
    url: canonicalRoute(prescription?.url || page?.url || page?.path || page?.route),
    pageId: String(prescription?.id),
    prescriptionId: String(prescription?.id),
    pageType,
    primaryKeyword: String(prescription?.keyword || page?.primaryKeyword || page?.keyword || ''),
    ...(reviewGrade ? { reviewGrade, eligibleForReviews: true } : pageType === 'contact' ? { eligibleForReviews: false } : {}),
  };
}
function finalSite(state: PipelineState): Dict {
  const destinations = state.prescription?.destinations || {};
  const services = prescribedServices(state.prescription, state.handoff?.expansionOverride).map((service, index) => prescribedPage(state.outputs.servicePages?.[service.pageId], { ...service, url: service.url || `/service-${index + 1}` }, 'service'));
  const home = destinations.homepage || {};
  const contact = destinations.contact || {};
  const pages = [prescribedPage(state.outputs.homepage, home, 'homepage'), ...services, prescribedPage(state.outputs.contact, contact, 'contact')];
  return { pages, approvedServicePageCount: services.length, header: state.outputs.header, footer: state.outputs.footer, strategyOverview: { ...(state.outputs.strategyOverview || {}), pageType: 'strategy-overview', internal: true }, reviews: state.reviewInventory, businessWebsite: state.prospect?.nap?.website };
}
function pageSetFromSite(site: any, state: PipelineState): void {
  const pages = Array.isArray(site?.pages) ? site.pages : [];
  const destinations = state.prescription?.destinations || {};
  const services = prescribedServices(state.prescription, state.handoff?.expansionOverride);
  const homeRoute = canonicalRoute(destinations.homepage?.url, '/'); const contactRoute = canonicalRoute(destinations.contact?.url, '/contact');
  const home = pages.find((page: any) => pageRoute(page, '') === homeRoute); const contact = pages.find((page: any) => pageRoute(page, '') === contactRoute);
  if (!home || !contact || site.header === undefined || site.footer === undefined || site.strategyOverview === undefined) throw new PipelineError('WHOLE_SITE_REPAIR_INCOMPLETE', 'Whole-site repair must return every final page, header, footer, and Strategy Overview');
  assertPageIdentity(home, destinations.homepage, 'homepage', 'Whole-site repaired homepage'); assertPageIdentity(contact, destinations.contact, 'contact', 'Whole-site repaired contact');
  const repairedServices = services.map((service, index) => { const route = canonicalRoute(service.url, `/service-${index + 1}`); const page = pages.find((candidate: any) => pageRoute(candidate, '') === route); if (!page) throw new PipelineError('WHOLE_SITE_REPAIR_INCOMPLETE', `Whole-site repair omitted prescribed service route ${route}`); assertPageIdentity(page, service, 'service', `Whole-site repaired service ${service.pageId}`); return [service.pageId, page] as const; });
  assertStrategyIdentity(site.strategyOverview); assertApprovedChrome(site, destinations);
  state.outputs.homepage = home; state.outputs.contact = contact;
  state.outputs.servicePages = Object.fromEntries(repairedServices);
  state.outputs.header = site.header; state.outputs.footer = site.footer; state.outputs.strategyOverview = site.strategyOverview;
}
function builtInQa(state: PipelineState, stage: string, output: any): any {
  const destinations = state.prescription?.destinations || {};
  const pages = stage === 'writer1'
    ? prescribedServices(state.prescription, state.handoff?.expansionOverride).map((service) => prescribedPage(output?.[service.pageId], service, 'service'))
    : stage === 'writer2'
      ? [prescribedPage(output?.homepage, destinations.homepage, 'homepage'), prescribedPage(output?.contact, destinations.contact, 'contact')]
      : finalSite(state).pages;
  return runDeterministicQa({ pages, reviews: state.reviewInventory });
}
async function runWholeSiteAssessment(state: PipelineState, input: PipelineInput, context: Dict, assessor: Adapter): Promise<Dict> {
  let site = finalSite(state);
  const assessorIdentity = adapterId(assessor);
  if (!assessorIdentity) throw new PipelineError('WHOLE_SITE_ASSESSOR_REQUIRED', 'Whole-site assessor must be a separately identified adapter object');
  const assess = (attempt: number) => runWholeSiteQa(site, {
    assessorName: assessorIdentity,
    rejectedServiceNames: Array.isArray(state.handoff?.serviceComparison) ? state.handoff.serviceComparison.filter((entry: any) => entry?.status !== 'prescribed').flatMap((entry: any) => [entry.name, ...(Array.isArray(entry.aliases) ? entry.aliases : [])]).filter((value: any): value is string => typeof value === 'string') : [],
    assessor: async (snapshot) => {
      const result = await invoke(assessor, { ...context, site: snapshot, idempotencyKey: `${state.runId}:whole-site-qa:assess:${attempt}` });
      if (result?.assessor !== assessorIdentity) throw new PipelineError('WHOLE_SITE_ASSESSOR_REQUIRED', `Whole-site assessment must attest the registered assessor identity ${assessorIdentity}`);
      return result;
    },
  });
  const initial = await assess(0);
  if (initial.pass) return { initial, final: initial, site };
  if (!input.wholeSiteRepair) throw new PipelineError('WHOLE_SITE_QA_FAILED', 'Whole-site QA failed and no independent repair adapter was supplied', initial);
  const repaired = await invoke(input.wholeSiteRepair, { ...context, site, qa: initial, idempotencyKey: `${state.runId}:whole-site-qa:repair:0` });
  const repairedSite = repaired?.site || repaired?.websiteWords || repaired?.outputs?.websiteWords || repaired;
  if (repairedSite && typeof repairedSite === 'object') { pageSetFromSite(repairedSite, state); site = finalSite(state); }
  const reassessed = await assess(1);
  if (!reassessed.pass) throw new PipelineError('WHOLE_SITE_QA_FAILED', 'Whole-site QA failed after independent repair and reassessment', { initial, repaired, reassessed });
  return { initial, repair: repaired, final: reassessed, site };
}

export function contextFor(state: PipelineState, stage: string, guides: LoadedGuides): Dict {
  const finishedBusinessCopy: Dict = {};
  if (stage === 'writer2') for (const page of ['homepage', 'contact', 'header', 'footer']) if (state.outputs[page] !== undefined) finishedBusinessCopy[page] = state.outputs[page];
  if (stage !== 'writer1' && stage !== 'writer2') { Object.assign(finishedBusinessCopy, state.outputs.servicePages || {}); for (const page of ['homepage', 'contact', 'header', 'footer']) if (state.outputs[page] !== undefined) finishedBusinessCopy[page] = state.outputs[page]; }
  const reviews = Array.isArray(state.reviewInventory) ? state.reviewInventory : state.reviewInventory?.reviews;
  const reviewList = Array.isArray(reviews) ? reviews : [];
  const contentFingerprint = reviewFingerprint(state.reviewInventory);
  if (contentFingerprint !== state.reviewInventoryFingerprint) throw new PipelineError('REVIEW_INVENTORY_CORRUPTED', 'Complete review inventory no longer matches the approved handoff fingerprint');
  if (handoffFingerprint(state.handoff) !== state.handoffFingerprint) throw new PipelineError('HANDOFF_CORRUPTED', 'Complete approved handoff no longer matches its persisted fingerprint');
  const reviewIntegrity = { count: reviewList.length, ids: reviewList.map((review: any) => String(review.id)), contentFingerprint, handoffFingerprint: state.handoffFingerprint };
  const assignments: Dict = {
    writer1: { deliverables: ['exactly two prescribed service pages'], constraints: ['write only the prescribed service pages', 'use the complete review inventory'] },
    writer2: { deliverables: ['homepage', 'contact', 'header', 'footer'], constraints: ['summarize and route from the finished service pages', 'write only the listed pages', 'use the complete review inventory'] },
    writer3: { deliverables: ['Strategy Overview only'], constraints: ['describe the actual completed business-facing copy', 'write only Strategy Overview', 'use the complete review inventory'] },
    'whole-site-qa': { deliverables: ['independent assessment of the complete site'], constraints: ['do not write or replace pages'] },
  };
  const destinations = state.prescription?.destinations || {};
  const stageDestinations = stage === 'writer1'
    ? { servicePages: prescribedServices(state.prescription, state.handoff?.expansionOverride) }
    : stage === 'writer2'
      ? { homepage: destinations.homepage, contact: destinations.contact, header: destinations.header, footer: destinations.footer }
      : stage === 'writer3'
        ? { strategy: { visibility: 'internal', internalId: 'strategy-overview' } }
        : destinations;
  const stageProspect = { ...state.prospect, destinations: stageDestinations };
  const comparison = Array.isArray(state.handoff?.serviceComparison) ? state.handoff.serviceComparison : [];
  const approvedComparison = comparison.filter((entry: any) => entry?.status === 'prescribed');
  const stageEvidence = stage === 'writer3'
    ? { serviceComparison: approvedComparison, foldedIntentLedger: comparison.filter((entry: any) => entry?.status !== 'prescribed').map((entry: any) => ({ id: entry.id, name: entry.name, status: entry.status, foldInto: entry.foldInto, supportingEvidence: entry.evidence })), reviewAnalysisFacts: state.handoff?.reviewAnalysisFacts }
    : stage === 'writer1'
      ? { confirmedFacts: state.evidence?.confirmedFacts, siteEvidence: state.evidence?.siteEvidence, imageRefs: state.evidence?.imageRefs, approvedServiceEvidence: approvedComparison.map((entry: any) => ({ id: entry.id, name: entry.name, evidence: entry.evidence })) }
      : { confirmedFacts: state.evidence?.confirmedFacts, siteEvidence: state.evidence?.siteEvidence, imageRefs: state.evidence?.imageRefs };
  return immutablePayload({ stage, assignment: assignments[stage] || assignments.writer3, prospect: stageProspect, evidence: stageEvidence, prescription: { destinations: stageDestinations }, reviewInventory: state.reviewInventory, completeReviewInventory: state.reviewInventory, reviewIntegrity, guides, finishedServicePages: stage === 'writer3' ? state.outputs.servicePages || null : null, finishedBusinessCopy, sealedReviewAnalysisFacts: stage === 'writer3' ? state.handoff?.reviewAnalysisFacts : undefined, serviceComparison: stage === 'writer3' ? approvedComparison : undefined, originalAudit: stage === 'whole-site-qa' ? state.evidence?.audit : undefined, runId: state.runId });
}
function qaAdapter(qa: QaAdapters | undefined, stage: string, kind: string): Adapter | null { const stageObject = qa?.[stage]; return stageObject?.[kind] || qa?.[`${stage}${kind.charAt(0).toUpperCase()}${kind.slice(1)}`] || qa?.[kind] || null; }
function repairedOutput(result: any): any { return result?.output ?? result?.copy ?? result; }
const STAGE_DIMENSIONS: Record<string, readonly IntelligentDimension[]> = {
  writer1: ['specificity', 'strongest-review-choice', 'persuasive-flow', 'voice-drift', 'cross-page-distinctness', 'unsupported-claims', 'generic-ai-filler'],
  writer2: ['specificity', 'strongest-review-choice', 'persuasive-flow', 'voice-drift', 'cross-page-distinctness', 'homepage-complementarity', 'contact-leanness', 'unsupported-claims', 'generic-ai-filler'],
  writer3: ['specificity', 'voice-drift', 'strategy-truthfulness', 'unsupported-claims', 'generic-ai-filler'],
};
function qaReport(result: any, label: string): Dict {
  if (!result || typeof result !== 'object' || typeof result.pass !== 'boolean' || !Array.isArray(result.findings)) throw new PipelineError('PIPELINE_QA_INVALID', `${label} must return a structured QA report with pass and findings`);
  return result;
}
function thinkingReport(stage: string, result: any): Dict {
  let assessment;
  try { assessment = validateIntelligentAssessment(result); } catch (error) { throw new PipelineError('PIPELINE_QA_INVALID', `Intelligent QA returned an invalid structured assessment for ${stage}`, error); }
  const missing = (STAGE_DIMENSIONS[stage] || []).filter((dimension) => !assessment.dimensionsReviewed.includes(dimension));
  if (missing.length) throw new PipelineError('PIPELINE_QA_INVALID', `Intelligent QA omitted required ${stage} dimension(s): ${missing.join(', ')}`);
  return { ...assessment, pass: !assessment.findings.some((finding) => finding.severity === 'hard-fail') };
}

export async function qualityGate(input: { stage: string; output: any; context: Dict; qa?: QaAdapters; maxRepairs?: number; builtinCheck?: (output: any) => any }): Promise<{ output: any; checks: Dict[]; repairs: number }> {
  const deterministic = qaAdapter(input.qa, input.stage, 'deterministic'); const intelligent = qaAdapter(input.qa, input.stage, 'intelligent'); if (!deterministic || !intelligent) throw new PipelineError('PIPELINE_QA_REQUIRED', `Both deterministic and intelligent QA adapters are required for ${input.stage}`);
  const checks: Dict[] = []; let current = input.output; const maxRepairs = input.maxRepairs ?? 2;
  for (let attempt = 0; attempt <= maxRepairs; attempt += 1) {
    const payload = { ...input.context, stage: input.stage, output: current, attempt, idempotencyKey: `${input.context.runId}:${input.stage}:qa:${attempt}` };
    const builtinResult = qaReport(input.builtinCheck ? input.builtinCheck(current) : null, `${input.stage} built-in deterministic QA`);
    const deterministicResult = qaReport(await invoke(deterministic, payload), `${input.stage} deterministic QA adapter`);
    const intelligentResult = thinkingReport(input.stage, await invoke(intelligent, { ...payload, deterministic: deterministicResult }));
    const check = { attempt, builtin: builtinResult, deterministic: deterministicResult, intelligent: intelligentResult }; checks.push(check);
    if (builtinResult.pass && deterministicResult.pass && intelligentResult.pass) return { output: current, checks, repairs: attempt };
    if (attempt === maxRepairs) break;
    const repair = qaAdapter(input.qa, input.stage, 'repair') || input.qa?.repair;
    if (!repair) throw new PipelineError('PIPELINE_QA_FAILED', `QA failed for ${input.stage} and no repair adapter was supplied`, checks);
    current = repairedOutput(await invoke(repair, { ...input.context, stage: input.stage, output: current, qa: check, attempt, idempotencyKey: `${input.context.runId}:${input.stage}:repair:${attempt}` }));
    if (current === undefined) throw new PipelineError('PIPELINE_QA_FAILED', `Repair adapter returned no output for ${input.stage}`, checks);
  }
  throw new PipelineError('PIPELINE_QA_FAILED', `QA/repair did not pass for ${input.stage}`, checks);
}
function markEvent(state: PipelineState, event: Dict, clock: () => Date): void { state.events.push({ at: clock().toISOString(), ...event }); }

export async function runOneProspect(input: PipelineInput = {}): Promise<PipelineResult> {
  const stateStore = input.stateStore || createMemoryStateStore(); let state = await readState(stateStore);
  const clock = input.clock || (() => input.now instanceof Date ? input.now : new Date(input.now || Date.now()));
  if (!state) {
    if (!input.handoff) throw new PipelineError('HANDOFF_REQUIRED', 'An approved Lane A prospect handoff is required');
    try { assertApprovedProspectHandoff(input.handoff); } catch (error) { throw new PipelineError('HANDOFF_INVALID', 'Approved prospect handoff failed contract validation', error); }
    const prospect = input.handoff.prospect as unknown as JsonObject;
    state = createInitialState({ handoff: input.handoff as unknown as JsonObject, prospectId: input.handoff.prospect.id, prospect, prescription: { ...input.handoff.prospect.destinations, destinations: input.handoff.prospect.destinations }, evidence: { confirmedFacts: input.handoff.prospect.confirmedFacts, siteEvidence: input.handoff.prospect.siteEvidence, imageRefs: input.handoff.prospect.imageRefs }, reviewInventory: input.handoff.prospect.reviewInventory, executionMode: input.production === true ? 'cursor-production' : 'test', now: clock() });
    await writeState(stateStore, state);
  }
  validateState(state); if (state.stage === STAGES.AWAITING_GATE_2) return { state, complete: false }; const production = input.production === true || state.executionMode === 'cursor-production'; if (production && !isCursorWriterExecutor(input.cursorWriter)) throw new PipelineError('CURSOR_WRITER_REQUIRED', 'Production writer stages require the verified Cursor SDK writer executor'); if (!production && !input.writers) throw new PipelineError('PIPELINE_ADAPTER_REQUIRED', 'writers adapters are required');
  const qa = input.qa || input.qaAdapters; const provider = input.guideProvider || input.guidesProvider; const save = async (): Promise<void> => { state!.updatedAt = clock().toISOString(); await writeState(stateStore, state!); }; const services = prescribedServices(state.prescription, state.handoff?.expansionOverride);
  while (state.stage !== STAGES.COMPLETE) {
    if (state.stage === STAGES.WRITER_1) { const context = contextFor(state, 'writer1', await loadCanonicalGuides('writer1', provider)); const payload = { ...context, prescribedServicePages: services, idempotencyKey: `${state.runId}:writer1:write` }; state.stages[STAGES.WRITER_1] = { status: 'running' }; await save(); const execution = await executeWriter(input, production, 'writer1', payload, production ? undefined : requireAdapter(input.writers, ['writer1', 'servicePages', 'services'], 'writer1')); const pages = normalizeExpectedPages(execution.output, services, ['servicePages', 'pages'], 'Writer 1'); services.forEach((service) => assertPageIdentity(pages[service.pageId], service, 'service', `Writer 1 page ${service.pageId}`)); enforceReviewChoices('writer1', pages, services, state); state.outputs.servicePages = pages; if (execution.receipt) state.writerReceipts[STAGES.WRITER_1] = execution.receipt as any; state.stages[STAGES.WRITER_1] = { status: 'complete', ...(execution.receipt ? { receipt: execution.receipt } : {}) }; markEvent(state, { type: 'stage-complete', stage: STAGES.WRITER_1, ...(execution.threadUrl ? { threadUrl: execution.threadUrl } : {}) }, clock); state.stage = STAGES.QA_1; await save(); }
    else if (state.stage === STAGES.QA_1) { const context = contextFor(state, 'writer1', await loadCanonicalGuides('writer1', provider)); const checked = await qualityGate({ stage: 'writer1', output: state.outputs.servicePages, context, qa, maxRepairs: input.maxRepairs, builtinCheck: (output: any) => builtInQa(state!, 'writer1', output) } as any); state.outputs.servicePages = normalizeExpectedPages({ servicePages: checked.output }, services, ['servicePages', 'pages'], 'Writer 1 repair'); services.forEach((service) => assertPageIdentity(state.outputs.servicePages[service.pageId], service, 'service', `Writer 1 repaired page ${service.pageId}`)); enforceReviewChoices('writer1', state.outputs.servicePages, services, state); state.stages[STAGES.QA_1] = { status: 'complete', checks: checked.checks, repairs: checked.repairs }; state.stage = STAGES.WRITER_2; markEvent(state, { type: 'qa-pass', stage: STAGES.QA_1 }, clock); await save(); }
    else if (state.stage === STAGES.WRITER_2) { const context = contextFor(state, 'writer2', await loadCanonicalGuides('writer2', provider)); const destinations = state.prescription?.destinations || {}; const approvedSupportingPages = [{ pageId: 'homepage', ...(destinations.homepage || {}) }, { pageId: 'contact', ...(destinations.contact || {}) }, { pageId: 'header', routes: destinations.header || [] }, { pageId: 'footer', routes: destinations.footer || [] }]; const payload = { ...context, approvedSupportingPages, idempotencyKey: `${state.runId}:writer2:write` }; state.stages[STAGES.WRITER_2] = { status: 'running' }; await save(); const execution = await executeWriter(input, production, 'writer2', payload, production ? undefined : requireAdapter(input.writers, ['writer2', 'supportingPages', 'siteChrome'], 'writer2')); const pages = normalizeExpectedPages(execution.output, approvedSupportingPages, ['pages', 'supportingPages', 'sitePages'], 'Writer 2'); assertPageIdentity(pages.homepage, destinations.homepage, 'homepage', 'Writer 2 homepage'); assertPageIdentity(pages.contact, destinations.contact, 'contact', 'Writer 2 contact'); assertApprovedChrome(pages, destinations); state.outputs = { ...state.outputs, ...pages }; if (execution.receipt) state.writerReceipts[STAGES.WRITER_2] = execution.receipt as any; state.stages[STAGES.WRITER_2] = { status: 'complete', ...(execution.receipt ? { receipt: execution.receipt } : {}) }; state.stage = STAGES.QA_2; markEvent(state, { type: 'stage-complete', stage: STAGES.WRITER_2, ...(execution.threadUrl ? { threadUrl: execution.threadUrl } : {}) }, clock); await save(); }
    else if (state.stage === STAGES.QA_2) { const context = contextFor(state, 'writer2', await loadCanonicalGuides('writer2', provider)); const checked = await qualityGate({ stage: 'writer2', output: { homepage: state.outputs.homepage, contact: state.outputs.contact, header: state.outputs.header, footer: state.outputs.footer }, context, qa, maxRepairs: input.maxRepairs, builtinCheck: (output: any) => builtInQa(state!, 'writer2', output) } as any); const pages = normalizeExpectedPages({ pages: checked.output }, ['homepage', 'contact', 'header', 'footer'], ['pages', 'supportingPages', 'sitePages'], 'Writer 2 repair'); const destinations = state.prescription?.destinations || {}; assertPageIdentity(pages.homepage, destinations.homepage, 'homepage', 'Writer 2 repaired homepage'); assertPageIdentity(pages.contact, destinations.contact, 'contact', 'Writer 2 repaired contact'); assertApprovedChrome(pages, destinations); state.outputs = { ...state.outputs, ...pages }; state.stages[STAGES.QA_2] = { status: 'complete', checks: checked.checks, repairs: checked.repairs }; state.stage = STAGES.WRITER_3; markEvent(state, { type: 'qa-pass', stage: STAGES.QA_2 }, clock); await save(); }
    else if (state.stage === STAGES.WRITER_3) { const context = contextFor(state, 'writer3', await loadCanonicalGuides('writer3', provider)); const payload = { ...context, finishedBusinessCopy: context.finishedBusinessCopy, idempotencyKey: `${state.runId}:writer3:write` }; state.stages[STAGES.WRITER_3] = { status: 'running' }; await save(); const execution = await executeWriter(input, production, 'writer3', payload, production ? undefined : requireAdapter(input.writers, ['writer3', 'strategyOverview', 'strategy'], 'writer3')); const pages = normalizeExpectedPages(execution.output, ['strategyOverview'], ['strategyOverview', 'pages'], 'Writer 3'); assertStrategyIdentity(pages.strategyOverview); state.outputs.strategyOverview = pages.strategyOverview; if (execution.receipt) state.writerReceipts[STAGES.WRITER_3] = execution.receipt as any; state.stages[STAGES.WRITER_3] = { status: 'complete', ...(execution.receipt ? { receipt: execution.receipt } : {}) }; state.stage = STAGES.QA_3; markEvent(state, { type: 'stage-complete', stage: STAGES.WRITER_3, ...(execution.threadUrl ? { threadUrl: execution.threadUrl } : {}) }, clock); await save(); }
    else if (state.stage === STAGES.QA_3) { const context = contextFor(state, 'writer3', await loadCanonicalGuides('writer3', provider)); const checked = await qualityGate({ stage: 'writer3', output: { strategyOverview: state.outputs.strategyOverview }, context, qa, maxRepairs: input.maxRepairs, builtinCheck: (output: any) => builtInQa(state!, 'writer3', output) } as any); const pages = normalizeExpectedPages({ strategyOverview: checked.output.strategyOverview || checked.output }, ['strategyOverview'], ['strategyOverview', 'pages'], 'Writer 3 repair'); assertStrategyIdentity(pages.strategyOverview); state.outputs.strategyOverview = pages.strategyOverview; state.stages[STAGES.QA_3] = { status: 'complete', checks: checked.checks, repairs: checked.repairs }; state.stage = STAGES.WHOLE_SITE_QA; markEvent(state, { type: 'qa-pass', stage: STAGES.QA_3 }, clock); await save(); }
    else if (state.stage === STAGES.WHOLE_SITE_QA) {
      const assessor = input.wholeSiteAssessor || input.wholeSiteQa;
      if (!assessor) throw new PipelineError('WHOLE_SITE_ASSESSOR_REQUIRED', 'A separately identified whole-site assessor adapter is required');
      const stageAdapters = [qa?.intelligent, qa?.deterministic, qa?.writer1?.intelligent, qa?.writer1?.deterministic, qa?.writer2?.intelligent, qa?.writer2?.deterministic, qa?.writer3?.intelligent, qa?.writer3?.deterministic, input.writers?.writer1, input.writers?.writer2, input.writers?.writer3];
      const assessorIdentity = adapterId(assessor);
      if (!assessorIdentity) throw new PipelineError('WHOLE_SITE_ASSESSOR_REQUIRED', 'Whole-site assessor must be a separately identified adapter object');
      if (stageAdapters.some((candidate) => candidate === assessor || (adapterId(candidate) && adapterId(candidate) === assessorIdentity))) throw new PipelineError('WHOLE_SITE_ASSESSOR_REQUIRED', 'Whole-site assessor identity must be independent from writers and stage QA');
      const context = contextFor(state, 'whole-site-qa', await loadCanonicalGuides('writer3', provider));
      const assessment = await runWholeSiteAssessment(state, input, context, assessor);
      const rejectedRoutes = Array.isArray(state.handoff?.serviceComparison) ? state.handoff.serviceComparison.filter((entry: any) => entry.status !== 'prescribed').flatMap((entry: any) => [entry.route, entry.pageUrl]).filter(Boolean) : [];
      state.outputs.humanGate2 = createHumanGate2Artifact({ websiteWords: assessment.site, reviewAnalysisFacts: state.handoff?.reviewAnalysisFacts, rejectedRoutes });
      state.stages[STAGES.WHOLE_SITE_QA] = { status: 'complete', assessment };
      state.stage = STAGES.AWAITING_GATE_2; state.status = 'awaiting-human-gate-2'; markEvent(state, { type: 'whole-site-qa-pass', stage: STAGES.WHOLE_SITE_QA }, clock); await save();
      return { state, complete: false };
    }
    else throw new PipelineError('PIPELINE_STAGE_INVALID', `Cannot resume unknown stage: ${state.stage}`);
  }
  return { state, complete: true };
}
export const runPipeline = runOneProspect;
