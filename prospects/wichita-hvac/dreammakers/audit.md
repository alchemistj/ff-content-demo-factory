# Current-site audit: Dream Makers LLC Heating and Cooling

Site: https://heatingandcooling.online/ | Audited 2026-11-10 (UTC session) with Playwright (Chromium), 390x844 and 1440x900. Read-only: no form was submitted and nobody was contacted. Earlier attempt on 2026-11-09 was blocked by HTTP 502 on every URL; this run reached the site.

## Top problems, most costly first

1. **Five homepage service cards send Wichita visitors to Texas pages under another company's name.** The visible cards "Furnace Repair & Replacement", "Heater Installation & Service", "HVAC Parts Replacement & Maintenance", "Air Conditioner Repair" and "Air Conditioner Installation & Service" (homepage, y about 2,480 to 2,870 px at 1440) link to `/furnace-repair-and-replacement-in-fort-worth-tx/`, `/heater-installation-services-north-richland-hills-tx/`, `/hvac-parts-maintenance-and-replacement-in-fort-worth-tx/`, `/air-conditioner-repair-in-north-richland-hills/` and `/air-conditioner-installation-services-north-richland-hills/`. Their H1s and titles read, for example, "Furnace Repair & Replacement In Fort Worth, TX" and "Furnace Repair & Replacement In Fort Worth TX | Malcolm's Heating And Air". The homepage footer's service list (y about 5,438) also links to Fort Worth pages. Screenshot: `audit/home-service-cards-go-to-fort-worth-1440.png`, `audit/fort-worth-furnace-repair-page-1440.png`.

2. **The number at the top of every Wichita page dials a different area code.** The top-bar text "(316) 871-5085" (desktop, box x 1023, y 19) is a link to `tel:8173337310`, which is 817-333-7310, a Fort Worth-area number. The contact page's visible "(316) 871-5085" in the contact box (y about 800) is also `tel:8173337310`. The Fort Worth pages use 817 for three or four of their call links. The footer and "GET A QUOTE" call links do dial (316) 871-5085 correctly. Hidden "GET A QUOTE" links (not visible at either width) dial `tel:4259995947`, a Washington State (425) number. Screenshot: `audit/home-1440-first-screen.png`, `audit/contact-us-1440.png`.

3. **The site returns errors and is slow.** On the first pass 12 of 20 URLs returned HTTP 502 with body "upstream request failed": about-us, services, air-conditioner-repair, air-conditioner-installation-service, heater-installation-service, hvac-parts-mantainance-replacement, furnace-repair-replacement, blog, gallery, faqs, contact-us and the Fort Worth furnace page. All 12 returned 200 on the first retry, so the failures are intermittent. A visitor can hit an error page. Homepage at 390 px: first paint 7.0 s, DOMContentLoaded 18.8 s, load event 24.4 s; 92 requests, 4.1 MB transferred, 37 scripts. Heaviest scripts: `rs6.min.js` (Slider Revolution) 379 KB, `jquery-ui.js` (quick-call-button plugin) 314 KB, `wp-polyfill` 112 KB, betheme `plugins.js` 197 KB, elementor swiper 136 KB, elementor-pro handlers 131 KB. Images are not the main drag: the largest is `HEADER.jpg` at 98 KB. The brief's measured mobile score (46, first paint 14.5 s, main content 29.9 s) was not re-run with Lighthouse; this run's numbers point the same way.

4. **Leftover template and copy errors that an owner would notice.**
   - Homepage hero: "Years of Experience" has an empty circle, no number (desktop and phone screenshots).
   - Header button reads "GET A QOUTE" (typo); menu item reads "HVAC Parts mantainance & Replacement".
   - Footer address "5720 1/2 S Broadway Wichita, KS 67216" is a link to `#` (dead link).
   - Footer: "Dream Makers Website Developed By Ezeewebs Powered by Top Page Rankers." (developer credit and link, not the business).
   - Email shown on every page is `nathanmaass@live.com` (a personal Outlook-style address, not a business domain).
   - Services page: "Open 24/7 with office staff"; homepage: "Our services are available 24/7". The BBB profile lists Mon-Fri 8:00 AM to 5:00 PM, Saturday and Sunday closed. These disagree and need the owner to confirm.
   - Page titles are inconsistent: Gallery is "Gallery -" (no business name); Services is "Our Services | Dream Makers"; Contact is "Efficient HVAC Services in Wichita, KS | Dream Makers LLC"; About is "Reliable Heating & Air-Cooling Services in Wichita, KS | Dream Makers LLC".

5. **No real reviews, and no H1 on any Wichita page.** No review text, testimonial, star rating or customer quote was found on the homepage or on any of the 12 Wichita pages checked. The only review item is a "Review us on Google" badge image in the hero. No H1 exists on the homepage or on any of the Wichita service pages (H1 "None" for all of them); the only H1s on the site are the Texas pages' H1s listed in problem 1.

## Check results

