# Current-site audit: Cool Concepts

Site: https://coolconceptsne.com/ | Run 2026-11-15 | Playwright Chromium at 1440×900 and 390×844. WordPress site, forms built with Gravity Forms (field names `input_1.3`, `input_2`, and so on).
Screenshots: `audit/` in this folder (one 1440 and one 390 render per page, plus the contact and quote forms and the broken-link capture).
Nothing was submitted, typed into or sent.

## Scope and method
- Crawled 16 URLs: 14 HTML pages, the uploaded MP4 (a download link) and the RSS feed. Pages: /, /about-us/, /repair-service/, /replacement/, /case-studies/, /whats-new/, /video-library/, /contact/, /faqs/, /request-a-quote/, /privacy-policy/, /project/petersen-home/, /winter-efficiency-check/, /category/uncategorized/.
- Checked (HTTP status, not clicked): all 30 internal links found in the menu, body and footer.
- Not checked: mobile menu opened on a phone; page speed; external links (Facebook, X, Google Maps); the Daikin locator.

## Contact forms (outreach targets)

### A. /contact/ (visible form; QUALIFY.md said to verify)
- **URL:** https://coolconceptsne.com/contact/ | Form action: `/contact/` (POST, same page).
- **Visible:** yes at 1440 and 390 px. Screenshots: `audit/form-contact-1440x900-1.png`, `audit/form-contact-390x844-1.png`.
- **Fields, in order:**
  1. First (text, `input_1.3`)
  2. Last (text, `input_1.6`)
  3. Email* (email, `input_2`), label has an asterisk
  4. Phone* (tel, `input_3`), label has an asterisk
  5. How did you find us?* (select: --Select--, Referral or Friend, Online Search (Google, Bing, etc.), Facebook, Other), `input_5`
  6. Other* (text, `input_6`). **Hidden** until "Other" is picked.
  7. Message* (textarea, `input_4`)
  - Submit: "Submit".
- **Required attribute:** not set on any field. The asterisk is the only marker.
- **maxlength:** none.
- **CAPTCHA:** invisible reCAPTCHA (iframe with `size=invisible`, `badge=bottomright`). No visible challenge in the render. Hidden `g-recaptcha-response` textarea present.
- **iframes:** the reCAPTCHA iframe; a Google Maps embed (`maps/embed`) for the office location; one iframe with no `src`.

### B. /request-a-quote/
- **URL:** https://coolconceptsne.com/request-a-quote/ | Form action: `/request-a-quote/` (POST).
- **Visible:** yes at 1440 and 390 px. Screenshots: `audit/form-request_a_quote-1440x900-1.png`, `audit/form-request_a_quote-390x844-1.png`.
- **Fields, in order:**
  1. First (text, `input_1.3`)
  2. Last (text, `input_1.6`)
  3. Phone* (tel, `input_2`), label has an asterisk
  4. Street Address (text, `input_3.1`)
  5. Address Line 2 (text, `input_3.2`)
  6. City (text, `input_3.3`)
  7. State / Province / Region (text, `input_3.4`)
  8. ZIP / Postal Code (text, `input_3.5`)
  9. Country (select, full country list, blank default, `input_3.6`)
  10. Subject* (text, `input_4`)
  11. How Did You Find Us?* (select: --Select--, Referral/Friend, Online Search (Google, Bing, etc.), Facebook, Other), `input_7`
  12. Other* (text, `input_8`). **Hidden** until "Other" is picked.
  13. Your Request* (textarea, `input_5`)
  - Submit: "Submit".
- **No email field** on this form. Email is not requested.
- **Required attribute:** not set on any field. Asterisk only.
- **maxlength:** none.
- **CAPTCHA:** invisible reCAPTCHA (`size=invisible`, `badge=bottomright`). No visible challenge.
- **iframes:** the reCAPTCHA iframe and one iframe with no `src`.

Do not submit either form. For outreach, use /contact/ (email field present, which matches the contact-form rule).

## Menu and buttons
- Menu: ABOUT US, REPAIR & SERVICE, REPLACEMENT, CASE STUDIES, WHAT'S NEW (with dropdown), CONTACT. All return 200.
- Header buttons: "REQUEST A QUOTE" (goes to the quote form). Works.
- Search box (header): submits to the site's own search. Not tested with a query.
- **Broken (404):** "Request An Estimate" button on /contact/ (hero) goes to `https://coolconceptsne.com/request-an-estimate/`. Returns 404. Screenshot: `audit/broken-link_request_an_estimate_-1440x900.png`.
- Video link: "Cool Concepts - Montage" points to an MP4 in the uploads folder (200). The page shows "Media error: Format(s) not supported or source(s) not found" in the player area at the top of the homepage. Not confirmed on a phone.
- Feed: https://coolconceptsne.com/feed/ returns RSS (XML) at 200. Not a page.

