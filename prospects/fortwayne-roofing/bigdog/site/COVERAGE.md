# Coverage check: bigdogroofing.org (fetched 2026-11-16)

## Verdict: **COMPLETE**

- Every URL in the homepage menu, footer and body links, and in all sitemaps that exist, is saved in `site/`.
- Sitemap pages: 182 URLs. Saved: 182. All returned HTTP 200.
- Pages that were not in the first crawl (60 pages) were fetched in a second pass with the same format, from the sitemap list. The crawl cap was hit, so `site/INDEX.md` was rebuilt to list all page files.
- Limit: the menu was read from the rendered homepage DOM (all `a[href]`, hidden ones included). The live header has no `<nav>` element, so the header and any dropdown items are listed under "body" below. Dropdown items are not counted separately.

## 1. Sitemaps

| Sitemap | HTTP | URLs |
|---|---|---|
| /sitemap.xml (index of the three below) | 200 | 3 child sitemaps |
| /pages-sitemap.xml | 200 | 44 |
| /articles-sitemap.xml | 200 | 138 |
| /review-articles-sitemap.xml | 200 | 0 |
| /sitemap_index.xml | 404 | none |

## 2. Menu, footer and body links on the homepage

Footer (22 unique):

- https://www.bigdogroofing.org/privacy-policy/ -> `site/privacy-policy.md` (in site/)
- https://www.bigdogroofing.org/portfolio/ -> `site/portfolio.md` (in site/)
- https://www.bigdogroofing.org/reviews/ -> `site/reviews.md` (in site/)
- https://www.bigdogroofing.org/services/roof-repair/ -> `site/services-roof-repair.md` (in site/)
- https://www.bigdogroofing.org/services/roof-replacement/ -> `site/services-roof-replacement.md` (in site/)
- https://www.bigdogroofing.org/services/storm-damage/ -> `site/services-storm-damage.md` (in site/)
- https://www.bigdogroofing.org/siding-repair-fort-wayne/ -> `site/siding-repair-fort-wayne.md` (in site/)
- https://www.bigdogroofing.org/contact/ -> `site/contact.md` (in site/)
- https://www.bigdogroofing.org/services/gutters/ -> `site/services-gutters.md` (in site/)
- https://www.bigdogroofing.org/locations/ -> `site/locations.md` (in site/)
- https://www.bigdogroofing.org/articles/ -> `site/articles.md` (in site/)
- https://www.bigdogroofing.org/ -> `site/home.md` (in site/)
- https://www.bigdogroofing.org/services/ -> `site/services.md` (in site/)
- https://www.bigdogroofing.org/about/ -> `site/about.md` (in site/)
- https://www.bigdogroofing.org/financing/ -> `site/financing.md` (in site/)
- https://www.bigdogroofing.org/warranty/ -> `site/warranty.md` (in site/)
- https://www.bigdogroofing.org/terms-of-service/ -> `site/terms-of-service.md` (in site/)
- https://www.bigdogroofing.org/services/soffit-fascia/ -> `site/services-soffit-fascia.md` (in site/)
- https://www.bigdogroofing.org/commercial-roofing-fort-wayne/ -> `site/commercial-roofing-fort-wayne.md` (in site/)
- https://www.bigdogroofing.org/insurance-claim-roof-fort-wayne/ -> `site/insurance-claim-roof-fort-wayne.md` (in site/)
- https://www.bigdogroofing.org/roof-replacement-cost-fort-wayne/ -> `site/roof-replacement-cost-fort-wayne.md` (in site/)

Body links (not in nav or footer; includes the homepage anchors, which are not separate pages):

