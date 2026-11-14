# Audit: brockmeyerinc.com (current site)

Checked 2026-11-13 with Playwright (Chromium, headless). Desktop 1440×900 and mobile 390×844. Form NOT submitted. Screenshots in `audit/`. Raw crawl data kept outside this folder.

## Summary
- No broken pages: the crawl reached 8 pages, all returned 200, no console or load errors.
- Mobile: the layout is 768px wide inside a 390px phone screen, so every page scrolls sideways by 378px. The top of the home page looks normal at 390px. The overflow comes from the desktop-width layout and nav.
- Copy: H1s are slogans, not service+city. Owner not named. No About page. Testimonials block shows no text. 58 of 61 homepage images have no alt text.
- Phone and email are present and correct. Address and hours are printed in the footer.

## Menu, links and buttons
- Nav (href level, all 200): Home /, Residential Electrician /residential-electrician, Commercial Electrician /commercial-electrician, Request Free Estimate /contact-us#RequestFreeEstimate, Blog /blog, Contact Us /contact-us. The UI click test on the nav timed out on my locator, so I am reporting href-level results only.
- "Request Free Estimate": 23 instances on the home page, all linking to /contact-us#RequestFreeEstimate. The visible one lands on the contact page and scrolls to the form. The form-visibility check was inconclusive.
- Mobile menu: a "menu" button is present at 390px. Clicking it opened without error (screenshot `audit/mobile-home-390-menu-open.png`).
- Footer "Site Creds" and "Legal Notice" both go to https://www.steadfastmediallc.com/ and /legal-notice (external, site credit).
- Blog post pages: no 404s found in the crawl.

## tel: and mailto:
- tel: links on home: 2 (`tel:316-262-1440`, one visible, one hidden in the mobile header). Tappable as tel: links.
- Commercial page body copy "Call us today at (316) 262-1440" is plain text, not a link.
- Contact page: 5 tel: links in DOM (duplicates of the same number, not all visible), 2 plain-text occurrences.
- mailto: `office@brockmeyerinc.com`, 3 links on home.

## Contact form
- URL: https://www.brockmeyerinc.com/contact-us (same form repeated on home, /residential-electrician, /commercial-electrician, /blog).
- Fields: Name (`dmform-0`), Email (`dmform-1`), Phone (`dmform-2`), Service select (`dmform-5`: blank, "Residential Electrician", "Commercial Electrician"), message textarea "How may we help you?" (`dmform-3`), Submit. Hidden fields for Duda form handling.
- Required fields: none. maxlength: none on any field.
- CAPTCHA: the form markup has `data-require-captcha="true"` and `captcha-lang="en"`. No reCAPTCHA/hCaptcha/Turnstile script, iframe or widget rendered on any page I loaded. Whether a CAPTCHA appears at send time is UNVERIFIED (not submitted).
- iframe: none on the form.
- Form is duplicated in the DOM (3 copies per page), with only one visible set.

## Placeholder, copied and sample content
- No lorem ipsum or "placeholder" text found.
- Commercial page DOM contains a hidden H1 "Powering Homes, One Wire at a Time!" (the residential slogan), `display:none`. Visible H1 is "High Voltage Expertise for High-Performing Businesses!". Copied hero line in the markup.
- Homepage H1 "From Dim to Dazzling – We've Got the Wiring Right." appears twice in DOM (one copy hidden).
- Typo on commercial page: "Commericial Specialty Services" (H3 heading).
- Tagline changes by page: home and residential "From Our Family to Yours – Lighting the Way Since 2005"; commercial "From Our Business to Yours – Lighting the Way Since 2005".
- Testimonials: under "Watt Our Customers Are Saying!" (all pages), the block is a third-party "Free Google Reviews Widget". Rendered text: none. No quotes visible on any page I loaded. Whether the widget loads for real visitors is UNVERIFIED.

## Page titles and H1s
| Page | Title | Visible H1 |
|---|---|---|
| / | Brockmeyer Inc. \| Trusted Electricians in Wichita, KS | From Dim to Dazzling – We've Got the Wiring Right. |
| /residential-electrician | Residential Electrician in Wichita \| Brockmeyer Inc. | Powering Homes, One Wire at a Time! |
| /commercial-electrician | Commercial Electrician in Wichita \| Brockmeyer Inc. | High Voltage Expertise for High-Performing Businesses! |
| /blog | Brockmeyer Inc. Blog \| Wichita Electricians | Brockmeyer Inc.'s Blog |
| /contact-us | Contact Brockmeyer Inc. \| Wichita Electricians | none (h2 "Contact Us") |
| /summer-electrical-safety-tips-for-wichita-homeowners | Summer Electrical Safety Tips for Wichita Homeowners | same as title (no brand in title) |
| /planning-a-backyard-oasis-dont-forget-safe-outdoor-wiring | Planning a Backyard Oasis? Don't Forget Safe Outdoor Wiring | same as title (no brand in title) |

Meta description (home): "Expert residential & commercial electricians serving Wichita & beyond. Call now for reliable electrical service!"

## Office addresses and phones
- Address (footer, all pages): 408 S Ida, Wichita, KS 67211. No street suffix shown; no suite.
- Phone (footer, all pages): 316-262-1440. Body copy: (316) 262-1440. Same number everywhere on site.
- Email (footer, all pages): office@brockmeyerinc.com.
- Only one office address on the site.

## Word counts (visible text)
- / : 433
- /residential-electrician : 259
- /commercial-electrician : 305
- /blog : 183
- /contact-us : 162
- /summer-electrical-safety-tips-for-wichita-homeowners : 438
- /planning-a-backyard-oasis-dont-forget-safe-outdoor-wiring : 421

## Speed and mobile
- Desktop load event (single headless run, not a speed test): 2.7 to 3.9 seconds per page. Not measured on mobile network.
- Mobile horizontal overflow: `scrollWidth` 768 vs `clientWidth` 390 on every page crawled (378px). Cause: site renders a 768px-wide desktop layout (`dmInner` 768px); top nav items extend to x=787. Screenshots: `audit/mobile-home-390-top.png` (top looks normal), `audit/mobile-home-full.png` (full page).
- Images: 61 on home, 58 with no `alt` attribute.
- Third-party scripts: UserWay accessibility widget (cdn.userway.org; "Accessibility Menu" button present). Duda platform.

## Other observations
- Blog: 2 posts. JSON-LD datePublished 2025-06-24 (both posts); dateModified 2026-05-18. No author names.
- Footer credit links to steadfastmediallc.com (site builder or agency; not verified which).
- WebSite JSON-LD on home only. No LocalBusiness or Organization schema found.
- Logo in header reads "Brockmeyer Inc. / ELECTRICAL CONTRACTOR / LIC # 11704" (read from a 4x crop, `audit/logo-crop-x4.png`; the digits are low-resolution, so re-check against the original logo file).

## Screenshots (`audit/`)
- `mobile-home-390-top.png`: 390px top of home.
- `mobile-home-390-menu-open.png`: mobile menu opened.
- `mobile-home-full.png`: full-page mobile home (shows the 768px layout).
- `logo-crop-x4.png`: logo, 4x crop.
- `d*.png` and `m*.png`: desktop and mobile screenshots of each crawled page.
