# Current-site audit

Run this on every prospect's current website before the plan is written. It feeds the strategy page's "Current site problem" lines, and it is how we catch what Josh otherwise catches himself. Evolve's patio-doors button opened the windows page, and its Oklahoma City number was plain text. Josh found both; this audit would have.

Output: `prospects/<market>/<slug>/audit.md`, with a screenshot for every broken thing.

## Crawl (Playwright, phone 390x844 and desktop 1440x900)
1. **Every menu link and every button or card link** on every page: where it goes, and whether that is the right page. Flag links to the wrong page, dead links and links to `#`.
2. **Every phone number on the page:**
   - Is it a `tel:` link?
   - Does the link dial the number it shows? Placeholders like `tel:1234567890` are common on Wix.
   - Is every office's number tappable, not only the main one?
3. **Every `mailto:` link:** does it open the address it shows? Look for placeholders like `info@mysite.com`.
4. **Forms:** is there a real contact form, what are its fields, does it have spam protection (reCAPTCHA, hCaptcha, Turnstile), and does it send?
5. **Placeholder or leftover content:** pages with "copy-of" in the address, template sample text, sample testimonials (for example "Samantha Johnson"), lorem ipsum, a wrong city, an old copyright year.
6. **Every office:** each city and phone number the site names, which the Google profile matches, and what the site's other pages say about it.
7. **Headline and title:** the homepage H1 (does it say the work and the town?), each page's H1, and the `<title>`.
8. **Services:** each service the site names, and whether it has its own page.
9. **Speed:** a phone page-speed score, if you can get one.
10. **Site versus Google profile:** do the name, phone, services and hours match?

## Sitebulb
If Josh has a Sitebulb export for the site (Hints CSV or audit PDF), read it as well. Copy the critical and high-priority hints that matter for a small local site into `audit.md`.

## Write-up
List what works, then what's broken, with the most costly problem first. For each finding give the evidence (URL, what you clicked, what happened) and the screenshot. Do not guess: if something couldn't be checked, say so.
