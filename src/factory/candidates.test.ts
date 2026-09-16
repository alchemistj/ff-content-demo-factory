import assert from "node:assert/strict";
import test from "node:test";
import {
  auditListingOpportunity,
  buildCandidateEntry,
  factorySelection,
} from "./candidates.js";
import { canFormProspectSeed } from "../d2d-intake/map.js";
import { normalizeRawBusiness } from "../d2d-intake/normalize.js";
import {
  NORTHLINE_CAMPAIGN,
  NORTHLINE_RAW,
  SEEDABLE_HVAC_RAW,
  rawWith,
} from "../d2d-intake/fixture.js";
import { D2D_INTAKE_REASON_CODES } from "../d2d-intake/types.js";

test("website/opportunity evidence is required for factory selection", () => {
  const northline = normalizeRawBusiness(NORTHLINE_RAW);
  assert.equal(northline.status, "normalized");
  if (northline.status !== "normalized") return;
  const evidence = auditListingOpportunity(northline.record, NORTHLINE_CAMPAIGN);
  const entry = buildCandidateEntry({
    record: northline.record,
    campaign: NORTHLINE_CAMPAIGN,
    websiteEvidence: evidence,
    seedable: true,
  });
  const selected = factorySelection(entry);
  assert.equal(selected.selected, true);
  assert.equal(evidence.opportunity, "strong");
  assert.equal(evidence.searchFit, true);
});

test("seedable weak-opportunity garage-door listing is not selected", () => {
  const weak = normalizeRawBusiness(
    rawWith({
      d2dProspectId: "d2d-prospect-weak",
      sourceBusinessId: "src-weak",
      d2dBusinessId: "src-weak",
      rating: 2.1,
      reviewCount: 2,
    }),
  );
  assert.equal(weak.status, "normalized");
  if (weak.status !== "normalized") return;
  assert.equal(canFormProspectSeed(weak.record, NORTHLINE_CAMPAIGN).ok, true);
  const evidence = auditListingOpportunity(weak.record, NORTHLINE_CAMPAIGN);
  const entry = buildCandidateEntry({
    record: weak.record,
    campaign: NORTHLINE_CAMPAIGN,
    websiteEvidence: evidence,
    seedable: true,
  });
  const selected = factorySelection(entry);
  assert.equal(entry.seedable, true);
  assert.equal(selected.selected, false);
  assert.equal(selected.reasonCode, D2D_INTAKE_REASON_CODES.WEAK_OPPORTUNITY);
});

test("seedable HVAC listing is not selected against garage-door search", () => {
  const hvac = normalizeRawBusiness(SEEDABLE_HVAC_RAW);
  assert.equal(hvac.status, "normalized");
  if (hvac.status !== "normalized") return;
  assert.equal(canFormProspectSeed(hvac.record, NORTHLINE_CAMPAIGN).ok, true);
  const evidence = auditListingOpportunity(hvac.record, NORTHLINE_CAMPAIGN);
  const entry = buildCandidateEntry({
    record: hvac.record,
    campaign: NORTHLINE_CAMPAIGN,
    websiteEvidence: evidence,
    seedable: true,
  });
  const selected = factorySelection(entry);
  assert.equal(selected.selected, false);
  assert.equal(selected.reasonCode, D2D_INTAKE_REASON_CODES.SEARCH_MISMATCH);
});
