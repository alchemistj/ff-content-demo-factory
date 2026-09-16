import assert from "node:assert/strict";
import test from "node:test";
import { createFactoryQualifier, findForbiddenConclusion, isMoldExcluded } from "./qualify.js";
import { normalizeRawBusiness } from "../d2d-intake/normalize.js";
import { NORTHLINE_CAMPAIGN, NORTHLINE_RAW, rawWith } from "../d2d-intake/fixture.js";
import { FACTORY_QUALIFICATION_OUTCOMES } from "../d2d-intake/types.js";

test("factory qualifier rejects mold and does not treat D2D labels as authority", async () => {
  const qualifier = createFactoryQualifier();
  const mold = normalizeRawBusiness(rawWith({ category: "mold inspection", categories: ["mold inspection"] }));
  assert.equal(mold.status, "normalized");
  if (mold.status !== "normalized") return;
  assert.equal(isMoldExcluded(mold.record), true);
  const decision = await qualifier.qualify({ record: mold.record, campaign: NORTHLINE_CAMPAIGN });
  assert.equal(decision.outcome, FACTORY_QUALIFICATION_OUTCOMES.REJECTED);
});

test("forbidden inherited conclusion fields are detected at any depth", () => {
  assert.equal(findForbiddenConclusion({ businesses: [{ name: "x" }] }), null);
  assert.match(findForbiddenConclusion({ opportunityScore: 9 }) ?? "", /opportunityScore/);
  assert.match(findForbiddenConclusion({ listing: { strongDemoCandidate: true } }) ?? "", /strongDemoCandidate/);
});

test("complete raw facts can be advanced by the factory qualifier exactly once conceptually", async () => {
  const qualifier = createFactoryQualifier();
  const normalized = normalizeRawBusiness(NORTHLINE_RAW);
  assert.equal(normalized.status, "normalized");
  if (normalized.status !== "normalized") return;
  const first = await qualifier.qualify({ record: normalized.record, campaign: NORTHLINE_CAMPAIGN });
  const second = await qualifier.qualify({ record: normalized.record, campaign: NORTHLINE_CAMPAIGN });
  assert.equal(first.outcome, FACTORY_QUALIFICATION_OUTCOMES.ADVANCED);
  assert.equal(second.outcome, FACTORY_QUALIFICATION_OUTCOMES.ADVANCED);
});
