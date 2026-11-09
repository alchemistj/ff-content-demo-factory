# Douglas Fry Roofing, Inc.: current-site audit

Site: https://www.douglasfryroofing.com/ (Wix, 16 pages). Audited 2026-11-09 with Playwright (Chromium) at 390x844 and 1440x900. Screenshots are in `audit/`. Scratch scripts are in `/tmp/claude-0/-home-user/9d8118b7-f5b3-5447-8eb5-932524a50e8e/scratchpad/dfry/`.

## Corrections to the scout and qualify notes
- **The "Repair Services" menu link does not open the "Tile Roof Systems" page.** Clicked from the homepage, "Repair Services" goes to https://www.douglasfryroofing.com/tile-roof-systems-copy (title "Roof Repairs | Douglas Fry Roofing | Wichita Roof Repairs", H1 "Repair Services"). The page titled "Tile Roof Systems" (H1 "Tile Roofs") is https://www.douglasfryroofing.com/repair-services. It is reached only from a dropdown under Repair Services, which I could not open in headless Chromium (see finding 8).
- **Neither header phone number is tappable.** (316) 655-9777 and (316) 264-1511 are plain text on every page. The tap-to-call links are the "Get In Touch" buttons, which dial 316-655-9777. Those buttons are off-screen on a phone (finding 1).

## What works
- Real owner names on the site (Doug Fry and Jason Fry) and a plain "you can always speak with an owner" promise.
- The Google Maps link in the header and footer points to the same place as the scout's place ID (see Google profile section).
- Every page loads (16 of 16 returned HTTP 200), and the "Get In Touch" buttons dial the right number.
- Real job photos on the gallery, residential and repair pages (for example the DaVinci and tile repair photos), and an active-looking site structure with named product pages (DaVinci, Brava, asphalt, standing seam metal).

## What is broken, most costly first

1. **On a phone, the call buttons and most of the menu are off the right edge of the screen.** The homepage is laid out at about 980px wide on a 390px screen (document scroll width 980 vs 390). On the homepage, all three "Get In Touch" tap-to-call buttons sit at x = 586, 1053 and 445 px, so none is on screen at 390px. The header phone numbers sit about x = 480 to 600 px on the desktop layout and are not links. Screenshot: `audit/mobile-home-top.png` (header clipped at "1835 N. Ohio Wichita, Ks 672" and "Residential Roofin"). The page carries a Wix desktop viewport tag (`id="wixDesktopViewport"`), and no phone layout is in use.
2. **Phone numbers do not dial the second office line.** (316) 264-1511 appears in the header, footer and contact sections of every page, always as plain text and never as a link. The site never says what it is for (see questions). The Google profile number (316) 655-9777 is the only one that can be dialed.
3. **On a phone, only three menu items are on screen.** At 390px, Home, About and Residential Roofing are on screen. Repair Services (x = 413), Commercial (546), Job Gallery (653), FAQ (756), Testimonials (813) and Blog (923) are off the right edge. There is no hamburger or collapsed menu. Same screenshot as finding 1.
4. **Wrong or confusing destination for Repair Services.** The top menu item leads to a page titled "Roof Repairs" with H1 "Repair Services" (`/tile-roof-systems-copy`). A second page on the same subject, `/repair-services` (H1 "Tile Roofs"), is in the hidden dropdown. Tile repair is covered on four pages: `/repair-services`, `/tile-roof-systems-copy`, `/projects-copy` ("Tile Roof Repairs") and `/projects` ("Roof Flashing Issues and Leaks"). Screenshots: `audit/desktop-tile-roof-systems-copy-top.png`, `audit/desktop-repair-services-dropdown-target.png`.
5. **Two "-copy" pages are live and public.** `/tile-roof-systems-copy` and `/projects-copy` are reachable from the menu and from the homepage. Both are the same kind of tile-repair content as their non-copy versions, and both show raw image filenames as captions (see 6).
6. **Image filenames show as visible text.** `/tile-roof-systems-copy` shows "IMG_0042.heic", "IMG_0069.heic" and "20180910_123601.jpg". `/projects` shows "20190320_123322.jpg", "MVIMG_20190401_102312.jpg" and "MVIMG_20181214_143251.jpg". `/projects-copy` shows "P1860186.jpg", "IMG950241.jpg" and "IMG_20191204_084607.jpg". Visible in the page text on those pages; screenshot `audit/desktop-projects-filenames.png`.
7. **Old copyright and stale content.** Every page footer reads "©2017 by Douglas Fry Roofing, Inc." (checked on all 16 pages, both sizes). The blog's newest post is dated Mar 8, 2023 (`/blog`). Two pages have almost no text: the job gallery (`/roofing-job-photos-davinci-roofs-co`, 308 characters of text, no H1) and commercial (`/commercial`, 503 characters, a four-item list of project names). Screenshots: `audit/desktop-job-gallery.png`, `audit/desktop-commercial.png`.
8. **Seven dropdown links could not be opened.** The children under "Residential Roofing" (DaVinci Roofscape Installation, Brava Roof Tile, Asphalt Shingles, Standing Seam Metal Roofs) and under "Repair Services" (Tile Roof Systems, Tile Roof Repairs and Leaks, Roof Flashing Issues) have zero size in headless Chromium, even after hovering or clicking the "More ... pages" toggles. Their hrefs are in the page (for example `/bravarooftile`, `/repair-services`, `/projects`, `/projects-copy`). They are not click-verified. Test on a real phone and desktop browser before the plan relies on them.
9. **The homepage headline says neither the work nor the town.** H1 is "Douglas Fry Roofing, Inc." only. The browser title is "Wichita Roofing Company | Douglas Fry Roofing | Wichita Roofing Company" (the phrase is repeated). Screenshot: `audit/desktop-home.png`.
10. **The only contact form is a POWR widget below the fold on the homepage.** It has First Name*, Email Address* and Message* plus a SUBMIT button, and a hidden `g-recaptcha-response` field is present. It does not render until the visitor scrolls down to it (it showed only a loading spinner on first load). Not submitted. Screenshot: `audit/desktop-home-powr-form-frame.png`. No other page has a form.
11. **Inconsistent years and a wrong H1 on the About page.** Homepage: "Roofing Since 1981" and "served the Wichita, Ks area for over 40 years". About: "30-plus years we have been in business", and its H1 is a full paragraph that runs into "Wichita1981". Other pages say "over 30 years". Testimonial text says "nearly 40 years". Screenshot: `audit/desktop-about-h1.png`.
12. **Placeholder-like text and typos in titles and copy.** Titles: "Brava Roof TIle", "Davinci Roofscapes | Davinci Roofing Wichita Ks| Davinci Roofs", "Wichita Ks Roof Leaks| Doug Fry Roofing Repair Specialist". Body: "EPDM Flat Roof Sytem" (commercial), "fort he life" (standing seam). Testimonials page has three named reviews (Amber Snavely, Tony Martinez, Steve Lebeda). They could not be matched to Google reviews from here, so treat them as unverified, not as proof.
13. **No email address anywhere.** No `mailto:` link and no email text on any page.

