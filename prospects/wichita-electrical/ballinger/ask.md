# Ask: Ballinger Electric

## Status
READY. Real form with a message box. No visible CAPTCHA (an invisible Google reCAPTCHA badge loads on the contact page; no challenge shown). No no-solicitation text found.

## Form
- URL: https://www.ballingerelectric.com/contact (same Duda form is also on the homepage and every service page)
- iframe host: none (the form is in the page; the only iframes are Google Maps and the invisible reCAPTCHA)
- Fields: Type of Service (dropdown: Residential / Commercial / Other), Name, Email, Phone, message box
- Required fields: none marked (no asterisks, no required attribute). All four text fields can be filled with the FF details (Josh Lenz, josh@fluidframemarketing.com, 417-373-2773). Pick "Other" in the dropdown. The company name has no field, so it goes in the sign-off.
- CAPTCHA: invisible reCAPTCHA v2 (badge bottom right, size=invisible). Nothing for a person to click.
- Length cap: none (no maxlength on any field)

## Message (paste as is)
Hey Ballinger Electric team,

I looked at your website and noticed two things: on a phone, your page is wider than the screen, so the menu and headline get cut off, and your phone number is plain text, not a button people can tap to call. Your 158 Google reviews at 5 stars are great, so the site should make it easy for people to reach you.

We build websites for service businesses. If you'd like, we'll make you a free mockup of your homepage that fixes both. Want me to send you one? :)

Josh, Fluid Frame Marketing

P.S. If you were on our website system, you wouldn't even be seeing this message. We flag every solicitation, so they never get through.

## Short message
Not needed. No length cap on the form.

## Checks
Date checked: 2026-11-17.
- Problem 1, page wider than a phone screen. Seen at https://www.ballingerelectric.com/ on the phone viewport (390x844): the page is 768 px wide inside a 390 px screen and scrolls sideways by 378 px. The menu runs off the right edge ("ELECTRICAL UPGR..." is cut) and the headline reads "Wich / Trus / Electri". Screenshots: `phone-home.png` (as first shown), `phone-home-scrolled-sideways.png` (after scrolling right). The desktop viewport (1440 px) has no sideways scroll: `desktop-home.png`.
- Problem 2, phone number is not a tap-to-call button. Seen at https://www.ballingerelectric.com/ on phone and desktop: "(316) 213-4513" in the "Call Us Today!" block is plain text, not inside a link (checked in the page code). The only tel: link on the page has zero size, so it is never shown. Screenshot: `phone-home-call-block.png` (number shown as plain text, cut off at the right edge).
- Tie-in source: reviews.json, Google rating 5, 158 reviews.
- Form: `desktop-contact.png`, `phone-contact.png`. Not submitted.
- No-solicitation text: none on the homepage or contact page.
