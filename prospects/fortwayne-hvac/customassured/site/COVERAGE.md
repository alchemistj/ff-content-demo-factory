# Coverage check: customassured.com

Checked 2026-11-16 with headless Chromium (Playwright), desktop 1440 px. Mobile menu items taken from `audit.md` (390 px run on 2026-11-15).

## Verdict: COMPLETE

Every internal page the live site links to, or lists in its sitemap, is in `site/`. One page (`/cart`) was missing from the crawl because `scripts/fetch-site-text.mjs` skips `cart` URLs; it was saved by hand as `site/cart.md` (HTTP 200, 11 words). `site/INDEX.md` does not list it yet.

## Main menu (header, live)
| Menu item | URL | In `site/`? |
|---|---|---|
| Our Company | https://customassured.com/our-company-1 | yes, `our-company-1.md` |
| Our Services | https://customassured.com/our-services | yes, `our-services.md` |
| Financing | https://customassured.com/financing | yes, `financing.md` |
| Contact | https://customassured.com/contact | yes, `contact.md` |
| PAY BILL | https://customassured.com/bill-pay | yes, `bill-pay.md` |
| Logo (home) | https://customassured.com/ | yes, `home.md` |
| Cart icon (shows "0") | https://customassured.com/cart | yes, `cart.md` (saved by hand) |
| Email (mailto, header) | mailto:julie@customassured.com | not a page |
| Facebook icon | http://facebook.com/customassuredmechanical | external, not read |

Dropdowns: none. Two dropdown-like elements exist in the header markup, but they have no child links in the DOM.

## Mobile menu (from `audit.md`, 390 px)
- Our Services, Contact Us, Privacy Policy, logo: all covered above.
- LEAVE US A REVIEW: Google search URL (external, not read).
- Our Company, Financing and PAY BILL did not show in the open mobile menu in the audit run. All three are covered on desktop and by the sitemap.

## Footer (live)
| Item | URL | In `site/`? |
|---|---|---|
| Privacy Policy & Terms of Use | https://customassured.com/privacy-policy-terms-of-service | yes, `privacy-policy-terms-of-service.md` |

The footer repeats the email and Facebook links from the header.

## Homepage buttons and links
| Item | Target | In `site/`? |
|---|---|---|
| Contact Us | https://customassured.com/contact | yes |
| LEAVE US A REVIEW | Google search for the business (external) | external, not read |

## Sitemap
`/sitemap.xml` returns 200 with 7 URLs. `/sitemap_index.xml` returns 404.

| Sitemap URL | In `site/`? |
|---|---|
| https://customassured.com/home | yes, `home.md` (same page as `/`) |
| https://customassured.com/financing | yes |
| https://customassured.com/contact | yes |
| https://customassured.com/our-services | yes |
| https://customassured.com/our-company-1 | yes |
| https://customassured.com/bill-pay | yes |
| https://customassured.com/privacy-policy-terms-of-service | yes |

## Summary
- Internal pages found: 8 (7 from the sitemap plus `/cart`). All 8 are in `site/`.
- Pages missing before this check: 1 (`/cart`). Now saved.
- Blocked, login, or error pages: none.

## Not read (outside the site's own text)
- "Make a Payment" on `/bill-pay`: the destination was not clicked, so the payment provider's page is unread. This is a third-party payment step, not site copy.
- Google reviews and Google Business profile: read from `reviews.json` only.
- Facebook page and "LEAVE US A REVIEW" target: not opened.
- Mobile menu on a real phone: not tested (emulated only).
