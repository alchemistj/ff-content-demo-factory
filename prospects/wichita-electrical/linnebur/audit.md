# Current-site audit: Linnebur Electric

Site: http://linneburelectric.com/ (redirects to https://linneburelectric.com/)
Pages crawled: index.html, about.html, services.html, contact.html
Widths: 390x844 (phone, touch) and 1440x900 (desktop). Checked 2026-11-09 with Playwright (Chromium, Chrome user agent).
Screenshots: `audit/` in this folder.

## Access note
- A plain curl with its default user agent works (200 after the http-to-https 301).
- curl with a `Mozilla/5.0` user agent gets `406 Not Acceptable!` from Mod_Security on every https page. A full Chrome user agent through curl gets 200.
- So the block is user-agent dependent, not universal. Crawlers that send a browser-like UA may get the 406 and see no page. Not confirmed for Google's crawler.

## What works
- **Menu links (phone and desktop):** HOME, ABOUT, SERVICES, CONTACT each go to the right page with the right H1 (LINNEBUR ELECTRIC, WHO WE ARE, WHAT WE DO, CONTACT US).
- **Content buttons:** "MORE ABOUT US" goes to about.html, "VIEW OUR SERVICES" goes to services.html, "GET IN TOUCH" on services goes to contact.html. Logo goes to index.html.
- **Phone links, mobile:** the "Call" item in the mobile menu and the phone in the body of the page are `tel:3169436616`. That dials 316-943-6616, the number shown.
- **Phone number on contact page, mobile:** `tel:3169436616`, correct.
- **Email:** every `mailto:` is `mailto:kent@linneburelectric.com`, which matches the address shown. No placeholder addresses.
- **Address link:** goes to a Google Maps place URL for "Linnebur Electric" (not a search).
- **Services tabs (desktop):** Residential, Commercial and Industrial each switch the content correctly.
- **Services accordion (phone):** tapping each heading (RESIDENTIAL, COMMERCIAL, INDUSTRIAL) expands its section.
- **Photo gallery:** thumbnails open a lightbox (colorbox) on both widths.
- **Images:** no broken images on any page at either width.
- **Placeholder text:** none found. No lorem ipsum, no "copy-of", no sample testimonials, no wrong city.
- **Copyright year:** the site has no copyright line at all. No stale year (so not the "(c) 2021" problem).
- **Forms:** none on any page (see problem 2).
- **Analytics:** Google Analytics tag G-WLHP8HSBL2 is present on every page.

## What's broken (most costly first)

### 1. On a phone, the first screen has no phone number, and the Call button sits behind the menu
- URL: https://linneburelectric.com/ at 390x844.
- What I saw: the top bar with the phone number is hidden on phone (its element is not visible). The first screen shows only the logo, the hamburger and the "Who We Are" block. The only tappable phone is "CALL" inside the hamburger menu, or the number in the footer at the bottom of the page.
- Evidence: `audit/broken-phone-first-screen-no-phone.png`, `audit/broken-phone-call-only-in-menu.png`.
- Cost: an electrician's calls are mostly from phones and often urgent. A visitor must open a menu to call.

### 2. Desktop: the phone number at the top of the page is plain text, not a link
- URL: https://linneburelectric.com/ at 1440x900. Also the phone on contact.html at desktop.
- What I saw: the top bar phone is a `<span class="phone cursor-default">`, not a link. Clicking it does nothing. The contact page on desktop also shows the number as plain text ("phone: 316.943.6616 fax: 316.943.2547"). The only tel link on desktop is a hidden one.
- Evidence: `audit/broken-desktop-topbar-phone-not-link.png`, `audit/broken-contact-no-form-desktop-full.png`.
- Cost: lower than #1 (desktop visitors can copy the number), but it's the one number on the page that is not tappable on desktop.

### 3. No contact form, no request-a-quote path, no hours anywhere
- URL: https://linneburelectric.com/contact.html (both widths).
- What I saw: contact.html has only address, phone, fax and email, plus a map link. No form. No form fields, no reCAPTCHA or other spam protection (the page source has no captcha script). I did not submit anything. No business hours on the site, and the Google profile has no hours ("Add hours" is shown on the Google listing).
- Evidence: `audit/broken-contact-no-form-desktop-full.png`; the page text captured in the crawl shows no form element.
- Cost: a visitor who can't call has no way to ask for a quote or a callback on the site.

