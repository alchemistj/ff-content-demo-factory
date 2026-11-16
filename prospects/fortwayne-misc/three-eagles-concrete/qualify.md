# Three Eagles Concrete

- Site: https://3eaglesconcrete.com/ (live 200, Playwright, 2026-11-16; Astro v5.18.2)
- Phone on site: footer shows +1 260-276-7027. Candidate list phone (260) 418-9705 does not appear on the site.
- Rating and count: 5.0, 45 Google reviews (from candidate list; site shows 52 reviews). Place ID ChIJkwKZUofhFYgRtxBnFly9Dic

Tests:
1. Strong written reviews: PASS. 5.0 with 45 reviews (depth checked in the review pull).
2. Weak site: SKIP. Each service page has a "<Service> in Fort Wayne, IN" H1 (Driveways, Patio Installation, Stamped Patios, Sidewalks confirmed). Most money services already have a city page.
3. Enough real material: PASS (about 1,750 words on home, about 1,400 on each service page).
4. No current agency build: PASS on credits (Astro build; ProPhone/Topline footer links only). Not evaluated further.

Verdict: SKIP (test 2: most services already have "<Service> in <City>" pages).
