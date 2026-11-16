# Coverage check: cutterconstructionllc.com

Checked 2026-11-16 against the live homepage (rendered in Playwright), `/sitemap.xml`, `/sitemap_index.xml`, `/page-sitemap.xml` (27 URLs) and `/post-sitemap.xml` (89 URLs), plus the blog listing pages.

## 1. Main menu and dropdowns (all HTTP 200 and in `site/`)
| Menu item | URL | File in site/ |
|---|---|---|
| Roofing | /services/roofing/ | services-roofing.md |
| Siding | /services/siding/ | services-siding.md |
| Services (hub) | /services/ | services.md |
| Home Additions | /services/home-additions/ | services-home-additions.md |
| Masonry | /services/masonry/ | services-masonry.md |
| Concrete | /services/concrete/ | services-concrete.md |
| General Contracting | /services/general-contractor/ | services-general-contractor.md |
| Residential Projects | /services/residential-projects/ | services-residential-projects.md |
| Garages | /services/garages/ | services-garages.md |
| Decks | /services/decks/ | services-decks.md |
| Model Home | /services/model-home/ | services-model-home.md |
| Finished Basements | /services/basements/ | services-basements.md |
| Snow Removal | /services/snow-removal/ | services-snow-removal.md |
| About Us | /about-us/ | about-us.md |
| Blog | /blog/ | blog.md (+ blog-page-2 to blog-page-9) |
| Financing | /financing/ | financing.md |
| FAQ | /faq/ | faq.md |
| Reviews | /reviews/ | reviews.md |
| Careers | /careers/ | careers.md |
| Contact / Request Estimate | /contact/ | contact.md |
| Home | / | home.md |

The menu lists every service twice (top bar and dropdown), and the two lists are identical. No dropdown item was missed.

## 2. Footer (all in `site/`)
| Footer item | URL | File |
|---|---|---|
| Privacy Policy | /privacy-policy/ | privacy-policy.md |
| Cookie Policy | /cookie-policy/ | cookie-policy.md |
| Conditions of Use | /conditions-of-use/ | conditions-of-use.md |
| Notice and Take Down Policy | /notice-and-take-down-policy/ | notice-and-take-down-policy.md |
| VIEW MORE (reviews) | /reviews/ | reviews.md |

External links, not site pages and not fetched: Facebook, BBB profile, Expertise.com listing.

## 3. Sitemaps
- `/sitemap.xml` and `/sitemap_index.xml`: both list post-sitemap, page-sitemap and ae_global_templates-sitemap. Same content.
- `/page-sitemap.xml` (27 URLs): every URL is in `site/`. Includes `/thank-you/` (thank-you.md) and `/services-decks-trex-decking/`, `/services-decks-railings/` (both captured).
- `/post-sitemap.xml` (89 URLs): every URL is in `site/`. Blog posts are in files named after their slugs, and `site/INDEX.md` lists each one.
- `/ae_global_templates-sitemap.xml`: not fetched. It holds template data, not visible pages.

## 4. Other pages found in site/ but not in the menu
- `/services/general-contracting` returned 404 (services-general-contracting.md). It is a broken link pattern, not a page. Ignore it.
- `/roofing` is an alias that renders the same content as `/services/roofing/` (roofing.md).

## 5. Pages that needed a second pass
- `careers`, `privacy-policy` and four blog posts came back as a "One moment, please..." interstitial on the first pass. Re-fetched with a longer network-idle wait; the files now hold the real text (careers 542 words, privacy-policy 1546 words).
- Blog listing pages 6 to 9 were not in the first crawl. Fetched now (blog-page-6 to blog-page-9).

## 6. Verdict
**COMPLETE.** Every menu item, dropdown item, footer link, and every URL in both sitemaps has a captured file in `site/`, and every capture returned HTTP 200. No page was blocked (no 403), no login or CAPTCHA was hit, and none was skipped. Total: 126 files in `site/`, with `INDEX.md` listing them.
