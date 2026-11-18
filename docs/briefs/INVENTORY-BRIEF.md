# Brief: site coverage check + inventory for ONE business (Haiku)

You read; you don't write copy. Edit only the two output files named below. Run no git, send nothing, create no sessions, submit no forms. Never get past a CAPTCHA or a login.

Folder: `/home/user/ff-content-demo-factory/prospects/<folder>/`. Site URL: in `facts.md` or `audit.md`.

## 1. Coverage check: is the WHOLE site read?
- If `site/` is missing or empty, run `cd /home/user/ff-content-demo-factory && node scripts/fetch-site-text.mjs prospects/<folder> <site-url> 60`.
- Open the live homepage with Playwright (`require('playwright')`, `chromium.launch()`). List every link in the main menu, the menu's dropdowns, the footer, and `/sitemap.xml` or `/sitemap_index.xml` if they exist.
- Compare that list with `site/INDEX.md`. For each page that's missing, fetch it, either by running the script again or by saving the rendered text as `site/<slug>.md` in the same format.
- Write `site/COVERAGE.md` with three things:
  - the full menu, footer and sitemap list;
  - which of those pages are in `site/`;
  - the verdict: **COMPLETE**, or **INCOMPLETE** with what couldn't be read and why (blocked, login, error).

## 2. Inventory, from the FULL text including FAQs
Write `inventory.md` in the folder:
- **Services:** every service the site names, with the page it's on.
- **Differentiators:** anything that sets them apart, in their own words, with the page.
- **Credentials:** each one as the site states it. Mark "confirmed" only if you checked it on the certifier's own site, and give the URL.
- **Unusual offers:** anything unexpected, e.g. a roofer that installs solar, a plumber with a membership plan, or financing.
- **Review themes:** what the reviews in `reviews.json` prove again and again (speed, honesty, cleanliness, named staff…). For each theme give 2–3 reviewer names and one short exact phrase.
- **Facts and conflicts:**
  - phones, address, hours and years, each with its source;
  - every conflict, such as two numbers, years that disagree, or hours that disagree.
- **Lead candidates:** 3–5 possible lead messages, each scored with the factory's USP method (Appeal × Exclusivity, 1–5 each; see `docs/writer-guides/AVATAR-AND-USP.md`). Give one line on why each scores what it does.
- **Two money services:** the two that have the most real material on the site plus reviews. Also say whether each could honestly reach a 700-word page.

Reply in under 60 words: the coverage verdict, the counts of services, differentiators and offers, the top lead and its score, and the two money services.