## Pages (desktop and phone checked for each; status 200 for all)
| # | Path | Title | H1 |
|---|---|---|---|
| 1 | / | Wichita Roofing Company \| Douglas Fry Roofing \| Wichita Roofing Company | Douglas Fry Roofing, Inc. |
| 2 | /doug-fry-roofing-about-page-1835-n | Doug Fry Roofing About Page, 1835 N Ohio, Wichita, Ks | (paragraph: "Douglas Fry Roofing was started in Wichita1981 by Doug Fry...") |
| 3 | /residential-roofing-doug-fry-roofin | Doug Fry Roofing \| Roof Installation \| Roof Replacement | Residential Roofing Services |
| 4 | /doug-fry-roofing-luxury-shingles-sl | Davinci Roofscapes \| Davinci Roofing Wichita Ks\| Davinci Roofs | DaVinci Roofscapes Shingle and Siding |
| 5 | /bravarooftile | Brava Roof TIle \| Brava Roofing Wichita Ks\| Brava Synthetic Roofs | Brava Roof Tile Synthetic Roofing TIles |
| 6 | /doug-fry-roofing-luxury-asphalt-shi | Doug Fry Roofing \| Residential Roof Installation \| Asphalt Roof Installation | Asphalt Shingles Options |
| 7 | /repair-services | Tile Roof Systems \| Douglas Fry Roofing, Inc. \| Wichita | Tile Roofs |
| 8 | /doug-fry-roofing-new-construction-n | Standing Seam Metal Roof \| Doug Fry Roofing \| Wichita KS Metal Roofs | Standing Seam Metal Installation |
| 9 | /tile-roof-systems-copy | Roof Repairs \| Douglas Fry Roofing \| Wichita Roof Repairs | Repair Services |
| 10 | /projects | Wichita Ks Roof Leaks\| Doug Fry Roofing Repair Specialist | Roof Flashing Issues and Leaks |
| 11 | /projects-copy | Tile Roof Repairs And Leaks \| Douglas Fry Roofing, Inc. \| Wichita | Tile Roof Repairs |
| 12 | /commercial | commercial roofs wichita ks, doug fry roofing commercial roofs, | Commercial Roofing Projects |
| 13 | /roofing-job-photos-davinci-roofs-co | Roofing job photos, DaVinci Roofs, Concrete Tile Roofs, Doug Fry | (none) |
| 14 | /doug-fry-roofing-faq-how-to-hire-a | Doug Fry Roofing FAQ,How to hire a roofing Contractor,Doug Fry Roofing | Common Questions |
| 15 | /douglasfryroofing-com-testimonials | douglasfryroofing.com testimonials, new roofs, roof replacements, | Testimonials |
| 16 | /blog | doug fry roofing blog, how to hire a roofer, wichita ks roofing info | (none) |

