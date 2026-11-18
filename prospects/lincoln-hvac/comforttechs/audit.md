# Current-site audit: COMFORTTECHS

Site: https://www.comforttechs.com/ | Run 2026-11-15 | Playwright Chromium at 1440×900 and 390×844.
Screenshots: `audit/` in this folder (one 1440 and one 390 render per crawled page, plus the contact form and the broken-link captures).
Nothing was submitted, typed into or sent.

## Scope and method
- Crawled 16 pages from the homepage and its menu: /, /maintenance-packages, /contact-us, /employment-1, /schedule-service, /payment, /financing, /waterfurnace-geothermal, /geothermal-products, /heater-installation, /heater-repair, /air-conditioner-installation, /air-conditioner-repair, /american-standard-products, /mitsubishi-electric-products, /about-us-1.
- Also checked (HTTP status, not clicked): all 28 internal links from the menu and body, plus /commercial-hvac, /employment, /welcome, /geothermal, /heating-services, /air, /products, /about-us, /payment-1.
- Not checked: mobile menu opened on a phone (the same hrefs were read from the desktop DOM); page speed (no Lighthouse or PageSpeed run); external links (Google Maps, ubt.com); the Facebook page, if any.

## Contact form (outreach target)
- **URL:** https://www.comforttechs.com/contact-us
- **Form action:** blank (posts to the same page). Platform not identified.
- **Fields, in order:**
  1. First Name (text), label says "(required)"
  2. Last Name (text), label says "(required)"
  3. Email Address (email), label says "(required)"
  4. Subject (text), label says "(required)"
  5. Message (textarea), label says "(required)"
  6. Unlabeled text input (name `message-yui_…-field`). The page text shows "Phone" by the form, so this is probably the phone field. Not confirmed.
  7. Unlabeled text input (no name). Purpose unknown.
  - Submit button: "SUBMIT".
- **Required attribute:** not set on any field (`required` is false). The "(required)" text is the only marker, so a browser will not block an empty submit. Server-side checks were not tested (no submit).
- **maxlength:** none on any field.
- **CAPTCHA:** no visible CAPTCHA. The HTML contains reCAPTCHA strings, but no reCAPTCHA iframe loaded on /contact-us in the 1440 crawl. The /employment-1 and /payment pages do load an invisible reCAPTCHA Enterprise iframe. Whether /contact-us runs a check on submit is not known.
- **iframe:** one iframe with no `src` on the page.
- **Mobile:** form visible at 390 px (350 × 665 px). Screenshots: `audit/form-contact_us-1440x900-0.png`, `audit/form-contact_us-390x844-0.png`.
- Other forms on the site: /maintenance-packages (service-plan form, with "How many systems?" and filter questions, invisible reCAPTCHA in HTML), /schedule-service (First, Last, Email, Subject, Message), /employment-1 (resume form, invisible reCAPTCHA iframe), /payment ("MAKE A PAYMENT", invisible reCAPTCHA iframe). Do not use these for outreach.

