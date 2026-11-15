# Qualify: Affordable Roofing (Fort Wayne, IN)

- **Site:** https://affordableroofingfw.com/ (redirects to https://www.affordableroofingfw.com/)
- **Phone:** (260) 402-3549 (matches the site). The site also shows a second number, (260) 299-7663 ("(260) 299-ROOF").
- **Google (from `reviews.json`):** 4.9 stars, 112 reviews. Address on the Google record: 226A E Collins Rd Suite 1, Fort Wayne, IN 46825. Place ID `ChIJSTESmw3jFYgRf8IpFgfDxt4`.
- **Contact route:** https://www.affordableroofingfw.com/free-estimate. Cloudflare Turnstile widget is present in the page (see audit.md). Not submitted.

## Fit: not a demo under the weak-site rule

- Roofing-only, family-owned since 2012, with a real street address. The contact form is a long one (eight required fields) with a Turnstile widget.
- **The site is not weak.** Its service pages carry city H1s ("Roof Replacement in Fort Wayne, Indiana", "Asphalt Shingle Roofing in Fort Wayne", "Metal Roofing in Fort Wayne", "Gutter Replacement in Fort Wayne"). A projects page with 93 photos and a blog of several long posts (up to 2,534 words). The rule says skip when most services already have that page.
- The earlier QUALIFY pass scored it fit 3 on the form and page length. It did not apply the service-page rule.
- **Decision for Josh:** skip. The form is also the only one of the three with a CAPTCHA-type widget, so a hand-send would be needed even if it were a fit. Nothing has been sent.
