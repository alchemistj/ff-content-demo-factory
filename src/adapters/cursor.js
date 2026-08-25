'use strict';

const crypto = require('node:crypto');

const FACTORY_MODEL_ALIAS = 'cursor-grok-4.6-high';
const ACTUAL_MODEL_ID = 'grok-4.6';
const RESEARCH_KINDS = new Set(['website-audit', 'review-judgment', 'page-prescription']);

function required(value, name) {
  if (!value) throw new TypeError(`${name} is required`);
  return value;
}

function redact(value, secret) {
  if (typeof value === 'string') return secret ? value.split(secret).join('[redacted]') : value;
  if (Array.isArray(value)) return value.map((item) => redact(item, secret));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redact(item, secret)]));
  return value;
}

function isTerminalCursorRunError(error) {
  const message = String(error?.message || error || '');
  return /Cursor research run ended (error|failed|aborted|timed[- ]?out)/i.test(message)
    || /Cursor returned (invalid JSON|empty output)/i.test(message)
    || /Cursor result kind mismatch/i.test(message)
    || /result (must be an object|contract invalid)/i.test(message);
}

function parseJsonResult(output) {
  const text = String(output ?? '').trim();
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenced ? fenced[1].trim() : text;
  if (!candidate) throw new Error('Cursor returned empty output');
  try { return JSON.parse(candidate); } catch { throw new Error('Cursor returned invalid JSON'); }
}

function validateResult(kind, result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error(`Cursor ${kind} result must be an object`);
  if (result.kind !== kind) throw new Error(`Cursor result kind mismatch for ${kind}`);
  if (kind === 'website-audit' && (typeof result.website !== 'string' || !result.website.trim() || !Array.isArray(result.evidence) || !Array.isArray(result.images))) throw new Error('Website audit result contract invalid');
  if (kind === 'review-judgment' && (!result.reviewId || !result.decision || result.authoritative !== true)) throw new Error('Review judgment result contract invalid');
  if (kind === 'page-prescription' && (!Array.isArray(result.pages) || !result.comparison || typeof result.comparison !== 'object' || Array.isArray(result.comparison))) throw new Error('Page prescription result contract invalid');
  return result;
}

function modelSelectionFromCatalog(catalog, alias = FACTORY_MODEL_ALIAS) {
  const models = Array.isArray(catalog) ? catalog : catalog?.models || catalog?.data?.models || catalog?.result?.models || catalog?.data || catalog?.result;
  if (!Array.isArray(models)) throw new Error('Cursor model catalog unavailable');
  const model = models.find((entry) => entry.id === ACTUAL_MODEL_ID);
  const contradictoryAlias = models.find((entry) => entry.id === alias || (entry.aliases || []).includes(alias));
  if (!model || (contradictoryAlias && contradictoryAlias.id !== ACTUAL_MODEL_ID)) throw new Error('Cursor Grok 4.6 catalog proof missing or contradictory');
  const parameters = Array.isArray(model.parameters) ? model.parameters : Array.isArray(model.params) ? model.params : [];
  const fast = parameters.find((parameter) => parameter.id === 'fast');
  const variantFastFalse = (model.variants || []).some((variant) => (variant.params || []).some((param) => param.id === 'fast' && String(param.value) === 'false'));
  const fastFalse = fast ? fast.values?.some((value) => String(value.value) === 'false') || variantFastFalse : model.capabilities?.fast === false || model.fast === false || variantFastFalse;
  const effort = parameters.find((parameter) => ['effort', 'reasoning_effort'].includes(parameter.id));
  const high = effort ? effort.values?.some((value) => String(value.value).toLowerCase() === 'high') : false;
  const capabilityHigh = !effort && (
    (Array.isArray(model.capabilities?.reasoningEffort) && model.capabilities.reasoningEffort.map(String).map((value) => value.toLowerCase()).includes('high'))
    || String(model.capabilities?.reasoning || '').toLowerCase() === 'high'
  );
  const highProof = high || capabilityHigh;
  const highVariant = (model.variants || []).find((variant) => /high/i.test(variant.displayName || '') && (variant.params || []).some((param) => String(param.value).toLowerCase() === 'high'));
  if ((!fast && !(model.capabilities?.fast === false || model.fast === false || variantFastFalse)) || !fastFalse || (!highProof && !highVariant)) throw new Error('Cursor Grok 4.6 High/Fast-off catalog proof missing');
  const params = fast || variantFastFalse ? [{ id: 'fast', value: 'false' }] : [];
  if (high) params.push({ id: effort.id, value: 'high' });
  else if (highVariant) params.push(...highVariant.params.filter((param) => String(param.value).toLowerCase() === 'high'));
  return { id: ACTUAL_MODEL_ID, params, alias, catalogProof: { modelId: model.id, alias, fastFalse: true, high: true } };
}

