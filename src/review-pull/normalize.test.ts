import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { formatReviewerName, normalizePlace } from "./normalize.js";

const fixturePath = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "apify-place.json");
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Record<string, unknown>;

const FULL_NAMES = [
  "Isaac Rodriguez",
  "Zebediah Duplicateperson",
  "Ana Morales",
  "José García",
  "J. Smith",
  "Ada Lovelace",
  "Sam Nguyen",
  "Mary Ann Lee",
  "Jane Doe",
  "No Id Person",
];

test("reviewer names keep a first name and last initial", () => {
  assert.equal(formatReviewerName("Isaac Rodriguez"), "Isaac R.");
  assert.equal(formatReviewerName("Cher"), "Cher");
  assert.equal(formatReviewerName("bob jones"), "bob J.");
  assert.equal(formatReviewerName("  Ada   Lovelace  "), "Ada L.");
  assert.equal(formatReviewerName(""), "Google user");
  assert.equal(formatReviewerName("   "), "Google user");
  assert.equal(formatReviewerName("Google user"), "Google user");
  assert.equal(formatReviewerName("google   user"), "Google user");
  assert.equal(formatReviewerName("Sam 😀 Nguyen"), "Sam N.");
  assert.equal(formatReviewerName("😀"), "Google user");
  assert.equal(formatReviewerName("J. Smith"), "J. S.");
  assert.equal(formatReviewerName("Mary Ann Lee"), "Mary L.");
  assert.equal(formatReviewerName("José García"), "José G.");
  assert.equal(formatReviewerName(null), "Google user");
});

test("the sanitized fixture becomes reviews, drops duplicates, and keeps no profile data", () => {
  const normalized = normalizePlace(fixture, 75);
  assert.ok(normalized);
  if (!normalized) return;

  assert.equal(normalized.place.name, "Kode's Roofing");
  assert.equal(normalized.place.placeId, "ChIJfakekodesroofing0001");
  assert.equal(normalized.place.phone, "(417) 555-0134");
  assert.equal(normalized.place.rating, 4.9);
  assert.equal(normalized.place.totalReviewCount, 59);
  assert.equal(normalized.phoneDigits, "14175550134");
  assert.deepEqual(
    normalized.reviews.map((review) => review.id),
    ["r-new", "r-cher", "r-original", "r-jose", "r-jsmith", "r-ada", "r-sam", "r-google", "r-empty", "r-mary"],
  );
  assert.deepEqual(
    normalized.reviews.map((review) => review.reviewer),
    ["Isaac R.", "Cher", "Ana M.", "José G.", "J. S.", "Ada L.", "Sam N.", "Google user", "Google user", "Mary L."],
  );
  assert.deepEqual(
    normalized.ratingOnly.map((review) => [review.id, review.reviewer]),
    [
      ["r-pat", "Pat"],
      ["r-jane", "Jane D."],
    ],
  );
  assert.equal(normalized.reviews[0]?.text, "Fixed the leak the same week.");
  assert.equal(normalized.reviews[0]?.ownerResponse, "Glad we could help.");
  assert.equal(normalized.reviews[0]?.reviewUrl, "https://reviews.example.test/r/r-new");
  assert.equal(normalized.reviews[0]?.language, "en");
  const original = normalized.reviews.find((review) => review.id === "r-original");
  assert.equal(original?.text, "Texto original.");
  assert.equal(original?.language, "es");
  const jose = normalized.reviews.find((review) => review.id === "r-jose");
  assert.equal(jose?.text, "Trabajo limpio.");
  assert.equal(jose?.language, "es");
  assert.deepEqual(Object.keys(normalized.ratingOnly[0] ?? {}).sort(), ["id", "publishedAt", "rating", "reviewer"]);

  const serialized = JSON.stringify(normalized);
  for (const name of FULL_NAMES) assert.equal(serialized.includes(name), false, name);
  for (const secret of profileValues(fixture)) assert.equal(serialized.includes(secret), false, secret);
  assert.equal(serialized.includes("reviewerUrl"), false);
  assert.equal(serialized.includes("reviewerPhotoUrl"), false);
  assert.equal(serialized.includes("reviewer-isaac-private"), false);
  assert.equal(serialized.includes("DO_NOT_KEEP_DUPLICATE"), false);
  assert.equal(serialized.includes("TRANSLATED_BODY_DO_NOT_KEEP"), false);
  assert.equal(serialized.includes("TRANSLATED_TEXT_DO_NOT_KEEP"), false);
  assert.equal(serialized.includes("NO_ID_TEXT"), false);
  assert.equal(serialized.includes("profiles.example.test"), false);
  assert.equal(serialized.includes("cdn.example.test"), false);
});

test("maxReviews caps the newest reviews before the text and rating-only split", () => {
  const one = normalizePlace(fixture, 1);
  assert.deepEqual(one?.reviews.map((review) => review.id), ["r-new"]);
  assert.equal(one?.ratingOnly.length, 0);

  const two = normalizePlace(fixture, 2);
  assert.deepEqual(two?.reviews.map((review) => review.id), ["r-new"]);
  assert.deepEqual(two?.ratingOnly.map((review) => review.id), ["r-pat"]);
});

function profileValues(value: unknown, found: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) profileValues(item, found);
    return found;
  }
  if (!value || typeof value !== "object") return found;
  for (const [key, child] of Object.entries(value)) {
    if (
      (key === "reviewerUrl" || key === "reviewerPhotoUrl" || key === "reviewerId") &&
      typeof child === "string" &&
      child
    ) {
      found.push(child);
    } else {
      profileValues(child, found);
    }
  }
  return found;
}
