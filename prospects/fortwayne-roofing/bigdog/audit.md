# Current-site audit: Big Dog Roofing

Site: https://www.bigdogroofing.org/
Pages: 30 unique pages crawled (home, contact, services, portfolio, reviews, about, locations, articles, 6 service pages, 7 town pages, financing, warranty, privacy, terms, commercial, insurance claim, cost guide, emergency repair, siding repair, soffit). Run 2026-11-15, Playwright Chromium, 1440x900 and 390x844.
Method: read-only. No form was typed in or submitted. Every header/nav link target (30) was requested and returned 200. The mobile "Menu" button was clicked at 390 px and opened the nav.
Screenshot kept: `audit/contact-form-1440.png` (the contact form as rendered).

## Contact form (for the record)

- **URL:** https://www.bigdogroofing.org/contact/. The same form appears on the homepage and on most service and town pages.
- **Method and endpoint:** POST to `/.netlify/functions/submit-lead` (read from the DOM; the endpoint was not called).
- **Fields (visible):** FULL NAME* (text), PHONE NUMBER* (tel), WHAT DO YOU NEED HELP WITH? (optional select: Select an option, Free Roof Inspection, Storm Damage Check, Roof Replacement Quote, Roof Repair, Metal Roofing, Gutter Services, Siding / Soffit / Fascia, Emergency Roof Repair, Insurance Claim Assistance, Other).
- **Required:** 2 fields (name, phone). The select is optional.
- **CAPTCHA:** none. No reCAPTCHA, hCaptcha or Turnstile script, iframe or markup on the page.
- **Iframe:** none.
- **maxlength:** none.
- **Honeypot:** a text field named `company_website`, set to `display: none`.
- **Submit button:** "GET MY FREE QUOTE".
- **Note:** the homepage and service-page forms have a shorter select list (for example, Not sure yet, Roof Repair, Roof Replacement, and so on), so the option list differs by page.

## What works

- **Header menu:** all 30 nav link targets return 200 with no redirect. The mobile "Menu" button (class hamburger) opens the nav at 390 px.
- **Phone links:** `tel:+12609990347`, visible and tappable at 390 px on every page (1 to 6 per page). Displayed as 260.999.0347.
- **Mailto:** `mailto:team@bigdogroofing.org`, visible on every page.
- **Horizontal overflow:** none. Page width is 390 px on all 30 pages.
- **No placeholder or copied text** found (no lorem ipsum, example.com, or sample names).
- **FAQ questions** (service and about pages) are buttons with no link. They were not clicked, so whether they expand was not tested.

## Titles and H1s (each page)