function createMemoryReceiptStore() {
  const map = new Map();
  return { get: (key) => map.get(key), put: (key, value) => map.set(key, value), values: () => [...map.values()] };
}

function researchPrompt(kind, input) {
  const boundary = [
    'You are a read-only research worker for the FF Content Demo Factory.',
    'Do not write, edit, create, delete, or commit repository files or code.',
    'Do not open branches or pull requests, deploy, build a client, generate copy, or advance any later stage.',
    'Do not scrape Google, Google Maps, or GBP. Apify is the only source for Google listing/review data.',
    'Return exactly one JSON object and no surrounding commentary or markdown outside an optional JSON fence.',
  ].join('\n');
  const instructions = {
    'website-audit': 'Inspect only the business-owned website. Return website, evidence, service-page/copy evidence, NAP/contact facts, graphicsInspection with findings, owned service/marketing graphics/flyers evidence, and public image URLs; every item needs source URL/provenance. Do not treat Google listing data as website evidence.',
    'review-judgment': 'Judge each supplied written review authoritatively. Return reviewId, decision, authoritative, directCompletedService, serviceEvidence with exact source-text excerpts, availabilityEvidence, negative/trap evidence, and provenance/model receipt fields. Distinguish direct completed work from supporting/negative evidence, and never turn anecdotal timing into a response guarantee.',
    'page-prescription': 'Compare every candidate service in a value hierarchy, including passed-over services and reasons. Return differentiated pages with URLs, keywords, title/H1 directions, evidence/recommended first reviews, claims, overlap boundaries, and traps. Return comparison and preserve negative reviews. Do not write page copy or a client build.',
  }[kind];
  return `${boundary}\nResearch job: ${kind}\nJob boundary: ${instructions}\nInput:\n${JSON.stringify(input)}\nContract kind: ${kind}`;
}

