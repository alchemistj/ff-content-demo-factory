# Current-site audit: alpha-heatair.com (Alpha HVAC & Plumbing, Wichita KS)

Run 2026-11-09 with Playwright (Chromium, headless) at 390x844 (mobile, touch) and 1440x900 (desktop). Pages: /, /about/, /heating/, /cooling/, /plumbing-2/, /contact-us/, plus two URLs found in the sitemap: /test-for-reviews/ and /17-2/. Nothing was submitted. Screenshots are in `audit/`. Crawl data was saved in scratch, not in this folder.

## What works

- **All pages load (HTTP 200)** at both sizes. Each page has one H1 and a specific `<title>` (except the H1 "About", "Contact Us").
- **Main menu** (Home, About, Heating, Cooling, Plumbing, Contact Us) goes to the right page on both sizes. Mobile menu opens and shows the same links plus the phone and Facebook.
- **Buttons and cards:** "Schedule an Appointment" and "Request A Quote" go to /contact-us/. The three "View" cards go to /heating/, /cooling/ and /plumbing-2/ respectively.
- **Every tel: link dials the shown number:** both tel: links are `tel:13162605775`, which is 316-260-5775. Correct, not a Wix placeholder.
- **mailto:** the one mailto (`tomt@alpha-heatair.com`) matches the visible address.
- **No template text found:** no lorem, "Samantha", "mysite", "copy-of" pages, or sample copy. No visible copyright line in the page body (a "Copyright (c) 2015 Daniel Eden" string exists only in a theme script comment).
- **Contact form:** a real form on every page with First Name, Last Name, Phone Number, Email Address and Message fields and a Submit button (/contact-us/; screenshot `audit/desktop-contact-form.png`, `audit/mobile-contact-form.png`). Google reCAPTCHA v3 is loaded (`et_pb_recaptcha_enabled` and site key in page source). Whether it sends was not tested, per the no-submit rule.
- **"Write a review"** goes to a Trustindex link that redirects to the Google place page for this business (checked with curl: meta refresh to https://www.google.com/maps/place/...).
- **Hours** shown: Mon-Fri 7:30am-5:00pm plus "24-Hour Emergency Service" (every page footer).
- **Layout:** no horizontal scroll except 8px on the homepage (see finding 6).

## What's broken, most costly first

### 1. Phone is not tappable at the top of the screen on phones; the footer number is not a link
- **Evidence:** on mobile the header tel link is hidden (`display: none`) at 390px. The only other tel: link sits inside the hamburger menu (`UL.et_mobile_menu`). So a phone visitor has to open the menu, then tap. The footer number "316-260-5775" is plain text, not a tel: link; the page has only two tel: links per page, both in the header/menu. The body line "Call us at 316-260-5775 ..." is also plain text.
- **Screenshots:** `audit/mobile-home-above-fold-no-tap-phone.png` (no tappable number in the first screen), `audit/mobile-menu-open-home.png` (tel link appears only after the menu opens). Footer screenshot attempt timed out, so the footer claim rests on the DOM check, not a picture.
- **Cost:** the business is 24-hour emergency HVAC. Phone is the main lead. A phone visitor needs two taps and a menu to call.

### 2. A live leftover page shows a different phone number and a personal gmail address
- **Evidence:** https://alpha-heatair.com/17-2/ is publicly reachable (HTTP 200, title "Site Under Maintenance - Alpha HVAC & Plumbing"). Body: "Contact us to schedule your appointment!", **316-765-4492**, **alphahc16@gmail.com**. This URL is in the sitemap (https://alpha-heatair.com/page-sitemap.xml), so search engines can index it. The number is not in the Google profile, and the site's other pages say 316-260-5775 only.
- **Screenshot:** `audit/mobile-17-2-leftover-page.png` (desktop also: `audit/desktop-17-2-top.png`).
- **Cost:** a second phone number and personal email on a public page. A visitor who finds it can call or write the wrong line.

### 3. "Our Trusted Brands" section promises clicks that do nothing
- **Evidence:** homepage text: "We install high quality products from brands you can trust. Click on a brand below to explore your options." Six logos (Goodman, Amana, Bryant, Daikin, Ruud, LG). None is wrapped in a link, cursor is `auto`, and alt text is empty (title attribute only). At 1440px a click on the Bryant logo left the URL unchanged, opened no new tab, and showed nothing. Brand clicks were tested on desktop only.
- **Screenshots:** `audit/desktop-brands-section.png`, `audit/desktop-brand-bryant-logo.png`, `audit/desktop-brand-click-result.png`.
- **Cost:** the only product-brand claim on the site is a dead end.

### 4. Name and review count do not match Google
- **Evidence:** the site's review widget says "48 Google reviews" (https://alpha-heatair.com/; `audit/desktop-reviews-widget-48-count.png`). Google shows 131 (`reviews.json`). The widget's business name is "Alpha Heating & Air conditioning, LLC" (image alt on https://alpha-heatair.com/). The logo and titles say "Alpha HVAC & Plumbing". The Google record in `reviews.json` says "Alpha HVAC and Plumbing LLC". Two names on one site, a third on Google.
- **Cost:** weakens trust and local listing consistency. Fixable in the widget and the site name.

### 5. Test pages are live and indexed in the sitemap
- **Evidence:** https://alpha-heatair.com/test-for-reviews/ returns 200, title "Test for Reviews - Alpha HVAC & Plumbing", meta description "area for testing", and no content (`audit/mobile-test-for-reviews-full.png`). It is listed in https://alpha-heatair.com/page-sitemap.xml. The old /plumbing/ URL 301s to the home page, and /plumbing-2/ is the live plumbing page.
- **Cost:** looks unfinished to anyone who finds it. Low to medium.

### 6. Two different Facebook links, and 8px of horizontal scroll on the homepage
- **Facebook:** the header "Follow Us" goes to https://www.facebook.com/alphahvacict; the body "Follow on Facebook" goes to https://www.facebook.com/profile.php?id=61575954281986. Both return HTTP 200 through curl. Not read in a browser, so it is not known whether they are the same page or whether either is the owner's real page.
- **Overflow:** the homepage scrolls 8px sideways on a phone. The cause is the review carousel (Trustindex widget) (crawl data; `audit/mobile-home-full.png`).
- **Cost:** low.

### 7. Thin pages and generic H1s
- Heating, Cooling and Plumbing pages each have one H2 block and three short bullets. No photos of work, no FAQ, no service-area town list. H1 on About is just "About"; on Contact is "Contact Us".
- **Cost:** medium for search and for the demo's "weak site" point, but not broken.

## Sitebulb and speed

- **Sitebulb:** no export in this folder; not checked.
- **Speed:** no page-speed score taken (no PageSpeed run in this session). Not checked.

## What I could not check

- Form submission and what happens after (not submitted, per rule).
- Facebook pages in a browser (behind login wall or not; not read).
- BBB and other directory listings (not opened; search snippets only, see facts.md).
- Manufacturer dealer locators (partly; see facts.md).
- Page speed and Sitebulb.
- Footer screenshot (timed out; DOM only).
