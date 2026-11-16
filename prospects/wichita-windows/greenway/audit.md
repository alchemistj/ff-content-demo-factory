# Greenway Exteriors: current-site audit

Site: https://greenwayexteriorsllc.com/ . Audited 2026-11-09 with Playwright (Chromium) at 390x844 and 1440x900, on the home, /windows/, /window-installation/, /siding/, /contact-us/ and /about-us/ pages, plus a request check of all 56 unique links found in the home page markup (49 internal, 7 `tel:` and `mailto:`). Nothing was submitted. Screenshots are in `audit/`.

Name note: Google, BBB and the site all say **Greenway Exteriors** (the logo, page titles and About page). The request called the business "Greenway Home Services". Nothing in `facts.md` supports that name, so the package uses Greenway Exteriors.

## What works
- **Every phone link dials the right number.** All 7 `tel:` links on every page (header, menu, footer, contact page) are `tel:+13166418365`, matching the number shown and the Google profile. No placeholder numbers.
- **Every internal link resolves.** 49 internal links, none dead. The only non-200 results are 301s to the right page (see below).
- **A page for every service,** 14 suburb pages, and fast loads (home about 2.3 s, window pages under 1 s in unthrottled headless Chrome).
- **A real contact form** (Gravity Forms: name, phone, email, message; /thank-you/ page exists).
- **Real before/after project photos** with the Greenway logo on the home page.
- **BBB A+ rating and "since 2012"** both check out against BBB.

## What is broken, costliest first

### 1. Two trust claims contradict BBB, on the pages that decide a window sale
- `/windows/` says "backed by consistent 5-star reviews, **BBB accreditation**". BBB's profile says "This business is NOT BBB Accredited." (The rating is A+; the accreditation claim is false.) Evidence: text on https://greenwayexteriorsllc.com/windows/ versus the BBB profile in `facts.md` section 4.
- The home page says "For over 15 years, Greenway Exteriors has been a trusted name"; `/windows/` says "over 15 years serving Wichita homeowners". The same site's /windows/ and /siding/ say "Since 2012", and BBB shows the business started 8/28/2012: 14 years in 2026.
- No BBB badge or link appears anywhere to back either claim.
- Screenshot: none (text only; quoted above).

### 2. On a phone, the first screen never says what Greenway does or how to call
- 390x844 on the home page: the first screen is a black financing bar, the logo, a menu icon and a before/after photo. The headline "Window Replacement & Siding Installation in Wichita, KS" starts about 1,004 px down the page, past the first screen. No phone number is on the first screen.
- The only tap-to-call links on the page are in the menu and the footer; there is no sticky call button.
- On `/windows/` the top of the page offers only a green "Get Free Quote" button.
- Screenshots: `audit/phone-home-first-screen.png`, `audit/phone-windows-first-screen.png` (named `phone-_windows_-first-screen.png`), `audit/phone-home-menu-open.png`.

### 3. The "CALL" line on the window page cannot be tapped
- `/windows/` at 390 px: "GET YOUR FREE WINDOW CONSULTATION | CALL (316-641-8365)" is plain text in a div, not inside a link. It also wraps in the middle of the number ("(316-" on one line, "641-8365)" on the next).
- Screenshot: `audit/phone-windows-call-line-not-tappable.png`.

### 4. A sticky promo bar takes the top of every phone screen, and it expires soon
- "Offering Flexible Financing: No Payments Until 2027 + 0% for 18 Months" is on every page and stays pinned on scroll. With the header it fills about 170 of 844 px. The offer names no lender and "2027" starts in about seven weeks, so the bar will read as stale.
- Screenshot: `audit/phone-home-scrolled-sticky-banner.png`.

### 5. The homepage headline names two services, not what the company is
- H1 is "Window Replacement & Siding Installation in Wichita, KS". It targets service searches, and the page then shows siding first.
- Section headings on the home page list the siding services (Installation, Vinyl, Fiber Cement, Engineered Wood, Polymer) and only "Window Installation" for windows, while windows are 44% of what reviewers write about (`facts.md` section 3).

### 6. Window pages run very long on a phone
- `/windows/` is 9,346 px tall at 390 px (about 11 screens) and `/window-installation/` is 16,433 px (about 19 screens). `/window-replacement/` (the menu's "Window Replacement") 301-redirects to `/windows/`, so one page has two names.

### 7. Smaller errors
- The menu's top-level "GUTTERS" item links to `/#`, which returns to the home page.
- The footer and contact page say "Open Monday-Sunday, 24 Hours" for a small crew; it reads as template text.
- Duplicate-name redirect: `/eastbrough-replacement-windows-and-siding/` (typo) 301s to the correct Eastborough URL. A dozen suburb and service links in the page markup also lack a trailing slash and 301.
- Reviewer names are shown in full in the review widget. Review counts differ: Google 87, the site widget 83.
- Brand-logo images carry auto-generated alt text.

## Not checked or not provable
- Whether the contact form delivers (not submitted).
- Phone page-speed score (no throttled test run).
- ProVia, James Hardie and LP SmartSide dealer claims: see `facts.md` section 5; nothing is verified, so no brand is named in the package.
- The `facts.md` note that the "Siding" menu item links to the home page did **not** reproduce: at both widths "SIDING" links to `/siding/`. Only "GUTTERS" links to `/#`.
- Number match with Google: site and Google profile agree on (316) 641-8365. BBB lists (316) 453-6043 and a directory lists (316) 816-9395; both are treated as stale and not used.
