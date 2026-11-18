# Site coverage: Roettger's Heating and Cooling

Checked 2026-11-16 against https://www.roettgersheatingandcooling.com/ (Playwright, Chromium, 1440 px desktop DOM; sitemap fetched with curl).

## 1. Every link found

**Main menu (header):** Services `/services-content` · About Us `/about-us` · Financing `/financing` · Contact `/contact` · FAQs `/faqs`
**Header button:** Request a Quote → `/contact`
**Header cart icon:** `/cart` (empty cart, not in the menu)
**Logo:** `/`
**Dropdowns:** none (no dropdown or sub-menu elements in the DOM)
**Footer:** no page links. Email, phone, Facebook (`facebook.com/roettgersheatingandcooling/`), LinkedIn (`linkedin.com/in/matt-roettger-2455093a/`). The social links are external and were not opened.
**Sitemap** `/sitemap.xml` (200): `/home`, `/about-us`, `/contact`, `/services-content`, `/financing`, `/faqs`
**Sitemap index** `/sitemap_index.xml`: 404

## 2. Which of those are in `site/`

| Page | In `site/`? | File |
|---|---|---|
| `/` | Yes | `home.md` |
| `/home` | Yes, same text as `/` (diffed the rendered text: identical body) | `home.md` |
| `/services-content` | Yes | `services-content.md` |
| `/about-us` | Yes | `about-us.md` |
| `/financing` | Yes | `financing.md` |
| `/contact` | Yes | `contact.md` |
| `/faqs` | Yes | `faqs.md` |
| `/cart` | Was missing. Now fetched and saved | `cart.md` (new, 34 words, empty cart plus nav and footer) |

`site/INDEX.md` does not list `cart.md` yet. It was not edited, because this brief allows only two output files.

## 3. Not read

- Mobile menu opened on a phone. Hrefs were read from the desktop DOM. The mobile audit (390 px) found the same page set.
- External links: Facebook, LinkedIn, the Wisetack site.
- Google profile.

## Verdict

**COMPLETE.** Every menu, header, sitemap and footer page is in `site/`. The one gap, `/cart`, is now saved.
