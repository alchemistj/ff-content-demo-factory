# Current-site audit: Ballinger Electric

Site: https://www.ballingerelectric.com/ (Duda)
Pages crawled: https://www.ballingerelectric.com/ , /electrician , /electrical-panel-replacement , /electrical-upgrades , /lighting , /about , /contact
Widths: 390x844 (phone) and 1440x900 (desktop). Run date 2026-11-09. Playwright Chromium.
Screenshots: `audit/` in this folder.

## What works

- **Header menu (HOME, ELECTRICIAN, ELECTRICAL PANEL REPLACEMENT, ELECTRICAL UPGRADES, ABOUT, CONTACT).** Every item opens its own page at both widths (clicked on the homepage at 390 and 1440; each page returns 200).
- **Homepage service cards for Electrician and Electrical Panel Replacement.** Both go to the right page.
- **"CONTACT US" buttons** go to https://www.ballingerelectric.com/contact .
- **Titles and H1s** are present on all six working pages. Six of six H1s match their topic. Five of six titles match; the Electrical Upgrades title is wrong (finding 4).
- **Facebook link** points to https://facebook.com/people/Ballinger-Electric/61563743377664 (the URL matches the one in the brief). I did not open it in a browser; see "Not checked".
- **Email link (mailto:)** on the homepage and contact page points to benjaminballinger87@gmail.com. This is the address shown as text on the contact page, so the link and the shown address match. (It is a personal Gmail address; see finding 9.)
- **Contact form** exists on every page: "Type of Service" (Residential / Commercial / Other), Name, Email, Phone, and a message box. It is a real form (Duda form handler, POST). Not submitted, per the brief.
- **Phone number text** is consistent across the site: (316) 213-4513, the same as the Google profile.
- **No placeholder or lorem text** found in the visible text or raw HTML. No "copy-of", "Samantha Johnson", "example.com", "1234567890" or lorem ipsum.
- **Reviews on the site** are named quotes (Spencer L., Terri H., Jason R., Bonnie T.), not template text. Whether they are real is not checked (see finding 10).

## What's broken, most costly first

### 1. The site does not fit a phone screen (every page, 390 px)
- On a 390 px phone, the page is laid out 768 px wide. The page scrolls sideways by about 378 px. Measured on all seven pages at 390 px: `scrollWidth` 768 against a viewport of 390.
- What a phone visitor sees: the menu runs off the right edge (the "ELECTRICAL UPGR..." item is cut in the screenshot), and the hero headline is cut off at the right ("Wich..." / "Trus..." / "Electri...").
- Evidence: `audit/mobile-horizontal-overflow-390x844.png` (the 390 px view, with the menu and headline running off the right edge). `audit/homepage-390x844.png` is the full-page homepage at 390 px.
- Cost: most local electrical search is on a phone. A visitor who lands on this site from a phone sees a clipped menu, a clipped headline, and has to scroll sideways to read the page.

### 2. The phone number is not tappable on any page, at either width
- The number "(316) 213-4513" appears as plain text (STRONG and SPAN tags, not inside a link) in the "Call Us Today!" block on the homepage and on every service page.
- The only `tel:` link on the site is the "CALL US TODAY" link. It has `href="tel:(316) 213-4513"` (spaces and parentheses in the number), and it has zero size on every page at both widths. So it is never shown or tappable.
- I did not test whether the `tel:` value dials on a real phone (no device). Given it is hidden, this does not matter for visitors. If the link is ever shown again, the value should be `tel:+13162134513`.
- Evidence: `audit/phone-plain-text-mobile.png` (number shown as text, no link styling) and `audit/phone-plain-text-desktop.png`.
- Cost: the phone number is the main call-to-action for a trade business. On a phone, the number cannot be tapped to call.

### 3. The Lighting service page is dead, and lighting is missing from the menu
- https://www.ballingerelectric.com/lighting returns HTTP 301 with `Location: /` (a server redirect to the homepage), at both widths. The browser lands on https://www.ballingerelectric.com/. Evidence: `audit/lighting-page-redirects-home-1440x900.png`.
- The homepage has a third service card linked to /lighting. Clicking it on the homepage at both widths lands on the homepage, not a lighting page.
- "Lighting" is not in the menu (the menu has six items: Home, Electrician, Electrical Panel Replacement, Electrical Upgrades, About, Contact).
- But the site talks about lighting on other pages: "Lighting Installations" (Electrician page), "Lighting Upgrades" (Electrical Upgrades page), and "custom lighting design" (About and Homepage text). The homepage meta description says "Lighting Services".
- Cost: lighting is one of the three services in the homepage intro and in the service cards. The lighting link goes nowhere useful.

### 4. Wrong title tag on the Electrical Upgrades page
- https://www.ballingerelectric.com/electrical-upgrades: `<title>` is "Lighting in Wichita, KS | Ballinger Electric". The H1 is "Electrical Upgrades in Wichita, KS". The page is about electrical upgrades, not lighting.
- Evidence: title as read by Playwright at both widths (text evidence; no screenshot of the browser tab title).
- Cost: search results and browser tabs show the wrong topic for this page. This is an SEO and trust issue.