- https://www.bigdogroofing.org/#main-content and #hero-form (anchors on the homepage, not pages)
- https://www.bigdogroofing.org/services/metal-roofing -> `site/services-metal-roofing.md` (in site/)
- https://www.bigdogroofing.org/roofing-new-haven-in -> `site/roofing-new-haven-in.md` (in site/)
- https://www.bigdogroofing.org/roofing-huntertown-in -> `site/roofing-huntertown-in.md` (in site/)
- https://www.bigdogroofing.org/roofing-leo-cedarville-in -> `site/roofing-leo-cedarville-in.md` (in site/)
- https://www.bigdogroofing.org/roofing-roanoke-in -> `site/roofing-roanoke-in.md` (in site/)
- https://www.bigdogroofing.org/roofing-auburn-in -> `site/roofing-auburn-in.md` (in site/)
- https://www.bigdogroofing.org/roofing-columbia-city-in -> `site/roofing-columbia-city-in.md` (in site/)

## 3. Sitemap pages and where they are

| URL | File | Status |
|---|---|---|
| https://www.bigdogroofing.org/ | `site/home.md` | in site/ |
| https://www.bigdogroofing.org/about/ | `site/about.md` | in site/ |
| https://www.bigdogroofing.org/asphalt-shingle-roofing-fort-wayne/ | `site/asphalt-shingle-roofing-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/commercial-roofing-fort-wayne/ | `site/commercial-roofing-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/contact/ | `site/contact.md` | in site/ |
| https://www.bigdogroofing.org/emergency-roof-repair-fort-wayne/ | `site/emergency-roof-repair-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/financing/ | `site/financing.md` | in site/ |
| https://www.bigdogroofing.org/hail-damage-roof-fort-wayne/ | `site/hail-damage-roof-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/insurance-claim-roof-fort-wayne/ | `site/insurance-claim-roof-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/locations/ | `site/locations.md` | in site/ |
| https://www.bigdogroofing.org/portfolio/ | `site/portfolio.md` | in site/ |
| https://www.bigdogroofing.org/portfolio/auburn-metal-roof-upgrade/ | `site/portfolio-auburn-metal-roof-upgrade.md` | in site/ |
| https://www.bigdogroofing.org/portfolio/fort-wayne-hail-claim-replacement/ | `site/portfolio-fort-wayne-hail-claim-replacement.md` | in site/ |
| https://www.bigdogroofing.org/portfolio/leo-cedarville-chimney-flashing-repair/ | `site/portfolio-leo-cedarville-chimney-flashing-repair.md` | in site/ |
| https://www.bigdogroofing.org/privacy-policy/ | `site/privacy-policy.md` | in site/ |
| https://www.bigdogroofing.org/reviews/ | `site/reviews.md` | in site/ |
| https://www.bigdogroofing.org/roof-inspection-fort-wayne/ | `site/roof-inspection-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/roof-replacement-cost-fort-wayne/ | `site/roof-replacement-cost-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/roofing-angola-in/ | `site/roofing-angola-in.md` | in site/ |
| https://www.bigdogroofing.org/roofing-auburn-in/ | `site/roofing-auburn-in.md` | in site/ |
| https://www.bigdogroofing.org/roofing-bluffton-in/ | `site/roofing-bluffton-in.md` | in site/ |
| https://www.bigdogroofing.org/roofing-churubusco-in/ | `site/roofing-churubusco-in.md` | in site/ |
| https://www.bigdogroofing.org/roofing-columbia-city-in/ | `site/roofing-columbia-city-in.md` | in site/ |
| https://www.bigdogroofing.org/roofing-decatur-in/ | `site/roofing-decatur-in.md` | in site/ |
| https://www.bigdogroofing.org/roofing-grabill-in/ | `site/roofing-grabill-in.md` | in site/ |
| https://www.bigdogroofing.org/roofing-huntertown-in/ | `site/roofing-huntertown-in.md` | in site/ |
| https://www.bigdogroofing.org/roofing-huntington-in/ | `site/roofing-huntington-in.md` | in site/ |
| https://www.bigdogroofing.org/roofing-kendallville-in/ | `site/roofing-kendallville-in.md` | in site/ |
| https://www.bigdogroofing.org/roofing-leo-cedarville-in/ | `site/roofing-leo-cedarville-in.md` | in site/ |
| https://www.bigdogroofing.org/roofing-marion-in/ | `site/roofing-marion-in.md` | in site/ |
| https://www.bigdogroofing.org/roofing-new-haven-in/ | `site/roofing-new-haven-in.md` | in site/ |
| https://www.bigdogroofing.org/roofing-ossian-in/ | `site/roofing-ossian-in.md` | in site/ |
| https://www.bigdogroofing.org/roofing-roanoke-in/ | `site/roofing-roanoke-in.md` | in site/ |
| https://www.bigdogroofing.org/roofing-warsaw-in/ | `site/roofing-warsaw-in.md` | in site/ |
| https://www.bigdogroofing.org/services/ | `site/services.md` | in site/ |
| https://www.bigdogroofing.org/services/gutters/ | `site/services-gutters.md` | in site/ |
| https://www.bigdogroofing.org/services/metal-roofing/ | `site/services-metal-roofing.md` | in site/ |
| https://www.bigdogroofing.org/services/roof-repair/ | `site/services-roof-repair.md` | in site/ |
| https://www.bigdogroofing.org/services/roof-replacement/ | `site/services-roof-replacement.md` | in site/ |
| https://www.bigdogroofing.org/services/soffit-fascia/ | `site/services-soffit-fascia.md` | in site/ |
| https://www.bigdogroofing.org/services/storm-damage/ | `site/services-storm-damage.md` | in site/ |
| https://www.bigdogroofing.org/siding-repair-fort-wayne/ | `site/siding-repair-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/storm-inspection-fort-wayne/ | `site/storm-inspection-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/warranty/ | `site/warranty.md` | in site/ |
| https://www.bigdogroofing.org/articles/ | `site/articles.md` | in site/ |
| https://www.bigdogroofing.org/articles/2025-roofing-material-trends-what-fort-wayne-homeowners-are-choosing-now/ | `site/articles-2025-roofing-material-trends-what-fort-wayne-homeowners-are-choosing-no.md` | in site/ |
| https://www.bigdogroofing.org/articles/3-tab-vs-architectural-shingles/ | `site/articles-3-tab-vs-architectural-shingles.md` | in site/ |
| https://www.bigdogroofing.org/articles/7-reasons-your-insurance-claim-gets-denied-and-how-fort-wayne-homeowners-can-avoid-them/ | `site/articles-7-reasons-your-insurance-claim-gets-denied-and-how-fort-wayne-homeowner.md` | in site/ |
| https://www.bigdogroofing.org/articles/a-complete-guide-to-roof-flashing-what-it-is-why-it-fails-and-how-we-fix-it/ | `site/articles-a-complete-guide-to-roof-flashing-what-it-is-why-it-fails-and-how-we-fi.md` | in site/ |
| https://www.bigdogroofing.org/articles/acv-vs-rcv-roof-insurance-indiana/ | `site/articles-acv-vs-rcv-roof-insurance-indiana.md` | in site/ |
| https://www.bigdogroofing.org/articles/architectural-shingles-vs-metal-roofing-in-fort-wayne-which-lasts-longer-in-midwest-conditions/ | `site/articles-architectural-shingles-vs-metal-roofing-in-fort-wayne-which-lasts-longe.md` | in site/ |
| https://www.bigdogroofing.org/articles/asphalt-vs-metal-roofing/ | `site/articles-asphalt-vs-metal-roofing.md` | in site/ |
| https://www.bigdogroofing.org/articles/attic-condensation-vs-roof-leak-fort-wayne/ | `site/articles-attic-condensation-vs-roof-leak-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/best-shingles-northwest-fort-wayne-homes/ | `site/articles-best-shingles-northwest-fort-wayne-homes.md` | in site/ |
| https://www.bigdogroofing.org/articles/best-time-replace-roof-fort-wayne/ | `site/articles-best-time-replace-roof-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/can-you-roof-over-old-shingles-in-indiana-legal-requirements-when-it-makes-sense/ | `site/articles-can-you-roof-over-old-shingles-in-indiana-legal-requirements-when-it-ma.md` | in site/ |
| https://www.bigdogroofing.org/articles/chimney-leak-repair-fort-wayne/ | `site/articles-chimney-leak-repair-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/choose-right-roof-color-fort-wayne/ | `site/articles-choose-right-roof-color-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/class-4-impact-resistant-shingles-indiana/ | `site/articles-class-4-impact-resistant-shingles-indiana.md` | in site/ |
| https://www.bigdogroofing.org/articles/commercial-roof-maintenance-fort-wayne/ | `site/articles-commercial-roof-maintenance-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/cool-roofs-reflective-shingles-indiana/ | `site/articles-cool-roofs-reflective-shingles-indiana.md` | in site/ |
| https://www.bigdogroofing.org/articles/do-you-need-roof-ventilation-signs-of-poor-venting-and-how-it-affects-your-energy-bills/ | `site/articles-do-you-need-roof-ventilation-signs-of-poor-venting-and-how-it-affects-y.md` | in site/ |
| https://www.bigdogroofing.org/articles/documenting-roof-storm-damage-photos/ | `site/articles-documenting-roof-storm-damage-photos.md` | in site/ |
| https://www.bigdogroofing.org/articles/does-insurance-cover-roof-replacement-indiana/ | `site/articles-does-insurance-cover-roof-replacement-indiana.md` | in site/ |
| https://www.bigdogroofing.org/articles/downspout-drainage-foundation-fort-wayne/ | `site/articles-downspout-drainage-foundation-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/drip-edge-ice-water-shield-indiana-code/ | `site/articles-drip-edge-ice-water-shield-indiana-code.md` | in site/ |
| https://www.bigdogroofing.org/articles/emergency-roof-repair-guide/ | `site/articles-emergency-roof-repair-guide.md` | in site/ |
| https://www.bigdogroofing.org/articles/emergency-roof-tarping-fort-wayne/ | `site/articles-emergency-roof-tarping-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/fall-roof-prep-fort-wayne-winter/ | `site/articles-fall-roof-prep-fort-wayne-winter.md` | in site/ |
| https://www.bigdogroofing.org/articles/finding-a-roof-leak-source/ | `site/articles-finding-a-roof-leak-source.md` | in site/ |
| https://www.bigdogroofing.org/articles/fort-wayne-roof-replacement-guide-when-is-it-time-to-replace-instead-of-repair/ | `site/articles-fort-wayne-roof-replacement-guide-when-is-it-time-to-replace-instead-of.md` | in site/ |
| https://www.bigdogroofing.org/articles/fort-wayne-roofing-problems/ | `site/articles-fort-wayne-roofing-problems.md` | in site/ |
| https://www.bigdogroofing.org/articles/fort-wayne-storm-season-2026-roof-preparation/ | `site/articles-fort-wayne-storm-season-2026-roof-preparation.md` | in site/ |
| https://www.bigdogroofing.org/articles/free-roof-inspection-fort-wayne/ | `site/articles-free-roof-inspection-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/gaf-shingles-review/ | `site/articles-gaf-shingles-review.md` | in site/ |
| https://www.bigdogroofing.org/articles/gutter-guards-worth-it-fort-wayne/ | `site/articles-gutter-guards-worth-it-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/gutter-installation-bluffton-in/ | `site/articles-gutter-installation-bluffton-in.md` | in site/ |
| https://www.bigdogroofing.org/articles/gutter-maintenance-101-preventing-overflow-foundation-damage-and-roof-rot-in-fort-wayne-homes/ | `site/articles-gutter-maintenance-101-preventing-overflow-foundation-damage-and-roof-r.md` | in site/ |
| https://www.bigdogroofing.org/articles/gutters-101-how-to-protect-your-fort-wayne-home-from-water-damage/ | `site/articles-gutters-101-how-to-protect-your-fort-wayne-home-from-water-damage.md` | in site/ |
| https://www.bigdogroofing.org/articles/hail-damage-roof-fort-wayne-guide/ | `site/articles-hail-damage-roof-fort-wayne-guide.md` | in site/ |
| https://www.bigdogroofing.org/articles/hoa-roof-replacement-approval-northwest-fort-wayne/ | `site/articles-hoa-roof-replacement-approval-northwest-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/how-long-do-roofs-last-in-fort-wayne-material-by-material-breakdown/ | `site/articles-how-long-do-roofs-last-in-fort-wayne-material-by-material-breakdown.md` | in site/ |
| https://www.bigdogroofing.org/articles/how-long-does-roof-replacement-take/ | `site/articles-how-long-does-roof-replacement-take.md` | in site/ |
| https://www.bigdogroofing.org/articles/how-many-squares-is-my-roof/ | `site/articles-how-many-squares-is-my-roof.md` | in site/ |
| https://www.bigdogroofing.org/articles/how-much-snow-is-too-much-a-homeowners-guide-to-roof-weight-limits-in-indiana-winters/ | `site/articles-how-much-snow-is-too-much-a-homeowners-guide-to-roof-weight-limits-in-i.md` | in site/ |
| https://www.bigdogroofing.org/articles/how-old-is-my-roof-fort-wayne-records/ | `site/articles-how-old-is-my-roof-fort-wayne-records.md` | in site/ |
| https://www.bigdogroofing.org/articles/how-to-choose-a-roofing-contractor-in-fort-wayne-the-no-bs-checklist/ | `site/articles-how-to-choose-a-roofing-contractor-in-fort-wayne-the-no-bs-checklist.md` | in site/ |
| https://www.bigdogroofing.org/articles/how-to-file-roof-insurance-claim-indiana/ | `site/articles-how-to-file-roof-insurance-claim-indiana.md` | in site/ |
| https://www.bigdogroofing.org/articles/how-to-read-roofing-estimate/ | `site/articles-how-to-read-roofing-estimate.md` | in site/ |
| https://www.bigdogroofing.org/articles/ice-dams-fort-wayne-causes-prevention/ | `site/articles-ice-dams-fort-wayne-causes-prevention.md` | in site/ |
| https://www.bigdogroofing.org/articles/insurance-claim-vs-out-of-pocket-roof-fort-wayne/ | `site/articles-insurance-claim-vs-out-of-pocket-roof-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/insurance-requested-roof-inspection-indiana/ | `site/articles-insurance-requested-roof-inspection-indiana.md` | in site/ |
| https://www.bigdogroofing.org/articles/low-slope-porch-roof-options-fort-wayne/ | `site/articles-low-slope-porch-roof-options-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/matching-discontinued-shingles-repair/ | `site/articles-matching-discontinued-shingles-repair.md` | in site/ |
| https://www.bigdogroofing.org/articles/metal-roof-over-existing-shingles/ | `site/articles-metal-roof-over-existing-shingles.md` | in site/ |
| https://www.bigdogroofing.org/articles/metal-roofing-huntertown-in/ | `site/articles-metal-roofing-huntertown-in.md` | in site/ |
| https://www.bigdogroofing.org/articles/mortgage-company-roof-insurance-check-indiana/ | `site/articles-mortgage-company-roof-insurance-check-indiana.md` | in site/ |
| https://www.bigdogroofing.org/articles/moss-algae-black-streaks-roof-fort-wayne/ | `site/articles-moss-algae-black-streaks-roof-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/nail-pops-exposed-nails-roof/ | `site/articles-nail-pops-exposed-nails-roof.md` | in site/ |
| https://www.bigdogroofing.org/articles/new-roof-increase-home-value-fort-wayne/ | `site/articles-new-roof-increase-home-value-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/new-roof-insurance-discount-indiana/ | `site/articles-new-roof-insurance-discount-indiana.md` | in site/ |
| https://www.bigdogroofing.org/articles/newer-home-roof-leaks-north-fort-wayne/ | `site/articles-newer-home-roof-leaks-north-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/older-homes-fort-wayne-historic-neighborhoods-roofing/ | `site/articles-older-homes-fort-wayne-historic-neighborhoods-roofing.md` | in site/ |
| https://www.bigdogroofing.org/articles/partial-roof-replacement/ | `site/articles-partial-roof-replacement.md` | in site/ |
| https://www.bigdogroofing.org/articles/pipe-boot-leak-repair-fort-wayne/ | `site/articles-pipe-boot-leak-repair-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/prepare-home-family-roof-replacement/ | `site/articles-prepare-home-family-roof-replacement.md` | in site/ |
| https://www.bigdogroofing.org/articles/recoverable-depreciation-roof-claim/ | `site/articles-recoverable-depreciation-roof-claim.md` | in site/ |
| https://www.bigdogroofing.org/articles/replace-gutters-with-roof-northwest-fort-wayne/ | `site/articles-replace-gutters-with-roof-northwest-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/ridge-vent-vs-box-vent-vs-turbine/ | `site/articles-ridge-vent-vs-box-vent-vs-turbine.md` | in site/ |
| https://www.bigdogroofing.org/articles/roof-damage-from-animals-fort-wayne/ | `site/articles-roof-damage-from-animals-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/roof-decking-replacement-guide/ | `site/articles-roof-decking-replacement-guide.md` | in site/ |
| https://www.bigdogroofing.org/articles/roof-energy-bills-insulation-fort-wayne/ | `site/articles-roof-energy-bills-insulation-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/roof-financing-fort-wayne/ | `site/articles-roof-financing-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/roof-flashing-failures/ | `site/articles-roof-flashing-failures.md` | in site/ |
| https://www.bigdogroofing.org/articles/roof-inspection-checklist/ | `site/articles-roof-inspection-checklist.md` | in site/ |
| https://www.bigdogroofing.org/articles/roof-inspection-columbia-city-in/ | `site/articles-roof-inspection-columbia-city-in.md` | in site/ |
| https://www.bigdogroofing.org/articles/roof-insurance-deductible-guide/ | `site/articles-roof-insurance-deductible-guide.md` | in site/ |
| https://www.bigdogroofing.org/articles/roof-leak-repair-guide/ | `site/articles-roof-leak-repair-guide.md` | in site/ |
| https://www.bigdogroofing.org/articles/roof-or-siding-first-fort-wayne/ | `site/articles-roof-or-siding-first-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/roof-permit-fort-wayne-allen-county/ | `site/articles-roof-permit-fort-wayne-allen-county.md` | in site/ |
| https://www.bigdogroofing.org/articles/roof-pitch-slope-affects-cost-materials/ | `site/articles-roof-pitch-slope-affects-cost-materials.md` | in site/ |
| https://www.bigdogroofing.org/articles/roof-replacement-closeout-checklist-fort-wayne/ | `site/articles-roof-replacement-closeout-checklist-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/roof-replacement-in-winter-indiana/ | `site/articles-roof-replacement-in-winter-indiana.md` | in site/ |
| https://www.bigdogroofing.org/articles/roof-replacement-new-haven-in/ | `site/articles-roof-replacement-new-haven-in.md` | in site/ |
| https://www.bigdogroofing.org/articles/roof-replacement-vs-repair/ | `site/articles-roof-replacement-vs-repair.md` | in site/ |
| https://www.bigdogroofing.org/articles/roof-underlayment-explained-fort-wayne/ | `site/articles-roof-underlayment-explained-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/roof-valley-types-open-vs-closed/ | `site/articles-roof-valley-types-open-vs-closed.md` | in site/ |
| https://www.bigdogroofing.org/articles/roof-ventilation-guide/ | `site/articles-roof-ventilation-guide.md` | in site/ |
| https://www.bigdogroofing.org/articles/roof-warranty-explained/ | `site/articles-roof-warranty-explained.md` | in site/ |
| https://www.bigdogroofing.org/articles/roofing-insurance-supplement-explained/ | `site/articles-roofing-insurance-supplement-explained.md` | in site/ |
| https://www.bigdogroofing.org/articles/roofing-rural-allen-county-grabill-woodburn/ | `site/articles-roofing-rural-allen-county-grabill-woodburn.md` | in site/ |
| https://www.bigdogroofing.org/articles/rotted-fascia-boards-fort-wayne-repair/ | `site/articles-rotted-fascia-boards-fort-wayne-repair.md` | in site/ |
| https://www.bigdogroofing.org/articles/selling-home-aging-roof-fort-wayne/ | `site/articles-selling-home-aging-roof-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/shingle-granule-loss-normal-vs-not/ | `site/articles-shingle-granule-loss-normal-vs-not.md` | in site/ |
| https://www.bigdogroofing.org/articles/signs-you-need-new-roof/ | `site/articles-signs-you-need-new-roof.md` | in site/ |
| https://www.bigdogroofing.org/articles/skylight-leak-repair-fort-wayne/ | `site/articles-skylight-leak-repair-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/solar-panel-removal-reinstall-roof-replacement/ | `site/articles-solar-panel-removal-reinstall-roof-replacement.md` | in site/ |
| https://www.bigdogroofing.org/articles/solar-panels-and-your-roof-fort-wayne/ | `site/articles-solar-panels-and-your-roof-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/spring-roof-inspection-checklist-fort-wayne/ | `site/articles-spring-roof-inspection-checklist-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/standing-seam-vs-exposed-fastener-metal/ | `site/articles-standing-seam-vs-exposed-fastener-metal.md` | in site/ |
| https://www.bigdogroofing.org/articles/storm-chaser-roofers-red-flags/ | `site/articles-storm-chaser-roofers-red-flags.md` | in site/ |
| https://www.bigdogroofing.org/articles/storm-damage-roof-repair-auburn-in/ | `site/articles-storm-damage-roof-repair-auburn-in.md` | in site/ |
| https://www.bigdogroofing.org/articles/the-fort-wayne-homebuyers-roofing-checklist-what-to-inspect-before-making-an-offer/ | `site/articles-the-fort-wayne-homebuyers-roofing-checklist-what-to-inspect-before-maki.md` | in site/ |
| https://www.bigdogroofing.org/articles/the-hidden-cost-of-delaying-a-roof-leak-repair-in-fort-wayne-real-damage-timelines-examples/ | `site/articles-the-hidden-cost-of-delaying-a-roof-leak-repair-in-fort-wayne-real-damag.md` | in site/ |
| https://www.bigdogroofing.org/articles/the-truth-about-roofing-warranties-in-indiana-whats-covered-whats-not-and-how-to-avoid-surprises/ | `site/articles-the-truth-about-roofing-warranties-in-indiana-whats-covered-whats-not-a.md` | in site/ |
| https://www.bigdogroofing.org/articles/the-ultimate-guide-to-roof-repairs-in-fort-wayne-costs-timing-and-what-homeowners-should-expect/ | `site/articles-the-ultimate-guide-to-roof-repairs-in-fort-wayne-costs-timing-and-what-.md` | in site/ |
| https://www.bigdogroofing.org/articles/tpo-epdm-metal-commercial-roofing-indiana/ | `site/articles-tpo-epdm-metal-commercial-roofing-indiana.md` | in site/ |
| https://www.bigdogroofing.org/articles/tree-canopy-roof-maintenance-northwest-fort-wayne/ | `site/articles-tree-canopy-roof-maintenance-northwest-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/vinyl-vs-fiber-cement-siding-fort-wayne/ | `site/articles-vinyl-vs-fiber-cement-siding-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/warning-signs-new-siding-fort-wayne/ | `site/articles-warning-signs-new-siding-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/what-are-fascia-soffit-roof-protection/ | `site/articles-what-are-fascia-soffit-roof-protection.md` | in site/ |
| https://www.bigdogroofing.org/articles/what-to-do-after-hailstorm-fort-wayne/ | `site/articles-what-to-do-after-hailstorm-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/what-to-expect-roof-replacement-day-fort-wayne/ | `site/articles-what-to-expect-roof-replacement-day-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/why-fort-wayne-roofs-age-faster-than-you-think-weather-patterns-every-homeowner-should-know/ | `site/articles-why-fort-wayne-roofs-age-faster-than-you-think-weather-patterns-every-h.md` | in site/ |
| https://www.bigdogroofing.org/articles/why-gutters-matter-more-than-you-think/ | `site/articles-why-gutters-matter-more-than-you-think.md` | in site/ |
| https://www.bigdogroofing.org/articles/why-proper-attic-ventilation-matters-especially-in-indiana-homes/ | `site/articles-why-proper-attic-ventilation-matters-especially-in-indiana-homes.md` | in site/ |
| https://www.bigdogroofing.org/articles/why-winter-is-hard-on-fort-wayne-roofs-and-how-to-protect-your-home/ | `site/articles-why-winter-is-hard-on-fort-wayne-roofs-and-how-to-protect-your-home.md` | in site/ |
| https://www.bigdogroofing.org/articles/wind-damage-roof-insurance/ | `site/articles-wind-damage-roof-insurance.md` | in site/ |
| https://www.bigdogroofing.org/articles/wind-damage-vs-hail-damage-fort-wayne-roof/ | `site/articles-wind-damage-vs-hail-damage-fort-wayne-roof.md` | in site/ |
| https://www.bigdogroofing.org/articles/kickout-flashing-fort-wayne/ | `site/articles-kickout-flashing-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/bathroom-fan-roof-vent-fort-wayne/ | `site/articles-bathroom-fan-roof-vent-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/roofing-change-orders-fort-wayne/ | `site/articles-roofing-change-orders-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/roof-leaks-after-repair-fort-wayne/ | `site/articles-roof-leaks-after-repair-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/downspout-draining-onto-roof-fort-wayne/ | `site/articles-downspout-draining-onto-roof-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/attic-baffles-fort-wayne/ | `site/articles-attic-baffles-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/tree-branch-on-roof-fort-wayne/ | `site/articles-tree-branch-on-roof-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/curling-shingles-fort-wayne/ | `site/articles-curling-shingles-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/attic-hatch-air-leaks-fort-wayne/ | `site/articles-attic-hatch-air-leaks-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/leaking-gutter-seams-fort-wayne/ | `site/articles-leaking-gutter-seams-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/leaves-roof-valleys-fort-wayne/ | `site/articles-leaves-roof-valleys-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/roofing-nails-yard-fort-wayne/ | `site/articles-roofing-nails-yard-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/roof-storm-damage-away-fort-wayne/ | `site/articles-roof-storm-damage-away-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/holiday-lights-roof-damage-fort-wayne/ | `site/articles-holiday-lights-roof-damage-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/winter-attic-vents-fort-wayne/ | `site/articles-winter-attic-vents-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/new-shingles-not-sealing-cold-weather-fort-wayne/ | `site/articles-new-shingles-not-sealing-cold-weather-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/satellite-dish-removal-roof-repair-fort-wayne/ | `site/articles-satellite-dish-removal-roof-repair-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/commercial-roof-drains-fall-fort-wayne/ | `site/articles-commercial-roof-drains-fall-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/roof-rake-before-winter-fort-wayne/ | `site/articles-roof-rake-before-winter-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/roof-heat-cables-fort-wayne/ | `site/articles-roof-heat-cables-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/sagging-gutters-before-winter-fort-wayne/ | `site/articles-sagging-gutters-before-winter-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/rain-during-roof-replacement-fort-wayne/ | `site/articles-rain-during-roof-replacement-fort-wayne.md` | in site/ |
| https://www.bigdogroofing.org/articles/roof-dryer-vent-before-winter-fort-wayne/ | `site/articles-roof-dryer-vent-before-winter-fort-wayne.md` | in site/ |

Extra files not in any sitemap: `site/terms-of-service.md`.

## Failed or blocked pages

None. No CAPTCHA, login or error was met.

