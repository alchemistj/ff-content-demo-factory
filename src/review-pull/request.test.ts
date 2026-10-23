import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  cleanExpectedPhone,
  loadRequestFile,
  parseReviewRequest,
  slugFromName,
} from "./request.js";

const ACCEPTED = [
  "https://www.google.com/maps/place/Kodes+Roofing/@37.2,-93.3,17z",
  "https://google.com/maps/search/?api=1&query=kode",
  "http://www.google.com/maps/place/x",
  "https://maps.app.goo.gl/abcDEF",
  "https://goo.gl/maps/xyz",
  "https://goo.gl/maps/xyz?utm=share",
  "place_id:ChIJfakekodesroofing0001",
  "PLACE_ID:ChIJN1t_tDeuEmsRUsoyG83frY4",
];

const REFUSED = [
  "https://example.com/maps/place",
  "https://maps.google.com/maps?q=test",
  "https://www.google.com/search?q=maps",
  "https://goo.gl/abc",
  "https://maps.app.goo.gl",
  "https://maps.app.goo.gl/",
  "google.com/maps/place/x",
  "place_id:",
  "place_id:has space",
  "place_id:https://evil.example",
  "ftp://google.com/maps/place/x",
  "https://user:pass@www.google.com/maps/place/x",
  "",
];

test("request accepts every Maps form and refuses everything else", () => {
  for (const mapsUrl of ACCEPTED) {
    const parsed = parseReviewRequest({ mapsUrl });
    assert.equal(parsed.ok, true, mapsUrl);
    if (parsed.ok) assert.equal(parsed.request.mapsUrl, mapsUrl);
  }
  for (const mapsUrl of REFUSED) {
    const parsed = parseReviewRequest({ mapsUrl });
    assert.equal(parsed.ok, false, mapsUrl);
  }
  const missing = parseReviewRequest({});
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.match(missing.detail, /mapsUrl is required/);
});

test("slug rules, max bounds, and the default of 75", () => {
  const ok = parseReviewRequest({ mapsUrl: "place_id:ChIJfake", slug: "kodes-roofing" });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.request.slug, "kodes-roofing");
    assert.equal(ok.request.maxReviews, 75);
    assert.equal(ok.request.target.kind, "place_id");
  }

  const bounds = parseReviewRequest({
    mapsUrl: "https://www.google.com/maps/place/x",
    maxReviews: 250,
    slug: "a".repeat(60),
  });
  assert.equal(bounds.ok, true);
  if (bounds.ok) assert.equal(bounds.request.maxReviews, 250);

  const fromString = parseReviewRequest({ mapsUrl: "place_id:ChIJfake", max_reviews: "1", slug: "ab" });
  assert.equal(fromString.ok, true);
  if (fromString.ok) assert.equal(fromString.request.maxReviews, 1);

  for (const slug of ["a", "Kodes", "kode_roofing", "kodes roofing", "a".repeat(61), "-"]) {
    const parsed = parseReviewRequest({ mapsUrl: "place_id:ChIJfake", slug });
    assert.equal(parsed.ok, false, slug);
    if (!parsed.ok) assert.match(parsed.detail, /slug/);
  }

  for (const maxReviews of [0, 251, 1.5, "75abc", -1]) {
    const parsed = parseReviewRequest({ mapsUrl: "place_id:ChIJfake", maxReviews });
    assert.equal(parsed.ok, false, String(maxReviews));
    if (!parsed.ok) assert.match(parsed.detail, /maxReviews/);
  }

  const blankSlug = parseReviewRequest({ mapsUrl: "place_id:ChIJfake", slug: "  " });
  assert.equal(blankSlug.ok, true);
  if (blankSlug.ok) assert.equal(blankSlug.request.slug, undefined);
});

test("phone cleaning keeps 10 digits and drops a leading US country code", () => {
  assert.equal(cleanExpectedPhone("4175550134"), "4175550134");
  assert.equal(cleanExpectedPhone("(417) 555-0134"), "4175550134");
  assert.equal(cleanExpectedPhone("417.555.0134"), "4175550134");
  assert.equal(cleanExpectedPhone("+1 (417) 555-0134"), "4175550134");
  assert.equal(cleanExpectedPhone("1-417-555-0134"), "4175550134");
  assert.equal(cleanExpectedPhone("555-0134"), null);
  assert.equal(cleanExpectedPhone("abc"), null);
  assert.equal(cleanExpectedPhone("141755501341"), null);

  const parsed = parseReviewRequest({
    mapsUrl: "place_id:ChIJfake",
    expectedPhone: "+1 (417) 555-0134",
    expectedName: "  kode  ",
  });
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.request.expectedPhone, "4175550134");
    assert.equal(parsed.request.expectedName, "kode");
  }

  const badPhone = parseReviewRequest({ mapsUrl: "place_id:ChIJfake", expected_phone: "555" });
  assert.equal(badPhone.ok, false);
  if (!badPhone.ok) assert.match(badPhone.detail, /expectedPhone/);
});

test("a business name becomes a slug, and a request file supplies a missing slug", () => {
  assert.equal(slugFromName("Kode's Roofing"), "kodes-roofing");
  assert.equal(slugFromName("A"), null);

  const dir = mkdtempSync(join(tmpdir(), "review-request-"));
  try {
    const path = join(dir, "kodes-roofing.json");
    writeFileSync(path, JSON.stringify({ mapsUrl: "https://maps.app.goo.gl/abc", maxReviews: 75 }));
    const loaded = loadRequestFile(path);
    const parsed = parseReviewRequest(loaded);
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.request.slug, "kodes-roofing");
      assert.equal(parsed.request.maxReviews, 75);
    }

    const explicit = join(dir, "other-name.json");
    writeFileSync(explicit, JSON.stringify({ mapsUrl: "place_id:ChIJfake", slug: "kept-slug" }));
    const explicitParsed = parseReviewRequest(loadRequestFile(explicit));
    assert.equal(explicitParsed.ok, true);
    if (explicitParsed.ok) assert.equal(explicitParsed.request.slug, "kept-slug");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
