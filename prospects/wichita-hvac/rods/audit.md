# Current-site audit: Rods Cooling & Heating LLC

Site: https://www.rodshvac.com/ (redirects to https://rodshvac.com/). Checked 2026-11-09 with Playwright (headless Chromium) at 390x844 (mobile, touch) and 1440x900 (desktop). Method per `docs/runtime/SITE-AUDIT.md`. Screenshots in `audit/`.

**What was clicked.** Homepage: every visible link clicked at both sizes, and where each one landed recorded. Hidden mobile menu links were read from the DOM and their targets taken from their href; the Menu button itself was not clicked. Inner pages (/contact/, /ac-repair/, /commercial-hvac/, /air-duct-cleaning/, /areas-we-serve/, /locations/wichita-kansas/, one town page, /getting-a-new-hvac-system/, /privacy-police/): every internal link fetched with a GET and its status recorded, not clicked. External links were not fetched. Tel and mailto links were checked by their href, not dialled or sent.

**Sitemap.** All 120 URLs in http://www.rodshvac.com/sitemap.xml were fetched with curl (status and title). This is how the spam pages were found; they are not linked from the homepage nav.

**Not checked:** page-speed score (no PageSpeed run), Sitebulb export (none supplied), the Google Business Profile as displayed (see Site vs Google), form submission (none exists, and submission is not allowed), whether the spam pages are indexed by Google, and the mobile Menu button. Reviews are in `reviews.json` and `facts.md`.

## What works

