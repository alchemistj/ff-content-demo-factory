import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createHash } from 'node:crypto';

export type JsonObject = Record<string, any>;
export const PIPELINE_VERSION = 1;
export const STAGES = Object.freeze({
  WRITER_1: 'writer1',
  QA_1: 'qa1',
  WRITER_2: 'writer2',
  QA_2: 'qa2',
  WRITER_3: 'writer3',
  QA_3: 'qa3',
  WHOLE_SITE_QA: 'whole-site-qa',
  AWAITING_GATE_2: 'awaiting-human-gate-2',
  COMPLETE: 'complete',
} as const);
export type PipelineStage = typeof STAGES[keyof typeof STAGES];

export interface PipelineState {
  version: number;
  prospectId: string;
  status: 'active' | 'awaiting-human-gate-2';
  stage: PipelineStage;
  createdAt: string;
  updatedAt: string;
  prospect: JsonObject;
  prescription: JsonObject | null;
  evidence: JsonObject | null;
  reviewInventory: any;
  reviewInventoryFingerprint: string;
  outputs: JsonObject;
  stages: Record<string, JsonObject>;
  reviewDecisions: JsonObject[];
  events: JsonObject[];
  runId: string;
}

export interface StateStore {
  load?: () => PipelineState | null | Promise<PipelineState | null>;
  get?: () => PipelineState | null | Promise<PipelineState | null>;
  save?: (state: PipelineState) => unknown | Promise<unknown>;
  set?: (state: PipelineState) => unknown | Promise<unknown>;
}

export function clone<T>(value: T): T {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value));
}

function fingerprint(value: unknown): string { return createHash('sha256').update(JSON.stringify(value ?? null)).digest('hex'); }

export function createInitialState(input: { prospectId?: string; prospect?: JsonObject; prescription?: JsonObject | null; evidence?: JsonObject | null; reviewInventory?: any; now?: Date | string | number } = {}): PipelineState {
  const suppliedProspectId = input.prospectId || input.prospect?.id;
  if (!suppliedProspectId) {
    throw new Error('A prospectId (or prospect.id) is required');
  }
  const prospectId = String(suppliedProspectId);
  const now = input.now instanceof Date ? input.now.toISOString() : new Date(input.now || Date.now()).toISOString();
  return {
    version: PIPELINE_VERSION,
    runId: `run-${prospectId}`,
    prospectId,
    status: 'active',
    stage: STAGES.WRITER_1,
    createdAt: now,
    updatedAt: now,
    prospect: clone(input.prospect || { id: prospectId }),
    prescription: clone(input.prescription || null),
    evidence: clone(input.evidence || null),
    // Deliberately retain the complete packet.  No stage receives a summary
    // or a truncated copy of this inventory.
    reviewInventory: clone(input.reviewInventory || { reviews: [] }),
    reviewInventoryFingerprint: fingerprint(input.reviewInventory || { reviews: [] }),
    outputs: {},
    stages: {
      [STAGES.WRITER_1]: { status: 'pending' },
      [STAGES.QA_1]: { status: 'pending' },
      [STAGES.WRITER_2]: { status: 'pending' },
      [STAGES.QA_2]: { status: 'pending' },
      [STAGES.WRITER_3]: { status: 'pending' },
      [STAGES.QA_3]: { status: 'pending' },
      [STAGES.WHOLE_SITE_QA]: { status: 'pending' },
    },
    reviewDecisions: [],
    events: [],
  };
}

export function validateState(state: PipelineState): PipelineState {
  if (!state || typeof state !== 'object') throw new TypeError('Persisted pipeline state must be an object');
  if (state.version !== PIPELINE_VERSION) throw new Error(`Unsupported pipeline state version: ${state.version}`);
  if (!state.prospectId) throw new Error('Persisted pipeline state has no prospectId');
  if (!Object.values(STAGES).includes(state.stage)) throw new Error(`Unknown persisted pipeline stage: ${state.stage}`);
  if (!Array.isArray(state.reviewInventory) || state.reviewInventory.length === 0) throw new Error('Persisted state lost the complete review inventory');
  for (const [index, review] of state.reviewInventory.entries()) {
    if (!review || typeof review !== 'object' || typeof review.id !== 'string' || typeof review.reviewer !== 'string' || typeof review.exactText !== 'string' || !Array.isArray(review.pageSuitability)) throw new Error(`Persisted review inventory item ${index} is structurally invalid`);
  }
  if (!state.reviewInventoryFingerprint || state.reviewInventoryFingerprint !== fingerprint(state.reviewInventory)) throw new Error('Persisted state review inventory fingerprint does not match its authoritative packet');
  return state;
}

export function createMemoryStateStore(initialState?: PipelineState): StateStore & { get: () => Promise<PipelineState | null> } {
  let current = initialState ? clone(initialState) : null;
  return {
    async load() { return clone(current); },
    async save(next) { current = clone(validateState(next)); return clone(current); },
    async get() { return clone(current); },
  };
}

export function createJsonStateStore(filePath: string): StateStore {
  if (!filePath || typeof filePath !== 'string') throw new TypeError('A state file path is required');
  const target = path.resolve(filePath);
  return {
    async load() {
      try {
        return JSON.parse(await fs.readFile(target, 'utf8'));
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
        throw error;
      }
    },
    async save(next) {
      validateState(next);
      await fs.mkdir(path.dirname(target), { recursive: true });
      const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
      await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
      await fs.rename(temporary, target);
      return next;
    },
  };
}

export async function readState(store?: StateStore | (() => PipelineState | null | Promise<PipelineState | null>)): Promise<PipelineState | null> {
  if (!store) return null;
  if (typeof store === 'function') return store();
  if (typeof store.load === 'function') return store.load();
  if (typeof store.get === 'function') return store.get();
  throw new TypeError('stateStore must expose load/get');
}

export async function writeState(store: StateStore | undefined, state: PipelineState): Promise<unknown> {
  validateState(state);
  if (!store) return state;
  if (typeof store.save === 'function') return store.save(state);
  if (typeof store.set === 'function') return store.set(state);
  throw new TypeError('stateStore must expose save/set');
}
