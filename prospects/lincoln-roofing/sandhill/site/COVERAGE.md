# Coverage check: sandhillroofing.com (Sandhill Roofing, Lincoln NE)

Checked 2026-11-16. Playwright Chromium, 1440 px. Read-only: no form submitted, no login, no CAPTCHA attempted.

## 1. Menu, dropdowns, footer, sitemap (live pages)

**Main menu (identical on all four hosts):** Home, Roofing, Storm Damage, Siding, Gutters, Windows and Door, Request a Quote, Contact Us. The five service items are in-page anchors on services.sandhillroofing.com (#roofing, #storm-damage, #siding, #gutters, #windows-doors). There is no hidden dropdown: aria-expanded and aria-haspopup found nothing. "Contact Us Today!" button goes to contact.sandhillroofing.com.

**Footer:** Home, the five services (same anchors), Request a Quote, Contact Us. Social: Facebook (facebook.com/NEroofnerd), X (x.com/NEroofnerd), Instagram (instagram.com/sandhillroofing). Google Maps listing. HomeAdvisor profile. Terms of Use and Privacy Policy (thryv.com, platform pages, not business copy).

**Sitemaps:**
- sandhillroofing.com/sitemap.xml: 200, one URL (the homepage root) with images.
- services.sandhillroofing.com/sitemap.xml, quote.sandhillroofing.com/sitemap.xml, contact.sandhillroofing.com/sitemap.xml: 200, one root URL each.
- sandhillroofing.com/sitemap_index.xml: 404.
- robots.txt: Allow all, points to the sitemap above.

**Distinct pages the site has:** 4 (home, services, quote, contact). The five services are sections of the services page, not separate URLs.

**Off-site links, not read as business copy:** facebook.com, x.com, instagram.com, Google Maps, homeadvisor.com, thryv.com terms and privacy.

**Broken link found:** the services page body has one link to `services.sandfhillroofing.com/#windows-doors` (typo in host). DNS does not resolve (ENOTFOUND). The correct link is on the same page in other copies. Report as a site defect.

## 2. Which pages are in site/

| Page | File | Status |
|---|---|---|
| Homepage (captured as www.sandhillroofing.com) | site/home.md | In site/. DOM text matches the visible text (362 words; the extra DOM words are footer social links and hours formatting). |
| Services (5 service sections + insurance + brands) | site/services.md | **Partial.** Captured only the visible text, 478 words. |
| Services, full text | site/services-full.md | **Added this run.** Recovered from the DOM. Holds all five service sections, the "Quality Brand Options" section, and the footer (about 1,890 words including nav and footer). Use this file for services copy. |
| Quote | site/quote.md | In site/. Matches DOM text. |
| Contact | site/contact.md | In site/. Matches DOM text. |

**Why services.md is partial:** the fetch script read only the visible text (innerText). The five service sections are in the DOM but are not in innerText, so the fetch missed about 1,350 words: Storm Damage Services (about 350 words), Siding (about 370), Gutters (about 310), Windows and Doors (about 280) and Comprehensive Door Installations plus the brand section (about 80). This is the gap that would have made the first pass incomplete. services-full.md fixes it.

## 3. Verdict

**COMPLETE** (after the services recovery above). Every menu, footer and sitemap page is read. The four distinct URLs are in site/. The services sections are in site/services-full.md. Writers should quote from services-full.md, not services.md.

Limits: the footer's social, map and HomeAdvisor links and the thryv terms and privacy pages were not fetched (off-site or platform pages). The contact and quote forms were read as fields only, not submitted.
