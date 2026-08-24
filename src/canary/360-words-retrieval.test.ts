import assert from "node:assert/strict";
import test from "node:test";
import { parseAndValidateWriter1Output } from "../../scripts/360-words-canary.js";

const projection = {
  services: [
    { page: { url: "/garage-door-repair" }, reviewEvidence: [{ review: { id: "review-repair", text: "The repair was excellent." } }] },
    { page: { url: "/garage-door-installation" }, reviewEvidence: [{ review: { id: "review-install", text: "The installation was excellent." } }] },
  ],
};
const valid = JSON.stringify({
  schemaVersion: "words-writer1-output/v1",
  pages: [
    { url: "/garage-door-repair", seoTitle: "Repair", metaDescription: "Repair", h1: "Repair", sections: [{ heading: "Repair", body: "Repair copy" }], reviewPlacements: [{ reviewId: "review-repair", quote: "The repair was excellent.", attribution: "Chris" }] },
    { url: "/garage-door-installation", seoTitle: "Installation", metaDescription: "Installation", h1: "Installation", sections: [{ heading: "Installation", body: "Installation copy" }], reviewPlacements: [{ reviewId: "review-install", quote: "The installation was excellent.", attribution: "Marcie" }] },
  ],
});

test("Writer1 output validator accepts complete bound JSON only", () => {
  const parsed = parseAndValidateWriter1Output(valid, projection);
  assert.equal(parsed.schemaVersion, "words-writer1-output/v1");
  assert.deepEqual(parsed.pages.map((page: any) => page.url), ["/garage-door-repair", "/garage-door-installation"]);
});

test("Writer1 output validator rejects prose, missing copy, unbound quotes, and prohibited public topology", () => {
  for (const raw of [
    "Writer1 is done",
    JSON.stringify({ schemaVersion: "words-writer1-output/v1", pages: [] }),
    valid.replace('"metaDescription":"Repair"', '"metaDescription":""'),
    valid.replace('"reviewId":"review-repair"', '"reviewId":"unknown"'),
    valid.replace('"url":"/garage-door-installation"', '"url":"/garage-door-spring-repair"'),
    valid.replace('"reviewId":"review-install"', '"reviewId":"review-install","cta":"Garage door opener installation"'),
    JSON.stringify({ schemaVersion: "words-writer1-output/v1", pages: JSON.parse(valid).pages, contact: {} }),
  ]) assert.throws(() => parseAndValidateWriter1Output(raw, projection), /Writer1|JSON|copy|binding|topology|route|Contact/u);
});
