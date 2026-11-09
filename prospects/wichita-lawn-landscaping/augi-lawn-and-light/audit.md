# Current-site audit: AUGI Lawn & Light

Site: https://augilawnlight.jobbersites.com/ (one-page Jobber template, Jobber subdomain)
Checked: Nov 9, 2026, headless Chromium (Playwright), phone 390x844 and desktop 1440x900.
Google profile facts used: AUGI Lawn & Light, 5.0 from 30 reviews, (816) 985-2266, 404 N Greenwich Rd, Wichita, KS 67206.

## What works

- **Phone:** every visible number is a `tel:+18169852266` link, and it matches the Google profile. It appears in the header, the mobile menu and the footer, so it is tappable at both widths.
- **Email:** `mailto:augiproperty@gmail.com` opens the address it shows (it is a Gmail address, see finding 5).
- **Layout:** no horizontal scroll at either width. The mobile menu ("Open menu") opens and shows Client Login, the phone number and Get an Estimate.
- **Facebook:** link goes to "AUGI Lawn and Light | Wichita KS" (real page).
- **Instagram:** link goes to @augilawnandlight (on the mobile run; see the desktop note under finding 6).
- **Home link:** goes to the homepage.
- **Reviews "See more":** expands the review text. Three reviews are shown, all from Dar Gill, Jareth C and Mary Osoba.
- **Hours block:** renders (Mon-Fri 9:00 AM - 5:00 PM, Sat and Sun closed).
- **Headline:** H1 "Professional lawn care and holiday lighting in Wichita" names the work and the town.
- **Title:** "AUGI Lawn & Light: Lawn Care & Lawn Maintenance" (names the business and the work).
- **Owner:** the reviews name Austin, and the About text says "locally owned and firefighter-owned". No placeholder names found.
- **No placeholder text:** no lorem ipsum, no "copy-of" URLs, no sample testimonials found. The only page is the homepage, so no template pages are visible.

## What's broken or unverified, most costly first

### 1. The "Get an Estimate" form does not render in my browser (unverified, likely the biggest cost)

- **What I clicked:** "Get an Estimate" (hero button, header button, mid-page button) on both widths.
- **What happened:** a full-screen overlay opened with "Exit form" and an empty white box. The embedded form on the page (Jobber iframe, `clienthub.getjobber.com/.../embedded_new`) is blank on both widths. Console shows `Refused to display ... X-Frame-Options 'sameorigin'` and a 403. Requests to that URL are blocked with `ERR_BLOCKED_BY_RESPONSE`.
- **Why I think it's the embed and not my browser:** a plain curl with a normal browser User-Agent gets HTTP 403 with `cf-mitigated: challenge`. So the Jobber embed is behind a Cloudflare bot challenge. A real visitor may pass that challenge; I could not confirm it.
- **Impact if real:** the site has one way to request an estimate, and it may show a blank box. The header "Get an Estimate" and the hero button both lead to it.
- **Screenshots:** `audit/estimate-form-desktop.jpg`, `audit/estimate-form-mobile.jpg`, `audit/home-desktop-full.jpg` (blank form box mid-page), `audit/home-mobile-full.jpg`.
- **Still to check:** load the page in a normal phone browser (not a bot tool), fill the form to the point of a test, and confirm a request arrives in Jobber. Do not submit real data. Without that, this is unverified.

### 2. Address does not match the Google profile

- **Site:** footer and contact block say **11805 East Killarney Street, Wichita, Kansas 67206**.
- **Google profile (given):** **404 N Greenwich Rd, Wichita, KS 67206**.
- Same ZIP, different street. The name and phone match. One of the two is out of date, or they have two addresses. Confirm which is the real one before the strategy page cites either.
- **Screenshot:** `audit/home-desktop-full.jpg` (footer).

### 3. Thin site for a 5.0 / 30-review business

- One page only. The nav is the phone number and Client Login. There are no service pages, no service-area pages, no city pages.
- Services are a list of ten words (Lawn Mowing, Landscape, Holiday Lighting, Edging, Mulch and Rock, Fertilization, Weed Control, Aeration, Tree and Shrub Trimming, SOD Installation, Overseeding). Lawn Mowing and Landscape are not described. Holiday Lighting has one sentence. Each service has no page.
- "Local" says "East Wichita and surrounding areas". The hero says "Serving Wichita and the surrounding areas". The two differ.
- Reviews: the three shown are all "2 years ago". The Google profile has 30 reviews; the site shows three, all about two years old.
- No copyright line in the footer (no year to check, so no old-year problem).
- Screenshot: `audit/home-desktop-full.jpg`, `audit/reviews-expanded-desktop.jpg`.

### 4. Google button goes to a search page, not the profile

- The header/footer "google" icon links to `google.com/search?q=augi+lawn+%26+light...`, a search for the name, not the business profile or reviews page.
- In my headless run, that search page returned Google's "sorry / unusual traffic" check. I could not see what a visitor gets.
- Finding to note: the link is a search, not a direct link to the Google profile. Not confirmed as broken for a visitor.

### 5. Business email is a Gmail address

- `augiproperty@gmail.com` is the only email on the site. It does not match the business name ("AUGI Lawn & Light"). This is a credibility point, not a broken link.

### 6. Links I could not verify (blocked by a bot check in my browser)

- **Client Login** (header, mobile menu, footer): `clienthub.getjobber.com/.../login` lands on a Cloudflare "Just a moment..." challenge in my browser (both widths). Not verified that a human reaches the login.
- **"Powered by Jobber"**: same Cloudflare challenge. Not a site bug; noted only because it is in the footer.
- **Instagram**: on the mobile run, `instagram.com/augilawnandlight/` loaded the profile. On the desktop run it redirected to an Instagram login page. That is Instagram's login gate for the headless browser, not a site fault. The handle is the same in both.

### 7. Could not check

- **PageSpeed:** the Google PageSpeed API returned HTTP 429 (daily quota exceeded). No score. Retry later or run it manually at pagespeed.web.dev.
- **Sitebulb:** no export provided for this site.
- **Google hours and categories:** the profile facts given do not include hours, so the site's Mon-Fri 9-5 hours could not be compared.
- **Phone area code:** the site and the profile both show 816, which is Kansas City, on a Wichita business (Wichita is 316). The phone matches both sources, so it is not a site error, but it is worth asking the owner whether that is the number they want on a Wichita page.
- **Live map pin, Google reviews on the Google side:** not reachable from here.

## Screenshots

- `audit/home-mobile-fold.jpg`, `audit/home-mobile-full.jpg`: homepage at 390 wide
- `audit/home-desktop-fold.jpg`, `audit/home-desktop-full.jpg`: homepage at 1440 wide
- `audit/estimate-form-mobile.jpg`, `audit/estimate-form-desktop.jpg`: Get an Estimate embed (blank)
- `audit/reviews-expanded-mobile.jpg`, `audit/reviews-expanded-desktop.jpg`: reviews after "See more"

Scripts and raw results (not in the repo): `/tmp/claude-0/-home-user/8132b486-3cd2-572e-9b8d-b84e6ebc9dc5/scratchpad/augi-lawn-and-light-audit/crawl.js` and `crawl-results.json`.
