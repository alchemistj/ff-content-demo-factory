# Fort Wayne, IN roofing: demo prospect qualification (2026-11-15)

Method: each site rendered in Playwright (Chromium) at 1440x900 and 390x844, internal links crawled (up to 15 pages per site). Contact forms inspected, nothing submitted, no email sent. Google listings not checked (no Google access); review counts are from the candidate list. Raw data: `/tmp/claude-0/-home-user/57631495-4bd1-5c8e-bdf1-716f94388210/scratchpad/fw-roofing/results.json` and `detail.json`.

Fit: 5 = small roofing shop, clearly weak site, plain form (no CAPTCHA) or email, 40+ reviews, material for one roof service page.

## Ranked candidates

| Fit | Business (reviews) | One-line reason |
|---|---|---|
| 4 | Guardian Roofing & Gutters (117) | Family-owned roofing and gutters. Plain form, no CAPTCHA, visible email. Weak: about 30 near-identical "in Fort Wayne" pages (~450 words each). Design is polished. |
| 3 | Affordable Roofing (112) | Roofing-only, family-owned since 2012. Short service pages (400-500 words). Form has an invisible reCAPTCHA-type widget and required address fields. Verify before sending. |
| 3 | Big Dog Roofing (90) | Roofing-led, real office address. Plain form (name, phone, service), no CAPTCHA, visible email. Site is modern and not weak. |
| 2 | Hoosier Roofing - Fort Wayne (198) | Local roofing, siding and gutters. Contact page has no form and no email, only the phone. Thin Wix-style pages behind a cookie banner. |
| 2 | Old Fort Roofing (112) | Local roofing, about 14 pages (650-770 words). Contact form has a visible "I am not a robot" CAPTCHA. Site not weak. |
| 2 | Premier Roofing (127) | Roofing-focused, about 14 deep service pages (1,200+ words). reCAPTCHA on forms. Site not weak. |
| 2 | Mullins and Son (60) | General contractor; roofing is one of four services. No roofing page. Plain form and visible email. Thin 5-page site, mobile overflow. |
| 2 | Schmucker Quality Construction (191) | Multi-trade exterior builder (pole barns, sheds, decks, garages). Roofing is not the main business. Mobile page width 980px at 390px viewport. Form has odd required fields (country, street, city, zip). |
| 2 | Priority Exteriors (167) | Siding and windows lead, roofing is secondary. Form has CAPTCHA. Two phone numbers on the site. Not weak. |
| 1 | Maumee River Roofing (402) | Multi-location (Dayton, OH and Fort Wayne), commercial and siding. Form has CAPTCHA and required address. Site phone numbers differ from the list (list 260-579-6970; site 260-370-8081 and 419-664-3483). Too big. |
| 1 | 260 Roofing (147) | Multi-trade (flooring, painting, drywall, fence, driveway, masonry, decks). Roofing is one of about 12 services. Form has CAPTCHA in page source. |
| n/a | Professional Roofing Solutions & Construction (54) | Domain does not resolve (ERR_NAME_NOT_RESOLVED). Could not qualify. Josh to check whether the business is still operating. |

## Picks

1. **guardian** (fit 4): Guardian Roofing & Gutters. Site: http://www.guardingthefort.com/. Phone: (260) 619-8026. Google place id: ChIJKTP7UiH9FYgR3Qt9W5ugD1A.
   Contact route: https://www.guardingthefort.com/contact.html. Fields: First Name*, Last Name*, Email*, Phone*, ZIP*, Service Needed* (select), How did you find us?* (select), Tell us about it (optional). No CAPTCHA. Visible email tyler@guardingthefort.com.

2. **bigdog** (fit 3): Big Dog Roofing. Site: https://www.bigdogroofing.org/. Phone: (260) 999-0347. Google place id: ChIJf66QYSAJFogRVe_FxF5bViE.
   Contact route: https://www.bigdogroofing.org/contact/. Fields: Full Name*, Phone*, service select (optional), plus a hidden-trap text field (company_website). No CAPTCHA. Visible email team@bigdogroofing.org.

3. **affordable** (fit 3): Affordable Roofing. Site: https://affordableroofingfw.com/. Phone: (260) 402-3549. Google place id: ChIJSTESmw3jFYgRf8IpFgfDxt4.
   Contact route: https://affordableroofingfw.com/free-estimate. Fields: Full name*, Phone*, Email*, Street address*, City*, State*, ZIP*, How can we help?, plus a "leave empty" honeypot. An invisible reCAPTCHA-type widget is present. If it challenges, hand-send. Visible email nick@affordableroofingfw.com. Not submitted.

## Notes

- Guardian is the best fit on the plain form and visible email. Its weakness is template filler, not a broken site.
- Affordable is the only pick with a CAPTCHA-type widget. Its route is conditional.
- Big Dog has the cleanest contact route but its site is strong, so the demo value is lower.
