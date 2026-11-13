# Evolve Exteriors: current-site audit

Site: https://www.evolve-exteriors.com/ (Wix). Audited 2026-11-09 with Playwright (Chromium) at 390x844 and 1440x900. Screenshots are in `audit/`.

## What works
- Real, specific copy about who they are: owners Colton and Riley introduce themselves on the homepage.
- A real promise section (lifetime warranty, price match, financing, locally owned in Wichita and OKC).
- Both offices and both numbers appear in the footer; a Locations page names both hubs and a 150-mile radius for each.
- Active blog (34 posts, latest 2026-11-05) and an online booking calendar.

## What is broken, most costly first

1. **Every phone link dials 1234567890.** On the homepage, /our-windows, /locations, /book-online and every page checked, all three `tel:` links (the "Wichita -" label, "(316) 435-8009" and "OKC -") are `tel:1234567890`, at both screen sizes. A visitor on a phone who taps to call reaches nothing. The real numbers appear only in the footer. Screenshot: `audit/desktop-footer-tel-mailto.png`, `audit/mobile-home-top.png`.
2. **The OKC number is not its own working link.** "OKC -" and the number are plain footer text next to the same dead `tel:1234567890` link; the Oklahoma City office has no way to be reached by tap. (Checked with the page's link list: no `tel:+14053632294` anywhere.)
3. **The homepage headline says neither the work nor the town.** H1 "Best Professional Window Installation" with the subline "ENERGY EFFICIENT WINDOWS". No "Wichita", no "replacement". Browser title: "Home | Evolve Exteriors | Window Replacement | Wichita | OKC". Screenshot: `audit/desktop-home.png`.
4. **No page for any service except a list of window style names.** "Our Windows" (/our-windows) lists eight style names (casement, double sliding, double hung, awning, center vent sliding, end vent sliding, picture vent, hopper) plus "Sliding & Patio", with no copy on price, warranty, process or towns. There is no sliding patio door page and no About page. Screenshot: `audit/desktop-our-windows.png`.
5. **The Sliding Patio Doors "Read More" opens the windows page.** Clicked: the third service card goes to /our-windows ("Our Windows"), the same place as Energy Efficient Windows. Screenshot: `audit/desktop-readmore-2-landing.png`.
6. **"Vinyl Siding" opens a leftover duplicate page.** The menu item and the second card both go to /copy-of-our-windows (titled "Vinyl Siding", one paragraph about PVC siding, then the windows booking blurb "We provide the most competitive window installation rates..." with a broken sentence ending "that fit your."). Screenshots: `audit/desktop-copy-of-our-windows.png`, `audit/desktop-readmore-1-landing.png`.
7. **The email link opens info@mysite.com.** The footer shows info@evolve-exteriors.com but the link is `mailto:info@mysite.com` on every page. Anyone who taps it writes to a stranger's address.
8. **The only testimonial is sample text.** The Client Reviews section shows one quote from "Samantha Johnson" ("Evolve Exteriors provided exceptional service...") and none of the 140 five-star Google reviews. Screenshot: `audit/desktop-testimonial-samantha.png`.
9. **Buttons that go nowhere new.** "About Us", "Services", "Schedule Your Consultation", "Get a Free Estimate" and "Get a Quote" all link to the homepage address, so there is no estimate or contact page. The real booking pages sit under /book-online and are linked only from there.
10. **The only form is a promo sign-up with no visible spam protection.** "Sign Up Today For 15% Off Your Next Project!" (first name, last name, email, phone, "Sign Up Today!"). No reCAPTCHA, hCaptcha or Turnstile string in the page source. Not submitted, so what it does with the data is unverified.
11. **Leftover and stale content.** /financing says "If you're a homeowner in Addison" (wrong city). The booking widget on the homepage still reads like a template. Footer "© 2025 by Evolve Exteriors, LLC" in November 2026. Screenshot: `audit/desktop-financing.png`.
12. **Two offices, one thin page.** /locations has one paragraph per city with the same wording, no towns, no numbers beside each hub. Both offices' numbers are only in the footer. Screenshot: `audit/desktop-locations.png`.

## Offices and Google profile
- Google profile phone (316) 435-8009 matches the site's Wichita number. Google address (from the review pull): 7804 E Funston St #208, Wichita, KS 67207. The site shows no street address.
- OKC: (405) 363-2294 on the site; no OKC address anywhere; not checked for a separate OKC Google listing.

## Headline, titles, services
- Titles: Home "Home | Evolve Exteriors | Window Replacement | Wichita | OKC"; /our-windows "Our Windows | Evolve Exteriors"; /copy-of-our-windows "Vinyl Siding | Evolve Exteriors"; /locations "Locations | Evolve Exteriors"; /book-online "Book Online | Evolve Exteriors".
- Services named: windows, vinyl siding, sliding patio doors. Only windows have a page; siding has the duplicate; patio doors have none.

## Speed and things not checked
- No Lighthouse or PageSpeed score was run. In Playwright, 4 of 7 pages (/copy-of-our-windows, /financing, /blog, /locations on first try) never reached network-idle within 60 seconds and had to be reloaded with a shorter wait; facts.md notes the homepage HTML is about 2.2 MB (Wix).
- The mobile hamburger menu was not opened and clicked; menu links were taken from the desktop link list and the mobile page's tel/mailto links.
- No form was submitted. The Google profile hours were not compared (site FAQ says Monday to Friday, 9:00 AM to 5:00 PM).
- Sitebulb export: none provided.
