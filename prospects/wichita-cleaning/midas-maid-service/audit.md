# Current-site audit: Mida's Maid Service

Site: https://www.midasmaidservice.com/ (Squarespace). Run 2026-11-09 with Playwright at 390x844 (mobile) and 1440x900 (desktop).
Method: docs/runtime/SITE-AUDIT.md. Scripts: scripts/analysis/midas-crawl.cjs, midas-summary.cjs, midas-text.cjs, midas-clicks.cjs, midas-shots.cjs, midas-carousel.cjs. Raw data (crawl and click JSON, saved HTML) is in the session scratchpad, not in this folder.
Nothing was submitted. No form was filled. No outreach.
Screenshots: audit/ (home, about, services, portfolio, contactus at both sizes; broken-services-book-today-*, broken-contact-404-*; contact-form-desktop.png).
No Sitebulb export is in the folder, so no Sitebulb hints.

## Broken, most costly first

### 1. Testimonial on the home page is attributed to the wrong reviewer
- The home page carousel shows Carla B.'s five-star Google review text ("We've been using Mida's for several months now ... nothing like coming home to the smell of a freshly cleaned home!") under the name "Danielle R."
- Danielle R. is the 1-star reviewer (2026-01-26, reviews.json) who says a customer item was taken during a cleaning and disputes the bill. She is the one reviewer on the site's public list who has a live dispute with the owner. Her name is on a 5-star quote she did not write.
- Evidence: the Squarespace slide data holds the quote as the title and "Danielle R." as the description. In the saved home HTML (scratchpad html/desktop-home.html, around lines 4594 and 4847) the attribution `<em>Danielle R.</em>` sits in the same slide as that quote. The quote text matches reviews.json for Carla B. (2026-03-10) word for word.
- Screenshot: not captured. The carousel was mid-transition when I tried to capture that slide, so the image I got showed Brad H. instead. I deleted those misleading images. The HTML is the evidence.
- Cost: visitors read the attribution as a real customer; a quote shown under a name that belongs to a reviewer with a complaint is a credibility and dispute risk for the owner.

### 2. "Book Today" button on the Services page leads to a 404
- https://www.midasmaidservice.com/services, button "Book Today", href /contact. Click lands on https://www.midasmaidservice.com/contact, which returns HTTP 404 (Squarespace default page: "We couldn't find the page you were looking for").
- Confirmed at both viewports (click test and shots script). Screenshots: audit/broken-services-book-today-mobile.png and audit/broken-services-book-today-desktop.png; 404 page: audit/broken-contact-404-mobile.png and audit/broken-contact-404-desktop.png.
- Cost: this is the booking button on the page that lists the services. A visitor who is ready to book hits a dead end. The header "Request a Quote" still reaches /contactus, so the loss is limited to this button, but it is the one written as a booking CTA.

### 3. No H1 on the home page; empty meta descriptions; generic titles
- Home page H1 count: 0 (crawl, both viewports). The headline "A CLEAN SPACE. A HAPPY YOU." is an H2/H3. It does not say house cleaning or Wichita.
- `<title>` on home is "MIDA's Maid Service". No city, no service. Inner pages: "About — MIDA's Maid Service", "Services — MIDA's Maid Service", "Portfolio — ...", "Contact Us — ...".
- Meta description is empty on every page.
- /about, /services and /portfolio have H1s ("About Us", "Our Services", "Portfolio"). /contactus has no H1 (its headings are H2 "Contact Us!").

