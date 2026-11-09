# Current-site audit: Jenny Maid's (jennymaidsict.com)

Date: 2026-11-09. Method: Playwright with headless Chromium at 1440x900 and 390x844. Every menu page was loaded (23 pages including home, all HTTP 200). Udall, named on the site but not in the menu, returns 404. Menu items, footer links, home CTAs, the home FAQ accordions and all 9 blog posts were followed. The contact form was read but NOT submitted. Phone and email links were read by href, not dialed or opened. Screenshots are in `audit/screens/`. Raw data is in `audit/data/` (`crawl.json`, `page-text.json`, `blog-posts.json`, `speed.json`, `extra-checks.json`). Helper scripts are in `scripts/analysis/jenny-maids-*.cjs`.

Site stack: WordPress with the Divi theme (`wp-theme-Divi` in the body class). Cookie banner: CookieAdmin.

## Top 3 problems (most costly first)

1. **The new-customer offer is dead text.** On the home page, the "FIRST TIME CLEANING" block reads "Click To Call - Get Your Discount Today!" as plain text: a `div` with no link and no number. Home has only two `tel:` links (header and footer). The discount amount is not stated anywhere on the site. `audit/screens/home-click-to-call-unlinked.png`, `audit/screens/home-first-time-cleaning.png`.
2. **Town pages are a template with the town name swapped, and the service-area lists disagree.** The 11 town pages run about 1,100 to 1,170 words each. Once the town name is swapped out, 39 to 43 percent of each page's lines match the Wichita page. The home FAQ names Udall, but `/udall-ks/` returns 404 and Udall is not in the menu. The contact page names Mulvane and Haysville, which have no page at all. Augusta and Peck are in the menu but missing from the home "Proudly Serving" list. `audit/screens/udall-404.png`.
3. **The site does not show what Google shows.** The site has no street address, no hours and no owner name. Google lists 325 N Meridian Ave, Wichita, KS 67203 (from the pulled Google place data). The site shows only a generic "Wichita Ks & Metro Area" line and a gmail address, `hellojennymaids@gmail.com`. The home-page badge "Google - Award Winning Service" names no award or source. The phone number matches everywhere.

## What works

- All 23 menu pages load (HTTP 200) with no broken images (`brokenImgs` = 0 on every page).
- No horizontal page scroll at 390 px on home, deep cleaning, Wichita, contact and packages (scrollWidth = clientWidth).
- Phone-width menu opens and lists every page. Desktop "Services" and "Locations" open dropdowns that list the correct pages.
- Header phone link is `tel:+13162101900` and shows (316) 210-1900. The footer phone is the same number. On the contact page, the "Click To Call !" button is a working `tel:+13162101900` link. The number matches the Google profile.
- Footer `mailto:hellojennymaids@gmail.com` matches the address shown (About, Contact, footer).
- The home FAQ has 14 questions. All open and show an answer (`audit/data/crawl.json`, `faq`).
- The contact form exists: Name, Email Address, Message, and a math question (`12 + 5 =` on one load, `8 + 7 =` on another). No phone field.
- Seven service pages exist, one per service (basic, blinds hand wipe, deep, spring, fall, all occasions/party, office), plus a Packages page. Each service page loads with its own H1 and about 570 to 740 words.
- All 9 blog posts load (HTTP 200) and are real articles (1,100 to 2,300 words, except the one flagged below). The "READ MORE" links all work.
- Copyright reads "© 2026 | All Rights Reserved." (current year, no stale date).
- No lorem ipsum, no "Samantha Johnson" sample testimonial, no "copy-of" address, no placeholder email. The site has no testimonials at all.

## What is broken, with evidence

### 1. The first-time offer and its "call" are not tappable (high cost)
- Home, "FIRST TIME CLEANING" block: "First Time Customer? Contact Us To Get Started And Receive A New Customer Discount!" and "Click To Call - Get Your Discount Today!". The second line is a `div` with no `<a>` around it, so it cannot be tapped and has no number.
- The discount amount is not given on any page (home, contact, packages).
- Screenshots: `audit/screens/home-click-to-call-unlinked.png`, `audit/screens/home-first-time-cleaning.png`.