## Phone and email links
- Phone: `tel:(402) 483-2665` on the homepage header and footer (value contains spaces and parentheses; not tested on a device). On /contact/ the value is encoded `tel:(402)%20483-2665`.
- Email, header: `mailto:coolconceptsne@gmail.com`.
- **Email conflict:** the /contact/ page body lists "Email Us coolconcepts@neb.rr.com" (plain text, not a link). This is a different address from the header and mailto (coolconceptsne@gmail.com). Screenshot shows both: `audit/broken-link_request_an_estimate_-1440x900.png` (header at the top, "Email Us" block below).

## Titles and H1s
| Page | Title | H1 |
|---|---|---|
| / | Cool Concepts \| Air Conditioner Repair Services Nebraska | "What You Should Know About Cool Concepts" |
| /about-us/ | About Cool Concepts \| Cool Concepts | None |
| /repair-service/ | Appliance Repair Services \| Refrigeration Repair NE \| Cool Concepts | None |
| /replacement/ | Replacement - Cool Concepts | None |
| /case-studies/ | Case Studies - Cool Concepts | None |
| /whats-new/ | Tips & News - Cool Concepts | None |
| /video-library/ | Video Library - Cool Concepts | None |
| /contact/ | Contact - Cool Concepts | "Call Us", "Email Us", "Visit Us", "Follow Us" (widget headings; the hero reads "Contact Cool Concepts" but is not an H1) |
| /faqs/ | FAQ's - Cool Concepts | None |
| /request-a-quote/ | Request A Quote - Cool Concepts | None |
| /privacy-policy/ | Privacy Policy - Cool Concepts | "Privacy Policy" |
| /project/petersen-home/ | Petersen Home - Cool Concepts | None |
| /winter-efficiency-check/ | Winter Efficiency Check - Cool Concepts | "Winter Efficiency Check" |
| /category/uncategorized/ | Uncategorized - Cool Concepts | None |

- Result: 10 of 14 HTML pages have no H1. Category page "Uncategorized" is a live page with a visible title.

## Addresses and phones (as shown on the site)
- 3701 Touzalin Avenue, Lincoln, NE 68507 (footer and /contact/). Consistent.
- Phone (402) 483-2665 everywhere.
- Email: coolconceptsne@gmail.com (header, mailto); coolconcepts@neb.rr.com (/contact/ body). See conflict above.

## Word counts (desktop, body text)
/ 222 · /about-us/ 196 · /repair-service/ 580 · /replacement/ 241 · /case-studies/ 84 · /whats-new/ 482 · /video-library/ 139 · /contact/ 150 · /faqs/ 309 · /request-a-quote/ 517 · /privacy-policy/ 302 · /project/petersen-home/ 307 · /winter-efficiency-check/ 431 · /category/uncategorized/ 315.
Thin: /case-studies/ (84 words, one case study), /video-library/ (139), /contact/ (150).

## Mobile (390 px)
- No sideways scroll on any of the 14 HTML pages (390 px).
- RSS feed: 980 px wide, normal for XML; not a page.
- Phone link visible at 390 px.

## Copy problems
- **Placeholder or redacted name:** /project/petersen-home/ says "1234 James has been doing work for us for over 10 years. He is fantastic, reliable and knows his stuff." The name "1234 James" reads as a placeholder or a redaction of the technician's name. Video library titles also say "Cool Concepts - James" (for example, "Upfront Cost - Cool Concepts - James"). Confirm before using.
- **Case study:** Petersen home (https://coolconceptsne.com/project/petersen-home/). Customer names are given ("The Petersen's"), and one line says "1234 James" (see above).
- **Public author archive:** https://coolconceptsne.com/author/genr8admin/ is live (200). The footer says "Designed & Developed by GenR8 Marketing". The author slug "genr8admin" suggests an agency admin account; not confirmed.
- No copyright line on any page.
- No testimonials other than the one case study.

## Trust and claims
- "24/7 service" (https://coolconceptsne.com/), "our 24/7 response team" (https://coolconceptsne.com/repair-service/). No hours found on the site.
- "We are an authorized Daikin dealer and can handle all warranty service request for Daikin HVAC equipment" (https://coolconceptsne.com/repair-service/). Daikin locator not checked.
- "over 20 years experience" (https://coolconceptsne.com/); "since 2005" (https://coolconceptsne.com/about-us/).
- "We offer free estimates, onsite inspections, affordable preventive maintenance, locally owned and operated" (https://coolconceptsne.com/).

## Other checks
- Speed: not measured.
- External links not checked: Facebook, X, Google Maps.
- Daikin dealer status: the locator was not checked in this pass.