function createCursorAdapter({ apiKey, sdk, modelAlias = process.env.CURSOR_MODEL || FACTORY_MODEL_ALIAS, receiptStore = createMemoryReceiptStore(), clock = () => new Date().toISOString(), workspace = process.cwd() }) {
  required(apiKey, 'CURSOR_API_KEY');
  if (!sdk) {
    try { sdk = require('@cursor/sdk'); } catch { throw new Error('@cursor/sdk is required for production Cursor research'); }
  }
  if (modelAlias !== FACTORY_MODEL_ALIAS) throw new Error(`Unsupported Cursor factory model alias: ${modelAlias}`);
  const Cursor = sdk.Cursor;
  const Agent = sdk.Agent;
  if (!Cursor?.models?.list || !Agent?.create) throw new TypeError('Injected @cursor/sdk must expose Cursor.models.list and Agent.create');
  let selectionPromise;

  async function resolveModel() {
    if (!selectionPromise) selectionPromise = Cursor.models.list({ apiKey }).then((catalog) => modelSelectionFromCatalog(catalog, modelAlias));
    return selectionPromise;
  }

  async function resumeAgent(prior) {
    if (!prior?.agentId || typeof Agent.resume !== 'function') throw new Error('Cursor in-flight receipt cannot be resumed: Agent.resume is required');
    return Agent.resume(prior.agentId, { apiKey });
  }

  async function resumedRun(prior) {
    if (!prior?.runId || typeof Agent.getRun !== 'function') throw new Error('Cursor in-flight receipt cannot be resumed: Agent.getRun is required');
    const run = await Agent.getRun(prior.runId, { runtime: 'cloud', agentId: prior.agentId });
    if (!run || typeof run.wait !== 'function') throw new Error('Cursor resumed run handle is invalid');
    return run;
  }

  async function disposeAgent(agent) {
    if (!agent) return;
    if (typeof agent[Symbol.asyncDispose] === 'function') await agent[Symbol.asyncDispose]();
    else if (typeof agent.dispose === 'function') await agent.dispose();
  }

  async function runResearch({ kind, jobId, input }) {
    if (!RESEARCH_KINDS.has(kind)) throw new Error(`Unsupported research kind: ${kind}`);
    required(jobId, 'jobId');
    const key = `cursor:${jobId}`;
    const prior = await receiptStore.get?.(key);
    if (prior?.status === 'completed') return prior.result;
    const prompt = researchPrompt(kind, input);
    const canResume = prior?.status === 'running' && prior.agentId && !isTerminalCursorRunError(prior.lastError);
    if (canResume) {
      let agent;
      let receipt = { ...prior };
      try {
        agent = await resumeAgent(prior);
        const run = prior.runId ? await resumedRun(prior) : await agent.send(prompt);
        if (!prior.runId) {
          receipt = { ...receipt, runId: run.id || run.runId || null, requestId: run.requestId || null };
          await receiptStore.put?.(key, receipt);
          if (!receipt.runId) throw new Error('Cursor resumed send receipt missing runId');
        }
        const result = await run.wait();
        if (result?.status && result.status !== 'finished') throw new Error(`Cursor research run ended ${result.status}`);
        const raw = result?.text ?? result?.output ?? result?.result ?? result;
        const parsed = validateResult(kind, parseJsonResult(raw));
        const safeResult = redact(parsed, apiKey);
        const completed = { ...receipt, status: 'completed', completedAt: clock(), result: safeResult };
        await receiptStore.put?.(key, completed);
        return safeResult;
      } catch (error) {
        const message = redact(normalizeError(error), apiKey);
        await receiptStore.put?.(key, isTerminalCursorRunError(error)
          ? { ...receipt, status: 'failed', failedAt: clock(), error: message }
          : { ...receipt, status: 'running', resumedAt: clock(), lastError: message });
        throw error;
      } finally {
        await disposeAgent(agent);
      }
    }
    const model = await resolveModel();
    let receipt = {
      provider: 'cursor-sdk', jobId, kind, status: 'running',
      requestedAlias: modelAlias, resolvedModel: model.id, modelParams: model.params,
      promptHash: crypto.createHash('sha256').update(prompt).digest('hex'), startedAt: clock(),
    };
    await receiptStore.put?.(key, receipt);
    let agent;
    try {
      // An empty cloud workspace prevents this research worker from receiving
      // a repository. The prompt separately forbids all file/code mutations.
      agent = await Agent.create({ apiKey, model: { id: model.id, params: model.params }, cloud: { repos: [] } });
      receipt = { ...receipt, agentId: agent.agentId || agent.id || null };
      await receiptStore.put?.(key, receipt);
      if (!receipt.agentId) throw new Error('Cursor Agent.create receipt missing agentId');
      const run = await agent.send(prompt);
      receipt = { ...receipt, runId: run.id || run.runId || null, requestId: run.requestId || null };
      await receiptStore.put?.(key, receipt);
      if (!receipt.runId) throw new Error('Cursor send receipt missing runId');
      const result = await run.wait();
      if (result?.status && result.status !== 'finished') throw new Error(`Cursor research run ended ${result.status}`);
      const raw = result?.text ?? result?.output ?? result?.result ?? result;
      const parsed = validateResult(kind, parseJsonResult(raw));
      const safeResult = redact(parsed, apiKey);
      const completed = { ...receipt, status: 'completed', agentId: receipt.agentId || result?.agentId || null, runId: receipt.runId || result?.runId || null, requestId: receipt.requestId || result?.requestId || null, completedAt: clock(), result: safeResult };
      await receiptStore.put?.(key, completed);
      return safeResult;
    } catch (error) {
      // Keep a receipt with a run id resumable after a process/network
      // interruption. This is what prevents a retry from sending a second
      // paid prompt. Runs that failed before `send` may be retried normally.
      const message = redact(normalizeError(error), apiKey);
      const interrupted = receipt.runId && !isTerminalCursorRunError(error) ? {
        ...receipt, status: 'running', interruptedAt: clock(), lastError: message,
      } : { ...receipt, status: 'failed', failedAt: clock(), error: message };
      await receiptStore.put?.(key, interrupted);
      throw error;
    } finally {
      await disposeAgent(agent);
    }
  }

  async function runResearchRecord(params) {
    const result = await runResearch(params);
    return { result, receipt: await receiptStore.get?.(`cursor:${params.jobId}`) };
  }

  async function getReceipt(jobId) {
    return receiptStore.get?.(`cursor:${jobId}`);
  }

  return { resolveModel, runResearch, runResearchRecord, getReceipt, researchPrompt, receiptStore };
}

function normalizeError(error) {
  return error instanceof Error ? error.message : String(error);
}

module.exports = {
  FACTORY_MODEL_ALIAS, ACTUAL_MODEL_ID, createCursorAdapter, createMemoryReceiptStore,
  modelSelectionFromCatalog, parseJsonResult, validateResult, researchPrompt,
  isTerminalCursorRunError,
};
