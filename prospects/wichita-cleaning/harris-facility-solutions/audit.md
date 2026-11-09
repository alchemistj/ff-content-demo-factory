# Current-site audit: harrisfac.com (Harris Facility Solutions)

Run 2026-11-09 under docs/runtime/SITE-AUDIT.md. Site: https://harrisfac.com/ (WordPress with Elementor; WS Form contact form; Cloudflare Turnstile).
Method: Playwright (chromium) at 390x844 and 1440x900. A full crawl of every menu-linked page (about 40 per viewport), plus targeted checks. Raw data in audit/data/, screenshots in audit/screens/ and audit/*.png. Nothing submitted. Scripts in scripts/analysis/ (crawl.cjs, digest.cjs, shots.cjs, shots2.cjs, page-text.cjs).

## Headline

The site is a real, working commercial cleaning site with a phone number that dials, a real contact form, and about 60 URLs in its page sitemap. Its problems are mostly about trust and claims. It names two companies, gives three response times, and gives three Google ratings. The menu has dead links on every page. None of this stops a lead, but a prospect who reads closely will see it.

## What works

- **Tap-to-call.** Every tel: link dials (316) 364-1888 (three formats: `tel:316-364-1888`, `tel:3163641888`, `tel:(316)%20364-1888`). Tested in the HTML on home and contact pages. The phone number matches the Google profile.
- **Contact form exists.** WS Form at https://harrisfac.com/contact/ with First Name*, Last Name*, Email*, Phone*, Message*, and a visible Cloudflare Turnstile "Verify you are human" check (audit/screens/contact-form-desktop.png, contact-form-mobile.png). Not submitted.
- **Address and name match Google.** 1245 S. Fabrique Dr, Wichita, KS 67218; "Harris Facility Solutions" on both.
- **Service pages exist.** Office cleaning, hard floor, carpet, retail, industrial, healthcare, day porter, painting, lawn care, federal government contracting: each has its own URL, H1 and title. All return 200.
- **All 21 city pages return 200** (sitemap list, checked with curl).
- **No placeholder text.** No lorem ipsum, "copy-of", sample names or "Write a description" text found on any crawled page.
- **Copyright is current:** "© 2026 Harris Facility Solutions" on every page.
- **Fast server response.** Time to first byte 0.15 to 0.31 s on home, contact and office-cleaning (curl, 2026-11-09). Page HTML about 450 to 670 KB.
- **Images have alt attributes.** All images have an alt attribute; 2 on home are empty (probably decorative).
- **Testimonial matches a real Google review.** The Cheri Hogan quote on the home page ("Very capable, careful family run business...") is the same text as the Google review from Cheri H. (2018-10-16).

## What's broken, most costly first

### 1. Two company names on one site, and the owner's identity is not clear (most costly)
- The team page names **Jordan Harris, "Owner & CEO"** and says he is "a proud co-owner of Dream Clean" and "Owner and CVO of Dream Clean." Lance Harris is "Co-Owner." (https://harrisfac.com/meet-the-team/)
- The home page shows "U.S. Small Business Person of the Year, Kansas". The SBA's 2023 list names the same award as **Harris Dream Clean, LLC** (Jordan Michael Harris). The Harris Facility Solutions site does not say "Dream Clean" on that line.
- The footer, hidden in the page, links to **facebook.com/dreamcleanks** (the Dream Clean page), while the visible footer link is facebook.com/harrisfac.
- Cost: an owner or prospect who searches the name finds "Harris' Dream Clean, LLC" with different addresses (a PO Box per BBB; 770 S Greenwich Rd per WichitaDirect) and a different phone, (316) 727-4269 per WichitaDirect. Any demo copy that says "SBA award" or "since 2015" must name the right entity first. See facts.md section 1.
- Evidence: home-desktop-award-kansas.png; facts.md section 1 (source list).

### 2. The core promise has three different response times
- Home, "Why Our Clients Love Us": "Rather than responding within 24 hours, Harris Facility Solutions, LLC will respond within the hour." Also "Harris Facility Solutions is available 24 hours each day." (audit/screens/home-desktop-response-within-the-hour.png)
- Forms and service pages (contact, services, service areas): "We will be sure to respond with our quote in less than 24 hours."
- Contact page: "We'll be sure to respond within just a few hours."
- Badge on home: "24/7 Immediate Response". Meta description on home: "Avail 24/7 ... 1h response."
- Cost: this is the one promise a buyer compares. A prospect sees 1 hour, a few hours and 24 hours on the same site.

### 3. Three Google ratings and two founding stories
- Home: "4.5 Rating on Google" (audit/screens/home-desktop-rating-4-5.png). Team page, services page, service areas and footer: "5.0 Out of 5-Star Google Reviews". The Google profile in the review pull: 4.8, 22 reviews.
- Home: "Harris Facility Solutions started just a few years ago. At that time, we cleaned one location and our owner was our only employee." Home body and services page: "started our business in 2015" / "launched in 2015." (audit/screens/home-desktop-started-few-years.png)
- Cost: the number a buyer checks first (the rating) is wrong on some pages, and the age is stated two ways.

### 4. Menu: dead links on every page, and the menu is repeated three times in the HTML
- "Menu" (header, two anchors) links to `#`.
- Top-level nav item **"Maintenance"** links to `#` on every page and its dropdown is visible on desktop (audit/screens/desktop-menu-services-dropdown.png). Its dropdown holds the facility types (high schools, daycare, college, call centers, auto dealerships, government buildings, property management, retail stores, credit unions, fitness centers, manufacturing, hospitals).
- A "Toggle" anchor (`#`) appears 4 times in the main content.
- **"Contact"** in the nav has no link at all (href missing). Contact works only through "Get a Quote" and "Send Us A Message."
- Two different "Get a Quote" targets: header button goes to /contact/; the menu item "Get A Quote" goes to /free-quote/ (returns 200; content not read).
- The full 30-item menu appears three times in every page's HTML: once in the section, once in the main nav, once in the mobile dropdown. Hidden copies exist, so it reads as duplication to a screen reader or to search engines.
- Menu includes "Jobs" (/join-our-team/) and "Commission Sales From Home" (/commission-sales-from-home/). Those are recruiting pages in a customer-facing menu.
- Evidence: desktop-menu-services-dropdown.png; digest-mobile.txt lines 307-466.

### 5. Awards stop at 2019, and the SBA award is not the company's own listing
- Listed awards: Expertise.com "2019 Best Office Cleaners in Wichita", "Best of 2018", Thumbtack "Top Pro Award - 2017", Thumbtack "Ranked #1 Cleaning Group in Wichita - 2015". The site says "We are extremely thankful to have received multiple awards over the past few years!" Nothing from 2020 to 2022; the only later item is the 2023 SBA line (see problem 1).
- The Expertise and Thumbtack wording is the same as on the Harris' Dream Clean, LLC listing (https://www.expertise.com/ks/wichita/office-cleaning, read 2026-11-09). The primary Expertise and Thumbtack pages were not checked.

### 6. Footer and SEO clutter
- Footer "Best SEO" links to whitefishmedia.com/services, on every page (vendor credit, opens in new tab).
- Instagram link goes to `instagram.com/popular/harris-facility-solutions/`, a "popular posts" URL, not a company profile (not opened).
- Blog share links are mailto:? links with the post title in the subject (these open a mail composer, which is normal; they are not contact addresses).
- Pages with no meta description: /property-management/, /manufacturing-facilities/, /meet-the-team/, /commercial-cleaning-service-areas/.
- The blog listing (/blog/) and several hardwood posts have no H1.
- /privacy-policy-2/ and /sms-text-messaging-policy/ each have two H1s with the same text.
- Title tags vary in style. Examples: "Wichita's #1 Commercial Office & Janitorial Cleaning" (home, no business name), "Call Us" (hospitals), "| (316) 364-1888" (college campus). The 21 city pages come in two templates: 13 use "[City]'s Top Commercial Cleaning & Janitor Service" for title and H1; 8 use "[City] Commercial Cleaning | "Plan Your Cleaning"" style titles with quoted calls to action (for example Towanda, Maize, Kechi) and H1 "Commercial Cleaning & Janitorial Services in [City], KS".

### 7. Contact page: the form is there, but the site's claims point the buyer to it differently
- The form has no service selector and no field for facility type or square footage. The only spam check is Turnstile (visible). The SMS/Text policy page exists, but the form does not show an SMS consent line in the visible text (not checked in detail).
- The form submits to `/wp-json/ws-form/v1/submit`. Not submitted (per the rules).

### 8. Claims that are not backed on the site
- Square footage "Successfully managing over 1,200,000 sq ft every day" (home).
- "100% Satisfaction Guarantee" (home, services, contact): no terms found.
- "We are more affordable than the big guys" and "a fair price" (home): no prices anywhere.
- "Recommended by Sedgwick County Dept." with a letter from a county contracts officer (recommended-by-sedgwick-county page). Not checked against the county.
- "Harris Facility Solutions is available 24 hours each day" and "24/7 Immediate Response": see problem 2.

## Pages and headings (summary)

| Page | Title / H1 notes |
|---|---|
| / (home) | H1 "Wichita's #1 Commercial Office Cleaning and Janitorial Service" (matches the site's main service). Title lacks business name. |
| /services/ | H1 "Services". Title "Reliable Wichita Janitor & Cleaning Services..." |
| /office-cleaning/ | H1 "#1 Wichita Office Cleaning & Janitorial Services". |
| /hard-floor-maintenance/ | H1 "Wichita Hardwood Floor Maintenance". |
| /carpet-cleaning/ | H1 "#1 Wichita Commercial & Office Carpet Cleaning Service". |
| /day-porter-service-wichita-ks/ | H1 "Wichita Day Porter Maintenance Service". |
| /health-care-cleaning/, /hospitals/ | H1 includes "Medical Office & Hospital" and "Hospital Cleaning". |
| /meet-the-team/ | H1 "Meet The Team". No meta description. |
| /blog/ | No H1. |
| /commercial-cleaning-service-areas/ | H1 "Commercial Cleaning Service Areas". 21 cities. |
| /contact/ | Page title "Contact - Harris Facility Solutions". Form present. |

## Speed

- Server response (curl, 2026-11-09): home 0.31 s TTFB / 0.41 s total; contact 0.15 / 0.24 s; office-cleaning 0.14 / 0.17 s.
- No Lighthouse or PageSpeed score was run (not run in this audit). Page size 450 to 670 KB of HTML, which is heavy for a small site.

## Mobile

- At 390 px, the hero, phone button, "Get a Quote" button and rating badge all render (home-mobile-full.png; contact-top-mobile.png).
- Horizontal scroll was not measured.
- The hamburger opens a menu on mobile (the toggle exists). I did not capture the open menu; my attempt did not open it, so I can't describe its items from a screenshot.

## Digest tables

- Full crawl data: audit/data/crawl-mobile.json, crawl-desktop.json, digest-mobile.txt, digest-desktop.txt. The two viewports matched on every menu link, "#" anchor and tel: link.
- Links: digest-mobile.txt lines 305 to 453 list every link on the home page with its region and visibility.

## Screenshots

- Home, full page: audit/home-desktop-full.png, audit/home-mobile-full.png
- Response times (conflict 2): audit/screens/home-desktop-response-within-the-hour.png
- Rating 4.5 (conflict 3): audit/screens/home-desktop-rating-4-5.png
- Founded "few years ago" (conflict 3): audit/screens/home-desktop-started-few-years.png
- SBA "U.S. Small Business Person of the Year, Kansas" (problem 1): audit/screens/home-desktop-award-kansas.png
- Menu with Maintenance linking to `#` (problem 4): audit/screens/desktop-menu-services-dropdown.png
- Contact form with Turnstile: audit/screens/contact-form-desktop.png, audit/screens/contact-form-mobile.png

## What I couldn't check

- **Contact form submission and the confirmation.** Not submitted (rule). Turnstile was checked only as a visible widget.
- **The hidden Facebook link (dreamcleanks)** is in the DOM and hidden; I did not screenshot a hidden element.
- **Mobile hamburger menu contents.** Not opened in a screenshot.
- **Page speed score** (no Lighthouse run) and horizontal scroll at phone width.
- **Pages that timed out in the browser at network-idle (both widths)**: /contact/, /free-quote/, /join-our-team/, /federal-government-contracting/, /commission-sales-from-home/. All return 200 over plain HTTP, and /contact/ was rendered with a load wait instead. The other four were not rendered in the browser, only checked by status.
- **Content of the 21 city pages and the 8 "-ks" pages** beyond title, H1 and status.
- **Sitebulb export**: none provided for this site.
- **Google listing itself**: taken from reviews.json (4.8, 22 reviews). No live Maps page checked.
- **Instagram and Yelp/other profiles**: not opened.
