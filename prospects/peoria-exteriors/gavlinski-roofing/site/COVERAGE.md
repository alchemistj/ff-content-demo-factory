# Coverage: Gavlinski Roofing (https://gavlinskiroofing.com/)

Checked 2026-11-16 with a real browser (Playwright, Chromium) against the live site.

## 1. Full menu, dropdowns, footer and sitemap

**Main menu (header nav), no dropdowns:**
- Home: https://gavlinskiroofing.com/
- About: https://gavlinskiroofing.com/about/
- Services: https://gavlinskiroofing.com/services/
- Gallery: https://gavlinskiroofing.com/gallery/
- Contact: https://gavlinskiroofing.com/contact-us/
- Phone link: tel:+13099225767 (309-922-5767)

**Homepage body links (same-page anchors, not new pages):**
- READ MORE x5: /services/#roofing, #siding, #windows, #remodel, #insurance

**Footer:**
- BBB seal link to https://www.bbb.org/us/il/peoria/profile/roofing-contractors/gavlinski-roofing-and-construction-0724-90023862/ (external; see section 3)
- Copyright line only. No other footer links.
- Privacy policy is not linked from the menu or footer. It appears only in the sitemap.

**Sitemap** (https://gavlinskiroofing.com/sitemap_index.xml, which points to /page-sitemap.xml, both HTTP 200):
- https://gavlinskiroofing.com/
- https://gavlinskiroofing.com/privacy-policy/
- https://gavlinskiroofing.com/gallery/
- https://gavlinskiroofing.com/about/
- https://gavlinskiroofing.com/services/
- https://gavlinskiroofing.com/contact-us/

Total unique pages: 6. No service sub-pages exist. All services sit on /services/.

## 2. Which of those are in site/

| Page | In site/ | File |
|---|---|---|
| Home | Yes | site/home.md (482 words) |
| About | Yes | site/about.md (201 words) |
| Services | Yes | site/services.md (313 words) |
| Gallery | Yes | site/gallery.md (14 words; photos only, no text) |
| Contact | Yes | site/contact-us.md (33 words; form and phone) |
| Privacy policy | Yes, saved by hand in the same format | site/privacy-policy.md (893 words) |

The crawl script (scripts/fetch-site-text.mjs) found the first five. It did not find /privacy-policy/ because no page links to it. I saved that page by hand with the same header format.

## 3. Verdict

**COMPLETE.** Every menu item, footer link and sitemap URL on the business's own site has been read as rendered text.

Not read, and why:
- BBB profile (external certifier, not the business's site): returned HTTP 403 ("Just a moment..." bot challenge) to automated reads. The BBB seal is therefore unconfirmed.
