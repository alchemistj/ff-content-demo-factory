# Qualify: Pioneer Roofing (Peoria, IL)

- **Scout:** Peoria roofing search, rank 3 in QUALIFY.md (fit 3). Google phone (309) 865-5471, place ID ChIJbVmv0ztZCogR4RO0wHMGcZg (from `prospects/peoria-roofing/QUALIFY.md`).
- **Google rating and count:** Unverified. Not given in the prompt or QUALIFY.md, and the Google profile was not opened.
- **Site:** https://roofingpeoria.net/ (contact form: https://roofingpeoria.net/contact-us/)
- **Kind:** roofing contractor with a metal-roof specialty. Small, with a weak page set.

## Why it fits
- Metal roofs are the specialty: Metal Roofs, Commercial Metal Roofing, Residential Metal Roofing, Standing Seam, Corrugated, and Metal roof installation & design. Each page has 260 to 300 words, and the metal service pages are real, not copied.
- The site is weak where a demo helps. The town pages ("Pioneer Roofing Experts in X, IL", 36 in the crawl, 787 to 985 words each) are one template with the town name swapped. The service H1s are not city-specific ("METAL ROOFS", "COMMERCIAL METAL ROOFING").
- Contact form on /contact-us/: Full Name, Phone, Email, Location, Job Description, and a solar question. No required fields in markup. No CAPTCHA widget at load (see audit.md).

## Corrections to QUALIFY.md
- **CAPTCHA:** QUALIFY.md says "No CAPTCHA in markup". The page source does mention reCAPTCHA, but no widget, badge or reCAPTCHA object loaded in the browser on /contact-us/. Whether a CAPTCHA appears only at submit is not known (not submitted).
- **Second phone number:** all 36 town pages in the crawl have a "PHONE" button that dials **(321) 399-2147** (tel:13213992147), a 321 area code. The site's visible and main number is 309-865-5471. Confirm which line is live and why the town pages use a different number.
- **Cloudflare 520:** QUALIFY.md says one check returned 520. This crawl had no 5xx on any page at either width.

## Not checked
- Google profile, BBB, Illinois SOS. No BBB profile matched the Peoria address in search. See facts.md.
- Form submission: not submitted, per brief.
