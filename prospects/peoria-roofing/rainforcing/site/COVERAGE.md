# Site coverage: Rainforcing Roofing and Exteriors (https://www.rainforcingroofing.com/)

Checked 2026-11-16. Method: live homepage read in Playwright Chromium (menu, dropdown and footer links), `/sitemap_index.xml` and `/sitemap.xml` (Rank Math index, five child sitemaps), then compared with `site/INDEX.md`.

## 1. Full list

### Main menu and dropdowns (37 internal links, all return 200 and are in site/)
- Home, About, About the Founder (/miguel-rivera/)
- Service Area: Bartonville, Dunlap, East Peoria, Mapleton, Pottstown, West Peoria, Manito, Morton, Pekin, Tremont, Washington, Bloomington, Normal, Germantown Hills, La Salle, Princeton, Glasford (17 town pages)
- Services: Residential Roofing, Commercial Roofing, Roof Repair, Roof Replacement, Emergency Roof Repair, Storm Damage Roof Repair, Siding, Soffit and Fascia, Gutters, Gutter Installation, Gutter Cleaning, Gutter Guards, Insurance Claims
- Financing, Blog, Testimonials, Contact

### Footer
- Phone link (309) 989-3279 (same number as the header)
- Off-site: Chavez Web Design (chavezwebdesign.com) and Creative Roofing Marketing (creativeroofingmarketing.com), both credited as site builders. Not business pages; not read.
- Social links (Facebook, YouTube) are off-site.

### Sitemap (/sitemap_index.xml, identical to /sitemap.xml)
- post-sitemap, page-sitemap, category-sitemap, video-sitemap, local-sitemap
- 130 page URLs in total (excluding `locations.kml`, a map data file, not a page)
- Includes 2 category pages (/category/drone-roof-inspection, /category/roofing-insurance-claim) and several pages that are not in the menu (e.g. /emergency-roof-repair/, /storm-damage-roof-repair/, /roof-repair/).

### Other
- /metal-roofing/ is linked from crawled pages and returns **404**. It is not in the sitemap.

## 2. Which of those are in site/

- **Menu and footer owned pages:** 37 of 37 in site/. Yes.
- **Sitemap pages:** 130 of 130 in site/ (60 from the first crawl, 54 fetched directly with the same format because the crawl stopped at its page cap, and the rest from the re-run crawl). Yes.
- **Not in site/, by design:** locations.kml (map data), the two off-site footer vendors, and the social links.
- **Total site/ page files:** 144 (plus INDEX.md and this file). Each one has HTTP status, word count and visible text.

## 3. Verdict

**COMPLETE.** Every menu item, every footer item that belongs to the business, and every page in the sitemap has been read in full (rendered text, 1,000+ words on most service and town pages). One dead link (/metal-roofing/, 404) is recorded above and is not a missing page.

Caveats for writers:
- Many town pages (Bartonville, Dunlap, Mapleton, etc.) repeat the same service copy with the town name swapped. Use the Peoria pages for facts; town pages are thin on unique detail.
- Root-path pages such as `/emergency-roof-repair/`, `/storm-damage-roof-repair/`, `/roof-repair/` and `/residential-roofing/` are in the sitemap but not the menu. The menu uses the `/roofing-in-peoria/...` versions. Not checked whether they are duplicates.
- Two root pages' titles name Hopedale, a town that is not in the service-area menu.