### 2. Lead form is thin and its delivery is unverified (high cost)
- Contact page (`https://jennymaidsict.com/contact-us/`): Name, Email Address, Message, and the math question, with a Submit button. The form has no phone field, no service picker and no address field. For a quote, that means the owner has to write back to get a phone number.
- Spam protection is a Divi arithmetic question. A reCAPTCHA reference is present in the page HTML but no widget renders. Not tested beyond that.
- The form was NOT submitted, so whether it sends mail is unverified.
- Screenshot: `audit/screens/contact-form-math-captcha.png`.

### 3. Town pages are templated, and the service-area lists disagree (high cost)
- 11 town pages: `/wichita-ks/`, `/andover-ks/`, `/augusta-ks/`, `/goddard-ks/`, `/derby-ks/`, `/maize-ks/`, `/park-city-ks/`, `/valley-center-ks/`, `/peck-ks/`, `/wellington-ks/`, `/kechi-ks/`. Each is about 1,100 to 1,170 words, with about 39 to 43 percent of lines identical to the Wichita page after the town name is swapped (`scripts/analysis/jenny-maids-blog.cjs` output).
- `/udall-ks/` returns **404**. Udall is named in the home FAQ (`https://jennymaidsict.com/`) and the About FAQ (`https://jennymaidsict.com/about-us/`), but has no page and no menu item. Screenshot: `audit/screens/udall-404.png`.
- Mulvane and Haysville appear only on the contact page (`https://jennymaidsict.com/contact-us/`, "Serving Wichita & Surrounding Areas"). `/mulvane-ks/` and `/haysville-ks/` both return 404 (checked 2026-11-09).
- Home "Proudly Serving Wichita & Nearby Communities" lists Andover, Derby, Maize, Goddard, Park City, Valley Center, Kechi, Wellington "and more". It leaves out Augusta and Peck, which have menu pages.
- The Augusta page title reads "Augusta, KS - Jenny Maids | House Cleaning Services in Wichita, KS", naming the wrong city.
- Reviews name no towns (only "here in town" in E M., 2022-01-01).