### 4. The homepage H1 and title do not say electrician or Wichita
- URL: https://linneburelectric.com/index.html
- Title: "Linnebur Electric". Homepage H1: "LINNEBUR ELECTRIC". The H2s are RESIDENTIAL, COMMERCIAL, INDUSTRIAL. The text "Wichita, KS" appears only in body copy and in the meta description. Meta description: "Linnebur Electric is an electric company in Wichita, KS. Licensed electricians servicing residential, commercial and industrial needs."
- Other pages: about.html title "About | Linnebur Electric", H1 "WHO WE ARE". services.html title "Services | Linnebur Electric", H1 "WHAT WE DO" (no trade or town). contact.html title "Contact | Linnebur Electric", H1 "CONTACT US".
- Cost: search results show the name and not the trade. Every H1 is a generic label.

### 5. Services: one page for all 16 services, and the lists are collapsed on phone
- URL: https://linneburelectric.com/services.html
- Named services (exact site wording):
  - Residential: New Residential; Residential Remodel; Phone/TV Cabling; Ceiling Fan Installation; Service Work; LED Lighting Retro-Fits.
  - Commercial: New Commercial; Commercial Remodel; Office Building Wiring; Church Wiring.
  - Industrial: Metal Building Wiring; 3-Phase Motor Control; Grain Handling Facilities; CNC Mill Machine Wiring; Design/Build Work; Bucket Truck Overhead Services.
- No service has its own page. The only service pages are the single services.html (the Commercial and Industrial lists are hidden until their tab is clicked).
- On phone, all three service sections are collapsed on first load (the text is not visible until tapped).
- Evidence: the desktop and phone crawl. Tap test (phone): all sections closed at load, each opens on tap.

### 6. Facts on the site contradict each other
- Homepage and about page: "over 30 years" (homepage body text) against "Since 1982" (about page body and about meta description). 1982 to 2026 is 44 years.
- Footer on every page reads "LINNEBUR ELETRIC" (missing "C"). The logo image reads "LINNEBUR ELECTRIC INC.", the header/title says "Linnebur Electric", and the body uses "Linnebur Electric, Inc."
- Evidence: `audit/broken-footer-typo-and-license-1440.png`.

### 7. Fonts and jQuery load over http:// on an https page (mixed content)
- The page source loads jQuery from `http://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js` and Google Fonts from `http://fonts.googleapis.com/css?family=Lato:300,400,700` and `...family=Oswald`. Chromium blocks these as mixed content on every page. A local copy of jQuery (`https://linneburelectric.com/js/jquery-2.1.4.min.js`) loads, so the page still works. The Lato and Oswald fonts do not load, so the headings and body fall back to system fonts.
- Console errors in the crawl: mixed-content failures on every page. jQuery 2.1.4 dates from 2015.
- Cost: lower visually; the design the site was built with does not render as built. Not confirmed on other browsers.

### 8. Minor
- The "Directions" link and the address link open Google Maps in a new tab (both point to the same place URL).
- The fax number (316.943.2547) is shown as text. Not a broken item.
- The client logos on about.html (Andale Farmers Coop, Axiom Engineers, Hentzen Contractors, Morton Buildings, Simpson Construction) all load and have alt text.

## Site versus Google profile
Google data from the Maps scout (2026-11-09) and my Google profile check (2026-11-09):
- **Name:** Google "Linnebur Electric"; site "Linnebur Electric, Inc." in body text, "LINNEBUR ELECTRIC INC." in the logo, "LINNEBUR ELETRIC" in the footer. Matches in substance; the footer typo does not.
- **Phone:** Google "+1 316-943-6616"; site 316.943.6616 (`tel:3169436616`). Match.
- **Address:** Google "234 S Colorado St, Wichita, KS 67209, United States"; site "234 S Colorado St. Wichita, KS 67209". Match.
- **Category:** Google "Electrician"; site is an electrical contractor for residential, commercial and industrial work.
- **Website on Google:** linneburelectric.com. Match.
- **Hours:** Google shows no hours ("Add hours"). The site shows none. Not a mismatch, but no hours anywhere.
- **Services:** Google has no service list.
- **Reviews:** Google 4.7 with 23 reviews. The site has no reviews or testimonials.

## Could not check
- Speed score (no PageSpeed run; not attempted).
- Sitebulb export: none in the folder.
- Google reviews beyond the first 3 (the "More reviews" control did not load in headless Chromium). Owner replies not checked.
- Mobile Safari or Firefox rendering; only Chromium was used.
- Whether Google's crawler sees the site (the Mod_Security block is user-agent dependent; not tested with Googlebot's exact string).
- The contact form does not exist, so no submission test was done (nothing submitted).
