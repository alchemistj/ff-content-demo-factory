import { configuredIntakeSecret } from "./auth.js";
import { createDurableIntakeRegistry, type DurableIntakeStore } from "./durable-store.js";
import { createEnvFactoryAdapters, envAdapterConfigured } from "./env-adapters.js";
import { D2dIntakeConfigError } from "./errors.js";
import { createFileIntakeRegistry, type D2dIntakeRegistry } from "./registry.js";
import { createSupabaseIntakeStore } from "./supabase-registry.js";
import type { FactoryAdapters } from "../workflow/types.js";
import {
  D2D_INTAKE_HEALTH_API_PATH,
  D2D_INTAKE_HEALTH_PATH,
  D2D_INTAKE_HTTP_PATH,
  D2D_INTAKE_PUBLIC_HOST,
  D2D_INTAKE_PUBLIC_URL,
  D2D_INTAKE_REASON_CODES,
  D2D_INTAKE_RUNTIME_ENV,
  D2D_INTAKE_STATE_DIR_ENV,
  D2D_INTAKE_SUPABASE_SERVICE_ROLE_KEY_ENV,
  D2D_INTAKE_SUPABASE_URL_ENV,
  SUPABASE_SERVICE_ROLE_KEY_ENV,
  SUPABASE_URL_ENV,
} from "./types.js";

export interface IntakeHealthReport {
  readonly ok: true;
  readonly service: "content-factory-d2d-intake";
  readonly path: typeof D2D_INTAKE_HTTP_PATH;
  readonly domain: typeof D2D_INTAKE_PUBLIC_HOST;
  readonly url: typeof D2D_INTAKE_PUBLIC_URL;
  readonly runtime: string;
  readonly ready: {
    readonly sharedSecret: boolean;
    readonly durableStore: boolean;
    readonly researchAdapter: boolean;
    readonly prescriptionAdapter: boolean;
  };
  readonly requestDriven: true;
  readonly scheduler: false;
}

export interface IntakeRuntime {
  readonly expectedSecret?: string;
  readonly adapters: FactoryAdapters;
  readonly registry: D2dIntakeRegistry;
  readonly health: IntakeHealthReport;
}

export interface IntakeRuntimeOptions {
  readonly registry?: D2dIntakeRegistry;
  readonly adapters?: FactoryAdapters;
  readonly store?: DurableIntakeStore;
}

export function isDurableRuntime(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.VERCEL === "1") return true;
  const runtime = env[D2D_INTAKE_RUNTIME_ENV]?.trim().toLowerCase();
  return runtime === "vercel" || runtime === "production";
}

export function resolveSupabaseConfig(
  env: NodeJS.ProcessEnv = process.env,
): { readonly url: string; readonly serviceRoleKey: string } | null {
  const url = env[D2D_INTAKE_SUPABASE_URL_ENV]?.trim() || env[SUPABASE_URL_ENV]?.trim();
  const serviceRoleKey =
    env[D2D_INTAKE_SUPABASE_SERVICE_ROLE_KEY_ENV]?.trim() || env[SUPABASE_SERVICE_ROLE_KEY_ENV]?.trim();
  if (!url || !serviceRoleKey) return null;
  return { url, serviceRoleKey };
}

export function intakeHealthReport(env: NodeJS.ProcessEnv = process.env): IntakeHealthReport {
  const runtime = env.VERCEL === "1" ? "vercel" : env[D2D_INTAKE_RUNTIME_ENV]?.trim() || "local";
  return {
    ok: true,
    service: "content-factory-d2d-intake",
    path: D2D_INTAKE_HTTP_PATH,
    domain: D2D_INTAKE_PUBLIC_HOST,
    url: D2D_INTAKE_PUBLIC_URL,
    runtime,
    ready: {
      sharedSecret: Boolean(configuredIntakeSecret(env)),
      durableStore: Boolean(resolveSupabaseConfig(env)),
      researchAdapter: envAdapterConfigured(env, "research"),
      prescriptionAdapter: envAdapterConfigured(env, "prescription"),
    },
    requestDriven: true,
    scheduler: false,
  };
}

/**
 * Production/Vercel requires a durable store. Missing config fails closed
 * before qualification or model spend. Local CLI still uses the file registry.
 */
export function createIntakeRuntime(
  env: NodeJS.ProcessEnv = process.env,
  options?: IntakeRuntimeOptions,
): IntakeRuntime {
  const health = intakeHealthReport(env);
  const adapters = options?.adapters ?? createEnvFactoryAdapters(env);
  const expectedSecret = configuredIntakeSecret(env);
  const secret = expectedSecret !== undefined ? { expectedSecret } : {};

  if (options?.registry) {
    return { adapters, registry: options.registry, health, ...secret };
  }

  if (options?.store) {
    return {
      adapters,
      registry: createDurableIntakeRegistry(options.store),
      health,
      ...secret,
    };
  }

  if (isDurableRuntime(env)) {
    const supabase = resolveSupabaseConfig(env);
    if (!supabase) {
      throw new D2dIntakeConfigError(
        D2D_INTAKE_REASON_CODES.DURABLE_STORE_NOT_CONFIGURED,
        `Production/Vercel D2D intake requires ${D2D_INTAKE_SUPABASE_URL_ENV} (or ${SUPABASE_URL_ENV}) and ${D2D_INTAKE_SUPABASE_SERVICE_ROLE_KEY_ENV} (or ${SUPABASE_SERVICE_ROLE_KEY_ENV}). Ephemeral filesystem and memory registries are not used.`,
      );
    }
    return {
      adapters,
      registry: createDurableIntakeRegistry(createSupabaseIntakeStore(supabase)),
      health,
      ...secret,
    };
  }

  return {
    adapters,
    registry: createFileIntakeRegistry(env[D2D_INTAKE_STATE_DIR_ENV] ?? ".d2d-intake-state"),
    health,
    ...secret,
  };
}

export function healthJsonResponse(env: NodeJS.ProcessEnv = process.env): Response {
  return new Response(`${JSON.stringify(intakeHealthReport(env))}\n`, {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export function isHealthPath(pathname: string): boolean {
  const trimmed = pathname.endsWith("/") && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  return trimmed === D2D_INTAKE_HEALTH_PATH || trimmed === D2D_INTAKE_HEALTH_API_PATH;
}
