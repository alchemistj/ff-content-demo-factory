# Current-site audit: Bybee Electric

Site: https://bybeeelectric.com/ (redirects to https://www.bybeeelectric.com/, Hibu template)
Audited: 2026-11-09, Playwright Chromium, 390x844 (phone) and 1440x900 (desktop).
Screenshots: `audit/` in this folder. Raw crawl data is in the scratchpad (not part of the package).

## What was checked
- Homepage at both widths; 26 service/about/utility URLs and 10 blog posts at both widths (status, final URL, title, H1, H2s, tel/mailto links, forms, copyright).
- Desktop and mobile menus: desktop "Electrical Services" dropdown opened on hover; mobile hamburger opened. Both menus list the same 28 unique nav links, all resolving to 200 pages on the site.
- Every `tel:` and `mailto:` link on the homepage, service pages, About, Contact and the estimate page.
- Contact and estimate forms inspected (fields, reCAPTCHA, submit label). Nothing was submitted.
- Two external links opened: the header "Write a Review" button and the footer privacy links.
- Not checked: see the last section.

## What works
- Phone number is consistent everywhere: (316) 409-4186, matching the Google profile. Of 193 `tel:` links across the 36 pages I crawled at desktop width, every one dials the same number: `tel:(316) 409-4186`, `tel:3164094186` or `tel:+13164094186` (contact page). The `tel:(316) 409-4186` form has a space and parentheses; RFC 3966 allows these, and it should dial, but I could not test a real dial.
- Mobile: no horizontal scroll (scrollWidth 390 on a 390 viewport). Hamburger menu opens and shows all links.
- Desktop "Electrical Services" dropdown opens and lists 19 service pages in four groups.
- Every nav and dropdown link I followed returns a real page with a matching H1 (service pages, About, Our Team, Reviews, Blog, FAQs, Contact, Request Estimate). No `#` links. No broken images found on the 12 pages I checked for images.
- Contact page has a working anchor for "Areas Served" (`/contact#AreasServed`, `#ICcontactform`).
- Copyright line reads 2026, so it is current.
- Reviews page shows two real-looking reviews (Lorraine H, 3/22/2026; Austin W, 4/22/2020, from a YP listing), not sample testimonials.
- No lorem ipsum, no "copy-of", no sample names such as "Samantha Johnson", no placeholder emails or phones found.
- Mailto on the contact page is `admin@bybeeelectric.com`, on the business's own domain. I did not send mail to it, so deliverability is unchecked.

## What is broken, most costly first

### 1. "Write a Review" sends customers to a Hibu survey, not the Google profile
- Evidence: On the homepage, the yellow "Write a Review" button in the header and the one in the testimonials section both link to `https://hibu.us/ez4gc?ac=widget`. I clicked it at 1440 width. It opens a Hibu page titled "Leave your feedback" with a 5-star "Rate Us", a comment box, Name and Email fields, and a SUBMIT button. Screenshot: `audit/broken-write-a-review-opens-hibu-survey.png`.
- It does not open the business's Google review page. The Google profile has 101 reviews at 4.7 stars (scout data, 2026-11-09). A customer who clicks the site's main review button fills in a private Hibu survey, which feeds the site's own review widget, not Google.
- The same link is on the homepage (3 times) and on several inner pages (e.g., /about, /reviews, /faqs, /request-estimate-form, /circuit-breaker-repair, /home-electrical-installations). I did not confirm the header on every page.
- Also: the homepage and Reviews page show "5.0 Overall Rating, All (5.0 / 2 Ratings)" (Reviews page, screenshot `audit/reviews-page-two-ratings-only.png`). Google shows 101. The site displays 2 reviews against 101 on Google.

### 2. The site sells "the State of Kansas," not Wichita
- Evidence: The header reads "Serving the State of Kansas" on every page (screenshot `audit/home-desktop-1440x900.png`). The footer "Serving Area" reads "Kansas and surrounding areas" (every page). The About page says "provides residential and commercial electrical services to the state of Kansas" (`/about`). The FAQ and Our Team pages say Wichita; the header and footer do not.
- The H1 on the homepage is "Electrician Services" (only the H2 "Wichita, KS" names the city). Title is "Electrician Services Wichita, KS | Bybee Electric".
- No street address appears anywhere on the site. The Contact page has the phone and email, hours, and "Electrician in Wichita, KS" in a heading only. The Google profile address is 232 N Pennsylvania Ave, Wichita, KS 67214. Nothing on the site links to it.
- "Areas Served" in the nav goes to `/contact#AreasServed`, which says only "Kansas and surrounding areas." No city list.
- Why it costs: local search and customers in Wichita see a statewide company, and the H1 gives no trade plus town.

### 3. The site contradicts itself and makes claims it does not back up
- Years: the homepage, Our Team and FAQ say "25+ years" / "over 25 years." About says "Year Established 2011," which is about 15 years as of 2026. Porch (third-party, see facts.md) says the owner has "over 15 years" in the industry.
- Licensing: "Fully Licensed and Insured" (homepage, Our Team, FAQ says "fully licensed and insured as a commercial and residential electrical contractor"). No license number is shown anywhere on the site. I could not confirm a license on a primary source (see facts.md).
- Reviews: see problem 1.

