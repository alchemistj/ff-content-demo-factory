# Current-site audit: JG Roofing and Company

Site: https://www.jgroofingco.com/peoria (also home https://www.jgroofingco.com/)
Pages crawled (6 unique, all HTTP 200): /peoria, /, /services/, /projects/, /about/, /reviews/
Widths: 1440x900 and 390x844. Playwright Chromium, run 2026-11-15. Crawl was read-only: no form was filled or submitted.
Screenshots: `audit/` in this folder (home, peoria, services, projects, about, reviews at both widths).

## What works
- **Menu (HOME, SERVICES, PROJECTS, ABOUT, REVIEWS, CONTACT, CALL OR TEXT).** Every internal link returns 200 at desktop width. "CONTACT" goes to the home page, where the form is.
- **Internal link checks:** 14 unique links checked, all 200. No 404s.
- **Send button** on the form. Not clicked, per the brief.
- **Tel link in the menu** ("CALL OR TEXT", tel:309-316-3652) is visible at both widths.
- **Mailto** amanda@jgroofingco.com is visible on every page.
- **Titles and H1s:** all pages have a title. Only the home H1 and /peoria H1 are clear; see the table.

## Page table

| Page | Title | H1 | Words |
| --- | --- | --- | --- |
| /peoria | Roofing Contractor in Peoria, IL \| JG Roofing and Company | Roofing Contractor in Peoria, IL | 904 |
| / | Roofing Company Serving Peoria, IL \| JG Roofing and Company | Roofing Company Serving Peoria, and All of Central Illinois | 468 |
| /services/ | Reliable Roofing, Gutters & Siding Services in Peoria, IL | Professional Roofing Services in Peoria, IL - Installation, Repair & More | 251 |
| /projects/ | Recent Roofing Projects in Peoria, IL \| JG Roofing | We love serving our community. Here's a few of our local projects | 53 |
| /about/ | About Us - Licensed & Insured Roofing Company \| JG Roofing | **none (empty H1)** | 119 |
| /reviews/ | Customer Reviews for JG Roofing \| Trusted Roofing in Peoria, IL | See What People Have To Say About Us | 244 |

## What's broken, most costly first

### 1. Sideways scroll on every page at 390 px (the phone view is 1225 px wide)
- `scrollWidth` 1225 against a 390 px viewport on all six pages.
- Evidence: `audit/home-390x844.png`, `audit/peoria-390x844.png` and the other 390 px screenshots.
- Cost: most local roofing search happens on a phone. A visitor has to scroll sideways to read the page.

### 2. Two different phone numbers on the same page
- Visible contact block (home and /peoria): "Phone Number: 309-567-8236" and "(309)-567-8236".
- Tel links (header "CALL OR TEXT" and the other tel links): tel:309-316-3652.
- Cost: a visitor who taps the button and a visitor who reads the number reach different lines. Confirm which line is live.

### 3. The About page has no H1 and is thin
- /about/ has 119 words and an empty H1. Its title and meta description are fine.
- Cost: the page says almost nothing specific about the company.

### 4. Services are one page, with a generic H1
- /services/ names "Siding", "Traditional Asphalt Shingles", "Metal Roofs", "Gutters", "Warranty", "Storm Damage", and "Estimates" in one list of 251 words. No separate page for any service.
- Cost: no page names one service and the city in its H1, which is the gap a demo fills.

### 5. Contact form has no action attribute and no CAPTCHA
- Form (every page): action not set in markup (JS-driven), method GET in the DOM. Fields: Name (text, optional), Phone (tel, optional), Email (required), Project Details (textarea, optional). Button: "Send". No CAPTCHA widget, no reCAPTCHA or hCaptcha script on /peoria.
- An embedded third-party HTML frame ("Embedded Content", filesusr.com) is on /peoria. Not identified.
- Cost: the form is easy to use, but whether it sends is unknown (not submitted, per brief).

### 6. Testimonials and claims are stated, not verified
- Reviews on the home and /reviews pages name José, Amanda, Joel Hacker, Matthew Lawson, Teresa Cranford. Not checked against Google.
- "BBB A+ accredited" appears on /about/ and in the meta description. No BBB record was found (see facts.md).

## Form (contact route)
- URL: https://www.jgroofingco.com/peoria (same form on /, /services/, /projects/, /about/, /reviews/).
- Fields: Name, Phone, Email (required), Project Details. Button: Send.
- Required fields: Email only.
- Maxlength: Name 100, Phone 50, Email 250. Project Details has none.
- iframe: one, on /peoria (embedded content, unidentified).
- CAPTCHA: none seen in the page at load.

## Speed and mobile
- Load time (single headless run, not Lighthouse): /peoria 2970 ms, / 1062 ms, /services/ 744 ms, /projects/ 749 ms, /about/ 897 ms, /reviews/ 2071 ms.
- No PageSpeed or Lighthouse score was run.
- Broken images: none found.

## Placeholder and copied content
- No lorem ipsum or placeholder text found in the visible text.
- Testimonial text on the home page reads as a real review; not verified.

## Other checks
- **Copyright line:** none found.
- **Hours:** Mon-Fri 7am-7pm, Sat 7am-7pm. Sunday is not listed.
- **Addresses found:** 1010 W Northcrest Ave, Peoria, IL 61614 (only one). No second office on the site.
- **Multi-location:** no evidence of more than one office on the site.

## Not checked (and why)
- Form submission: not submitted, per brief.
- Phone dialing: no phone device.
- Google profile: not opened.
- BBB and Illinois SOS: see facts.md.
