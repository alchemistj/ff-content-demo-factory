# Current-site audit: Sandhill Roofing

Run date: 2026-11-15. Playwright Chromium, 1440x900 and 390x844. Read-only: no form submitted, nothing typed into any field, no email sent.
Site: https://sandhillroofing.com/ (redirects from http://www.sandhillroofing.com/). Platform footer links to thryv.com terms and privacy (https://sandhillroofing.com/).
Screenshots: `audit/` in this folder.

## Contact form (the one the brief asked for)

- **URL:** https://contact.sandhillroofing.com/ (canonical). Linked from "Contact Us" on the homepage (https://sandhillroofing.com/). The quote form is a second form at https://quote.sandhillroofing.com/.
- **Iframe:** none. The form is in the page HTML. Form action is blank.
- **Fields, in order, with required flags** (from the page HTML):
  1. First Name, text, required, maxlength 256
  2. Last Name, text, required, maxlength 256
  3. Email, email, required, maxlength 128
  4. Street Address, text, required, maxlength 256
  5. Phone Number, tel, required, maxlength 28
  6. Message, textarea, required, no maxlength
  7. Upload File (optional), file input, not required
  8. "I'm not a robot" checkbox, required, shown as a visible label
  9. Subject, text, hidden and disabled (looks like a spam trap; not for the visitor)
  - Submit button: "Send Message".
- **CAPTCHA / bot check:** yes, but not a third-party widget. The "I'm not a robot" checkbox is a required native checkbox. No reCAPTCHA, hCaptcha or Turnstile script, iframe or badge found in the HTML. Per the rules, treat it as a bot check: hand-send, do not get past it.
- **Quote form** (https://quote.sandhillroofing.com/): First Name, Last Name, Phone Number, Email Address, Address (all required); "What Job Needs To Be Done" select (required; options: Roofing, Storm Damage, Siding, Gutters, Windows And Doors); Message (required); Upload File (optional); the same "I'm not a robot" required checkbox; a hidden link-url field.

## What works

- **Top menu:** Home, Services, Request a Quote, Contact Us. Each one opens its page at both widths (200). "Services" is a button that opens a dropdown of anchors to https://services.sandhillroofing.com/#roofing, #storm-damage, #siding, #gutters, #windows-doors. Those anchors work (the page loads, sections are present).
- **Homepage "Contact Us Today!"** goes to https://contact.sandhillroofing.com/ (200).
- **Phone:** (402) 890-6460 is the same everywhere on the site. On phones (390 px), the header phone icon is a tel link (`tel:+14028906460`), and the services page phone is a visible tel link at both widths. On the homepage and contact page at 1440 px, the number is plain text, not a link.
- **Email:** info@sandhillroofing.com, shown as text. No mailto link found on any page crawled.
- **Layout at phone width:** no horizontal scroll on the homepage, contact, services or quote pages (scrollWidth 390 at 390 px).
- **Broken images:** none found.
- **Placeholder text, lorem, example.com:** none found.
- **Copyright:** a "protected by copyright laws" line with no year. No "©" year to be old.

## What's broken or weak, most costly first

### 1. The site is one homepage plus subdomains
- The homepage is 362 words (https://sandhillroofing.com/). The five services live on a different host (services.sandhillroofing.com) as sections of one page, with no per-service URL.
- Cost: nothing ranks by service and city. There is no page for "roof replacement in Lincoln" to find.

### 2. No H1 on the homepage, contact or quote pages; the services page's H1 is the phone number
- Homepage: no H1 in the DOM. The first heading is an H2 ("Lifetime Workmanship Warranty on Roofing, Siding, Gutters").
- Contact and quote pages: no H1 found.
- Services page (https://services.sandhillroofing.com/): six H1s. Five are the phone number "(402) 890-6460" (one per service section); the sixth is "Quality Brand Options".
- Title tags are fine: "Roofing Contractor | Lincoln, NE | Sandhill Roofing" (home); "Services | Roofing Contractor | Lincoln, NE | Sandhill Roofing"; "Contact Us | Roofing Contractor | Lincoln, NE | Sandhill Roofing"; "Get a Quote | ..." (quote).

### 3. Repeated copy on the services page
- "When To Replace Your Roof" heading appears three times, and its paragraph and bullet list appear twice (https://services.sandhillroofing.com/).
- "Types of Roofs We Install" paragraph is also duplicated under the sections.

### 4. The contact form asks for a street address and has a bot-check checkbox
- Street Address is required on the contact form, and the quote form also requires Address.
- The bot-check checkbox means a plain form submit is blocked by design. Hand-send list per the rules.

### 5. No reviews, testimonials or owner photo on the site
- No testimonial text on any page crawled. The owner is named once, in the About paragraph: "Dusty Rieck, owner of Sandhill Roofing" (https://sandhillroofing.com/).
- "Trusted Brands and Partners" heading has no brand names in the text (logos not checked).

### 6. Phone is not a link on desktop home or contact
- At 1440 px the homepage and contact page show "(402) 890-6460" as text only. At 390 px the header has a tel icon.
- Cost is small on mobile (most traffic) and real on desktop.

### 7. Blank area under the hero at phone width
- The homepage at 390 px shows an empty band under "Serving Eastern Nebraska" in the screenshot. Likely lazy-loaded images; not confirmed (see audit/home-390x844.png).
- Hours are consistent on the homepage and contact page, so no conflict to report: Mon-Fri 7:00 am-6:00 pm, Sat 7:00 am-12:00 pm, Sun closed.

## Not checked (and why)

- **Form submission:** not submitted, per the brief. Whether the form sends is unknown.
- **Checkbox:** not checked, not clicked.
- **External links:** Facebook, X, Instagram, Google Maps, HomeAdvisor and Thryv terms were not opened.
- **Google listing and BBB:** not pulled (QUALIFY method). Rating not recorded.
- **Speed:** no PageSpeed or Lighthouse score recorded.
- **Phone dialing on a device:** no device; tel link checked as an href only.
