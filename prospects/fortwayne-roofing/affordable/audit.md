# Current-site audit: Affordable Roofing

Site: https://affordableroofingfw.com/ (redirects to https://www.affordableroofingfw.com/)
Pages: 23 unique pages crawled (home, free-estimate, services, roof-replacement, 3 service pages, about, financing, projects, instant estimate, cost, terms, privacy, blog and 6 posts). Run 2026-11-15, Playwright Chromium, 1440x900 and 390x844.
Method: read-only. No form was typed in or submitted. Every header/nav link target (12) was requested and returned 200. The mobile header toggle was clicked at 390 px and opened the nav (aria-expanded true).
Screenshot kept: `audit/free-estimate-form-1440.png` (the contact form as rendered; the Turnstile block is 0 px high in this run).

## Contact form (for the record)

- **URL:** https://www.affordableroofingfw.com/free-estimate. The same form appears on the homepage and /roof-replacement.
- **Method and action:** method GET, action blank in the DOM. The handler was not confirmed; nothing was submitted.
- **Fields (visible):** Full name*, Phone*, Email*, Street address*, City*, State* (maxlength 2), ZIP* (maxlength 10), How can we help? (optional textarea).
- **Required:** 7 fields (name, phone, email, street, city, state, ZIP).
- **Hidden fields:** `first_touch`, `last_touch`.
- **Honeypot:** `company_website`, labeled "Leave this field empty". Placed off-screen (x = -10000 px). Not visible to a person.
- **Submit button:** "Request My Free Estimate".
- **CAPTCHA: Cloudflare Turnstile.** The DOM holds `<div class="ar-turnstile">` with a sitekey (0x4AAAAAAFY1I_JvVpV6nYIV). In my run the widget rendered at 0 px height, and no Turnstile challenge iframe appeared. The only Cloudflare request was the Insights beacon. So: the CAPTCHA is present in the page, and I did not see it challenge a visitor. Whether a real browser gets a challenge is **unverified**. If it does, the send is blocked and goes on the hand-send list.
- **Iframe:** none in the form.
- **maxlength:** State 2, ZIP 10. No others.

## What works

- **Header menu:** all 12 nav link targets return 200 (services, roof replacement, asphalt, metal, gutter, about, financing, projects, free estimate, instant estimate, and others). The mobile header toggle (class ar-header__toggle) opens the nav.
- **Phone links:** `tel:+12604023549` (main, displayed (260) 402-3549) and `tel:+12602997663` (displayed "(260) 299-ROOF"). Both visible and tappable at 390 px. Four to eight visible `tel:` links per page.
- **Mailto:** `mailto:nick@affordableroofingfw.com` and `mailto:affordableus@aol.com`. Both visible in places.
- **Horizontal overflow:** none at 390 px on any of the 23 pages.
- **No lorem ipsum or sample text** found.

## Titles and H1s (each page)

