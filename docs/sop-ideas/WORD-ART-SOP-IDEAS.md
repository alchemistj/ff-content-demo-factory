# Word art: SOP ideas (draft)

**Status: ideas, not policy.** Josh is still shaping the SOP. This file collects the word rules he gave while pushing seven demo sites (Stump Away, Hawkins, Kode's, Abbott, H-VAC & Central Plumbing, Drain Doctor, High Efficiency) to the current standard on 2026-10-20 and 2026-10-21. It is not read by `discoverAssignment()`, it does not override `ASSIGNMENT.md` or `docs/writer-guides/`, and nothing here changes factory behavior until Josh promotes a rule into the writer guides.

The matching design ideas live in `ff-2-demos` and `ff-astro-demos` under `docs/design-sop-ideas/`. Words belong in this repo. Layout, bars and behavior belong there.

## 1. Who does what

- Claude writes every word. Cursor places the words exactly and never writes, edits, shortens, reorders or adds visible copy.
- A word spec names each file and gives the exact string for each change. If a layout needs different words, Cursor stops and reports.
- Josh decides what merges. Nothing merges, deploys or goes to a client without him.

## 2. Truth and sourcing

- Anything on the client's current site counts as confirmed. If the site contradicts itself, use the lesser number.
- Drop unsourced claims (licensed, veteran-owned, discounts, certifications, years in business) unless the current site makes them.
- Quote only reviews that are in the review inventory, word for word or as a contiguous excerpt.

## 3. Review captions and quotes

**Rule (Josh, confirmed 2026-10-21): the caption under every review is the reviewer's first name and last initial only. No "Google review" statement, no date.**

- Write `Dana C.`, never `Dana Carter`.
- No "Google review", no date, no city, no stars, no rating.
- A reviewer who shows one name keeps that one name (`Joe`). An export that only has initials stays initials (`T. J.`).
- Rating, date, source and review URL stay in the review inventory so the quote can be checked. They are not printed on the page.
- A section lead says `Real Google reviews.`, not `Real Google reviews, with names and dates.`
- Quote the customer. Never narrate a review ("Scott had a heat pump installed and described…", "customers tell us…"). A review is a bare quote plus the caption.
- No reviewer names in body text or FAQ answers.

Note: the older "approved" examples in `examples/approved-copy/` show full customer names, and `src/approved-copy/catalog.test.ts` locks them in. Josh suspects most of those examples came out of earlier AI automation and are not good reference. Until he has reviewed them, do not treat them as the style authority, and do not copy their caption format.

## 4. Voice

- Benefits over features. Say what the customer gets, not what the business has.
- Do not push replacement on repair pages. Say what the repair solves.
- No narrating the website ("you'll land on a page…", "this page shows…").
- No "call and describe what you're seeing."
- No jargon the owner has never heard. The client has no idea why their Google profile town should be in a headline, so it is not in the headline.

## 5. No SEO writing

- Do not write SEO titles, meta descriptions or alt text going forward. There is no point on these demo sites.
- Existing ones stay as they are. Nobody deletes them.

## 6. Page set (words side)

Every demo has a homepage, two service pages and a contact page, plus the Fluid Frame strategy page at `/`. The contact form is built but connected to nothing, so its words are labels only.

## 7. Google Business Profile (GBP) decides the keyword

1. Read the GBP before writing anything. The spec's first section quotes the profile's city and address.
2. Main keyword is service plus the GBP city (`electrician in Ozark, MO`). Homepage title, H1, first screen and strategy page all use that town.
3. One profile, one town page set. A business with several profiles gets one demo pass per profile, each with its own address, phone and reviews.
4. When the site and the profile disagree, the profile wins for the demo and the strategy page says they disagree, in plain words.
5. Nearby towns come second, later, from search data.
6. Reviews belong to the profile.

Decisions so far: Abbott is Ozark. Hawkins is Republic. Kode's is Walnut Grove. H-VAC, Stump Away and Drain Doctor are Springfield. Nixa and Willard are not needed for Drain Doctor.

**Undecided (Josh, 2026-10-21): High Efficiency HVAC and the Nixa / Springfield / Willard question.** High Efficiency's Google profile is `1252 Ashley Dr, Nixa, MO 65714`, while its current site (highehvac.com) says Springfield/Branson with no street address. The demo is built for Springfield and its business-page words are approved and frozen. Josh leans toward Springfield for all of these but has not concluded. Until he does, leave the demos on Springfield and change nothing.

## 8. Approved copy is frozen

Once the owner approves the business-page words, later passes change only: the strategy page menu, the strategy page above the fold, the strategy closing, the Text and Book links, and the mobile bars. A word change to an approved business page needs Josh's say-so first.

## 9. Strategy page words

- Compare to the current site. Say what the visitor finds today and what the demo fixes.
- Explain why there is a single target. One-page sites can rank for one keyword.
- Flag a phone or address mismatch plainly, using the GBP as the reference.
- Remove builder metadata. The page is for the business owner, not for the build team.
- A Fluid Frame menu on top and one closing at the bottom (section 11).

### Above-the-fold headline

The headline is benefit-focused and chosen per business from that site's biggest proven gap. It is not always the reviews lane.

Candidate gaps (my ideas to refine, not decided; the direction column is a theme, not final wording):

| Gap on the current site | Headline direction |
| --- | --- |
| Reviews live on Google, not on the site | Lead with the customers' own trust |
| Phone number buried (footer only) | Make calling effortless (used for High Efficiency, below) |
| Services lumped together or missing | Every service findable on its own |
| Site names no town or service | Say what you do and where, up front |
| Site and profile name different towns | One town, one address, everywhere |
| 24/7 or hours buried | Be the answer at the hour they need you |

Worked example (High Efficiency HVAC, phone gap, in use):

- Headline: `Make it easy to call before they change their mind.`
- Subline: `Your number is one tap away on every screen, so a customer with a broken system never has to hunt for how to reach you.`

## 10. Fixed Fluid Frame constants

- Text number: `(417) 521-8413`, link `sms:+14175218413`. This replaced the old (417) 373-2773 everywhere.
- Book destination: `https://fluidframemarketing.com/contact/`. A GoHighLevel calendar may be added to that page later, so the demos never need to change.
- The business's own number is never replaced by a Fluid Frame number on a business page.

## 11. Strategy page menu and closing (words)

Defined once per site as a constant, so one value changes every button. Menus and closings were assigned across the seven sites to compare them on real pages. The numbers below use the current text number and booking link.

**Header menus**

- Menu A: `Fluid Frame` with the small label `Demo site`. Button `Book a strategy call`.
- Menu B: `Fluid Frame`. Text link `See the demo` (to `/home`), button `Book a strategy call`.
- Menu C: `Fluid Frame`. Section links `The listing today`, `Why this demo`, `The pages` (desktop only). Button `Talk to Fluid Frame`.
- Menu D: `Fluid Frame` with the small label `Sample website`. Text link `Text (417) 521-8413`, button `Book a call`.

**Closings** (heading, one paragraph, one button, then `Text Fluid Frame: (417) 521-8413`)

1. `Your services, listed clearly, help you show up on Google Maps.` Button `Book a strategy call`.
2. `Want a website like this for your business?` Button `Book a website design call`.
3. `Be the company people find on Google.` Button `Book a Google visibility call`.
4. `Your reviews already say it. Let's put them where people look.` Button `Book a strategy call`.
5. `Be the answer when people ask Google, ChatGPT, or Perplexity.` Button `Book a Google visibility call`.

The full paragraph text for each closing lives in `docs/strategy-chrome/v1/CHROME-V2.md` on the chrome-pass PR branches in `ff-2-demos` (for example PR 289). It is not on `main` yet. Open question: settle on one menu and one closing system.

## 12. Open questions for Josh

1. Menus and closings: not settled on one system yet.
2. Nixa / Springfield / Willard: leaning Springfield for all, not concluded (section 7).
3. Whether the strategy page should flag a site-versus-profile town mismatch while a site's business words are frozen.
4. Single-name reviewers (`Joe`, `Sarah`): keep as shown?
5. The old approved examples: review them and keep, rewrite or retire.

## 13. Final QA

Going forward, final QA covers every site, every time, not only the site that just changed. The checklist is in the design SOP ideas (`ff-2-demos` and `ff-astro-demos`, `docs/design-sop-ideas/`). Words are checked against the rules above: captions, no narrated reviews, no unsourced claims, no words changed on approved pages.