- **Phone links dial one number.** Every tel link on the site is `tel:+13167764088`, which is (316) 776-4088. The text on inner pages shows the same number ("316.776.4088"). Homepage: one floating "Call Now" button is the only tel link (https://rodshvac.com/).
- **Internal links resolve.** Every internal link on the inner pages returned 200 (for example /ac-repair/, /areas-we-serve/, /air-duct-cleaning/, /commercial-hvac/, /sitemap_index.xml). No 404 among the internal links checked.
- **Core pages exist and load:** /ac-repair/, /commercial-hvac/, /air-duct-cleaning/, /areas-we-serve/, /locations/wichita-kansas/, /getting-a-new-hvac-system/.
- **Google review links are right.** "review us on" goes to the review form for placeid ChIJB3foALnmuocROUUPbmyBVgI (matches the brief). It asks for a sign-in in our browser.
- **Address is on the homepage:** "1102 S Pattie St Wichita, KS 67211", matching Google.
- **Copyright:** no copyright line found on any page crawled.

## What is broken, most costly first

### 1. Gambling spam is live on the domain (31 URLs)
- **Where:** 31 URLs in the sitemap are gambling pages (Indonesian "slot gacor", "judi online", "situs slot88", "olympus88", "data hk"). Examples: https://rodshvac.com/slot-gacor-online-spaceman/, https://rodshvac.com/category/judi-online/, https://rodshvac.com/situs-slot-dragon222-online/.
- **What I did:** fetched every sitemap URL (status 200 for all 120) and loaded three of the spam pages in the browser.
- **What happened:** /slot-gacor-online-spaceman/ loads with the title and H1 "OLYMPUS88 : Situs Slot Gacor Online Terbaik Hari ini" (desktop and mobile). /category/judi-online/ and /situs-slot-dragon222-online/ show "One moment, please..." with no visible Rods content. Screenshots: `audit/spam-slot-gacor-page-390x844.png`, `audit/spam-slot-gacor-page-1440x900.png`, `audit/spam-category-judi-online-390x844.png`, `audit/spam-situs-dragon-390x844.png`.
- **Why it costs most:** the business's own domain carries gambling pages in its sitemap. Visitors and search engines can reach them. Whether Google has indexed them or flagged the site is **not checked**. The cause (hacked plugin, injected files) is **not checked**.

### 2. The Contact page carries no Rods content and has gambling menu links
- **Where:** https://rodshvac.com/contact/ (in the sitemap). The inner-page nav item "CONTACT" does not go here: it goes to `/` (the homepage). The only links to /contact/ are its own nav item.
- **What I clicked:** the CONTACT nav item on /ac-repair/ (landed on the homepage), and the /contact/ URL fetched directly, at both sizes.
- **What happened:** the H1s are "Rodshvac" and "Contact". The body is Indonesian news-portal copy ("Selamat datang di rodshvac, tempat di mana anda mendapatkan berita paling update..."). It has a "Hubungi Kami" (contact us) block, but the contact details there are not Rods's. The menu on this page lists "Judi Online, RTP Slot, Slot Gacor, Slot Online, Slot88" links. The only form is the site search box (`searchform`). No phone, no Rods email, no contact form.
- **Why it costs most (after 1):** a customer who taps Contact gets no way to reach Rods on the page.
- Screenshots: `audit/contact-390x844-full.png`, `audit/contact-1440x900-full.png`.

### 3. Phone: the site dials (316) 776-4088; Google lists (316) 516-0406
- **Site:** every tel link is `tel:+13167764088` (inner pages, and the homepage "Call Now" button). The floating button's config, served by the site's own script (https://rodshvac.com/domain_455269d3_d2c5_43a6_ab69_19fc59da65f5_dbver-1693231726.js, which sets `window.CNB_DATA` for the Call Now Button widget), has `"actionType":"PHONE","actionValue":"(316) 776-4088"`. Homepage text shows no visible number.
- **Google:** the place metadata from the review pull is "(316) 516-0406" (`reviews.json`, field `place.phone`). I could not open the Google listing to read the number on screen (WebFetch returned only the page title).
- **Result:** the site and Google give different numbers. The site's own number is consistent across the pages checked, so the mismatch is with Google, not inside the site. Which number is current is an onboarding question. One 1-star review says a phone number was "out of order" (Wanda M., 2023-10-30); it does not say which number.
- Screenshots: `audit/home-390x844-viewport.png` (Call Now button on the homepage), `audit/ac-repair-390x844-full.png` (number as text).

### 4. Dead and misdirected nav and button links
- **Homepage (both sizes):** "About" `#`, "Maintenance Plans" `#`, "Products" `/`, "Contact us" `/`, "Read More" (under the blog heading) `#`. Footer: "About us" `#`, "Blog" `#`, "Career" `#`, "Conatct Us" `#` (typo, and goes nowhere). Clicked at both sizes: the dead ones landed on `#` (the same page, nothing happens) and "Products" and "Contact us" landed on the homepage. The Google and Facebook links did go off-site (Google sign-in, Google Maps, a Facebook login wall). Screenshot: `audit/home-1440x900-full.png`.
- **Inner pages (both sizes):** "SERVICES" `#`; "ABOUT" `/`; "BLOG" `/`; "Commercial HVAC" `/` on the nav of /ac-repair/ (the page exists at /commercial-hvac/); "Furnace Installations & Maintenance", "Cooling Systems Installations & Maintenance", "AC Preventative Maintenance", "Air Filters/Scrubber" all `/`; "Privacy Policy" `/`; "Terms of Use" `/`. The "Residential HVAC", "Indoor Air Quality" and "Areas We Serve" links go to the right pages. Screenshot: `audit/ac-repair-1440x900-full.png`.
- **Homepage nav differs from inner pages:** the homepage has "About, Contact us, Products, Maintenance Plans"; inner pages have "Home, Services, About, Blog, Areas We Serve, Contact". A visitor who moves between them sees two different menus.
- **Maintenance Plans** is a nav item and the homepage says "MAINTENANCE PLANS" under services, but neither link leads anywhere. No plan page exists in the sitemap.

### 5. Privacy page does not load for a visitor
- **Where:** https://rodshvac.com/privacy-police/ (the sitemap entry, and the "Privacy Police" item in the /contact/ menu). The inner-page "Privacy Policy" nav item goes to `/`, not to this page.
- **What happened:** the page shows "Please wait while your request is being verified..." and the title "One moment, please..." at both sizes. No policy text is shown. /author/admin/ shows the same.
- **Note:** I did not determine what the interstitial is (a plugin, a bot check, or injected code). It is a fault either way.
- Screenshots: `audit/privacy-police-390x844-full.png`, `audit/privacy-police-1440x900-full.png`.

### 6. Horizontal scroll on phones (page wider than the 390px screen)
- **Measured** (document scroll width vs client width, from the browser at 390px):
  - /locations/wichita-kansas/: **1008 px** wide
  - /commercial-hvac/: **809 px**
  - /getting-a-new-hvac-system/: **809 px**
  - /ac-repair/: 400 px; /air-duct-cleaning/: 400 px
  - Homepage, /contact/, /areas-we-serve/, /locations/cooling-and-heating-.../haysville-kansas/: 390 px (no overflow)
- **Why it matters:** the phone visitor has to scroll sideways to read the page. The homepage does not have this problem.
- Screenshots: `audit/commercial-hvac-390x844-full.png`, `audit/locations_wichita-kansas-390x844-full.png`, `audit/getting-a-new-hvac-system-390x844-full.png`.

### 7. Homepage is placeholder-heavy
- A "Coming soon" heading over the blog section, with a "Read More" that goes to `#`. The only post shown is the default WordPress "Hello world!" (dated August 1, 2023), which links to `/`.
- "Coming Soon! We are working on providing duct cleaning and dryer vent cleaning services as soon as possible." on the homepage, while /air-duct-cleaning/ exists as a full page.
- Typos on the homepage: "Conatct Us" (footer), "Repalcement" ("Installation & Repalcement"), "Rod Heating & Cooling" in the title (the business is "Rods Cooling and Heating", and the inner-page titles say "Rod's Cooling & Heating LLC").
- Screenshot: `audit/home-1440x900-full.png`.

### 8. Titles and H1s
| Page | Title | H1 |
| --- | --- | --- |
| `/` | Rod Heating & Cooling \| HVAC Repair, Installation & Maintenance | Rods Cooling and Heating |
| `/ac-repair/` | Residential HVAC Installation and Repair Services Wichita, KS | Professional AC Repairs for Your Home in and around the Wichita, KS area |
| `/commercial-hvac/` | Commercial HVAC Installation and Repair Services Wichita, KS | Commercial HVAC Services within 30 miles of Wichita, KS |
| `/air-duct-cleaning/` | Air Duct Cleaning Services in Wichita, Indoor Air Quality Testing | Professional Duct Cleaning Services based in Wichita, KS |
| `/areas-we-serve/` | Our HVAC Service Areas in Wichita, KS & Surrounding Areas | Areas we serve |
| `/contact/` | Contact - RodshvacRodshvac | Rodshvac / Contact |
| `/locations/wichita-kansas/` | - Rod's Cooling & Heating LLC (no description) | Wichita, Kansas |

Homepage H1 names the business only. Contact title repeats the site name. The town page titles have no town name.

### 9. Contact details are weak and inconsistent
- **Email:** every inner page shows and links `rodscoolingandheating@gmail.com` (`mailto:`). It is a Gmail address, not a domain address. The homepage has no email.
- **Facebook:** two different Facebook links. The homepage footer links to https://facebook.com/rodshvac; inner pages link to https://www.facebook.com/Rods-Cooling-Heating-LLC-105711584958050. Both open a login wall in our browser (https://m.facebook.com/login/...). Neither page could be read.
- **Google:** inner pages link to https://g.page/rods-cooling-heating?share. Not checked further.
- **Address:** only on the homepage ("1102 S Pattie St Wichita, KS 67211"). Not on the inner pages.
- **Review count:** homepage widget "Based on 180 reviews" versus 190 on Google (`reviews.json`). Stale count, minor.

### 10. No way to request service on the site
- No lead form on the homepage or on any inner page crawled. The "forms" found are the site search box (`searchform`) on /contact/ and /getting-a-new-hvac-system/. The only ways to contact are the phone (see finding 3) and the Gmail address (finding 9).
- Form submission not tested (no form exists).

### 11. Claims on the site that are not backed
- AC repair page: "we stand by the phone 24/7" and "Same-day appointments" and "quality workmanship, guaranteed". No hours and no written warranty on the site. Not verified.
- Homepage: "We have been serving Wichita and the greater surrounding area in Kansas for over 20 years!" Not verified (see facts.md, age).
- No licence, insurance, brand or dealer claims found on the site (checked text and source). Facts file has the details.

## Forms (none submitted)
- No contact or quote form found on any page crawled. Search boxes only: /contact/ and /getting-a-new-hvac-system/.

## Office and numbers
- One office on the site: Wichita, 1102 S Pattie St, 67211 (homepage). Town pages (about 37 towns, e.g. Newton, Wellington, McConnell AFB) all use the same number.
- Numbers on the site: (316) 776-4088 only. Google: (316) 516-0406 (from `reviews.json`).

## Site versus Google profile
- **Name:** "Rods Cooling & Heating LLC" (Google) vs "Rods Cooling and Heating" (homepage H1) vs "Rod Heating & Cooling" (homepage title) vs "Rod's Cooling & Heating LLC" (inner page titles).
- **Phone:** does not match. Site (316) 776-4088; Google (316) 516-0406.
- **Address:** matches (1102 S Pattie St, Wichita, KS 67211).
- **Services:** HVAC on both. Google category not checked.
- **Hours:** none on the site; Google hours not opened (unverified).
- **Reviews:** site 180, Google 190.

## Speed
- Not measured.

## Sitebulb
- No export supplied. Not checked.
