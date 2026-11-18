# Current-site audit: Creekmore Plumbing

Site: http://www.creekmoreplumbing.com/ (www redirects to http://creekmoreplumbing.com/). Platform: GoDaddy Website Builder 8.
Pages found: Home `/` and Gallery `/gallery`. No others linked from either page; no sitemap (sitemap.xml redirects to the same host, not checked further).
Widths: 1440x900 and 390x844, Playwright Chromium, run 2026-11-13.
Screenshots: `audit/` in this folder.

## Reliability during this check (read first)
- The site returned intermittent **502 "upstream request failed"** and **connection reset** errors. Over the run, the homepage and gallery each failed several times at both widths and on both hostnames, then answered 200 on retry. The first full crawl succeeded.
- This is a host or origin instability. A visitor may hit it too. Re-check before the onboarding call.

## What works
- **Menu links:** the page's own links are Home (`/`) and Gallery (`/gallery`). Both return 200 at both widths when the host responds.
- **Phone links:** `tel:3162641342` is a tappable link in the header and in the footer/contact block, at both widths. The header number is visible on mobile.
- **Email links:** `mailto:creekmoreph@att.net` (header and contact block) and `mailto:stevecoleman@creekmoreplumbing.com` (the "Get a Free Estimate" button). Both open a mail client. Not clicked.
- **Facebook link** `https://www.facebook.com/1726608847666798` (footer). Not opened.
- **Contact form** exists (see below). No broken images on the homepage (0 broken in the crawl).
- **Title and H1:** present on both pages (see table). No placeholder text found in the body.

## What's broken or weak, most costly first

### 1. Empty sections on the homepage and gallery
- "Explore our plumbing projects: A showcase of quality work by Creekmore Plumbing" renders as a blank block on the mobile homepage (`audit/mob-home-full.png`).
- "See What Our Customers Are Saying About Creekmore Plumbing!" shows only the heading. No review text is in the page.
- The gallery's "Video" and "Instagram" headings render with nothing under them (`audit/desk-gallery-full.png`).

### 2. Stock-looking gallery
- The gallery images (bathtub, toilet, pipe wrench, faucet) look like stock photos, not photos of Creekmore's own work. Inference from the images; not confirmed with the owner.

### 3. Two pages, all services on one page
- Water heaters, water service, toilets, backflow testing, water softeners, and remodels are all listed on the homepage in one long column. No service pages to rank or link to.

### 4. Mobile header repeats the contact block
- At 390 px, the phone and email appear twice at the top (in the top bar area and again under the logo). It is cluttered, not broken (`audit/mob-home-fold.png`).

### 5. Cookie banner covers the first screen on mobile
- The "This website uses cookies" panel sits over the hero and the first services on load at 390 px (`audit/mob-home-fold.png`). Desktop shows it as a corner panel.

### 6. Mobile menu not confirmed
- At 390 px, the hamburger icon was present but the click did not open a menu within the test timeout. The only navigation found in the page is Home and Gallery. Not confirmed visually.

### 7. Two contact emails
- Header and contact use an AT&T residential mailbox (creekmoreph@att.net). The "Get a Free Estimate" button uses a company-domain address (stevecoleman@creekmoreplumbing.com). Mixed signals to a customer.

### 8. Tap targets and minor layout
- Desktop: 5 small links below 24 px in the homepage (mostly the icon and footer links). Mobile: 3. Minor.
- Horizontal scroll: none. Scroll width matched the viewport at both widths (1440 and 390).

## Contact form

- **Location:** homepage, "Get a Free Quote!" section (no separate contact page). Also opens from the "GET A FREE QUOTE!" buttons. The form is in the page at load (not an iframe). No form action URL is exposed in the HTML; it is a GoDaddy form handled by script.
- **Fields:** Name; Email* (asterisk on the label); Phone; Address (Street, City, Zip Code); message textarea (placeholder "Let us know the details of what you are looking for, and we'll contact you with a quote."); "Attach Files" (file input).
- **Required fields:** the label marks Email* as required. The HTML does not carry a `required` attribute, so the browser may not enforce it. Not tested by submission.
- **maxlength:** none on any field.
- **CAPTCHA:** Google reCAPTCHA. Text says "This site is protected by reCAPTCHA and the Google Privacy Policy and Terms of Service apply." The badge is hidden by CSS (`.grecaptcha-badge { visibility: hidden }`). Treated as an invisible reCAPTCHA. Not confirmed whether it challenges on submit.
- **iframe:** none.
- **Submitted:** no. Per the brief, the form was not filled or sent.

## Titles, H1s and word counts

| Page | Title | H1 | Words (desktop / mobile) |
| --- | --- | --- | --- |
| Home `/` | Trusted Local Plumbers for Your Needs | Reliable local plumbers you can trust | 482 / 450 |
| Gallery `/gallery` | Gallery \| Creekmore Plumbing | Welcome (also "Video", "Instagram" as H2s) | 3 (desktop render failed on some tries) / 99 |

## Offices, addresses and phones

- One office: 440 South Pattie Street, Wichita, Kansas 67211 (homepage contact block; JSON-LD `streetAddress` 440 S Pattie St, postalCode 67211).
- Phone: (316) 264-1342, the same everywhere on the site (header, body, contact block, tel links).
- No second office or phone found.

## Speed and mobile

- Homepage load on a good response: about 2.1 s desktop, 1.8 s mobile (first crawl, `loadMs`). Gallery loaded in 2.6 s at mobile on the first crawl.
- Intermittent 502 and connection resets (see top). This is the bigger speed and reliability issue.
- Images are large full-width stock photos on mobile (the gallery tiles), which slows the page on a phone. Not measured in bytes.

## Not checked
- Google reviews on the Google profile (no review pull, per the rule that reviews are pulled only for final picks).
- The mobile menu contents (click did not open it, see item 6).
- Form submission and any confirmation (not allowed).
- Hours by day beyond the structured data (see facts.md).
