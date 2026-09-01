# Kingdom Roofing and Construction — words package

**Slug:** `kingdom-roofing-and-construction`  
**Market:** Joplin, MO  
**Evidence grade:** B  
**Repo:** `alchemistj/ff-content-demo-factory`  
**Branch:** `words/kingdom-roofing-and-construction`

Five-route Fluid Frame demo words package. Signed architect pack is copied verbatim from `/workspace/joplin-overnight/kingdom-roofing-and-construction/` (2026-09-01). The thin template at `http://kingdomroofingjoplin.com/` is not a copy source and was not scraped.

## Routes

| Route | Page title | Voice |
| --- | --- | --- |
| `/` | Why We Built This | Fluid Frame demo |
| `/home` | Homepage | Business |
| `/roof-replacement-joplin-mo` | Roof Replacement Joplin MO | Business |
| `/commercial-roof-restoration-joplin-mo` | Commercial Roof Restoration Joplin MO | Business |
| `/contact` | Contact | Business |

Two service routes only: residential replacement vs commercial restoration. No siding, attic, gutters, or third service URL. Footer may list the full confirmed service names without linking a third route.

## Phone (override)

Business pages (`/home`, both service routes, `/contact`) and header/footer chrome use one number: `(417) 317-6233`.

Do not place the website-observed alternate on those routes. Record the website number conflict only on `/` and in `WORDS-LOG.md`.

## Quotes

Quote only `review-inventory.json` `reviews[].text`. All four anchor authors appear in `copy-artifact.json`.

- Randy Coleman — `/home`, `/roof-replacement-joplin-mo`
- Val Packard — `/home`, `/roof-replacement-joplin-mo`, `/commercial-roof-restoration-joplin-mo`
- Juell Brandt — `/home`, `/roof-replacement-joplin-mo` (no listing-tag dollar range in customer copy)
- Carterville First Baptist Church — `/home`, `/commercial-roof-restoration-joplin-mo`

Justin Anderson is supporting (optional; original spelling preserved). Do not quote `droppedEmptyReviews`. Owner post is first-party only (never a customer quote). Tagline: *A company you can have faith in.*

Office: Danielle is a confirmed office fact. Do not invent a job title.

## Files

- `ARCHITECT-SIGN-OFF.md`, `confirmed-facts.json`, `current-site-audit.json`, `prospect.json`, `review-inventory.json` — signed pack, verbatim
- `PRESCRIPTION.md` — keywords, two-service rationale, refuse list
- `strategy-recipe.json` — schemaVersion 1.0.0; titles match copy-artifact
- `copy-blueprint.json` — intendedStructure, sketchDepartures, anchorEvidence
- `copy-artifact.json` — five pages + footer
- `copy-quality-report.md` — QA self-check
- `WORDS-LOG.md` — overnight log
