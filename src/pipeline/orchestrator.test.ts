import assert from 'node:assert/strict';
import test from 'node:test';
import { richFixture } from '../../fixtures/representative.js';
import { INTELLIGENT_DIMENSIONS } from '../qa/intelligent.js';
import { runOneProspect, type PipelineInput } from './orchestrator.js';
import { createInitialState, validateState } from './state.js';

const reviewById = new Map(richFixture.prospect.reviewInventory.map((review) => [review.id, review]));

function page(label: string, identity: { id: string; url: string; pageType: string; keyword: string }, reviews: Array<{ id: string; role: 'lead' | 'support' }>) {
  const placements = reviews.map(({ id, role }, index) => {
    const review = reviewById.get(id)!;
    return {
      reviewId: id,
      quote: review.exactText,
      attribution: review.reviewer,
      claimId: `claim-${index + 1}`,
      wordOffset: 30 + (index * 40),
      proofRole: role,
    };
  });
  return {
    url: identity.url,
    pageId: identity.id,
    prescriptionId: identity.id,
    pageType: identity.pageType,
    primaryKeyword: identity.keyword,
    body: `${label} synthetic regression copy.`,
    seoTitle: label,
    metaDescription: `${label} meta description.`,
    h1: label,
    claims: placements.map((placement, index) => ({ id: placement.claimId, text: `${label} claim ${index + 1}`, wordOffset: 25 + (index * 40) })),
    reviewPlacements: placements,
  };
}

const cleanQa = () => ({ pass: true, findings: [] });
const cleanThinking = () => ({ independent: true as const, dimensionsReviewed: [...INTELLIGENT_DIMENSIONS], findings: [] });

function input(overrides: Partial<PipelineInput> = {}): PipelineInput {
  const contexts: { writer1: any[]; writer2: any[]; writer3: any[] } = { writer1: [], writer2: [], writer3: [] };
  const handoff = structuredClone(richFixture);
  const base: PipelineInput = {
    handoff,
    writers: {
      writer1: (context: any) => { contexts.writer1.push(context); return { servicePages: { 'service-rich-repair': page('Repair', { id: 'service-rich-repair', url: '/garage-door-repair', pageType: 'service', keyword: 'garage door repair' }, [{ id: 'review-rich-001', role: 'lead' }, { id: 'review-rich-004', role: 'support' }, { id: 'review-rich-005', role: 'support' }]), 'service-rich-replacement': page('Replacement', { id: 'service-rich-replacement', url: '/garage-door-replacement', pageType: 'service', keyword: 'garage door replacement' }, [{ id: 'review-rich-002', role: 'lead' }, { id: 'review-rich-004', role: 'support' }]) } }; },
      writer2: (context: any) => { contexts.writer2.push(context); return { pages: { homepage: page('Home', { id: 'page-rich-home', url: '/', pageType: 'homepage', keyword: 'garage door service' }, [{ id: 'review-rich-001', role: 'lead' }, { id: 'review-rich-002', role: 'support' }, { id: 'review-rich-004', role: 'support' }]), contact: page('Contact', { id: 'page-rich-contact', url: '/contact', pageType: 'contact', keyword: 'garage door service contact' }, [{ id: 'review-rich-001', role: 'lead' }, { id: 'review-rich-004', role: 'support' }]), header: { brand: 'Northline', navigation: [{ label: 'Home', href: '/' }, { label: 'Repair', href: '/garage-door-repair' }, { label: 'Replacement', href: '/garage-door-replacement' }, { label: 'Contact', href: '/contact' }] }, footer: { body: 'Northline footer.', links: [{ label: 'Home', href: '/' }, { label: 'Contact', href: '/contact' }] } } }; },
      writer3: (context: any) => { contexts.writer3.push(context); return { strategyOverview: { pageType: 'strategy-overview', body: 'S' } }; },
    },
    qa: { deterministic: cleanQa, intelligent: cleanThinking },
    wholeSiteAssessor: { id: 'independent-whole-site-qa', run: () => ({ independent: true, assessor: 'independent-whole-site-qa', dimensionsReviewed: [...INTELLIGENT_DIMENSIONS], findings: [] }) },
    guideProvider: { load: (source) => ({ content: source.id }) },
  };
  (base as any).contexts = contexts;
  return { ...base, ...overrides };
}

test('writers run strictly in order and every writer receives the complete review inventory', async () => {
  const config = input();
  const result = await runOneProspect(config);
  const contexts = (config as any).contexts as { writer1: any[]; writer2: any[]; writer3: any[] };
  assert.equal(result.complete, false);
  assert.equal(result.state.status, 'awaiting-human-gate-2');
  assert.equal(contexts.writer1[0].idempotencyKey, 'run-prospect-rich:writer1:write');
  assert.deepEqual(Object.keys(result.state.outputs).sort(), ['contact', 'footer', 'header', 'homepage', 'humanGate2', 'servicePages', 'strategyOverview'].sort());
  assert.equal(contexts.writer1[0].reviewInventory.length, 5);
  assert.equal(contexts.writer2[0].reviewInventory.length, 5);
  assert.equal(contexts.writer3[0].reviewInventory.length, 5);
  assert.equal(contexts.writer2[0].finishedServicePages, null);
  assert.deepEqual(contexts.writer2[0].approvedSupportingPages.map((page: any) => page.pageId), ['homepage', 'contact', 'header', 'footer']);
  assert.equal(contexts.writer3[0].finishedBusinessCopy.homepage.body, 'Home synthetic regression copy.');
});

