# Current-site audit: Thermal Services, Inc. (TSI)

Site: https://www.tsipeoria.com/ (17 pages found by crawl; 14 crawled plus 3 footer pages checked directly)
Run date: 2026-11-15. Playwright Chromium. Widths: 1440x900 (desktop, all pages) and 390x844 (mobile, all pages).
Nothing submitted. No form was typed into or sent.
Screenshots: `audit/` in this folder. Raw crawl data: none saved here (kept in scratch).

## Contact form (for the demo route)

- **URL:** https://www.tsipeoria.com/contact-us (form is on the page itself, not in an iframe)
- **Method / action:** not captured in DOM (form element has no `action` attribute); form widget ID `10712c98`.
- **Fields (in order):**
  1. First Name, text, required (aria-required=true)
  2. Last Name, text, required
  3. Phone, tel, required
  4. Email, email, required
  5. Service Type, select, optional. Options: "Please Select", "Commercial", "Residential"
  6. Message, textarea, optional
- **Required fields:** First Name, Last Name, Phone, Email.
- **maxlength:** none set on any field.
- **Submit control:** a blue "SUBMIT" button is visible in the screenshot. My DOM query did not return it as a button or input inside the form, so I could not confirm its element type. Not clicked.
- **CAPTCHA:** none visible. The page loads Google reCAPTCHA's script (`api.js?render=explicit`), but no reCAPTCHA widget, badge or iframe is rendered, and `window.grecaptcha` is undefined after load. Treat as no CAPTCHA seen on 2026-11-15; re-check before any send.
- **iframes on the contact page:** none in the form. Site-wide iframes are chat or accessibility widgets (rlets.com, cdn.wishpond.net).
- Screenshot: `audit/contact-form-1440x900.png`.

## What works

- **Header menu:** SERVICES, COMMERCIAL, RESIDENTIAL, HEATING, AIR CONDITIONING, GENERATORS, MAINTENANCE, PRODUCTS, SPECIAL EQUIPMENT, Q&A, GALLERY, PROMOTIONS, CONTACT US. All open a page returning 200 at both widths.
- **Footer:** Privacy Policy (200), Accessibility Statement (200), Sitemap (200, 80 words).
- **Social links** in the footer point to facebook.com/TSIPeoria/, instagram.com/tsipeoria/, a Yelp page, a Google review link and a BBB profile. I did not open these.
- **Phone links:** every `tel:` link uses `tel:3093245317`, which is the site number 309-324-5317. At 390 px the header phone icon is visible and tappable (x=314, 78x19 px). The "CALL NOW" links and the "309-324-5317" text links are visible at 390 px.
- **Titles and H1s:** every page has a unique title and an H1 that matches its topic. Minor: /products title ends with an empty segment ("Products |"); /qas title has no city.

## What's broken or weak, most costly first

### 1. Phone number conflict
- The site number (309) 324-5317 appears on every page and in every tel link. The listing number the brief gives is (309) 699-3333. One of the two is out of date. Not changed here. Put it on the onboarding list. See facts.md, Conflicts.

### 2. Thin pages
- /gallery: 61 words. /services: 68 words (heading "Services" with a "Maintenance" heading and the CTA bar only). /promotions: 118 words.
- Sub-service pages are fine (379 to 652 words).

### 3. Mobile
- Horizontal overflow: scrollWidth 392 against 390 on every page at 390 px. 2 px only. The 390 homepage screenshot is clean (`audit/home-390x844.png`). Not a real problem.

### 4. Promotions copy has no dates
- "$500 OFF Complete HVAC System Replacement" and "$250 OFF Furnace Replacement" say "Now through end of the year" with no year. Unverified whether they are still running.

### 5. Placeholder check
- No "lorem", "example.com", "placeholder", or "slide title" text found in visible text or raw HTML on any page.

## Not checked
- Phone calls (tel: links not dialed on a device).
- Google listing content (rating, hours, photos) and Yelp/BBB pages.
- Form submission (not allowed).
- Page speed (no Lighthouse run).

## Pages (crawl, 1440x900 titles/H1/words; 390 px scroll width)

| Page | HTTP | Title | H1 | Words | Scroll width at 390 px |
|---|---|---|---|---|---|
| tsipeoria.com | 200 | HVAC Repair Central Illinois / Home / Thermal Services Inc | Residential & Commercial HVAC in Central Illinois | 1173 | 392px |
| tsipeoria.com/services | 200 | Services / Peoria, IL / Thermal Services Inc | Services | 68 | 392px |
| tsipeoria.com/services/commercial | 200 | HVAC Repair Central Illinois / Commercial / Thermal Services Inc | Commercial | 644 | 392px |
| tsipeoria.com/services/residential | 200 | HVAC Repair Central Illinois / Residential / Thermal Services Inc | Residential | 592 | 392px |
| tsipeoria.com/services/heating | 200 | Heating Repair Central Illinois / Heating / Thermal Services Inc | Heating | 487 | 392px |
| tsipeoria.com/services/air-conditioning | 200 | A/C Repair Central Illinois / Air Conditioners / Thermal Services Inc | Air Conditioning | 508 | 392px |
| tsipeoria.com/services/generators | 200 | Generator Repair Central Illinois / Generators / Thermal Services Inc | Generators | 379 | 392px |
| tsipeoria.com/services/maintenance | 200 | HVAC Maintenance Central Illinois / Maintenance / Thermal Services Inc | Maintenance | 511 | 392px |
| tsipeoria.com/products | 200 | HVAC Products Central Illinois / Products / | Products | 463 | 392px |
| tsipeoria.com/products/special-equipment | 200 | HVAC Products Central Illinois / Special Equipment / Thermal Services Inc | Special Equipment | 652 | 392px |
| tsipeoria.com/qas | 200 | Thermal Services Inc / Q & As | Q&A | 405 | 392px |
| tsipeoria.com/gallery | 200 | Gallery / Peoria, IL / Thermal Services Inc | Gallery | 61 | 392px |
| tsipeoria.com/promotions | 200 | Promotions / Peoria, IL / Thermal Services Inc | Promotions | 118 | 392px |
| tsipeoria.com/contact-us | 200 | Contact Us / Peoria, IL / Thermal Services Inc | Contact Us | 217 | 392px |
