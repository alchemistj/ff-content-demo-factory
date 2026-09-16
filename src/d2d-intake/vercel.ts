import type { IncomingMessage, ServerResponse } from "node:http";
import { isD2dIntakeConfigError } from "./errors.js";
import { handleD2dIntakeRequest, nodeIncomingToRequest, writeFetchResponse } from "./http.js";
import { createIntakeRuntime, healthJsonResponse, isHealthPath, type IntakeRuntimeOptions } from "./runtime.js";
import {
  D2D_INTAKE_HTTP_PATH,
  D2D_INTAKE_REASON_CODES,
  D2D_INTAKE_VERCEL_API_PATH,
} from "./types.js";

export interface VercelRequestOptions extends IntakeRuntimeOptions {
  readonly env?: NodeJS.ProcessEnv;
  readonly now?: Date;
  readonly repoRoot?: string;
}

/** Map Vercel rewrite destination `/api/d2d-intake` back to the public contract path. */
export function publicPathFromVercelPathname(pathname: string): string {
  const trimmed = pathname.endsWith("/") && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  if (trimmed === D2D_INTAKE_VERCEL_API_PATH) return D2D_INTAKE_HTTP_PATH;
  if (trimmed.startsWith(`${D2D_INTAKE_VERCEL_API_PATH}/`)) {
    return `${D2D_INTAKE_HTTP_PATH}${trimmed.slice(D2D_INTAKE_VERCEL_API_PATH.length)}`;
  }
  return pathname;
}

export function rewriteVercelIntakeRequest(request: Request): Request {
  const url = new URL(request.url);
  const publicPath = publicPathFromVercelPathname(url.pathname);
  if (publicPath === url.pathname) return request;
  const next = new URL(request.url);
  next.pathname = publicPath;
  return new Request(next, request);
}

/**
 * Vercel/Node entry: health is unauthenticated liveness+config flags.
 * Intake reuses handleD2dIntakeRequest / acceptD2dIntake. Missing durable
 * store fails closed before qualification or model spend.
 */
export async function handleVercelRequest(
  request: Request,
  options?: VercelRequestOptions,
): Promise<Response> {
  const env = options?.env ?? process.env;
  const url = new URL(request.url);
  if (isHealthPath(url.pathname)) {
    return healthJsonResponse(env);
  }

  let runtime;
  try {
    runtime = createIntakeRuntime(env, {
      ...(options?.registry ? { registry: options.registry } : {}),
      ...(options?.adapters ? { adapters: options.adapters } : {}),
      ...(options?.store ? { store: options.store } : {}),
    });
  } catch (error) {
    if (isD2dIntakeConfigError(error)) {
      return jsonResponse(error.httpStatus, {
        error: "durable_store_not_configured",
        reasonCode: error.code,
        reason: error.message,
      });
    }
    throw error;
  }

  const rewritten = rewriteVercelIntakeRequest(request);
  return handleD2dIntakeRequest(rewritten, {
    adapters: runtime.adapters,
    registry: runtime.registry,
    ...(runtime.expectedSecret !== undefined ? { expectedSecret: runtime.expectedSecret } : {}),
    ...(options?.now ? { now: options.now } : {}),
    ...(options?.repoRoot ? { repoRoot: options.repoRoot } : {}),
  });
}

export async function handleVercelNode(
  req: IncomingMessage,
  res: ServerResponse,
  options?: VercelRequestOptions,
): Promise<void> {
  try {
    const response = await handleVercelRequest(await nodeIncomingToRequest(req), options);
    await writeFetchResponse(res, response);
  } catch (error) {
    res.statusCode = isD2dIntakeConfigError(error) ? error.httpStatus : 500;
    res.setHeader("content-type", "application/json; charset=utf-8");
    if (isD2dIntakeConfigError(error)) {
      res.end(
        `${JSON.stringify({
          error: "durable_store_not_configured",
          reasonCode: error.code,
          reason: error.message,
        })}\n`,
      );
      return;
    }
    res.end(
      JSON.stringify({
        error: "internal_error",
        reasonCode: D2D_INTAKE_REASON_CODES.TRANSIENT_FACTORY_FAILURE,
        reason: error instanceof Error ? error.message : "error",
      }),
    );
  }
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(`${JSON.stringify(body)}\n`, {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
