# Coverage check: premiumroofsllc.com

Checked 2026-11-16 with Playwright against the live homepage and the sitemaps.

## 1. Menu, footer and sitemap list

**Header menu (flat, no dropdowns found):** Home, Residential Roofing, Roof Inspection, Roof Replacement, Roof Installation, Roof Repair, Commercial Roofing, Storm Restoration, Siding, Gutters, Reviews (/testimonials/), Gallery (/project/), About, Contact.

**Footer:** the same service links, Click Here (/contact/), a BBB profile link (external, not read), Privacy Policy, Terms of Services.

**/sitemap.xml** (Yoast index) lists 3 child sitemaps:
- page-sitemap.xml: 108 URLs (includes /services/, /service-area/ and /wisconsin/ hubs, city pages, /faqs/, /blog/, /about/, /contact/, /project/, /testimonials/, two thank-you pages, cedar/metal/flashing/project pages)
- post-sitemap.xml: 23 blog posts
- author-sitemap.xml: 1 author page

/sitemap_index.xml returns 200 and points to the same three children.

Total unique URLs: 132.

## 2. Which are in site/

- All 132 sitemap URLs are saved in `site/`, one file each, HTTP 200 for all.
- The crawl (script run, 60 pages) produced home, contact, services, testimonials, project, about, and city/service-area pages.
- The 72 sitemap pages the crawl missed were fetched in a second pass and saved in the same format (includes /faqs/, /blog/, /services/, /service-area/, /wisconsin/, all blog posts, the author page).
- Every menu and footer link is covered.
- `site/INDEX.md` lists the first pass; the second-pass files are present in the folder, and no page failed.

## 3. Verdict

**COMPLETE.** Every menu, footer and sitemap URL was read to rendered text. No login, CAPTCHA, or block was met.

Caveat: the text is rendered `main` text, so it includes some nav and footer chrome (word counts overstate body copy; the city and blog pages appear to share a template, but this was not checked line by line).
