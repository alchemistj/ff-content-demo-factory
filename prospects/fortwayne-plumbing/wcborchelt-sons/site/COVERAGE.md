# Coverage check: wcborcheltandsons.com

Checked 2026-11-16. Live homepage rendered in Playwright (http://wcborcheltandsons.com/ resolves to https://www.wcborcheltandsons.com/).

## 1. Links found on the live site

**Main menu (nav):**
- Home (/)
- Services (/services)
- Brands (/brands)
- Financing (/financing)
- About Us (/about-us)
- Career (/career)
- Community (/community)

No dropdowns. The nav also shows the phone text "Text 260-231-1794 / 260-485-3412 / For Emergency Calls follow the prompts..." (not a link).

**Footer:**
- Facebook (https://www.facebook.com/profile.php?id=100046443111148), outside the footer element
- office@wcbsons.net (mailto)
- Office 260-485-3412, Text 260-231-1794
- 6332 Maplecrest Road, Ft Wayne, IN 46835
- "© 2035 by Site Name. Powered and secured by Wix" (placeholder text in the live footer)
- Wix link (wix.com)

**Sitemaps:**
- /sitemap.xml returns 200 and is a sitemap index pointing to https://www.wcborcheltandsons.com/pages-sitemap.xml
- /sitemap_index.xml returns 400 (not used)
- /pages-sitemap.xml lists 7 URLs: /career, /community, /financing, /brands, /services, /about-us, and the homepage

## 2. Which of those are in site/

| Page | In site/ | File |
|---|---|---|
| Home | Yes | home.md |
| Services | Yes | services.md |
| Brands | Yes | brands.md |
| Financing | Yes | financing.md |
| About Us | Yes | about-us.md |
| Career | Yes | career.md |
| Community | Yes | community.md |

Note: the fetch script saved both the http:// and https://www. homepage to home.md, so INDEX.md lists the homepage twice. The saved file is the https://www. version. Both returned the same title and 105 words.

## 3. Verdict

**COMPLETE.** Every menu page, the footer's own links, and every URL in the Wix page sitemap are read and saved in site/. Nothing was blocked, required a login, or returned an error.

Not read: the Facebook page (external, not part of the site).
