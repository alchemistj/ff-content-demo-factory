# Current-site audit: Guardian Roofing & Gutters

Site: https://www.guardingthefort.com/ (http redirects to https)
Pages: 25 unique pages crawled (home, contact, about, reviews, service-area, financing, insurance-claims, services, and 16 service pages). Run 2026-11-15, Playwright Chromium, 1440x900 and 390x844.
Method: read-only. No form was typed in or submitted. Every header/nav link target (26) was requested and returned 200. The mobile menu button was clicked at 390 px and opened the nav.
Screenshot kept: `audit/contact-form-1440.png` (the contact form as rendered). No broken pages were found, so no other screenshots are kept.

## Contact form (for the record)

- **URL:** https://www.guardingthefort.com/contact.html. The same form also sits on the homepage (/).
- **Fields (visible):** First Name*, Last Name*, Email*, Phone*, ZIP Code*, Service Needed* (select: Select one, Roof Replacement, Roof Repair, Storm / Insurance Claim, Gutters & Guards, Siding & Windows, Commercial Roofing, Not sure please advise), How did you find us?* (select: Google Search, Facebook or Instagram, Referral, Saw our truck or yard sign, Nextdoor, Other), Tell us about it (optional textarea).
- **Required:** 7 fields, each marked *: First Name, Last Name, Email, Phone, ZIP Code, Service Needed (select), How did you find us? (select).
- **CAPTCHA:** none. No reCAPTCHA, hCaptcha or Turnstile script, iframe or badge on the page.
- **Iframe:** none.
- **maxlength:** none on any field.
- **Honeypot:** a hidden checkbox named `botcheck`, placed off-screen (x = -9995 px, opacity 0).
- **Form element in the DOM:** method GET, action blank. The handler was not confirmed; I did not submit to find out.
- **Submit button:** "Send Quote Request →".
- **Consent line:** "By submitting, you consent to be contacted by phone, text, and email. Reply STOP to opt out."

## What works

- **Header menu:** all 26 nav link targets return 200 with no redirect (services, the 16 service pages, service area, reviews, financing, insurance claims, gallery, about, contact). The "Get a Free Quote" button goes to /contact.html.
- **Mobile menu button:** opens the nav at 390 px (checked by clicking it).
- **Phone links:** every `tel:` link is `tel:+12606198026`. Visible, tappable link at 390 px on every page (3 to 5 per page).
- **Mailto:** `mailto:tyler@guardingthefort.com`, visible on every page.
- **Horizontal overflow:** none. Page width is 390 px at 390 px viewport on all 25 pages.
- **Titles, H1s and word counts:** see table below.
- **No placeholder or copied text** found (no lorem ipsum, "example.com", or sample names in the text).

## Titles and H1s (each page)

