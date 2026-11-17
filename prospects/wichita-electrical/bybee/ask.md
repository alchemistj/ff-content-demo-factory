# Ask: Bybee Electric

## Status
READY. Real form with a message box. Only an invisible reCAPTCHA badge (no visible challenge). No no-solicitation text found.

## Form
- URL: https://www.bybeeelectric.com/contact (there is also a longer form at https://www.bybeeelectric.com/request-estimate-form with service dropdowns and a privacy checkbox; use /contact)
- iframe host: none for the form (Google reCAPTCHA iframe is invisible)
- Fields: Name*, Email*, Phone*, message box, "Send Message" button
- Required fields: Name, Email, Phone (asterisks on the labels; the page code has no required attribute so they may not be enforced). All fillable with the FF details.
- CAPTCHA: invisible Google reCAPTCHA (badge only, size=invisible)
- Length cap: none (no maxlength)

## Message (paste as is)
Hey Bybee Electric team,

I looked at your website and noticed two things: your Reviews page shows only 2 ratings, and the top of every page says you serve "the State of Kansas" instead of Wichita. You have 101 Google reviews at 4.7 stars, so your site is hiding your best selling point.

We build websites for service businesses. If you'd like, we'll make you a free mockup of your homepage that fixes both. Want me to send you one?

Josh, Fluid Frame Marketing

P.S. If you were on our website system, you wouldn't even be seeing this message. We flag every solicitation, so they never get through. :)

## Short message
Not needed. No length cap on the form.

## Checks
Date checked: 2026-11-17.
- Problem 1, Reviews page shows only 2 ratings. Seen at https://www.bybeeelectric.com/reviews on the desktop viewport (1440x900): "(5.0) Overall Rating" and "All (5.0 / 2 Ratings)", with the individual reviews listed below. Screenshot: `desktop-reviews-page.png`. Also noted: the yellow "Write a Review" buttons link to hibu.us/ez4gc?ac=widget (a Hibu survey, not Google), seen in the page code on the homepage.
- Problem 2, "Serving the State of Kansas". Seen at https://www.bybeeelectric.com/ (and /reviews) on the desktop viewport: the top-left header says "Serving the / State of Kansas". The page's headline and title do say Wichita. Screenshots: `desktop-home-write-a-review-button.png` (also shows the header), `desktop-reviews-page.png`. Phone viewport: `phone-home-top.png`.
- Tie-in source: reviews.json, Google rating 4.7, 101 reviews.
- Form: `desktop-contact.png`, `phone-contact.png`. Not submitted.
- No-solicitation text: none found on the homepage, contact or estimate pages.
