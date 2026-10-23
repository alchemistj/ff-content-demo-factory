# Google review pull: spec

One job: give it a Google Maps listing, get back up to 75 real Google reviews (more if asked, 250 max), saved where every agent can find them.

Anyone can start it: a Claude Code session, a GPT session, Cursor, or Josh from the GitHub website. Nobody needs the Apify key on their own machine. The key lives only in this repo's GitHub secret `APIFY_API_TOKEN`.

## What gets built

| Path | Job |
| --- | --- |
| `src/review-pull/request.ts` | Read and check a request (from workflow inputs, a request file, or the CLI) |
| `src/review-pull/apify.ts` | Run the Apify actor and fetch its results |
| `src/review-pull/normalize.ts` | Turn the actor's place record into our review format |
| `src/review-pull/identity.ts` | Make sure we got the one listing that was asked for |
| `src/review-pull/output.ts` | Write `reviews.json`, `reviews.md`, `receipt.json` and update `reviews/index.json` |
| `src/review-pull/cli.ts` | `npm run reviews:pull -- --maps-url <url> [--slug x] [--max-reviews 75] [--expected-phone 4175551234] [--expected-name "kode"] [--out reviews]` |
| `src/review-pull/index.ts` | Exports |
| `src/review-pull/*.test.ts` | Tests, no network |
| `src/review-pull/fixtures/` | A sanitized Apify place record for tests |
| `.github/workflows/review-pull.yml` | The workflow |
| `docs/review-pull/README.md` | Copy-paste recipes for every kind of agent |

Add `src/review-pull/*.test.ts` to the `test` script in `package.json`, and add the `reviews:pull` script. Add `./review-pull` to `exports`.

## Request

| Field | Required | Rule |
| --- | --- | --- |
| `mapsUrl` | yes | One of: a `google.com/maps/...` URL, a `maps.app.goo.gl/...` or `goo.gl/maps/...` share link, or `place_id:<id>`. Anything else is refused. |
| `slug` | no | Lowercase letters, digits and dashes, 2 to 60 characters. If missing, made from the listing's name after the pull (e.g. `kodes-roofing`). |
| `maxReviews` | no | Whole number 1 to 250. Default **75**. |
| `expectedPhone` | no | Digits only after cleaning. If given, the listing's phone digits must end with these 10 digits. |
| `expectedName` | no | If given, the listing's name must contain it (case-insensitive). |

Request file format (for the push trigger), saved at `review-requests/<slug>.json`:

```json
{ "mapsUrl": "https://maps.app.goo.gl/abc", "maxReviews": 75, "expectedPhone": "4175551234" }
```

## Apify call

- Actor: `compass~crawler-google-places`.
- Start an async run (`POST https://api.apify.com/v2/acts/compass~crawler-google-places/runs`), poll the run until it finishes (every 10 seconds, up to 15 minutes), then read the default dataset items. This gives us the run id and cost for the receipt, and avoids the sync endpoint's time limit.
- Send the token in the `Authorization: Bearer` header, never in the URL. Never print it.
- Input:

```json
{
  "startUrls": [{ "url": "<mapsUrl>" }],
  "language": "en",
  "skipClosedPlaces": false,
  "scrapePlaceDetailPage": true,
  "scrapeContacts": false,
  "maxReviews": 75,
  "reviewsSort": "newest",
  "reviewsOrigin": "google",
  "scrapeReviewsPersonalData": true,
  "maxImages": 0,
  "maxCrawledPlacesPerSearch": 1
}
```

  For `place_id:<id>` use `"placeIds": ["<id>"]` instead of `startUrls`.
- Retry once (after 20 seconds) on a network error, HTTP 5xx, HTTP 429, or a run that ends `FAILED`/`TIMED-OUT` for reasons other than bad input. Never retry HTTP 400/401/403/404. Two failures in a row: stop and record why.

## Identity check (must pass, or nothing is saved as reviews)

- The run must return exactly one place record. Zero: `status: "not_found"`. More than one: `status: "ambiguous"` with the names and addresses returned.
- If `expectedPhone` is given, the phone digits must match. If `expectedName` is given, the name must contain it. A mismatch is `status: "identity_mismatch"` with what we expected and what came back.

## Review format (`reviews.json`)

```json
{
  "kind": "google-review-pull",
  "version": 1,
  "slug": "kodes-roofing",
  "place": {
    "name": "Kode's Roofing",
    "placeId": "ChIJ...",
    "mapsUrl": "https://www.google.com/maps/place/?q=place_id:ChIJ...",
    "address": "…",
    "phone": "(417) 555-1234",
    "rating": 4.9,
    "totalReviewCount": 59
  },
  "pulledAt": "2026-10-23T18:00:00.000Z",
  "requestedMax": 75,
  "reviews": [
    {
      "id": "<review id from Google>",
      "reviewer": "Isaac R.",
      "rating": 5,
      "text": "…",
      "publishedAt": "2026-09-14T00:00:00.000Z",
      "ownerResponse": "…or null",
      "reviewUrl": "…or null"
    }
  ],
  "ratingOnly": [
    { "id": "…", "reviewer": "Jane D.", "rating": 5, "publishedAt": "…" }
  ]
}
```

