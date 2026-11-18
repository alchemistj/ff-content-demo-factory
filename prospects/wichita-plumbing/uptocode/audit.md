# Current-site audit: Up To Code Plumbing

Site: https://www.uptocodewichita.com/ (Wix)
Pages crawled (all 200 at both widths): / , /residential , /commercial , /memberships , /careers , /about , /about-5 (Book An Appointment) , /plumber-augusta-ks ; also checked 200: /terms , /privacypolicy , /sms-terms , /plumber-haysville-ks , /plumber-derby-ks , /plumber-el-dorado-ks , /drain-sewer-cleaning-wichita , /water-heater-repair-wichita , /water-line-leak-repair-wichita , /gas-line-plumber-wichita
Widths: 1440x900 and 390x844 (Playwright Chromium). Run date 2026-11-13. Screenshots: `audit/`.
Nothing submitted. The Jobber request forms were opened but not filled.

## What works
- **Header and footer links:** Home, Residential, Commercial, Careers, Free Membership, About, Book An Appointment, all 200. Footer: Terms, Privacy, SMS Terms, Augusta/Haysville/Derby/El Dorado city pages, all 200.
- **Phone links are tappable:** "316-400-PLUM" is a tel link (tel:3164007586, visible, 336x66 on phone). "(316) 400-PLUM" is a second tel link on every page, visible at both widths. The Augusta page's "(316) 400-7586" is also a tel link.
- **Titles and H1s** on every page checked (see below). No duplicate or copied titles.
- **Email:** mailto:contactus@utcwichita.com, visible on every page.
- **Placeholder or copied pages:** none found in the crawled text. The sample pages are real copy.
- **Testimonials:** none seen in the crawled text; the home page shows a Google 5-star badge and BBB Accredited badge instead.
- **Broken images:** none found on the pages checked at 1440.

## What's broken, most costly first

### 1. The site does not fit a phone screen (every page, 390 px)
- The page is laid out 980 px wide at 390 px. scrollWidth 980 vs viewport 390, on every page checked (home, residential, commercial, memberships, careers, about, booking, Augusta).
- The desktop header is shown on the phone: the top bar has no hamburger menu, and the "Book An Appointment" button overlaps the "Residential" link. The hero text is clipped at the right ("Expe...", "Up to", "316-...").
- Evidence: `audit/home-390x844-viewport.png`.
- Cost: most local plumbing search is on a phone. The visitor sees a clipped, overlapping header and must scroll sideways.

### 2. The booking request form is behind a bot challenge
- "Book Online Now" (/about-5) and "Open Auto-Approval Form" (/residential) both open https://clienthub.getjobber.com/... request forms in a new tab.
- Browser result: Cloudflare Turnstile interstitial ("Just a moment... Performing security verification"). A direct request returned 403. Form fields not seen; not bypassed.
- Result for outreach: contact form blocked by CAPTCHA, so hand-send list.
- The Commercial "Fast-Track Portal" link was not opened.

### 3. The careers applications use Microsoft Forms
- Three "APPLY HERE" links (Plumber/Apprentice, Dispatcher, Shopworker) go to forms.office.com response pages (200). Not a contact form. Not filled.

### 4. Two phone numbers and one text-only line
- (316) 400-7586 (via "400-PLUM") is the call line; (316) 333-5434 is the text line ("Text Up to Code Plumbing at (316) 333-5434", /about-5). The text number is plain text, not a tel link, which is the right call for a text line, but the page does not say that clearly.
- On /about and the Augusta page the 400-7586 number is printed as text in one place and as the "text us" number in another. Confusing but not broken.

### 5. Footer service-area list conflicts with the header list
- Home header says "Serving Wichita, Goddard, Haysville, El Dorado, Andale, Andover, Maize, Rose Hill, Kechi, Derby, Park City, Valley Center, Augusta, Greenwich, Colwich, Garden Plain, and everywhere in-between". Home footer and About say "Serving Wichita, Augusta, Haysville, Derby, El Dorado and nearby towns". Two lists on one page. Minor.

### 6. Badges and certifications are claims on the site only
- Home shows a BBB Accredited badge, a Google 5-star graphic and a "Delta PRO" certified badge. The Augusta page says "We're a Moen Install Pro and a Delta Certified Pro". Manufacturer locators not checked. Per the standing rule, these are not called certified on a demo unless the locator confirms.

## Word counts (visible text, rough)
- / : 141 (1440) / 141 (390)
- /residential : 521 / 525
- /commercial : 523 / 523
- /memberships : 164 / 164
- /careers : 198 / 198
- /about : 428 / 428
- /about-5 : 195 / 195
- /plumber-augusta-ks : 514 / 514

## Titles and H1s
- / : "Plumber in Wichita, KS | Up to Code Plumbing" ; H1 "Expert Plumbers"
- /residential : "Residential Plumbing in Wichita, KS | Up to Code Plumbing" ; H1 "Residential Plumbing"
- /commercial : "Commercial Plumber in Wichita, KS | Up to Code Plumbing" ; H1 "Commercial Plumbing"
- /memberships : "Free VIP Membership & Discounts | Up to Code Plumbing" ; H1 "10 to 5 VIP Membership"
- /careers : "Plumbing Jobs in Wichita, KS | Up to Code Plumbing Careers" ; H1 "Up to Code Plumbing Careers"
- /about : "About Us | Master Plumber in Wichita | Up to Code Plumbing" ; H1 "About Up to Code Plumbing"
- /about-5 : "Book a Plumber in Wichita, KS | Up to Code Plumbing" ; H1 "Book An Appointment"
- /plumber-augusta-ks : "Plumber in Augusta, KS | Up to Code Plumbing" ; H1 "Your Plumber in Augusta, KS"
- Note: the /about-5 slug is for the booking page; the URL does not match its topic.

## Addresses and phones (every instance on the site)
- 920 N Tyler Rd STE 304 #423, Wichita, KS 67212 (footer, all pages). Suite format looks like a mailbox or virtual address; see facts.md.
- (316) 400-PLUM = (316) 400-7586 (call, all pages); (316) 333-5434 (text, /about-5 and Augusta page).
- contactus@utcwichita.com (all pages).

## Not checked
- Speed: not measured as a score. Load times were not recorded in this crawl; use PageSpeed for a number.
- Facebook (https://www.facebook.com/UTCWichita/) returned 400 to a direct request (bot filtering); not opened in a browser.
- YouTube link: direct request failed (header overflow). Not opened.
- Google listing: not opened (review pull not part of qualify stage).
