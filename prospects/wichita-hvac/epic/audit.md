# Current-site audit: Epic Heating & Cooling

Site: https://epichvac.net/ (redirects to https). Checked 2026-11-09 with Playwright (headless Chromium) at 390x844 (mobile, touch) and 1440x900 (desktop). Method per `docs/runtime/SITE-AUDIT.md`. Screenshots are in `audit/`.

**Method note.** Plain curl from this environment got a Cloudflare "Sorry, you have been blocked" 403 on every page. Playwright loaded every page normally, so all results below come from the browser. Whether that Cloudflare rule affects real visitors or search crawlers is not checked.

**Not checked:** page-speed score (no PageSpeed run), Sitebulb export (none supplied), horizontal overflow at phone width (not measured), Google Business Profile hours (not opened), form submission (not submitted, by rule), and whether the Synchrony financing link works from a customer device (see finding 1).

## What works

- **Phone links dial the shown number.** Every visible number is `tel:+13166338097`, which is 316-633-8097. Header, footer and the contact block each carry one tappable link at both sizes. The only number on the site is the Wichita line.
- **Email link matches.** Footer and contact block: `mailto:justin@epichvac.net`, same address as the visible text.
- **Nav links go where they say** (both sizes, verified by clicking): Home to `/`, Services to `/services/`, Preventive Maintenance Plans to `/preventive-maintenance-plans/`, Contact to `/contact/`. Mobile "Menu" button opens the nav.
- **"Schedule Your Service"** (hero) goes to `/contact/` at both sizes.
- **"Read More"** (maintenance section) goes to `/preventive-maintenance-plans/` at both sizes. The destination is the right URL, but the content does not match (finding 2).
- **Contact form present** on the homepage and on `/contact/`, `/services/`, `/preventive-maintenance-plans/`. Gravity Forms with a Google reCAPTCHA v2 widget (iframe `google.com/recaptcha/api2/anchor`).
- **Copyright is current:** "© 2026, Epic Heating & Cooling. All Rights Reserved."
- **Custom 404 page** at a bogus URL, with the phone and email still shown.
- **No placeholder or template text found.** No "Samantha", lorem ipsum, "copy-of" pages, "mysite" or "example" addresses, or sample testimonials in the crawl text or page sources of the four pages.
- **Titles and H1s are unique per page** (no duplicate titles).

## What is broken, most costly first

