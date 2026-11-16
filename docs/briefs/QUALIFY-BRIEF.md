# Brief: qualify new candidates (Haiku)

You read; you don't write copy. Write only `prospects/<city>-<trade>/<slug>/qualify.md` for each candidate and one summary file named in your task. Run no git, send nothing, submit no forms, create no sessions. Never get past a CAPTCHA or a login.

For each candidate (name, website, rating, review count given in your task), open the live site with Playwright (`require('playwright')`, `chromium.launch()`) and decide PASS or SKIP on four tests:

1. **Strong written reviews:** 4.6+ stars and 40+ Google reviews. (Written-review depth is checked later in the review pull.)
2. **Weak site:** most money services have NO page of their own whose top heading names the service and the city. Also note: thin copy, no reviews on the site, phone not tappable, dated design. A site where most services already have a "<Service> in <City>" page is NOT weak: SKIP.
3. **Enough real material:** the site itself has enough service detail (or FAQs, about text) to write 2 service pages. A one-page site with three lines: SKIP.
4. **No current agency build:** check the footer and page source for agency credits or platforms (Scorpion, Hibu, Thryv, ServiceTitan Marketing, Blue Corona, Rival Digital, Footbridge, Market Hardware, LocaliQ, Yodle, Web.com, "Website by…"). A national franchise or a multi-city chain: SKIP.

Also SKIP: no website, closed, a supplier or union, or anything in FL, CO, OR, WA, Northern CA, or Springfield MO/417.

`qualify.md` format: site, phone, rating and count, then one line per test (PASS/SKIP with the evidence: the page or credit you saw), then the verdict and the two likely money services.

Reply in under 80 words: the PASS list with the two money services each, and the SKIP count.
