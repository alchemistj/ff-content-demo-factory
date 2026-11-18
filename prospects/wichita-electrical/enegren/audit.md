# Current-site audit: Enegren Electric

Site: https://enegrenelectric.com/ (WordPress, OnePress theme). Audited 2026-11-09 with Playwright at 390x844 and 1440x900. Screenshots are in `audit/`.

Pages found: the homepage, `/residential-electrician-wichita-ks/`, `/commercial-electrician-wichita-ks/` and `/gallery/` (found through the sitemap at https://enegrenelectric.com/sitemap_index.xml, not through the menu). Sitemap has four URLs in total (homepage, gallery, residential, commercial).

Note on one check: an early pass showed the phone link, email and contact block as hidden on desktop. That was an artifact of the scroll-reveal animation (the page had not been scrolled). After scrolling the full page, the desktop phone, email, address and form all show. Those are not reported as problems.

## What works

- **Menu:** Desktop and mobile menus both show three links: COMMERCIAL ELECTRICAL SERVICES (`/commercial-electrician-wichita-ks/`), RESIDENTIAL ELECTRICAL SERVICES (`/residential-electrician-wichita-ks/`), and BOOK NOW. The logo goes to the homepage. The mobile hamburger ("Menu", `#0`) opens and shows the same three links.
- **Book Now:** Opens https://book.housecallpro.com/book/Enegren-Electric/64d6b72fb3114112871444e220f167be?v2=true in a new tab. Loads as "Online booking" (HTTP 200). Not booked. Screenshot `audit/check-housecallpro_booking.png`.
- **Phone:** One number on the site, `(316) 613-4400`, as `tel:+13166134400`. The tel link dials the number shown. It matches the Google profile. Shown in the header/contact block at both widths (after scroll).
- **Email:** `mailto:msaucedo@enegrenelectric.com` opens the address shown. It is a real-looking address, not a placeholder. Delivery was not tested (see below).
- **Contact form:** WPForms form on the homepage (`#contact`). Fields: first and last name, phone, email, address, service type (radio: Commercial / Residential), description, Submit. Spam protection: Cloudflare Turnstile (sitekey present). Not submitted. Screenshots `audit/contact-section-desktop.png`, `audit/contact-section-mobile.png`.
- **Pages load:** All four live pages return 200. Titles and H1s are correct on the residential, commercial and gallery pages. No broken images on any page checked.
- **No horizontal scroll** on any page at 390px.
- **Copyright year:** 2026, current. No old year.
- **Google profile matches the site:** Name "Enegren Electric", address 3815 S Midco St, Wichita, KS 67215, phone (316) 613-4400. Google also shows a website link to enegrenelectric.com. Google's visible hours: "Open · Closes 5 PM" today.
- **Sister sites:** Footer links to enegren.com (title "Wichita Managed IT Services Provider | Enegren Technology", HTTP 200) and enegrensecurity.com (title "Wichita Security Systems - Home & Business Security Solutions", HTTP 200). Both load as separate businesses.

## What's broken, most costly first

### 1. The homepage has no visible headline and no visible quote button at the top (both widths)
- **Evidence:** The homepage H1 "Wichita Residential & Commercial Electricians" has `visibility: hidden` on both widths (checked after a full scroll). The "Get a Free Quote" button in the hero is also `visibility: hidden; opacity: 0`.
- **What a visitor sees:** At desktop 1440x900 the first screen is the logo, the three menu links, and a team photo. No words above the fold except the nav. Same on mobile: photo, then "WHY CHOOSE ENEGREN / TRUSTED, SKILLED ELECTRICIANS" (an H2) as the first text. Screenshots `audit/homepage-desktop-viewport-after-scroll.png`, `audit/homepage-mobile-viewport-after-scroll.png`.
- **Why it costs:** The page never says what the business does (electrician, Wichita) in the most prominent place, and the H1 search engines and screen readers see is hidden from people. Cause is in the theme/hero CSS or an animation that never fires; I did not find the cause.

### 2. Service pages are one bullet list each; no page for any single service
- **Evidence:** `/residential-electrician-wichita-ks/` (H1 "Residential Electrical Services", 17 bullets, 184 words) and `/commercial-electrician-wichita-ks/` (H1 "Commercial Electrical Services", 16 bullets, 162 words). The homepage has two service cards only. Site has four pages total (`audit/page-desktop-residential-electrician-wichita-ks.png`, `audit/page-desktop-commercial-electrician-wichita-ks.png`).
- **Named services with no page of their own:** panel upgrades ("Electrical service upgrades", "Electrical panel service upgrades"), EV chargers, generators, surge protection, smoke/CO alarms, hot tub wiring, re-wiring, lighting, inspections, repairs. None of these has a URL.
- **Why it costs:** Someone searching "Wichita panel upgrade electrician" or "EV charger installation Wichita" has no page to land on. The site cannot rank for any one service.

### 3. The only lead paths are the Book Now link and one homepage form; the service pages have no form
- **Evidence:** Residential and commercial pages have no form and no phone number. Their "FREE QUOTE" button links to `https://enegrenelectric.com/#contact`. The homepage form sits at the bottom of a long page. The hero quote button is hidden (problem 1).
- **Form status:** Not submitted, so I cannot say whether a submission is delivered. Console showed CSP errors from the form's Turnstile widget (`connect-src ... data:`), and the Turnstile challenge host failed in our sandbox, so the captcha could not be run here. Treat the form as unverified.
- **Booking:** Book Now goes to Housecall Pro (loads). Not booked.

### 4. The "Gallery" page is WordPress default text with an empty sidebar
- **Evidence:** `https://enegrenelectric.com/gallery/` (title "Gallery - Enegren Electric", H1 "Gallery"). The main column has eight photos. The sidebar shows WordPress default widgets: Search, "RECENT COMMENTS" (empty), "ARCHIVES" (empty), "CATEGORIES: No categories", and "META" with Log in, Entries feed, Comments feed, WordPress.org. Screenshot `audit/page-desktop-gallery.png`, `audit/page-mobile-gallery.png`.
- **Why it matters:** Leftover template content. "Log in" in the footer of a public page is a visible leftover. Not in the menu, so visitors reach it only from the sitemap.

### 5. Leftover and placeholder details
- **Theme credit in footer:** "Copyright © 2026 Enegren Electric – OnePress theme by FameThemes" (every page).
- **Copy error:** Contact block says "Tell us about your electrical project, and we will be touch." (should be "in touch"). `audit/contact-section-desktop.png`.
- **Facebook link:** The footer Facebook icon (https://www.facebook.com/enegrenelectric) has no text. It redirects to a Facebook login page (HTTP 200). I could not read the Facebook page content.
- **Hidden duplicate text:** An H2 "We are Honest | Local | Professional | Enegren" is hidden at both widths. Visitors do not see it. Harmless, but it's leftover.
- **Email is a person's mailbox:** The only email on the site is `msaucedo@enegrenelectric.com`, which matches the name of the team member "Marcus Saucedo - Master Electrician". Delivery was not tested.

### 6. Pages a visitor might guess at return 404
- `/contact/`, `/about/`, `/services/`, `/blog/` all return the site's 404 page ("Page not found - Enegren Electric"). Not linked from the site. Low cost unless the site links to them later.

## Could not check
- **Form delivery:** Not submitted (per instructions). Turnstile could not run in the sandbox.
- **Hours:** The site lists no hours. Google's full weekly hours were not in the readable limited view; I only saw "Open · Closes 5 PM" for today.
- **Google "Book online" button** on the Google profile: not clicked.
- **Google review count** (93) and rating (5.0): from the scout data; the limited Maps view did not show them, so not re-checked here.
- **Page-speed score:** PageSpeed Insights returned HTTP 429 (rate limited). No score recorded.
- **Sitebulb:** No export for this site was available in the repo or sent; nothing copied.
- **Facebook page content:** Login wall. Not read.
- **Mobile menu nav on other pages:** Checked on the homepage only (the menu is the same on the other pages in the crawl).
- **Full keyboard/accessibility pass:** Not done.
