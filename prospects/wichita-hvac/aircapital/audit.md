# Current-site audit: Air Capital Heating and Air

Site: https://aircapitalheatingandair.com/ (redirects http to https; www also serves the site). Checked 2026-11-09 with Playwright (headless Chromium) at 390x844 (mobile, touch) and 1440x900 (desktop). Method per `docs/runtime/SITE-AUDIT.md`. Full-page screenshots for all ten pages at both sizes are in `audit/` (for example `audit/home-390x844.png`, `audit/residential-ac-1440x900.png`). The Enhancify financing landing is `audit/financing-enhancify-landing-390x844.png` and `audit/financing-enhancify-landing-1440x900.png`.

**Not checked:** page-speed score (no PageSpeed run), Sitebulb export (none supplied), Google Business Profile hours (not opened), form submission (not submitted, by rule), the owner's mailbox receiving mail, and the Ruud dealer status (locator is a JavaScript tool). Reviews are not yet pulled; see `facts.md`.

## What works

- **Phone links point at the shown number.** Every visible number is a `tel:` link to 316-990-1911 (checked from the `href` on every page at both sizes; a headless browser cannot place a call, so actual dialing was not tested). Header, footer, service cards and the contact block each carry one. Some links use `tel:+13169901911`, some `tel:3169901911`, and `/faqs` uses `tel:316-990-1911`. All point to the same line. Phone-number text on every page is 316-990-1911 or (316) 990-1911.
- **Email link matches its text.** `mailto:aircapitalheatingnair@gmail.com` on every page, same as the visible address (checked from the `href`; the mailto was not clicked). The domain question is finding 3.
- **Nav and footer links go where they say** (every unique link clicked at both sizes): Home, Financing, About Us, Residential AC, Residential Heating, Light Commercial, Contact Us, FAQs, Privacy Policy, Terms of Use. Each landed on the page its label names.
- **Mobile menu works.** The "More" button at 390 opens the menu (visible nav links go from 2 to 12). The desktop "More" button opens five more header links (7 to 12), so Residential Heating, Light Commercial, Contact Us and FAQs are in a dropdown at 1440.
- **"Schedule Service Today"** goes to /contact-us at both sizes. **"Learn More" under the welcome block** goes to /about-us-1 at both sizes.
- **Financing button works.** "Apply for Financing" on /financing opens a new tab at https://www.enhancify.com/air-capital-heating-air, a loan-calculator and application page titled "Get Financing Offers" under the name "Air Capital Heating & Air" (returned 200 at both sizes; screenshots above). This is the financing path the site intends.
- **No horizontal scroll.** Page width equals viewport width on all ten pages at 390 (measured).
- **Titles are unique per page** and each page has one H1. Copyright is current: "Copyright © 2026."
- **FAQ accordions open** (14 questions clicked; each stays on /faqs). Answer text was not captured in the crawl, so the answers themselves are not checked.
- **Cookie banner** works: Decline and Accept both close it and stay on the page.

## What is broken, most costly first

### 1. "Ruud authorized dealer" claim, unverified, on three pages
- **Where:** /residential-ac ("Ruud Authorized Dealer" banner, "As an authorized Ruud dealer, we install and service their full line", "Ruud authorized dealer & installer" in the list); /residential-heating (same wording); /light-commercial ("Ruud authorized commercial dealer"). The AC page meta description also says "Ruud-certified service."
- **Evidence:** page text from the crawl at both sizes. Ruud's locator (https://www.ruud.com/find-a-pro) is a JavaScript tool; the static page shows no Wichita result. Ruud's own search-result copy says locator contractors are not authorized by Ruud. Not confirmed.
- **Why it costs most:** the claim is repeated on three pages and is the main trust point on the two money services. If the dealer status is not current, the site makes a false claim in the owner's name. It is also the claim a new site most needs to back up before a rebuild copies it.
- **Screenshots:** `audit/residential-ac-390x844.png`, `audit/residential-ac-1440x900.png`, `audit/residential-heating-390x844.png`, `audit/light-commercial-390x844.png`.

