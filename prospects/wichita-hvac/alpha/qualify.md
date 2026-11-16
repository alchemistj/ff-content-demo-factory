# Alpha HVAC & Plumbing (Wichita, KS) - qualify

Verdict: qualifies as a small HVAC specialist with a weak site. HVAC is the headline and most of the work. Plumbing is a real second line, not a second business. Demo: 5-page, HVAC-first.

Sources: site https://alpha-heatair.com/ (fetched with curl and Playwright 2026-11-09); Google data in https://www.google.com/maps/search/?api=1&query=Alpha%20HVAC%20and%20Plumbing%20LLC&query_place_id=ChIJr0T5uHTfuocRtEZ4JiDm3RE and `reviews.json` in this folder.

## Josh's fit test: is HVAC the headline, or about half the services?

- **Headline:** the homepage H1 is only "Alpha HVAC & Plumbing" (https://alpha-heatair.com/). The About page H2 says "Your #1 option for heating & cooling in the Wichita, KS area." (https://alpha-heatair.com/about/). HVAC leads the story; plumbing is not named in that line.
- **Site services:** three service cards, Heating, Cooling, Plumbing (https://alpha-heatair.com/). Two of three are HVAC. Each has its own page: /heating/, /cooling/, /plumbing-2/. Plumbing copy is shorter: repairs, water heater replacement, remodels, scheduled water heater service (https://alpha-heatair.com/plumbing-2/).
- **Reviews:** 102 of the 131 Google reviews were pulled (`reviews.json`, pulled 2026-11-09). Keyword count (rough, not hand-coded): 59 reviews name a service. 52 name HVAC (about 88%): A/C, furnace, heating, cooling, condenser, blower, maintenance plan. 15 name plumbing (about 25%): water heater, sink, leak, flush, drain. 8 name both. Victor S. (2026-03-12) describes a full HVAC install plus replumbing in one review.
- **Call:** HVAC is about two-thirds of the stated services and most of the review mentions. That meets the "about half" bar. Qualifies.

## Weak site (confirmed)

- Title is fine: "Wichita, KS HVAC & Plumbing Services | Alpha HVAC & Plumbing" (https://alpha-heatair.com/).
- H1 is the company name, not the work or the town. The town appears only in the H2 "Wichita Heating & Air Conditioning".
- Phone: the snapshot said one tel link. The crawl found two tel: links, both `tel:13162605775` (header bar and mobile menu). The footer number is plain text. Phone tap is covered in audit.md.
- Stale-looking leftovers are live: /test-for-reviews/ ("area for testing") and /17-2/ ("Site Under Maintenance") with a different phone, 316-765-4492, and a gmail address (see audit.md).
- Google review count mismatch: the site's review widget says "48 Google reviews" (https://alpha-heatair.com/); Google says 131.
- Full detail and screenshots: `audit.md` in this folder. Facts with URLs: `facts.md`.

## Open for the onboarding call

- Owner name (not found on site or in replies), certifications (not confirmed; see facts.md).
