import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildScoutActorInput } from "./actor.js";
import {
  loadRequestFile,
  parseScoutRequest,
  scoutSlug,
} from "./request.js";

test("query and location are required, trimmed, and kept exact", () => {
  const parsed = parseScoutRequest({
    query: "  window installation  ",
    location: "  Indianapolis, IN  ",
  });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.request.query, "window installation");
  assert.equal(parsed.request.location, "Indianapolis, IN");
  assert.equal(parsed.request.maxPlaces, 60);
  assert.equal(parsed.request.slug, undefined);

  const missingQuery = parseScoutRequest({ location: "Indianapolis, IN" });
  assert.equal(missingQuery.ok, false);
  if (!missingQuery.ok) assert.match(missingQuery.detail, /query is required/);

  const missingLocation = parseScoutRequest({ query: "window installation" });
  assert.equal(missingLocation.ok, false);
  if (!missingLocation.ok) assert.match(missingLocation.detail, /location is required/);

  const blank = parseScoutRequest({ query: "   ", location: "\n" });
  assert.equal(blank.ok, false);
  if (!blank.ok) {
    assert.match(blank.detail, /query is required/);
    assert.match(blank.detail, /location is required/);
  }

  const tooLong = parseScoutRequest({ query: "q".repeat(201), location: "l".repeat(201) });
  assert.equal(tooLong.ok, false);
  if (!tooLong.ok) {
    assert.match(tooLong.detail, /query must be 200/);
    assert.match(tooLong.detail, /location must be 200/);
  }

  const atLimit = parseScoutRequest({ query: "q".repeat(200), location: "Indianapolis, IN" });
  assert.equal(atLimit.ok, true);
});

test("max places defaults to 60 and stops at 120", () => {
  const upper = parseScoutRequest({
    query: "window installation",
    location: "Indianapolis, IN",
    maxPlaces: 120,
    slug: "a".repeat(60),
  });
  assert.equal(upper.ok, true);
  if (upper.ok) {
    assert.equal(upper.request.maxPlaces, 120);
    assert.equal(upper.request.slug, "a".repeat(60));
  }

  const fromString = parseScoutRequest({
    query: "window installation",
    location: "Indianapolis, IN",
    max_places: "1",
    slug: "ab",
  });
  assert.equal(fromString.ok, true);
  if (fromString.ok) assert.equal(fromString.request.maxPlaces, 1);

  for (const maxPlaces of [0, 121, 1.5, "60abc", -1]) {
    const parsed = parseScoutRequest({ query: "window installation", location: "Indianapolis, IN", maxPlaces });
    assert.equal(parsed.ok, false, String(maxPlaces));
    if (!parsed.ok) assert.match(parsed.detail, /maxPlaces/);
  }

  const blankSlug = parseScoutRequest({
    query: "window installation",
    location: "Indianapolis, IN",
    slug: "  ",
  });
  assert.equal(blankSlug.ok, true);
  if (blankSlug.ok) assert.equal(blankSlug.request.slug, undefined);

  for (const slug of ["a", "Windows", "window_install", "window install", "a".repeat(61), "-"]) {
    const parsed = parseScoutRequest({ query: "window installation", location: "Indianapolis, IN", slug });
    assert.equal(parsed.ok, false, slug);
    if (!parsed.ok) assert.match(parsed.detail, /slug/);
  }
});

test("a request file supplies a missing slug, and an explicit slug is kept", () => {
  const dir = mkdtempSync(join(tmpdir(), "scout-request-"));
  try {
    const path = join(dir, "window-installation-indianapolis-in.json");
    writeFileSync(path, JSON.stringify({ query: "window installation", location: "Indianapolis, IN", maxPlaces: 60 }));
    const parsed = parseScoutRequest(loadRequestFile(path));
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.request.slug, "window-installation-indianapolis-in");
      assert.equal(parsed.request.maxPlaces, 60);
    }

    const explicit = join(dir, "other-name.json");
    writeFileSync(
      explicit,
      JSON.stringify({ query: "roof repair", location: "Springfield, MO", slug: "kept-slug" }),
    );
    const explicitParsed = parseScoutRequest(loadRequestFile(explicit));
    assert.equal(explicitParsed.ok, true);
    if (explicitParsed.ok) assert.equal(explicitParsed.request.slug, "kept-slug");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the slug comes from the query and location when none was given", () => {
  assert.equal(scoutSlug(undefined, "window installation", "Indianapolis, IN"), "window-installation-indianapolis-in");
  assert.equal(scoutSlug("kept-slug", "window installation", "Indianapolis, IN"), "kept-slug");
  assert.equal(scoutSlug(undefined, "!!!", "???", "4242"), "unnamed-4242");
  assert.equal(scoutSlug(undefined, "!!!", "???"), "unnamed-local");
  const long = scoutSlug(undefined, "q".repeat(200), "Indianapolis, IN");
  assert.match(long, /^[a-z0-9-]{2,60}$/);
});

test("actor input searches the exact query and location and pulls no reviews", () => {
  const parsed = parseScoutRequest({
    query: "window installation",
    location: "Indianapolis, IN",
    maxPlaces: 60,
  });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const input = buildScoutActorInput(parsed.request);
  assert.deepEqual(input, {
    searchStringsArray: ["window installation"],
    locationQuery: "Indianapolis, IN",
    maxCrawledPlacesPerSearch: 60,
    language: "en",
    skipClosedPlaces: false,
    scrapePlaceDetailPage: false,
    scrapeContacts: false,
    maxReviews: 0,
    maxImages: 0,
  });
  assert.equal(input.searchStringsArray instanceof Array && input.searchStringsArray[0], "window installation");
  assert.equal(JSON.stringify(input).includes("window installation in Indianapolis"), false);
  assert.equal("reviewsSort" in input, false);
  assert.equal("scrapeReviewsPersonalData" in input, false);
  assert.equal("startUrls" in input, false);
});