### 5. Address and ZIP do not match the Google profile
- Google profile (Maps scout, 2026-11-09, per the brief): 1711 S Eisenhower Ave Suite B, Wichita, KS 67209.
- The site has no street address anywhere. The contact page shows "Ballinger Electric / Wichita, KS 67215" (footer-style block; `audit/footer-address-zip-67215.png`). The homepage shows the same "Wichita, KS 67215".
- The "READ MORE REVIEWS" button on every page goes to a Google search for "Ballinger Electric Wichita, KS 67215" (a search page, not the Google profile).
- Cost: a customer or Google sees two different ZIP codes for the same business. Google local search relies on a consistent address (NAP).

### 6. Contact forms: the homepage form has no spam protection
- Forms by page (desktop crawl): the homepage has two forms; the contact page has two forms; the Electrician, Electrical Panel Replacement, Electrical Upgrades and About pages have one form each.
- Homepage: both forms have no CAPTCHA (no reCAPTCHA script, iframe or badge). Evidence: `audit/homepage-contact-form-no-captcha.png`. The Electrician, Panel, Upgrades and About pages also load no CAPTCHA.
- Contact page at 1440 px: an invisible Google reCAPTCHA v2 is loaded (two scripts, reCAPTCHA iframes, a badge). Evidence: `audit/contact-page-recaptcha-badge-1440x900.png` and `audit/contact-form-fields.png`. Note: the contact page at 390 px did not load the CAPTCHA scripts in my crawl; I did not resolve why.
- Whether either form actually sends email is not checked. The brief said not to submit. The form action is blank (Duda handler), and the form has hidden routing fields (dmformsendto, dmformsubject), so it looks like a real Duda form. Confirm on the onboarding call that the owner receives a test.
- Cost: an unprotected form on the homepage is an easy target for spam, and the site has two forms with different placeholder text ("How May We Assist?:" vs "What can we help you with today?") which looks unfinished.

### 7. Hours conflict: "emergency any time" vs "closed weekends"
- The contact page says Mon-Fri 8:00 am to 5:00 pm, Sat-Sun Closed (https://www.ballingerelectric.com/contact).
- The Electrician page says: "Our team is available for prompt emergency electrical services ... no matter the time of day or night" (https://www.ballingerelectric.com/electrician).
- The site does not say how to reach someone after hours.
- Cost: a homeowner with an emergency reads two different answers on two pages.

### 8. No copyright line on any page
- No "©" or "Copyright" text appears in the visible text or in the raw HTML of the homepage, contact page or about page. The only four-digit year in the HTML is 2026 (likely a script date).
- So the "old copyright year" check is negative: there is no year to be old. Footers on the site show only the address block and the menu.

### 9. Owner contact is a personal Gmail address
- The mailto link and the text address on the contact page are benjaminballinger87@gmail.com. No business domain email appears anywhere on the site.
- Cost: trust. A business with a domain site and a personal Gmail address for contact looks less established.

### 10. Testimonials and claims are not verifiable
- The same four quotes appear on all six pages (Spencer L., Terri H., Jason R., Bonnie T.). They mention "Ben" by name. No dates. They read as customer reviews. I did not check them against the Google reviews (review pulls are for final picks only, per the rules).
- Generic claims repeat across pages: "Experienced & Licensed Electricians", "Affordable, Transparent Pricing", "Customer-Focused Approach", "Locally Owned and Operated", "Proven Reputation in Wichita". There are no numbers, years, license numbers, insurance, warranties or financing offers on the site.
- Cost: the site says the same things as every other electrician. Nothing on it is specific to Ballinger.

### 11. Duplicate and thin content on the service pages
- Each service page repeats a "Why Choose Ballinger Electric" block (four to five boxes) with similar wording, and the same four testimonial quotes.
- The panel page and the upgrades page both describe "Panel Upgrades" with almost the same copy.
- The homepage meta description says "Electrical Panel Replacement, Lighting Services and More". The homepage H1 is "Electrician in Wichita, KS".

## Other checks

- **Speed:** a PageSpeed or Lighthouse score was not run. No speed number is recorded.
- **Sitebulb:** no Sitebulb export (Hints CSV or PDF) for this site exists in the repo. Nothing to copy.
- **Google profile versus site:** the Google data in the brief (name, phone, address, categories, 5.0 stars, 158 reviews) matches the site's name and phone. The address and ZIP do not match (finding 5). Google hours were not in the brief, so site hours cannot be compared yet (see facts.md).

## Not checked (and why)

- **Form submission:** not submitted, per the brief. Whether the forms send is unknown.
- **Phone dialing:** no phone device, so I could not test whether a tap dials. The number is not a link anyway (finding 2).
- **Mailto opening:** the mailto was checked as an href; no mail client was opened.
- **Facebook page:** the page loads for search but browser text was not readable (WebFetch returned only the page title). Its About text, creation date and contact details are not confirmed.
- **Google profile:** I did not open the Google profile. The data is from the Maps scout brief.
- **Hidden elements:** "Button" elements that are zero size (hidden in the layout) were checked by their href only. They are not visible to visitors.
- **Gallery images:** some images report natural width 0 (possibly lazy-loaded). Not confirmed as broken; I did not call them broken.
- **Kansas Secretary of State, BBB, licensing:** see facts.md. None confirmed.
