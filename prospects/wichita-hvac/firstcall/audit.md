# Current-site audit: 1st Call Heating & Cooling (Wichita KS)

Run 2026-11-09 with Playwright (Chromium, Node) at 390x844 (phone) and 1440x900 (desktop). Site on Google profile: https://firstcallheatingcooling.com/. Sources: live site, RDAP, Wayback Machine, web search. Facts with citations are in `facts.md`.

## What works
- **Google listing:** 4.9 stars, 50 reviews, phone (316) 371-3815, 937 W 50th St N, Wichita KS 67204 (reviews.json; Dispatchcore: https://www.dispatchcore.io/directory/hvac/wichita-ks/1st-call-heating-and-cooling). Phone and address match across both.
- **Reviews are strong:** 48 five-star reviews (reviews.json). Praise is for same-day service, honest pricing and named techs.
- **Business is still registered:** the domain has an active registration at Porkbun to 2027-09-30 (RDAP, see finding 2).

## What's broken, most costly first

### 1. Google's "Website" link lands on a domain-for-sale page (costs every click)
- Live site, both phone and desktop: https://firstcallheatingcooling.com/ returns HTTP 200 and shows Porkbun's parking page, not the business.
  - Screenshots: `audit/apex-phone.png` and `audit/apex-desktop.png`.
  - H1: "This domain is for sale."
  - `<title>`: "porkbun.com | domain for sale"
  - Body text: "firstcallheatingcooling.com is registered at Porkbun. It has expired and is currently for sale at auction."
  - Links: "Make Offer" to https://porkbun.com/tools/auctionRedirect/firstcallheatingcooling.com and "Porkbun" to https://porkbun.com. The only form is a Porkbun domain search ("Find your own great domain").
- www host: https://www.firstcallheatingcooling.com/ redirects (HTTP 301) to the bare domain and then shows the same parking page. Screenshot `audit/www-phone.png`. On one desktop run it returned HTTP 502 "upstream request failed" (`audit/www-desktop.png`, an error screen). A retry returned the 301, so the 502 looks transient; it was not re-screenshotted.
- A customer who taps "Website" on Google sees a page offering the domain for sale. Nothing about heating, cooling, phone, hours or reviews.

### 2. Domain status conflict: the page says expired, RDAP says active
- Parking page: "It has expired and is currently for sale at auction."
- RDAP (https://rdap.org/domain/firstcallheatingcooling.com, Verisign data): registration 2025-09-30, expiration 2027-09-30, last changed 2026-10-22, registrar Porkbun LLC, status "client delete prohibited" and "client transfer prohibited", nameservers *.ns.porkbun.com, registrant not shown.
- Read: the domain is registered and not in the expiry grace period in RDAP, yet the site serves the auction page. The 2025-09-30 registration date suggests it was dropped and re-registered at some point. Cause not confirmed. Ask the owner (`facts.md`, questions 10).

### 3. No working business content on the site at all
- Phone links (`tel:`): 0 on both pages. Mailto links: 0.
- Contact form: none. The one form is Porkbun's domain search.
- Services, hours, about text, reviews, images: none on the live site.
- Menu/card links: none (only "Make Offer" and "Porkbun").
- Placeholders and "copy-of" pages: none, because there is no site content to test.

### 4. Old site content could not be read
- Wayback availability API (https://archive.org/wayback/available?url=firstcallheatingcooling.com): closest snapshot 2025-04-27 17:03:56, status 200: http://web.archive.org/web/20250427170356/http://firstcallheatingcooling.com/
- That snapshot could not be opened. web.archive.org returned HTTP 502 "upstream request failed" for the snapshot and for the CDX index (https://web.archive.org/cdx/search/cdx?url=firstcallheatingcooling.com&limit=20), with connection resets through the agent proxy (`/__agentproxy/status` logged web.archive.org tunnel failures). Retried several times.
- **Unverified:** the old site's title, H1, services, phone and About text. The site was live as of at least 2025-04-27 (availability API). Retry the snapshot later for the title, H1, services and phone.

### 5. No other website or social page found
- Searches for a Facebook page, another website, BBB, Yelp, Angi and HomeAdvisor for this business returned nothing for it (`facts.md`, section 11). Search returned similar-name businesses that are not this one.
- The Dispatchcore directory listing (https://www.dispatchcore.io/directory/hvac/wichita-ks/1st-call-heating-and-cooling) shows the same dead website and says "This listing has not been claimed yet." Hours there: Mon-Fri 8:00 AM - 5:00 PM, weekends closed.

## Checks not run
- Page speed: not run. There is no working page to score.
- Sitebulb export: none provided.
- Google profile itself: not opened directly. Data comes from reviews.json and Dispatchcore.
- Manufacturer dealer status: see `facts.md` section 10. Not confirmed.

## Screenshots
- `audit/apex-phone.png` (390x844, https://firstcallheatingcooling.com/): parking page
- `audit/apex-desktop.png` (1440x900, https://firstcallheatingcooling.com/): parking page
- `audit/www-phone.png` (390x844, https://www.firstcallheatingcooling.com/): parking page after 301
- `audit/www-desktop.png` (1440x900, https://www.firstcallheatingcooling.com/): 502 error page (transient)
