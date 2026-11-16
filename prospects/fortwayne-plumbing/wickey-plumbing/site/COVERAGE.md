# Coverage check: Wickey Plumbing LLC (https://www.wickeyplumbing.com/)

Checked 2026-11-16 against the live site (Playwright, rendered), sitemap.xml, and site/INDEX.md.

## 1. Menu, dropdowns, footer, sitemap

**Main menu (header nav, no dropdowns found):**
- Home: /
- Services: /services
- Service areas: /service-areas
- Reviews: /customer-reviews
- CTA button "Request a quote": /contact-us4726b987

**Footer:**
- Privacy: /privacy
- Social and map links are off-site: facebook.com/Wickey-Plumbing-61582476598194/, Google Business profile, "Write a Google Review" link.

**sitemap.xml (29 URLs):**
- /, /blog, /services, /service-areas, /customer-reviews
- /service-areas/<ZIP> for 24 ZIPs: 46706, 46710, 46723, 46738, 46741, 46748, 46765, 46774, 46783, 46788, 46804, 46805, 46806, 46807, 46808, 46809, 46814, 46815, 46816, 46818, 46819, 46825, 46835, 46845

**sitemap_index.xml:** 404 (does not exist).

**Also reached, not in the sitemap:** /contact-us4726b987 (linked from the menu CTA and the page footer), /privacy.

## 2. Which of those are in site/

| Page | In site/ | File |
|---|---|---|
| / | Yes | home.md |
| /services | Yes | services.md |
| /service-areas | Yes | service-areas.md |
| /customer-reviews | Yes | customer-reviews.md |
| /blog | Yes (added this run; was in the sitemap, not in the first crawl) | blog.md |
| /contact-us4726b987 | Yes | contact-us4726b987.md |
| /privacy | Yes | privacy.md |
| All 24 sitemap ZIP pages | Yes | service-areas-<ZIP>.md |

Note: /service-areas also lists 7 ZIPs with no page of their own (46803, 46725, 46730, 46743, 46750, 46773, 46797). Their names and counts are in service-areas.md. There is no page to read for them.

INDEX.md was rebuilt this run so it lists all 31 files.

## 3. Verdict

**COMPLETE.** Every menu, footer and sitemap page is in site/ with HTTP 200 and full rendered text. Nothing was blocked, behind a login or errored.
