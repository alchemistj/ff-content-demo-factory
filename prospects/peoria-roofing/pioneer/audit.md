# Current-site audit: Pioneer Roofing

Site: https://roofingpeoria.net/ (home H1 "ROOFING CONTRACTOR PEORIA, IL")
Pages crawled: 45 unique (crawl cap reached, so the site has more; 36 are town pages). Same list at 1440x900 and 390x844. Playwright Chromium, run 2026-11-15. Read-only: no form filled or submitted.
Screenshots: `audit/` (home and contact-us at both widths).

## What works
- **Menu:** HOME, SERVICE AREA, CONTACT US all load (200). Metal service pages (Metal Roofs, Commercial Metal Roofing, Residential Metal Roofing, Standing Seam Metal Roofs, Corrugated Metal Roofs, Metal roof installation & design) load (200).
- **"SERVICES" menu item** links to `#`. It is a dropdown toggle, not a page. The dropdown items all load.
- **Tel link (309) 865-5471** in the header and body, visible at both widths. Format tel:13098655471 is valid.
- **Contact form** loads (see the form section).
- **No broken pages:** no 4xx or 5xx on any page load at either width. QUALIFY.md reported a 520 on one earlier check; not reproduced here.
- **Link check:** a non-browser request check returned 202 for most links. Browser loads of the same pages returned 200. Treated as inconclusive, not as broken.
- **Images:** no broken images found.
- **Placeholder text:** none found in the crawled text.

## Page table (sample)

| Page | Title | H1 | Words |
| --- | --- | --- | --- |
| / | Home - Pioneer Roofing - Peoria IL | ROOFING CONTRACTOR PEORIA, IL | 1582 |
| /contact-us/ | Contact Us - Pioneer Roofing - Peoria IL | Get In Touch With Us | 79 |
| /metal-roofs/ | Metal Roofs - Pioneer Roofing - Peoria IL | METAL ROOFS | 261 |
| /commercial-metal-roofing/ | Commercial Metal Roofing - Pioneer Roofing - Peoria IL | COMMERCIAL METAL ROOFING | 264 |
| /residential-metal-roofing/ | Residential Metal Roofing - Pioneer Roofing - Peoria IL | RESIDENTIAL METAL ROOFING | 273 |
| /standing-seam-metal-roofs/ | Standing Seam Metal Roofs - Pioneer Roofing - Peoria IL | STANDING SEAM METAL ROOFS | 286 |
| /corrugated-metal-roofs/ | Corrugated Metal Roofs - Pioneer Roofing - Peoria IL | CORRUGATED METAL ROOFS | 265 |
| /metal-roof-installation-design/ | Metal roof installation & design - Pioneer Roofing - Peoria IL | METAL ROOF INSTALLATION & DESIGN | 294 |
| /service-area/ | Service Area - Pioneer Roofing - Peoria IL | Metal Roofing Professional in IL | 243 |
| /pioneer-roofing-experts-in-bartonville-il/ | Pioneer Roofing Experts in Bartonville, IL - Pioneer Roofing - Peoria IL | Pioneer Roofing Experts in Bartonville, IL | 918 |

Town pages (36 in the crawl, e.g., Bartonville, Bellevue, Canton, Chillicothe, Creve Coeur, Danvers, Delavan, Dunlap, East Peoria, Elmwood, Eureka, Farmington, Germantown Hills, Glasford, Hanna City, Heritage Lake, Lacon, Lake Camelot, Mackinaw, Manito, Marquette Heights, Metamora, Minier, Morton, Norris, North Pekin, North Peoria, Pekin, Peoria, Peoria Heights, Princeville, Richmond, Roanoke, Rome, South Pekin, Walnut) each have an H1 "Pioneer Roofing Experts in [town], IL" and 787 to 985 words, in one template.

## What's broken, most costly first

### 1. A second phone number on every town page
- 36 town pages have a "PHONE" button (tel:13213992147) that dials **(321) 399-2147**. The area code 321 is not a Peoria number.
- The visible number on every page is (309) 865-5471.
- Evidence: the tel link in the crawl data for /pioneer-roofing-experts-in-bartonville-il/ (text "PHONE", href tel:13213992147), and the other 35 town pages.
- Cost: a visitor on a town page who taps PHONE calls a different number from the one shown on the rest of the site.

### 2. Thin contact page
- /contact-us/ has 79 words: the H1 "Get In Touch With Us" and the form. No address, hours or map text besides the embed.
- Cost: nothing on the page says who the company is or where it is.

### 3. "SERVICES" menu item is a dead toggle
- Links to `#`. Clicking it opens the dropdown; it does not go to a services page. Not a broken link, but no services landing page exists.

### 4. Services H1s are not city-specific
- Metal service pages have H1s with no city ("METAL ROOFS", "COMMERCIAL METAL ROOFING", etc.). The town pages name the city but the body is one template.
- Cost: the service pages do not rank for "[service] in Peoria, IL" by their H1.

### 5. Copied town pages
- 36 town pages share one template with the town name swapped (787 to 985 words each).
- Cost: duplicate content across the site.

### 6. Contact form has no CAPTCHA widget at load
- See the form section. The page source mentions reCAPTCHA, but none is rendered.

## Contact form (route)
- URL: https://roofingpeoria.net/contact-us/ (the same form, Divi contact module, is on the home page, metal service pages and town pages).
- Fields: Full Name (text), Phone Number (text), Email Address (text), Location - City, State (text), Job Description/Details (textarea), "Are you interested in solar for your roof?" (select with 3 options).
- Button: SUBMIT. Form method POST; action is the page URL.
- Required fields: none marked required in markup.
- Maxlength: none set.
- iframe: Google Maps embed (contact page).
- CAPTCHA: no widget, badge, reCAPTCHA site key or grecaptcha object at load on /contact-us/ (checked in browser). The page source contains a reCAPTCHA string; whether it appears only on submit is unknown.

## Speed and mobile
- Sideways scroll at 390 px: none. All pages 390/390.
- Load time (single headless run, not Lighthouse): /contact-us/ 2637 ms; home 2740 ms; town pages 430 to 1900 ms.
- No PageSpeed or Lighthouse score run.

## Hours, addresses, phones
- Address: 202 SW Center St, Peoria, IL 61605 (site text, town and home pages).
- Phone: (309) 865-5471 (site visible, tel link).
- Second phone: (321) 399-2147 on town pages (see finding 1).
- Hours: not found on the site. **Unverified.**

## Copyright
- No copyright line found on the crawled pages.

## Not checked (and why)
- Form submission: not submitted, per brief.
- Phone dialing: no phone device.
- Google profile: not opened.
- BBB and Illinois SOS: see facts.md.
