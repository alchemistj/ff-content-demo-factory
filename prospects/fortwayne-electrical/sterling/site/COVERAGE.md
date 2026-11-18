# Site coverage: Sterling Electric

Site: https://sterlingelectric.jobbersites.com/
Checked 2026-11-16 (UTC) with Playwright on the live homepage, plus `/sitemap.xml` and `/sitemap_index.xml`.

## 1. Live menu, dropdowns, footer and sitemap

**Main menu (header):** Home; Client Login (external, https://clienthub.getjobber.com/..., login page, not read). No dropdowns.

**Footer:**
- Home: https://sterlingelectric.jobbersites.com/
- Commercial Electrical Services: https://sterlingelectric.jobbersites.com/services/commercial-electrical-services
- Residential Electrical Services: https://sterlingelectric.jobbersites.com/services/residential-electrical-services
- Electrical System Upgrades and Repairs: https://sterlingelectric.jobbersites.com/services/electrical-system-upgrades-and-repairs
- Terms and conditions: https://sterlingelectric.jobbersites.com/terms-and-conditions
- Privacy policy: https://sterlingelectric.jobbersites.com/privacy-policy
- Client Login (external, not read)
- Facebook (external, https://www.facebook.com/sterlingelectricfw/, not read: off-site)
- "Powered by" Jobber (external, https://jobber.com/)
- Footer "google" icon (external Bing search link, not read: off-site)

**Sitemap.xml (6 URLs):** the homepage, the three service pages, terms and privacy. Same set as the footer.
**sitemap_index.xml:** 404, not present.

## 2. Which of those pages are in site/

| Page | File in site/ | Words | HTTP |
|---|---|---|---|
| https://sterlingelectric.jobbersites.com/ | sterlingelectric.md | 452 | 200 |
| /services/residential-electrical-services | sterlingelectric-services-residential-electrical-services.md | 278 | 200 |
| /services/commercial-electrical-services | sterlingelectric-services-commercial-electrical-services.md | 278 | 200 |
| /services/electrical-system-upgrades-and-repairs | sterlingelectric-services-electrical-system-upgrades-and-repairs.md | 285 | 200 |
| /terms-and-conditions | sterlingelectric-terms-and-conditions.md | 1502 | 200 |
| /privacy-policy | sterlingelectric-privacy-policy.md | 668 | 200 |

All six pages in the menu, footer and sitemap are in site/. No page was missing, so no pages were added by hand.

Not read on purpose: Client Login (login), and the external links (Facebook, Bing, Jobber).

## 3. Verdict

**COMPLETE.** Every own-site page in the menu, footer and sitemap is saved in site/ with the rendered text. The only unread links are login and off-site.

Note for copy: the privacy page contains template text ("Add text her", before "Effective Date: December 23, 2025"). Not a copy fact, but a sign the site is unfinished.
