# Coverage check: envisionelectricpros.com

Checked 2026-11-16 against the live site (rendered in Playwright, Chromium). Canonical host: https://envisionelectricpros.com/ (http://www redirects to it).

## 1. Full list of pages the site links to

**Main menu (rendered, 4 items, no dropdowns; the "#" links are placeholders):**
- HOME: /
- ABOUT: /about/
- SERVICES: /services/
- CONTACT US: /contact-us/

**Footer:**
- Commercial, Residential, Industrial: each links to ?page_id=14, which redirects to /services/
- Home: /
- About: ?page_id=12, which redirects to /about/
- Services: ?page_id=14, which redirects to /services/
- Contact Us: ?page_id=16, which redirects to /contact-us/
- Phone 1.402.450.7497 (tel link); email tom.mcevoy@envisonelectricpros.com (spelling as on the live site)

**Body links outside menu and footer:**
- "Sara" (author archive): /author/sara/ (HTTP 200; the page says the author has not filled in details and has 0 entries; no business content)
- "GET A QUOTE": ?page_id=16, which redirects to /contact-us/

**Sitemap (/wp-sitemap-posts-page-1.xml, linked from /sitemap.xml and /wp-sitemap.xml; /sitemap_index.xml returns 404):**
- /
- /about/
- /services/
- /contact-us/
- /landing-page/

## 2. Which of those pages are in site/

| Page | In site/ | File |
|---|---|---|
| / (home) | yes | home.md |
| /about/ | yes | about.md |
| /services/ | yes | services.md |
| /contact-us/ | yes | contact-us.md |
| /landing-page/ (sitemap only, not in menu or footer) | added this run | landing-page.md |
| /author/sara/ (body link) | not saved as a file; read directly, no business content | none |

Every page in the menu, footer and sitemap is in site/. The landing page was missing from site/INDEX.md; it was saved by hand in the same format.

## 3. Verdict

**COMPLETE.** All menu, footer and sitemap pages were read. The /landing-page/ page is a "WEBSITE COMING SOON!" placeholder with 3 words. The three footer "Commercial / Residential / Industrial" links all go to the one services page, so there are no separate service pages on the live site.
