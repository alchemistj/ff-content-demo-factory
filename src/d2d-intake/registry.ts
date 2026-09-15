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
import type { D2dProspectReceipt } from "./types.js";

export interface D2dIntakeRegistry {
  getReceipt(correlationId: string): Promise<D2dProspectReceipt | null>;
  getReceiptByProspect(d2dProspectId: string): Promise<D2dProspectReceipt | null>;
  getReceiptByRunId(factoryRunId: string): Promise<D2dProspectReceipt | null>;
  saveReceipt(receipt: D2dProspectReceipt): Promise<void>;
  getStateStore(runId: string): Promise<StateStore>;
}

export function createMemoryIntakeRegistry(): D2dIntakeRegistry {
  const receiptsByKey = new Map<string, D2dProspectReceipt>();
  const receiptsByProspect = new Map<string, D2dProspectReceipt>();
  const receiptsByRun = new Map<string, D2dProspectReceipt>();
  const stores = new Map<string, StateStore>();

  return {
    async getReceipt(correlationId) {
      return receiptsByKey.get(correlationId) ?? null;
    },
    async getReceiptByProspect(d2dProspectId) {
      return receiptsByProspect.get(d2dProspectId) ?? null;
    },
    async getReceiptByRunId(factoryRunId) {
      return receiptsByRun.get(factoryRunId) ?? null;
    },
    async saveReceipt(receipt) {
      receiptsByKey.set(receipt.correlationId, cloneState(receipt));
      const existing = receiptsByProspect.get(receipt.d2dProspectId);
      if (!existing || shouldReplaceProspectReceipt(existing, receipt)) {
        receiptsByProspect.set(receipt.d2dProspectId, cloneState(receipt));
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
  function prospectPath(d2dProspectId: string): string {
    return join(rootDir, "prospects", `${encodeURIComponent(d2dProspectId)}.json`);
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
      return readJson<D2dProspectReceipt>(receiptPath(correlationId));
    },
    async getReceiptByProspect(d2dProspectId) {
      return readJson<D2dProspectReceipt>(prospectPath(d2dProspectId));
    },
    async getReceiptByRunId(factoryRunId) {
      return readJson<D2dProspectReceipt>(runPointerPath(factoryRunId));
    },
    async saveReceipt(receipt) {
      writeJson(receiptPath(receipt.correlationId), receipt);
      const existing = readJson<D2dProspectReceipt>(prospectPath(receipt.d2dProspectId));
      if (!existing || shouldReplaceProspectReceipt(existing, receipt)) {
        writeJson(prospectPath(receipt.d2dProspectId), receipt);
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

function shouldReplaceProspectReceipt(existing: D2dProspectReceipt, next: D2dProspectReceipt): boolean {
  if (!existing.factoryRunId && next.factoryRunId) return true;
  if (existing.status === "held" || existing.status === "failed") return true;
  if (existing.status === "retryable" && next.status !== "held") return true;
  if (next.status === "accepted" || next.status === "duplicate") return true;
  return false;
}