# Coverage check: affordableroofingfw.com

Checked 2026-11-16. Live homepage rendered with Playwright (Chromium). Every `<a href>` in the DOM was read, including dropdown and mobile-menu links, then `/sitemap.xml` was fetched. `/sitemap_index.xml` returns 404.

## 1. Menu, footer and sitemap list (all on-site targets)

Header menu, body and footer links (anchors `#` stripped):

| Link text | Target | Where |
|---|---|---|
| Home | / | header, footer |
| Services | /services | header, body, footer |
| Roof Replacement | /roof-replacement | header, body, footer |
| Asphalt Roofing | /services/asphalt-roofing | header |
| Metal Roofing | /services/metal-roofing | header |
| Gutter Replacement | /services/gutter-replacement | header |
| About Us | /about-us | header, body, footer |
| Financing | /financing | header, body, footer |
| Projects | /projects | header, body, footer |
| Contact Us | /free-estimate | header, body, footer |
| Instant Estimate | /instant-estimate | header, body, footer |
| Blog | /blog | body, footer |
| Roof Replacement Cost | /roof-replacement-cost | body, footer |
| Testimonials | /#testimonials (home) | footer |
| Service Area | /roof-replacement#service-area | footer |
| Terms Of Service | /terms-of-service | footer |
| Privacy Policy | /privacy-policy | footer |
| Body post links | /post/efficient-gutter-maintenance-services-keeping-your-home-safe-and-dry, /post/how-storm-damage-can-affect-your-roof-over-time, /post/understanding-the-roof-replacement-process, /blog/owens-corning-duration-vs-oakridge, /blog/signs-you-need-a-new-roof-fort-wayne | body |

`/sitemap.xml` lists 23 URLs: the 23 pages above, plus `/blog/how-long-does-a-shingle-roof-last-indiana`, `/blog/how-to-compare-roof-replacement-quotes-fort-wayne` and `/blog/roof-replacement-in-winter-northeast-indiana`, which are not linked from the menu or footer on the homepage.

Unique on-site URLs across menu, footer and sitemap: 23 (homepage counted once).

## 2. Which of those pages are in site/

All 23 are in `site/` (see `site/INDEX.md`, 24 files, all HTTP 200, none empty). Nothing had to be fetched by hand.

| Page | File |
|---|---|
| / | home.md |
| /services | services.md |
| /roof-replacement | roof-replacement.md |
| /services/asphalt-roofing | services-asphalt-roofing.md |
| /services/metal-roofing | services-metal-roofing.md |
| /services/gutter-replacement | services-gutter-replacement.md |
| /about-us | about-us.md |
| /financing | financing.md |
| /projects | projects.md |
| /free-estimate | free-estimate.md |
| /instant-estimate | instant-estimate.md |
| /roof-replacement-cost | roof-replacement-cost.md |
| /blog | blog.md |
| /blog/owens-corning-duration-vs-oakridge | blog-owens-corning-duration-vs-oakridge.md |
| /blog/signs-you-need-a-new-roof-fort-wayne | blog-signs-you-need-a-new-roof-fort-wayne.md |
| /blog/how-long-does-a-shingle-roof-last-indiana | blog-how-long-does-a-shingle-roof-last-indiana.md |
| /blog/how-to-compare-roof-replacement-quotes-fort-wayne | blog-how-to-compare-roof-replacement-quotes-fort-wayne.md |
| /blog/roof-replacement-in-winter-northeast-indiana | blog-roof-replacement-in-winter-northeast-indiana.md |
| /post/efficient-gutter-maintenance-services-keeping-your-home-safe-and-dry | post-efficient-gutter-maintenance-services-keeping-your-home-safe-and-dry.md |
| /post/how-storm-damage-can-affect-your-roof-over-time | post-how-storm-damage-can-affect-your-roof-over-time.md |
| /post/understanding-the-roof-replacement-process | post-understanding-the-roof-replacement-process.md |
| /terms-of-service | terms-of-service.md |
| /privacy-policy | privacy-policy.md |

Not in sitemap or menu but present in site/: none.

Notes on mismatches (not coverage gaps):
- The menu label for the efficient-gutter post is "Keeping Your Fort Wayne Home Dry: When It's Time for a New Roof?" on the live page. The fetched file's title tag reads "Is It Time for a New Roof? / Affordable Roofing". Use the file text as the source.
- The sitemap omits `/sitemap_index.xml`, which returns 404. Nothing else was missing.

## 3. Verdict

**COMPLETE.** Every menu, dropdown, footer and sitemap target was read. All 23 are in `site/` as full text, with HTTP 200 and no blocked, login or CAPTCHA pages.
