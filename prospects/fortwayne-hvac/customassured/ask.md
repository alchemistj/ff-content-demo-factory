# Ask: Custom Assured Mechanical

## Status
READY

## Form
- URL: https://customassured.com/contact (Squarespace-style page, form is on the page, no iframe host)
- Fields: First Name, Last Name, Email, "Sign up for news and updates" checkbox (leave unchecked), Subject, Message (textarea), plus one extra unlabeled text input (probably a trap field, leave empty).
- Required (label text says "(required)"; the HTML required attribute is not set): First Name, Last Name, Email, Subject, Message. All fillable: Josh Lenz (split into First Josh / Last Lenz), josh@fluidframemarketing.com. Subject suggestion: "A free homepage mockup for Custom Assured Mechanical". No phone field.
- CAPTCHA: invisible reCAPTCHA Enterprise (iframe present, badge hidden, no visible challenge). If a challenge ever appears it is a hand send.
- Length cap: none (no maxlength on any field).
- Form method is GET, so a submit puts the text in the URL. Check the dry run before any real send.
- Solicitation text: No text about solicitations or sales calls found on the home or contact page (searched the page text for 'solicit').

## Message (paste as is)
Hey Custom Assured Mechanical team,

I looked at your website and noticed two things: your homepage doesn't show a phone number, and nothing on the site can be tapped to call on a phone, and the video on your homepage shows an error message instead of playing. Your Google reviews are strong (5.0 stars from 90 reviews), so the site should be working as hard as your customers are.

We build websites for service businesses. If you'd like, we'll make you a free mockup of your homepage that fixes both. Want me to send you one?

Josh, Fluid Frame Marketing

P.S. If you were on our website system, you wouldn't even be seeing this message. We flag every solicitation, so they never get through. :)

## Short message
Not needed. No length cap on the message box.

## Checks
Date checked: 2026-11-17. Screenshots are in ask-evidence/ (desktop 1440x900, phone 390x844, scale 1).

1. Phone number missing from homepage and not tappable
   - URL: https://customassured.com/ (home) and https://customassured.com/contact
   - Viewport: phone (390x844) and desktop (1440x900)
   - Saw: The homepage text has no phone number at all. The number (260) 496-8400 shows only as plain text on /contact. There are 0 tap-to-call (tel:) links on the home or contact page at either size.
   - Screenshot: home-mobile.png, home-desktop.png, contact-mobile.png, contact-desktop.png
2. Homepage video shows an error
   - URL: https://customassured.com/
   - Viewport: phone (390x844); also present in the desktop page text
   - Saw: Under Our Services the video block reads: "Video is not available or format is not supported. Try a different browser."
   - Screenshot: home-mobile-video.png

Nothing was submitted or typed into any form.
