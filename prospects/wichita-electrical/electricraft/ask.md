# Ask: ElectriCraft

## Status
READY. Real form with a message box. Only an invisible reCAPTCHA badge (no visible challenge). No no-solicitation text found. Note: audit.md (2026-11-13) says Josh's rules treat any CAPTCHA as a hand send; this one is invisible (size=invisible, nothing to click), so I marked it READY per the ask template (visible CAPTCHA only). Josh can downgrade to HAND SEND if he wants invisible ones excluded.

## Form
- URL: https://www.electricraftks.com/contact (the same form is also on the homepage)
- iframe host: none for the form (Google reCAPTCHA iframe is invisible)
- Fields: First Name, Last Name, Phone, Email, Message, "Submit" button
- Required fields: none marked. All fillable with the FF details (first Josh, last Lenz).
- CAPTCHA: invisible Google reCAPTCHA (badge only)
- Length cap: none (no maxlength)

## Message (paste as is)
Hey ElectriCraft team,

I looked at your website and noticed two things: on a phone, your menu runs off the edge of the screen, and the site says you're available 24/7 for emergencies while the hours say closed Saturday and Sunday. Your 63 Google reviews at 5 stars are a big selling point, so the site should be as clear as your reviews.

We build websites for service businesses. If you'd like, we'll make you a free mockup of your homepage that fixes both. Want me to send you one?

Josh, Fluid Frame Marketing

P.S. If you were on our website system, you wouldn't even be seeing this message. We flag every solicitation, so they never get through. :)

## Short message
Not needed. No length cap on the form.

## Checks
Date checked: 2026-11-17.
- Problem 1, menu runs off the phone screen. Seen at https://www.electricraftks.com/ on the phone viewport (390x844): the page is 768 px wide in a 390 px screen and scrolls sideways by 378 px. The menu is cut off ("COMME..." at the right edge). Screenshots: `phone-home-cut-off.png`, `phone-home-scrolled-sideways.png`. Desktop has no sideways scroll: `desktop-home.png`.
- Problem 2, 24/7 claim versus posted hours. Seen at https://www.electricraftks.com/residential on the desktop viewport (1440x900): the FAQ says "24/7 Emergency Services: We are available around the clock for any electrical emergencies." The footer hours on the same page say Mon - Fri 7:00 am - 5:00 pm, Sat - Sun Closed. (A second sentence further down hedges: "may be available around the clock.") Screenshots: `desktop-residential-247-claim.png`, `desktop-residential-hours.png`.
- Tie-in source: reviews.json, Google rating 5, 63 reviews.
- Left out on purpose: the site still shows a first-person statement from the owner who passed away in March 2025 (/about-the-owner). True, but too sensitive for a cold message. Greeting uses "ElectriCraft", the name the site uses (the site logo reads "ElectriCraft, Inc." and "It's Electric").
- Form: `desktop-contact.png`, `phone-contact.png`. Not submitted.
