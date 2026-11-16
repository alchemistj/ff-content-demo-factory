# Site coverage: https://www.knotjustdecks.com

Checked 2026-11-16. Rendered homepage menu and footer read with Playwright (load event, 2s settle). Sitemap read from https://www.knotjustdecks.com/sitemap.xml (HTTP 200; 34 URLs). /sitemap_index.xml returns 404.

## 1. Menu, dropdowns, footer and sitemap

**Main menu (header/nav):** Garage Floor Coatings, Deck Design & Build, Composite Decking, Wood Decking, Outdoor Living, Pergolas, Gutters, Flagpoles, Roofing, All Services, Why Choose Us?, About, Contact Us, Financing, FREE ESTIMATE. No dropdown submenus found in the rendered DOM.

**Footer:** Services (Garage Floor Coatings, Deck Design & Build, Outdoor Living, Pergolas, Seamless Gutters, Flagpoles); Company (Why Choose Us, Reviews, Financing, FAQ, Contact Us); Service areas (Fort Wayne, New Haven, Huntertown, Columbia City, Defiance); legal (Terms & Conditions, Privacy Policy, Accessibility Statement).

**Homepage body links:** service cards (Garage Floor Coatings, Deck Design & Build, Outdoor Living, Pergolas, Gutters, Flagpoles, Composite Decking, Wood Decking), All Services, Free Estimate.

**Sitemap.xml (34 URLs):** home; services/garage-floor-coatings, deck-design-build, composite-decking, wood-decking, outdoor-living, pergolas, gutters, flagpoles, all, polyaspartic-vs-polyurea, common-deck-mistakes, deck-installation-process, flag-inventory, roofing; areas/fort-wayne, new-haven, huntertown, defiance, columbia-city; why-choose-us, contact, financing, faq, reviews, landing, about, free-estimate, privacy-policy, terms-and-conditions, accessibility-statement.

Pages linked from the sitemap but not from the menu or footer: /landing (not linked, sitemap only), the coating comparison, process, mistakes and flag inventory pages (linked from inside service pages).

## 2. Which of those are in site/

| Site URL | File in site/ | In site/? |
|---|---|---|
| / | home.md | yes |
| /services/garage-floor-coatings | services-garage-floor-coatings.md | yes |
| /services/deck-design-build | services-deck-design-build.md | yes |
| /services/composite-decking | services-composite-decking.md | yes |
| /services/wood-decking | services-wood-decking.md | yes |
| /services/outdoor-living | services-outdoor-living.md | yes |
| /services/pergolas | services-pergolas.md | yes |
| /services/gutters | services-gutters.md | yes |
| /services/flagpoles | services-flagpoles.md | yes |
| /services/roofing | services-roofing.md | yes |
| /services/all | services-all.md | yes |
| /services/polyaspartic-vs-polyurea | services-polyaspartic-vs-polyurea.md | yes |
| /services/common-deck-mistakes | services-common-deck-mistakes.md | yes |
| /services/deck-installation-process | services-deck-installation-process.md | yes |
| /services/flag-inventory | services-flag-inventory.md | yes |
| /areas/fort-wayne | areas-fort-wayne.md | yes |
| /areas/new-haven | areas-new-haven.md | yes |
| /areas/huntertown | areas-huntertown.md | yes |
| /areas/defiance | areas-defiance.md | yes |
| /areas/columbia-city | areas-columbia-city.md | yes |
| /why-choose-us | why-choose-us.md | yes |
| /contact | contact.md | yes |
| /financing | financing.md | yes |
| /faq | faq.md | yes |
| /reviews | reviews.md | yes |
| /landing | landing.md | yes (saved by hand this run, same format; sitemap only) |
| /about | about.md | yes |
| /free-estimate | free-estimate.md | yes |
| /privacy-policy | privacy-policy.md | yes |
| /terms-and-conditions | terms-and-conditions.md | yes |
| /accessibility-statement | accessibility-statement.md | yes |

Missing from site/: none. Areas Angola, Warsaw and Coldwater appear as service-area text on several pages but have no pages of their own, and none are linked.

## 3. Verdict

**COMPLETE.** All 34 sitemap URLs and every menu and footer link are in site/. Nothing was blocked, behind a login, or in error (all returned HTTP 200). Note: site/INDEX.md was written by the fetch script before landing.md was added by hand; INDEX.md does not list landing.md.