### 1. H1 and browser tab titles

| Page | H1 (word for word) | Browser tab title |
| --- | --- | --- |
| Homepage `/` | None | Top Class HVAC Services in Wichita, KS \| Dream Makers LLC |
| About us `/about-us/` | None | Reliable Heating & Air-Cooling Services in Wichita, KS \| Dream Makers LLC |
| Services `/services/` | None | Our Services \| Dream Makers |
| Air conditioner repair `/air-conditioner-repair/` | None | Impeccable Air Conditioner Repair in Wichita, KS \| Dream Makers LLC. |
| Air conditioner installation `/air-conditioner-installation-service/` | None | Reliable Air Conditioner Installation & Service in Wichita, KS \| Dream Makers LLC |
| Heater installation `/heater-installation-service/` | None | Premium Quality Heater Installation & Service in Wichita, KS \| Dream Makers LLC |
| HVAC parts `/hvac-parts-mantainance-replacement/` | None | Exceptional HVAC Services in Wichita, KS \| Dream Makers LLC |
| Furnace `/furnace-repair-replacement/` | None | Flawless Furnace Repair & Replacement Service in Wichita, KS \| Dream Makers LLC |
| Blog `/blog/` | None | Latest News & Articles \| Dream Makers |
| Gallery `/gallery/` | None | Gallery - |
| FAQs `/faqs/` | None | Frequently Asked Questions \| Dream Makers |
| Contact `/contact-us/` | None | Efficient HVAC Services in Wichita, KS \| Dream Makers LLC |
| Texas furnace (linked from homepage) `/furnace-repair-and-replacement-in-fort-worth-tx/` | Furnace Repair & Replacement In Fort Worth, TX | Furnace Repair & Replacement In Fort Worth TX \| Malcolm's Heating And Air |
| Texas parts (linked from homepage) `/hvac-parts-maintenance-and-replacement-in-fort-worth-tx/` | HVAC Parts Maintenance & Replacement In Fort Worth TX | HVAC Parts Maintenance & Replacement in Fort Worth TX \| Malcolm's Heating And Air |
| Texas heater `/heater-installation-services-north-richland-hills-tx/` | None | Premium Quality Heater Installation & Service in Wichita, KS \| Dream Makers LLC |
| Texas A/C repair `/air-conditioner-repair-in-north-richland-hills/` | None | Impeccable Air Conditioner Repair in Wichita, KS \| Dream Makers LLC. |

Note: the Texas heater and A/C pages show Wichita titles while their body copy names North Richland Hills, TX. The Texas furnace and parts pages carry the other company's name in the title.

### 2. Phone first screen (390x844)

- Business name: visible as text, "Dream Makers LLC Heating and Cooling" (hero).
- What they do: visible, "Residential & Commercial Servicing Company ... HVAC installation repair services in Wichita" and the hero paragraph.
- Tap-to-call: a "CALL NOW" floating button and a "GET A QUOTE" button (both `tel:3168715085`, correct). The phone number as text is NOT on the first screen; "316-871-5085" appears only inside the logo image. The header phone text is hidden at this width.
- Screenshot: `audit/home-390-first-screen.png`.

### 3. Every `tel:` link

| Link | Dials | Shown text | Visible | Verdict |
| --- | --- | --- | --- | --- |
| Header top bar (all Wichita pages) | 817-333-7310 | (316) 871-5085 | Desktop only | WRONG number |
| Contact page contact box | 817-333-7310 | (316) 871-5085 | Desktop | WRONG number |
| Fort Worth pages' call links | 817-333-7310 (3 to 4 per page) | (316) 871-5085 | Varies | WRONG number |
| "GET A QUOTE" (hidden) | 425-999-5947 | none | Hidden at both widths | Wrong and hidden; not a placeholder shown to visitors |
| Floating "CALL NOW", "GET A QUOTE", footer, page body | (316) 871-5085 | (316) 871-5085 or "GET A QUOTE" | Visible | Correct |
| "Text Now" (header and floating) | `sms:3168715085` | Text Now | Visible | Correct |

The floating "CALL NOW" button's link element has zero size in the DOM, so I could not confirm which element a tap lands on, although its link is (316) 871-5085.

### 4. Menu links

- Top menu: Home `/`, About Us `/about-us/`, Services `/services/`, Blog `/blog/`, Gallery `/gallery/`, FAQs `/faqs/`, Contact Us `/contact-us/`. All returned 200 on the retry. Correct pages.
- Services dropdown (hover on desktop): five Wichita service pages, all 200.
- Dead or empty: footer address `href="#"`; four FAQ questions have `href=""` (accordion toggles, likely intended, not a page).
- Points to Texas pages: the homepage service cards and footer list (see problem 1). Also the mobile menu markup lists Fort Worth and North Richland Hills pages.
- The "GET FINANCED" link goes to a third-party finance application (`ffcapplication.com`). Not checked beyond the link.

### 5. Contact form (not submitted)

