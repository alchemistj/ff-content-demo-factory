# Coverage check: The Way Construction (https://thewayconstruction.com/)

Checked 2026-11-16. Live homepage rendered in Playwright (Chromium). Sitemap read from /sitemap.xml (HTTP 200). /sitemap_index.xml returns 404.

## 1. Main menu (homepage nav, incl. dropdowns)
- Home (/)
- Services dropdown: Roofing (/roofing), Siding (/siding), Gutters (/gutters), Storm Damage (/storm-damage)
- About dropdown: About Us (/about), The Why (/why-we-are-called-the-way)
- Contact (/contact)
- Our Work (/gallery)
- Button: Get My Free Estimate or Inspection (/contact)

## 2. Footer
- Roofing, Siding, Gutters, Storm Damage (same four service pages)
- Repairs (/#services, homepage anchor)
- Evansville, IN (/evansville-in); Newburgh, IN (/newburgh-in); Boonville, IN (/boonville-in); Mt Vernon, IN (/mt-vernon-in); Princeton, IN (/princeton-in); Henderson, KY (/henderson-ky)
- About Us (/about); Why The Way (/why-we-are-called-the-way); Our Work (/gallery); Get a Quote (/contact)
- Privacy Policy (/privacy-policy)

## 3. Sitemap (/sitemap.xml, 29 URLs)
/, /roofing, /siding, /gutters, /storm-damage, /about, /gallery, /contact, /evansville-in, /newburgh-in, /boonville-in, /mt-vernon-in, /princeton-in, /henderson-ky, /new-harmony-in, /wadesville-in, /haubstadt-in, /ft-branch-in, /rockport-in, /why-we-are-called-the-way, /roof-replacement, /roof-repair, /free-roof-inspection, /financing, /pricing, /reviews, /areas-served, /guarantee, /book-now

## 4. Pages found by the crawl but not in the menu, footer or sitemap
- /bible-study (linked from the site; not in sitemap)
- /privacy-policy (footer only; not in sitemap)

## 5. Which of these are in site/
| Source | Page | In site/ | How |
|---|---|---|---|
| Menu/footer/sitemap | / | yes | home.md (crawl) |
| | /roofing, /siding, /gutters, /storm-damage | yes | crawl |
| | /about, /why-we-are-called-the-way, /contact, /gallery | yes | crawl |
| | /evansville-in, /newburgh-in, /boonville-in, /mt-vernon-in, /princeton-in, /henderson-ky | yes | crawl |
| | /privacy-policy | yes | crawl |
| Sitemap | /roof-replacement, /roof-repair, /free-roof-inspection, /financing | yes | crawl (linked from the service pages) |
| Sitemap | /new-harmony-in, /wadesville-in, /haubstadt-in, /ft-branch-in, /rockport-in | yes | added: rendered in Playwright, same format |
| Sitemap | /pricing, /reviews, /areas-served, /guarantee, /book-now | yes | added: rendered in Playwright, same format |
| Crawl only | /bible-study | yes | crawl |

Every URL above now has a file in site/. The 10 files added by hand (new-harmony-in, wadesville-in, haubstadt-in, ft-branch-in, rockport-in, pricing, reviews, areas-served, guarantee, book-now) carry the same header as the crawl output. Their word counts: 332, 312, 303, 309, 308, 224, 548, 111, 185, 108.

## 6. Notes
- The homepage waited for network idle and timed out at 45 s. The DOM loaded and the links were read from it, so the nav and footer lists are complete for the rendered page.
- /sitemap_index.xml returns 404, so /sitemap.xml is the only sitemap.
- Not read: the privacy policy in full (it is legal text; only its contact and SMS terms were scanned).
- Not read: the GAF contractor locator (gaf.com returns 403 to this environment), so no credential could be checked on the certifier's site.

## Verdict: COMPLETE

Every page in the main menu, the footer and the sitemap is in site/, and all of them returned HTTP 200.
