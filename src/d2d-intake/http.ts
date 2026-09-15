import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { FactoryAdapters } from "../workflow/types.js";
import { readState } from "../workflow/state.js";
import { assertD2dIntakeAuth, presentedBearerToken } from "./auth.js";
import { isD2dIntakeAuthError, isD2dIntakeEnvelopeError } from "./errors.js";
import { acceptD2dIntake } from "./accept.js";
import type { D2dIntakeRegistry } from "./registry.js";
import {
  D2D_FACTORY_INTAKE_VERSION,
  D2D_INTAKE_HTTP_PATH,
  D2D_INTAKE_REASON_CODES,
} from "./types.js";

const MAX_BODY_BYTES = 1_000_000;

export interface D2dIntakeHttpDeps {
  readonly expectedSecret?: string;
  readonly adapters: FactoryAdapters;
  readonly registry: D2dIntakeRegistry;
  readonly now?: Date;
  readonly repoRoot?: string;
}

export async function handleD2dIntakeRequest(request: Request, deps: D2dIntakeHttpDeps): Promise<Response> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith(D2D_INTAKE_HTTP_PATH)) {
    return jsonResponse(404, { error: "not_found" });
  }

  try {
    const presentedToken = presentedBearerToken(request.headers.get("authorization"));
    assertD2dIntakeAuth({
      ...(presentedToken !== undefined ? { presentedToken } : {}),
      ...(deps.expectedSecret !== undefined ? { expectedSecret: deps.expectedSecret } : {}),
    });
  } catch (error) {
    if (isD2dIntakeAuthError(error)) {
      return jsonResponse(error.httpStatus, {
        error: "authentication_failed",
        reasonCode: error.code,
        reason: error.message,
      });
    }
    throw error;
  }

  if (request.method === "POST" && url.pathname === D2D_INTAKE_HTTP_PATH) {
    return handlePost(request, deps);
  }
  if (request.method === "GET") {
    const prospect = matchPath(url.pathname, `${D2D_INTAKE_HTTP_PATH}/prospects/`);
    if (prospect) return handleGetProspect(prospect, deps);
    const run = matchPath(url.pathname, `${D2D_INTAKE_HTTP_PATH}/runs/`);
    if (run) return handleGetRun(run, deps);
  }
  return jsonResponse(404, { error: "not_found" });
}

export function createD2dIntakeServer(
  deps: D2dIntakeHttpDeps,
  options?: { readonly host?: string; readonly port?: number },
): Server {
  const host = options?.host ?? "127.0.0.1";
  const port = options?.port ?? 8787;
  const server = createServer((req, res) => {
    void dispatchNode(req, res, deps);
  });
  server.listen(port, host);
  return server;
}

async function handlePost(request: Request, deps: D2dIntakeHttpDeps): Promise<Response> {
  const raw = await readLimitedBody(request);
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return jsonResponse(400, {
      error: "invalid_envelope",
      reasonCode: D2D_INTAKE_REASON_CODES.INVALID_ENVELOPE,
      reason: "JSON body is required",
    });
  }
  try {
    const presentedToken = presentedBearerToken(request.headers.get("authorization"));
    const receipt = await acceptD2dIntake({
      payload,
      ...(presentedToken !== undefined ? { presentedToken } : {}),
      ...(deps.expectedSecret !== undefined ? { expectedSecret: deps.expectedSecret } : {}),
      adapters: deps.adapters,
      registry: deps.registry,
      ...(deps.now ? { now: deps.now } : {}),
      ...(deps.repoRoot ? { repoRoot: deps.repoRoot } : {}),
    });
    return jsonResponse(200, receipt);
  } catch (error) {
    if (isD2dIntakeAuthError(error)) {
      return jsonResponse(error.httpStatus, {
        error: "authentication_failed",
        reasonCode: error.code,
        reason: error.message,
      });
    }
    if (isD2dIntakeEnvelopeError(error)) {
      return jsonResponse(400, {
        error: "invalid_envelope",
        reasonCode: error.code,
        reason: error.message,
      });
    }
    throw error;
  }
}

async function handleGetProspect(d2dProspectId: string, deps: D2dIntakeHttpDeps): Promise<Response> {
  const receipt = await deps.registry.getReceiptByProspect(d2dProspectId);
  if (!receipt) return jsonResponse(404, { error: "not_found", version: D2D_FACTORY_INTAKE_VERSION });
  return jsonResponse(200, await withStage(receipt, deps));
}

async function handleGetRun(runId: string, deps: D2dIntakeHttpDeps): Promise<Response> {
  const receipt = await deps.registry.getReceiptByRunId(runId);
  if (!receipt) return jsonResponse(404, { error: "not_found", version: D2D_FACTORY_INTAKE_VERSION });
  return jsonResponse(200, await withStage(receipt, deps));
}

async function withStage(receipt: Awaited<ReturnType<D2dIntakeRegistry["getReceipt"]>>, deps: D2dIntakeHttpDeps) {
  if (!receipt?.factoryRunId) return receipt;
  const state = await readState(await deps.registry.getStateStore(receipt.factoryRunId));
  if (!state) return receipt;
  return {
    ...receipt,
    factoryStage: state.stage,
    factoryProspectId: state.prospectId,
    factoryRunId: state.runId,
    sourceCorrelation: state.sourceCorrelation ?? null,
  };
}

async function dispatchNode(req: IncomingMessage, res: ServerResponse, deps: D2dIntakeHttpDeps): Promise<void> {
  try {
    const host = req.headers.host ?? "127.0.0.1";
    const url = `http://${host}${req.url ?? "/"}`;
    const body = await readNodeBody(req);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === "string") headers.set(key, value);
      else if (Array.isArray(value)) headers.set(key, value.join(", "));
    }
    const init: RequestInit = { method: req.method ?? "GET", headers };
    if (body.length > 0 && req.method !== "GET" && req.method !== "HEAD") {
      init.body = body;
    }
    const response = await handleD2dIntakeRequest(new Request(url, init), deps);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: "internal_error", reason: error instanceof Error ? error.message : "error" }));
  }
}

async function readLimitedBody(request: Request): Promise<string> {
  const raw = Buffer.from(await request.arrayBuffer());
  if (raw.byteLength > MAX_BODY_BYTES) {
    throw new Error("D2D intake payload exceeds 1MB");
  }
  return raw.toString("utf8");
}

function readNodeBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("D2D intake payload exceeds 1MB"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function matchPath(pathname: string, prefix: string): string | null {
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length);
  if (!rest || rest.includes("/")) return null;
  return decodeURIComponent(rest);
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(`${JSON.stringify(body)}\n`, {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
