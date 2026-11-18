# Ask: Plumb Crazy

## Status
READY. Real form with a message box, no CAPTCHA (only a hidden spam-trap field that people never see), no no-solicitation text found.

## Form
- URL: https://www.plumbcrazykansas.com/contact-us/ (the same form is also on the homepage and every service page)
- iframe host: none (WordPress/Jetpack form in the page)
- Fields: Name, Email, Phone Number, Required Services (this is the message box), submit button
- Required fields: Name, Email, Required Services (marked "(required)"). Phone is optional. All fillable with the FF details. The company name has no field.
- CAPTCHA: none. A hidden honeypot box ("ak_hp_textarea", maxlength 100) exists, but it is invisible and must stay empty.
- Length cap: none on the visible fields

## Message (paste as is)
Hey Plumb Crazy team,

I looked at your website and noticed two things: your menu says "SERVER SERVICE" where it should say "Sewer Service," and none of your pages show a single customer review. You have 75 Google reviews at 4.7 stars, so your site is hiding your best selling point.

We build websites for service businesses. If you'd like, we'll make you a free mockup of your homepage that fixes both. Want me to send you one?

Josh, Fluid Frame Marketing

P.S. On one of our websites, this message never would have reached you. We filter out solicitations, including ours.

## Short message
Not needed. No length cap on the form.

## Checks
Date checked: 2026-11-17.
- Problem 1, menu typo. Seen at https://www.plumbcrazykansas.com/ and every other page, desktop viewport (1440x900): the top menu reads HOME, CONTACT US, DRAIN CLEANING, WATER SERVICE, SERVER SERVICE, PLUMBING SERVICES, STORIES & UPDATES. The "SERVER SERVICE" item holds the sewer pages (Sewer Cleaning, Sewer Replacement). Screenshots: `desktop-home-menu.png`, `desktop-drain-cleaning-images.png` (menu at the top), `phone-home.png`.
- Problem 2, no customer reviews on the site. Checked the page text of the homepage, /drain-cleaning/, /plumbing-services/, /sewer-cleaning/, /sewer-replacement/, /water-service-repair/, /water-service-replacement/ and /contact-us/: no mention of reviews, testimonials or stars on any of them. Screenshot of the homepage: `desktop-home.png`.
- Tie-in source: reviews.json, Google rating 4.7, 75 reviews.
- Not used: service-page photos hotlinked from Wikipedia show as broken images in my browser (`desktop-drain-cleaning-images.png`), but my network proxy may be blocking that host, so I left it out. Footer reads "Copyright ©2026 Copyright 2022, Plumb Crazy Kansas, LLC."
- Form: `desktop-contact-us.png`, `phone-contact-us.png`. Not submitted.
