# ICT Roofing & Exteriors: current-site audit

Site: https://www.ict-roofing.com/ (Squarespace, 8 pages found). Audited 2026-11-09 with Playwright (Chromium) at 390x844 and 1440x900. Screenshots are in `audit/`. Crawl data: `/tmp/claude-0/-home-user/9d8118b7-f5b3-5447-8eb5-932524a50e8e/scratchpad/ict/crawl.json` and `menu.json`.

## What works
- Phone links dial the right numbers. The main number is `tel:3167966722` = (316) 796-6722, in the header and footer on every page checked. Arturo Veliz's number `tel:3168078848` = (316) 807-8848 is on /contact and dials what it shows. Source: https://www.ict-roofing.com/contact
- Email links match the addresses shown: `mailto:info@ict-roofing.com`, and on /contact `mailto:JUAN@ICT-ROOFING.COM` and `mailto:ARTURO@ICT-ROOFING.COM`.
- The contact form has invisible spam protection (a Google reCAPTCHA Enterprise frame is present on the homepage and /contact).
- The Insurance page has real, specific copy on claim help (https://www.ict-roofing.com/insurance).
- Nothing is broken at the server level: all pages returned HTTP 200, apart from /about, which redirects (302) to /insurance. No JavaScript errors on any page.
- The Google profile phone (316) 796-6722 matches the site's main number.

## What is broken, most costly first

1. **Every page title is the Squarespace default.** Homepage `<title>` is exactly "Your Site Title". Other pages read "SERVICES — Your Site Title", "INSURANCE — Your Site Title", "PROJECTS — Your Site Title", "CONTACT — Your Site Title", "Rooms & Rates — Your Site Title". No title names the company, the trade or Wichita. Source: curl and crawl of all pages, both sizes.

2. **No page has an H1.** The crawl found zero `<h1>` elements on all 8 pages at both sizes. The homepage's main headline "Built on Integrity, Backed by Experience." is an H2. Neither the headline nor any H1 says roofing, Wichita or replacement. Screenshot: `audit/desktop-home-title-no-h1.png`.

3. **Hotel template page is linked from the homepage.** The Roofing card's "Learn More" button links to /rooms-rates (source HTML: `href="/rooms-rates"` sits directly after the text "Roofing... repair services for residential and commercial properties."). /rooms-rates is titled "Rooms & Rates" and lists "Standard Room $100/night", "Deluxe Room $200/night", "Mountain Suite $300/night" and "Lake Suite $400/night" with bed and lake descriptions. It is a hotel page copied into a roofing site. Screenshot: `audit/desktop-rooms-rates.png`. (My crawl's click on this button landed on /contact, because the click matched the wrong button by text. The HTML link is the evidence here, not the click.)

4. **"About" opens the Insurance page.** /about returns 302 to /insurance (curl: `location: /insurance`). In the mobile menu, "Folder: ABOUT" links to /about, which shows the insurance page. The About page content is missing: the only team info is the names on /contact. Screenshot: `audit/desktop-about-lands-on-insurance.png`. Desktop: at 1440 px the top nav shows only SERVICES, PROJECTS, CONTACT and CONTACT US. ABOUT and INSURANCE are not visible there. I did not open the desktop folder to confirm where it goes.

5. **Leftover cart page reachable in the markup.** /cart renders "SHOPPING CART. You have nothing in your shopping cart. CONTINUE SHOPPING". It is in the hidden nav markup and not visible on the page, so a visitor is unlikely to reach it. Screenshot: `audit/desktop-cart.png`.

6. **Images have no alt text.** On the homepage, 15 of 17 images have no `alt` attribute at 1440 px. The "Proud partner of:" logos have no alt text, so it is not possible to tell which manufacturers or partners they are from the markup. The About and Insurance pages have no content images.

7. **Forms: the contact form labels are not in the markup.** /contact has one form (fname, lname, email, a phone field, a message textarea, SUBMIT). The inputs have no label, aria-label or placeholder in the DOM, so screen readers and autofill get no field names. It has invisible reCAPTCHA Enterprise. Not submitted. Screenshot: `audit/desktop-contact.png`.

8. **Services page is short and generic.** /services lists four shingle types (Presidential Shake, Wood Shake, Metal, Composite Shake), "Exteriors" (residential siding) and "Gutters", each as a paragraph. There is no separate page for any service. The "Learn More" button on the Exteriors card goes to /services (the same page). SERVICES is one nav item, with no sub-items.

9. **Projects page is photos only.** /projects has 8 project images with "View fullsize" links (lightbox, `?itemId=` addresses). No captions, no town names, no job descriptions.

10. **Offices and team: three phone numbers, one address.** The site gives one street address for everything: 3500 N. Rock Road Bldg. 1800, Wichita KS 67226. The third-party directory rooferdirectory.co gives a different address for the same name and phone: 421 E 3rd St N, Wichita KS 67202. See facts.md. Team phones are on /contact only, and the footer shows only the main number.

11. **Unverified "accredited" claim.** The Services, Home and Insurance pages say "We're Proud Accredited Members of the Better Business Bureau." A BBB search found no profile for ICT Roofing & Exteriors at the site's address. Not confirmed. Do not repeat the claim on a demo without checking bbb.org.

12. **Not run.** No Lighthouse or PageSpeed score was taken, so there is no speed number. The mobile menu items were not clicked: the overlay blocked the Playwright clicks. Their hrefs were read from the DOM instead (see item 4).

## Offices and Google profile
- Site address: 3500 N. Rock Road Bldg. 1800, Wichita KS 67226 (all pages' footer). Team address repeats it on /contact.
- Directory address that conflicts: 421 E 3rd St N, Wichita KS 67202 (rooferdirectory.co listing, same phone and website). I could not open the Google listing to see which address it uses.
- Phone: site (316) 796-6722 = Google profile phone. Matches.
- Hours: no hours on the site. A directory listing says Mon to Fri 8 AM to 5 PM (third-party, not Google). Not compared to Google.
- Second phone (316) 807-8848 is Arturo Veliz's line, shown only on /contact.

## Headline, titles, services
- Home H2: "Built on Integrity, Backed by Experience." Card names: Roofing, Exteriors. Gutters appear on /services.
- Titles: see item 1. H1s: none (item 2).
- Services named: roofing (residential and commercial, per /services), siding ("Exteriors"), gutters, insurance claim help (/insurance), free inspections (every page footer).

## Compared with the Google profile (scout data)
- Name: site "ICT Roofing & Exteriors" matches the scout name.
- Phone: matches.
- Rating and review count: the scout has 4.9 and 74 reviews. Directory listings say 4.9 from 68 (earlier) and 71 (July 2026). These differ, so the count is not settled.
- Services and hours: not compared to Google (could not open the Google listing).
- Google address: not checked. Directory and site addresses differ (see above).

## Things not checked
- Google listing itself (no Google access from here).
- Reviews (not pulled; they are for the Architect via reviews.json).
- Mobile hamburger menu clicks (overlay blocked Playwright clicks; hrefs read from DOM).
- Form submission (not done, per rules).
- Sitebulb export: none provided.