- `reviews` holds reviews with words, newest first. `ratingOnly` holds star ratings with no words.
- `reviewer` is always **first name + last initial with a period** ("Isaac Rodriguez" → "Isaac R."). One-word names stay as they are. Trim extra spaces. Handle accents and names like "J. Smith" ("J. S.") or "Mary Ann Lee" ("Mary L."). Never store full names, reviewer photo URLs, or reviewer profile URLs.
- Translated reviews: use the original text when Apify provides it; record the language if given.
- Drop exact duplicate review ids.

`reviews.md`: the same reviews, readable. A header with the business name, rating, total count and pull date, then one block per review: stars, `reviewer`, date, the words.

## Receipt (`receipt.json`)

Always written, success or failure.

```json
{
  "kind": "google-review-pull-receipt",
  "status": "ok | not_found | ambiguous | identity_mismatch | invalid_request | apify_error | missing_token",
  "slug": "…",
  "request": { "mapsUrl": "…", "maxReviews": 75, "expectedPhone": "…", "expectedName": "…" },
  "trigger": "workflow_dispatch | push | cli",
  "apify": { "actor": "compass~crawler-google-places", "runId": "…", "datasetId": "…", "attempts": 1, "usageUsd": 0.04 },
  "counts": { "listingTotal": 59, "withText": 43, "ratingOnly": 16 },
  "detail": "plain-language reason when status is not ok",
  "startedAt": "…",
  "finishedAt": "…",
  "githubRunUrl": "…or null"
}
```

The CLI exits 0 only when `status` is `ok`.

## Where results go

- Every run (pass or fail) commits `reviews/<slug>/reviews.json`, `reviews/<slug>/reviews.md` (only when ok) and `reviews/<slug>/receipt.json` to the long-lived branch **`review-data`**, and updates `reviews/index.json` (one row per slug: name, placeId, status, counts, pulledAt). When a request has no slug and the pull fails before a name is known, use `unnamed-<github run id>`.
- If `review-data` does not exist, the workflow creates it as an orphan branch holding only `reviews/`.
- A re-pull of the same slug replaces that folder. Git history keeps the old one. Nothing else is deleted.
- `review-data` is never merged into `main`.
- The workflow also uploads the slug folder as a build artifact and writes a short job summary (business, rating, counts, status, link to the files).

## Workflow (`.github/workflows/review-pull.yml`)

Two triggers:

1. `workflow_dispatch` with inputs `maps_url` (required), `slug`, `max_reviews` (default `75`), `expected_phone`, `expected_name`.
2. `push` to any branch touching `review-requests/*.json`. Exactly one request file must change in the push, or the run stops with a clear error.

Rules:

- `permissions: contents: write`. `concurrency: { group: review-data, cancel-in-progress: false }` so two pulls never race on the branch.
- Pass every input to scripts through `env:`, never by pasting `${{ inputs.* }}` into a shell line.
- `APIFY_API_TOKEN` is set only on the pull step. If it is empty, write a `missing_token` receipt and fail with: "Add the APIFY_API_TOKEN secret to alchemistj/ff-content-demo-factory".
- Commit to `review-data` as `github-actions[bot]`. Push with up to 3 tries (fetch and rebase between tries). Never force-push.
- `timeout-minutes: 25`.
- Node 22, `npm ci`, run the CLI with `--trigger` set.

## Tests (no network)

- Request checks: every accepted URL form, refused URLs, slug rules, max bounds, default 75, phone cleaning.
- Reviewer names: the cases above plus emoji, extra spaces, empty name ("Google user" stays).
- Normalizing the fixture: counts, order, `ratingOnly` split, duplicates dropped, no full names or profile URLs anywhere in the output (assert on the serialized JSON).
- Identity: zero places, two places, phone mismatch, name mismatch, pass.
- Apify client with a fake `fetch`: success, 5xx then success (2 attempts), 429 then success, 401 (no retry), two failures (`apify_error`), poll timeout. The token never appears in any thrown message or log line.
- Output: receipt written on every failure path; index row added and replaced on re-pull.

## README recipes (`docs/review-pull/README.md`)

Short and copy-paste ready:

- **Claude Code with GitHub tools:** call `actions_run_trigger` (method `run_workflow`) on `alchemistj/ff-content-demo-factory`, workflow `review-pull.yml`, ref `main`, inputs `{ "maps_url": "…" }`. Then read `reviews/<slug>/reviews.json` from ref `review-data` with `get_file_contents`.
- **gh CLI:** `gh workflow run review-pull.yml -R alchemistj/ff-content-demo-factory -f maps_url="…"`, then `gh run watch`, then `gh api repos/alchemistj/ff-content-demo-factory/contents/reviews/<slug>/reviews.json?ref=review-data -H "Accept: application/vnd.github.raw"`.
- **Any agent that can only push files:** add `review-requests/<slug>.json` on any branch and push. Results land on `review-data`.
- **Local, with the key in your shell:** `APIFY_API_TOKEN=… npm run reviews:pull -- --maps-url "…"` writes to `./reviews/` (gitignored path is fine).
- How to read a failed receipt, and what each status means.
- Cost: roughly a few cents per 75 reviews on Apify.
