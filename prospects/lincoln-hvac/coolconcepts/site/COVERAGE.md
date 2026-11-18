# Coverage check: coolconceptsne.com

Checked 2026-11-16 against the live homepage (Playwright, Chromium) and the sitemap files.

## 1. Full list of pages the site links to or lists

**Main menu (nav):** About Us, Repair & Service, Replacement, Case Studies, What's New, Video Library, Contact, FAQ's, Request A Quote. Home is the logo link. No dropdowns: no link in the nav opens a submenu.

**Footer:** Home, FAQ's, Privacy Policy, Request A Quote, Contact. Also the GenR8 Marketing credit (external, genr8marketing.com, not read).

**Sitemap (Yoast):** `/sitemap_index.xml` and `/sitemap.xml` list five child sitemaps. Pages from them:
- page-sitemap: /, /sample-page/, /request-a-quote/, /faqs/, /case-studies/, /video-library/, /replacement/, /whats-new/, /contact/, /about-us/, /repair-service/, /privacy-policy/
- post-sitemap: /frequently-asked-questions/, /energy-efficient-home-for-the-fall/, /replacing-your-air-filters/, /choosing-the-right-air-filters-for-your-home/, /did-you-know-that-heating-your-home-typically-makes-up-about-42-of-your-homes-utility-bill/, /winter-efficiency-check/
- project-sitemap: /project/ (archive), /project/petersen-home/
- category-sitemap: /category/blog/, /category/public/, /category/tips/, /category/uncategorized/
- author-sitemap: /author/genr8admin/ (author archive)

**Linked from the body but not in the menu, footer or sitemap:** /request-an-estimate/ (returns 404; the "Request An Estimate" button on /contact/ points there), the homepage's service links to /repair-service/, and the uploaded MP4 (download link, not read as text).

## 2. Which of those are in site/

| Page | In site/ | File |
|---|---|---|
| / (home) | yes | home.md |
| /about-us/ | yes | about-us.md |
| /repair-service/ | yes | repair-service.md |
| /replacement/ | yes | replacement.md |
| /case-studies/ | yes | case-studies.md |
| /whats-new/ | yes | whats-new.md |
| /video-library/ | yes | video-library.md |
| /contact/ | yes | contact.md |
| /faqs/ | yes | faqs.md |
| /frequently-asked-questions/ | yes | frequently-asked-questions.md |
| /request-a-quote/ | yes | request-a-quote.md |
| /privacy-policy/ | yes | privacy-policy.md |
| /project/petersen-home/ | yes | project-petersen-home.md |
| /project/ (archive) | yes, added this pass | project-index.md |
| /winter-efficiency-check/ | yes | winter-efficiency-check.md |
| /energy-efficient-home-for-the-fall/ | yes | energy-efficient-home-for-the-fall.md |
| /replacing-your-air-filters/ | yes | replacing-your-air-filters.md |
| /choosing-the-right-air-filters-for-your-home/ | yes | choosing-the-right-air-filters-for-your-home.md |
| /did-you-know-that-heating-.../ | yes | did-you-know-that-heating-your-home-typically-makes-up-about-42-of-your-homes-ut.md |
| /category/blog/ | yes | category-blog.md |
| /category/public/ | yes | category-public.md |
| /category/tips/ | yes | category-tips.md |
| /category/uncategorized/ | yes | category-uncategorized.md |
| /author/genr8admin/ (archive) | yes, added this pass | author-genr8admin.md |
| /sample-page/ | yes, added this pass | sample-page.md |
| /request-an-estimate/ | yes, as a 404 | request-an-estimate.md |

Every menu, footer and sitemap page is in site/. Three sitemap pages were missing from INDEX.md (/sample-page/, /project/, /author/genr8admin/); they were rendered and saved this pass in the same format. INDEX.md itself was not edited.

## 3. Notes from the pass

- /sample-page/ is the WordPress default placeholder text, but it is live and still shows a "We are the Official Dealer of" line with a footer block. The claim is not backed by anything else in the folder (see facts.md, Daikin and dealer status unverified).
- /project/ and /author/genr8admin/ are archive listings. Their text repeats the Petersen case study and the blog posts already in site/.
- Not checked: the external Facebook, X and follow.it links; the Google Maps embed; the Daikin locator; the mobile menu opened on a phone (per audit.md).

## Verdict

**COMPLETE.** Every page in the menu, footer and sitemap was read in full, and nothing was blocked, behind a login or returned an error (except the one known 404 on /request-an-estimate/, which is recorded as broken).
