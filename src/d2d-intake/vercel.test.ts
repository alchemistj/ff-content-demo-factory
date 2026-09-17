import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { acceptD2dIntake } from "./accept.js";
import {
  createDurableIntakeRegistry,
  createMemoryDurableIntakeStore,
  createMemoryDurableTables,
} from "./durable-store.js";
import { createEnvFactoryAdapters } from "./env-adapters.js";
import { D2dIntakeConfigError } from "./errors.js";
import {
  createIntakeRuntime,
  intakeHealthReport,
  isDurableRuntime,
  resolveSupabaseConfig,
} from "./runtime.js";
import {
  D2D_INTAKE_BUSINESSES_TABLE,
  D2D_INTAKE_RECEIPTS_TABLE,
  D2D_INTAKE_WORKFLOW_STATE_TABLE,
  createSupabaseIntakeStore,
} from "./supabase-registry.js";
import {
  D2D_INTAKE_HEALTH_PATH,
  D2D_INTAKE_HTTP_PATH,
  D2D_INTAKE_PUBLIC_HOST,
  D2D_INTAKE_REASON_CODES,
  D2D_INTAKE_VERCEL_API_PATH,
  D2D_TRANSPORT_STATUSES,
  FACTORY_QUALIFICATION_OUTCOMES,
  intakeCorrelationId,
} from "./types.js";
import { handleVercelRequest, publicPathFromVercelPathname } from "./vercel.js";
import { WORKFLOW_STAGES, readState } from "../workflow/state.js";
import type { WriterAssignment } from "../workflow/types.js";
import {
  INTAKE_NOW,
  NORTHLINE_EXPORT_ID,
  NORTHLINE_RAW,
  countingQualifier,
  createIntakeAdapters,
  northlineBatch,
} from "./fixture.js";

const SECRET = "test-vercel-intake-secret";
const ROOT = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(ROOT, "../..");

function exportBatch(input: {
  readonly exportId: string;
  readonly campaignRunId: string;
}) {
  return {
    ...northlineBatch({
      exportId: input.exportId,
      businesses: [
        {
          ...NORTHLINE_RAW,
          correlationId: intakeCorrelationId({
            sourceBusinessId: "src-northline",
            exportId: input.exportId,
          }),
        },
      ],
    }),
    campaignRunId: input.campaignRunId,
  };
}

function vercelEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    VERCEL: "1",
    D2D_INTAKE_SHARED_SECRET: SECRET,
    ...overrides,
  };
}

test("Vercel rewrite destination maps onto the public intake path", () => {
  assert.equal(publicPathFromVercelPathname(D2D_INTAKE_VERCEL_API_PATH), D2D_INTAKE_HTTP_PATH);
  assert.equal(
    publicPathFromVercelPathname(`${D2D_INTAKE_VERCEL_API_PATH}/businesses/src-northline`),
    `${D2D_INTAKE_HTTP_PATH}/businesses/src-northline`,
  );
  assert.equal(publicPathFromVercelPathname(D2D_INTAKE_HTTP_PATH), D2D_INTAKE_HTTP_PATH);
});

