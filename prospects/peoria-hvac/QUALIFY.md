# Peoria HVAC qualify (lookup only, nothing submitted)

Checked with Playwright at 1440x900 (all pages crawled, desktop) and 390x844 (homepage). Crawl data: /tmp/claude-0/-home-user/57631495-4bd1-5c8e-bdf1-716f94388210/scratchpad/peoria-hvac/crawl.json

| Rank | Fit | Business | Reviews | Pages | Route | Reasons |
|---|---|---|---|---|---|---|
| 1 | 3 | TSI / Thermal Services Inc. | 51 | 17 | Plain form, no CAPTCHA | Single-location HVAC since 2004. Real service pages (A/C repair 508w, heating 487w). Weak: horizontal scroll at 390px, thin hub/gallery/promotions pages. Site phone (309) 324-5317 differs from listing phone. No visible email. |
| 2 | 3 | Griffin HVAC | 444 | 13 | Visible reCAPTCHA on contact form | Small owner-run shop (personal Gmail). Weak: "Slide title" template filler, odd H1 about the online schedule, horizontal scroll at 390px. Material for an AC or furnace page (Amana content, maintenance plan). Blocked by CAPTCHA, so hand-send only. |
| 3 | 3 | Chuck's Heating and Cooling | 65 | 12 | Visible reCAPTCHA on contact form | Family-owned small shop. Thin, dealer-promo pages (Amana and AprilAire offers), horizontal scroll at 390px. Service pages 379-492w. Blocked by CAPTCHA, so hand-send only. |
| 4 | 2 | Montefusco HVAC | 137 | 25+ | HubSpot form in iframe, no CAPTCHA seen | HVAC is the lead, but it is multi-trade (fabrication, siding, chimney caps) with "Project Pictures" filler (44-80w pages). Claims "nearly all of Illinois". Weak pages, but not a clean HVAC specialist. |
| 5 | 2 | Lambie Heating & Air | 202 | 25+ | Gravity Forms, no visible CAPTCHA | Polished, large service site (many 500-1300w service pages). Not clearly weak. |
| 6 | 2 | Fritch Heating/Cooling | 396 | 25+ | Contact Form 7, no CAPTCHA | Established, multi-page operation with a page per service. Not clearly weak. |
| 7 | 1 | Standard Heating & Cooling | 56 | 11 | reCAPTCHA (Forminator) | Diversified commercial, design-build and fabrication company, not a small HVAC shop. |

Fit 5 needs all of: small local shop, clearly weak site, plain form, 40+ reviews, material for one service page. No candidate scored 5.

## Picks

1. **thermal** (fit 3). Thermal Services, Inc. (TSI). https://www.tsipeoria.com/ . Site phone tel:3093245317 (listing (309) 699-3333). Place id ChIJSVg4Ir9dCogRQ_1JZJKPeGs. Route: https://www.tsipeoria.com/contact-us , fields First Name*, Last Name*, Phone*, Email*, Service Type (select), Message. No CAPTCHA. Automatable.
2. **griffin** (fit 3). Griffin HVAC. http://www.griffinheatingcooling.com/ . (309) 676-0808. Place id ChIJKbeJYLZZCogRU0RjDWqjaI8. Route: /contact-us, fields First, Last, Email, Phone, Message, plus visible reCAPTCHA. Hand-send list only.
3. **chucks** (fit 3). Chuck's Heating and Cooling. http://www.chuckshvacpeoria.com/ . (309) 453-3195. Place id ChIJrXB4lNG2mEAR-z1HaLPV2kA. Route: /contact-peoria-hvac-professional, fields First, Last, Email, Phone, Message, plus visible reCAPTCHA. Hand-send list only.

Only pick 1 can be sent through its contact form without a CAPTCHA. Picks 2 and 3 go to Josh's hand-send list.
