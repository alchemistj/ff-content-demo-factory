# Qualify: Cook's Heating and Cooling (Wichita, KS)

Site: https://www.cookshvac.com/ | Google: 4.0 stars, 67 reviews, (316) 945-2665, 2215 S West St, Wichita KS 67213, place_id ChIJjxss2tbmuocREGRO-I7jkEE (from the review pull, `reviews.json` "place" block, pulled 2026-11-09).

**Kind: small HVAC specialist with a weak site. Qualifies for the 5-page demo.** (Checked 2026-11-09 with curl and Playwright.)

## HVAC share of services: all of it
- Site's own services page: "At Cooks, we service, maintenance and install all your Heating and Cooling needs." (https://www.cookshvac.com/services/)
- Services named on the site: heating installation/repair/service, air conditioning installation/service/repair, air quality (filtration, humidifiers), annual maintenance agreements (https://www.cookshvac.com/services/ , https://www.cookshvac.com/maintenance/ , https://www.cookshvac.com/services/air-quality).
- No plumbing, electrical, roofing or other trade on the site.
- Caveat: the About page describes "advanced mechanical system design for both residential and commercial applications" and an "in-house sheet metal fabrication shop" (https://www.cookshvac.com/about/). That is still HVAC, but it means commercial work is claimed. Ask on the onboarding call.

## Site size and signals (weak)
- Pages that load (9 unique): /, /services/, /maintenance/, /energytips/, /about/, /contact/, /services/air-quality, /services/air-conditioning, /services/heating. A missing page returns a real 404 (https://www.cookshvac.com/nonexistent-page-xyz). sitemap.xml returns 404; robots.txt returns 200.
- Homepage: 159 words in the body (desktop crawl, `crawl-out/crawl-desktop.json`).
- Homepage H1 is empty. The only H1 is the logo image, which has alt="" (https://www.cookshvac.com/, line `<h1 class="logo">`).
- Footer: "Copyright © 2016 - Cooks Heating & Cooling" on every page (https://www.cookshvac.com/).
- Template text: a hidden `<span class="descriptions">Site Desc</span>` in the header on every page (not visible at 1440 px; the crawl marked it hidden).
- Tap-to-call: a tel: link exists (tel:3169452665) in the top bar, shown as 316.945.2665 (https://www.cookshvac.com/). Footer phone is plain text.
- Mailto: the only email link is inside an HTML comment, so it is not live (https://www.cookshvac.com/ footer comment `<!-- Email: <a href="mailto:service@cookshvac.com">`).
- Service pages have 260 to 460 words each, with a heading that says the city (e.g. "Wichita Heating Installation, Repair & Service").

## Age signals
- Copyright 2016 (stale). Review dated 2009 says they were "bought out in 2008" (`reviews.json`, Richard R., 2009-09-10). The About page says "a second generation family business" (https://www.cookshvac.com/about/). Founding year not stated on the site. Unverified.

## Why this one
- HVAC only, one location (2215 S. West St.), 67 reviews, 4.0 stars with a clear service-and-repair reputation in the reviews (see facts.md).
- Site is thin, the H1 is empty, and the copyright is 2016. Good fit for a 5-page demo.

## Open items
- Owner name not found on the site (see facts.md section 1).
- Manufacturer dealer status not confirmed (see facts.md section 4).
