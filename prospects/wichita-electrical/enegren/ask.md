# Ask: Enegren Electric

## Status
HAND SEND. The form has a message box, but it has a required Address field (and a required Service Type choice) that the FF details cannot fill, and it carries a Cloudflare Turnstile widget. Josh would need to type an address by hand and pass any Turnstile check. No no-solicitation text found.

## Form
- URL: https://enegrenelectric.com/#contact (WPForms form at the bottom of the homepage; the service pages have no form, their "FREE QUOTE" buttons link here)
- iframe host: none seen (Turnstile did not render a frame in my browser; challenge host did not load in this sandbox, per audit.md as well)
- Fields: Name (First, Last), Phone, Email, Address, Service Type (radio: Commercial / Residential), Description of Problem or Need (message box), "Submit" button
- Required fields: all of them (red asterisks on Name, Phone, Email, Address, Service Type, Description). Name, phone (number field), email and description can use the FF details. Address cannot (no FF address on file). Service Type needs a choice.
- CAPTCHA: Cloudflare Turnstile (a 540x65 widget area sits above Submit). Whether it shows a visible checkbox at send time is unverified here.
- Length cap: none (no maxlength)

## Message (paste as is)
Hey Enegren Electric team,

I looked at your website and noticed two things: your electrical service pages show no phone number and no way to request service, and the form on your homepage says "we will be touch" instead of "we will be in touch." Your 93 Google reviews at 5 stars are strong, so the site should make it easy for new customers to reach you.

We build websites for service businesses. If you'd like, we'll make you a free mockup of your homepage that fixes both. Want me to send you one? :)

Josh, Fluid Frame Marketing

P.S. If you were on our website system, you wouldn't even be seeing this message. We flag every solicitation, so they never get through.

## Short message
Not needed. No length cap on the form.

## Checks
Date checked: 2026-11-17.
- Problem 1, service pages have no phone number or request form. Seen at https://enegrenelectric.com/residential-electrician-wichita-ks/ and https://enegrenelectric.com/commercial-electrician-wichita-ks/ on desktop and (residential) on the phone viewport: no phone number in the page text, no tel: link, no form or message box. The only action is a "FREE QUOTE" button that sends visitors to the homepage form. Screenshots: `desktop-residential-page.png`, `phone-residential-page.png`.
- Problem 2, typo on the homepage form. Seen at https://enegrenelectric.com/#contact on desktop: next to the form it reads "Tell us about your electrical project, and we will be touch." Screenshot: `desktop-home-quote-form.png`.
- Not used: the hero at the top of the homepage looks empty (the main headline and quote button are set to hidden in the page code, `desktop-home.png` shows a dark empty banner with a loading dot), but I could not rule out that this is a slow image or video in my browser, so I left it out. Also not used: the Gallery page shows WordPress leftovers (empty "Recent Comments", "Log in" link): `desktop-gallery-wordpress-leftovers.png`, `phone-gallery-wordpress-leftovers.png`. That page is not in the menu.
- Tie-in source: reviews.json, Google rating 5, 93 reviews.
- No-solicitation text: none found. Form not submitted.
