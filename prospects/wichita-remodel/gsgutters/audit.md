# GS Gutters LLC: current-site audit

Site: http://gsguttersllc.com/ (WordPress, Divi). Audited 2026-11-09 with Playwright (Chromium) at 390x844 and 1440x900. Screenshots are in `audit/`. Pages crawled: home, /gutters/, /remodeling/, /gallery/, /contact/, plus /about/, /about-us/ and /services/ (all 404). Nothing was submitted.

## What works
- Every phone link is `tel:3162100063` and dials the number shown, on every page and at both sizes.
- The five menu links (Home, Gutters, Remodeling, Gallery, Contact) and "Get a Quote" all go to the right pages, in both the desktop and the mobile menu.
- The owner, Nelson Galdamez, is named on the home, gutters and remodeling pages, and the gutters page names Wichita and the 90-mile radius.
- Real service copy exists for gutter installation and repair, gutter cleaning and gutter screens.

## What is broken, most costly first

1. **The top of the homepage says "gutters", not what the reviews say they do, and it has no headline at all.** The page has zero H1s (home, gutters, remodeling, gallery and contact all return none). The big words read "GS Gutters LLC: Channeling Excellence In Wichita, KS! Your Trusted Choice For Superior Gutter Solutions." Siding, painting, decks, windows and doors never appear in them. Reviews describe a siding, paint, deck, window, door and gutter company. Screenshots: `audit/desktop-home.png`, `audit/mobile-home-after-load.png`.
2. **Siding, painting, floors, decks, and windows and doors share one short page.** /remodeling/ lists five items (Siding Installation and Repair, Interior/Exterior Painting, Floor Installation and Maintenance, Deck Installation and Repair, Windows and Doors Installation) as bare lines under one paragraph. None has its own page, so a search for siding, deck or window installation in Wichita finds a line. Screenshot: `audit/desktop-remodeling.png`.
3. **None of the 52 Google reviews appears on the site.** No testimonial section on any page crawled. The Gallery page is the same story: heading "Our Projects" and 105 images with no captions or text. Screenshots: `audit/desktop-gallery.png`.
4. **The first four seconds of the homepage are nearly blank.** At 1 second after the request the screen shows only the top menu; the hero text and slides appear several seconds later (facts.md measured about 2.5 s blank and 2.7 to 3.6 s to load). A broken-image icon sits beside "Wichita, KS" in the top bar on first paint. Screenshots: `audit/mobile-home-first-second.png`, `audit/desktop-home-first-second.png`.
5. **The site is on http, not https.** `http://gsguttersllc.com/` stays on http after loading (final URL unchanged). https://gsguttersllc.com/ also answers 200, but nothing sends visitors there, so browsers can mark the contact form page "Not secure."
6. **The contact form has no spam protection, and the top-bar email opens a different address than it shows.** Form fields: Name, Phone Number, Email Address, Address, Message, Submit. No reCAPTCHA, hCaptcha or Turnstile script, frame or element on the page (0 matches). The email in the very top bar reads info@gsguttersllc.com but its link is `mailto:Nelsongaldamez2020@gmail.com`; the footer link opens info@gsguttersllc.com. Screenshot: `audit/mobile-contact.png`.
7. **The contact page gives no street address and no hours in its body.** "Office Location: Wichita, ks" only. The footer shows "Mon – Sat: 7.00AM – 5.00PM" but that is not repeated on the contact page and is not in facts.md, so it is unconfirmed here.
8. **Titles and typos.** Home title "GS Gutters LLC | GS Gutters LLC" (name twice, no town or work). Footer "90 Milles Around" and "Wichita, ks"; remodeling and gutters headings "Choose GS Gutter"; footer "© 2023. By Top Floor Marketing." in November 2026.
9. **Page speed.** Not scored with Lighthouse or PageSpeed. facts.md records home 2.7 to 3.6 s load and about 44 plugins (Divi, Revslider); not re-measured here.

## Not checked
- The floating blue button overlapping body text on mobile (noted in facts.md) was not re-verified in a screenshot.
- Form submission, and where the form posts the data (no test lead sent).
- Google profile hours and services against the site.
- Sitebulb export: none provided.
