# Coverage check: tsipeoria.com (Thermal Services Inc)

Checked 2026-11-15 with Playwright Chromium (1440x900, rendered after scripts ran). Nothing submitted, no form sent, no login.

## Sources checked
- Header menu, with dropdown parents (4) opened in the DOM: 13 links.
- Footer: Privacy Policy, Accessibility Statement, Sitemap (3 links). Social links (Facebook, Instagram, Yelp, Google review, BBB) are off-site and were not fetched.
- `/sitemap.xml`: 200, 17 URLs. `/sitemap_index.xml`: 404.

## Full list and status

| Page (URL path) | Source | In site/ |
|---|---|---|
| / (home) | menu, sitemap | home.md |
| /services | menu, sitemap | services.md |
| /services/commercial | menu, sitemap | services-commercial.md |
| /services/residential | menu, sitemap | services-residential.md |
| /services/heating | menu, sitemap | services-heating.md |
| /services/air-conditioning | menu, sitemap | services-air-conditioning.md |
| /services/generators | menu, sitemap | services-generators.md |
| /services/maintenance | menu, sitemap | services-maintenance.md |
| /products | menu, sitemap | products.md |
| /products/special-equipment | menu, sitemap | products-special-equipment.md |
| /qas | menu, sitemap | qas.md |
| /gallery | menu, sitemap | gallery.md |
| /promotions | menu, sitemap | promotions.md |
| /contact-us | menu, sitemap | contact-us.md |
| /privacy-policy | footer, sitemap | privacy-policy.md |
| /accessibility-statement | footer, sitemap | accessibility-statement.md |
| /sitemap | footer, sitemap | sitemap.md |

Count: menu and footer give 16 unique pages plus home; sitemap lists 17. Every one is in `site/` (17 of 17). `site/INDEX.md` lists the same 17 with HTTP 200 for each.

## Verdict: COMPLETE

Every menu, footer and sitemap page is read in full. Caveats that do not change the verdict:
- The BBB profile link (https://www.bbb.org/us/il/peoria/profile/heating-contractors/thermal-services-inc-0724-1000021692) returned a 403 bot challenge when opened for the credential check. It is off-site, not a page of the business's own site, so it is not part of coverage.
- The rendered phone number differs from the static HTML (see inventory.md, Facts and conflicts). Both were read.