### 2. Four service "Learn More" buttons all go to the contact page
- **Where:** homepage "Our Services" section. The four cards are Professional AC Installation, Reliable Heating Repair Services, Ductless Mini Split System Installation & Repair, and Preventative Maintenance Plans. All four "Learn More" links go to `/contact-us`.
- **What I clicked:** each of the four at both sizes. Each landed on /contact-us ("Contact Air Capital Heating and Air").
- **What happened:** a visitor who wants to read about AC installation or heating repair from the homepage lands on a contact form. The three service pages (/residential-ac, /residential-heating, /light-commercial) are reached only from the nav and footer, and no card points to them. There is no page for ductless mini splits or maintenance plans, though both are offered. Promised pages do not exist: the maintenance card says "Enroll today" and sends the visitor to the contact form.
- **Screenshot:** `audit/home-390x844.png` (Our Services section), `audit/home-1440x900.png`.

### 3. Contact email spelled differently from the domain
- **Where:** every page, header/footer and contact block: `aircapitalheatingnair@gmail.com`. The site domain is `aircapitalheatingandair.com`.
- **What I checked:** the `href` of every mailto link on all ten pages at both sizes. Each one matches the address shown. The mailto links were not clicked, so the mail client was not opened.
- **Why it matters:** the address is a Gmail address, which could be correct. The spelling mismatch with the domain is the only thing visible to a visitor. Whether the mailbox is read is not checked (no email sent, by rule). Verify with the owner before a demo uses it.
- **Screenshot:** `audit/contact-us-390x844.png` (contact block).

### 4. Forms: spam protection claimed but not found in the rendered page; submission not tested
- **Where:** homepage form (fields Name, Email*, Phone, Address (Street, City, Zip Code), Message, Attach Files, Send) and /contact-us form (Name*, Phone*, Email, Service Address, Service Needed select, Message, "Send Message"). Both forms have no `action` attribute, so they are handled by script.
- **Spam protection:** the homepage form says "This site is protected by reCAPTCHA and the Google Privacy Policy and Terms of Service apply." The rendered HTML of every page had no reCAPTCHA script or iframe. There is a hidden honeypot field (`_gotcha`). The claim is not backed by markup in the rendered page. Not tested further.
- **Not tested:** whether either form sends, where it sends, or whether a visitor gets a confirmation. Form submission was not done, by rule.
- **Screenshots:** `audit/home-390x844.png` (form), `audit/contact-us-390x844.png` (form).

### 5. Homepage H1 names the trade but not the town
- **Where:** homepage H1 "Expert Heating & Air Services". The town appears only in the small tagline "Serving Wichita & Surrounding Communities" under it. The title does name Wichita: "Air Capital Heating and Air | HVAC Services in Wichita, KS".
- **Other H1s:** About "About Air Capital Heating and Air", Contact "Contact Air Capital Heating and Air" (neither names the trade). Service pages name Wichita in the H1 (for example "Residential AC Services in Wichita, KS").
- **Screenshot:** `audit/home-390x844.png` (top of page).

### 6. Unknown URLs return a 200 page instead of a 404
- **Where:** https://aircapitalheatingandair.com/this-page-does-not-exist-xyz returns HTTP 200 with the site's page template, not an error page.
- **Why it matters:** search engines can index broken URLs as valid pages. Also `/sitemap_index.xml` returns 404 (the sitemap that exists is `/sitemap.xml`, listing the main pages).

