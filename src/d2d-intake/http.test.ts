import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { handleD2dIntakeRequest } from "./http.js";
import { createFileIntakeRegistry, createMemoryIntakeRegistry } from "./registry.js";
import { D2D_INTAKE_HTTP_PATH, D2D_INTAKE_REASON_CODES, D2D_TRANSPORT_STATUSES } from "./types.js";
import { WORKFLOW_STAGES } from "../workflow/state.js";
import { createIntakeAdapters, northlineBatch } from "./fixture.js";

const SECRET = "test-d2d-http-secret";

function request(path: string, init: RequestInit): Request {
  return new Request(`http://127.0.0.1${path}`, init);
}

test("HTTP intake authenticates first and returns per-business receipts", async () => {
  const adapters = createIntakeAdapters();
  const registry = createMemoryIntakeRegistry();
  const unauthorized = await handleD2dIntakeRequest(
    request(D2D_INTAKE_HTTP_PATH, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(northlineBatch()),
    }),
    { expectedSecret: SECRET, adapters, registry },
  );
  assert.equal(unauthorized.status, 401);
  const unauthorizedBody = (await unauthorized.json()) as { reasonCode: string };
  assert.equal(unauthorizedBody.reasonCode, D2D_INTAKE_REASON_CODES.AUTH_MISSING);
  assert.equal(adapters.stats.researchCalls, 0);

  const accepted = await handleD2dIntakeRequest(
    request(D2D_INTAKE_HTTP_PATH, {
      method: "POST",
      headers: { authorization: `Bearer ${SECRET}`, "content-type": "application/json" },
      body: JSON.stringify(northlineBatch()),
    }),
    { expectedSecret: SECRET, adapters, registry },
  );
  assert.equal(accepted.status, 200);
  const body = (await accepted.json()) as {
    receipts: Array<{ status: string; factoryStage?: string; d2dBusinessId: string }>;
  };
  assert.equal(body.receipts[0]?.status, D2D_TRANSPORT_STATUSES.RECEIVED);
  assert.equal(body.receipts[0]?.factoryStage, WORKFLOW_STAGES.AWAITING_PRESCRIPTION_APPROVAL);

  const polled = await handleD2dIntakeRequest(
    request(`${D2D_INTAKE_HTTP_PATH}/businesses/ChIJ-northline`, {
      method: "GET",
      headers: { authorization: `Bearer ${SECRET}` },
    }),
    { expectedSecret: SECRET, adapters, registry },
  );
  assert.equal(polled.status, 200);
  const statusBody = (await polled.json()) as {
    factoryRunId: string;
    campaignId: string;
    exportId: string;
    sourceCorrelation: { d2dBusinessId: string };
  };
  assert.equal(statusBody.campaignId, "campaign-lake-county");
  assert.equal(statusBody.sourceCorrelation.d2dBusinessId, "ChIJ-northline");
  assert.equal(adapters.stats.writeCalls, 0);
});

test("file registry preserves run correlation across process-like reloads", async () => {
  const root = mkdtempSync(join(tmpdir(), "d2d-intake-"));
  try {
    const adapters = createIntakeAdapters();
    const first = createFileIntakeRegistry(root);
    const { acceptD2dIntake } = await import("./accept.js");
    const result = await acceptD2dIntake({
      payload: northlineBatch(),
      presentedToken: SECRET,
      expectedSecret: SECRET,
      adapters,
      registry: first,
    });
    assert.equal(result.receipts[0]?.status, D2D_TRANSPORT_STATUSES.RECEIVED);
    const reloaded = createFileIntakeRegistry(root);
    const receipt = await reloaded.getReceiptByBusiness("ChIJ-northline");
    assert.equal(receipt?.exportId, "export-2026-09-15-northline");
    assert.ok(receipt?.factoryRunId);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
