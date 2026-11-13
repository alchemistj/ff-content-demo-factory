# Current-site audit: Yoke's Master Plumbing and Remodeling

Site: https://yokesmasterplumbing.com/ (http redirects to https). WordPress (generator tag: "WordPress 7.1.4"). Theme and plugin: WPForms on the contact page.
Pages found: Home `/` and Contact `/contact/`. Both linked from the header. No other pages linked; `/sitemap.xml` returns 404.
Widths: 1440x900 and 390x844, Playwright Chromium, run 2026-11-13.
Screenshots: `audit/` in this folder.

## What works
- **Header menu:** "Home" and "Contact" both open their pages at both widths (200). The header logo links to Home.
- **Phone links:** `tel:3163728210` is tappable in the hero, the contact block and the call button. Three tel links on the homepage, the same number everywhere: (316) 372-8210.
- **Email link:** `mailto:yokesplumbingnremodeling@gmail.com` (contact block). Not clicked.
- **"MORE" buttons (5 on the homepage):** they all go to `/contact/`. They work, but none opens a service page. Flag: there are no service pages to land on.
- **"Servicing the Wichita and surrounding area"** link goes to `/contact/`.
- **Facebook reviews link:** `https://www.facebook.com/yokesplumbing/reviews/?ref=page_internal`. Not opened.
- **Google maps embed** on the contact page (iframe, `maps.google.com ... q=Wichita, KS`). It is a general Wichita map, not a pin on a business address.
- **Titles and H1s:** present (see table). No placeholder or lorem text found.
- **No broken images** on either page (0 in the crawl).
- **No horizontal scroll** at 390 px (scroll width 390).

## What's broken or weak, most costly first

### 1. Two pages, no service pages
- The homepage lists about 35 services in five groups (plumbing, gas line, hose bibs, remodeling, drain cleaning). They are all on one page. Each group's "MORE" button goes to the contact page.

### 2. No business address on the site
- The contact page says "Wichita, KS and surrounding area (outside Wichita subject to Trip Charge)." No street address anywhere on the site. Visitors cannot find the office or see the service area.

### 3. Contact form has no CAPTCHA widget in the markup
- WPForms form `wpforms-form-556`, POST to `/contact/`. The page source has WPForms validation text for reCAPTCHA and Cloudflare Turnstile, but no widget element in the form. Whether the server requires a check cannot be seen without submitting. Not submitted, per the brief.

### 4. Contact form labels are broken
- The third field (optional) is labeled "may * you?" in the rendered page. It is not clear what it asks for (phone and best time to call are the likely intent). Unverified.
- In the mobile DOM, the same optional field is labeled "Name * may" (desktop: "may * you?"). The two layouts give it different labels. The First and Last fields are labeled the same at both widths.

### 5. Required fields
- Required in the DOM: First, Last, Email, Subject, and the message ("How may we help you?"). Required markers appear as "(required) *" text. Not tested by submission.
- No maxlength on any field.

### 6. Slow first load
- Homepage load: 4.4 to 6.1 s on desktop across two runs, 4.8 to 4.9 s on mobile. Slower than Creekmore. Not measured further.

### 7. Small tap targets
- 11 links under 24 px in the homepage at both widths. Minor.

### 8. Homepage has no clear call to action beyond the phone number
- The hero has the phone number in the largest type. There is no quote or estimate form on the homepage. The only form is on `/contact/`.

## Titles, H1s and word counts

| Page | Title | H1 | Words (desktop / mobile) |
| --- | --- | --- | --- |
| Home `/` | Yokes Master Plumbing – We'll get it within a foot! | YOKES MASTER PLUMBING | 392 / 390 |
| Contact `/contact/` | Contact – Yokes Master Plumbing | none on the page | 100 / 98 |

- Title on the home page includes a tagline ("We'll get it within a foot!"). Not wrong, but not a service keyword.
- The contact page has no H1.

## Offices, addresses and phones
- One phone number: (316) 372-8210 (home and contact, all instances).
- One email: yokesplumbingnremodeling@gmail.com.
- No street address. Service area: "Wichita, KS and surrounding area (outside Wichita subject to Trip Charge)" (contact page).

## Speed and mobile
- Homepage: about 4.4 to 6.1 s load, desktop; about 4.8 to 4.9 s, mobile (crawl, two runs).
- Mobile layout: the hero, phone button, About block and services render at 390 px with no horizontal scroll (see `audit/mob-home-fold.png`).
- Desktop hero is a dark photo overlay with the phone number in the middle (`audit/desk-home-fold.png`).

## Not checked
- Google reviews on the Google profile (no review pull, per the rule that reviews are pulled only for final picks).
- Facebook page contents.
- Form submission and any confirmation (not allowed).
- The contact form's server-side CAPTCHA setting.
- Whether the "Trip Charge" for outside Wichita is stated anywhere else.
