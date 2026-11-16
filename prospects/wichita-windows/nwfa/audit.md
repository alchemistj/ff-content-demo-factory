# New Windows For America: current-site audit

Site: https://nwfawichita.com/ (Gator site builder). Audited 2026-11-09 with Playwright (Chromium) at 390x844 and 1440x900. Screenshots are in `audit/`. Every link was opened by address; nothing was submitted.

## What works
- The homepage loads, with a real line about the work: "Known for windows. Trusted for the rest of your home."
- The banner names six kinds of work: Windows, Siding, Roofing, Insulation, HVAC, Remodeling.
- "Since 2014" appears at the top.
- The Google profile has a phone number, (316) 263-0711, that matches BBB and Hitachi's contractor page.

## What is broken, most costly first

1. **There is no phone number anywhere on the site.** The homepage has 0 `tel:` links and no number in its text, at both screen sizes. The only way to reach the business is to leave the site. Screenshots: `audit/mobile-home.png`, `audit/desktop-home.png`.
2. **Every inner page is a "Page Not Found".** Clicked: Services (`/services`), About us (`/about%20us`) and Contact (`/contact`) all show "Page Not Found. Oh, man. Looks like you're totally lost." The first three return a 200 status with the 404 text inside; `/about-us` is a real 404. Screenshots: `audit/desktop-services.png`, `audit/desktop-contact.png`, `audit/mobile-contact.png`.
3. **The service tiles lead to the dead page.** "Vinyl Windows" and "Siding" both link to `/services`, the 404. "Roofing" has no link at all. So there is no page for any service, and no contact page or form (0 forms, 0 iframes on the four pages loaded, so no spam protection either).
4. **The word "Wichita" appears nowhere on the page,** and there is no address, hours or email. The browser tab says only "Home". Google cannot tell this is a Wichita company. Screenshot: `audit/desktop-home.png`.
5. **The headline leads with windows, but the reviews are about insulation.** 36 of the 48 written Google reviews (75%) are insulation and weatherization jobs; 4 are windows or doors, and the newest of those is May 2022. The site mentions insulation only in a banner and one sentence, and the home page has no H1 element.
6. **It is built for a desktop screen.** The viewport tag is fixed at `width=1024`, so on a 390-pixel phone the page measures 1024 pixels wide and shrinks. Screenshot: `audit/mobile-home.png`.
7. **No reviews and no photos of work** appear anywhere, with 54 Google reviews (4.7) unused.
8. **Cosmetic:** the copyright line reads "© 2026 All Rights Reserved." with no business name.

## Offices and Google profile
- One office. Google: 3949 Bridgeport Cir, Wichita, KS 67219, (316) 263-0711. BBB and Hitachi's page agree on the address. The site shows neither.
- Other directories show a second number, (316) 832-1004, and other addresses (Park City, S Laura St). Not verified.

## Headline, titles, services
- Homepage: no H1 element; hero text "Known for windows. Trusted for the rest of your home." Title: "Home". Other pages' title: "404 - Page Not Found".
- Services named: windows, siding, roofing, insulation, HVAC, remodeling. None has a page.

## Not checked
- Page speed score not run. No Sitebulb export provided. Gator pages are JavaScript-rendered; the menu has no separate mobile button (the same four links show at 390 pixels, shrunken). BuildZoom, Angi, Manta and Yelp returned 403 for the facts file, so those are unchecked.