## Menu and buttons
- All desktop menu items work. Some resolve through a redirect: `/payment`→`/payment-1`, `/waterfurnace-geothermal`→`/geothermal`, `/heater-installation`→`/heating-services`, `/air-conditioner-installation`→`/air`, `/american-standard-products`→`/products`, `/about-us-1`→`/about-us`. Every target returns 200.
- **Duplicate menu items:** PAYMENT ×2, GEOTHERMAL ×2, ABOUT US ×2, EMPLOYMENT ×2.
- **"SCHEDULE A SERVICE" button:** goes to /schedule-service on the homepage but to /contact-us on the maintenance page.
- **Broken (404), homepage:** three unlabeled links to `/meditation-retreat-moksha`, `/retreat-herbal-medicine-101-moksha` and `/retreat-backpacking-moksha`. All three return 404. The first is confirmed at the blue snowflake icon in the service section (its link box matches the icon's position). Screenshot: `audit/broken-link_meditation_retreat_moksha-1440x900.png`. The other two are presumed to be the flame and fan icons (not confirmed).
- **Copied template content:** the retreat link names above look like leftovers from another business's template. Treat as copied content until the owner says otherwise.
- No other menu item or button is broken. The only 404s are the three homepage icon links.

## Phone and email links
- Header and body phone: `tel:402-465-0000` on every page. Visible, tappable link text "402-465-0000". The AC repair page uses `tel:+14024650000`.
- Second number: "C: 402-499-4518" on /contact-us (plain text, not a link).
- Email: `mailto:jory@comforttechs.com`, shown as text on the contact and employment pages.

## Titles and H1s
| Page | Title | H1 |
|---|---|---|
| / | ComfortTechs | Keyword string: "Comforttechs-Air conditioner, air conditioning repair, ac repair, furnace, … -Lincoln, Nebraska" |
| /maintenance-packages | Air Conditioning \| Furnace \| Maintenance \| Lincoln NE — ComfortTechs | Same keyword string |
| /contact-us | Contact — ComfortTechs | Empty, then the keyword string |
| /employment-1 | Employment — ComfortTechs | "Contact Us" (wrong heading for the page) |
| /schedule-service | Schedule Service — ComfortTechs | Schedule Service |
| /payment | Payment — ComfortTechs | None |
| /financing | **Fiancing** — ComfortTechs | None (typo in title) |
| /waterfurnace-geothermal | Geothermal — ComfortTechs | Keyword string |
| /geothermal-products | Geothermal Products — ComfortTechs | "Geothermal Heat pumps", then keyword string |
| /heater-installation | Heating \| Furnaces \| Lincoln, NE — ComfortTechs | Keyword string |
| /heater-repair | Furnace \| Heating Repairs \| Lincoln NE — ComfortTechs | Keyword string |
| /air-conditioner-installation | Air Conditioning\| Lincoln NE — ComfortTechs | Keyword string |
| /air-conditioner-repair | Air Conditioning Repair \| Lincoln NE — ComfortTechs | Keyword string |
| /american-standard-products | American Standard Heating and Cooling — ComfortTechs | Keyword string |
| /mitsubishi-electric-products | Mitsubishi Electric Products — ComfortTechs | Keyword string |
| /about-us-1 | About Us — ComfortTechs | Keyword string |

## Addresses and phones (as shown on the site)
- 540 Blue Heron Drive, Lincoln, NE 68522 (footer on every page; /contact-us). Consistent across pages.
- Phones: 402-465-0000 (main, P:), 402-499-4518 (C:, /contact-us).
- Email: jory@comforttechs.com.
- No Google address comparison was run in this pass (the Google profile was not opened).

## Word counts (desktop, body text)
/ 462 · /maintenance-packages 513 · /contact-us 168 · /employment-1 114 · /schedule-service 106 · /payment 93 · /financing 168 · /waterfurnace-geothermal 438 · /geothermal-products 485 · /heater-installation 472 · /heater-repair 489 · /air-conditioner-installation 592 · /air-conditioner-repair 759 · /american-standard-products 572 · /mitsubishi-electric-products 190 · /about-us-1 399.
Thin pages: /payment, /schedule-service, /employment-1, /financing (under 170 words each).

## Mobile (390 px)
- No sideways scroll on 15 of 16 crawled pages.
- **/air-conditioner-installation** scrolls sideways: page width 415 px on a 390 px screen. Screenshot: `audit/air-conditioner-installation-390x844.png` (the 390 render of the page).
- Phone link visible at 390 px on all pages.

## Copy problems
- Keyword-stuffed H1 on 12 of 16 pages (see table).
- "Copyright © 2022" in the footer; the site says "SINCE 2007" (https://www.comforttechs.com/). The footer year is out of date.
- Title typo "Fiancing" on /financing.
- Two menu items each for ABOUT US, PAYMENT, GEOTHERMAL, EMPLOYMENT, and two contact routes.
- Copied retreat links on the homepage (see Menu and buttons).

## Trust and claims
- Testimonials: none found in the text of the crawled pages.
- Claims stated, not verified: "NATE-certified technicians" (homepage, several service pages); "a trusted member of the Better Business Bureau" (/heater-installation); "fully licensed and insured" (/commercial-hvac); "our licensed technicians" (/air-conditioner-installation); "full warranties on AC and heating system equipment, parts and labor" (/air-conditioner-installation).
- Hours and 24/7 claims conflict (see facts.md, Conflicts).

## Other checks
- Speed: not measured.
- Facebook or Google profile: not opened in this pass.
