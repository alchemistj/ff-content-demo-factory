# TWG Construction: current-site audit

Site: https://twgconstruction.biz/ (WordPress). Audited 2026-11-09 with Playwright (Chromium) at 390x844 and 1440x900. Screenshots are in `audit/`.

## What works
- The "Call Now" button and the number in the contact block are `tel:` links at both screen sizes.
- A real request form (First Name, Last Name, Email, Phone Number, City, Zipcode, Message) with reCAPTCHA in the page source.
- A clear promise block: 100% Satisfaction Guarantee, "We help maximize insurance claims", licensed and insured.

## What is broken, most costly first

1. **The headline never says roofing.** The only large headline is "Your Trusted Remodeling & Renovation Contractors in Wichita, KS" (it is an H2; the page has no H1 at all). The services line under it starts "Roofing | Storm Damage | Siding | Painting | Windows & Doors | Decking". Browser tab title: "TWG Construction – Serving Wichita homeowners with quality you can trust since 1986." A homeowner searching "roofing company Wichita KS" gets no match on the words. Reviews are mostly roofs, hail and insurance. Screenshots: `audit/desktop-home-top.png`, `audit/mobile-home-top.png`.
2. **Two phone numbers and two suites.** The site shows 316.776.4748 (both the "Call Now" button and the contact block) and "2801 Kellogg Drive South, Suite 102". The Google profile shows (316) 685-1010 and "2801 #101 E Kellogg Dr S", and GuildQuality and MapQuest agree with Google. (316) 685-1010 appears nowhere on the site. A customer who finds both may call neither. Which line is current is not settled. Screenshot: `audit/desktop-home-full.png` (contact block at the bottom).
3. **The whole site is one page.** Every menu link ("About", "Services", "Testimonials", "Contact Us", all three "Request A Free Estimate" buttons) is a `#` anchor on the same page. `/services`, `/about`, `/about-us`, `/contact-us` and `/contact` all return 404 "Page not found". Roofing, hail damage and insurance share a few lines with five other services; there is no page for any of them. Screenshot: `audit/desktop-services-404.png`.
4. **The Windows & Doors paragraph describes only doors**, although the company is known as "The Window Guys" and about 6 of 32 reviews are about windows: "Choose from a wide selection of vinyl, wood, fiberglass, entry, and security doors."
5. **Insurance, the thing reviewers praise most, gets one sentence:** "We'll also work directly with your insurance adjuster to maximize coverage", after the services list.
6. **The three testimonials do not match Google.** Michael S. and Mark B. appear on the site in reworded form (for example, the site's Michael S. says the roof "has held up through several storms"; his Google review says "has been up long enough to go through several rain storms"). "Diana W." was not found among the 29 reviews we pulled (3 of the 32 have no text, so she could be one of those). None of the 32 reviews is quoted word for word.
7. **A WordPress sample page is live** at /sample-page/ with default text. Screenshot: `audit/desktop-sample-page.png`.
8. **The "Call Now" link has a stray space.** Its href is `tel:%203167764748` (a leading encoded space), while the contact block's link is `tel:3167764748`. Most phones will still dial; not tested on a device.
9. **Years are contradictory.** "since 1986", "30+ years of experience", "nearly four decades" and "over 30 years" all appear.
10. **Cosmetic:** "© Copyright 2025" in November 2026.

## Offices and Google profile
- One office: Wichita, KS. Google profile phone (316) 685-1010; Google address 2801 #101 E Kellogg Dr S, Wichita, KS 67211. Site: 316.776.4748 and Suite 102, ZIP 67211.

## Headline, titles, services
- Homepage headline (H2): "Your Trusted Remodeling & Renovation Contractors in Wichita, KS". No H1 tag. Titles for other pages: none (404s).
- Services named: Roofing, Siding Installation, Hail & Storm Damage Repair, Painting, Windows & Doors, Decking & Outdoor Renovations. None has its own page.

## Not checked
- No Lighthouse or PageSpeed score was run.
- The mobile menu button was clicked once (screenshot `audit/mobile-menu.png`); its links are the same `#` anchors as on desktop.
- The form was not submitted, so what it does with the data is unverified.
- Whether either phone number is answered was not tested. Google profile hours were not compared (the site shows none).
- Sitebulb export: none provided.
