# Current-site audit: JM Plumbing, LLC

Site: http://jmplumbingict.com/ (listed on Google, https://www.google.com/maps/search/?api=1&query=JM%20Plumbing%2C%20LLC&query_place_id=ChIJV-VZZm7kuocR53ahCpWYLbg)
Run date: 2026-11-13. Playwright Chromium, 1440x900 and 390x844.
Screenshots: `audit/` in this folder.

## Headline issue: the domain no longer serves the business

The listed website is not a plumbing site. It sends every visitor to a news portal.

- **Origin response:** http://jmplumbingict.com/ returns HTTP 200 with a "Redirecting..." page and no business content. With JavaScript off, the page is a loading screen. Its script sends the browser on.
- **Where it lands:** https://headlinelogic.com/?d=jmplumbingict.com&pcid=56&a=false&uuid=...&brand=jmplumbingict.com. Page title: "HeadlineLogic News Portal". The page shows news headlines (Top Stories, Weather, Sports, Finance) and display ads.
- **Same result at both widths:** 1440x900 and 390x844. The final URL and title are the same. No horizontal scroll on the portal at 390 px (scrollWidth 390).
- **Business content on the portal:** none. The portal text has no mention of JM Plumbing, the plumbing trade, or Wichita.
- **Evidence:** `audit/jmplumbingict-redirects-to-headlinelogic-1440x900.png` and `audit/jmplumbingict-redirects-to-headlinelogic-390x844.png`.
- **Google listing still points here:** the listing shows jmplumbingict.com as a website link (`audit/google-listing-1440x900.png`). It also shows calendly.com as a second website link. The calendly page was not opened (see "Not checked").

**Cause: not confirmed.** The domain still resolves: an A record (162.4.84.238) exists. The apex has no NS or MX record in this lookup (`ENODATA`), so the domain has no mail routing. A redirect to an unrelated news portal fits either a lapsed domain taken over by a parking or ad network, or a hijack. Telling them apart needs WHOIS registration history, which this session could not reach (no whois client). Unverified.

**Why it matters for the demo:** there is no working site to audit, to fix, or to send a contact form through. Any visitor from the Google listing lands on an ad page.

## Checks that could not run

Because the site serves no business pages, these checks have nothing to test. They are listed so the onboarding call knows they were not checked:

- Menu links and buttons: none (no business pages).
- `tel:` and `mailto:` links: none found on the site. The phone number appears only in the Google listing.
- Contact form: none found. Not submitted; none was reachable.
- Placeholder or copied pages, sample testimonials: none to check.
- Title and H1 per page: none on the business site.
- Office addresses and phones on the site: none. Google and directories are in `facts.md`.
- Word counts per page: none.
- Speed: not run. No business page to measure.

## Not checked (and why)

- **calendly.com link on the Google listing:** not opened. It may be a booking page for the same business, and the page could name the owner. Open it on the onboarding call or in the next pass.
- **Yelp:** https://www.yelp.com/ returns HTTP 403 to this session. No business page could be read.
- **BBB:** no JM Plumbing profile appeared in search. The BBB pages this session tried returned HTTP 403. Not checked directly.
- **Facebook:** no JM Plumbing page appeared in search. facebook.com loads, but a business-page search was not completed. Not checked directly.
- **Kansas Secretary of State:** not searched. Legal entity details are Unverified.
- **Google reviews beyond the first screen:** the listing shows "More reviews (124)". The reviews file that was to be dropped into this folder (`reviews.json`) is not present, so only the visible reviews were read.
