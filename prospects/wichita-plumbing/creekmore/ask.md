# Ask: Creekmore Plumbing

## Status
READY, with a warning. The form has a message box, only Email is marked required, and there is no visible CAPTCHA (just the small "protected by reCAPTCHA" text, badge hidden). No no-solicitation text found. Warnings: (1) the form is a pop-up that opens from the "GET A FREE QUOTE!" button at the bottom of the homepage, not an always-visible form; (2) the site returned errors ("502", "upstream request failed") on about half of my page loads today, so retry if the page fails; (3) it also has an optional file upload.

## Form
- URL: https://creekmoreplumbing.com/ (homepage, "Get a Free Quote!" pop-up near the bottom; no separate contact page)
- iframe host: none (GoDaddy Website Builder form, in the page)
- Fields: Name, Email*, Phone, Address (Street, City, Zip Code), message box (placeholder "Let us know the details of what you are looking for, and we'll contact you with a quote."), Attach Files (optional), "SEND" and "Cancel"
- Required fields: Email* only (asterisk; no required attribute in the code). All fillable with the FF details. Address can be left blank.
- CAPTCHA: Google reCAPTCHA, invisible (text "This site is protected by reCAPTCHA..." and the badge is hidden by the site's CSS). Nothing to click as far as I can see.
- Length cap: none (no maxlength)

## Message (paste as is)
Hey Creekmore Plumbing team,

I looked at your website and noticed two things: all your services (water heaters, toilets, backflow testing and more) sit on one long page with no page of their own, and the bottom of the site still says "Copyright 2025." Your 56 Google reviews at 4.7 stars are strong, so the site should show off each thing you do.

We build websites for service businesses. If you'd like, we'll make you a free mockup of your homepage that fixes both. Want me to send you one?

Josh, Fluid Frame Marketing

P.S. If you were on our website system, you wouldn't even be seeing this message. We flag every solicitation, so they never get through. :)

## Short message
Not needed. No length cap on the form.

## Checks
Date checked: 2026-11-17.
- Problem 1, no pages for individual services. Seen at https://creekmoreplumbing.com/ on desktop: the only links in the menu and page are Home and Gallery. Water heaters, toilets, backflow testing and the other services are all text sections on the homepage. Screenshots: `desktop-home.png`, `desktop-home-top.png`.
- Problem 2, copyright year. Seen at https://creekmoreplumbing.com/ on desktop: footer reads "COPYRIGHT © 2025 CREEKMORE PLUMBING - ALL RIGHTS RESERVED." Today is 2026-11-17. The same line is on /gallery. Screenshot: `desktop-home-footer-copyright.png`.
- Dropped from audit.md: "empty customer reviews section." It is not empty. A Google reviews widget (4.7, 56 reviews) loads under "See What Our Customers Are Saying" on desktop and phone: `desktop-home-customers-saying.png`, `phone-home-customers-saying.png`. The empty-looking screenshot in the earlier audit was a slow load.
- Tie-in source: reviews.json, Google rating 4.7, 56 reviews.
- Form: `desktop-home-quote-form-open.png` is the page before the pop-up (the pop-up screenshot step did not capture it; the form fields were read from the page code). Not submitted.
- Phone view: `phone-home-top.png` (phone number and email repeated twice at the top, cookie banner over the bottom of the first screen; not used as a problem).
