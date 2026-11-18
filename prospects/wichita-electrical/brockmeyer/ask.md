# Ask: Brockmeyer Inc.

## Status
READY. Real form with a message box. No CAPTCHA widget rendered on any page loaded. No no-solicitation text found. One caveat: audit.md (2026-11-13) saw a Duda "require captcha" flag in the form markup. I did not see it on the visible form today and nothing rendered, but whether a CAPTCHA appears at send time is unverified (not submitted).

## Form
- URL: https://www.brockmeyerinc.com/contact-us (same form also on the homepage, /residential-electrician, /commercial-electrician and /blog)
- iframe host: none
- Fields: Name, Email, Phone, Service (dropdown: Residential Electrician / Commercial Electrician), "How may we help you?" message box, "Submit Your Information" button
- Required fields: none (no required attribute, no asterisks). All can be filled with the FF details. Pick "Commercial Electrician" or "Residential Electrician" in the dropdown (either is fine). The company name has no field.
- CAPTCHA: none visible
- Length cap: none (no maxlength)

## Message (paste as is)
Hey Brockmeyer Inc. team,

I looked at your website and noticed two things: your pages scroll sideways on a phone, and your "Watt Our Customers Are Saying!" section has a heading but no reviews under it. Your 4.8 stars on Google are strong, so your site is hiding your best selling point.

We build websites for service businesses. If you'd like, we'll make you a free mockup of your homepage that fixes both. Want me to send you one?

Josh, Fluid Frame Marketing

P.S. On one of our websites, this message never would have reached you. We filter out solicitations, including ours.

## Short message
Not needed. No length cap on the form.

## Checks
Date checked: 2026-11-17. Re-checked 2026-11-18 7:05 Central: sideways scroll still 378 px; the reviews section is still empty, but the "Free Google Reviews Widget" link is gone, so the sentence now says heading with no reviews.
- Problem 1, sideways scroll on a phone. Seen at https://www.brockmeyerinc.com/ and https://www.brockmeyerinc.com/contact-us on the phone viewport (390x844): the page is 768 px wide inside a 390 px screen, so it scrolls sideways by 378 px. The big headline also breaks mid-word ("Dazzli / ng"). Screenshots: `phone-home.png`, `phone-home-scrolled-sideways.png`. Desktop (1440 px) does not scroll sideways: `desktop-home.png`.
- Problem 2, empty customer-reviews section. Seen at https://www.brockmeyerinc.com/ on the desktop viewport (1440x900), after a full scroll and an 8 second wait: under the heading "Watt Our Customers Are Saying!" the only content is a small link reading "Free Google Reviews Widget". No review text, no images, no iframe. Same on the phone viewport (the section text is only the heading, checked in the page text). Screenshot: `desktop-home-reviews-section.png`. (No clean phone screenshot of this section: scrolling to it on the phone view landed off target, so the phone result is from page text only.)
- Tie-in source: reviews.json, Google rating 4.8, 24 reviews.
- Form: `desktop-contact-form.png`. Not submitted.
- No-solicitation text: none found.
