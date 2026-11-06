import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { normalizeScoutPlaces, type ScoutPlace } from "./normalize.js";

const fixturePath = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "apify-search.json");
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as unknown[];

const FORBIDDEN = [
  "REVIEW_TEXT_DO_NOT_KEEP",
  "AD_REVIEW_DO_NOT_KEEP",
  "DO_NOT_KEEP_PEOPLE",
  "https://cdn.example.test/secret.jpg",
  "https://menu.example.test/do-not-use",
  "Full Name Do Not Keep",
  "q=place_id:ChIJsparse",
];

test("the fixture keeps Google's rank, dataset order, and nulls for anything missing", () => {
  const places = normalizeScoutPlaces(fixture);
  assert.deepEqual(places, [
    place({
      rank: 2,
      name: "Second In File",
      placeId: "ChIJsecond",
      mapsUrl: "https://www.google.com/maps/place/?q=place_id:ChIJsecond",
      categoryName: "Window installation service",
      categories: ["Window installation service", "Contractor"],
      rating: 4.2,
      reviewsCount: 11,
      website: "https://second.example.test",
      phone: "(317) 555-0102",
      address: "2 Sample Street, Indianapolis, IN 46204",
      city: "Indianapolis",
      state: "Indiana",
      permanentlyClosed: false,
      temporarilyClosed: false,
      isAdvertisement: false,
      claimThisBusiness: false,
      ownerUpdates: [{ text: "New showroom" }],
    }),
    place({
      rank: null,
      name: "Ad Windows",
      placeId: "ChIJad",
      categoryName: "Window supplier",
      categories: [],
      rating: 4.9,
      reviewsCount: 3,
      phone: "+13175550100",
      address: "9 Ad Road, Indianapolis, IN 46201",
      isAdvertisement: true,
    }),
    place({
      rank: 1,
      name: "First On Google",
      placeId: "ChIJfirst",
      mapsUrl: "https://maps.example.test/first",
      categoryName: "Glass repair",
      categories: ["Glass repair"],
      rating: 5,
      reviewsCount: 40,
      website: "https://first.example.test",
      phone: "(317) 555-0101",
      address: "1 First Ave, Indianapolis, IN 46202",
      city: "Indianapolis",
      state: "IN",
      permanentlyClosed: true,
      temporarilyClosed: false,
      isAdvertisement: false,
      claimThisBusiness: true,
    }),
    place({
      rank: null,
      placeId: "ChIJsparse",
      address: "100 Main St, Indianapolis, IN 46204",
    }),
  ]);

  assert.deepEqual(
    places.map((entry) => entry.name),
    ["Second In File", "Ad Windows", "First On Google", null],
  );
  assert.equal(places[3]?.city, null);
  assert.equal(places[3]?.state, null);
  assert.equal(places[3]?.mapsUrl, null);
  assert.equal(places[1]?.permanentlyClosed, null);
  const serialized = JSON.stringify(places);
  for (const secret of FORBIDDEN) assert.equal(serialized.includes(secret), false, secret);
  assert.equal(serialized.includes("\"reviews\""), false);
});

test("rank is the dataset position only when Google did not report one", () => {
  const unranked = normalizeScoutPlaces([{ title: "A" }, null, { title: "B" }]);
  assert.deepEqual(
    unranked.map((entry) => [entry.name, entry.rank]),
    [
      ["A", 1],
      ["B", 3],
    ],
  );

  const reported = normalizeScoutPlaces([{ title: "A", rank: "8" }, { title: "B", rank: 1.5 }]);
  assert.deepEqual(
    reported.map((entry) => entry.rank),
    [8, null],
  );

  const fractional = normalizeScoutPlaces([{ title: "A", rank: 1.5 }, { title: "B" }]);
  assert.deepEqual(
    fractional.map((entry) => entry.rank),
    [1, 2],
  );
});

test("categories and closed flags are copied only when the actor reported them", () => {
  const stringCategory = normalizeScoutPlaces([{ title: "A", categories: "Window installation service" }]);
  assert.equal(stringCategory[0]?.categories, null);

  const empty = normalizeScoutPlaces([{ title: "A", categories: [] }]);
  assert.deepEqual(empty[0]?.categories, []);

  const closed = normalizeScoutPlaces([{ title: "A", permanentlyClosed: "true", temporarilyClosed: false }]);
  assert.equal(closed[0]?.permanentlyClosed, null);
  assert.equal(closed[0]?.temporarilyClosed, false);
});

function place(overrides: Partial<ScoutPlace>): ScoutPlace {
  return {
    rank: null,
    name: null,
    placeId: null,
    mapsUrl: null,
    categoryName: null,
    categories: null,
    rating: null,
    reviewsCount: null,
    website: null,
    phone: null,
    address: null,
    city: null,
    state: null,
    permanentlyClosed: null,
    temporarilyClosed: null,
    isAdvertisement: null,
    claimThisBusiness: null,
    ownerUpdates: null,
    ...overrides,
  };
}
