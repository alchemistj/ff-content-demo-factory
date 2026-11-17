# Ask: Cool Concepts

## Status
READY

## Form
- URL: https://coolconceptsne.com/contact/ (Gravity Forms, on the page, no iframe host for the form; reCAPTCHA iframe and a Google Maps iframe are on the page)
- Fields: First, Last, Email*, Phone*, "How did you find us?*" (dropdown: Referral or Friend / Online Search / Facebook / Other), "Other*" (text, appears only when Other is chosen), Message*.
- Required (asterisk): Email, Phone, How did you find us, Message. First and Last are not starred but fill them. All fillable: Josh / Lenz, josh@fluidframemarketing.com, 417-373-2773. The dropdown must be set: choose "Other" and type "Website outreach" (honest answer, not a customer referral).
- CAPTCHA: invisible reCAPTCHA (iframe size=invisible, badge bottom right, no visible challenge). If a challenge appears it is a hand send.
- Length cap: none.
- Solicitation text: No text about solicitations or sales calls found on the home or contact page (searched the page text for 'solicit').

## Message (paste as is)
Hey Cool Concepts team,

I looked at your website and noticed two things: the Request An Estimate button on your contact page leads to a page that doesn't exist, and the video on your homepage shows an error message instead of playing. Your Google reviews are strong (5.0 stars), so your site should make it easy for those customers' neighbors to reach you.

We build websites for service businesses. If you'd like, we'll make you a free mockup of your homepage that fixes both. Want me to send you one? :)

Josh, Fluid Frame Marketing

P.S. If you were on our website system, you wouldn't even be seeing this message. We flag every solicitation, so they never get through.

## Short message
Not needed. No length cap on the message box.

## Checks
Date checked: 2026-11-17. Screenshots are in ask-evidence/ (desktop 1440x900, phone 390x844, scale 1).

1. Request An Estimate button goes to a missing page
   - URL: https://coolconceptsne.com/contact/ (button in the top banner)
   - Viewport: desktop (1440x900)
   - Saw: The button links to https://coolconceptsne.com/request-an-estimate/, which returned 404 (page not found) when fetched in the browser today.
   - Screenshot: contact-desktop.png (button visible in the banner); audit/broken-link_request_an_estimate_-1440x900.png (the 404 page, from the 11/15 audit)
2. Homepage video shows an error
   - URL: https://coolconceptsne.com/
   - Viewport: desktop (1440x900) and phone (390x844)
   - Saw: The player area reads: "Media error: Format(s) not supported or source(s) not found".
   - Screenshot: home-desktop-video.png, home-mobile-video.png

Nothing was submitted or typed into any form.
