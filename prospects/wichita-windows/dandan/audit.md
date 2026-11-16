# Dan Dan The Window Man: current-site audit

Site: https://www.dandanthewindowman.com/ (Hibu build). Audited 2026-11-09 with Playwright (Chromium) at 390x844 and 1440x900. Screenshots are in `audit/`. Nothing was submitted.

## What works
- Every `tel:` link dials the number it shows: `tel:316-448-4418` and `tel:(316) 448-4418` for the main line, `tel:833-972-7663` for (833) 972-ROOF (7663 is the letters ROOF). Checked on all nine pages.
- Every `mailto:` link opens contact@ddtrm.com, the address the page shows. It is a different domain from the website, so customers may doubt it.
- Each money service has a page: Windows, Doors, Siding, Roofing, Financing, plus About, Reviews and Contact (sitemap has 13 URLs). Every menu link and button goes to the right page; the footer links are Hibu policy pages.
- The contact form has Google reCAPTCHA on every page. Fields on /contact-us: Name, Email, Phone, services checkboxes, Message.
- The Reviews page shows real reviews (4.6 on 104 ratings, a Yext widget filled by script). The About page is filled in (services, brands, payment types, hours).
- Pages load fast, and the Synchrony financing page is clear (no monthly interest if paid in full within 18 months).

## What is broken, most costly first
1. **On a phone the page is twice the width of the screen.** At 390px the page measures 768px wide (`scrollWidth` 768). The header number is at x=412, off the screen, and the menu items Roofing (x=397), Financing (x=486) and Reviews (x=594) sit past the edge, with Let's Talk (x=360, 120px wide) cut off and the red FREE ESTIMATE button (x=344) half off. A visitor on a phone has to scroll sideways to find the number to call. Screenshots: `audit/mobile-home-top.png`, `audit/mobile-home-full.png`.
2. **The homepage has three headlines and no company type.** H1s: "Professional Window, Door, and Siding Installation", "Hail Damage Claims for Residential Roofing and Metal Buildings" and "in Wichita, KS", plus a fourth H1, "Here's what our customers are saying...". Google gets windows, siding and hail roofing at once. Browser title: "Window Replacement in Wichita, KS | Siding Installation". Screenshot: `audit/desktop-home.png`.
3. **The homepage reviews heading has no reviews under it.** "Here's what our customers are saying..." is followed straight by the footer, and no review text rendered after waiting 4 seconds. The real reviews sit only on /reviews. Nothing on the homepage names Rick Timsah, the owner customers name in almost every review.
4. **The money pages are thin.** /window is two paragraphs, a feature list (custom-built, American-made, double-pane, Low-E and argon, 3-year glass breakage, ENERGY STAR) and two PDF buttons (Pro Via Warranty, Energy Star Ratings): no review, no install steps, no photos checked. /door is two short paragraphs. /siding-installation lists eight product names (Carolina Sands, Crane Board, Parkview, Market Square, Portsmouth, Premium Pointe, Diamond Kote, Wausau Siding) with no description under any. Screenshots: `audit/desktop-window.png`, `audit/desktop-chk-door.png`, `audit/desktop-chk-siding-installation.png`.
5. **Roofing competes with windows.** The homepage gives hail damage claims for roofing and metal buildings its own headline, and the header carries a second number, (833) 972-ROOF, beside the main line. Reviews are about windows (about 74% of written reviews). Roofing appears in one review. Screenshot: `audit/desktop-roofing.png`.
6. **Hours disagree.** The site says Monday to Friday, 10:00 am to 5:00 pm; Birdeye (per facts.md) says 8am to 5pm.
7. **Brand and license claims cannot be checked.** The About page lists Owens Corning, Tamko, Pro-Via Windows, Quaker Windows and Diamond Kote. ProVia's own dealer locator did not list the company (facts.md). The windows page says "American-made" and a lifetime warranty; one 1-star review disputes warranty handling.
8. **Leftover pages.** /build-your-own-insite4 ("Hibu Video Splash", linked from an image on the homepage and windows page) shows only the footer. The sitemap includes a Hibu template blog post, "10 Tips For Maintaining A Killer Blog" (dated 2021), and the blog is not in the menu. Screenshots: `audit/desktop-hibu-splash.png`, `audit/desktop-blog-template.png`.
9. **The contact page promises a reply "in 24-48 hours"** while the siding page says calls and emails are returned on weekends. The About page lists checks and four card brands as payment types, and one reviewer asked for electronic payments.
10. **Footer and cookie banner.** The footer legal links go to Hibu pages (budurl.com/hibu...). A cookie banner covers the lower third of the phone screen on first load (`audit/mobile-home-top.png`).

## Offices and Google profile
- One location: 6810 W Kellogg Dr, Wichita, KS 67209, on the site and the Google profile. Phone (316) 448-4418 matches Google. Toll free (833) 972-7663 is shown as the roofing line. Google shows 44 reviews at 4.7; the site shows 4.6 on 104 ratings (a combined count).
- Google profile hours were not read; see finding 6.

## Headline, titles, services
- Titles: Home "Window Replacement in Wichita, KS | Siding Installation"; Windows "Window Replacement Cost | Window Installation Services, Wichita KS"; Doors "Patio, Exterior & Front Door Replacement | Door Installation, Wichita KS"; Siding "Siding Contractors | Vinyl Siding Replacement Cost"; Contact "Contact Dan Dan The Window Man | Wichita, KS | 316-448-4418".
- Services named: windows, doors, siding, roofing and hail claims, financing. Gutters appear only as a form checkbox and in reviews.

## Not checked
- No PageSpeed or Lighthouse score. No Sitebulb export. No form was submitted, so what the form does after sending is unverified. The mobile menu has no hamburger: the desktop menu is the only menu, so the cut-off in finding 1 is the whole navigation.
