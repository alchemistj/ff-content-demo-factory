# Site coverage: https://www.ahattersley.com/

Checked 2026-11-16 with Playwright (rendered homepage), /sitemap.xml (47 URLs; /sitemap_index.xml returns 404).

## 1. Menu, dropdowns, footer and sitemap

**Main menu**
- Our Company (dropdown): /our-story, /mission-vision, /staff, /affiliations
- Our Services (dropdown): /piping, /plumbing, /hvac, /fabrication, /design-build, /maintenance, /emergency-help
- Our Work: /resources/commercial-projects
- Contact Us: /contact-us
- 24/7 Assistance: /emergency-help

**Footer**
- Contact Us: /contact-us
- Reviews: Google Maps listing (external, not a site page)
- Better Business Bureau: BBB profile (external, not a site page)
- Quick Links: /staff, /affiliations, /resources/commercial-projects ("Projects By Market")

**Homepage body links (not in menu):** /community-minded, /maintenance, /our-story, and three commercial project pages.

**Sitemap-only:** /photos, /Organization (leadership page, not linked from the menu).

**Sitemap, all 47 URLs:** / ; /our-story ; /mission-vision ; /staff ; /staff/josh-larson ; /staff/chuck-vogwill ; /affiliations ; /piping ; /plumbing ; /hvac ; /fabrication ; /design-build ; /maintenance ; /emergency-help ; /contact-us ; /community-minded ; /photos ; /Organization ; /resources/commercial-projects ; the 8 market pages (/corporate, /manufacturing, /civic, /colleges, /healthcare, /k-12, /donation-projects, /sustainable) ; and 20 project pages under them, including /civic/parkview-field, /healthcare/surgery-one, /k-12/carroll-high-school and /manufacturing/kings-hawaiian-bakery.

**Not in the sitemap, found by crawling the market pages:** /resources/commercial-projects/colleges/indiana-tech-geothermal-project, /colleges/regional-public-safety-academy, /sustainable/indiana-tech-geothermal-project, /sustainable/regional-public-safety-academy, /sustainable/surgery-one.

## 2. Which of those pages are in site/

All 47 sitemap URLs and all menu, footer and homepage-body links are in `site/`. Two were missing and were rendered and saved as `site/photos.md` and `site/Organization.md` in the same format. The crawl found 52 pages in total, listed in `site/INDEX.md`, plus the 5 extra crawled project pages above.

## 3. Read limits (not part of the company site)

- The BBB profile (footer) returned a Cloudflare "Just a moment..." challenge (HTTP 403). Not read. No CAPTCHA was attempted.
- /photos is an image gallery. Its text is navigation only (43 words). The images were not read.
- The Google Maps reviews link is external. Reviews were read from `reviews.json` instead (53 of the 62 listed reviews; see inventory.md).

## 4. Verdict

**COMPLETE.** Every site page reached by the menu, footer, homepage body and sitemap is in `site/`. The two items not read (BBB profile, photo images) are off-site or non-text and do not hide any service, credential or price on the site.