## Menu and button links (clicks)
- **Desktop, from the homepage:** Home (to /), About, Residential Roofing, Repair Services (to /tile-roof-systems-copy), Commercial, Job Gallery, FAQ, Testimonials and Blog all open the right page. Commercial and FAQ timed out in one run and opened correctly in a focused rerun.
- **Desktop, content links on each page:** "More Info" (residential page) opens the DaVinci page. "Go to gallery" (new construction page) opens the gallery. Blog post links open their posts. The logo returns to the homepage.
- **"Go to Central States Manufacturing"** on the new construction page links to https://www.centralstatesmfg.com/ (checked in the page's link list, not clicked).
- **Hidden dropdown items:** not verified (finding 8).
- **Phone, 390px:** only Home, About and Residential Roofing are on screen to click (finding 3).
- Menu links were clicked from the homepage; the same menu is on every page (checked in the page link lists).

## Phones and offices
| Number on site | Where shown | Tap-to-call? | Dials |
|---|---|---|---|
| (316) 655-9777 | Header, footer, contact sections, text on every page | No (plain text) | n/a |
| (316) 655-9777 | "Get In Touch" buttons (1 to 4 per page) | Yes, `tel:316-655-9777` or `tel:3166559777` | (316) 655-9777, correct, but off-screen on a phone |
| (316) 264-1511 | Header, footer, contact sections, text on every page | No (plain text, never a link) | n/a |

- One physical location: 1835 N. Ohio, Wichita, KS 67214 (header "1835 N. Ohio Wichita, Ks 67214"; footer "1835 N Ohio Ave, Wichita, KS 67214, USA"). The FAQ says "we even own our own building".
- Only one office. No second city or office is named on the site.

## Google profile comparison (scout data: 4.8, 79 reviews, (316) 655-9777, place ID ChIJSR3w1E7iuocRJXA6D1NM7eI, Roofing contractor)
- **Phone:** matches. The first site number is the Google phone. The second site number (316) 264-1511 is not on the scout data.
- **Same place:** the site's Google Maps link (`https://www.google.com/maps/place/Douglas+Fry+Roofing,+Inc/...!8m2!3d37.7164015!4d-97.3245265`, `...0xe2ed4c530f3a7025`) carries the same CID (0xe2ed4c530f3a7025, bytes `25703a0f534cede2`) that is inside the scout's place ID. So the site links to the same Google listing.
- **Name:** site says "Douglas Fry Roofing, Inc." and "Douglas Fry Roofing"; matches the scout's name.
- **Category:** site describes roofing only; matches "Roofing contractor".
- **Rating and reviews:** not shown on the site. A third-party directory showed 4.8 from 78 reviews (checked Jul 29, 2026, https://rooferdirectory.co/contractor/douglas-fry-roofing-inc/), which is close to the scout's 79. Not a site-versus-Google conflict.
- **Hours:** the site shows none. MapQuest (fetched) shows Monday to Saturday 7 am to 6 pm, Sunday closed, status "Open" (https://startpage.mapquest.com/us/kansas/douglas-fry-roofing-357810874). One search summary said MapQuest showed "Closed"; I did not confirm that. Hours need a call to confirm.

## Forms
- **Homepage only:** POWR contact form (iframe from powr.io). Fields: First Name*, Email Address*, Message*, SUBMIT. Hidden `g-recaptcha-response` field present; I did not see a visible challenge. Not submitted, so delivery is unverified.
- No other page has a form. "Get In Touch" buttons are phone links, not forms.

## Placeholder and copied content
- "-copy" pages live: `/tile-roof-systems-copy`, `/projects-copy` (finding 5).
- No lorem ipsum, no "Samantha Johnson" sample, no "Addison", no "mysite" found on any page.
- Testimonials page has three named quotes, unverified (finding 12).
- Image filenames shown as captions (finding 6).
- Old copyright: ©2017 on all pages (finding 7).

## Services named (site)
Residential re-roofs; new construction roofs; tile roof repair and installation (concrete, clay); DaVinci; Brava synthetic tile; premium asphalt (CertainTeed Presidential Shake, Atlas StormMaster Shake); standing seam metal; shake and wood shingle repair; flashing and skylights; commercial roofs (four named projects only). Each has a page except commercial (list only) and the job gallery (photos only). See facts.md for full wording.

## Speed and tools
- No PageSpeed or Lighthouse score. The PageSpeed API returned quota exceeded (HTTP 429).
- Homepage HTML is about 680 KB (curl), Wix-built.
- No Sitebulb export was provided.

## Not checked
- Dropdown children click test (finding 8).
- Hours by phone, the second phone number's purpose, and the "Get In Touch" buttons on a real phone (not emulated).
- Form submission (not allowed).
- Manufacturer and BBB pages (all blocked; see facts.md).
- Google reviews and owner replies (handled separately).
