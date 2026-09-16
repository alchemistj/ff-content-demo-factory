import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createFactoryQualifier, findForbiddenConclusion, isMoldExcluded } from "./qualify.js";
import { canFormProspectSeed } from "../d2d-intake/map.js";
import { normalizeRawBusiness } from "../d2d-intake/normalize.js";
import {
  NORTHLINE_RAW,
  NORTHLINE_SEARCH_CONTEXT,
  SEEDABLE_HVAC_RAW,
  rawWith,
} from "../d2d-intake/fixture.js";
import { D2D_INTAKE_REASON_CODES, FACTORY_QUALIFICATION_OUTCOMES } from "../d2d-intake/types.js";

test("factory qualifier rejects mold and does not treat D2D labels as authority", async () => {
  const qualifier = createFactoryQualifier();
  const mold = normalizeRawBusiness(rawWith({ category: "mold inspection", categories: ["mold inspection"] }));
  assert.equal(mold.status, "normalized");
  if (mold.status !== "normalized") return;
  assert.equal(isMoldExcluded(mold.record), true);
  const decision = await qualifier.qualify({ record: mold.record, searchContext: NORTHLINE_SEARCH_CONTEXT });
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
  const first = await qualifier.qualify({ record: normalized.record, searchContext: NORTHLINE_SEARCH_CONTEXT });
  const second = await qualifier.qualify({ record: normalized.record, searchContext: NORTHLINE_SEARCH_CONTEXT });
  assert.equal(first.outcome, FACTORY_QUALIFICATION_OUTCOMES.ADVANCED);
  assert.equal(second.outcome, FACTORY_QUALIFICATION_OUTCOMES.ADVANCED);
  assert.equal(first.websiteOpportunity?.opportunity, "strong");
  assert.equal(first.websiteOpportunity?.searchFit, true);
});

test("seedable raw business does not advance; qualification is not canFormProspectSeed", async () => {
  const qualifier = createFactoryQualifier();
  const normalized = normalizeRawBusiness(SEEDABLE_HVAC_RAW);
  assert.equal(normalized.status, "normalized");
  if (normalized.status !== "normalized") return;
  const seedable = canFormProspectSeed(normalized.record, NORTHLINE_SEARCH_CONTEXT);
  assert.equal(seedable.ok, true);
  const decision = await qualifier.qualify({
    record: normalized.record,
    searchContext: NORTHLINE_SEARCH_CONTEXT,
    seedable: true,
  });
  assert.equal(decision.outcome, FACTORY_QUALIFICATION_OUTCOMES.HELD);
  assert.equal(decision.reasonCode, D2D_INTAKE_REASON_CODES.SEARCH_MISMATCH);
  assert.notEqual(decision.outcome, FACTORY_QUALIFICATION_OUTCOMES.ADVANCED);
});

test("qualify.ts does not implement selection as canFormProspectSeed", () => {
  const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "qualify.ts"), "utf8");
  assert.equal(source.includes("canFormProspectSeed"), false);
});
