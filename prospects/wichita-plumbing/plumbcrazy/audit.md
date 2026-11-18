# Current-site audit: Plumb Crazy

Site: https://www.plumbcrazykansas.com/ (WordPress, Genesis-style theme).
Run date 2026-11-13. Playwright Chromium, 1440x900 and 390x844. Crawl covered 14 URLs (home, contact, 6 service pages, blog index, 5 blog posts, author page). Nothing was submitted.
Screenshots: `audit/`.

## What works

- **Phone number is tappable.** `tel:3168713006` in the header and body, visible at both widths. Matches the brief.
- **Header menu (desktop):** HOME, CONTACT US, DRAIN CLEANING, PLUMBING SERVICES, STORIES & UPDATES all load their own page (checked by click at 1440 px).
- **Mobile menu:** the "Toggle navigation" button opens the list, and it contains working links plus a tap-to-call number.
- **Phone width:** no sideways scroll (page width 390 px on all pages checked).
- **Contact form** on every page. Name, email, phone, "Required Services" (textarea). Not submitted.

## What's broken, most costly first

### 1. The About page is missing
- `/about/` returns HTTP 404 with the message "UNFORTUNATELY, IT LOOKS LIKE THE PAGE YOU WERE WANTING IS MISSING OR HAS BEEN MOVED." Evidence: `audit/evidence-about-page-missing-1440x900.png`.
- `/about-us/` shows the same message text (status not recorded).
- Cost: no owner, history or license story on the site for a visitor to check.

### 2. Service page H1s are hidden on desktop
- On `/drain-cleaning/`, `/sewer-cleaning/`, `/water-service-repair/`, `/water-service-replacement/`, `/sewer-replacement/`, `/plumbing-services/` the H1 is in the HTML but has zero size at 1440 px. At 390 px it shows.
- The top of each desktop page is a blank band, then body text. Evidence: `audit/page-_drain_cleaning-desktop.png`.
- Cost: the first thing a desktop visitor reads is not the service name.

### 3. Broken or stock photos
- Photos on the service pages are hotlinked Wikipedia images, with captions "(Photo credit: Wikipedia)". Several show as broken (alt text only) in our browser: drain-cleaning ("English: Drawing showing how water sits in a P-trap"), water-service-repair, sewer-cleaning, plumbing-services ("Generic bathroom sink").
- Cost: the site shows no photos of its own work, and some images do not load.

### 4. Dead and mislabeled menu items
- "WATER SERVICE" and "SERVER SERVICE" are dropdown parents whose link is `#`. Clicking them does nothing. Their sub-items work.
- "SERVER SERVICE" should read "SEWER SERVICE".

### 5. Footer copyright is messy
- "Copyright ©2026 Copyright 2022, Plumb Crazy Kansas, LLC." Two years, two legal-sounding names. Titles use "Plumb Crazy, LLC".

### 6. Old blog, off-topic post
- Blog index `/category/blog/`: four posts, dated 2014 and 2016, all "By Admin". Newest is "Why Having a Professional Install a Water Heater Is Important" (March 24, 2016).
- "The Man Who Was Married To Himself." (May 16, 2014, about 1,759 words) is a fiction-style story about a plumbing call, not a service article. "Of Mice And Men (But More Mice Than Men)" is a similar story.
- Blog comment forms are present (WordPress comments).

### 7. Contact form
- Fields on every page: Name (required), Email (required), Phone Number (optional), Required Services (textarea, required). No maxlength on visible fields. No CAPTCHA; the form has a hidden anti-spam honeypot (`ak_hp_textarea`, maxlength 100, hidden) and CleanTalk fields.
- The form is a WordPress/Jetpack form. The homepage and service pages post back to the same URL (anchor `#contact-form-N`). Whether a submission emails the owner is not checked (not submitted, per the brief).
- Cost: nothing for a visitor to trip on; the issue is the pitch for a form that filters spam.

### 8. Thin copy, no proof
- Homepage (378 words): a service list, "We treat every customer fairly", "Funny Name, Serious Plumbing".
- Claims on site, unverified: "17 years of experience" (drain cleaning page), "over 16 years" (drain cleaner "Brandon", sewer page), "three excavators with over 60 years of combined experience" (sewer replacement), "fully licensed master plumbers" (plumbing services page), "We work 7 days a week", "We don't charge emergency rates".
- No license number, no insurance statement, no warranty terms, no reviews on the site, no financing.
- Staff named on site: "Brandon" (drain cleaner). No owner named.

## Other checks

- **Speed:** no Lighthouse run. Console shows 403 and tunnel-failure errors for third-party assets (a tracking pixel, hotlinked images). Some are caused by our proxy, so not counted as site faults.
- **Google profile:** the brief's 4.7 stars and 75 reviews were not re-checked. Hours not checked.
- **Mobile:** passes horizontal-scroll check; menu opens; tap-to-call works.

## Not checked (and why)

- **Form submission:** not submitted, per the brief. Delivery is unknown.
- **Facebook or other social:** none linked in the crawl. Not searched further.
- **Google reviews text:** not pulled (review pulls are for final picks, per rules).
