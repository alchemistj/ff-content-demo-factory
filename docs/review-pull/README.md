# Google review pull

Give it one Google Maps listing. Get back up to 75 real Google reviews (250 max), saved on the long-lived branch `review-data`. That branch is never merged into `main`.

The Apify key lives only in the GitHub secret `APIFY_API_TOKEN`. Callers do not need it on their own machine.

## Claude Code with GitHub tools

Call `actions_run_trigger` (method `run_workflow`) on `alchemistj/ff-content-demo-factory`, workflow `review-pull.yml`, ref `main`, inputs `{ "maps_url": "…" }`.

Optional inputs: `slug`, `max_reviews` (default `75`), `expected_phone`, `expected_name`.

Then read `reviews/<slug>/reviews.json` from ref `review-data` with `get_file_contents`.

## gh CLI

```bash
gh workflow run review-pull.yml -R alchemistj/ff-content-demo-factory -f maps_url="…"
gh run watch
gh api repos/alchemistj/ff-content-demo-factory/contents/reviews/<slug>/reviews.json?ref=review-data -H "Accept: application/vnd.github.raw"
```

## Any agent that can only push files

Add `review-requests/<slug>.json` on any branch and push. The push must change exactly one request file. Results land on `review-data`.

```json
{ "mapsUrl": "https://maps.app.goo.gl/abc", "maxReviews": 75, "expectedPhone": "4175551234" }
```

`mapsUrl` can be a `google.com/maps/...` URL, a `maps.app.goo.gl/...` or `goo.gl/maps/...` share link, or `place_id:<id>`.

## Local, with the key in your shell

```bash
APIFY_API_TOKEN=… npm run reviews:pull -- --maps-url "…"
```

That writes to `./reviews/`. The folder is gitignored, which is fine for a local pull. Pass `--out` to write somewhere else. The process exits 0 only when the receipt status is `ok`.

## Read a failed receipt

Open `reviews/<slug>/receipt.json` on `review-data` (or under `./reviews/<slug>/` after a local run). `status` says what happened. `detail` says it in plain language. A failed run writes only `receipt.json`. If an earlier pull of that slug worked, its `reviews.json`, `reviews.md` and index row stay as they were. If the slug was not known yet, the folder is `unnamed-<github run id>`.

`reviews/index.json` has one row per slug: name, placeId, status, counts, and pulledAt. A successful pull of the same slug replaces that folder. Git history keeps the previous files.

## What each status means

| Status | Meaning |
| --- | --- |
| `ok` | The listing matched and the reviews were saved. |
| `not_found` | Apify returned no place for that link. |
| `ambiguous` | Apify returned more than one place. The receipt lists the names and addresses. |
| `identity_mismatch` | `expected_phone` or `expected_name` did not match the listing that came back. |
| `invalid_request` | The Maps link, slug, max, or phone failed the checks. |
| `apify_error` | Apify failed twice, rejected the token, or the run did not finish. |
| `missing_token` | `APIFY_API_TOKEN` is not set. Add it to `alchemistj/ff-content-demo-factory`. |

## Cost

Roughly a few cents per 75 reviews on Apify.

## Prospect scout

Find businesses for a search, instead of pulling reviews for one listing. It uses the same Apify actor and the same token. No reviews are pulled, so the run stays cheap. Results land on the long-lived branch `scout-data` under `scout/<slug>/`. That branch is never merged into `main`.

`places.json` is a `google-prospect-scout` file. Its `places` array is in the order Google returned them. `rank` is the 1-based position in that search. `places.md` is the same list as a table, sorted by rank. `receipt.json` records the exact query, location, Apify run, counts, and times. A missing value is `null`. `claimThisBusiness` is the actor's field: true when Google is offering the claim button.

### Claude Code with GitHub tools

Call `actions_run_trigger` (method `run_workflow`) on `alchemistj/ff-content-demo-factory`, workflow `prospect-scout.yml`, ref `main`, inputs `{ "query": "window installation", "location": "Indianapolis, IN" }`.

Optional inputs: `max_places` (default `60`, max `120`), `slug`.

Then read `scout/<slug>/places.json` from ref `scout-data` with `get_file_contents`.

### gh CLI

```bash
gh workflow run prospect-scout.yml -R alchemistj/ff-content-demo-factory -f query="window installation" -f location="Indianapolis, IN"
gh run watch
gh api repos/alchemistj/ff-content-demo-factory/contents/scout/<slug>/places.json?ref=scout-data -H "Accept: application/vnd.github.raw"
```

### Any agent that can only push files

Add `scout-requests/<slug>.json` on any branch and push. The push must change exactly one request file. Results land on `scout-data`.

```json
{ "query": "window installation", "location": "Indianapolis, IN", "maxPlaces": 60 }
```

### Local, with the key in your shell

```bash
APIFY_API_TOKEN=… npm run prospects:scout -- --query "window installation" --location "Indianapolis, IN"
```

That writes to `./scout/`. Pass `--out` to write somewhere else. The process exits 0 only when the receipt status is `ok`.

When the request is valid, the folder slug is `slug` or a slug made from the query and location. A failed run writes only `receipt.json`. If an earlier scout of that slug worked, its `places.json` and `places.md` stay. If the request is not valid and no slug was given, the folder is `unnamed-<github run id>`.

| Status | Meaning |
| --- | --- |
| `ok` | The search finished and the places were saved. An empty list is still `ok`. |
| `invalid_request` | The query, location, slug, or max failed the checks. |
| `apify_error` | Apify failed twice, rejected the token, or the run did not finish. |
| `missing_token` | `APIFY_API_TOKEN` is not set. Add it to `alchemistj/ff-content-demo-factory`. |

Reviews for a business you pick still come from the Google review pull.
