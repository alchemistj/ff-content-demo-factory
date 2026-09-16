import {
  cloneState,
  validateWorkflowState,
  type StateStore,
  type WorkflowState,
} from "../workflow/state.js";
import { shouldReplaceReceipt, type D2dIntakeRegistry } from "./registry.js";
import type { D2dBusinessReceipt } from "./types.js";

/** Shared durable tables so separate registry instances see the same Postgres-like state. */
export interface DurableIntakeTables {
  readonly receipts: Map<string, D2dBusinessReceipt>;
  readonly businesses: Map<string, D2dBusinessReceipt>;
  readonly prospects: Map<string, D2dBusinessReceipt>;
  readonly runs: Map<string, D2dBusinessReceipt>;
  readonly workflow: Map<string, WorkflowState>;
}

export interface DurableIntakeStore {
  getReceipt(correlationId: string): Promise<D2dBusinessReceipt | null>;
  getReceiptByBusiness(sourceBusinessId: string): Promise<D2dBusinessReceipt | null>;
  getReceiptByProspect(d2dProspectId: string): Promise<D2dBusinessReceipt | null>;
  getReceiptByRunId(factoryRunId: string): Promise<D2dBusinessReceipt | null>;
  putReceipt(receipt: D2dBusinessReceipt): Promise<void>;
  putBusinessPointer(sourceBusinessId: string, receipt: D2dBusinessReceipt): Promise<void>;
  putProspectPointer(d2dProspectId: string, receipt: D2dBusinessReceipt): Promise<void>;
  putRunPointer(factoryRunId: string, receipt: D2dBusinessReceipt): Promise<void>;
  getWorkflowState(runId: string): Promise<WorkflowState | null>;
  putWorkflowState(runId: string, state: WorkflowState): Promise<void>;
}

export function createMemoryDurableTables(): DurableIntakeTables {
  return {
    receipts: new Map(),
    businesses: new Map(),
    prospects: new Map(),
    runs: new Map(),
    workflow: new Map(),
  };
}

export function createMemoryDurableIntakeStore(
  tables: DurableIntakeTables = createMemoryDurableTables(),
): DurableIntakeStore {
  return {
    async getReceipt(correlationId) {
      const value = tables.receipts.get(correlationId);
      return value ? cloneState(value) : null;
    },
    async getReceiptByBusiness(sourceBusinessId) {
      const value = tables.businesses.get(sourceBusinessId);
      return value ? cloneState(value) : null;
    },
    async getReceiptByProspect(d2dProspectId) {
      const value = tables.prospects.get(d2dProspectId);
      return value ? cloneState(value) : null;
    },
    async getReceiptByRunId(factoryRunId) {
      const value = tables.runs.get(factoryRunId);
      return value ? cloneState(value) : null;
    },
    async putReceipt(receipt) {
      tables.receipts.set(receipt.correlationId, cloneState(receipt));
    },
    async putBusinessPointer(sourceBusinessId, receipt) {
      tables.businesses.set(sourceBusinessId, cloneState(receipt));
    },
    async putProspectPointer(d2dProspectId, receipt) {
      tables.prospects.set(d2dProspectId, cloneState(receipt));
    },
    async putRunPointer(factoryRunId, receipt) {
      tables.runs.set(factoryRunId, cloneState(receipt));
    },
    async getWorkflowState(runId) {
      const value = tables.workflow.get(runId);
      return value ? cloneState(value) : null;
    },
    async putWorkflowState(runId, state) {
      tables.workflow.set(runId, cloneState(validateWorkflowState(state)));
    },
  };
}

/** Registry that persists through DurableIntakeStore, including across fresh registry instances. */
export function createDurableIntakeRegistry(store: DurableIntakeStore): D2dIntakeRegistry {
  return {
    async getReceipt(correlationId) {
      return store.getReceipt(correlationId);
    },
    async getReceiptByBusiness(sourceBusinessId) {
      return store.getReceiptByBusiness(sourceBusinessId);
    },
    async getReceiptByProspect(d2dProspectId) {
      return store.getReceiptByProspect(d2dProspectId);
    },
    async getReceiptByRunId(factoryRunId) {
      return store.getReceiptByRunId(factoryRunId);
    },
    async saveReceipt(receipt) {
      await store.putReceipt(receipt);
      const existing = await store.getReceiptByBusiness(receipt.sourceBusinessId);
      if (!existing || shouldReplaceReceipt(existing, receipt)) {
        await store.putBusinessPointer(receipt.sourceBusinessId, receipt);
      }
      if (receipt.d2dProspectId) {
        await store.putProspectPointer(receipt.d2dProspectId, receipt);
      }
      if (receipt.factoryRunId) {
        await store.putRunPointer(receipt.factoryRunId, receipt);
      }
    },
    async getStateStore(runId) {
      return durableStateStore(store, runId);
    },
  };
}

function durableStateStore(store: DurableIntakeStore, runId: string): StateStore {
  return {
    async load() {
      const raw = await store.getWorkflowState(runId);
      return raw ? cloneState(validateWorkflowState(raw)) : null;
    },
    async get() {
      const raw = await store.getWorkflowState(runId);
      return raw ? cloneState(validateWorkflowState(raw)) : null;
    },
    async save(state) {
      const valid = validateWorkflowState(state);
      await store.putWorkflowState(runId, valid);
      return cloneState(valid);
    },
    async set(state) {
      const valid = validateWorkflowState(state);
      await store.putWorkflowState(runId, valid);
      return cloneState(valid);
    },
  };
}
