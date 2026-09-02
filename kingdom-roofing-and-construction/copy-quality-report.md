# Copy quality report — Kingdom Roofing and Construction

**Verdict:** HUMAN_REVIEW (overnight words package; no factory Node QA binary in this workspace). Self-check below.

## Schema

- [x] copy-artifact schemaVersion 1.0.0
- [x] businessName Kingdom Roofing and Construction, Joplin Mo.
- [x] industry Roofing
- [x] city Joplin / state MO
- [x] sourceStrategyRecipeVersion 1.0.0
- [x] five pages; titles match strategy-recipe.json
- [x] each page: title, slug, seoTitle, metaDescription, hero (eyebrow, heading, subheading, primaryCta, secondaryCta), sections[{heading,body,bullets}]
- [x] footer.servicesFull, footer.differentiators, footer.hours from confirmed-facts.json
- [x] strategy-recipe schemaVersion 1.0.0

## Routes

| Slug | Title | Voice |
| --- | --- | --- |
| `/` | Why We Built This | Fluid Frame |
| `/home` | Homepage | Business |
| `/roof-replacement-joplin-mo` | Roof Replacement Joplin MO | Business |
| `/commercial-roof-restoration-joplin-mo` | Commercial Roof Restoration Joplin MO | Business |
| `/contact` | Contact | Business |

No third service route. Footer lists full confirmed services without extra URLs.

## Phone

- Business page copy and CTAs: (417) 317-6233 only
- `/home`, both services, `/contact`: no 417-614-3141
- Conflict (website 417-614-3141 vs GBP (417) 317-6233): `/` and WORDS-LOG.md only

## Anchors in copy-artifact

| Author | Pages present |
| --- | --- |
| Randy Coleman | `/home`, `/roof-replacement-joplin-mo` |
| Val Packard | `/home`, `/roof-replacement-joplin-mo`, `/commercial-roof-restoration-joplin-mo` |
| Juell Brandt | `/home`, `/roof-replacement-joplin-mo` |
| Carterville First Baptist Church | `/home`, `/commercial-roof-restoration-joplin-mo` |
| Justin Anderson | `/home` supporting; original spelling (`deoendable`, `recomend`) |

Quotes are inventory `reviews[].text`. No droppedEmptyReviews. No $12k / $14k in customer pages. Owner post labeled as company Google post, not a customer quote.

## Claims

- No invented licenses, warranties, years in business, free estimates, or SLAs
- Same-day callback / week roof attributed to Randy Coleman, not a guarantee
- Silicone / metal restoration labeled as May 10, 2026 Google post
- Danielle = office only
- Does not claim only five text reviews; strategy page states ~47 text / 54 listing / packet subset
- Tagline used: A company you can have faith in.
- Hours: Open 24 hours
- Address: 1421 S Main St, Joplin, MO 64801

## Craft

- Dual CTA on every hero
- AP-style section heads
- Customer pages: no factory instruction leak
- FAQs skip refused-claim topics (warranty, license, five-review myth, silent canonical)
- Voice refs TEK / Healing Hearts / Ozarks named on `/` as voice, not as a three-page mandate

## Not done

- No deploy
- No ff-2-demos
- No existing-PR survey
