# Current-site audit: Ferry Lawnscapes LLC

Audited: 2026-11-09 (UTC session date). Site: https://ferrylawns.com/ (WordPress, Elementor 4.3.6, WPForms, AIOSEO 5.0.5). Crawled at 390x844 (phone) and 1440x900 (desktop). Screenshots are in `audit/` next to this file.

Google profile used for comparison (from the brief, not loaded live): Ferry Lawnscapes llc, 5.0 from 102 reviews, (316) 708-6791, 10100 W Maple St Ste 305, Wichita, KS 67209, categories Landscaper and Tree service.

## Most costly problems first

1. **The Contact page "CALL" button is broken.** On https://ferrylawns.com/contact/ the CALL button's link is `http://tel+13167086791` (not `tel:+13167086791`). Clicking it at 1440 wide goes to Chrome's error page (`audit/12-contact-call-click-goes-to-error-1440.png`). The number is printed under the icon (`audit/05-contact-call-button-broken-1440.jpg`), so a visitor has to type it. Every other `tel:` link on the site works (see "What works"). On a phone, this is the one button on the page a visitor who wants to call would tap.

2. **The homepage does not say what the company does or where.** The homepage has no H1. The first screen at phone width shows only the logo and a photo of a house, with no service, town or phone number (`audit/09-home-390-first-screen.jpg`). The homepage H2s are "20+ YEARS OF QUALITY SERVICE", "CALL US FOR FOR FREE QUOTE TODAY!", "OUR SERVICES", "GALLERY", "GET IN TOUCH". No `<title>` or H1 on any page names Wichita. Titles are "Home - Ferry Lawnscapes", "Landscaping - Ferry Lawnscapes", "Tree Care - Ferry Lawnscapes", "Lawn Maintenance - Ferry Lawnscapes", "Gallery - Ferry Lawnscapes", "Contact - Ferry Lawnscapes". Wichita appears only in body copy ("Wichita landscaping" on Tree Care, "Wichita area" on the homepage).

3. **The 102 five-star Google reviews are not on the site.** The homepage copy says "our reviews say it all", but there is no review or testimonial on any page. The theme config shows the testimonials section disabled (`"testimonials": {"enable": false}` in the homepage HTML). The Google reviews are the strongest proof this business has, and the site shows none of them.

4. **The only address on the site has the wrong ZIP.** The homepage "CONTACT US" box reads "10100 W Maple, Suite 305, Wichita, KS **95014**" (`audit/13-home-address-block-zip-95014-1440.jpg`). Google has 67209. 95014 is a California ZIP. The box is in the page HTML and is visible after scrolling (the block uses a scroll-triggered animation, so it is hidden at first load). No other page shows an address.

5. **The site looks stale.** The footer reads "Copyright © 2023 Ferry Lawnscapes - Website 060 Technology Solutions" on every page (`audit/03-footer-copyright-2023-1440.jpg`). The homepage meta says last modified 2023-09-30. Today is 2026-11-09.

6. **The contact form has no spam protection.** Both forms (homepage "GET IN TOUCH" and /contact/) are WPForms with no CAPTCHA widget and no CAPTCHA script on the page. The only mentions of reCAPTCHA and Turnstile are in WPForms' generic error-message strings. I did not find a honeypot field in the contact form HTML either. I did not submit the forms (per the brief), so whether submissions get filtered on the server is not checked (`audit/06-contact-form-no-captcha-1440.jpg`).

7. **Services named on the homepage have no page.** The homepage copy lists "landscaping, mulch/rock installation, trees or plants, sod installation, aeration, and over-seeding." There are pages for Landscaping, Tree Care and Lawn Maintenance. Sod, aeration, overseeding and mulch/rock have no page of their own. The Lawn Maintenance page does not mention aeration, overseeding or sod either. Its text covers weeding, mulch, pruning and a quote request.

8. **Copy errors.** Homepage H2: "CALL US FOR **FOR** FREE QUOTE TODAY!" (`audit/04-home-quote-heading-typo-FOR-FOR-1440.jpg`). Lawn Maintenance: "Give us a **should** today at (316) 708-6791" (`audit/07-lawn-maintenance-typo-should-today-1440.jpg`). Tree Care opens with "Everyone loves trees..." and asks "landscaping trees? They're a whole other creature", which reads awkwardly.

9. **Email is a Gmail address.** Every email link is `Ferrylawnscapes@gmail.com` (homepage, Contact). The site is on ferrylawns.com but has no domain email.

10. **Gallery.** 84 photos on one page with no captions or location names. The homepage "VIEW MORE" link goes to `/GALLERY/` (capital letters), which serves the same page at a second URL with a 200 response and no redirect. Image alt text was not checked (`audit/08-gallery-1440.jpg`).

11. **Thin homepage content.** About 140 words of body copy. "OUR PARTNERS" appears as a heading with no partner names in the text (logos not checked).

## What works

