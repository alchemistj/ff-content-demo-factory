# Current-site audit: Integrity Heating and Cooling

Site: https://integrityheatingandcooling.net/ (http redirects to https). Checked 2026-11-09 with Playwright (headless Chromium through the agent proxy) at 390x844 (mobile, touch) and 1440x900 (desktop). Method per `docs/runtime/SITE-AUDIT.md`. Screenshots are in `audit/`. Raw crawl data is in the scratchpad (not in this folder).

**Reviews:** `reviews.json` is in this folder (38 with text, 7 rating-only, all five stars). No owner replies on any. Used below only as evidence of what customers describe; the reviews do not change any finding.

**Pages crawled (both sizes, all HTTP 200):** /, /services/, /heating-repair/, /air-conditioning-service/, /faq/, /integrity-hvac-blog/, /contact/. Plus the one blog post linked from the blog page (HTTP 200).

**Click test:** every visible link and button on every page was clicked at 1440x900 (Playwright, destination recorded). At 390x844 the clicks were unreliable: the open mobile menu overlay intercepted clicks on in-page and footer links, so those rows show the page itself rather than a destination. For phone width, destinations come from the DOM `href` list and an HTTP status check of every internal link (all 200). The desktop click run stopped on the last two items of /air-conditioning-service (browser closed), so those two were not clicked.

**Not checked:** page-speed score (no PageSpeed run), Sitebulb export (none supplied), Google Business Profile hours (not opened), form submission (not submitted, by rule), whether the contact form sends and where notifications go. Google Business Profile itself was not opened (review data comes from `reviews.json`).

## What works

- **Phone links dial the shown number.** Every visible number is `tel:+1-316-932-9559`, which is 316-932-9559. The header, hero, service blocks, contact sidebar and footer each carry one. Google lists (316) 932-9559, the same number. The only number on the site is this one.
- **"Get Help NOW!" button** (header) goes to /contact/ (desktop link list; click test below).
- **Learn More** under "Your Heating Systems Experts" goes to /heating-repair/ and under the cooling block to /air-conditioning-service/ (link list; click test below).
- **Top menu links** (Services, FAQs, Blog, Contact) go to the right pages (desktop click test confirms; phone-width from the href list).
- **Contact form present.** Formidable Forms with an Akismet honeypot; no visible captcha (see Forms).
- **No horizontal scroll** at phone width (scroll width 390 = viewport 390; desktop 1440 = 1440).
- **Copyright is current:** "©2026 Integrity Heating and Cooling. All rights reserved."
- **No placeholder or template text found** in the crawl text of any page. No "lorem", "Samantha", "copy of", "mysite" or sample addresses.
- **Each page has exactly one H1** and a unique `<title>`.

## What is broken, most costly first

### 1. The emergency promise contradicts the posted hours
- **Where:** heating and AC service pages; homepage; contact page.
- **What it says:** /heating-repair/: "24/7 Emergency Repair Service" and "With 24/7 availability". /air-conditioning-service/: "24/7 Emergency Repair Service". Homepage: "Hour cooling repair technicians are available on weekdays and weekends" (likely a typo for "24-hour").
- **What the contact page says:** "Monday – Friday: 8am to 5pm. After hours (Saturday and Sunday) available at additional cost. Please call for quote." The same hours appear in the sidebar. Screenshot: `audit/contact-1440x900-full.png` and `audit/contact-390x844-full.png`.
- **Why it costs most:** a no-heat or no-AC call on a Saturday gets two answers: "24/7" on the service page and "call for quote" on the contact page. This is the call a heating company most needs to win.
- **Customers already describe weekend calls.** Five reviews describe Saturday, Sunday or holiday repairs (Jessica H., 2023-07-31; Colton K., 2025-09-01; Dayna B., 2025-06-21; Tyler J., 2025-07-07; Madison S., 2023-08-17). The site's "call for quote" framing does not match what they describe (`reviews.json`).

### 2. No address, and the site and Google disagree on where the business is
- **Site:** no street address on any page. Location is "Greater Wichita Area" (contact page) and "a family-owned business based in Kechi, KS" (homepage About block). Kechi is a separate city.
- **Google (from brief):** 801 S Fabrique Dr, Wichita KS 67218.
- **Why it matters:** local visitors and map searches can't match the site to a place. A "based in Kechi" claim beside a Wichita listing will confuse a customer or a directory. Which is right is an open question for the owner.