test('Writer 3 QA repairs before an independent whole-site assessment', async () => {
  const config = input();
  let writer3Checks = 0;
  let assessed: any;
  config.writers!.writer3 = () => ({ strategyOverview: { pageType: 'strategy-overview', body: 'bad' } });
  config.qa = {
    deterministic: cleanQa,
    intelligent: cleanThinking,
    writer3: {
      deterministic: () => ({ pass: ++writer3Checks > 1, findings: writer3Checks > 1 ? [] : [{ code: 'strategy-drift', severity: 'hard-fail', message: 'Repair required.' }] }),
      intelligent: cleanThinking,
      repair: () => ({ strategyOverview: { pageType: 'strategy-overview', body: 'fixed' } }),
    },
  };
  config.wholeSiteAssessor = { id: 'repair-reviewer', run: (packet: any) => { assessed = packet.site.strategyOverview; return { independent: true, assessor: 'repair-reviewer', dimensionsReviewed: [...INTELLIGENT_DIMENSIONS], findings: [] }; } };
  const result = await runOneProspect(config);
  assert.equal(result.state.status, 'awaiting-human-gate-2');
  assert.equal(assessed.body, 'fixed');
  assert.equal(result.state.stages.qa3?.repairs, 1);
});

test('a changed preferred lead review requires and records a rationale', async () => {
  const config = input();
  (config.writers as any).writer1 = () => ({ servicePages: { 'service-rich-repair': { ...page('Repair', { id: 'service-rich-repair', url: '/garage-door-repair', pageType: 'service', keyword: 'garage door repair' }, [{ id: 'review-rich-004', role: 'lead' }, { id: 'review-rich-001', role: 'support' }, { id: 'review-rich-005', role: 'support' }]), leadReviewId: 'review-rich-004', leadReviewChangeReason: 'It directly supports the final angle.' }, 'service-rich-replacement': page('Replacement', { id: 'service-rich-replacement', url: '/garage-door-replacement', pageType: 'service', keyword: 'garage door replacement' }, [{ id: 'review-rich-002', role: 'lead' }, { id: 'review-rich-004', role: 'support' }]) } });
  const result = await runOneProspect(config);
  assert.deepEqual(result.state.reviewDecisions[0], { stage: 'writer1', pageId: 'service-rich-repair', preferredReviewId: 'review-rich-001', selectedReviewId: 'review-rich-004', changed: true, rationale: 'It directly supports the final angle.' });
});

test('writer output cannot hide a wrong route behind prescribed metadata', async () => {
  const config = input();
  const original = config.writers!.writer1 as (context: any) => any;
  config.writers!.writer1 = (context: any) => {
    const result = original(context);
    result.servicePages['service-rich-repair'].url = '/wrong-route';
    return result;
  };
  await assert.rejects(() => runOneProspect(config), (error: any) => error?.code === 'WRITER_PAGE_IDENTITY_MISMATCH');
});

test('adapter contexts are deeply immutable', async () => {
  const config = input();
  const original = config.writers!.writer1 as (context: any) => any;
  config.writers!.writer1 = (context: any) => {
    assert.throws(() => context.reviewInventory.pop(), TypeError);
    return original(context);
  };
  const result = await runOneProspect(config);
  assert.equal(result.state.reviewInventory.length, richFixture.prospect.reviewInventory.length);
});

test('bare boolean stage QA and unidentified whole-site assessors fail closed', async () => {
  const booleanQa = input({ qa: { deterministic: () => true, intelligent: cleanThinking } });
  await assert.rejects(() => runOneProspect(booleanQa), (error: any) => error?.code === 'PIPELINE_QA_INVALID');
  const anonymousAssessor = input({ wholeSiteAssessor: () => ({ independent: true, dimensionsReviewed: [...INTELLIGENT_DIMENSIONS], findings: [] }) });
  await assert.rejects(() => runOneProspect(anonymousAssessor), (error: any) => error?.code === 'WHOLE_SITE_ASSESSOR_REQUIRED');
});

test('incomplete thinking QA and mutated persisted review inventories fail closed', async () => {
  const incompleteThinking = input({ qa: { deterministic: cleanQa, intelligent: () => ({ independent: true, dimensionsReviewed: ['specificity'], findings: [] }) } });
  await assert.rejects(() => runOneProspect(incompleteThinking), (error: any) => error?.code === 'PIPELINE_QA_INVALID');
  const state = createInitialState({ prospectId: richFixture.prospect.id, reviewInventory: richFixture.prospect.reviewInventory });
  state.reviewInventory.pop();
  assert.throws(() => validateState(state), /fingerprint/);
});
