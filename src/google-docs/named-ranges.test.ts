import assert from "node:assert/strict";
import test from "node:test";
import { namedRangeForPage, namedRangeForQuote, parsePageNamedRange, parseQuoteNamedRange } from "./named-ranges.js";

test("page named ranges are reversible for hyphenated slugs", () => {
  assert.equal(namedRangeForPage("leak-repair"), "ffcf_page_leak_repair");
  assert.equal(parsePageNamedRange("ffcf_page_leak_repair"), "leak-repair");
});

test("quote named ranges encode reviewId without putting it in the visible Doc", () => {
  const name = namedRangeForQuote("homepage", "rev-dana-m-springfield");
  assert.equal(name.includes("."), false);
  assert.match(name, /^ffcf_rev_homepage__/);
  assert.deepEqual(parseQuoteNamedRange(name), {
    pageId: "homepage",
    reviewId: "rev-dana-m-springfield",
  });
});
