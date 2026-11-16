# Coverage check: bufalocontracting.com

- Checked: 2026-11-16, against the live site (http://www.bufalocontracting.com/ redirects to https://www.bufalocontracting.com/). No 403, CAPTCHA or login was hit on the site.
- Source lists: homepage HTML (main menu, services dropdown, footer area) and `https://www.bufalocontracting.com/sitemap.xml` (64 URLs). `/sitemap_index.xml` returns 404.
- Files: 27 pages from `scripts/fetch-site-text.mjs` (capped at 60 pages). The other 39 were rendered in a real browser (Playwright) and saved in the same `site/<slug>.md` format.
- `site/INDEX.md` does not exist in this folder, so the comparison below is against the files on disk.

## Verdict: **COMPLETE**

All 66 unique paths from the menu, dropdown, footer area and sitemap are saved in `site/`. The footer also links to `/request-free-inspection` (saved) and to external profiles (LinkedIn, Google Maps, Yelp), which were not read because they are off-site.

Off-site checks used only for the credential list in `inventory.md`: BBB search results (read; A+ and Accredited Business listed), BBB profile page (403, not read), CertainTeed homepage (read; no static listing for the business).

## Paths

| Path | Where it appears | Saved as | In site/ |
|---|---|---|---|
| `/` | menu | `site/home.md` | yes |
| `/about` | menu | `site/about.md` | yes |
| `/areas-we-serve` | menu | `site/areas-we-serve.md` | yes |
| `/asphalt-shingle-roofing` | menu | `site/asphalt-shingle-roofing.md` | yes |
| `/careers` | menu | `site/careers.md` | yes |
| `/commercial-roof-installation` | menu | `site/commercial-roof-installation.md` | yes |
| `/commercial-roof-repairs` | menu | `site/commercial-roof-repairs.md` | yes |
| `/commercial-roof-replacement` | menu | `site/commercial-roof-replacement.md` | yes |
| `/commercial-roofing` | menu | `site/commercial-roofing.md` | yes |
| `/contact` | menu | `site/contact.md` | yes |
| `/contracting-resources` | menu | `site/contracting-resources.md` | yes |
| `/deck-building` | sitemap | `site/deck-building.md` | yes |
| `/faq` | menu | `site/faq.md` | yes |
| `/financing` | menu | `site/financing.md` | yes |
| `/finding-quality-siding-services-in-loves-park-what-to-know` | sitemap | `site/finding-quality-siding-services-in-loves-park-what-to-know.md` | yes |
| `/gutter-installation` | menu | `site/gutter-installation.md` | yes |
| `/gutter-installation-in-roscoe-il-managing-water-flow-around-your-property` | sitemap | `site/gutter-installation-in-roscoe-il-managing-water-flow-around-your-property.md` | yes |
| `/gutter-repairs` | menu | `site/gutter-repairs.md` | yes |
| `/gutters` | menu | `site/gutters.md` | yes |
| `/habla-espanol` | sitemap | `site/habla-espanol.md` | yes |
| `/hail-damage-repair` | menu | `site/hail-damage-repair.md` | yes |
| `/how-to-choose-a-roofing-contractor-in-rockford` | sitemap | `site/how-to-choose-a-roofing-contractor-in-rockford.md` | yes |
| `/how-to-find-commercial-roofing-in-winnebago` | sitemap | `site/how-to-find-commercial-roofing-in-winnebago.md` | yes |
| `/ice-dam-icicle-removal-services` | menu | `site/ice-dam-icicle-removal-services.md` | yes |
| `/ice-dam-removal-in-janesville-wi-protecting-your-roof-during-harsh-winters` | sitemap | `site/ice-dam-removal-in-janesville-wi-protecting-your-roof-during-harsh-winters.md` | yes |
| `/ice-damage-repair` | menu | `site/ice-damage-repair.md` | yes |
| `/insurance-claims` | menu | `site/insurance-claims.md` | yes |
| `/metal-roofing` | menu | `site/metal-roofing.md` | yes |
| `/metal-roofing-installation-in-loves-park-il-performance-benefits-for-northern-illinois-homes` | sitemap | `site/metal-roofing-installation-in-loves-park-il-performance-benefits-for-northern-illinois-homes.md` | yes |
| `/request-free-inspection` | sitemap | `site/request-free-inspection.md` | yes |
| `/residential-roofing` | menu | `site/residential-roofing.md` | yes |
| `/residential-roofing-in-rockford-il-what-homeowners-should-know-before-starting` | sitemap | `site/residential-roofing-in-rockford-il-what-homeowners-should-know-before-starting.md` | yes |
| `/residential-vs-commercial-roof-repairs-in-rockford-what-s-different-and-why-it-matters` | sitemap | `site/residential-vs-commercial-roof-repairs-in-rockford-what-s-different-and-why-it-matters.md` | yes |
| `/reviews` | menu | `site/reviews.md` | yes |
| `/rockton-resident-s-guide-to-window-replacement` | sitemap | `site/rockton-resident-s-guide-to-window-replacement.md` | yes |
| `/roof-installations` | menu | `site/roof-installations.md` | yes |
| `/roof-repairs` | menu | `site/roof-repairs.md` | yes |
| `/roof-repairs-in-machesney-park-il-identifying-problems-before-they-escalate` | sitemap | `site/roof-repairs-in-machesney-park-il-identifying-problems-before-they-escalate.md` | yes |
| `/roof-replacement` | menu | `site/roof-replacement.md` | yes |
| `/service-area/barrington-il` | sitemap | `site/service-area-barrington-il.md` | yes |
| `/service-area/beloit-wi` | sitemap | `site/service-area-beloit-wi.md` | yes |
| `/service-area/belvidere-il` | sitemap | `site/service-area-belvidere-il.md` | yes |
| `/service-area/caledonia-il` | sitemap | `site/service-area-caledonia-il.md` | yes |
| `/service-area/durand-il` | sitemap | `site/service-area-durand-il.md` | yes |
| `/service-area/edgerton-wi` | sitemap | `site/service-area-edgerton-wi.md` | yes |
| `/service-area/freeport-il` | sitemap | `site/service-area-freeport-il.md` | yes |
| `/service-area/janesville-wi` | sitemap | `site/service-area-janesville-wi.md` | yes |
| `/service-area/loves-park-il` | sitemap | `site/service-area-loves-park-il.md` | yes |
| `/service-area/machesney-park-il` | sitemap | `site/service-area-machesney-park-il.md` | yes |
| `/service-area/milton-wi` | sitemap | `site/service-area-milton-wi.md` | yes |
| `/service-area/poplar-grove-il` | sitemap | `site/service-area-poplar-grove-il.md` | yes |
| `/service-area/rockford-il` | sitemap | `site/service-area-rockford-il.md` | yes |
| `/service-area/rockton-il` | sitemap | `site/service-area-rockton-il.md` | yes |
| `/service-area/roscoe-il` | sitemap | `site/service-area-roscoe-il.md` | yes |
| `/service-area/south-beloit-il` | sitemap | `site/service-area-south-beloit-il.md` | yes |
| `/siding` | menu | `site/siding.md` | yes |
| `/storm-restoration` | menu | `site/storm-restoration.md` | yes |
| `/storm-restoration-services-in-belvidere-il-steps-to-take-after-severe-weather` | sitemap | `site/storm-restoration-services-in-belvidere-il-steps-to-take-after-severe-weather.md` | yes |
| `/the-hidden-dangers-of-icicles-why-northern-il-homeowners-should-pay-attention` | sitemap | `site/the-hidden-dangers-of-icicles-why-northern-il-homeowners-should-pay-attention.md` | yes |
| `/tpo-flat-roofing-systems` | menu | `site/tpo-flat-roofing-systems.md` | yes |
| `/understanding-ice-dams-in-northern-illinois-what-homeowners-need-to-know` | sitemap | `site/understanding-ice-dams-in-northern-illinois-what-homeowners-need-to-know.md` | yes |
| `/what-to-expect-from-storm-restoration-in-belvidere` | sitemap | `site/what-to-expect-from-storm-restoration-in-belvidere.md` | yes |
| `/when-to-call-a-gutter-contractor-in-machesney-park` | sitemap | `site/when-to-call-a-gutter-contractor-in-machesney-park.md` | yes |
| `/why-ice-builds-on-illinois-roofs-and-how-to-stop-it-before-damage-occurs` | sitemap | `site/why-ice-builds-on-illinois-roofs-and-how-to-stop-it-before-damage-occurs.md` | yes |
| `/wind-damage-repair` | menu | `site/wind-damage-repair.md` | yes |
| `/windows` | menu | `site/windows.md` | yes |
