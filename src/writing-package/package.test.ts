import assert from "node:assert/strict";
import test from "node:test";
import { publisherPayload } from "./index.js";
import { northlineWritingPackage } from "../workflow/northline.fixture.js";

test("publisher payload uses the human-review title and natural reading order", () => {
  const pkg = northlineWritingPackage();
  const payload = publisherPayload(pkg);
  assert.equal(payload.title, "Northline Garage Doors — Website Copy — Human Review");
  assert.deepEqual(payload.readingOrder, [
    "page-home",
    "page-repair",
    "page-replacement",
    "page-contact",
    "header-footer",
    "page-strategy",
  ]);
  assert.equal(payload.pages.strategyOverview.audience, "owner");
  assert.equal(payload.identity.packageHash, pkg.packageHash);
  assert.equal("evidence" in payload, false);
});
