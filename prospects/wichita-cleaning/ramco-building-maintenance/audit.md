# Ramco Building Maintenance: current-site audit

Site: https://ramcowichita.com/ (www.ramcowichita.com redirects here). Audited 2026-11-09 with Playwright (Chromium) at 390x844 and 1440x900. Crawl reached 40 pages per viewport (the cap; the blog has more posts). Screenshots are in `audit/`. Nothing was submitted. Raw crawl JSON: `/tmp/claude-0/-home-user/6e2e71a9-647d-5049-a9df-d1030ca2580b/scratchpad/ramco-crawl.json`. Scripts: `scripts/analysis/ramco-*.cjs`.

## Correction to qualify.md, read first

qualify.md says the site is a weak, small-specialist site that "shows lorem ipsum, a 'John Doe' sample testimonial, empty headings" and fits the 5-page demo. The crawl does not support the "small site" part:

- The site has about 40 pages: 10 commercial service pages, 5 industry pages, About, Leadership, Areas, Testimonials, Careers, Contact, Privacy, and about 20 blog posts. Each service has its own page.
- The lorem ipsum, "John Doe" and "H2: Featured Vendors / Partners Info" text is **in the homepage source but not visible** to a visitor on either viewport (checked with computed styles, see section 3). "Shows" is wrong; "is in the source" is right.
- There are **no empty headings** on any page. There are hidden template headings, but they are not shown.
- The real visible problems are smaller: one cut-off sentence on the homepage, a footer link to a 404 page, a homepage H1 that does not name the work, and no email address.

So the "weak site, 5-page demo" call (offer 1) needs a second look before the plan is written. The copy problems are real; the missing-pages premise is not.

## What works
- **Phone:** one number, 316-262-7900, is a `tel:316-262-7900` link on every page, in the header and footer. It matches the Google profile.
- **Mobile layout:** no horizontal scroll on the 39 HTML pages at 390px (scrollWidth 390; the XML sitemap page is the exception and is not a web page). The phone hero is clean. Screenshot `audit/mobile-home-first-screen.png`.
- **Navigation:** every menu and card link resolves to a real page. The only 404 is the footer link in finding 1. The careers PDF and the "APPLY NOW" anchor also resolve.
- **Service pages:** each of the 10 services has its own page with its own H1 and title. Carpet, hard floor, upholstery and windows are real pages, not stubs.
- **Industry pages:** manufacturing, banking, commercial offices, education and healthcare each have a page.
- **Testimonials:** the testimonials page has seven named client testimonials with real names and "Partners since" years. No sample names there.
- **Contact form:** a real Gravity Forms form on every page, with invisible reCAPTCHA v3 and hidden honeypot fields (Akismet-style `ak_hp_textarea` and `ak_js`). The honeypot fields are hidden from visitors (checked). Not submitted.
- **Sitemap:** `/sitemap_index.xml` returns 200.
- **Links:** after a slow recheck, 99 of 100 site links return 200. The one 404 is finding 1.

## What is broken, most costly first

1. **The main call-to-action band on every page sends visitors to a 404.** On every page, the band "Cleaning Wichita, One Building at a Time" has a "LEARN MORE" button. It links to `https://ramcowichita.com/?page_id=31672`, which returns 404 ("WHOOPS!", redirected to `/error-404/`). Found by crawl, confirmed by a slow recheck and a browser visit. Screenshots: `audit/404-page-from-footer-learn-more.png`, `audit/desktop-home-footer-cta-learnmore-404.png`, `audit/mobile-home-footer-cta-learnmore-404.png`.

2. **A homepage sentence is cut off mid-sentence, visible on both viewports.** The "Upholstery Cleaning" card on https://ramcowichita.com/ ends "...With the right products and methods, we help". The sentence never finishes. Screenshot: `audit/desktop-home-upholstery-cutoff.png` and `audit/mobile-home-upholstery-cutoff.png`.

3. **Template content is in the homepage HTML (not visible to visitors).** Checked on both viewports; none of these is visible (computed `display`/`visibility` on an ancestor):
   - A testimonial block: "Curabitur aliquet quam id dui posuere blandit. Lorem ipsum..." by "**John Doe**, Title, Company".
   - A statistic block: "100%" with "Lorem Ipsum".
   - An H2: "**H2: Featured Vendors / Partners Info**" (the developer label is the heading text).
   - Hidden template headings elsewhere: "Heading That Says Why We Are Different", "Testimonials / Success", four "Differentiator" H3s, and "H2: H2: Featured Vendors..." on the homepage. Also "Need Bio" in a hidden leadership popup (finding 6).
   Cost: low for visitors, but anyone who reads the page source, a search crawler, or a screen reader that ignores `display:none` will not see them; they are still on the live site. No screenshot, since nothing renders. Evidence: `scripts/analysis/ramco-probe.cjs` output (section 3).

