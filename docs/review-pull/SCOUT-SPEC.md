# Prospect scout: Google Maps search through Apify

Josh's direction, 2026-11-06. The factory needs to find prospects, not only pull reviews for a known listing. Add a scout mode next to the review pull, using the same Apify actor (`compass~crawler-google-places`), the same token handling, and the same branch-commit pattern.

## Trigger

- `workflow_dispatch` on a new workflow `.github/workflows/prospect-scout.yml`, with inputs `query` (for example `window installation`), `location` (for example `Indianapolis, IN`), `max_places` (default 60, max 120) and `slug` (optional output folder).
- Also a push trigger on `scout-requests/*.json` (one file per push, same rules as `review-requests/`), so a run can be started by committing a request file.
- The Apify token is set only on the scout step, exactly as in `review-pull.yml`.

## Output

Commit to the `scout-data` branch (create it if missing) under `scout/<slug>/`:

- `places.json`: one entry per place, in the order Google returned them, with `rank` (1-based position in the search), `name`, `placeId`, `mapsUrl`, `categoryName`, `categories`, `rating`, `reviewsCount`, `website`, `phone`, `address`, `city`, `state`, `permanentlyClosed`, `temporarilyClosed`, `isAdvertisement` (if the actor reports it), `claimed`/`owner` fields if the actor reports them. Missing values are `null`, never guessed.
- `places.md`: a readable table of the same, sorted by rank.
- `receipt.json`: request, Apify run id, dataset id, counts, usage, started/finished times, GitHub run URL (same shape as the review-pull receipt).

The search rank is the point: it is the business's position for that query in that location, which outreach will quote. Record the exact query and location used in the receipt.

## Rules

- No reviews are pulled in scout mode (keep the run cheap). Reviews for chosen prospects still come from the existing review pull.
- Unit tests for request validation and normalization (fixtures, no network), matching the review-pull tests.
- Document it in `docs/review-pull/README.md` (a short "Prospect scout" section).
