# Coverage check: Sycamore Tree Care

Checked 2026-11-16 against http://www.sycamoretreecare.com/ (redirects to https://www.sycamoretreecare.com/).

## Menu, dropdowns, footer and sitemap (live homepage, Playwright)

Main menu (no dropdowns found):
- Home: https://www.sycamoretreecare.com/ (in site/ as home.md)
- Services: /services (services.md)
- Why us: /about-7 (about-7.md)
- About: /about-us (about-us.md)
- Privacy Policy: /privacy-policy (privacy-policy.md)
- Terms & Conditions: /terms-conditions (terms-conditions.md)
- Work Gallery: /work-gallery (work-gallery.md)
- Unlabeled menu link: /watering (watering.md)
- Button "Request a Free Quote": https://app.singleops.com/accounts/SycamoreTreeCare/portal (third-party quote portal, not a site page, not read)

Footer:
- View Privacy Policy & Terms and Conditions: /privacy-policy
- ops@sycamoretreecare.com (mailto)
- Facebook: https://www.facebook.com/sycamoretreecare (third-party, not read)
- Wix credit (third-party)

Sitemap: /sitemap.xml returns 404. /sitemap_index.xml returns 400. No sitemap.

Homepage body links to the same pages (Learn More and Tree Care Gallery go to /services and /work-gallery). No other same-site links were found.

## Which pages are in site/

| Site page | In site/ |
|---|---|
| / (home) | home.md |
| /services | services.md |
| /about-7 | about-7.md |
| /about-us | about-us.md |
| /privacy-policy | privacy-policy.md |
| /terms-conditions | terms-conditions.md |
| /work-gallery | work-gallery.md |
| /watering | watering.md |

Eight of eight same-site pages are read. Work Gallery holds no text (6 words: the heading and one line), so its photos are not readable as text.

## Notes
- The first crawl run lost the browser partway through and wrote only the homepage. A second run with the same script completed all nine entries.
- Third-party links (quote portal, Facebook, Wix) were not read. They are outside the site.

## Verdict

**COMPLETE.** All eight same-site pages in the menu and footer, plus the homepage, are in site/. No sitemap exists to compare against.