### 4. Business name is spelled three ways
- Google: "Mida's Maid Service". Site `<title>`: "MIDA's Maid Service". Site body: "Midas Maid Service" (https://www.midasmaidservice.com/about, https://www.midasmaidservice.com/services). Contact page: "Experience the Midas Touch" (https://www.midasmaidservice.com/contactus). Domain: midasmaidservice.com. Logo alt: "MIDA's Maid Service".
- Cost: search matching and trust. The owner's name is Mida, so "Midas" reads like a different company next to the Google listing.

### 5. Services are one page, with no prices, no hours, and no service-area list
- Everything is on https://www.midasmaidservice.com/services: residential room lists, "Commercial Cleaning" (offices, retail, restaurants, medical, churches, warehouses, rental properties), "Green / Eco-Friendly Products", and "Additional Services: Available Upon Request" (oven, fridge, porch, pool house, exterior windows).
- No separate page for house cleaning, recurring cleaning, deep clean, move-out or office cleaning, though the reviews are mostly recurring house cleaning.
- No prices. No hours on any page (searched all page text). Service area is "Wichita and surrounding areas" with no list of towns.

### 6. Contact form: no phone field, free-text service field, invisible reCAPTCHA (not submitted)
- https://www.midasmaidservice.com/contactus: fields First Name (required), Last Name (required), Email (required), Service Request (required; a free-text box, not a dropdown), Message (required). No phone field. One Submit button.
- Spam protection: Google reCAPTCHA Enterprise, invisible (script from google.com/recaptcha, grecaptcha badge present). I did not submit, so I did not check that it sends.
- Screenshot: audit/contact-form-desktop.png.

### 7. Lower priority
- Footer has a zero-size link to /contact (404). It is not visible or tappable, so it is not a user-facing break. Noted for completeness.
- Search page /search exists with a search box (Squarespace default). Not a problem by itself.
- "Fall Cleaning Special, $25 OFF a Fall Deep Cleaning" on the home page has no end date. Copy says "Fall is here". Ask the owner whether it still runs; today is November 9.
- Portfolio: 16 photos, all with the generic "View fullsize" link and filenames as alt text (1P.png, a2a1P.png). The gallery did not render in my full-page capture (audit/portfolio-desktop.png is mostly blank), so I could not judge the photos.
- The home page shows only four testimonials (Brad H., Ryan W., Jennifer N., and the mis-attributed one). The Google rating (4.6, 21 reviews) is not shown. The site leads with "A+ Rated by the Better Business Bureau" instead.

## What works
- Main menu at both sizes: About, Services, Portfolio, Contact Us, and Request a Quote all reach the right page (200). Mobile "Open Menu" opens the menu. Verified in the click test.
- Home "Learn more" goes to /about and "Our Services" goes to /services. The /about page's "Request Estimate" goes to /contactus. All verified in the click test.
- Home carousel Previous and Next move the slides (no link; no 404).
- Phone: every tel: link dials the number it shows: tel:3162953513 for "(316) 295-3513". Present on home, about, services, contactus and others. Only one number on the whole site, matching Google.
- Email: mailto:info@midasmaidservice.com on every page; the href matches the text shown.
- Address: "2514 W Douglas Ave., Wichita, KS, 67203" matches the Google address.
- Portfolio "View fullsize" links open the portfolio page with an itemId parameter (200).
- No placeholder or template text found: no lorem ipsum, no "copy-of", no sample names, no example.com, no "Write a description" text, no wrong city. Checked on every page's visible text.
- No broken internal links other than /contact. All 37 distinct http(s) links were status-checked (see Could not check below for the exceptions).
- No copyright line on any page: the raw HTML has no "©", "Copyright" or year, so there is no stale year to flag.
- sitemap.xml and robots.txt are Squarespace defaults (200).

## Could not check
- **Page speed:** not measured. No PageSpeed key or API call was made, and I did not record a timing score. Not checked.
- **Sitebulb:** no export in the folder. Not checked.
- **Desktop click test coverage:** complete for the home page; partial for /about (the run was cut short when I stopped a stalled job); not run for /services, /portfolio or /contactus at desktop size. Their links were covered by HTTP status checks and by the mobile click test, and the desktop "Book Today" 404 was confirmed by the shots script.
- **External links:** Facebook photos link returned 400 to my fetch; BBB profile returned 403; share.google (Google listing short link) opened a Google "unusual traffic" check page in my browser. None of these could be verified as working. The BBB A+ claim is unverified.
- **Form submission:** not tested (by rule). Whether the reCAPTCHA-protected form sends is not known.
- **Portfolio photos:** gallery did not render in my capture.
- **Google hours and category:** not in reviews.json (I did not pull more). No site-versus-Google hours comparison.
- **Carousel attribution screenshot:** not captured (see item 1). Evidence is the saved HTML.
- **Mobile full-page screenshots of pages with lazy content:** a few sections may not have rendered at capture time.
