# Current-site audit: Rainforcing Roofing and Exteriors PLLC

Site: https://www.rainforcingroofing.com/ (home H1 "Roofing Company in Peoria, IL: Your Roof Done Right, Priced Upfront, Backed by GAF")
Pages crawled: 45 unique (crawl cap reached, so the site has more). Same list checked at 1440x900 and 390x844. Playwright Chromium, run 2026-11-15. Read-only: no form filled or submitted.
Screenshots: `audit/` (home, contact-us at both widths; and the three pages with sideways scroll at 390 px).

## What works
- **Menu:** Home, About, the town items (Bartonville through La Salle), and Contact all return 200. Service items under the menu also return 200.
- **Internal link checks:** 162 unique links checked, 161 return 200.
- **Broken link:** https://www.rainforcingroofing.com/metal-roofing/ returns **404** (linked from crawled pages, at both widths).
- **Tel links:** tel:309-989-3279 visible in the header and body at both widths. A second tel link uses the encoded form `tel:(309)%20989-3279`; it works in format.
- **Mailto:** rainforcing.roof2022@gmail.com, on /contact-us/ only.
- **Images:** no broken images found.
- **Copyright:** "© 2026 Rainforcing Roofing. All Rights Reserved." on every page.

## Things that don't match QUALIFY.md
- **Email is visible.** QUALIFY.md says "no visible email". /contact-us/ shows a mailto link (rainforcing.roof2022@gmail.com). A personal Gmail-style address.
- **/services/.** QUALIFY.md says the nav links to /services/ and it returns 404. This crawl did not find a /services/ link in the nav or on any crawled page, and I did not request /services/ directly. Not reproduced. The 404 found was /metal-roofing/.

## Page table (sample; the full crawl has 45 pages)

