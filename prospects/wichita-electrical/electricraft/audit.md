# Current-site audit: Electricraft

Site: https://www.electricraftks.com (Thryv). Pages crawled: `/`, `/residential`, `/electrical-panel-upgrade-wichita-ks`, `/commercial`, `/industrial`, `/careers`, `/contact`, `/blog`, `/faq`, `/about-the-owner`. Widths: 1440x900 and 390x844 (phone). Playwright Chromium, run 2026-11-13. Nothing submitted. Screenshots in `audit/`.

## What works
- **Menu** (HOME, RESIDENTIAL, PANEL UPGRADE, COMMERCIAL, INDUSTRIAL, CAREERS, CONTACT, BLOG, FAQ, ABOUT THE OWNER): all ten items clicked at 1440 px and each landed on its page (200).
- **Every page returns 200** at both widths. No dead internal links found.
- **Phone links** `tel:316-264-3359` and `tel:316-491-2910` are visible and tappable in the header and footer at both widths (183x33 px on desktop).
- **Email** `info@electricraft-ks.com` is a visible mailto on every page.
- **Contact form** on `/contact` is a real POST form with five visible fields (First Name, Last Name, Phone, Email, Message). Not submitted.

## What's broken, most costly first

### 1. Owner named on the site is recorded as deceased
- `/about-the-owner` is titled "In Loving Memory of Joel Troyer", "Founder & President of ElectriCraft", with his death dated March 28, 2025 (https://www.electricraftks.com/about-the-owner).
- The homepage still gives "Statement From Joel Troyer, Owner of ElectriCraft, Inc. ... Owner/President" in the first person (https://www.electricraftks.com/).
- The scout note said "Joel Troyer named on page." That is accurate as far as the page goes, but it is a stale owner reference. Any demo or outreach that names him as the current owner would be wrong. See facts.md, section 1.

### 2. Phone width: the whole site is laid out at desktop width
- At a 390 px viewport, `scrollWidth` is 768 on all ten pages. The page scrolls sideways by about 378 px.
- The cause is the Thryv desktop layout class (`dmStandardDesktop`) on the wrapper; the header and footer are sized for about 768 px.
- Evidence: `audit/homepage-390x844-fullpage.png`, `audit/residential-390x844-fullpage.png`, `audit/mobile-home-viewport-390x844.png`.

### 3. Main H1 is empty on the homepage
- The homepage H1 has no text on desktop or phone. The visible headline ("IT'S WATT YOUR HOME NEEDS!") is not the H1.
- On the phone width, the homepage H1 has `visibility: hidden`.
- On several inner pages at 390 px the H1 is also reported blank (residential, panel upgrade, commercial, industrial, contact, about). Not confirmed visually.

### 4. Conflicting years of experience across pages
- Homepage meta description: "over 30 years".
- `/residential` FAQ: "With over 20 years of expertise".
- `/electrical-panel-upgrade-wichita-ks`: "served Wichita ... since 1984".
- `/about-the-owner`: "cofounding ElectriCraft, Inc. in October of 1984".
- A visitor sees three different numbers for the same company.

### 5. 24/7 emergency claim vs posted hours
- `/residential` FAQ: "24/7 Emergency Services: We are available around the clock for any electrical emergencies."
- Hours on every page: Mon-Fri 7:00 am - 5:00 pm, Sat-Sun Closed.
- The residential FAQ hedges: "Emergency electrical services may be available around the clock."

### 6. Two Facebook pages and two business names
- Footer and header social links go to `facebook.com/Electricraft-Inc-105684564664404` and `facebook.com/ItsElectricKS`.
- The Yelp link is `yelp.com/biz/its-electric-wichita`. The site's residential division is "It's Electric".
- This is a naming question for the onboarding call, not a fault in the links.

### 7. Hidden mailto to a named individual
- Every page contains a hidden `mailto:kgingery@electricraft-ks.com` (no visible text, not displayed). The visible address is `info@electricraft-ks.com`.
- Not shown to visitors. Noted because the address is an individual's name and is not in the facts file's visible sources.

### 8. Phone link with a leading space
- The header "Call 316-264-3359" button on the homepage has `href="tel: 316-264-3359"` (leading space). Some other pages have the same pattern.
- Not tested on a real phone. Most browsers handle it, but the form is not clean.
- Two `tel:` links on `/contact` are 0x0 and hidden (duplicates).

### 9. Contact form has reCAPTCHA
- One form, POST, on `/contact`. Fields: First Name (`dmform-0`), Last Name (`dmform-4`), Phone (`dmform-2`, type tel), Email (`dmform-1`), Message (`dmform-3`). None is marked required, and none has a `maxlength`.
- A hidden `g-recaptcha-response` textarea and three recaptcha iframes are present. The site key is `6LeiWB8UAAAAAHYnVJM7_-7ap6bXCUNGiv7bBPME` and the widget is `size=invisible`. The challenge appears only when Google flags the session.
- Form URL: https://www.electricraftks.com/contact. The form posts to the same page.
- Per Josh's rules, a CAPTCHA means hand-send, not an automated send.

## Pages: title, H1, words (desktop)
| Path | Title | H1 | Words |
|---|---|---|---|
| `/` | Wichitas Premier Electricians – Wichita, KS - Electricraft | (empty) | 444 |
| `/residential` | Residential Electricians in Wichita, KS \| ElectriCraft | RESIDENTIAL ELECTRIC CONTRACTORS SERVING WICHITA, KS | 1406 |
| `/electrical-panel-upgrade-wichita-ks` | Electrical Panel Upgrade \| Wichita, KS \| ElectriCraft, Inc. | ELECTRICAL PANEL UPGRADE SERVICES IN WICHITA | 562 |
| `/commercial` | Commercial Electrical Installations – Wichita, KS - Electricraft | EXPERT COMMERCIAL ELECTRICIANS | 260 |
| `/industrial` | Industrial Electrical Repairs – Wichita, KS - Electricraft | TOP INDUSTRIAL ELECTRICIANS AT YOUR SERVICE! | 233 |
| `/careers` | Electricraft Inc Careers – Join Our Skilled Team | ELECTRICRAFT, INC. CULTURE STATEMENT | 654 |
| `/contact` | Contact Us – Wichita, KS - Electricraft | GET IN TOUCH! | 140 |
| `/blog` | Electricraft Inc Blog – Electrical Tips & Advice | BLOG | 377 |
| `/faq` | FAQ About Residential Electric Contractors \| ElectriCraft, Inc. | RESIDENTIAL ELECTRIC CONTRACTORS FAQS IN WICHITA, KS | 743 |
| `/about-the-owner` | About Electricraft Inc – Meet Our Expert Owner | ABOUT THE OWNER | 618 |

Titles are not wrong on any page. Word counts are body text from one render, not a sitemap count.

## Office addresses and phone numbers (every page footer and contact block)
- Address: 1218 E 18th St North, Wichita, KS 67214. Matches the brief and Google. Google Maps link on the site points to the same address.
- Phones: 316-264-3359 and 316-491-2910 (both on every page). The 316-491-2910 number is not in the brief.
- Email: info@electricraft-ks.com (visible).

## Placeholder or copied content
- None found in the visible text or raw HTML. No lorem ipsum, example.com, or "copy-of".
- Testimonials: none on the site.

## Not checked
- Load speed was not measured to a number. Page weights and Core Web Vitals not captured.
- Tappable phone links were not tested on a real device.
- Google profile itself not opened (search results only).
- External links (Facebook, Yelp, BBB) not opened in a browser; they resolve to the expected domains.
