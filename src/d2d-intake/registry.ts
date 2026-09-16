import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  cloneState,
  createMemoryStateStore,
  readState,
  validateWorkflowState,
  type StateStore,
  type WorkflowState,
} from "../workflow/state.js";
import type { D2dBusinessReceipt } from "./types.js";

export interface D2dIntakeRegistry {
  getReceipt(correlationId: string): Promise<D2dBusinessReceipt | null>;
  getReceiptByBusiness(d2dBusinessId: string): Promise<D2dBusinessReceipt | null>;
  getReceiptByRunId(factoryRunId: string): Promise<D2dBusinessReceipt | null>;
  saveReceipt(receipt: D2dBusinessReceipt): Promise<void>;
  getStateStore(runId: string): Promise<StateStore>;
}

export function createMemoryIntakeRegistry(): D2dIntakeRegistry {
  const receiptsByKey = new Map<string, D2dBusinessReceipt>();
  const receiptsByBusiness = new Map<string, D2dBusinessReceipt>();
  const receiptsByRun = new Map<string, D2dBusinessReceipt>();
  const stores = new Map<string, StateStore>();

  return {
    async getReceipt(correlationId) {
      return receiptsByKey.get(correlationId) ?? null;
    },
    async getReceiptByBusiness(d2dBusinessId) {
      return receiptsByBusiness.get(d2dBusinessId) ?? null;
    },
    async getReceiptByRunId(factoryRunId) {
      return receiptsByRun.get(factoryRunId) ?? null;
    },
    async saveReceipt(receipt) {
      receiptsByKey.set(receipt.correlationId, cloneState(receipt));
      const existing = receiptsByBusiness.get(receipt.d2dBusinessId);
      if (!existing || shouldReplaceReceipt(existing, receipt)) {
        receiptsByBusiness.set(receipt.d2dBusinessId, cloneState(receipt));
      }
      if (receipt.factoryRunId) {
        receiptsByRun.set(receipt.factoryRunId, cloneState(receipt));
      }
    },
    async getStateStore(runId) {
      const existing = stores.get(runId);
      if (existing) return existing;
      const created = createMemoryStateStore();
      stores.set(runId, created);
      return created;
    },
  };
}

export function createFileIntakeRegistry(rootDir: string): D2dIntakeRegistry {
  mkdirSync(join(rootDir, "runs"), { recursive: true });
  mkdirSync(join(rootDir, "receipts"), { recursive: true });

  function receiptPath(correlationId: string): string {
    return join(rootDir, "receipts", `${encodeURIComponent(correlationId)}.json`);
  }
  function businessPath(d2dBusinessId: string): string {
    return join(rootDir, "businesses", `${encodeURIComponent(d2dBusinessId)}.json`);
  }
  function runPointerPath(factoryRunId: string): string {
    return join(rootDir, "runs", `${encodeURIComponent(factoryRunId)}.receipt.json`);
  }
  function statePath(runId: string): string {
    return join(rootDir, "runs", `${encodeURIComponent(runId)}.state.json`);
  }

  function readJson<T>(path: string): T | null {
    try {
      return JSON.parse(readFileSync(path, "utf8")) as T;
    } catch {
      return null;
    }
  }

  function writeJson(path: string, value: unknown): void {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
  }

  return {
    async getReceipt(correlationId) {
      return readJson<D2dBusinessReceipt>(receiptPath(correlationId));
    },
    async getReceiptByBusiness(d2dBusinessId) {
      return readJson<D2dBusinessReceipt>(businessPath(d2dBusinessId));
    },
    async getReceiptByRunId(factoryRunId) {
      return readJson<D2dBusinessReceipt>(runPointerPath(factoryRunId));
    },
    async saveReceipt(receipt) {
      writeJson(receiptPath(receipt.correlationId), receipt);
      const existing = readJson<D2dBusinessReceipt>(businessPath(receipt.d2dBusinessId));
      if (!existing || shouldReplaceReceipt(existing, receipt)) {
        writeJson(businessPath(receipt.d2dBusinessId), receipt);
      }
      if (receipt.factoryRunId) {
        writeJson(runPointerPath(receipt.factoryRunId), receipt);
      }
    },
    async getStateStore(runId) {
      const path = statePath(runId);
      return {
        async load() {
          const raw = readJson<WorkflowState>(path);
          return raw ? cloneState(validateWorkflowState(raw)) : null;
        },
        async get() {
          const raw = readJson<WorkflowState>(path);
          return raw ? cloneState(validateWorkflowState(raw)) : null;
        },
        async save(state) {
          writeJson(path, validateWorkflowState(state));
          return cloneState(state);
        },
        async set(state) {
          writeJson(path, validateWorkflowState(state));
          return cloneState(state);
        },
      };
    },
  };
}

export async function readRunState(registry: D2dIntakeRegistry, runId: string): Promise<WorkflowState | null> {
  return readState(await registry.getStateStore(runId));
}

function shouldReplaceReceipt(existing: D2dBusinessReceipt, next: D2dBusinessReceipt): boolean {
  if (!existing.factoryRunId && next.factoryRunId) return true;
  if (existing.status === "invalid") return true;
  if (existing.status === "retryable" && next.status !== "invalid") return true;
  if (next.status === "received" || next.status === "duplicate") return true;
  return false;
}
