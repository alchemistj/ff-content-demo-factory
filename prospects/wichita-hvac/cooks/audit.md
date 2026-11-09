# Current-site audit: Cook's Heating and Cooling

Site: https://www.cookshvac.com/ (HTTP redirects to HTTPS). Audited 2026-11-09 with Playwright (Chromium, `/opt/node-tools`) at 1440x900 (desktop) and 390x844 (phone). Crawl data: scratchpad `crawl-out/crawl-desktop.json` and `crawl-mobile.json`. Screenshots in `audit/`. Forms were NOT submitted.

**Status:** desktop and phone crawls complete (phone: menu, phone links and forms; see "Phone pass"). Sitebulb: no export in the folder. PageSpeed: not run.

## What works
- **Menu, desktop (1440):** Home, Products & Services, Maintenance, Energy Tips, About Us and Contact each go to the right page with the right H1 (clicked from every page, `crawl-desktop.json`). The logo goes to the homepage.
- **Footer links** (Products & Services, Maintenance, Energy Tips, About Us, Contact Us): all go to the right page.
- **Home service cards and text links:** "Air Filtration" goes to /services/air-quality; "Annual Maintenance" to /maintenance/; "Air Conditioning..." to /services/air-conditioning; "Heating..." to /services/heating; "Learn Ways to Save Money..." to /energytips/. All reached their page.
- **Phone, desktop top bar:** one tappable link, `tel:3169452665`, shown as 316.945.2665. The `tel:` matches the number shown. Present on every page.
- **Contact page location block:** `tel:3169452665` shown as 316-945-2665. Matches.
- **Contact form exists** (see Forms below).
- **Facebook link** (https://www.facebook.com/BBHCOOKS) returns 200 on every page (curl). Page content not checked.
- **External logo links** on the homepage (york.com, wabahome.com, trane.com) return 200 (curl).
- **Missing page** returns a real 404, not a redirect to home (https://www.cookshvac.com/nonexistent-page-xyz).

## What's broken, most costly first

1. **Homepage has no headline.** The `<h1>` holds only the logo image (alt="") and reads empty. Visible on the 1440 homepage (`audit/desktop-home-viewport-1440.png`). Every other page's H1 is also an empty logo plus a short title, e.g. /services/ "Products & Services", /about/ "About Us". Service pages have a town-based H1 ("Wichita Heating Installation, Repair & Service"), but the homepage, the first page people see, has no work or town in its headline. Title tag: "Home - Cook's Heating and Cooling" (no city, no service).

2. **Brand claims that the manufacturer locators do not back up.** The services page says: "Our top brands for new installs are Trane, Goodman and Carrier" (https://www.cookshvac.com/services/). The homepage shows Trane, York and WABA logos (https://www.cookshvac.com/).
   - Carrier locator, ZIP 67213: "2 dealers servicing near 67213": Fahnestock Heating and Air Conditioning (Wichita) and Becker Brothers (Garden Plain). Cook's is not listed. Screenshot `audit/locator-carrier-67213.png`.
   - Trane locator, Wichita: "6 dealers servicing near Wichita, KS": Dan's Heating and Cooling, Frederick Plumbing & Heating, Moody Heating and Air Conditioning, Kelley & Dawson Service and two others. Cook's is not listed. Screenshot `audit/locator-trane-wichita.png`.
   - Impact: any brand claim on a demo must be left out until confirmed. Also a credibility risk for the current site.

3. **Phone numbers are not tappable in the footer and fax.** Every page footer shows "Phone: 316-945-2665" and "Fax: 316-945-7944" as plain text (no `tel:` link). Only the top bar has a tappable number, so a visitor who scrolls to the footer cannot tap the phone. (Crawl: `telLinks` on every page: 2 entries, one visible in header; footer has none.)

4. **Copyright is 2016.** "Copyright © 2016 - Cooks Heating & Cooling" on every page (footer). Stale and reads as an unmaintained site.

5. **No live email.** The one email on the site, service@cookshvac.com, is inside an HTML comment in the footer (not rendered, not clickable). Visitors see no email. The contact form is the only way to reach them online.

6. **Contact form: no spam protection found.** The contact page has a form: fields "name" (text), "email" (email), "comment" (textarea), button "Send", action `formprocessor.php` (https://www.cookshvac.com/contact/). Crawler found no reCAPTCHA, hCaptcha or Turnstile in the page HTML. Not submitted (per brief). Success/error messages exist in the markup ("Your message has been sent" / "There was a problem") but are hidden until a send.

7. **Thin pages.** Homepage 159 words. /about/ 227 words, /contact/ 81 words. Service pages 262 to 460 words each. Each service page has its own URL, so the services question is answered (see below), but the copy is generic ("Improve the level of comfort..."), with no reviews, photos or proof.

8. **Hidden template text.** `<span class="descriptions">Site Desc</span>` is in the header on every page. Hidden at 1440 (not visible); check the phone pass.

9. **Hours are footer-only and show no weekend.** The footer table says Mon-Fri 8am-5pm and "Emergency Services: 5pm-10pm" (every page). No Saturday or Sunday line either way. Low cost, but worth asking about.

## Services
- Each service the site names has its own page: Heating (/services/heating), Air Conditioning (/services/air-conditioning), Air Quality (/services/air-quality), Maintenance (/maintenance/). Energy Tips (/energytips/) is content, not a service.
- Air Quality page H1 "Wichita Air Quality"; Air Conditioning "Wichita Air Conditioning Installation, Service, and Repair"; Heating "Wichita Heating Installation, Repair & Service".

## Title and H1 per page
| Page | Title | H1 (visible text) |
| --- | --- | --- |
| / | Home - Cook's Heating and Cooling | (empty; logo only) |
| /services/ | Products & Services - Cook's Heating and Cooling | Products & Services |
| /maintenance/ | Maintenance - Cook's Heating and Cooling | Maintenance |
| /energytips/ | Energy Tips - Cook's Heating and Cooling | Energy Tips |
| /about/ | About Us - Cook's Heating and Cooling | About Us |
| /contact/ | Contact - Cook's Heating and Cooling | Contact Us |
| /services/air-quality | Air Quality - Cook's Heating and Cooling | Wichita Air Quality |
| /services/air-conditioning | Air Conditioning Installation, Service, and Repair - Cook's Heating and Cooling | Wichita Air Conditioning Installation, Service, and Repair |
| /services/heating | Heating Installation, Repair &amp; Service - Cook's Heating and Cooling | Wichita Heating Installation, Repair &amp; Service |

## Offices
- One office: 2215 S. West St., Wichita, KS 67213. Phone 316-945-2665. Fax 316-945-7944 (https://www.cookshvac.com/contact/).
- Google profile: 2215 S West St, Wichita KS 67213, (316) 945-2665. Matches. No second office found on the site, and no OKC or other office named.

## Site versus Google profile
- Name, address and phone match (`reviews.json` "place"). Hours and services on the Google profile: not captured (listing not opened). Unverified.

## Placeholder or template text
- None found except "Site Desc" (hidden). No lorem ipsum, sample testimonials, "copy-of" pages, or wrong city. (Crawl placeholder check on each page.)

## Phone pass (390x844)
- Crawl run 2026-11-09 (`crawl-out/crawl-mobile.json`). All 9 pages load, no errors.
- **Menu:** the hamburger opens the menu. All six mobile-menu links (Home, Products & Services, Maintenance, Energy Tips, About Us, Contact) go to the right page on every page (81 clicks, 0 failures).
- **Phone:** the visible "Call us" link in the top bar is `tel:3169452665` and dials the shown number. The duplicate desktop link is hidden at this width. Footer phone and fax are plain text (same as desktop). Contact page location `316-945-2665` is a tel link.
- **Forms:** the contact form is present (name, email, comment, Send). No CAPTCHA found. Not submitted.
- **Titles and H1s:** same as desktop (see table above).
- **Screenshots:** `audit/mobile-home-viewport-390.png`, `audit/mobile-contact-viewport-390.png`.
- **Not checked at phone width:** horizontal scrolling, text size and tap-target spacing. The crawl did not measure them. Mobile body and card links were not clicked (desktop covered them; the mobile pass clicked the header and mobile-menu links only, per a `MENU_ONLY` run).

## Could not check
- Google listing hours and services (not opened).
- Sitebulb: no export in the folder.
- PageSpeed / speed score: not run.
- Facebook page content (link returns 200; page not read).
- Phone width: horizontal scroll and tap-target spacing (see phone pass).
- Locators for Goodman, Lennox, Rheem and American Standard: not checked for ZIP 67213.