### 1. Financing link leads to a page the browser cannot open (two places, both open a new tab)
- **Where:** nav "Financing" and the homepage "Get Financed" button. Both `href="https://www.synchrony.com/mmc/HY198993200"`, `target="_blank"`.
- **What I clicked:** Financing in the nav and Get Financed on the homepage, at both sizes.
- **What happened:** a new tab opened on `synchrony.com/mmc/HY198993200` and showed **"Access Denied"** (Akamai, reference #18.d65ec817.1794229361.2f478f7f). Same result at 390 and 1440. Screenshots: `audit/financing-link-desktop-access-denied.png`, `audit/financing-link-mobile-access-denied.png`.
- **Second check, different tool:** a WebFetch of the same URL returned Synchrony's "404 ERROR PAGE NOT FOUND" page, which names the merchant as "Epic heatingcooling" and says the page "doesn't exist or cannot be found". So the merchant link may be wrong, not just blocked for our browser. Either way, the visible financing offer ("promotional financing ... pay over time") does not reliably reach a working page from here.
- **Why it costs most:** financing is one of the three main calls to action on the homepage, and it sends the visitor to a new tab that fails.

### 2. "Preventive Maintenance Plans" page does not describe a maintenance plan
- **Where:** nav item, homepage "Read More" under "MAINTENANCE PLANS" (promises: "Maximize efficiency with routine maintenance", "Lower energy costs with system check-ups", "Prevent unexpected breakdowns").
- **What I clicked:** nav Preventive Maintenance Plans and homepage Read More, both sizes.
- **What happened:** the page H1 is "Preventive Maintenance Plans", but the body is about **when to replace an air conditioner** ("We may recommend replacement when... The unit is more than 10 years old") and a sub-heading "Honest Assessments for Your AC Needs". There is no plan content: no visit list, no price, no sign-up, no "what is included". Screenshot: `audit/preventive-maintenance-390x844-full.png`, `audit/preventive-maintenance-1440x900-full.png`.
- **Why it matters:** a visitor who clicks "maintenance plans" gets a replacement pitch. The page also ends mid-sentence with no full stop.

### 3. Contradictory hours and "24/7" claims
- **Where:** homepage and contact page.
- **What happened:** homepage says "24/7 Availability" and "Our emergency services are available around the clock"; contact block says "24/7 Emergency Services Office" directly above "Monday–Friday: 8:00 AM-5:00 PM". No weekend or after-hours number is given separately.
- **Why it matters:** a homepage visitor with a no-heat emergency on a Saturday gets two conflicting answers.

### 4. Headline and titles name no trade-plus-town
- Homepage H1 "Comfort Solutions Simplified" (no work, no town). Homepage title "HVAC Services for Home & Business | Epic Heating and Cooling" (no town). Services H1 "Residential and Commercial HVAC Services" (no town). Maintenance H1 "Preventive Maintenance Plans" (no town). Contact H1 "Get in Touch With Us Today!" (no town).
- "Wichita" appears only in the tagline "Residential & Commercial HVAC in Wichita, Kansas" and the footer "Serving Wichita, KS and Surrounding Areas".

### 5. No street address anywhere on the site
- Contact block: "Serving Wichita, KS and Surrounding Areas", phone, email, hours. No street address on any page crawled.
- Google profile address: 339 N West St, Wichita, KS 67203 (from the brief and `reviews.json`). Unclaimed Birdeye listing shows a different address: 224 N Pennsylvania Ave, Wichita, KS 67214 (https://reviews.birdeye.com/epic-heating-cooling-165371343421354). Which address is current is an open question.

### 6. Services all sit on one page; no service pages
- Seven services on `/services/`: Air Conditioning, Ventilation, Heat, Water Source/Geothermal, WiFi Thermostats, Geothermal, High Efficiency Systems, Custom Sheetmetal Fab Shop. Each is a heading and a short paragraph. No service has its own URL.
- Copy typo visible on the page: "We offer for residential new construction HVAC systems".

### 7. Brand and credential claims that are not backed on the site
- Services page: "We are Bosch dealer, ground and water source heat pumps." No Bosch link appears on the page (checked in the link list at both sizes). Bosch's own residential installer locator is a JS tool that could not be queried from here (see facts.md). **Unverified.**
- Homepage: "Licensed Master Mechanical technicians". No license number, no state or city licence shown. **Unverified.**
- Warranty and guarantee: "We guarantee 100% satisfaction with all our work." No written warranty terms on the site.

### 8. Minor
- Site is WordPress (Yoast sitemap, last modified 2024-11-05; Gravity Forms; a Cloudflare block page names wpenginepowered.com). The brief guessed Wix/WordPress; the evidence says WordPress.
- Three tel links per page; one is hidden in the mobile nav. Harmless.
- The "Get In Touch!" form on the homepage is Gravity Forms with a reCAPTCHA textarea (`g-recaptcha-response`) and hidden fields. Form fields are Name*, Phone*, Email*, Message (optional). Submit button is labelled "Submit".

## Forms (not submitted)
- **Homepage form** (`/`): fields Name, Phone, Email, Message; reCAPTCHA v2 iframe present.
- **Contact form** (`/contact/`, `gform_2`, action `/contact/`): fields Name*, Email*, Phone*, Message (optional); reCAPTCHA v2. Screenshots `audit/contact-form-390x844.png`, `audit/contact-form-1440x900.png`.
- Whether the form sends and where the notifications go: **not tested** (no submission, by rule).

## Office and numbers
- One office on the site: Wichita. One phone: 316-633-8097. One email: justin@epichvac.net.
- Google matches the phone (316) 633-8097 and the name "Epic Heating & Cooling".

## Title and H1 per page
| Page | Title | H1 |
| --- | --- | --- |
| `/` | HVAC Services for Home & Business \| Epic Heating and Cooling | Comfort Solutions Simplified |
| `/services/` | HVAC Services for All Needs \| Epic Heating and Cooling | Residential and Commercial HVAC Services |
| `/preventive-maintenance-plans/` | Reliable HVAC Maintenance Plans \| Epic Heating and Cooling | Preventive Maintenance Plans |
| `/contact/` | Reach Out for HVAC Services \| Epic Heating and Cooling | Get in Touch With Us Today! |

## Site versus Google profile
- **Name:** matches ("Epic Heating & Cooling" on the site footer; "Epic Heating and Cooling" in titles and body).
- **Phone:** matches (316-633-8097 = (316) 633-8097).
- **Services:** HVAC only on both (Google categories HVAC contractor, AC contractor).
- **Address:** site shows none. Google 339 N West St. Birdeye (unclaimed) 224 N Pennsylvania Ave.
- **Hours:** site says Mon–Fri 8–5 plus "24/7 emergency". Google hours not opened, so unverified.

## Speed
- Not measured. No PageSpeed run was done in this pass.

## Sitebulb
- No export supplied. Not checked.