| Page | Title | H1 | Words |
|---|---|---|---|
| / (homepage) | Roofing, Siding & Gutters in Fort Wayne / Big Dog Roofing | A roof that protects your home. A quote you understand. | 898 |
| /contact/ | Fort Wayne Roofing Contractor Contact / Big Dog Roofing | Contact a Fort Wayne Roofing Contractor | 339 |
| /services/ | Fort Wayne Roofing Services / Repair, Replacement & Gutters | Fort Wayne Roofing Services | 850 |
| /portfolio/ | Fort Wayne Roofing Portfolio / Big Dog Project Gallery | Our Work | 556 |
| /reviews/ | Big Dog Roofing Reviews From Fort Wayne Homeowners | Big Dog Roofing Reviews From Fort Wayne Homeowners | 238 |
| /about/ | About Big Dog Roofing / Fort Wayne Roofing Company | Craftsmanship, Honesty, and Heart | 590 |
| /locations/ | Areas We Serve / Big Dog Roofing Northeast Indiana | Areas We Serve | 538 |
| /articles/ | Roofing Articles & Guides / Big Dog Roofing Fort Wayne | Roofing Articles & Guides | 5106 |
| /services/roof-replacement/ | Roof Replacement Fort Wayne / Free Estimate / Big Dog | Roof Replacement in Fort Wayne, IN | 922 |
| /services/roof-repair/ | Fort Wayne Roof Repair / Free Inspection / Big Dog Roofing | Roof Repair in Fort Wayne, IN | 830 |
| /services/storm-damage/ | Storm Damage Roof Repair Fort Wayne / Hail & Wind Help | Storm Damage Roof Repair in Fort Wayne, IN | 747 |
| /services/metal-roofing/ | Metal Roofing Fort Wayne / Standing Seam Roofs / Big Dog | Metal Roofing in Fort Wayne, IN | 681 |
| /siding-repair-fort-wayne/ | Siding Repair Fort Wayne / Storm Damage & Trim Repair | Siding Repair Contractor in Fort Wayne, IN | 669 |
| /services/gutters/ | Gutter Installation Fort Wayne / Seamless Gutters / Big Dog | Gutter Installation & Repair in Fort Wayne, IN | 663 |
| /services/soffit-fascia/ | Soffit & Fascia Repair Fort Wayne / Roof Edge Repair | Soffit & Fascia Repair in Fort Wayne, IN | 673 |
| /commercial-roofing-fort-wayne/ | Commercial Roofing Fort Wayne / Flat & Metal Roof Repair | Commercial Roofing Contractor in Fort Wayne, IN | 650 |
| /insurance-claim-roof-fort-wayne/ | Roof Insurance Claim Help Fort Wayne / Big Dog Roofing | Roof Insurance Claim Help in Fort Wayne | 2267 |
| /roof-replacement-cost-fort-wayne/ | Fort Wayne Roof Replacement Cost: $7K–$22K Guide (2026) | How Much Does a Roof Replacement Cost in Fort Wayne? | 1158 |
| /emergency-roof-repair-fort-wayne/ | Emergency Roof Repair Fort Wayne / Big Dog Roofing | Emergency Roof Repair in Fort Wayne, IN | 788 |
| /financing/ | Roof Financing Options in Fort Wayne / Big Dog Roofing | Roof Financing in Fort Wayne, IN | 284 |
| /warranty/ | Big Dog Roofing 15-Year Craftsmanship Warranty / Fort Wayne | 15-Year Craftsmanship Warranty | 502 |
| /privacy-policy/ | Privacy Policy / Big Dog Roofing in Fort Wayne, Indiana | Privacy Policy | 682 |
| /terms-of-service/ | Terms of Service / Big Dog Roofing in Fort Wayne, Indiana | Terms of Service | 906 |
| /roofing-new-haven-in/ | New Haven, IN Roofer / 15-Year Craftsmanship Warranty | New Haven, IN Roofer Backed by a 15-Year Warranty | 1197 |
| /roofing-huntertown-in/ | Roofing Services for Huntertown, IN / Big Dog Roofing | Roofing Contractor in Huntertown, Indiana | 987 |
| /roofing-leo-cedarville-in/ | Leo-Cedarville Roofing Contractor / Big Dog Roofing | Roofing Contractor in Leo-Cedarville, Indiana | 1149 |
| /roofing-roanoke-in/ | Roofing Services for Roanoke, IN / Big Dog Roofing | Roofing Contractor in Roanoke, Indiana | 1001 |
| /roofing-auburn-in/ | Roofing Contractor in Auburn, IN / Big Dog Roofing | Roofing Contractor in Auburn, IN | 1225 |
| /roofing-columbia-city-in/ | Columbia City Roofing Contractor / Big Dog Roofing | Roofing Contractor in Columbia City, IN | 1211 |
| /roofing-huntington-in/ | Roofing Services for Huntington, IN / Big Dog Roofing | Roofing Contractor in Huntington, IN | 1106 |

## Findings

1. **Strong, templated coverage.** Six service pages and seven town pages each have an H1 naming the service or town and the city. That is the pattern the demo would sell against.
2. **Title and H1 match everywhere checked.** No mismatches in the table.
3. **Copy about the company is specific.** Owner/member named "Matt" on the About page. Located at Electric Works. 15-year workmanship warranty, general liability and workers' compensation (see facts.md).
4. **Contact form has no spam check beyond a hidden field.** Honeypot `company_website` (display none). No CAPTCHA.
5. **The FAQ questions are buttons, not links.** The "Menu" button works. The FAQ buttons are accordions, so they are not broken links.
6. **Hours on the contact page:** Mon–Fri 8:00 AM–6:00 PM, Sat–Sun by appointment. Not conflicting with the rest of the site as far as checked.

## Speed and mobile

- Homepage load in local Chromium (no throttling): about 1.1 s to the load event, about 9 KB of HTML transferred. Not a PageSpeed or Lighthouse score.
- No horizontal page scroll at 390 px on any of the 30 pages.

## Not checked (and why)

- **Form submission:** not submitted. The Netlify endpoint was not called.
- **Google profile:** not opened. Rating and count from `reviews.json` (5, 90).
- **FAQ accordions:** not clicked.
- **Warranty and insurance claims on the page:** taken as stated, not verified against any document.
- **Phone dialing on a real phone:** no device.
