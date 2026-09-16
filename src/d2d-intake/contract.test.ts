import assert from "node:assert/strict";
import test from "node:test";
import { acceptD2dIntake } from "./accept.js";
import { createMemoryIntakeRegistry } from "./registry.js";
import {
  D2D_FACTORY_INTAKE_VERSION,
  D2D_RAW_EXPORT_SCHEMA,
  D2D_TRANSPORT_STATUSES,
  FACTORY_QUALIFICATION_OUTCOMES,
  intakeCorrelationId,
} from "./types.js";
import { createIntakeAdapters, loadD2dPr5RawExport } from "./fixture.js";
import { WORKFLOW_STAGES } from "../workflow/state.js";

const SECRET = "test-d2d-intake-secret";

test("golden D2D PR #5 raw export is accepted directly and receipt is reconcilable", async () => {
  const payload = loadD2dPr5RawExport();
  assert.equal(payload.schema, D2D_RAW_EXPORT_SCHEMA);
  assert.equal("campaign" in payload, false);
  const business = (payload.businesses as Array<Record<string, unknown>>)[0]!;
  assert.equal(typeof business.d2dProspectId, "string");
  assert.equal(typeof business.sourceBusinessId, "string");
  assert.equal("apify" in business, false);
  const coordinates = business.coordinates as { latitude: number; longitude: number };
  assert.equal(typeof coordinates.latitude, "number");
  assert.equal("lat" in coordinates, false);

  const adapters = createIntakeAdapters();
  const result = await acceptD2dIntake({
    payload,
    presentedToken: SECRET,
    expectedSecret: SECRET,
    adapters,
    registry: createMemoryIntakeRegistry(),
  });
  const receipt = result.receipts[0]!;
  assert.equal(result.version, D2D_FACTORY_INTAKE_VERSION);
  assert.equal(result.schema, D2D_RAW_EXPORT_SCHEMA);
  assert.equal(receipt.status, D2D_TRANSPORT_STATUSES.RECEIVED);
  assert.equal(receipt.qualification?.outcome, FACTORY_QUALIFICATION_OUTCOMES.ADVANCED);
  assert.equal(receipt.d2dProspectId, business.d2dProspectId);
  assert.equal(receipt.sourceBusinessId, business.sourceBusinessId);
  assert.equal(receipt.campaignBusinessId, business.campaignBusinessId);
  assert.equal(
    receipt.correlationId,
    intakeCorrelationId({
      sourceBusinessId: String(business.sourceBusinessId),
      exportId: String(payload.exportId),
    }),
  );
  assert.equal(receipt.factoryStage, WORKFLOW_STAGES.AWAITING_PRESCRIPTION_APPROVAL);
  assert.equal(adapters.stats.researchCalls, 1);
  assert.equal(adapters.stats.writeCalls, 0);
});
