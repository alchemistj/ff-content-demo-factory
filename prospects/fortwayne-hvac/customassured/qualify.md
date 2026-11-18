# Qualify: Custom Assured Mechanical (Fort Wayne, IN)

- **Google (from `reviews.json`, pulled 2026-11-15):** 5.0 stars, 90 reviews. Place ID `ChIJDfU04u_jFYgRiIrcEKLjd8U`. Address 2630 Independence Dr, Fort Wayne, IN 46808 (matches the site). Phone (260) 496-8400.
- **Site:** https://customassured.com/home (also served at /). Nine URLs crawled, eight distinct pages (`/` and `/home` are the same page).
- **Kind:** small specialist, family-owned, with a thin site. The 5-page demo applies.

## Fit
- Family-owned HVAC shop since 1998, run by owner Rod Schaefer and his wife Kim (site, Our Company and Financing pages). Bryant dealer per the site.
- Site is thin: the Our Services page is 471 words of generic copy, and the homepage has a broken video block. Four pages have no H1.
- Reviews are strong (65 of 66 pulled reviews have an owner reply; the pull has one 4-star review and 65 at 5 stars).

## Contact route
- Contact form at https://customassured.com/contact. Form method is GET. An invisible reCAPTCHA Enterprise is on the page. Expect a hand-send under the contact-form-only rule. Details in `audit.md`.

## Corrections to `prospects/fortwayne-hvac/QUALIFY.md`
- QUALIFY says "no CAPTCHA". The Contact page loads an invisible reCAPTCHA Enterprise iframe (site key present, size=invisible). The form is still a real form, but the CAPTCHA is a reason to hand-send.
- QUALIFY says "10 pages". Nine URLs were crawled; eight distinct pages.
