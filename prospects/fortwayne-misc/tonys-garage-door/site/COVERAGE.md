# Coverage check: Tony's Garage Door Service

Checked 2026-11-16 against https://www.garagedoorsfortwayne.com/ (live, Playwright, Chromium).

## 1. Menu, footer and sitemap

**Main menu (homepage)**
- Home: /
- About: / (anchor, "ABOUT US" section)
- Services: / (anchor, "OUR SERVICES" section)
- FAQ: /faq
- Contact: / (anchor, contact form)
- "Call Now (903)-330-6287" (tel link)

**Dropdowns:** none found.

**Footer**
- (903)-330-6287 (tel link)
- tonysgaragedoorservicellc@gmail.com (visible text; the mailto href is mailto:info@mysite.com)
- "Fort Wayne and surrounding area"
- "Call Us Now" (tel link)
- YouTube: https://www.youtube.com/@PapaTony5340 ("Follow us on YouTube for live installations")

**Sitemap**
- /sitemap.xml: index that points only to https://www.garagedoorsfortwayne.com/pages-sitemap.xml (lastmod 2026-05-22)
- /pages-sitemap.xml lists two URLs: /faq and /
- /sitemap_index.xml: returns a 400 Bad Request error page (not a sitemap)

## 2. Which of those pages are in site/

| Page | In site/? | File |
|---|---|---|
| / (Home, plus About, Services and Contact anchors) | Yes | site/home.md (438 words) |
| /faq | Yes | site/faq.md (561 words) |
| YouTube channel | No (off-site; not part of the business website) | n/a |
| mailto target, tel links, PDF (Invicta sell sheet, resources.sscorp.com) | Not fetched (external or non-page links) | n/a |

## 3. Verdict

**COMPLETE.** Both pages of the site are read in full. The only pages in the menu, footer and sitemap are / and /faq, and both are in site/. Nothing was blocked, no login or CAPTCHA was hit, and no page returned an error.

Caveats:
- The Invicta panel PDF and the YouTube channel were not read. They are not pages of the business site.
- Three Wix pages are not separate URLs: About, Services and Contact all sit on the homepage.
