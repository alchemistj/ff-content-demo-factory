# Coverage check: A Better Way Construction & Roofing

Checked 2026-11-16 against https://abetterwayconstructionandroofing.com/ (live homepage rendered in Playwright Chromium, 1440 px).

## 1. Full menu, footer and sitemap list

**Top menu (live homepage), site pages only:** Projects, Reviews, Tips, Contact, Roofing (with 12 city pages), Construction, Decks, About, Request FREE Estimate. Mobile-menu duplicates add nothing new.

**Footer (live homepage), site pages only:** Roofing, Sky Lights, Gutters, Siding, Painting, Remodeling, Decks, Concrete (all service links), 8 blog posts, 12 city pages (Lincoln, Seward, Crete, Waverly, Milford, Eagle, Greenwood, Beatrice, Wahoo, Ashland, Hickman, Roca), contact page.

**Off-site links, not read (outside the business's own site):** BBB profile (footer "A+ BBB rating"), Facebook, Twitter/X, LinkedIn, YouTube, and mailto/tel links.

**Sitemap:** `/sitemap.xml` is an index with four child sitemaps (misc, project, post, page). Their 42 unique URLs are the list below. `/sitemap_index.xml` returns 404 (not a page to read). `/sitemap.html` is the sitemap's HTML index.

Sitemap URLs (42):
1. / (homepage)
2. /about/
3. /services/
4. /residential-roofing/
5. /residential-roofing/lincoln-nebraska/
6. /residential-roofing/seward-nebraska/
7. /residential-roofing/crete-nebraska/
8. /residential-roofing/waverly-nebraska/
9. /residential-roofing/milfords-top-rated-roofing-company/
10. /residential-roofing/top-choice-roofer-in-eagle/
11. /residential-roofing/greenwood-roofing-contractor/
12. /residential-roofing/beatrice-nebraska/
13. /residential-roofing/top-roofing-contractors-in-wahoo/
14. /residential-roofing/ashlands-top-rated-roofing-company/
15. /residential-roofing/youre-reliable-roofing-company-in-hickman/
16. /residential-roofing/roca-roofing-contractor/
17. /roof-repair-company/
18. /roof-installation/
19. /roof-storm-damage/
20. /general-construction-contractor-in-lincoln-nebraska/
21. /decks/
22. /lincoln-painting-company/
23. /construction-remodeling-roofing-painting-projects/ (Projects)
24. /project/siding-replacement-project/
25. /project/privacy-fence-installation/
26. /project/pressure-treated-deck-installation/
27. /project/roof-siding-gutter-replacement/
28. /project/trex-composite-deck-installation/
29. /project/back-porch-addition-remodeling-construction/
30. /customer-reviews/
31. /contact-a-better-way-construction-roofing-company/
32. /a-better-way-construction-roofing-blog-page/ (Tips)
33. /gaf-has-great-warranties/
34. /can-i-replace-my-roof-in-the-winter/
35. /how-can-i-tell-if-my-roof-was-damaged-by-wind/
36. /so-the-storm-damaged-your-roof-what-do-you-do/
37. /spring-maintenance-roof-gutters/
38. /the-advantages-of-hiring-a-local-contractor/
39. /hire-a-local-roofing-contractor-or-diy-when-it-comes-to-residential-roofing-repair/
40. /why-do-shingles-blow-off/
41. /mixing-roof-vents/
42. /sitemap.html

Plus pages reached by the menu and footer but not in the sitemap: `/page/2`, `/page/3`, `/page/4` (blog listing pages, linked from Tips) and `/a-better-way-construction-roofing-blog-page/page/2`.

## 2. Which of those pages are in site/

- **In site/ (all 42 sitemap URLs):** yes. Count: 42 of 42.
- **Menu and footer internal links:** all present in site/.
- **Added in this run:** `roof-storm-damage.md` and `sitemap-html.md`. The crawl had not reached them, so both were fetched directly with Playwright and saved in the same format, and rows were added to `site/INDEX.md`.
- **Not in site/ and not needed:** the external BBB, GAF and social links, and the `.webm` video file (no text).

Pages in site/: 47 files (45 from the crawl, 2 added). The `.webm` row in INDEX.md is media with no text, not a page.

## 3. Verdict

**COMPLETE.** Every internal menu, footer and sitemap page was fetched and saved as text, rendered in a browser, with HTTP 200 on each.

Limits of this read, stated plainly:
- The BBB profile (403, bot check) and the GAF contractor locator (403, access denied) could not be opened. Nothing from either site is marked confirmed. See inventory.md, Credentials.
- The phone-dialing and form-submission tests were not run (not in this brief).
