# Coverage check: Bushey's Windows & Doors (http://www.busheysfw.com/)

Checked 2026-11-16 from the live site (redirects to https://busheysfw.com/). No 403, no login, no CAPTCHA on the business's own site.

## 1. Homepage menu, footer and sitemap

**Main menu (header):** Windows (/windows/), Doors (/doors/), Replacement Process (/replacement-process/), Contact Us (/contact-us/), View Gallery (/windows-gallery), Team (/team), Request Free Consultation (external: koalendar.com/e/window-and-door-consultation).

**Footer:** tel 260-456-1247; About Us (/about-us/), Team (/team/), Community (/community/), Awards (/awards/), Testimonials (/testimonials/), Careers (/careers/), Windows Gallery (/windows-gallery/), FAQ (/f-a-q/), Privacy Policy (/privacy-policy/); external: provia.com/doors/, infinitywindows.com/windows, simplehpp.com/busheyswindowpay/ (financing, see below); Facebook, Instagram, Google driving directions.

**/sitemap.xml** and **/sitemap_index.xml** both point to **/page-sitemap.xml** and **/themify_popup-sitemap.xml**.

**/page-sitemap.xml** (non-image URLs): /, /about-us/, /application-successful/, /awards/, /careers/, /community/, /contact-us/, /contact-us-testing1/, /contact-us-testing2/, /contact-us-testing3/, /default-sitemap.xsl (not a page), /doors/, /doors-gallery/, /f-a-q/, /free-consultation-form/, /patio-doors/, /patio-doors-gallery/, /privacy-policy/, /replacement-process/, /team/, /testimonials/, /windows/, /windows-gallery/, /404-2/.

**/themify_popup-sitemap.xml:** /themify_popup/contact-popup/.

**Linked from the Community and Awards pages (not in any sitemap):** 13 /project/... pages and /portfolio-category/community, /portfolio-category/community/page/2, /portfolio-category/awards.

## 2. Which of those are in site/

| Page | File in site/ | Status |
|---|---|---|
| / (home) | home.md | yes |
| /windows/ | windows.md | yes |
| /doors/ | doors.md | yes |
| /patio-doors/ | patio-doors.md | yes |
| /replacement-process/ | replacement-process.md | yes |
| /contact-us/ | contact-us.md | yes |
| /windows-gallery/, /doors-gallery/, /patio-doors-gallery/ | windows-gallery.md, doors-gallery.md, patio-doors-gallery.md | yes (image-only, text is captions) |
| /team/ | team.md | yes |
| /about-us/ and /about/ | about-us.md, about.md | yes |
| /community/ | community.md | yes |
| /awards/ | awards.md | yes |
| /testimonials/ | testimonials.md | yes |
| /careers/ | careers.md | yes (application form, no service copy) |
| /f-a-q/ | f-a-q.md | yes, **re-saved this run** with answers (first crawl had questions only) |
| /privacy-policy/ | privacy-policy.md | yes |
| /application-successful/ | application-successful.md | added this run |
| /free-consultation-form/ | free-consultation-form.md | added this run |
| /contact-us-testing1/, /2/, /3/ | contact-us-testing1.md, contact-us-testing2.md, contact-us-testing3.md | added this run (test pages, same form copy) |
| /404-2/ | 404-2.md | added this run (404 page) |
| /themify_popup/contact-popup/ | themify-popup-contact-popup.md | added this run (popup) |
| /portfolio-category/community and /page/2, /awards | portfolio-category-community.md, portfolio-category-community-page-2.md, portfolio-category-awards.md | yes |
| All 13 /project/... pages | project-*.md | yes; project/bbb, project/provia-platinum-dealer-award, project/run-for-riley **failed in the first crawl, re-fetched and saved this run** |

Index: site/INDEX.md was appended with the rows added this run.

## 3. Not read

- **Financing page** (simplehpp.com/busheyswindowpay/): returns a "Just a moment..." JavaScript challenge (403). Not read. It is a third-party link, not a page on the business's site.
- **Gallery images** (/windows-gallery/, /doors-gallery/, /patio-doors-gallery/): image-only pages, so there is no text beyond captions.
- **Privacy policy** was saved as text but not used for inventory.

## 4. Verdict

**COMPLETE.** Every menu, footer and sitemap page is in site/. The only items not read are the third-party financing page (blocked) and the gallery images (no text).

Caveats for the writer:
- The first crawl's FAQ text missed the answers. It is fixed in site/f-a-q.md.
- The crawl did not include the sitemap-only pages, so they were added by hand, in the same format.