- **Navigation.** HOME, LANDSCAPING, TREE CARE, LAWN MAINTENANCE, GALLERY and CONTACT each load the right page with a 200 response. The service cards on the homepage link to the right pages. I found no 404s or `#` dead links among internal links.
- **Phone-menu.** The hamburger "Menu" opens at 390 wide and shows all seven links plus a CALL NOW button.
- **Phone numbers.** (316) 708-6791 matches the Google profile on every page. The `tel:+13167086791` links on the homepage (CALL NOW), Landscaping, Tree Care, Lawn Maintenance and Gallery all dial the right number. The text number is on every page. The Contact page CALL link is the one exception (problem 1).
- **Email link.** `mailto:` on the homepage and Contact opens `Ferrylawnscapes@gmail.com`, which matches the address shown.
- **Images.** No broken images found on the homepage, service pages, gallery or contact page.
- **Layout at phone width.** The header, nav and hero fit at 390 wide with no horizontal scroll seen in the crawl.
- **Name and services match Google.** "Ferry Lawnscapes" with LLC in the logo, and the service pages (landscaping, tree care) match the Google categories (landscaper, tree service).

## Page inventory

| Page | URL | Title | H1 | Notes |
|---|---|---|---|---|
| Home | https://ferrylawns.com/ | Home - Ferry Lawnscapes | none | Address box (wrong ZIP) only visible after scroll |
| Landscaping | https://ferrylawns.com/landscaping/ | Landscaping - Ferry Lawnscapes | LANDSCAPING | Phone tel: link works |
| Tree Care | https://ferrylawns.com/tree-care/ | Tree Care - Ferry Lawnscapes | TREE CARE | Phone tel: link works |
| Lawn Maintenance | https://ferrylawns.com/lawn-maintenance/ | Lawn Maintenance - Ferry Lawnscapes | LAWN MAINTENANCE | "should today" typo |
| Gallery | https://ferrylawns.com/gallery/ | Gallery - Ferry Lawnscapes | GALLERY | 84 images, no captions. Same page at /GALLERY/ |
| Contact | https://ferrylawns.com/contact/ | Contact - Ferry Lawnscapes | CONTACT | CALL link broken; WPForms with no captcha |

## Phone numbers and offices

- Phone numbers on the site: one number, (316) 708-6791 (`tel:+13167086791`). Contact page CALL link is broken (`http://tel+13167086791`).
- Offices on the site: one. "10100 W Maple, Suite 305, Wichita, KS 95014" (Google: 67209). Shown on the homepage only.
- Emails on the site: `Ferrylawnscapes@gmail.com` (homepage, Contact).

## Services

- Pages exist for: Landscaping, Tree Care, Lawn Maintenance, Gallery.
- Named on the homepage with no page: sod installation, aeration, overseeding, mulch/rock installation, planting (trees or plants).
- Reviews: none shown on the site. Google shows 102 five-star reviews.

## Google profile comparison

- Name: matches ("Ferry Lawnscapes", LLC in the logo).
- Phone: matches (316) 708-6791 on all pages.
- Address: site says 95014, Google says 67209. Mismatch.
- Categories: site services match Google (landscaping, tree care).
- Hours: none shown on the site. Google hours not checked (no live Google access).

## Forms

- Homepage "GET IN TOUCH": WPForms, posts to `/`. Fields: name, phone, email, services (a free text box), comment or message. No CAPTCHA.
- Contact page: WPForms, posts to `/contact/`. Fields: name, phone number, email, services (free text), comment or message. No CAPTCHA.
- Not submitted (per the brief).

## Speed

- PageSpeed Insights: not obtained. The API returned HTTP 429 "Queries per day" quota exceeded for the shared project (quota limit 0). Retry later or with a key.
- First-load time: not measured. Only DOMContentLoaded was timed, which loaded within the crawl timeouts (up to 120 s). The brief and qualify.md say the first load is slow; this audit did not confirm that number.

## What I could not check

- PageSpeed score (API quota exceeded, see above).
- Facebook page (https://www.facebook.com/FerryLawnscapes): the link works, but in this session it redirects to a Facebook login page, so the page content is not verified.
- Google profile live: hours, photos, website field, review text, owner replies. Used the facts given in the brief only.
- Other web listings (Yelp, BBB, Angi, etc.): not searched.
- Owner name: not found on the site.
- Sitebulb export: none in the prospect folder.
- Form submission and server-side spam filtering: not tested (do not submit).
- Image alt text on the gallery: not checked.
- Real phone dialing: the tel: links were checked by their href. I did not dial.
- Mobile hamburger menu on a real device: checked in an emulated 390 wide Chromium only.

## Screenshots

- `audit/01-home-1440-first-screen.jpg`: homepage at desktop width, first screen.
- `audit/02-home-1440-full.jpg`: homepage at desktop width, full page.
- `audit/03-footer-copyright-2023-1440.jpg`: footer copyright.
- `audit/04-home-quote-heading-typo-FOR-FOR-1440.jpg`: "FOR FOR" heading.
- `audit/05-contact-call-button-broken-1440.jpg`: Contact CALL button.
- `audit/06-contact-form-no-captcha-1440.jpg`: Contact form, no CAPTCHA.
- `audit/07-lawn-maintenance-typo-should-today-1440.jpg`: Lawn Maintenance full page with the "should today" typo.
- `audit/08-gallery-1440.jpg`: Gallery.
- `audit/09-home-390-first-screen.jpg`: homepage at phone width, first screen (no headline).
- `audit/10-home-390-full.jpg`: homepage at phone width, full page.
- `audit/11-contact-390-first-screen.jpg`: Contact at phone width.
- `audit/12-contact-call-click-goes-to-error-1440.png`: result of clicking the Contact CALL button (error page).
- `audit/13-home-address-block-zip-95014-1440.jpg`: homepage address box showing ZIP 95014.