### 7. Google review button opens a Maps place page, not a review form
- **Where:** "Leave us a Google Review ⭐" in the header and homepage (https://g.page/r/CQc3QN66G0IpEBM/review).
- **What I clicked:** the button at both sizes. It opened a new tab at a Google Maps place page for this business (`google.com/maps/place/...`), not a review box.
- **Not checked:** whether the review dialog opens after the redirect in a signed-in browser.

### 8. Minor
- **Hours:** contact block says "Mon–Sun: 8am–5pm · Emergency calls available." Consistent across pages. The emergency route is not a separate number.
- **Spanish-language claim:** "Se Habla Español" and "Bilingual Team" on several pages. No Spanish-language page or link found. Not verified.
- **Light Commercial title vs H1:** title "Light Commercial HVAC Services — Air Capital Heating and Air"; H1 "Commercial HVAC Services in Wichita, KS".
- **Services not on the homepage:** the Light Commercial service is in the footer and nav only, not in the homepage services section.
- **Financing page does not name the lender.** It says "We've partnered with trusted lenders"; the AC, heating and commercial pages say "through Enhancify". The Enhancify landing carries the business name.
- **Hidden phone link in the mobile menu.** One tel link is hidden at desktop widths. Harmless.

## Forms (not submitted)
- **Homepage form:** fields Name, Email*, Phone, Address (Street, City, Zip Code), Message, Attach Files (file upload), Send. No action attribute. Honeypot `_gotcha`. reCAPTCHA claim in text, no markup found.
- **/contact-us form:** Name*, Phone*, Email, Service Address, Service Needed (select), Message, "Send Message." Same honeypot. No action attribute.
- Whether either form sends, and to whom: **not tested** (no submission, by rule).

## Office and numbers
- One office on the site: Wichita, KS & Surrounding Areas. One phone: (316) 990-1911. One email: aircapitalheatingnair@gmail.com.
- Service towns (about-us): Wichita, Derby, Andover, Maize, Goddard, Haysville, Valley Center, Park City, Bel Aire.
- No street address on any page crawled. The brief says Google lists no street address (service-area business).

## Title and H1 per page
| Page | Title | H1 |
| --- | --- | --- |
| `/` | Air Capital Heating and Air \| HVAC Services in Wichita, KS | Expert Heating & Air Services |
| `/financing` | Financing Options — Air Capital Heating and Air | Comfort Shouldn't Wait — Financing Available |
| `/about-us-1` | About Us — Air Capital Heating and Air | About Air Capital Heating and Air |
| `/residential-ac` | Residential AC Services — Air Capital Heating and Air \| Wichita, KS | Residential AC Services in Wichita, KS |
| `/contact-us` | Contact Us — Air Capital Heating and Air \| Wichita, KS | Contact Air Capital Heating and Air |
| `/residential-heating` | Residential Heating Services — Air Capital Heating and Air \| Wichita, KS | Residential Heating Services in Wichita, KS |
| `/light-commercial` | Light Commercial HVAC Services — Air Capital Heating and Air \| Wichita, KS | Commercial HVAC Services in Wichita, KS |
| `/faqs` | FAQs — Air Capital Heating and Air \| Wichita HVAC | Frequently Asked Questions |
| `/privacy` | Privacy Policy | Air Capital Heating and Air Privacy Notice |
| `/terms` | Terms of Use | Air Capital Heating and Air Terms of Use |

## Services named on the site
- Homepage: Professional AC Installation; Reliable Heating Repair; Ductless Mini Split Installation and Repair; Preventative Maintenance Plans.
- Service pages: Residential AC (AC installation, replacement, repair, preventative maintenance); Residential Heating (furnace installation, replacement, heating repair, maintenance); Light Commercial (commercial installation, system replacement, repair, maintenance).
- Each service has a page only on the residential AC, residential heating and light-commercial pages. Ductless mini splits and maintenance plans have no page of their own.

## Site versus Google profile
- **Name:** matches ("Air Capital Heating and Air" / "Air Capital Heating & Air").
- **Phone:** matches (316-990-1911).
- **Services:** HVAC only on both (not re-checked against the Google categories; brief only).
- **Address:** site shows none; Google lists none (service-area business, per brief).
- **Hours:** site says Mon–Sun 8–5 with emergency calls; Google hours not opened.

## Speed
- Not measured. No PageSpeed run.

## Sitebulb
- No export supplied. Not checked.

## Builder
- Not confirmed from the page source. The site returns 200 for unknown URLs and shows a cookie banner. The generator meta tag is absent.
