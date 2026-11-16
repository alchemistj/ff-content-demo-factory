# Coverage check: guardingthefort.com

Checked 2026-11-16. Live homepage rendered in Playwright (Chromium). Menu and footer read from the DOM. Sitemap read from /sitemap.xml (HTTP 200, 20 URLs). /sitemap_index.xml was not checked (not needed: /sitemap.xml exists).

## 1. Pages found

### Header menu (26 links, 25 unique pages)
- Home (/index.html)
- Services (/services.html)
- Service pages (16): roof-replacement, roof-repair, emergency-roofing, shingle-roofing, flat-roofing, metal-roofing, standing-seam-metal, exposed-fastener-metal, commercial-roofing, industrial-roofing, storm-damage-inspections, gutter-installation, gutter-repair, siding, windows, soffit-fascia
- Service Area, Reviews, Financing, About, Contact, Insurance Claims, Gallery
- Header also has a tel: link (260-619-8026) and a "Get a Free Quote" button to /contact.html (same page as Contact)

### Footer (no dropdowns)
- View All Services (/services.html), About Tyler (/about.html), Project Gallery (/gallery.html)
- Privacy (/privacy.html), Accessibility (/accessibility.html)
- tel and mailto links; "#" link (no page)

### Dropdowns
- None found in the DOM. The only hidden-menu link is the mobile "Call 260-619-8026" tel link.

### /sitemap.xml (20 URLs)
- /, about, accessibility, book-online, contact, emergency-roofing, exposed-fastener-metal, financing, flat-roofing, gallery, insurance-claims, metal-roofing, privacy, reviews, roof-repair, roof-replacement, service-area, services, shingle-roofing, standing-seam-metal
- Note: the sitemap omits 8 pages that the menu links (commercial-roofing, industrial-roofing, storm-damage-inspections, gutter-installation, gutter-repair, siding, windows, soffit-fascia). They are read through the menu.

## 2. Which are in site/

Every page above is in site/ except one:

| Page | In site/? | File |
|---|---|---|
| All 25 menu pages, plus privacy and accessibility (footer) | Yes | see site/INDEX.md (index-html.md is the same page as home.md) |
| /book-online.html (sitemap only, no menu or footer link) | Was missing; now saved | site/book-online-html.md |

No menu, footer or sitemap page is missing after that save.

## 3. Verdict

**COMPLETE.** All 26 pages (25 menu/footer pages plus /book-online.html) are in site/. Each returned HTTP 200. No CAPTCHA, login or error was hit. The form pages were not submitted.

Note for the inventory: the book-online page says "Sunday: Emergencies only" and "Storm emergencies: 24/7", while contact.html says Mon–Sat 7am–7pm and emergency-roofing.html says "usually within 24 hours". These are recorded as conflicts in inventory.md.
