import { cloneState, validateWorkflowState, type WorkflowState } from "../workflow/state.js";
import { createDurableIntakeRegistry, type DurableIntakeStore } from "./durable-store.js";
import type { D2dIntakeRegistry } from "./registry.js";
import type { D2dBusinessReceipt } from "./types.js";

export const D2D_INTAKE_RECEIPTS_TABLE = "d2d_intake_receipts";
export const D2D_INTAKE_BUSINESSES_TABLE = "d2d_intake_business_receipts";
export const D2D_INTAKE_PROSPECTS_TABLE = "d2d_intake_prospect_receipts";
export const D2D_INTAKE_RUN_RECEIPTS_TABLE = "d2d_intake_run_receipts";
export const D2D_INTAKE_WORKFLOW_STATE_TABLE = "d2d_intake_workflow_state";

export interface SupabaseIntakeConfig {
  readonly url: string;
  readonly serviceRoleKey: string;
  readonly fetch?: typeof fetch;
}

export function createSupabaseIntakeRegistry(config: SupabaseIntakeConfig): D2dIntakeRegistry {
  return createDurableIntakeRegistry(createSupabaseIntakeStore(config));
}

export function createSupabaseIntakeStore(config: SupabaseIntakeConfig): DurableIntakeStore {
  const rest = supabaseRest(config);
  return {
    async getReceipt(correlationId) {
      return rest.getJson<D2dBusinessReceipt>(D2D_INTAKE_RECEIPTS_TABLE, "correlation_id", correlationId, "receipt");
    },
    async getReceiptByBusiness(sourceBusinessId) {
      return rest.getJson<D2dBusinessReceipt>(
        D2D_INTAKE_BUSINESSES_TABLE,
        "source_business_id",
        sourceBusinessId,
        "receipt",
      );
    },
    async getReceiptByProspect(d2dProspectId) {
      return rest.getJson<D2dBusinessReceipt>(
        D2D_INTAKE_PROSPECTS_TABLE,
        "d2d_prospect_id",
        d2dProspectId,
        "receipt",
      );
    },
    async getReceiptByRunId(factoryRunId) {
      return rest.getJson<D2dBusinessReceipt>(D2D_INTAKE_RUN_RECEIPTS_TABLE, "factory_run_id", factoryRunId, "receipt");
    },
    async putReceipt(receipt) {
      await rest.upsert(D2D_INTAKE_RECEIPTS_TABLE, {
        correlation_id: receipt.correlationId,
        source_business_id: receipt.sourceBusinessId,
        d2d_prospect_id: receipt.d2dProspectId,
        factory_run_id: receipt.factoryRunId ?? null,
        receipt: cloneState(receipt),
        updated_at: new Date().toISOString(),
      });
    },
    async putBusinessPointer(sourceBusinessId, receipt) {
      await rest.upsert(D2D_INTAKE_BUSINESSES_TABLE, {
        source_business_id: sourceBusinessId,
        correlation_id: receipt.correlationId,
        receipt: cloneState(receipt),
        updated_at: new Date().toISOString(),
      });
    },
    async putProspectPointer(d2dProspectId, receipt) {
      await rest.upsert(D2D_INTAKE_PROSPECTS_TABLE, {
        d2d_prospect_id: d2dProspectId,
        receipt: cloneState(receipt),
        updated_at: new Date().toISOString(),
      });
    },
    async putRunPointer(factoryRunId, receipt) {
      await rest.upsert(D2D_INTAKE_RUN_RECEIPTS_TABLE, {
        factory_run_id: factoryRunId,
        receipt: cloneState(receipt),
        updated_at: new Date().toISOString(),
      });
    },
    async getWorkflowState(runId) {
      const raw = await rest.getJson<WorkflowState>(D2D_INTAKE_WORKFLOW_STATE_TABLE, "run_id", runId, "state");
      return raw ? cloneState(validateWorkflowState(raw)) : null;
    },
    async putWorkflowState(runId, state) {
      await rest.upsert(D2D_INTAKE_WORKFLOW_STATE_TABLE, {
        run_id: runId,
        state: cloneState(validateWorkflowState(state)),
        updated_at: new Date().toISOString(),
      });
    },
  };
}

function supabaseRest(config: SupabaseIntakeConfig) {
  const base = `${config.url.replace(/\/$/, "")}/rest/v1`;
  const fetchImpl = config.fetch ?? fetch;
  const headers = {
    apikey: config.serviceRoleKey,
    authorization: `Bearer ${config.serviceRoleKey}`,
    "content-type": "application/json",
    accept: "application/json",
  };

  async function request(path: string, init: RequestInit): Promise<Response> {
    const response = await fetchImpl(path, {
      ...init,
      headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Supabase D2D intake store HTTP ${response.status} ${path}: ${detail}`.trim());
    }
    return response;
  }

  return {
    async getJson<T>(table: string, column: string, value: string, field: string): Promise<T | null> {
      const url = `${base}/${table}?${column}=eq.${encodeURIComponent(value)}&select=${field}`;
      const response = await request(url, { method: "GET" });
      const rows = (await response.json()) as Array<Record<string, unknown>>;
      const row = Array.isArray(rows) ? rows[0] : undefined;
      const payload = row?.[field];
      return payload === undefined || payload === null ? null : (cloneState(payload) as T);
    },
    async upsert(table: string, row: Record<string, unknown>): Promise<void> {
      await request(`${base}/${table}`, {
        method: "POST",
        headers: { prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(row),
      });
    },
  };
}