4. **The homepage H1 does not name the work.** The H1 is "CLEANING WICHITA ONE BUILDING AT A TIME." The browser title is "Ramco | Wichita's Leading Commercial Cleaning Service" and the first paragraph says "expert commercial cleaning." So the work is named, but not in the headline. Screenshot: `audit/mobile-home-first-screen.png`, `audit/desktop-home-first-screen.png`.

5. **No email address is published and there are no business hours.** No `mailto:` address appears on any page. The only `mailto:` links are "Share by Mail" buttons on blog posts with blank recipients. There are no hours on the site. Contact is by form (Name, Email, Phone, Zip Code required on /contact/; Message optional). A visitor who wants to email has no address to use.

6. **The footer copyright year is JavaScript-filled and inconsistent.** The footer reads "Website by Abstrakt Marketing Group ©" followed by an empty `#full-year` span. In a browser check on six pages the year was blank on all six. The mobile crawl showed "© 2026" on about 14 pages. It is not a stale year, but it is not reliable either. The footer credit names the agency that built the site (Abstrakt Marketing Group), which matters for the pitch. Screenshot: `audit/desktop-home-footer.png`, `audit/mobile-home-footer.png`.

7. **Stale owner text in the source.** The leadership page source has a hidden popup "Paula Kirk / President / Need Bio" (not shown). The page itself says Matt Brewer is President and Owner. The About page meta description and the careers and blog text say "woman-owned business," which the site does not reconcile with Matt and Maria as the owners.

8. **Testimonial relationship length conflicts with Google.** The site says Murphy Tractor has a "12 year relationship." The Google review from Lisa N. (2021-03-25) says "10 year relationship." Minor, but the demo should not repeat either without checking.

9. **Not verified: social links.** The LinkedIn and Facebook links in the footer refused my automated request (403, 400). They are not verified as live or as Ramco's.

10. **Minor:** the desktop menu has a "Surfaces" label with an empty link (no destination), and the cookie-banner "ACCEPT" and "LEARN MORE" links are `#` anchors (hidden, not visible). Not visible problems.

## Offices and Google profile
- One location: 330 N Cleveland Ave., Wichita, KS 67214, on the site (footer, /contact/) and in the Google file. Phone matches.
- Name matches ("Ramco Building Maintenance").
- Site testimonial widget shows "Based on 24 reviews"; Google shows 25 ratings (12 with text). A one-review difference, not a conflict.
- Google hours and categories were not in the pull. **Not checked.**

## Headline, titles, services
- Homepage H1: "CLEANING WICHITA ONE BUILDING AT A TIME" (one H1; section headings are H2/H3).
- Homepage title: "Ramco | Wichita's Leading Commercial Cleaning Service."
- Service page H1s name the service and the town on most pages: for example "COMMERCIAL JANITORIAL SERVICES", "DAY PORTER SERVICES", "COMMERCIAL ELECTROSTATIC DISINFECTION SERVICES", "COMMERCIAL WINDOW CLEANING IN WICHITA". Some title tags are short ("Ramco | Commercial Cleaning Services in Wichita", "Disaster Recovery Cleaning | Ramco").
- Services named: commercial janitorial and office cleaning, day porter, deep cleaning, electrostatic disinfection, construction cleanup, disaster recovery, carpet, hard floor, upholstery, window cleaning. Each has a page.

## Speed
- Not measured (no PageSpeed or Lighthouse score). Raw homepage HTML is about 395 KB (curl). Not judged.

## Not checked
- Form submission: not submitted. What the form does after sending is unverified.
- Google profile hours, categories, photos and owner replies beyond the 12 text reviews: not pulled (instruction: do not pull more).
- Blog: crawl capped at 40 pages; not every blog post was checked.
- Sitebulb: no export exists for this site in the folder. Not checked.
- Page speed score: not run.
- Social profiles (LinkedIn, Facebook): refused by the site or the bot check; not verified.
- Owner and legal entity: see facts.md section 1.
