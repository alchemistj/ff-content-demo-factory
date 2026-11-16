# Flawless Roofing Co: current-site audit

Site: https://flawlessroofingcousa.com/ (WordPress). Audited 2026-11-09 with Playwright (Chromium) at 390x844 and 1440x900. Screenshots are in `audit/`. Crawl data: `/tmp/claude-0/-home-user/9d8118b7-f5b3-5447-8eb5-932524a50e8e/scratchpad/flawless/crawl.json`, click results in `clicks.json`. The contact form was not submitted.

## What works
- Every phone link is a real `tel:` link to the number shown. All 8 `tel:` links on the homepage, and the links on the about, roofing, siding, gutters, painting, contact and policy pages, are `tel:+1 316-730-0301`, at both screen sizes. Headless Chromium cannot dial, so "it dials" is checked on the href only, not by a call.
- The owner email link `mailto:ravi@flawlessroofingcousa.com` matches the address it shows (header, footer, contact page).
- Menu links Roofing, Siding, Painting, Contact and About Us all go to the right pages (clicked at both sizes; the mobile menu opens with its toggle).
- The contact page has a real form with reCAPTCHA (see finding 6).
- Copyright line reads 2026, not stale.
- The site has a real page per service it names (roofing, siding, gutters, painting), each with its own H1 and some service detail.

## What is broken, most costly first

1. **"Services" is a dead link.** The header item "Services" (with a dropdown chevron) has `href="#"`. Clicked at both sizes: the page stays on the homepage. Nothing in the menu leads to a services page. Screenshot: `audit/desktop-services-menu-dead-link.png`.

2. **The homepage headline names neither the town nor the core work.** H1 is "Roofing Redefined for Modern Living." (no Wichita, no "roof replacement or repair"). The city appears only in a heading lower on the page, "Top Rated Roofing & Construction Services in Wichita, KS". Title: "Home - Flawless Roofing Co". Screenshots: `audit/desktop-home-h1.png`, `audit/mobile-home-h1.png`.

3. **Copy pasted from the roofing page onto other service pages.** "NEW ROOFS STARTS AT 99$" and "Every inch of your roof matters — we ensure precision in every inspection and installation." appear on the painting and gutters pages, and "NEW ROOFS STARTS AT 99$" also appears on siding and about. Painting and gutters are not roofing work. Screenshots: `audit/desktop-painting-roof-price-copy.png`, `audit/desktop-gutters-roof-copy.png`.

4. **Gallery "Load More" is a dead link, and gallery tiles open raw image files.** "Load More" has `href="#"` (homepage and about). The ten gallery tiles link straight to `/wp-content/uploads/2026/06/Mask-group-N.webp|png`, so a tap opens a bare image, not a project page. Screenshot: `audit/desktop-load-more-hash.png`.

5. **On the contact page, "Start A Project" is a dead link.** On the homepage, roofing, about, gutters and painting pages, "Start A Project" goes to `/contact/`. On the contact page itself, the same button has `href="#"`, so it goes nowhere. The contact page's "Get A Free Quote" section leads to the one form on that page.

6. **The contact form labels a field wrong.** The field labelled "Zip Code*" has the placeholder "Enter Subject". Fields: First Name*, Last Name*, Email*, Phone No.*, Zip Code* (placeholder "Enter Subject"), Details*. Spam protection: Google reCAPTCHA v2 checkbox (present in the rendered form and the page source). Not submitted, so whether it sends and where it goes is unverified. Screenshots: `audit/desktop-contact-form-fields.png`, `audit/mobile-contact-form-fields.png`.

7. **Testimonials heading with no testimonials showing.** "Our Testimonials" appears on the contact, roofing, siding, gutters and painting pages, and on the rendered contact page there is only the heading and no quotes. The slider may not have loaded in headless Chromium, so this is unverified beyond the rendered page. Screenshot: `audit/desktop-contact-testimonials-empty.png`.