### 4. Name, address and hours do not match the Google profile (medium-high cost)
- Site: no street address, no hours, no owner name, no founding year (checked every page's text for "Jennifer", "Larkin", "founded", "since", "established", "franchise", "family owned", "hours" and "address").
- Google (`reviews.json`, `place` block, pulled 2026-11-09): "Jenny Maid's", 325 N Meridian Ave, Wichita, KS 67203, (316) 210-1900, 4.8 stars, 41 reviews.
- Site name: "Jenny Maids" throughout (titles, body, footer). The Packages H1 has a typo, "Jenny Miad's" (see item 6). Reviews use "Jenny Maid's" and "Jenny Maid ICT" (Ashley K., 2026-08-01).
- Site email is `hellojennymaids@gmail.com` (a free gmail address, not on the domain).
- "Google - Award Winning Service" badge on the home page: no award or source is named anywhere on the site.

### 5. Menu parents are dead "#" links (medium cost)
- "Services" and "Locations" in the header menu link to `#`. On desktop, a click changes the URL to `https://jennymaidsict.com/#` and opens a dropdown of real pages. The parent is never a page.
- On the phone menu they are `#` too, but the menu is a flat list, so every page is reachable.
- Screenshots: `audit/screens/menu-services-desktop-click.png`, `audit/screens/menu-locations-desktop-click.png`, `audit/screens/menu-phone-open.png`.

### 6. Headings and page titles (medium cost)
- The first H1 on every page is the phone number, "(316) 210-1900", from the header. The home page has 28 H1 tags in total, including "Quick Links", "Our Services" and "Contact Us" in the footer (`audit/probe-home.json`).
- Packages page H1: "Cleaning Packages of Jenny Miad's" (typo). Screenshot: `audit/screens/packages-h1-typo.png`.
- Wichita page body: "All Ocassions Party Cleaning" (typo). Screenshot: `audit/screens/wichita-typo-ocassions.png`.
- Augusta title names Wichita (see item 3).

### 7. Cookie banner covers most of the first phone screen (medium cost)
- At 390 px, the CookieAdmin "We respect your privacy" panel covers the lower half of the first screen, over the H1 "A Detail-Focused Clean You Can Rely On." Customize, Reject All and Accept All are the only things visible. Screenshot: `audit/screens/home-phone-fold.png`. I did not click any consent button.

### 8. Blog: one post repeats its sections (low-medium cost)
- "Weekly vs. Bi-Weekly House Cleaning: Which Is Better?" (`https://jennymaidsict.com/2026/08/25/weekly-vs-bi-weekly-house-cleaning/`) is 5,184 words. Each of 13 visible H2/H3 headings appears three times on the page. Other posts run 1,100 to 2,300 words. Screenshot: `audit/screens/blog-weekly-vs-biweekly-top.png`.
- Five posts share the date "July 2, 2026". The spring checklist post is bylined "c4jrb", which looks like a login name. One post's URL slug is a bare number (`/2026/07/02/2444/`).

### 9. Same label, different behavior on two pages (low cost)
- Home "Get Your Free Quote Today" buttons go to `/contact-us/`. The same label on the contact page is a `tel:` button and dials the number.

### 10. Speed (not scored; low-medium)
- No Lighthouse or PageSpeed tool is installed here, so there is no score. Browser navigation timing from this container, 3 cold loads at 390 px: home time-to-first-byte 2.2 to 2.4 s, DOM ready 2.9 to 3.1 s, load 3.2 to 3.9 s, about 2.7 MB over 29 requests. Town page: TTFB about 2.0 s, about 1.9 MB. Packages: about 1.3 MB. Measured from this container, not a phone, so treat these as indicators only (`audit/data/speed.json`).

### 11. Smaller items
- Wichita town page embeds a live weather widget (Wichita, 72 degrees, forecast) in the middle of the copy.
- Footer "Our Services" omits Blinds Hand Wipe Cleaning, which the header menu includes. "Party Cleaning" in the footer and "All Occasions & Party Cleaning" in the menu name the same service.
- The contact page H2 headings are empty (four blank `h2` tags).

## Services and their pages

| Service | Own page | Notes |
|---|---|---|
| Basic Cleaning | `/basic-cleaning/` | Ideal for weekly, bi-weekly or monthly service |
| Deep Cleaning | `/deep-cleaning/` | "most popular option"; the starting point for recurring service |
| Blinds Hand Wipe Cleaning | `/blinds-hand-wipe-cleaning/` | Also an add-on |
| Spring Cleaning | `/spring-cleaning/` | |
| Fall Cleaning | `/fall-cleaning/` | |
| All Occasions and Party Cleaning | `/all-occasions-cleaning/` | |
| Office Cleaning | `/office-cleaning/` | Also "light office cleaning on request" on home |
| Packages (Deep, Weekly, Bi-Weekly, Monthly) | `/packages/` | No prices, discount percentage not stated |
| Move-in and move-out | none | Mentioned only in an FAQ on every town page |
| Pets, Airbnb | none | Not a service on the site |

## Site vs. Google profile

- Name: "Jenny Maids" (site), "Jenny Maid's" (Google). Mismatch.
- Phone: (316) 210-1900 on both. Match.
- Address: none on site; 325 N Meridian Ave, Wichita, KS 67203 on Google. Gap.
- Hours: none on site. Google hours were not in the pulled data and were not pulled (review budget). Not checked.
- Services: the site lists 8 service pages. Reviews talk mostly about deep cleaning, recurring service and a few move-outs. Blinds, office, spring, fall and party are never mentioned in reviews.

## What I could not check

- Whether the contact form delivers mail (not submitted, per the rules).
- Whether `mailto:` opens a mail client and whether `tel:` dials (headless browser; only the href was read).
- Real phone rendering (emulated viewports only).
- Page-speed score (no tool installed; navigation timing only, from this container).
- Google hours, categories and the business-start date (no more review or profile pulls).
- Cookie banner behavior after consent (not clicked).
- FAQ accordions on inner pages (only the home FAQ was clicked; the other FAQs were read from the DOM).
- Sitebulb export: none in the prospect folder.
- Whether the Divi "grecaptcha" reference does anything (not tested).
