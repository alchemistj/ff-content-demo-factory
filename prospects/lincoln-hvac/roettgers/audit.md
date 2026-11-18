# Current-site audit: Roettger's Heating and Cooling

Site: https://www.roettgersheatingandcooling.com/ | Run 2026-11-15 | Playwright Chromium at 1440×900 and 390×844.
Screenshots: `audit/` in this folder (one 1440 and one 390 render per page, plus the contact form and the /cart page).
Nothing was submitted, typed into or sent.

## Scope and method
- Crawled all 7 pages reachable from the homepage and menu: /, /services-content, /about-us, /financing, /contact, /faqs, /cart.
- Checked (HTTP status, not clicked): all 7 internal links from the menu and body. All return 200.
- Not checked: mobile menu opened on a phone (hrefs read from the desktop DOM); page speed (not measured); external links (Facebook and LinkedIn profiles, Wisetack); Google profile.

## Contact form (outreach target)
- **URL:** https://www.roettgersheatingandcooling.com/contact
- **Form action:** blank (posts to the same page). Platform not identified.
- **Fields, in order:**
  1. First Name (text), label says "(required)"
  2. Last Name (text), label says "(required)"
  3. Unlabeled text input. The page text lists "Phone (required)" for this form, so this is the phone field.
  4. Email (email), label says "(required)"
  5. Message (textarea), label says "(required)"
  - Submit button: "SEND".
- **Required attribute:** not set on any field. The "(required)" text is the only marker, so a browser will not block an empty submit. Server-side checks not tested.
- **maxlength:** none.
- **CAPTCHA:** invisible reCAPTCHA Enterprise (iframe with `size=invisible`). No visible challenge in the render. The same invisible check is on /services-content and /about-us.
- **iframe:** the reCAPTCHA iframe (see above) plus one iframe with no `src`.
- **Mobile:** form visible at 390 px (343 × 499 px). Screenshots: `audit/form-contact-1440x900-0.png`, `audit/form-contact-390x844-0.png`.
- Other forms: /services-content and /about-us repeat the same contact form (First, Last, unlabeled phone, Email, Message, Submit). Do not use for outreach.

## Menu and buttons
- Menu: Services (/services-content), About Us, Financing, Contact, FAQs. All work.
- "Request a Quote" (header button) goes to /contact. Works.
- Logo goes to /. Works.
- Social: Facebook and LinkedIn icons in the header (external, not checked).
- Stray page: **/cart** ("You have nothing in your shopping cart. Continue Shopping"). Not in the menu, but it loads and is linked from the page set. Screenshot: `audit/cart-1440x900.png`. A cart page on a non-store site looks out of place.
- No broken internal links found.

## Phone and email links
- Phone: `tel:4023143612` (visible, tappable) in header and footer on every page. The text reads "(402) 314-3612".
- Email: `mailto:roettgersheatingandcooling@gmail.com?` (visible, shown as text on every page).

## Titles and H1s
| Page | Title | H1 |
|---|---|---|
| / | Roettger's Heating & Cooling \| Schedule Your Comfort Today | "Keeping Lincoln Comfortable Year-Round"; also "Our Services", "Contact Us" |
| /services-content | Services \| Get Comfortable Today! — Roettger's Heating & Cooling | "Our Services"; "Contact us" |
| /about-us | About Us \| Get Comfortable Today—Contact Us — Roettger's Heating & Cooling | "Who we are"; "Contact us" |
| /financing | Financing \| Secure Your Comfort Today — Roettger's Heating & Cooling | "Financing" |
| /contact | Contact \| Get Expert HVAC Support Today — Roettger's Heating & Cooling | "Contact Us" |
| /faqs | **FAQs 2** — Roettger's Heating & Cooling | "Frequently Asked Questions" (the "2" in the title looks like a leftover) |
| /cart | Roettger's Heating & Cooling | None |

## Addresses and phones (as shown on the site)
- No street address on any page. Every page shows "Lincoln, NE and surrounding areas".
- Phone (402) 314-3612; email roettgersheatingandcooling@gmail.com. Same on every page.

## Word counts (desktop, body text)
/ 289 · /services-content 541 · /about-us 223 · /financing 237 · /contact 148 · /faqs 406 · /cart 34.
Thin: /contact (148) and /cart (34).

## Mobile (390 px)
- No sideways scroll on any of the 7 pages (page width 390 px).
- Phone link visible at 390 px on all 7 pages.

## Copy problems
- Title "FAQs 2" on /faqs.
- Stray /cart page (see above).
- No copyright line on any page.
- No hours on any page. The FAQ says "Do you offer emergency HVAC service? Absolutely..." with no number of hours or after-hours line.
- No testimonials, reviews or photos of the team or the work found in the text.

## Trust and claims
- "Backed by more than 10 years of hands-on, high-quality experience" and "established in 2022" (https://www.roettgersheatingandcooling.com/about-us). Both are stated; the owner's experience and the business date are not explained.
- "We offer honest recommendations and free estimates" (https://www.roettgersheatingandcooling.com/faqs).
- Financing through Wisetack (https://www.roettgersheatingandcooling.com/financing).
- Maintenance membership: "2 Tune-Ups Per Year, Priority Scheduling, Discounts on Repairs" (https://www.roettgersheatingandcooling.com/services-content). No price.
- No license, insurance, bonding or warranty claims found in the text.

## Other checks
- Speed: not measured.
- Google profile: not opened in this pass.