8. **Conflicting customer-count claims.** The About page says "Trusted by 300+ happy homeowners across the USA". The homepage counter reads "82+ Happy Clients" in its settled state. Counters on the homepage and about page show "0 +" in the first frame because they animate in. Screenshots: `audit/desktop-about-300-claim.png`, `audit/desktop-home-counter-animation.png`.

9. **Claims with no proof on the site.** "Licensed and insured professionals you can trust" (about) and "Certified Roofing Experts" (roof replacement card) name no license number, insurer, or certifying body. "Only company doing FREE class 4 upgrades..." is a superlative with no source. BBB profile lists no license numbers (see facts.md section 4).

10. **Typos and template text in headings and copy.** "experieanced team" (homepage), "Constrcution" (about, homepage), "Accent Walls & Texturess" (painting), "Making Spaces Functional And Beautiful. And Beautiful." (about). Less costly than the above, but visible on the home page.

11. **No project or work page.** The gallery sits only on the homepage and about page, and its tiles are not linked to projects. "Construction & Repairs" appears in the homepage ticker but has no page or menu item.

## Phone and email, every place shown

| Where | Shown | Link |
| --- | --- | --- |
| Header (top bar and "Call Us Now") | +1 316-730-0301 | `tel:+1%20316-730-0301` (works) |
| Hero ("Call Us Now") | +1 316-730-0301 | `tel:+1%20316-730-0301` (works) |
| Contact page "Call Us" | +1 316-730-0301 | `tel:+1%20316-730-0301` (works) |
| Footer | +1 316-730-0301 | `tel:+1 316-730-0301` (works) |
| Email, header / footer / contact | ravi@flawlessroofingcousa.com | `mailto:ravi@flawlessroofingcousa.com` (matches) |

Only one phone number appears on the site. Only one office appears (928 S Broadway, Wichita). A second BBB-listed office in Derby uses the same number (see facts.md). Google profile phone (316) 730-0301 matches.

## Pages, titles, H1s (desktop and mobile identical)

| Page | `<title>` | H1 |
| --- | --- | --- |
| / | Home - Flawless Roofing Co | Roofing Redefined for Modern Living. |
| /about/ | About Us - Flawless Roofing Co | Your Trusted Partner in Roofing & Construction |
| /roofing/ | Roofing - Flawless Roofing Co | Roofing |
| /siding/ | Siding - Flawless Roofing Co | Siding |
| /gutters-gutter-guards/ | Gutters & Gutter Guards - Flawless Roofing Co | Gutters & Gutter Guards |
| /painting/ | Painting - Flawless Roofing Co | Painting |
| /contact/ | Contact - Flawless Roofing Co | Contact |
| /privacy-policy/ | Privacy Policy - Flawless Roofing Co | Privacy Policy |
| /terms-and-condition/ | Terms and Condition - Flawless Roofing Co | Terms and Condition |

## Menu and button links checked

- Header menu: About Us (/about/), Services (`#`, dead), Roofing (/roofing/), Siding (/siding/), Gutters & Gutter Guards (/gutters-gutter-guards/), Painting (/painting/), Contact (/contact/). The Roofing item opens a submenu on desktop; clicking it timed out on desktop but its href is /roofing/ and it loads on mobile.
- Header "Book Appointment" goes to /contact/ (no booking tool).
- Homepage "Read More" cards go to /roofing/, /siding/, /gutters-gutter-guards/. Hidden inside the slider at the time of the click test, so these were read from their hrefs, not clicked.
- "Start A Project" (hero, all service pages): /contact/ (except the contact page, where it is `#`).
- "Contact us" buttons on every page: /contact/.
- Facebook link: https://www.facebook.com/p/Flawless-Roofing-Construction-61565882431503/ (not opened; login wall in our tool).
- Footer "Our Services" list: Roofing, Siding, Painting, Gutters & Gutter Guards. Footer address is a Google Maps link.

## Speed and other checks not run
- No PageSpeed or Lighthouse score. No API key was available, and the Playwright run did not measure it.
- No Sitebulb export was provided for this site.
- Google profile hours and address were not in the scout data (only rating, reviews, phone and place ID), so they were not compared.
- The form was not submitted.
- Mobile menu was opened and clicked; the list above reflects those clicks.
