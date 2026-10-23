import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { checkIdentity } from "./identity.js";
import type { ReviewPullRequest } from "./request.js";

const fixture = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "fixtures", "apify-place.json"), "utf8"),
) as Record<string, unknown>;

function request(extra: Partial<ReviewPullRequest> = {}): ReviewPullRequest {
  return {
    mapsUrl: "place_id:ChIJfakekodesroofing0001",
    maxReviews: 75,
    target: { kind: "place_id", placeId: "ChIJfakekodesroofing0001" },
    ...extra,
  };
}

test("identity passes one matching place and refuses the other outcomes", () => {
  const passed = checkIdentity([fixture], request({ expectedPhone: "4175550134", expectedName: "kode" }));
  assert.equal(passed.ok, true);
  if (passed.ok) {
    assert.equal(passed.normalized.place.name, "Kode's Roofing");
    assert.equal(passed.normalized.reviews.length > 0, true);
  }

  const missing = checkIdentity([], request());
  assert.equal(missing.ok, false);
  if (!missing.ok) {
    assert.equal(missing.status, "not_found");
    assert.match(missing.detail, /no place/);
  }

  const other = { ...fixture, title: "Other Roofing", phone: "(314) 555-0199", phoneUnformatted: "+13145550199" };
  const ambiguous = checkIdentity([fixture, other], request());
  assert.equal(ambiguous.ok, false);
  if (!ambiguous.ok) {
    assert.equal(ambiguous.status, "ambiguous");
    assert.match(ambiguous.detail, /Kode's Roofing/);
    assert.match(ambiguous.detail, /100 Sample Street/);
    assert.match(ambiguous.detail, /Other Roofing/);
  }

  const phone = checkIdentity([fixture], request({ expectedPhone: "3145550199" }));
  assert.equal(phone.ok, false);
  if (!phone.ok) {
    assert.equal(phone.status, "identity_mismatch");
    assert.match(phone.detail, /3145550199/);
    assert.match(phone.detail, /\(417\) 555-0134/);
    assert.equal(phone.name, "Kode's Roofing");
  }

  const name = checkIdentity([fixture], request({ expectedName: "plumbing" }));
  assert.equal(name.ok, false);
  if (!name.ok) {
    assert.equal(name.status, "identity_mismatch");
    assert.match(name.detail, /plumbing/);
    assert.match(name.detail, /Kode's Roofing/);
  }

  const both = checkIdentity([other], request({ expectedPhone: "4175550134", expectedName: "kode" }));
  assert.equal(both.ok, false);
  if (!both.ok) {
    assert.match(both.detail, /4175550134/);
    assert.match(both.detail, /kode/);
    assert.match(both.detail, /Other Roofing/);
  }
});
