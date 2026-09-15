import assert from "node:assert/strict";
import test from "node:test";
import { EXAMPLE_IDS } from "../approved-copy/index.js";
import { loadApprovedExampleLibrary } from "./catalog.js";

test("workflow example adapter exposes twelve primary pages and supplemental chrome", () => {
  const receipt = loadApprovedExampleLibrary();
  assert.equal(receipt.status, "available");
  assert.equal(receipt.pages.length, EXAMPLE_IDS.length);
  assert.equal(receipt.pages.every((page) => page.role === "primary"), true);
  assert.equal(receipt.chromePages.every((page) => page.role === "chrome"), true);
  assert.equal(receipt.chromePages.length, 3);
});