### 4. Service pages are stock copy with mismatched titles
- `/electrical-repairs` has the `<title>` "Commercial Electrical Contractor Wichita KS | Bybee Electric", but the page itself does not mention commercial and the business is positioned as residential-first in the menu. Screenshot `audit/electrical-repairs-page-title-says-commercial.png`.
- `/home-electrical-installations` has the title "Residential Electrical Contractor Wichita | Bybee Electric".
- `/wiring-repair` H1 is "Wiring Repair Services"; `/home-automation` H1 is "Home Automation Solutions." Nav labels differ from H1s on several pages. Minor.
- Service pages are mostly the same template: short paragraphs plus a "Learn More"/"Request Estimate." Several pages (e.g., `/chandelier-installation`, `/outlet-installation`) are 5,000-6,000 characters and largely generic.
- The blog has 10 posts, each generic Hibu copy (e.g., "7 Reasons Why You Should Trust a Residential Electrical Contractor", "14 Questions to Ask Your Residential Electrical Contractor", "How Electrician Services Keep Operations Running"). None mention Bybee's own jobs, crew or Wichita. Blog posts have no H1 tag (title only).

### 5. Dead-end and leftover links
- "View More Coupons" and "View More Projects" on the homepage both link to `/` (the homepage itself). No coupon or project page exists.
- `/hibu-eng-menu` is live (HTTP 200), titled "Engagement Menu Pop," and renders the site chrome with no body content. It is linked from the footer as "Contact Us" but that link is not visible at either width (it sits in the DOM). Screenshot `audit/broken-hibu-eng-menu-empty-page.png`. Remove or noindex.
- "Text Now!" link is `sms:?&body=START` with no phone number. It is in the DOM but not visible at either width. Not a visible problem, but it is broken if it ever shows.
- Privacy policy, Conditions of Use and Accessibility links go to budurl.com short links that redirect to `policies.hibuwebsites.com` (Hibu's generic policy pages, not Bybee's). Check with the owner.
- `/electrical-services` (the nav's "Electrical Services" is only a dropdown, not a link to a services page), `/services`, `/about-us`, `/areas-served` and `/contact-us` return 404. I requested them to check for a hub page. None are linked. Not broken, but there is no services overview page.

### 6. Contact and estimate forms (not submitted)
- `/contact`: fields Name*, Email*, Phone*, Message. Button "Send Message". Google reCAPTCHA is loaded (`gstatic`/`google.com/recaptcha/api.js`). Screenshot `audit/contact-page-form-desktop.png`.
- `/request-estimate-form`: fields Name*, Phone*, Email*, "Contact Method" (Email/Phone), "Services*" dropdown (Electrical Inspections, Electrical Repairs, Home Electrical Installations, Specialty Electrical Services, Other), Message, a Privacy Policy checkbox, and reCAPTCHA. Button "Request Estimate". Screenshot `audit/request-estimate-form-desktop.png`.
- Homepage has a 4-field estimate box (Full Name, Phone, Email, Services) with reCAPTCHA.
- Both forms use Hibu's `dmform` system with no form action in the HTML. I could not confirm that a submission is delivered to the business's inbox. Not submitted, per the brief.
- Services dropdown on the homepage and estimate form lists four categories and "Other," which does not match the 19-page nav.

### 7. Header and footer hours
- Hours shown on the site: Mon-Fri 8:00 am - 5:00 pm; Sat-Sun Closed. Holiday line: "Monday, September 7, 2026: Closed" (Labor Day). Google hours not in my scout data, so this could not be compared.

## Site versus Google profile
- Name: site "Bybee Electric"; Google "Bybee Electric" (category Electrician). Match.
- Phone: site (316) 409-4186; Google (316) 409-4186. Match.
- Address: site shows none; Google 232 N Pennsylvania Ave, Wichita, KS 67214. Gap.
- Hours: site Mon-Fri 8-5, Sat-Sun closed; Google hours not in our data. Unchecked.
- Reviews: site 2 reviews, 5.0; Google 101 reviews, 4.7. Mismatch (see problem 1).
- Services: site lists 19 service pages, residential-first; Google category "Electrician" only.

## Sitebulb
No Sitebulb export exists for this site in the prospect folder. Not checked.

## Speed
Not checked. No PageSpeed or Lighthouse run was made.

## Not checked, and why
- Kansas Secretary of State entity record: sos.ks.gov returns a CloudFront 403 block to automated requests. Not checked; not bypassed.
- Facebook page (https://facebook.com/BybeeElectric): requests redirect to a login page. Not readable.
- BBB profile: not opened directly; only search snippets. See facts.md.
- MABCD license: no public lookup found. See facts.md.
- Google Business Profile hours, owner replies and reviews: not pulled (scout data only has phone, address, category, rating and count).
- Dialing the tel: links on a real phone: not tested.
- Form submission and delivery: not tested, by design.
- The "View More Projects" gallery images: not checked beyond the broken-image test.
- Recent blog and page "copy" accuracy beyond the examples above: not reviewed line by line.