| Page | Title | H1 | Words |
|---|---|---|---|
| / (homepage) | Fort Wayne Roofing Company / Affordable Roofing | FORT WAYNE ROOFING CONTRACTOR / Quality Roofing / Affordable Prices | 1510 |
| /free-estimate | Schedule Your Free Roof Estimate / Affordable Roofing Fort Wayne | Get Your Free Roof Estimate | 251 |
| /services | Roofing & Gutter Services in Fort Wayne, IN / Affordable Roofing | Roofing & Gutter Services in Fort Wayne | 442 |
| /roof-replacement | Roof Replacement in Fort Wayne, IN / Affordable Roofing | Roof Replacement in Fort Wayne, Indiana | 949 |
| /services/asphalt-roofing | Asphalt Shingle Roofing in Fort Wayne, IN / Affordable Roofing | Asphalt Shingle Roofing in Fort Wayne | 510 |
| /services/metal-roofing | Metal Roofing in Fort Wayne, IN / Affordable Roofing | Metal Roofing in Fort Wayne | 404 |
| /services/gutter-replacement | Gutter Replacement in Fort Wayne, IN / Affordable Roofing | Gutter Replacement in Fort Wayne | 424 |
| /about-us | About Us / Affordable Roofing in Fort Wayne | About Affordable Roofing | 507 |
| /financing | Roof Financing in Fort Wayne / Affordable Roofing | Roof Financing in Fort Wayne | 240 |
| /projects | Roofing Projects & Photos in Fort Wayne / Affordable Roofing | Roofing Projects | 733 |
| /instant-estimate | Instant Roof Estimate / Affordable Roofing Fort Wayne | Instant Roof Estimate | 264 |
| /post/efficient-gutter-maintenance-services-keeping-your-home-safe-and-dry | Is It Time for a New Roof? / Affordable Roofing | Keeping Your Fort Wayne Home Dry: When It's Time for a New Roof | 582 |
| /post/how-storm-damage-can-affect-your-roof-over-time | Storm Damage and Your Roof / Affordable Roofing | How Storm Damage Can Affect Your Roof Over Time | 213 |
| /post/understanding-the-roof-replacement-process | Understanding the Roof Replacement Process / Affordable Roofing | Understanding the Roof Replacement Process | 213 |
| /blog | Roofing Blog / Affordable Roofing in Fort Wayne | Roofing Tips & Guides for Fort Wayne Homeowners | 353 |
| /blog/owens-corning-duration-vs-oakridge | Owens Corning Duration vs Oakridge: Which Fits Your Home? | Owens Corning Duration vs Oakridge: Which Shingle Fits Your Home? | 1951 |
| /blog/signs-you-need-a-new-roof-fort-wayne | 8 Signs It's Time for a New Roof in Fort Wayne | 8 Signs It's Time for a New Roof in Fort Wayne | 2534 |
| /blog/how-to-compare-roof-replacement-quotes-fort-wayne | How to Compare Roof Replacement Quotes in Fort Wayne | How to Compare Roof Replacement Quotes in Fort Wayne (Line by Line) | 1994 |
| /blog/roof-replacement-in-winter-northeast-indiana | Can You Replace a Roof in Winter in Northeast Indiana? | Can You Replace a Roof in Winter in Northeast Indiana? | 1850 |
| /blog/how-long-does-a-shingle-roof-last-indiana | How Long Does a Shingle Roof Last in Indiana? | How Long Does a Shingle Roof Last in Indiana? (Is 20 Years Too Old?) | 2347 |
| /roof-replacement-cost | Roof Replacement Cost in Fort Wayne / Affordable Roofing | How Much Does a Roof Replacement Cost in Fort Wayne? | 1689 |
| /privacy-policy | Privacy Policy / Affordable Roofing | Privacy Policy | 1169 |
| /terms-of-service | Terms Of Service / Affordable Roofing | Terms Of Service | 366 |

## Findings

1. **Title does not match the post.** /post/efficient-gutter-maintenance-services-keeping-your-home-safe-and-dry has the title "Is It Time for a New Roof?" but its H1 and topic are gutter maintenance. The same kind of mismatch the Ballinger audit found.
2. **Repeated testimonial.** The Google quote "Nick and his crew did an outstanding job and customer service was superb. Would definitely recommend!" appears at least twice on the homepage.
3. **Two phone numbers and two emails.** Main number (260) 402-3549 and a second number (260) 299-ROOF / 299-7663. Contact emails are nick@affordableroofingfw.com and affordableus@aol.com (an AOL address on a business site).
4. **Address shown on the site:** 226A E Collins Rd. Suite 1, Fort Wayne, IN 46825 (about-us and footer). Matches the Google record in `reviews.json`.
5. **Cloudflare Turnstile on the form** (see the form section). Unverified whether it challenges real visitors.
6. **Google count on the site vs the record:** the homepage says "4.9 ★ · 109 Google reviews". `reviews.json` has 112. A small difference, probably timing; noted as a conflict in facts.md.
7. **Strong service coverage.** Roof replacement, asphalt, metal and gutter replacement each have a city H1. This is the pattern that makes it a poor demo target under the rule.

## Speed and mobile

- Homepage load in local Chromium (no throttling): about 0.8 s to the load event, about 33 KB of HTML transferred. Not a PageSpeed or Lighthouse score.
- No horizontal page scroll at 390 px on any of the 23 pages.
- Photo-heavy projects page (93 project photos on one page); not timed.

## Not checked (and why)

- **Form submission:** not submitted.
- **Turnstile in a real browser:** not run. A headless browser did not load the Turnstile challenge script.
- **Google profile:** not opened. Rating and count from `reviews.json` (4.9, 112).
- **Owens Corning "Preferred Contractor" and "BBB A+" claims:** not checked against the manufacturer locator or BBB.
- **Phone dialing on a real phone:** no device.