- Homepage form (Contact Form 7): Your Name, Your Email, "Choose Service" dropdown (Furnace Repair & Replacement; Heater Installation & Service; HVAC Parts Replacement & Maintenance; Air Conditioner Repair; Air Conditioner Installation & Service), message box, and a submit button (its label was not read). No phone field.
- `/contact-us/` form: Your Name, Your Email, Phone, Your Message, "Send Message". No service dropdown.
- CAPTCHA: none. No reCAPTCHA, hCaptcha or Turnstile was found in the HTML of either page. Spam protection on the form is not visible.

### 6. Placeholder and template text

- No lorem ipsum found on any page checked.
- No sample testimonials found (no review text at all).
- Wrong city: Fort Worth, TX and North Richland Hills, TX on five service pages, and the other company's name "Malcolm's Heating And Air" in their titles. Also "Open 24/7" and "Years of Experience" blank (problem 4).
- Old copyright year: none. Footer reads "©2026", which is the current year.

### 7. Real reviews on the site

None shown. Homepage, About, Services, FAQs, Blog, Gallery and Contact were checked for review or testimonial text. Only a "Review us on Google" badge image appears in the hero, with no review text or star rating.

### 8. Load time and what explains it

Homepage at 390 px (no CPU throttle, so not comparable to the brief's lab score): first paint 7.0 s, DOMContentLoaded 18.8 s, load 24.4 s. Causes seen in the page: 92 requests and 4.1 MB; 37 scripts, several of them full slider and page-builder libraries (Slider Revolution 379 KB, jquery-ui 314 KB from a call-button plugin, betheme 197 KB, Elementor pro 131 KB); intermittent 502 errors from the origin (problem 3). Images are modest; the largest is 98 KB. This is a plugin-weight problem plus an unreliable server, not a photo problem.

## Site versus off-site records (kept from the earlier pass)

| Item | Google (from brief) | BBB profile | Match |
| --- | --- | --- | --- |
| Phone | (316) 871-5085 | (316) 871-5085 | Yes |
| Address | 5720 1/2 S Broadway, Wichita, KS 67216 | 5720 1/2 S Broadway Ave, Wichita, KS 67216 | Yes |
| Hours | not checked | Mon-Fri 8:00 AM to 5:00 PM; Sat and Sun closed | Google hours unverified |
| Name | Dream Makers LLC Heating and Cooling (site title); Google name per brief | "Dream Makers Heating & Cooling", alt "Dream Makers, LLC" | Close; legal name unverified |
| Services | not checked | AC repair, heater install, furnace repair, parts, water heaters | Site matches on AC, heater, furnace and parts; site has no water heater page |

Site-side checks against the BBB notes:
- Site phone (316) 871-5085 and address 5720 1/2 S Broadway match the first BBB profile (Nathan Maass). The second BBB profile (John Salmans, (316) 550-3046, 5720 S Broadway with no 1/2) does not appear on the site.
- Site hours say 24/7 (problem 4); BBB says weekdays only. Needs owner confirmation.

Source for BBB: https://www.bbb.org/us/ks/wichita/profile/heating-and-air-conditioning/dream-makers-heating-cooling-0714-300287228 (read through an automated summary; re-check by hand).

## Screenshots (in `audit/`)

- `home-390-first-screen.png`: phone first screen (390 px).
- `home-390.png`, `home-1440.png`: full homepage at each width.
- `home-1440-first-screen.png`: desktop top bar with the wrong header number.
- `home-service-cards-go-to-fort-worth-1440.png`: homepage service cards that link to Texas pages.
- `contact-us-1440.png`, `contact-us-390.png`: contact page with the wrong contact-box number and form.
- `fort-worth-furnace-repair-page-1440.png`, `fort-worth-furnace-repair-page-390.png`: Texas furnace page with the other company's name in the title.
- `fort-worth-hvac-parts-page-1440.png`, `fort-worth-hvac-parts-page-390.png`: Texas parts page.
- `north-richland-hills-ac-repair-page-1440.png`, `north-richland-hills-ac-repair-page-390.png`: Texas A/C repair page with Wichita title.
- `about-us-*`, `services-*`, `air-conditioner-repair-*`, `air-conditioner-installation-service-*`, `heater-installation-service-*`, `furnace-repair-replacement-*`, `hvac-parts-maintenance-replacement-*`, `blog-*`, `gallery-*`, `faqs-*` (each at `-1440.png` and `-390.png`): full-page captures of the real pages.

The earlier placeholder-named files (identical stubs) were removed and replaced by the captures above.

## Not checked or limited

- Lighthouse score: not re-run (brief's 46 and timings kept as reported).
- Phone-width hamburger menu: the menu button did not open in the test, so its links were read from the page markup, not as a visible menu.
- Form submission: not done, by rule.
- Off-site Google hours and categories: not opened.
- Kansas Secretary of State record, licence numbers and brand dealer status: not checked here (see the onboarding questions in `facts.md`).