test("Vercel entrypoint files route through handleVercelNode and vercel.json has no cron", () => {
  const intakeSrc = readFileSync(join(REPO_ROOT, "api/d2d-intake/[[...path]].ts"), "utf8");
  const healthSrc = readFileSync(join(REPO_ROOT, "api/health.ts"), "utf8");
  assert.match(intakeSrc, /handleVercelNode/);
  assert.match(healthSrc, /handleVercelNode/);
  assert.doesNotMatch(intakeSrc, /acceptD2dIntake\(/);
  const vercel = JSON.parse(readFileSync(join(REPO_ROOT, "vercel.json"), "utf8")) as {
    crons?: unknown;
    rewrites?: Array<{ source: string; destination: string }>;
  };
  assert.equal("crons" in vercel, false);
  assert.ok(vercel.rewrites?.some((row) => row.source === D2D_INTAKE_HTTP_PATH && row.destination === D2D_INTAKE_VERCEL_API_PATH));
  assert.ok(vercel.rewrites?.some((row) => row.source === D2D_INTAKE_HEALTH_PATH && row.destination === "/api/health"));
});

test("Vercel handler remaps /api/d2d-intake onto the authenticated intake handler", async () => {
  const adapters = createIntakeAdapters();
  const registry = createDurableIntakeRegistry(createMemoryDurableIntakeStore());
  const accepted = await handleVercelRequest(
    new Request(`https://${D2D_INTAKE_PUBLIC_HOST}${D2D_INTAKE_VERCEL_API_PATH}`, {
      method: "POST",
      headers: { authorization: `Bearer ${SECRET}`, "content-type": "application/json" },
      body: JSON.stringify(northlineBatch()),
    }),
    { env: vercelEnv(), adapters, registry, now: INTAKE_NOW },
  );
  assert.equal(accepted.status, 200);
  const body = (await accepted.json()) as {
    receipts: Array<{ status: string; factoryStage?: string; correlationId: string }>;
  };
  assert.equal(body.receipts[0]?.status, D2D_TRANSPORT_STATUSES.RECEIVED);
  assert.equal(body.receipts[0]?.factoryStage, WORKFLOW_STAGES.AWAITING_PRESCRIPTION_APPROVAL);
  assert.equal(adapters.stats.researchCalls, 1);
  assert.equal(adapters.stats.prescribeCalls, 1);
  assert.equal(adapters.stats.writeCalls, 0);

  const polled = await handleVercelRequest(
    new Request(`https://${D2D_INTAKE_PUBLIC_HOST}${D2D_INTAKE_VERCEL_API_PATH}/businesses/src-northline`, {
      method: "GET",
      headers: { authorization: `Bearer ${SECRET}` },
    }),
    { env: vercelEnv(), adapters, registry },
  );
  assert.equal(polled.status, 200);
  const statusBody = (await polled.json()) as { sourceBusinessId: string; factoryStage: string };
  assert.equal(statusBody.sourceBusinessId, "src-northline");
});

test("missing durable-store config fails closed before qualifier, research, or prescription", async () => {
  const adapters = createIntakeAdapters();
  const response = await handleVercelRequest(
    new Request(`https://${D2D_INTAKE_PUBLIC_HOST}${D2D_INTAKE_HTTP_PATH}`, {
      method: "POST",
      headers: { authorization: `Bearer ${SECRET}`, "content-type": "application/json" },
      body: JSON.stringify(northlineBatch()),
    }),
    { env: vercelEnv(), adapters },
  );
  assert.equal(response.status, 503);
  const body = (await response.json()) as { reasonCode: string; error: string };
  assert.equal(body.reasonCode, D2D_INTAKE_REASON_CODES.DURABLE_STORE_NOT_CONFIGURED);
  assert.equal(adapters.stats.researchCalls, 0);
  assert.equal(adapters.stats.prescribeCalls, 0);
  assert.equal(adapters.stats.writeCalls, 0);
  const health = await handleVercelRequest(
    new Request(`https://${D2D_INTAKE_PUBLIC_HOST}${D2D_INTAKE_HEALTH_PATH}`),
    { env: vercelEnv(), adapters },
  );
  assert.equal(health.status, 200);
  assert.equal(((await health.json()) as { ready: { durableStore: boolean } }).ready.durableStore, false);
  assert.equal(adapters.stats.researchCalls, 0);
  assert.throws(
    () => createIntakeRuntime(vercelEnv()),
    (error: unknown) => error instanceof D2dIntakeConfigError && error.code === D2D_INTAKE_REASON_CODES.DURABLE_STORE_NOT_CONFIGURED,
  );
});

test("health is alive, reports readiness booleans, and does not start model work or leak secrets", async () => {
  const adapters = createIntakeAdapters();
  const env = vercelEnv({
    D2D_INTAKE_SHARED_SECRET: SECRET,
    D2D_INTAKE_SUPABASE_URL: "https://example.supabase.co",
    D2D_INTAKE_SUPABASE_SERVICE_ROLE_KEY: "service-role-secret-value",
    FACTORY_RESEARCH_PROVIDER: "openai",
    FACTORY_RESEARCH_MODEL: "fixture",
    FACTORY_MODEL_API_KEY: "sk-test-not-for-network",
  });
  const health = await handleVercelRequest(new Request(`https://${D2D_INTAKE_PUBLIC_HOST}${D2D_INTAKE_HEALTH_PATH}`), {
    env,
    adapters,
  });
  assert.equal(health.status, 200);
  const text = await health.text();
  const body = JSON.parse(text) as {
    ok: boolean;
    path: string;
    domain: string;
    ready: Record<string, boolean>;
    requestDriven: boolean;
    scheduler: boolean;
  };
  assert.equal(body.ok, true);
  assert.equal(body.path, D2D_INTAKE_HTTP_PATH);
  assert.equal(body.domain, D2D_INTAKE_PUBLIC_HOST);
  assert.equal(body.ready.sharedSecret, true);
  assert.equal(body.ready.durableStore, true);
  assert.equal(body.ready.researchAdapter, true);
  assert.equal(body.ready.prescriptionAdapter, true);
  assert.equal(body.requestDriven, true);
  assert.equal(body.scheduler, false);
  assert.doesNotMatch(text, /service-role-secret-value/);
  assert.doesNotMatch(text, /sk-test-not-for-network/);
  assert.doesNotMatch(text, new RegExp(SECRET));
  assert.equal(adapters.stats.researchCalls, 0);
  assert.equal(adapters.stats.prescribeCalls, 0);
  assert.equal(isDurableRuntime(env), true);
  assert.ok(resolveSupabaseConfig(env));
});

test("same-correlation retry stays duplicate across a fresh durable registry instance", async () => {
  const tables = createMemoryDurableTables();
  const adapters = createIntakeAdapters();
  const qualifier = countingQualifier();
  const first = await acceptD2dIntake({
    payload: northlineBatch(),
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    qualifier,
    registry: createDurableIntakeRegistry(createMemoryDurableIntakeStore(tables)),
    now: INTAKE_NOW,
  });
  assert.equal(first.receipts[0]?.status, D2D_TRANSPORT_STATUSES.RECEIVED);
  const retry = await acceptD2dIntake({
    payload: northlineBatch(),
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    qualifier,
    registry: createDurableIntakeRegistry(createMemoryDurableIntakeStore(tables)),
    now: INTAKE_NOW,
  });
  assert.equal(retry.receipts[0]?.status, D2D_TRANSPORT_STATUSES.DUPLICATE);
  assert.equal(retry.receipts[0]?.correlationId, first.receipts[0]?.correlationId);
  assert.equal(qualifier.calls, 1);
  assert.equal(adapters.stats.researchCalls, 1);
  assert.equal(adapters.stats.prescribeCalls, 1);
  assert.equal(adapters.stats.writeCalls, 0);
});

test("later export links the existing Gate 1 run on a fresh durable registry without extra research or writer", async () => {
  const tables = createMemoryDurableTables();
  const adapters = createIntakeAdapters();
  const qualifier = countingQualifier();
  const firstExportId = NORTHLINE_EXPORT_ID;
  const secondExportId = "export-2026-09-16-second";
  const firstCorrelation = intakeCorrelationId({ sourceBusinessId: "src-northline", exportId: firstExportId });
  const secondCorrelation = intakeCorrelationId({ sourceBusinessId: "src-northline", exportId: secondExportId });
  const first = await acceptD2dIntake({
    payload: exportBatch({ exportId: firstExportId, campaignRunId: "campaign-run-2026-09-15" }),
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    qualifier,
    registry: createDurableIntakeRegistry(createMemoryDurableIntakeStore(tables)),
    now: INTAKE_NOW,
  });
  const second = await acceptD2dIntake({
    payload: exportBatch({ exportId: secondExportId, campaignRunId: "campaign-run-2026-09-16" }),
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    qualifier,
    registry: createDurableIntakeRegistry(createMemoryDurableIntakeStore(tables)),
    now: INTAKE_NOW,
  });
  const retryB = await acceptD2dIntake({
    payload: exportBatch({ exportId: secondExportId, campaignRunId: "campaign-run-2026-09-16" }),
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    qualifier,
    registry: createDurableIntakeRegistry(createMemoryDurableIntakeStore(tables)),
    now: INTAKE_NOW,
  });
  assert.equal(first.receipts[0]?.status, D2D_TRANSPORT_STATUSES.RECEIVED);
  assert.equal(second.receipts[0]?.status, D2D_TRANSPORT_STATUSES.RECEIVED);
  assert.equal(second.receipts[0]?.qualification?.outcome, FACTORY_QUALIFICATION_OUTCOMES.ADVANCED);
  assert.equal(second.receipts[0]?.factoryRunId, first.receipts[0]?.factoryRunId);
  assert.equal(retryB.receipts[0]?.status, D2D_TRANSPORT_STATUSES.DUPLICATE);
  assert.equal(qualifier.calls, 2);
  assert.equal(adapters.stats.researchCalls, 1);
  assert.equal(adapters.stats.prescribeCalls, 1);
  assert.equal(adapters.stats.writeCalls, 0);
  const lookup = createDurableIntakeRegistry(createMemoryDurableIntakeStore(tables));
  const state = await readState(await lookup.getStateStore(first.receipts[0]!.factoryRunId!));
  assert.equal(state?.sourceCorrelation?.correlationId, firstCorrelation);
  assert.deepEqual(
    (state?.sourceCorrelations ?? []).map((item) => item.correlationId),
    [firstCorrelation, secondCorrelation],
  );
  assert.equal((await lookup.getReceiptByBusiness("src-northline"))?.correlationId, secondCorrelation);
});

test("Vercel runtime ignores D2D_INTAKE_ADAPTERS_MODULE and env writer stays forbidden", async () => {
  const store = createMemoryDurableIntakeStore();
  const runtime = createIntakeRuntime(
    vercelEnv({
      D2D_INTAKE_SUPABASE_URL: "https://example.supabase.co",
      D2D_INTAKE_SUPABASE_SERVICE_ROLE_KEY: "svc",
      D2D_INTAKE_ADAPTERS_MODULE: "/tmp/does-not-exist-factory-adapters.mjs",
      FACTORY_RESEARCH_PROVIDER: "openai",
      FACTORY_RESEARCH_MODEL: "gpt-test",
    }),
    { store },
  );
  assert.equal(runtime.adapters.researcher.provider, "openai");
  await assert.rejects(
    () => runtime.adapters.researcher.research({ seed: northlineBatch() as never, instructions: "", authority: "" }),
    (error: unknown) => error instanceof Error && /FACTORY_ADAPTERS_UNCONFIGURED|not used on Vercel/.test(error.message),
  );
  await assert.rejects(
    () => runtime.adapters.writer.writeCompletePackage({} as WriterAssignment),
    (error: unknown) => error instanceof Error && /Gate 1|writer/i.test(error.message),
  );
  const envAdapters = createEnvFactoryAdapters({
    FACTORY_RESEARCH_PROVIDER: "openai",
    FACTORY_RESEARCH_MODEL: "gpt-test",
    FACTORY_PRESCRIPTION_PROVIDER: "openai",
    FACTORY_PRESCRIPTION_MODEL: "gpt-test",
  });
  assert.equal(envAdapters.writer.model, "forbidden-before-gate-1");
});

test("Supabase store uses the prepared table names over PostgREST", async () => {
  const calls: Array<{ url: string; method: string }> = [];
  const fetchImpl: typeof fetch = async (url, init) => {
    calls.push({ url: String(url), method: String(init?.method ?? "GET") });
    if ((init?.method ?? "GET") === "GET") {
      return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response(null, { status: 201 });
  };
  const store = createSupabaseIntakeStore({
    url: "https://example.supabase.co",
    serviceRoleKey: "svc",
    fetch: fetchImpl,
  });
  await store.getReceipt("biz-1::export:campaign-1:apify-run-1:d2d-factory-intake/v1::d2d-factory-intake/v1");
  await store.putReceipt({
    version: "d2d-factory-intake/v1",
    status: "received",
    qualification: null,
    d2dProspectId: "cb-1",
    sourceBusinessId: "biz-1",
    campaignBusinessId: "cb-1",
    d2dBusinessId: "biz-1",
    placeId: "place-1",
    campaignId: "campaign-1",
    campaignRunId: "apify-run-1",
    exportId: "export:campaign-1:apify-run-1:d2d-factory-intake/v1",
    correlationId: "biz-1::export:campaign-1:apify-run-1:d2d-factory-intake/v1::d2d-factory-intake/v1",
  });
  assert.ok(calls[0]?.url.includes(D2D_INTAKE_RECEIPTS_TABLE));
  assert.ok(calls[0]?.url.includes("correlation_id=eq."));
  assert.equal(calls[1]?.method, "POST");
  assert.ok(calls[1]?.url.includes(D2D_INTAKE_RECEIPTS_TABLE));
  await store.getReceiptByBusiness("biz-1");
  assert.ok(calls.some((call) => call.url.includes(D2D_INTAKE_BUSINESSES_TABLE)));
  await store.getWorkflowState("run-factory-northline");
  assert.ok(calls.some((call) => call.url.includes(D2D_INTAKE_WORKFLOW_STATE_TABLE)));
});

test("health report never claims a scheduler and local runtime is not fail-closed for files", () => {
  const report = intakeHealthReport({ D2D_INTAKE_RUNTIME: "local" });
  assert.equal(report.scheduler, false);
  assert.equal(report.requestDriven, true);
  assert.equal(isDurableRuntime({ D2D_INTAKE_RUNTIME: "local" }), false);
  const runtime = createIntakeRuntime({ D2D_INTAKE_STATE_DIR: "/tmp/d2d-intake-local-test" });
  assert.ok(runtime.registry);
});