| Page | Title | H1 | Words |
|---|---|---|---|
| / (homepage) | Guardian Roofing & Gutters / Fort Wayne, IN Roofing Contractor | Roofing & Gutters, Done Right by Family. | 1166 |
| /index.html | same as / | same as / | 1166 |
| /contact.html | Get a Free Quote / Guardian Roofing & Gutters / Fort Wayne, IN | Tell us about your project. | 565 |
| /about.html | About / Guardian Roofing & Gutters / Fort Wayne, IN | A young owner with an old-school standard. | 753 |
| /reviews.html | Reviews / 100+ Five-Star Google Reviews / Guardian Roofing & Gutters | 100+ five-star reviews from Fort Wayne homeowners. | 573 |
| /service-area.html | Service Area / Fort Wayne & NE Indiana / Guardian Roofing & Gutters | Roofing & gutters across Fort Wayne & Northeast Indiana. | 522 |
| /financing.html | Roof Financing / 0% Options via Enhancify / Guardian Roofing & Gutters | A new roof now. A payment plan that fits. | 592 |
| /insurance-claims.html | Storm Damage & Insurance Claims / Guardian Roofing & Gutters / Fort Wayne, IN | Storm hit your roof? We handle the claim, start to finish. | 765 |
| /services.html | Services / Guardian Roofing & Gutters / Fort Wayne, IN | Roofing, Gutters & Exterior Services in Fort Wayne, IN. | 892 |
| /roof-replacement.html | Roof Replacement in Fort Wayne, IN / Guardian Roofing & Gutters | Roof Replacement in Fort Wayne | 510 |
| /roof-repair.html | Roof Repair in Fort Wayne, IN / Guardian Roofing & Gutters | Roof Repair in Fort Wayne | 468 |
| /emergency-roofing.html | Emergency Roofing in Fort Wayne, IN / Guardian Roofing & Gutters | Emergency Roofing in Fort Wayne | 477 |
| /shingle-roofing.html | Shingle Roofing in Fort Wayne, IN / Guardian Roofing & Gutters | Shingle Roofing in Fort Wayne | 460 |
| /flat-roofing.html | Flat Roofing in Fort Wayne, IN / Guardian Roofing & Gutters | Flat & Low-Slope Roofing in Fort Wayne | 455 |
| /metal-roofing.html | Metal Roofing in Fort Wayne, IN / Guardian Roofing & Gutters | Metal Roofing in Fort Wayne | 474 |
| /standing-seam-metal.html | Standing Seam Metal in Fort Wayne, IN / Guardian Roofing & Gutters | Standing Seam Metal Roofing in Fort Wayne | 463 |
| /exposed-fastener-metal.html | Exposed Fastener Metal in Fort Wayne, IN / Guardian Roofing & Gutters | Exposed Fastener Metal Roofing in Fort Wayne | 460 |
| /commercial-roofing.html | Commercial Roofing in Fort Wayne, IN / Guardian Roofing & Gutters | Commercial Roofing in Fort Wayne | 439 |
| /industrial-roofing.html | Industrial Roofing in Fort Wayne, IN / Guardian Roofing & Gutters | Industrial Roofing in Fort Wayne | 430 |
| /storm-damage-inspections.html | Storm Damage Inspections in Fort Wayne, IN / Guardian Roofing & Gutters | Storm Damage Inspections in Fort Wayne | 486 |
| /gutter-installation.html | Gutter Installation in Fort Wayne, IN / Guardian Roofing & Gutters | Seamless Gutter Installation in Fort Wayne | 452 |
| /gutter-repair.html | Gutter Repair in Fort Wayne, IN / Guardian Roofing & Gutters | Gutter Repair & Guards in Fort Wayne | 457 |
| /siding.html | Siding in Fort Wayne, IN / Guardian Roofing & Gutters | Siding Installation in Fort Wayne | 452 |
| /windows.html | Windows in Fort Wayne, IN / Guardian Roofing & Gutters | Window Replacement in Fort Wayne | 430 |
| /soffit-fascia.html | Soffit & Fascia in Fort Wayne, IN / Guardian Roofing & Gutters | Soffit & Fascia in Fort Wayne | 464 |

## Findings

1. **Duplicate homepage URL.** /index.html and / serve the same page (same title, H1 and word count). Search engines may index both. Low cost, easy fix.
2. **Templated service pages.** Sixteen service pages have the same structure and similar length (430 to 510 words). Each H1 is "[Service] in Fort Wayne", so the set reads as one template with the service name swapped. The page text is not wrong; it is repetitive. This is the basis of the fit decision in qualify.md.
3. **Homepage offer bar repeats.** The "$1,000 upgrade with every roof replacement" line appears five times in the homepage text, which is the source of a scrolling marquee. Repetition in the markup, not a broken layout.
4. **Form has no spam check beyond a hidden checkbox.** No CAPTCHA was seen. This is a fact, not a defect: the form is open to bots, and the honeypot is the only defense.
5. **No street address on the site.** Footer and about page say "Fort Wayne, Indiana" and "Headquartered in Fort Wayne". The Google record has 6130 Stellhorn Rd, Fort Wayne, IN 46815 (from `reviews.json`). The site does not show it.

## Speed and mobile

- Homepage load in local Chromium (no throttling): about 1.4 s to the load event, about 9 KB of HTML transferred. This is not a PageSpeed or Lighthouse score; none was run.
- No horizontal page scroll at 390 px on any of the 25 pages.

## Not checked (and why)

- **Form submission:** not submitted, per the brief. Whether the handler sends email is unknown.
- **Google profile:** not opened. The rating and count come from `reviews.json` (4.9, 117).
- **BBB, certifications, licence:** the site claims "BBB A+ Rated", "GAF & Owens Corning Certified", "Licensed & Insured". None was checked against BBB or the manufacturers' locators. See facts.md.
- **Phone dialing on a real phone:** no device. The links are correctly formed `tel:` links.
- **Hidden honeypot field** was checked by position and opacity only.
