# Coverage check: kwheatingandcooling.com

Checked 2026-11-16. Method: fetch-site-text.mjs crawl (17 pages), then Playwright on the live homepage (menu, dropdowns, footer), then /sitemap.xml, /sitemap_index.xml, /page-sitemap.xml and /faq-sitemap.xml.

## 1. Full list of pages the site links or lists

**Main menu (live homepage, Playwright):**
- Home: https://kwheatingandcooling.com/
- Our Services: /hvac-services/
- Heating: /heating/
- Air Conditioning: /air-conditioning/
- Generators: /generators/
- Commercial: /commercial-hvac/
- Resources (dropdown, href "#"; no child links found in the rendered DOM)
- Financing: /financing-options/
- Testimonials: /testimonials/
- FAQ: /hvac-faq/
- About Us: /about-us/
- Contact Us: /contact-us/
- Request Service: /request-service/

**Footer (Playwright):**
- Facebook: https://www.facebook.com/kwheatingandair/ (external, not read)
- FAQs: /hvac-faq/
- Privacy Policy: /privacy-policy/ (listed as http:// in the crawl; the https version is the same page)
- Phone: (812) 589-9338

**Sitemaps (Yoast):**
- /sitemap.xml and /sitemap_index.xml both point to page-sitemap.xml and faq-sitemap.xml.
- page-sitemap.xml (13 URLs): /, /about-us/, /privacy-policy/, /hvac-faq/, /financing-options/, /testimonials/, /contact-us/, /request-service/, /hvac-services/, /heating/, /air-conditioning/, /generators/, /commercial-hvac/
- faq-sitemap.xml (23 URLs): /faq/ (index) plus 22 detail pages under /faq/<slug>/ (all return 200; the list is in the table in section 2)

## 2. Which of those pages are in site/

| Page | In site/ | File |
|---|---|---|
| / (home) | Yes | home.md |
| /hvac-services/ | Yes | hvac-services.md |
| /heating/ | Yes | heating.md |
| /air-conditioning/ | Yes | air-conditioning.md |
| /generators/ | Yes | generators.md |
| /commercial-hvac/ | Yes | commercial-hvac.md |
| /financing-options/ | Yes | financing-options.md |
| /testimonials/ | Yes | testimonials.md |
| /hvac-faq/ | Yes | hvac-faq.md |
| /hvac-faq/2, /3, /4 (paginated FAQ) | Yes | hvac-faq-2.md, hvac-faq-3.md, hvac-faq-4.md |
| /about-us/ | Yes | about-us.md |
| /contact-us/ | Yes | contact-us.md |
| /request-service/ | Yes | request-service.md |
| /privacy-policy/ | Yes | privacy-policy.md |
| /faq/ (sitemap index) | Yes (added) | faq-index.md |
| /faq/why-should-i-choose-kw-premier-heating-and-air/ | Yes (added) | faq-why-should-i-choose-kw-premier-heating-and-air.md |
| /faq/do-you-provide-financing/ | Yes (added) | faq-do-you-provide-financing.md |
| /faq/what-services-do-you-offer/ | Yes (added) | faq-what-services-do-you-offer.md |
| /faq/do-you-offer-emergency-hvac-services/ | Yes (added) | faq-do-you-offer-emergency-hvac-services.md |
| /faq/what-areas-do-you-serve/ | Yes (added) | faq-what-areas-do-you-serve.md |
| /faq/what-brands-of-hvac-equipment-do-you-install/ | Yes (added) | faq-what-brands-of-hvac-equipment-do-you-install.md |
| /faq/how-do-i-know-if-i-need-a-new-hvac-system-or-just-a-repair/ | Yes (added) | faq-how-do-i-know-if-i-need-a-new-hvac-system-or-just-a-repair.md |
| /faq/what-types-of-generators-do-you-install/ | Yes (added) | faq-what-types-of-generators-do-you-install.md |
| /faq/how-do-i-schedule-a-service-appointment/ | Yes (added) | faq-how-do-i-schedule-a-service-appointment.md |
| /faq/how-long-does-a-typical-hvac-installation-take/ | Yes (added) | faq-how-long-does-a-typical-hvac-installation-take.md |
| /faq/how-often-should-i-have-my-furnace-serviced/ | Yes (added) | faq-how-often-should-i-have-my-furnace-serviced.md |
| /faq/why-is-my-furnace-blowing-cold-air/ | Yes (added) | faq-why-is-my-furnace-blowing-cold-air.md |
| /faq/how-can-i-lower-my-heating-bills-in-the-winter/ | Yes (added) | faq-how-can-i-lower-my-heating-bills-in-the-winter.md |
| /faq/what-types-of-air-conditioning-systems-do-you-install/ | Yes (added) | faq-what-types-of-air-conditioning-systems-do-you-install.md |
| /faq/how-do-whole-home-standby-generators-work/ | Yes (added) | faq-how-do-whole-home-standby-generators-work.md |
| /faq/what-size-generator-do-i-need-for-my-home/ | Yes (added) | faq-what-size-generator-do-i-need-for-my-home.md |
| /faq/why-is-my-ac-leaking-water/ | Yes (added) | faq-why-is-my-ac-leaking-water.md |
| /faq/why-isnt-my-air-conditioner-cooling-my-home-properly/ | Yes (added) | faq-why-isnt-my-air-conditioner-cooling-my-home-properly.md |
| /faq/do-you-offer-after-hours-service-for-businesses/ | Yes (added) | faq-do-you-offer-after-hours-service-for-businesses.md |
| /faq/what-does-a-commercial-maintenance-agreement-cover/ | Yes (added) | faq-what-does-a-commercial-maintenance-agreement-cover.md |
| /faq/can-you-handle-multiple-locations/ | Yes (added) | faq-can-you-handle-multiple-locations.md |
| /faq/can-you-work-from-construction-plans/ | Yes (added) | faq-can-you-work-from-construction-plans.md |
| Facebook (external) | No | Not read. Not a site page. |
| Resources dropdown children | Not found | The Resources item links to "#" and no child URLs appeared in the rendered DOM. |

The 22 /faq/ detail pages were not in site/INDEX.md. They were fetched with Playwright in the same format and are listed above. INDEX.md itself was not edited.

## 3. Verdict

**COMPLETE.** Every menu, footer and sitemap page (13 page-sitemap URLs and 23 faq-sitemap URLs) returned HTTP 200 and is saved in site/. No 403, login, CAPTCHA or error blocked any page. The only unread item is the external Facebook link, which is not part of the site.