### 3. Only two service pages; installation links go to the repair page
- **Pages:** /heating-repair/ and /air-conditioning-service/ are the only service URLs. Services page lists six services (Heater Repair, Motor Replacement, AC Repair, System Installation, Heat Pump Repair, Commercial HVAC) with no page of their own.
- **Wrong page, confirmed by click (1440x900):** on /services/, the "System Installation" card goes to https://integrityheatingandcooling.net/heating-repair/ (H1 "Heating Repair"). The footer "Heating System Installation" also goes to /heating-repair/ on every page. There is no installation page. Screenshot: `audit/services-1440x900-full.png`.
- **Maintenance plans:** "HVAC Maintenance Plans" is listed in the footer and the homepage has a "HVAC Service and Maintenance Plans" block, but no plan page exists. The $150 plan is described only in the FAQ (https://integrityheatingandcooling.net/faq/).

### 4. Headline and titles name no trade-plus-town
- Homepage H1 "Heating and Cooling Services". Homepage title "Integrity HVAC - Integrity Heating and Cooling". No town in either.
- Other H1s: "Services", "Heating Repair", "Air Conditioning Service", "Frequently Asked Questions", "Integrity HVAC Blog", "Contact".
- Wichita appears only in body copy ("Greater Wichita Area").
- Meta descriptions are missing on the home, services, FAQ, blog and contact pages. Only the heating and AC pages have one.

### 5. Conflicting experience claims
- "over two decades of experience" (homepage), "With over 15 years of experience" (homepage About block), "more than two decades" (heating page), "over 30 years of experience" (AC page). All on the site; they cannot all be true.
- Why it matters: a visitor who reads two pages sees two numbers. Search engines and reviewers can check it.

### 6. Claims that have no proof on the site
- "We are fully licensed and insured for your protection and peace of mind" (homepage). No licence number, state or insurer shown. **Unverified.**
- "Our technicians are certified and trained" (AC page). No certification named. **Unverified.**
- "Free Estimates" and "Get FREE Estimate" buttons, but the homepage says "We offer FREE over-the-phone consultations." Whether an on-site estimate is free is not stated. (https://integrityheatingandcooling.net/heating-repair/; https://integrityheatingandcooling.net/)
- "We work with all major HVAC brands" (AC and heating pages). No brand list. No dealer claim is made.

### 7. Financing is promised but no provider or link is given
- Homepage block "Heating and Cooling Financing": "With our affordable financing, you can get a brand new furnace or air conditioner now!" No lender named and no link. The contact form has "Financing" as a topic option. **Unverified:** whether financing exists.

### 8. Testimonial carousel repeats one review three times
- Homepage carousel markup: "Samuel did a great job of servicing my A/C unit. Dependable and easy to work with." (Scott Bishop) appears three times in the page text. Other quotes: Eugene M., Jesse Busenitz. Compare against the Google reviews when `reviews.json` lands.

### 9. Minor
- Header phone number wraps onto two lines at 390 wide ("316-932-" / "9559"). Screenshot: `audit/home-390x844-top-viewport.png`.
- The header phone link has `target="_blank"` and is labelled "Opens in a new tab", so a tap may try to open a blank tab. Not confirmed on a phone.
- Logo link has empty alt text. The logo renders in the browser.
- Blog has one post ("Why You Should Consider Heater Repair and Furnace Maintenance This Winter"), linked from /integrity-hvac-blog/ (HTTP 200).
- "Hour cooling repair technicians" (homepage): likely a typo.
- Site is WordPress (Rank Math sitemap; Jetpack search; Google Site Kit). Footer "Website by Bryckroad Creative" links to bryckroad.com.

## Forms (not submitted)
- **Contact form** (/contact/, Formidable Forms): fields First Name*, Email*, Phone, "What can we help you with?*" (Heating, Air Conditioning, Financing, Service Question, Other), Message*, Submit. No reCAPTCHA or hCaptcha; an Akismet honeypot field is present. Screenshots: `audit/contact-390x844-full.png`, `audit/contact-1440x900-full.png`.
- **Homepage**: no contact form; the only form is the Jetpack site search (not a contact form).
- Whether the contact form sends and where notifications go: **not tested** (no submission, by rule).

## Office and numbers
- One office on the site: Greater Wichita. One phone: 316-932-9559. No email address on any page crawled.
- Google: (316) 932-9559, 801 S Fabrique Dr, Wichita KS 67218. Phone matches.

## Title and H1 per page
| Page | Title | H1 | Meta description |
| --- | --- | --- | --- |
| `/` | Integrity HVAC - Integrity Heating and Cooling | Heating and Cooling Services | none |
| `/services/` | Services - Integrity Heating and Cooling | Services | none |
| `/heating-repair/` | Heating Systems Repair - Integrity Heating and Cooling | Heating Repair | yes |
| `/air-conditioning-service/` | Air Conditioning Service - Integrity Heating and Cooling | Air Conditioning Service | yes |
| `/faq/` | Frequently Asked Questions - Integrity Heating and Cooling | Frequently Asked Questions | none |
| `/integrity-hvac-blog/` | Integrity HVAC Blog - Integrity Heating and Cooling | Integrity HVAC Blog | none |
| `/contact/` | Contact - Integrity Heating and Cooling | Contact | none |

## Site versus Google profile
- **Name:** matches ("Integrity Heating and Cooling" on the site; Google name from brief).
- **Phone:** matches (316-932-9559 = (316) 932-9559).
- **Services:** HVAC only on the site. Google category not checked (brief gives no category).
- **Address:** site shows none; says Kechi (About) and Greater Wichita (contact). Google 801 S Fabrique Dr, Wichita 67218.
- **Hours:** site says Mon–Fri 8–5 plus "24/7" on two service pages. Google hours not opened: **unverified**.

## Speed
- Not measured with PageSpeed. Browser load times from the crawl (DOMContentLoaded-to-load, desktop, `performance.timing`): roughly 0.7 to 1.1 seconds on the home and service pages; about 1.4 to 2.7 seconds at phone width on the same pages. Rough only, not a score.

## Sitebulb
- No export supplied. Not checked.
