# Current-site audit: Response Lawn Care

Site: https://www.responselawncare.com/ (Wix)
Checked: 2026-11-09. Crawl at 390x844 and 1440x900 with Playwright (Chromium).
Pages: Home `/`, Services `/services-5`, About `/about`, Our Work `/copy-of-about`, Contact `/contact`. All return 200. The pages sitemap lists the same five.
Screenshots: `audit/` in this folder (JPEG, each under 500 KB).

## What works

- **Navigation.** All five menu links and the "Get a Quote" button land on the right pages (verified by clicking at both widths). This corrects `qualify.md`, which said the nav links all resolve to the homepage. They do not.
- **Email link.** `jeffrey@responselawncare.com` is a real `mailto:` link, and its href matches the displayed address. Delivery not tested.
- **Phone number on Google.** The visible number, 316-244-6034, matches the Google profile (316) 244-6034.
- **Images.** No broken images on any page at either width. The Our Work before/after photos are real job photos.
- **Desktop layout.** No horizontal overflow at 1440px. Pages render cleanly.
- **Contact and services forms.** Both forms exist and use Wix fields. Neither was submitted.

## What's broken, most costly first

1. **The site does not fit a phone screen.** At 390px wide, every page is laid out about 980px wide, so the page scrolls sideways by about 590px. The hero title and headings are cut off at the right edge ("Wichita L...", "Respo..."), and the Services content runs off-screen. Checked on all five pages.
   - Evidence: `audit/home-phone-390-viewport.jpg`, `audit/services-phone-390-viewport.jpg`, `audit/ourwork-phone-390-viewport.jpg`, `audit/contact-phone-390-viewport.jpg`.
   - Cost: most local searchers are on phones, and this is the first thing they see.

2. **The phone number is not tappable anywhere.** "Call: 316-244-6034" appears as plain text on Home, Services, About, Our Work and Contact (including the footer). There is no `tel:` link on any page. The only tap action is email.
   - Evidence: `audit/home-desktop-1440-full.jpg` (plain text in the body and footer), and `audit/contact-desktop-1440-full.jpg` (the "Call 316-244-6034" line).
   - Cost: the main way customers would contact them takes a manual dial on a phone.

3. **Homepage headline is only the business name.** The H1 is "Response Lawn Care". There is no mention of mowing, Wichita or the electric difference. The banner text "Wichita Lawn Care Service" is part of the image, not the H1. The homepage body is about 110 words. The offer (quiet, electric, from $40 per mow) is only in body text.
   - Evidence: `audit/home-desktop-1440-viewport.jpg`.

4. **Machine-readable phone number does not match.** The page's JSON-LD (LocalBusiness) and Wix's business settings list `telephone` as `3162099500` (316-209-9500). The visible and Google number is 316-244-6034. Search engines read the JSON-LD, so this mismatch matters. Which number is live was not confirmed.
   - Evidence: the `<script type="application/ld+json">` block in the homepage source.

5. **Leftover name "J3" in live copy and SEO data.** The About page text reads "In addition to using all electric lawn equipment, J3 also focuses on...". The business description in the page data reads "J3 offers electric lawn mowing services... I focus on...". This is a template or other-business leftover in visible copy.
   - Evidence: About page body text (`/about`), and `audit/about-desktop-1440-full.jpg`.

6. **No street address on the site.** The site names only "Wichita, KS". The Google profile has 9109 W 18th St N, Wichita, KS 67212. The footer and every page omit the street address, and the structured data has no street address.
   - Cost: weak local signals and a mismatch with the Google profile.

7. **"Our Work" is a copy page.** The nav label "Our Work" goes to `/copy-of-about`, a copy of the About page. It has the title "About | Response Lawn Care" (same as About), H1 "Electric Lawn Care Service", and only one before/after pair. There is a large empty gap below the pair before the CTA.
   - Evidence: `audit/ourwork-desktop-1440-full.jpg`.
   - Cost: the portfolio page, which should sell the service, is thin and duplicates About.

8. **Contact form has no spam protection detected, and small defects.** The contact form has first/last name, email, phone, "Select an Address" (a text box), a required "Freqency" (misspelled) option of "Every week" or "Every two weeks", and a comments box. The Services page has a second, shorter form (first name, last name, email, Send). No reCAPTCHA, hCaptcha or Turnstile was found in the page source or DOM. Wix's built-in protection could not be verified without submitting, which was not done.
   - Evidence: `audit/contact-desktop-1440-full.jpg`.

9. **Services list does not match the homepage.** The Services page lists Electric Lawn Mowing, Edging, Trimming, Blowing and Sidewalks/Driveways. The homepage says "mowing, trimming, and edging" only. Blowing and sidewalks appear only on Services. There are no per-service pages, just one Services page.
   - Evidence: `audit/services-desktop-1440-full.jpg`.

10. **Smaller items.**
    - No hours anywhere on the site.
    - No copyright line or year was found on any page, so there is no "old copyright year" issue.
    - No sample testimonials, lorem ipsum or placeholder pages were found beyond the `copy-of-about` slug.
    - The About page includes an unsourced claim: "Gas-powered lawnmowers are currently responsible for 5% of the total U.S. air pollution." Not checked.

## Headline and titles

| Page | URL | H1 | `<title>` |
|---|---|---|---|
| Home | / | Response Lawn Care | Wichita Lawn Mowing \| Response Lawn Care \| Wichita |
| Services | /services-5 | Services Provided | Services \| Response Lawn Care |
| About | /about | About Response Lawn Care | About \| Response Lawn Care |
| Our Work | /copy-of-about | Electric Lawn Care Service | About \| Response Lawn Care |
| Contact | /contact | Contact | Contact \| Response Lawn Care \| Wichita, KS |

## Offices

One office: Wichita. Phone 316-244-6034. Address 9109 W 18th St N, Wichita, KS 67212 (Google only; not on the site). Structured-data phone 316-209-9500 (see item 4). No second office found.

## Services

Five listed on the Services page: Electric Lawn Mowing, Edging, Trimming, Blowing, Sidewalks/Driveways. One page covers all five; none has its own page.

## Google profile versus site

- Name: matches ("Response Lawn Care").
- Phone: matches the visible number. Structured data differs (item 4).
- City: matches ("Wichita, KS"). Street address missing from site (item 6).
- Services: partly match (item 9).
- Hours: not on site; not checked on Google.
- Rating and review count: not checked (Google Maps could not be loaded).

## Speed

PageSpeed Insights could not be run. The API returned HTTP 429 (daily quota exceeded for the project). Not retried.

## Could not check

- Live Google profile data (hours, categories, review text): Google Maps not loaded.
- Whether the contact forms send email or have working spam protection: not submitted.
- Whether the mailto address receives mail.
- Which phone number (316-244-6034 or 316-209-9500) is connected to the business line.
- PageSpeed score (quota).
- Sitebulb export: none was in the prospect folder. Not searched elsewhere.
- Tap targets and the mobile menu: no hamburger was found at 390px; the nav appears to be a horizontal bar that is cut off. Not confirmed on a real phone.