| Page | Title | H1 | Words |
| --- | --- | --- | --- |
| / | Roofing in Peoria, IL \| Rainforcing Roofing & Exteriors | Roofing Company in Peoria, IL: Your Roof Done Right, Priced Upfront, Backed by GAF | 1408 |
| /about-us/ | Trusted Roofing Contractor in Peoria, IL - $0 down financing (GAF Certified) | Premier Roofing Contractor in Peoria, IL | 1352 |
| /miguel-rivera/ | Miguel Rivera - Rainforcing Roofing | Meet Miguel Rivera: A Leader in Illinois Exterior Restoration | 765 |
| /contact-us/ | #1 Roofers in Peoria, IL - Rainforcing Roofing | Contact rainforcing roofing today! | 923 |
| /testimonials/ | Testimonials - Rainforcing Roofing | What Homeowners Are Saying About Rainforcing Roofing & Exteriors PLLC | 1032 |
| /financing/ | Flexible Roof & Exterior Financing in Peoria, IL | Flexible Roof & Exterior Financing in Peoria, IL | 1178 |
| /blog/ | Central Illinois Roofing Blog \| Expert Tips & Storm Advice | Roofing Blog | 188 |
| /roofing-in-peoria/residential-roofing/ | #1 Professional Residential Roofing in Peoria, IL \| Rainforcing Roofing | Residential Roofing in Peoria: Claim Your Free 5-Year Maintenance Plan (A $3,000 Value) | 1404 |
| /roof-replacement/ | Roof Replacement Services in Peoria, IL \| Rainforcing Roofing | **same H1 as /roofing-in-peoria/residential-roofing/** | 1409 |
| /commercial-roofing/ | #1 Commercial Roofing Peoria, IL (Save 30% on Energy) | Commercial Roofing Peoria, IL | 1314 |
| /roofing-in-peoria/emergency-roof-repair/ | 24/7 Emergency Roof Repair in Peoria, IL | 24/7 Emergency Roof Repair Peoria, IL | 1277 |
| /roofing-in-peoria/storm-damage-roof-repair/ | Professional Storm Damage Roof Repair in Peoria, IL | Storm Damage Roof Repair Peoria, IL | 1269 |
| /roofing-in-peoria/siding/ | Expert Siding in Peoria, IL | Siding Installation & Repair Peoria, IL | 1216 |
| /gutters/ | Gutters: Installation & Guards in Peoria, IL | Gutters in Peoria, IL | 1141 |
| /roofers-in-manito/ | [Unmatched] Storm Restoration - Top 1 Roofers in Manito, IL | Your First Choice for Roofers in Manito, IL | 1324 |
| /bartonville-il/ | #1 Roofing in Bartonville, IL \| Rainforcing Roofing and Exteriors | Roofing Company in Bartonville, IL | 1441 |

Town pages (about 17, e.g., Dunlap, East Peoria, Mapleton, Pottstown, West Peoria, Manito, Morton, Pekin, Tremont, Washington, Bloomington, Normal, Germantown Hills, La Salle, Princeton, Glasford, Bartonville) use one template: 1,300 to 1,450 words, and the same service sub-pages under each town.

## What's broken, most costly first

### 1. Sideways scroll on three pages at 390 px
- /miguel-rivera/: 405 px wide on a 390 px phone (slight).
- /why-beware-of-non-compliant-insurance-approvals/: 716 px wide.
- /drones-vs-ladders-...: 696 px wide.
- All other pages: no overflow at 390 px.
- Evidence: `audit/why-beware-of-non-compliant-insurance-approvals-390x844.png`, `audit/drones-vs-ladders-...-390x844.png`, `audit/miguel-rivera-390x844.png`.

### 2. Dead link to /metal-roofing/
- 404 at both widths, linked from crawled pages. Visible to a visitor who follows the link.

### 3. Duplicate H1 and near-identical pages
- /roofing-in-peoria/residential-roofing/ and /roof-replacement/ share the same H1 ("Residential Roofing in Peoria: Claim Your Free 5-Year Maintenance Plan (A $3,000 Value)"), and the same title pattern.
- The town template pages repeat the same paragraphs with the town name swapped.

### 4. Titles that read as ad copy
- "[Unmatched] Storm Restoration - Top 1 Roofers in Manito, IL"; "Top 1 Roofers in La Salle, IL [Get Your Storm Restoration Quote]"; "#1 Roofing in Bartonville, IL". Cost: search results read as spam.

### 5. Forms hidden on most pages; one visible form on the contact page
- Most pages carry two or three forms, but most are hidden at desktop width (inside a hidden panel). The visible form on /contact-us/ is the one to use.
- No CAPTCHA.

### 6. Owner email is a personal Gmail-style address
- rainforcing.roof2022@gmail.com on /contact-us/. Cost: trust.

## Contact form (route)
- URL: https://www.rainforcingroofing.com/contact-us/ (visible form; also in hidden panels on home and town pages).
- Fields: First Name (text), Last Name (text), Phone (tel), Email (email, **required**), Services (text), How Can We Help? (textarea), SMS consent checkbox ("I Consent to Receive SMS Notifications, Alerts & Occasional Marketing Communications").
- Button: "Get Your Estimate!" (form method POST; action not set in markup).
- Required fields: Email only.
- Maxlength: none set.
- iframe: Google Maps embed (contact page).
- CAPTCHA: none. A call-tracking script (gstatic call-tracking) loads on the contact page. Not tested.

## Speed and mobile
- Load time (single headless run, not Lighthouse): 1.6 to 3.2 seconds across pages; /bartonville-il/roof-repair/ 3061 ms; /bartonville-il/storm-damage-roof-repair/ 2977 ms.
- No PageSpeed or Lighthouse score was run.

## Hours, addresses, phones
- Hours (home): "Monday - Saturday: 7AM - 8PM Sunday: 8AM - 3PM" (https://www.rainforcingroofing.com/).
- Address (site Google link text on every page): 8701 N University St STE A, Peoria, IL 61615.
- Phone: (309) 989-3279 on every page.
- A BBB search snippet lists 309-247-8116. **Conflict** (listing only; unverified).

## Placeholder and copied content
- No lorem ipsum or "Company Name" placeholder found.
- Town pages: same copy under each town name. The town pages are the copied-content issue.

## Not checked (and why)
- Form submission: not submitted, per brief.
- Phone dialing: no phone device.
- Google profile: not opened.
- BBB: fetch returned 403. See facts.md.
