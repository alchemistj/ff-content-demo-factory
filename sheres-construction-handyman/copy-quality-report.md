# Copy quality report — Shere's construction & handyman

**Grade target:** Hemingway 5–6 on business body, AP heads, dual CTA, second person on `/home`, service pages, and `/contact`.  
**Voice:** TEK / Healing Hearts / Ozarks craft, not page-count matching. Fence thinness is pass, not fail.

## Schema

- `copy-artifact.json` schemaVersion 1.0.0
- `businessName` Shere's construction & handyman
- `industry` Handyman
- `city` Joplin `state` MO
- `sourceStrategyRecipeVersion` 1.0.0
- Five pages; titles match `strategy-recipe.json`
- `footer.servicesFull` two items only
- `footer.differentiators` []
- `footer.hours` Mon–Sat 8 AM–6 PM; Sun closed

## Quotes per page

| Page | Named quotes |
| --- | --- |
| `/` | none (Fluid Frame; may mention 116 reviews and no website) |
| `/home` | Andrew Anthony, Carol Scheerer, Julie North, Elizabeth Ritchey |
| `/handyman-repairs-joplin-mo` | Carol Scheerer, Andrew Anthony, Siji Ajayi, Beth, Colleen Butkovich, LWilliams Masters |
| `/fence-installation-joplin-mo` | Julie North |
| `/contact` | none |

All excerpts are verbatim `reviews-apify.json` bodies (newlines kept). Julie is not on the handyman page. Repair quotes are not on the fence page. No Julia mis-credit. gary williams unused.

## Checks

| Check | Result |
| --- | --- |
| Factory-talk on customer pages including `/` | Pass — no signed pack, grade A-, do not deploy, IA, extra slug inventory, written guarantee, or “we did not invent reviews” |
| Unattributed chrome (on-time / cleanup / fence speed) | Pass — omitted from heroes, footer differentiators, tagline; outcomes sit next to named quotes |
| Deck/roof page | Pass — not present |
| Julia-style misplaced quotes | Pass |
| Crowd-voice | Pass |
| $80/hr two-man cash-check | Pass — unpublished |
| Website invented | Pass — none |
| Licensing / insurance / warranty / financing | Pass — none |
| foundingYear 2013 on customer pages | Pass — omitted |
| James / Kenneth without quote | Pass |
| GBP tags as extra routes | Pass |
| Phone | Pass — (417) 385-8899 only |
| Fence page thin | Pass — three body sections, one quote |

## Known limits

Listing 116 vs 109 texts: copy states 116 on `/` only and does not invent the missing seven. `review-inventory.json` still reflects the earlier five-excerpt overnight capture; writers quoted Apify, per Architect sign-off.
